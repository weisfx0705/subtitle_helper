
import React from 'react';

interface HeaderProps {
    onReset?: () => void;
    onChangeApiKey?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onReset, onChangeApiKey }) => {
    return (
        <header className="w-full max-w-7xl mx-auto flex justify-between items-center pb-4 border-b border-slate-700">
            <div className="flex items-center gap-3">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-cyan-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C13.18 7.061 14.1 7.5 15 7.5h6M6 8.751a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
                 </svg>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">
                    翻譯寫手的書僮
                </h1>
            </div>
            <div className="flex items-center gap-2">
                 {onChangeApiKey && (
                    <button onClick={onChangeApiKey} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-semibold rounded-lg transition-colors">
                        更改 API 金鑰
                    </button>
                )}
                {onReset && (
                    <button onClick={onReset} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-slate-100 text-sm font-semibold rounded-lg transition-colors">
                        開始新翻譯
                    </button>
                )}
            </div>
        </header>
    );
};

export default Header;
