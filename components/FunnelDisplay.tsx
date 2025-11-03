import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface FunnelDisplayProps {
    plan: any;
    onReset: () => void;
}

const Accordion: React.FC<{ title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, icon, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
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

const CopyableBlock: React.FC<{ content: string; language?: string }> = ({ content, language = 'text' }) => {
    const [copied, setCopied] = useState(false);
    const copyToClipboard = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative bg-gray-900 p-4 rounded-md">
            <pre className="whitespace-pre-wrap text-sm text-indigo-100 font-sans">{content}</pre>
            <button onClick={copyToClipboard} className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors" title="Copy to clipboard">
                {copied ? <i className="fas fa-check text-green-400"></i> : <i className="fas fa-copy"></i>}
            </button>
        </div>
    );
};


const InfoCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h4 className="font-semibold text-lg text-indigo-300 mb-2">{title}</h4>
        <div className="bg-gray-700 p-4 rounded-lg space-y-2 text-indigo-100">
            {children}
        </div>
    </div>
);

export const FunnelDisplay: React.FC<FunnelDisplayProps> = ({ plan, onReset }) => {
    const [showToast, setShowToast] = useState(false);

    const copyFullJson = () => {
        navigator.clipboard.writeText(JSON.stringify(plan, null, 2));
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    return (
        <div className="animate-fade-in space-y-8">
             {showToast && (
                <div className="fixed top-24 right-6 bg-green-600 text-white py-2 px-4 rounded-lg shadow-lg z-50">
                    JSON copied to clipboard!
                </div>
            )}
            <div className="text-center">
                <h2 className="text-3xl font-bold">Your AI-Generated Sales Funnel Plan</h2>
                <p className="text-indigo-200 mt-2">"{plan.funnelName}"</p>
                <div className="mt-4 flex gap-4 justify-center">
                    <button onClick={onReset} className="px-4 py-2 text-sm bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-700 transition-colors">
                        <i className="fas fa-arrow-left mr-2"></i>Start Over
                    </button>
                    <button onClick={copyFullJson} className="px-4 py-2 text-sm bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors">
                        <i className="fas fa-code mr-2"></i>Copy Full JSON
                    </button>
                </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-indigo-500/30">
                <h3 className="font-bold text-indigo-300 mb-2">Target Audience</h3>
                <p className="text-indigo-100">{plan.targetAudienceSummary}</p>
            </div>

            <div className="space-y-4">
                <Accordion title="Stage 1: Top of Funnel (Awareness)" icon="fa-bullhorn" defaultOpen>
                    <InfoCard title="Lead Magnet Idea">
                        <p><strong>Title:</strong> {plan.topOfFunnel?.leadMagnet?.title}</p>
                        <p><strong>Format:</strong> {plan.topOfFunnel?.leadMagnet?.format}</p>
                        <p><strong>Description:</strong> {plan.topOfFunnel?.leadMagnet?.description}</p>
                    </InfoCard>
                    <InfoCard title="Ad Copy Suggestions">
                        {(plan.topOfFunnel?.adCopy || []).map((ad: any, index: number) => (
                            <div key={index} className="p-3 bg-gray-900 rounded-md">
                                <p className="font-bold text-indigo-300">{ad.platform}</p>
                                <p><strong>Headline:</strong> {ad.headline}</p>
                                <p><strong>Body:</strong></p>
                                <CopyableBlock content={ad.body} />
                            </div>
                        ))}
                    </InfoCard>
                </Accordion>

                <Accordion title="Stage 2: Middle of Funnel (Consideration)" icon="fa-envelope-open-text" defaultOpen>
                     <InfoCard title="Landing Page Copy">
                        <p><strong>Headline:</strong> {plan.middleOfFunnel?.landingPage?.headline}</p>
                        <p><strong>Sub-headline:</strong> {plan.middleOfFunnel?.landingPage?.subheadline}</p>
                        <div>
                            <strong>Bullet Points:</strong>
                            <ul className="list-disc list-inside ml-4 mt-1">
                                {(plan.middleOfFunnel?.landingPage?.bulletPoints || []).map((bp: string, i: number) => <li key={i}>{bp}</li>)}
                            </ul>
                        </div>
                        <p><strong>Call to Action Button:</strong> "{plan.middleOfFunnel?.landingPage?.callToAction}"</p>
                    </InfoCard>
                    <InfoCard title="Email Nurture Sequence">
                        {(plan.middleOfFunnel?.emailNurtureSequence || []).map((email: any, index: number) => (
                             <div key={index} className="p-3 bg-gray-900 rounded-md">
                                <p className="font-bold text-indigo-300">Day {email.day} - Subject: {email.subject}</p>
                                <div className="mt-2 prose prose-sm prose-invert max-w-none prose-p:my-2">
                                     <ReactMarkdown>{email.body}</ReactMarkdown>
                                </div>
                            </div>
                        ))}
                    </InfoCard>
                </Accordion>

                 <Accordion title="Stage 3: Bottom of Funnel (Conversion)" icon="fa-shopping-cart" defaultOpen>
                    <InfoCard title="Sales Page Content">
                        <p><strong>Headline:</strong> {plan.bottomOfFunnel?.salesPage?.headline}</p>
                        <p><strong>Video Script Hook:</strong> "{plan.bottomOfFunnel?.salesPage?.videoScriptHook}"</p>
                        <div>
                            <strong>Long-Form Copy Outline:</strong>
                             <ul className="list-decimal list-inside ml-4 mt-1 space-y-1">
                                {(plan.bottomOfFunnel?.salesPage?.longFormCopyOutline || []).map((item: string, i: number) => <li key={i}>{item}</li>)}
                            </ul>
                        </div>
                        <p><strong>Call to Action Button:</strong> "{plan.bottomOfFunnel?.salesPage?.callToAction}"</p>
                    </InfoCard>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InfoCard title="Order Bump">
                            <p><strong>Title:</strong> {plan.bottomOfFunnel?.orderBump?.title}</p>
                             <p><strong>Price:</strong> {plan.bottomOfFunnel?.orderBump?.pricePoint}</p>
                            <p><strong>Description:</strong> {plan.bottomOfFunnel?.orderBump?.description}</p>
                        </InfoCard>
                        <InfoCard title="One-Time Offer (Upsell)">
                           <p><strong>Title:</strong> {plan.bottomOfFunnel?.oneTimeOfferUpsell?.title}</p>
                           <p><strong>Price:</strong> {plan.bottomOfFunnel?.oneTimeOfferUpsell?.pricePoint}</p>
                           <p><strong>Description:</strong> {plan.bottomOfFunnel?.oneTimeOfferUpsell?.description}</p>
                        </InfoCard>
                    </div>
                </Accordion>
            </div>
        </div>
    );
};
