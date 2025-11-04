
import React, { useState } from 'react';
import { AudienceAnalyzer } from './AudienceAnalyzer';
import { BookDistributor } from './BookDistributor';
import { SalesAnalytics } from './SalesAnalytics';
import { MarketingVideoCreator } from './MarketingVideoCreator';
import { SalesRecord, User } from '../types';

interface LeftSidebarProps {
    user: User;
    salesData: SalesRecord[];
}

const tabs = [
    { id: 'audience-analyzer', title: 'Audience Analyzer', icon: 'fa-users' },
    { id: 'book-distributor', title: 'Book Distributor', icon: 'fa-rocket' },
    { id: 'sales-analytics', title: 'Sales Analytics', icon: 'fa-dollar-sign' },
    { id: 'marketing-video-creator', title: 'Marketing Video Creator', icon: 'fa-bullhorn' },
];

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ user, salesData }) => {
    const [activeTab, setActiveTab] = useState(tabs[0].id);

    const renderActiveTabContent = () => {
        switch (activeTab) {
            case 'audience-analyzer':
                return <AudienceAnalyzer />;
            case 'book-distributor':
                return <BookDistributor />;
            case 'sales-analytics':
                return <SalesAnalytics user={user} salesData={salesData} />;
            case 'marketing-video-creator':
                return <MarketingVideoCreator />;
            default:
                return null;
        }
    };

    return (
        <aside className="w-full lg:w-[450px] xl:w-[550px] bg-gray-800/50 border-r border-indigo-500/20 flex flex-col h-full flex-shrink-0">
            <nav className="flex-shrink-0 border-b border-indigo-500/20">
                <ul className="flex items-center justify-around p-2">
                    {tabs.map(tab => (
                        <li key={tab.id}>
                            <button
                                onClick={() => setActiveTab(tab.id)}
                                title={tab.title}
                                className={`
                                    p-3 rounded-lg transition-colors
                                    ${activeTab === tab.id ? 'bg-indigo-600 text-white' : 'text-indigo-300 hover:bg-gray-700'}
                                `}
                            >
                                <i className={`fas ${tab.icon} text-xl w-6 text-center`}></i>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                {renderActiveTabContent()}
              </div>
            </div>
        </aside>
    );
};
