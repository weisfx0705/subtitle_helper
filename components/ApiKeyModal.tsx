import React, { useState } from 'react';
import { validateApiKey } from '../services/geminiService';

interface ApiKeyModalProps {
  onApiKeySubmit: (key: string) => void;
  isOpen: boolean;
  onClose: () => void;
  isDismissible?: boolean;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onApiKeySubmit, isDismissible = true }) => {
  const [currentApiKey, setCurrentApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const keyToValidate = currentApiKey.trim();

    if (!keyToValidate) {
      setError('API 金鑰不能為空。');
      return;
    }
    
    // Perform a basic, client-side format check.
    // The real validation happens on the first actual API call.
    const isValidFormat = validateApiKey(keyToValidate);

    if (isValidFormat) {
      onApiKeySubmit(keyToValidate);
      setCurrentApiKey('');
    } else {
      setError('API 金鑰格式不正確。請確認您已複製完整的金鑰，它通常以 "AIza" 開頭。');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog" onClick={isDismissible ? onClose : undefined}>
      <div className="relative w-full max-w-md bg-slate-800 rounded-2xl shadow-lg p-8 border border-slate-700" onClick={e => e.stopPropagation()}>
        {!isDismissible && (
            <div className="absolute -top-3 -right-3 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse" title="需要設定">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-yellow-900">
                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                </svg>
            </div>
        )}
        {isDismissible && (
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
                aria-label="關閉"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        )}
        <h2 className="text-2xl font-bold text-slate-100 mb-2">設定您的 Gemini API 金鑰</h2>
        <p className="text-slate-400 mb-6">
          此應用程式需要您自己的 Google Gemini API 金鑰才能運作。
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 font-semibold underline ml-1">
            在這裡取得您的金鑰
          </a>.
        </p>
        
        <form onSubmit={handleSubmit}>
            <div className="mb-4">
                <label htmlFor="api-key-input" className="sr-only">Gemini API 金鑰</label>
                <input
                    id="api-key-input"
                    type="password"
                    value={currentApiKey}
                    onChange={(e) => setCurrentApiKey(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                    placeholder="在此貼上您的 API 金鑰"
                    required
                />
            </div>
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <button
                type="submit"
                className="w-full inline-flex justify-center items-center px-6 py-3 bg-cyan-600 text-white font-bold rounded-lg shadow-md hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500 transition-all duration-200"
            >
                儲存金鑰
            </button>
        </form>
      </div>
    </div>
  );
};

export default ApiKeyModal;