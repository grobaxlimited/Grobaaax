// Google Identity Services (GIS) & PWA Google Sign-In Helper
// Enables native one-tap bottom sheet account selection and clean token exchange

export const GOOGLE_CLIENT_ID =
  (typeof process !== 'undefined' && process?.env?.VITE_GOOGLE_CLIENT_ID) ||
  '730355558575-mhk1q5bao6mndkqao7me5iu3rhvk8tk7.apps.googleusercontent.com';

let isScriptLoaded = false;
let isInitializing = false;

/**
 * Ensures Google Identity Services (GSI) client script is loaded in the document.
 * In iframe environments where 'identity-credentials-get' is not delegated, GSI is skipped.
 */
export const loadGoogleIdentityScript = (): Promise<boolean> => {
  if (typeof window === 'undefined') return Promise.resolve(false);

  // In iframe environments (e.g. preview/dev tool), FedCM / GSI prompts are disallowed by browser permissions
  if (window.self !== window.top) {
    return Promise.resolve(false);
  }

  // Check if browser explicitly disallows identity-credentials-get
  try {
    const policy = (document as any).permissionsPolicy || (document as any).featurePolicy;
    if (policy && typeof policy.allowsFeature === 'function') {
      if (!policy.allowsFeature('identity-credentials-get')) {
        return Promise.resolve(false);
      }
    }
  } catch (_) {}

  if ((window as any).google?.accounts?.id) {
    isScriptLoaded = true;
    return Promise.resolve(true);
  }

  if (document.getElementById('gsi-client-script')) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if ((window as any).google?.accounts?.id) {
          clearInterval(checkInterval);
          isScriptLoaded = true;
          resolve(true);
        }
      }, 100);
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(Boolean((window as any).google?.accounts?.id));
      }, 5000);
    });
  }

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.id = 'gsi-client-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      isScriptLoaded = true;
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.head.appendChild(script);
  });
};

/**
 * Prompts Google One Tap if supported in the browser / PWA context.
 * Returns ID token (JWT) if selected by user, or null if dismissed/unavailable.
 */
export const promptGoogleOneTap = async (
  _onCredentialReceived?: (credential: string) => void
): Promise<string | null> => {
  // Bypassed: Use standard Google OAuth accounts chooser ("whitish" standard flow)
  return null;
};
