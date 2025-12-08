
import React, { useState } from 'react';
import { TranslatedSubtitleEntry, SubtitleEntry } from '../types';
import { TARGET_LANGUAGES, AI_MODELS } from '../constants';

interface TranslationEditorProps {
    originalSubtitles: SubtitleEntry[];
    translatedSubtitles: TranslatedSubtitleEntry[];
    onUpdateTranslation: (index: number, newText: string) => void;
    onDownload: () => void;
    onReset: () => void;
    fileName: string;
    onReTranslate: (newTargetLanguage: string, source: 'original' | 'edited') => void;
    originalSourceLanguage: string;
    currentTargetLanguage: string;
    model: string;
}

const TranslationEditor: React.FC<TranslationEditorProps> = ({ 
    originalSubtitles,
    translatedSubtitles, 
    onUpdateTranslation,
    onDownload,
    onReset,
    fileName,
    onReTranslate,
    originalSourceLanguage,
    currentTargetLanguage,
    model
}) => {
    const [newTargetLanguage, setNewTargetLanguage] = useState<string>('');
    const [retranslationSource, setRetranslationSource] = useState<'original' | 'edited' | null>(null);

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLang = e.target.value;
        setNewTargetLanguage(newLang);
        // Reset source choice when language changes
        setRetranslationSource(null);
    };

    const handleReTranslateClick = () => {
        if (!newTargetLanguage || !retranslationSource || newTargetLanguage === currentTargetLanguage) return;
        onReTranslate(newTargetLanguage, retranslationSource);
    }
    
    const modelName = AI_MODELS.find(m => m.id === model)?.name || model;

    return (
        <div className="w-full bg-slate-800/50 rounded-2xl shadow-lg overflow-hidden flex flex-col h-[85vh]">
            <div className="p-4 sm:p-6 border-b border-slate-700 flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-semibold text-slate-100">審閱和編輯翻譯</h2>
                        <p className="text-slate-400 mt-1">檔案: <span className="font-mono">{fileName}</span></p>
                        <p className="text-xs text-slate-500 mt-1">模型: <span className="font-mono uppercase">{modelName}</span></p>
                    </div>
                     <div className="flex items-center gap-2">
                        <button
                            onClick={onReset}
                            className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition-colors text-sm h-10"
                        >
                            新翻譯
                        </button>
                        <button
                            onClick={onDownload}
                            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors h-10"
                        >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                            <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                            </svg>
                            下載 SRT
                        </button>
                    </div>
                </div>
                
                {/* Re-translate section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                    <div className="flex-grow w-full">
                        <label htmlFor="retranslate-lang" className="block text-sm font-medium text-slate-300 mb-2">
                            重新翻譯成新語言
                        </label>
                        <select
                            id="retranslate-lang"
                            value={newTargetLanguage}
                            onChange={handleLanguageChange}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition text-sm"
                            aria-label="Select new language for re-translation"
                        >
                            <option value="" disabled>選擇語言...</option>
                            {TARGET_LANGUAGES.filter(lang => lang.name !== currentTargetLanguage).map(lang => (
                                <option key={lang.code} value={lang.name}>{lang.name}</option>
                            ))}
                        </select>
                        
                        {newTargetLanguage && (
                            <div className="mt-4">
                                <p className="text-sm font-medium text-slate-300 mb-2">使用以下文字來源：</p>
                                <div className="flex flex-col sm:flex-row gap-x-6 gap-y-2 text-sm">
                                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                                        <input type="radio" name="retranslationSource" value="original" checked={retranslationSource === 'original'} onChange={() => setRetranslationSource('original')} className="h-4 w-4 bg-slate-800 border-slate-600 text-cyan-600 focus:ring-cyan-500" />
                                        原始 ({originalSourceLanguage})
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                                        <input type="radio" name="retranslationSource" value="edited" checked={retranslationSource === 'edited'} onChange={() => setRetranslationSource('edited')} className="h-4 w-4 bg-slate-800 border-slate-600 text-cyan-600 focus:ring-cyan-500" />
                                        編輯後 ({currentTargetLanguage})
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                     <button
                        onClick={handleReTranslateClick}
                        disabled={!newTargetLanguage || !retranslationSource || newTargetLanguage === currentTargetLanguage}
                        className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors h-10 disabled:bg-slate-600 disabled:cursor-not-allowed flex-shrink-0"
                    >
                        再次翻譯
                    </button>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <div className="p-4 hidden md:block">
                        <h3 className="text-lg font-bold text-slate-300 tracking-wide text-center sticky top-0 bg-slate-800/50 py-2 z-10">原文 ({originalSubtitles.length > 0 && (retranslationSource === 'edited' ? currentTargetLanguage : originalSourceLanguage)})</h3>
                    </div>
                    <div className="p-4 hidden md:block">
                        <h3 className="text-lg font-bold text-slate-300 tracking-wide text-center sticky top-0 bg-slate-800/50 py-2 z-10">譯文 ({currentTargetLanguage})</h3>
                    </div>
                </div>

                {translatedSubtitles.map((entry, index) => {
                    const originalEntry = originalSubtitles.find(o => o.id === entry.id) || entry;
                    return (
                    <div key={entry.id} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 px-4 py-3 border-b border-slate-700/50 hover:bg-slate-800 transition-colors">
                         {/* Original */}
                         <div className="mb-2 md:mb-0">
                             <div className="font-mono text-xs text-slate-500 mb-1">{originalEntry.id} | {originalEntry.startTime} --&gt; {originalEntry.endTime}</div>
                             <p className="text-slate-300 whitespace-pre-wrap">{originalEntry.text}</p>
                         </div>
                         {/* Translated */}
                         <div>
                             <textarea
                                 value={entry.translatedText}
                                 onChange={(e) => onUpdateTranslation(entry.id, e.target.value)}
                                 className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-cyan-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition resize-none"
                                 rows={originalEntry.text.split('\n').length}
                             />
                         </div>
                    </div>
                )})}
            </div>
        </div>
    );
};

export default TranslationEditor;