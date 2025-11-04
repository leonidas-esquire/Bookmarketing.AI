import React, { useState, useCallback } from 'react';
import { FileUploader } from './FileUploader';
import { LoadingSpinner } from './LoadingSpinner';
import { generateDistributionKit } from '../services/geminiService';

type Step = 'input' | 'results';
type DistributionStatus = 'pending' | 'delivering' | 'delivered';

const distributors = [
    { id: 'globalReads', name: 'Global Reads Inc.', icon: 'fa-globe' },
    { id: 'indieVerse', name: 'IndieVerse Distribution', icon: 'fa-store' },
    { id: 'pageTurners', name: 'PageTurners Digital', icon: 'fa-university' },
    { id: 'amazonKDP', name: 'Amazon KDP', icon: 'fa-amazon' },
    { id: 'appleBooks', name: 'Apple Books', icon: 'fa-apple' },
];

const OnixDataViewer: React.FC<{ data: any }> = ({ data }) => {
    if (!data) return null;
    
    const renderValue = (value: any) => {
        if (Array.isArray(value)) {
            return (
                <ul className="list-disc list-inside pl-4 space-y-2">
                    {value.map((item, index) => (
                        <li key={index} className="bg-gray-700 p-2 rounded-md">
                            {renderValue(item)}
                        </li>
                    ))}
                </ul>
            );
        }
        if (typeof value === 'object' && value !== null) {
            return (
                <div className="pl-4 border-l border-gray-600">
                    {Object.entries(value).map(([key, val]) => (
                        <div key={key} className="mb-1">
                            <strong className="text-indigo-300 capitalize">{key.replace(/_/g, ' ')}:</strong>
                            <div className="pl-2">{renderValue(val)}</div>
                        </div>
                    ))}
                </div>
            );
        }
        return <span className="text-white">{String(value)}</span>;
    };
    
    return (
        <div className="bg-gray-800 p-4 rounded-lg max-h-96 overflow-y-auto font-mono text-sm">
            {renderValue(data)}
        </div>
    );
};


