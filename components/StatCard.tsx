
import React from 'react';

interface StatCardProps {
    title: string;
    value: number | string;
    icon: string;
    format?: 'currency' | 'decimal';
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, format }) => {

    const formatValue = () => {
        if (typeof value === 'string') {
            return value;
        }
        if (format === 'currency') {
            return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
        }
        if (format === 'decimal') {
            return value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        }
        return value.toLocaleString();
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex items-center space-x-4 border border-gray-700">
            <div className="bg-indigo-500 bg-opacity-20 text-indigo-300 rounded-full p-3 h-12 w-12 flex items-center justify-center">
                <i className={`fas ${icon} text-xl`}></i>
            </div>
            <div>
                <p className="text-sm text-indigo-200">{title}</p>
                <p className="text-2xl font-bold text-white">{formatValue()}</p>
            </div>
        </div>
    );
};
