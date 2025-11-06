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

// FIX: Added researchWithGoogle function to enable market research feature.
export const researchWithGoogle = async (query: string): Promise<{ text: string, sources: any[] }> => {
    const ai = getGenAI();
    const response: GenerateContentResponse = await apiCallWrapper(() => ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: query,
        config: {
            tools: [{ googleSearch: {} }],
        },
    }), 'Google Search Research');

    const text = response.text;
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return { text, sources };
};

// FIX: Added getChatInstance function to support the marketing chatbot.
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

// FIX: Added audio decoding helpers for speech generation.
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

// FIX: Added generateSpeech function for the audiobook sample creator.
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
    
    TASK: Generate a Markdown document with the following sections:
    
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


const CAMPAIGN_BASE_PROMPT = `
ROLE: You are "Athena", a world-class AI marketing strategist and campaign architect.

OBJECTIVE: I have provided a comprehensive "Book DNA" analysis document, which contains a deep literary and market analysis of a book. Your task is to use ONLY this analysis to generate a complete go-to-market strategy. The goal is to create a plan that could realistically help the author reach one million readers. Your recommendations must be specific, actionable, and directly derived from the provided analysis.

Your final output MUST be a single, valid JSON object that strictly adheres to the provided schema. Do not include any explanatory text outside of the JSON structure.
`;

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
                        characterArcs: { type: Type.STRING, description: "Analysis of the core emotional arcs of the main characters." }
                    }
                },
                targetAudienceProfile: { 
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        demographics: { type: Type.STRING },
                        psychographics: { type: Type.STRING },
                        mediaHabits: { type: Type.STRING },
                        dayInTheLife: { type: Type.STRING, description: "A narrative 'day in the life' of the ideal reader." }
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
                            differentiation: { type: Type.STRING, description: "How this book is different and better." }
                        }
                    }
                },
                uniqueSellingProposition: { type: Type.STRING, description: "A concise USP for the book." },
                marketOpportunity: { type: Type.STRING },
                sensitivityAnalysis: { type: Type.STRING, description: "Potential cultural or sensitivity issues and recommendations." },
                commercialPotential: { type: Type.STRING, description: "Evaluation of the book's sales potential." }
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
                viralPlan_90Day: { type: Type.STRING, description: "Strategy for days 31-90." },
                millionReaderRoadmap_365Day: { type: Type.STRING, description: "Long-term strategy for the first year." },
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
                riskAssessment: { type: Type.STRING, description: "Potential risks and mitigation strategies." }
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
                        advertisingPlan: { type: Type.STRING, description: "A detailed Amazon Ads campaign strategy." },
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
                            strategy: { type: Type.STRING },
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
                            body: { type: Type.STRING, description: "The full HTML/Markdown body of the email." }
                        }
                    }
                },
                influencerStrategy: {
                    type: Type.OBJECT,
                    properties: {
                        idealProfile: { type: Type.STRING },
                        outreachTemplate: { type: Type.STRING },
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
                            briefOutline: { type: Type.STRING }
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
                visualAssetGuidelines: { type: Type.STRING, description: "Guidelines and ideas for creating visual assets." },
                videoTrailerScripts: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            concept: { type: Type.STRING, description: "e.g., 'Plot-Focused', 'Theme-Focused'" },
                            script: { type: Type.STRING, description: "A complete 30-second video script with scene descriptions." }
                        }
                    }
                },
                pressReleaseTemplate: { type: Type.STRING, description: "A ready-to-use press release template." },
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

