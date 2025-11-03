
import React, { useState } from 'react';
import { generateImage } from '../services/geminiService';
import { AspectRatio } from '../types';
import { LoadingSpinner } from './LoadingSpinner';

const aspectRatios: AspectRatio[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];

export const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt) {
      setError('Please enter a prompt.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);
    try {
      const imageUrl = await generateImage(prompt, aspectRatio);
      setGeneratedImage(imageUrl);
    } catch (e) {
      setError('Failed to generate image. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold">AI Illustrator</h2>
        <p className="text-indigo-200">Generate unique artwork for your book from a text description.</p>
      </div>
      
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., A majestic dragon flying over a futuristic city, cinematic lighting"
          className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md mb-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none h-28"
        />
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-grow">
            <label htmlFor="aspect-ratio" className="block text-sm font-medium text-indigo-200 mb-1">Aspect Ratio</label>
            <select
              id="aspect-ratio"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {aspectRatios.map(ar => <option key={ar} value={ar}>{ar}</option>)}
            </select>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full sm:w-auto self-end px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Generating...' : 'Generate Image'}
          </button>
        </div>
      </div>

      {error && <p className="text-red-400 mt-4 text-center">{error}</p>}

      <div className="mt-8">
        {isLoading && <LoadingSpinner message="Conjuring your masterpiece..." />}
        {generatedImage && (
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-4">Your Generated Image</h3>
            <img src={generatedImage} alt="Generated artwork" className="max-w-full mx-auto rounded-lg shadow-xl" />
          </div>
        )}
      </div>
    </div>
  );
};
