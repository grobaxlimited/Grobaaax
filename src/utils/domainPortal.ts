export const CORPORATE_PORTAL_HOST = 'advertise.grobaax.com';
export const CORPORATE_PORTAL_ORIGIN = 'https://advertise.grobaax.com';
export const CORPORATE_APPLY_URL = 'https://advertise.grobaax.com/apply';
export const CORPORATE_LOGIN_URL = 'https://advertise.grobaax.com/login';
export const CORPORATE_DASHBOARD_URL = 'https://advertise.grobaax.com/dashboard';

export type CorporatePortalRoute = 'landing' | 'apply' | 'login' | 'dashboard';

/**
 * Determines whether the visitor hostname maps to the standalone
 * Grobaax Corporate Advertising subdomain (advertise.grobaax.com).
 * Main student domains (grobaax.com, www.grobaax.com) and preview/local
 * hosts continue rendering the existing student application.
 */
export function isCorporateAdvertisingHostname(hostname?: string): boolean {
  const rawHost =
    hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '');
  const normalized = rawHost
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '')
    .replace(/\.$/, '');
  return normalized === CORPORATE_PORTAL_HOST;
}

/**
 * Determines whether the visitor is accessing the Grobaax Corporate Advertising Portal,
 * either via the dedicated subdomain (advertise.grobaax.com) or via /advertise* on preview/local hosts.
 */
export function isCorporateAdvertisingDomain(
  hostname?: string,
  pathname?: string
): boolean {
  if (isCorporateAdvertisingHostname(hostname)) {
    return true;
  }
  const rawPath =
    pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
  const normalizedPath = rawPath.trim().toLowerCase().replace(/\/+$/, '') || '/';
  return normalizedPath === '/advertise' || normalizedPath.startsWith('/advertise/');
}

/**
 * Returns the destination URL for the Brand Promotion CTA:
 * - On live production student domains (grobaax.com / www.grobaax.com): https://advertise.grobaax.com
 * - On preview/local hosts: /advertise so the Corporate Advertising Portal loads cleanly in-app
 */
export function getBrandPromotionPortalHref(hostname?: string): string {
  const rawHost =
    hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '');
  const normalized = rawHost
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '')
    .replace(/\.$/, '');
  if (normalized === 'grobaax.com' || normalized === 'www.grobaax.com') {
    return CORPORATE_PORTAL_ORIGIN;
  }
  return '/advertise';
}

/**
 * Resolves the active path within the Corporate Advertising portal so that
 * direct visits and browser refreshes on /, /apply, /login, and /dashboard
 * (or /advertise, /advertise/apply, etc.) render cleanly.
 */
export function getCorporatePortalRoute(pathname?: string): CorporatePortalRoute {
  const rawPath =
    pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
  let normalized = rawPath.trim().toLowerCase().replace(/\/+$/, '') || '/';

  if (normalized === '/advertise') {
    normalized = '/';
  } else if (normalized.startsWith('/advertise/')) {
    normalized = normalized.slice('/advertise'.length) || '/';
  }

  if (normalized === '/apply') {
    return 'apply';
  }
  if (normalized === '/login') {
    return 'login';
  }
  if (normalized === '/dashboard') {
    return 'dashboard';
  }
  return 'landing';
}
