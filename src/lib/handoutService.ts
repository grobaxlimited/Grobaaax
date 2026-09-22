import { jsPDF } from 'jspdf';
import {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  arrayUnion,
} from './firebase';
import {
  GeneratedHandout,
  HandoutDailyLimitConfig,
  HandoutUserQuotaInfo,
  HandoutAdminStats,
  HandoutInstitutionCategory,
} from '../types';

const HANDOUT_SETTINGS_DOC = 'handout_library_settings/config';
const USER_HANDOUTS_COLLECTION = 'user_handouts';
const USER_HANDOUT_USAGE_COLLECTION = 'user_handout_usage';

export const DEFAULT_HANDOUT_SETTINGS: HandoutDailyLimitConfig = {
  freeDailyLimit: 2,
  premiumDailyLimit: 30,
  vipDailyLimit: 'unlimited',
  updatedAt: new Date().toISOString(),
  updatedBy: 'System Default',
};

export const DEFAULT_ADMIN_STATS: HandoutAdminStats = {
  totalGenerated: 0,
  generatedToday: 0,
  generatedThisMonth: 0,
  freeGenerations: 0,
  premiumGenerations: 0,
  vipGenerations: 0,
  lastUpdated: new Date().toISOString(),
};

/**
 * Get date key formatted in Nigeria WAT (UTC+1) / standard ISO YYYY-MM-DD
 */
export function getHandoutDateKey(d: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Lagos',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return d.toISOString().split('T')[0];
  }
}

/**
 * Determine daily limit based on user subscription tier
 */
export function getLimitForHandoutTier(
  tier: 'free' | 'premium' | 'vip',
  settings?: HandoutDailyLimitConfig
): number | 'unlimited' {
  const cfg = settings || DEFAULT_HANDOUT_SETTINGS;
  if (tier === 'vip') {
    return cfg.vipDailyLimit === 'unlimited' ? 'unlimited' : Math.max(1, Number(cfg.vipDailyLimit) || 100);
  }
  if (tier === 'premium') {
    return Math.max(1, Number(cfg.premiumDailyLimit) || 30);
  }
  return Math.max(1, Number(cfg.freeDailyLimit) || 2);
}

/**
 * Record a successful handout generation in Firestore & LocalStorage
 */
export async function recordHandoutGenerationUsage(
  userId: string,
  tier: 'free' | 'premium' | 'vip',
  topic?: string
): Promise<HandoutUserQuotaInfo> {
  const dateKey = getHandoutDateKey();
  const docId = `${userId}_${dateKey}`;
  const localKey = `grobax_handout_usage_${userId}_${dateKey}`;

  // 1. Read existing local count
  let localCount = 0;
  try {
    const cached = localStorage.getItem(localKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.dateKey === dateKey) {
        localCount = Math.max(0, Number(parsed.count) || 0);
      }
    }
  } catch {}

  const newCount = localCount + 1;

  // 2. Optimistic write to LocalStorage
  try {
    localStorage.setItem(
      localKey,
      JSON.stringify({
        userId,
        dateKey,
        count: newCount,
        tier,
        lastGeneratedAt: new Date().toISOString(),
        recentTopic: topic || '',
      })
    );
  } catch {}

  // 3. Persist to Firestore
  let firestoreCount = newCount;
  try {
    const usageRef = doc(db, USER_HANDOUT_USAGE_COLLECTION, docId);
    const snap = await getDoc(usageRef);
    if (snap.exists()) {
      const data = snap.data();
      firestoreCount = Math.max(newCount, (Number(data.count) || 0) + 1);
    }

    const payload: any = {
      userId,
      dateKey,
      count: firestoreCount,
      tier,
      lastGeneratedAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    };
    if (topic) {
      payload.recentTopics = arrayUnion(topic);
    }

    await setDoc(usageRef, payload, { merge: true });

    // Sync back to local storage if Firestore had higher
    if (firestoreCount > newCount) {
      try {
        localStorage.setItem(
          localKey,
          JSON.stringify({
            userId,
            dateKey,
            count: firestoreCount,
            tier,
            lastGeneratedAt: new Date().toISOString(),
            recentTopic: topic || '',
          })
        );
      } catch {}
    }
  } catch (err) {
    console.warn('[Handout Service] Firestore usage save warning:', err);
  }

  const authoritativeCount = Math.max(newCount, firestoreCount);
  const dailyLimit = getLimitForHandoutTier(tier);
  const remaining = dailyLimit === 'unlimited' ? 'unlimited' : Math.max(0, dailyLimit - authoritativeCount);
  const canGenerate = dailyLimit === 'unlimited' ? true : authoritativeCount < dailyLimit;

  return {
    tier,
    todayCount: authoritativeCount,
    dailyLimit,
    remaining,
    canGenerate,
    dateKey,
  };
}

