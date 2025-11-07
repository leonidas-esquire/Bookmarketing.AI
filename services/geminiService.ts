import { GoogleGenAI, GenerateContentResponse, Modality, Chat, Type, GenerateImagesResponse, Operation } from "@google/genai";

const getGenAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY as string });

// --- START: Centralized Production-Grade Error Handling ---

const handleApiError = (error: any, context: string): Error => {
    console.error(`API Error in ${context}:`, error);

    let userMessage = `An unexpected error occurred during ${context}. Please try again.`;
    
    // Check if the error is a GoogleGenerativeAI error with specific properties
    const errorMessageStr = error.toString().toLowerCase();
    
    if (errorMessageStr.includes('429') || errorMessageStr.includes('resource_exhausted') || errorMessageStr.includes('quota')) {
        userMessage = 'You exceeded your API quota. Please check your plan and billing details and try again later.';
    } else if (errorMessageStr.includes('api key not valid')) {
        userMessage = 'Your API key is not valid. Please select a valid key to continue.';
    } else if (errorMessageStr.includes('requested entity was not found')) {
        userMessage = 'API key is invalid or not found. This is common for video generation; please select a valid key.';
    } else if (error instanceof Error) {
         if (
            error.message.startsWith("The AI") ||
            error.message.startsWith("The request was blocked") ||
            error.message.startsWith("Received an empty text response") ||
            error.message.startsWith("Could not find a valid JSON object") ||
            error.message.startsWith("Failed to parse")
        ) {
            // Pass through our custom, user-friendly errors from handleJsonResponse
            return error;
        } else {
            userMessage = `An error occurred during ${context}: ${error.message}`;
        }
    }

    return new Error(userMessage);
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function apiCallWrapper<T>(promiseFn: () => Promise<T>, context: string, retries = 3, delay = 2000): Promise<T> {
    try {
        return await promiseFn();
    } catch (error: any) {
        const errorMessage = (error.toString() || '').toLowerCase();
        const isRateLimitError = errorMessage.includes('429') || errorMessage.includes('resource_exhausted') || errorMessage.includes('quota');

        if (retries > 0 && isRateLimitError) {
            console.warn(`Rate limit hit in ${context}. Retrying in ${delay / 1000}s... (${retries} retries left)`);
            await sleep(delay);
            return apiCallWrapper(promiseFn, context, retries - 1, delay * 2); // Exponential backoff
        }
        throw handleApiError(error, context);
    }
}


// --- END: Centralized Production-Grade Error Handling ---


const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
};

const extractAndParseJson = (text: string) => {
    const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
    let match = text.match(jsonRegex);
    let jsonString;

    if (match && match[1]) {
        jsonString = match[1];
    } else {
        const firstBrace = text.indexOf('{');
        const firstBracket = text.indexOf('[');
        
        if (firstBrace === -1 && firstBracket === -1) {
             const errorMessage = `The AI model returned a text response that could not be parsed into the expected JSON format. This can happen if the request was blocked by safety filters or if the prompt was too ambiguous. Please review your input and try again.\n\nModel's response:\n"${text.substring(0, 300)}${text.length > 300 ? '...' : ''}"`;
             throw new Error(errorMessage);
        }

        let startIndex = -1;
        if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
            startIndex = firstBrace;
            const lastBrace = text.lastIndexOf('}');
            jsonString = text.substring(startIndex, lastBrace + 1);
        } else {
            startIndex = firstBracket;
            const lastBracket = text.lastIndexOf(']');
            jsonString = text.substring(startIndex, lastBracket + 1);
        }
    }
    
    try {
        if (!jsonString) {
             throw new Error("Could not find a JSON object in the response.");
        }
        return JSON.parse(jsonString);
    } catch (e: any) {
        console.error("Failed to parse JSON string:", jsonString);
        throw new Error(`Failed to parse JSON string: ${e.message}. The AI's response might be malformed or incomplete.`);
    }
};

const handleJsonResponse = (response: GenerateContentResponse) => {
    const blockReason = response.promptFeedback?.blockReason;
    if (blockReason) {
        const safetyRatings = response.promptFeedback?.safetyRatings;
        let errorMessage = `The request was blocked by the safety policy. Reason: ${blockReason}.`;
        
        if (safetyRatings && safetyRatings.length > 0) {
            const problematicRatings = safetyRatings
                .filter(r => r.probability !== 'NEGLIGIBLE' && r.probability !== 'LOW')
                .map(r => `${r.category} was rated ${r.probability}`);

            if (problematicRatings.length > 0) {
                 errorMessage += ` Specific concerns: ${problematicRatings.join(', ')}.`;
            }
        }
         errorMessage += " Please review your uploaded content for anything that might violate safety guidelines and try again.";
        throw new Error(errorMessage);
    }
    
    const jsonText = response.text;
    const candidate = response.candidates?.[0];

    if (!jsonText) {
        if (!candidate) {
             throw new Error("The AI model did not return a valid response. There were no candidates generated, which could indicate a problem with the model or the request.");
        }
        throw new Error(`Received an empty text response from the AI model. The generation finished with reason: ${candidate.finishReason}. This could mean the content was filtered or the request resulted in no output.`);
    }

    try {
        return extractAndParseJson(jsonText);
    } catch (e: any) {
        if (candidate?.finishReason === 'MAX_TOKENS') {
            throw new Error(`The AI's response was too long and was cut short before it could finish generating the complete JSON plan. While we've increased the token limits, your manuscript might require an exceptionally large plan. Please try with a smaller excerpt if the issue persists.`);
        }
        throw e;
    }
};


