import { GoogleGenAI, GenerateContentResponse, Modality, Chat, Type } from "@google/genai";

const getGenAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY as string });

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

// Helper to extract and parse JSON from a string that might be wrapped in markdown or have leading/trailing text.
const extractAndParseJson = (text: string) => {
    // Look for a JSON code block or a raw JSON object/array
    const jsonRegex = /```json\s*([\s\S]*?)\s*```|({[\s\S]*}|\[[\s\S]*])/;
    const match = text.match(jsonRegex);

    if (!match) {
        // Fallback for cases where regex might fail: find first '{' or '[' and last '}' or ']'
        const firstBrace = text.indexOf('{');
        const firstBracket = text.indexOf('[');
        let startIndex = -1;

        if (firstBrace === -1 && firstBracket === -1) {
             const errorMessage = `The AI model returned a text response that could not be parsed into the expected JSON format. This can happen if the request was blocked by safety filters or if the prompt was too ambiguous. Please review your input and try again.\n\nModel's response:\n"${text.substring(0, 300)}${text.length > 300 ? '...' : ''}"`;
             throw new Error(errorMessage);
        }
        
        if (firstBrace !== -1 && firstBracket !== -1) {
            startIndex = Math.min(firstBrace, firstBracket);
        } else {
            startIndex = firstBrace !== -1 ? firstBrace : firstBracket;
        }

        const lastBrace = text.lastIndexOf('}');
        const lastBracket = text.lastIndexOf(']');
        const endIndex = Math.max(lastBrace, lastBracket);
        
        if(startIndex > -1 && endIndex > -1 && endIndex > startIndex) {
            const potentialJson = text.substring(startIndex, endIndex + 1);
            try {
                return JSON.parse(potentialJson);
            } catch (e: any) {
                 // If fallback fails, throw a more specific error
                throw new Error(`Failed to parse extracted JSON from response. Raw response might be malformed. Error: ${e.message}`);
            }
        }
         const genericErrorMessage = `Could not find a valid JSON object or array in the response. The AI's response started with a '{' or '[' but a complete object could not be extracted.\n\nModel's response:\n"${text.substring(0, 300)}${text.length > 300 ? '...' : ''}"`;
        throw new Error(genericErrorMessage);
    }
    // If it's a markdown block, use the captured group. Otherwise, use the full match.
    const jsonString = match[1] || match[0];
    
    try {
        return JSON.parse(jsonString);
    } catch (e: any) {
        console.error("Failed to parse JSON string:", jsonString);
        throw new Error(`JSON Parsing Error: ${e.message}. The AI's response might be malformed.`);
    }
};

const handleJsonResponse = (response: GenerateContentResponse) => {
    // Check for an explicit block reason first.
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
        // Give a more specific error for empty text responses based on why the model stopped.
        throw new Error(`Received an empty text response from the AI model. The generation finished with reason: ${candidate.finishReason}. This could mean the content was filtered or the request resulted in no output.`);
    }

    try {
        return extractAndParseJson(jsonText);
    } catch (e: any) {
        // If parsing fails, check if it was because the response was cut short.
        if (candidate?.finishReason === 'MAX_TOKENS') {
            throw new Error(`The AI's response was too long and was cut short before it could finish generating the complete JSON plan. While we've increased the token limits, your manuscript might require an exceptionally large plan. Please try with a smaller excerpt if the issue persists.`);
        }
        // Re-throw the original parsing error if it wasn't due to MAX_TOKENS.
        throw e;
    }
};


export const generateImage = async (prompt: string, aspectRatio: string): Promise<string> => {
  const ai = getGenAI();
  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio: aspectRatio as "1:1" | "16:9" | "9:16" | "4:3" | "3:4",
    },
  });

  if (response.generatedImages.length > 0) {
    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;
  }
  throw new Error("Image generation failed.");
};

export const editImage = async (prompt: string, imageBase64: string, mimeType: string): Promise<string> => {
    const ai = getGenAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                {
                    inlineData: {
                        data: imageBase64,
                        mimeType,
                    },
                },
                {
                    text: prompt,
                },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    throw new Error("Image editing failed.");
};

