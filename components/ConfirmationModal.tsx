
import React from 'react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 border border-red-500/30"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start mb-4">
                    <div className="mr-4 flex-shrink-0">
                        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-900 sm:mx-0 sm:h-10 sm:w-10">
                             <i className="fas fa-exclamation-triangle text-red-400"></i>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">{title}</h2>
                        <p className="mt-2 text-red-100">{message}</p>
                    </div>
                </div>
                
                <div className="mt-6 flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors"
                    >
                        Delete Book
                    </button>
                </div>
            </div>
        </div>
    );
};
