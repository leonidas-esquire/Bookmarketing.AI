
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


export const generateVideoFromText = async (prompt: string, aspectRatio: "16:9" | "9:16") => {
    const ai = getGenAI();
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
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

export const generateVideoFromImage = async (prompt: string, imageBase64: string, mimeType: string, aspectRatio: "16:9" | "9:16") => {
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
        resolution: '720p',
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

export const analyzeAudience = async (manuscriptFile: File): Promise<any> => {
    const ai = getGenAI();
    const manuscriptPart = await fileToGenerativePart(manuscriptFile);

    const prompt = `
Act as an expert book marketing analyst. I have provided a manuscript file. Your task is to perform a deep analysis of the text content and generate a detailed "Ideal Reader Profile".
The output must be a structured JSON object that adheres to the provided schema. Analyze the content deeply to provide insightful and specific details for each field.
Finally, generate a set of targeted marketing copy designed to resonate with this specific reader profile and drive sales.
`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [{ text: prompt }, manuscriptPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    demographics: {
                        type: Type.OBJECT,
                        properties: {
                            ageRange: { type: Type.STRING, description: "e.g., 18-25, 35-45" },
                            gender: { type: Type.STRING, description: "e.g., Primarily female, Skews male, All genders" },
                            educationLevel: { type: Type.STRING, description: "e.g., High School, College Graduate, Post-graduate" },
                            occupations: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of 3-5 likely professions." }
                        }
                    },
                    psychographics: {
                        type: Type.OBJECT,
                        properties: {
                            coreValues: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of core values like Adventure, Family, Justice." },
                            hobbiesAndInterests: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of hobbies like Hiking, Video games, Baking." },
                            lifestyle: { type: Type.STRING, description: "e.g., Urban professional, Suburban parent, Digital nomad" },
                            mediaConsumption: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of media habits, e.g., 'Listens to true crime podcasts', 'Reads The New Yorker'." }
                        }
                    },
                    comparableTitles: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                author: { type: Type.STRING },
                                reason: { type: Type.STRING, description: "A brief explanation of why this title is a good comparison." }
                            }
                        }
                    },
                    marketingHooks: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                hook: { type: Type.STRING, description: "A key emotional trigger or theme from the manuscript." },
                                explanation: { type: Type.STRING, description: "A brief explanation of why this hook will be effective." }
                            }
                        }
                    },
                    targetedMarketingCopy: {
                        type: Type.OBJECT,
                        description: "Marketing copy specifically tailored to the ideal reader profile.",
                        properties: {
                            facebookAdCopy: { type: Type.STRING, description: "A short, compelling ad copy for a Facebook campaign, targeting the ideal reader." },
                            instagramPostCopy: { type: Type.STRING, description: "An engaging Instagram post caption. Include a call-to-action and suggest relevant hashtags." },
                            emailSubjectLines: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of 3-5 attention-grabbing email subject lines for a newsletter announcement." }
                        }
                    }
                }
            }
        }
    });
    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
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
    const { manuscriptText, coverFile, title, author, genre, keywords, description, channels } = formData;

    const coverPart = await fileToGenerativePart(coverFile);

    const prompt = `
Act as a world-class book launch strategist. I'm providing an author's manuscript excerpt, book cover, and metadata.
Generate a comprehensive "Distribution Kit" as a JSON object based on the provided schema.
Deeply analyze the content to create tailored, high-quality marketing materials for these channels: ${channels.join(', ')}.

**Metadata:**
*   Title: ${title}
*   Author: ${author}
*   Genre: ${genre}
*   Keywords: ${keywords}
*   Book Description: ${description}

**Manuscript Excerpt:**
---
${manuscriptText}
---
`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [ { text: prompt }, coverPart ] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    amazonKdp: {
                        type: Type.OBJECT,
                        properties: {
                            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                            categories: { type: Type.ARRAY, items: { type: Type.STRING } },
                            aPlusContentIdeas: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING } } } }
                        }
                    },
                    socialMedia: {
                        type: Type.OBJECT,
                        properties: {
                            postIdeas: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { ideaTitle: { type: Type.STRING }, instagramCopy: { type: Type.STRING }, twitterCopy: { type: Type.STRING }, facebookCopy: { type: Type.STRING }, hashtags: { type: Type.STRING } } } },
                            imagePrompts: { type: Type.ARRAY, items: { type: Type.STRING } },
                            videoConcepts: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, concept: { type: Type.STRING } } } }
                        }
                    },
                    authorWebsite: {
                        type: Type.OBJECT,
                        properties: {
                            pressKitMarkdown: { type: Type.STRING },
                            blogPostTopics: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, outline: { type: Type.STRING } } } }
                        }
                    },
                    emailNewsletter: {
                        type: Type.OBJECT,
                        properties: {
                            launchAnnouncement: { type: Type.OBJECT, properties: { subject: { type: Type.STRING }, body: { type: Type.STRING } } }
                        }
                    }
                }
            }
        },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
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

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
};


export { GoogleGenAI };