export const removeImageBackground = async (imageBase64: string, mimeType: string): Promise<string> => {
    const ai = getGenAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                {
                    inlineData: {
                        data: imageBase64,
                        mimeType,
                    },
                },
                {
                    text: "Please remove the background from this image, leaving only the main subject. The new background should be a clean, solid white.",
                },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    throw new Error("Background removal failed.");
};


export const generateVideoFromText = async (prompt: string, aspectRatio: "16:9" | "9:16", resolution: '720p' | '1080p') => {
    const ai = getGenAI();
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: resolution,
        aspectRatio: aspectRatio
      }
    });
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed to produce a download link.");
    
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
};

export const generateVideoFromImage = async (prompt: string, imageBase64: string, mimeType: string, aspectRatio: "16:9" | "9:16", resolution: '720p' | '1080p') => {
    const ai = getGenAI();
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      image: {
        imageBytes: imageBase64,
        mimeType: mimeType,
      },
      config: {
        numberOfVideos: 1,
        resolution: resolution,
        aspectRatio: aspectRatio,
      }
    });
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed to produce a download link.");

    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
};

export const analyzeImage = async (imageBase64: string, mimeType: string, prompt: string): Promise<string> => {
  const ai = getGenAI();
  const imagePart = {
    inlineData: {
      mimeType: mimeType,
      data: imageBase64,
    },
  };
  const textPart = { text: prompt };
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, textPart] },
  });
  return response.text;
};

export const generateContent = async (prompt: string, model: 'gemini-2.5-pro' | 'gemini-2.5-flash' | 'gemini-flash-lite-latest'): Promise<string> => {
    const ai = getGenAI();
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text;
};