/**
 * Fetch current user daily generation quota from Firestore, Server & LocalStorage
 */
export async function fetchUserHandoutQuota(
  userId: string,
  tier: 'free' | 'premium' | 'vip' = 'free',
  subscriptionExpiry?: string | null
): Promise<HandoutUserQuotaInfo> {
  const dateKey = getHandoutDateKey();
  const docId = `${userId}_${dateKey}`;
  const localKey = `grobax_handout_usage_${userId}_${dateKey}`;

  // 1. Read local storage cache
  let localCount = 0;
  try {
    const cached = localStorage.getItem(localKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.dateKey === dateKey) {
        localCount = Math.max(0, Number(parsed.count) || 0);
      }
    }
  } catch {}

  // 2. Read from Firestore
  let firestoreCount = 0;
  try {
    const snap = await getDoc(doc(db, USER_HANDOUT_USAGE_COLLECTION, docId));
    if (snap.exists()) {
      const data = snap.data();
      firestoreCount = Math.max(0, Number(data.count) || 0);
    }
  } catch (err) {
    console.warn('[Handout Service] Firestore quota read notice:', err);
  }

  // 3. Query Server API
  let serverCount = 0;
  let serverQuota: HandoutUserQuotaInfo | null = null;
  const knownCountSoFar = Math.max(firestoreCount, localCount);

  try {
    const expiryParam = subscriptionExpiry ? `&subscriptionExpiry=${encodeURIComponent(subscriptionExpiry)}` : '';
    const res = await fetch(
      `/api/library/quota?userId=${encodeURIComponent(userId)}&tier=${encodeURIComponent(tier)}${expiryParam}&todayCount=${knownCountSoFar}`
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.quota) {
        serverQuota = data.quota;
        serverCount = Math.max(0, Number(data.quota.todayCount) || 0);
      }
    }
  } catch (err) {
    console.warn('[Handout Service] Could not fetch server quota, using Firestore/local count:', err);
  }

  // Authoritative count is the highest recorded usage across all storages
  const authoritativeCount = Math.max(serverCount, firestoreCount, localCount);

  // Sync to local cache if changed
  if (authoritativeCount > localCount) {
    try {
      localStorage.setItem(
        localKey,
        JSON.stringify({
          userId,
          dateKey,
          count: authoritativeCount,
          tier,
          lastGeneratedAt: new Date().toISOString(),
        })
      );
    } catch {}
  }

  const dailyLimit = serverQuota?.dailyLimit || getLimitForHandoutTier(tier);
  const remaining = dailyLimit === 'unlimited' ? 'unlimited' : Math.max(0, dailyLimit - authoritativeCount);
  const canGenerate = dailyLimit === 'unlimited' ? true : authoritativeCount < dailyLimit;

  return {
    tier,
    todayCount: authoritativeCount,
    dailyLimit,
    remaining,
    canGenerate,
    dateKey,
  };
}

/**
 * Fetch global handout library settings
 */