export const generateImage = async (prompt: string, aspectRatio: string): Promise<string> => {
  const ai = getGenAI();
  const response: GenerateImagesResponse = await apiCallWrapper(() => ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio: aspectRatio as "1:1" | "16:9" | "9:16" | "4:3" | "3:4",
    },
  }), 'Image Generation');

  if (response.generatedImages.length > 0) {
    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;
  }
  throw new Error("Image generation failed: The API returned an empty response.");
};

export const editImage = async (prompt: string, imageBase64: string, mimeType: string): Promise<string> => {
    const ai = getGenAI();
    const response: GenerateContentResponse = await apiCallWrapper(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: imageBase64, mimeType } },
                { text: prompt },
            ],
        },
        config: { responseModalities: [Modality.IMAGE] },
    }), 'Image Editing');

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    throw new Error("Image editing failed: The API returned an empty response.");
};

export const removeImageBackground = async (imageBase64: string, mimeType: string): Promise<string> => {
    const ai = getGenAI();
    const response: GenerateContentResponse = await apiCallWrapper(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: imageBase64, mimeType } },
                { text: "Please remove the background from this image, leaving only the main subject. The new background should be a clean, solid white." },
            ],
        },
        config: { responseModalities: [Modality.IMAGE] },
    }), 'Background Removal');

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    throw new Error("Background removal failed: The API returned an empty response.");
};


export const generateVideoFromText = async (prompt: string, aspectRatio: "16:9" | "9:16", resolution: '720p' | '1080p') => {
    const ai = getGenAI();
    let operation: Operation = await apiCallWrapper(() => ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: { numberOfVideos: 1, resolution: resolution, aspectRatio: aspectRatio }
    }), 'Text-to-Video Generation (Initiate)');
    
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await apiCallWrapper(() => ai.operations.getVideosOperation({operation: operation}), 'Text-to-Video Generation (Polling)');
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed to produce a download link.");
    
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
};

export const generateVideoFromImage = async (prompt: string, imageBase64: string, mimeType: string, aspectRatio: "16:9" | "9:16", resolution: '720p' | '1080p') => {
    const ai = getGenAI();
    let operation: Operation = await apiCallWrapper(() => ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      image: { imageBytes: imageBase64, mimeType: mimeType },
      config: { numberOfVideos: 1, resolution: resolution, aspectRatio: aspectRatio }
    }), 'Image-to-Video Generation (Initiate)');

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await apiCallWrapper(() => ai.operations.getVideosOperation({operation: operation}), 'Image-to-Video Generation (Polling)');
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed to produce a download link.");

    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
};

export const analyzeImage = async (imageBase64: string, mimeType: string, prompt: string): Promise<string> => {
  const ai = getGenAI();
  const imagePart = { inlineData: { mimeType: mimeType, data: imageBase64 } };
  const textPart = { text: prompt };
  const response: GenerateContentResponse = await apiCallWrapper(() => ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, textPart] },
  }), 'Image Analysis');
  return response.text;
};

export const generateContent = async (prompt: string, model: 'gemini-2.5-pro' | 'gemini-2.5-flash' | 'gemini-flash-lite-latest'): Promise<string> => {
    const ai = getGenAI();
    const response: GenerateContentResponse = await apiCallWrapper(() => ai.models.generateContent({ model, contents: prompt }), 'Generic Content Generation');
    return response.text;
};

export const researchWithGoogle = async (query: string): Promise<{ text: string, sources: any[] }> => {
    const ai = getGenAI();
    const fullQuery = `Please format your response using clear Markdown. Use double newlines to separate paragraphs, headings, and list items for maximum readability. Here is my research query:\n\n"${query}"`;
    const response: GenerateContentResponse = await apiCallWrapper(() => ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: fullQuery,
        config: {
            tools: [{ googleSearch: {} }],
        },
    }), 'Google Search Research');

    const text = response.text;
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return { text, sources };
};

let chatInstance: Chat | null = null;

export const getChatInstance = (): Chat => {
    if (!chatInstance) {
        const ai = getGenAI();
        chatInstance = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: `You are "Athena", an expert AI Marketing Mentor for authors. Your goal is to provide concise, actionable, and encouraging advice to help authors market their books effectively. Keep your tone professional yet friendly. When asked for ideas, provide them in a clear, easy-to-scan format like bullet points.`,
            },
        });
    }
    return chatInstance;
};

function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

export const generateSpeech = async (text: string, voiceName: string): Promise<AudioBuffer> => {
    const ai = getGenAI();
    const response: GenerateContentResponse = await apiCallWrapper(() => ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName },
                },
            },
        },
    }), 'Speech Generation');

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("Audio generation failed: The API returned no audio data.");
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const decodedBytes = decode(base64Audio);
    return await decodeAudioData(decodedBytes, audioContext, 24000, 1);
};


