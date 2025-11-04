import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { exportCampaignToPDF } from '../services/pdfExportService';

const Accordion: React.FC<{ title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, icon, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);
    return (
        <div className="bg-gray-800/80 rounded-lg overflow-hidden border border-gray-700 backdrop-blur-sm">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full p-4 flex justify-between items-center text-left bg-gray-700/50 hover:bg-gray-600/50 transition-colors">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <i className={`fas ${icon} w-6 text-center text-indigo-400`}></i>
                    {title}
                </h3>
                <i className={`fas fa-chevron-down transform transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
            </button>
            {isOpen && <div className="p-6 space-y-6">{children}</div>}
        </div>
    )
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


export const CampaignDisplay: React.FC<{ plan: any, onReset: () => void, manuscriptTitle: string }> = ({ plan, onReset, manuscriptTitle }) => {
    const { step1_bookAnalysis, step2_campaignArchitecture, step3_multiChannelCampaigns, step4_assetGeneration } = plan;
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            await exportCampaignToPDF(plan, manuscriptTitle);
        } catch (e) {
            console.error("PDF Export failed", e);
            alert("An error occurred while exporting the PDF. Please check the console for details.");
        } finally {
            setIsExporting(false);
        }
    };


    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-4 mb-4">
                 <button onClick={onReset} className="px-4 py-2 text-sm bg-indigo-700 text-white font-semibold rounded-md hover:bg-indigo-800">
                    <i className="fas fa-arrow-left mr-2"></i>Analyze Another Manuscript
                </button>
                 <button onClick={handleExport} disabled={isExporting} className="px-4 py-2 text-sm bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-700 transition-colors disabled:bg-purple-800 disabled:cursor-not-allowed">
                     {isExporting ? <><i className="fas fa-spinner fa-spin mr-2"></i>Exporting...</> : <><i className="fas fa-file-pdf mr-2"></i>Export to PDF</>}
                </button>
            </div>

            <Accordion title="Step 1: Comprehensive Book Analysis" icon="fa-search" defaultOpen>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <InfoCard title="Genre & Market Positioning"><ReactMarkdown>{step1_bookAnalysis?.genreAndPositioning || ''}</ReactMarkdown></InfoCard>
                    <InfoCard title="Unique Selling Proposition"><p className="text-lg italic">"{step1_bookAnalysis?.uniqueSellingProposition}"</p></InfoCard>
                    <InfoCard title="Target Audience Summary" className="lg:col-span-2"><ReactMarkdown>{step1_bookAnalysis?.targetAudienceProfile?.dayInTheLife || ''}</ReactMarkdown></InfoCard>
                    <InfoCard title="Competitive Analysis">
                        {(step1_bookAnalysis?.competitiveAnalysis || []).map((comp: any, i:number) => (
                            <div key={i} className="py-2 border-b border-gray-700 last:border-b-0">
                                <p className="font-bold">{comp.title} <span className="font-normal text-gray-400">by {comp.author}</span></p>
                                <p className="text-xs text-indigo-300">Differentiation: <span className="text-indigo-100">{comp.differentiation}</span></p>
                            </div>
                        ))}
                    </InfoCard>
                    <InfoCard title="Commercial Potential"><ReactMarkdown>{step1_bookAnalysis?.commercialPotential || ''}</ReactMarkdown></InfoCard>
                </div>
            </Accordion>
            
            <Accordion title="Step 2: Campaign Architecture" icon="fa-sitemap">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InfoCard title="24-Hour Launch Plan">
                        <ul className="list-disc list-inside space-y-2">
                            {(step2_campaignArchitecture?.launchPlan_24Hour || []).map((item: any, i: number) => (
                                <li key={i}>
                                    <strong>{item.hour}:</strong> {item.action} - <span className="text-gray-400">{item.details}</span>
                                </li>
                            ))}
                        </ul>
                    </InfoCard>
                    <InfoCard title="30-Day Momentum Plan">
                        <ul className="list-disc list-inside space-y-2">
                            {(step2_campaignArchitecture?.momentumPlan_30Day || []).map((item: any, i: number) => (
                                <li key={i}>
                                    <strong>{item.day}:</strong> {item.action} - <span className="text-gray-400">{item.details}</span>
                                </li>
                            ))}
                        </ul>
                    </InfoCard>
                    <InfoCard title="90-Day Viral Expansion Plan" className="md:col-span-2"><ReactMarkdown>{step2_campaignArchitecture?.viralPlan_90Day || ''}</ReactMarkdown></InfoCard>
                    <InfoCard title="365-Day Million-Reader Roadmap" className="md:col-span-2"><ReactMarkdown>{step2_campaignArchitecture?.millionReaderRoadmap_365Day || ''}</ReactMarkdown></InfoCard>
                </div>
            </Accordion>

            <Accordion title="Step 3: Multi-Channel Strategy" icon="fa-share-alt">
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
            </Accordion>
            
            <Accordion title="Step 4: Asset Generation & Implementation" icon="fa-file-alt">
                <InfoCard title="Copy Library: Book Blurbs">
                    <h5 className="font-bold text-indigo-400">Short</h5>
                    <p>{step4_assetGeneration?.copyLibrary?.bookBlurbs?.short}</p>
                    <h5 className="font-bold text-indigo-400 mt-2">Medium</h5>
                    <p>{step4_assetGeneration?.copyLibrary?.bookBlurbs?.medium}</p>
                     <h5 className="font-bold text-indigo-400 mt-2">Long</h5>
                    <p>{step4_assetGeneration?.copyLibrary?.bookBlurbs?.long}</p>
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
                <InfoCard title="First 30 Days Implementation Timeline">
                    {(step4_assetGeneration?.implementationTimeline_30Day || []).map((week: any, i:number) => (
                         <div key={i} className="py-2">
                            <p className="font-bold">Week {week.week}: {week.focus}</p>
                            <ul className="list-disc list-inside pl-4">
                                {(week.actionSteps || []).map((step: string, j:number) => <li key={j}>{step}</li>)}
                            </ul>
                        </div>
                    ))}
                </InfoCard>
            </Accordion>
        </div>
    );
};