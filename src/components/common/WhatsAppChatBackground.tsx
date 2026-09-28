import React from 'react';

interface WhatsAppChatBackgroundProps {
  children: React.ReactNode;
  className?: string;
  patternOpacity?: number; // 0 to 1
  style?: React.CSSProperties;
}

/**
 * WhatsAppChatBackground
 * 
 * Provides the authentic, iconic WhatsApp chat doodle wallpaper background.
 * Matches WhatsApp's signature warm cream aesthetic (#efeae2) in light mode
 * and deep slate aesthetic (#0b141a) in dark mode, with fixed tileable line-art doodles.
 */
export const WhatsAppChatBackground: React.FC<WhatsAppChatBackgroundProps> = ({
  children,
  className = '',
  patternOpacity = 0.95,
  style,
}) => {
  return (
    <div className={`relative flex-1 flex flex-col min-h-0 overflow-hidden ${className}`} style={style}>
      {/* 1. Light Mode WhatsApp Wallpaper Layer */}
      <div
        className="absolute inset-0 pointer-events-none z-0 bg-[#efeae2] dark:hidden transition-colors"
        aria-hidden="true"
      >
        {/* Raster High-Res Doodle Layer */}
        <div
          className="absolute inset-0 bg-repeat pointer-events-none"
          style={{
            backgroundImage: `url('/images/whatsapp-doodle-light.jpg')`,
            backgroundSize: '412px auto',
            backgroundPosition: 'top left',
            opacity: patternOpacity,
          }}
        />

        {/* Vector SVG Detail Overlay for Crisp Geometry */}
        <div
          className="absolute inset-0 bg-repeat pointer-events-none text-amber-950/10"
          style={{
            backgroundImage: `url('/images/whatsapp-doodle-pattern.svg')`,
            backgroundSize: '380px 380px',
            backgroundPosition: 'top left',
            opacity: 0.35,
          }}
        />

        {/* Subtle Vignette Gradient to ensure 100% text legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/[0.02] via-transparent to-black/[0.04] pointer-events-none" />
      </div>

      {/* 2. Dark Mode WhatsApp Wallpaper Layer */}
      <div
        className="absolute inset-0 pointer-events-none z-0 bg-[#0b141a] hidden dark:block transition-colors"
        aria-hidden="true"
      >
        {/* Dark High-Res Doodle Layer */}
        <div
          className="absolute inset-0 bg-repeat pointer-events-none"
          style={{
            backgroundImage: `url('/images/whatsapp-doodle-dark.jpg')`,
            backgroundSize: '412px auto',
            backgroundPosition: 'top left',
            opacity: Math.max(0.65, patternOpacity * 0.85),
          }}
        />

        {/* Vector SVG Overlay for Dark Mode */}
        <div
          className="absolute inset-0 bg-repeat pointer-events-none text-slate-100/10"
          style={{
            backgroundImage: `url('/images/whatsapp-doodle-pattern.svg')`,
            backgroundSize: '380px 380px',
            backgroundPosition: 'top left',
            opacity: 0.25,
          }}
        />

        {/* Dark Mode Ambient Softener */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-transparent to-slate-950/50 pointer-events-none" />
      </div>

      {/* 3. Interactive Content Stream (Messages glide smoothly over the fixed wallpaper) */}
      <div className="relative z-10 flex-1 flex flex-col min-h-0">
        {children}
      </div>
    </div>
  );
};
