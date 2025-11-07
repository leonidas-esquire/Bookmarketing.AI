
import React, { useState } from 'react';
import { generateCampaignArchitecture } from '../services/geminiService';
import { exportArchitectureToPDF } from '../services/pdfExportService';
import { LoadingSpinner } from './LoadingSpinner';
import ReactMarkdown from 'react-markdown';

interface CampaignArchitectureGeneratorProps {
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
    const arch = plan.step2_campaignArchitecture;
    
    const handleExport = async () => {
        setIsExporting(true);
        try {
            await exportArchitectureToPDF(plan, bookTitle);
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
                <h2 className="text-3xl font-bold">Campaign Architecture Plan</h2>
                <p className="text-indigo-200 mt-2">High-level strategy for launching and scaling your book.</p>
                <button 
                    onClick={handleExport} 
                    disabled={isExporting}
                    className="mt-4 px-6 py-2 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-700 transition-colors disabled:bg-purple-800"
                >
                    {isExporting ? <><i className="fas fa-spinner fa-spin mr-2"></i>Exporting...</> : <><i className="fas fa-file-pdf mr-2"></i>Export to PDF</>}
                </button>
            </div>
            <div className="space-y-6">
                 <InfoCard title="24-Hour Blitz Launch Plan Details">
                    <ul className="space-y-3">
                        {(arch?.launchPlan_24Hour || []).map((item: any, i: number) => (
                            <li key={i} className="bg-gray-900/50 p-3 rounded-md">
                                <p className="font-bold">{item.hour}</p>
                                <p><strong className="text-indigo-400">Task:</strong> {item.task}</p>
                            </li>
                        ))}
                    </ul>
                </InfoCard>
                <InfoCard title="30-Day Momentum Plan">
                     <ul className="space-y-3">
                        {(arch?.momentumPlan_30Day || []).map((item: any, i: number) => (
                            <li key={i} className="bg-gray-900/50 p-3 rounded-md">
                                <p className="font-bold">{item.day}</p>
                                <p><strong className="text-indigo-400">Task:</strong> {item.task}</p>
                            </li>
                        ))}
                    </ul>
                </InfoCard>
                <InfoCard title="90-Day Viral Expansion Plan"><ReactMarkdown>{arch?.viralPlan_90Day || ''}</ReactMarkdown></InfoCard>
                <InfoCard title="365-Day Million-Reader Roadmap"><ReactMarkdown>{arch?.millionReaderRoadmap_365Day || ''}</ReactMarkdown></InfoCard>
            </div>
        </div>
    );
};


export const CampaignArchitectureGenerator: React.FC<CampaignArchitectureGeneratorProps> = ({ bookAnalysis, bookTitle }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [plan, setPlan] = useState<any | null>(null);

    const handleGenerate = async () => {
        if (!bookAnalysis) return;
        setIsLoading(true);
        setError(null);
        setPlan(null);
        try {
            const result = await generateCampaignArchitecture(bookAnalysis);
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
                <p className="text-indigo-200 mt-2">Please go to the "Book DNA Analyzer" tool first to analyze your manuscript. This analysis is required to generate a campaign architecture.</p>
            </div>
        );
    }
    
    if (isLoading) return <LoadingSpinner message="Architecting your campaign..." />;
    
    if (plan) return <PlanDisplay plan={plan} bookTitle={bookTitle} />;
    
    return (
         <div className="max-w-2xl mx-auto p-4 animate-fade-in">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold">Campaign Architecture Generator</h2>
                <p className="text-indigo-200">Generate launch plans, roadmaps, and budget strategies from your Book DNA.</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg text-center">
                 <p className="text-indigo-100 mb-4">Your book's DNA analysis is ready. Click the button below to build your campaign architecture.</p>
                <button
                    onClick={handleGenerate}
                    className="px-8 py-4 bg-indigo-600 text-white font-bold text-lg rounded-md hover:bg-indigo-700 transition-colors shadow-lg transform hover:scale-105"
                >
                    <i className="fas fa-sitemap mr-2"></i>Generate Architecture
                </button>
                 {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
            </div>
        </div>
    );
};
