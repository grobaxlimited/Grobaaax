import {
  CampusMembership,
  CampusConnectionRequest,
  CampusStudentCard,
  CampusFollowUser,
  CampusSkillCategory,
  UserProfile,
  InstitutionCategory,
} from '../types';
import {
  db,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  onSnapshot,
  addDoc,
  serverTimestamp,
  isSubscriptionExpired,
} from './firebase';
import { supabase } from './supabase';
import { DEFAULT_CAMPUS_SKILL_CATEGORIES } from '../data/campusSkillsData';

/**
 * ============================================================================
 * GROBAAX COMMUNITY CAMPUS SERVICE
 * ============================================================================
 * Direct Firestore-first service with robust offline / Vercel static support.
 * Handles academic student discovery, institutional isolation, WhatsApp
 * connection requests, subscription tier resolution, and blue verified badges.
 */

const CAMPUS_MEMBERSHIPS_COLLECTION = 'campus_memberships';
const CAMPUS_REQUESTS_COLLECTION = 'campus_connection_requests';

// Safe helper to obtain current user's Supabase Auth Bearer token for authenticated API calls
export async function getAuthBearerHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {}
  return headers;
}

// Safe helper to parse JSON from fetch responses without throwing SyntaxErrors
async function safeFetchJson<T = any>(url: string, options?: RequestInit): Promise<{ ok: boolean; data: T | null; status: number }> {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    if (!text) {
      return { ok: res.ok, data: null, status: res.status };
    }
    try {
      const data = JSON.parse(text);
      return { ok: res.ok, data, status: res.status };
    } catch {
      return { ok: res.ok, data: null, status: res.status };
    }
  } catch {
    return { ok: false, data: null, status: 0 };
  }
}

export function clearCampusStudentsCache() {
  _campusStudentsCache.clear();
}

export async function fetchCampusSkillCategories(): Promise<CampusSkillCategory[]> {
  try {
    const res = await safeFetchJson<{ success: boolean; categories?: CampusSkillCategory[] }>(
      '/api/campus/skills/categories'
    );
    if (res.ok && res.data?.success && Array.isArray(res.data.categories) && res.data.categories.length > 0) {
      return res.data.categories;
    }
  } catch {}

  try {
    const { data, error } = await supabase
      .from('campus_skill_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        groupName: row.group_name || 'General Skills',
        icon: row.icon || '✨',
        isActive: Boolean(row.is_active),
        sortOrder: Number(row.sort_order || 0),
      }));
    }
  } catch {}

  return DEFAULT_CAMPUS_SKILL_CATEGORIES;
}