export const analyzeManuscript = async (manuscriptFile: File): Promise<string> => {
    const ai = getGenAI();
    const manuscriptPart = await fileToGenerativePart(manuscriptFile);
    const prompt = `
    ROLE: You are "Athena", a world-class literary analyst and marketing strategist.
    
    OBJECTIVE: I have provided a book manuscript. Your task is to perform a deep, multi-faceted analysis and generate a comprehensive "Book DNA" document. This document will serve as the single source of truth for all subsequent marketing material generation. Your analysis must be incredibly specific, insightful, and structured clearly in Markdown format.
    
    ULTRA-IMPORTANT FORMATTING RULES (You MUST follow these precisely):
    1.  **Use Double Newlines:** ALWAYS use a blank line (a double newline) to create vertical space between paragraphs, headings, sub-headings, and list items. This is the most critical rule for readability.
    2.  **Space After Headings:** After a bolded heading (e.g., **"Genre & Positioning:"**), there MUST be a blank line before the content begins.
    3.  **Space Between Items:** Within a section, each distinct piece of information (e.g., "Primary Genre", "Sub-genres") MUST be treated as its own paragraph, separated from the others by a blank line.

    EXAMPLE of the required formatting:
    
    ## 1. Core Identity
    
    - **Genre & Positioning:**
    
      Primary Genre: Business & Technology Management
      
      Sub-genres: Software Development Methodology, Technical Project Management, DevOps & CI/CD, Knowledge Management
      
      This book is positioned as the definitive, actionable guide for navigating the "post-AI" software development landscape...
    
    - **Unique Selling Proposition (USP):**
    
      The GitPolish Protocol is the only systematic, end-to-end methodology for transforming chaotic software repositories...
      
    - **Logline:**
    
      In an era where AI generates code faster than humans can understand it, a new protocol provides the five pillars and seven phases necessary for technical leaders...

    TASK: Generate a Markdown document with the following sections, strictly adhering to the formatting rules and example above:
    
    # Book DNA: [Book Title if you can infer it, otherwise "The Manuscript"]
    
    ## 1. Core Identity
    - **Genre & Positioning:** Identify the precise genre, sub-genres, and niche micro-genres. Define the book's unique market position.
    - **Unique Selling Proposition (USP):** In one compelling sentence, what is the unique promise of this book to the reader?
    - **Logline:** A one-sentence summary of the plot.
    
    ## 2. Deep Content Analysis
    - **Primary & Secondary Themes:** List and explain the core themes.
    - **Core Emotional Arcs:** Describe the emotional journey of the main characters.
    - **Narrative Structure:** Briefly describe the plot structure (e.g., Three-Act Structure, Hero's Journey).
    - **Key Symbols & Motifs:** Identify recurring symbols or motifs and their significance.
    - **Standout Quotes:** Extract 5-10 of the most powerful, marketable quotes from the manuscript.
    
    ## 3. Target Audience Profile (The "Avatar")
    - **"Day in the Life" Narrative:** Write a short story about the ideal reader's day, highlighting their problems and desires.
    - **Demographics & Psychographics:** Detail their age, interests, values, and media habits (blogs, podcasts, influencers they follow).
    
    ## 4. Competitive Landscape
    - **Key Competitors:** Identify 3-5 key competitor books.
    - **Differentiation Strategy:** For each competitor, explain how this book is different and better.
    
    This document should be detailed enough to fuel an entire marketing campaign without needing to reference the manuscript again.
    `;
    
    const response: GenerateContentResponse = await apiCallWrapper(() => ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [{text: prompt}, manuscriptPart] },
        config: {
            thinkingConfig: { thinkingBudget: 8192 } // Use a large budget for this deep analysis
        }
    }), 'Manuscript Analysis');
    
    return response.text;
};


