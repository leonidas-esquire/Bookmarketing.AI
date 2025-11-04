import React, { useState, useCallback, useEffect } from 'react';
import { generateMarketingCampaign } from '../services/geminiService';
import { FileUploader } from './FileUploader';
import { CampaignDisplay } from './AudienceProfileDisplay';

const Stepper: React.FC<{ currentStep: number }> = ({ currentStep }) => {
    const steps = [
        { title: "Book Analysis", icon: "fa-search" },
        { title: "Campaign Architecture", icon: "fa-sitemap" },
        { title: "Multi-Channel Strategy", icon: "fa-share-alt" },
        { title: "Asset Generation", icon: "fa-file-alt" },
    ];
    return (
        <div className="space-y-6">
            {steps.map((step, index) => {
                const stepNumber = index + 1;
                const status = currentStep > stepNumber ? 'complete' : (currentStep === stepNumber ? 'in-progress' : 'pending');
                return (
                    <div key={step.title} className="flex items-center gap-4">
                        <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0
                            ${status === 'complete' ? 'bg-green-500' : ''}
                            ${status === 'in-progress' ? 'bg-indigo-500' : ''}
                            ${status === 'pending' ? 'bg-gray-600' : ''}
                        `}>
                            {status === 'complete' ? <i className="fas fa-check"></i> : (
                             status === 'in-progress' ? <i className="fas fa-spinner fa-spin"></i> : <i className={`fas ${step.icon}`}></i>
                            )}
                        </div>
                        <h3 className={`font-semibold ${status === 'pending' ? 'text-gray-500' : 'text-white'}`}>{step.title}</h3>
                    </div>
                );
            })}
        </div>
    );
};


export const CampaignGenerator: React.FC = () => {
    const [manuscriptFile, setManuscriptFile] = useState<File | null>(null);
    const [manuscriptTitle, setManuscriptTitle] = useState('');
    const [campaignPlan, setCampaignPlan] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState({ step: 1, message: '' });

    const handleFileSelect = useCallback((file: File) => {
        setError(null);
        setCampaignPlan(null);
        setManuscriptFile(file);
    }, []);

    const handleReset = () => {
        setCampaignPlan(null);
        setManuscriptFile(null);
        setManuscriptTitle('');
        setError(null);
    };

    const handleGenerate = async () => {
        if (!manuscriptFile || !manuscriptTitle) {
            setError('Please upload your manuscript and provide a title.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setCampaignPlan(null);

        const messages = [
            "Analyzing manuscript themes and tone...",
            "Identifying ideal reader psychographics...",
            "Evaluating competitive landscape...",
            "Architecting 24-hour launch activation...",
            "Developing 30-day momentum strategy...",
            "Mapping multi-channel campaigns (Social, Email, Ads)...",
            "Generating copy library and ad hooks...",
            "Writing video trailer script...",
            "Finalizing implementation timeline...",
        ];
        let messageIndex = 0;
        const interval = setInterval(() => {
            const currentStep = Math.min(4, Math.floor((messageIndex / (messages.length-1)) * 4) + 1);
            setProgress({ step: currentStep, message: messages[messageIndex] });
            messageIndex = (messageIndex + 1) % messages.length;
        }, 3500);

        try {
            const result = await generateMarketingCampaign(manuscriptFile);
            setCampaignPlan(result);
        } catch (e: any) {
            setError(`Failed to generate the campaign: ${e.message}`);
            console.error(e);
        } finally {
            clearInterval(interval);
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-md mx-auto p-4 text-center">
                 <h2 className="text-2xl font-bold text-white mb-6">Generating Your Campaign...</h2>
                 <p className="text-indigo-200 mb-8">This comprehensive process can take 3-5 minutes. Please be patient while the AI architects your path to one million readers.</p>
                 <div className="bg-gray-800 p-8 rounded-lg shadow-lg">
                    <Stepper currentStep={progress.step} />
                    <p className="mt-8 text-indigo-300 h-8 animate-fade-in">{progress.message}</p>
                 </div>
            </div>
        );
    }
    
    if (campaignPlan) {
        return (
            <div>
                <CampaignDisplay plan={campaignPlan} onReset={handleReset} manuscriptTitle={manuscriptTitle} />
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto p-4 animate-fade-in">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold">Audience & Campaign Generator</h2>
                <p className="text-indigo-200">Upload your manuscript to build a complete marketing strategy.</p>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8 space-y-4">
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
                    onClick={handleGenerate}
                    disabled={isLoading || !manuscriptFile || !manuscriptTitle}
                    className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed"
                >
                    Generate Full Campaign
                </button>
            </div>
            {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
        </div>
    );
};