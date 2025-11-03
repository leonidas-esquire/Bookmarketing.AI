
import React, { useRef, useState } from 'react';

interface FileUploaderProps {
  onFileSelect: (file: File, fileUrl: string) => void;
  accept: string;
  label: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, accept, label }) => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      setFileName(file.name);
      onFileSelect(file, url);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onClick={handleClick}
      className="w-full p-6 border-2 border-dashed border-gray-600 rounded-lg text-center cursor-pointer hover:border-indigo-500 transition-colors"
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        className="hidden"
      />
      {fileUrl && accept.startsWith('image/') ? (
        <img src={fileUrl} alt="Preview" className="max-h-48 mx-auto rounded-md mb-4" />
      ) : (
        <div className="text-gray-400 mb-2">
            <i className="fas fa-cloud-upload-alt text-4xl"></i>
        </div>
      )}
      <p className="text-indigo-300 font-semibold">{label}</p>
      {fileName && <p className="text-xs text-gray-500 mt-1">{fileName}</p>}
    </div>
  );
};
