
import React, { useState } from 'react';

interface AddBookModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddBook: (bookData: { title: string; genre: string }) => void;
}

export const AddBookModal: React.FC<AddBookModalProps> = ({ isOpen, onClose, onAddBook }) => {
    const [title, setTitle] = useState('');
    const [genre, setGenre] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (title.trim() && genre.trim()) {
            onAddBook({ title, genre });
            setTitle('');
            setGenre('');
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 border border-indigo-500/30"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">Add a New Book</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
                        &times;
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="new-book-title" className="block text-sm font-medium text-indigo-200 mb-1">Book Title</label>
                        <input
                            type="text"
                            id="new-book-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., The Midnight Library"
                            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="new-book-genre" className="block text-sm font-medium text-indigo-200 mb-1">Genre</label>
                        <input
                            type="text"
                            id="new-book-genre"
                            value={genre}
                            onChange={(e) => setGenre(e.target.value)}
                            placeholder="e.g., Contemporary Fantasy"
                            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            required
                        />
                    </div>
                    <div className="pt-2">
                        <button
                            type="submit"
                            className="w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-800"
                            disabled={!title.trim() || !genre.trim()}
                        >
                            Add Book to Portfolio
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
