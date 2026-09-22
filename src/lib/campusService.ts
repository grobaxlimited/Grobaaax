import {
  CampusMembership,
  CampusConnectionRequest,
  CampusStudentCard,
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

  const membership = (user.membershipTier || '').toLowerCase().trim();
  const subTier = (user.subscriptionTier || '').toLowerCase().trim();
  const plan = (user.subscriptionPlan || user.planId || user.tier || user.activePlanId || user.plan || '').toLowerCase().trim();
  const planName = (user.planNameSnapshot || user.subscription?.name || user.subscription?.planId || '').toLowerCase().trim();
  const targetTier = (user.targetTier || user.tierType || '').toLowerCase().trim();

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
  if (user.equippedBadge?.id?.toLowerCase().includes('verified') || user.equippedBadge?.name?.toLowerCase().includes('verified')) {
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
  institutionCategory?: InstitutionCategory;
  faculty?: string;
  department?: string;
  level?: string;
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

    const membership: CampusMembership = {
      id: params.userId,
      userId: params.userId,
      institution: params.institution.trim(),
      institutionCategory: params.institutionCategory || 'University',
      faculty: (params.faculty || '').trim(),
      department: (params.department || '').trim(),
      level: (params.level || '100 Level').trim(),
      whatsappNumber: formatted,
      whatsappVerified: true,
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
        campusJoined: true,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (userErr) {
      console.warn('User profile sync notice for campus join:', userErr);
    }

    // 3. Background server API sync (non-blocking)
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
  search?: string;
  currentUserId?: string;
}): Promise<CampusStudentCard[]> {
  const { institution, faculty, department, search, currentUserId } = params;
  if (!institution) return [];

  const cacheKey = `${institution.trim().toLowerCase()}_${faculty || ''}_${department || ''}_${search || ''}_${currentUserId || ''}`;
  const now = Date.now();
  const cached = _campusStudentsCache.get(cacheKey);
  if (cached && now - cached.timestamp < 60000) {
    return [...cached.data];
  }

  const targetInst = institution.trim().toLowerCase();
  const studentsMap = new Map<string, CampusStudentCard>();

  // 1. Direct Firestore fetch from users collection (Quota-optimized limit 50)
  const rawUsersMap = new Map<string, any>();
  try {
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(query(usersRef, limit(50)));

    usersSnap.forEach((d) => {
      const data = d.data();
      rawUsersMap.set(d.id, data);
      const uInst = (data.institution || data.institutionName || data.academicProfile?.institutionName || '').trim().toLowerCase();

      if (uInst && (uInst === targetInst || uInst.includes(targetInst) || targetInst.includes(uInst))) {
        const uFaculty = (data.faculty || data.facultyName || data.academicProfile?.facultyName || '').trim();
        const uDept = (data.department || data.departmentName || data.academicProfile?.departmentName || '').trim();
        const uLevel = data.level || data.academicProfile?.level || '100 Level';
        const uName = data.name || data.fullName || data.username || 'Scholar';
        const uUsername = data.username ? (data.username.startsWith('@') ? data.username : `@${data.username}`) : '@scholar';
        const uAvatar = data.avatar || data.profileImage || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(uName)}`;
        const uTier = resolveUserSubscriptionTier(data);
        const blueBadge = isUserBlueBadge(data);

        // Faculty & department matching logic (prevents empty strings from matching all)
        const matchesFaculty = !faculty || (
          uFaculty.length > 0 && (
            uFaculty.toLowerCase().includes(faculty.toLowerCase()) ||
            faculty.toLowerCase().includes(uFaculty.toLowerCase())
          )
        );
        const matchesDepartment = !department || (
          uDept.length > 0 && (
            uDept.toLowerCase().includes(department.toLowerCase()) ||
            department.toLowerCase().includes(uDept.toLowerCase())
          )
        );

        let matchesSearch = true;
        if (search && search.trim()) {
          const s = search.trim().toLowerCase();
          matchesSearch =
            uName.toLowerCase().includes(s) ||
            uUsername.toLowerCase().includes(s) ||
            uDept.toLowerCase().includes(s) ||
            uFaculty.toLowerCase().includes(s);
        }

        if (matchesFaculty && matchesDepartment && matchesSearch) {
          studentsMap.set(d.id, {
            id: d.id,
            name: uName,
            username: uUsername,
            avatar: uAvatar,
            institution: data.institution || data.institutionName || institution,
            faculty: uFaculty,
            department: uDept,
            level: uLevel,
            tier: uTier,
            hasBlueBadge: blueBadge,
            isVerified: blueBadge,
            isOnline: true,
            connectionStatus: d.id === currentUserId ? 'self' : 'none',
            joinedCampus: true,
          });
        }
      }
    });
  } catch (err) {
    console.warn('Direct Firestore users read notice:', err);
  }

  // 2. Also check campus_memberships collection to include members who joined (Quota-optimized limit 50)
  try {
    const memRef = collection(db, CAMPUS_MEMBERSHIPS_COLLECTION);
    const memSnap = await getDocs(query(memRef, limit(50)));
    memSnap.forEach((d) => {
      const data = d.data() as CampusMembership;
      const mInst = (data.institution || '').trim().toLowerCase();
      if (mInst && (mInst === targetInst || mInst.includes(targetInst) || targetInst.includes(mInst))) {
        if (!studentsMap.has(data.userId)) {
          const mFaculty = (data.faculty || '').trim();
          const mDept = (data.department || '').trim();

          const matchesFaculty = !faculty || (
            mFaculty.length > 0 && (
              mFaculty.toLowerCase().includes(faculty.toLowerCase()) ||
              faculty.toLowerCase().includes(mFaculty.toLowerCase())
            )
          );
          const matchesDepartment = !department || (
            mDept.length > 0 && (
              mDept.toLowerCase().includes(department.toLowerCase()) ||
              department.toLowerCase().includes(mDept.toLowerCase())
            )
          );

          let matchesSearch = true;
          if (search && search.trim()) {
            const s = search.trim().toLowerCase();
            matchesSearch =
              mDept.toLowerCase().includes(s) ||
              mFaculty.toLowerCase().includes(s);
          }

          if (matchesFaculty && matchesDepartment && matchesSearch) {
            const rawUser = rawUsersMap.get(data.userId);
            const uName = rawUser?.name || rawUser?.fullName || rawUser?.username || 'Scholar';
            const uUsername = rawUser?.username ? (rawUser.username.startsWith('@') ? rawUser.username : `@${rawUser.username}`) : '@scholar';
            const uAvatar = rawUser?.avatar || rawUser?.profileImage || `https://api.dicebear.com/7.x/bottts/svg?seed=${data.userId}`;
            const uTier = rawUser ? resolveUserSubscriptionTier(rawUser) : 'free';
            const blueBadge = rawUser ? isUserBlueBadge(rawUser) : false;

            studentsMap.set(data.userId, {
              id: data.userId,
              name: uName,
              username: uUsername,
              avatar: uAvatar,
              institution: data.institution,
              faculty: mFaculty,
              department: mDept,
              level: data.level || rawUser?.level || '100 Level',
              tier: uTier,
              hasBlueBadge: blueBadge,
              isVerified: blueBadge,
              isOnline: true,
              connectionStatus: data.userId === currentUserId ? 'self' : 'none',
              joinedCampus: true,
            });
          }
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
      ].filter(Boolean).join(' â€¢ ');

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
        ].filter(Boolean).join(' â€¢ ');

        await addDoc(collection(db, 'notifications'), {
          title: 'Campus Connection Accepted! í ¼í¾‰',
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
