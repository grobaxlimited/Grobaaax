import { Request, Response, NextFunction } from 'express';
import {
  supabaseAdmin,
  isSuperAdmin,
} from '../../src/lib/supabase';
import { isPrimarySuperAdmin } from '../../src/lib/adminPermissions';
import { resolveCanonicalInstitution, CanonicalInstitution } from './institutionResolver';

export interface VerifiedRequestUser {
  id: string;
  email: string;
  name: string;
  department: string;
  level: string;
  role: string;
  managerRole?: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  institutionId: string;
  institutionName: string;
  institutionCategory: string;
  canonicalInstitution: CanonicalInstitution | null;
  subscriptionTier: 'free' | 'premium' | 'vip';
  hasActiveSubscription: boolean;
  subscriptionExpired: boolean;
  subscriptionExpiry: string | null;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: VerifiedRequestUser | null;
    }
  }
}

function isTimestampExpired(rawExpiry: any): boolean {
  if (!rawExpiry || typeof rawExpiry !== 'string') return false;
  if (!rawExpiry.trim()) return false;
  const ts = new Date(rawExpiry).getTime();
  return !Number.isNaN(ts) && ts <= Date.now();
}

function resolveAuthoritativeSubscription(params: {
  userData: any;
  subRows: any[];
  isStaffOrAdmin: boolean;
}): {
  subscriptionTier: 'free' | 'premium' | 'vip';
  hasActiveSubscription: boolean;
  subscriptionExpired: boolean;
  subscriptionExpiry: string | null;
} {
  const { userData, subRows, isStaffOrAdmin } = params;

  if (isStaffOrAdmin) {
    return {
      subscriptionTier: 'vip',
      hasActiveSubscription: true,
      subscriptionExpired: false,
      subscriptionExpiry: null,
    };
  }

  const user = userData || {};
  const rawExpiry =
    user.subscriptionExpiry ||
    user.subscription?.expiryDate ||
    user.subscription?.expiresAt ||
    user.subscription?.subscriptionExpiry ||
    user.expiryDate ||
    user.expiresAt ||
    null;

  const explicitExpired = Boolean(
    user.isExpired === true ||
      user.status === 'expired' ||
      user.subscriptionStatus === 'expired' ||
      (user.subscription &&
        ['expired', 'inactive', 'cancelled'].includes(
          String(user.subscription.status || '').toLowerCase()
        )) ||
      isTimestampExpired(rawExpiry)
  );

  // Also examine latest userSubscriptions records for this user
  const sortedSubs = [...(subRows || [])].sort((a, b) => {
    const aTime = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
    const bTime = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
    return bTime - aTime;
  });

  const latestActiveSub = sortedSubs.find((s) => {
    if (!s) return false;
    const status = String(s.status || '').toLowerCase();
    if (['expired', 'inactive', 'cancelled'].includes(status)) return false;
    if (isTimestampExpired(s.expiryDate || s.expiresAt)) return false;
    const combined = `${s.planId || ''} ${s.planNameSnapshot || ''} ${s.targetTier || ''} ${s.tierType || ''}`.toLowerCase();
    if (combined.includes('free')) return false;
    return status === 'active' || Boolean(s.planId || s.targetTier || s.tierType);
  });

  // If user doc says expired and there is NO newer active non-expired userSubscriptions record
  if (explicitExpired && !latestActiveSub) {
    return {
      subscriptionTier: 'free',
      hasActiveSubscription: false,
      subscriptionExpired: true,
      subscriptionExpiry: typeof rawExpiry === 'string' ? rawExpiry : null,
    };
  }

  const membership = String(user.membershipTier || '').toLowerCase().trim();
  const subTier = String(user.subscriptionTier || '').toLowerCase().trim();
  const plan = String(
    user.subscriptionPlan ||
      user.planId ||
      user.tier ||
      user.activePlanId ||
      user.plan ||
      ''
  )
    .toLowerCase()
    .trim();
  const planName = String(
    user.planNameSnapshot || user.subscription?.name || user.subscription?.planId || ''
  )
    .toLowerCase()
    .trim();
  const targetTier = String(user.targetTier || user.tierType || '').toLowerCase().trim();

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

  // VIP classification from user record
  const isUserDocVip =
    !explicitExpired &&
    Boolean(
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

  // Premium classification from user record
  const isUserDocPremium =
    !explicitExpired &&
    !(user.isSubscribed === false && !user.isPremium) &&
    !(isExplicitlyFree && !user.isPremium && !user.isSubscribed) &&
    !membership.includes('free') &&
    !subTier.includes('free') &&
    !plan.includes('free') &&
    Boolean(
      user.isPremium ||
        targetTier === 'premium' ||
        (user.isSubscribed && !isExplicitlyFree) ||
        (user.subscription && user.subscription.status === 'active') ||
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

  if (isUserDocVip) {
    return {
      subscriptionTier: 'vip',
      hasActiveSubscription: true,
      subscriptionExpired: false,
      subscriptionExpiry: typeof rawExpiry === 'string' ? rawExpiry : null,
    };
  }

  if (isUserDocPremium) {
    return {
      subscriptionTier: 'premium',
      hasActiveSubscription: true,
      subscriptionExpired: false,
      subscriptionExpiry: typeof rawExpiry === 'string' ? rawExpiry : null,
    };
  }

  // Fallback to active userSubscriptions record if user doc wasn't synced yet
  if (latestActiveSub) {
    const subCombined = `${latestActiveSub.planId || ''} ${latestActiveSub.planNameSnapshot || ''} ${latestActiveSub.targetTier || ''} ${latestActiveSub.tierType || ''}`.toLowerCase();
    const isSubVip =
      Boolean(latestActiveSub.isVip) ||
      subCombined.includes('vip') ||
      subCombined.includes('titan') ||
      subCombined.includes('annual');
    return {
      subscriptionTier: isSubVip ? 'vip' : 'premium',
      hasActiveSubscription: true,
      subscriptionExpired: false,
      subscriptionExpiry:
        typeof latestActiveSub.expiryDate === 'string' ? latestActiveSub.expiryDate : null,
    };
  }

  const anyExpiredSub = sortedSubs.some((s) => {
    if (!s) return false;
    const status = String(s.status || '').toLowerCase();
    return status === 'expired' || isTimestampExpired(s.expiryDate || s.expiresAt);
  });

  return {
    subscriptionTier: 'free',
    hasActiveSubscription: false,
    subscriptionExpired: explicitExpired || anyExpiredSub,
    subscriptionExpiry: typeof rawExpiry === 'string' ? rawExpiry : null,
  };
}

async function resolveUserContextFromToken(token: string): Promise<VerifiedRequestUser | null> {
  if (!token) return null;
  const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !authData?.user) return null;

  const sbUser = authData.user;
  const uid = sbUser.id;
  const email = (sbUser.email || '').trim().toLowerCase();

  const [userRowRes, membershipRes, managerRes, userSubsRes] = await Promise.all([
    supabaseAdmin.from('users').select('id, data').eq('id', uid).maybeSingle(),
    supabaseAdmin.from('campus_memberships').select('id, data').eq('id', uid).maybeSingle(),
    supabaseAdmin.from('managerAssignments').select('id, data').limit(100),
    supabaseAdmin
      .from('userSubscriptions')
      .select('id, data')
      .eq('data->>userId', uid)
      .limit(20),
  ]);

  const userData: any = userRowRes.data?.data || {};
  const membershipData: any = membershipRes.data?.data || {};
  const subRows: any[] = (userSubsRes.data || []).map((r: any) => r.data).filter(Boolean);

  let managerAssignment: any = null;
  for (const row of managerRes.data || []) {
    const d = row.data || {};
    if (
      d.status === 'active' &&
      (d.uid === uid || (email && String(d.email || '').toLowerCase() === email))
    ) {
      managerAssignment = d;
      break;
    }
  }

  const isSuper =
    isSuperAdmin(uid, email) ||
    isPrimarySuperAdmin(uid, email) ||
    userData.role === 'super_admin' ||
    Boolean(userData.isSuperAdmin) ||
    managerAssignment?.role === 'SUPER_ADMIN';

  const managerRole = isSuper
    ? 'SUPER_ADMIN'
    : managerAssignment?.role || userData.managerRole || null;

  const isAdmin =
    isSuper ||
    userData.role === 'admin' ||
    Boolean(userData.isAdmin) ||
    managerRole === 'ADMIN' ||
    managerRole === 'SUPER_ADMIN' ||
    managerRole === 'COMMUNITY_ANNOUNCEMENT_MANAGER';

  const isStaffOrAdmin =
    isAdmin ||
    userData.role === 'community_manager' ||
    userData.role === 'staff';

  const subscriptionStatus = resolveAuthoritativeSubscription({
    userData,
    subRows,
    isStaffOrAdmin,
  });

  const rawInstName =
    membershipData.institution ||
    userData.institution ||
    userData.institutionName ||
    userData.academicProfile?.institutionName ||
    '';
  const rawInstId =
    membershipData.institutionId ||
    userData.institutionId ||
    userData.academicProfile?.institutionId ||
    '';
  const rawInstCategory =
    membershipData.institutionCategory ||
    userData.institutionCategory ||
    userData.academicProfile?.institutionCategory ||
    'University';

  const canonical = await resolveCanonicalInstitution({
    institutionId: rawInstId,
    institutionName: rawInstName,
    category: rawInstCategory,
  });

  const name =
    userData.name ||
    userData.fullName ||
    sbUser.user_metadata?.full_name ||
    sbUser.user_metadata?.name ||
    email.split('@')[0] ||
    'Grobaax Scholar';

  const department =
    membershipData.department ||
    userData.department ||
    userData.departmentName ||
    userData.academicProfile?.departmentName ||
    '';

  const level =
    membershipData.level ||
    userData.level ||
    userData.academicProfile?.level ||
    '100 Level';

  return {
    id: uid,
    email,
    name,
    department,
    level,
    role: userData.role || 'student',
    managerRole,
    isAdmin,
    isSuperAdmin: isSuper,
    institutionId: canonical?.institutionId || rawInstId,
    institutionName: canonical?.institutionName || rawInstName,
    institutionCategory: canonical?.category || rawInstCategory,
    canonicalInstitution: canonical,
    subscriptionTier: subscriptionStatus.subscriptionTier,
    hasActiveSubscription: subscriptionStatus.hasActiveSubscription,
    subscriptionExpired: subscriptionStatus.subscriptionExpired,
    subscriptionExpiry: subscriptionStatus.subscriptionExpiry,
  };
}

function extractBearerToken(req: Request): string {
  const header = req.headers.authorization || '';
  if (header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  return '';
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req);
    if (token) {
      req.authUser = await resolveUserContextFromToken(token);
    } else {
      req.authUser = null;
    }
  } catch {
    req.authUser = null;
  }
  next();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please sign in to continue.',
      });
    }
    const verified = await resolveUserContextFromToken(token);
    if (!verified) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session token. Please sign in again.',
      });
    }
    req.authUser = verified;
    return next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      error: err?.message || 'Authentication verification failed.',
    });
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  return requireAuth(req, res, () => {
    if (!req.authUser?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Administrator privileges are strictly required for this action.',
      });
    }
    return next();
  });
}
