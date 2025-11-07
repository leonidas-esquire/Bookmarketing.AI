
import React, { useState } from 'react';
import { generateMultiChannelStrategy } from '../services/geminiService';
import { exportStrategyToPDF } from '../services/pdfExportService';
import { LoadingSpinner } from './LoadingSpinner';
import ReactMarkdown from 'react-markdown';

interface MultiChannelStrategyGeneratorProps {
    bookAnalysis: string | null;
    bookTitle: string;
}

const InfoCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={className}>
        <h4 className="font-semibold text-lg text-indigo-300 mb-2">{title}</h4>
        <div className="bg-gray-900/70 p-4 rounded-lg space-y-2 text-indigo-100 prose prose-sm prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
            {children}
        </div>
    </div>
);

const Tag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="inline-block bg-indigo-500 bg-opacity-20 text-indigo-200 text-sm font-medium px-3 py-1 rounded-full">
        {children}
    </span>
);

const PlanDisplay: React.FC<{ plan: any, bookTitle: string }> = ({ plan, bookTitle }) => {
    const [isExporting, setIsExporting] = useState(false);
    const strat = plan.step3_multiChannelCampaigns;
    
    const handleExport = async () => {
        setIsExporting(true);
        try {
            await exportStrategyToPDF(plan, bookTitle);
        } catch (e) {
            console.error("PDF Export failed", e);
            alert("An error occurred during export.");
        } finally {
            setIsExporting(false);
        }
    };
    
    return (
         <div className="max-w-4xl mx-auto animate-fade-in">
             <div className="text-center mb-6">
                <h2 className="text-3xl font-bold">Multi-Channel Strategy Plan</h2>
                <p className="text-indigo-200 mt-2">Detailed tactics for all your marketing channels.</p>
                <button 
                    onClick={handleExport} 
                    disabled={isExporting}
                    className="mt-4 px-6 py-2 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-700 transition-colors disabled:bg-purple-800"
                >
                    {isExporting ? <><i className="fas fa-spinner fa-spin mr-2"></i>Exporting...</> : <><i className="fas fa-file-pdf mr-2"></i>Export to PDF</>}
                </button>
            </div>
            <div className="space-y-6">
                <InfoCard title="Amazon Optimization Strategy">
                    <p><strong>Keywords:</strong></p>
                    <div className="flex flex-wrap gap-2">
                        {(strat?.amazonStrategy?.keywords || []).map((kw: string, i:number) => <Tag key={i}>{kw}</Tag>)}
                    </div>
                        <p className="mt-4"><strong>Categories:</strong></p>
                    <div className="flex flex-wrap gap-2">
                            {(strat?.amazonStrategy?.categories || []).map((cat: string, i:number) => <Tag key={i}>{cat}</Tag>)}
                    </div>
                </InfoCard>
                    {(strat?.socialMediaCampaigns || []).map((sm: any, i:number) => (
                    <InfoCard title={`Social Media: ${sm.platform} Strategy`} key={i}>
                        <ReactMarkdown>{sm.strategy}</ReactMarkdown>
                    </InfoCard>
                ))}
                    <InfoCard title="Email Marketing Nurture Sequence">
                    {(strat?.emailMarketingSequence || []).map((email: any, i:number) => (
                            <div key={i} className="py-2 border-b border-gray-700 last:border-b-0">
                            <p><strong>Day {email.day}:</strong> {email.subject}</p>
                        </div>
                    ))}
                    </InfoCard>
            </div>
        </div>
    );
};


export const MultiChannelStrategyGenerator: React.FC<MultiChannelStrategyGeneratorProps> = ({ bookAnalysis, bookTitle }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [plan, setPlan] = useState<any | null>(null);

    const handleGenerate = async () => {
        if (!bookAnalysis) return;
        setIsLoading(true);
        setError(null);
        setPlan(null);
        try {
            const result = await generateMultiChannelStrategy(bookAnalysis);
            setPlan(result);
        } catch (e: any) {
            setError(`Failed to generate plan: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    if (!bookAnalysis) {
        return (
            <div className="text-center p-8 bg-gray-800 rounded-lg">
                <i className="fas fa-dna text-4xl text-indigo-400 mb-4"></i>
                <h3 className="text-2xl font-bold">No Book DNA Found</h3>
                <p className="text-indigo-200 mt-2">Please go to the "Book DNA Analyzer" tool first to analyze your manuscript. This analysis is required to generate a multi-channel strategy.</p>
            </div>
        );
    }
    
    if (isLoading) return <LoadingSpinner message="Generating multi-channel strategies..." />;
    
    if (plan) return <PlanDisplay plan={plan} bookTitle={bookTitle} />;
    
    return (
         <div className="max-w-2xl mx-auto p-4 animate-fade-in">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold">Multi-Channel Strategy Generator</h2>
                <p className="text-indigo-200">Generate detailed tactics for Amazon, social media, email, and more.</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg text-center">
                 <p className="text-indigo-100 mb-4">Your book's DNA analysis is ready. Click the button below to build your multi-channel strategy.</p>
                <button
                    onClick={handleGenerate}
                    className="px-8 py-4 bg-indigo-600 text-white font-bold text-lg rounded-md hover:bg-indigo-700 transition-colors shadow-lg transform hover:scale-105"
                >
                    <i className="fas fa-share-alt mr-2"></i>Generate Strategy
                </button>
                 {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
            </div>
        </div>
    );
};
