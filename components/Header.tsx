import React from 'react';

interface HeaderProps {
  setActiveTool: (tool: null) => void;
}

export const Header: React.FC<HeaderProps> = ({ setActiveTool }) => {
  return (
    <header className="bg-gray-900 bg-opacity-50 backdrop-blur-md sticky top-0 z-50 p-4 flex items-center justify-between border-b border-indigo-500/30">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTool(null)}>
        <i className="fas fa-brain text-3xl text-indigo-400"></i>
        <h1 className="text-2xl font-bold tracking-tighter text-white">
          Bookmarketing<span className="text-indigo-400">.AI</span>
        </h1>
      </div>
       <button onClick={() => setActiveTool(null)} className="text-indigo-300 hover:text-white transition-colors">
        <i className="fas fa-th-large text-xl"></i>
      </button>
    </header>
  );
};