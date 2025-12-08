
import React, { useState } from 'react';
import { SOURCE_LANGUAGES, TARGET_LANGUAGES, AI_MODELS } from '../constants';

interface ContextProviderProps {
  onContextSubmit: (synopsis: string, characters: string, sourceLanguage: string, targetLanguage: string, model: string) => void;
  fileName: string;
}

const ContextProvider: React.FC<ContextProviderProps> = ({ onContextSubmit, fileName }) => {
  const [synopsis, setSynopsis] = useState('');
  const [characters, setCharacters] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('Chinese (Traditional)');
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [model, setModel] = useState(AI_MODELS[0].id);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (synopsis.trim() && characters.trim() && sourceLanguage && targetLanguage && model) {
      setIsLoading(true);
      onContextSubmit(synopsis, characters, sourceLanguage, targetLanguage, model);
    }
  };
  
  const isFormValid = synopsis.trim() && characters.trim() && sourceLanguage && targetLanguage && model;

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-800/50 p-8 rounded-2xl shadow-lg">
      <div className="mb-6 pb-4 border-b border-slate-700">
        <h2 className="text-2xl font-semibold text-slate-100">提供翻譯所需的背景資訊</h2>
        <p className="text-slate-400 mt-1">此資訊對於準確且細膩的翻譯至關重要。</p>
        <p className="text-sm mt-2 text-cyan-300 bg-cyan-900/30 px-3 py-2 rounded-md">檔案: <span className="font-mono">{fileName}</span></p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="synopsis" className="block text-sm font-medium text-slate-300 mb-2">
            故事大綱
          </label>
          <textarea
            id="synopsis"
            rows={5}
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
            placeholder="簡要描述故事的情節。"
            required
          />
        </div>

        <div>
          <label htmlFor="characters" className="block text-sm font-medium text-slate-300 mb-2">
            角色列表
          </label>
          <textarea
            id="characters"
            rows={5}
            value={characters}
            onChange={(e) => setCharacters(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
            placeholder="列出主要角色及其關鍵特徵或角色。例如：&#10;約翰 - 一位疲憊的偵探，說話帶有諷刺意味。&#10;瑪麗亞 - 一位充滿希望的科學家，說話正式。"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="source-language" className="block text-sm font-medium text-slate-300 mb-2">
                原始語言 (SRT)
              </label>
              <select
                id="source-language"
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
              >
                {SOURCE_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.name}>{lang.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="target-language" className="block text-sm font-medium text-slate-300 mb-2">
                目標語言
              </label>
              <select
                id="target-language"
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
              >
                {TARGET_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.name}>{lang.name}</option>
                ))}
              </select>
            </div>
        </div>

        <div>
          <label htmlFor="ai-model" className="block text-sm font-medium text-slate-300 mb-2">
            AI 模型
          </label>
          <select
            id="ai-model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
          >
            {AI_MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>


        <div className="pt-4 text-right">
          <button
            type="submit"
            disabled={!isFormValid || isLoading}
            className="inline-flex items-center px-8 py-3 bg-cyan-600 text-white font-bold rounded-lg shadow-md hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500 transition-all duration-200 disabled:bg-slate-600 disabled:cursor-not-allowed"
          >
             {isLoading ? (
                <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                處理中...
                </>
             ) : '翻譯字幕'
             }
          </button>
        </div>
      </form>
    </div>
  );
};

export default ContextProvider;