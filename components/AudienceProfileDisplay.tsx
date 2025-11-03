
import React from 'react';

interface ResultCardProps {
    title: string;
    icon: string;
    children: React.ReactNode;
}

const ResultCard: React.FC<ResultCardProps> = ({ title, icon, children }) => (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 h-full">
        <h3 className="text-xl font-bold text-indigo-300 mb-4 flex items-center">
            <i className={`fas ${icon} mr-3 w-6 text-center`}></i>
            {title}
        </h3>
        <div className="space-y-3 text-indigo-100">{children}</div>
    </div>
);

const Tag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="inline-block bg-indigo-500 bg-opacity-20 text-indigo-200 text-sm font-medium px-3 py-1 rounded-full">
        {children}
    </span>
);


export const AudienceProfileDisplay: React.FC<{ result: any }> = ({ result }) => {
    const { demographics, psychographics, comparableTitles, marketingHooks, targetedMarketingCopy } = result;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResultCard title="Demographics" icon="fa-users">
                <p><strong>Age Range:</strong> {demographics.ageRange}</p>
                <p><strong>Gender:</strong> {demographics.gender}</p>
                <p><strong>Education Level:</strong> {demographics.educationLevel}</p>
                <div>
                    <strong>Potential Occupations:</strong>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {demographics.occupations.map((item: string, i: number) => <Tag key={i}>{item}</Tag>)}
                    </div>
                </div>
            </ResultCard>

            <ResultCard title="Psychographics & Interests" icon="fa-heart">
                 <div>
                    <strong>Core Values:</strong>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {psychographics.coreValues.map((item: string, i: number) => <Tag key={i}>{item}</Tag>)}
                    </div>
                </div>
                <div>
                    <strong>Hobbies & Interests:</strong>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {psychographics.hobbiesAndInterests.map((item: string, i: number) => <Tag key={i}>{item}</Tag>)}
                    </div>
                </div>
                 <p><strong>Lifestyle:</strong> {psychographics.lifestyle}</p>
            </ResultCard>

             <div className="lg:col-span-2">
                <ResultCard title="Comparable Titles" icon="fa-book">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {comparableTitles.map((item: any, i: number) => (
                             <div key={i} className="bg-gray-700 p-4 rounded-lg">
                                <h4 className="font-bold text-white">{item.title}</h4>
                                <p className="text-sm text-indigo-300 mb-2">by {item.author}</p>
                                <p className="text-sm text-indigo-200 italic">"{item.reason}"</p>
                            </div>
                        ))}
                    </div>
                </ResultCard>
            </div>
            
            <div className="lg:col-span-2">
                 <ResultCard title="Key Marketing Hooks" icon="fa-bullhorn">
                    <ul className="space-y-3">
                        {marketingHooks.map((item: any, i: number) => (
                             <li key={i} className="bg-gray-700 p-4 rounded-lg">
                                <p className="font-bold text-white mb-1">{item.hook}</p>
                                <p className="text-sm text-indigo-200">{item.explanation}</p>
                            </li>
                        ))}
                    </ul>
                </ResultCard>
            </div>

            {targetedMarketingCopy && (
                <div className="lg:col-span-2">
                    <ResultCard title="Targeted Marketing Copy" icon="fa-bullseye">
                        <div className="space-y-6">
                            <div>
                                <h4 className="font-semibold text-indigo-200 mb-2">Facebook Ad Copy</h4>
                                <div className="bg-gray-700 p-4 rounded-lg text-indigo-100 whitespace-pre-wrap">
                                    {targetedMarketingCopy.facebookAdCopy}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-indigo-200 mb-2">Instagram Post</h4>
                                <div className="bg-gray-700 p-4 rounded-lg text-indigo-100 whitespace-pre-wrap">
                                    {targetedMarketingCopy.instagramPostCopy}
                                </div>
                            </div>
                             <div>
                                <h4 className="font-semibold text-indigo-200 mb-2">Email Subject Lines</h4>
                                <ul className="list-disc list-inside space-y-2">
                                    {targetedMarketingCopy.emailSubjectLines.map((line: string, i: number) => (
                                        <li key={i} className="bg-gray-700 p-2 rounded-md">{line}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </ResultCard>
                </div>
            )}
        </div>
    );
};