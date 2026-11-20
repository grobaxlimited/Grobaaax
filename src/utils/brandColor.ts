export interface BrandPresetColor {
  name: string;
  hex: string;
}

export const DEFAULT_BRAND_HIGHLIGHT_COLOR = '#2563EB';

export const BRAND_HIGHLIGHT_PRESETS: BrandPresetColor[] = [
  { name: 'Royal Blue', hex: '#2563EB' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Indigo', hex: '#4F46E5' },
  { name: 'Violet', hex: '#7C3AED' },
  { name: 'Crimson', hex: '#E11D48' },
  { name: 'Sunset Orange', hex: '#EA580C' },
  { name: 'Amber Gold', hex: '#D97706' },
  { name: 'Teal', hex: '#0D9488' },
  { name: 'Sky', hex: '#0284C7' },
  { name: 'Onyx', hex: '#0F172A' },
];

export function normalizeHexColor(
  raw?: string | null,
  fallback: string = DEFAULT_BRAND_HIGHLIGHT_COLOR
): string {
  const cleaned = String(raw || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) {
    return cleaned.toUpperCase();
  }
  if (/^#[0-9a-fA-F]{3}$/.test(cleaned)) {
    const r = cleaned[1];
    const g = cleaned[2];
    const b = cleaned[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return fallback.toUpperCase();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const norm = normalizeHexColor(hex);
  const num = parseInt(norm.slice(1), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function getRelativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const toLinear = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Computes WCAG-safe highlight styles so any user-chosen brand hex color remains
 * vibrant and legible in both Light Mode and Dark Mode across blog ads and the Sponsor Ticker.
 */
export function getBrandHighlightStyles(rawColor?: string | null) {
  const hex = normalizeHexColor(rawColor, DEFAULT_BRAND_HIGHLIGHT_COLOR);
  const rgb = hexToRgb(hex);
  const lum = getRelativeLuminance(rgb);
  const isLightFill = lum > 0.45;
  const isVeryDark = lum < 0.06;
  const contrastText = isLightFill ? '#0F172A' : '#FFFFFF';

  const rgba = (alpha: number) => `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;

  // For readable tinted text on white cards when user selects a very bright yellow/lime,
  // darken RGB channels slightly so text stays in the exact same hue family without washing out.
  const darkenFactor = isLightFill ? 0.58 : 1;
  const lightSurfaceText = `rgb(${Math.round(rgb.r * darkenFactor)}, ${Math.round(
    rgb.g * darkenFactor
  )}, ${Math.round(rgb.b * darkenFactor)})`;

  return {
    hex,
    rgb,
    luminance: lum,
    isLightFill,
    isVeryDark,
    contrastText,
    pillStyle: {
      backgroundColor: hex,
      color: contrastText,
      borderColor: isVeryDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(15, 23, 42, 0.12)',
    } as React.CSSProperties,
    softBadgeStyle: {
      backgroundColor: rgba(0.14),
      color: lightSurfaceText,
      borderColor: rgba(0.32),
    } as React.CSSProperties,
    ctaButtonStyle: {
      backgroundColor: hex,
      color: contrastText,
      borderColor: isVeryDark ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
    } as React.CSSProperties,
    accentBarStyle: {
      backgroundColor: hex,
    } as React.CSSProperties,
    iconBoxStyle: {
      backgroundColor: rgba(0.12),
      borderColor: rgba(0.32),
      color: lightSurfaceText,
    } as React.CSSProperties,
    tintBg: rgba(0.12),
    tintBorder: rgba(0.32),
  };
}
