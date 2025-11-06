import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface CampaignDisplayProps {
    plan: any;
    manuscriptTitle: string;
    isExporting: boolean;
    onExport: () => void;
    onReset: () => void;
    error: string | null;
}

const CampaignStep: React.FC<{
    title: string;
    icon: string;
    description: string;
    children: React.ReactNode;
}> = ({ title, icon, description, children }) => {
    const [isOpen, setIsOpen] = useState(true);

    if (!children) {
        return null;
    }

    return (
        <div className="bg-gray-800/80 rounded-lg overflow-hidden border border-gray-700 backdrop-blur-sm transition-all">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full p-4 flex justify-between items-center text-left bg-gray-700/50 hover:bg-gray-600/50 transition-colors">
                 <div className="flex items-start gap-4 flex-1">
                    <i className={`fas ${icon} text-xl w-6 text-center text-indigo-400 mt-1`}></i>
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-white">{title}</h3>
                        <p className="text-sm text-gray-400 mt-1">{description}</p>
                    </div>
                 </div>
                 <div className="ml-4 flex items-center gap-4">
                    <div className="flex items-center justify-center w-28 px-3 py-1.5 text-sm font-semibold text-green-300 bg-green-500/20 rounded-full">
                        <i className="fas fa-check-circle mr-2"></i>
                        Generated
                    </div>
                     <div className="text-gray-400">
                        <i className={`fas fa-chevron-down transform transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
                     </div>
                 </div>
            </button>
            {isOpen && <div className="p-6 space-y-6 border-t border-gray-700">{children}</div>}
        </div>
    );
};


const InfoCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={className}>
        <h4 className="font-semibold text-lg text-indigo-300 mb-2">{title}</h4>
        <div className="bg-gray-900/70 p-4 rounded-lg space-y-2 text-indigo-100 prose prose-sm prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
            {children}
        </div>
    </div>
);

const Tag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="inline-block bg-indigo-500 bg-opacity-20 text-indigo-200 text-sm font-medium px-3 py-1 rounded-full">
        {children}
    </span>
);

const campaignSteps = [
    {
        key: 'step1_bookAnalysis',
        title: 'Step 1: Comprehensive Book Analysis',
        icon: 'fa-search',
        description: "Structured data about your book's core identity, audience, and market position."
    },
    {
        key: 'step2_campaignArchitecture',
        title: 'Step 2: Campaign Architecture',
        icon: 'fa-sitemap',
        description: "Launch plans, long-term roadmaps, and budget strategies."
    },
    {
        key: 'step3_multiChannelCampaigns',
        title: 'Step 3: Multi-Channel Strategy',
        icon: 'fa-share-alt',
        description: "Detailed plans for Amazon, social media, email, and influencers."
    },
    {
        key: 'step4_assetGeneration',
        title: 'Step 4: Asset Generation',
        icon: 'fa-file-alt',
        description: "Creative copy: blurbs, ad hooks, video scripts, and more."
    },
];

const ArchitectureTabs: React.FC<{ plan: any }> = ({ plan }) => {
    const [activeTab, setActiveTab] = useState('24-hour');
    return (
        <div>
            <div className="border-b border-gray-700 mb-6">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('24-hour')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === '24-hour' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>
                        24-Hour Launch Plan
                    </button>
                    <button onClick={() => setActiveTab('30-day')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === '30-day' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>
                        30-Day Momentum Plan
                    </button>
                    <button onClick={() => setActiveTab('long-term')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'long-term' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>
                        Long-Term Roadmaps
                    </button>
                </nav>
            </div>
            {activeTab === '24-hour' && (
                <InfoCard title="24-Hour Blitz Launch Plan Details">
                    <ul className="space-y-3">
                        {(plan?.launchPlan_24Hour || []).map((item: any, i: number) => (
                            <li key={i} className="bg-gray-900/50 p-3 rounded-md">
                                <p className="font-bold">{item.hour}</p>
                                <p><strong className="text-indigo-400">Task:</strong> {item.task}</p>
                                <div className="flex justify-between text-xs mt-1">
                                    <span className="bg-gray-700 px-2 py-0.5 rounded-full"><i className="fas fa-bullseye mr-1"></i> {item.objective}</span>
                                    <span className="bg-gray-700 px-2 py-0.5 rounded-full"><i className="fas fa-desktop mr-1"></i> {item.platform}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </InfoCard>
            )}
             {activeTab === '30-day' && (
                <InfoCard title="30-Day Momentum Plan Details">
                    <ul className="space-y-3">
                        {(plan?.momentumPlan_30Day || []).map((item: any, i: number) => (
                            <li key={i} className="bg-gray-900/50 p-3 rounded-md">
                                <p className="font-bold">{item.day}</p>
                                <p><strong className="text-indigo-400">Task:</strong> {item.task}</p>
                                <div className="flex justify-between text-xs mt-1">
                                    <span className="bg-gray-700 px-2 py-0.5 rounded-full"><i className="fas fa-bullseye mr-1"></i> {item.objective}</span>
                                    <span className="bg-gray-700 px-2 py-0.5 rounded-full"><i className="fas fa-desktop mr-1"></i> {item.platform}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </InfoCard>
            )}
            {activeTab === 'long-term' && (
                <div className="space-y-6">
                    <InfoCard title="90-Day Viral Expansion Plan"><ReactMarkdown>{plan?.viralPlan_90Day || ''}</ReactMarkdown></InfoCard>
                    <InfoCard title="365-Day Million-Reader Roadmap"><ReactMarkdown>{plan?.millionReaderRoadmap_365Day || ''}</ReactMarkdown></InfoCard>
                </div>
            )}
        </div>
    );
}

export const CampaignDisplay: React.FC<CampaignDisplayProps> = ({ plan, manuscriptTitle, isExporting, onExport, onReset, error }) => {

    const renderStepContent = (stepKey: string) => {
        const { step1_bookAnalysis, step2_campaignArchitecture, step3_multiChannelCampaigns, step4_assetGeneration } = plan || {};
        switch(stepKey) {
            case 'step1_bookAnalysis': return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <InfoCard title="Genre & Market Positioning"><ReactMarkdown>{step1_bookAnalysis?.genreAndPositioning || 'Not available.'}</ReactMarkdown></InfoCard>
                    <InfoCard title="Unique Selling Proposition"><p className="text-lg italic">"{step1_bookAnalysis?.uniqueSellingProposition || 'Not available.'}"</p></InfoCard>
                    <InfoCard title="Target Audience: A Day in the Life" className="lg:col-span-2"><ReactMarkdown>{step1_bookAnalysis?.targetAudienceProfile?.dayInTheLife || 'Not available.'}</ReactMarkdown></InfoCard>
                    <InfoCard title="Competitive Analysis">
                        {(step1_bookAnalysis?.competitiveAnalysis || []).map((comp: any, i:number) => (
                            <div key={i} className="py-2 border-b border-gray-700 last:border-b-0">
                                <p className="font-bold">{comp.title} <span className="font-normal text-gray-400">by {comp.author}</span></p>
                                <p className="text-xs text-indigo-300">Differentiation: <span className="text-indigo-100">{comp.differentiation}</span></p>
                            </div>
                        ))}
                    </InfoCard>
                    <InfoCard title="Commercial Potential"><ReactMarkdown>{step1_bookAnalysis?.commercialPotential || 'Not available.'}</ReactMarkdown></InfoCard>
                </div>
            );
            case 'step2_campaignArchitecture': return <ArchitectureTabs plan={step2_campaignArchitecture} />;
            case 'step3_multiChannelCampaigns': return (
                 <div className="space-y-6">
                    <InfoCard title="Amazon Optimization Strategy">
                        <p><strong>Keywords:</strong></p>
                        <div className="flex flex-wrap gap-2">
                            {(step3_multiChannelCampaigns?.amazonStrategy?.keywords || []).map((kw: string, i:number) => <Tag key={i}>{kw}</Tag>)}
                        </div>
                         <p className="mt-4"><strong>Categories:</strong></p>
                        <div className="flex flex-wrap gap-2">
                             {(step3_multiChannelCampaigns?.amazonStrategy?.categories || []).map((cat: string, i:number) => <Tag key={i}>{cat}</Tag>)}
                        </div>
                    </InfoCard>
                     {(step3_multiChannelCampaigns?.socialMediaCampaigns || []).map((sm: any, i:number) => (
                        <InfoCard title={`Social Media: ${sm.platform} Strategy`} key={i}>
                            <ReactMarkdown>{sm.strategy}</ReactMarkdown>
                        </InfoCard>
                    ))}
                     <InfoCard title="Email Marketing Nurture Sequence">
                        {(step3_multiChannelCampaigns?.emailMarketingSequence || []).map((email: any, i:number) => (
                             <div key={i} className="py-2 border-b border-gray-700 last:border-b-0">
                                <p><strong>Day {email.day}:</strong> {email.subject}</p>
                            </div>
                        ))}
                     </InfoCard>
                 </div>
            );
            case 'step4_assetGeneration': return (
                <div className="space-y-6">
                    <InfoCard title="Copy Library: Book Blurbs">
                        <h5 className="font-bold text-indigo-400">Short</h5>
                        <p>{step4_assetGeneration?.copyLibrary?.bookBlurbs?.short || 'Not available.'}</p>
                        <h5 className="font-bold text-indigo-400 mt-2">Medium</h5>
                        <p>{step4_assetGeneration?.copyLibrary?.bookBlurbs?.medium || 'Not available.'}</p>
                         <h5 className="font-bold text-indigo-400 mt-2">Long</h5>
                        <p>{step4_assetGeneration?.copyLibrary?.bookBlurbs?.long || 'Not available.'}</p>
                    </InfoCard>
                     <InfoCard title="Copy Library: Ad Hooks">
                         {(step4_assetGeneration?.copyLibrary?.adCopyHooks || []).map((category: any, i: number) => (
                            <div key={i} className="mb-3 last:mb-0">
                                <h5 className="font-bold text-indigo-400">{category.angle}</h5>
                                <ul className="list-disc list-inside pl-4">
                                    {(category.hooks || []).map((hook: string, j: number) => <li key={j}>{hook}</li>)}
                                </ul>
                            </div>
                        ))}
                    </InfoCard>
                    <InfoCard title="Video Trailer Scripts">
                        {(step4_assetGeneration?.videoTrailerScripts || []).map((trailer: any, i: number) => (
                            <div key={i} className="mb-4 last:mb-0 border-b border-gray-700 pb-2 last:border-b-0 last:pb-0">
                                <h5 className="font-bold text-indigo-400">{trailer.concept}</h5>
                                <ReactMarkdown>{trailer.script}</ReactMarkdown>
                            </div>
                        ))}
                    </InfoCard>
                </div>
            );
            default: return null;
        }
    };

    const allSectionsGenerated = plan && Object.keys(plan).length > 0;

    return (
        <div className="animate-fade-in">
             <div className="text-center mb-8">
                <h2 className="text-3xl font-bold">Your Marketing Campaign Plan</h2>
                <p className="text-indigo-200 mt-1">For <span className="font-bold text-white italic">"{manuscriptTitle}"</span></p>
                <div className="mt-4 flex gap-4 justify-center">
                    <button onClick={onReset} className="px-4 py-2 text-sm bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-700 transition-colors">
                        <i className="fas fa-arrow-left mr-2"></i>Start Over
                    </button>
                    <button onClick={onExport} disabled={isExporting || !allSectionsGenerated} className="px-4 py-2 text-sm bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-700 transition-colors disabled:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50">
                        {isExporting ? <><i className="fas fa-spinner fa-spin mr-2"></i>Exporting...</> : <><i className="fas fa-file-pdf mr-2"></i>Export to PDF</>}
                    </button>
                </div>
            </div>
            
            {error && (
                 <div className="text-center my-4 p-4 bg-red-900/50 border border-red-500 rounded-lg">
                    <p className="text-red-300 font-semibold">An Error Occurred</p>
                    <p className="text-red-200 text-sm mt-1">{error}</p>
                 </div>
            )}
            
            <div className="space-y-4">
                {campaignSteps.map(step => (
                    plan?.[step.key] ? (
                        <CampaignStep
                            key={step.key}
                            title={step.title}
                            icon={step.icon}
                            description={step.description}
                        >
                            {renderStepContent(step.key)}
                        </CampaignStep>
                    ) : null
                ))}
            </div>
        </div>
    );
};