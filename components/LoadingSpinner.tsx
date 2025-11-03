
import React from 'react';

interface LoadingSpinnerProps {
    message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = "Processing..." }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-800 bg-opacity-50 rounded-lg">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400"></div>
      <p className="mt-4 text-indigo-200">{message}</p>
    </div>
  );
};
