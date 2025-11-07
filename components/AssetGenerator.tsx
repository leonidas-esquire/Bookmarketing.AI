
import React, { useState } from 'react';
import { generateAssetGeneration } from '../services/geminiService';
import { exportAssetsToPDF } from '../services/pdfExportService';
import { LoadingSpinner } from './LoadingSpinner';
import ReactMarkdown from 'react-markdown';

interface AssetGeneratorProps {
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

const PlanDisplay: React.FC<{ plan: any, bookTitle: string }> = ({ plan, bookTitle }) => {
    const [isExporting, setIsExporting] = useState(false);
    const assets = plan.step4_assetGeneration;
    
    const handleExport = async () => {
        setIsExporting(true);
        try {
            await exportAssetsToPDF(plan, bookTitle);
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
                <h2 className="text-3xl font-bold">Creative Asset Library</h2>
                <p className="text-indigo-200 mt-2">Your AI-generated marketing copy and creative concepts.</p>
                <button 
                    onClick={handleExport} 
                    disabled={isExporting}
                    className="mt-4 px-6 py-2 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-700 transition-colors disabled:bg-purple-800"
                >
                    {isExporting ? <><i className="fas fa-spinner fa-spin mr-2"></i>Exporting...</> : <><i className="fas fa-file-pdf mr-2"></i>Export to PDF</>}
                </button>
            </div>
            <div className="space-y-6">
                <InfoCard title="Copy Library: Book Blurbs">
                    <h5 className="font-bold text-indigo-400">Short</h5>
                    <p>{assets?.copyLibrary?.bookBlurbs?.short || 'Not available.'}</p>
                    <h5 className="font-bold text-indigo-400 mt-2">Medium</h5>
                    <p>{assets?.copyLibrary?.bookBlurbs?.medium || 'Not available.'}</p>
                        <h5 className="font-bold text-indigo-400 mt-2">Long</h5>
                    <p>{assets?.copyLibrary?.bookBlurbs?.long || 'Not available.'}</p>
                </InfoCard>
                    <InfoCard title="Copy Library: Ad Hooks">
                        {(assets?.copyLibrary?.adCopyHooks || []).map((category: any, i: number) => (
                        <div key={i} className="mb-3 last:mb-0">
                            <h5 className="font-bold text-indigo-400">{category.angle}</h5>
                            <ul className="list-disc list-inside pl-4">
                                {(category.hooks || []).map((hook: string, j: number) => <li key={j}>{hook}</li>)}
                            </ul>
                        </div>
                    ))}
                </InfoCard>
                <InfoCard title="Video Trailer Scripts">
                    {(assets?.videoTrailerScripts || []).map((trailer: any, i: number) => (
                        <div key={i} className="mb-4 last:mb-0 border-b border-gray-700 pb-2 last:border-b-0 last:pb-0">
                            <h5 className="font-bold text-indigo-400">{trailer.concept}</h5>
                            <ReactMarkdown>{trailer.script}</ReactMarkdown>
                        </div>
                    ))}
                </InfoCard>
            </div>
        </div>
    );
};


export const AssetGenerator: React.FC<AssetGeneratorProps> = ({ bookAnalysis, bookTitle }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [plan, setPlan] = useState<any | null>(null);

    const handleGenerate = async () => {
        if (!bookAnalysis) return;
        setIsLoading(true);
        setError(null);
        setPlan(null);
        try {
            const result = await generateAssetGeneration(bookAnalysis);
            setPlan(result);
        } catch (e: any) {
            setError(`Failed to generate assets: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    if (!bookAnalysis) {
        return (
            <div className="text-center p-8 bg-gray-800 rounded-lg">
                <i className="fas fa-dna text-4xl text-indigo-400 mb-4"></i>
                <h3 className="text-2xl font-bold">No Book DNA Found</h3>
                <p className="text-indigo-200 mt-2">Please go to the "Book DNA Analyzer" tool first to analyze your manuscript. This analysis is required to generate creative assets.</p>
            </div>
        );
    }
    
    if (isLoading) return <LoadingSpinner message="Generating your creative assets..." />;
    
    if (plan) return <PlanDisplay plan={plan} bookTitle={bookTitle} />;
    
    return (
         <div className="max-w-2xl mx-auto p-4 animate-fade-in">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold">Asset Generator</h2>
                <p className="text-indigo-200">Generate book blurbs, ad copy, video scripts, and more from your Book DNA.</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg text-center">
                 <p className="text-indigo-100 mb-4">Your book's DNA analysis is ready. Click the button below to generate your creative assets.</p>
                <button
                    onClick={handleGenerate}
                    className="px-8 py-4 bg-indigo-600 text-white font-bold text-lg rounded-md hover:bg-indigo-700 transition-colors shadow-lg transform hover:scale-105"
                >
                    <i className="fas fa-file-alt mr-2"></i>Generate Assets
                </button>
                 {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
            </div>
        </div>
    );
};
