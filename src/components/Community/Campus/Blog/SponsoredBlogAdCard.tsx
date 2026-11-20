import React, { useEffect, useRef, useState } from 'react';
import { Building2, ExternalLink, Megaphone } from 'lucide-react';
import {
  PublicSponsoredBlogAd,
  recordCorporateAdClick,
  recordCorporateAdImpression,
  serveSchoolBlogAd,
} from '../../../../lib/corporateAdsService';
import { getBrandHighlightStyles } from '../../../../utils/brandColor';

interface SponsoredBlogAdCardProps {
  articleId: string;
  institutionId?: string;
}

export const SponsoredBlogAdCard: React.FC<SponsoredBlogAdCardProps> = ({
  articleId,
  institutionId,
}) => {
  const [ad, setAd] = useState<PublicSponsoredBlogAd | null>(null);
  const [imgError, setImgError] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const trackedRef = useRef<string>('');

  useEffect(() => {
    let mounted = true;
    setAd(null);
    setImgError(false);
    setLogoError(false);

    serveSchoolBlogAd({ articleId, institutionId }).then((res) => {
      if (!mounted || !res.success || !res.ad) return;
      setAd(res.ad);
      const sig = `${res.ad.campaignId}::${articleId}`;
      if (trackedRef.current !== sig) {
        trackedRef.current = sig;
        void recordCorporateAdImpression({
          campaignId: res.ad.campaignId,
          articleId,
          institutionId,
        });
      }
    });

    return () => {
      mounted = false;
    };
  }, [articleId, institutionId]);

  if (!ad) {
    return null;
  }

  const brandStyle = getBrandHighlightStyles(ad.brandHighlightColor);
  const hasLogo = Boolean(ad.logoUrl && !logoError);

  return (
    <aside
      aria-label="Sponsored Advertisement"
      data-testid="sponsored-blog-ad-card"
      className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4"
    >
      <div
        aria-hidden="true"
        style={brandStyle.accentBarStyle}
        className="absolute inset-x-0 top-0 h-1"
      />

      <div className="flex items-center justify-between gap-3 text-xs pt-0.5">
        <div className="flex items-center gap-2.5 min-w-0">
          {hasLogo ? (
            <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 dark:border-slate-700 p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
              <img
                src={ad.logoUrl}
                alt={`${ad.brandName} logo`}
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
          ) : (
            <div
              style={brandStyle.iconBoxStyle}
              className="w-8 h-8 rounded-xl border flex items-center justify-center shrink-0"
            >
              <Building2 className="w-4 h-4" />
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span
              style={brandStyle.pillStyle}
              className="px-2.5 py-0.5 rounded-md border text-[11px] font-black tracking-tight truncate max-w-[200px]"
            >
              {ad.brandName}
            </span>
            <span
              style={brandStyle.softBadgeStyle}
              className="px-2 py-0.5 rounded-md border text-[10px] font-extrabold uppercase tracking-wider shrink-0"
            >
              Sponsored
            </span>
          </div>
        </div>
        <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0 hidden sm:inline">
          Partner Message
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
        <div className="sm:col-span-4">
          {ad.creativeImageUrl && !imgError ? (
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 aspect-[16/10]">
              <img
                src={ad.creativeImageUrl}
                alt={ad.headline}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div
              style={brandStyle.ctaButtonStyle}
              className="rounded-2xl aspect-[16/10] flex items-center justify-center p-4"
            >
              <div className="text-center space-y-1.5">
                {hasLogo ? (
                  <div className="w-11 h-11 rounded-xl bg-white p-1 mx-auto shadow-xs flex items-center justify-center">
                    <img
                      src={ad.logoUrl}
                      alt={`${ad.brandName} logo`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  <Megaphone className="w-6 h-6 mx-auto opacity-90" />
                )}
                <div className="text-xs font-bold">{ad.brandName}</div>
              </div>
            </div>
          )}
        </div>

        <div className="sm:col-span-8 space-y-2.5">
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
            {ad.headline}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {ad.adText}
          </p>
          <div className="pt-1">
            <a
              href={ad.destinationUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={() => {
                void recordCorporateAdClick({
                  campaignId: ad.campaignId,
                  articleId,
                  institutionId,
                });
              }}
              style={brandStyle.ctaButtonStyle}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border text-xs sm:text-sm font-bold transition-opacity hover:opacity-90 whitespace-nowrap shadow-xs"
            >
              <span>{ad.ctaLabel || 'Learn More'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
};

