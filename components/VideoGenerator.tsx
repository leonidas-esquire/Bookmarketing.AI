import React, { useState, useCallback, useEffect } from 'react';
import { generateVideoFromText, generateVideoFromImage } from '../services/geminiService';
import { FileUploader } from './FileUploader';
import { LoadingSpinner } from './LoadingSpinner';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
        if (typeof reader.result === 'string') {
            resolve(reader.result.split(',')[1]);
        } else {
            reject(new Error("Failed to read file as base64 string."));
        }
    };
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
};

const tonePreferences = [
    'None',
    'Epic & Cinematic',
    'Intimate & Personal',
    'Inspirational & Uplifting',
    'Mysterious & Suspenseful',
    'Playful & Humorous',
    'Fast-Paced & Energetic'
];


export const VideoGenerator: React.FC = () => {
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<{file: File, url: string} | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');
  const [tone, setTone] = useState<string>(tonePreferences[0]);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeySelected, setApiKeySelected] = useState(false);


  const checkApiKey = useCallback(async () => {
    if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setApiKeySelected(hasKey);
    } else {
        // Fallback for environments where aistudio is not available
        setApiKeySelected(true); 
    }
  }, []);

  useEffect(() => {
    checkApiKey();
  }, [checkApiKey]);

  const handleSelectKey = async () => {
      if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
          await window.aistudio.openSelectKey();
          // Assume success to avoid race conditions and re-check on next action
          setApiKeySelected(true);
      }
  };

  const handleFileSelect = useCallback((file: File, url: string) => {
    setImageFile({file, url});
  }, []);

  const handleGenerate = async () => {
    await checkApiKey();
    if (!apiKeySelected) {
        setError("Please select an API key to use Veo.");
        return;
    }

    if (!prompt) {
      setError('A text prompt is required.');
      return;
    }
    if (mode === 'image' && !imageFile) {
      setError('Please upload an image for image-to-video generation.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setGeneratedVideo(null);
    
    try {
      let finalPrompt = prompt;
      if (tone !== 'None') {
          finalPrompt = `Create a ${tone.toLowerCase()} video of: ${prompt}`;
      }

      let videoUrl;
      if (mode === 'image' && imageFile) {
        const base64 = await fileToBase64(imageFile.file);
        videoUrl = await generateVideoFromImage(finalPrompt, base64, imageFile.file.type, aspectRatio, resolution);
      } else {
        videoUrl = await generateVideoFromText(finalPrompt, aspectRatio, resolution);
      }
      setGeneratedVideo(videoUrl);
    } catch (e: any) {
        if(e.message?.includes("Requested entity was not found")) {
            setError("API key is invalid. Please select a valid key.");
            setApiKeySelected(false);
        } else {
            setError('Failed to generate video. This can take several minutes. Please try again.');
        }
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold">Viral Video Generator</h2>
        <p className="text-indigo-200">Create short video clips from text or by animating your cover.</p>
      </div>

      {!apiKeySelected && (
          <div className="bg-yellow-900 border border-yellow-600 text-yellow-200 p-4 rounded-lg mb-6 text-center">
              <p className="font-bold mb-2">Veo Video Generation Requires an API Key</p>
              <p className="text-sm mb-4">Please select your API key to proceed. Billing is handled by Google AI Studio. <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Learn more about billing.</a></p>
              <button onClick={handleSelectKey} className="bg-yellow-600 text-yellow-950 font-bold py-2 px-4 rounded hover:bg-yellow-500 transition-colors">
                  Select API Key
              </button>
          </div>
      )}

      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <div className="flex border-b border-gray-700 mb-4">
          <button onClick={() => setMode('text')} className={`px-4 py-2 font-semibold ${mode === 'text' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400'}`}>Text-to-Video</button>
          <button onClick={() => setMode('image')} className={`px-4 py-2 font-semibold ${mode === 'image' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400'}`}>Image-to-Video</button>
        </div>
        
        {mode === 'image' && (
            <div className="mb-4">
                <FileUploader onFileSelect={handleFileSelect} accept="image/*" label="Upload Book Cover or Image" />
            </div>
        )}
        
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={mode === 'text' ? "e.g., A lone astronaut discovering a glowing alien artifact on a desolate moon." : "e.g., The character on the cover blinks, subtle wind blows through the trees in the background."}
          className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md mb-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none h-28"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label htmlFor="aspect-ratio-vid" className="block text-sm font-medium text-indigo-200 mb-1">Aspect Ratio</label>
            <select
              id="aspect-ratio-vid"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as '16:9' | '9:16')}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="16:9">16:9 (Landscape)</option>
              <option value="9:16">9:16 (Portrait)</option>
            </select>
          </div>
          <div>
            <label htmlFor="resolution-vid" className="block text-sm font-medium text-indigo-200 mb-1">Resolution</label>
            <select
              id="resolution-vid"
              value={resolution}
              onChange={(e) => setResolution(e.target.value as '720p' | '1080p')}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="720p">720p (Fast)</option>
              <option value="1080p">1080p (High Quality)</option>
            </select>
          </div>
          <div>
            <label htmlFor="tone-vid" className="block text-sm font-medium text-indigo-200 mb-1">Tone & Style</label>
            <select
              id="tone-vid"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {tonePreferences.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={isLoading || !apiKeySelected}
            className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Generating...' : 'Generate Video'}
          </button>
        </div>
      </div>
      
      {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
      
      <div className="mt-8">
        {isLoading && <LoadingSpinner message="Generating your video... This can take several minutes. Please be patient." />}
        {generatedVideo && (
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-4">Your Generated Video</h3>
            <video src={generatedVideo} controls className="max-w-full mx-auto rounded-lg shadow-xl" />
          </div>
        )}
      </div>
    </div>
  );
};