export const generateMarketingCampaign = async (manuscriptFile: File): Promise<any> => {
    const ai = getGenAI();
    const manuscriptPart = await fileToGenerativePart(manuscriptFile);

    const prompt = `
ROLE: You are "Athena", a world-class AI marketing strategist and campaign architect with the capabilities of a full-service marketing agency. You have been tasked with creating an exhaustive, deeply detailed, and highly actionable multi-million dollar marketing campaign for an author's book.

OBJECTIVE: I have provided an author's complete book manuscript. Your task is to perform a deep, multi-faceted analysis and generate a complete go-to-market strategy and all associated marketing assets. The goal is to create a plan that could realistically help the author reach one million readers. Your analysis and recommendations must be incredibly specific, verbose, and backed by reasoning derived from the manuscript.

TASK: Execute the following 4-step process. Your final output MUST be a single, large, and valid JSON object that strictly adheres to the provided schema. Do not include any explanatory text outside of the JSON structure. Be specific, insightful, and generate high-quality, ready-to-use content.

**Step 1: Comprehensive Book Analysis (Extreme Detail)**
-   Deeply analyze the manuscript's content, identifying primary, secondary, and tertiary themes; core emotional arcs of main characters; and the overall narrative structure.
-   Identify the precise genre, sub-genres, and niche micro-genres. Define the book's unique market position.
-   Profile the ideal target reader persona (The "Avatar"). Create a "Day in the Life" narrative. Detail their demographics, psychographics, core pain points (what problems they face), and deepest desires (what transformation they seek). List their specific media habits (blogs, podcasts, influencers, TV shows they follow).
-   Identify 3-5 key competitor books. For each, analyze their strengths and weaknesses in detail and articulate this book's unique selling proposition (USP) and clear differentiation strategy against each.
-   Evaluate market opportunities, potential cultural sensitivities, and provide a detailed analysis of the book's commercial potential with justifications.

**Step 2: Instant Campaign Architecture (Granular Detail)**
-   Based on the analysis, design a multi-stage campaign architecture.
-   Create an aggressive 24-hour launch plan with an hour-by-hour checklist of actions to maximize initial sales velocity.
-   Develop a 30-day plan with a day-by-day checklist to build momentum, gather reviews, and trigger algorithms.
-   Outline a 90-day viral expansion strategy focusing on organic growth tactics and community building.
-   Create a 365-day "Million-Reader Roadmap" outlining quarterly goals and strategic focuses for long-term, sustained sales.
-   Suggest a tiered budget allocation (e.g., Low, Medium, High) with specific percentage breakdowns for ads, content creation, and influencer outreach. List the key performance indicators (KPIs) for each stage.
-   Identify potential risks in a detailed risk matrix and suggest concrete mitigation strategies for each.

**Step 3: Multi-Channel Campaign Creation (Actionable Detail)**
-   Develop specific, actionable strategies for key marketing channels.
-   For Amazon: Outline a detailed strategy for keywords (long-tail and short-tail), categories (at least 10), A+ content modules, and create 3 distinct Amazon Ads campaign structures (e.g., Auto, Keyword Targeting, Product Targeting) with sample ad copy.
-   For Social Media: Create a full 1-month content calendar for two key platforms (e.g., TikTok, Instagram). For the first week, provide the FULL post copy, visual ideas/prompts, and optimal hashtags for each day.
-   For Email Marketing: Outline a 7-part "Welcome & Nurture" email sequence for new subscribers. Provide the subject line and FULL body copy for each of the 7 emails.
-   For Influencers: Suggest 3 specific, real-world influencer profiles (or archetypes) ideal for this book and provide a personalized outreach email template for each.
-   Provide a detailed content marketing/SEO strategy, including 5 blog post ideas with target keywords, a brief outline, and a compelling title for each.

**Step 4: Asset Generation and Implementation Guide (Comprehensive Detail)**
-   Generate a library of ready-to-use marketing copy.
-   Write 3 compelling book blurbs (short, medium, and a long version for retail pages).
-   Write 10 different ad copy hooks, categorized by emotional angle (e.g., Curiosity, Fear, Urgency, Desire).
-   Provide detailed visual asset specifications and creative briefs (e.g., "For Instagram, create a moody, 5-slide cinematic carousel post using the following quote... a prompt for an AI image generator could be...").
-   Write 2 distinct scripts for a 30-second video trailer (e.g., one plot-focused, one theme-focused), including narration, on-screen text, and visual cues.
-   Create a comprehensive press release template, pre-filled with compelling hooks and quotes from the book.
-   Outline a detailed implementation timeline, breaking down the first 30 days into weekly action-item checklists.
`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [{ text: prompt }, manuscriptPart] },
        config: {
            responseMimeType: "application/json",
            maxOutputTokens: 16384,
            thinkingConfig: { thinkingBudget: 16384 },
            responseSchema: {
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
                                        action: { type: Type.STRING },
                                        details: { type: Type.STRING }
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
                                        action: { type: Type.STRING },
                                        details: { type: Type.STRING }
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
            }
        },
    });
    
    return handleJsonResponse(response);
};

export const researchWithGoogle = async (prompt: string): Promise<{ text: string, sources: any[] }> => {
    const ai = getGenAI();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{googleSearch: {}}],
        },
    });
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    return { text: response.text, sources };
};

let chat: Chat | null = null;
export const getChatInstance = (): Chat => {
    if(!chat) {
        const ai = getGenAI();
        chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: 'You are Bookmarketing.AI Mentor, a friendly and expert AI assistant for authors. Provide concise, actionable advice on book marketing.',
            },
        });
    }
    return chat;
}

export const generateSpeech = async (text: string, voiceName: string): Promise<AudioBuffer> => {
    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName },
            },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("TTS generation failed.");
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    
    const decode = (base64: string) => {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }

    const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
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
    };
    
    return await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
};

