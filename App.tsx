
import React, { useState, useCallback, useEffect } from 'react';
import { AppState, SubtitleEntry, TranslatedSubtitleEntry, TranslationContext } from './types';
import { parseSRT, formatSRT } from './utils/subtitleManager';
import { translateSubtitlesBatch, validateApiKey } from './services/geminiService';
import Header from './components/Header';
import FileUploader from './components/FileUploader';
import ContextProvider from './components/ContextProvider';
import TranslationEditor from './components/TranslationEditor';
import Loader from './components/Loader';
import ApiKeyModal from './components/ApiKeyModal';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.Uploading);
  const [fileOriginalSubtitles, setFileOriginalSubtitles] = useState<SubtitleEntry[]>([]);
  const [originalSubtitles, setOriginalSubtitles] = useState<SubtitleEntry[]>([]);
  const [translatedSubtitles, setTranslatedSubtitles] = useState<TranslatedSubtitleEntry[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);
  const [context, setContext] = useState<TranslationContext | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini-api-key');
    if (storedKey) {
      setApiKey(storedKey);
    } else {
      setIsApiKeyModalOpen(true);
    }
  }, []);

  const handleApiKeySubmit = (key: string) => {
    localStorage.setItem('gemini-api-key', key);
    setApiKey(key);
    setIsApiKeyModalOpen(false);
    // If we were showing an error that the key was bad, clear it.
    if (error && error.toLowerCase().includes('api key')) {
        handleReset();
    }
  };

  const handleFileUploaded = useCallback((content: string, name: string) => {
    setError(null);
    if (!apiKey) {
        setIsApiKeyModalOpen(true);
        return;
    }
    try {
      const parsedSubtitles = parseSRT(content);
      if (parsedSubtitles.length === 0) {
        throw new Error("檔案似乎是空的或格式不正確。");
      }
      setFileOriginalSubtitles(parsedSubtitles);
      setOriginalSubtitles(parsedSubtitles);
      setFileName(name);
      setAppState(AppState.Context);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [apiKey]);

  const handleContextProvided = async (synopsis: string, characters: string, sourceLanguage: string, targetLanguage: string, model: string) => {
    if (!apiKey) {
      setError('API 金鑰未設定。請先設定您的 API 金鑰。');
      setIsApiKeyModalOpen(true);
      return;
    }
    setError(null);
    setContext({ synopsis, characters, originalSourceLanguage: sourceLanguage, currentSourceLanguage: sourceLanguage, targetLanguage, model });
    setAppState(AppState.Translating);
    setProgress({ processed: 0, total: originalSubtitles.length });

    try {
      const allTranslated = await translateSubtitlesBatch(
        apiKey,
        originalSubtitles,
        synopsis,
        characters,
        sourceLanguage,
        targetLanguage,
        model,
        (processed, total) => {
          setProgress({ processed, total });
        }
      );
      setTranslatedSubtitles(allTranslated);
      setAppState(AppState.Reviewing);
    } catch (e) {
      console.error(e);
      let errorMessage = '翻譯字幕失敗。請檢查您的網路連線後再試一次。';
      if (e instanceof Error) {
        const lowerCaseMessage = e.message.toLowerCase();
        if (lowerCaseMessage.includes('api key') || lowerCaseMessage.includes('api_key') || lowerCaseMessage.includes('permission denied') || lowerCaseMessage.includes('quota')) {
          errorMessage = '您的 API 金鑰無效或已超出配額。請檢查您的金鑰或稍後再試。';
          // Optional: automatically open the API key modal on key failure
          // setIsApiKeyModalOpen(true);
        }
      }
      setError(errorMessage);
      setAppState(AppState.Context);
    } finally {
      setProgress(null);
    }
  };

  const handleReTranslate = async (newTargetLanguage: string, source: 'original' | 'edited') => {
    if (!context || !translatedSubtitles.length || !apiKey) {
      setError("沒有初始內容、字幕或 API 金鑰，無法重新翻譯。");
      if (!apiKey) setIsApiKeyModalOpen(true);
      return;
    }

    setError(null);
    
    const subtitlesForNewTranslation = source === 'edited'
      ? translatedSubtitles.map(sub => ({ ...sub, text: sub.translatedText }))
      : fileOriginalSubtitles;

    const sourceLangForNewTranslation = source === 'edited'
      ? context.targetLanguage
      : context.originalSourceLanguage;

    const newContext: TranslationContext = {
      ...context,
      currentSourceLanguage: sourceLangForNewTranslation,
      targetLanguage: newTargetLanguage
    };

    setContext(newContext);
    setOriginalSubtitles(subtitlesForNewTranslation);
    setAppState(AppState.Translating);
    setProgress({ processed: 0, total: subtitlesForNewTranslation.length });

    try {
      const allTranslated = await translateSubtitlesBatch(
        apiKey,
        subtitlesForNewTranslation,
        newContext.synopsis,
        newContext.characters,
        newContext.currentSourceLanguage,
        newContext.targetLanguage,
        newContext.model,
        (processed, total) => {
          setProgress({ processed, total });
        }
      );
      setTranslatedSubtitles(allTranslated);
      setAppState(AppState.Reviewing);
    } catch (e) {
      console.error(e);
      let errorMessage = '重新翻譯字幕失敗，請再試一次。';
       if (e instanceof Error) {
        const lowerCaseMessage = e.message.toLowerCase();
        if (lowerCaseMessage.includes('api key') || lowerCaseMessage.includes('api_key') || lowerCaseMessage.includes('permission denied') || lowerCaseMessage.includes('quota')) {
          errorMessage = '您的 API 金鑰無效或已超出配額。請檢查您的金鑰或稍後再試。';
        }
      }
      setError(errorMessage);
      setAppState(AppState.Reviewing); 
    } finally {
      setProgress(null);
    }
  };


  const handleUpdateTranslation = useCallback((index: number, newText: string) => {
    setTranslatedSubtitles(prev => 
      prev.map(entry => 
        entry.id === index ? { ...entry, translatedText: newText } : entry
      )
    );
  }, []);
  
  const handleDownload = useCallback(() => {
    const srtContent = formatSRT(translatedSubtitles);
    const blob = new Blob([srtContent], { type: 'text/srt' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.replace('.srt', `_translated.srt`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [translatedSubtitles, fileName]);

  const handleReset = useCallback(() => {
    setAppState(AppState.Uploading);
    setFileOriginalSubtitles([]);
    setOriginalSubtitles([]);
    setTranslatedSubtitles([]);
    setFileName('');
    setError(null);
    setProgress(null);
    setContext(null);
  }, []);

  const handleChangeApiKey = useCallback(() => {
    // Immediately delete the key from storage and state
    localStorage.removeItem('gemini-api-key');
    setApiKey(null);
    // Reset the application to its initial state for a clean flow
    handleReset();
    // Force the modal to open
    setIsApiKeyModalOpen(true);
  }, [handleReset]);

  const renderContent = () => {
    if (error) {
        return (
            <div className="text-center p-8 bg-red-900/20 border border-red-500 rounded-lg">
                <h2 className="text-2xl font-bold text-red-400 mb-4">發生錯誤</h2>
                <p className="text-red-300 mb-6">{error}</p>
                <button
                    onClick={handleReset}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                >
                    重新開始
                </button>
            </div>
        )
    }

    switch (appState) {
      case AppState.Uploading:
        return <FileUploader onFileUpload={handleFileUploaded} />;
      case AppState.Context:
        return <ContextProvider onContextSubmit={handleContextProvided} fileName={fileName} />;
      case AppState.Translating:
        return <Loader progress={progress} />;
      case AppState.Reviewing:
        return <TranslationEditor 
                    originalSubtitles={originalSubtitles}
                    translatedSubtitles={translatedSubtitles} 
                    onUpdateTranslation={handleUpdateTranslation}
                    onDownload={handleDownload}
                    onReset={handleReset}
                    fileName={fileName}
                    onReTranslate={handleReTranslate}
                    originalSourceLanguage={context?.originalSourceLanguage || ''}
                    currentTargetLanguage={context?.targetLanguage || ''}
                    model={context?.model || 'N/A'}
                />;
      default:
        return <FileUploader onFileUpload={handleFileUploaded} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
       <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onApiKeySubmit={handleApiKeySubmit}
        isDismissible={!!apiKey}
      />
      <Header
        onReset={appState !== AppState.Uploading ? handleReset : undefined}
        onChangeApiKey={handleChangeApiKey}
      />
      <main className="w-full max-w-7xl mx-auto mt-8 flex-grow">
        {renderContent()}
      </main>
      <footer className="w-full max-w-7xl mx-auto text-center py-4 text-slate-500 text-sm flex flex-col items-center gap-4">
        <p>
          <a href="https://weisfx0705.github.io/chiawei/" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">
              義守大學電影與電視學系陳嘉暐老師
          </a>
          {' '}應用Google Ai Studio開發 2025
        </p>
        <a href='https://ko-fi.com/J3J3VWQG5' target='_blank' rel='noopener noreferrer' title='請我喝咖啡，謝謝您'>
            <img src='https://storage.ko-fi.com/cdn/kofi3.png?v=3' alt='Buy Me a Coffee at ko-fi.com' style={{ border: 0, height: '45px' }}/>
        </a>
      </footer>
    </div>
  );
};

export default App;
