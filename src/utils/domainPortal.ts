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
export function isCorporateAdvertisingDomain(hostname?: string): boolean {
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
 * Resolves the active path within the Corporate Advertising portal so that
 * direct visits and browser refreshes on /, /apply, /login, and /dashboard render cleanly.
 */
export function getCorporatePortalRoute(pathname?: string): CorporatePortalRoute {
  const rawPath =
    pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
  const normalized = rawPath.trim().toLowerCase().replace(/\/+$/, '') || '/';

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
