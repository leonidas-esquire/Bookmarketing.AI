
import React from 'react';
import { Tool } from '../types';

interface ToolCardProps {
  tool: Tool;
  onSelect: () => void;
}

export const ToolCard: React.FC<ToolCardProps> = ({ tool, onSelect }) => {
  const isDisabled = tool.comingSoon;
  
  return (
    <div
      onClick={!isDisabled ? onSelect : undefined}
      className={`
        bg-gray-800 bg-opacity-50 rounded-lg p-6 flex flex-col items-start
        border border-transparent hover:border-indigo-500 transition-all duration-300
        group transform hover:-translate-y-1
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div className="flex justify-between items-start w-full">
        <div className="bg-indigo-500 bg-opacity-20 text-indigo-300 rounded-lg p-3 mb-4">
          <i className={`fas ${tool.icon} text-2xl`}></i>
        </div>
        {isDisabled && (
          <span className="bg-yellow-500 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">
            SOON
          </span>
        )}
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{tool.title}</h3>
      <p className="text-indigo-200 text-sm flex-grow">{tool.description}</p>
    </div>
  );
};
