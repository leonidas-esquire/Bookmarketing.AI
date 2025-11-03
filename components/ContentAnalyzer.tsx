
import React, { useState, useCallback } from 'react';
import { analyzeImage } from '../services/geminiService';
import { FileUploader } from './FileUploader';
import { LoadingSpinner } from './LoadingSpinner';
import ReactMarkdown from 'react-markdown';

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

export const ContentAnalyzer: React.FC = () => {
  const [image, setImage] = useState<{file: File, url: string} | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((file: File, url: string) => {
    setImage({file, url});
    setAnalysisResult(null);
  }, []);

  const handleAnalyze = async () => {
    if (!image) {
      setError('Please upload an image to analyze.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    try {
      const base64Image = await fileToBase64(image.file);
      const prompt = "Analyze this book cover for marketability in the fantasy/sci-fi genre. Provide detailed, constructive feedback on its strengths and weaknesses regarding: 1. Visual Impact & Composition 2. Typography & Title Readability 3. Genre Conventions & Audience Appeal 4. Overall Emotional Tone. Format your response in Markdown.";
      const result = await analyzeImage(base64Image, image.file.type, prompt);
      setAnalysisResult(result);
    } catch (e) {
      setError('Failed to analyze image. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold">Cover Feedback AI</h2>
        <p className="text-indigo-200">Get instant, AI-powered feedback on your book cover design.</p>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
        <FileUploader onFileSelect={handleFileSelect} accept="image/*" label="Upload Book Cover" />
        <button
          onClick={handleAnalyze}
          disabled={isLoading || !image}
          className="w-full mt-4 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Analyzing...' : 'Analyze Cover'}
        </button>
      </div>

      {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
      
      <div className="mt-8">
        {isLoading && <LoadingSpinner message="Our AI expert is reviewing your cover..." />}
        {analysisResult && (
          <div className="bg-gray-800 p-6 rounded-lg prose prose-invert prose-p:text-indigo-100 prose-headings:text-white max-w-none">
            <ReactMarkdown>{analysisResult}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};
