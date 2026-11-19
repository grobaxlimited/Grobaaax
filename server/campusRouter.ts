import { Router, Request, Response } from 'express';
import { CampusMembership, CampusConnectionRequest, CampusStudentCard } from '../src/types';
import {
  db,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from '../src/lib/supabaseFirestoreAdapter';
import { supabaseAdmin } from '../src/lib/supabase';
import { DEFAULT_CAMPUS_SKILL_CATEGORIES } from '../src/data/campusSkillsData';
import { optionalAuth, requireAuth, requireAdmin } from './utils/authMiddleware';
import { resolveCanonicalInstitution } from './utils/institutionResolver';

export const campusRouter = Router();

const SUSPENDED_STATUSES = new Set([
  'suspended',
  'deleted',
  'banned',
  'disabled',
  'inactive',
  'flagged',
  'restricted',
  'bot',
]);

function isUserAccountActive(rawUser: any): boolean {
  if (!rawUser || typeof rawUser !== 'object') return false;
  if (rawUser.isDeleted === true) return false;
  if (rawUser.isSuspicious === true) return false;
  if (rawUser.isDuplicateAccount === true) return false;
  if (rawUser.isBot === true) return false;
  if (rawUser.isArtificial === true) return false;
  if (rawUser.isFlagged === true) return false;
  const st = String(rawUser.accountStatus || 'active').toLowerCase().trim();
  return !SUSPENDED_STATUSES.has(st);
}

async function computeFollowCounts(targetUserId: string, viewerUserId?: string) {
  const [{ data: followersRows }, { data: followingRows }, { data: myFollowRow }] = await Promise.all([
    supabaseAdmin
      .from('campus_follows')
      .select('follower_user_id')
      .eq('following_user_id', targetUserId)
      .neq('follower_user_id', targetUserId),
    supabaseAdmin
      .from('campus_follows')
      .select('following_user_id')
      .eq('follower_user_id', targetUserId)
      .neq('following_user_id', targetUserId),
    viewerUserId && viewerUserId !== targetUserId
      ? supabaseAdmin
          .from('campus_follows')
          .select('id')
          .eq('follower_user_id', viewerUserId)
          .eq('following_user_id', targetUserId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const candidateIds = Array.from(
    new Set([
      ...(followersRows || []).map((r: any) => r.follower_user_id),
      ...(followingRows || []).map((r: any) => r.following_user_id),
    ])
  ).filter(Boolean);

  const activeUsersById = new Map<string, any>();
  if (candidateIds.length > 0) {
    // Chunk in batches of 150 to safely stay within PostgREST IN limits
    for (let i = 0; i < candidateIds.length; i += 150) {
      const slice = candidateIds.slice(i, i + 150);
      const { data: uRows } = await supabaseAdmin
        .from('users')
        .select('id, data')
        .in('id', slice);
      for (const u of uRows || []) {
        if (isUserAccountActive(u.data)) {
          activeUsersById.set(u.id, u.data);
        }
      }
    }
  }

  const uniqueGenuineFollowerKeys = new Set<string>();
  for (const r of followersRows || []) {
    const fid = r.follower_user_id;
    const uData = activeUsersById.get(fid);
    if (!uData) continue;
    const normEmail = String(uData.email || '').trim().toLowerCase();
    uniqueGenuineFollowerKeys.add(normEmail || fid);
  }
  const followersCount = uniqueGenuineFollowerKeys.size;

  const followingCount = new Set(
    (followingRows || [])
      .map((r: any) => r.following_user_id)
      .filter((id: string) => activeUsersById.has(id))
  ).size;

  return {
    followersCount,
    followingCount,
    isFollowing: Boolean(myFollowRow),
  };
}

// In-memory fallback caches for speed and resilience
const membershipsCache = new Map<string, CampusMembership>();
const connectionRequestsCache = new Map<string, CampusConnectionRequest>();

// Helper to clean & normalize phone numbers
function formatWhatsAppNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9+]/g, '');
  // If starts with 0 (Nigerian format e.g. 08012345678), convert to +2348012345678
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '+234' + cleaned.substring(1);
  } else if (!cleaned.startsWith('+') && cleaned.length === 10) {
    cleaned = '+234' + cleaned;
  } else if (!cleaned.startsWith('+') && cleaned.startsWith('234')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

function getSanitizedDigitsOnly(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

// Helper to derive user subscription tier - Strict & Accurate
function getUserTier(user: any): 'free' | 'premium' | 'vip' {
  if (!user) return 'free';
  if (user.role === 'admin' || user.role === 'super_admin' || user.isAdmin || user.isSuperAdmin) return 'vip';
  if (user.role === 'community_manager') return 'vip';

  // Check expiration first
  const expiryRaw =
    user.subscriptionExpiry ||
    user.subscription?.expiryDate ||
    user.subscription?.expiresAt ||
    user.expiryDate;

  if (expiryRaw) {
    try {
      const expTime = new Date(expiryRaw).getTime();
      if (!isNaN(expTime) && expTime <= Date.now() && !user.isSuperAdmin && user.role !== 'admin') {
        return 'free';
      }
    } catch {
      // ignore
    }
  }

  if (user.subscription?.status === 'expired' || user.subscription?.status === 'cancelled' || user.isExpired === true) {
    if (!user.isSuperAdmin && user.role !== 'admin') {
      return 'free';
    }
  }

  const membership = (user.membershipTier || '').toLowerCase().trim();
  const subTier = (user.subscriptionTier || '').toLowerCase().trim();
  const plan = (user.subscriptionPlan || user.planId || user.subscriptionTier || user.membershipTier || user.tier || user.activePlanId || '').toLowerCase().trim();
  const planName = (user.planNameSnapshot || user.subscription?.name || user.subscription?.planId || '').toLowerCase().trim();

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

  if (
    user.isVip ||
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
  ) {
    return 'vip';
  }

  if (isExplicitlyFree && !user.isPremium) {
    return 'free';
  }

  const isPremiumCandidate = Boolean(
    user.isPremium ||
    (user.isSubscribed && !isExplicitlyFree) ||
    membership.includes('premium') ||
    membership.includes('pro') ||
    membership.includes('champion') ||
    subTier.includes('premium') ||
    subTier.includes('pro') ||
    subTier.includes('champion') ||
    plan.includes('premium') ||
    plan.includes('pro') ||
    plan.includes('basic_naira') ||
    planName.includes('premium') ||
    planName.includes('pro') ||
    planName.includes('basic monthly')
  );

  if (isPremiumCandidate) {
    if (!membership.includes('free') && !subTier.includes('free') && !plan.includes('free')) {
      return 'premium';
    }
  }

  return 'free';
}

// Helper: sync a user's selected skills cleanly into relational student_skills and JSON docs
async function syncStudentSkills(params: {
  userId: string;
  skillIds?: string[];
  skills?: string[];
  institutionId?: string;
  institutionName?: string;
}): Promise<{ skillIds: string[]; skills: string[] }> {
  const { data: catRows } = await supabaseAdmin
    .from('campus_skill_categories')
    .select('id, slug, name, is_active')
    .eq('is_active', true);

  const catalog = (catRows && catRows.length > 0)
    ? catRows
    : DEFAULT_CAMPUS_SKILL_CATEGORIES.map((s) => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        is_active: s.isActive,
      }));

  const requestedIds = Array.isArray(params.skillIds) ? params.skillIds : [];
  const requestedNames = Array.isArray(params.skills) ? params.skills : [];

  const matched = new Map<string, string>();
  for (const rawId of requestedIds) {
    const found = catalog.find(
      (c: any) => c.id === rawId || c.slug === rawId || c.name.toLowerCase() === String(rawId).toLowerCase()
    );
    if (found) matched.set(found.id, found.name);
  }
  for (const rawName of requestedNames) {
    const found = catalog.find(
      (c: any) =>
        c.name.toLowerCase() === String(rawName).trim().toLowerCase() ||
        c.id === rawName ||
        c.slug === rawName
    );
    if (found) matched.set(found.id, found.name);
  }

  const finalIds = Array.from(matched.keys());
  const finalNames = Array.from(matched.values());

  await supabaseAdmin.from('student_skills').delete().eq('user_id', params.userId);
  if (finalIds.length > 0) {
    const rows = finalIds.map((skillId) => ({
      user_id: params.userId,
      skill_id: skillId,
      skill_name: matched.get(skillId) || skillId,
      institution_id: params.institutionId || null,
      institution_name: params.institutionName || null,
    }));
    await supabaseAdmin.from('student_skills').insert(rows);
  }

  // Sync onto campus_memberships & users JSON documents for unified reads
  try {
    const { data: memRow } = await supabaseAdmin
      .from('campus_memberships')
      .select('id, data')
      .eq('id', params.userId)
      .maybeSingle();
    if (memRow?.data) {
      await supabaseAdmin.from('campus_memberships').upsert(
        {
          id: params.userId,
          data: {
            ...memRow.data,
            skills: finalNames,
            skillIds: finalIds,
            updatedAt: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    }
  } catch {}

  try {
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('id, data')
      .eq('id', params.userId)
      .maybeSingle();
    if (userRow?.data) {
      await supabaseAdmin.from('users').upsert(
        {
          id: params.userId,
          data: {
            ...userRow.data,
            skills: finalNames,
            skillIds: finalIds,
            updatedAt: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    }
  } catch {}

  return { skillIds: finalIds, skills: finalNames };
}

// 0. GET EXTENSIBLE CAMPUS SKILL CATEGORIES
campusRouter.get('/skills/categories', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('campus_skill_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) {
      return res.json({ success: true, categories: DEFAULT_CAMPUS_SKILL_CATEGORIES });
    }

    const categories = data.map((row: any) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      groupName: row.group_name || 'General Skills',
      icon: row.icon || '✨',
      isActive: Boolean(row.is_active),
      sortOrder: Number(row.sort_order || 0),
    }));

    return res.json({ success: true, categories });
  } catch (err: any) {
    return res.json({ success: true, categories: DEFAULT_CAMPUS_SKILL_CATEGORIES });
  }
});

// 0B. ADMIN: ADD / UPDATE EXTENSIBLE SKILL CATEGORY
campusRouter.post('/skills/categories', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, groupName, icon, sortOrder } = req.body || {};
    if (!name || String(name).trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Skill name is required.' });
    }
    const cleanName = String(name).trim();
    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const id = `skill_${slug.replace(/-/g, '_')}`;

    const { data, error } = await supabaseAdmin
      .from('campus_skill_categories')
      .upsert(
        {
          id,
          slug,
          name: cleanName,
          group_name: String(groupName || 'General Skills').trim(),
          icon: String(icon || '✨').trim(),
          is_active: true,
          sort_order: Number(sortOrder) || 300,
        },
        { onConflict: 'slug' }
      )
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      category: {
        id: data.id,
        slug: data.slug,
        name: data.name,
        groupName: data.group_name,
        icon: data.icon,
        isActive: data.is_active,
        sortOrder: data.sort_order,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 0C. GET USER SELECTED SKILLS
campusRouter.get('/skills/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { data } = await supabaseAdmin
      .from('student_skills')
      .select('skill_id, skill_name')
      .eq('user_id', userId);
    const skillIds = (data || []).map((r: any) => r.skill_id);
    const skills = (data || []).map((r: any) => r.skill_name);
    return res.json({ success: true, skillIds, skills });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 0D. UPDATE AUTHENTICATED STUDENT'S OWN SKILLS
campusRouter.put('/skills', requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    const { skillIds, skills } = req.body || {};

    const synced = await syncStudentSkills({
      userId: authUser.id,
      skillIds: Array.isArray(skillIds) ? skillIds : [],
      skills: Array.isArray(skills) ? skills : [],
      institutionId: authUser.institutionId,
      institutionName: authUser.institutionName,
    });

    const cachedMem = membershipsCache.get(authUser.id);
    if (cachedMem) {
      cachedMem.skills = synced.skills;
      cachedMem.skillIds = synced.skillIds;
      cachedMem.updatedAt = new Date().toISOString();
      membershipsCache.set(authUser.id, cachedMem);
    }

    return res.json({
      success: true,
      message: 'Your Campus skills have been updated.',
      skills: synced.skills,
      skillIds: synced.skillIds,
    });
  } catch (err: any) {
    console.error('Error in PUT /api/campus/skills:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to update skills.' });
  }
});

// 1. JOIN CAMPUS
campusRouter.post('/join', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      whatsappNumber,
      institution,
      institutionId,
      faculty,
      department,
      level,
      institutionCategory,
      skillIds,
      skills,
    } = req.body;

    if (!userId || !whatsappNumber || !institution) {
      return res.status(400).json({
        success: false,
        error: 'User ID, WhatsApp number, and institution are required to join Campus.',
      });
    }

    const formattedNumber = formatWhatsAppNumber(whatsappNumber);
    const digitsOnly = getSanitizedDigitsOnly(formattedNumber);

    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid WhatsApp phone number (10 to 15 digits).',
      });
    }

    const canonical = await resolveCanonicalInstitution({
      institutionId,
      institutionName: institution,
      category: institutionCategory,
    });

    let syncedSkills = { skillIds: [] as string[], skills: [] as string[] };
    if ((Array.isArray(skillIds) && skillIds.length > 0) || (Array.isArray(skills) && skills.length > 0)) {
      try {
        syncedSkills = await syncStudentSkills({
          userId,
          skillIds,
          skills,
          institutionId: canonical?.institutionId || institutionId,
          institutionName: canonical?.institutionName || institution.trim(),
        });
      } catch (skErr) {
        console.warn('Notice syncing initial join skills:', skErr);
      }
    }

    const membershipData: CampusMembership = {
      id: userId,
      userId,
      institution: canonical?.institutionName || institution.trim(),
      institutionId: canonical?.institutionId || institutionId || '',
      institutionCategory: (canonical?.category || institutionCategory || 'University') as any,
      faculty: (faculty || '').trim(),
      department: (department || '').trim(),
      level: (level || '').trim(),
      whatsappNumber: formattedNumber,
      whatsappVerified: true,
      skills: syncedSkills.skills,
      skillIds: syncedSkills.skillIds,
      joinedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      lastActiveAt: new Date().toISOString(),
    };

    // Save to Firestore
    try {
      await setDoc(doc(db, 'campus_memberships', userId), {
        ...membershipData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (dbErr) {
      console.warn('Firestore write warning for campus_memberships:', dbErr);
    }

    membershipsCache.set(userId, membershipData);

    return res.json({
      success: true,
      message: 'Successfully joined GROBAAX Campus!',
      membership: membershipData,
    });
  } catch (err: any) {
    console.error('Error in /api/campus/join:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to join Campus.' });
  }
});

