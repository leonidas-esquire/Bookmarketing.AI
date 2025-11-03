import React, { useState, useRef, useEffect } from 'react';
import { getChatInstance } from '../services/geminiService';
import { GenerateContentResponse } from '@google/genai';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'model';
  text: string;
}

export const MarketingChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hello! I am your AI Marketing Mentor. How can I help you promote your book today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const chat = getChatInstance();

  useEffect(() => {
    if (isOpen && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
        const result: GenerateContentResponse = await chat.sendMessage({ message: input });
        const modelMessage: Message = { role: 'model', text: result.text };
        setMessages(prev => [...prev, modelMessage]);
    } catch (e) {
      console.error(e);
      const errorMessage: Message = { role: 'model', text: 'Sorry, I encountered an error. Please try again.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-indigo-600 text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-indigo-700 transition-transform transform hover:scale-110 z-50"
      >
        <i className={`fas ${isOpen ? 'fa-times' : 'fa-comment-dots'}`}></i>
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-full max-w-sm h-[60vh] bg-gray-800 rounded-lg shadow-2xl flex flex-col z-50 animate-fade-in-up">
          <div className="p-4 bg-gray-900 rounded-t-lg">
            <h3 className="font-bold text-white text-lg">Bookmarketing.AI Mentor</h3>
          </div>
          <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-3 rounded-lg max-w-xs ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-indigo-100'}`}>
                   <ReactMarkdown className="prose prose-sm prose-invert prose-p:my-0">{msg.text}</ReactMarkdown>
                </div>
              </div>
            ))}
            {isLoading && (
                 <div className="flex justify-start">
                    <div className="p-3 rounded-lg bg-gray-700 text-indigo-100">
                        <i className="fas fa-spinner fa-pulse"></i>
                    </div>
                </div>
            )}
          </div>
          <div className="p-4 border-t border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                placeholder="Ask a marketing question..."
                className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                disabled={isLoading}
              />
              <button onClick={handleSend} disabled={isLoading} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:bg-indigo-800">
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};