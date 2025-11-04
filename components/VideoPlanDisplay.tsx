import React from 'react';
import ReactMarkdown from 'react-markdown';

interface VideoPlanDisplayProps {
    plan: any;
    onReset: () => void;
}

const Accordion: React.FC<{ title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, icon, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);
    return (
        <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full p-4 flex justify-between items-center text-left bg-gray-700 hover:bg-gray-600 transition-colors">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <i className={`fas ${icon}`}></i>
                    {title}
                </h3>
                <i className={`fas fa-chevron-down transform transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
            </button>
            {isOpen && <div className="p-6 space-y-6">{children}</div>}
        </div>
    )
};

const InfoCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h4 className="font-semibold text-lg text-indigo-300 mb-2">{title}</h4>
        <div className="bg-gray-900 p-4 rounded-lg space-y-2 text-indigo-100 prose prose-sm prose-invert max-w-none">
            {children}
        </div>
    </div>
);

export const VideoPlanDisplay: React.FC<VideoPlanDisplayProps> = ({ plan, onReset }) => {
    const { manuscriptAnalysis, coreVideoConcept, shotList, derivativeMicroVideos, platformAdaptations } = plan;

    return (
        <div className="max-w-5xl mx-auto p-4 animate-fade-in space-y-8">
            <div className="text-center">
                <h2 className="text-3xl font-bold">Your AI-Generated Video Marketing Plan</h2>
                <p className="text-indigo-200 mt-2">A complete creative blueprint to market your book with video.</p>
                <button onClick={onReset} className="mt-4 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700">
                    <i className="fas fa-arrow-left mr-2"></i>Create Another Plan
                </button>
            </div>
            
            <div className="space-y-4">
                 <Accordion title="Manuscript Analysis & Core Insights" icon="fa-search" defaultOpen>
                    <InfoCard title="Reader Avatar"><p>{manuscriptAnalysis?.readerAvatar}</p></InfoCard>
                    <InfoCard title="Core Theme & Promise"><p><strong>Theme:</strong> {manuscriptAnalysis?.coreTheme}</p><p><strong>Promise:</strong> {manuscriptAnalysis?.corePromise}</p></InfoCard>
                    <InfoCard title="Main Conflict"><p>{manuscriptAnalysis?.mainConflict}</p></InfoCard>
                    <InfoCard title="Emotional Hooks">
                        <ul className="list-disc list-inside">
                            {(manuscriptAnalysis?.emotionalHooks || []).map((hook: string, i: number) => <li key={i}>{hook}</li>)}
                        </ul>
                    </InfoCard>
                    <InfoCard title="Standout Quotes">
                        <ul className="list-disc list-inside">
                             {(manuscriptAnalysis?.standoutQuotes || []).map((quote: string, i: number) => <li key={i}>"{quote}"</li>)}
                        </ul>
                    </InfoCard>
                 </Accordion>

                 <Accordion title="Core Video Concept & Script" icon="fa-scroll" defaultOpen>
                     <InfoCard title="Hook Options (First 3 Seconds)">
                         <ul className="list-decimal list-inside">
                             {(coreVideoConcept?.hookOptions || []).map((hook: string, i: number) => <li key={i}><strong>{hook}</strong></li>)}
                         </ul>
                     </InfoCard>
                     <InfoCard title="Full Script (30-60s)">
                         <ReactMarkdown>{(coreVideoConcept?.script || '').replace(/\[VOICEOVER\]/g, '**VOICEOVER:**').replace(/\[ON-SCREEN TEXT\]/g, '\n**ON-SCREEN TEXT:**')}</ReactMarkdown>
                     </InfoCard>
                     <InfoCard title="Call-to-Action Options">
                         <ul className="list-disc list-inside">
                             {(coreVideoConcept?.ctaOptions || []).map((cta: string, i: number) => <li key={i}>{cta}</li>)}
                         </ul>
                     </InfoCard>
                 </Accordion>
                 
                 <Accordion title="Visual Direction & Shot List" icon="fa-video">
                    <div className="space-y-4">
                        {(shotList || []).map((scene: any, i: number) => (
                             <div key={i} className="bg-gray-900 p-4 rounded-lg">
                                <h4 className="font-bold text-indigo-300">{scene.scene}: <span className="font-normal text-white">{scene.scriptLine}</span></h4>
                                <p><strong className="text-indigo-400">Visuals:</strong> {scene.bRollSuggestion}</p>
                                <p><strong className="text-indigo-400">On-Screen Text:</strong> {scene.onScreenText}</p>
                                <p><strong className="text-indigo-400">Pacing:</strong> {scene.pacingNotes}</p>
                            </div>
                        ))}
                    </div>
                 </Accordion>

                 <Accordion title="Derivative Micro-Video Ideas" icon="fa-lightbulb">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(derivativeMicroVideos || []).map((video: any, i: number) => (
                            <div key={i} className="bg-gray-900 p-4 rounded-lg">
                                <h4 className="font-bold text-indigo-300">{video.conceptTitle}</h4>
                                <p className="text-sm mt-1 mb-2">{video.conceptDescription}</p>
                                <p className="p-2 bg-gray-700 rounded-md text-sm italic">"{video.textForVideo}"</p>
                            </div>
                        ))}
                     </div>
                 </Accordion>

                 <Accordion title="Platform-Specific Adaptations" icon="fa-share-alt">
                     <div className="space-y-4">
                        {(platformAdaptations || []).map((adapt: any, i: number) => (
                             <div key={i} className="bg-gray-900 p-4 rounded-lg">
                                <h4 className="font-bold text-2xl text-indigo-300 mb-2">{adapt.platform}</h4>
                                <p><strong className="text-indigo-400">Hook Variant:</strong> {adapt.hookVariant}</p>
                                {adapt.thumbnailTitleIdea && <p><strong className="text-indigo-400">Title/Thumbnail Idea:</strong> {adapt.thumbnailTitleIdea}</p>}
                                <div className="mt-2">
                                    <strong className="text-indigo-400">Caption:</strong>
                                    <div className="whitespace-pre-wrap p-2 bg-gray-700 rounded-md mt-1">{adapt.captionText}</div>
                                </div>
                            </div>
                        ))}
                     </div>
                 </Accordion>
            </div>
        </div>
    );
};