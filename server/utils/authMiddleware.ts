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
}

declare global {
  namespace Express {
    interface Request {
      authUser?: VerifiedRequestUser | null;
    }
  }
}

async function resolveUserContextFromToken(token: string): Promise<VerifiedRequestUser | null> {
  if (!token) return null;
  const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !authData?.user) return null;

  const sbUser = authData.user;
  const uid = sbUser.id;
  const email = (sbUser.email || '').trim().toLowerCase();

  const [userRowRes, membershipRes, managerRes] = await Promise.all([
    supabaseAdmin.from('users').select('id, data').eq('id', uid).maybeSingle(),
    supabaseAdmin.from('campus_memberships').select('id, data').eq('id', uid).maybeSingle(),
    supabaseAdmin.from('managerAssignments').select('id, data').limit(100),
  ]);

  const userData: any = userRowRes.data?.data || {};
  const membershipData: any = membershipRes.data?.data || {};

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
