import { db, doc, getDoc, setDoc, onSnapshot } from './firebase';

export interface ContactSupportConfig {
  whatsappNumber: string;
  whatsappLabel?: string;
  whatsappDescription?: string;
  whatsappDefaultMessage: string;
  whatsappEnabled: boolean;

  supportEmail: string;
  emailLabel?: string;
  emailDescription?: string;
  emailSubject: string;
  emailEnabled: boolean;

  phoneNumber: string;
  phoneLabel?: string;
  phoneDescription?: string;
  phoneCallEnabled: boolean;

  telegramUsername?: string;
  telegramLabel?: string;
  telegramDescription?: string;
  telegramEnabled: boolean;

  workingHours: string;
  responseTimeNote: string;
  updatedAt?: number;
  updatedBy?: string;
}

export const DEFAULT_CONTACT_SUPPORT_CONFIG: ContactSupportConfig = {
  whatsappNumber: '+2348030000000',
  whatsappLabel: 'Chat on WhatsApp',
  whatsappDescription: 'Connect directly with our 24/7 student support desk on WhatsApp.',
  whatsappDefaultMessage: 'Hello Grobaax Support, I need assistance with my account.',
  whatsappEnabled: true,

  supportEmail: 'grobaxycompany@gmail.com',
  emailLabel: 'Email Support Desk',
  emailDescription: 'Send an inquiry or formal ticket to our official inbox.',
  emailSubject: 'Grobaax Support & Scholar Inquiry',
  emailEnabled: true,

  phoneNumber: '+2348030000000',
  phoneLabel: 'Direct Support Line',
  phoneDescription: 'Direct telephone line for urgent scholar support and inquiries.',
  phoneCallEnabled: true,

  telegramUsername: 'grobaax_support',
  telegramLabel: 'Telegram Support Channel',
  telegramDescription: 'Connect with community moderators and support reps on Telegram.',
  telegramEnabled: true,

  workingHours: 'Monday – Saturday: 8:00 AM – 9:00 PM WAT',
  responseTimeNote: 'Online Now • WhatsApp replies usually in ~2 minutes',
  updatedAt: Date.now(),
  updatedBy: 'System Default',
};

const LOCAL_STORAGE_KEY = 'grobax_contact_support_config';

export function getCachedContactSupportConfig(): ContactSupportConfig {
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      return { ...DEFAULT_CONTACT_SUPPORT_CONFIG, ...JSON.parse(cached) };
    }
  } catch {}
  return DEFAULT_CONTACT_SUPPORT_CONFIG;
}

/**
 * Real-time subscription to Contact Support Channels configured by Admin
 */
export function subscribeContactSupportConfig(
  callback: (config: ContactSupportConfig) => void
): () => void {
  // Emit local cache immediately
  callback(getCachedContactSupportConfig());

  // Listen to in-window instant broadcast
  const handleLocalUpdate = (e: any) => {
    if (e?.detail) {
      callback(e.detail);
    }
  };
  const handleStorage = (e: StorageEvent) => {
    if (e.key === LOCAL_STORAGE_KEY && e.newValue) {
      try {
        callback({ ...DEFAULT_CONTACT_SUPPORT_CONFIG, ...JSON.parse(e.newValue) });
      } catch {}
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('grobaax_contact_support_updated', handleLocalUpdate);
    window.addEventListener('storage', handleStorage);
  }

  let unsubscribeSnapshot = () => {};

  try {
    const docRef = doc(db, 'system_settings', 'contact_support');
    unsubscribeSnapshot = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap && typeof docSnap.exists === 'function' && docSnap.exists()) {
          const data = docSnap.data() as ContactSupportConfig;
          if (data && typeof data === 'object') {
            const merged: ContactSupportConfig = {
              ...DEFAULT_CONTACT_SUPPORT_CONFIG,
              ...getCachedContactSupportConfig(),
              ...data,
            };
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
            } catch {}
            callback(merged);
          }
        } else {
          // Initialize if document does not exist yet by publishing the active local cached config
          const cached = getCachedContactSupportConfig();
          setDoc(docRef, cached, { merge: true }).catch(() => {});
          callback(cached);
        }
      },
      (err) => {
        console.warn('Contact support config snapshot notice:', err);
        callback(getCachedContactSupportConfig());
      }
    );
  } catch (err) {
    console.warn('Contact support subscription error:', err);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('grobaax_contact_support_updated', handleLocalUpdate);
      window.removeEventListener('storage', handleStorage);
    }
    try {
      unsubscribeSnapshot();
    } catch {}
  };
}

/**
 * Admin: Update Contact Support Channels
 */
export async function updateContactSupportConfig(
  updates: Partial<ContactSupportConfig>,
  updatedBy?: string
): Promise<ContactSupportConfig> {
  const current = getCachedContactSupportConfig();
  const updated: ContactSupportConfig = {
    ...current,
    ...updates,
    updatedAt: Date.now(),
    updatedBy: updatedBy || 'Grobaax Admin',
  };

  // 1. Immediately update local storage so student & admin screens reflect instantly
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  // 2. Dispatch custom in-window event for 0ms latency UI updates
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('grobaax_contact_support_updated', { detail: updated })
      );
    } catch {}
  }

  // 3. Persist to primary system_settings collection
  try {
    const docRef = doc(db, 'system_settings', 'contact_support');
    await setDoc(docRef, updated, { merge: true });
  } catch (err) {
    console.warn('Could not save contact support config to system_settings/contact_support, local updated:', err);
  }

  // 4. Secondary fallback write to settings collection
  try {
    const backupRef = doc(db, 'settings', 'contact_support');
    await setDoc(backupRef, updated, { merge: true });
  } catch (err) {
    console.warn('Could not save contact support config to settings/contact_support backup:', err);
  }

  return updated;
}

/**
 * Format & clean Nigerian phone number for WhatsApp wa.me link
 */
export function formatPhoneForWhatsApp(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('0') && digits.length === 11) {
    return '234' + digits.substring(1);
  }
  if (digits.startsWith('234')) {
    return digits;
  }
  return digits;
}

export function buildWhatsAppLink(phone: string, customMessage?: string): string {
  const clean = formatPhoneForWhatsApp(phone);
  const text = encodeURIComponent(customMessage || 'Hello Grobaax Support, I would like to get in touch.');
  return `https://wa.me/${clean}?text=${text}`;
}

export function buildMailtoLink(email: string, subject?: string, body?: string): string {
  const s = encodeURIComponent(subject || 'Grobaax Support Request');
  const b = body ? `&body=${encodeURIComponent(body)}` : '';
  return `mailto:${email}?subject=${s}${b}`;
}

export function buildTelLink(phone: string): string {
  const clean = phone.replace(/[^0-9+]/g, '');
  return `tel:${clean}`;
}

export function buildTelegramLink(usernameOrLink: string): string {
  if (!usernameOrLink) return '';
  if (usernameOrLink.startsWith('http://') || usernameOrLink.startsWith('https://')) {
    return usernameOrLink;
  }
  const clean = usernameOrLink.replace(/^@/, '').trim();
  return `https://t.me/${clean}`;
}
