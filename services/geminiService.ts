
import { GoogleGenAI, GenerateContentResponse, Modality, Chat, Type } from "@google/genai";

const getGenAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY as string });

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

export const analyzeAudience = async (manuscriptText: string): Promise<string> => {
    const ai = getGenAI();
    const prompt = `
Act as an expert book marketing analyst. I have provided a manuscript excerpt below. Your task is to perform a deep analysis of the text and generate a detailed "Ideal Reader Profile".

The profile must be structured in Markdown and include the following sections:

## 🎯 Ideal Reader Profile

### **1. Primary Demographics**
*   **Age Range:** (e.g., 18-25, 35-45)
*   **Gender:** (e.g., Primarily female, Skews male, All genders)
*   **Education Level:** (e.g., High School, College Graduate, Post-graduate)
*   **Potential Occupations:** (List a few likely professions)

### **2. Psychographics & Interests**
*   **Core Values:** (e.g., Adventure, Family, Justice, Intellectual curiosity)
*   **Hobbies and Interests:** (e.g., Hiking, Video games, Historical documentaries, Baking)
*   **Lifestyle:** (e.g., Urban professional, Suburban parent, Digital nomad)
*   **Media Consumption:** (e.g., Listens to true crime podcasts, reads The New Yorker, follows sci-fi influencers on Instagram)

### **3. Comparable Authors & Titles**
*   List 3-5 recently published books and/or authors that this reader would also enjoy. Briefly explain *why* each is a good comparison.

### **4. Key Marketing Hooks**
*   Identify the top 3-5 emotional triggers or key themes from the manuscript that would be most effective in ad copy, social media posts, and book blurbs.

---
MANUSCRIPT TEXT:
${manuscriptText}
`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-pro', contents: prompt });
    return response.text;
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

export const generateSpeech = async (text: string): Promise<AudioBuffer> => {
    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
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


export { GoogleGenAI };