// 2. GET USER MEMBERSHIP
campusRouter.get('/membership/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID required' });
    }

    // Check memory cache first
    if (membershipsCache.has(userId)) {
      return res.json({ success: true, membership: membershipsCache.get(userId) });
    }

    // Check Firestore
    try {
      const snap = await getDoc(doc(db, 'campus_memberships', userId));
      if (snap.exists()) {
        const data = snap.data() as CampusMembership;
        membershipsCache.set(userId, data);
        return res.json({ success: true, membership: data });
      }
    } catch (dbErr) {
      console.warn('Error reading campus_memberships from Firestore:', dbErr);
    }

    return res.json({ success: true, membership: null });
  } catch (err: any) {
    console.error('Error in /api/campus/membership:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. UPDATE WHATSAPP NUMBER
campusRouter.put('/whatsapp-number', async (req: Request, res: Response) => {
  try {
    const { userId, whatsappNumber } = req.body;
    if (!userId || !whatsappNumber) {
      return res.status(400).json({ success: false, error: 'User ID and WhatsApp number are required.' });
    }

    const formattedNumber = formatWhatsAppNumber(whatsappNumber);
    const digitsOnly = getSanitizedDigitsOnly(formattedNumber);

    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid WhatsApp phone number (10 to 15 digits).',
      });
    }

    try {
      await updateDoc(doc(db, 'campus_memberships', userId), {
        whatsappNumber: formattedNumber,
        updatedAt: serverTimestamp(),
      });
    } catch (dbErr) {
      console.warn('Error updating WhatsApp number in Firestore:', dbErr);
    }

    const existing = membershipsCache.get(userId);
    if (existing) {
      existing.whatsappNumber = formattedNumber;
      existing.updatedAt = new Date().toISOString();
      membershipsCache.set(userId, existing);
    }

    return res.json({
      success: true,
      message: 'WhatsApp number updated successfully.',
      whatsappNumber: formattedNumber,
    });
  } catch (err: any) {
    console.error('Error in /api/campus/whatsapp-number:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. GET STUDENTS DIRECTORY (STRICT INSTITUTION ENFORCEMENT + SKILLS FILTERING + FOLLOW COUNTS)
campusRouter.get('/students', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { institution, faculty, department, skill, search, requestingUserId } = req.query as {
      institution?: string;
      faculty?: string;
      department?: string;
      skill?: string;
      search?: string;
      requestingUserId?: string;
    };
    const effectiveViewerId = req.authUser?.id || requestingUserId || '';

    if (!institution) {
      return res.status(400).json({
        success: false,
        error: 'Institution parameter is strictly required.',
      });
    }

    const targetInstitution = institution.trim().toLowerCase();
    const targetSkill = (skill || '').trim().toLowerCase();
    const studentsMap = new Map<string, CampusStudentCard>();

    // Preload relational student_skills for fast lookup
    const userSkillsMap = new Map<string, { skills: string[]; skillIds: string[] }>();
    try {
      const { data: skillRows } = await supabaseAdmin
        .from('student_skills')
        .select('user_id, skill_id, skill_name');
      for (const row of skillRows || []) {
        const entry = userSkillsMap.get(row.user_id) || { skills: [], skillIds: [] };
        if (!entry.skills.includes(row.skill_name)) entry.skills.push(row.skill_name);
        if (!entry.skillIds.includes(row.skill_id)) entry.skillIds.push(row.skill_id);
        userSkillsMap.set(row.user_id, entry);
      }
    } catch {}

    const matchesSkillFilter = (skillsList: string[], skillIdsList: string[]) => {
      if (!targetSkill) return true;
      return (
        skillsList.some((sk) => sk.toLowerCase().includes(targetSkill) || targetSkill.includes(sk.toLowerCase())) ||
        skillIdsList.some((sid) => sid.toLowerCase() === targetSkill)
      );
    };

    // 1. Preload users collection as lookup map to enrich joined Campus members (never expose unjoined users)
    const rawUsersMap = new Map<string, any>();
    try {
      const usersRef = collection(db, 'users');
      const usersSnap = await getDocs(usersRef);
      usersSnap.forEach((docSnap) => {
        rawUsersMap.set(docSnap.id, docSnap.data());
      });
    } catch (usersErr) {
      console.warn('Error reading users from Firestore:', usersErr);
    }

    // 2. Strictly list ONLY students who have joined Campus (active records in campus_memberships)
    try {
      const memRef = collection(db, 'campus_memberships');
      const memSnap = await getDocs(memRef);
      memSnap.forEach((docSnap) => {
        const data = docSnap.data() as CampusMembership;
        const memberId = data.userId || docSnap.id;
        if (!memberId || memberId.startsWith('scholar_peer_') || data.status === 'suspended') {
          return;
        }

        const rawUser = rawUsersMap.get(memberId);
        if (rawUser && !isUserAccountActive(rawUser)) {
          return;
        }
        const memInstRaw = (
          data.institution ||
          rawUser?.institution ||
          rawUser?.institutionName ||
          rawUser?.academicProfile?.institutionName ||
          ''
        ).trim();
        const memInst = memInstRaw.toLowerCase();

        if (
          memInst &&
          (memInst === targetInstitution ||
            memInst.includes(targetInstitution) ||
            targetInstitution.includes(memInst))
        ) {
          const userFaculty = (
            data.faculty ||
            rawUser?.faculty ||
            rawUser?.facultyName ||
            rawUser?.academicProfile?.facultyName ||
            rawUser?.academicProfile?.faculty ||
            ''
          ).trim();
          const userDept = (
            data.department ||
            rawUser?.department ||
            rawUser?.departmentName ||
            rawUser?.academicProfile?.departmentName ||
            rawUser?.academicProfile?.department ||
            ''
          ).trim();
          const userLevel = data.level || rawUser?.level || rawUser?.academicProfile?.level || '100 Level';
          const userName = rawUser?.name || rawUser?.fullName || rawUser?.username || 'Scholar';
          const userUsername = rawUser?.username
            ? (rawUser.username.startsWith('@') ? rawUser.username : `@${rawUser.username}`)
            : `@scholar_${memberId.substring(0, 5)}`;
          const userAvatar =
            rawUser?.avatar ||
            rawUser?.profileImage ||
            `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userName || memberId)}`;
          const userTier = rawUser ? getUserTier(rawUser) : 'free';

          const relSkills = userSkillsMap.get(memberId);
          const mSkills: string[] = relSkills?.skills?.length
            ? relSkills.skills
            : Array.isArray(data.skills) && data.skills.length > 0
            ? data.skills
            : Array.isArray(rawUser?.skills)
            ? rawUser.skills
            : [];
          const mSkillIds: string[] = relSkills?.skillIds?.length
            ? relSkills.skillIds
            : Array.isArray(data.skillIds) && data.skillIds.length > 0
            ? data.skillIds
            : Array.isArray(rawUser?.skillIds)
            ? rawUser.skillIds
            : [];

          const matchesFaculty =
            !faculty ||
            (userFaculty.length > 0 &&
              (userFaculty.toLowerCase().includes(faculty.toLowerCase()) ||
                faculty.toLowerCase().includes(userFaculty.toLowerCase())));
          const matchesDepartment =
            !department ||
            (userDept.length > 0 &&
              (userDept.toLowerCase().includes(department.toLowerCase()) ||
                department.toLowerCase().includes(userDept.toLowerCase())));
          const matchesSkill = matchesSkillFilter(mSkills, mSkillIds);

          let matchesSearch = true;
          if (search && search.trim()) {
            const s = search.trim().toLowerCase();
            matchesSearch =
              userName.toLowerCase().includes(s) ||
              userUsername.toLowerCase().includes(s) ||
              userDept.toLowerCase().includes(s) ||
              userFaculty.toLowerCase().includes(s) ||
              mSkills.some((sk) => sk.toLowerCase().includes(s));
          }

          if (matchesFaculty && matchesDepartment && matchesSkill && matchesSearch) {
            const hasBlue = Boolean(
              userTier === 'premium' ||
                userTier === 'vip' ||
                rawUser?.isVerified ||
                rawUser?.hasBlueBadge ||
                rawUser?.verifiedBadge
            );
            studentsMap.set(memberId, {
              id: memberId,
              name: userName,
              username: userUsername,
              avatar: userAvatar,
              institution: memInstRaw || institution,
              institutionId:
                data.institutionId || rawUser?.institutionId || rawUser?.academicProfile?.institutionId,
              faculty: userFaculty,
              department: userDept,
              level: userLevel,
              bio: rawUser?.bio || '',
              skills: mSkills,
              skillIds: mSkillIds,
              tier: userTier,
              hasBlueBadge: hasBlue,
              isVerified: hasBlue,
              isOnline: true,
              connectionStatus: memberId === effectiveViewerId ? 'self' : 'none',
              joinedCampus: true,
              followersCount: 0,
              followingCount: 0,
              isFollowing: false,
            });
          }
        }
      });
    } catch (memErr) {
      console.warn('Error reading campus memberships:', memErr);
    }

    // 4. Fetch connection requests for the requesting user to set connectionStatus
    if (effectiveViewerId) {
      try {
        const reqRef = collection(db, 'campus_connection_requests');
        const reqSnap = await getDocs(reqRef);
        reqSnap.forEach((docSnap) => {
          const reqData = docSnap.data() as CampusConnectionRequest;
          if (reqData.senderId === requestingUserId && studentsMap.has(reqData.recipientId)) {
            const student = studentsMap.get(reqData.recipientId)!;
            if (reqData.status === 'PENDING') {
              student.connectionStatus = 'pending_sent';
            } else if (reqData.status === 'ACCEPTED') {
              student.connectionStatus = 'accepted';
            } else if (reqData.status === 'REJECTED') {
              student.connectionStatus = 'rejected';
            }
            student.requestId = docSnap.id;
          } else if (reqData.recipientId === requestingUserId && studentsMap.has(reqData.senderId)) {
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
        console.warn('Error reading connection requests:', reqErr);
      }

      connectionRequestsCache.forEach((reqData) => {
        if (reqData.senderId === requestingUserId && studentsMap.has(reqData.recipientId)) {
          const student = studentsMap.get(reqData.recipientId)!;
          if (reqData.status === 'PENDING') {
            student.connectionStatus = 'pending_sent';
          } else if (reqData.status === 'ACCEPTED') {
            student.connectionStatus = 'accepted';
          } else if (reqData.status === 'REJECTED') {
            student.connectionStatus = 'rejected';
          }
          student.requestId = reqData.id;
        } else if (reqData.recipientId === requestingUserId && studentsMap.has(reqData.senderId)) {
          const student = studentsMap.get(reqData.senderId)!;
          if (reqData.status === 'PENDING') {
            student.connectionStatus = 'pending_received';
          } else if (reqData.status === 'ACCEPTED') {
            student.connectionStatus = 'accepted';
          } else if (reqData.status === 'REJECTED') {
            student.connectionStatus = 'none';
          }
          student.requestId = reqData.id;
        }
      });
    }

    // Enrich follower/following counts & isFollowing cleanly from public.campus_follows
    const studentIds = Array.from(studentsMap.keys());
    if (studentIds.length > 0) {
      try {
        const [{ data: followerEdges }, { data: followingEdges }] = await Promise.all([
          supabaseAdmin
            .from('campus_follows')
            .select('follower_user_id, following_user_id')
            .in('following_user_id', studentIds),
          supabaseAdmin
            .from('campus_follows')
            .select('follower_user_id, following_user_id')
            .in('follower_user_id', studentIds),
        ]);

        const isActiveCounterpart = (uid: string) => {
          const u = rawUsersMap.get(uid);
          return !u || isUserAccountActive(u);
        };

        const followersSets = new Map<string, Set<string>>();
        const followingSets = new Map<string, Set<string>>();
        const followedByViewer = new Set<string>();

        for (const edge of followerEdges || []) {
          if (edge.follower_user_id === edge.following_user_id) continue;
          if (!isActiveCounterpart(edge.follower_user_id)) continue;
          const s = followersSets.get(edge.following_user_id) || new Set<string>();
          s.add(edge.follower_user_id);
          followersSets.set(edge.following_user_id, s);
          if (effectiveViewerId && edge.follower_user_id === effectiveViewerId) {
            followedByViewer.add(edge.following_user_id);
          }
        }

        for (const edge of followingEdges || []) {
          if (edge.follower_user_id === edge.following_user_id) continue;
          if (!isActiveCounterpart(edge.following_user_id)) continue;
          const s = followingSets.get(edge.follower_user_id) || new Set<string>();
          s.add(edge.following_user_id);
          followingSets.set(edge.follower_user_id, s);
        }

        for (const [sid, card] of studentsMap.entries()) {
          card.followersCount = followersSets.get(sid)?.size || 0;
          card.followingCount = followingSets.get(sid)?.size || 0;
          card.isFollowing = sid !== effectiveViewerId && followedByViewer.has(sid);
        }
      } catch (followErr) {
        console.warn('Error enriching student follow counts:', followErr);
      }
    }

    const students = Array.from(studentsMap.values());

    return res.json({
      success: true,
      count: students.length,
      institution,
      students,
    });
  } catch (err: any) {
    console.error('Error in /api/campus/students:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4B. GET SINGLE STUDENT PROFILE (for article author profile modal & direct profile lookup)
campusRouter.get('/students/:targetUserId', optionalAuth, async (req: Request, res: Response) => {
  try {
    const targetUserId = decodeURIComponent(req.params.targetUserId || '').trim();
    const { requestingUserId } = req.query as { requestingUserId?: string };
    const effectiveViewerId = req.authUser?.id || requestingUserId || '';

    if (!targetUserId) {
      return res.status(400).json({ success: false, error: 'Target student user ID is required.' });
    }

    const [{ data: userRow }, { data: memRow }, { data: skillRows }] = await Promise.all([
      supabaseAdmin.from('users').select('id, data').eq('id', targetUserId).maybeSingle(),
      supabaseAdmin.from('campus_memberships').select('id, data').eq('id', targetUserId).maybeSingle(),
      supabaseAdmin.from('student_skills').select('skill_id, skill_name').eq('user_id', targetUserId),
    ]);

    let rawUser: any = userRow?.data || null;
    if (!rawUser) {
      try {
        const uSnap = await getDoc(doc(db, 'users', targetUserId));
        if (uSnap.exists()) rawUser = uSnap.data();
      } catch {}
    }

    let memData: any = memRow?.data || null;
    if (!memData) {
      try {
        const mSnap = await getDoc(doc(db, 'campus_memberships', targetUserId));
        if (mSnap.exists()) memData = mSnap.data();
      } catch {}
    }

    if (!rawUser && !memData) {
      return res.status(404).json({ success: false, error: 'Student profile not found.' });
    }

    if (rawUser && !isUserAccountActive(rawUser)) {
      return res.status(404).json({ success: false, error: 'Student profile is unavailable.' });
    }

    const userName = rawUser?.name || rawUser?.fullName || rawUser?.username || memData?.userName || 'Scholar';
    const userUsername = rawUser?.username
      ? rawUser.username.startsWith('@')
        ? rawUser.username
        : `@${rawUser.username}`
      : `@scholar_${targetUserId.substring(0, 5)}`;
    const userAvatar =
      rawUser?.avatar ||
      rawUser?.profileImage ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userName || targetUserId)}`;

    const userInstitution = (
      memData?.institution ||
      rawUser?.institution ||
      rawUser?.institutionName ||
      rawUser?.academicProfile?.institutionName ||
      'Grobaax Campus'
    ).trim();
    const userFaculty = (
      memData?.faculty ||
      rawUser?.faculty ||
      rawUser?.facultyName ||
      rawUser?.academicProfile?.facultyName ||
      rawUser?.academicProfile?.faculty ||
      ''
    ).trim();
    const userDepartment = (
      memData?.department ||
      rawUser?.department ||
      rawUser?.departmentName ||
      rawUser?.academicProfile?.departmentName ||
      rawUser?.academicProfile?.department ||
      ''
    ).trim();
    const userLevel =
      memData?.level ||
      rawUser?.level ||
      rawUser?.academicProfile?.level ||
      'Student';

    const relSkillNames = Array.from(new Set((skillRows || []).map((r: any) => r.skill_name).filter(Boolean)));
    const relSkillIds = Array.from(new Set((skillRows || []).map((r: any) => r.skill_id).filter(Boolean)));
    const mSkills: string[] = relSkillNames.length
      ? relSkillNames
      : Array.isArray(memData?.skills) && memData.skills.length > 0
      ? memData.skills
      : Array.isArray(rawUser?.skills)
      ? rawUser.skills
      : [];
    const mSkillIds: string[] = relSkillIds.length
      ? relSkillIds
      : Array.isArray(memData?.skillIds) && memData.skillIds.length > 0
      ? memData.skillIds
      : Array.isArray(rawUser?.skillIds)
      ? rawUser.skillIds
      : [];

    const userTier = rawUser ? getUserTier(rawUser) : 'free';
    const hasBlue = Boolean(
      userTier === 'premium' ||
        userTier === 'vip' ||
        rawUser?.isVerified ||
        rawUser?.hasBlueBadge ||
        rawUser?.verifiedBadge
    );

    const followStats = await computeFollowCounts(targetUserId, effectiveViewerId || undefined);

    let connectionStatus: CampusStudentCard['connectionStatus'] =
      effectiveViewerId && effectiveViewerId === targetUserId ? 'self' : 'none';
    let requestId: string | undefined;

    if (effectiveViewerId && effectiveViewerId !== targetUserId) {
      try {
        const reqSnap = await getDocs(collection(db, 'campus_connection_requests'));
        reqSnap.forEach((docSnap) => {
          const reqData = docSnap.data() as CampusConnectionRequest;
          if (reqData.senderId === effectiveViewerId && reqData.recipientId === targetUserId) {
            if (reqData.status === 'PENDING') connectionStatus = 'pending_sent';
            else if (reqData.status === 'ACCEPTED') connectionStatus = 'accepted';
            else if (reqData.status === 'REJECTED') connectionStatus = 'rejected';
            requestId = docSnap.id;
          } else if (reqData.recipientId === effectiveViewerId && reqData.senderId === targetUserId) {
            if (reqData.status === 'PENDING') connectionStatus = 'pending_received';
            else if (reqData.status === 'ACCEPTED') connectionStatus = 'accepted';
            else if (reqData.status === 'REJECTED') connectionStatus = 'none';
            requestId = docSnap.id;
          }
        });
      } catch (reqErr) {
        console.warn('Error checking connection status for profile:', reqErr);
      }

      connectionRequestsCache.forEach((reqData) => {
        if (reqData.senderId === effectiveViewerId && reqData.recipientId === targetUserId) {
          if (reqData.status === 'PENDING') connectionStatus = 'pending_sent';
          else if (reqData.status === 'ACCEPTED') connectionStatus = 'accepted';
          else if (reqData.status === 'REJECTED') connectionStatus = 'rejected';
          requestId = reqData.id;
        } else if (reqData.recipientId === effectiveViewerId && reqData.senderId === targetUserId) {
          if (reqData.status === 'PENDING') connectionStatus = 'pending_received';
          else if (reqData.status === 'ACCEPTED') connectionStatus = 'accepted';
          else if (reqData.status === 'REJECTED') connectionStatus = 'none';
          requestId = reqData.id;
        }
      });
    }

    const student: CampusStudentCard = {
      id: targetUserId,
      name: userName,
      username: userUsername,
      avatar: userAvatar,
      institution: userInstitution,
      institutionId:
        memData?.institutionId || rawUser?.institutionId || rawUser?.academicProfile?.institutionId,
      faculty: userFaculty,
      department: userDepartment,
      level: userLevel,
      bio: rawUser?.bio || '',
      skills: mSkills,
      skillIds: mSkillIds,
      tier: userTier,
      hasBlueBadge: hasBlue,
      isVerified: hasBlue,
      isOnline: true,
      connectionStatus,
      requestId,
      joinedCampus: Boolean(memData),
      followersCount: followStats.followersCount,
      followingCount: followStats.followingCount,
      isFollowing: effectiveViewerId && effectiveViewerId !== targetUserId ? followStats.isFollowing : false,
    };

    return res.json({ success: true, student });
  } catch (err: any) {
    console.error('Error in GET /api/campus/students/:targetUserId:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to load student profile.' });
  }
});

// 5. SEND CHAT REQUEST
campusRouter.post('/request', async (req: Request, res: Response) => {
  try {
    const {
      senderId,
      senderName,
      senderUsername,
      senderAvatar,
      senderInstitution,
      senderFaculty,
      senderDepartment,
      senderLevel,
      senderTier,
      recipientId,
      recipientName,
      recipientUsername,
      recipientAvatar,
      recipientInstitution,
      recipientFaculty,
      recipientDepartment,
      recipientLevel,
      recipientTier,
    } = req.body;

    if (!senderId || !recipientId) {
      return res.status(400).json({ success: false, error: 'Sender and Recipient IDs are required.' });
    }

    if (senderId === recipientId) {
      return res.status(400).json({ success: false, error: 'You cannot send a connection request to yourself.' });
    }

    // Institution restriction check
    const sInst = (senderInstitution || '').trim().toLowerCase();
    const rInst = (recipientInstitution || '').trim().toLowerCase();
    if (sInst && rInst && sInst !== rInst && !sInst.includes(rInst) && !rInst.includes(sInst)) {
      return res.status(403).json({
        success: false,
        error: 'Campus connections are strictly restricted to students from your own registered institution.',
      });
    }

    // Check for existing pending request
    const existingKey = `${senderId}_${recipientId}`;
    if (connectionRequestsCache.has(existingKey)) {
      const req = connectionRequestsCache.get(existingKey)!;
      if (req.status === 'PENDING') {
        return res.status(400).json({
          success: false,
          error: 'A connection request to this scholar is already pending.',
        });
      }
    }

    const newRequest: CampusConnectionRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderId,
      senderName: senderName || 'Scholar',
      senderUsername: senderUsername || '@scholar',
      senderAvatar: senderAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${senderId}`,
      senderInstitution: senderInstitution || '',
      senderFaculty: senderFaculty || '',
      senderDepartment: senderDepartment || '',
      senderLevel: senderLevel || '',
      senderTier: senderTier || 'free',
      recipientId,
      recipientName: recipientName || 'Scholar',
      recipientUsername: recipientUsername || '@scholar',
      recipientAvatar: recipientAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${recipientId}`,
      recipientInstitution: recipientInstitution || senderInstitution || '',
      recipientFaculty: recipientFaculty || '',
      recipientDepartment: recipientDepartment || '',
      recipientLevel: recipientLevel || '',
      recipientTier: recipientTier || 'free',
      institution: senderInstitution || recipientInstitution || '',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to Firestore
    try {
      const docRef = await addDoc(collection(db, 'campus_connection_requests'), {
        ...newRequest,
        createdAtServer: serverTimestamp(),
      });
      newRequest.id = docRef.id;

      // Send notification to recipient
      await addDoc(collection(db, 'notifications'), {
        title: 'New Campus Connection Request',
        message: `${newRequest.senderName} (${newRequest.senderDepartment}) wants to connect with you on WhatsApp.`,
        type: 'campus',
        targetUserId: recipientId,
        userId: recipientId,
        senderUserId: senderId,
        senderName: newRequest.senderName,
        senderAvatar: newRequest.senderAvatar,
        requestId: docRef.id,
        actionUrl: '/community?tab=campus&view=connections',
        isRead: false,
        createdAt: serverTimestamp(),
      });
    } catch (dbErr) {
      console.warn('Firestore write warning for campus_connection_requests:', dbErr);
    }

    connectionRequestsCache.set(existingKey, newRequest);
    connectionRequestsCache.set(newRequest.id, newRequest);

    return res.json({
      success: true,
      message: 'Connection request sent successfully!',
      request: newRequest,
    });
  } catch (err: any) {
    console.error('Error in /api/campus/request:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. RESPOND TO CHAT REQUEST (ACCEPT / REJECT)
campusRouter.post('/respond', async (req: Request, res: Response) => {
  try {
    const { requestId, recipientId, action } = req.body;

    if (!requestId || !recipientId || !action) {
      return res.status(400).json({ success: false, error: 'Request ID, recipient ID, and action are required.' });
    }

    if (action !== 'ACCEPT' && action !== 'REJECT') {
      return res.status(400).json({ success: false, error: 'Action must be ACCEPT or REJECT.' });
    }

    const nextStatus: 'ACCEPTED' | 'REJECTED' = action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED';

    // Retrieve request from Firestore or cache
    let requestObj: CampusConnectionRequest | null = null;
    let actualDocId = requestId;

    try {
      const snap = await getDoc(doc(db, 'campus_connection_requests', requestId));
      if (snap.exists()) {
        requestObj = { ...snap.data(), id: snap.id } as CampusConnectionRequest;
        actualDocId = snap.id;
      }
    } catch (readErr) {
      console.warn('Error reading connection request:', readErr);
    }

    // Fallback lookup by 'id' property if direct doc id lookup didn't find it
    if (!requestObj) {
      try {
        const qRef = query(collection(db, 'campus_connection_requests'), where('id', '==', requestId));
        const qSnap = await getDocs(qRef);
        if (!qSnap.empty) {
          const first = qSnap.docs[0];
          requestObj = { ...first.data(), id: first.id } as CampusConnectionRequest;
          actualDocId = first.id;
        }
      } catch (qErr) {
        console.warn('Error querying connection request by field:', qErr);
      }
    }

    // Fallback lookup by recipientId
    if (!requestObj && recipientId) {
      try {
        const qRef2 = query(collection(db, 'campus_connection_requests'), where('recipientId', '==', recipientId));
        const qSnap2 = await getDocs(qRef2);
        for (const docItem of qSnap2.docs) {
          const data = docItem.data();
          if (docItem.id === requestId || data.id === requestId || data.status === 'PENDING') {
            requestObj = { ...data, id: docItem.id } as CampusConnectionRequest;
            actualDocId = docItem.id;
            break;
          }
        }
      } catch (qErr2) {
        console.warn('Error querying connection request by recipient:', qErr2);
      }
    }

    if (!requestObj && connectionRequestsCache.has(requestId)) {
      requestObj = connectionRequestsCache.get(requestId)!;
    }

    if (!requestObj) {
      return res.status(404).json({ success: false, error: 'Connection request not found.' });
    }

    // Update in Firestore
    try {
      await updateDoc(doc(db, 'campus_connection_requests', actualDocId), {
        status: nextStatus,
        respondedAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      });

      // If accepted, notify sender
      if (nextStatus === 'ACCEPTED') {
        await addDoc(collection(db, 'notifications'), {
          title: 'Campus Connection Accepted! 🎉',
          message: `${requestObj.recipientName} accepted your Campus connection request. You can now chat on WhatsApp!`,
          type: 'campus',
          targetUserId: requestObj.senderId,
          userId: requestObj.senderId,
          senderUserId: recipientId,
          senderName: requestObj.recipientName,
          senderAvatar: requestObj.recipientAvatar,
          requestId: actualDocId,
          actionUrl: '/community?tab=campus&view=connections',
          isRead: false,
          createdAt: serverTimestamp(),
        });
      }
    } catch (upErr) {
      console.warn('Error updating connection request in Firestore:', upErr);
    }

    requestObj.status = nextStatus;
    requestObj.respondedAt = new Date().toISOString();
    connectionRequestsCache.set(actualDocId, requestObj);
    connectionRequestsCache.set(requestId, requestObj);
    connectionRequestsCache.set(`${requestObj.senderId}_${requestObj.recipientId}`, requestObj);

    return res.json({
      success: true,
      status: nextStatus,
      message: nextStatus === 'ACCEPTED' ? 'Connection accepted!' : 'Connection request declined.',
      request: requestObj,
    });
  } catch (err: any) {
    console.error('Error in /api/campus/respond:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 7. GET USER'S CONNECTIONS (RECEIVED, SENT, ACCEPTED)
campusRouter.get('/connections/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required.' });
    }

    const received: CampusConnectionRequest[] = [];
    const sent: CampusConnectionRequest[] = [];
    const accepted: CampusConnectionRequest[] = [];

    // Query Firestore
    try {
      const qRef = collection(db, 'campus_connection_requests');
      const snap = await getDocs(qRef);
      snap.forEach((docSnap) => {
        const item = { id: docSnap.id, ...docSnap.data() } as CampusConnectionRequest;
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
    } catch (dbErr) {
      console.warn('Error querying connections from Firestore:', dbErr);
    }

    return res.json({
      success: true,
      received,
      sent,
      accepted,
    });
  } catch (err: any) {
    console.error('Error in /api/campus/connections:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 8. GENERATE SECURE WHATSAPP LINK (STRICT VALIDATION)
campusRouter.post('/whatsapp-link', async (req: Request, res: Response) => {
  try {
    const { requestingUserId, targetUserId, requestId } = req.body;

    if (!requestingUserId || !targetUserId) {
      return res.status(400).json({
        success: false,
        error: 'Both requesting user ID and target user ID are required.',
      });
    }

    // 1. Verify connection request exists and is ACCEPTED
    let isAccepted = false;
    let institution = '';

    if (requestId) {
      try {
        const snap = await getDoc(doc(db, 'campus_connection_requests', requestId));
        if (snap.exists()) {
          const data = snap.data() as CampusConnectionRequest;
          if (
            data.status === 'ACCEPTED' &&
            ((data.senderId === requestingUserId && data.recipientId === targetUserId) ||
              (data.recipientId === requestingUserId && data.senderId === targetUserId))
          ) {
            isAccepted = true;
            institution = data.institution;
          }
        }
      } catch (reqErr) {
        console.warn('Error verifying connection request:', reqErr);
      }
    }

    // Fallback scan if requestId was not provided or not found
    if (!isAccepted) {
      try {
        const qRef = collection(db, 'campus_connection_requests');
        const snap = await getDocs(qRef);
        snap.forEach((docSnap) => {
          const data = docSnap.data() as CampusConnectionRequest;
          if (
            data.status === 'ACCEPTED' &&
            ((data.senderId === requestingUserId && data.recipientId === targetUserId) ||
              (data.recipientId === requestingUserId && data.senderId === targetUserId))
          ) {
            isAccepted = true;
            institution = data.institution;
          }
        });
      } catch (scanErr) {
        console.warn('Error scanning connection requests:', scanErr);
      }
    }

    if (!isAccepted) {
      return res.status(403).json({
        success: false,
        error: 'WhatsApp connection requires an accepted Campus connection request between both students.',
      });
    }

    // 2. Retrieve target user's WhatsApp number securely
    let targetPhone = '';
    let targetName = 'Scholar';

    try {
      const memSnap = await getDoc(doc(db, 'campus_memberships', targetUserId));
      if (memSnap.exists()) {
        const memData = memSnap.data() as CampusMembership;
        targetPhone = memData.whatsappNumber;
      }
    } catch (memErr) {
      console.warn('Error reading target membership:', memErr);
    }

    // Fallback to target user profile if not in membership doc
    if (!targetPhone) {
      try {
        const userSnap = await getDoc(doc(db, 'users', targetUserId));
        if (userSnap.exists()) {
          const userData = userSnap.data();
          targetName = userData.name || userData.fullName || 'Scholar';
          targetPhone = userData.whatsappNumber || userData.phone || '';
        }
      } catch (userErr) {
        console.warn('Error reading target user doc:', userErr);
      }
    }

    if (!targetPhone) {
      return res.status(404).json({
        success: false,
        error: 'This student has not yet registered a verified WhatsApp number.',
      });
    }

    const digitsOnly = getSanitizedDigitsOnly(targetPhone);
    if (!digitsOnly || digitsOnly.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Target user does not have a valid WhatsApp phone number format.',
      });
    }

    // Retrieve requesting user name
    let requesterName = 'A fellow scholar';
    try {
      const reqSnap = await getDoc(doc(db, 'users', requestingUserId));
      if (reqSnap.exists()) {
        const rData = reqSnap.data();
        requesterName = rData.name || rData.fullName || 'A scholar';
      }
    } catch (reqNameErr) {
      console.warn('Error reading requester name:', reqNameErr);
    }

    const prefilledMessage = `Hi ${targetName}, I'm ${requesterName} from GROBAAX Campus (${institution || 'our institution'}). Let's connect! 🎓`;
    const whatsappUrl = `https://wa.me/${digitsOnly}?text=${encodeURIComponent(prefilledMessage)}`;

    return res.json({
      success: true,
      whatsappUrl,
      targetName,
    });
  } catch (err: any) {
    console.error('Error in /api/campus/whatsapp-link:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 9. CAMPUS FOLLOW SYSTEM (STRICTLY INDEPENDENT FROM WHATSAPP CHAT REQUESTS)
// ============================================================================

// Follow another student (no chat request created, no WhatsApp number exposed)
campusRouter.post('/follow', requireAuth, async (req: Request, res: Response) => {
  try {
    const viewer = req.authUser!;
    if (SUSPENDED_STATUSES.has(viewer.accountStatus)) {
      return res.status(403).json({
        success: false,
        error: 'Your account is currently restricted from following students.',
      });
    }

    const targetUserId = String(req.body?.targetUserId || '').trim();
    if (!targetUserId) {
      return res.status(400).json({ success: false, error: 'Target student user ID is required.' });
    }
    if (targetUserId === viewer.id) {
      return res.status(400).json({ success: false, error: 'You cannot follow yourself.' });
    }

    // Verify actor & target exist and are genuine active accounts
    const [{ data: actorUserRow }, { data: targetUserRow }] = await Promise.all([
      supabaseAdmin.from('users').select('id, data').eq('id', viewer.id).maybeSingle(),
      supabaseAdmin.from('users').select('id, data').eq('id', targetUserId).maybeSingle(),
    ]);

    if (!actorUserRow || !isUserAccountActive(actorUserRow.data)) {
      return res.status(403).json({
        success: false,
        error: 'Your account is restricted or ineligible to follow students.',
      });
    }
    if (!targetUserRow) {
      return res.status(404).json({ success: false, error: 'Target student account was not found.' });
    }
    if (!isUserAccountActive(targetUserRow.data)) {
      return res.status(403).json({
        success: false,
        error: 'This student account is suspended or unavailable.',
      });
    }

    // Prevent duplicate-email account inflation against the same target
    const actorEmail = String(actorUserRow.data?.email || viewer.email || '').trim().toLowerCase();
    if (actorEmail) {
      const { data: sameEmailUsers } = await supabaseAdmin
        .from('users')
        .select('id')
        .ilike('data->>email', actorEmail)
        .limit(25);
      const siblingIds = (sameEmailUsers || [])
        .map((r: any) => r.id)
        .filter((id: string) => id && id !== viewer.id);
      if (siblingIds.length > 0) {
        const { data: siblingFollow } = await supabaseAdmin
          .from('campus_follows')
          .select('id')
          .in('follower_user_id', siblingIds)
          .eq('following_user_id', targetUserId)
          .limit(1)
          .maybeSingle();
        if (siblingFollow) {
          const counts = await computeFollowCounts(targetUserId, viewer.id);
          return res.status(409).json({
            success: false,
            alreadyFollowing: true,
            error: 'Duplicate account follow detected and blocked.',
            ...counts,
          });
        }
      }
    }

    // Check duplicate before inserting
    const { data: existingFollow } = await supabaseAdmin
      .from('campus_follows')
      .select('id')
      .eq('follower_user_id', viewer.id)
      .eq('following_user_id', targetUserId)
      .maybeSingle();

    if (existingFollow) {
      const counts = await computeFollowCounts(targetUserId, viewer.id);
      return res.status(409).json({
        success: false,
        alreadyFollowing: true,
        error: 'You are already following this student.',
        ...counts,
      });
    }

    const { error: insertErr } = await supabaseAdmin.from('campus_follows').insert({
      follower_user_id: viewer.id,
      following_user_id: targetUserId,
    });

    if (insertErr) {
      if (insertErr.code === '23505') {
        const counts = await computeFollowCounts(targetUserId, viewer.id);
        return res.status(409).json({
          success: false,
          alreadyFollowing: true,
          error: 'You are already following this student.',
          ...counts,
        });
      }
      return res.status(500).json({ success: false, error: insertErr.message });
    }

    const counts = await computeFollowCounts(targetUserId, viewer.id);
    return res.json({
      success: true,
      message: 'Following student.',
      targetUserId,
      ...counts,
      isFollowing: true,
    });
  } catch (err: any) {
    console.error('Error in POST /api/campus/follow:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to follow student.' });
  }
});

// Unfollow a student (DELETE + POST alias)
async function handleUnfollow(req: Request, res: Response, targetUserIdRaw: string) {
  try {
    const viewer = req.authUser!;
    const targetUserId = String(targetUserIdRaw || '').trim();
    if (!targetUserId) {
      return res.status(400).json({ success: false, error: 'Target student user ID is required.' });
    }
    if (targetUserId === viewer.id) {
      return res.status(400).json({ success: false, error: 'Cannot unfollow yourself.' });
    }

    const { error: delErr } = await supabaseAdmin
      .from('campus_follows')
      .delete()
      .eq('follower_user_id', viewer.id)
      .eq('following_user_id', targetUserId);

    if (delErr) {
      return res.status(500).json({ success: false, error: delErr.message });
    }

    const counts = await computeFollowCounts(targetUserId, viewer.id);
    return res.json({
      success: true,
      message: 'Unfollowed student.',
      targetUserId,
      ...counts,
      isFollowing: false,
    });
  } catch (err: any) {
    console.error('Error unfollowing student:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to unfollow student.' });
  }
}

campusRouter.delete('/follow/:targetUserId', requireAuth, async (req: Request, res: Response) => {
  return handleUnfollow(req, res, decodeURIComponent(req.params.targetUserId || ''));
});

campusRouter.post('/unfollow', requireAuth, async (req: Request, res: Response) => {
  return handleUnfollow(req, res, String(req.body?.targetUserId || ''));
});

// Get follow status & counts for a student profile
campusRouter.get('/follow/status/:targetUserId', optionalAuth, async (req: Request, res: Response) => {
  try {
    const targetUserId = decodeURIComponent(req.params.targetUserId || '').trim();
    if (!targetUserId) {
      return res.status(400).json({ success: false, error: 'Target student user ID is required.' });
    }
    const counts = await computeFollowCounts(targetUserId, req.authUser?.id);
    return res.json({
      success: true,
      targetUserId,
      ...counts,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to check follow status.' });
  }
});

// Get followers or following list for a student (strictly excludes suspended/deleted accounts and never exposes WhatsApp phone numbers)
campusRouter.get('/follow/list/:targetUserId', optionalAuth, async (req: Request, res: Response) => {
  try {
    const targetUserId = decodeURIComponent(req.params.targetUserId || '').trim();
    const listType = req.query.type === 'following' ? 'following' : 'followers';
    if (!targetUserId) {
      return res.status(400).json({ success: false, error: 'Target user ID is required.' });
    }

    const viewerId = req.authUser?.id || '';

    const { data: followEdges, error: edgesErr } =
      listType === 'followers'
        ? await supabaseAdmin
            .from('campus_follows')
            .select('follower_user_id, created_at')
            .eq('following_user_id', targetUserId)
            .neq('follower_user_id', targetUserId)
            .order('created_at', { ascending: false })
            .limit(500)
        : await supabaseAdmin
            .from('campus_follows')
            .select('following_user_id, created_at')
            .eq('follower_user_id', targetUserId)
            .neq('following_user_id', targetUserId)
            .order('created_at', { ascending: false })
            .limit(500);

    if (edgesErr) {
      return res.status(500).json({ success: false, error: edgesErr.message });
    }

    const edgePairs = (followEdges || [])
      .map((r: any) => ({
        userId: listType === 'followers' ? r.follower_user_id : r.following_user_id,
        followedAt: r.created_at,
      }))
      .filter((x) => Boolean(x.userId));

    if (edgePairs.length === 0) {
      return res.json({ success: true, type: listType, total: 0, users: [] });
    }

    const userIds = Array.from(new Set(edgePairs.map((p) => p.userId)));
    const userMap = new Map<string, any>();
    const membershipMap = new Map<string, any>();

    for (let i = 0; i < userIds.length; i += 150) {
      const slice = userIds.slice(i, i + 150);
      const [{ data: uRows }, { data: mRows }] = await Promise.all([
        supabaseAdmin.from('users').select('id, data').in('id', slice),
        supabaseAdmin.from('campus_memberships').select('id, data').in('id', slice),
      ]);
      for (const u of uRows || []) userMap.set(u.id, u.data);
      for (const m of mRows || []) membershipMap.set(m.id, m.data);
    }

    const viewerFollowingSet = new Set<string>();
    if (viewerId) {
      const { data: vEdges } = await supabaseAdmin
        .from('campus_follows')
        .select('following_user_id')
        .eq('follower_user_id', viewerId)
        .in('following_user_id', userIds);
      for (const ve of vEdges || []) viewerFollowingSet.add(ve.following_user_id);
    }

    const users = edgePairs
      .map(({ userId, followedAt }) => {
        const rawUser = userMap.get(userId);
        if (!rawUser || !isUserAccountActive(rawUser)) return null;
        const mem = membershipMap.get(userId) || {};
        const name = rawUser.name || rawUser.fullName || rawUser.username || 'Scholar';
        const username = rawUser.username
          ? rawUser.username.startsWith('@')
            ? rawUser.username
            : `@${rawUser.username}`
          : `@scholar_${userId.substring(0, 5)}`;
        const tier = getUserTier(rawUser);
        const hasBlue = Boolean(
          tier === 'premium' ||
            tier === 'vip' ||
            rawUser.isVerified ||
            rawUser.hasBlueBadge ||
            rawUser.verifiedBadge
        );
        return {
          id: userId,
          name,
          username,
          avatar:
            rawUser.avatar ||
            rawUser.profileImage ||
            `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name || userId)}`,
          institution:
            mem.institution ||
            rawUser.institution ||
            rawUser.institutionName ||
            rawUser.academicProfile?.institutionName ||
            '',
          department:
            mem.department ||
            rawUser.department ||
            rawUser.departmentName ||
            rawUser.academicProfile?.departmentName ||
            'General Studies',
          level: mem.level || rawUser.level || rawUser.academicProfile?.level || '100 Level',
          tier,
          hasBlueBadge: hasBlue,
          isVerified: hasBlue,
          isFollowing: viewerId ? viewerFollowingSet.has(userId) : false,
          followedAt,
        };
      })
      .filter(Boolean);

    return res.json({
      success: true,
      type: listType,
      total: users.length,
      users,
    });
  } catch (err: any) {
    console.error('Error in GET /api/campus/follow/list/:targetUserId:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to load follow list.' });
  }
});