const FULL_CAMPAIGN_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        step1_bookAnalysis: {
            type: Type.OBJECT,
            properties: {
                genreAndPositioning: { type: Type.STRING, description: "Detailed classification of genre, sub-genre, micro-genres and market positioning statement." },
                coreAnalysis: {
                    type: Type.OBJECT,
                    properties: {
                        primaryTheme: { type: Type.STRING },
                        secondaryThemes: { type: Type.ARRAY, items: { type: Type.STRING } },
                        characterArcs: { type: Type.STRING, description: "Analysis of the core emotional arcs of the main characters. Format as Markdown with paragraphs separated by blank lines." }
                    }
                },
                targetAudienceProfile: { 
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        demographics: { type: Type.STRING },
                        psychographics: { type: Type.STRING },
                        mediaHabits: { type: Type.STRING },
                        dayInTheLife: { type: Type.STRING, description: "A narrative 'day in the life' of the ideal reader. Format as Markdown with paragraphs separated by blank lines." }
                    }
                },
                competitiveAnalysis: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            author: { type: Type.STRING },
                            strengths: { type: Type.STRING },
                            weaknesses: { type: Type.STRING },
                            differentiation: { type: Type.STRING, description: "How this book is different and better. Format as Markdown with paragraphs separated by blank lines." }
                        }
                    }
                },
                uniqueSellingProposition: { type: Type.STRING, description: "A concise USP for the book." },
                marketOpportunity: { type: Type.STRING, description: "An analysis of the market opportunity. Format as Markdown with paragraphs separated by blank lines." },
                sensitivityAnalysis: { type: Type.STRING, description: "Potential cultural or sensitivity issues and recommendations. Format as Markdown with paragraphs separated by blank lines." },
                commercialPotential: { type: Type.STRING, description: "Evaluation of the book's sales potential. Format as Markdown with paragraphs separated by blank lines." }
            }
        },
        step2_campaignArchitecture: {
            type: Type.OBJECT,
            properties: {
                launchPlan_24Hour: {
                    type: Type.ARRAY,
                    description: "Hour-by-hour checklist for the first 24 hours of launch.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            hour: { type: Type.STRING, description: "e.g., 'Hour 1-2', 'Hour 3'" },
                            task: { type: Type.STRING, description: "The specific, concise action to take." },
                            platform: { type: Type.STRING, description: "The platform for the action (e.g., 'Email', 'Twitter', 'Amazon KDP')." },
                            objective: { type: Type.STRING, description: "The goal of this task (e.g., 'Drive initial sales')." }
                        }
                    }
                },
                momentumPlan_30Day: {
                    type: Type.ARRAY,
                    description: "Day-by-day checklist for the first 30 days.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            day: { type: Type.STRING, description: "e.g., 'Day 1', 'Day 2-3'" },
                            task: { type: Type.STRING, description: "The specific, concise action to take." },
                            platform: { type: Type.STRING, description: "The platform for the action (e.g., 'Facebook Group', 'Goodreads')." },
                            objective: { type: Type.STRING, description: "The goal of this task (e.g., 'Gather reviews', 'Maintain momentum')." }
                        }
                    }
                },
                viralPlan_90Day: { type: Type.STRING, description: "Strategy for days 31-90. Format as Markdown with paragraphs separated by blank lines." },
                millionReaderRoadmap_365Day: { type: Type.STRING, description: "Long-term strategy for the first year. Format as Markdown with paragraphs separated by blank lines." },
                budgetAllocation: { 
                    type: Type.OBJECT,
                    properties: {
                        low: { type: Type.STRING, description: "Recommendations for a low budget." },
                        medium: { type: Type.STRING, description: "Recommendations for a medium budget." },
                        high: { type: Type.STRING, description: "Recommendations for a high budget." },
                        breakdown: { type: Type.STRING, description: "Example percentage breakdown for a medium budget (e.g., Ads: 50%, Content: 30%, Influencers: 20%)." }
                    }
                },
                performanceMetrics: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of key KPIs to track." },
                riskAssessment: { type: Type.STRING, description: "Potential risks and mitigation strategies. Format as Markdown with paragraphs separated by blank lines." }
            }
        },
        step3_multiChannelCampaigns: {
            type: Type.OBJECT,
            properties: {
                amazonStrategy: {
                    type: Type.OBJECT,
                    properties: {
                        keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                        categories: { type: Type.ARRAY, items: { type: Type.STRING } },
                        advertisingPlan: { type: Type.STRING, description: "A detailed Amazon Ads campaign strategy. Format as Markdown with paragraphs separated by blank lines." },
                        sampleAdGroups: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    campaignType: { type: Type.STRING, description: "e.g., 'Keyword Targeting', 'Product Targeting'" },
                                    adGroupName: { type: Type.STRING },
                                    targetKeywordsOrASINs: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    adCopy: { type: Type.STRING }
                                }
                            }
                        }
                    }
                },
                socialMediaCampaigns: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            platform: { type: Type.STRING },
                            strategy: { type: Type.STRING, description: "The platform-specific strategy. Format as Markdown with paragraphs separated by blank lines." },
                            contentCalendar_FirstWeek: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        day: { type: Type.STRING },
                                        postCopy: { type: Type.STRING },
                                        visualIdea: { type: Type.STRING },
                                        hashtags: { type: Type.STRING }
                                    }
                                }
                            }
                        }
                    }
                },
                emailMarketingSequence: {
                    type: Type.ARRAY,
                    description: "A 7-part sequence of emails for a new subscriber.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            day: { type: Type.INTEGER },
                            subject: { type: Type.STRING },
                            body: { type: Type.STRING, description: "The full HTML/Markdown body of the email. Use Markdown for formatting and ensure paragraphs are separated by blank lines." }
                        }
                    }
                },
                influencerStrategy: {
                    type: Type.OBJECT,
                    properties: {
                        idealProfile: { type: Type.STRING, description: "A profile of the ideal influencer. Format as Markdown with paragraphs separated by blank lines." },
                        outreachTemplate: { type: Type.STRING, description: "The outreach template. Format as Markdown with paragraphs separated by blank lines." },
                        influencerArchetypes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    archetype: { type: Type.STRING, description: "e.g., 'The Academic Reviewer', 'The Aesthetic BookToker'" },
                                    example: { type: Type.STRING, description: "A real-world example or description of one." },
                                    personalizedPitch: { type: Type.STRING }
                                }
                            }
                        }
                    }
                },
                contentMarketingStrategy: {
                    type: Type.ARRAY,
                    description: "List of blog post or content ideas.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            description: { type: Type.STRING },
                            targetKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                            briefOutline: { type: Type.STRING, description: "A brief outline for the content. Format as Markdown with paragraphs separated by blank lines." }
                        }
                    }
                }
            }
        },
        step4_assetGeneration: {
            type: Type.OBJECT,
            properties: {
                copyLibrary: {
                    type: Type.OBJECT,
                    properties: {
                        bookBlurbs: {
                            type: Type.OBJECT,
                            properties: {
                                short: { type: Type.STRING },
                                medium: { type: Type.STRING },
                                long: { type: Type.STRING },
                            }
                        },
                        adCopyHooks: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    angle: { type: Type.STRING, description: "e.g., 'Curiosity', 'Urgency', 'Social Proof'" },
                                    hooks: { type: Type.ARRAY, items: { type: Type.STRING } }
                                }
                            }
                        },
                    }
                },
                visualAssetGuidelines: { type: Type.STRING, description: "Guidelines and ideas for creating visual assets. Format as Markdown with paragraphs separated by blank lines." },
                videoTrailerScripts: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            concept: { type: Type.STRING, description: "e.g., 'Plot-Focused', 'Theme-Focused'" },
                            script: { type: Type.STRING, description: "A complete 30-second video script with scene descriptions. Format as Markdown with paragraphs separated by blank lines." }
                        }
                    }
                },
                pressReleaseTemplate: { type: Type.STRING, description: "A ready-to-use press release template. Format as Markdown with paragraphs separated by blank lines." },
                implementationTimeline_30Day: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            week: { type: Type.INTEGER },
                            focus: { type: Type.STRING },
                            actionSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
                        }
                    }
                }
            }
        }
    }
};

