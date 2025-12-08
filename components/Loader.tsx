
import React from 'react';

interface LoaderProps {
    progress: { processed: number; total: number } | null;
}

const Loader: React.FC<LoaderProps> = ({ progress }) => {
    const percentage = progress && progress.total > 0 
        ? Math.round((progress.processed / progress.total) * 100) 
        : 0;

    return (
        <div className="w-full max-w-2xl mx-auto text-center bg-slate-800/50 p-12 rounded-2xl shadow-lg flex flex-col items-center">
            <h2 className="text-3xl font-bold text-slate-100 mb-4">翻譯中...</h2>
            <p className="text-slate-400 mb-8">請稍候，AI 正在精心製作翻譯。這可能需要一些時間。</p>
            
            <div className="w-full bg-slate-700 rounded-full h-4 mb-4 overflow-hidden">
                <div 
                    className="bg-cyan-500 h-4 rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
            
            {progress && (
                <p className="text-lg font-semibold text-slate-300">{percentage}%</p>
            )}
            {progress && (
                <p className="text-sm text-slate-400">({progress.processed} / {progress.total} 筆)</p>
            )}
        </div>
    );
};

export default Loader;