export const generateDistributionKit = async (formData: any): Promise<any> => {
    const ai = getGenAI();
    const { manuscriptFile, coverFile, title, author, genre, keywords, description, isbn, publisher, publicationDate, price } = formData;

    const coverPart = await fileToGenerativePart(coverFile);
    const manuscriptPart = await fileToGenerativePart(manuscriptFile);

    const prompt = `
Act as an expert publishing operations specialist and metadata manager. I'm providing an author's manuscript, book cover, and core metadata.
Your task is to generate a comprehensive, structured JSON object containing the core data elements for an ONIX 3.0 record.
Deeply analyze the manuscript to infer appropriate BISAC subject codes, audience codes, and to write a compelling, long-form description for retail listings.

**Core Metadata Provided:**
*   Title: ${title}
*   Author: ${author}
*   ISBN: ${isbn}
*   Publisher: ${publisher}
*   Publication Date: ${publicationDate}
*   Price: ${price.currency} ${price.amount}
*   Genre: ${genre}
*   Keywords: ${keywords}
*   Short Description/Blurb: ${description}

Based on all this information, generate the complete JSON output according to the schema.
`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [ { text: prompt }, coverPart, manuscriptPart ] },
        config: {
            responseMimeType: "application/json",
            maxOutputTokens: 16384,
            thinkingConfig: { thinkingBudget: 4096 },
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    product_identifier: {
                        type: Type.OBJECT,
                        properties: {
                            product_id_type: { type: Type.STRING, description: "Should be 'ISBN-13'" },
                            id_value: { type: Type.STRING, description: "The provided ISBN." }
                        }
                    },
                    descriptive_detail: {
                        type: Type.OBJECT,
                        properties: {
                            product_composition: { type: Type.STRING, description: "e.g., 'Single-item retail product'" },
                            product_form: { type: Type.STRING, description: "e.g., 'EB' for Ebook" },
                            title_detail: {
                                type: Type.OBJECT,
                                properties: {
                                    title_type: { type: Type.STRING, description: "e.g., 'Distinctive title (book)'" },
                                    title_element: {
                                        type: Type.OBJECT,
                                        properties: {
                                            title_text: { type: Type.STRING, description: "The main book title." }
                                        }
                                    }
                                }
                            },
                            contributor: {
                                type: Type.OBJECT,
                                properties: {
                                    sequence_number: { type: Type.INTEGER },
                                    contributor_role: { type: Type.STRING, description: "e.g., 'By author'" },
                                    person_name: { type: Type.STRING, description: "The author's name." }
                                }
                            },
                            language: {
                                type: Type.OBJECT,
                                properties: {
                                    language_role: { type: Type.STRING, description: "e.g., 'Language of text'" },
                                    language_code: { type: Type.STRING, description: "e.g., 'eng'" }
                                }
                            },
                            subject: {
                                type: Type.ARRAY,
                                description: "Generate 3-5 relevant BISAC codes based on the manuscript.",
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        subject_scheme_identifier: { type: Type.STRING, description: "Should be 'BISAC Subject Heading'" },
                                        subject_code: { type: Type.STRING, description: "A valid BISAC code, e.g., 'FIC031010'" },
                                        subject_heading_text: { type: Type.STRING, description: "The descriptive text for the BISAC code, e.g., 'FICTION / Thrillers / Suspense'" }
                                    }
                                }
                            },
                             audience: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        audience_code_type: { type: Type.STRING, description: "e.g., 'ONIX Audience codes'" },
                                        audience_code_value: { type: Type.STRING, description: "e.g., '01' for General/Trade" }
                                    }
                                }
                            }
                        }
                    },
                    collateral_detail: {
                        type: Type.OBJECT,
                        properties: {
                            text_content: {
                                type: Type.ARRAY,
                                items: {
                                     type: Type.OBJECT,
                                     properties: {
                                         text_type: { type: Type.STRING, description: "e.g., 'Description'" },
                                         content_audience: { type: Type.STRING, description: "e.g., 'For general public'" },
                                         text: { type: Type.STRING, description: "A compelling, long-form book description (300-500 words) generated from the manuscript." }
                                     }
                                }
                            }
                        }
                    },
                    publishing_detail: {
                        type: Type.OBJECT,
                        properties: {
                            publisher: {
                                type: Type.OBJECT,
                                properties: {
                                    publishing_role: { type: Type.STRING, description: "e.g., 'Publisher'" },
                                    publisher_name: { type: Type.STRING, description: "The provided publisher's name." }
                                }
                            },
                            publication_date: { type: Type.STRING, description: "The provided publication date in YYYY-MM-DD format." }
                        }
                    },
                    product_supply: {
                        type: Type.OBJECT,
                        properties: {
                            supply_detail: {
                                type: Type.OBJECT,
                                properties: {
                                    supplier: {
                                        type: Type.OBJECT,
                                        properties: {
                                            supplier_role: { type: Type.STRING, description: "e.g., 'Publisher to retailers'" },
                                            supplier_name: { type: Type.STRING, description: "The provided publisher's name." }
                                        }
                                    },
                                    product_availability: { type: Type.STRING, description: "e.g., 'Available'" },
                                    price: {
                                        type: Type.OBJECT,
                                        properties: {
                                            price_type: { type: Type.STRING, description: "e.g., 'RRP, excluding tax'" },
                                            price_amount: { type: Type.NUMBER },
                                            currency_code: { type: Type.STRING, description: "e.g., 'USD'" }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
    });
    
    return handleJsonResponse(response);
};

export const generateWebsitePlan = async (pdfFile: File): Promise<any> => {
    const ai = getGenAI();
    const pdfPart = await fileToGenerativePart(pdfFile);

    const prompt = `
Act as an expert web designer and book marketing strategist specializing in high-converting author websites. I have uploaded the manuscript of a book as a PDF.
Your task is to deeply analyze the book's content, genre, tone, and themes to generate a comprehensive plan for an author website.
The design and content must be tailored to attract the book's ideal readers and encourage them to buy the book or join the author's mailing list.
The output must be a JSON object conforming to the provided schema.

- For the color palette, choose colors that reflect the book's mood. Provide hex codes.
- For typography, suggest Google Fonts that are readable and match the genre.
- For content, all copy should be compelling and written in a tone that resonates with the target audience.
`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [ { text: prompt }, pdfPart ] },
        config: {
            responseMimeType: "application/json",
            maxOutputTokens: 16384,
            thinkingConfig: { thinkingBudget: 4096 },
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    siteTitle: { type: Type.STRING, description: "A catchy title for the website, e.g., 'The World of [Book Title]' or '[Author Name] - Official Site'."},
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
                            summary: { type: Type.STRING, description: "An extended, enticing summary of the book." },
                            keyThemes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of 3-5 key themes explored in the book." }
                        }
                    },
                    aboutTheAuthorSection: {
                        type: Type.OBJECT,
                        description: "A section to connect the reader with the author.",
                        properties: {
                            bioSuggestion: { type: Type.STRING, description: "A short paragraph suggesting how the author should frame their bio to connect with readers of this book." },
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
            }
        },
    });

    return handleJsonResponse(response);
};

