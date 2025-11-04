
import React, { useState } from 'react';
import { User, SalesPageConfig, SalesRecord } from '../types';
import { StripeCheckoutModal } from './StripeCheckoutModal';

interface PublicSalesPageProps {
    user: User;
    config: SalesPageConfig;
    onBackToApp: () => void;
    onNewSale: (sale: SalesRecord) => void;
}

export const PublicSalesPage: React.FC<PublicSalesPageProps> = ({ user, config, onBackToApp, onNewSale }) => {
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [purchaseComplete, setPurchaseComplete] = useState(false);

    const handleSuccessfulPurchase = () => {
        const newSale: SalesRecord = {
            date: new Date().toISOString().split('T')[0],
            unitsSold: 1,
            revenue: config.price,
            retailer: 'Direct Sale',
            country: 'USA', // Simulate for simplicity
        };
        onNewSale(newSale);
        setIsCheckoutOpen(false);
        setPurchaseComplete(true);
    };

    return (
        <div className="min-h-screen bg-gray-100 font-sans flex flex-col items-center justify-center p-4 relative">
             <div className="absolute top-4 left-4">
                <button onClick={onBackToApp} className="px-4 py-2 bg-gray-700 text-white text-sm font-semibold rounded-md hover:bg-gray-800 transition-colors">
                    <i className="fas fa-arrow-left mr-2"></i> Back to App Dashboard
                </button>
            </div>
            
            {isCheckoutOpen && (
                <StripeCheckoutModal 
                    onClose={() => setIsCheckoutOpen(false)}
                    onSuccess={handleSuccessfulPurchase}
                    bookTitle={user.bookTitle}
                    price={config.price}
                />
            )}
            
            <div className="w-full max-w-4xl mx-auto animate-fade-in">
                <div className="bg-white rounded-lg shadow-2xl overflow-hidden md:flex">
                    <div className="md:w-1/3">
                        {/* Placeholder for cover image - can be replaced with a real one if available */}
                        <div className="bg-gray-800 h-64 md:h-full flex items-center justify-center">
                             <img src={`https://api.dicebear.com/8.x/icons/svg?seed=${encodeURIComponent(user.bookTitle)}&backgroundColor=4f46e5,818cf8,c7d2fe`} alt="Book Cover" className="w-40 h-56 object-cover rounded shadow-lg" />
                        </div>
                    </div>
                    <div className="md:w-2/3 p-8 flex flex-col justify-center">
                        {purchaseComplete ? (
                            <div className="text-center">
                                <i className="fas fa-check-circle text-6xl text-green-500 mb-4"></i>
                                <h2 className="text-3xl font-bold text-gray-800">Purchase Successful!</h2>
                                <p className="text-gray-600 mt-2">Thank you for your order. Your book will be delivered to your inbox shortly.</p>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{user.bookTitle}</h1>
                                <p className="text-lg text-gray-500 mt-1">by {user.name}</p>
                                <p className="text-gray-700 mt-6 leading-relaxed">
                                    {config.pitch}
                                </p>
                                <div className="mt-8">
                                    <button 
                                        onClick={() => setIsCheckoutOpen(true)}
                                        className="w-full bg-indigo-600 text-white font-bold py-4 px-8 rounded-lg text-xl hover:bg-indigo-700 transition-transform transform hover:scale-105 shadow-lg"
                                    >
                                        Buy Now - ${config.price.toFixed(2)}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                 <p className="text-center text-gray-400 text-xs mt-4">Powered by Bookmarketing.AI</p>
            </div>
        </div>
    );
};
