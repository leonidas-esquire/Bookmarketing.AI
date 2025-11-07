import React, { useState } from 'react';
import { researchWithGoogle } from '../services/geminiService';
import { exportResearchToPDF } from '../services/pdfExportService';
import { LoadingSpinner } from './LoadingSpinner';
import ReactMarkdown from 'react-markdown';

interface ResearchResult {
    text: string;
    sources: any[];
}

export const MarketResearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query) {
      setError('Please enter a research question.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const researchResult = await researchWithGoogle(query);
      setResult(researchResult);
    } catch (e) {
      setError('Failed to perform research. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!result || !query) return;
    setIsExporting(true);
    setError(null);
    try {
        await exportResearchToPDF(result, query);
    } catch (e) {
        console.error("PDF Export failed", e);
        setError("An error occurred while exporting the PDF.");
    } finally {
        setIsExporting(false);
    }
  };


  return (
    <div className="max-w-4xl mx-auto p-4 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold">Trend Spotter</h2>
        <p className="text-indigo-200">Get up-to-date marketing intelligence powered by Google Search.</p>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <div className="flex gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="e.g., What are current marketing trends for YA fantasy books on TikTok?"
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed"
          >
            {isLoading ? <i className="fas fa-spinner fa-spin"></i> : 'Research'}
          </button>
        </div>
      </div>
      
      {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
      
      <div className="mt-8">
        {isLoading && <LoadingSpinner message="Searching the web for the latest insights..." />}
        {result && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Research Results</h3>
                <button 
                    onClick={handleExport}
                    disabled={isExporting}
                    className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-700 transition-colors disabled:bg-purple-800 text-sm"
                >
                    {isExporting ? <><i className="fas fa-spinner fa-spin mr-2"></i>Exporting...</> : <><i className="fas fa-file-pdf mr-2"></i>Export to PDF</>}
                </button>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg prose prose-invert prose-p:text-indigo-100 prose-headings:text-white max-w-none">
                <ReactMarkdown>{result.text}</ReactMarkdown>
            </div>
            {result.sources && result.sources.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">Sources:</h3>
                    <ul className="list-disc list-inside space-y-2">
                        {result.sources.map((source, index) => (
                            source.web?.uri && (
                                <li key={index}>
                                    <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                                        {source.web.title || source.web.uri}
                                    </a>
                                </li>
                            )
                        ))}
                    </ul>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};