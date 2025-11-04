
import React, { useState, useEffect, useMemo } from 'react';
import { User, SalesRecord } from '../types';
import { generateSalesData } from '../services/salesDataService';
import { LoadingSpinner } from './LoadingSpinner';
import { StatCard } from './StatCard';
import { SalesChart } from './SalesChart';

interface SalesAnalyticsProps {
  user: User;
}

const timeframes = [
    { label: 'Last 7 Days', value: 7 },
    { label: 'Last 30 Days', value: 30 },
    { label: 'Last 90 Days', value: 90 },
    { label: 'All Time (1 Year)', value: 365 },
];

export const SalesAnalytics: React.FC<SalesAnalyticsProps> = ({ user }) => {
    const [timeframe, setTimeframe] = useState<number>(30);
    const [salesData, setSalesData] = useState<SalesRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            const data = generateSalesData(user.bookTitle, user.genre, timeframe);
            setSalesData(data);
            setIsLoading(false);
        }, 800);
    }, [timeframe, user.bookTitle, user.genre]);
    
    const kpis = useMemo(() => {
        if (!salesData.length) return { totalRevenue: 0, unitsSold: 0, avgDailySales: 0, topRetailer: 'N/A' };
        
        const totalRevenue = salesData.reduce((sum, record) => sum + record.revenue, 0);
        const unitsSold = salesData.reduce((sum, record) => sum + record.unitsSold, 0);
        
        const retailerSales: { [key: string]: number } = {};
        salesData.forEach(record => {
            retailerSales[record.retailer] = (retailerSales[record.retailer] || 0) + record.unitsSold;
        });
        const topRetailer = Object.keys(retailerSales).length ? Object.entries(retailerSales).reduce((a, b) => a[1] > b[1] ? a : b)[0] : 'N/A';

        const days = new Set(salesData.map(r => r.date)).size;
        const avgDailySales = days > 0 ? unitsSold / days : 0;

        return { totalRevenue, unitsSold, avgDailySales, topRetailer };
    }, [salesData]);
    
    const aggregatedData = useMemo(() => {
        const salesByDate: { [date: string]: number } = {};
        const salesByRetailer: { [retailer: string]: number } = {};
        const salesByCountry: { [country: string]: number } = {};
        
        salesData.forEach(record => {
            salesByDate[record.date] = (salesByDate[record.date] || 0) + record.unitsSold;
            salesByRetailer[record.retailer] = (salesByRetailer[record.retailer] || 0) + record.unitsSold;
            salesByCountry[record.country] = (salesByCountry[record.country] || 0) + record.unitsSold;
        });
        
        const chartData = Object.entries(salesByDate).map(([date, units]) => ({ date, units })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const retailerData = Object.entries(salesByRetailer).sort((a,b) => b[1] - a[1]);
        const countryData = Object.entries(salesByCountry).sort((a,b) => b[1] - a[1]).slice(0, 5);
        
        return { chartData, retailerData, countryData };
    }, [salesData]);

    return (
        <div className="max-w-7xl mx-auto p-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
                <div className="text-center sm:text-left mb-4 sm:mb-0">
                    <h2 className="text-3xl font-bold">Sales Analytics</h2>
                    <p className="text-indigo-200">Your performance overview for <span className="font-bold text-white italic">"{user.bookTitle}"</span>.</p>
                </div>
                <div className="bg-gray-800 p-1 rounded-lg flex space-x-1">
                    {timeframes.map(tf => (
                        <button 
                            key={tf.value}
                            onClick={() => setTimeframe(tf.value)}
                            className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${timeframe === tf.value ? 'bg-indigo-600 text-white' : 'text-indigo-200 hover:bg-gray-700'}`}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? <LoadingSpinner message=" crunching the numbers..." /> : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard title="Total Revenue" value={kpis.totalRevenue} icon="fa-sack-dollar" format="currency" />
                        <StatCard title="Units Sold" value={kpis.unitsSold} icon="fa-book" />
                        <StatCard title="Avg. Daily Sales" value={kpis.avgDailySales} icon="fa-chart-pie" format="decimal" />
                        <StatCard title="Top Retailer" value={kpis.topRetailer} icon="fa-store" />
                    </div>

                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-xl font-bold text-white mb-4">Units Sold Over Time</h3>
                        <div className="h-80">
                            <SalesChart data={aggregatedData.chartData} />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                            <h3 className="text-xl font-bold text-white mb-4">Sales by Retailer</h3>
                            <div className="space-y-3">
                                {aggregatedData.retailerData.map(([name, units]) => (
                                    <div key={name}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-semibold text-indigo-200">{name}</span>
                                            <span className="text-white">{units.toLocaleString()} units</span>
                                        </div>
                                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                                            <div className="bg-indigo-500 h-2.5 rounded-full" style={{ width: `${(units / aggregatedData.retailerData[0][1]) * 100}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                            <h3 className="text-xl font-bold text-white mb-4">Top 5 Countries</h3>
                            <ul className="space-y-3">
                                {aggregatedData.countryData.map(([name, units]) => (
                                    <li key={name} className="flex justify-between items-center bg-gray-700 p-2 rounded-md">
                                        <span className="font-semibold text-indigo-200">{name}</span>
                                        <span className="font-bold text-white">{units.toLocaleString()} units</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
