/**
 * Utility functions for normalizing and safely navigating to destination URLs
 * across web, mobile, and sandboxed iframe environments.
 */

export const normalizeDestinationUrl = (url?: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return '';
  
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:')
  ) {
    return trimmed;
  }
  if (trimmed.startsWith('#') || trimmed.startsWith('/')) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

export const safeOpenDestinationUrl = (
  rawUrl?: string,
  onNavigateInternal?: (tabId: string) => void
): void => {
  if (!rawUrl) return;
  const target = normalizeDestinationUrl(rawUrl);
  if (!target) return;

  // Internal hash navigation (e.g., #home, #league, #arena)
  if (target.startsWith('#')) {
    const tabId = target.replace('#', '').toLowerCase();
    if (onNavigateInternal) {
      onNavigateInternal(tabId);
    } else {
      window.location.hash = target;
    }
    return;
  }

  // Internal relative path
  if (target.startsWith('/')) {
    window.location.href = target;
    return;
  }

  // External website:
  // In sandboxed iframes (e.g., AI Studio preview) or mobile browsers with popup blockers,
  // window.open may return null or be blocked.
  // We first attempt window.open to open in a new tab without restrictive feature strings.
  // If that fails or is blocked, we fall back to top/current window navigation to guarantee the user reaches the website.
  let opened: Window | null = null;
  try {
    opened = window.open(target, '_blank');
  } catch {
    opened = null;
  }

  if (!opened || opened.closed || typeof opened.closed === 'undefined') {
    try {
      if (window.top && window.top !== window) {
        window.top.location.href = target;
      } else {
        window.location.href = target;
      }
    } catch {
      window.location.href = target;
    }
  }
};
