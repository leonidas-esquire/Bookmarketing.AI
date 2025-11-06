import React from 'react';
import ReactMarkdown from 'react-markdown';

interface AnalysisDisplayProps {
    analysisText: string;
    onGenerateCampaign: () => void;
    onReset: () => void;
}

export const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ analysisText, onGenerateCampaign, onReset }) => {
    return (
        <div className="max-w-4xl mx-auto p-4 animate-fade-in">
            <div className="text-center mb-6">
                <h2 className="text-3xl font-bold">Manuscript Analysis Complete</h2>
                <p className="text-indigo-200 mt-2">
                    This is the "Book DNA" the AI will use to build your campaign. Review it, then proceed.
                </p>
            </div>

            <div 
                className="bg-gray-800 p-6 rounded-lg prose prose-invert max-w-none prose-p:text-indigo-100 prose-headings:text-white max-h-[60vh] overflow-y-auto border border-gray-700"
            >
                <ReactMarkdown>{analysisText}</ReactMarkdown>
            </div>
            
            <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
                 <button 
                    onClick={onReset} 
                    className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-700 transition-colors"
                >
                    <i className="fas fa-arrow-left mr-2"></i>Start Over
                </button>
                 <button 
                    onClick={onGenerateCampaign} 
                    className="px-8 py-4 bg-indigo-600 text-white font-bold text-lg rounded-md hover:bg-indigo-700 transition-colors shadow-lg transform hover:scale-105"
                >
                    Generate Full Marketing Campaign <i className="fas fa-rocket ml-2"></i>
                </button>
            </div>
        </div>
    );
};