export const generateSalesFunnel = async (manuscriptFile: File): Promise<any> => {
    const ai = getGenAI();
    const manuscriptPart = await fileToGenerativePart(manuscriptFile);

    const prompt = `
Act as an expert 7-figure marketing funnel architect specializing in high-conversion book launches.
I have provided a book manuscript. Your task is to analyze its content, tone, and themes to generate a complete, high-converting sales funnel plan.
The output must be a detailed JSON object conforming to the provided schema.
All generated copy (headlines, emails, ads) must be persuasive, emotionally resonant, and perfectly tailored to the book's ideal reader.
`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [{ text: prompt }, manuscriptPart] },
        config: {
            responseMimeType: "application/json",
            maxOutputTokens: 16384,
            thinkingConfig: { thinkingBudget: 4096 },
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    funnelName: { type: Type.STRING, description: "A catchy, descriptive name for this funnel, e.g., 'The Crimson Cipher Bestseller Funnel'." },
                    targetAudienceSummary: { type: Type.STRING, description: "A 2-3 sentence summary of the ideal reader this funnel is designed to attract." },
                    topOfFunnel: {
                        type: Type.OBJECT,
                        properties: {
                            leadMagnet: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING, description: "A compelling title for the lead magnet." },
                                    description: { type: Type.STRING, description: "A short description of the lead magnet." },
                                    format: { type: Type.STRING, description: "e.g., PDF Checklist, Bonus Chapter, Video Training" }
                                }
                            },
                            adCopy: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        platform: { type: Type.STRING, description: "e.g., Facebook/Instagram, TikTok, Google Ads" },
                                        headline: { type: Type.STRING },
                                        body: { type: Type.STRING }
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
                                    headline: { type: Type.STRING, description: "The main headline for the lead magnet opt-in page." },
                                    subheadline: { type: Type.STRING },
                                    bulletPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-5 benefit-driven bullet points." },
                                    callToAction: { type: Type.STRING, description: "The text for the sign-up button." }
                                }
                            },
                            emailNurtureSequence: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        day: { type: Type.INTEGER },
                                        subject: { type: Type.STRING },
                                        body: { type: Type.STRING, description: "The full email body in Markdown format." }
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
                                    headline: { type: Type.STRING },
                                    videoScriptHook: { type: Type.STRING, description: "The first 15 seconds of a sales video script." },
                                    longFormCopyOutline: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of section headers for the sales page." },
                                    callToAction: { type: Type.STRING, description: "The text for the main buy button." }
                                }
                            },
                            orderBump: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING, description: "e.g., 'Add the Audiobook for just $7!'" },
                                    description: { type: Type.STRING },
                                    pricePoint: { type: Type.STRING, description: "e.g., $7, $19.99" }
                                }
                            },
                            oneTimeOfferUpsell: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING, description: "e.g., 'Get the Author's Masterclass Bundle!'" },
                                    description: { type: Type.STRING },
                                    pricePoint: { type: Type.STRING, description: "e.g., $47, $97" }
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    return handleJsonResponse(response);
};