export const generateFullCampaignPlan = async (analysisText: string, onProgress: (progress: { message: string }) => void): Promise<any> => {
    const ai = getGenAI();
    onProgress({ message: "Building your comprehensive marketing plan... This is a complex task and may take up to a minute." });

    const prompt = `
    ROLE: You are "Athena", a world-class AI marketing strategist and campaign architect.

    OBJECTIVE: I have provided a comprehensive "Book DNA" analysis document, which contains a deep literary and market analysis of a book. Your task is to use ONLY this analysis to generate a complete go-to-market strategy. The goal is to create a plan that could realistically help the author reach one million readers. Your recommendations must be specific, actionable, and directly derived from the provided analysis.

    TASK: Generate a complete, multi-stage marketing campaign plan based on the provided "Book DNA" analysis. Your output must be a single, comprehensive JSON object that includes all four top-level keys: "step1_bookAnalysis", "step2_campaignArchitecture", "step3_multiChannelCampaigns", and "step4_assetGeneration". Fill out every field in the provided schema with detailed, actionable, and creative marketing strategies tailored to the book.
    `;

    const modelConfig = {
        model: 'gemini-2.5-pro',
        contents: { parts: [{ text: prompt }, { text: analysisText }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: FULL_CAMPAIGN_SCHEMA,
            maxOutputTokens: 8192,
            thinkingConfig: { thinkingBudget: 8192 } 
        },
    };
    
    const response: GenerateContentResponse = await apiCallWrapper(() => ai.models.generateContent(modelConfig), 'Full Campaign Plan Generation');
    
    onProgress({ message: "Finalizing your plan..." });
    return handleJsonResponse(response);
};

export const generateWebsitePlan = async (pdfFile: File, onProgress?: (message: string) => void): Promise<any> => {
    const ai = getGenAI();
    const pdfPart = await fileToGenerativePart(pdfFile);

    const basePrompt = `
    Act as an expert web designer and book marketing strategist specializing in high-converting author websites. I have uploaded the manuscript of a book as a PDF.
    Your task is to deeply analyze the book's content, genre, tone, and themes to generate a specific part of a comprehensive plan for an author website.
    The output must be a JSON object conforming to the provided schema.`;
    
    const modelConfigBase = {
        model: 'gemini-2.5-pro',
        contents: { parts: [ { text: "" }, pdfPart ] },
        config: {
            responseMimeType: "application/json",
            maxOutputTokens: 8192,
            thinkingConfig: { thinkingBudget: 4096 },
            responseSchema: {},
        },
    };
    
    const finalPlan: any = {};

    // Step 1: Visual Identity & Core Concept
    onProgress?.("Designing visual identity...");
    const step1Prompt = `${basePrompt}\n\nTASK: Generate the visual identity and core site concept. This includes the site title, a color palette that reflects the book's mood (with hex codes), and readable Google Font pairings that match the genre.`;
    const step1Config = JSON.parse(JSON.stringify(modelConfigBase));
    step1Config.contents.parts[0].text = step1Prompt;
    step1Config.config.responseSchema = {
        type: Type.OBJECT,
        properties: {
            siteTitle: { type: Type.STRING, description: "A catchy title for the website, e.g., 'The World of [Book Title]' or '[Author Name] - Official Site'."},
            colorPalette: { type: Type.OBJECT, description: "A color scheme that reflects the book's mood.", properties: { primary: { type: Type.STRING, description: "Primary color hex code, for buttons and links." }, secondary: { type: Type.STRING, description: "Secondary color hex code, for accents." }, background: { type: Type.STRING, description: "Background color hex code for main sections." }, text: { type: Type.STRING, description: "Main text color hex code." }, heading: { type: Type.STRING, description: "Heading text color hex code." } } },
            typography: { type: Type.OBJECT, description: "Font pairings that match the book's genre.", properties: { headingFont: { type: Type.STRING, description: "Google Font name for headings (e.g., 'Merriweather')." }, bodyFont: { type: Type.STRING, description: "Google Font name for body text (e.g., 'Lato')." } } },
        }
    };
    const step1Response: GenerateContentResponse = await apiCallWrapper(() => ai.models.generateContent(step1Config), 'Website Plan Step 1: Visuals');
    Object.assign(finalPlan, handleJsonResponse(step1Response));

    // Step 2: Core Copywriting
    onProgress?.("Writing core website copy...");
    const step2Prompt = `${basePrompt}\n\nTASK: Generate the core copywriting for the website. This includes a compelling hero section (headline, subheadline, call-to-action) and an enticing summary for the 'About the Book' section, including 3-5 key themes.`;
    const step2Config = JSON.parse(JSON.stringify(modelConfigBase));
    step2Config.contents.parts[0].text = step2Prompt;
    step2Config.config.responseSchema = {
        type: Type.OBJECT,
        properties: {
            heroSection: { type: Type.OBJECT, description: "The first thing a visitor sees. It should be impactful.", properties: { headline: { type: Type.STRING, description: "A compelling headline that grabs attention." }, subheadline: { type: Type.STRING, description: "A subheadline that elaborates on the book's promise." }, callToAction: { type: Type.STRING, description: "Text for the main call-to-action button, e.g., 'Buy Now' or 'Explore the Story'." } } },
            aboutTheBookSection: { type: Type.OBJECT, description: "A section to sell the book itself.", properties: { summary: { type: Type.STRING, description: "An extended, enticing summary of the book." }, keyThemes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of 3-5 key themes explored in the book." } } },
        }
    };
    const step2Response: GenerateContentResponse = await apiCallWrapper(() => ai.models.generateContent(step2Config), 'Website Plan Step 2: Copywriting');
    Object.assign(finalPlan, handleJsonResponse(step2Response));

    // Step 3: Author & Lead Gen
    onProgress?.("Creating author bio and lead magnet...");
    const step3Prompt = `${basePrompt}\n\nTASK: Generate content for the author and for email list building. This includes a suggestion for the author's bio and photo style, and a compelling idea for a lead magnet (e.g., a free chapter or checklist) to capture email sign-ups.`;
    const step3Config = JSON.parse(JSON.stringify(modelConfigBase));
    step3Config.contents.parts[0].text = step3Prompt;
    step3Config.config.responseSchema = {
        type: Type.OBJECT,
        properties: {
            aboutTheAuthorSection: { type: Type.OBJECT, description: "A section to connect the reader with the author.", properties: { bioSuggestion: { type: Type.STRING, description: "A short paragraph suggesting how the author should frame their bio to connect with readers of this book." }, photoStyle: { type: Type.STRING, description: "A suggestion for the author's photo style (e.g., 'Professional and serious', 'Friendly and approachable', 'Mysterious and atmospheric')." } } },
            leadMagnetIdea: { type: Type.OBJECT, description: "An idea to capture email sign-ups.", properties: { title: { type: Type.STRING, description: "Title of the lead magnet, e.g., 'Free Bonus Chapter'." }, description: { type: Type.STRING, description: "A short description to entice users to sign up." } } },
        }
    };
    const step3Response: GenerateContentResponse = await apiCallWrapper(() => ai.models.generateContent(step3Config), 'Website Plan Step 3: Author/LeadGen');
    Object.assign(finalPlan, handleJsonResponse(step3Response));

    return finalPlan;
};

const FUNNEL_BASE_PROMPT = `
Act as an expert 7-figure marketing funnel architect specializing in high-conversion book launches.
I have provided a book manuscript. Your task is to analyze its content, tone, and themes to generate a specific part of a complete, high-converting sales funnel plan.
The output must be a detailed JSON object conforming to the provided schema.
All generated copy (headlines, emails, ads) must be persuasive, emotionally resonant, and perfectly tailored to the book's ideal reader.
`;

const FUNNEL_STEP3_EMAIL_PROMPT = (emailNumber: number, totalEmails: number) => `
TASK: Write email #${emailNumber} of a ${totalEmails}-part "Nurture & Sell" sequence. The sequence should guide a new subscriber from awareness to purchasing the book.
-   **Email 1 (Day 1):** Deliver lead magnet, build rapport.
-   **Email 2 (Day 3):** Introduce the core problem the book solves.
-   **Email 3 (Day 5):** Share a valuable insight related to the book's theme.
-   **Email 4 (Day 7):** Soft pitch for the book, introduce the main conflict/characters.
-   **Email 5 (Day 9):** Hard pitch with social proof or urgency.

Focus ONLY on generating the content for Email #${emailNumber}. The 'day' property should reflect its place in the sequence.
`;

// FIX: Added FULL_FUNNEL_SCHEMA to resolve undefined variable errors in generateSalesFunnel.
const FULL_FUNNEL_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        funnelName: { type: Type.STRING, description: "A catchy, memorable name for this specific sales funnel." },
        targetAudienceSummary: { type: Type.STRING, description: "A concise summary of the ideal reader avatar for this book, focusing on their primary pain points and desires." },
        topOfFunnel: {
            type: Type.OBJECT,
            properties: {
                leadMagnet: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: "A compelling title for a free resource to attract subscribers (e.g., 'The First Chapter', 'A Secret Map from the Book')." },
                        format: { type: Type.STRING, description: "The format of the lead magnet (e.g., 'PDF Chapter', 'Exclusive Short Story', 'Character Profile Dossier')." },
                        description: { type: Type.STRING, description: "A short, persuasive description of the lead magnet." }
                    }
                },
                adCopy: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            platform: { type: Type.STRING, description: "The target ad platform (e.g., 'Facebook', 'TikTok', 'Instagram')." },
                            headline: { type: Type.STRING, description: "A scroll-stopping headline for the ad." },
                            body: { type: Type.STRING, description: "The persuasive body copy for the ad." }
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
                        subheadline: { type: Type.STRING, description: "A supporting subheadline." },
                        bulletPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-5 benefit-driven bullet points." },
                        callToAction: { type: Type.STRING, description: "The call-to-action text for the sign-up button." }
                    }
                },
                emailNurtureSequence: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            day: { type: Type.INTEGER, description: "The day in the sequence this email is sent (e.g., 1, 3, 5)." },
                            subject: { type: Type.STRING, description: "An attention-grabbing subject line." },
                            body: { type: Type.STRING, description: "The full body of the email, written in a persuasive and engaging tone." }
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
                        description: { type: Type.STRING, description: "A short description of the order bump." }
                    }
                },
                oneTimeOfferUpsell: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: "Title of a higher-value product offered after the initial purchase." },
                        pricePoint: { type: Type.STRING, description: "The price of the upsell (e.g., '$27')." },
                        description: { type: Type.STRING, description: "A compelling description of the upsell." }
                    }
                }
            }
        }
    }
};

