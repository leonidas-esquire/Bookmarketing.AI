import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';

function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export const AudioTranscriber: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcription, setTranscription] = useState('');
    const [error, setError] = useState<string | null>(null);

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    
    const stopRecording = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null;
        }

        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close());
            sessionPromiseRef.current = null;
        }
        
        setIsRecording(false);
    }, []);

    const startRecording = async () => {
        setError(null);
        if (isRecording) {
             stopRecording();
             return;
        }
        
        setTranscription('');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        console.log('Connection opened.');
                        setIsRecording(true);
                        
                        mediaStreamSourceRef.current = audioContextRef.current!.createMediaStreamSource(streamRef.current!);
                        scriptProcessorRef.current = audioContextRef.current!.createScriptProcessor(4096, 1, 1);

                        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            
                            if (sessionPromiseRef.current) {
                                sessionPromiseRef.current.then((session) => {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                });
                            }
                        };
                        
                        mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
                        scriptProcessorRef.current.connect(audioContextRef.current!.destination);
                    },
                    onmessage: (message: LiveServerMessage) => {
                         if (message.serverContent?.inputTranscription?.text) {
                            const text = message.serverContent.inputTranscription.text;
                            setTranscription(prev => prev + text);
                        }
                        if (message.serverContent?.turnComplete) {
                            setTranscription(prev => prev.trim() + ' ');
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Connection error', e);
                        setError('A connection error occurred. Please try again.');
                        stopRecording();
                    },
                    onclose: (e: CloseEvent) => {
                        console.log('Connection closed.');
                        // Ensure recording state is false if closed unexpectedly
                        setIsRecording(false);
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                },
            });

        } catch (err) {
            console.error('Error starting transcription:', err);
            setError('Could not access microphone. Please grant permission and try again.');
            setIsRecording(false);
        }
    };
    
    useEffect(() => {
        return () => {
            stopRecording();
        };
    }, [stopRecording]);

    return (
        <div className="max-w-4xl mx-auto p-4 animate-fade-in">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold">Author Dictation</h2>
                <p className="text-indigo-200">Record your ideas and watch them turn into text instantly.</p>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col items-center">
                <button
                    onClick={startRecording}
                    className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300
                    ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                    aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                >
                    <i className={`fas fa-microphone-alt text-4xl text-white ${isRecording ? 'animate-pulse' : ''}`}></i>
                </button>
                <p className="mt-4 text-indigo-200 font-semibold">{isRecording ? 'Recording... Click to Stop' : 'Click to Start Recording'}</p>
            </div>
            
            {error && <p className="text-red-400 mt-4 text-center">{error}</p>}

            <div className="mt-8">
                <h3 className="text-xl font-semibold mb-4">Transcription:</h3>
                <div className="bg-gray-800 p-6 rounded-lg min-h-[200px] text-indigo-100 whitespace-pre-wrap">
                    {transcription || <span className="text-gray-500">Your transcribed text will appear here...</span>}
                </div>
            </div>
        </div>
    );
};