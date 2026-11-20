import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../context/AppContext';
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  ChevronRight,
  ExternalLink,
  Sparkles,
  X,
} from 'lucide-react';
import { normalizeDestinationUrl, safeOpenDestinationUrl } from '../../lib/urlUtils';
import { isMockSponsorshipCampaign } from '../../lib/firebase';
import {
  PublicSponsorTickerItem,
  fetchActiveSponsorTickerAds,
  recordSponsorTickerEvents,
} from '../../lib/corporateAdsService';
import { getBrandHighlightStyles } from '../../utils/brandColor';

export { normalizeDestinationUrl, safeOpenDestinationUrl };

interface UnifiedTickerSponsor {
  id: string;
  isCorporate: boolean;
  brandName: string;
  logoUrl?: string;
  brandHighlightColor?: string;
  shortMessage: string;
  headline: string;
  fullDescription: string;
  ctaLabel: string;
  destinationUrl: string;
}

export const AdvertisementTicker: React.FC = () => {
  const { sponsorshipCampaigns, activeTab, setActiveTab } = useApp();
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const [corporateItems, setCorporateItems] = useState<PublicSponsorTickerItem[]>([]);
  const [isSponsorsModalOpen, setIsSponsorsModalOpen] = useState(false);
  const [selectedSponsor, setSelectedSponsor] = useState<UnifiedTickerSponsor | null>(null);
  const [brokenLogos, setBrokenLogos] = useState<Record<string, boolean>>({});
  const lastImpressionKeyRef = useRef<string>('');

  // Automatically restore ticker visibility and continuous scrolling when user switches to any navigation tab
  useEffect(() => {
    setIsVisible(true);
    setIsPaused(false);
  }, [activeTab]);

  // Fetch approved & active corporate Sponsor Ticker ads from shared backend
  useEffect(() => {
    let mounted = true;
    fetchActiveSponsorTickerAds().then((res) => {
      if (mounted && res.success) {
        setCorporateItems(res.items);
      }
    });
    return () => {
      mounted = false;
    };
  }, [activeTab]);

  const unifiedSponsors = useMemo<UnifiedTickerSponsor[]>(() => {
    const corpList: UnifiedTickerSponsor[] = corporateItems.map((item) => ({
      id: item.tickerId,
      isCorporate: true,
      brandName: item.brandName || item.companyName || 'Sponsor',
      logoUrl: item.logoUrl || '',
      brandHighlightColor: item.brandHighlightColor,
      shortMessage: item.shortMessage,
      headline: item.headline || item.brandName || 'Sponsored Offer',
      fullDescription: item.fullDescription || item.shortMessage,
      ctaLabel: item.ctaLabel || 'Visit Website',
      destinationUrl: item.destinationUrl || '',
    }));

    const legacyList: UnifiedTickerSponsor[] = (sponsorshipCampaigns || [])
      .filter(
        (c) =>
          c.status === 'Active' && c.placement === 'Ticker' && !isMockSponsorshipCampaign(c)
      )
      .map((c) => ({
        id: String(c.id),
        isCorporate: false,
        brandName: c.sponsorName || 'Sponsor',
        shortMessage: c.text || '',
        headline: c.sponsorName || 'Sponsored Announcement',
        fullDescription: c.text || '',
        ctaLabel: (c as any).ctaText || 'Visit Website',
        destinationUrl: ('destinationUrl' in c ? (c as any).destinationUrl : '') || '',
      }));

    return [...corpList, ...legacyList];
  }, [corporateItems, sponsorshipCampaigns]);

  // Deduplicated backend bar_impression tracking when ticker renders visibly on student screen
  useEffect(() => {
    if (!isVisible || activeTab === 'community') return;
    const corpIds = unifiedSponsors.filter((s) => s.isCorporate).map((s) => s.id);
    if (corpIds.length === 0) return;

    const impressionKey = `${activeTab}:${corpIds.join(',')}`;
    if (lastImpressionKeyRef.current === impressionKey) return;
    lastImpressionKeyRef.current = impressionKey;

    void recordSponsorTickerEvents({
      eventType: 'bar_impression',
      tickerIds: corpIds,
    });
  }, [unifiedSponsors, isVisible, activeTab]);

  const handleOpenSponsorsModal = () => {
    if (unifiedSponsors.length === 0) return;
    setSelectedSponsor(null);
    setIsSponsorsModalOpen(true);

    const corpIds = unifiedSponsors.filter((s) => s.isCorporate).map((s) => s.id);
    if (corpIds.length > 0) {
      // Bar click opens Active Sponsors list (NEVER counts as website_click)
      void recordSponsorTickerEvents({
        eventType: 'bar_click',
        tickerIds: corpIds,
      });
    }
  };

  const handleSelectSponsor = (sponsor: UnifiedTickerSponsor) => {
    setSelectedSponsor(sponsor);
    if (sponsor.isCorporate) {
      void recordSponsorTickerEvents({
        eventType: 'detail_view',
        tickerId: sponsor.id,
      });
    }
  };

  const handleVisitWebsite = (sponsor: UnifiedTickerSponsor) => {
    const rawUrl = sponsor.destinationUrl;
    const target = normalizeDestinationUrl(rawUrl);
    if (!target) return;

    if (sponsor.isCorporate) {
      void recordSponsorTickerEvents({
        eventType: 'website_click',
        tickerId: sponsor.id,
      });
    }

    if (target.startsWith('#')) {
      const tabId = target.replace('#', '').toLowerCase();
      setIsSponsorsModalOpen(false);
      setSelectedSponsor(null);
      setActiveTab(tabId as any);
      return;
    }

    if (target.startsWith('/')) {
      window.location.href = target;
      return;
    }

    safeOpenDestinationUrl(target, (tabId) => {
      setIsSponsorsModalOpen(false);
      setSelectedSponsor(null);
      setActiveTab(tabId as any);
    });
  };

  const closeAllModals = () => {
    setSelectedSponsor(null);
    setIsSponsorsModalOpen(false);
  };

  // Lock background scroll & support Escape key when pop-up modal is open
  // (Must execute unconditionally before any early return to preserve React hook ordering)
  useEffect(() => {
    if (!isSponsorsModalOpen || !isVisible || activeTab === 'community' || typeof document === 'undefined') {
      return;
    }
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedSponsor(null);
        setIsSponsorsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSponsorsModalOpen, isVisible, activeTab]);

  // Hide sponsored ticker on Community tab or when manually dismissed or empty
  if (!isVisible || activeTab === 'community' || unifiedSponsors.length === 0) return null;

  // Repeat items to ensure smooth continuous 50% translation loop
  const repeatedItems = [
    ...unifiedSponsors,
    ...unifiedSponsors,
    ...unifiedSponsors,
    ...unifiedSponsors,
    ...unifiedSponsors,
    ...unifiedSponsors,
  ];

  const sponsorModalNode =
    isSponsorsModalOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={selectedSponsor ? 'Advertiser Details' : 'Active Sponsors'}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={closeAllModals}
          >
            <div
              className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {!selectedSponsor ? (
                <>
                  <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                        Active Sponsors
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={closeAllModals}
                      aria-label="Close Active Sponsors"
                      className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5">
                    {unifiedSponsors.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-6">
                        No active sponsors right now.
                      </p>
                    ) : (
                      unifiedSponsors.map((sponsor) => {
                        const sponsorBrandStyle = getBrandHighlightStyles(sponsor.brandHighlightColor);
                        const hasCardLogo = Boolean(sponsor.logoUrl && !brokenLogos[sponsor.id]);
                        return (
                          <button
                            key={sponsor.id}
                            type="button"
                            onClick={() => handleSelectSponsor(sponsor)}
                            className="w-full text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-slate-800 p-4 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                          >
                            <div className="min-w-0 space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                {hasCardLogo && (
                                  <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 dark:border-slate-700 p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                                    <img
                                      src={sponsor.logoUrl}
                                      alt={`${sponsor.brandName} logo`}
                                      referrerPolicy="no-referrer"
                                      onError={() =>
                                        setBrokenLogos((prev) => ({ ...prev, [sponsor.id]: true }))
                                      }
                                      className="w-full h-full object-contain rounded"
                                    />
                                  </div>
                                )}
                                <span
                                  style={sponsorBrandStyle.pillStyle}
                                  className="px-2 py-0.5 rounded-md border text-xs font-extrabold tracking-tight"
                                >
                                  {sponsor.brandName}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Active
                                </span>
                              </div>
                              {sponsor.headline && sponsor.headline !== sponsor.brandName && (
                                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug">
                                  {sponsor.headline}
                                </div>
                              )}
                              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                                {sponsor.shortMessage}
                              </p>
                              <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                                View advertiser details
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                (() => {
                  const selectedStyle = getBrandHighlightStyles(selectedSponsor.brandHighlightColor);
                  return (
                    <>
                      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedSponsor(null)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 cursor-pointer"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span>All Active Sponsors</span>
                        </button>
                        <button
                          type="button"
                          onClick={closeAllModals}
                          aria-label="Close Advertiser Details"
                          className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="p-6 space-y-4 overflow-y-auto">
                        <div className="flex items-center justify-between gap-2">
                          <div className="inline-flex items-center gap-3 min-w-0">
                            {selectedSponsor.logoUrl && !brokenLogos[selectedSponsor.id] ? (
                              <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                                <img
                                  src={selectedSponsor.logoUrl}
                                  alt={`${selectedSponsor.brandName} logo`}
                                  referrerPolicy="no-referrer"
                                  onError={() =>
                                    setBrokenLogos((prev) => ({
                                      ...prev,
                                      [selectedSponsor.id]: true,
                                    }))
                                  }
                                  className="w-full h-full object-contain rounded-lg"
                                />
                              </div>
                            ) : (
                              <div
                                style={selectedStyle.pillStyle}
                                className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0"
                              >
                                <Building2 className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <span
                                style={selectedStyle.pillStyle}
                                className="inline-block px-2.5 py-0.5 rounded-md border text-xs font-extrabold truncate max-w-full"
                              >
                                {selectedSponsor.brandName}
                              </span>
                              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                                Advertiser Details
                              </div>
                            </div>
                          </div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active Sponsor
                          </span>
                        </div>

                        <div className="space-y-2 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 p-4">
                          <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                            {selectedSponsor.headline}
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                            {selectedSponsor.fullDescription}
                          </p>
                        </div>

                        {normalizeDestinationUrl(selectedSponsor.destinationUrl) ? (
                          <div className="space-y-3 pt-1">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
                              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">
                                {normalizeDestinationUrl(selectedSponsor.destinationUrl)}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleVisitWebsite(selectedSponsor)}
                              style={selectedStyle.ctaButtonStyle}
                              className="w-full py-3 px-5 rounded-full border text-sm font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-opacity hover:opacity-90"
                            >
                              <span>{selectedSponsor.ctaLabel || 'Visit Website'}</span>
                              <ArrowUpRight className="w-4 h-4" />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </>
                  );
                })()
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={handleOpenSponsorsModal}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpenSponsorsModal();
          }
        }}
        className="relative z-30 w-full overflow-hidden bg-white/90 dark:bg-slate-950/90 text-slate-800 dark:text-slate-100 border-b border-slate-200/80 dark:border-slate-800/80 py-1.5 px-3 flex items-center select-none cursor-pointer"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => {
          setTimeout(() => setIsPaused(false), 800);
        }}
        onTouchCancel={() => setIsPaused(false)}
        title="Click to view Active Sponsors"
      >
        {/* Fixed Tag */}
        <div className="shrink-0 flex items-center gap-1 pr-2.5 font-black text-blue-600 dark:text-blue-400 border-r border-slate-300 dark:border-slate-800 mr-2 text-[10px] uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
          <span>SPONSOR TICKER</span>
        </div>

        {/* Ticker Content Marquee - RIGHT TO LEFT CONTINUOUS MOTION (Strictly Text-Only) */}
        <div className="flex-1 overflow-hidden relative pointer-events-none">
          <div
            className={`animate-ticker-marquee items-center gap-6 whitespace-nowrap font-medium ${
              isPaused || isSponsorsModalOpen ? 'animate-ticker-paused' : ''
            }`}
          >
            {repeatedItems.map((item, idx) => {
              const itemBrandStyle = getBrandHighlightStyles(item.brandHighlightColor);
              return (
                <div
                  key={`${item.id}-${idx}`}
                  className="inline-flex items-center gap-1.5 shrink-0 text-[11px] leading-none select-none"
                >
                  <span
                    style={itemBrandStyle.pillStyle}
                    className="px-2 py-0.5 text-[10px] font-black rounded border shrink-0"
                  >
                    {item.brandName}
                  </span>
                  <span className="text-slate-700 dark:text-slate-200 font-semibold">
                    {item.shortMessage}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700 mx-1.5 shrink-0">&bull;</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsVisible(false);
          }}
          className="shrink-0 pl-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          title="Dismiss Ticker"
          aria-label="Dismiss Ticker"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {sponsorModalNode}
    </>
  );
};

