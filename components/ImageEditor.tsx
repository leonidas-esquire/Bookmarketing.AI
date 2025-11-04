import React, { useState, useCallback } from 'react';
import { editImage, removeImageBackground } from '../services/geminiService';
import { FileUploader } from './FileUploader';
import { LoadingSpinner } from './LoadingSpinner';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
        if (typeof reader.result === 'string') {
            resolve(reader.result.split(',')[1]);
        } else {
            reject(new Error("Failed to read file as base64 string."));
        }
    };
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
};

export const ImageEditor: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<{file: File, url: string} | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [activeOperation, setActiveOperation] = useState<'edit' | 'removeBg' | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleFileSelect = useCallback((file: File, url: string) => {
    setOriginalImage({file, url});
    setEditedImage(null);
    setPrompt('');
  }, []);

  const handleEdit = async () => {
    if (!originalImage || !prompt) {
      setError('Please upload an image and provide an editing prompt.');
      return;
    }
    setActiveOperation('edit');
    setError(null);
    setEditedImage(null);
    try {
      const base64Image = await fileToBase64(originalImage.file);
      const resultUrl = await editImage(prompt, base64Image, originalImage.file.type);
      setEditedImage(resultUrl);
    } catch (e) {
      setError('Failed to edit image. Please try again.');
      console.error(e);
    } finally {
      setActiveOperation(null);
    }
  };
  
  const handleRemoveBackground = async () => {
    if (!originalImage) {
        setError('Please upload an image first.');
        return;
    }
    setActiveOperation('removeBg');
    setError(null);
    setEditedImage(null);
    try {
        const base64Image = await fileToBase64(originalImage.file);
        const resultUrl = await removeImageBackground(base64Image, originalImage.file.type);
        setEditedImage(resultUrl);
    } catch (e) {
        setError('Failed to remove background. Please try again.');
        console.error(e);
    } finally {
        setActiveOperation(null);
    }
  };

  const isLoading = activeOperation !== null;

  return (
    <div className="max-w-6xl mx-auto p-4 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold">Cover Art Studio</h2>
        <p className="text-indigo-200">Refine your cover art with simple text commands.</p>
      </div>
      
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <FileUploader onFileSelect={handleFileSelect} accept="image/*" label="Upload Your Image" />
            <div className="flex flex-col gap-4">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe your edit... e.g., 'Apply a warm, cinematic color grade', 'make the title pop with a golden glow', 'add a subtle lens flare'."
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none h-28"
                    disabled={!originalImage || isLoading}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                        onClick={handleEdit}
                        disabled={isLoading || !originalImage || !prompt}
                        className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        <i className="fas fa-wand-magic-sparkles mr-2"></i>
                        {activeOperation === 'edit' ? 'Applying Edit...' : 'Apply Text Edit'}
                    </button>
                    <button
                        onClick={handleRemoveBackground}
                        disabled={isLoading || !originalImage}
                        className="w-full px-6 py-3 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-700 transition-colors disabled:bg-purple-800 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        <i className="fas fa-eraser mr-2"></i>
                        {activeOperation === 'removeBg' ? 'Removing BG...' : 'Remove Background'}
                    </button>
                </div>
            </div>
        </div>
      </div>
      
      {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
      
      {isLoading && <LoadingSpinner message={activeOperation === 'edit' ? 'AI is working on your edit...' : 'Removing background...'} />}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        <div>
          <h3 className="text-xl font-semibold mb-4 text-center">Original</h3>
          {originalImage ? (
            <img src={originalImage.url} alt="Original" className="w-full rounded-lg shadow-xl" />
          ) : (
            <div className="w-full aspect-square bg-gray-700 rounded-lg flex items-center justify-center text-gray-500">
                Your original image will appear here.
            </div>
          )}
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-4 text-center">Edited</h3>
          {editedImage ? (
            <img src={editedImage} alt="Edited" className="w-full rounded-lg shadow-xl" />
          ) : (
            <div className="w-full aspect-square bg-gray-700 rounded-lg flex items-center justify-center text-gray-500">
                Your edited image will appear here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};