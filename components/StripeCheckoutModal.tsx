
import React, { useState } from 'react';

interface StripeCheckoutModalProps {
    onClose: () => void;
    onSuccess: () => void;
    bookTitle: string;
    price: number;
}

export const StripeCheckoutModal: React.FC<StripeCheckoutModalProps> = ({ onClose, onSuccess, bookTitle, price }) => {
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        // Simulate network request
        setTimeout(() => {
            onSuccess();
        }, 2000);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 relative">
                     <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl" disabled={isProcessing}>
                        &times;
                    </button>
                    
                    <div className="text-center">
                         <i className="fab fa-stripe text-5xl text-indigo-500 mb-2"></i>
                         <h2 className="text-2xl font-bold text-gray-800">Checkout</h2>
                         <p className="text-gray-500">You are purchasing "{bookTitle}"</p>
                    </div>

                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                            <input type="email" id="email" defaultValue="reader@example.com" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                        </div>
                        <div>
                            <label htmlFor="card" className="block text-sm font-medium text-gray-700">Card Information (dummy data)</label>
                            <div className="mt-1 p-2 border border-gray-300 rounded-md flex items-center bg-gray-50">
                                <i className="fab fa-cc-visa text-2xl text-blue-700 mr-3"></i>
                                <input type="text" id="card" defaultValue="4242 4242 4242 4242" className="flex-grow bg-transparent focus:outline-none" />
                                <input type="text" defaultValue="12/25" className="w-12 bg-transparent focus:outline-none text-center" />
                                <input type="text" defaultValue="123" className="w-10 bg-transparent focus:outline-none text-center" />
                            </div>
                        </div>
                        
                        <div className="pt-2">
                             <button type="submit" disabled={isProcessing} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-wait">
                                {isProcessing ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin mr-2"></i>
                                        Processing...
                                    </>
                                ) : (
                                    `Pay $${price.toFixed(2)}`
                                )}
                            </button>
                        </div>
                    </form>
                    <p className="text-xs text-gray-400 text-center mt-4">
                        <i className="fas fa-lock mr-1"></i> This is a simulated secure payment. No real transaction will occur.
                    </p>
                </div>
            </div>
        </div>
    );
};
