
import React, { useState, useRef, useEffect } from 'react';
import { User, Book } from '../types';

interface HeaderProps {
  user: User;
  activeBook: Book;
  onLogout: () => void;
  setActiveTool: (tool: null) => void;
  onSetActiveBook: (bookId: string) => void;
  onAddNewBook: () => void;
  onRequestDeleteBook: (bookId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ user, activeBook, onLogout, setActiveTool, onSetActiveBook, onAddNewBook, onRequestDeleteBook }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectBook = (bookId: string) => {
    onSetActiveBook(bookId);
    setIsDropdownOpen(false);
  }

  const handleAddBookClick = () => {
    onAddNewBook();
    setIsDropdownOpen(false);
  }

  return (
    <header className="bg-gray-900 bg-opacity-50 backdrop-blur-md sticky top-0 z-50 p-4 flex items-center justify-between border-b border-indigo-500/30">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTool(null)}>
        <i className="fas fa-brain text-3xl text-indigo-400"></i>
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-bold tracking-tighter text-white">
            Bookmarketing<span className="text-indigo-400">.AI</span>
          </h1>
          <span className="text-lg font-medium text-indigo-200 hidden md:block truncate" title={activeBook.title}>
            / {activeBook.title}
          </span>
        </div>
      </div>
       <div className="flex items-center gap-4">
         <button 
            onClick={() => setActiveTool(null)} 
            className="flex items-center gap-2 bg-gray-800/50 hover:bg-gray-700/50 px-3 py-1.5 rounded-lg border border-transparent hover:border-indigo-500 transition-colors"
            title="Dashboard"
          >
            <i className="fas fa-grip text-xl text-indigo-300"></i>
            <span className="hidden sm:inline font-medium text-white">Dashboard</span>
         </button>
         <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-3 bg-gray-800/50 hover:bg-gray-700/50 px-3 py-1.5 rounded-lg border border-transparent hover:border-indigo-500 transition-colors">
              <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full border-2 border-indigo-400" />
              <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium text-white leading-tight">{user.name}</p>
              </div>
              <i className={`fas fa-chevron-down text-xs text-indigo-300 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}></i>
            </button>
            {isDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 animate-fade-in-down overflow-hidden">
                <div className="p-2 border-b border-gray-700">
                  <p className="text-sm font-semibold text-white px-2">My Books</p>
                </div>
                <ul className="py-1 max-h-48 overflow-y-auto">
                  {user.books.map(book => (
                    <li key={book.id} className="flex items-center justify-between group">
                      <button onClick={() => handleSelectBook(book.id)} className={`flex-grow text-left px-4 py-2 text-sm transition-colors ${book.id === activeBook.id ? 'bg-indigo-600 text-white' : 'text-indigo-100 hover:bg-gray-700'}`}>
                        {book.title}
                      </button>
                      {book.id !== activeBook.id && user.books.length > 1 && (
                         <button 
                            onClick={(e) => { e.stopPropagation(); onRequestDeleteBook(book.id); }} 
                            className="px-3 py-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            title={`Delete "${book.title}"`}
                         >
                            <i className="fas fa-trash-alt"></i>
                         </button>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="border-t border-gray-700 p-1">
                  <button onClick={handleAddBookClick} className="w-full text-left px-4 py-2 text-sm text-indigo-300 hover:bg-gray-700 hover:text-white transition-colors rounded-md">
                    <i className="fas fa-plus-circle mr-2"></i> Add New Book
                  </button>
                </div>
                 <div className="border-t border-gray-700 p-1">
                  <button onClick={onLogout} className="w-full text-left px-4 py-2 text-sm text-indigo-300 hover:bg-gray-700 hover:text-white transition-colors rounded-md">
                      <i className="fas fa-sign-out-alt mr-2"></i>Logout
                  </button>
                </div>
              </div>
            )}
         </div>
      </div>
    </header>
  );
};
