import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Sparkles, ArrowUpRight, X } from 'lucide-react';
import { normalizeDestinationUrl, safeOpenDestinationUrl } from '../../lib/urlUtils';
import { isMockSponsorshipCampaign } from '../../lib/firebase';

export { normalizeDestinationUrl, safeOpenDestinationUrl };

export const AdvertisementTicker: React.FC = () => {
  const { sponsorshipCampaigns, activeTab, setActiveTab } = useApp();
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Automatically restore ticker visibility and continuous scrolling when user switches to any navigation tab
  useEffect(() => {
    setIsVisible(true);
    setIsPaused(false);
  }, [activeTab]);

  const handleDirectToWebsite = (e: React.MouseEvent<HTMLElement>, rawUrl?: string) => {
    if (!rawUrl) return;
    const target = normalizeDestinationUrl(rawUrl);
    if (!target) return;

    e.stopPropagation();

    if (target.startsWith('#')) {
      e.preventDefault();
      const tabId = target.replace('#', '').toLowerCase();
      setActiveTab(tabId as any);
      return;
    }

    if (target.startsWith('/')) {
      e.preventDefault();
      window.location.href = target;
      return;
    }

    // External URL: Use safeOpenDestinationUrl which handles popup blockers and iframe sandboxes
    e.preventDefault();
    safeOpenDestinationUrl(target, (tabId) => setActiveTab(tabId as any));
  };

  // Hide sponsored ticker on Community tab and Daily GP Grab (daily_qa / gus tab)
  if (!isVisible || activeTab === 'community' || activeTab === 'daily_qa' || activeTab === 'gus') return null;

  // Active ticker campaigns created by admin
  const activeTickerItems = (sponsorshipCampaigns || []).filter(
    c => c.status === 'Active' && c.placement === 'Ticker' && !isMockSponsorshipCampaign(c)
  );

  // If no ticker campaigns uploaded by admin yet, do not display ticker
  if (activeTickerItems.length === 0) return null;

  const tickerList = activeTickerItems;

  // Repeat items to ensure smooth continuous 50% translation loop
  const repeatedItems = [
    ...tickerList,
    ...tickerList,
    ...tickerList,
    ...tickerList,
    ...tickerList,
    ...tickerList,
  ];

  return (
    <div
      className="relative z-30 w-full overflow-hidden bg-white/90 dark:bg-slate-950/90 text-slate-800 dark:text-slate-100 border-b border-slate-200/80 dark:border-slate-800/80 py-1.5 px-3 flex items-center select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => {
        // Resume scrolling after brief pause on mobile touch
        setTimeout(() => setIsPaused(false), 800);
      }}
      onTouchCancel={() => setIsPaused(false)}
    >
      {/* Fixed Tag */}
      <div className="shrink-0 flex items-center gap-1 pr-2.5 font-black text-blue-600 dark:text-blue-400 border-r border-slate-300 dark:border-slate-800 mr-2 text-[10px] uppercase tracking-wider">
        <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
        <span>SPONSOR TICKER</span>
      </div>

      {/* Ticker Content Marquee - RIGHT TO LEFT CONTINUOUS MOTION */}
      <div className="flex-1 overflow-hidden relative">
        <div
          className={`animate-ticker-marquee items-center gap-6 whitespace-nowrap font-medium ${
            isPaused ? 'animate-ticker-paused' : ''
          }`}
        >
          {repeatedItems.map((item, idx) => {
            const destUrl = ('destinationUrl' in item ? (item as any).destinationUrl : '') || '';
            const normalizedUrl = normalizeDestinationUrl(destUrl);
            const hasUrl = Boolean(normalizedUrl);

            const content = (
              <>
                <span className="px-1.5 py-0.5 text-[10px] font-black rounded bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1 shrink-0">
                  <span>{item.logo}</span>
                  <span>{item.sponsorName}</span>
                </span>
                <span className={`text-slate-700 dark:text-slate-200 font-semibold ${hasUrl ? 'group-hover:underline' : ''}`}>
                  {item.text}
                </span>
                {hasUrl && (
                  <span className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-bold ml-1 shrink-0 group-hover:underline">
                    <span>{(item as any).ctaText || 'Learn More'}</span>
                    <ArrowUpRight className="w-2.5 h-2.5" />
                  </span>
                )}
                <span className="text-slate-300 dark:text-slate-700 mx-1.5 shrink-0">•</span>
              </>
            );

            if (hasUrl) {
              return (
                <a
                  key={`${item.id}-${idx}`}
                  href={normalizedUrl}
                  target={normalizedUrl.startsWith('http') ? '_blank' : '_self'}
                  rel="noopener noreferrer"
                  onClick={(e) => handleDirectToWebsite(e, destUrl)}
                  className="group inline-flex items-center gap-1.5 shrink-0 text-[11px] leading-none cursor-pointer hover:opacity-90 active:opacity-75 transition-opacity touch-manipulation pointer-events-auto"
                  title={`Visit: ${normalizedUrl}`}
                >
                  {content}
                </a>
              );
            }

            return (
              <div
                key={`${item.id}-${idx}`}
                className="inline-flex items-center gap-1.5 shrink-0 text-[11px] leading-none select-none"
              >
                {content}
              </div>
            );
          })}
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={() => setIsVisible(false)}
        className="shrink-0 pl-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
        title="Dismiss Ticker"
        aria-label="Dismiss Ticker"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
