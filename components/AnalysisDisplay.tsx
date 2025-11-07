
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

interface AnalysisDisplayProps {
    analysisText: string;
}

interface ParsedSection {
    title: string;
    content: string;
}


const Accordion: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full p-4 flex justify-between items-center text-left bg-gray-700 hover:bg-gray-600 transition-colors">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    {title}
                </h3>
                <i className={`fas fa-chevron-down transform transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
            </button>
            {isOpen && 
                <div className="p-6 prose prose-sm prose-invert max-w-none text-indigo-100">
                     <ReactMarkdown>{children as string}</ReactMarkdown>
                </div>
            }
        </div>
    )
};


export const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ analysisText }) => {
    const [sections, setSections] = useState<ParsedSection[]>([]);

    useEffect(() => {
        if (!analysisText) return;

        const contentWithoutTitle = analysisText.substring(analysisText.indexOf('\n') + 1);
        
        const parsedSections = contentWithoutTitle
            .split(/\n(?=## )/)
            .map(section => section.trim())
            .filter(Boolean)
            .map(sectionString => {
                const sectionLines = sectionString.split('\n');
                const title = sectionLines[0].replace('## ', '').trim();
                const content = sectionLines.slice(1).join('\n').trim();
                return { title, content };
            });

        setSections(parsedSections);

    }, [analysisText]);

    return (
        <div className="space-y-4">
            {sections.map((section, index) => (
                <Accordion key={index} title={section.title} defaultOpen={index < 2}>
                    {section.content}
                </Accordion>
            ))}
        </div>
    );
};
