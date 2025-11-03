import React, { useState, useCallback } from 'react';
import { FileUploader } from './FileUploader';
import { LoadingSpinner } from './LoadingSpinner';
import { generateDistributionKit } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

type Step = 'input' | 'results';

const channels = [
  { id: 'amazonKdp', name: 'Amazon KDP' },
  { id: 'socialMedia', name: 'Social Media' },
  { id: 'authorWebsite', name: 'Author Website' },
  { id: 'emailNewsletter', name: 'Email Newsletter' },
];

export const BookDistributor: React.FC = () => {
    const [step, setStep] = useState<Step>('input');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<any | null>(null);

    const [formData, setFormData] = useState({
        manuscriptFile: null as File | null,
        manuscriptText: '',
        coverFile: null as File | null,
        title: '',
        author: '',
        genre: '',
        keywords: '',
        description: '',
        channels: ['amazonKdp', 'socialMedia'] as string[],
    });

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleChannelChange = (channelId: string) => {
        setFormData(prev => {
            const newChannels = prev.channels.includes(channelId)
                ? prev.channels.filter(c => c !== channelId)
                : [...prev.channels, channelId];
            return { ...prev, channels: newChannels };
        });
    };
    
    const handleManuscriptSelect = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            setFormData(prev => ({ ...prev, manuscriptFile: file, manuscriptText: text }));
        };
        reader.readAsText(file);
    }, []);

    const handleCoverSelect = useCallback((file: File) => {
        setFormData(prev => ({ ...prev, coverFile: file }));
    }, []);
    
    const isFormValid = () => {
        return formData.manuscriptFile && formData.coverFile && formData.title && formData.author && formData.genre && formData.description && formData.channels.length > 0;
    }

    const handleSubmit = async () => {
        if (!isFormValid()) {
            setError('Please fill out all required fields and select at least one channel.');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const kit = await generateDistributionKit(formData);
            setResult(kit);
            setStep('results');
        } catch (e) {
            setError('Failed to generate the distribution kit. Please check your inputs and try again.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setStep('input');
        setResult(null);
        // Optionally reset form data here
    };
    
    const renderInputField = (name: string, label: string, placeholder: string, required = true) => (
         <div>
            <label htmlFor={name} className="block text-sm font-medium text-indigo-200 mb-1">{label}</label>
            <input type="text" id={name} name={name} value={(formData as any)[name]} onChange={handleFormChange} placeholder={placeholder} required={required} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
        </div>
    );

    const renderAccordion = (title: string, children: React.ReactNode) => {
        const [isOpen, setIsOpen] = useState(true);
        return (
            <div className="bg-gray-800 rounded-lg overflow-hidden mb-4">
                <button onClick={() => setIsOpen(!isOpen)} className="w-full p-4 flex justify-between items-center text-left bg-gray-700 hover:bg-gray-600">
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                    <i className={`fas fa-chevron-down transform transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
                </button>
                {isOpen && <div className="p-6">{children}</div>}
            </div>
        )
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Maybe show a toast notification here
    }

    const renderCopyableBlock = (title: string, content: string) => (
        <div className="mb-4">
            <h4 className="font-semibold text-indigo-300">{title}</h4>
            <div className="relative bg-gray-900 p-3 rounded-md mt-1">
                <pre className="whitespace-pre-wrap text-sm text-indigo-100">{content}</pre>
                <button onClick={() => copyToClipboard(content)} className="absolute top-2 right-2 text-gray-400 hover:text-white"><i className="fas fa-copy"></i></button>
            </div>
        </div>
    );

    if (isLoading) {
        return <div className="max-w-4xl mx-auto"><LoadingSpinner message="Your AI Launch Strategist is building your kit..." /></div>;
    }
    
    if (step === 'results' && result) {
        return (
             <div className="max-w-5xl mx-auto p-4 animate-fade-in">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold">Your Distribution Kit is Ready!</h2>
                    <p className="text-indigo-200">Here are your tailored marketing assets for each channel.</p>
                     <button onClick={handleReset} className="mt-4 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700">Start Over</button>
                </div>

                {result.amazonKdp && renderAccordion('Amazon KDP', <>
                    {renderCopyableBlock('Suggested Keywords', (result.amazonKdp.keywords || []).join(', '))}
                    {renderCopyableBlock('Suggested Categories', (result.amazonKdp.categories || []).join('\n'))}
                    <h4 className="font-semibold text-indigo-300 mb-2">A+ Content Ideas</h4>
                    {(result.amazonKdp.aPlusContentIdeas || []).map((idea: any, i: number) => <div key={i} className="bg-gray-900 p-3 rounded-md mb-2"><strong>{idea.title}:</strong> {idea.description}</div>)}
                </>)}
                
                {result.socialMedia && renderAccordion('Social Media', <>
                    <h4 className="font-semibold text-indigo-300 mb-2">Post Ideas</h4>
                    {(result.socialMedia.postIdeas || []).map((idea: any, i: number) => <div key={i} className="bg-gray-900 p-4 rounded-md mb-3">
                        <h5 className="font-bold text-lg mb-2">{idea.ideaTitle}</h5>
                        {renderCopyableBlock('Twitter', `${idea.twitterCopy}\n\n${idea.hashtags}`)}
                        {renderCopyableBlock('Instagram', `${idea.instagramCopy}\n\n${idea.hashtags}`)}
                        {renderCopyableBlock('Facebook', `${idea.facebookCopy}\n\n${idea.hashtags}`)}
                    </div>)}
                    <h4 className="font-semibold text-indigo-300 mt-6 mb-2">AI Image Prompts</h4>
                    {(result.socialMedia.imagePrompts || []).map((prompt: string, i: number) => renderCopyableBlock(`Prompt #${i + 1}`, prompt))}
                    <h4 className="font-semibold text-indigo-300 mt-6 mb-2">Video Concepts (Reels/TikTok)</h4>
                     {(result.socialMedia.videoConcepts || []).map((concept: any, i: number) => <div key={i} className="bg-gray-900 p-3 rounded-md mb-2"><strong>{concept.title}:</strong> {concept.concept}</div>)}
                </>)}
                 
                {result.authorWebsite && renderAccordion('Author Website', <>
                    {renderCopyableBlock('Press Kit (Markdown)', result.authorWebsite.pressKitMarkdown)}
                    <h4 className="font-semibold text-indigo-300 mt-6 mb-2">Blog Post Topics</h4>
                     {(result.authorWebsite.blogPostTopics || []).map((topic: any, i: number) => <div key={i} className="bg-gray-900 p-3 rounded-md mb-2"><strong>{topic.title}:</strong> {topic.outline}</div>)}
                </>)}
                 
                {result.emailNewsletter && result.emailNewsletter.launchAnnouncement && renderAccordion('Email Newsletter', <>
                    {renderCopyableBlock('Subject Line', result.emailNewsletter.launchAnnouncement.subject)}
                    <div className="mt-4"><ReactMarkdown className="prose prose-sm prose-invert prose-p:my-2 bg-gray-900 p-4 rounded-md">{result.emailNewsletter.launchAnnouncement.body}</ReactMarkdown></div>
                </>)}
             </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto p-4 animate-fade-in">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold">Book Distributor</h2>
                <p className="text-indigo-200">Provide your book's details to generate a complete marketing kit.</p>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FileUploader onFileSelect={handleManuscriptSelect} accept=".txt" label="Upload Manuscript (.txt)" />
                        <FileUploader onFileSelect={handleCoverSelect} accept="image/*" label="Upload Cover Art" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {renderInputField('title', 'Book Title', 'e.g., The Crimson Cipher')}
                        {renderInputField('author', 'Author Name', 'e.g., Jane Doe')}
                    </div>
                    
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {renderInputField('genre', 'Genre', 'e.g., Sci-Fi Thriller')}
                        {renderInputField('keywords', 'Keywords', 'e.g., AI, conspiracy, futuristic', false)}
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-indigo-200 mb-1">Book Description / Blurb</label>
                        <textarea id="description" name="description" value={formData.description} onChange={handleFormChange} placeholder="Paste your book blurb or a short summary here..." required className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none h-32" />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-indigo-200 mb-2">Select Distribution Channels</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {channels.map(channel => (
                                <label key={channel.id} className="flex items-center space-x-2 bg-gray-700 p-3 rounded-md cursor-pointer hover:bg-gray-600">
                                    <input type="checkbox" checked={formData.channels.includes(channel.id)} onChange={() => handleChannelChange(channel.id)} className="form-checkbox h-5 w-5 text-indigo-600 bg-gray-800 border-gray-600 rounded focus:ring-indigo-500" />
                                    <span className="text-white">{channel.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    
                    {error && <p className="text-red-400 text-center">{error}</p>}
                    
                    <button onClick={handleSubmit} disabled={!isFormValid()} className="w-full px-6 py-4 bg-indigo-600 text-white font-semibold text-lg rounded-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed">
                        Generate Distribution Kit
                    </button>
                </div>
            </div>
        </div>
    );
};