export const BookDistributor: React.FC = () => {
    const [step, setStep] = useState<Step>('input');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<any | null>(null);
    const [distributionStatus, setDistributionStatus] = useState<Record<string, DistributionStatus>>({});

    const [formData, setFormData] = useState({
        manuscriptFile: null as File | null,
        coverFile: null as File | null,
        title: '',
        author: '',
        genre: '',
        keywords: '',
        description: '',
        isbn: '',
        publisher: '',
        publicationDate: '',
        price: { amount: 12.99, currency: 'USD' }
    });

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
     const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            price: { ...prev.price, [name]: name === 'amount' ? parseFloat(value) : value }
        }));
    };

    const handleManuscriptSelect = useCallback((file: File) => {
        setFormData(prev => ({ ...prev, manuscriptFile: file }));
    }, []);

    const handleCoverSelect = useCallback((file: File) => {
        setFormData(prev => ({ ...prev, coverFile: file }));
    }, []);
    
    const isFormValid = () => {
        return formData.manuscriptFile && formData.coverFile && formData.title && formData.author && formData.genre && formData.description && formData.isbn && formData.publisher && formData.publicationDate;
    }

    const handleSubmit = async () => {
        if (!isFormValid()) {
            setError('Please fill out all required fields.');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const kit = await generateDistributionKit(formData);
            setResult(kit);
            const initialStatus: Record<string, DistributionStatus> = {};
            distributors.forEach(d => initialStatus[d.id] = 'pending');
            setDistributionStatus(initialStatus);
            setStep('results');
        } catch (e: any) {
            setError(`Failed to generate the distribution kit: ${e.message}`);
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setStep('input');
        setResult(null);
        setDistributionStatus({});
    };

    const handleDistribute = () => {
        const newStatus = { ...distributionStatus };
        distributors.forEach((distributor, index) => {
            setTimeout(() => {
                setDistributionStatus(prev => ({ ...prev, [distributor.id]: 'delivering' }));
                setTimeout(() => {
                    setDistributionStatus(prev => ({ ...prev, [distributor.id]: 'delivered' }));
                }, 1000 + Math.random() * 1000);
            }, index * 300);
        });
    };
    
    const renderInputField = (name: string, label: string, placeholder: string, type = 'text', required = true) => (
         <div>
            <label htmlFor={name} className="block text-sm font-medium text-indigo-200 mb-1">{label}</label>
            <input type={type} id={name} name={name} value={(formData as any)[name]} onChange={handleFormChange} placeholder={placeholder} required={required} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
        </div>
    );

    const renderDistributionStatus = () => (
         <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">Distribution Channels</h3>
            <div className="space-y-3">
                {distributors.map(d => {
                    const status = distributionStatus[d.id] || 'pending';
                    const statusInfo = {
                        pending: { text: 'Pending', icon: 'fa-clock', color: 'text-gray-400' },
                        delivering: { text: 'Delivering...', icon: 'fa-spinner fa-spin', color: 'text-yellow-400' },
                        delivered: { text: 'Delivered', icon: 'fa-check-circle', color: 'text-green-400' },
                    }[status];
                    return (
                        <div key={d.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-md">
                            <div className="flex items-center gap-3">
                                <i className={`fab ${d.icon} w-5 text-center text-lg text-indigo-300`}></i>
                                <span className="font-semibold">{d.name}</span>
                            </div>
                            <div className={`flex items-center gap-2 font-semibold ${statusInfo.color}`}>
                                <i className={`fas ${statusInfo.icon}`}></i>
                                <span>{statusInfo.text}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            <button 
                onClick={handleDistribute}
                disabled={Object.values(distributionStatus).some(s => s === 'delivering' || s === 'delivered')}
                className="w-full mt-6 px-6 py-3 bg-indigo-600 text-white font-semibold text-lg rounded-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed"
            >
                <i className="fas fa-rocket mr-2"></i>Distribute to All Channels
            </button>
         </div>
    );

    if (isLoading) {
        return <div className="max-w-4xl mx-auto"><LoadingSpinner message="Generating your professional distribution package..." /></div>;
    }
    
    if (step === 'results' && result) {
        return (
             <div className="max-w-6xl mx-auto p-4 animate-fade-in">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold">Your Distribution Package is Ready!</h2>
                    <p className="text-indigo-200">The AI has generated your ONIX-standard metadata for distribution.</p>
                     <button onClick={handleReset} className="mt-4 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700">
                        <i className="fas fa-arrow-left mr-2"></i>Start Over
                     </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <div className="bg-gray-800 rounded-lg p-6 mb-6">
                            <h3 className="text-xl font-bold text-white mb-4">Package Contents</h3>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-3 bg-gray-700 p-3 rounded-md"><i className="fas fa-file-alt text-indigo-300"></i>manuscript.epub</li>
                                <li className="flex items-center gap-3 bg-gray-700 p-3 rounded-md"><i className="fas fa-image text-indigo-300"></i>cover.jpg</li>
                                <li className="flex items-center gap-3 bg-gray-700 p-3 rounded-md"><i className="fas fa-file-code text-indigo-300"></i>metadata.onix.xml</li>
                            </ul>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-6">
                            <h3 className="text-xl font-bold text-white mb-4">ONIX Metadata Preview</h3>
                            <OnixDataViewer data={result} />
                        </div>
                    </div>
                    <div>
                        {renderDistributionStatus()}
                    </div>
                </div>
             </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto p-4 animate-fade-in">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold">Professional Book Distributor</h2>
                <p className="text-indigo-200">Generate a complete distribution package with ONIX metadata.</p>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FileUploader onFileSelect={handleManuscriptSelect} accept=".txt,.pdf,.docx" label="Upload Manuscript" />
                        <FileUploader onFileSelect={handleCoverSelect} accept="image/*" label="Upload Cover Art" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {renderInputField('title', 'Book Title', 'e.g., The Crimson Cipher')}
                        {renderInputField('author', 'Author Name', 'e.g., Jane Doe')}
                    </div>
                    
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {renderInputField('genre', 'Genre', 'e.g., Sci-Fi Thriller')}
                        {renderInputField('publisher', 'Publisher', 'e.g., Stellar Press')}
                    </div>
                    
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {renderInputField('isbn', 'ISBN-13', 'e.g., 978-3-16-148410-0')}
                        {renderInputField('publicationDate', 'Publication Date', '', 'date')}
                    </div>

                    <div>
                        <label htmlFor="price" className="block text-sm font-medium text-indigo-200 mb-1">Price (USD)</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">$</span>
                             <input type="number" id="price" name="amount" value={formData.price.amount} onChange={handlePriceChange} required className="w-full p-3 pl-7 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-indigo-200 mb-1">Book Description / Blurb</label>
                        <textarea id="description" name="description" value={formData.description} onChange={handleFormChange} placeholder="Paste your book blurb or a short summary here..." required className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none h-32" />
                    </div>
                    
                    {error && <p className="text-red-400 text-center">{error}</p>}
                    
                    <button onClick={handleSubmit} disabled={!isFormValid() || isLoading} className="w-full px-6 py-4 bg-indigo-600 text-white font-semibold text-lg rounded-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed">
                        Generate Distribution Package
                    </button>
                </div>
            </div>
        </div>
    );
};