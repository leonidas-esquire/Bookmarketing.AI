
import React, { useState, useCallback } from 'react';
import { FileUploader } from './FileUploader';
import { LoadingSpinner } from './LoadingSpinner';
import { generateWebsitePlan } from '../services/geminiService';

interface ColorPalette {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    heading: string;
}

interface WebsitePlan {
    siteTitle: string;
    colorPalette: ColorPalette;
    typography: {
        headingFont: string;
        bodyFont: string;
    };
    heroSection: {
        headline: string;
        subheadline: string;
        callToAction: string;
    };
    aboutTheBookSection: {
        summary: string;
        keyThemes: string[];
    };
    aboutTheAuthorSection: {
        bioSuggestion: string;
        photoStyle: string;
    };
    leadMagnetIdea: {
        title: string;
        description: string;
    };
}

const ResultCard: React.FC<{ title: string; children: React.ReactNode; icon: string }> = ({ title, children, icon }) => (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 h-full">
        <h3 className="text-xl font-bold text-indigo-300 mb-4 flex items-center">
            <i className={`fas ${icon} mr-3 w-6 text-center`}></i>
            {title}
        </h3>
        <div className="space-y-3 text-indigo-100">{children}</div>
    </div>
);


export const WebsiteBuilder: React.FC = () => {
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [websitePlan, setWebsitePlan] = useState<WebsitePlan | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileSelect = useCallback((file: File) => {
        setPdfFile(file);
        setWebsitePlan(null);
        setError(null);
    }, []);

    const handleGenerate = async () => {
        if (!pdfFile) {
            setError('Please upload your book manuscript as a PDF.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setWebsitePlan(null);
        try {
            const plan = await generateWebsitePlan(pdfFile);
            setWebsitePlan(plan);
        } catch (e) {
            setError('Failed to generate the website plan. The PDF might be too complex or corrupted. Please try again.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };
    
    const renderPlan = (plan: WebsitePlan) => (
        <div className="max-w-5xl mx-auto p-4 animate-fade-in space-y-8">
             <div className="text-center">
                <h2 className="text-3xl font-bold">Your AI-Generated Website Plan</h2>
                <p className="text-indigo-200 mt-2">Use this blueprint to build a high-converting website for <span className="font-bold text-white">"{plan.siteTitle}"</span>.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResultCard title="Visual Identity" icon="fa-palette">
                    <div>
                        <h4 className="font-semibold mb-2">Color Palette</h4>
                        <div className="flex space-x-2 rounded overflow-hidden">
                            {Object.entries(plan.colorPalette).map(([name, color]) => (
                                <div key={name} className="flex-1 text-center" title={`${name}: ${color}`}>
                                    <div className="w-full h-12" style={{ backgroundColor: color }}></div>
                                    <p className="text-xs mt-1 capitalize text-gray-400">{name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                     <div>
                        <h4 className="font-semibold mb-2 mt-4">Typography</h4>
                        <p><strong>Headings:</strong> <span className="font-mono p-1 bg-gray-700 rounded text-sm">{plan.typography.headingFont}</span></p>
                        <p><strong>Body:</strong> <span className="font-mono p-1 bg-gray-700 rounded text-sm">{plan.typography.bodyFont}</span></p>
                    </div>
                </ResultCard>

                <ResultCard title="Hero Section" icon="fa-bullhorn">
                    <div className="p-4 rounded-md" style={{backgroundColor: plan.colorPalette.background}}>
                        <p className="text-2xl font-bold" style={{color: plan.colorPalette.heading}}>{plan.heroSection.headline}</p>
                        <p className="mt-2" style={{color: plan.colorPalette.text}}>{plan.heroSection.subheadline}</p>
                        <button className="px-5 py-2 mt-4 font-bold rounded shadow-lg" style={{backgroundColor: plan.colorPalette.primary, color: plan.colorPalette.text}}>{plan.heroSection.callToAction}</button>
                    </div>
                </ResultCard>

                <div className="lg:col-span-2">
                    <ResultCard title="About The Book" icon="fa-book-open">
                        <p className="whitespace-pre-wrap leading-relaxed">{plan.aboutTheBookSection.summary}</p>
                        <div className="mt-4">
                             <h4 className="font-semibold mb-2">Key Themes</h4>
                             <div className="flex flex-wrap gap-2">
                                {plan.aboutTheBookSection.keyThemes.map(theme => (
                                    <span key={theme} className="text-sm px-3 py-1 rounded-full font-medium" style={{backgroundColor: plan.colorPalette.secondary, color: plan.colorPalette.heading}}>{theme}</span>
                                ))}
                             </div>
                        </div>
                    </ResultCard>
                </div>
                
                 <ResultCard title="About The Author" icon="fa-user-edit">
                    <div>
                        <h4 className="font-semibold mb-2">Bio Suggestion</h4>
                        <p className="italic">"{plan.aboutTheAuthorSection.bioSuggestion}"</p>
                    </div>
                     <div className="mt-4">
                        <h4 className="font-semibold mb-2">Photo Style</h4>
                        <p>{plan.aboutTheAuthorSection.photoStyle}</p>
                    </div>
                </ResultCard>

                <ResultCard title="Email List Builder" icon="fa-envelope">
                     <div className="text-center p-4 bg-gray-900 rounded-lg">
                        <h4 className="font-bold text-lg text-white">{plan.leadMagnetIdea.title}</h4>
                        <p className="mt-1 text-indigo-200">{plan.leadMagnetIdea.description}</p>
                        <div className="mt-3 flex">
                            <input type="email" placeholder="Enter your email..." className="flex-grow p-2 rounded-l-md bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            <button className="px-4 rounded-r-md font-semibold" style={{backgroundColor: plan.colorPalette.primary, color: plan.colorPalette.text}}>Sign Up</button>
                        </div>
                    </div>
                </ResultCard>
            </div>
        </div>
    );

    return (
        <>
            {!websitePlan && (
                <div className="max-w-2xl mx-auto p-4 animate-fade-in">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold">AI Website Builder</h2>
                        <p className="text-indigo-200">Upload your complete book manuscript to generate a custom website plan.</p>
                    </div>

                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                        <FileUploader onFileSelect={(file) => handleFileSelect(file)} accept="application/pdf" label="Upload Manuscript (.pdf)" />
                        <button
                            onClick={handleGenerate}
                            disabled={isLoading || !pdfFile}
                            className="w-full mt-4 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Designing Website...' : 'Generate Website Plan'}
                        </button>
                    </div>

                    {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
                    {isLoading && <LoadingSpinner message="Analyzing your book and designing a stunning website..." />}
                </div>
            )}
            {websitePlan && !isLoading && renderPlan(websitePlan)}
        </>
    );
};
