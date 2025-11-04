
import React, { useState, useEffect } from 'react';

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

const InfoCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h4 className="font-semibold text-lg text-indigo-300 mb-2">{title}</h4>
        <div className="bg-gray-700 p-4 rounded-lg space-y-4 text-indigo-100">
            {children}
        </div>
    </div>
);

const EditableField: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ label, value, onChange }) => (
    <div>
        <label className="block text-sm font-medium text-indigo-300 mb-1">{label}</label>
        <input
            type="text"
            value={value}
            onChange={onChange}
            className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none text-white font-sans"
        />
    </div>
);

const EditableTextarea: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; rows?: number }> = ({ label, value, onChange, rows = 3 }) => (
    <div>
        <label className="block text-sm font-medium text-indigo-300 mb-1">{label}</label>
        <textarea
            value={value}
            onChange={onChange}
            rows={rows}
            className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none text-white font-sans"
        />
    </div>
);

export const FunnelDisplay: React.FC<FunnelDisplayProps> = ({ plan, onReset }) => {
    const [showToast, setShowToast] = useState(false);
    const [editablePlan, setEditablePlan] = useState(plan);

    useEffect(() => {
        setEditablePlan(plan);
    }, [plan]);

    const handlePlanChange = (path: (string | number)[], value: any) => {
        setEditablePlan(currentPlan => {
            // Use a simple deep copy for easier state updates in a nested object.
            // For this app's scale, it's a clean and acceptable trade-off.
            const newPlan = JSON.parse(JSON.stringify(currentPlan));
            let current = newPlan;
            for (let i = 0; i < path.length - 1; i++) {
                current = current[path[i]];
            }
            current[path[path.length - 1]] = value;
            return newPlan;
        });
    };
    
    const handleListChange = (path: (string | number)[], index: number, field: string, value: any) => {
        const newPath = [...path, index, field];
        handlePlanChange(newPath, value);
    };

    const handleStringListChange = (path: (string|number)[], index: number, value: string) => {
        const newPath = [...path, index];
        handlePlanChange(newPath, value);
    };

    const addListItem = (path: (string | number)[], newItem: any) => {
        let currentItems = editablePlan;
        path.forEach(p => { currentItems = currentItems[p] });
        const newItems = [...(currentItems || []), newItem];
        handlePlanChange(path, newItems);
    }
    
    const removeListItem = (path: (string | number)[], index: number) => {
        let currentItems = editablePlan;
        path.forEach(p => { currentItems = currentItems[p] });
        const newItems = (currentItems || []).filter((_: any, i: number) => i !== index);
        handlePlanChange(path, newItems);
    }


    const copyFullJson = () => {
        navigator.clipboard.writeText(JSON.stringify(editablePlan, null, 2));
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    return (
        <div className="animate-fade-in space-y-8">
             {showToast && (
                <div className="fixed top-24 right-6 bg-green-600 text-white py-2 px-4 rounded-lg shadow-lg z-50 animate-fade-in-down">
                    JSON copied to clipboard!
                </div>
            )}
            <div className="text-center">
                <h2 className="text-3xl font-bold">Your AI-Generated Sales Funnel Plan</h2>
                <div className="mt-2">
                    <input 
                        type="text" 
                        value={editablePlan.funnelName || ''}
                        onChange={(e) => handlePlanChange(['funnelName'], e.target.value)}
                        className="text-indigo-200 bg-transparent text-center text-lg p-1 rounded-md focus:bg-gray-700 focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
                <div className="mt-4 flex gap-4 justify-center">
                    <button onClick={onReset} className="px-4 py-2 text-sm bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-700 transition-colors">
                        <i className="fas fa-arrow-left mr-2"></i>Start Over
                    </button>
                    <button onClick={copyFullJson} className="px-4 py-2 text-sm bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors">
                        <i className="fas fa-code mr-2"></i>Copy Edited JSON
                    </button>
                </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-indigo-500/30">
                <EditableTextarea 
                    label="Target Audience Summary"
                    value={editablePlan.targetAudienceSummary || ''}
                    onChange={(e) => handlePlanChange(['targetAudienceSummary'], e.target.value)}
                />
            </div>

            <div className="space-y-4">
                <Accordion title="Stage 1: Top of Funnel (Awareness)" icon="fa-bullhorn" defaultOpen>
                    <InfoCard title="Lead Magnet Idea">
                        <EditableField label="Title" value={editablePlan.topOfFunnel?.leadMagnet?.title || ''} onChange={e => handlePlanChange(['topOfFunnel', 'leadMagnet', 'title'], e.target.value)} />
                        <EditableField label="Format" value={editablePlan.topOfFunnel?.leadMagnet?.format || ''} onChange={e => handlePlanChange(['topOfFunnel', 'leadMagnet', 'format'], e.target.value)} />
                        <EditableTextarea label="Description" value={editablePlan.topOfFunnel?.leadMagnet?.description || ''} onChange={e => handlePlanChange(['topOfFunnel', 'leadMagnet', 'description'], e.target.value)} />
                    </InfoCard>
                    <InfoCard title="Ad Copy Suggestions">
                        {(editablePlan.topOfFunnel?.adCopy || []).map((ad: any, index: number) => (
                            <div key={index} className="p-3 bg-gray-900 rounded-md relative space-y-2">
                                <button onClick={() => removeListItem(['topOfFunnel', 'adCopy'], index)} className="absolute top-2 right-2 text-gray-500 hover:text-red-400"><i className="fas fa-trash-alt"></i></button>
                                <EditableField label="Platform" value={ad.platform || ''} onChange={e => handleListChange(['topOfFunnel', 'adCopy'], index, 'platform', e.target.value)} />
                                <EditableField label="Headline" value={ad.headline || ''} onChange={e => handleListChange(['topOfFunnel', 'adCopy'], index, 'headline', e.target.value)} />
                                <EditableTextarea label="Body" value={ad.body || ''} rows={4} onChange={e => handleListChange(['topOfFunnel', 'adCopy'], index, 'body', e.target.value)} />
                            </div>
                        ))}
                        <button onClick={() => addListItem(['topOfFunnel', 'adCopy'], {platform: "Facebook", headline: "New Headline", body: "New ad body..."})} className="mt-2 text-sm text-indigo-300 hover:text-white font-semibold"><i className="fas fa-plus-circle mr-2"></i>Add Ad Suggestion</button>
                    </InfoCard>
                </Accordion>

                <Accordion title="Stage 2: Middle of Funnel (Consideration)" icon="fa-envelope-open-text" defaultOpen>
                     <InfoCard title="Landing Page Copy">
                        <EditableField label="Headline" value={editablePlan.middleOfFunnel?.landingPage?.headline || ''} onChange={e => handlePlanChange(['middleOfFunnel', 'landingPage', 'headline'], e.target.value)} />
                        <EditableTextarea label="Sub-headline" value={editablePlan.middleOfFunnel?.landingPage?.subheadline || ''} onChange={e => handlePlanChange(['middleOfFunnel', 'landingPage', 'subheadline'], e.target.value)} />
                        <div>
                            <label className="block text-sm font-medium text-indigo-300 mb-1">Bullet Points</label>
                            <div className="space-y-2">
                                {(editablePlan.middleOfFunnel?.landingPage?.bulletPoints || []).map((bp: string, i: number) => 
                                    <div key={i} className="flex items-center gap-2">
                                        <input type="text" value={bp} onChange={e => handleStringListChange(['middleOfFunnel', 'landingPage', 'bulletPoints'], i, e.target.value)} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none text-white font-sans"/>
                                        <button onClick={() => removeListItem(['middleOfFunnel', 'landingPage', 'bulletPoints'], i)} className="text-gray-500 hover:text-red-400"><i className="fas fa-times-circle"></i></button>
                                    </div>
                                )}
                                <button onClick={() => addListItem(['middleOfFunnel', 'landingPage', 'bulletPoints'], "New benefit...")} className="text-sm text-indigo-300 hover:text-white font-semibold"><i className="fas fa-plus-circle mr-2"></i>Add Bullet Point</button>
                            </div>
                        </div>
                        <EditableField label="Call to Action Button Text" value={editablePlan.middleOfFunnel?.landingPage?.callToAction || ''} onChange={e => handlePlanChange(['middleOfFunnel', 'landingPage', 'callToAction'], e.target.value)} />
                    </InfoCard>
                    <InfoCard title="Email Nurture Sequence">
                        {(editablePlan.middleOfFunnel?.emailNurtureSequence || []).map((email: any, index: number) => (
                             <div key={index} className="p-3 bg-gray-900 rounded-md relative space-y-2">
                                <button onClick={() => removeListItem(['middleOfFunnel', 'emailNurtureSequence'], index)} className="absolute top-2 right-2 text-gray-500 hover:text-red-400"><i className="fas fa-trash-alt"></i></button>
                                <EditableField label={`Day ${email.day} - Subject Line`} value={email.subject || ''} onChange={e => handleListChange(['middleOfFunnel', 'emailNurtureSequence'], index, 'subject', e.target.value)} />
                                <EditableTextarea label="Email Body (Markdown)" rows={8} value={email.body || ''} onChange={e => handleListChange(['middleOfFunnel', 'emailNurtureSequence'], index, 'body', e.target.value)} />
                            </div>
                        ))}
                        <button onClick={() => addListItem(['middleOfFunnel', 'emailNurtureSequence'], { day: (editablePlan.middleOfFunnel?.emailNurtureSequence?.length || 0) + 1, subject: "New Email Subject", body: "Write your email content here."})} className="mt-2 text-sm text-indigo-300 hover:text-white font-semibold"><i className="fas fa-plus-circle mr-2"></i>Add Email to Sequence</button>
                    </InfoCard>
                </Accordion>

                 <Accordion title="Stage 3: Bottom of Funnel (Conversion)" icon="fa-shopping-cart" defaultOpen>
                    <InfoCard title="Sales Page Content">
                        <EditableField label="Headline" value={editablePlan.bottomOfFunnel?.salesPage?.headline || ''} onChange={e => handlePlanChange(['bottomOfFunnel', 'salesPage', 'headline'], e.target.value)} />
                        <EditableTextarea label="Video Script Hook" value={editablePlan.bottomOfFunnel?.salesPage?.videoScriptHook || ''} onChange={e => handlePlanChange(['bottomOfFunnel', 'salesPage', 'videoScriptHook'], e.target.value)} />
                        <div>
                            <label className="block text-sm font-medium text-indigo-300 mb-1">Long-Form Copy Outline</label>
                             <div className="space-y-2">
                                {(editablePlan.bottomOfFunnel?.salesPage?.longFormCopyOutline || []).map((item: string, i: number) => 
                                   <div key={i} className="flex items-center gap-2">
                                        <input type="text" value={item} onChange={e => handleStringListChange(['bottomOfFunnel', 'salesPage', 'longFormCopyOutline'], i, e.target.value)} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none text-white font-sans"/>
                                        <button onClick={() => removeListItem(['bottomOfFunnel', 'salesPage', 'longFormCopyOutline'], i)} className="text-gray-500 hover:text-red-400"><i className="fas fa-times-circle"></i></button>
                                    </div>
                                )}
                                <button onClick={() => addListItem(['bottomOfFunnel', 'salesPage', 'longFormCopyOutline'], "New Section...")} className="text-sm text-indigo-300 hover:text-white font-semibold"><i className="fas fa-plus-circle mr-2"></i>Add Section</button>
                            </div>
                        </div>
                        <EditableField label="Call to Action Button Text" value={editablePlan.bottomOfFunnel?.salesPage?.callToAction || ''} onChange={e => handlePlanChange(['bottomOfFunnel', 'salesPage', 'callToAction'], e.target.value)} />
                    </InfoCard>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InfoCard title="Order Bump">
                            <EditableField label="Title" value={editablePlan.bottomOfFunnel?.orderBump?.title || ''} onChange={e => handlePlanChange(['bottomOfFunnel', 'orderBump', 'title'], e.target.value)} />
                            <EditableField label="Price" value={editablePlan.bottomOfFunnel?.orderBump?.pricePoint || ''} onChange={e => handlePlanChange(['bottomOfFunnel', 'orderBump', 'pricePoint'], e.target.value)} />
                            <EditableTextarea label="Description" value={editablePlan.bottomOfFunnel?.orderBump?.description || ''} onChange={e => handlePlanChange(['bottomOfFunnel', 'orderBump', 'description'], e.target.value)} />
                        </InfoCard>
                        <InfoCard title="One-Time Offer (Upsell)">
                           <EditableField label="Title" value={editablePlan.bottomOfFunnel?.oneTimeOfferUpsell?.title || ''} onChange={e => handlePlanChange(['bottomOfFunnel', 'oneTimeOfferUpsell', 'title'], e.target.value)} />
                           <EditableField label="Price" value={editablePlan.bottomOfFunnel?.oneTimeOfferUpsell?.pricePoint || ''} onChange={e => handlePlanChange(['bottomOfFunnel', 'oneTimeOfferUpsell', 'pricePoint'], e.target.value)} />
                           <EditableTextarea label="Description" value={editablePlan.bottomOfFunnel?.oneTimeOfferUpsell?.description || ''} onChange={e => handlePlanChange(['bottomOfFunnel', 'oneTimeOfferUpsell', 'description'], e.target.value)} />
                        </InfoCard>
                    </div>
                </Accordion>
            </div>
        </div>
    );
};
