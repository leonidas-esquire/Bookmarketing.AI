import React, { useState } from 'react';
import { User } from '../types';

interface LoginScreenProps {
  onLogin: (userData?: { name: string; email: string; bookTitle: string; genre: string; }) => void;
  existingUser: User | null;
}

const ProgressBar = ({ step }: { step: number }) => (
    <div className="w-full bg-gray-700 rounded-full h-2.5 mb-8">
        <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${(step / 4) * 100}%`, transition: 'width 0.5s ease-in-out' }}></div>
    </div>
);

const Step1Welcome: React.FC<{ onNext: () => void }> = ({ onNext }) => (
    <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white">Your journey to <span className="text-indigo-400">one million readers</span> starts now.</h2>
        <p className="mt-4 text-lg text-indigo-200 max-w-lg mx-auto">
            We've built a suite of AI-powered tools to handle your marketing, so you can focus on what you do best: writing.
        </p>
        <div className="mt-8">
            <button
            onClick={onNext}
            className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg text-lg hover:bg-indigo-700 transition-colors transform hover:scale-105 shadow-lg"
            >
            Let's Get Started <i className="fas fa-arrow-right ml-2"></i>
            </button>
        </div>
    </div>
);

const Step2Auth: React.FC<{ onNext: () => void; onBack: () => void; data: any; onChange: any; isValid: boolean }> = ({ onNext, onBack, data, onChange, isValid }) => (
    <div>
        <h2 className="text-2xl font-bold text-white text-center mb-6">Create your free account.</h2>
        <div className="space-y-4">
             <div>
                <label htmlFor="email" className="block text-sm font-medium text-indigo-200 mb-1">Email Address</label>
                <input type="email" id="email" name="email" value={data.email} onChange={onChange} placeholder="you@example.com" className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>
             <div>
                <label htmlFor="password" className="block text-sm font-medium text-indigo-200 mb-1">Password</label>
                <input type="password" id="password" name="password" value={data.password} onChange={onChange} placeholder="Choose a secure password" className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>
        </div>
         <div className="mt-8 flex justify-between items-center">
             <button onClick={onBack} className="text-indigo-300 hover:text-white transition-colors">
                <i className="fas fa-arrow-left mr-2"></i> Back
            </button>
            <button onClick={onNext} disabled={!isValid} className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed disabled:transform-none transform hover:scale-105 shadow-lg">
                Next <i className="fas fa-arrow-right ml-2"></i>
            </button>
        </div>
    </div>
);

const Step3BookInfo: React.FC<{ onNext: () => void; onBack: () => void; data: any; onChange: any; isValid: boolean }> = ({ onNext, onBack, data, onChange, isValid }) => (
    <div>
        <h2 className="text-2xl font-bold text-white text-center mb-6">First, tell us about your first book.</h2>
        <div className="space-y-4">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-indigo-200 mb-1">Author Name</label>
                <input type="text" id="name" name="name" value={data.name} onChange={onChange} placeholder="e.g., Jane Author" className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>
             <div>
                <label htmlFor="bookTitle" className="block text-sm font-medium text-indigo-200 mb-1">Book Title</label>
                <input type="text" id="bookTitle" name="bookTitle" value={data.bookTitle} onChange={onChange} placeholder="e.g., The Crimson Cipher" className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>
             <div>
                <label htmlFor="genre" className="block text-sm font-medium text-indigo-200 mb-1">Genre</label>
                <input type="text" id="genre" name="genre" value={data.genre} onChange={onChange} placeholder="e.g., Sci-Fi Thriller" className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>
        </div>
        <div className="mt-8 flex justify-between items-center">
             <button onClick={onBack} className="text-indigo-300 hover:text-white transition-colors">
                <i className="fas fa-arrow-left mr-2"></i> Back
            </button>
            <button onClick={onNext} disabled={!isValid} className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed disabled:transform-none transform hover:scale-105 shadow-lg">
                Next <i className="fas fa-arrow-right ml-2"></i>
            </button>
        </div>
    </div>
);

const FeatureCard: React.FC<{ icon: string; title: string; text: string }> = ({ icon, title, text }) => (
    <div className="bg-gray-700 p-4 rounded-lg text-center border border-transparent hover:border-indigo-500 transition-colors">
        <i className={`fas ${icon} text-3xl text-indigo-400 mb-3`}></i>
        <h3 className="font-bold text-white">{title}</h3>
        <p className="text-sm text-indigo-200 mt-1">{text}</p>
    </div>
);

const Step4Confirm: React.FC<{ onBack: () => void; onFinish: () => void }> = ({ onBack, onFinish }) => (
    <div className="text-center">
         <h2 className="text-2xl font-bold text-white mb-6">Your AI Marketing Co-Pilot is Ready.</h2>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
             <FeatureCard icon="fa-paint-brush" title="AI Illustrator" text="Generate stunning cover art and promo images from text." />
             <FeatureCard icon="fa-pencil-alt" title="Marketing Copywriter" text="Instantly create compelling book blurbs and ad copy." />
             <FeatureCard icon="fa-sitemap" title="Funnel Builder AI" text="Design a high-converting sales funnel for your book." />
         </div>
          <div className="mt-8 flex justify-between items-center">
             <button onClick={onBack} className="text-indigo-300 hover:text-white transition-colors">
                <i className="fas fa-arrow-left mr-2"></i> Back
            </button>
            <button onClick={onFinish} className="bg-green-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-700 transition-colors transform hover:scale-105 shadow-lg">
                Enter Dashboard <i className="fas fa-rocket ml-2"></i>
            </button>
        </div>
    </div>
);

const ExistingUserLogin: React.FC<{ user: User; onLogin: () => void }> = ({ user, onLogin }) => (
    <div className="text-center animate-fade-in">
        <img src={user.avatarUrl} alt={user.name} className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-indigo-500" />
        <h2 className="text-3xl font-bold tracking-tight text-white">Welcome back, <span className="text-indigo-400">{user.name.split(' ')[0]}!</span></h2>
        <p className="mt-2 text-lg text-indigo-200">
            Ready to continue your journey?
        </p>
        <div className="mt-8">
            <button
                onClick={onLogin}
                className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg text-lg hover:bg-indigo-700 transition-colors transform hover:scale-105 shadow-lg"
            >
                Continue to Dashboard <i className="fas fa-arrow-right ml-2"></i>
            </button>
        </div>
    </div>
);

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, existingUser }) => {
    const [step, setStep] = useState(1);
    const [userData, setUserData] = useState({
        name: '',
        bookTitle: '',
        genre: '',
        email: '',
        password: '', // Dummy field for UI, not stored
    });

    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setUserData(prev => ({ ...prev, [name]: value }));
    };

    const isStep2Valid = userData.email.includes('@') && userData.password.length > 0;
    const isStep3Valid = userData.name.trim() !== '' && userData.bookTitle.trim() !== '' && userData.genre.trim() !== '';

    const renderNewUserFlow = () => {
        switch(step) {
            case 1: return <Step1Welcome onNext={handleNext} />;
            case 2: return <Step2Auth onNext={handleNext} onBack={handleBack} data={userData} onChange={handleChange} isValid={isStep2Valid} />;
            case 3: return <Step3BookInfo onNext={handleNext} onBack={handleBack} data={userData} onChange={handleChange} isValid={isStep3Valid} />;
            case 4: return <Step4Confirm onBack={handleBack} onFinish={() => onLogin(userData)} />;
            default: return null;
        }
    }
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-indigo-900 font-sans flex flex-col justify-center items-center p-4">
             <div className="w-full max-w-2xl">
                 <div className="flex flex-col items-center justify-center gap-2 mb-8 text-center">
                    <div className="flex items-center gap-4">
                        <i className="fas fa-brain text-5xl text-indigo-400"></i>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-white">
                        Bookmarketing<span className="text-indigo-400">.AI</span>
                        </h1>
                    </div>
                    <p className="text-lg text-indigo-200 font-medium">Your Book, Our Software, One Million Readers.</p>
                </div>
                <div className="bg-gray-800 bg-opacity-50 backdrop-blur-sm p-8 rounded-lg shadow-xl border border-indigo-500/20">
                    {existingUser ? (
                        <ExistingUserLogin user={existingUser} onLogin={() => onLogin()} />
                    ) : (
                        <>
                            <ProgressBar step={step} />
                            <div className="animate-fade-in">
                                {renderNewUserFlow()}
                            </div>
                        </>
                    )}
                </div>
            </div>
            <div className="absolute bottom-4 right-4 text-xs text-indigo-500 font-mono">
                v1.1
            </div>
        </div>
    );
};