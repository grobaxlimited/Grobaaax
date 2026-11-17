import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Megaphone } from 'lucide-react';
import {
  PublicSponsoredBlogAd,
  recordCorporateAdClick,
  recordCorporateAdImpression,
  serveSchoolBlogAd,
} from '../../../../lib/corporateAdsService';

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
  const trackedRef = useRef<string>('');

  useEffect(() => {
    let mounted = true;
    setAd(null);
    setImgError(false);

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

  return (
    <aside
      aria-label="Sponsored Advertisement"
      data-testid="sponsored-blog-ad-card"
      className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4"
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            Sponsored
          </span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
            &middot;
          </span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {ad.brandName}
          </span>
        </div>
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
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
            <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white aspect-[16/10] flex items-center justify-center p-4">
              <div className="text-center space-y-1">
                <Megaphone className="w-6 h-6 mx-auto opacity-90" />
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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold transition-colors whitespace-nowrap"
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
