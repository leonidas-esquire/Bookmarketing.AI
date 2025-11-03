
import React, { useState, useCallback } from 'react';
import { analyzeAudience } from '../services/geminiService';
import { FileUploader } from './FileUploader';
import { LoadingSpinner } from './LoadingSpinner';
import ReactMarkdown from 'react-markdown';

export const AudienceAnalyzer: React.FC = () => {
  const [manuscriptText, setManuscriptText] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    setError(null);
    setAnalysisResult(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setManuscriptText(text);
      } else {
        setError("Could not read the file content.");
      }
    };
    reader.onerror = () => {
        setError("Failed to read the file.");
    }
    reader.readAsText(file);
  }, []);

  const handleAnalyze = async () => {
    if (!manuscriptText) {
      setError('Please upload your manuscript first.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    try {
      const result = await analyzeAudience(manuscriptText);
      setAnalysisResult(result);
    } catch (e) {
      setError('Failed to analyze the manuscript. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold">Audience Analyzer</h2>
        <p className="text-indigo-200">Upload your manuscript to discover who will love your book.</p>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
        <FileUploader onFileSelect={(file) => handleFileSelect(file)} accept="text/plain,.txt" label="Upload Manuscript (.txt file)" />
        <button
          onClick={handleAnalyze}
          disabled={isLoading || !manuscriptText}
          className="w-full mt-4 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Analyzing...' : 'Find My Audience'}
        </button>
      </div>

      {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
      
      <div className="mt-8">
        {isLoading && <LoadingSpinner message="Profiling your perfect reader..." />}
        {analysisResult && (
          <div className="bg-gray-800 p-6 rounded-lg prose prose-invert prose-p:text-indigo-100 prose-headings:text-white max-w-none">
            <ReactMarkdown>{analysisResult}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};