export const generateSalesFunnel = async (manuscriptFile: File, onProgress?: (message: string) => void): Promise<any> => {
    const ai = getGenAI();
    const manuscriptPart = await fileToGenerativePart(manuscriptFile);

    const modelConfigBase = {
        model: 'gemini-2.5-pro',
        contents: { parts: [{ text: "" }, manuscriptPart] },
        config: {
            responseMimeType: "application/json",
            maxOutputTokens: 8192,
            thinkingConfig: { thinkingBudget: 4096 },
            responseSchema: {}
        },
    };

    const finalFunnelPlan: any = {};

    // Step 1: High-level strategy
    onProgress?.("Architecting high-level strategy...");
    const step1_strategy_Config = JSON.parse(JSON.stringify(modelConfigBase));
    step1_strategy_Config.contents.parts[0].text = FUNNEL_BASE_PROMPT + '\n' + "TASK: Generate the high-level funnel strategy. This includes a catchy funnel name, a summary of the target audience, and a compelling lead magnet idea (title, description, format).";
    step1_strategy_Config.config.responseSchema = {
        type: Type.OBJECT,
        properties: {
            funnelName: FULL_FUNNEL_SCHEMA.properties.funnelName,
            targetAudienceSummary: FULL_FUNNEL_SCHEMA.properties.targetAudienceSummary,
            topOfFunnel: { type: Type.OBJECT, properties: { leadMagnet: FULL_FUNNEL_SCHEMA.properties.topOfFunnel.properties.leadMagnet } },
        }
    };
    const step1_strategy_Response: GenerateContentResponse = await apiCallWrapper(() => ai.models.generateContent(step1_strategy_Config), 'Sales Funnel Step 1a: Strategy');
    Object.assign(finalFunnelPlan, handleJsonResponse(step1_strategy_Response));

    // Step 2: Landing Page Copy
    onProgress?.("Writing landing page copy...");
    const contextForLP = `CONTEXT: The lead magnet is titled "${finalFunnelPlan.topOfFunnel?.leadMagnet?.title}" and is a ${finalFunnelPlan.topOfFunnel?.leadMagnet?.format}.`;
    const step2_lp_Config = JSON.parse(JSON.stringify(modelConfigBase));
    step2_lp_Config.contents.parts[0].text = FUNNEL_BASE_PROMPT + '\n' + `TASK: Generate persuasive copy for the lead magnet landing page. This includes the main headline, subheadline, 3-5 benefit-driven bullet points, and a strong call-to-action for the sign-up button.\n\n${contextForLP}`;
    step2_lp_Config.config.responseSchema = {
        type: Type.OBJECT,
        properties: {
            middleOfFunnel: { type: Type.OBJECT, properties: { landingPage: FULL_FUNNEL_SCHEMA.properties.middleOfFunnel.properties.landingPage } },
        }
    };
    const step2_lp_Response: GenerateContentResponse = await apiCallWrapper(() => ai.models.generateContent(step2_lp_Config), 'Sales Funnel Step 1b: Landing Page');
    const lpResult = handleJsonResponse(step2_lp_Response);
    // Merge result into the plan
    if (lpResult.middleOfFunnel) {
        if (!finalFunnelPlan.middleOfFunnel) finalFunnelPlan.middleOfFunnel = {};
        finalFunnelPlan.middleOfFunnel.landingPage = lpResult.middleOfFunnel.landingPage;
    }
    
    // Step 3: Sales Page & Offers
    onProgress?.("Drafting sales page and offers...");
    const step3_sales_Config = JSON.parse(JSON.stringify(modelConfigBase));
    step3_sales_Config.contents.parts[0].text = FUNNEL_BASE_PROMPT + '\n' + `TASK: Generate the content for the bottom-of-funnel conversion assets. This includes the sales page (headline, video script hook, copy outline, CTA), an order bump idea, and a one-time-offer upsell idea.`;
    step3_sales_Config.config.responseSchema = {
        type: Type.OBJECT,
        properties: {
            bottomOfFunnel: FULL_FUNNEL_SCHEMA.properties.bottomOfFunnel
        }
    };
    const step3_sales_Response: GenerateContentResponse = await apiCallWrapper(() => ai.models.generateContent(step3_sales_Config), 'Sales Funnel Step 1c: Sales Page');
    Object.assign(finalFunnelPlan, handleJsonResponse(step3_sales_Response));


    // Step 4: Generate Ad Copy
    onProgress?.("Writing persuasive ad copy...");
    const step4_ad_Config = JSON.parse(JSON.stringify(modelConfigBase));
    step4_ad_Config.contents.parts[0].text = FUNNEL_BASE_PROMPT + '\n' + "TASK: Generate 3 persuasive ad copy variations (for platforms like Facebook, Instagram, TikTok) designed to drive traffic to the lead magnet landing page.";
    step4_ad_Config.config.responseSchema = {
        type: Type.OBJECT,
        properties: {
            adCopy: FULL_FUNNEL_SCHEMA.properties.topOfFunnel.properties.adCopy
        }
    };
    const step4_ad_Response: GenerateContentResponse = await apiCallWrapper(() => ai.models.generateContent(step4_ad_Config), 'Sales Funnel Step 2: Ad Copy');
    const adCopyResult = handleJsonResponse(step4_ad_Response);
    if (!finalFunnelPlan.topOfFunnel) finalFunnelPlan.topOfFunnel = {};
    finalFunnelPlan.topOfFunnel.adCopy = adCopyResult.adCopy;
    
    // Step 5: Generate Email Sequence
    const emailNurtureSequence = [];
    const NUM_EMAILS = 5;
    const SINGLE_EMAIL_SCHEMA = FULL_FUNNEL_SCHEMA.properties.middleOfFunnel.properties.emailNurtureSequence.items;

    for (let i = 1; i <= NUM_EMAILS; i++) {
        onProgress?.(`Drafting nurture email ${i}/${NUM_EMAILS}...`);
        const emailConfig = JSON.parse(JSON.stringify(modelConfigBase));
        emailConfig.contents.parts[0].text = FUNNEL_BASE_PROMPT + '\n' + FUNNEL_STEP3_EMAIL_PROMPT(i, NUM_EMAILS);
        emailConfig.config.responseSchema = SINGLE_EMAIL_SCHEMA;

        const emailResponse: GenerateContentResponse = await apiCallWrapper(() => ai.models.generateContent(emailConfig), `Sales Funnel Step 3: Email ${i}`);
        emailNurtureSequence.push(handleJsonResponse(emailResponse));
    }
    
    if (!finalFunnelPlan.middleOfFunnel) finalFunnelPlan.middleOfFunnel = {};
    finalFunnelPlan.middleOfFunnel.emailNurtureSequence = emailNurtureSequence;
    
    return finalFunnelPlan;
};

