import React, { useState } from 'react';
import { MOCK_SPONSOR_TICKER } from '../../data/mockData';
import { Sparkles, ArrowUpRight, Megaphone, X } from 'lucide-react';

export const SponsorTicker: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  if (!isVisible) return null;

  return (
    <div
      className="relative z-30 w-full overflow-hidden bg-transparent text-slate-800 dark:text-slate-100 border-b border-slate-200/80 dark:border-slate-800/80 text-xs py-1.5 px-3 flex items-center"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Fixed Left Tag */}
      <div className="shrink-0 flex items-center gap-1.5 pr-3 font-black text-blue-600 dark:text-blue-400 border-r border-slate-300 dark:border-slate-800 mr-3 text-[10px] uppercase tracking-wider">
        <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
        <span>SPONSOR TICKER</span>
      </div>

      {/* Ticker Content Marquee */}
      <div className="flex-1 overflow-hidden relative">
        <div
          className={`flex items-center gap-8 whitespace-nowrap transition-all duration-300 ${
            isPaused ? 'animate-none' : 'animate-marquee'
          }`}
          style={{
            display: 'inline-flex',
            animation: isPaused ? 'none' : 'marquee 28s linear infinite',
          }}
        >
          {[...MOCK_SPONSOR_TICKER, ...MOCK_SPONSOR_TICKER].map((item, idx) => (
            <div key={`${item.id}-${idx}`} className="inline-flex items-center gap-2">
              <span className="px-1.5 py-0.5 text-[10px] font-black rounded border bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20">
                {item.tag}
              </span>
              <span className="text-slate-700 dark:text-slate-200 font-semibold">{item.message}</span>
              {item.linkText && (
                <button
                  onClick={() => alert(`Redirecting to sponsor event: ${item.message}`)}
                  className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 hover:underline font-bold ml-1 cursor-pointer"
                >
                  {item.linkText}
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              )}
              <span className="text-slate-300 dark:text-slate-700 mx-2">•</span>
            </div>
          ))}
        </div>
      </div>

      {/* Close button for clean view */}
      <button
        onClick={() => setIsVisible(false)}
        className="shrink-0 pl-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
        title="Dismiss Ticker"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};
