import React, { useState } from 'react';
import { Play, Youtube, Sparkles } from 'lucide-react';
import { getYouTubeThumbnailUrl } from '../../lib/youtubeUtils';
import { WelcomeVideoModal } from './WelcomeVideoModal';

interface WelcomeVideoBoxProps {
  videoUrl?: string;
  title?: string;
  description?: string;
  isActive?: boolean;
}

export const WelcomeVideoBox: React.FC<WelcomeVideoBoxProps> = ({
  videoUrl,
  title = 'How Grobaax Works: Complete Guide & Walkthrough',
  description = 'Watch this quick video walkthrough to learn every platform function, earn GP in Daily GP Grab, battle in School Dome Arena, generate handouts in Library, and connect on Campus.',
  isActive = true,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // If explicitly disabled by admin, do not render
  if (isActive === false) return null;

  const effectiveUrl = videoUrl || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const thumbnailUrl = getYouTubeThumbnailUrl(effectiveUrl);

  return (
    <>
      <div
        id="home-welcome-youtube-box"
        onClick={() => setIsModalOpen(true)}
        className="group relative cursor-pointer overflow-hidden rounded-2xl sm:rounded-3xl border border-red-500/30 dark:border-red-500/40 bg-gradient-to-br from-red-950/20 via-slate-900 to-slate-950 p-4 sm:p-5 shadow-lg hover:shadow-red-500/20 hover:border-red-500/60 transition-all duration-300 transform hover:-translate-y-1 w-full max-w-md shrink-0"
      >
        {/* Animated Background Glow Accent */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-red-600/20 rounded-full blur-2xl group-hover:bg-red-600/30 transition-all duration-500 pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-blue-600/15 rounded-full blur-2xl group-hover:bg-blue-600/25 transition-all duration-500 pointer-events-none" />

        <div className="relative z-10 flex items-center gap-4">
          {/* Animated Play / Thumbnail Box */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-950 border border-red-500/40 shrink-0 shadow-md group-hover:scale-105 transition-transform duration-300 flex items-center justify-center">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt="Video Thumbnail"
                className="w-full h-full object-cover opacity-75 group-hover:opacity-90 group-hover:scale-110 transition-all duration-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : null}

            {/* Dark Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

            {/* Animated Pulsing Play Ring */}
            <span className="absolute w-10 h-10 rounded-full bg-red-600/40 animate-ping pointer-events-none" />
            <div className="relative z-10 w-11 h-11 rounded-full bg-red-600 group-hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/50 group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 fill-current translate-x-0.5" />
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-500 dark:text-red-400 text-[10px] font-black tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <Youtube className="w-3 h-3" />
                <span>Video Guide</span>
              </span>
              <span className="text-[10px] font-bold text-amber-500/90 dark:text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Quick Tour
              </span>
            </div>

            <h3 className="text-sm sm:text-base font-extrabold text-white leading-snug line-clamp-2 group-hover:text-red-300 transition-colors">
              {title}
            </h3>

            <p className="text-[11px] sm:text-xs text-slate-300 dark:text-slate-400 line-clamp-1">
              Click to watch platform guide & all features
            </p>
          </div>
        </div>

        {/* Bottom Interactive Bar */}
        <div className="relative z-10 mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-red-400 group-hover:text-red-300 transition-colors">
          <span className="flex items-center gap-1.5">
            <Play className="w-3 h-3 fill-current" />
            <span>Watch Pop-up Video</span>
          </span>
          <span className="text-[10px] text-slate-400 group-hover:translate-x-1 transition-transform">
            Watch Now &rarr;
          </span>
        </div>
      </div>

      {/* Pop-up Video Lightbox Modal */}
      <WelcomeVideoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        videoUrl={effectiveUrl}
        title={title}
        description={description}
      />
    </>
  );
};