const ARCHITECTURE_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        step2_campaignArchitecture: FULL_CAMPAIGN_SCHEMA.properties.step2_campaignArchitecture,
    }
};

const STRATEGY_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        step3_multiChannelCampaigns: FULL_CAMPAIGN_SCHEMA.properties.step3_multiChannelCampaigns,
    }
};

const ASSETS_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        step4_assetGeneration: FULL_CAMPAIGN_SCHEMA.properties.step4_assetGeneration,
    }
};

const generateCampaignPart = async (analysisText: string, prompt: string, schema: any, context: string): Promise<any> => {
    const ai = getGenAI();
    const modelConfig = {
        model: 'gemini-2.5-pro',
        contents: { parts: [{ text: prompt }, { text: analysisText }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: schema,
            maxOutputTokens: 8192,
            thinkingConfig: { thinkingBudget: 8192 }
        },
    };
    const response: GenerateContentResponse = await apiCallWrapper(() => ai.models.generateContent(modelConfig), context);
    return handleJsonResponse(response);
};

export const generateCampaignArchitecture = (analysisText: string) => {
    const prompt = `
    ROLE: You are "Athena", a world-class AI marketing strategist and campaign architect.
    OBJECTIVE: I have provided a comprehensive "Book DNA" analysis document. Your task is to use ONLY this analysis to generate the high-level campaign architecture for a go-to-market strategy.
    TASK: Generate ONLY the "step2_campaignArchitecture" section of the marketing plan. Your output must be a single, valid JSON object that strictly adheres to the provided schema.
    `;
    return generateCampaignPart(analysisText, prompt, ARCHITECTURE_SCHEMA, 'Campaign Architecture Generation');
};

export const generateMultiChannelStrategy = (analysisText: string) => {
    const prompt = `
    ROLE: You are "Athena", a world-class AI marketing strategist specializing in channel-specific tactics.
    OBJECTIVE: I have provided a comprehensive "Book DNA" analysis document. Your task is to use ONLY this analysis to generate detailed, multi-channel marketing campaigns.
    TASK: Generate ONLY the "step3_multiChannelCampaigns" section of the marketing plan. Your strategies must be directly inspired by the provided analysis. Your output must be a single, valid JSON object that strictly adheres to the provided schema.
    `;
    return generateCampaignPart(analysisText, prompt, STRATEGY_SCHEMA, 'Multi-Channel Strategy Generation');
};

export const generateAssetGeneration = (analysisText: string) => {
    const prompt = `
    ROLE: You are "Athena", a world-class AI copywriter and creative director.
    OBJECTIVE: I have provided a comprehensive "Book DNA" analysis document. Your task is to use ONLY this analysis to generate a complete library of creative marketing assets.
    TASK: Generate ONLY the "step4_assetGeneration" section of the marketing plan. All creative assets must be directly inspired by the provided analysis. Your output must be a single, valid JSON object that strictly adheres to the provided schema.
    `;
    return generateCampaignPart(analysisText, prompt, ASSETS_SCHEMA, 'Asset Generation');
};


const FULL_WEBSITE_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        siteTitle: { type: Type.STRING, description: "A catchy title for the website, e.g., 'The World of [Book Title]' or '[Author Name] - Official Site'." },
        colorPalette: {
            type: Type.OBJECT,
            description: "A color scheme that reflects the book's mood.",
            properties: {
                primary: { type: Type.STRING, description: "Primary color hex code, for buttons and links." },
                secondary: { type: Type.STRING, description: "Secondary color hex code, for accents." },
                background: { type: Type.STRING, description: "Background color hex code for main sections." },
                text: { type: Type.STRING, description: "Main text color hex code." },
                heading: { type: Type.STRING, description: "Heading text color hex code." }
            }
        },
        typography: {
            type: Type.OBJECT,
            description: "Font pairings that match the book's genre.",
            properties: {
                headingFont: { type: Type.STRING, description: "Google Font name for headings (e.g., 'Merriweather')." },
                bodyFont: { type: Type.STRING, description: "Google Font name for body text (e.g., 'Lato')." }
            }
        },
        heroSection: {
            type: Type.OBJECT,
            description: "The first thing a visitor sees. It should be impactful.",
            properties: {
                headline: { type: Type.STRING, description: "A compelling headline that grabs attention." },
                subheadline: { type: Type.STRING, description: "A subheadline that elaborates on the book's promise." },
                callToAction: { type: Type.STRING, description: "Text for the main call-to-action button, e.g., 'Buy Now' or 'Explore the Story'." }
            }
        },
        aboutTheBookSection: {
            type: Type.OBJECT,
            description: "A section to sell the book itself.",
            properties: {
                summary: { type: Type.STRING, description: "An extended, enticing summary of the book. Format as Markdown with paragraphs separated by blank lines." },
                keyThemes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of 3-5 key themes explored in the book." }
            }
        },
        aboutTheAuthorSection: {
            type: Type.OBJECT,
            description: "A section to connect the reader with the author.",
            properties: {
                bioSuggestion: { type: Type.STRING, description: "A short paragraph suggesting how the author should frame their bio to connect with readers of this book. Format as Markdown with paragraphs separated by blank lines." },
                photoStyle: { type: Type.STRING, description: "A suggestion for the author's photo style (e.g., 'Professional and serious', 'Friendly and approachable', 'Mysterious and atmospheric')." }
            }
        },
        leadMagnetIdea: {
            type: Type.OBJECT,
            description: "An idea to capture email sign-ups.",
            properties: {
                title: { type: Type.STRING, description: "Title of the lead magnet, e.g., 'Free Bonus Chapter'." },
                description: { type: Type.STRING, description: "A short description to entice users to sign up." }
            }
        },
    }
};

