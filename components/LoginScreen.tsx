
import React from 'react';

interface LoginScreenProps {
  onLogin: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-indigo-900 font-sans flex flex-col justify-center items-center p-4 text-center">
      <div className="flex items-center gap-4 mb-4">
        <i className="fas fa-brain text-5xl text-indigo-400"></i>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-white">
          Bookmarketing<span className="text-indigo-400">.AI</span>
        </h1>
      </div>
      <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mt-4">
        Your Book, Our Software, <span className="text-indigo-400">One Million Readers</span>
      </h2>
      <p className="mt-4 text-lg text-indigo-200 max-w-2xl mx-auto">
        Log in to access your AI-powered marketing co-pilot and start connecting with your audience.
      </p>
      <div className="mt-10">
        <button
          onClick={onLogin}
          className="bg-indigo-600 text-white font-bold py-4 px-10 rounded-lg text-xl hover:bg-indigo-700 transition-colors transform hover:scale-105 shadow-lg"
        >
          <i className="fas fa-sign-in-alt mr-3"></i>
          Author Login
        </button>
      </div>
       <p className="mt-8 text-sm text-gray-500">
        For demonstration purposes, clicking login will grant you immediate access.
      </p>
    </div>
  );
};
