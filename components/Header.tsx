
import React from 'react';
import { User } from '../types';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  setActiveTool: (tool: null) => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout, setActiveTool }) => {
  return (
    <header className="bg-gray-900 bg-opacity-50 backdrop-blur-md sticky top-0 z-50 p-4 flex items-center justify-between border-b border-indigo-500/30">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTool(null)}>
        <i className="fas fa-brain text-3xl text-indigo-400"></i>
        <h1 className="text-2xl font-bold tracking-tighter text-white">
          Bookmarketing<span className="text-indigo-400">.AI</span>
        </h1>
      </div>
       <div className="flex items-center gap-4">
         <button onClick={() => setActiveTool(null)} className="text-indigo-300 hover:text-white transition-colors" title="Dashboard">
            <i className="fas fa-th-large text-xl"></i>
         </button>
         <div className="flex items-center gap-3">
            <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full border-2 border-indigo-400" />
            <span className="text-white font-medium hidden sm:inline">{user.name}</span>
            <button onClick={onLogout} className="text-indigo-300 hover:text-white transition-colors" title="Logout">
                <i className="fas fa-sign-out-alt text-xl"></i>
            </button>
         </div>
      </div>
    </header>
  );
};
