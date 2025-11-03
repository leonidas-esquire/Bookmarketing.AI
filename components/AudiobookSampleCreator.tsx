import React, { useState, useEffect } from 'react';
import { generateSpeech } from '../services/geminiService';
import { LoadingSpinner } from './LoadingSpinner';

const voices = [
    { id: 'Zephyr', name: 'Zephyr (Female)' },
    { id: 'Luna', name: 'Luna (Female)' },
    { id: 'Nova', name: 'Nova (Female)' },
    { id: 'Stella', name: 'Stella (Female)' },
    { id: 'Aurora', name: 'Aurora (Female)' },
    { id: 'Puck', name: 'Puck (Male)' },
    { id: 'Charon', name: 'Charon (Male)' },
    { id: 'Kore', name: 'Kore (Male)' },
    { id: 'Fenrir', name: 'Fenrir (Male)' },
    { id: 'Sol', name: 'Sol (Female)' },
];

export const AudiobookSampleCreator: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<string>(voices[0].id);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  useEffect(() => {
    // Initialize AudioContext on user interaction
    const initAudioContext = () => {
      if (!audioContext) {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        setAudioContext(context);
      }
      document.body.removeEventListener('click', initAudioContext);
    };
    document.body.addEventListener('click', initAudioContext);
    
    return () => {
      audioSource?.stop();
      audioContext?.close();
    };
  }, []);

  const handleGenerate = async () => {
    if (!inputText) {
      setError('Please enter some text to generate audio.');
      return;
    }
    if (!audioContext) {
        setError('AudioContext not available. Please interact with the page first.');
        return;
    }
    if(audioContext.state === 'suspended') {
        audioContext.resume();
    }

    setIsLoading(true);
    setError(null);
    setAudioBuffer(null);
    if(audioSource) audioSource.stop();
    setIsPlaying(false);

    try {
      const buffer = await generateSpeech(inputText, selectedVoice);
      setAudioBuffer(buffer);
    } catch (e) {
      setError('Failed to generate audio. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePlayPause = () => {
    if (!audioBuffer || !audioContext) return;

    if (isPlaying && audioSource) {
      audioSource.stop();
      setIsPlaying(false);
    } else {
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.onended = () => setIsPlaying(false);
      source.start();
      setAudioSource(source);
      setIsPlaying(true);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold">Audiobook Sampler</h2>
        <p className="text-indigo-200">Convert book excerpts into shareable audio samples.</p>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste a paragraph from your book here..."
          className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md mb-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none h-48"
        />
        <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-grow">
                <label htmlFor="voice-select" className="block text-sm font-medium text-indigo-200 mb-1">Voice</label>
                 <select
                    id="voice-select"
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                 >
                    {voices.map(voice => <option key={voice.id} value={voice.id}>{voice.name}</option>)}
                </select>
            </div>
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="w-full sm:w-auto self-end px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Generating Audio...' : 'Generate Audio'}
            </button>
        </div>
      </div>
      
      {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
      
      <div className="mt-8">
        {isLoading && <LoadingSpinner message="Warming up the vocal cords..." />}
        {audioBuffer && (
          <div className="bg-gray-800 p-6 rounded-lg flex items-center justify-center">
            <button onClick={handlePlayPause} className="text-4xl text-indigo-400 hover:text-white transition-colors">
              <i className={`fas ${isPlaying ? 'fa-pause-circle' : 'fa-play-circle'}`}></i>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};