export async function fetchHandoutSettings(): Promise<HandoutDailyLimitConfig> {
  // 1. Try server API
  try {
    const res = await fetch('/api/library/settings');
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.settings) {
        return data.settings;
      }
    }
  } catch {}

  // 2. Try Firestore fallback
  try {
    const snap = await getDoc(doc(db, HANDOUT_SETTINGS_DOC));
    if (snap.exists()) {
      return { ...DEFAULT_HANDOUT_SETTINGS, ...snap.data() } as HandoutDailyLimitConfig;
    }
  } catch {}

  // 3. Try LocalStorage
  try {
    const saved = localStorage.getItem('grobax_handout_settings');
    if (saved) return JSON.parse(saved);
  } catch {}

  return DEFAULT_HANDOUT_SETTINGS;
}

/**
 * Save global handout library settings (Admin)
 */
export async function saveHandoutSettings(
  settings: Partial<HandoutDailyLimitConfig>,
  updatedBy: string = 'Super Admin'
): Promise<HandoutDailyLimitConfig> {
  const payload: HandoutDailyLimitConfig = {
    freeDailyLimit: Math.max(1, Number(settings.freeDailyLimit) || 2),
    premiumDailyLimit: Math.max(1, Number(settings.premiumDailyLimit) || 30),
    vipDailyLimit: settings.vipDailyLimit === 'unlimited' ? 'unlimited' : Math.max(1, Number(settings.vipDailyLimit) || 50),
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  // 1. Send to server
  try {
    await fetch('/api/library/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('[Handout Service] Could not update server settings directly:', err);
  }

  // 2. Persist to Firestore
  try {
    await setDoc(doc(db, HANDOUT_SETTINGS_DOC), payload, { merge: true });
  } catch (err) {
    console.warn('[Handout Service] Firestore settings sync notice:', err);
  }

  // 3. LocalStorage
  try {
    localStorage.setItem('grobax_handout_settings', JSON.stringify(payload));
  } catch {}

  return payload;
}

/**
 * Fetch Admin Handout Usage Stats
 */
export async function fetchHandoutAdminStats(): Promise<HandoutAdminStats> {
  try {
    const res = await fetch('/api/library/stats');
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.stats) {
        return data.stats;
      }
    }
  } catch (err) {
    console.warn('[Handout Service] Error fetching server stats:', err);
  }

  return DEFAULT_ADMIN_STATS;
}

/**
 * Call Server-side Real Gemini API to generate handout
 */
export async function generateHandoutViaApi(params: {
  userId: string;
  userEmail?: string;
  userDisplayName?: string;
  tier: 'free' | 'premium' | 'vip';
  subscriptionExpiry?: string | null;
  institutionType: HandoutInstitutionCategory;
  institution: string;
  faculty: string;
  department: string;
  level: string;
  course: string;
  topic: string;
  additionalInstruction?: string;
}): Promise<{
  success: boolean;
  handout?: GeneratedHandout;
  quota?: HandoutUserQuotaInfo;
  error?: string;
  limitReached?: boolean;
}> {
  try {
    // 1. Quota Pre-Check: Prevent unnecessary generation if user has reached daily allowance
    const currentQuota = await fetchUserHandoutQuota(
      params.userId,
      params.tier,
      params.subscriptionExpiry
    );

    if (!currentQuota.canGenerate) {
      const upgradeMsg =
        params.tier === 'free'
          ? 'You have used your 2 free AI handouts for today. Upgrade to Premium to generate up to 30 handouts daily, or VIP for unlimited access.'
          : 'You have reached your daily allowance of 30 handouts for today. Upgrade to VIP for unlimited handout generations.';
      return {
        success: false,
        limitReached: true,
        error: upgradeMsg,
        quota: currentQuota,
      };
    }

    // 2. Call backend generation endpoint with synchronized count
    const res = await fetch('/api/library/generate-handout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        currentKnownTodayCount: currentQuota.todayCount,
      }),
    });

    let data: any = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        data = await res.json();
      } catch (jsonErr) {
        console.warn('[Handout Service] Failed to parse JSON response:', jsonErr);
      }
    } else {
      const rawText = await res.text();
      try {
        data = JSON.parse(rawText);
      } catch {
        // The server or gateway returned HTML or non-JSON
        data = null;
      }
    }

    if (!data || !res.ok || !data.success) {
      return {
        success: false,
        error:
          data?.error ||
          'The AI academic service is temporarily busy. Your daily allowance was not deducted. Please try again.',
        limitReached: Boolean(data?.limitReached),
        quota: data?.quota || currentQuota,
      };
    }

    const handout: GeneratedHandout = data.handout;

    // 3. Increment & save usage in Firestore and localStorage immediately
    const updatedQuota = await recordHandoutGenerationUsage(
      params.userId,
      params.tier,
      handout.topic
    );

    // 4. Save handout to Firestore & local cache
    await saveGeneratedHandoutToUserStore(params.userId, handout);

    return {
      success: true,
      handout,
      quota: updatedQuota || data.quota,
    };
  } catch (err: any) {
    console.error('[Handout Service] Generate request network error:', err);
    return {
      success: false,
      error: err?.message || 'Network error communicating with the AI handout service. Please try again.',
    };
  }
}