export const generateWebsitePlan = async (pdfFile: File, onProgress?: (message: string) => void): Promise<any> => {
    const ai = getGenAI();
    const pdfPart = await fileToGenerativePart(pdfFile);
    onProgress?.("Designing visual identity, writing copy, and brainstorming ideas... this may take a moment.");

    const prompt = `
    Act as an expert web designer and book marketing strategist specializing in high-converting author websites. I have uploaded the manuscript of a book as a PDF.
    Your task is to deeply analyze the book's content, genre, tone, and themes to generate a comprehensive plan for an author website.
    The output must be a single JSON object conforming to the provided schema, containing all sections: Visual Identity, Core Copywriting, Author Info, and Lead Generation ideas.
    `;
    
    const modelConfig = {
        model: 'gemini-2.5-pro',
        contents: { parts: [ { text: prompt }, pdfPart ] },
        config: {
            responseMimeType: "application/json",
            maxOutputTokens: 8192,
            thinkingConfig: { thinkingBudget: 8192 },
            responseSchema: FULL_WEBSITE_SCHEMA,
        },
    };
    
    const response: GenerateContentResponse = await apiCallWrapper(() => ai.models.generateContent(modelConfig), 'Website Plan Generation');
    
    onProgress?.("Finalizing website plan...");
    return handleJsonResponse(response);
};

const FUNNEL_BASE_PROMPT = `
Act as an expert 7-figure marketing funnel architect specializing in high-conversion book launches.
I have provided a book manuscript. Your task is to analyze its content, tone, and themes to generate a complete, high-converting sales funnel plan.
The output must be a detailed, single JSON object conforming to the provided schema.
All generated copy (headlines, emails, ads) must be persuasive, emotionally resonant, and perfectly tailored to the book's ideal reader.
The email sequence must guide a new subscriber from awareness to purchasing the book, following this structure:
- Email 1 (Day 1): Deliver lead magnet, build rapport.
- Email 2 (Day 3): Introduce the core problem the book solves.
- Email 3 (Day 5): Share a valuable insight related to the book's theme.
- Email 4 (Day 7): Soft pitch for the book, introduce the main conflict/characters.
- Email 5 (Day 9): Hard pitch with social proof or urgency.
`;

const FULL_FUNNEL_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        funnelName: { type: Type.STRING, description: "A catchy, memorable name for this specific sales funnel." },
        targetAudienceSummary: { type: Type.STRING, description: "A concise summary of the ideal reader avatar for this book, focusing on their primary pain points and desires. Format as Markdown with paragraphs separated by blank lines." },
        topOfFunnel: {
            type: Type.OBJECT,
            properties: {
                leadMagnet: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: "A compelling title for a free resource to attract subscribers (e.g., 'The First Chapter', 'A Secret Map from the Book')." },
                        format: { type: Type.STRING, description: "The format of the lead magnet (e.g., 'PDF Chapter', 'Exclusive Short Story', 'Character Profile Dossier')." },
                        description: { type: Type.STRING, description: "A short, persuasive description of the lead magnet. Format as Markdown with paragraphs separated by blank lines." }
                    }
                },
                adCopy: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            platform: { type: Type.STRING, description: "The target ad platform (e.g., 'Facebook', 'TikTok', 'Instagram')." },
                            headline: { type: Type.STRING, description: "A scroll-stopping headline for the ad." },
                            body: { type: Type.STRING, description: "The persuasive body copy for the ad. Format as Markdown with paragraphs separated by blank lines." }
                        }
                    }
                }
            }
        },
        middleOfFunnel: {
            type: Type.OBJECT,
            properties: {
                landingPage: {
                    type: Type.OBJECT,
                    properties: {
                        headline: { type: Type.STRING, description: "The main headline for the lead magnet landing page." },
                        subheadline: { type: Type.STRING, description: "A supporting subheadline. Format as Markdown with paragraphs separated by blank lines." },
                        bulletPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-5 benefit-driven bullet points." },
                        callToAction: { type: Type.STRING, description: "The call-to-action text for the sign-up button." }
                    }
                },
                emailNurtureSequence: {
                    type: Type.ARRAY,
                    description: "A 5-part email sequence.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            day: { type: Type.INTEGER, description: "The day in the sequence this email is sent (e.g., 1, 3, 5)." },
                            subject: { type: Type.STRING, description: "An attention-grabbing subject line." },
                            body: { type: Type.STRING, description: "The full body of the email, written in a persuasive and engaging tone. Format as Markdown with paragraphs separated by blank lines." }
                        }
                    }
                }
            }
        },
        bottomOfFunnel: {
            type: Type.OBJECT,
            properties: {
                salesPage: {
                    type: Type.OBJECT,
                    properties: {
                        headline: { type: Type.STRING, description: "The main headline for the book's sales page." },
                        videoScriptHook: { type: Type.STRING, description: "The opening hook for a video sales letter." },
                        longFormCopyOutline: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An outline of sections for the long-form sales page copy." },
                        callToAction: { type: Type.STRING, description: "The call-to-action text for the 'Buy Now' button." }
                    }
                },
                orderBump: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: "Title of a small, complementary product offered at checkout." },
                        pricePoint: { type: Type.STRING, description: "The price of the order bump (e.g., '$7')." },
                        description: { type: Type.STRING, description: "A short description of the order bump. Format as Markdown with paragraphs separated by blank lines." }
                    }
                },
                oneTimeOfferUpsell: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: "Title of a higher-value product offered after the initial purchase." },
                        pricePoint: { type: Type.STRING, description: "The price of the upsell (e.g., '$27')." },
                        description: { type: Type.STRING, description: "A compelling description of the upsell. Format as Markdown with paragraphs separated by blank lines." }
                    }
                }
            }
        }
    }
};

