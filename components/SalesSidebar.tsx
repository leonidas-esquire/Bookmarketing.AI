
import React from 'react';
import { SalesAnalytics } from './SalesAnalytics';
import { SalesRecord, User, Book } from '../types';

interface SalesSidebarProps {
    user: User;
    salesData: SalesRecord[];
    activeBook: Book;
}

export const SalesSidebar: React.FC<SalesSidebarProps> = ({ user, salesData, activeBook }) => {
    return (
        <aside className="hidden lg:block lg:w-[450px] xl:w-[550px] bg-gray-800/50 border-r border-indigo-500/20 flex-col h-full flex-shrink-0">
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <SalesAnalytics user={user} salesData={salesData} book={activeBook} />
              </div>
            </div>
        </aside>
    );
};
