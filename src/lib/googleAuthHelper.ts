// Google Identity Services (GIS) & PWA Google Sign-In Helper
// Enables native one-tap bottom sheet account selection and clean token exchange

export const GOOGLE_CLIENT_ID =
  (typeof process !== 'undefined' && process?.env?.VITE_GOOGLE_CLIENT_ID) ||
  '730355558575-mhk1q5bao6mndkqao7me5iu3rhvk8tk7.apps.googleusercontent.com';

let isScriptLoaded = false;
let isInitializing = false;

/**
 * Ensures Google Identity Services (GSI) client script is loaded in the document
 */
export const loadGoogleIdentityScript = (): Promise<boolean> => {
  if (typeof window === 'undefined') return Promise.resolve(false);
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
 * Prompts Google One Tap if supported in the browser / PWA context
 * Returns ID token (JWT) if selected by user, or null if dismissed/unavailable
 */
export const promptGoogleOneTap = async (
  onCredentialReceived?: (credential: string) => void
): Promise<string | null> => {
  if (typeof window === 'undefined') return null;

  const loaded = await loadGoogleIdentityScript();
  if (!loaded) return null;

  const google = (window as any).google;
  if (!google?.accounts?.id) return null;

  return new Promise((resolve) => {
    let resolved = false;

    const safeResolve = (token: string | null) => {
      if (!resolved) {
        resolved = true;
        resolve(token);
      }
    };

    try {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response: any) => {
          if (response?.credential) {
            if (onCredentialReceived) {
              onCredentialReceived(response.credential);
            }
            safeResolve(response.credential);
          } else {
            safeResolve(null);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
          const reason =
            notification.getNotDisplayedReason?.() ||
            notification.getSkippedReason?.() ||
            'GIS prompt skipped';
          console.log('[Google GIS Notice]:', reason);
          safeResolve(null);
        } else if (notification.isDismissedMoment?.()) {
          console.log('[Google GIS Dismissed]:', notification.getDismissedReason?.());
          safeResolve(null);
        }
      });

      // Safety timeout after 10s of inactivity
      setTimeout(() => {
        safeResolve(null);
      }, 10000);
    } catch (e) {
      console.warn('[Google GIS Init Error]:', e);
      safeResolve(null);
    }
  });
};