// FIX: Added generateDistributionKit function to support the book distribution feature.
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

export const generateCompleteVideoMarketingPlan = async (formData: any, onProgress?: (message: string) => void): Promise<any> => {
    const ai = getGenAI();
    const { manuscriptFile, metadata, authorGoal, platformTargets, tonePreference } = formData;

    const manuscriptPart = await fileToGenerativePart(manuscriptFile);

    const basePrompt = `
    Act as a senior product designer + AI workflow architect specializing in turning long-form text (like book manuscripts) into high-converting marketing videos for authors.

    OBJECTIVE: Design a specific part of a complete, end-to-end Marketing Video Creator plan. I have provided a manuscript file and author-provided metadata. Your output must be a ready-to-use JSON object for the requested step.

    METADATA & GOALS:
    - Book Title: ${metadata.title}
    - Subtitle: ${metadata.subtitle}
    - Genre: ${metadata.genre}
    - Target Audience: ${metadata.targetAudience}
    - Positioning Statement: ${metadata.positioningStatement}
    - Author's Primary Goal: ${authorGoal}
    - Target Platforms: ${platformTargets.join(', ')}
    - Desired Tone/Style: ${tonePreference}
    `;

    const modelConfigBase = {
        model: 'gemini-2.5-pro',
        contents: { parts: [{ text: "" }, manuscriptPart] },
        config: {
            responseMimeType: "application/json",
            maxOutputTokens: 8192,
            thinkingConfig: { thinkingBudget: 4096 },
            responseSchema: {},
        },
    };
    
    const finalPlan: any = {};

    // Step 1: Manuscript Analysis
    onProgress?.("Analyzing manuscript for key hooks...");
    const step1Prompt = `${basePrompt}\n\nTASK: Deeply analyze the manuscript to extract core themes, the book's promise, stakes, conflict, transformation, and key emotional hooks. Identify the ideal reader avatar and pull out 5-10 standout quotes.`;
    const step1Config = JSON.parse(JSON.stringify(modelConfigBase));
    step1Config.contents.parts[0].text = step1Prompt;
    step1Config.config.responseSchema = { type: Type.OBJECT, properties: { manuscriptAnalysis: { type: Type.OBJECT, properties: { coreTheme: { type: Type.STRING }, corePromise: { type: Type.STRING }, mainConflict: { type: Type.STRING }, emotionalHooks: { type: Type.ARRAY, items: { type: Type.STRING } }, readerAvatar: { type: Type.STRING, description: "Detailed description of the ideal reader." }, standoutQuotes: { type: Type.ARRAY, items: { type: Type.STRING } } } } } };
    const step1Response: GenerateContentResponse = await apiCallWrapper(() => ai.models.generateContent(step1Config), 'Video Plan Step 1: Analysis');
    Object.assign(finalPlan, handleJsonResponse(step1Response));

    // Step 2: Core Video Concept & Script
    onProgress?.("Writing core video script...");
    const step2Prompt = `${basePrompt}\n\nCONTEXT FROM ANALYSIS:\n${JSON.stringify(finalPlan.manuscriptAnalysis)}\n\nTASK: Based on the analysis, create a "core" hero video concept. This includes 3-5 hook line options, a full script (30-60s variant) with narration and on-screen text cues, and CTA options tailored to the author's goal.`;
    const step2Config = JSON.parse(JSON.stringify(modelConfigBase));
    step2Config.contents.parts[0].text = step2Prompt;
    step2Config.config.responseSchema = { type: Type.OBJECT, properties: { coreVideoConcept: { type: Type.OBJECT, properties: { hookOptions: { type: Type.ARRAY, items: { type: Type.STRING } }, script: { type: Type.STRING, description: "Full 30-60s script with [VOICEOVER] and [ON-SCREEN TEXT] cues." }, ctaOptions: { type: Type.ARRAY, items: { type: Type.STRING } } } } } };
    const step2Response: GenerateContentResponse = await apiCallWrapper(() => ai.models.generateContent(step2Config), 'Video Plan Step 2: Script');
    Object.assign(finalPlan, handleJsonResponse(step2Response));
    
    // Step 3: Visuals & Derivatives
    onProgress?.("Creating shot list and micro-videos...");
    const step3Prompt = `${basePrompt}\n\nCONTEXT FROM SCRIPT:\n${JSON.stringify(finalPlan.coreVideoConcept)}\n\nTASK: Create a scene-by-scene visual direction breakdown (shot list) for the core script. Also, generate 5 distinct micro-video ideas (e.g., quote videos, theme spotlights) with a brief concept and the text/quote to use.`;
    const step3Config = JSON.parse(JSON.stringify(modelConfigBase));
    step3Config.contents.parts[0].text = step3Prompt;
    step3Config.config.responseSchema = { type: Type.OBJECT, properties: { shotList: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { scene: { type: Type.STRING, description: "e.g., Scene 1: The Hook" }, scriptLine: { type: Type.STRING }, bRollSuggestion: { type: Type.STRING }, onScreenText: { type: Type.STRING }, pacingNotes: { type: Type.STRING } } } }, derivativeMicroVideos: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { conceptTitle: { type: Type.STRING }, conceptDescription: { type: Type.STRING }, textForVideo: { type: Type.STRING } } } } } };
    const step3Response: GenerateContentResponse = await apiCallWrapper(() => ai.models.generateContent(step3Config), 'Video Plan Step 3: Visuals');
    Object.assign(finalPlan, handleJsonResponse(step3Response));

    // Step 4: Platform Adaptations
    onProgress?.("Adapting script for target platforms...");
    const step4Prompt = `${basePrompt}\n\nCONTEXT OF CORE VIDEO:\n${JSON.stringify(finalPlan.coreVideoConcept)}\n\nTASK: For each target platform specified (${platformTargets.join(', ')}), adapt the "core" video concept. Provide platform-specific duration notes, hook variants, caption text with hashtags, and thumbnail/title ideas where applicable.`;
    const step4Config = JSON.parse(JSON.stringify(modelConfigBase));
    step4Config.contents.parts[0].text = step4Prompt;
    step4Config.config.responseSchema = { type: Type.OBJECT, properties: { platformAdaptations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { platform: { type: Type.STRING }, hookVariant: { type: Type.STRING }, captionText: { type: Type.STRING, description: "Includes hashtags." }, thumbnailTitleIdea: { type: Type.STRING, description: "For YouTube, etc." } } } } } };
    const step4Response: GenerateContentResponse = await apiCallWrapper(() => ai.models.generateContent(step4Config), 'Video Plan Step 4: Adaptations');
    Object.assign(finalPlan, handleJsonResponse(step4Response));
    
    return finalPlan;
};


export { GoogleGenAI };