/**
 * Save handout to user's private library in Firestore & localStorage
 */
export async function saveGeneratedHandoutToUserStore(
  userId: string,
  handout: GeneratedHandout
): Promise<void> {
  if (!userId || !handout || !handout.id) return;

  // 1. Cache in localStorage for immediate offline retrieval
  try {
    const cacheKey = `grobax_user_handouts_${userId}`;
    const raw = localStorage.getItem(cacheKey);
    const existing: GeneratedHandout[] = raw ? JSON.parse(raw) : [];
    const updated = [handout, ...existing.filter((h) => h.id !== handout.id)].slice(0, 100);
    localStorage.setItem(cacheKey, JSON.stringify(updated));
  } catch (e) {
    console.warn('[Handout Service] Local cache write warning:', e);
  }

  // 2. Persist to Firestore
  try {
    await setDoc(doc(db, USER_HANDOUTS_COLLECTION, handout.id), {
      ...handout,
      userId,
      savedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[Handout Service] Firestore handout save warning:', err);
  }
}

/**
 * Fetch all saved handouts belonging strictly to this user
 */
export async function fetchUserGeneratedHandouts(userId: string): Promise<GeneratedHandout[]> {
  if (!userId) return [];

  const cacheKey = `grobax_user_handouts_${userId}`;
  let localHandouts: GeneratedHandout[] = [];

  // Read local cache first
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      localHandouts = JSON.parse(raw);
    }
  } catch {}

  // Fetch from Firestore
  try {
    const q = query(
      collection(db, USER_HANDOUTS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const snapshot = await getDocs(q);
    const remoteHandouts: GeneratedHandout[] = [];

    snapshot.forEach((docSnap) => {
      remoteHandouts.push(docSnap.data() as GeneratedHandout);
    });

    if (remoteHandouts.length > 0) {
      // Merge unique by ID
      const map = new Map<string, GeneratedHandout>();
      [...remoteHandouts, ...localHandouts].forEach((h) => {
        if (h && h.id) map.set(h.id, h);
      });

      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      try {
        localStorage.setItem(cacheKey, JSON.stringify(merged));
      } catch {}

      return merged;
    }
  } catch (err) {
    console.warn('[Handout Service] Firestore fetch handouts notice:', err);
  }

  return localHandouts;
}

/**
 * Delete a user's generated handout
 */
export async function deleteUserGeneratedHandout(userId: string, handoutId: string): Promise<boolean> {
  if (!userId || !handoutId) return false;

  // Remove from local cache
  try {
    const cacheKey = `grobax_user_handouts_${userId}`;
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const parsed: GeneratedHandout[] = JSON.parse(raw);
      const filtered = parsed.filter((h) => h.id !== handoutId);
      localStorage.setItem(cacheKey, JSON.stringify(filtered));
    }
  } catch {}

  // Remove from Firestore
  try {
    await deleteDoc(doc(db, USER_HANDOUTS_COLLECTION, handoutId));
    return true;
  } catch (err) {
    console.warn('[Handout Service] Firestore delete handout error:', err);
    return true;
  }
}

/**
 * Export Generated Handout to a clean, professional academic PDF
 */
export function exportHandoutToPdf(handout: GeneratedHandout): void {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;
    let y = 18;

    const checkPageBreak = (spaceNeeded: number) => {
      if (y + spaceNeeded > 275) {
        doc.addPage();
        y = 18;
      }
    };

    // Header Banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(margin, y, contentWidth, 22, 'F');

    doc.setTextColor(245, 158, 11); // amber-500
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('GROBAAX AI ACADEMIC HANDOUT LIBRARY', margin + 6, y + 7);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.text(handout.course, margin + 6, y + 15);

    y += 28;

    // Academic Metadata Table
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Institution: ${handout.institution} (${handout.institutionType})`, margin, y);
    y += 5;
    doc.text(`Faculty / Dept: ${handout.faculty} • ${handout.department}`, margin, y);
    y += 5;
    doc.text(`Level: ${handout.level} | Date: ${new Date(handout.createdAt).toLocaleDateString('en-GB')}`, margin, y);
    y += 8;

    // Title
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    const titleLines = doc.splitTextToSize(handout.title, contentWidth);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 7 + 4;

    // Topic subtitle
    doc.setTextColor(2, 132, 199); // sky-600
    doc.setFontSize(11);
    doc.text(`Topic: ${handout.topic}`, margin, y);
    y += 8;

    // Learning Objectives
    if (handout.learningObjectives && handout.learningObjectives.length > 0) {
      checkPageBreak(30);
      doc.setFillColor(241, 245, 249); // slate-100
      doc.roundedRect(margin, y, contentWidth, 6, 1, 1, 'F');
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('LEARNING OBJECTIVES', margin + 4, y + 4.5);
      y += 10;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      handout.learningObjectives.forEach((obj, idx) => {
        const lines = doc.splitTextToSize(`${idx + 1}. ${obj}`, contentWidth - 6);
        checkPageBreak(lines.length * 5 + 2);
        doc.text(lines, margin + 2, y);
        y += lines.length * 5 + 2;
      });
      y += 4;
    }

    // Introduction
    if (handout.introduction) {
      checkPageBreak(30);
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(margin, y, contentWidth, 6, 1, 1, 'F');
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('1. INTRODUCTION & THEORETICAL BACKGROUND', margin + 4, y + 4.5);
      y += 10;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      const introLines = doc.splitTextToSize(handout.introduction, contentWidth);
      checkPageBreak(introLines.length * 5 + 4);
      doc.text(introLines, margin, y);
      y += introLines.length * 5 + 6;
    }

    // Main Sections / Chapters
    if (handout.sections && handout.sections.length > 0) {
      handout.sections.forEach((sec, idx) => {
        checkPageBreak(35);
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(margin, y, contentWidth, 6, 1, 1, 'F');
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`${idx + 2}. ${sec.title.toUpperCase()}`, margin + 4, y + 4.5);
        y += 10;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(30, 41, 59);
        const contentLines = doc.splitTextToSize(sec.content, contentWidth);
        checkPageBreak(contentLines.length * 5 + 4);
        doc.text(contentLines, margin, y);
        y += contentLines.length * 5 + 4;

        // Bullet points
        if (sec.bulletPoints && sec.bulletPoints.length > 0) {
          sec.bulletPoints.forEach((bp) => {
            const bpLines = doc.splitTextToSize(`• ${bp}`, contentWidth - 4);
            checkPageBreak(bpLines.length * 4.5 + 2);
            doc.text(bpLines, margin + 4, y);
            y += bpLines.length * 4.5 + 2;
          });
          y += 2;
        }

        // Formulas
        if (sec.formulas && sec.formulas.length > 0) {
          sec.formulas.forEach((form) => {
            checkPageBreak(12);
            doc.setFillColor(248, 250, 252);
            doc.rect(margin + 4, y, contentWidth - 8, 8, 'F');
            doc.setFont('courier', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(2, 132, 199);
            doc.text(form, margin + 8, y + 5.5);
            y += 10;
          });
        }

        // Key takeaway
        if (sec.keyTakeaway) {
          checkPageBreak(12);
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8.5);
          doc.setTextColor(71, 85, 105);
          const tkLines = doc.splitTextToSize(`Key Takeaway: ${sec.keyTakeaway}`, contentWidth - 6);
          doc.text(tkLines, margin + 4, y);
          y += tkLines.length * 4.5 + 4;
        }
      });
    }

    // Important Definitions
    if (handout.importantDefinitions && handout.importantDefinitions.length > 0) {
      checkPageBreak(30);
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(margin, y, contentWidth, 6, 1, 1, 'F');
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('IMPORTANT ACADEMIC DEFINITIONS', margin + 4, y + 4.5);
      y += 10;

      handout.importantDefinitions.forEach((item) => {
        checkPageBreak(18);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(`• ${item.term}:`, margin + 2, y);
        y += 4.5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        const defLines = doc.splitTextToSize(item.definition, contentWidth - 8);
        doc.text(defLines, margin + 6, y);
        y += defLines.length * 4.5 + 4;
      });
    }

    // Worked Examples / Case Studies
    if (handout.relevantExamples && handout.relevantExamples.length > 0) {
      checkPageBreak(30);
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(margin, y, contentWidth, 6, 1, 1, 'F');
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('WORKED EXAMPLES & CASE SCENARIOS', margin + 4, y + 4.5);
      y += 10;

      handout.relevantExamples.forEach((ex, idx) => {
        checkPageBreak(25);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(180, 83, 9); // amber-700
        doc.text(`Example ${idx + 1}: ${ex.title}`, margin + 2, y);
        y += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        const scenLines = doc.splitTextToSize(`Problem: ${ex.scenarioOrProblem}`, contentWidth - 4);
        checkPageBreak(scenLines.length * 4.5 + 2);
        doc.text(scenLines, margin + 4, y);
        y += scenLines.length * 4.5 + 3;

        const solLines = doc.splitTextToSize(`Solution / Explanation:\n${ex.explanationOrSolution}`, contentWidth - 4);
        checkPageBreak(solLines.length * 4.5 + 4);
        doc.text(solLines, margin + 4, y);
        y += solLines.length * 4.5 + 6;
      });
    }

    // Summary
    if (handout.summary) {
      checkPageBreak(25);
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(margin, y, contentWidth, 6, 1, 1, 'F');
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('ACADEMIC SUMMARY', margin + 4, y + 4.5);
      y += 10;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      const sumLines = doc.splitTextToSize(handout.summary, contentWidth);
      checkPageBreak(sumLines.length * 5 + 4);
      doc.text(sumLines, margin, y);
      y += sumLines.length * 5 + 6;
    }

    // Self-Assessment & Review Questions
    if (handout.reviewQuestions && handout.reviewQuestions.length > 0) {
      checkPageBreak(30);
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(margin, y, contentWidth, 6, 1, 1, 'F');
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('SELF-ASSESSMENT & EXAM REVIEW QUESTIONS', margin + 4, y + 4.5);
      y += 10;

      handout.reviewQuestions.forEach((q, idx) => {
        checkPageBreak(20);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        const qLines = doc.splitTextToSize(`Q${idx + 1}: ${q.question}`, contentWidth - 4);
        doc.text(qLines, margin + 2, y);
        y += qLines.length * 4.5 + 2;

        if (q.modelAnswerOrHint) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8.5);
          doc.setTextColor(71, 85, 105);
          const hLines = doc.splitTextToSize(`Marking Scheme / Hint: ${q.modelAnswerOrHint}`, contentWidth - 6);
          checkPageBreak(hLines.length * 4 + 2);
          doc.text(hLines, margin + 4, y);
          y += hLines.length * 4 + 4;
        }
      });
    }

    // Footer on all pages
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Grobaax AI Handout Library • ${handout.course} • Page ${i} of ${totalPages}`,
        pageWidth / 2,
        287,
        { align: 'center' }
      );
    }

    const cleanFilename = `${handout.course.replace(/[^a-zA-Z0-9]/g, '_')}_${handout.topic.replace(/[^a-zA-Z0-9]/g, '_')}_Handout.pdf`;
    doc.save(cleanFilename);
  } catch (err) {
    console.error('[Handout Service] PDF export error:', err);
  }
}