export async function updateMyCampusSkills(params: {
  userId: string;
  skillIds: string[];
  skills: string[];
}): Promise<{ success: boolean; skills?: string[]; skillIds?: string[]; error?: string }> {
  try {
    const headers = await getAuthBearerHeaders();
    const res = await safeFetchJson<{
      success: boolean;
      skills?: string[];
      skillIds?: string[];
      error?: string;
    }>('/api/campus/skills', {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        skillIds: params.skillIds,
        skills: params.skills,
      }),
    });

    // Also update local Firestore profile & membership documents for real-time UI consistency
    try {
      await setDoc(
        doc(db, CAMPUS_MEMBERSHIPS_COLLECTION, params.userId),
        {
          skills: params.skills,
          skillIds: params.skillIds,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      await setDoc(
        doc(db, 'users', params.userId),
        {
          skills: params.skills,
          skillIds: params.skillIds,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch {}

    clearCampusStudentsCache();

    if (res.ok && res.data?.success) {
      return {
        success: true,
        skills: res.data.skills || params.skills,
        skillIds: res.data.skillIds || params.skillIds,
      };
    }

    if (res.status === 401 || res.status === 403) {
      return { success: false, error: res.data?.error || 'Authentication required to update skills.' };
    }

    return { success: true, skills: params.skills, skillIds: params.skillIds };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update skills.' };
  }
}

// Format phone number to clean E.164 (+234...)
export function formatCampusWhatsAppNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '+234' + cleaned.substring(1);
  } else if (!cleaned.startsWith('+') && cleaned.length === 10) {
    cleaned = '+234' + cleaned;
  } else if (!cleaned.startsWith('+') && cleaned.startsWith('234')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

// User subscription tier resolver - Strict & Accurate (Expired subscriptions automatically revert to Free)
export function resolveUserSubscriptionTier(user: any): 'free' | 'premium' | 'vip' {
  if (!user) return 'free';
  if (user.role === 'admin' || user.role === 'super_admin' || user.isSuperAdmin || user.isAdmin) return 'vip';
  if (user.role === 'community_manager') return 'vip';

  // Check expiration first - if expired, all benefits, limits, and perks expire immediately back to free
  if (isSubscriptionExpired(user)) {
    return 'free';
  }

  const membership = String(user.membershipTier || '').toLowerCase().trim();
  const subTier = String(user.subscriptionTier || '').toLowerCase().trim();
  const plan = String(user.subscriptionPlan || user.planId || user.tier || user.activePlanId || user.plan || '').toLowerCase().trim();
  const planName = String(user.planNameSnapshot || user.subscription?.name || user.subscription?.planId || '').toLowerCase().trim();
  const targetTier = String(user.targetTier || user.tierType || '').toLowerCase().trim();

  // 1. VIP Check (Check before free checks so active VIP accounts are always granted VIP limits)
  const isVipCandidate = Boolean(
    user.isVip ||
    targetTier === 'vip' ||
    membership.includes('vip') ||
    membership.includes('titan') ||
    subTier.includes('vip') ||
    subTier.includes('titan') ||
    plan.includes('vip') ||
    plan.includes('titan') ||
    planName.includes('vip') ||
    planName.includes('titan') ||
    plan.includes('annual') ||
    planName.includes('annual')
  );

  if (isVipCandidate) {
    return 'vip';
  }

  // If explicitly marked as free / starter / empty
  const isExplicitlyFree =
    membership === 'free' ||
    membership === 'free scholar' ||
    membership === 'scholar (starter)' ||
    membership === 'starter scholar' ||
    subTier === 'free' ||
    subTier === 'free scholar' ||
    plan === 'free' ||
    plan === 'plan_free' ||
    plan === 'free_starter';

  // If user is explicitly free and not flagged as premium
  if (isExplicitlyFree && !user.isPremium && !user.isSubscribed) {
    return 'free';
  }

  // If user is explicitly marked as not subscribed and has no active premium flag
  if (user.isSubscribed === false && !user.isPremium) {
    return 'free';
  }

  // 2. Premium Check (Do NOT treat generic 'scholar' as premium)
  const isPremiumCandidate = Boolean(
    user.isPremium ||
    targetTier === 'premium' ||
    (user.isSubscribed && !isExplicitlyFree) ||
    membership.includes('premium') ||
    membership.includes('pro') ||
    membership.includes('champion') ||
    membership.includes('master') ||
    subTier.includes('premium') ||
    subTier.includes('pro') ||
    subTier.includes('champion') ||
    subTier.includes('master') ||
    plan.includes('premium') ||
    plan.includes('pro') ||
    plan.includes('champion') ||
    plan.includes('master') ||
    plan.includes('basic_naira') ||
    planName.includes('premium') ||
    planName.includes('pro') ||
    planName.includes('champion') ||
    planName.includes('master') ||
    planName.includes('basic monthly')
  );

  if (isPremiumCandidate) {
    if (!membership.includes('free') && !subTier.includes('free') && !plan.includes('free')) {
      return 'premium';
    }
  }

  return 'free';
}

// Helper to determine if user qualifies for blue verified badge
export function isUserBlueBadge(user: any): boolean {
  if (!user) return false;
  // Staff & community managers qualify
  if (user.role === 'admin' || user.role === 'super_admin' || user.isSuperAdmin || user.isAdmin || user.role === 'community_manager') return true;

  // Check if subscription has expired - if expired, all perks including blue verification from subscriptions expire
  if (isSubscriptionExpired(user)) {
    // Only explicitly manual/permanent admin-assigned verifications remain
    if (user.isManualVerified && !user.subscriptionVerified) return true;
    return false;
  }

  // Active Premium / VIP subscribers qualify
  const tier = resolveUserSubscriptionTier(user);
  if (tier === 'premium' || tier === 'vip') return true;

  // If explicitly assigned blue badge/verified
  if (user.hasBlueBadge || user.isVerified || user.verifiedBadge || user.blueBadge) return true;

  // Check equipped badge
  if (
    (user.equippedBadge?.id && user.equippedBadge.id.toLowerCase().includes('verified')) ||
    (user.equippedBadge?.name && user.equippedBadge.name.toLowerCase().includes('verified'))
  ) {
    return true;
  }
  return false;
}

/**
 * 1. Fetch User's Campus Membership
 */
export async function getCampusMembership(userId: string): Promise<CampusMembership | null> {
  if (!userId) return null;

  // 1. Direct Firestore read first (primary, works on Vercel / GitHub / static)
  try {
    const docRef = doc(db, CAMPUS_MEMBERSHIPS_COLLECTION, userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...snap.data(), id: snap.id } as CampusMembership;
    }
  } catch (err) {
    console.warn('Direct Firestore read for campus membership:', err);
  }

  // 2. Safe API Fallback
  try {
    const res = await safeFetchJson<{ success: boolean; membership?: CampusMembership }>(`/api/campus/membership/${userId}`);
    if (res.ok && res.data?.success && res.data.membership) {
      return res.data.membership;
    }
  } catch (apiErr) {
    console.warn('API fallback for campus membership:', apiErr);
  }

  return null;
}

/**
 * 2. Join Campus
 */
export async function joinGrobaaxCampus(params: {
  userId: string;
  whatsappNumber: string;
  institution: string;
  institutionId?: string;
  institutionCategory?: InstitutionCategory;
  faculty?: string;
  department?: string;
  level?: string;
  skillIds?: string[];
  skills?: string[];
}): Promise<{ success: boolean; membership?: CampusMembership; error?: string }> {
  try {
    const formatted = formatCampusWhatsAppNumber(params.whatsappNumber);
    const digitsOnly = formatted.replace(/[^0-9]/g, '');

    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      return {
        success: false,
        error: 'Please provide a valid WhatsApp phone number (10 to 15 digits).',
      };
    }

    if (!params.institution) {
      return {
        success: false,
        error: 'Institution is required to join Campus.',
      };
    }

    const cleanSkills = Array.isArray(params.skills) ? params.skills : [];
    const cleanSkillIds = Array.isArray(params.skillIds) ? params.skillIds : [];

    const membership: CampusMembership = {
      id: params.userId,
      userId: params.userId,
      institution: params.institution.trim(),
      institutionId: params.institutionId || '',
      institutionCategory: params.institutionCategory || 'University',
      faculty: (params.faculty || '').trim(),
      department: (params.department || '').trim(),
      level: (params.level || '100 Level').trim(),
      whatsappNumber: formatted,
      whatsappVerified: true,
      skills: cleanSkills,
      skillIds: cleanSkillIds,
      joinedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      lastActiveAt: new Date().toISOString(),
    };

    // 1. Save directly to Firestore campus_memberships
    try {
      await setDoc(doc(db, CAMPUS_MEMBERSHIPS_COLLECTION, params.userId), {
        ...membership,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (dbErr) {
      console.warn('Firestore setDoc notice for campus membership:', dbErr);
    }

    // 2. Also update user's profile in Firestore
    try {
      await setDoc(doc(db, 'users', params.userId), {
        institution: params.institution.trim(),
        institutionCategory: params.institutionCategory || 'University',
        faculty: (params.faculty || '').trim(),
        department: (params.department || '').trim(),
        level: (params.level || '100 Level').trim(),
        whatsappNumber: formatted,
        skills: cleanSkills,
        skillIds: cleanSkillIds,
        campusJoined: true,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (userErr) {
      console.warn('User profile sync notice for campus join:', userErr);
    }

    clearCampusStudentsCache();

    // 3. Sync with backend API (including relational student_skills table)
    safeFetchJson('/api/campus/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }).catch(() => {});

    return { success: true, membership };
  } catch (err: any) {
    console.error('Error joining Grobaax Campus:', err);
    return { success: false, error: err?.message || 'Failed to join Campus.' };
  }
}

export const joinGrobaxCampus = joinGrobaaxCampus;

/**
 * 3. Update WhatsApp Number
 */
export async function updateCampusWhatsAppNumber(
  userId: string,
  newNumber: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const formatted = formatCampusWhatsAppNumber(newNumber);
    const digitsOnly = formatted.replace(/[^0-9]/g, '');

    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      return {
        success: false,
        error: 'Please enter a valid WhatsApp phone number (10 to 15 digits).',
      };
    }

    // Direct Firestore update
    try {
      await updateDoc(doc(db, CAMPUS_MEMBERSHIPS_COLLECTION, userId), {
        whatsappNumber: formatted,
        updatedAt: serverTimestamp(),
      });
    } catch (dbErr) {
      console.warn('Firestore updateDoc notice for WhatsApp number:', dbErr);
    }

    try {
      await updateDoc(doc(db, 'users', userId), {
        whatsappNumber: formatted,
        updatedAt: serverTimestamp(),
      });
    } catch (userErr) {
      console.warn('Firestore user updateDoc notice for WhatsApp number:', userErr);
    }

    // Background server API sync
    safeFetchJson('/api/campus/whatsapp-number', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, whatsappNumber: formatted }),
    }).catch(() => {});

    return { success: true };
  } catch (err: any) {
    console.error('Error updating WhatsApp number:', err);
    return { success: false, error: err?.message || 'Failed to update WhatsApp number.' };
  }
}

// In-memory short TTL cache to prevent duplicate Firestore queries on rapid filtering
const _campusStudentsCache = new Map<string, { timestamp: number; data: CampusStudentCard[] }>();

/**
 * 4. Get Students for User's Institution & Department with Real-Time Requests Status
 */
export async function fetchCampusStudents(params: {
  institution: string;
  faculty?: string;
  department?: string;
  skill?: string;
  search?: string;
  currentUserId?: string;
}): Promise<CampusStudentCard[]> {
  const { institution, faculty, department, skill, search, currentUserId } = params;
  if (!institution) return [];

  const cacheKey = `${institution.trim().toLowerCase()}_${faculty || ''}_${department || ''}_${skill || ''}_${search || ''}_${currentUserId || ''}`;
  const now = Date.now();
  const cached = _campusStudentsCache.get(cacheKey);
  if (cached && now - cached.timestamp < 30000) {
    return [...cached.data];
  }

  // Try authoritative backend directory endpoint first (supports relational student_skills)
  try {
    const qs = new URLSearchParams({ institution });
    if (faculty) qs.set('faculty', faculty);
    if (department) qs.set('department', department);
    if (skill) qs.set('skill', skill);
    if (search) qs.set('search', search);
    if (currentUserId) qs.set('requestingUserId', currentUserId);

    const headers = await getAuthBearerHeaders();
    const apiRes = await safeFetchJson<{ success: boolean; students?: CampusStudentCard[] }>(
      `/api/campus/students?${qs.toString()}`,
      { headers }
    );
    if (apiRes.ok && apiRes.data?.success && Array.isArray(apiRes.data.students)) {
      _campusStudentsCache.set(cacheKey, { timestamp: now, data: apiRes.data.students });
      return [...apiRes.data.students];
    }
  } catch {}

  const targetInst = institution.trim().toLowerCase();
  const targetSkill = (skill || '').trim().toLowerCase();
  const studentsMap = new Map<string, CampusStudentCard>();

  // Preload relational student_skills directly if backend API wasn't reachable
  const userSkillsMap = new Map<string, { skills: string[]; skillIds: string[] }>();
  try {
    const { data: skillRows } = await supabase
      .from('student_skills')
      .select('user_id, skill_id, skill_name');
    for (const row of skillRows || []) {
      const entry = userSkillsMap.get(row.user_id) || { skills: [], skillIds: [] };
      if (!entry.skills.includes(row.skill_name)) entry.skills.push(row.skill_name);
      if (!entry.skillIds.includes(row.skill_id)) entry.skillIds.push(row.skill_id);
      userSkillsMap.set(row.user_id, entry);
    }
  } catch {}

  const matchesSkill = (skillsList: string[], skillIdsList: string[]) => {
    if (!targetSkill) return true;
    return (
      skillsList.some((sk) => sk.toLowerCase().includes(targetSkill) || targetSkill.includes(sk.toLowerCase())) ||
      skillIdsList.some((sid) => sid.toLowerCase() === targetSkill)
    );
  };

  // 1. Preload users lookup map for enriching joined Campus members (never expose unjoined users)
  const rawUsersMap = new Map<string, any>();
  try {
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(query(usersRef, limit(250)));
    usersSnap.forEach((d) => {
      rawUsersMap.set(d.id, d.data());
    });
  } catch (err) {
    console.warn('Direct Firestore users read notice:', err);
  }

  // 2. Strictly read ONLY joined members from campus_memberships collection
  try {
    const memRef = collection(db, CAMPUS_MEMBERSHIPS_COLLECTION);
    const memSnap = await getDocs(query(memRef, limit(250)));
    memSnap.forEach((d) => {
      const data = d.data() as CampusMembership;
      const memberId = data.userId || d.id;
      if (!memberId || memberId.startsWith('scholar_peer_') || data.status === 'suspended') {
        return;
      }

      const rawUser = rawUsersMap.get(memberId);
      const acctStatus = String(rawUser?.accountStatus || rawUser?.status || 'active').toLowerCase();
      if (['suspended', 'deleted', 'banned', 'disabled'].includes(acctStatus)) {
        return;
      }
      const mInstRaw = (
        data.institution ||
        rawUser?.institution ||
        rawUser?.institutionName ||
        rawUser?.academicProfile?.institutionName ||
        ''
      ).trim();
      const mInst = mInstRaw.toLowerCase();

      if (mInst && (mInst === targetInst || mInst.includes(targetInst) || targetInst.includes(mInst))) {
        const rel = userSkillsMap.get(memberId);
        const mSkills: string[] = rel?.skills?.length
          ? rel.skills
          : Array.isArray(data.skills) && data.skills.length > 0
          ? data.skills
          : Array.isArray(rawUser?.skills)
          ? rawUser.skills
          : [];
        const mSkillIds: string[] = rel?.skillIds?.length
          ? rel.skillIds
          : Array.isArray(data.skillIds) && data.skillIds.length > 0
          ? data.skillIds
          : Array.isArray(rawUser?.skillIds)
          ? rawUser.skillIds
          : [];

        const mFaculty = (
          data.faculty ||
          rawUser?.faculty ||
          rawUser?.facultyName ||
          rawUser?.academicProfile?.facultyName ||
          ''
        ).trim();
        const mDept = (
          data.department ||
          rawUser?.department ||
          rawUser?.departmentName ||
          rawUser?.academicProfile?.departmentName ||
          ''
        ).trim();

        const uName = rawUser?.name || rawUser?.fullName || rawUser?.username || 'Scholar';
        const uUsername = rawUser?.username
          ? (rawUser.username.startsWith('@') ? rawUser.username : `@${rawUser.username}`)
          : `@scholar_${memberId.substring(0, 5)}`;

        const matchesFaculty =
          !faculty ||
          (mFaculty.length > 0 &&
            (mFaculty.toLowerCase().includes(faculty.toLowerCase()) ||
              faculty.toLowerCase().includes(mFaculty.toLowerCase())));
        const matchesDepartment =
          !department ||
          (mDept.length > 0 &&
            (mDept.toLowerCase().includes(department.toLowerCase()) ||
              department.toLowerCase().includes(mDept.toLowerCase())));
        const matchesSkillFilter = matchesSkill(mSkills, mSkillIds);

        let matchesSearch = true;
        if (search && search.trim()) {
          const s = search.trim().toLowerCase();
          matchesSearch =
            Boolean(uName && String(uName).toLowerCase().includes(s)) ||
            Boolean(uUsername && String(uUsername).toLowerCase().includes(s)) ||
            Boolean(mDept && String(mDept).toLowerCase().includes(s)) ||
            Boolean(mFaculty && String(mFaculty).toLowerCase().includes(s)) ||
            mSkills.some((sk) => sk.toLowerCase().includes(s));
        }

        if (matchesFaculty && matchesDepartment && matchesSkillFilter && matchesSearch) {
          const uAvatar =
            rawUser?.avatar ||
            rawUser?.profileImage ||
            `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(uName || memberId)}`;
          const uTier = rawUser ? resolveUserSubscriptionTier(rawUser) : 'free';
          const blueBadge = rawUser ? isUserBlueBadge(rawUser) : false;

          studentsMap.set(memberId, {
            id: memberId,
            name: uName,
            username: uUsername,
            avatar: uAvatar,
            institution: mInstRaw || institution,
            institutionId:
              data.institutionId || rawUser?.institutionId || rawUser?.academicProfile?.institutionId,
            faculty: mFaculty,
            department: mDept,
            level: data.level || rawUser?.level || rawUser?.academicProfile?.level || '100 Level',
            bio: rawUser?.bio || '',
            skills: mSkills,
            skillIds: mSkillIds,
            tier: uTier,
            hasBlueBadge: blueBadge,
            isVerified: blueBadge,
            isOnline: true,
            connectionStatus: memberId === currentUserId ? 'self' : 'none',
            joinedCampus: true,
          });
        }
      }
    });
  } catch (memErr) {
    console.warn('Direct Firestore campus_memberships read notice:', memErr);
  }

  // 3. Direct Firestore match for connection requests with current user (Scoped queries)
  if (currentUserId) {
    try {
      const [sentSnap, receivedSnap] = await Promise.all([
        getDocs(query(collection(db, CAMPUS_REQUESTS_COLLECTION), where('senderId', '==', currentUserId), limit(30))),
        getDocs(query(collection(db, CAMPUS_REQUESTS_COLLECTION), where('recipientId', '==', currentUserId), limit(30))),
      ]);

      sentSnap.forEach((docSnap) => {
        const reqData = docSnap.data() as CampusConnectionRequest;
        if (studentsMap.has(reqData.recipientId)) {
          const student = studentsMap.get(reqData.recipientId)!;
          if (reqData.status === 'PENDING') {
            student.connectionStatus = 'pending_sent';
          } else if (reqData.status === 'ACCEPTED') {
            student.connectionStatus = 'accepted';
          } else if (reqData.status === 'REJECTED') {
            student.connectionStatus = 'rejected';
          }
          student.requestId = docSnap.id;
        }
      });

      receivedSnap.forEach((docSnap) => {
        const reqData = docSnap.data() as CampusConnectionRequest;
        if (studentsMap.has(reqData.senderId)) {
          const student = studentsMap.get(reqData.senderId)!;
          if (reqData.status === 'PENDING') {
            student.connectionStatus = 'pending_received';
          } else if (reqData.status === 'ACCEPTED') {
            student.connectionStatus = 'accepted';
          } else if (reqData.status === 'REJECTED') {
            student.connectionStatus = 'none';
          }
          student.requestId = docSnap.id;
        }
      });
    } catch (reqErr) {
      console.warn('Error syncing connection requests to student cards:', reqErr);
    }
  }

  const results = Array.from(studentsMap.values());
  _campusStudentsCache.set(cacheKey, { timestamp: now, data: results });
  return results;
}

/**
 * 5. Subscribe to User's Connection Requests in Real-Time
 */
export function subscribeCampusConnections(
  userId: string,
  onUpdate: (data: {
    received: CampusConnectionRequest[];
    sent: CampusConnectionRequest[];
    accepted: CampusConnectionRequest[];
  }) => void
): () => void {
  if (!userId) {
    onUpdate({ received: [], sent: [], accepted: [] });
    return () => {};
  }

  try {
    const qRef = collection(db, CAMPUS_REQUESTS_COLLECTION);
    const unsubscribe = onSnapshot(
      qRef,
      (snapshot) => {
        const received: CampusConnectionRequest[] = [];
        const sent: CampusConnectionRequest[] = [];
        const accepted: CampusConnectionRequest[] = [];

        snapshot.forEach((docSnap) => {
          const item = { ...docSnap.data(), id: docSnap.id } as CampusConnectionRequest;
          if (item.recipientId === userId) {
            if (item.status === 'PENDING') {
              received.push(item);
            } else if (item.status === 'ACCEPTED') {
              accepted.push(item);
            }
          } else if (item.senderId === userId) {
            if (item.status === 'PENDING' || item.status === 'REJECTED') {
              sent.push(item);
            } else if (item.status === 'ACCEPTED') {
              accepted.push(item);
            }
          }
        });

        onUpdate({ received, sent, accepted });
      },
      (error) => {
        console.warn('Real-time connection listener notice:', error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Error setting up campus connections listener:', err);
    return () => {};
  }
}

/**
 * 6. Send Campus Chat Request (Direct Firestore + Safe Fallback)
 */
export async function sendCampusChatRequest(
  senderUser: UserProfile,
  recipientStudent: CampusStudentCard
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    if (!senderUser?.id || !recipientStudent?.id) {
      return { success: false, error: 'Sender and recipient information required.' };
    }

    if (senderUser.id === recipientStudent.id) {
      return { success: false, error: 'You cannot send a connection request to yourself.' };
    }

    const sInst = (senderUser.institution || senderUser.academicProfile?.institutionName || '').trim().toLowerCase();
    const rInst = (recipientStudent.institution || '').trim().toLowerCase();

    const senderTier = resolveUserSubscriptionTier(senderUser);
    const recipientTier = recipientStudent.tier || 'free';

    const isPrivileged =
      senderTier === 'premium' ||
      senderTier === 'vip' ||
      senderUser.role === 'admin' ||
      senderUser.role === 'super_admin' ||
      Boolean((senderUser as any)?.isSuperAdmin) ||
      senderUser.role === 'community_manager';

    if (sInst && rInst && sInst !== rInst && !sInst.includes(rInst) && !rInst.includes(sInst)) {
      if (!isPrivileged) {
        return {
          success: false,
          error: 'Cross-campus connections with other institutions require a Premium or VIP Scholar membership.',
        };
      }
    }

    // Pre-allocate doc reference to guarantee ID match between Firestore Doc ID and payload.id
    const newDocRef = doc(collection(db, CAMPUS_REQUESTS_COLLECTION));
    const requestId = newDocRef.id;

    const newRequestPayload: CampusConnectionRequest = {
      id: requestId,
      senderId: senderUser.id,
      senderName: senderUser.name || senderUser.fullName || 'Scholar',
      senderUsername: senderUser.username || '@scholar',
      senderAvatar: senderUser.avatar || senderUser.profileImage || `https://api.dicebear.com/7.x/bottts/svg?seed=${senderUser.id}`,
      senderInstitution: senderUser.institution || senderUser.academicProfile?.institutionName || recipientStudent.institution,
      senderFaculty: senderUser.faculty || senderUser.academicProfile?.facultyName || '',
      senderDepartment: senderUser.department || senderUser.academicProfile?.departmentName || '',
      senderLevel: senderUser.level || senderUser.academicProfile?.level || '100 Level',
      senderTier,
      recipientId: recipientStudent.id,
      recipientName: recipientStudent.name,
      recipientUsername: recipientStudent.username,
      recipientAvatar: recipientStudent.avatar,
      recipientInstitution: recipientStudent.institution,
      recipientFaculty: recipientStudent.faculty,
      recipientDepartment: recipientStudent.department,
      recipientLevel: recipientStudent.level,
      recipientTier,
      institution: senderUser.institution || recipientStudent.institution,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Direct Firestore write (Primary & resilient on Vercel / GitHub / static)
    try {
      await setDoc(newDocRef, {
        ...newRequestPayload,
        createdAtServer: serverTimestamp(),
      });

      // Also create in-app notification doc for the recipient with full sender details
      const originDetails = [
        newRequestPayload.senderInstitution,
        newRequestPayload.senderFaculty,
        newRequestPayload.senderDepartment,
      ].filter(Boolean).join(' • ');

      await addDoc(collection(db, 'notifications'), {
        title: 'New Campus Connection Request',
        message: originDetails
          ? `${newRequestPayload.senderName} (${originDetails}) wants to connect with you on GROBAAX Campus.`
          : `${newRequestPayload.senderName} wants to connect with you on GROBAAX Campus.`,
        type: 'campus',
        targetUserId: recipientStudent.id,
        userId: recipientStudent.id,
        senderUserId: senderUser.id,
        senderName: newRequestPayload.senderName,
        senderAvatar: newRequestPayload.senderAvatar,
        senderInstitution: newRequestPayload.senderInstitution,
        senderFaculty: newRequestPayload.senderFaculty,
        senderDepartment: newRequestPayload.senderDepartment,
        senderLevel: newRequestPayload.senderLevel,
        senderTier: newRequestPayload.senderTier,
        requestId: requestId,
        actionUrl: '/community?tab=campus&view=connections',
        isRead: false,
        createdAt: serverTimestamp(),
      });
    } catch (dbErr) {
      console.warn('Firestore direct write notice for campus connection request:', dbErr);
    }

    // 2. Safe background API sync (never crashes or throws SyntaxError)
    safeFetchJson('/api/campus/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRequestPayload),
    }).catch(() => {});

    return {
      success: true,
      message: 'Chat request sent! You will be notified once they accept.',
    };
  } catch (err: any) {
    console.error('Error sending chat request:', err);
    return { success: false, error: err?.message || 'Failed to send chat request.' };
  }
}

/**
 * 7. Respond to Campus Chat Request (ACCEPT or REJECT)
 */
export async function respondCampusChatRequest(
  requestId: string,
  recipientId: string,
  action: 'ACCEPT' | 'REJECT'
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    if (!requestId) {
      return { success: false, error: 'Request ID is required.' };
    }

    const nextStatus = action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED';
    let docUpdated = false;
    let senderIdForNotif = '';
    let recipientNameForNotif = 'A scholar';
    let recipientAvatarForNotif = '';
    let recipientInstitutionForNotif = '';
    let recipientFacultyForNotif = '';
    let recipientDepartmentForNotif = '';
    let recipientLevelForNotif = '';
    let recipientTierForNotif = '';

    // 1. Multi-strategy Firestore update:
    // Strategy A: Direct update by Document ID
    try {
      const directRef = doc(db, CAMPUS_REQUESTS_COLLECTION, requestId);
      const snap = await getDoc(directRef);
      if (snap.exists()) {
        const snapData = snap.data();
        senderIdForNotif = snapData.senderId || '';
        recipientNameForNotif = snapData.recipientName || 'Your connection';
        recipientAvatarForNotif = snapData.recipientAvatar || '';
        recipientInstitutionForNotif = snapData.recipientInstitution || '';
        recipientFacultyForNotif = snapData.recipientFaculty || '';
        recipientDepartmentForNotif = snapData.recipientDepartment || '';
        recipientLevelForNotif = snapData.recipientLevel || '';
        recipientTierForNotif = snapData.recipientTier || '';

        await updateDoc(directRef, {
          status: nextStatus,
          respondedAt: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        });
        docUpdated = true;
      }
    } catch (directErr) {
      console.warn('Direct doc update notice for campus request:', directErr);
    }

    // Strategy B: If not updated, search by `id` field
    if (!docUpdated) {
      try {
        const qById = query(collection(db, CAMPUS_REQUESTS_COLLECTION), where('id', '==', requestId));
        const qSnap = await getDocs(qById);
        for (const d of qSnap.docs) {
          const dData = d.data();
          senderIdForNotif = dData.senderId || senderIdForNotif;
          recipientNameForNotif = dData.recipientName || recipientNameForNotif;
          recipientAvatarForNotif = dData.recipientAvatar || recipientAvatarForNotif;
          recipientInstitutionForNotif = dData.recipientInstitution || recipientInstitutionForNotif;
          recipientFacultyForNotif = dData.recipientFaculty || recipientFacultyForNotif;
          recipientDepartmentForNotif = dData.recipientDepartment || recipientDepartmentForNotif;
          recipientLevelForNotif = dData.recipientLevel || recipientLevelForNotif;
          recipientTierForNotif = dData.recipientTier || recipientTierForNotif;

          await updateDoc(doc(db, CAMPUS_REQUESTS_COLLECTION, d.id), {
            status: nextStatus,
            respondedAt: new Date().toISOString(),
            updatedAt: serverTimestamp(),
          });
          docUpdated = true;
        }
      } catch (qErr) {
        console.warn('Query by id notice for campus request:', qErr);
      }
    }

    // Strategy C: If still not updated, search by recipientId with pending status
    if (!docUpdated && recipientId) {
      try {
        const qByRecipient = query(
          collection(db, CAMPUS_REQUESTS_COLLECTION),
          where('recipientId', '==', recipientId)
        );
        const qSnap2 = await getDocs(qByRecipient);
        for (const d of qSnap2.docs) {
          const dData = d.data();
          if (d.id === requestId || dData.id === requestId || dData.status === 'PENDING') {
            senderIdForNotif = dData.senderId || senderIdForNotif;
            recipientNameForNotif = dData.recipientName || recipientNameForNotif;
            recipientAvatarForNotif = dData.recipientAvatar || recipientAvatarForNotif;
            recipientInstitutionForNotif = dData.recipientInstitution || recipientInstitutionForNotif;
            recipientFacultyForNotif = dData.recipientFaculty || recipientFacultyForNotif;
            recipientDepartmentForNotif = dData.recipientDepartment || recipientDepartmentForNotif;
            recipientLevelForNotif = dData.recipientLevel || recipientLevelForNotif;
            recipientTierForNotif = dData.recipientTier || recipientTierForNotif;

            await updateDoc(doc(db, CAMPUS_REQUESTS_COLLECTION, d.id), {
              status: nextStatus,
              respondedAt: new Date().toISOString(),
              updatedAt: serverTimestamp(),
            });
            docUpdated = true;
            break;
          }
        }
      } catch (recipErr) {
        console.warn('Query by recipient notice for campus request:', recipErr);
      }
    }

    // 2. If action is ACCEPT, create notification for sender in Firestore
    if (nextStatus === 'ACCEPTED' && senderIdForNotif) {
      try {
        const originDetails = [
          recipientInstitutionForNotif,
          recipientFacultyForNotif,
          recipientDepartmentForNotif,
        ].filter(Boolean).join(' • ');

        await addDoc(collection(db, 'notifications'), {
          title: 'Campus Connection Accepted! ������',
          message: originDetails
            ? `${recipientNameForNotif} (${originDetails}) accepted your Campus connection request. You can now chat on WhatsApp!`
            : `${recipientNameForNotif} accepted your Campus connection request. You can now chat on WhatsApp!`,
          type: 'campus',
          targetUserId: senderIdForNotif,
          userId: senderIdForNotif,
          senderUserId: recipientId,
          senderName: recipientNameForNotif,
          senderAvatar: recipientAvatarForNotif,
          senderInstitution: recipientInstitutionForNotif,
          senderFaculty: recipientFacultyForNotif,
          senderDepartment: recipientDepartmentForNotif,
          senderLevel: recipientLevelForNotif,
          senderTier: recipientTierForNotif,
          requestId,
          actionUrl: '/community?tab=campus&view=connections',
          isRead: false,
          createdAt: serverTimestamp(),
        });
      } catch (notifErr) {
        console.warn('Notification creation notice on request accept:', notifErr);
      }
    }

    // 3. Safe background API sync
    safeFetchJson('/api/campus/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, recipientId, action }),
    }).catch(() => {});

    return {
      success: true,
      message: action === 'ACCEPT' ? 'Connection accepted! You can now chat on WhatsApp.' : 'Request declined.',
    };
  } catch (err: any) {
    console.error('Error responding to campus chat request:', err);
    return { success: false, error: err?.message || 'Failed to respond to request.' };
  }
}

/**
 * 8. Get Secure WhatsApp Link (Direct Firestore lookup + Safe API fallback)
 */
export async function getSecureWhatsAppLink(
  requestingUserId: string,
  targetUserId: string,
  requestId?: string
): Promise<{ success: boolean; whatsappUrl?: string; targetName?: string; error?: string }> {
  try {
    if (!requestingUserId || !targetUserId) {
      return { success: false, error: 'User parameters required.' };
    }

    let targetPhone = '';
    let targetName = 'Scholar';

    // 1. Lookup in campus_memberships
    try {
      const memSnap = await getDoc(doc(db, CAMPUS_MEMBERSHIPS_COLLECTION, targetUserId));
      if (memSnap.exists()) {
        const memData = memSnap.data();
        targetPhone = memData.whatsappNumber || '';
      }
    } catch (memErr) {
      console.warn('Firestore campus_memberships read notice:', memErr);
    }

    // 2. Fallback to users collection
    if (!targetPhone) {
      try {
        const userSnap = await getDoc(doc(db, 'users', targetUserId));
        if (userSnap.exists()) {
          const uData = userSnap.data();
          targetPhone = uData.whatsappNumber || uData.phoneNumber || uData.phone || '';
          targetName = uData.name || uData.fullName || uData.username || 'Scholar';
        }
      } catch (uErr) {
        console.warn('Firestore user read notice for phone:', uErr);
      }
    }

    // 3. Fallback to API
    if (!targetPhone) {
      const apiRes = await safeFetchJson<{ success: boolean; whatsappUrl?: string; targetName?: string }>(
        '/api/campus/whatsapp-link',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestingUserId, targetUserId, requestId }),
        }
      );
      if (apiRes.ok && apiRes.data?.success && apiRes.data.whatsappUrl) {
        return {
          success: true,
          whatsappUrl: apiRes.data.whatsappUrl,
          targetName: apiRes.data.targetName || targetName,
        };
      }
    }

    if (!targetPhone) {
      return {
        success: false,
        error: 'Unable to retrieve WhatsApp contact for this scholar. Please try again later.',
      };
    }

    const cleanNumber = targetPhone.replace(/[^0-9]/g, '');
    const welcomeMsg = encodeURIComponent(
      `Hi ${targetName}! I connected with you on GROBAAX Campus. Let's collaborate!`
    );
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${welcomeMsg}`;

    return {
      success: true,
      whatsappUrl,
      targetName,
    };
  } catch (err: any) {
    console.error('Error retrieving WhatsApp connection link:', err);
    return { success: false, error: err?.message || 'Failed to open WhatsApp.' };
  }
}

/**
 * 9. Campus Follow System (completely independent of WhatsApp Chat Requests)
 */
export async function followCampusStudent(targetUserId: string): Promise<{
  success: boolean;
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  error?: string;
}> {
  try {
    const headers = await getAuthBearerHeaders();
    const res = await safeFetchJson<{
      success: boolean;
      followersCount?: number;
      followingCount?: number;
      isFollowing?: boolean;
      error?: string;
    }>('/api/campus/follow', {
      method: 'POST',
      headers,
      body: JSON.stringify({ targetUserId }),
    });
    if (res.ok && res.data?.success) {
      clearCampusStudentsCache();
      return res.data;
    }
    return {
      success: false,
      error: res.data?.error || 'Unable to follow student right now.',
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unable to follow student.' };
  }
}

export async function unfollowCampusStudent(targetUserId: string): Promise<{
  success: boolean;
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  error?: string;
}> {
  try {
    const headers = await getAuthBearerHeaders();
    const res = await safeFetchJson<{
      success: boolean;
      followersCount?: number;
      followingCount?: number;
      isFollowing?: boolean;
      error?: string;
    }>(`/api/campus/follow/${encodeURIComponent(targetUserId)}`, {
      method: 'DELETE',
      headers,
    });
    if (res.ok && res.data?.success) {
      clearCampusStudentsCache();
      return res.data;
    }
    return {
      success: false,
      error: res.data?.error || 'Unable to unfollow student right now.',
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unable to unfollow student.' };
  }
}

export async function fetchCampusFollowStatus(targetUserId: string): Promise<{
  success: boolean;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  error?: string;
}> {
  try {
    const headers = await getAuthBearerHeaders();
    const res = await safeFetchJson<{
      success: boolean;
      followersCount?: number;
      followingCount?: number;
      isFollowing?: boolean;
      error?: string;
    }>(`/api/campus/follow/status/${encodeURIComponent(targetUserId)}`, {
      method: 'GET',
      headers,
    });
    if (res.ok && res.data?.success) {
      return {
        success: true,
        followersCount: Number(res.data.followersCount || 0),
        followingCount: Number(res.data.followingCount || 0),
        isFollowing: Boolean(res.data.isFollowing),
      };
    }
    return {
      success: false,
      followersCount: 0,
      followingCount: 0,
      isFollowing: false,
      error: res.data?.error,
    };
  } catch (err: any) {
    return {
      success: false,
      followersCount: 0,
      followingCount: 0,
      isFollowing: false,
      error: err?.message,
    };
  }
}

export async function fetchCampusFollowList(
  targetUserId: string,
  type: 'followers' | 'following'
): Promise<{
  success: boolean;
  users: CampusFollowUser[];
  total: number;
  error?: string;
}> {
  try {
    const headers = await getAuthBearerHeaders();
    const res = await safeFetchJson<{
      success: boolean;
      users?: CampusFollowUser[];
      total?: number;
      error?: string;
    }>(`/api/campus/follow/list/${encodeURIComponent(targetUserId)}?type=${type}`, {
      method: 'GET',
      headers,
    });
    if (res.ok && res.data?.success) {
      return {
        success: true,
        users: Array.isArray(res.data.users) ? res.data.users : [],
        total: Number(res.data.total || 0),
      };
    }
    return { success: false, users: [], total: 0, error: res.data?.error };
  } catch (err: any) {
    return { success: false, users: [], total: 0, error: err?.message };
  }
}

/**
 * 10. Fetch a single Campus student profile (used when clicking a School Blog author or peer)
 */
export async function fetchCampusStudentProfile(
  targetUserId: string,
  currentUserId?: string
): Promise<CampusStudentCard | null> {
  if (!targetUserId) return null;

  try {
    const qs = currentUserId ? `?requestingUserId=${encodeURIComponent(currentUserId)}` : '';
    const headers = await getAuthBearerHeaders();
    const res = await safeFetchJson<{ success: boolean; student?: CampusStudentCard }>(
      `/api/campus/students/${encodeURIComponent(targetUserId)}${qs}`,
      { headers }
    );
    if (res.ok && res.data?.success && res.data.student) {
      return res.data.student;
    }
  } catch {}

  // Firestore + follow fallback if backend call was unreachable
  try {
    const [uSnap, memSnap, followStatus] = await Promise.all([
      getDoc(doc(db, 'users', targetUserId)),
      getDoc(doc(db, CAMPUS_MEMBERSHIPS_COLLECTION, targetUserId)),
      fetchCampusFollowStatus(targetUserId),
    ]);

    const rawUser = uSnap.exists() ? uSnap.data() : null;
    const memData = memSnap.exists() ? (memSnap.data() as CampusMembership) : null;
    if (!rawUser && !memData) return null;

    const uName = rawUser?.name || rawUser?.fullName || rawUser?.username || 'Scholar';
    const uUsername = rawUser?.username
      ? rawUser.username.startsWith('@')
        ? rawUser.username
        : `@${rawUser.username}`
      : `@scholar_${targetUserId.substring(0, 5)}`;
    const uAvatar =
      rawUser?.avatar ||
      rawUser?.profileImage ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(uName || targetUserId)}`;
    const uTier = rawUser ? resolveUserSubscriptionTier(rawUser) : 'free';
    const blueBadge = rawUser ? isUserBlueBadge(rawUser) : false;

    let connectionStatus: CampusStudentCard['connectionStatus'] =
      currentUserId && currentUserId === targetUserId ? 'self' : 'none';
    let requestId: string | undefined;

    if (currentUserId && currentUserId !== targetUserId) {
      try {
        const [sentSnap, receivedSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, CAMPUS_REQUESTS_COLLECTION),
              where('senderId', '==', currentUserId),
              limit(30)
            )
          ),
          getDocs(
            query(
              collection(db, CAMPUS_REQUESTS_COLLECTION),
              where('recipientId', '==', currentUserId),
              limit(30)
            )
          ),
        ]);
        sentSnap.forEach((d) => {
          const r = d.data() as CampusConnectionRequest;
          if (r.recipientId === targetUserId) {
            if (r.status === 'PENDING') connectionStatus = 'pending_sent';
            else if (r.status === 'ACCEPTED') connectionStatus = 'accepted';
            else if (r.status === 'REJECTED') connectionStatus = 'rejected';
            requestId = d.id;
          }
        });
        receivedSnap.forEach((d) => {
          const r = d.data() as CampusConnectionRequest;
          if (r.senderId === targetUserId) {
            if (r.status === 'PENDING') connectionStatus = 'pending_received';
            else if (r.status === 'ACCEPTED') connectionStatus = 'accepted';
            else if (r.status === 'REJECTED') connectionStatus = 'none';
            requestId = d.id;
          }
        });
      } catch {}
    }

    return {
      id: targetUserId,
      name: uName,
      username: uUsername,
      avatar: uAvatar,
      institution:
        memData?.institution ||
        rawUser?.institution ||
        rawUser?.institutionName ||
        rawUser?.academicProfile?.institutionName ||
        'Grobaax Campus',
      institutionId:
        memData?.institutionId || rawUser?.institutionId || rawUser?.academicProfile?.institutionId,
      faculty:
        memData?.faculty ||
        rawUser?.faculty ||
        rawUser?.facultyName ||
        rawUser?.academicProfile?.facultyName ||
        '',
      department:
        memData?.department ||
        rawUser?.department ||
        rawUser?.departmentName ||
        rawUser?.academicProfile?.departmentName ||
        '',
      level: memData?.level || rawUser?.level || rawUser?.academicProfile?.level || 'Student',
      bio: rawUser?.bio || '',
      skills: Array.isArray(memData?.skills)
        ? memData.skills
        : Array.isArray(rawUser?.skills)
        ? rawUser.skills
        : [],
      skillIds: Array.isArray(memData?.skillIds)
        ? memData.skillIds
        : Array.isArray(rawUser?.skillIds)
        ? rawUser.skillIds
        : [],
      tier: uTier,
      hasBlueBadge: blueBadge,
      isVerified: blueBadge,
      isOnline: true,
      connectionStatus,
      requestId,
      joinedCampus: Boolean(memData),
      followersCount: followStatus.success ? followStatus.followersCount : 0,
      followingCount: followStatus.success ? followStatus.followingCount : 0,
      isFollowing: followStatus.success ? followStatus.isFollowing : false,
    };
  } catch {
    return null;
  }
}