export const generateSalesFunnel = async (manuscriptFile: File, onProgress?: (message: string) => void): Promise<any> => {
    const ai = getGenAI();
    onProgress?.("Architecting your complete sales funnel... This may take a moment.");
    const manuscriptPart = await fileToGenerativePart(manuscriptFile);

    const modelConfig = {
        model: 'gemini-2.5-pro',
        contents: { parts: [{ text: FUNNEL_BASE_PROMPT }, manuscriptPart] },
        config: {
            responseMimeType: "application/json",
            maxOutputTokens: 8192,
            thinkingConfig: { thinkingBudget: 8192 },
            responseSchema: FULL_FUNNEL_SCHEMA
        },
    };

    const response: GenerateContentResponse = await apiCallWrapper(() => ai.models.generateContent(modelConfig), 'Sales Funnel Generation');
    
    onProgress?.("Funnel generation complete!");
    return handleJsonResponse(response);
};

export const generateDistributionKit = async (formData: any, onProgress: (message: string) => void): Promise<any> => {
    const ai = getGenAI();
    onProgress("Analyzing metadata and generating ONIX structure...");
    
    const { manuscriptFile, coverFile, ...metadata } = formData;

    const manuscriptPart = await fileToGenerativePart(manuscriptFile);
    const coverPart = await fileToGenerativePart(coverFile);

    const prompt = `
    ROLE: You are an expert in book metadata and distribution, specializing in the ONIX standard.

    OBJECTIVE: I have provided book metadata, a manuscript file, and a cover image. Your task is to generate a comprehensive ONIX-like JSON object that contains all the necessary information for digital distribution to major retailers.

    METADATA PROVIDED:
    ${JSON.stringify(metadata, null, 2)}

    TASK: Analyze the provided information and generate a single, valid JSON object that conforms to the schema. Extract additional details like BISAC codes from the genre and themes from the manuscript if possible. The Epublication format should be EPUB.
    `;
    
    const onixSchema = {
        type: Type.OBJECT,
        properties: {
            recordReference: { type: Type.STRING, description: "A unique identifier for this ONIX record, like a UUID." },
            notificationType: { type: Type.STRING, description: "Notification type, e.g., '03' for 'Notification confirmed on publication'." },
            productIdentifier: {
                type: Type.OBJECT,
                properties: {
                    productIDType: { type: Type.STRING, description: "e.g., '15' for ISBN-13." },
                    idValue: { type: Type.STRING, description: "The ISBN-13 value." }
                }
            },
            descriptiveDetail: {
                type: Type.OBJECT,
                properties: {
                    productComposition: { type: Type.STRING, description: "e.g., '00' for 'Single-item retail product'." },
                    productForm: { type: Type.STRING, description: "e.g., 'ED' for 'Digital download'." },
                    productFormDetail: { type: Type.STRING, description: "Epublication format, e.g., 'E101' for 'EPUB'." },
                    titleDetail: {
                        type: Type.OBJECT,
                        properties: {
                            titleType: { type: Type.STRING, description: "e.g., '01' for 'Distinctive title'." },
                            titleElement: { type: Type.OBJECT, properties: { titleText: { type: Type.STRING } } }
                        }
                    },
                    contributor: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                contributorRole: { type: Type.STRING, description: "e.g., 'A01' for 'By author'." },
                                personName: { type: Type.STRING, description: "Author's full name." }
                            }
                        }
                    },
                    language: {
                        type: Type.ARRAY,
                        items: {
                             type: Type.OBJECT,
                             properties: {
                                languageRole: { type: Type.STRING, description: "e.g., '01' for 'Language of text'." },
                                languageCode: { type: Type.STRING, description: "e.g., 'eng' for English." }
                             }
                        }
                    },
                    subject: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                subjectSchemeIdentifier: { type: Type.STRING, description: "e.g., '10' for BISAC Subject Heading." },
                                subjectCode: { type: Type.STRING, description: "The BISAC code, e.g., 'FIC031010'." },
                                subjectHeadingText: { type: Type.STRING, description: "The BISAC heading text, e.g., 'FICTION / Thrillers / Suspense'."}
                            }
                        }
                    }
                }
            },
            collateralDetail: {
                type: Type.OBJECT,
                properties: {
                    textContent: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                textType: { type: Type.STRING, description: "e.g., '03' for 'Short description/blurb'." },
                                contentAudience: { type: Type.STRING, description: "e.g., '00' for 'Unrestricted'." },
                                text: { type: Type.STRING, description: "The book description text." }
                            }
                        }
                    }
                }
            },
            publishingDetail: {
                type: Type.OBJECT,
                properties: {
                    imprint: { type: Type.OBJECT, properties: { imprintName: { type: Type.STRING } } },
                    publisher: { type: Type.OBJECT, properties: { publishingRole: { type: Type.STRING, description: "e.g., '01' for 'Publisher'." }, publisherName: { type: Type.STRING } } },
                    publishingDate: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                publishingDateRole: { type: Type.STRING, description: "e.g., '01' for 'Publication date'." },
                                date: { type: Type.STRING, description: "Date in YYYYMMDD format." }
                            }
                        }
                    }
                }
            },
            productSupply: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        supplyDetail: {
                            type: Type.OBJECT,
                            properties: {
                                supplier: { type: Type.OBJECT, properties: { supplierRole: { type: Type.STRING, description: "e.g., '01' for 'Publisher'."}, supplierName: { type: Type.STRING } } },
                                productAvailability: { type: Type.STRING, description: "e.g., '20' for 'Available'." },
                                price: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            priceType: { type: Type.STRING, description: "e.g., '01' for 'RRP, excluding tax'." },
                                            priceAmount: { type: Type.NUMBER },
                                            currencyCode: { type: Type.STRING, description: "e.g., 'USD'." }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    const response: GenerateContentResponse = await apiCallWrapper(() => ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [{ text: prompt }, manuscriptPart, coverPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: onixSchema,
            thinkingConfig: { thinkingBudget: 4096 }
        },
    }), 'Distribution Kit Generation');
    
    onProgress("Finalizing distribution package...");
    return handleJsonResponse(response);
};