/**
 * Copy full formatted academic handout to clipboard
 */
export async function copyHandoutToClipboard(handout: GeneratedHandout): Promise<boolean> {
  try {
    let text = `# ${handout.title.toUpperCase()}\n`;
    text += `Course: ${handout.course} | Level: ${handout.level}\n`;
    text += `Institution: ${handout.institution} (${handout.institutionType})\n`;
    text += `Faculty: ${handout.faculty} | Dept: ${handout.department}\n`;
    text += `Topic: ${handout.topic}\n\n`;

    text += `## LEARNING OBJECTIVES\n`;
    handout.learningObjectives.forEach((obj, idx) => {
      text += `${idx + 1}. ${obj}\n`;
    });
    text += `\n## INTRODUCTION\n${handout.introduction}\n\n`;

    handout.sections.forEach((sec, idx) => {
      text += `## ${idx + 1}. ${sec.title.toUpperCase()}\n${sec.content}\n\n`;
      if (sec.bulletPoints && sec.bulletPoints.length > 0) {
        sec.bulletPoints.forEach((bp) => {
          text += `- ${bp}\n`;
        });
        text += '\n';
      }
      if (sec.formulas && sec.formulas.length > 0) {
        sec.formulas.forEach((f) => {
          text += `Equation: ${f}\n`;
        });
        text += '\n';
      }
      if (sec.keyTakeaway) {
        text += `Key Takeaway: ${sec.keyTakeaway}\n\n`;
      }
    });

    if (handout.importantDefinitions.length > 0) {
      text += `## IMPORTANT DEFINITIONS\n`;
      handout.importantDefinitions.forEach((d) => {
        text += `* **${d.term}**: ${d.definition}\n`;
      });
      text += '\n';
    }

    if (handout.relevantExamples.length > 0) {
      text += `## WORKED EXAMPLES & CASE STUDIES\n`;
      handout.relevantExamples.forEach((ex, idx) => {
        text += `### Example ${idx + 1}: ${ex.title}\n`;
        text += `Problem: ${ex.scenarioOrProblem}\n`;
        text += `Solution: ${ex.explanationOrSolution}\n\n`;
      });
    }

    text += `## SUMMARY\n${handout.summary}\n\n`;

    if (handout.reviewQuestions.length > 0) {
      text += `## REVIEW QUESTIONS\n`;
      handout.reviewQuestions.forEach((q, idx) => {
        text += `${idx + 1}. ${q.question}\n`;
        if (q.modelAnswerOrHint) {
          text += `   Model Answer/Hint: ${q.modelAnswerOrHint}\n`;
        }
      });
    }

    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('[Handout Service] Copy text failed:', err);
    return false;
  }
}
