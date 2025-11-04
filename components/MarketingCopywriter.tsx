
import React, { useState } from 'react';
import { generateContent } from '../services/geminiService';
import { LoadingSpinner } from './LoadingSpinner';
import ReactMarkdown from 'react-markdown';

type CopyType = 'blurb' | 'social' | 'ad';

const copyPrompts: Record<CopyType, { model: 'gemini-2.5-pro' | 'gemini-2.5-flash' | 'gemini-flash-lite-latest', prompt: string, title: string }> = {
  blurb: { model: 'gemini-2.5-pro', prompt: "Act as a professional book copywriter. Using the following text, write a compelling, dramatic, and enticing book blurb (around 150-200 words) that hooks the reader and makes them want to buy the book. End with a gripping tagline. Here's the text:", title: "Book Blurb (Pro)" },
  social: { model: 'gemini-2.5-flash', prompt: "You are a social media manager for an author. Based on the text below, write three distinct social media posts to promote the book: one for Twitter (short and punchy with hashtags), one for Instagram (engaging, with a question for followers), and one for Facebook (slightly longer, more descriptive). Here's the text:", title: "Social Media Posts (Flash)" },
  ad: { model: 'gemini-flash-lite-latest', prompt: "You are an expert in digital advertising. From the text provided, generate five short, high-impact ad copy variations for platforms like Facebook or Google Ads. Each should be under 25 words and have a clear call-to-action. Here's the text:", title: "Ad Copy (Flash-Lite)" },
};

export const MarketingCopywriter: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [copyType, setCopyType] = useState<CopyType>('blurb');
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!inputText) {
      setError('Please paste some text from your book.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const { model, prompt } = copyPrompts[copyType];
      const fullPrompt = `${prompt}\n\n---\n\n${inputText}`;
      const generatedResult = await generateContent(fullPrompt, model);
      setResult(generatedResult);
    } catch (e) {
      setError('Failed to generate copy. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const getCleanTitle = (type: CopyType) => copyPrompts[type].title.replace(/\s\(.*\)/, '');

  return (
    <div className="max-w-4xl mx-auto p-4 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold">Marketing Copywriter</h2>
        <p className="text-indigo-200">Generate compelling marketing copy from your manuscript.</p>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste a chapter summary, character description, or key scene here..."
          className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md mb-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none h-48"
        />
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-indigo-200 mb-2">Select Copy Type</label>
          <div className="flex border-b border-gray-700" role="tablist" aria-label="Copy Types">
            {(Object.keys(copyPrompts) as CopyType[]).map(key => (
              <button
                key={key}
                id={`tab-${key}`}
                role="tab"
                aria-selected={copyType === key}
                aria-controls={`panel-${copyType}`}
                onClick={() => setCopyType(key)}
                className={`px-4 py-2 font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 rounded-t-md ${
                  copyType === key
                    ? 'border-b-2 border-indigo-500 text-white bg-gray-700/50'
                    : 'text-gray-400 hover:text-white border-b-2 border-transparent'
                }`}
              >
                {getCleanTitle(key)}
              </button>
            ))}
          </div>
        </div>
        
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Writing...' : `Generate ${getCleanTitle(copyType)}`}
        </button>
      </div>
      
      {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
      
      <div className="mt-8">
        {isLoading && <LoadingSpinner message="Our AI copywriter is on it..." />}
        {result && (
          <div className="bg-gray-800 p-6 rounded-lg prose prose-invert prose-p:text-indigo-100 prose-headings:text-white max-w-none" id={`panel-${copyType}`} role="tabpanel" aria-labelledby={`tab-${copyType}`}>
            <ReactMarkdown>{result}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};
