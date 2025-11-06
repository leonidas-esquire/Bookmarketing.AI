import React, { useState, useCallback } from 'react';
import { analyzeManuscript, generateFullCampaignPlan } from '../services/geminiService';
import { FileUploader } from './FileUploader';
import { CampaignDisplay } from './AudienceProfileDisplay';
import { LoadingSpinner } from './LoadingSpinner';
import { AnalysisDisplay } from './AnalysisDisplay';
import { exportCampaignToPDF } from '../services/pdfExportService';

export const CampaignGenerator: React.FC = () => {
    const [step, setStep] = useState<'input' | 'analyzing' | 'review' | 'building' | 'complete'>('input');
    
    const [manuscriptFile, setManuscriptFile] = useState<File | null>(null);
    const [manuscriptTitle, setManuscriptTitle] = useState('');
    const [analysisText, setAnalysisText] = useState<string | null>(null);
    const [campaignPlan, setCampaignPlan] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    const [isLoading, setIsLoading] = useState(false);
    const [progressMessage, setProgressMessage] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    const handleFileSelect = useCallback((file: File) => {
        setError(null);
        setManuscriptFile(file);
    }, []);

    const handleReset = () => {
        setStep('input');
        setManuscriptFile(null);
        setManuscriptTitle('');
        setAnalysisText(null);
        setCampaignPlan(null);
        setError(null);
        setIsLoading(false);
        setProgressMessage('');
    };

    const handleAnalyze = async () => {
        if (!manuscriptFile || !manuscriptTitle) {
            setError('Please upload your manuscript and provide a title.');
            return;
        }
        setStep('analyzing');
        setIsLoading(true);
        setProgressMessage("Performing deep manuscript analysis... This may take a moment.");
        setError(null);
        
        try {
            const result = await analyzeManuscript(manuscriptFile);
            setAnalysisText(result);
            setStep('review');
        } catch (e: any) {
            setError(`Failed to analyze the manuscript: ${e.message}`);
            console.error(e);
            setStep('input');
        } finally {
            setIsLoading(false);
            setProgressMessage('');
        }
    };

    const handleGenerateCampaign = async () => {
        if (!analysisText) {
            setError('Analysis result is missing. Please analyze the manuscript first.');
            setStep('input');
            return;
        }
        setStep('building');
        setIsLoading(true);
        setError(null);

        try {
            const result = await generateFullCampaignPlan(analysisText, (p: { message: string }) => setProgressMessage(p.message));
            setCampaignPlan(result);
            setStep('complete');
        } catch (e: any) {
            setError(`Failed to generate the campaign plan: ${e.message}`);
            console.error(e);
            setStep('review'); // Go back to review step on failure
        } finally {
            setIsLoading(false);
            setProgressMessage('');
        }
    };
    
    const handleExport = async () => {
        if (!campaignPlan) return;
        setIsExporting(true);
        try {
            await exportCampaignToPDF(campaignPlan, manuscriptTitle);
        } catch (e) {
            console.error("PDF Export failed", e);
            setError("An error occurred while exporting the PDF. Please check the console for details.");
        } finally {
            setIsExporting(false);
        }
    };

    // Render logic based on the current step
    switch (step) {
        case 'analyzing':
        case 'building':
            return <div className="max-w-4xl mx-auto"><LoadingSpinner message={progressMessage} /></div>;
            
        case 'review':
            if (analysisText) {
                return <AnalysisDisplay analysisText={analysisText} onGenerateCampaign={handleGenerateCampaign} onReset={handleReset} />;
            }
            handleReset(); // Fallback if analysisText is null
            return null;
            
        case 'complete':
            return (
                <div className="max-w-5xl mx-auto animate-fade-in">
                    <CampaignDisplay
                        plan={campaignPlan}
                        manuscriptTitle={manuscriptTitle}
                        isExporting={isExporting}
                        onExport={handleExport}
                        onReset={handleReset}
                        error={error}
                    />
                </div>
            );

        case 'input':
        default:
             return (
                <div className="max-w-2xl mx-auto p-4 animate-fade-in">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold">Audience & Campaign Generator</h2>
                        <p className="text-indigo-200">Generate a complete marketing strategy in two steps: Analyze, then Build.</p>
                    </div>

                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8 space-y-4">
                        <h3 className="text-xl font-bold text-indigo-300 text-center">Step 1: Deep-Dive Analysis</h3>
                        <FileUploader onFileSelect={(file) => handleFileSelect(file)} accept=".pdf,.md,.txt,.docx" label="Upload Manuscript (.pdf, .md, .txt, .docx)" />
                        
                        {manuscriptFile && (
                            <div className="animate-fade-in">
                                <label htmlFor="manuscriptTitle" className="block text-sm font-medium text-indigo-200 mb-1">Manuscript Title</label>
                                <input
                                    type="text"
                                    id="manuscriptTitle"
                                    value={manuscriptTitle}
                                    onChange={(e) => setManuscriptTitle(e.target.value)}
                                    placeholder="e.g., The Crimson Cipher"
                                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                            </div>
                        )}

                        <button
                            onClick={handleAnalyze}
                            disabled={isLoading || !manuscriptFile || !manuscriptTitle}
                            className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Analyzing...' : 'Analyze Manuscript'}
                        </button>
                    </div>
                    {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
                </div>
            );
    }
};
