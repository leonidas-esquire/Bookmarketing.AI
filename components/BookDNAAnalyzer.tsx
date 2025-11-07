
import React, { useState, useCallback, useEffect } from 'react';
import { analyzeManuscript } from '../services/geminiService';
import { FileUploader } from './FileUploader';
import { LoadingSpinner } from './LoadingSpinner';
import { exportAnalysisToPDF } from '../services/pdfExportService';
import ReactMarkdown from 'react-markdown';

interface BookDNAAnalyzerProps {
    onAnalysisComplete: (analysisText: string) => void;
    existingAnalysis: string | null;
    bookTitle: string;
}

export const BookDNAAnalyzer: React.FC<BookDNAAnalyzerProps> = ({ onAnalysisComplete, existingAnalysis, bookTitle }) => {
    const [step, setStep] = useState<'input' | 'analyzing' | 'complete'>(existingAnalysis ? 'complete' : 'input');
    
    const [manuscriptFile, setManuscriptFile] = useState<File | null>(null);
    const [analysisText, setAnalysisText] = useState<string | null>(existingAnalysis);
    const [error, setError] = useState<string | null>(null);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [progressMessage, setProgressMessage] = useState('');
    
    useEffect(() => {
        setStep(existingAnalysis ? 'complete' : 'input');
        setAnalysisText(existingAnalysis);
    }, [existingAnalysis, bookTitle]);

    const handleFileSelect = useCallback((file: File) => {
        setError(null);
        setManuscriptFile(file);
    }, []);
    
    const handleAnalyze = async () => {
        if (!manuscriptFile) {
            setError('Please upload your manuscript.');
            return;
        }
        setStep('analyzing');
        setIsLoading(true);
        setProgressMessage("Performing deep manuscript analysis... This may take a moment.");
        setError(null);
        
        try {
            const result = await analyzeManuscript(manuscriptFile);
            setAnalysisText(result);
            onAnalysisComplete(result);
            setStep('complete');
        } catch (e: any) {
            setError(`Failed to analyze the manuscript: ${e.message}`);
            console.error(e);
            setStep('input');
        } finally {
            setIsLoading(false);
            setProgressMessage('');
        }
    };
    
    const handleExport = async () => {
        if (!analysisText) return;
        setIsExporting(true);
        try {
            await exportAnalysisToPDF(analysisText, bookTitle);
        } catch (e) {
            console.error("PDF Export failed", e);
            setError("An error occurred while exporting the PDF.");
        } finally {
            setIsExporting(false);
        }
    };
    
    const handleReset = () => {
        setStep('input');
        setManuscriptFile(null);
        setAnalysisText(null);
        onAnalysisComplete(''); // Clear analysis in parent
        setError(null);
    };

    if (isLoading) {
        return <div className="max-w-4xl mx-auto"><LoadingSpinner message={progressMessage} /></div>;
    }

    if (step === 'complete' && analysisText) {
        return (
            <div className="max-w-4xl mx-auto p-4 animate-fade-in">
                <div className="text-center mb-6">
                    <h2 className="text-3xl font-bold">Book DNA Analysis Complete</h2>
                    <p className="text-indigo-200 mt-2">
                        This "Book DNA" is now saved and will be used by the other strategy generators.
                    </p>
                </div>

                <div 
                    className="bg-gray-800 p-6 rounded-lg prose prose-invert max-w-none prose-p:text-indigo-100 prose-headings:text-white max-h-[60vh] overflow-y-auto border border-gray-700"
                >
                    <ReactMarkdown>{analysisText}</ReactMarkdown>
                </div>
                
                <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
                     <button 
                        onClick={handleReset} 
                        className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-700 transition-colors"
                    >
                        <i className="fas fa-sync-alt mr-2"></i>Analyze New Manuscript
                    </button>
                     <button 
                        onClick={handleExport} 
                        disabled={isExporting}
                        className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-700 transition-colors disabled:bg-purple-800"
                    >
                        {isExporting ? <><i className="fas fa-spinner fa-spin mr-2"></i>Exporting...</> : <><i className="fas fa-file-pdf mr-2"></i>Export to PDF</>}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-4 animate-fade-in">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold">Book DNA Analyzer</h2>
                <p className="text-indigo-200">Generate your foundational marketing document by analyzing your manuscript.</p>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8 space-y-4">
                <FileUploader onFileSelect={(file) => handleFileSelect(file)} accept=".pdf,.md,.txt,.docx" label="Upload Manuscript (.pdf, .md, .txt, .docx)" />
                <button
                    onClick={handleAnalyze}
                    disabled={isLoading || !manuscriptFile}
                    className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Analyzing...' : 'Analyze Manuscript'}
                </button>
            </div>
            {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
        </div>
    );
};