const FULL_VIDEO_PLAN_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        manuscriptAnalysis: {
            type: Type.OBJECT,
            properties: {
                coreTheme: { type: Type.STRING },
                corePromise: { type: Type.STRING },
                mainConflict: { type: Type.STRING },
                emotionalHooks: { type: Type.ARRAY, items: { type: Type.STRING } },
                readerAvatar: { type: Type.STRING, description: "Detailed description of the ideal reader." },
                standoutQuotes: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
        },
        coreVideoConcept: {
            type: Type.OBJECT,
            properties: {
                hookOptions: { type: Type.ARRAY, items: { type: Type.STRING } },
                script: { type: Type.STRING, description: "Full 30-60s script with [VOICEOVER] and [ON-SCREEN TEXT] cues." },
                ctaOptions: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
        },
        shotList: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    scene: { type: Type.STRING, description: "e.g., Scene 1: The Hook" },
                    scriptLine: { type: Type.STRING },
                    bRollSuggestion: { type: Type.STRING },
                    onScreenText: { type: Type.STRING },
                    pacingNotes: { type: Type.STRING }
                }
            }
        },
        derivativeMicroVideos: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    conceptTitle: { type: Type.STRING },
                    conceptDescription: { type: Type.STRING },
                    textForVideo: { type: Type.STRING }
                }
            }
        },
        platformAdaptations: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    platform: { type: Type.STRING },
                    hookVariant: { type: Type.STRING },
                    captionText: { type: Type.STRING, description: "Includes hashtags." },
                    thumbnailTitleIdea: { type: Type.STRING, description: "For YouTube, etc." }
                }
            }
        }
    }
};

export const generateCompleteVideoMarketingPlan = async (formData: any, onProgress?: (message: string) => void): Promise<any> => {
    const ai = getGenAI();
    const { manuscriptFile, metadata, authorGoal, platformTargets, tonePreference } = formData;

    onProgress?.("Analyzing manuscript and creating your complete video marketing blueprint...");
    const manuscriptPart = await fileToGenerativePart(manuscriptFile);

    const prompt = `
    Act as a senior product designer + AI workflow architect specializing in turning long-form text (like book manuscripts) into high-converting marketing videos for authors.

    OBJECTIVE: Design a complete, end-to-end Marketing Video Creator plan in a single step. I have provided a manuscript file and author-provided metadata. Your output must be a single, ready-to-use JSON object that conforms to the provided schema.

    METADATA & GOALS:
    - Book Title: ${metadata.title}
    - Subtitle: ${metadata.subtitle}
    - Genre: ${metadata.genre}
    - Target Audience: ${metadata.targetAudience}
    - Positioning Statement: ${metadata.positioningStatement}
    - Author's Primary Goal: ${authorGoal}
    - Target Platforms: ${platformTargets.join(', ')}
    - Desired Tone/Style: ${tonePreference}

    TASK: Perform all the following analyses and generations in one single JSON output:
    1.  **Manuscript Analysis:** Deeply analyze the manuscript to extract core themes, the book's promise, stakes, conflict, transformation, and key emotional hooks. Identify the ideal reader avatar and pull out 5-10 standout quotes.
    2.  **Core Video Concept & Script:** Based on the analysis, create a "core" hero video concept. This includes 3-5 hook line options, a full script (30-60s variant) with narration and on-screen text cues, and CTA options tailored to the author's goal.
    3.  **Visuals & Derivatives:** Create a scene-by-scene visual direction breakdown (shot list) for the core script. Also, generate 5 distinct micro-video ideas (e.g., quote videos, theme spotlights) with a brief concept and the text/quote to use.
    4.  **Platform Adaptations:** For each target platform specified (${platformTargets.join(', ')}), adapt the "core" video concept. Provide platform-specific duration notes, hook variants, caption text with hashtags, and thumbnail/title ideas where applicable.

    Generate the entire plan as one cohesive JSON object.
    `;

    const modelConfig = {
        model: 'gemini-2.5-pro',
        contents: { parts: [{ text: prompt }, manuscriptPart] },
        config: {
            responseMimeType: "application/json",
            maxOutputTokens: 8192,
            thinkingConfig: { thinkingBudget: 8192 },
            responseSchema: FULL_VIDEO_PLAN_SCHEMA,
        },
    };
    
    const response: GenerateContentResponse = await apiCallWrapper(() => ai.models.generateContent(modelConfig), 'Complete Video Marketing Plan Generation');
    
    onProgress?.("Video marketing plan finalized!");
    return handleJsonResponse(response);
};


export { GoogleGenAI };