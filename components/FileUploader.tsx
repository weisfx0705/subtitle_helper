
import React, { useState, useCallback } from 'react';

interface FileUploaderProps {
  onFileUpload: (content: string, name: string) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileUpload }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (file && file.name.endsWith('.srt')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onFileUpload(content, file.name);
      };
      reader.readAsText(file);
    } else {
      alert('請上傳有效的 .srt 檔案。');
    }
  }, [onFileUpload]);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto text-center">
        <div className="bg-slate-800/50 p-8 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-semibold mb-2 text-slate-100">上傳您的字幕檔</h2>
            <p className="text-slate-400 mb-6">拖放 <code className="bg-slate-700 text-cyan-300 px-1 py-0.5 rounded">.srt</code> 檔案到此處，或點擊以選取檔案。</p>
            <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-12 transition-colors duration-300 ${isDragging ? 'border-cyan-400 bg-slate-700/50' : 'border-slate-600 bg-slate-800'}`}
            >
                <input
                    type="file"
                    accept=".srt"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="file-upload"
                />
                <label htmlFor="file-upload" className="flex flex-col items-center justify-center space-y-4 cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-slate-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l-3.75 3.75M12 9.75l3.75 3.75M3 17.25V8.25a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 8.25v9a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 17.25z" />
                    </svg>

                    <p className="text-slate-400">
                        {isDragging ? '在此放下檔案' : '點擊或拖曳以上傳'}
                    </p>
                </label>
            </div>
        </div>
    </div>
  );
};

export default FileUploader;