export const generateCompleteVideoMarketingPlan = async (formData: any): Promise<any> => {
    const ai = getGenAI();
    const { manuscriptFile, metadata, authorGoal, platformTargets, tonePreference } = formData;

    const manuscriptPart = await fileToGenerativePart(manuscriptFile);

    const prompt = `
    ROLE: You are a senior product designer + AI workflow architect specializing in turning long-form text (like book manuscripts) into high-converting marketing videos for authors.

    OBJECTIVE: Design a complete, end-to-end Marketing Video Creator plan. I have provided a manuscript file and author-provided metadata. Your output should be a ready-to-use marketing video asset plan as a comprehensive JSON object.

    METADATA & GOALS:
    - Book Title: ${metadata.title}
    - Subtitle: ${metadata.subtitle}
    - Genre: ${metadata.genre}
    - Target Audience: ${metadata.targetAudience}
    - Positioning Statement: ${metadata.positioningStatement}
    - Author's Primary Goal: ${authorGoal}
    - Target Platforms: ${platformTargets.join(', ')}
    - Desired Tone/Style: ${tonePreference}

    TASK:
    1.  **Analyze Manuscript:** Deeply analyze the provided manuscript file to extract core themes, the book's promise, stakes, conflict, transformation, and key emotional hooks. Identify the ideal reader avatar and their pain points/desires. Pull out 5-10 standout quotes.
    2.  **Generate Core Video Concept:** Create a "core" hero video concept. This includes 3-5 hook line options, a full script (30-60s variant) with narration and on-screen text cues, and CTA options tailored to the author's goal.
    3.  **Generate Shot List:** Create a scene-by-scene visual direction breakdown for the core script, including A-roll and B-roll suggestions, pacing notes, and text overlay guidance.
    4.  **Generate Derivative Micro-Videos:** Based on the analysis, generate 5 simple, distinct micro-video ideas (e.g., quote videos, theme spotlights) that can be quickly produced. For each, provide a brief concept and the text/quote to use.
    5.  **Adapt for Platforms:** For each target platform specified (${platformTargets.join(', ')}), adapt the "core" video concept. Provide platform-specific duration notes, hook variants, caption text with hashtags, and thumbnail/title ideas where applicable.

    Your final output MUST be a single, valid JSON object that strictly adheres to the provided schema. Do not include any explanatory text outside of the JSON structure.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [{ text: prompt }, manuscriptPart] },
        config: {
            responseMimeType: "application/json",
            maxOutputTokens: 16384,
            thinkingConfig: { thinkingBudget: 4096 },
            responseSchema: {
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
            }
        },
    });

    return handleJsonResponse(response);
};


export { GoogleGenAI };