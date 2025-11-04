import React, { useState, useCallback } from 'react';
import { analyzeAudience } from '../services/geminiService';
import { FileUploader } from './FileUploader';
import { LoadingSpinner } from './LoadingSpinner';
import { AudienceProfileDisplay } from './AudienceProfileDisplay';

export const AudienceAnalyzer: React.FC = () => {
  const [manuscriptFile, setManuscriptFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    setError(null);
    setAnalysisResult(null);
    setManuscriptFile(file);
  }, []);

  const handleAnalyze = async () => {
    if (!manuscriptFile) {
      setError('Please upload your manuscript first.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    try {
      const result = await analyzeAudience(manuscriptFile);
      setAnalysisResult(result);
    } catch (e) {
      setError('Failed to analyze the manuscript. The file may be invalid or the analysis failed. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 animate-fade-in">
      {!analysisResult && (
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold">Audience Analyzer</h2>
                <p className="text-indigo-200">Upload your manuscript to discover who will love your book.</p>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                <FileUploader onFileSelect={(file) => handleFileSelect(file)} accept=".pdf,.md,.txt" label="Upload Manuscript (.pdf, .md, .txt)" />
                <button
                onClick={handleAnalyze}
                disabled={isLoading || !manuscriptFile}
                className="w-full mt-4 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed"
                >
                {isLoading ? 'Analyzing...' : 'Find My Audience'}
                </button>
            </div>
        </div>
      )}

      {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
      
      <div className="mt-8">
        {isLoading && <LoadingSpinner message="Profiling your perfect reader..." />}
        {analysisResult && (
          <div>
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold">Ideal Reader Profile</h2>
                <p className="text-indigo-200">Here is the detailed breakdown of your target audience.</p>
                 <button onClick={() => setAnalysisResult(null)} className="mt-4 px-4 py-2 text-sm bg-indigo-700 text-white font-semibold rounded-md hover:bg-indigo-800">
                    Analyze Another
                </button>
            </div>
            <AudienceProfileDisplay result={analysisResult} />
          </div>
        )}
      </div>
    </div>
  );
};