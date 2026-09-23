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
  onCredentialReceived?: (credential: string) => void
): Promise<string | null> => {
  if (typeof window === 'undefined') return null;

  // Skip in iframes where FedCM is blocked by Chromium permissions policy
  if (window.self !== window.top) {
    return null;
  }

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
            console.log('[Google GIS] Credential received from in-app selection');
            if (onCredentialReceived) {
              onCredentialReceived(response.credential);
            }
            safeResolve(response.credential);
          } else {
            console.warn('[Google GIS] Empty response callback');
            safeResolve(null);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: false,
      });

      google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed?.()) {
          const reason =
            notification.getNotDisplayedReason?.() || 'not_displayed';
          console.log('[Google GIS Not Displayed]:', reason);
          safeResolve(null);
        } else if (notification.isSkippedMoment?.()) {
          const reason =
            notification.getSkippedReason?.() || 'skipped';
          console.log('[Google GIS Skipped]:', reason);
          if (reason === 'user_cancel' || reason === 'tap_outside') {
            safeResolve('USER_CANCELLED');
          }
        } else if (notification.isDismissedMoment?.()) {
          const reason =
            notification.getDismissedReason?.() || 'dismissed';
          console.log('[Google GIS Dismissed]:', reason);
          // If reason is credential_returned, do NOT resolve null because callback is processing the JWT
          if (reason === 'credential_returned') {
            return;
          }
          if (reason === 'user_cancel' || reason === 'tap_outside') {
            safeResolve('USER_CANCELLED');
          }
        }
      });

      // Allow ample time (120s) for user to review and tap their account
      setTimeout(() => {
        safeResolve(null);
      }, 120000);
    } catch (e) {
      console.warn('[Google GIS Init Error]:', e);
      safeResolve(null);
    }
  });
};
