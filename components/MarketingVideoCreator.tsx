import React, { useState, useCallback } from 'react';
import { FileUploader } from './FileUploader';
import { LoadingSpinner } from './LoadingSpinner';
import { generateCompleteVideoMarketingPlan } from '../services/geminiService';
import { VideoPlanDisplay } from './VideoPlanDisplay';

const authorGoals = [
    'Sell More Copies',
    'Grow Email List',
    'Build Author Brand',
    'Get Speaking Gigs',
    'Drive Pre-orders'
];

const platformTargets = [
    { id: 'TikTok', name: 'TikTok' },
    { id: 'Instagram Reels', name: 'Instagram Reels' },
    { id: 'YouTube Shorts', name: 'YouTube Shorts' },
    { id: 'YouTube (Long-form)', name: 'YouTube (Long-form)' },
    { id: 'Website Hero Video', name: 'Website Hero Video' },
    { id: 'Video Ads (Meta/Google)', name: 'Video Ads' },
];

const tonePreferences = [
    'Epic & Cinematic',
    'Intimate & Personal',
    'Inspirational & Uplifting',
    'Mysterious & Suspenseful',
    'Playful & Humorous',
    'Educational & Authoritative'
];

export const MarketingVideoCreator: React.FC = () => {
    const [step, setStep] = useState<'input' | 'generating' | 'results'>('input');
    const [error, setError] = useState<string | null>(null);
    const [videoPlan, setVideoPlan] = useState<any | null>(null);

    const [manuscriptText, setManuscriptText] = useState('');
    const [metadata, setMetadata] = useState({
        title: '',
        subtitle: '',
        genre: '',
        targetAudience: '',
        positioningStatement: '',
    });
    const [authorGoal, setAuthorGoal] = useState(authorGoals[0]);
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['TikTok', 'Instagram Reels']);
    const [tonePreference, setTonePreference] = useState(tonePreferences[0]);

    const handleManuscriptSelect = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            setManuscriptText(text);
        };
        reader.readAsText(file);
    }, []);

    const handleMetadataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setMetadata(prev => ({ ...prev, [name]: value }));
    };

    const handlePlatformChange = (platformId: string) => {
        setSelectedPlatforms(prev => 
            prev.includes(platformId) 
                ? prev.filter(p => p !== platformId) 
                : [...prev, platformId]
        );
    };
    
    const isFormValid = () => {
        return manuscriptText && metadata.title && metadata.genre && metadata.targetAudience && selectedPlatforms.length > 0;
    }

    const handleSubmit = async () => {
        if (!isFormValid()) {
            setError('Please fill out all required fields: Manuscript, Title, Genre, Target Audience, and at least one Platform.');
            return;
        }
        setStep('generating');
        setError(null);
        try {
            const formData = {
                manuscriptText,
                metadata,
                authorGoal,
                platformTargets: selectedPlatforms,
                tonePreference,
            };
            const plan = await generateCompleteVideoMarketingPlan(formData);
            setVideoPlan(plan);
            setStep('results');
        } catch (e: any) {
            setError(`Failed to generate the video plan. ${e.message}`);
            console.error(e);
            setStep('input');
        }
    };
    
    const handleReset = () => {
        setStep('input');
        setVideoPlan(null);
    };
    
    if (step === 'generating') {
        return <div className="max-w-4xl mx-auto"><LoadingSpinner message="Your AI Video Architect is crafting a comprehensive marketing plan... This may take a moment." /></div>;
    }

    if (step === 'results' && videoPlan) {
        return <VideoPlanDisplay plan={videoPlan} onReset={handleReset} />;
    }

    return (
        <div className="max-w-4xl mx-auto p-4 animate-fade-in">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold">Marketing Video Creator</h2>
                <p className="text-indigo-200">Turn your manuscript into a complete video marketing campaign plan.</p>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg space-y-6">
                <div>
                    <label className="block text-lg font-medium text-indigo-200 mb-2">1. Upload Manuscript or Excerpt</label>
                    <FileUploader onFileSelect={handleManuscriptSelect} accept=".txt" label="Upload Manuscript (.txt)" />
                </div>
                
                <div>
                     <label className="block text-lg font-medium text-indigo-200 mb-2">2. Provide Book Details</label>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-700 p-4 rounded-md">
                        <input name="title" value={metadata.title} onChange={handleMetadataChange} placeholder="Book Title (Required)" className="p-2 bg-gray-800 rounded-md border border-gray-600 focus:ring-indigo-500 focus:outline-none"/>
                        <input name="subtitle" value={metadata.subtitle} onChange={handleMetadataChange} placeholder="Subtitle (Optional)" className="p-2 bg-gray-800 rounded-md border border-gray-600 focus:ring-indigo-500 focus:outline-none"/>
                        <input name="genre" value={metadata.genre} onChange={handleMetadataChange} placeholder="Genre (Required)" className="p-2 bg-gray-800 rounded-md border border-gray-600 focus:ring-indigo-500 focus:outline-none"/>
                        <input name="targetAudience" value={metadata.targetAudience} onChange={handleMetadataChange} placeholder="Target Audience (Required)" className="p-2 bg-gray-800 rounded-md border border-gray-600 focus:ring-indigo-500 focus:outline-none"/>
                        <input name="positioningStatement" value={metadata.positioningStatement} onChange={handleMetadataChange} placeholder="Positioning Statement (Optional)" className="md:col-span-2 p-2 bg-gray-800 rounded-md border border-gray-600 focus:ring-indigo-500 focus:outline-none"/>
                     </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-lg font-medium text-indigo-200 mb-2">3. Select Primary Goal</label>
                        <select value={authorGoal} onChange={e => setAuthorGoal(e.target.value)} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                            {authorGoals.map(goal => <option key={goal} value={goal}>{goal}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-lg font-medium text-indigo-200 mb-2">5. Choose Tone & Style</label>
                        <select value={tonePreference} onChange={e => setTonePreference(e.target.value)} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                            {tonePreferences.map(tone => <option key={tone} value={tone}>{tone}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-lg font-medium text-indigo-200 mb-2">4. Choose Target Platforms</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {platformTargets.map(platform => (
                             <label key={platform.id} className={`flex items-center space-x-2 p-3 rounded-md cursor-pointer transition-colors ${selectedPlatforms.includes(platform.id) ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                <input type="checkbox" checked={selectedPlatforms.includes(platform.id)} onChange={() => handlePlatformChange(platform.id)} className="form-checkbox h-5 w-5 text-indigo-500 bg-gray-800 border-gray-600 rounded focus:ring-indigo-500 focus:ring-offset-gray-800" />
                                <span className="text-white text-sm font-medium">{platform.name}</span>
                            </label>
                        ))}
                    </div>
                </div>
                
                {error && <p className="text-red-400 text-center">{error}</p>}
                
                <button onClick={handleSubmit} disabled={!isFormValid()} className="w-full px-6 py-4 bg-indigo-600 text-white font-semibold text-lg rounded-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed">
                    <i className="fas fa-magic mr-2"></i> Generate Video Marketing Plan
                </button>
            </div>
        </div>
    );
};