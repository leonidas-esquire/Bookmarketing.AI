import React, { useState, useCallback } from 'react';
import { generateSalesFunnel } from '../services/geminiService';
import { FileUploader } from './FileUploader';
import { LoadingSpinner } from './LoadingSpinner';
import { FunnelDisplay } from './FunnelDisplay';

export const FunnelBuilder: React.FC = () => {
    const [manuscriptFile, setManuscriptFile] = useState<File | null>(null);
    const [funnelPlan, setFunnelPlan] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progressMessage, setProgressMessage] = useState('');

    const handleFileSelect = useCallback((file: File) => {
        setError(null);
        setFunnelPlan(null);
        setManuscriptFile(file);
    }, []);

    const handleGenerate = async () => {
        if (!manuscriptFile) {
            setError('Please upload your manuscript first.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setFunnelPlan(null);
        setProgressMessage('Architecting your complete sales funnel... This may take a moment.');
        try {
            // The onProgress callback is now optional and mainly for start/end messages
            const result = await generateSalesFunnel(manuscriptFile, setProgressMessage);
            setFunnelPlan(result);
        } catch (e: any) {
            setError(`Failed to generate the sales funnel: ${e.message}`);
            console.error(e);
        } finally {
            setIsLoading(false);
            setProgressMessage('');
        }
    };

    const handleReset = () => {
        setFunnelPlan(null);
        setManuscriptFile(null);
        setError(null);
    };

    return (
        <div className="max-w-6xl mx-auto p-4 animate-fade-in">
            {!funnelPlan && (
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold">Funnel Builder AI</h2>
                        <p className="text-indigo-200">Upload your manuscript to generate a complete sales funnel plan.</p>
                    </div>

                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                        <FileUploader onFileSelect={(file) => handleFileSelect(file)} accept=".pdf,.md,.txt" label="Upload Manuscript (.pdf, .md, .txt)" />
                        <button
                            onClick={handleGenerate}
                            disabled={isLoading || !manuscriptFile}
                            className="w-full mt-4 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Architecting Funnel...' : 'Generate Sales Funnel'}
                        </button>
                    </div>
                </div>
            )}

            {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
            
            <div className="mt-8">
                {isLoading && <LoadingSpinner message={progressMessage || "Your AI funnel expert is building your plan..."} />}
                {funnelPlan && <FunnelDisplay plan={funnelPlan} onReset={handleReset} />}
            </div>
        </div>
    );
};