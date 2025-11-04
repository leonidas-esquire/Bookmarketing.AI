
import React, { useState, useEffect } from 'react';
import { User, SalesPageConfig } from '../types';
import { generateContent } from '../services/geminiService';
import { LoadingSpinner } from './LoadingSpinner';

interface DirectSalesChannelProps {
    user: User;
    config: SalesPageConfig | null;
    onConfigUpdate: (config: SalesPageConfig | null) => void;
    onViewSalesPage: () => void;
}

export const DirectSalesChannel: React.FC<DirectSalesChannelProps> = ({ user, config, onConfigUpdate, onViewSalesPage }) => {
    const [price, setPrice] = useState(config?.price || 12.99);
    const [pitch, setPitch] = useState(config?.pitch || `Discover a world of mystery and adventure in "${user.bookTitle}". Get your digital copy today!`);
    const [isGeneratingPitch, setIsGeneratingPitch] = useState(false);

    const isActive = config?.isActive || false;
    
    useEffect(() => {
        // Sync local state if global config changes (e.g., on load)
        if (config) {
            setPrice(config.price);
            setPitch(config.pitch);
        }
    }, [config]);

    const handleGeneratePitch = async () => {
        setIsGeneratingPitch(true);
        try {
            const prompt = `Act as a marketing copywriter. Write a short, exciting, one-paragraph sales pitch (around 50 words) for a book titled "${user.bookTitle}" in the ${user.genre} genre. The pitch should be punchy and end with a clear call to action to buy the book.`;
            const generatedPitch = await generateContent(prompt, 'gemini-2.5-flash');
            setPitch(generatedPitch);
        } catch (error) {
            console.error("Failed to generate pitch:", error);
        } finally {
            setIsGeneratingPitch(false);
        }
    };

    const handleActivate = () => {
        onConfigUpdate({
            price,
            pitch,
            currency: 'USD',
            isActive: true,
        });
    };
    
    const handleDeactivate = () => {
        if (config) {
             onConfigUpdate({ ...config, isActive: false });
        }
    };
    
    const handleSaveChanges = () => {
        if (config) {
             onConfigUpdate({ ...config, price, pitch });
        }
    };


    return (
        <div className="max-w-4xl mx-auto p-4 animate-fade-in">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold">Direct Sales Channel</h2>
                <p className="text-indigo-200">Set up a simple page to sell your book directly to readers.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Control Panel */}
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-bold text-white mb-4">{isActive ? "Manage Sales Page" : "Configure Your Sales Page"}</h3>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="price" className="block text-sm font-medium text-indigo-200 mb-1">Price (USD)</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">$</span>
                                <input type="number" id="price" value={price} onChange={e => setPrice(parseFloat(e.target.value))} className="w-full p-3 pl-7 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none" disabled={isActive}/>
                            </div>
                        </div>
                         <div>
                            <label htmlFor="pitch" className="block text-sm font-medium text-indigo-200 mb-1">Sales Pitch</label>
                            <textarea id="pitch" value={pitch} onChange={e => setPitch(e.target.value)} rows={4} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none" disabled={isActive}/>
                            <button onClick={handleGeneratePitch} disabled={isGeneratingPitch || isActive} className="mt-2 text-sm text-indigo-400 font-semibold hover:text-white disabled:opacity-50 disabled:cursor-not-allowed">
                                {isGeneratingPitch ? <><i className="fas fa-spinner fa-spin mr-2"></i>Generating...</> : <><i className="fas fa-magic mr-2"></i>Generate with AI</>}
                            </button>
                        </div>
                    </div>
                    <div className="mt-6">
                        {isActive ? (
                            <div className="space-y-3">
                                <button onClick={handleDeactivate} className="w-full px-6 py-3 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-700 transition-colors">Deactivate Page</button>
                                {/* <button onClick={handleSaveChanges} className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors">Save Changes</button> */}
                            </div>
                        ) : (
                            <button onClick={handleActivate} className="w-full px-6 py-4 bg-green-600 text-white font-semibold text-lg rounded-md hover:bg-green-700 transition-colors">Activate Sales Page</button>
                        )}
                    </div>
                </div>

                {/* Status/Preview Panel */}
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-bold text-white mb-4">Status & Preview</h3>
                    {isActive ? (
                        <div className="space-y-4">
                            <div className="bg-green-900 border border-green-500 p-3 rounded-md text-center">
                                <p className="font-bold text-green-300">Your Sales Page is LIVE</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-indigo-200 mb-1">Sharable Link</label>
                                <div className="flex gap-2">
                                    <input type="text" readOnly value={`bookmarketing.ai/s/${user.bookTitle.toLowerCase().replace(/\s+/g, '-')}`} className="flex-grow p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-400 italic"/>
                                    <button onClick={onViewSalesPage} className="px-4 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700" title="View Live Page">
                                        <i className="fas fa-external-link-alt"></i>
                                    </button>
                                </div>
                            </div>
                             <div className="grid grid-cols-2 gap-4 pt-4">
                                <div className="bg-gray-700 p-3 rounded-md text-center">
                                    <p className="text-sm text-indigo-200">Page Views (24h)</p>
                                    <p className="text-2xl font-bold text-white">{(Math.random() * 500 + 50).toFixed(0)}</p>
                                </div>
                                <div className="bg-gray-700 p-3 rounded-md text-center">
                                    <p className="text-sm text-indigo-200">Sales (24h)</p>
                                    <p className="text-2xl font-bold text-white">{(Math.random() * 20 + 2).toFixed(0)}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 p-8 border-2 border-dashed border-gray-600 rounded-md">
                            <i className="fas fa-eye-slash text-4xl mb-3"></i>
                            <p>Your page is not active.</p>
                            <p className="text-sm">Configure and activate it to start selling.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
