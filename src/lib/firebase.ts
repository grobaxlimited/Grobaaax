import {
  db,
  auth,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  increment,
  limit,
  orderBy,
  runTransaction,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  signInWithGoogle,
  setSessionFromUrlOrHash,
  updateProfile,
  deleteUser,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendEmailVerification,
  supabase,
  supabaseAdmin,
  PRIMARY_SUPER_ADMIN_UID,
  SUPER_ADMIN_EMAIL,
  isSuperAdmin,
  getDocFromSupabase,
  setDocToSupabase,
  updateDocInSupabase,
  deleteDocFromSupabase,
  queryDocsFromSupabase,
  subscribeToSupabase,
} from './supabaseFirestoreAdapter';

export {
  db,
  auth,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  increment,
  limit,
  orderBy,
  runTransaction,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  signInWithGoogle,
  setSessionFromUrlOrHash,
  updateProfile,
  deleteUser,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendEmailVerification,
  supabase,
  supabaseAdmin,
  PRIMARY_SUPER_ADMIN_UID,
  SUPER_ADMIN_EMAIL,
  isSuperAdmin,
  getDocFromSupabase,
  setDocToSupabase,
  updateDocInSupabase,
  deleteDocFromSupabase,
  queryDocsFromSupabase,
  subscribeToSupabase,
};

export type FirebaseUser = any;
export const googleProvider = {
  addScope: () => {},
  setCustomParameters: () => {},
};

export const storage = {
  app: {},
};

export const storageRef = (_storage: any, ...pathSegments: string[]) => ({ path: pathSegments.join('/') });
export const uploadBytes = async (ref: any, _file: any, _metadata?: any) => ({ ref });
export const getDownloadURL = async (_ref: any) => '';
export const deleteObject = async (_ref: any) => {};

import { compressAvatarImage } from '../utils/imageCompressor';

const baseFirebaseConfig: any = {};

// Safely resolve environment variables in both Vite client and Node/CJS environments without esbuild warnings
const safeGetEnv = (key: string): string => {
  if (typeof process !== 'undefined' && process?.env && process.env[key]) {
    return process.env[key] as string;
  }
  try {
    const metaGetter = new Function('try { return import.meta.env; } catch(e) { return {}; }');
    const envObj = metaGetter();
    return (envObj && envObj[key]) || '';
  } catch {
    return '';
  }
};

const firebaseConfig = {
  apiKey: safeGetEnv('VITE_FIREBASE_API_KEY') || baseFirebaseConfig.apiKey,
  authDomain: safeGetEnv('VITE_FIREBASE_AUTH_DOMAIN') || baseFirebaseConfig.authDomain,
  projectId: safeGetEnv('VITE_FIREBASE_PROJECT_ID') || baseFirebaseConfig.projectId,
  storageBucket: safeGetEnv('VITE_FIREBASE_STORAGE_BUCKET') || baseFirebaseConfig.storageBucket,
  messagingSenderId: safeGetEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || baseFirebaseConfig.messagingSenderId,
  appId: safeGetEnv('VITE_FIREBASE_APP_ID') || baseFirebaseConfig.appId,
  firestoreDatabaseId: safeGetEnv('VITE_FIRESTORE_DATABASE_ID') || (baseFirebaseConfig as any).firestoreDatabaseId,
  oAuthClientId: safeGetEnv('VITE_OAUTH_CLIENT_ID') || (baseFirebaseConfig as any).oAuthClientId,
};
import {
  MasterInstitution,
  DepartmentDoc,
  AcademicLevelDoc,
  AdminAuditLog,
  UserProfile,
  PrivacySettings,
  InstitutionCategory,
  UserRole,
  LeagueSeason,
  SeasonStatus,
  SeasonParticipation,
  QualificationCompetition,
  QualificationAttempt,
  RepresentativeAssignment,
  SeasonStanding,
  LeagueFixture,
  QuestionSet,
  QuestionItem,
  LiveMatchState,
  MatchResultRecord,
  LiveMatchAnswerSubmission,
  GusSeason,
  GusParticipantRecord,
  NotificationItem,
  SystemSettings,
  ChatroomLiveMessage,
  ChatroomLiveQuestion,
  ChatroomLiveSettings,
  UltimateSearchRulesData,
  UltimateSearchRuleItem,
  ChatroomLiveAnswerSubmission,
  DailyChatAllowanceInfo,
  DailyChatResponseRecord,
  PlatformEventItem,
  PlatformEventCategory,
  PlatformEventStatus,
  PLATFORM_EVENT_CATEGORIES,
  OFFICIAL_EVENT_HOST,
  SugManagerRequest,
  SugManager,
  SugCampaign,
  SugCampaignType,
  SugCampaignStatus,
  SugSection,
  SugPosition,
  SugCandidate,
  SugVote,
  SugResult,
  SugAuditLog,
  SugScopeType,
  SugResultsVisibility,
  StudentVerificationRequest,
  MinimartProduct,
  MinimartCategory,
  MinimartReport,
  MinimartConfig,
  GpConversionConfig,
  WithdrawalRecord,
  Post,
  PostComment,
  Announcement,
  SponsorshipCampaign,
} from '../types';
import { isPrimarySuperAdmin } from './adminPermissions';
import {
  DEFAULT_MINIMART_CONFIG,
  INITIAL_MINIMART_CATEGORIES,
} from '../data/mockMinimartData';
import {
  MOCK_MASTER_INSTITUTIONS,
  MOCK_SEASONS,
  MOCK_QUALIFICATION_COMPETITIONS,
  MOCK_REPRESENTATIVE_RECORDS,
} from '../data/mockData';
import { MOCK_CHATROOM_MESSAGES } from '../data/mockChatroomData';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
}

/**
 * Recursively strips undefined keys and nested undefined values from objects before Firestore write operations.
 * Prevents Firestore runtime errors like 'Unsupported field value: undefined'.
 */
export const sanitizeForFirestore = <T>(obj: T): T => {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => (typeof item === 'object' && item !== null ? sanitizeForFirestore(item) : item)) as any;
  }
  const clean: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (
        value !== null &&
        typeof value === 'object' &&
        !(value instanceof Date) &&
        !('_methodName' in (value as any)) &&
        !('nanoseconds' in (value as any))
      ) {
        clean[key] = sanitizeForFirestore(value);
      } else {
        clean[key] = value;
      }
    }
  }
  return clean;
};

export async function testConnection() {
  try {
    await getDoc(doc(db, 'test', 'connection'));
  } catch (error) {
    console.warn('Firestore connection initialized (offline or pending network connection).');
  }
}
// Note: testConnection is preserved as a utility function, but not auto-run at module evaluation to conserve read quota.

// Seed Firestore with Institutions, Departments, and Academic Levels if empty
export const seedFirestoreInstitutionsIfEmpty = async () => {
  try {
    if (typeof window !== 'undefined' && localStorage.getItem('grobax_seeded_institutions')) {
      return;
    }
    const instCol = collection(db, 'institutions');
    const snapshot = await getDocs(query(instCol, limit(1)));
    
    // Seed Academic Levels if empty
    const levelsCol = collection(db, 'academicLevels');
    const levelsSnap = await getDocs(query(levelsCol, limit(1)));
    if (levelsSnap.empty) {
      console.log('Seeding Master Academic Levels to Firestore...');
      const levelBatch = writeBatch(db);
      const defaultLevels = [
        // University
        { id: 'lvl_uni_100', institutionType: 'University', name: '100 Level', status: 'active', ordering: 1 },
        { id: 'lvl_uni_200', institutionType: 'University', name: '200 Level', status: 'active', ordering: 2 },
        { id: 'lvl_uni_300', institutionType: 'University', name: '300 Level', status: 'active', ordering: 3 },
        { id: 'lvl_uni_400', institutionType: 'University', name: '400 Level', status: 'active', ordering: 4 },
        { id: 'lvl_uni_500', institutionType: 'University', name: '500 Level', status: 'active', ordering: 5 },
        { id: 'lvl_uni_600', institutionType: 'University', name: '600 Level', status: 'active', ordering: 6 },
        { id: 'lvl_uni_pg', institutionType: 'University', name: 'Post-Grad / Master\'s', status: 'active', ordering: 7 },
        // Polytechnic
        { id: 'lvl_poly_nd1', institutionType: 'Polytechnic', name: 'ND 1', status: 'active', ordering: 1 },
        { id: 'lvl_poly_nd2', institutionType: 'Polytechnic', name: 'ND 2', status: 'active', ordering: 2 },
        { id: 'lvl_poly_hnd1', institutionType: 'Polytechnic', name: 'HND 1', status: 'active', ordering: 3 },
        { id: 'lvl_poly_hnd2', institutionType: 'Polytechnic', name: 'HND 2', status: 'active', ordering: 4 },
        // College of Education
        { id: 'lvl_coe_1', institutionType: 'College of Education', name: 'Level 1', status: 'active', ordering: 1 },
        { id: 'lvl_coe_2', institutionType: 'College of Education', name: 'Level 2', status: 'active', ordering: 2 },
        { id: 'lvl_coe_3', institutionType: 'College of Education', name: 'Level 3', status: 'active', ordering: 3 },
      ];

      for (const lvl of defaultLevels) {
        levelBatch.set(doc(db, 'academicLevels', lvl.id), lvl);
      }
      await levelBatch.commit();
    }

    if (!snapshot.empty) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('grobax_seeded_institutions', 'true');
      }
      return; // Institutions already seeded
    }

    console.log('Seeding Master Institutions & Departments to Firestore...');
    const batch = writeBatch(db);

    for (const inst of MOCK_MASTER_INSTITUTIONS) {
      const instRef = doc(db, 'institutions', inst.id);
      batch.set(instRef, {
        id: inst.id,
        institutionId: inst.id,
        name: inst.name,
        normalizedName: inst.name.toLowerCase(),
        shortName: inst.shortName,
        category: inst.type as InstitutionCategory,
        type: (inst.type as string).toLowerCase().replace(/ /g, '_'),
        logo: inst.logo,
        logoUrl: inst.logo,
        state: inst.state,
        description: inst.description || '',
        status: 'active',
        activeInSeason: inst.activeInSeason !== false,
        isHidden: false,
        hidden: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Add departments as sub-documents in department collection
      for (const dept of inst.departments) {
        const deptId = `dept_${inst.id}_${dept.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        const deptRef = doc(db, 'departments', deptId);
        batch.set(deptRef, {
          id: deptId,
          departmentId: deptId,
          institutionId: inst.id,
          name: dept,
          normalizedName: dept.toLowerCase(),
          status: 'active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    await batch.commit();
    if (typeof window !== 'undefined') {
      localStorage.setItem('grobax_seeded_institutions', 'true');
    }
    console.log('Successfully seeded master institutions and departments.');
  } catch (err) {
    console.warn('Unable to seed master institutions to Firestore:', err);
  }
};

// Recursively clean objects for Firestore by eliminating undefined values
export function cleanFirestoreData<T = any>(data: T): T {
  if (data === undefined) {
    return null as any;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (data instanceof Date) {
    return data;
  }
  if (
    '_methodName' in (data as any) ||
    (data as any).constructor?.name === 'FieldValue' ||
    (data as any).constructor?.name === 'Timestamp' ||
    (data as any).constructor?.name === 'DocumentReference' ||
    (typeof (data as any).isEqual === 'function' && typeof (data as any).toMillis !== 'function')
  ) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => (item === undefined ? null : cleanFirestoreData(item))) as any;
  }
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleaned[key] = cleanFirestoreData(value);
    }
  }
  return cleaned as T;
}

// Log Admin Audit Action
export const logAdminAuditAction = async (
  adminUid: string,
  adminName: string,
  action: string,
  targetId: string,
  details?: any
) => {
  try {
    const logRef = doc(collection(db, 'auditLogs'));
    await setDoc(logRef, {
      id: logRef.id,
      adminUid: adminUid || 'admin_sys',
      adminName: adminName || 'System Admin',
      action,
      targetId,
      details: details ? cleanFirestoreData(details) : {},
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Unable to write audit log:', err);
  }
};

// Fetch Audit Logs
export const fetchAuditLogs = async (): Promise<AdminAuditLog[]> => {
  try {
    const q = query(collection(db, 'auditLogs'), limit(50));
    const snap = await getDocs(q);
    if (snap.empty) return [];
    return snap.docs
      .map(d => {
        const data = d.data();
        return {
          id: d.id,
          adminUid: data.adminUid || '',
          adminName: data.adminName || 'Admin',
          action: data.action || '',
          targetId: data.targetId || '',
          details: data.details || {},
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date().toISOString(),
        };
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (err) {
    console.warn('Error fetching audit logs:', err);
    return [];
  }
};

// Clean and sanitize institution data to prevent base64 data URLs or corrupted names from crashing the UI
export const sanitizeInstitutionData = (raw: any, docId?: string): MasterInstitution => {
  if (!raw || typeof raw !== 'object') {
    return {
      id: docId || `inst_${Date.now()}`,
      institutionId: docId || `inst_${Date.now()}`,
      name: 'Academic Institution',
      normalizedName: 'academic institution',
      shortName: 'INST',
      category: 'University',
      type: 'university',
      logo: '🏛️',
      logoUrl: '🏛️',
      state: 'Nigeria',
      description: '',
      status: 'active',
      activeInSeason: true,
      isHidden: false,
      hidden: false,
    } as MasterInstitution;
  }

  const id = raw.id || raw.institutionId || docId || `inst_${Date.now()}`;
  let rawName = typeof raw.name === 'string' ? raw.name.trim() : '';
  let rawShortName = typeof raw.shortName === 'string' ? raw.shortName.trim() : '';
  let rawLogo = typeof raw.logo === 'string' ? raw.logo.trim() : (typeof raw.logoUrl === 'string' ? raw.logoUrl.trim() : '🏛️');

  // If rawName was mistakenly stored as a base64 string or data: URL, clean it or extract real name
  if (rawName.startsWith('data:') || rawName.length > 200 || rawName.includes('base64,')) {
    const match = rawName.match(/([A-Z][a-zA-Z\s&.,'-]{3,80})/g);
    const candidate = match ? match[match.length - 1].trim() : '';
    if (candidate && candidate.length >= 3 && !candidate.toLowerCase().includes('base64')) {
      rawName = candidate;
    } else if (rawShortName && !rawShortName.startsWith('data:') && rawShortName.length < 50) {
      rawName = rawShortName;
    } else {
      const mockMatch = MOCK_MASTER_INSTITUTIONS.find(m => m.id === id);
      rawName = mockMatch ? mockMatch.name : 'Verified Academic Institution';
    }
  }

  // Strip any leading garbage e.g. "9k= University of Ibadan" -> "University of Ibadan"
  rawName = rawName.replace(/^[0-9a-zA-Z/+=]{2,10}=\s*/, '').trim();

  // If shortName is missing or corrupted
  if (!rawShortName || rawShortName.startsWith('data:') || rawShortName.length > 30) {
    const words = rawName.split(/\s+/).filter(Boolean);
    rawShortName = words.length > 1 ? words.map(w => w[0]).join('').toUpperCase() : rawName.substring(0, 8).toUpperCase();
  }

  // Clean logo: if logo is a base64 or URL, store in logoUrl, but keep logo as clean emoji or short code
  let logoEmoji = '🏛️';
  let logoUrl = '🏛️';
  if (rawLogo.startsWith('http') || rawLogo.startsWith('data:')) {
    logoUrl = rawLogo;
    logoEmoji = (raw.category === 'Polytechnic' || raw.type === 'polytechnic') ? '⚙️' : (raw.category === 'College of Education' || raw.type === 'college_of_education') ? '📚' : '🎓';
  } else if (rawLogo && rawLogo.length <= 4) {
    logoEmoji = rawLogo;
    logoUrl = rawLogo;
  }

  const category: InstitutionCategory =
    raw.category === 'Polytechnic' || raw.type === 'polytechnic'
      ? 'Polytechnic'
      : raw.category === 'College of Education' || raw.type === 'college_of_education'
      ? 'College of Education'
      : 'University';

  let rawState = typeof raw.state === 'string' ? raw.state.trim() : 'Nigeria';
  if (rawState.startsWith('data:') || rawState.length > 60) {
    rawState = 'Nigeria';
  }

  return {
    id,
    institutionId: id,
    name: rawName || 'Academic Institution',
    normalizedName: (rawName || 'Academic Institution').toLowerCase(),
    shortName: rawShortName || 'INST',
    category,
    type: category.toLowerCase().replace(/ /g, '_'),
    logo: logoEmoji,
    logoUrl: logoUrl,
    state: rawState,
    description: typeof raw.description === 'string' && !raw.description.startsWith('data:') ? raw.description : '',
    status: raw.status === 'inactive' ? 'inactive' : 'active',
    activeInSeason: raw.activeInSeason !== false,
    isHidden: raw.isHidden === true || raw.hidden === true,
    hidden: raw.isHidden === true || raw.hidden === true,
    createdAt: raw.createdAt?.toDate ? raw.createdAt.toDate().toISOString() : undefined,
    updatedAt: raw.updatedAt?.toDate ? raw.updatedAt.toDate().toISOString() : undefined,
  } as MasterInstitution;
};

// Fetch Master Institutions
export const fetchMasterInstitutions = async (options?: {
  category?: InstitutionCategory;
  type?: string;
  includeHidden?: boolean;
  includeInactive?: boolean;
}): Promise<MasterInstitution[]> => {
  try {
    const instCol = collection(db, 'institutions');
    const snap = await getDocs(query(instCol, limit(100)));
    if (snap.empty) {
      // Fallback
      return MOCK_MASTER_INSTITUTIONS as MasterInstitution[];
    }

    let results = snap.docs.map(d => sanitizeInstitutionData(d.data(), d.id));

    if (options?.category) {
      results = results.filter(i => 
        i.category === options.category || 
        (i.type && i.type.toString().toLowerCase() === options.category.toLowerCase().replace(/ /g, '_'))
      );
    }

    if (!options?.includeHidden) {
      results = results.filter(i => !i.isHidden && !i.hidden);
    }

    if (!options?.includeInactive) {
      results = results.filter(i => i.status === 'active');
    }

    return results;
  } catch (err) {
    console.warn('Error fetching master institutions from Firestore, fallback:', err);
    return MOCK_MASTER_INSTITUTIONS as MasterInstitution[];
  }
};

// Save or Update Master Institution Doc
export const saveMasterInstitutionDoc = async (
  data: Partial<MasterInstitution>,
  adminUid: string = 'admin_sys',
  adminName: string = 'Admin'
): Promise<MasterInstitution> => {
  const instId = data.id || data.institutionId || `inst_${Date.now()}`;
  const instRef = doc(db, 'institutions', instId);

  const normalizedName = (data.name || '').trim().toLowerCase();
  const category = (data.type === 'polytechnic' || data.category === 'Polytechnic')
    ? 'Polytechnic'
    : (data.type === 'college_of_education' || data.category === 'College of Education')
    ? 'College of Education'
    : 'University';

  const docPayload = {
    id: instId,
    institutionId: instId,
    name: data.name?.trim() || '',
    normalizedName,
    shortName: data.shortName?.trim() || (data.name ? data.name.substring(0, 8).toUpperCase() : 'INST'),
    category,
    type: category.toLowerCase().replace(/ /g, '_'),
    logo: data.logo || data.logoUrl || '🏫',
    logoUrl: data.logoUrl || data.logo || '🏫',
    state: data.state?.trim() || 'Lagos',
    description: data.description?.trim() || '',
    status: data.status || 'active',
    isHidden: data.isHidden === true || data.hidden === true,
    hidden: data.isHidden === true || data.hidden === true,
    updatedAt: serverTimestamp(),
  };

  const isNew = !data.id;
  if (isNew) {
    (docPayload as any).createdAt = serverTimestamp();
  }

  await setDoc(instRef, docPayload, { merge: true });

  await logAdminAuditAction(
    adminUid,
    adminName,
    isNew ? 'CREATE_INSTITUTION' : 'UPDATE_INSTITUTION',
    instId,
    { name: data.name, category, status: data.status, isHidden: docPayload.isHidden }
  );

  return {
    ...docPayload,
    id: instId,
    updatedAt: new Date().toISOString(),
  } as unknown as MasterInstitution;
};

// Toggle Institution Hide/Unhide Status
export const toggleInstitutionHideStatus = async (
  institutionId: string,
  isHidden: boolean,
  adminUid: string = 'admin_sys',
  adminName: string = 'Admin'
) => {
  const instRef = doc(db, 'institutions', institutionId);
  await updateDoc(instRef, {
    isHidden,
    hidden: isHidden,
    updatedAt: serverTimestamp(),
  });

  await logAdminAuditAction(
    adminUid,
    adminName,
    isHidden ? 'HIDE_INSTITUTION' : 'UNHIDE_INSTITUTION',
    institutionId,
    { isHidden }
  );
};

// Toggle Institution Active/Inactive Status
export const toggleInstitutionActiveStatus = async (
  institutionId: string,
  status: 'active' | 'inactive',
  adminUid: string = 'admin_sys',
  adminName: string = 'Admin'
) => {
  const instRef = doc(db, 'institutions', institutionId);
  await updateDoc(instRef, {
    status,
    activeInSeason: status === 'active',
    updatedAt: serverTimestamp(),
  });

  await logAdminAuditAction(
    adminUid,
    adminName,
    status === 'active' ? 'ACTIVATE_INSTITUTION' : 'DEACTIVATE_INSTITUTION',
    institutionId,
    { status }
  );
};

// Delete Master Institution Doc from Firestore
export const deleteMasterInstitutionDoc = async (
  institutionId: string,
  institutionName?: string,
  adminUid: string = 'admin_sys',
  adminName: string = 'Admin'
) => {
  try {
    const instRef = doc(db, 'institutions', institutionId);
    await deleteDoc(instRef);

    // Also clean up any associated departments
    try {
      const q = query(collection(db, 'departments'), where('institutionId', '==', institutionId));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      if (!snap.empty) {
        await batch.commit();
      }
    } catch (deptErr) {
      console.warn('Notice cleaning departments for deleted institution:', deptErr);
    }

    await logAdminAuditAction(
      adminUid,
      adminName,
      'DELETE_INSTITUTION',
      institutionId,
      { name: institutionName || institutionId }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `institutions/${institutionId}`);
    throw err;
  }
};

// Fetch Departments by Institution ID
export const fetchDepartmentsByInstitutionId = async (
  institutionId: string,
  includeInactive = false
): Promise<DepartmentDoc[]> => {
  try {
    const q = query(collection(db, 'departments'), where('institutionId', '==', institutionId), limit(50));
    const snap = await getDocs(q);
    if (!snap.empty) {
      let depts = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          departmentId: d.id,
          institutionId: data.institutionId,
          name: data.name,
          normalizedName: data.normalizedName || data.name.toLowerCase(),
          status: data.status || 'active',
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : undefined,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : undefined,
        } as DepartmentDoc;
      });

      if (!includeInactive) {
        depts = depts.filter(d => d.status === 'active');
      }

      return depts;
    }

    // Fallback mock departments
    const mockInst = MOCK_MASTER_INSTITUTIONS.find(i => i.id === institutionId);
    const mockDeptNames = mockInst ? mockInst.departments : ['Computer Science', 'General Studies', 'Business Admin'];
    return mockDeptNames.map((name, i) => ({
      id: `dept_${institutionId}_${i}`,
      departmentId: `dept_${institutionId}_${i}`,
      institutionId,
      name,
      normalizedName: name.toLowerCase(),
      status: 'active',
    }));
  } catch (err) {
    console.warn('Error fetching departments:', err);
    return [];
  }
};

// Save or Update Department Doc
export const saveDepartmentDoc = async (
  dept: Partial<DepartmentDoc>,
  adminUid: string = 'admin_sys',
  adminName: string = 'Admin'
): Promise<DepartmentDoc> => {
  const deptId = dept.id || dept.departmentId || `dept_${dept.institutionId}_${Date.now()}`;
  const deptRef = doc(db, 'departments', deptId);

  const payload = {
    id: deptId,
    departmentId: deptId,
    institutionId: dept.institutionId || '',
    name: dept.name?.trim() || '',
    normalizedName: dept.name?.trim().toLowerCase() || '',
    status: dept.status || 'active',
    updatedAt: serverTimestamp(),
  };

  await setDoc(deptRef, payload, { merge: true });

  await logAdminAuditAction(adminUid, adminName, 'SAVE_DEPARTMENT', deptId, {
    institutionId: dept.institutionId,
    name: dept.name,
    status: dept.status,
  });

  return {
    ...payload,
    id: deptId,
    updatedAt: new Date().toISOString(),
  } as unknown as DepartmentDoc;
};

// Toggle Department Status
export const toggleDepartmentActiveStatus = async (
  departmentId: string,
  status: 'active' | 'inactive',
  adminUid: string = 'admin_sys',
  adminName: string = 'Admin'
) => {
  const deptRef = doc(db, 'departments', departmentId);
  await updateDoc(deptRef, {
    status,
    updatedAt: serverTimestamp(),
  });

  await logAdminAuditAction(adminUid, adminName, 'TOGGLE_DEPARTMENT_STATUS', departmentId, { status });
};

// Fetch Academic Levels by Institution Type
export const fetchAcademicLevelsByType = async (
  institutionType: InstitutionCategory,
  includeInactive = false
): Promise<AcademicLevelDoc[]> => {
  try {
    const q = query(collection(db, 'academicLevels'), where('institutionType', '==', institutionType), limit(30));
    const snap = await getDocs(q);
    if (!snap.empty) {
      let levels = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          institutionType: data.institutionType as InstitutionCategory,
          name: data.name,
          status: data.status || 'active',
          ordering: data.ordering || 1,
        } as AcademicLevelDoc;
      });

      if (!includeInactive) {
        levels = levels.filter(l => l.status === 'active');
      }

      return levels.sort((a, b) => a.ordering - b.ordering);
    }

    // Default fallback levels per institution type
    if (institutionType === 'Polytechnic') {
      return [
        { id: 'l1', institutionType: 'Polytechnic', name: 'ND 1', status: 'active', ordering: 1 },
        { id: 'l2', institutionType: 'Polytechnic', name: 'ND 2', status: 'active', ordering: 2 },
        { id: 'l3', institutionType: 'Polytechnic', name: 'HND 1', status: 'active', ordering: 3 },
        { id: 'l4', institutionType: 'Polytechnic', name: 'HND 2', status: 'active', ordering: 4 },
      ];
    } else if (institutionType === 'College of Education') {
      return [
        { id: 'l1', institutionType: 'College of Education', name: 'Level 1', status: 'active', ordering: 1 },
        { id: 'l2', institutionType: 'College of Education', name: 'Level 2', status: 'active', ordering: 2 },
        { id: 'l3', institutionType: 'College of Education', name: 'Level 3', status: 'active', ordering: 3 },
      ];
    } else {
      return [
        { id: 'l1', institutionType: 'University', name: '100 Level', status: 'active', ordering: 1 },
        { id: 'l2', institutionType: 'University', name: '200 Level', status: 'active', ordering: 2 },
        { id: 'l3', institutionType: 'University', name: '300 Level', status: 'active', ordering: 3 },
        { id: 'l4', institutionType: 'University', name: '400 Level', status: 'active', ordering: 4 },
        { id: 'l5', institutionType: 'University', name: '500 Level', status: 'active', ordering: 5 },
        { id: 'l6', institutionType: 'University', name: '600 Level', status: 'active', ordering: 6 },
        { id: 'l7', institutionType: 'University', name: "Post-Grad / Master's", status: 'active', ordering: 7 },
      ];
    }
  } catch (err) {
    console.warn('Error fetching academic levels:', err);
    return [];
  }
};

// Save Academic Level Doc
export const saveAcademicLevelDoc = async (
  level: Partial<AcademicLevelDoc>,
  adminUid: string = 'admin_sys',
  adminName: string = 'Admin'
): Promise<AcademicLevelDoc> => {
  const levelId = level.id || `lvl_${level.institutionType}_${Date.now()}`;
  const levelRef = doc(db, 'academicLevels', levelId);

  const payload = {
    id: levelId,
    institutionType: level.institutionType || 'University',
    name: level.name?.trim() || '',
    status: level.status || 'active',
    ordering: level.ordering || 1,
  };

  await setDoc(levelRef, payload, { merge: true });

  await logAdminAuditAction(adminUid, adminName, 'SAVE_ACADEMIC_LEVEL', levelId, payload);

  return payload as AcademicLevelDoc;
};

// Bulk Import Institutions Batch
export const bulkImportInstitutionsBatch = async (
  items: Array<{ name: string; category: InstitutionCategory; state: string; description?: string; logo?: string; departments?: string[] }>,
  adminUid: string = 'admin_sys',
  adminName: string = 'Admin'
) => {
  const batch = writeBatch(db);
  let count = 0;

  for (const item of items) {
    const instId = `inst_bulk_${Date.now()}_${count++}`;
    const instRef = doc(db, 'institutions', instId);

    batch.set(instRef, {
      id: instId,
      institutionId: instId,
      name: item.name.trim(),
      normalizedName: item.name.trim().toLowerCase(),
      shortName: item.name.trim().substring(0, 8).toUpperCase(),
      category: item.category,
      type: item.category.toLowerCase().replace(/ /g, '_'),
      logo: item.logo || '🏛️',
      logoUrl: item.logo || '🏛️',
      state: item.state || 'Lagos',
      description: item.description || '',
      status: 'active',
      isHidden: false,
      hidden: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (item.departments && Array.isArray(item.departments)) {
      for (const dept of item.departments) {
        const deptId = `dept_${instId}_${dept.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        const deptRef = doc(db, 'departments', deptId);
        batch.set(deptRef, {
          id: deptId,
          departmentId: deptId,
          institutionId: instId,
          name: dept,
          normalizedName: dept.toLowerCase(),
          status: 'active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
  }

  await batch.commit();

  await logAdminAuditAction(adminUid, adminName, 'BULK_IMPORT_INSTITUTIONS', `imported_${count}_items`, {
    totalCount: count,
  });
};

// Check username uniqueness
export const isUsernameAvailable = async (username: string, currentUid?: string): Promise<boolean> => {
  if (!username || username.trim().length < 3) return false;
  const usernameLower = username.trim().toLowerCase();

  try {
    const usernameRef = doc(db, 'usernames', usernameLower);
    const snap = await getDoc(usernameRef);
    if (snap.exists()) {
      const data = snap.data();
      if (currentUid && data.uid === currentUid) return true;
      return false;
    }
    return true;
  } catch (err) {
    // Fallback to querying users collection if rules block usernames doc
    try {
      const q = query(collection(db, 'users'), where('usernameLower', '==', usernameLower), limit(2));
      const querySnap = await getDocs(q);
      if (querySnap.empty) return true;
      if (currentUid && querySnap.docs[0].id === currentUid) return true;
      return false;
    } catch {
      return true; // Assume available if offline/demo
    }
  }
};

// Check email uniqueness across registered users to strictly prevent duplicate accounts
export const isEmailAvailable = async (email: string, currentUid?: string): Promise<boolean> => {
  if (!email || !email.trim() || !email.includes('@')) return false;
  const emailTrimmed = email.trim();
  const emailLower = emailTrimmed.toLowerCase();

  try {
    // 1. Check exact email
    const q1 = query(collection(db, 'users'), where('email', '==', emailTrimmed), limit(2));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      for (const docSnap of snap1.docs) {
        if (currentUid && docSnap.id === currentUid) continue;
        return false;
      }
    }

    // 2. Check lower-cased email
    if (emailTrimmed !== emailLower) {
      const q2 = query(collection(db, 'users'), where('email', '==', emailLower), limit(2));
      const snap2 = await getDocs(q2);
      if (!snap2.empty) {
        for (const docSnap of snap2.docs) {
          if (currentUid && docSnap.id === currentUid) continue;
          return false;
        }
      }
    }

    // 3. Check emailLower property if stored
    const q3 = query(collection(db, 'users'), where('emailLower', '==', emailLower), limit(2));
    const snap3 = await getDocs(q3);
    if (!snap3.empty) {
      for (const docSnap of snap3.docs) {
        if (currentUid && docSnap.id === currentUid) continue;
        return false;
      }
    }

    return true;
  } catch (err) {
    console.warn('Notice checking email uniqueness in Firestore:', err);
    // Fallback to allowing submit if Firestore read had network glitch, Firebase Auth will catch at auth layer
    return true;
  }
};

// Helper to determine if a subscription has expired (supports ISO string or user profile object)
export const isSubscriptionExpired = (target?: any): boolean => {
  if (!target) return false;
  if (typeof target === 'object') {
    if (
      target.role === 'admin' ||
      target.role === 'super_admin' ||
      target.isSuperAdmin ||
      target.isAdmin ||
      target.role === 'community_manager'
    ) {
      return false;
    }
    if (target.isExpired === true) return true;
    if (
      target.subscription &&
      (target.subscription.status === 'expired' ||
        target.subscription.status === 'inactive' ||
        target.subscription.status === 'cancelled')
    ) {
      return true;
    }
    const expiry =
      target.subscriptionExpiry ||
      target.subscription?.expiryDate ||
      target.subscription?.expiresAt ||
      target.subscription?.subscriptionExpiry ||
      target.expiryDate ||
      target.expiresAt;

    if (!expiry) return false;
    const expiryTime = new Date(expiry).getTime();
    return !isNaN(expiryTime) && expiryTime <= Date.now();
  }

  if (typeof target === 'string') {
    if (!target.trim()) return false;
    const expiryTime = new Date(target).getTime();
    return !isNaN(expiryTime) && expiryTime <= Date.now();
  }

  return false;
};

// Get Institutions filtered by category
export const fetchInstitutionsByCategory = async (category: InstitutionCategory): Promise<MasterInstitution[]> => {
  try {
    const q = query(collection(db, 'institutions'), where('category', '==', category), limit(50));
    const snap = await getDocs(q);
    if (snap.empty) {
      // Fallback to MOCK_MASTER_INSTITUTIONS if DB empty or loading
      return MOCK_MASTER_INSTITUTIONS.filter(i => i.type === category);
    }
    const results = snap.docs
      .map(d => sanitizeInstitutionData(d.data(), d.id))
      .filter(i => !i.isHidden && !i.hidden && i.status === 'active');
    
    return results.length > 0 ? results : (MOCK_MASTER_INSTITUTIONS.filter(i => i.type === category) as MasterInstitution[]);
  } catch (err) {
    console.warn('Error fetching institutions from Firestore, using mock fallback:', err);
    return MOCK_MASTER_INSTITUTIONS.filter(i => i.type === category) as MasterInstitution[];
  }
};

// Get Departments for an Institution
export const fetchDepartmentsByInstitution = async (institutionId: string): Promise<string[]> => {
  try {
    const q = query(collection(db, 'departments'), where('institutionId', '==', institutionId), limit(50));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map(d => d.data().name as string);
    }
    // Fallback to mock data
    const mockInst = MOCK_MASTER_INSTITUTIONS.find(i => i.id === institutionId);
    return mockInst ? mockInst.departments : ['Computer Science', 'General Studies', 'Business Administration'];
  } catch (err) {
    const mockInst = MOCK_MASTER_INSTITUTIONS.find(i => i.id === institutionId);
    return mockInst ? mockInst.departments : ['Computer Science', 'General Studies', 'Business Administration'];
  }
};

// Default privacy settings
export const DEFAULT_PRIVACY: PrivacySettings = {
  showInstitution: true,
  showDepartment: true,
  showLevel: true,
  institutionVisibility: 'Public',
  departmentVisibility: 'Public',
  levelVisibility: 'Public',
  showAcademicInfoOnPosts: true,
};

// Create User Profile Doc in Firestore after Auth Sign Up
export const createUserProfileDoc = async (
  uid: string,
  data: {
    fullName: string;
    username: string;
    email: string;
    emailVerified?: boolean;
    academicProfileCompleted?: boolean;
    institutionCategory?: InstitutionCategory;
    institutionId?: string;
    institutionName?: string;
    facultyId?: string;
    facultyName?: string;
    faculty?: string;
    departmentId?: string;
    departmentName?: string;
    level?: string;
    profileImage?: string;
    studentIdCardUrl?: string;
  }
): Promise<UserProfile> => {
  const usernameLower = data.username.trim().toLowerCase();

  const userDocRef = doc(db, 'users', uid);
  const usernameRef = doc(db, 'usernames', usernameLower);

  const resolvedFaculty = data.faculty || data.facultyName || '';
  const isComplete = data.academicProfileCompleted === true;

  const profileData: any = {
    uid,
    id: uid,
    name: data.fullName.trim(),
    fullName: data.fullName.trim(),
    username: data.username.trim(),
    usernameLower,
    email: data.email.trim().toLowerCase(),
    emailVerified: data.emailVerified !== undefined ? data.emailVerified : false,
    avatar: data.profileImage || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.username.trim())}`,
    profileImage: data.profileImage || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.username.trim())}`,
    role: 'student' as UserRole, // Default role = student
    accountStatus: 'active',
    authProvider: 'email_password',
    academicProfileCompleted: isComplete,
    academicProfile: isComplete
      ? {
          institutionCategory: data.institutionCategory || 'University',
          institutionId: data.institutionId || '',
          institutionName: data.institutionName || '',
          facultyId: data.facultyId || '',
          facultyName: resolvedFaculty,
          departmentId: data.departmentId || '',
          departmentName: data.departmentName || '',
          level: data.level || '100 Level',
          completedAt: new Date().toISOString(),
        }
      : null,
    institution: data.institutionName || 'Unassigned Institution',
    institutionName: data.institutionName || 'Unassigned Institution',
    institutionId: data.institutionId || '',
    institutionCategory: data.institutionCategory || 'University',
    faculty: resolvedFaculty,
    facultyName: resolvedFaculty,
    facultyId: data.facultyId || '',
    department: data.departmentName || 'General Studies',
    departmentName: data.departmentName || 'General Studies',
    departmentId: data.departmentId || '',
    level: data.level || '100 Level',
    major: data.departmentName || 'Undergraduate',
    bio: `Scholar in Grobaax Academy`,
    verified: true,
    studentIdCardUrl: data.studentIdCardUrl || '',
    idVerificationStatus: data.studentIdCardUrl ? 'pending' : 'unsubmitted',
    idCardUploadedAt: data.studentIdCardUrl ? new Date().toISOString() : '',
    gpBalance: 0, // Default 0 GP (no automatic welcome reward)
    grbxTokens: 0,
    stakedTokens: 0,
    reputationPoints: 100,
    gusRank: 0,
    gusTier: 'Scholar',
    walletAddress: `0x${uid.substring(0, 10)}${Math.random().toString(16).substring(2, 6)}`,
    privacy: DEFAULT_PRIVACY,
    badges: [],
    purchasedBadgeIds: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Safely clean data before persisting
  const cleanedData = cleanFirestoreData(profileData);
  await setDoc(userDocRef, cleanedData, { merge: true });

  try {
    await setDoc(usernameRef, { uid, username: data.username.trim(), createdAt: serverTimestamp() }, { merge: true });
  } catch (e) {
    console.warn('Could not reserve username doc:', e);
  }

  // If student uploaded ID card, record verification request in dedicated collection
  if (data.studentIdCardUrl && data.studentIdCardUrl.trim().length > 0) {
    try {
      const verifRef = doc(db, 'studentVerifications', uid);
      const verifPayload: StudentVerificationRequest = {
        id: uid,
        userId: uid,
        fullName: data.fullName.trim(),
        username: data.username.trim(),
        email: data.email.trim().toLowerCase(),
        avatar: profileData.avatar,
        institutionCategory: data.institutionCategory,
        institutionId: data.institutionId || '',
        institutionName: data.institutionName || '',
        departmentId: data.departmentId || '',
        departmentName: data.departmentName || '',
        level: data.level || '100 Level',
        studentIdCardUrl: data.studentIdCardUrl,
        status: 'pending',
        submittedAt: new Date().toISOString(),
      };
      await setDoc(verifRef, cleanFirestoreData({ ...verifPayload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }), { merge: true });
    } catch (verifErr) {
      console.warn('Notice saving student verification request:', verifErr);
    }
  }

  // Cache to localStorage
  try {
    localStorage.setItem(`grobax_user_profile_${uid}`, JSON.stringify({
      ...profileData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  } catch (e) {}

  return {
    ...profileData,
    id: uid,
  };
};

// Complete Academic Profile for Google Sign-In or returning users missing academic profile
export const completeUserAcademicProfileDoc = async (
  uid: string,
  data: {
    fullName?: string;
    username: string;
    email?: string;
    emailVerified?: boolean;
    academicProfileCompleted?: boolean;
    institutionCategory?: InstitutionCategory;
    institutionId?: string;
    institutionName?: string;
    facultyId?: string;
    facultyName?: string;
    faculty?: string;
    departmentId?: string;
    departmentName?: string;
    level?: string;
    profileImage?: string;
    studentIdCardUrl?: string;
  }
): Promise<UserProfile> => {
  const usernameLower = data.username.trim().toLowerCase();
  const userDocRef = doc(db, 'users', uid);
  const usernameRef = doc(db, 'usernames', usernameLower);

  const existingSnap = await getDoc(userDocRef);
  const existing = existingSnap.exists() ? existingSnap.data() : {};

  const name = data.fullName || existing.fullName || existing.name || auth.currentUser?.displayName || 'Grobaax Scholar';
  const email = data.email || existing.email || auth.currentUser?.email || '';
  const avatar = data.profileImage || existing.profileImage || existing.avatar || auth.currentUser?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.username)}`;

  const hasNewIdCard = Boolean(data.studentIdCardUrl && data.studentIdCardUrl.trim().length > 0);
  const studentIdCardUrl = hasNewIdCard ? data.studentIdCardUrl : (existing.studentIdCardUrl || '');
  const idVerificationStatus = hasNewIdCard ? 'pending' : (existing.idVerificationStatus || 'unsubmitted');
  const idCardUploadedAt = hasNewIdCard ? new Date().toISOString() : (existing.idCardUploadedAt || '');

  const resolvedFaculty = data.faculty || data.facultyName || existing.faculty || existing.facultyName || '';

  const profileData: any = {
    ...existing,
    uid,
    id: uid,
    name,
    fullName: name,
    username: data.username.trim(),
    usernameLower,
    email,
    avatar,
    profileImage: avatar,
    role: existing.role || 'student',
    accountStatus: existing.accountStatus || 'active',
    academicProfileCompleted: true,
    academicProfile: {
      institutionCategory: data.institutionCategory,
      institutionId: data.institutionId || '',
      institutionName: data.institutionName || '',
      facultyId: data.facultyId || existing.academicProfile?.facultyId || '',
      facultyName: resolvedFaculty,
      departmentId: data.departmentId || '',
      departmentName: data.departmentName || '',
      level: data.level || '100 Level',
      completedAt: new Date().toISOString(),
    },
    institution: data.institutionName || '',
    institutionName: data.institutionName || '',
    institutionId: data.institutionId || '',
    institutionCategory: data.institutionCategory || 'University',
    faculty: resolvedFaculty,
    facultyName: resolvedFaculty,
    facultyId: data.facultyId || '',
    department: data.departmentName || '',
    departmentName: data.departmentName || '',
    departmentId: data.departmentId || '',
    level: data.level || '100 Level',
    major: data.departmentName || '',
    bio: existing.bio || `Scholar at ${data.institutionName || 'Grobaax Academy'}`,
    verified: true,
    studentIdCardUrl,
    idVerificationStatus,
    idCardUploadedAt,
    gpBalance: existing.gpBalance !== undefined ? existing.gpBalance : 0,
    grbxTokens: existing.grbxTokens ?? 0,
    stakedTokens: existing.stakedTokens ?? 0,
    reputationPoints: existing.reputationPoints ?? 100,
    gusRank: existing.gusRank ?? 0,
    gusTier: existing.gusTier || 'Scholar',
    walletAddress: existing.walletAddress || `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`,
    privacy: existing.privacy || DEFAULT_PRIVACY,
    badges: existing.badges || [],
    purchasedBadgeIds: existing.purchasedBadgeIds || [],
    updatedAt: serverTimestamp(),
  };

  if (!existingSnap.exists()) {
    profileData.createdAt = serverTimestamp();
  }

  const cleanedData = cleanFirestoreData(profileData);
  await setDoc(userDocRef, cleanedData, { merge: true });

  try {
    await setDoc(usernameRef, { uid, username: data.username.trim(), createdAt: serverTimestamp() }, { merge: true });
  } catch (e) {
    console.warn('Could not reserve username doc:', e);
  }

  // If student uploaded ID card, record verification request in dedicated collection
  if (studentIdCardUrl && studentIdCardUrl.trim().length > 0) {
    try {
      const verifRef = doc(db, 'studentVerifications', uid);
      const verifPayload: StudentVerificationRequest = {
        id: uid,
        userId: uid,
        fullName: name,
        username: data.username.trim(),
        email,
        avatar,
        institutionCategory: data.institutionCategory,
        institutionId: data.institutionId || '',
        institutionName: data.institutionName || '',
        departmentId: data.departmentId || '',
        departmentName: data.departmentName || '',
        level: data.level || '100 Level',
        studentIdCardUrl,
        status: (idVerificationStatus as any) || 'pending',
        submittedAt: idCardUploadedAt || new Date().toISOString(),
      };
      await setDoc(verifRef, cleanFirestoreData({ ...verifPayload, updatedAt: serverTimestamp() }), { merge: true });
    } catch (verifErr) {
      console.warn('Notice saving student verification request:', verifErr);
    }
  }

  // Cache locally
  try {
    localStorage.setItem(`grobax_academic_completed_${uid}`, 'true');
    localStorage.setItem(`grobax_user_profile_${uid}`, JSON.stringify(profileData));
  } catch (_) {}

  return {
    ...profileData,
    id: uid,
  };
};

/**
 * Ensures a user profile exists in Firestore and has all required fields (such as email, username, etc.)
 * This guarantees users registering or signing in via email/password or Google are immediately saved and visible in the Firestore database and admin dashboard.
 */
export const ensureUserInFirestore = async (
  firebaseUser: any,
  fallbackDetails?: Partial<UserProfile>
): Promise<UserProfile> => {
  if (!firebaseUser) {
    throw new Error('Authentication required.');
  }
  const uid = firebaseUser.uid || firebaseUser.id;
  if (!uid) {
    throw new Error('Authentication user ID missing.');
  }
  const userDocRef = doc(db, 'users', uid);
  
  try {
    const snap = await getDoc(userDocRef);
    const existing = snap.exists() ? snap.data() : null;

    const email = (existing?.email || firebaseUser.email || fallbackDetails?.email || '').trim().toLowerCase();
    const isMockOrGenericName = !existing?.fullName && !existing?.name || 
      existing?.fullName === 'Alex Chen' || existing?.name === 'Alex Chen' || 
      existing?.fullName === 'Scholar' || existing?.name === 'Scholar';

    const isMockUsername = existing?.username === 'alex_chen_mit';

    const rawUsername = (!isMockUsername && existing?.username) || 
      fallbackDetails?.username || 
      (firebaseUser.displayName ? firebaseUser.displayName.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 25) : '') ||
      email.split('@')[0] || 
      `scholar_${uid.substring(0, 6)}`;
    const generatedUsername = rawUsername.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 30);

    const rawName = (!isMockOrGenericName ? (existing?.fullName || existing?.name) : null) || 
      fallbackDetails?.fullName || 
      fallbackDetails?.name || 
      firebaseUser.displayName || 
      generatedUsername;
    const name = rawName.trim();

    const avatar = (!existing?.profileImage?.includes('dicebear') && existing?.profileImage) || 
      (!existing?.avatar?.includes('dicebear') && existing?.avatar) || 
      fallbackDetails?.profileImage || 
      fallbackDetails?.avatar || 
      firebaseUser.photoURL || 
      `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`;

    const isSuper = isPrimarySuperAdmin(uid, email);
    const resolvedRole = isSuper ? 'admin' : (existing?.role || fallbackDetails?.role || 'student');

    const isAcademicComplete = Boolean(
      existing?.academicProfileCompleted ||
      fallbackDetails?.academicProfileCompleted ||
      (existing?.institutionName && existing?.institutionName !== 'Unassigned Institution') ||
      (existing?.institution && existing?.institution !== 'Unassigned Institution') ||
      (typeof window !== 'undefined' && localStorage.getItem(`grobax_academic_completed_${uid}`) === 'true')
    );

    const resolvedAcademicProfile = existing?.academicProfile || fallbackDetails?.academicProfile || (isAcademicComplete ? {
      institutionCategory: existing?.institutionCategory || fallbackDetails?.institutionCategory || 'University',
      institutionId: existing?.institutionId || fallbackDetails?.institutionId || '',
      institutionName: existing?.institutionName || existing?.institution || fallbackDetails?.institutionName || '',
      facultyId: existing?.facultyId || fallbackDetails?.facultyId || '',
      facultyName: existing?.facultyName || existing?.faculty || fallbackDetails?.facultyName || '',
      departmentId: existing?.departmentId || fallbackDetails?.departmentId || '',
      departmentName: existing?.departmentName || existing?.department || fallbackDetails?.departmentName || '',
      level: existing?.level || fallbackDetails?.level || '100 Level',
      completedAt: existing?.academicProfile?.completedAt || new Date().toISOString(),
    } : null);

    const profileData: any = {
      ...(existing || {}),
      uid,
      id: uid,
      name,
      fullName: name,
      username: generatedUsername,
      usernameLower: generatedUsername.toLowerCase(),
      email,
      avatar,
      profileImage: avatar,
      role: resolvedRole,
      authProvider: existing?.authProvider || (firebaseUser.photoURL ? 'google.com' : 'email_password'),
      accountStatus: existing?.accountStatus || fallbackDetails?.accountStatus || 'active',
      academicProfileCompleted: isAcademicComplete,
      academicProfile: resolvedAcademicProfile,
      studentIdCardUrl: existing?.studentIdCardUrl || fallbackDetails?.studentIdCardUrl || '',
      idVerificationStatus: existing?.idVerificationStatus || fallbackDetails?.idVerificationStatus || (existing?.studentIdCardUrl ? 'pending' : 'none'),
      idCardUploadedAt: existing?.idCardUploadedAt || fallbackDetails?.idCardUploadedAt || '',
      institution: existing?.institutionName || existing?.institution || fallbackDetails?.institutionName || fallbackDetails?.institution || (isSuper ? 'Grobaax Systems Administration' : 'Unassigned Institution'),
      institutionName: existing?.institutionName || existing?.institution || fallbackDetails?.institutionName || fallbackDetails?.institution || (isSuper ? 'Grobaax Systems Administration' : 'Unassigned Institution'),
      institutionId: existing?.institutionId || fallbackDetails?.institutionId || '',
      institutionCategory: existing?.institutionCategory || fallbackDetails?.institutionCategory || 'University',
      faculty: existing?.facultyName || existing?.faculty || fallbackDetails?.facultyName || fallbackDetails?.faculty || '',
      facultyName: existing?.facultyName || existing?.faculty || fallbackDetails?.facultyName || fallbackDetails?.faculty || '',
      facultyId: existing?.facultyId || fallbackDetails?.facultyId || '',
      department: existing?.departmentName || existing?.department || fallbackDetails?.departmentName || fallbackDetails?.department || (isSuper ? 'HQ Overseer' : 'General Studies'),
      departmentName: existing?.departmentName || existing?.department || fallbackDetails?.departmentName || fallbackDetails?.department || (isSuper ? 'HQ Overseer' : 'General Studies'),
      departmentId: existing?.departmentId || fallbackDetails?.departmentId || '',
      level: existing?.level || fallbackDetails?.level || (isSuper ? 'Executive Level' : '100 Level'),
      major: existing?.major || existing?.departmentName || fallbackDetails?.major || fallbackDetails?.departmentName || (isSuper ? 'Executive Administrator' : 'Undergraduate'),
      bio: existing?.bio || fallbackDetails?.bio || (isSuper ? 'Primary Super Administrator of Grobaax Box.' : 'Scholar in Grobaax Academy'),
      verified: existing?.verified !== undefined ? existing.verified : true,
      gpBalance: existing?.gpBalance !== undefined && !isNaN(Number(existing.gpBalance))
        ? Number(existing.gpBalance)
        : (fallbackDetails?.gpBalance !== undefined && !isNaN(Number(fallbackDetails.gpBalance))
            ? Number(fallbackDetails.gpBalance)
            : (isSuper ? 100000 : 0)),
      grbxTokens: existing?.grbxTokens !== undefined ? existing.grbxTokens : (fallbackDetails?.grbxTokens ?? 0),
      stakedTokens: existing?.stakedTokens !== undefined ? existing.stakedTokens : (fallbackDetails?.stakedTokens ?? 0),
      reputationPoints: existing?.reputationPoints !== undefined ? existing.reputationPoints : (fallbackDetails?.reputationPoints ?? 100),
      gusRank: existing?.gusRank !== undefined ? existing.gusRank : (fallbackDetails?.gusRank ?? 0),
      gusTier: existing?.gusTier || fallbackDetails?.gusTier || (isSuper ? 'Grandmaster' : 'Scholar'),
      activePlanId: isSuper ? 'plan_titan_naira' : (existing?.activePlanId || fallbackDetails?.activePlanId || ''),
      membershipTier: isSuper ? 'Grobaax Titan Annual VIP' : (existing?.membershipTier || fallbackDetails?.membershipTier || 'Free Scholar'),
      subscriptionTier: isSuper ? 'Grobaax Titan Annual VIP' : (existing?.subscriptionTier || fallbackDetails?.subscriptionTier || (existing?.membershipTier || 'Free Scholar')),
      subscriptionPlan: isSuper ? 'Grobaax Titan Annual VIP' : (existing?.subscriptionPlan || fallbackDetails?.subscriptionPlan || existing?.membershipTier || ''),
      planId: isSuper ? 'plan_titan_naira' : (existing?.planId || fallbackDetails?.planId || existing?.activePlanId || ''),
      tier: isSuper ? 'Grobaax Titan Annual VIP' : (existing?.tier || fallbackDetails?.tier || existing?.membershipTier || 'Free Scholar'),
      plan: isSuper ? 'Grobaax Titan Annual VIP' : (existing?.plan || fallbackDetails?.plan || existing?.membershipTier || ''),
      isSubscribed: isSuper ? true : Boolean(
        existing?.isSubscribed ||
        fallbackDetails?.isSubscribed ||
        (existing?.activePlanId && !existing.activePlanId.toLowerCase().includes('free')) ||
        (existing?.membershipTier && !existing.membershipTier.toLowerCase().includes('free') && existing.membershipTier.toLowerCase() !== 'starter scholar')
      ),
      isPremium: isSuper ? true : Boolean(
        existing?.isPremium ||
        fallbackDetails?.isPremium ||
        (existing?.activePlanId && !existing.activePlanId.toLowerCase().includes('free')) ||
        (existing?.membershipTier && !existing.membershipTier.toLowerCase().includes('free') && existing.membershipTier.toLowerCase() !== 'starter scholar')
      ),
      isVip: isSuper ? true : Boolean(
        existing?.isVip ||
        fallbackDetails?.isVip ||
        (existing?.membershipTier && (existing.membershipTier.toLowerCase().includes('vip') || existing.membershipTier.toLowerCase().includes('titan')))
      ),
      subscriptionExpiry: isSuper ? '2099-12-31T23:59:59.999Z' : (existing?.subscriptionExpiry || fallbackDetails?.subscriptionExpiry || ''),
      subscription: isSuper ? {
        planId: 'plan_titan_naira',
        name: 'Grobaax Titan Annual VIP',
        planName: 'Grobaax Titan Annual VIP',
        price: 25000,
        currency: 'NGN',
        duration: '1 Years',
        startDate: '2025-01-01T00:00:00.000Z',
        expiryDate: '2099-12-31T23:59:59.999Z',
        status: 'active',
      } : (existing?.subscription || fallbackDetails?.subscription || undefined),
      walletAddress: existing?.walletAddress || fallbackDetails?.walletAddress || `0x${uid.substring(0, 10)}${Math.random().toString(16).substring(2, 6)}`,
      privacy: existing?.privacy || fallbackDetails?.privacy || DEFAULT_PRIVACY,
      badges: existing?.badges || fallbackDetails?.badges || [],
      purchasedBadgeIds: existing?.purchasedBadgeIds || fallbackDetails?.purchasedBadgeIds || [],
      dailyQaUsage: existing?.dailyQaUsage || fallbackDetails?.dailyQaUsage || undefined,
      updatedAt: serverTimestamp(),
    };

    if (isAcademicComplete) {
      profileData.academicProfileCompleted = true;
      try {
        localStorage.setItem(`grobax_academic_completed_${uid}`, 'true');
      } catch (e) {}
    }

    if (!snap.exists()) {
      profileData.createdAt = serverTimestamp();
      profileData.updatedAt = serverTimestamp();
      const cleanedData = cleanFirestoreData(profileData);
      await setDoc(userDocRef, cleanedData, { merge: true });

      // Also reserve username doc if available
      try {
        const usernameRef = doc(db, 'usernames', generatedUsername.toLowerCase());
        await setDoc(usernameRef, { uid, username: generatedUsername, createdAt: serverTimestamp() }, { merge: true });
      } catch (uErr) {
        // Ignored
      }
    } else {
      // Keep user document refreshed with latest timestamp and confirmed academic profile status
      try {
        await setDoc(userDocRef, cleanFirestoreData({
          email,
          academicProfileCompleted: isAcademicComplete,
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }), { merge: true });
      } catch (uErr) {
        console.warn('Notice refreshing lastLoginAt in database:', uErr);
      }

      if (isSuper) {
        // Self-heal super admin's Firestore document to guarantee VIP tier and maintain their personal GP balance
        const adminPatch: Record<string, any> = {
          role: 'admin',
          membershipTier: 'Grobaax Titan Annual VIP',
          subscriptionTier: 'Grobaax Titan Annual VIP',
          subscriptionPlan: 'Grobaax Titan Annual VIP',
          activePlanId: 'plan_titan_naira',
          planId: 'plan_titan_naira',
          tier: 'Grobaax Titan Annual VIP',
          plan: 'Grobaax Titan Annual VIP',
          isSubscribed: true,
          isPremium: true,
          isVip: true,
          verified: true,
          subscriptionExpiry: '2099-12-31T23:59:59.999Z',
          updatedAt: serverTimestamp(),
        };
        if (existing?.gpBalance === undefined || isNaN(Number(existing?.gpBalance))) {
          adminPatch.gpBalance = 100000;
          profileData.gpBalance = 100000;
        }
        try {
          await setDoc(userDocRef, adminPatch, { merge: true });
        } catch (healErr) {
          console.warn('Super admin self-heal notice:', healErr);
        }
      }
    }

    // Cache to localStorage
    try {
      localStorage.setItem(`grobax_user_profile_${uid}`, JSON.stringify(profileData));
      if (!auth.currentUser || auth.currentUser.uid === uid) {
        localStorage.setItem('grobax_cached_user_profile', JSON.stringify({ ...profileData, id: uid }));
      }
    } catch (e) {}

    return {
      ...profileData,
      id: uid,
    };
  } catch (err: any) {
    console.warn('ensureUserInFirestore notice:', err?.message || err);
    
    // Check if profile was previously cached locally
    try {
      const cached = typeof window !== 'undefined' ? localStorage.getItem(`grobax_user_profile_${uid}`) : null;
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && (parsed.id === uid || parsed.uid === uid)) {
          return parsed;
        }
      }
    } catch (_) {}

    // Return standard profile structure
    const email = (firebaseUser.email || fallbackDetails?.email || '').trim();
    const uname = (fallbackDetails?.username || email.split('@')[0] || `scholar_${uid.substring(0, 6)}`).replace(/[^a-zA-Z0-9_]/g, '');
    return {
      id: uid,
      uid,
      name: fallbackDetails?.name || firebaseUser.displayName || uname,
      fullName: fallbackDetails?.fullName || fallbackDetails?.name || firebaseUser.displayName || uname,
      username: uname,
      usernameLower: uname.toLowerCase(),
      email,
      avatar: fallbackDetails?.avatar || firebaseUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
      profileImage: fallbackDetails?.profileImage || firebaseUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
      role: fallbackDetails?.role || 'student',
      academicProfileCompleted: Boolean(fallbackDetails?.academicProfileCompleted),
      institution: fallbackDetails?.institution || 'Unassigned Institution',
      institutionName: fallbackDetails?.institutionName || 'Unassigned Institution',
      institutionCategory: fallbackDetails?.institutionCategory || 'University',
      department: fallbackDetails?.department || 'General Studies',
      departmentName: fallbackDetails?.departmentName || 'General Studies',
      level: fallbackDetails?.level || '100 Level',
      major: fallbackDetails?.major || 'Undergraduate',
      gpBalance: fallbackDetails?.gpBalance || 0,
      grbxTokens: fallbackDetails?.grbxTokens || 0,
      stakedTokens: 0,
      reputationPoints: 100,
      gusRank: 0,
      gusTier: 'Scholar',
      walletAddress: `0x${uid.substring(0, 10)}`,
      bio: '',
      verified: true,
      privacy: DEFAULT_PRIVACY,
      badges: [],
      purchasedBadgeIds: [],
    };
  }
};

// ==========================================
// STUDENT SCHOLARSHIP / VERIFICATION REQUESTS
// ==========================================

export const submitStudentVerificationRequest = async (
  userId: string,
  data: Partial<StudentVerificationRequest>
): Promise<StudentVerificationRequest> => {
  const verifRef = doc(db, 'studentVerifications', userId);
  const payload: StudentVerificationRequest = {
    id: userId,
    userId,
    fullName: data.fullName || 'Student',
    username: data.username || '',
    email: data.email || '',
    avatar: data.avatar || '',
    institutionCategory: data.institutionCategory || 'University',
    institutionId: data.institutionId || '',
    institutionName: data.institutionName || '',
    departmentId: data.departmentId || '',
    departmentName: data.departmentName || '',
    level: data.level || '100 Level',
    studentIdCardUrl: data.studentIdCardUrl || '',
    status: 'pending',
    submittedAt: new Date().toISOString(),
  };

  await setDoc(verifRef, { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });

  // Sync to users collection
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    studentIdCardUrl: payload.studentIdCardUrl,
    idVerificationStatus: 'pending',
    idCardUploadedAt: payload.submittedAt,
    updatedAt: serverTimestamp(),
  });

  return payload;
};

export const subscribeToStudentVerificationRequests = (
  callback: (requests: StudentVerificationRequest[]) => void
) => {
  const colRef = query(collection(db, 'studentVerifications'), limit(50));
  return onSnapshot(colRef, (snap) => {
    if (!snap.empty) {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as StudentVerificationRequest));
      callback(list);
    } else {
      callback([]);
    }
  }, (err) => {
    console.warn('Error subscribing to student verifications:', err);
    callback([]);
  });
};

export const approveStudentVerificationRequest = async (
  userId: string,
  reviewerUid: string,
  reviewerName: string
) => {
  const verifRef = doc(db, 'studentVerifications', userId);
  const userRef = doc(db, 'users', userId);

  const now = new Date().toISOString();
  await setDoc(
    verifRef,
    {
      id: userId,
      userId,
      status: 'verified',
      reviewedAt: now,
      reviewedBy: reviewerUid,
      reviewedByName: reviewerName,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await setDoc(
    userRef,
    {
      verified: true,
      idVerificationStatus: 'verified',
      idCardVerifiedAt: now,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const rejectStudentVerificationRequest = async (
  userId: string,
  reviewerUid: string,
  reviewerName: string,
  reason?: string
) => {
  const verifRef = doc(db, 'studentVerifications', userId);
  const userRef = doc(db, 'users', userId);

  const now = new Date().toISOString();
  await setDoc(
    verifRef,
    {
      id: userId,
      userId,
      status: 'rejected',
      reviewedAt: now,
      reviewedBy: reviewerUid,
      reviewedByName: reviewerName,
      rejectionReason: reason || 'Document could not be verified by Grobaax Admin.',
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await setDoc(
    userRef,
    {
      verified: false,
      idVerificationStatus: 'rejected',
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

// Get User Profile from Firestore
export const getUserProfileDoc = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data();
      const hasAcademicFields = Boolean(
        (data.institutionName || data.institution) &&
        data.level
      );
      const academicProfileCompleted = data.academicProfileCompleted === true || (hasAcademicFields && data.academicProfileCompleted !== false);

      const profile: UserProfile = {
        id: uid,
        uid: uid,
        name: data.fullName || data.name || 'Scholar',
        fullName: data.fullName || data.name || 'Scholar',
        username: data.username || 'scholar',
        usernameLower: data.usernameLower || (data.username ? data.username.toLowerCase() : 'scholar'),
        email: data.email || '',
        avatar: data.profileImage || data.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
        profileImage: data.profileImage || data.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
        role: data.role || 'student',
        isRepresentative: !!data.representativeAssignment,
        academicProfileCompleted,
        academicProfile: data.academicProfile || undefined,
        institution: data.institutionName || data.institution || '',
        institutionName: data.institutionName || data.institution || '',
        institutionId: data.institutionId || '',
        institutionCategory: data.institutionCategory || data.academicProfile?.institutionCategory || 'University',
        faculty: data.facultyName || data.faculty || '',
        facultyName: data.facultyName || data.faculty || '',
        facultyId: data.facultyId || '',
        department: data.departmentName || data.department || '',
        departmentName: data.departmentName || data.department || '',
        departmentId: data.departmentId || '',
        level: data.level || '',
        major: data.departmentName || data.department || '',
        activePlanId: data.activePlanId || '',
        membershipTier: data.membershipTier || data.subscriptionTier || 'Free Scholar',
        subscriptionTier: data.subscriptionTier || data.membershipTier || 'Free Scholar',
        isPremium: Boolean(data.isPremium || (data.membershipTier && !data.membershipTier.toLowerCase().includes('free'))),
        subscriptionExpiry: data.subscriptionExpiry || '',
        subscription: data.subscription || undefined,
        grbxTokens: data.grbxTokens || 0,
        gpBalance: data.gpBalance || 0,
        stakedTokens: data.stakedTokens || 0,
        reputationPoints: data.reputationPoints || 100,
        gusRank: data.gusRank || 0,
        gusTier: data.gusTier || 'Novice',
        walletAddress: data.walletAddress || '0x...',
        bio: data.bio || '',
        verified: data.verified !== false,
        privacy: data.privacy || DEFAULT_PRIVACY,
        badges: data.badges || [],
        purchasedBadgeIds: data.purchasedBadgeIds || [],
        equippedBadgeId: data.equippedBadgeId,
        equippedBadge: data.equippedBadge,
        dailyQaUsage: data.dailyQaUsage || undefined,
        isPostingSuspended: data.accountStatus === 'suspended' || data.accountStatus === 'banned',
        competitionHistory: data.competitionHistory || { gus: [], dome: [], league: [] },
      };

      try {
        localStorage.setItem(`grobax_user_profile_${uid}`, JSON.stringify(profile));
      } catch (e) {}

      return profile;
    }
    return null;
  } catch (err: any) {
    // Offline resilience: return locally cached profile if available
    try {
      const cached = localStorage.getItem(`grobax_user_profile_${uid}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {}

    console.warn('Notice: Firestore offline or initializing, using cached profile state:', err?.message || err);
    return null;
  }
};

// Upload Profile Picture to Firebase Storage with Data URL fallback
export const uploadUserProfilePicture = async (
  file: File | Blob,
  uid: string
): Promise<{ downloadUrl: string; storagePath: string }> => {
  const fileName = (file as File).name ? (file as File).name.replace(/[^a-zA-Z0-9._-]/g, '_') : 'avatar.jpg';
  const path = `userAvatars/${uid}/${Date.now()}_${fileName}`;
  
  // Always compress image first to keep payload < 40KB
  let compressedBlob: Blob = file;
  let compressedDataUrl = '';
  try {
    const compressed = await compressAvatarImage(file, 400, 0.85);
    compressedBlob = compressed.blob;
    compressedDataUrl = compressed.dataUrl;
  } catch (compErr) {
    console.warn('Image pre-compression warning:', compErr);
  }

  try {
    const fileRef = storageRef(storage, path);
    // Timeout storage upload after 6 seconds to avoid hanging
    const uploadPromise = uploadBytes(fileRef, compressedBlob, {
      contentType: 'image/jpeg',
      customMetadata: {
        uid,
        uploadedAt: new Date().toISOString(),
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Storage upload timed out')), 6000)
    );

    const snapshot = await Promise.race([uploadPromise, timeoutPromise]);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    if (downloadUrl) {
      try {
        localStorage.setItem(`grobax_avatar_${uid}`, downloadUrl);
      } catch (e) {}
      return { downloadUrl, storagePath: path };
    }
  } catch (err) {
    console.warn('Firebase Storage upload note, using resilient compressed Data URL fallback:', err);
  }

  const finalFallbackUrl = compressedDataUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`;
  try {
    localStorage.setItem(`grobax_avatar_${uid}`, finalFallbackUrl);
  } catch (e) {}
  return { downloadUrl: finalFallbackUrl, storagePath: path };
};

// Update User Profile in Firestore with Security Validation
export const updateUserProfileInFirestore = async (
  uid: string,
  updates: Partial<UserProfile>
): Promise<UserProfile> => {
  const userDocRef = doc(db, 'users', uid);
  const snap = await getDoc(userDocRef);
  const existing = snap.exists() ? snap.data() : {};

  // Build clean payload satisfying all security constraints in firestore.rules
  const payload: any = {
    uid,
    role: existing.role || 'student',
    accountStatus: existing.accountStatus || 'active',
    gpBalance: existing.gpBalance !== undefined ? existing.gpBalance : 0,
    grbxTokens: existing.grbxTokens !== undefined ? existing.grbxTokens : 0,
    stakedTokens: existing.stakedTokens !== undefined ? existing.stakedTokens : 0,
    reputationPoints: existing.reputationPoints !== undefined ? existing.reputationPoints : 100,
    gusRank: existing.gusRank !== undefined ? existing.gusRank : 0,
    gusTier: existing.gusTier || 'Novice',
    updatedAt: serverTimestamp(),
  };

  if (!snap.exists()) {
    payload.createdAt = serverTimestamp();
    payload.name = updates.name || updates.fullName || 'Scholar';
    payload.fullName = updates.fullName || updates.name || 'Scholar';
    payload.username = updates.username || `scholar_${uid.substring(0, 5)}`;
    payload.usernameLower = (updates.username || `scholar_${uid.substring(0, 5)}`).toLowerCase();
    payload.verified = true;
    payload.privacy = DEFAULT_PRIVACY;
  }

  if (updates.name !== undefined) {
    payload.name = updates.name.trim();
    payload.fullName = updates.name.trim();
  }
  if (updates.fullName !== undefined) {
    payload.fullName = updates.fullName.trim();
    payload.name = updates.fullName.trim();
  }
  if (updates.bio !== undefined) {
    payload.bio = updates.bio.trim();
  }
  if (updates.avatar !== undefined) {
    payload.avatar = updates.avatar;
    payload.profileImage = updates.avatar;
    try {
      localStorage.setItem(`grobax_avatar_${uid}`, updates.avatar);
    } catch (e) {}
  }
  if (updates.profileImage !== undefined) {
    payload.profileImage = updates.profileImage;
    payload.avatar = updates.profileImage;
    try {
      localStorage.setItem(`grobax_avatar_${uid}`, updates.profileImage);
    } catch (e) {}
  }

  // Academic fields protection:
  // Once an institution, faculty, and department are registered (non-empty), regular profile updates
  // cannot change them.
  const hasExistingInstitution = Boolean(
    existing.institutionName || existing.institution
  );
  const hasExistingDepartment = Boolean(
    existing.departmentName || existing.department
  );
  const isRegisteredAcademic = hasExistingInstitution && hasExistingDepartment;

  if (!isRegisteredAcademic) {
    // Initial profile completion allows setting academic registration
    if (updates.institution !== undefined || updates.institutionName !== undefined) {
      const instName = updates.institutionName || updates.institution || '';
      payload.institution = instName;
      payload.institutionName = instName;
      if (updates.institutionId) payload.institutionId = updates.institutionId;
      if (updates.institutionCategory) payload.institutionCategory = updates.institutionCategory;
    }
    if (updates.faculty !== undefined || updates.facultyName !== undefined) {
      const facName = updates.facultyName || updates.faculty || '';
      payload.faculty = facName;
      payload.facultyName = facName;
      if (updates.facultyId) payload.facultyId = updates.facultyId;
    }
    if (updates.department !== undefined || updates.departmentName !== undefined) {
      const deptName = updates.departmentName || updates.department || '';
      payload.department = deptName;
      payload.departmentName = deptName;
      if (updates.departmentId) payload.departmentId = updates.departmentId;
      payload.major = deptName;
    }
  } else {
    // Registered users retain immutable academic identity
    payload.institution = existing.institutionName || existing.institution || '';
    payload.institutionName = existing.institutionName || existing.institution || '';
    if (existing.institutionId) payload.institutionId = existing.institutionId;
    if (existing.institutionCategory) payload.institutionCategory = existing.institutionCategory;
    payload.faculty = existing.facultyName || existing.faculty || '';
    payload.facultyName = existing.facultyName || existing.faculty || '';
    if (existing.facultyId) payload.facultyId = existing.facultyId;
    payload.department = existing.departmentName || existing.department || '';
    payload.departmentName = existing.departmentName || existing.department || '';
    if (existing.departmentId) payload.departmentId = existing.departmentId;
    payload.major = existing.major || existing.departmentName || existing.department || '';
  }

  if (updates.level !== undefined) {
    payload.level = updates.level;
  }
  if (updates.activePlanId !== undefined) {
    payload.activePlanId = updates.activePlanId;
  }
  if (updates.membershipTier !== undefined) {
    payload.membershipTier = updates.membershipTier;
  }
  if (updates.subscriptionTier !== undefined) {
    payload.subscriptionTier = updates.subscriptionTier;
  }
  if (updates.isPremium !== undefined) {
    payload.isPremium = updates.isPremium;
  }
  if (updates.subscriptionExpiry !== undefined) {
    payload.subscriptionExpiry = updates.subscriptionExpiry;
  }
  if (updates.subscription !== undefined) {
    payload.subscription = updates.subscription;
  }
  if (updates.gusTier !== undefined) {
    payload.gusTier = updates.gusTier;
  }
  if ((updates as any).subscriptionPlan !== undefined) {
    payload.subscriptionPlan = (updates as any).subscriptionPlan;
  }
  if ((updates as any).planId !== undefined) {
    payload.planId = (updates as any).planId;
  }
  if ((updates as any).tier !== undefined) {
    payload.tier = (updates as any).tier;
  }
  if ((updates as any).plan !== undefined) {
    payload.plan = (updates as any).plan;
  }
  if ((updates as any).isSubscribed !== undefined) {
    payload.isSubscribed = (updates as any).isSubscribed;
  }
  if ((updates as any).isVip !== undefined) {
    payload.isVip = (updates as any).isVip;
  }
  if ((updates as any).verified !== undefined) {
    payload.verified = (updates as any).verified;
  }
  if (updates.privacy !== undefined) {
    payload.privacy = {
      ...(existing.privacy || DEFAULT_PRIVACY),
      ...updates.privacy,
    };
  }
  if (updates.notificationPreferences !== undefined) {
    payload.notificationPreferences = {
      ...(existing.notificationPreferences || {}),
      ...updates.notificationPreferences,
    };
  }
  if (updates.equippedBadgeId !== undefined) {
    payload.equippedBadgeId = updates.equippedBadgeId;
  }
  if (updates.equippedBadge !== undefined) {
    payload.equippedBadge = updates.equippedBadge;
  }
  // SECURITY VERIFICATION: Protect financial balances and roles from client-side spoofing
  const currentAuthUser = auth.currentUser;
  const isCallerAdmin = isSuperAdmin(currentAuthUser?.uid, currentAuthUser?.email);

  if (updates.gpBalance !== undefined) {
    const prevGp = Number(existing.gpBalance || 0);
    const requestedGp = typeof updates.gpBalance === 'number' ? Math.max(0, updates.gpBalance) : Number(updates.gpBalance || 0);
    if (requestedGp > prevGp && !isCallerAdmin) {
      console.warn(`[SECURITY AUDIT] Blocked unauthorized client GP increment: ${prevGp} -> ${requestedGp}. Preserving existing balance.`);
      payload.gpBalance = prevGp;
    } else {
      payload.gpBalance = requestedGp;
    }
  }
  if (updates.grbxTokens !== undefined) {
    const prevTokens = Number(existing.grbxTokens || 0);
    const requestedTokens = typeof updates.grbxTokens === 'number' ? Math.max(0, updates.grbxTokens) : Number(updates.grbxTokens || 0);
    if (requestedTokens > prevTokens && !isCallerAdmin) {
      payload.grbxTokens = prevTokens;
    } else {
      payload.grbxTokens = requestedTokens;
    }
  }
  if (updates.stakedTokens !== undefined) {
    const prevStaked = Number(existing.stakedTokens || 0);
    const requestedStaked = typeof updates.stakedTokens === 'number' ? Math.max(0, updates.stakedTokens) : Number(updates.stakedTokens || 0);
    if (requestedStaked > prevStaked && !isCallerAdmin) {
      payload.stakedTokens = prevStaked;
    } else {
      payload.stakedTokens = requestedStaked;
    }
  }
  if (updates.reputationPoints !== undefined) {
    payload.reputationPoints = typeof updates.reputationPoints === 'number' ? updates.reputationPoints : Number(updates.reputationPoints || 100);
  }
  if (updates.badges !== undefined) {
    payload.badges = updates.badges;
  }
  if (updates.purchasedBadgeIds !== undefined) {
    payload.purchasedBadgeIds = updates.purchasedBadgeIds;
  }
  if (updates.accountStatus !== undefined) {
    payload.accountStatus = isCallerAdmin ? updates.accountStatus : (existing.accountStatus || 'active');
  }
  if (updates.role !== undefined) {
    payload.role = isCallerAdmin ? updates.role : (existing.role || 'student');
  }
  if (updates.verified !== undefined) {
    payload.verified = isCallerAdmin ? updates.verified : Boolean(existing.verified);
  }
  if (updates.studentIdCardUrl !== undefined) {
    payload.studentIdCardUrl = updates.studentIdCardUrl;
  }
  if (updates.idVerificationStatus !== undefined) {
    payload.idVerificationStatus = updates.idVerificationStatus;
  }
  if (updates.idCardUploadedAt !== undefined) {
    payload.idCardUploadedAt = updates.idCardUploadedAt;
  }
  if (updates.isPostingSuspended !== undefined) {
    payload.isPostingSuspended = updates.isPostingSuspended;
  }
  if (updates.dailyQaUsage !== undefined) {
    payload.dailyQaUsage = updates.dailyQaUsage;
  }

  // If username is changing, handle username reservation
  if (updates.username && updates.username.trim()) {
    const newUsername = updates.username.trim();
    const newUsernameLower = newUsername.toLowerCase();
    const oldUsernameLower = existing.usernameLower || (existing.username ? existing.username.toLowerCase() : '');

    if (newUsernameLower !== oldUsernameLower) {
      const usernameDocRef = doc(db, 'usernames', newUsernameLower);
      const usernameSnap = await getDoc(usernameDocRef);
      if (usernameSnap.exists() && usernameSnap.data()?.uid !== uid) {
        throw new Error(`Username @${newUsername} is already taken by another scholar.`);
      }
      // Reserve new username
      await setDoc(usernameDocRef, { uid, username: newUsername, updatedAt: serverTimestamp() });
      // Delete old username reservation if existed
      if (oldUsernameLower) {
        await deleteDoc(doc(db, 'usernames', oldUsernameLower)).catch(() => {});
      }
      payload.username = newUsername;
      payload.usernameLower = newUsernameLower;
    }
  }

  await setDoc(userDocRef, payload, { merge: true });

  const updatedDoc = await getUserProfileDoc(uid);
  return updatedDoc || ({
    ...existing,
    ...updates,
    id: uid,
    uid,
  } as UserProfile);
};

/**
 * Records a transaction log in Firestore walletTransactions collection
 */
export const recordWalletTransactionInFirestore = async (
  tx: {
    userId: string;
    userName?: string;
    userEmail?: string;
    userAvatar?: string;
    institutionName?: string;
    type: string;
    amount: number;
    unit?: string;
    title: string;
    description: string;
    isCredit: boolean;
    status?: 'completed' | 'pending' | 'failed';
    transactionId?: string;
    adminUid?: string;
    adminName?: string;
    reason?: string;
    meta?: any;
  }
): Promise<string> => {
  try {
    const txId = tx.transactionId || `TX-GRBX-${Math.floor(100000 + Math.random() * 900000)}`;
    const dateStr = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const docRef = await addDoc(collection(db, 'walletTransactions'), {
      ...cleanFirestoreData(tx),
      transactionId: txId,
      unit: tx.unit || 'GP',
      status: tx.status || 'completed',
      date: dateStr,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.warn('Notice: Could not write walletTransaction:', err);
    return '';
  }
};

/**
 * Deducts GP from a user document in Firestore and creates a transaction log atomically
 */
export const deductUserGpInFirestore = async (
  uid: string,
  gpAmount: number,
  txDetails?: {
    type?: string;
    title?: string;
    description?: string;
    userName?: string;
    userEmail?: string;
    userAvatar?: string;
    institutionName?: string;
    meta?: any;
    skipTransactionDoc?: boolean;
  }
): Promise<{ success: boolean; newBalance: number; error?: string }> => {
  try {
    if (!uid) {
      return { success: false, newBalance: 0, error: 'User ID is required' };
    }
    const userDocRef = doc(db, 'users', uid);
    let newBalance = 0;
    let uName = txDetails?.userName || 'Scholar';
    let uEmail = txDetails?.userEmail || '';
    let uAvatar = txDetails?.userAvatar || '';
    let uInstitution = txDetails?.institutionName || '';

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(userDocRef);
      let currentBalance = 0;
      if (snap.exists()) {
        const data = snap.data();
        currentBalance = typeof data.gpBalance === 'number' ? data.gpBalance : Number(data.gpBalance || 0);
        if (!txDetails?.userName) uName = data.fullName || data.name || data.username || 'Scholar';
        if (!txDetails?.userEmail) uEmail = data.email || data.username || '';
        if (!txDetails?.userAvatar) uAvatar = data.profileImage || data.avatar || '';
        if (!txDetails?.institutionName) uInstitution = data.institutionName || data.institution || '';
      }
      if (currentBalance < gpAmount) {
        throw new Error(`Insufficient GP balance. Available: ${currentBalance}, Required: ${gpAmount}`);
      }
      newBalance = Math.max(0, currentBalance - gpAmount);
      transaction.set(
        userDocRef,
        {
          gpBalance: newBalance,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    });

    // Also record in walletTransactions collection if not skipped
    if (!txDetails?.skipTransactionDoc) {
      try {
        const txRefId = `TX-GRBX-${Math.floor(100000 + Math.random() * 900000)}`;
        const dateStr = new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        await addDoc(collection(db, 'walletTransactions'), {
          userId: uid,
          userName: uName,
          userEmail: uEmail,
          userAvatar: uAvatar,
          institutionName: uInstitution,
          type: txDetails?.type || 'vtu_redemption',
          amount: gpAmount,
          unit: 'GP',
          title: txDetails?.title || 'GP Redemption',
          description: txDetails?.description || 'Redeemed GP for service',
          isCredit: false,
          status: 'completed',
          transactionId: txRefId,
          meta: txDetails?.meta || null,
          date: dateStr,
          createdAt: serverTimestamp(),
        });
      } catch (txErr) {
        console.warn('Notice: Could not record walletTransaction:', txErr);
      }
    }

    return { success: true, newBalance };
  } catch (err: any) {
    console.error('Error deducting user GP in Firestore:', err);
    return { success: false, newBalance: 0, error: err?.message || 'Failed to deduct GP' };
  }
};

/**
 * Automatically refunds GP to a user's wallet in Firestore and logs a refund transaction record.
 * Used when a network failure, telecom cancellation, or unfulfilled transaction occurs.
 */
export const refundUserGpInFirestore = async (
  uid: string,
  gpAmount: number,
  refundDetails?: {
    originalTransactionId?: string;
    reason?: string;
    title?: string;
    description?: string;
    userName?: string;
    userEmail?: string;
    userAvatar?: string;
    institutionName?: string;
    meta?: any;
  }
): Promise<{ success: boolean; newBalance: number; error?: string }> => {
  try {
    if (!uid || gpAmount <= 0) {
      return { success: false, newBalance: 0, error: 'Valid user ID and positive GP amount are required for refund' };
    }
    const userDocRef = doc(db, 'users', uid);
    let newBalance = 0;
    let uName = refundDetails?.userName || 'Scholar';
    let uEmail = refundDetails?.userEmail || '';
    let uAvatar = refundDetails?.userAvatar || '';
    let uInstitution = refundDetails?.institutionName || '';

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(userDocRef);
      let currentBalance = 0;
      if (snap.exists()) {
        const data = snap.data();
        currentBalance = typeof data.gpBalance === 'number' ? data.gpBalance : Number(data.gpBalance || 0);
        if (!refundDetails?.userName) uName = data.fullName || data.name || data.username || 'Scholar';
        if (!refundDetails?.userEmail) uEmail = data.email || data.username || '';
        if (!refundDetails?.userAvatar) uAvatar = data.profileImage || data.avatar || '';
        if (!refundDetails?.institutionName) uInstitution = data.institutionName || data.institution || '';
      }
      newBalance = currentBalance + gpAmount;
      transaction.set(
        userDocRef,
        {
          gpBalance: newBalance,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    });

    // Record explicit refund in walletTransactions collection
    try {
      const refundRefId = `REF-GRBX-${Math.floor(100000 + Math.random() * 900000)}`;
      const dateStr = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      await addDoc(collection(db, 'walletTransactions'), {
        userId: uid,
        userName: uName,
        userEmail: uEmail,
        userAvatar: uAvatar,
        institutionName: uInstitution,
        type: 'refund',
        amount: gpAmount,
        unit: 'GP',
        title: refundDetails?.title || `Refund: ${refundDetails?.reason || 'Transaction Reversed'} (+${gpAmount} GP)`,
        description: refundDetails?.description || `Automatic refund of ${gpAmount} GP due to transaction failure/cancellation.`,
        isCredit: true,
        status: 'completed',
        transactionId: refundRefId,
        originalTransactionId: refundDetails?.originalTransactionId || null,
        meta: refundDetails?.meta || null,
        date: dateStr,
        createdAt: serverTimestamp(),
      });
    } catch (txErr) {
      console.warn('Notice: Could not record refund walletTransaction:', txErr);
    }

    return { success: true, newBalance };
  } catch (err: any) {
    console.error('Error executing GP refund in Firestore:', err);
    return { success: false, newBalance: 0, error: err?.message || 'Failed to process refund' };
  }
};

/**
 * Adjusts GP (credit or debit) for a user in Firestore with admin logging atomically
 */
export const adjustUserGpInFirestore = async (
  uid: string,
  delta: number,
  reason: string,
  adminUid?: string,
  adminName?: string
): Promise<{ success: boolean; newBalance: number; error?: string }> => {
  try {
    if (!uid) {
      return { success: false, newBalance: 0, error: 'User ID is required' };
    }

    // SECURITY DEFENSE: Manual positive GP credit adjustments MUST be authorized by a Super Admin
    if (delta > 0) {
      const activeFirebaseUser = auth.currentUser;
      const callerUid = activeFirebaseUser?.uid || adminUid || '';
      const callerEmail = activeFirebaseUser?.email || '';
      const isPrivileged = isSuperAdmin(callerUid, callerEmail);
      if (!isPrivileged) {
        console.error(`[SECURITY VIOLATION] Unauthorized GP adjustment attempt by ${callerUid} (${callerEmail}) for target user ${uid}`);
        return {
          success: false,
          newBalance: 0,
          error: 'SECURITY VIOLATION: Manual GP credit adjustments require authenticated Super Admin authority.',
        };
      }
    }

    const userDocRef = doc(db, 'users', uid);
    let newBalance = 0;
    let uName = 'Scholar';
    let uEmail = '';
    let uAvatar = '';
    let uInstitution = '';

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(userDocRef);
      let currentBalance = 0;
      if (snap.exists()) {
        const data = snap.data();
        currentBalance = typeof data.gpBalance === 'number' ? data.gpBalance : Number(data.gpBalance || 0);
        uName = data.fullName || data.name || data.username || 'Scholar';
        uEmail = data.email || data.username || '';
        uAvatar = data.profileImage || data.avatar || '';
        uInstitution = data.institutionName || data.institution || '';
      }
      newBalance = Math.max(0, currentBalance + delta);
      transaction.set(
        userDocRef,
        {
          gpBalance: newBalance,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    });

    try {
      const txRefId = `TX-GRBX-${Math.floor(100000 + Math.random() * 900000)}`;
      const dateStr = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      await addDoc(collection(db, 'walletTransactions'), {
        userId: uid,
        userName: uName,
        userEmail: uEmail,
        userAvatar: uAvatar,
        institutionName: uInstitution,
        type: 'admin_adjustment',
        amount: Math.abs(delta),
        unit: 'GP',
        title: `Admin GP Adjustment (${delta >= 0 ? '+' : '-'}${Math.abs(delta)} GP)`,
        description: reason || 'Authorized Admin Wallet Adjustment',
        isCredit: delta >= 0,
        status: 'completed',
        transactionId: txRefId,
        adminUid: adminUid || null,
        adminName: adminName || null,
        reason: reason || 'Authorized Admin Wallet Adjustment',
        date: dateStr,
        createdAt: serverTimestamp(),
      });
    } catch (txErr) {
      console.warn('Notice: Could not record admin adjustment walletTransaction:', txErr);
    }

    return { success: true, newBalance };
  } catch (err: any) {
    console.error('Error adjusting user GP in Firestore:', err);
    return { success: false, newBalance: 0, error: err?.message || 'Failed to adjust GP' };
  }
};

// Map Firebase Auth Errors to User-Friendly Messages
export const formatAuthError = (errorCodeOrMessage: string): string => {
  if (!errorCodeOrMessage) return 'An authentication error occurred. Please try again.';
  
  // Extract auth/xxx error code if embedded in error message
  const match = errorCodeOrMessage.match(/auth\/[a-zA-Z0-9-]+/);
  const code = match ? match[0] : errorCodeOrMessage;

  switch (code) {
    case 'auth/unauthorized-domain': {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'your Vercel domain';
      return `Domain "${currentHost}" is not authorized in Firebase. Please go to Firebase Console > Authentication > Settings > Authorized Domains, click "Add Domain", and enter "${currentHost}".`;
    }
    case 'auth/operation-not-allowed':
      return 'Google Sign-In is not enabled for this Firebase project. Please enable Google provider in Firebase Console > Authentication > Sign-in method.';
    case 'auth/invalid-email':
      return 'The email address is invalid. Please enter a valid email.';
    case 'auth/user-disabled':
      return 'This account has been disabled or suspended.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please check your credentials and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Try logging in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters with letters and numbers.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Google sign-in was cancelled before completion.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Please allow popups for this site or open in a new tab.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method. Please sign in using email and password.';
    case 'auth/credential-already-in-use':
      return 'This credential is already linked to another account.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Access to this account has been temporarily disabled. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error encountered. Please check your internet connection.';
    case 'auth/timeout':
      return 'Authentication request timed out. Please try again.';
    default:
      if (errorCodeOrMessage.length > 5 && !errorCodeOrMessage.includes('auth/')) {
        return errorCodeOrMessage;
      }
      return 'An authentication error occurred. Please try again.';
  }
};

// =========================================================
// STEP 9: INSTITUTIONAL LEAGUE SEASONS & QUALIFICATIONS
// =========================================================

// Fetch Seasons
export const fetchSeasonsFromFirestore = async (category?: InstitutionCategory): Promise<LeagueSeason[]> => {
  try {
    const q = category
      ? query(collection(db, 'seasons'), where('category', '==', category), limit(20))
      : query(collection(db, 'seasons'), limit(20));
    const snap = await getDocs(q);
    if (snap.empty) {
      return category ? MOCK_SEASONS.filter(s => s.category === category) : MOCK_SEASONS;
    }
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name || 'Season',
        year: data.year || 2026,
        category: data.category || 'University',
        description: data.description || '',
        registrationStart: data.registrationStart || '',
        registrationEnd: data.registrationEnd || '',
        qualificationStart: data.qualificationStart || '',
        qualificationEnd: data.qualificationEnd || '',
        leagueStart: data.leagueStart || '',
        leagueEnd: data.leagueEnd || '',
        startDate: data.startDate || data.registrationStart || '',
        endDate: data.endDate || data.leagueEnd || '',
        status: data.status || 'Draft',
        isActive: data.status === 'Live' || data.status === 'League Live' || data.isActive === true,
        maxParticipatingInstitutions: data.maxParticipatingInstitutions || 32,
        qualificationQuestionCount: data.qualificationQuestionCount || 10,
        qualificationTimePerQuestion: data.qualificationTimePerQuestion || 20,
        participatingInstitutionIds: data.participatingInstitutionIds || [],
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : undefined,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : undefined,
      } as LeagueSeason;
    });
  } catch (err) {
    console.warn('Error fetching seasons from Firestore, fallback:', err);
    return category ? MOCK_SEASONS.filter(s => s.category === category) : MOCK_SEASONS;
  }
};

// Save or Update Season
export const saveSeasonToFirestore = async (
  seasonData: Partial<LeagueSeason>,
  adminUid: string = 'admin_sys',
  adminName: string = 'Admin'
): Promise<LeagueSeason> => {
  const seasonId = seasonData.id || `season_${(seasonData.category || 'University').toLowerCase().replace(/ /g, '_')}_${Date.now()}`;
  const seasonRef = doc(db, 'seasons', seasonId);

  const payload: any = {
    id: seasonId,
    name: seasonData.name?.trim() || 'New Season',
    year: seasonData.year || new Date().getFullYear(),
    category: seasonData.category || 'University',
    description: seasonData.description?.trim() || '',
    registrationStart: seasonData.registrationStart || '',
    registrationEnd: seasonData.registrationEnd || '',
    qualificationStart: seasonData.qualificationStart || '',
    qualificationEnd: seasonData.qualificationEnd || '',
    leagueStart: seasonData.leagueStart || '',
    leagueEnd: seasonData.leagueEnd || '',
    startDate: seasonData.startDate || seasonData.registrationStart || '',
    endDate: seasonData.endDate || seasonData.leagueEnd || '',
    status: seasonData.status || 'Draft',
    isActive: seasonData.status === 'Live' || seasonData.status === 'League Live',
    maxParticipatingInstitutions: seasonData.maxParticipatingInstitutions || 32,
    qualificationQuestionCount: seasonData.qualificationQuestionCount || 10,
    qualificationTimePerQuestion: seasonData.qualificationTimePerQuestion || 20,
    participatingInstitutionIds: seasonData.participatingInstitutionIds || [],
    updatedAt: serverTimestamp(),
  };

  const isNew = !seasonData.id;
  if (isNew) {
    payload.createdAt = serverTimestamp();
  }

  await setDoc(seasonRef, payload, { merge: true });

  await logAdminAuditAction(
    adminUid,
    adminName,
    isNew ? 'CREATE_SEASON' : 'UPDATE_SEASON',
    seasonId,
    { name: payload.name, category: payload.category, status: payload.status }
  );

  return {
    ...payload,
    id: seasonId,
    updatedAt: new Date().toISOString(),
  } as LeagueSeason;
};

// Update Season Status & Auto Initialize Standings if starting League
export const updateSeasonStatusInFirestore = async (
  seasonId: string,
  status: SeasonStatus,
  adminUid: string = 'admin_sys',
  adminName: string = 'Admin'
) => {
  const seasonRef = doc(db, 'seasons', seasonId);
  await updateDoc(seasonRef, {
    status,
    isActive: status === 'Live' || status === 'League Live',
    updatedAt: serverTimestamp(),
  });

  await logAdminAuditAction(adminUid, adminName, 'UPDATE_SEASON_STATUS', seasonId, { status });

  if (status === 'League Upcoming' || status === 'League Live' || status === 'Live') {
    await initializeSeasonStandingsInFirestore(seasonId, adminUid, adminName);
  }
};

// Stop Season in Firestore
export const stopSeasonInFirestore = async (
  seasonId: string,
  seasonName?: string,
  adminUid: string = 'admin_sys',
  adminName: string = 'Admin'
) => {
  try {
    const seasonRef = doc(db, 'seasons', seasonId);
    await updateDoc(seasonRef, {
      status: 'Completed',
      isActive: false,
      stoppedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await logAdminAuditAction(adminUid, adminName, 'STOP_SEASON', seasonId, {
      name: seasonName || seasonId,
      status: 'Completed',
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `seasons/${seasonId}`);
    throw err;
  }
};

// Delete Season from Firestore
export const deleteSeasonFromFirestore = async (
  seasonId: string,
  seasonName?: string,
  adminUid: string = 'admin_sys',
  adminName: string = 'Admin'
) => {
  try {
    const seasonRef = doc(db, 'seasons', seasonId);
    await deleteDoc(seasonRef);

    // Clean up or withdraw participations
    try {
      const q = query(collection(db, 'seasonParticipations'), where('seasonId', '==', seasonId));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      if (!snap.empty) {
        await batch.commit();
      }
    } catch (partErr) {
      console.warn('Notice cleaning participations for deleted season:', partErr);
    }

    await logAdminAuditAction(adminUid, adminName, 'DELETE_SEASON', seasonId, {
      name: seasonName || seasonId,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `seasons/${seasonId}`);
    throw err;
  }
};

// Fetch Season Participations
export const fetchSeasonParticipationsFromFirestore = async (seasonId: string): Promise<SeasonParticipation[]> => {
  try {
    const q = query(collection(db, 'seasonParticipations'), where('seasonId', '==', seasonId), limit(50));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          seasonId: data.seasonId,
          institutionId: data.institutionId,
          institutionName: data.institutionName,
          institutionShortName: data.institutionShortName || data.institutionName.substring(0, 8).toUpperCase(),
          institutionLogo: data.institutionLogo || '🏫',
          category: data.category || 'University',
          status: data.status || 'registered',
          joinedAt: data.joinedAt || new Date().toISOString(),
          withdrawnAt: data.withdrawnAt,
          qualificationStatus: data.qualificationStatus || 'pending',
          representativeId: data.representativeId,
          representativeName: data.representativeName,
          currentPosition: data.currentPosition || 0,
          played: data.played || 0,
          wins: data.wins || 0,
          losses: data.losses || 0,
          points: data.points || 0,
          scoreFor: data.scoreFor || 0,
          scoreAgainst: data.scoreAgainst || 0,
          scoreDifference: data.scoreDifference || 0,
        } as SeasonParticipation;
      });
    }
    return [];
  } catch (err) {
    console.warn('Error fetching season participations:', err);
    return [];
  }
};

// Add Institution to Season
export const addInstitutionToSeasonInFirestore = async (
  seasonId: string,
  seasonCategory: InstitutionCategory,
  masterInst: MasterInstitution,
  adminUid: string = 'admin_sys',
  adminName: string = 'Admin'
) => {
  const instCategory = masterInst.category || (
    masterInst.type === 'polytechnic' || (masterInst.type as string) === 'Polytechnic' ? 'Polytechnic' :
    masterInst.type === 'college_of_education' || (masterInst.type as string) === 'College of Education' ? 'College of Education' : 'University'
  );

  if (instCategory !== seasonCategory) {
    throw new Error(`Category mismatch: ${masterInst.name} (${instCategory}) cannot be added to a ${seasonCategory} Season.`);
  }

  const spId = `sp_${seasonId}_${masterInst.id}`;
  const spRef = doc(db, 'seasonParticipations', spId);

  const spPayload = {
    id: spId,
    seasonId,
    institutionId: masterInst.id,
    institutionName: masterInst.name,
    institutionShortName: masterInst.shortName || masterInst.name.substring(0, 8).toUpperCase(),
    institutionLogo: masterInst.logo || '🏫',
    category: seasonCategory,
    status: 'registered',
    joinedAt: new Date().toISOString(),
    qualificationStatus: 'pending',
    currentPosition: 0,
    played: 0,
    wins: 0,
    losses: 0,
    points: 0,
    scoreFor: 0,
    scoreAgainst: 0,
    scoreDifference: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(spRef, spPayload, { merge: true });

  const seasonRef = doc(db, 'seasons', seasonId);
  const seasonSnap = await getDoc(seasonRef);
  if (seasonSnap.exists()) {
    const existingIds: string[] = seasonSnap.data().participatingInstitutionIds || [];
    if (!existingIds.includes(masterInst.id)) {
      await updateDoc(seasonRef, {
        participatingInstitutionIds: [...existingIds, masterInst.id],
        updatedAt: serverTimestamp(),
      });
    }
  }

  await logAdminAuditAction(adminUid, adminName, 'ADD_INSTITUTION_TO_SEASON', seasonId, {
    institutionId: masterInst.id,
    institutionName: masterInst.name,
    category: seasonCategory,
  });
};

// Remove or Withdraw Institution from Season
export const removeInstitutionFromSeasonInFirestore = async (
  seasonId: string,
  institutionId: string,
  isWithdrawal = false,
  adminUid: string = 'admin_sys',
  adminName: string = 'Admin'
) => {
  const spId = `sp_${seasonId}_${institutionId}`;
  const spRef = doc(db, 'seasonParticipations', spId);

  if (isWithdrawal) {
    await updateDoc(spRef, {
      status: 'withdrawn',
      withdrawnAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(spRef, { status: 'withdrawn', withdrawnAt: new Date().toISOString(), updatedAt: serverTimestamp() }, { merge: true });
    const seasonRef = doc(db, 'seasons', seasonId);
    const seasonSnap = await getDoc(seasonRef);
    if (seasonSnap.exists()) {
      const existingIds: string[] = seasonSnap.data().participatingInstitutionIds || [];
      await updateDoc(seasonRef, {
        participatingInstitutionIds: existingIds.filter(id => id !== institutionId),
        updatedAt: serverTimestamp(),
      });
    }
  }

  await logAdminAuditAction(adminUid, adminName, isWithdrawal ? 'WITHDRAW_INSTITUTION_FROM_SEASON' : 'REMOVE_INSTITUTION_FROM_SEASON', seasonId, {
    institutionId,
  });
};

// Fetch Qualifications
export const fetchQualificationsFromFirestore = async (
  seasonId?: string,
  institutionId?: string
): Promise<QualificationCompetition[]> => {
  try {
    const q = seasonId
      ? query(collection(db, 'qualifications'), where('seasonId', '==', seasonId), limit(20))
      : query(collection(db, 'qualifications'), limit(20));
    const snap = await getDocs(q);
    if (!snap.empty) {
      let results = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          seasonId: data.seasonId,
          institutionId: data.institutionId,
          institutionName: data.institutionName || '',
          category: data.category || 'University',
          title: data.title || 'Qualification Olympiad',
          questionSetId: data.questionSetId || '',
          numQuestions: data.numQuestions || 10,
          timePerQuestion: data.timePerQuestion || 20,
          startDate: data.startDate || '',
          endDate: data.endDate || '',
          attemptRules: data.attemptRules || 'One official submission per active student.',
          scoringRules: data.scoringRules || '+10 points per correct answer.',
          status: data.status || 'Open',
          questions: data.questions || [],
        } as QualificationCompetition;
      });

      if (institutionId) {
        results = results.filter(q => q.institutionId === institutionId);
      }
      return results;
    }
    return MOCK_QUALIFICATION_COMPETITIONS as any[];
  } catch (err) {
    console.warn('Error fetching qualifications:', err);
    return MOCK_QUALIFICATION_COMPETITIONS as any[];
  }
};

// Save Qualification
export const saveQualificationToFirestore = async (
  qualData: Partial<QualificationCompetition>,
  adminUid: string = 'admin_sys',
  adminName: string = 'Admin'
): Promise<QualificationCompetition> => {
  const qualId = qualData.id || `qual_${qualData.seasonId}_${qualData.institutionId}_${Date.now()}`;
  const qualRef = doc(db, 'qualifications', qualId);

  const payload: any = {
    id: qualId,
    seasonId: qualData.seasonId || '',
    institutionId: qualData.institutionId || '',
    institutionName: qualData.institutionName || '',
    category: qualData.category || 'University',
    title: qualData.title || 'Delegate Qualification Olympiad',
    questionSetId: qualData.questionSetId || '',
    numQuestions: qualData.numQuestions || 10,
    timePerQuestion: qualData.timePerQuestion || 20,
    startDate: qualData.startDate || new Date().toISOString().split('T')[0],
    endDate: qualData.endDate || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
    attemptRules: qualData.attemptRules || 'One official attempt per student.',
    scoringRules: qualData.scoringRules || 'Rankings calculated by total correct answers & completion speed.',
    status: qualData.status || 'Open',
    questions: qualData.questions || [],
    updatedAt: serverTimestamp(),
  };

  await setDoc(qualRef, payload, { merge: true });

  // Sync automatically with 'events' collection for Home Page Event integration
  try {
    const eventRef = doc(db, 'events', qualId);
    const eventPayload: any = {
      id: qualId,
      referenceId: qualId,
      eventType: 'REPRESENTATIVE_QUALIFICATION',
      title: payload.title,
      category: payload.category || 'Olympiad',
      institutionId: payload.institutionId,
      institutionHost: payload.institutionName,
      date: `${payload.startDate} to ${payload.endDate}`,
      time: '18:00 UTC',
      prizePool: 'Official Representative Title & Institutional League Slot',
      participantsCount: 0,
      maxParticipants: 1000,
      image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&auto=format&fit=crop&q=80',
      status: payload.status === 'Open' ? 'upcoming' : payload.status === 'Completed' ? 'completed' : 'live',
      description: `Official ${payload.category} Delegate Qualification Tournament for ${payload.institutionName}. Top ranked scholar becomes official representative for Season ${payload.seasonId}.`,
      updatedAt: serverTimestamp(),
    };
    await setDoc(eventRef, eventPayload, { merge: true });
  } catch (evErr) {
    console.warn('Failed to auto-sync event document for qualification:', evErr);
  }

  await logAdminAuditAction(adminUid, adminName, 'SAVE_QUALIFICATION', qualId, {
    seasonId: payload.seasonId,
    institutionId: payload.institutionId,
    title: payload.title,
  });

  return {
    ...payload,
    id: qualId,
  } as QualificationCompetition;
};

// Fetch Qualification Attempts (Leaderboard)
export const fetchQualificationAttemptsFromFirestore = async (
  qualificationId: string
): Promise<QualificationAttempt[]> => {
  try {
    const q = query(collection(db, 'qualificationAttempts'), where('qualificationId', '==', qualificationId), limit(50));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const attempts = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          qualificationId: data.qualificationId,
          seasonId: data.seasonId,
          institutionId: data.institutionId,
          userId: data.userId,
          userName: data.userName || 'Student',
          userUsername: data.userUsername || '',
          userAvatar: data.userAvatar || '',
          department: data.department || 'General',
          level: data.level || '100 Level',
          totalQuestions: data.totalQuestions || 10,
          correctCount: data.correctCount || 0,
          wrongCount: data.wrongCount || 0,
          unansweredCount: data.unansweredCount || 0,
          score: data.score || 0,
          completionTimeSeconds: data.completionTimeSeconds || 0,
          completedAt: data.completedAt || new Date().toISOString(),
          status: data.status || 'submitted',
        } as QualificationAttempt;
      });

      return attempts
        .sort((a, b) => b.score - a.score || a.completionTimeSeconds - b.completionTimeSeconds)
        .map((att, idx) => ({ ...att, rank: idx + 1 }));
    }
    return [];
  } catch (err) {
    console.warn('Error fetching qualification attempts:', err);
    return [];
  }
};

// Submit Qualification Attempt
export const submitQualificationAttemptToFirestore = async (
  attemptData: Partial<QualificationAttempt>
): Promise<QualificationAttempt> => {
  const attemptId = attemptData.id || `qa_${attemptData.qualificationId}_${attemptData.userId}`;
  const attemptRef = doc(db, 'qualificationAttempts', attemptId);

  const payload: any = {
    id: attemptId,
    qualificationId: attemptData.qualificationId || '',
    seasonId: attemptData.seasonId || '',
    institutionId: attemptData.institutionId || '',
    userId: attemptData.userId || '',
    userName: attemptData.userName || '',
    userUsername: attemptData.userUsername || '',
    userAvatar: attemptData.userAvatar || '',
    department: attemptData.department || '',
    level: attemptData.level || '',
    totalQuestions: attemptData.totalQuestions || 10,
    correctCount: attemptData.correctCount || 0,
    wrongCount: attemptData.wrongCount || 0,
    unansweredCount: attemptData.unansweredCount || 0,
    score: attemptData.score || 0,
    completionTimeSeconds: attemptData.completionTimeSeconds || 0,
    completedAt: new Date().toISOString(),
    status: attemptData.status || 'submitted',
    createdAt: serverTimestamp(),
  };

  await setDoc(attemptRef, payload, { merge: true });

  return {
    ...payload,
    id: attemptId,
  } as QualificationAttempt;
};

// Fetch Representative Assignments
export const fetchRepresentativeAssignmentsFromFirestore = async (
  seasonId?: string,
  institutionId?: string
): Promise<RepresentativeAssignment[]> => {
  try {
    const q = seasonId
      ? query(collection(db, 'representativeAssignments'), where('seasonId', '==', seasonId), limit(50))
      : query(collection(db, 'representativeAssignments'), limit(50));
    const snap = await getDocs(q);
    if (!snap.empty) {
      let results = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          assignmentId: d.id,
          userId: data.userId,
          userName: data.userName,
          userUsername: data.userUsername || '',
          userAvatar: data.userAvatar || '',
          institutionId: data.institutionId,
          institutionName: data.institutionName,
          department: data.department || '',
          level: data.level || '',
          seasonId: data.seasonId,
          seasonName: data.seasonName || '',
          category: data.category || 'University',
          qualificationScore: data.qualificationScore || 0,
          qualificationRank: data.qualificationRank || 1,
          selectedByAdminId: data.selectedByAdminId || 'admin_sys',
          selectedByAdminName: data.selectedByAdminName || 'Admin',
          selectedAt: data.selectedAt || new Date().toISOString(),
          status: data.status || 'active',
        } as RepresentativeAssignment;
      });

      if (institutionId) {
        results = results.filter(r => r.institutionId === institutionId);
      }
      return results;
    }
    return [];
  } catch (err) {
    console.warn('Error fetching representative assignments:', err);
    return [];
  }
};

// Assign Representative (Admin Action - Unified Central Engine)
export const assignRepresentativeInFirestore = async (
  data: Partial<RepresentativeAssignment>,
  adminUid: string = PRIMARY_SUPER_ADMIN_UID,
  adminName: string = 'Super Admin'
): Promise<RepresentativeAssignment> => {
  if (!data.institutionId || !data.userId) {
    throw new Error('Institution ID and User ID are required to assign a representative.');
  }

  // 1. Resolve User Details if not fully provided
  let userName = data.userName || '';
  let userUsername = data.userUsername || '';
  let userAvatar = data.userAvatar || '';
  let department = data.department || '';
  let level = data.level || '';

  const userRef = doc(db, 'users', data.userId);
  const userSnap = await getDoc(userRef).catch(() => null);
  if (userSnap && userSnap.exists()) {
    const uData = userSnap.data();
    userName = userName || uData.name || uData.username || 'Student Scholar';
    userUsername = userUsername || uData.username || data.userId;
    userAvatar = userAvatar || uData.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${data.userId}`;
    department = department || uData.department || 'General Department';
    level = level || uData.level || '300 Level';
  } else {
    userName = userName || 'Student Scholar';
    userAvatar = userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${data.userId}`;
    department = department || 'General Department';
    level = level || '300 Level';
  }

  // 2. Resolve Institution Details if not fully provided
  let institutionName = data.institutionName || '';
  let category: InstitutionCategory = (data.category as InstitutionCategory) || 'University';

  const instRef = doc(db, 'masterInstitutions', data.institutionId);
  const instSnap = await getDoc(instRef).catch(() => null);
  if (instSnap && instSnap.exists()) {
    const iData = instSnap.data();
    institutionName = institutionName || iData.name || 'Member Institution';
    category = (iData.category as InstitutionCategory) || category;
  } else {
    const legInstRef = doc(db, 'institutions', data.institutionId);
    const legSnap = await getDoc(legInstRef).catch(() => null);
    if (legSnap && legSnap.exists()) {
      const iData = legSnap.data();
      institutionName = institutionName || iData.name || 'Member Institution';
      category = (iData.category as InstitutionCategory) || category;
    }
  }
  institutionName = institutionName || 'Member Institution';

  const seasonId = data.seasonId || 'sea_univ_1';
  const seasonName = data.seasonName || '';

  // 3. Mark any previous active assignments for this institution as replaced
  try {
    const existingQ = query(
      collection(db, 'representativeAssignments'),
      where('institutionId', '==', data.institutionId),
      where('status', '==', 'active')
    );
    const existingSnap = await getDocs(existingQ);
    for (const oldDoc of existingSnap.docs) {
      const oldData = oldDoc.data();
      if (oldData.userId !== data.userId) {
        await updateDoc(oldDoc.ref, {
          status: 'replaced',
          replacedByUserId: data.userId,
          replacedByUserName: userName,
          updatedAt: serverTimestamp(),
        }).catch(() => {});

        if (oldData.userId) {
          const oldUserRef = doc(db, 'users', oldData.userId);
          const oldUserSnap = await getDoc(oldUserRef).catch(() => null);
          const oldRole = oldUserSnap?.exists() ? oldUserSnap.data().role : 'student';
          await updateDoc(oldUserRef, {
            isRepresentative: false,
            representativeAssignment: null,
            role: (oldRole === 'admin' || oldRole === 'super_admin' || oldRole === 'community_manager') ? oldRole : 'student',
            updatedAt: serverTimestamp(),
          }).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.warn('Notice resolving prior representative assignments:', err);
  }

  // 4. Central Representative Assignment Record (Single Source of Truth)
  const assignmentId = `rep_${data.institutionId}`;
  const repRef = doc(db, 'representativeAssignments', assignmentId);

  const payload: RepresentativeAssignment = {
    id: assignmentId,
    assignmentId,
    userId: data.userId,
    userName,
    userUsername,
    userAvatar,
    institutionId: data.institutionId,
    institutionName,
    department,
    level,
    seasonId,
    seasonName,
    category,
    qualificationScore: data.qualificationScore !== undefined ? data.qualificationScore : 100,
    qualificationRank: data.qualificationRank || 1,
    selectedByAdminId: adminUid,
    selectedByAdminName: adminName,
    selectedAt: new Date().toISOString(),
    status: 'active',
  };

  await setDoc(repRef, {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });

  // 5. Update user profile to reflect representative role
  if (data.userId) {
    const curRole = userSnap?.exists() ? userSnap.data().role : 'student';
    const repRole = (curRole === 'admin' || curRole === 'super_admin' || curRole === 'community_manager') ? curRole : 'representative';
    await updateDoc(userRef, {
      isRepresentative: true,
      representativeAssignment: {
        seasonId,
        seasonName,
        institutionId: data.institutionId,
        institutionName,
        category,
        assignedAt: payload.selectedAt,
        assignedByAdminId: adminUid,
        assignedByAdminName: adminName,
      },
      institution: institutionName,
      role: repRole,
      updatedAt: serverTimestamp(),
    }).catch((e) => console.warn('User profile rep update notice:', e));
  }

  // 6. Update Master Institution & Legacy Institution catalogs
  const instUpdatePayload = {
    representativeName: userName,
    representativeId: data.userId,
    assignedRepName: userName,
    assignedRepId: data.userId,
    assignedRepUsername: userUsername,
    representativeAvatar: userAvatar,
    updatedAt: serverTimestamp(),
  };
  await updateDoc(doc(db, 'masterInstitutions', data.institutionId), instUpdatePayload).catch(() => {});
  await updateDoc(doc(db, 'institutions', data.institutionId), instUpdatePayload).catch(() => {});

  // Log Audit
  await logAdminAuditAction(adminUid, adminName, 'ASSIGN_REPRESENTATIVE', assignmentId, {
    studentId: data.userId,
    studentName: userName,
    institutionId: data.institutionId,
    institution: institutionName,
    seasonId,
  });

  return payload;
};

// Remove Representative (Admin Action - Unified Central Engine)
export const removeRepresentativeInFirestore = async (
  assignmentIdOrInstId: string,
  adminUid: string = PRIMARY_SUPER_ADMIN_UID,
  adminName: string = 'Super Admin'
) => {
  let instId = '';
  let userId = '';

  // 1. Try to find the document in representativeAssignments
  let targetDocs: any[] = [];
  const directRef = doc(db, 'representativeAssignments', assignmentIdOrInstId);
  const directSnap = await getDoc(directRef).catch(() => null);

  if (directSnap && directSnap.exists()) {
    targetDocs.push(directSnap);
    instId = directSnap.data().institutionId;
    userId = directSnap.data().userId;
  } else {
    // Check if passed string is institutionId
    const instQ = query(
      collection(db, 'representativeAssignments'),
      where('institutionId', '==', assignmentIdOrInstId),
      where('status', '==', 'active')
    );
    const instSnap = await getDocs(instQ).catch(() => null);
    if (instSnap && !instSnap.empty) {
      targetDocs = instSnap.docs;
      instId = assignmentIdOrInstId;
      userId = instSnap.docs[0].data().userId;
    } else {
      instId = assignmentIdOrInstId;
    }
  }

  // 2. Mark representative assignments as removed
  for (const tDoc of targetDocs) {
    await updateDoc(tDoc.ref, {
      status: 'removed',
      removedByAdminId: adminUid,
      removedByAdminName: adminName,
      removedAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    }).catch(() => {});
  }

  // 3. Clear representative from user account
  if (userId) {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef).catch(() => null);
    const curRole = userSnap?.exists() ? userSnap.data().role : 'student';
    await updateDoc(userRef, {
      isRepresentative: false,
      representativeAssignment: null,
      role: (curRole === 'admin' || curRole === 'super_admin' || curRole === 'community_manager') ? curRole : 'student',
      updatedAt: serverTimestamp(),
    }).catch(() => {});
  }

  // 4. Clear representative fields in masterInstitutions & institutions
  if (instId) {
    const clearInstPayload = {
      representativeName: '',
      representativeId: '',
      assignedRepName: null,
      assignedRepId: null,
      assignedRepUsername: null,
      representativeAvatar: '',
      updatedAt: serverTimestamp(),
    };
    await updateDoc(doc(db, 'masterInstitutions', instId), clearInstPayload).catch(() => {});
    await updateDoc(doc(db, 'institutions', instId), clearInstPayload).catch(() => {});
  }

  // 5. Log Audit
  await logAdminAuditAction(adminUid, adminName, 'REMOVE_REPRESENTATIVE', assignmentIdOrInstId, {
    userId,
    institutionId: instId,
  });
};

// Fetch Standings
export const fetchStandingsFromFirestore = async (seasonId: string): Promise<SeasonStanding[]> => {
  try {
    const q = query(collection(db, 'standings'), where('seasonId', '==', seasonId), limit(50));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const standings = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          seasonId: data.seasonId,
          institutionId: data.institutionId,
          institutionName: data.institutionName,
          institutionShortName: data.institutionShortName || data.institutionName.substring(0, 8).toUpperCase(),
          institutionLogo: data.institutionLogo || '🏫',
          category: data.category || 'University',
          rank: data.rank || 0,
          played: data.played || 0,
          wins: data.wins || 0,
          losses: data.losses || 0,
          points: data.points || 0,
          scoreFor: data.scoreFor || 0,
          scoreAgainst: data.scoreAgainst || 0,
          scoreDifference: data.scoreDifference || 0,
          representativeName: data.representativeName || '',
        } as SeasonStanding;
      });

      return standings
        .sort((a, b) => b.points - a.points || b.scoreDifference - a.scoreDifference)
        .map((s, idx) => ({ ...s, rank: idx + 1 }));
    }
    return [];
  } catch (err) {
    console.warn('Error fetching standings:', err);
    return [];
  }
};

// Initialize Standings for Season
export const initializeSeasonStandingsInFirestore = async (
  seasonId: string,
  adminUid: string = 'admin_sys',
  adminName: string = 'Admin'
) => {
  try {
    const participations = await fetchSeasonParticipationsFromFirestore(seasonId);
    if (participations.length === 0) return;

    const batch = writeBatch(db);
    let rank = 1;

    for (const p of participations) {
      const standingId = `standing_${seasonId}_${p.institutionId}`;
      const standingRef = doc(db, 'standings', standingId);

      batch.set(
        standingRef,
        {
          id: standingId,
          seasonId,
          institutionId: p.institutionId,
          institutionName: p.institutionName,
          institutionShortName: p.institutionShortName,
          institutionLogo: p.institutionLogo,
          category: p.category,
          rank: rank++,
          played: p.played || 0,
          wins: p.wins || 0,
          losses: p.losses || 0,
          points: p.points || 0,
          scoreFor: p.scoreFor || 0,
          scoreAgainst: p.scoreAgainst || 0,
          scoreDifference: p.scoreDifference || 0,
          representativeName: p.representativeName || '',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    await batch.commit();

    await logAdminAuditAction(adminUid, adminName, 'INITIALIZE_SEASON_STANDINGS', seasonId, {
      totalInstitutions: participations.length,
    });
  } catch (err) {
    console.warn('Error initializing standings:', err);
  }
};

// ==========================================
// STEP 10: FIXTURES, QUESTION SETS & LIVE MATCH REALTIME ENGINE
// ==========================================

// Fetch Fixtures
export const fetchFixturesFromFirestore = async (
  seasonId?: string,
  category?: InstitutionCategory
): Promise<LeagueFixture[]> => {
  try {
    const colRef = collection(db, 'fixtures');
    let q = query(colRef, limit(50));
    if (seasonId) {
      q = query(colRef, where('seasonId', '==', seasonId), limit(50));
    }
    const snap = await getDocs(q);
    if (!snap.empty) {
      let results = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          fixtureId: d.id,
          seasonId: data.seasonId || '',
          category: data.category || 'University',
          roundSession: data.roundSession || data.round || 'Group Stage',
          homeInstId: data.homeInstId || '',
          homeInst: data.homeInst || '',
          homeLogo: data.homeLogo || '🏫',
          homeRep: data.homeRep || '',
          homeRepId: data.homeRepId || '',
          awayInstId: data.awayInstId || '',
          awayInst: data.awayInst || '',
          awayLogo: data.awayLogo || '🎓',
          awayRep: data.awayRep || '',
          awayRepId: data.awayRepId || '',
          homeScore: data.homeScore ?? data.scoreA ?? 0,
          awayScore: data.awayScore ?? data.scoreB ?? 0,
          date: data.date || data.scheduledDate || '2026-08-20',
          startTime: data.startTime || data.scheduledStartTime || '16:00',
          endTime: data.endTime || data.scheduledEndTime || '17:00',
          scheduledTime: data.scheduledTime || `${data.date || '2026-08-20'} 16:00`,
          status: data.status || 'Upcoming',
          matchRoomId: data.matchRoomId || data.roomId || d.id,
          questionSetId: data.questionSetId || '',
          winnerId: data.winnerId || '',
          winnerName: data.winnerName || '',
          currentQuestionIndex: data.currentQuestionIndex || 0,
          isPaused: data.isPaused || false,
        } as LeagueFixture;
      });

      if (category) {
        results = results.filter(f => f.category === category);
      }
      return results;
    }
    return [];
  } catch (err) {
    console.warn('Error fetching fixtures:', err);
    return [];
  }
};

// Save / Update Fixture
export const saveFixtureToFirestore = async (
  data: Partial<LeagueFixture>,
  adminUid: string = 'admin_sys',
  adminName: string = 'Admin'
): Promise<LeagueFixture> => {
  const fixtureId = data.id || `fix_${data.seasonId || 's1'}_${Date.now()}`;
  const fixRef = doc(db, 'fixtures', fixtureId);

  const payload: any = {
    id: fixtureId,
    fixtureId,
    seasonId: data.seasonId || '',
    category: data.category || 'University',
    roundSession: data.roundSession || 'Group Stage',
    homeInstId: data.homeInstId || '',
    homeInst: data.homeInst || '',
    homeLogo: data.homeLogo || '🏫',
    homeRep: data.homeRep || '',
    homeRepId: data.homeRepId || '',
    awayInstId: data.awayInstId || '',
    awayInst: data.awayInst || '',
    awayLogo: data.awayLogo || '🎓',
    awayRep: data.awayRep || '',
    awayRepId: data.awayRepId || '',
    homeScore: data.homeScore ?? 0,
    awayScore: data.awayScore ?? 0,
    date: data.date || '2026-08-20',
    startTime: data.startTime || '16:00',
    endTime: data.endTime || '17:00',
    scheduledTime: data.scheduledTime || `${data.date || '2026-08-20'} ${data.startTime || '16:00'}`,
    status: data.status || 'Upcoming',
    matchRoomId: data.matchRoomId || fixtureId,
    questionSetId: data.questionSetId || '',
    winnerId: data.winnerId || '',
    winnerName: data.winnerName || '',
    currentQuestionIndex: data.currentQuestionIndex || 0,
    isPaused: data.isPaused || false,
    updatedAt: serverTimestamp(),
  };

  await setDoc(fixRef, payload, { merge: true });

  await logAdminAuditAction(adminUid, adminName, 'SAVE_FIXTURE', fixtureId, {
    homeInst: payload.homeInst,
    awayInst: payload.awayInst,
    status: payload.status,
  });

  return { ...payload, id: fixtureId } as LeagueFixture;
};

// Generate Fixtures automatically for Season (Round Robin / Elimination)
export const generateFixturesForSeasonInFirestore = async (
  seasonId: string,
  category: InstitutionCategory,
  format: 'Round Robin' | 'Single Elimination' = 'Round Robin',
  adminUid: string = 'admin_sys',
  adminName: string = 'Admin'
): Promise<LeagueFixture[]> => {
  try {
    const participations = await fetchSeasonParticipationsFromFirestore(seasonId);
    if (participations.length < 2) {
      throw new Error('At least 2 participating institutions required to generate fixtures.');
    }

    const generatedFixtures: LeagueFixture[] = [];
    const batch = writeBatch(db);

    if (format === 'Round Robin') {
      let fixtureCount = 1;
      for (let i = 0; i < participations.length; i++) {
        for (let j = i + 1; j < participations.length; j++) {
          const home = participations[i];
          const away = participations[j];
          const fixId = `fix_${seasonId}_rr_${i + 1}_vs_${j + 1}`;
          const fixRef = doc(db, 'fixtures', fixId);

          const fixtureData: LeagueFixture = {
            id: fixId,
            fixtureId: fixId,
            seasonId,
            category,
            roundSession: `Round ${Math.floor(fixtureCount / 2) + 1}`,
            homeInstId: home.institutionId,
            homeInst: home.institutionName,
            homeLogo: home.institutionLogo || '🏫',
            homeRep: home.representativeName || 'Representative TBD',
            homeRepId: home.representativeId || '',
            awayInstId: away.institutionId,
            awayInst: away.institutionName,
            awayLogo: away.institutionLogo || '🎓',
            awayRep: away.representativeName || 'Representative TBD',
            awayRepId: away.representativeId || '',
            homeScore: 0,
            awayScore: 0,
            date: new Date(Date.now() + fixtureCount * 86400000).toISOString().split('T')[0],
            startTime: '16:00',
            endTime: '17:00',
            scheduledTime: `${new Date(Date.now() + fixtureCount * 86400000).toISOString().split('T')[0]} 16:00`,
            status: 'Upcoming',
            matchRoomId: fixId,
            currentQuestionIndex: 0,
            isPaused: false,
          };

          batch.set(fixRef, { ...fixtureData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
          generatedFixtures.push(fixtureData);
          fixtureCount++;
        }
      }
    }

    await batch.commit();

    await logAdminAuditAction(adminUid, adminName, 'GENERATE_SEASON_FIXTURES', seasonId, {
      count: generatedFixtures.length,
      format,
    });

    return generatedFixtures;
  } catch (err) {
    console.error('Error generating fixtures:', err);
    throw err;
  }
};

// Question Sets
export const fetchQuestionSetsFromFirestore = async (
  category?: InstitutionCategory
): Promise<QuestionSet[]> => {
  try {
    const colRef = collection(db, 'questionSets');
    const snap = await getDocs(query(colRef, limit(30)));
    if (!snap.empty) {
      let results = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title || 'Academic Question Set',
          category: data.category || 'University',
          questions: data.questions || [],
          isRandomized: data.isRandomized || false,
        } as QuestionSet;
      });

      if (category) {
        results = results.filter(qs => qs.category === category);
      }
      return results;
    }
    return [];
  } catch (err) {
    console.warn('Error fetching question sets:', err);
    return [];
  }
};

export const saveQuestionSetToFirestore = async (
  data: Partial<QuestionSet>,
  adminUid: string = 'admin_sys',
  adminName: string = 'Admin'
): Promise<QuestionSet> => {
  const qsetId = data.id || `qset_${data.category || 'univ'}_${Date.now()}`;
  const qsetRef = doc(db, 'questionSets', qsetId);

  const payload: any = {
    id: qsetId,
    title: data.title || 'Academic Competition Question Set',
    category: data.category || 'University',
    questions: data.questions || [],
    isRandomized: data.isRandomized || false,
    updatedAt: serverTimestamp(),
  };

  await setDoc(qsetRef, payload, { merge: true });

  await logAdminAuditAction(adminUid, adminName, 'SAVE_QUESTION_SET', qsetId, {
    title: payload.title,
    questionsCount: payload.questions.length,
  });

  return { ...payload, id: qsetId } as QuestionSet;
};

// ==========================================
// REALTIME LIVE MATCH SYNCHRONIZATION ENGINE
// ==========================================

// Subscribe to Live Match state changes in real time
export const subscribeToLiveMatch = (
  fixtureId: string,
  callback: (matchState: LiveMatchState | null) => void
) => {
  const liveRef = doc(db, 'liveMatches', fixtureId);
  return onSnapshot(liveRef, docSnap => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      callback({
        fixtureId: docSnap.id,
        seasonId: data.seasonId || '',
        category: data.category || 'University',
        matchRoomId: data.matchRoomId || docSnap.id,
        status: data.status || 'scheduled',
        currentQuestionIndex: data.currentQuestionIndex || 0,
        totalQuestions: data.totalQuestions || 10,
        currentQuestion: data.currentQuestion || null,
        questionStartedAt: data.questionStartedAt || Date.now(),
        questionEndsAt: data.questionEndsAt || Date.now() + 20000,
        homeInstId: data.homeInstId || '',
        homeInst: data.homeInst || '',
        homeLogo: data.homeLogo || '🏫',
        homeRepId: data.homeRepId || '',
        homeRepName: data.homeRepName || '',
        awayInstId: data.awayInstId || '',
        awayInst: data.awayInst || '',
        awayLogo: data.awayLogo || '🎓',
        awayRepId: data.awayRepId || '',
        awayRepName: data.awayRepName || '',
        scoreA: data.scoreA || 0,
        scoreB: data.scoreB || 0,
        audienceCount: data.audienceCount || 1,
        currentAnswerWindowOpen: data.currentAnswerWindowOpen ?? true,
        answers: data.answers || {},
        lastAnswerResult: data.lastAnswerResult || undefined,
        questionOrder: data.questionOrder || [],
        isPaused: data.isPaused || false,
        pausedRemainingMs: data.pausedRemainingMs || undefined,
        winnerId: data.winnerId || undefined,
        winnerName: data.winnerName || undefined,
        isDraw: data.isDraw || false,
      } as LiveMatchState);
    } else {
      callback(null);
    }
  }, err => {
    console.warn('Live match subscription error:', err);
    callback(null);
  });
};

// Start Live Match Lobby
export const startLiveMatchLobby = async (fixtureId: string) => {
  const fixRef = doc(db, 'fixtures', fixtureId);
  const fixSnap = await getDoc(fixRef);
  if (!fixSnap.exists()) return;

  const fixtureData = fixSnap.data();
  const liveRef = doc(db, 'liveMatches', fixtureId);

  const initialRoomState: Partial<LiveMatchState> = {
    fixtureId,
    seasonId: fixtureData.seasonId || '',
    category: fixtureData.category || 'University',
    matchRoomId: fixtureData.matchRoomId || fixtureId,
    status: 'lobby',
    currentQuestionIndex: 0,
    totalQuestions: 10,
    currentQuestion: null,
    questionStartedAt: Date.now(),
    questionEndsAt: Date.now() + 60000, // 60s lobby countdown
    homeInstId: fixtureData.homeInstId || '',
    homeInst: fixtureData.homeInst || '',
    homeLogo: fixtureData.homeLogo || '🏫',
    homeRepId: fixtureData.homeRepId || '',
    homeRepName: fixtureData.homeRep || '',
    awayInstId: fixtureData.awayInstId || '',
    awayInst: fixtureData.awayInst || '',
    awayLogo: fixtureData.awayLogo || '🎓',
    awayRepId: fixtureData.awayRepId || '',
    awayRepName: fixtureData.awayRep || '',
    scoreA: 0,
    scoreB: 0,
    audienceCount: 1,
    currentAnswerWindowOpen: false,
    answers: {},
    isPaused: false,
  };

  await setDoc(liveRef, { ...initialRoomState, updatedAt: serverTimestamp() }, { merge: true });
  await updateDoc(fixRef, { status: 'Lobby', updatedAt: serverTimestamp() });
};

// Start Live Match (Official Kick-Off)
export const startLiveMatch = async (
  fixtureId: string,
  questionSetId?: string,
  isRandomized: boolean = false
) => {
  const fixRef = doc(db, 'fixtures', fixtureId);
  const fixSnap = await getDoc(fixRef);
  if (!fixSnap.exists()) return;

  const fixtureData = fixSnap.data();
  const qsetId = questionSetId || fixtureData.questionSetId;

  let questions: QuestionItem[] = [];
  if (qsetId) {
    const qsetSnap = await getDoc(doc(db, 'questionSets', qsetId));
    if (qsetSnap.exists()) {
      questions = qsetSnap.data().questions || [];
    }
  }

  // Fallback questions if none configured
  if (questions.length === 0) {
    questions = [
      {
        id: 'q1',
        question: 'Which fundamental law states that energy cannot be created or destroyed, only transformed?',
        options: ['Newton Second Law', 'First Law of Thermodynamics', 'Heisenberg Uncertainty Principle', 'Law of Conservation of Mass'],
        correctOptionIndex: 1,
        timeLimitSeconds: 20,
        points: 10,
        topic: 'Physics',
      },
      {
        id: 'q2',
        question: 'What is the primary function of Mitochondria in eukaryotic cells?',
        options: ['Protein Synthesis', 'ATP Synthesis (Powerhouse)', 'DNA Replication', 'Lipid Storage'],
        correctOptionIndex: 1,
        timeLimitSeconds: 20,
        points: 10,
        topic: 'Biochemistry',
      },
      {
        id: 'q3',
        question: 'In computer science, what is the worst-case time complexity of QuickSort?',
        options: ['O(n log n)', 'O(n)', 'O(n²)', 'O(1)'],
        correctOptionIndex: 2,
        timeLimitSeconds: 20,
        points: 15,
        topic: 'Computer Science',
      },
      {
        id: 'q4',
        question: 'Which economic model assumes perfect information, rational agents, and zero transaction costs?',
        options: ['Keynesian Economics', 'Classical Perfect Competition', 'Behavioral Economics', 'Monetarism'],
        correctOptionIndex: 1,
        timeLimitSeconds: 20,
        points: 15,
        topic: 'Economics',
      },
    ];
  }

  if (isRandomized) {
    questions = [...questions].sort(() => Math.random() - 0.5);
  }

  const firstQuestion = questions[0];
  const timeLimitMs = (firstQuestion.timeLimitSeconds || 20) * 1000;
  const now = Date.now();

  const liveState: LiveMatchState = {
    fixtureId,
    seasonId: fixtureData.seasonId || '',
    category: fixtureData.category || 'University',
    matchRoomId: fixtureData.matchRoomId || fixtureId,
    status: 'live',
    currentQuestionIndex: 0,
    totalQuestions: questions.length,
    currentQuestion: firstQuestion,
    questionStartedAt: now,
    questionEndsAt: now + timeLimitMs,
    homeInstId: fixtureData.homeInstId || '',
    homeInst: fixtureData.homeInst || '',
    homeLogo: fixtureData.homeLogo || '🏫',
    homeRepId: fixtureData.homeRepId || '',
    homeRepName: fixtureData.homeRep || '',
    awayInstId: fixtureData.awayInstId || '',
    awayInst: fixtureData.awayInst || '',
    awayLogo: fixtureData.awayLogo || '🎓',
    awayRepId: fixtureData.awayRepId || '',
    awayRepName: fixtureData.awayRep || '',
    scoreA: 0,
    scoreB: 0,
    audienceCount: 1,
    currentAnswerWindowOpen: true,
    answers: {},
    questionOrder: questions,
    isPaused: false,
  };

  const liveRef = doc(db, 'liveMatches', fixtureId);
  await setDoc(liveRef, { ...liveState, updatedAt: serverTimestamp() }, { merge: true });
  await updateDoc(fixRef, {
    status: 'Live',
    currentQuestionIndex: 0,
    homeScore: 0,
    awayScore: 0,
    isPaused: false,
    updatedAt: serverTimestamp(),
  });
};

// Submit Representative Answer
export const submitRepresentativeAnswerInFirestore = async (
  fixtureId: string,
  userId: string,
  repName: string,
  institutionId: string,
  answerText: string,
  optionIndex?: number
) => {
  const liveRef = doc(db, 'liveMatches', fixtureId);
  const liveSnap = await getDoc(liveRef);
  if (!liveSnap.exists()) return;

  const state = liveSnap.data() as LiveMatchState;
  if (!state.currentAnswerWindowOpen || state.status !== 'live') {
    throw new Error('Answer window is currently closed.');
  }

  const currentQ = state.currentQuestion;
  if (!currentQ) return;

  const isHome = institutionId === state.homeInstId || userId === state.homeRepId;
  const isAway = institutionId === state.awayInstId || userId === state.awayRepId;

  if (!isHome && !isAway) {
    throw new Error('Only registered representatives for this fixture can submit official answers.');
  }

  let isCorrect = false;
  if (optionIndex !== undefined && currentQ.correctOptionIndex !== undefined) {
    isCorrect = optionIndex === currentQ.correctOptionIndex;
  } else if (currentQ.correctAnswer) {
    isCorrect = String(answerText).trim().toLowerCase() === String(currentQ.correctAnswer).trim().toLowerCase();
  }

  const pointsAwarded = isCorrect ? (currentQ.points || 10) : 0;

  const newAnswers = { ...state.answers };
  newAnswers[userId] = {
    fixtureId,
    seasonId: state.seasonId,
    questionId: currentQ.id,
    representativeId: userId,
    representativeName: repName,
    institutionId,
    institutionName: isHome ? state.homeInst : state.awayInst,
    answerText,
    optionIndex,
    submittedAt: Date.now(),
    isCorrect,
    pointsAwarded,
  };

  let newScoreA = state.scoreA;
  let newScoreB = state.scoreB;

  if (isHome && isCorrect) {
    newScoreA += pointsAwarded;
  } else if (isAway && isCorrect) {
    newScoreB += pointsAwarded;
  }

  await updateDoc(liveRef, {
    answers: newAnswers,
    scoreA: newScoreA,
    scoreB: newScoreB,
    updatedAt: serverTimestamp(),
  });

  const fixRef = doc(db, 'fixtures', fixtureId);
  await updateDoc(fixRef, {
    homeScore: newScoreA,
    awayScore: newScoreB,
    updatedAt: serverTimestamp(),
  });
};

// Advance to Next Question
export const advanceLiveMatchQuestion = async (fixtureId: string) => {
  const liveRef = doc(db, 'liveMatches', fixtureId);
  const liveSnap = await getDoc(liveRef);
  if (!liveSnap.exists()) return;

  const state = liveSnap.data() as LiveMatchState;
  const questions = state.questionOrder || [];
  const nextIndex = state.currentQuestionIndex + 1;

  if (nextIndex >= questions.length) {
    await completeLiveMatch(fixtureId);
    return;
  }

  const nextQuestion = questions[nextIndex];
  const timeLimitMs = (nextQuestion.timeLimitSeconds || 20) * 1000;
  const now = Date.now();

  await updateDoc(liveRef, {
    currentQuestionIndex: nextIndex,
    currentQuestion: nextQuestion,
    questionStartedAt: now,
    questionEndsAt: now + timeLimitMs,
    currentAnswerWindowOpen: true,
    answers: {},
    isPaused: false,
    updatedAt: serverTimestamp(),
  });

  const fixRef = doc(db, 'fixtures', fixtureId);
  await updateDoc(fixRef, {
    currentQuestionIndex: nextIndex,
    updatedAt: serverTimestamp(),
  });
};

// Pause / Resume Live Match
export const pauseLiveMatchInFirestore = async (fixtureId: string, isPaused: boolean) => {
  const liveRef = doc(db, 'liveMatches', fixtureId);
  const liveSnap = await getDoc(liveRef);
  if (!liveSnap.exists()) return;

  const state = liveSnap.data() as LiveMatchState;
  const now = Date.now();

  if (isPaused) {
    const remainingMs = Math.max(0, state.questionEndsAt - now);
    await updateDoc(liveRef, {
      isPaused: true,
      status: 'paused',
      pausedRemainingMs: remainingMs,
      currentAnswerWindowOpen: false,
      updatedAt: serverTimestamp(),
    });
  } else {
    const remainingMs = state.pausedRemainingMs || 10000;
    await updateDoc(liveRef, {
      isPaused: false,
      status: 'live',
      questionStartedAt: now,
      questionEndsAt: now + remainingMs,
      currentAnswerWindowOpen: true,
      pausedRemainingMs: null,
      updatedAt: serverTimestamp(),
    });
  }

  const fixRef = doc(db, 'fixtures', fixtureId);
  await updateDoc(fixRef, { isPaused, updatedAt: serverTimestamp() });
};

// Complete Live Match & Automatically Update Standings
export const completeLiveMatch = async (fixtureId: string) => {
  const liveRef = doc(db, 'liveMatches', fixtureId);
  const liveSnap = await getDoc(liveRef);
  if (!liveSnap.exists()) return;

  const state = liveSnap.data() as LiveMatchState;
  const isDraw = state.scoreA === state.scoreB;
  let winnerId = '';
  let winnerName = 'Draw';

  if (state.scoreA > state.scoreB) {
    winnerId = state.homeInstId;
    winnerName = state.homeInst;
  } else if (state.scoreB > state.scoreA) {
    winnerId = state.awayInstId;
    winnerName = state.awayInst;
  }

  await updateDoc(liveRef, {
    status: 'completed',
    currentAnswerWindowOpen: false,
    winnerId,
    winnerName,
    isDraw,
    updatedAt: serverTimestamp(),
  });

  const fixRef = doc(db, 'fixtures', fixtureId);
  await updateDoc(fixRef, {
    status: 'Completed',
    homeScore: state.scoreA,
    awayScore: state.scoreB,
    winnerId,
    winnerName,
    updatedAt: serverTimestamp(),
  });

  // Save Match Result Record
  const resultId = `res_${fixtureId}`;
  const resultRef = doc(db, 'matchResults', resultId);
  const resultRecord: MatchResultRecord = {
    id: resultId,
    resultId,
    fixtureId,
    seasonId: state.seasonId,
    category: state.category,
    roundSession: 'Completed Match',
    homeInstId: state.homeInstId,
    homeInst: state.homeInst,
    homeLogo: state.homeLogo,
    homeRepName: state.homeRepName || 'Representative A',
    awayInstId: state.awayInstId,
    awayInst: state.awayInst,
    awayLogo: state.awayLogo,
    awayRepName: state.awayRepName || 'Representative B',
    scoreA: state.scoreA,
    scoreB: state.scoreB,
    winnerId,
    winnerName,
    isDraw,
    completedAt: new Date().toISOString(),
    durationSeconds: Math.floor((Date.now() - state.questionStartedAt) / 1000),
    totalQuestions: state.totalQuestions,
    correctAnswersA: Math.floor(state.scoreA / 10),
    correctAnswersB: Math.floor(state.scoreB / 10),
  };

  await setDoc(resultRef, { ...resultRecord, createdAt: serverTimestamp() }, { merge: true });

  // AUTOMATICALLY UPDATE SEASON STANDINGS
  if (state.seasonId) {
    await updateSeasonStandingsAfterMatch(state.seasonId, state.homeInstId, state.awayInstId, state.scoreA, state.scoreB);
  }
};

// Update Season Standings After Match
export const updateSeasonStandingsAfterMatch = async (
  seasonId: string,
  homeInstId: string,
  awayInstId: string,
  scoreA: number,
  scoreB: number
) => {
  try {
    const standings = await fetchStandingsFromFirestore(seasonId);
    let homeStanding = standings.find(s => s.institutionId === homeInstId);
    let awayStanding = standings.find(s => s.institutionId === awayInstId);

    const batch = writeBatch(db);

    if (homeStanding) {
      const isWin = scoreA > scoreB;
      const isLoss = scoreA < scoreB;
      const isDraw = scoreA === scoreB;

      const updated = {
        played: homeStanding.played + 1,
        wins: homeStanding.wins + (isWin ? 1 : 0),
        losses: homeStanding.losses + (isLoss ? 1 : 0),
        points: homeStanding.points + (isWin ? 3 : isDraw ? 1 : 0),
        scoreFor: homeStanding.scoreFor + scoreA,
        scoreAgainst: homeStanding.scoreAgainst + scoreB,
        scoreDifference: homeStanding.scoreDifference + (scoreA - scoreB),
        updatedAt: serverTimestamp(),
      };

      const ref = doc(db, 'standings', homeStanding.id);
      batch.update(ref, updated);
    }

    if (awayStanding) {
      const isWin = scoreB > scoreA;
      const isLoss = scoreB < scoreA;
      const isDraw = scoreA === scoreB;

      const updated = {
        played: awayStanding.played + 1,
        wins: awayStanding.wins + (isWin ? 1 : 0),
        losses: awayStanding.losses + (isLoss ? 1 : 0),
        points: awayStanding.points + (isWin ? 3 : isDraw ? 1 : 0),
        scoreFor: awayStanding.scoreFor + scoreB,
        scoreAgainst: awayStanding.scoreAgainst + scoreA,
        scoreDifference: awayStanding.scoreDifference + (scoreB - scoreA),
        updatedAt: serverTimestamp(),
      };

      const ref = doc(db, 'standings', awayStanding.id);
      batch.update(ref, updated);
    }

    await batch.commit();
  } catch (err) {
    console.warn('Error updating standings after match:', err);
  }
};

// ==========================================
// STEP 11: GUS (GROBAAX ULTIMATE SEARCH) COMPETITION ENGINE
// ==========================================

// Fetch All GUS Seasons from Firestore
export const fetchGusSeasonsFromFirestore = async (): Promise<GusSeason[]> => {
  try {
    const colRef = collection(db, 'gusSeasons');
    const snap = await getDocs(query(colRef, limit(20)));
    if (!snap.empty) {
      return snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title || 'GUS Season 1 — Ultimate Search',
          status: data.status || 'Registration Open',
          registrationStartDate: data.registrationStartDate || '2026-08-01',
          registrationEndDate: data.registrationEndDate || '2026-08-20',
          competitionStartDate: data.competitionStartDate || '2026-08-21',
          competitionEndDate: data.competitionEndDate || '2026-08-25',
          prizePoolGP: data.prizePoolGP || 1000000,
          rules: data.rules || [
            'All registered Grobaax users are eligible.',
            'Each participant gets one attempt per seasonal question.',
            'Incorrect answer or time expiry results in immediate elimination.',
            'Final surviving participants share or claim top GP prize pool tiers.',
          ],
          registeredParticipantIds: data.registeredParticipantIds || [],
          activeParticipantIds: data.activeParticipantIds || [],
          eliminatedParticipantIds: data.eliminatedParticipantIds || [],
          currentRoundIndex: data.currentRoundIndex || 0,
          currentQuestionIndex: data.currentQuestionIndex || 0,
          rounds: data.rounds || [
            {
              id: 'r1',
              roundNumber: 1,
              title: 'Round 1 — Global General Screening',
              status: 'Ready',
              timePerQuestionSeconds: 15,
              questions: [
                {
                  id: 'gq1',
                  question: 'Which fundamental law states that energy cannot be created or destroyed, only transformed?',
                  options: ['Newton Second Law', 'First Law of Thermodynamics', 'Heisenberg Uncertainty Principle', 'Law of Conservation of Mass'],
                  correctOptionIndex: 1,
                  timeLimitSeconds: 15,
                  points: 10,
                  topic: 'Physics',
                },
                {
                  id: 'gq2',
                  question: 'What is the primary function of Mitochondria in eukaryotic cells?',
                  options: ['Protein Synthesis', 'ATP Synthesis (Powerhouse)', 'DNA Replication', 'Lipid Storage'],
                  correctOptionIndex: 1,
                  timeLimitSeconds: 15,
                  points: 10,
                  topic: 'Biochemistry',
                },
                {
                  id: 'gq3',
                  question: 'In computer science, what is the worst-case time complexity of QuickSort?',
                  options: ['O(n log n)', 'O(n)', 'O(n²)', 'O(1)'],
                  correctOptionIndex: 2,
                  timeLimitSeconds: 15,
                  points: 15,
                  topic: 'Computer Science',
                },
              ],
            },
            {
              id: 'r2',
              roundNumber: 2,
              title: 'Round 2 — Multi-Disciplinary Challenge',
              status: 'Draft',
              timePerQuestionSeconds: 15,
              questions: [
                {
                  id: 'gq4',
                  question: 'Which economic model assumes perfect information, rational agents, and zero transaction costs?',
                  options: ['Keynesian Economics', 'Classical Perfect Competition', 'Behavioral Economics', 'Monetarism'],
                  correctOptionIndex: 1,
                  timeLimitSeconds: 15,
                  points: 15,
                  topic: 'Economics',
                },
              ],
            },
          ],
          prizes: data.prizes || [
            { id: 'p1', position: 1, positionTitle: '1st Place — Grand GUS Champion', gpReward: 500000, description: 'Ultimate Scholar Trophy & 500k GP', active: true },
            { id: 'p2', position: 2, positionTitle: '2nd Place — Runner Up', gpReward: 250000, description: 'Silver Scholar Honors & 250k GP', active: true },
            { id: 'p3', position: 3, positionTitle: '3rd Place — Bronze Medalist', gpReward: 100000, description: 'Bronze Scholar Honors & 100k GP', active: true },
          ],
          winners: data.winners || [],
        } as GusSeason;
      });
    }
    return [];
  } catch (err) {
    console.warn('Error fetching GUS seasons:', err);
    return [];
  }
};

// Save or Update GUS Season
export const saveGusSeasonToFirestore = async (
  seasonData: Partial<GusSeason>,
  adminUid: string = 'admin_sys',
  adminName: string = 'Admin'
): Promise<GusSeason> => {
  const seasonId = seasonData.id || `gus_s_${Date.now()}`;
  const seasonRef = doc(db, 'gusSeasons', seasonId);

  const payload: any = {
    id: seasonId,
    title: seasonData.title || 'GUS Season 1 — Ultimate Search',
    status: seasonData.status || 'Registration Open',
    registrationStartDate: seasonData.registrationStartDate || '2026-08-01',
    registrationEndDate: seasonData.registrationEndDate || '2026-08-20',
    competitionStartDate: seasonData.competitionStartDate || '2026-08-21',
    competitionEndDate: seasonData.competitionEndDate || '2026-08-25',
    prizePoolGP: seasonData.prizePoolGP || 1000000,
    rules: seasonData.rules || [
      'All registered Grobaax users are eligible.',
      'Each participant gets one attempt per seasonal question.',
      'Incorrect answer or time expiry results in immediate elimination.',
      'Final surviving participants share or claim top GP prize pool tiers.',
    ],
    registeredParticipantIds: seasonData.registeredParticipantIds || [],
    activeParticipantIds: seasonData.activeParticipantIds || [],
    eliminatedParticipantIds: seasonData.eliminatedParticipantIds || [],
    currentRoundIndex: seasonData.currentRoundIndex || 0,
    currentQuestionIndex: seasonData.currentQuestionIndex || 0,
    rounds: seasonData.rounds || [],
    prizes: seasonData.prizes || [],
    winners: seasonData.winners || [],
    updatedAt: serverTimestamp(),
  };

  await setDoc(seasonRef, payload, { merge: true });

  await logAdminAuditAction(adminUid, adminName, 'SAVE_GUS_SEASON', seasonId, {
    title: payload.title,
    status: payload.status,
    prizePoolGP: payload.prizePoolGP,
  });

  return { ...payload, id: seasonId } as GusSeason;
};

// Stop GUS Season in Firestore
export const stopGusSeasonInFirestore = async (
  seasonId: string,
  seasonTitle?: string,
  adminUid: string = 'admin_sys',
  adminName: string = 'Admin'
) => {
  try {
    const seasonRef = doc(db, 'gusSeasons', seasonId);
    await updateDoc(seasonRef, {
      status: 'Completed',
      isLiveActive: false,
      stoppedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const liveRef = doc(db, 'gusLive', seasonId);
    try {
      await updateDoc(liveRef, { status: 'completed', currentAnswerWindowOpen: false, updatedAt: serverTimestamp() });
    } catch (e) {}

    await logAdminAuditAction(adminUid, adminName, 'STOP_GUS_SEASON', seasonId, {
      title: seasonTitle || seasonId,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `gusSeasons/${seasonId}`);
    throw err;
  }
};

// Delete GUS Season from Firestore
export const deleteGusSeasonFromFirestore = async (
  seasonId: string,
  seasonTitle?: string,
  adminUid: string = 'admin_sys',
  adminName: string = 'Admin'
) => {
  try {
    await deleteDoc(doc(db, 'gusSeasons', seasonId));
    try {
      await deleteDoc(doc(db, 'gusLive', seasonId));
    } catch (e) {}

    await logAdminAuditAction(adminUid, adminName, 'DELETE_GUS_SEASON', seasonId, {
      title: seasonTitle || seasonId,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `gusSeasons/${seasonId}`);
    throw err;
  }
};

// Delete Community Post from Firestore
export const deleteCommunityPostFromFirestore = async (
  postId: string,
  postSnippet?: string,
  adminUid: string = 'admin_sys',
  adminName: string = 'Admin'
) => {
  try {
    await deleteDoc(doc(db, 'posts', postId));
    await logAdminAuditAction(adminUid, adminName, 'DELETE_COMMUNITY_POST', postId, {
      contentSnippet: (postSnippet || '').substring(0, 100),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `posts/${postId}`);
    throw err;
  }
};

// Delete Question Set from Firestore
export const deleteQuestionSetFromFirestore = async (
  qsetId: string,
  title?: string,
  adminUid: string = 'admin_sys',
  adminName: string = 'Admin'
) => {
  try {
    await deleteDoc(doc(db, 'questionSets', qsetId));
    await logAdminAuditAction(adminUid, adminName, 'DELETE_QUESTION_SET', qsetId, {
      title: title || qsetId,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `questionSets/${qsetId}`);
    throw err;
  }
};

// Delete Data File from Firestore
export const deleteDataFileFromFirestore = async (
  fileId: string,
  fileName?: string,
  adminUid: string = 'admin_sys',
  adminName: string = 'Admin'
) => {
  try {
    await deleteDoc(doc(db, 'dataFiles', fileId));
    try {
      await deleteDoc(doc(db, 'curriculumData', fileId));
    } catch (e) {}

    await logAdminAuditAction(adminUid, adminName, 'DELETE_DATA_FILE', fileId, {
      fileName: fileName || fileId,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `dataFiles/${fileId}`);
    throw err;
  }
};

// Backend Verification: User Registration for GUS Season
export const registerUserForGusSeasonInFirestore = async (
  seasonId: string,
  user: { id: string; name: string; avatar?: string; institution: string; department?: string }
): Promise<GusParticipantRecord> => {
  const regId = `gus_reg_${seasonId}_${user.id}`;
  const regRef = doc(db, 'gusRegistrations', regId);
  const regSnap = await getDoc(regRef);

  if (regSnap.exists()) {
    throw new Error('User is already registered for this GUS Season.');
  }

  const seasonRef = doc(db, 'gusSeasons', seasonId);
  const seasonSnap = await getDoc(seasonRef);
  if (!seasonSnap.exists()) {
    throw new Error('Specified GUS Season does not exist.');
  }

  const seasonData = seasonSnap.data();

  const participantRecord: GusParticipantRecord = {
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar || '🎓',
    institution: user.institution || 'Grobaax Academy',
    department: user.department || 'General Studies',
    registrationStatus: 'REGISTERED',
    status: 'ACTIVE',
    currentRound: 1,
    currentQuestion: 1,
    questionsCompleted: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    registeredAt: new Date().toISOString(),
  };

  // Save Registration Doc
  await setDoc(regRef, {
    ...participantRecord,
    id: regId,
    seasonId,
    createdAt: serverTimestamp(),
  });

  // Save Participant Doc
  const partRef = doc(db, 'gusParticipants', `${seasonId}_${user.id}`);
  await setDoc(partRef, {
    ...participantRecord,
    id: `${seasonId}_${user.id}`,
    seasonId,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  // Update registered list in Season document
  const currentRegIds: string[] = seasonData.registeredParticipantIds || [];
  if (!currentRegIds.includes(user.id)) {
    currentRegIds.push(user.id);
    await updateDoc(seasonRef, {
      registeredParticipantIds: currentRegIds,
      activeParticipantIds: arrayUnion(user.id),
      updatedAt: serverTimestamp(),
    });
  }

  return participantRecord;
};

// Check if User is Registered for GUS Season
export const checkUserGusRegistrationInFirestore = async (
  seasonId: string,
  userId: string
): Promise<GusParticipantRecord | null> => {
  try {
    const regRef = doc(db, 'gusRegistrations', `gus_reg_${seasonId}_${userId}`);
    const regSnap = await getDoc(regRef);
    if (regSnap.exists()) {
      return regSnap.data() as GusParticipantRecord;
    }
    return null;
  } catch (err) {
    console.warn('Error checking GUS registration:', err);
    return null;
  }
};

// Realtime Live GUS Match Engine Subscription
export const subscribeToGusLive = (
  seasonId: string,
  callback: (liveData: any | null) => void
) => {
  const gusLiveRef = doc(db, 'gusLive', seasonId);
  return onSnapshot(gusLiveRef, docSnap => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      callback({
        seasonId: docSnap.id,
        status: data.status || 'registration_open',
        currentRoundIndex: data.currentRoundIndex || 0,
        currentQuestionIndex: data.currentQuestionIndex || 0,
        currentQuestion: data.currentQuestion || null,
        questionStartedAt: data.questionStartedAt || Date.now(),
        questionEndsAt: data.questionEndsAt || Date.now() + 15000,
        activeParticipantCount: data.activeParticipantCount || 100,
        eliminatedCount: data.eliminatedCount || 0,
        isPaused: data.isPaused || false,
        pausedRemainingMs: data.pausedRemainingMs || undefined,
        currentAnswerWindowOpen: data.currentAnswerWindowOpen ?? true,
      });
    } else {
      callback(null);
    }
  }, err => {
    console.warn('GUS Live subscription notice:', err);
    callback(null);
  });
};

// Start GUS Live Competition
export const startGusLiveCompetitionInFirestore = async (
  seasonId: string,
  adminUid: string = 'admin_sys',
  adminName: string = 'Admin'
) => {
  const seasonRef = doc(db, 'gusSeasons', seasonId);
  const seasonSnap = await getDoc(seasonRef);
  if (!seasonSnap.exists()) return;

  const seasonData = seasonSnap.data() as GusSeason;
  const firstRound = seasonData.rounds[0];
  const firstQuestion = firstRound?.questions[0];

  const timeLimitMs = ((firstQuestion?.timeLimitSeconds || firstRound?.timePerQuestionSeconds || 15)) * 1000;
  const now = Date.now();

  const liveState = {
    seasonId,
    status: 'live',
    currentRoundIndex: 0,
    currentQuestionIndex: 0,
    currentQuestion: firstQuestion || null,
    questionStartedAt: now,
    questionEndsAt: now + timeLimitMs,
    activeParticipantCount: seasonData.registeredParticipantIds.length || 18450,
    eliminatedCount: 0,
    isPaused: false,
    currentAnswerWindowOpen: true,
    updatedAt: serverTimestamp(),
  };

  const gusLiveRef = doc(db, 'gusLive', seasonId);
  await setDoc(gusLiveRef, liveState, { merge: true });
  await updateDoc(seasonRef, { status: 'Live', updatedAt: serverTimestamp() });

  await logAdminAuditAction(adminUid, adminName, 'START_GUS_COMPETITION', seasonId, {
    participants: liveState.activeParticipantCount,
  });
};

// Submit GUS Answer in Firestore & Server Evaluation
export const submitGusAnswerInFirestore = async (
  seasonId: string,
  userId: string,
  userName: string,
  institution: string,
  roundNumber: number,
  questionIndex: number,
  answerText: string,
  optionIndex?: number
): Promise<{ isCorrect: boolean; pointsEarned: number; isEliminated: boolean }> => {
  const gusLiveRef = doc(db, 'gusLive', seasonId);
  const liveSnap = await getDoc(gusLiveRef);
  if (!liveSnap.exists()) {
    throw new Error('GUS Live Session not active.');
  }

  const liveState = liveSnap.data();
  if (liveState.status !== 'live' || !liveState.currentAnswerWindowOpen) {
    throw new Error('Answer window is currently closed.');
  }

  const currentQ = liveState.currentQuestion as QuestionItem;
  if (!currentQ) {
    throw new Error('Active question unavailable.');
  }

  let isCorrect = false;
  if (optionIndex !== undefined && currentQ.correctOptionIndex !== undefined) {
    isCorrect = optionIndex === currentQ.correctOptionIndex;
  } else if (currentQ.correctAnswer) {
    isCorrect = String(answerText).trim().toLowerCase() === String(currentQ.correctAnswer).trim().toLowerCase();
  }

  const pointsEarned = isCorrect ? (currentQ.points || 10) : 0;
  const isEliminated = !isCorrect;

  // Save Answer Document in Firestore
  const answerId = `ans_${seasonId}_r${roundNumber}_q${questionIndex}_${userId}`;
  const ansRef = doc(db, 'gusAnswers', answerId);
  await setDoc(ansRef, {
    id: answerId,
    seasonId,
    userId,
    userName,
    institution,
    roundNumber,
    questionIndex,
    questionId: currentQ.id,
    answerText,
    optionIndex,
    isCorrect,
    pointsEarned,
    isEliminated,
    submittedAt: serverTimestamp(),
  }, { merge: true });

  // Update Participant Status in Firestore
  const partRef = doc(db, 'gusParticipants', `${seasonId}_${userId}`);
  if (isEliminated) {
    await updateDoc(partRef, {
      status: 'ELIMINATED',
      eliminatedAtRound: roundNumber,
      eliminatedAtQuestion: questionIndex + 1,
      eliminationReason: 'Wrong Answer',
      updatedAt: serverTimestamp(),
    }).catch(() => {});

    // Decrease active survivor count on live doc
    await updateDoc(gusLiveRef, {
      activeParticipantCount: increment(-1),
      eliminatedCount: increment(1),
      updatedAt: serverTimestamp(),
    }).catch(() => {});
  } else {
    await updateDoc(partRef, {
      questionsCompleted: increment(1),
      correctAnswers: increment(1),
      updatedAt: serverTimestamp(),
    }).catch(() => {});
  }

  return { isCorrect, pointsEarned, isEliminated };
};

// Idempotent GP Prize Payout
export const awardGusPrizesInFirestore = async (
  seasonId: string,
  adminUid: string = 'admin_sys',
  adminName: string = 'Admin'
): Promise<Array<{ userId: string; gpAwarded: number; status: 'PAID' | 'SKIPPED_ALREADY_PAID' }>> => {
  const seasonRef = doc(db, 'gusSeasons', seasonId);
  const seasonSnap = await getDoc(seasonRef);
  if (!seasonSnap.exists()) {
    throw new Error('GUS Season not found.');
  }

  const seasonData = seasonSnap.data() as GusSeason;
  const winners = seasonData.winners || [];
  if (winners.length === 0) {
    throw new Error('No declared winners configured for this season.');
  }

  const results: Array<{ userId: string; gpAwarded: number; status: 'PAID' | 'SKIPPED_ALREADY_PAID' }> = [];

  for (const winner of winners) {
    const txId = `gus_tx_${seasonId}_${winner.userId}`;
    const txRef = doc(db, 'gusPrizeTransactions', txId);
    const txSnap = await getDoc(txRef);

    if (txSnap.exists()) {
      // Idempotency protection: winner already paid for this season
      results.push({ userId: winner.userId, gpAwarded: winner.gpAwarded, status: 'SKIPPED_ALREADY_PAID' });
      continue;
    }

    // Award GP to User's Wallet in Firestore
    const userRef = doc(db, 'users', winner.userId);
    await updateDoc(userRef, {
      gpBalance: increment(winner.gpAwarded),
      updatedAt: serverTimestamp(),
    }).catch(err => console.warn('User GP increment notice:', err));

    // Record Idempotent Prize Transaction Record
    await setDoc(txRef, {
      transactionId: txId,
      userId: winner.userId,
      userName: winner.userName,
      amount: winner.gpAwarded,
      type: 'GUS_PRIZE',
      competitionId: 'GUS',
      seasonId,
      positionTitle: winner.positionTitle,
      timestamp: serverTimestamp(),
      description: `Official GUS ${seasonData.title} Winner Prize (${winner.positionTitle})`,
    });

    // Write to central walletTransactions collection
    try {
      const dateStr = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      await addDoc(collection(db, 'walletTransactions'), {
        userId: winner.userId,
        userName: winner.userName || 'Scholar',
        type: 'GUS_PRIZE',
        amount: winner.gpAwarded,
        unit: 'GP',
        title: `GUS Prize: ${seasonData.title}`,
        description: `Official Grand University Scholar tournament prize for ${winner.positionTitle}`,
        isCredit: true,
        status: 'completed',
        transactionId: txId,
        date: dateStr,
        createdAt: serverTimestamp(),
      });
    } catch (wtErr) {
      console.warn('Notice: Could not write GUS walletTransaction:', wtErr);
    }

    results.push({ userId: winner.userId, gpAwarded: winner.gpAwarded, status: 'PAID' });
  }

  await logAdminAuditAction(adminUid, adminName, 'AWARD_GUS_PRIZES', seasonId, {
    totalWinners: winners.length,
    payoutSummary: results,
  });

  return results;
};

// Fetch User GUS Competition History
export const fetchGusUserHistoryFromFirestore = async (
  userId: string
): Promise<Array<{ seasonTitle: string; roundReached: number; questionsSurvived: number; finalPosition?: number; prizeEarned: number }>> => {
  try {
    const q = query(collection(db, 'gusParticipants'), where('userId', '==', userId), limit(20));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map(d => {
        const data = d.data();
        return {
          seasonTitle: data.seasonTitle || 'GUS Competition Season',
          roundReached: data.currentRound || 1,
          questionsSurvived: data.correctAnswers || 0,
          finalPosition: data.finalPosition || undefined,
          prizeEarned: data.prizeEarned || 0,
        };
      });
    }
    return [];
  } catch (err) {
    console.warn('Error fetching GUS user history:', err);
    return [];
  }
};

// ==========================================
// NOTIFICATIONS BACKEND MANAGEMENT
// ==========================================

export const DEFAULT_NOTIFICATIONS: NotificationItem[] = [];

export const sendBroadcastNotificationToFirestore = async (
  notifData: {
    title: string;
    message: string;
    type?: NotificationItem['type'];
    targetRole?: string;
    userId?: string;
    targetUserId?: string;
    excludeUserId?: string;
    actionUrl?: string;
  },
  adminUid?: string,
  adminName?: string
): Promise<string> => {
  try {
    const targetUid = notifData.targetUserId || notifData.userId || null;
    const lowerTitle = (notifData.title || '').toLowerCase();
    const lowerMsg = (notifData.message || '').toLowerCase();
    const isPrizeDeposit =
      lowerTitle.includes('prize distributed') ||
      lowerTitle.includes('prize credited') ||
      lowerTitle.includes('champion prize') ||
      lowerTitle.includes('prize split') ||
      lowerMsg.includes('deposited directly into your wallet') ||
      lowerMsg.includes('gp has been deposited') ||
      lowerMsg.includes('deposited into your wallet') ||
      lowerMsg.includes('equal share of') ||
      lowerMsg.includes('equal split of');

    // Prize distribution notifications MUST ONLY be sent to the specific user the GP is credited to!
    if (isPrizeDeposit && !targetUid) {
      console.warn('[Firebase] Blocked broadcast of prize distribution notification without specific target user.');
      return '';
    }

    const docRef = await addDoc(collection(db, 'notifications'), {
      title: notifData.title,
      message: notifData.message,
      type: notifData.type || 'announcement',
      targetRole: notifData.targetRole || 'ALL',
      userId: targetUid,
      targetUserId: targetUid,
      excludeUserId: notifData.excludeUserId || null,
      actionUrl: notifData.actionUrl || '',
      isRead: false,
      senderAdminUid: adminUid || PRIMARY_SUPER_ADMIN_UID,
      senderAdminName: adminName || 'Grobaax Super Admin',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAtMillis: Date.now(),
      createdAt: serverTimestamp(),
    });

    if (adminUid) {
      await logAdminAuditAction(adminUid, adminName || 'Admin', 'DISPATCH_BROADCAST_NOTIFICATION', docRef.id, {
        title: notifData.title,
        type: notifData.type,
      });
    }

    return docRef.id;
  } catch (err) {
    console.error('Error dispatching broadcast notification to Firestore:', err);
    throw err;
  }
};

export const deleteNotificationFromFirestore = async (
  notifId: string,
  adminUid?: string,
  adminName?: string
): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'notifications', notifId));
    if (adminUid) {
      await logAdminAuditAction(adminUid, adminName || 'Admin', 'DELETE_NOTIFICATION', notifId, {});
    }
  } catch (err) {
    console.error('Error deleting notification from Firestore:', err);
    throw err;
  }
};

// ==========================================
// SYSTEM SETTINGS & GP CONVERSION CONFIGURATION
// ==========================================

export const DEFAULT_GP_CONVERSION: GpConversionConfig = {
  gpToFiatRate: 1, // 1 GP = ₦1 NGN
  currencySymbol: '₦',
  currencyCode: 'NGN',
  minimumWithdrawalGP: 1000,
  maximumWithdrawalGP: 500000,
  withdrawalFeeGP: 0,
  rules: [
    'Minimum cash out withdrawal threshold is 1,000 GP.',
    'Official Conversion Rate: 1 GP = ₦1 NGN.',
    'Withdrawal requests are processed directly to your verified Nigerian bank account within 24-48 business hours.',
    'Bank account name must match your verified Grobaax profile details.',
  ],
};

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  platformName: 'Grobaax Academic Competition Platform',
  maintenanceMode: false,
  allowNewRegistrations: true,
  publicLeagueVisibility: true,
  defaultFreeGpOnRegister: 500,
  minWithdrawalAmountGp: 1000,
  maxDailyWithdrawalGp: 100000,
  gpToFiatRate: 1,
  autoApproveInstitutions: true,
  requireStudentVerification: false,
  defaultQuestionTimeSeconds: 15,
  defaultPenaltyPerMistakeSeconds: 5,
  speedClockGraceSeconds: 3,
  enableLiveCommunityFeed: true,
  enableGusRegistration: true,
  announcementBannerText: '',
  announcementBannerActive: false,
};

export const fetchSystemSettingsFromFirestore = async (): Promise<SystemSettings> => {
  try {
    const docSnap = await getDoc(doc(db, 'system_settings', 'config'));
    if (docSnap.exists()) {
      return { ...DEFAULT_SYSTEM_SETTINGS, ...docSnap.data() } as SystemSettings;
    }
  } catch (err) {
    console.warn('System settings document fetch notice:', err);
  }
  return DEFAULT_SYSTEM_SETTINGS;
};

export const saveSystemSettingsToFirestore = async (
  settings: Partial<SystemSettings>,
  adminUid?: string,
  adminName?: string
): Promise<void> => {
  try {
    await setDoc(
      doc(db, 'system_settings', 'config'),
      {
        ...settings,
        updatedAt: new Date().toISOString(),
        updatedByUid: adminUid || PRIMARY_SUPER_ADMIN_UID,
      },
      { merge: true }
    );

    // Sync minWithdrawalAmountGp and gpToFiatRate to gp_conversion config
    if (typeof settings.minWithdrawalAmountGp === 'number' || typeof settings.gpToFiatRate === 'number') {
      await setDoc(
        doc(db, 'system_settings', 'gp_conversion'),
        {
          ...(typeof settings.minWithdrawalAmountGp === 'number' ? { minimumWithdrawalGP: settings.minWithdrawalAmountGp } : {}),
          ...(typeof settings.gpToFiatRate === 'number' ? { gpToFiatRate: settings.gpToFiatRate } : {}),
          updatedAt: new Date().toISOString(),
          updatedByUid: adminUid || PRIMARY_SUPER_ADMIN_UID,
        },
        { merge: true }
      );
    }

    if (adminUid) {
      await logAdminAuditAction(adminUid, adminName || 'Admin', 'UPDATE_SYSTEM_SETTINGS', 'config', settings);
    }
  } catch (err) {
    console.error('Error saving system settings to Firestore:', err);
    throw err;
  }
};

export const fetchGpConversionConfigFromFirestore = async (): Promise<GpConversionConfig> => {
  try {
    const docSnap = await getDoc(doc(db, 'system_settings', 'gp_conversion'));
    if (docSnap.exists()) {
      return { ...DEFAULT_GP_CONVERSION, ...docSnap.data() } as GpConversionConfig;
    }
  } catch (err) {
    console.warn('GP conversion config document fetch notice:', err);
  }
  return DEFAULT_GP_CONVERSION;
};

export const saveGpConversionConfigToFirestore = async (
  config: Partial<GpConversionConfig>,
  adminUid?: string,
  adminName?: string
): Promise<void> => {
  try {
    await setDoc(
      doc(db, 'system_settings', 'gp_conversion'),
      {
        ...config,
        updatedAt: new Date().toISOString(),
        updatedByUid: adminUid || PRIMARY_SUPER_ADMIN_UID,
      },
      { merge: true }
    );

    // Also sync gpToFiatRate and minWithdrawalAmountGp to config
    if (typeof config.gpToFiatRate === 'number' || typeof config.minimumWithdrawalGP === 'number') {
      await setDoc(
        doc(db, 'system_settings', 'config'),
        {
          ...(typeof config.gpToFiatRate === 'number' ? { gpToFiatRate: config.gpToFiatRate } : {}),
          ...(typeof config.minimumWithdrawalGP === 'number' ? { minWithdrawalAmountGp: config.minimumWithdrawalGP } : {}),
          updatedAt: new Date().toISOString(),
          updatedByUid: adminUid || PRIMARY_SUPER_ADMIN_UID,
        },
        { merge: true }
      );
    }

    if (adminUid) {
      await logAdminAuditAction(adminUid, adminName || 'Admin', 'UPDATE_GP_CONVERSION', 'gp_conversion', config);
    }
  } catch (err) {
    console.error('Error saving GP conversion config to Firestore:', err);
    throw err;
  }
};

export const submitWithdrawalRequestInFirestore = async (
  withdrawal: Omit<WithdrawalRecord, 'id'> & { id?: string }
): Promise<string> => {
  try {
    const withdrawalId = withdrawal.id || 'w_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const docRef = doc(db, 'withdrawals', withdrawalId);
    const payload = {
      ...withdrawal,
      id: withdrawalId,
      status: withdrawal.status || 'Pending',
      createdAt: serverTimestamp(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, payload);
    return withdrawalId;
  } catch (err) {
    console.error('Error submitting withdrawal request to Firestore:', err);
    throw err;
  }
};

// ==========================================
// CHATROOM LIVE REAL-TIME FIRESTORE SYNC
// ==========================================

export const sendChatroomMessageToFirestore = async (
  message: ChatroomLiveMessage
): Promise<void> => {
  try {
    // SINGLE REPLY PER QUESTION ENFORCEMENT:
    // If user is replying directly to a live challenge question, verify they haven't already replied/won
    if (message.replyTo?.id && message.type === 'normal' && message.userId !== 'grobax_arbiter') {
      const rawReplyId = message.replyTo.id;
      const strippedQId = rawReplyId.replace(/^msg_q_/, '');

      try {
        let qSnap = await getDoc(doc(db, 'chatroom_live_questions', strippedQId));
        if (!qSnap.exists()) {
          qSnap = await getDoc(doc(db, 'chatroom_live_questions', rawReplyId));
        }

        if (qSnap.exists()) {
          const qData = qSnap.data() as ChatroomLiveQuestion;
          const normName = (message.userName || '')
            .replace(/\s*(💎\s*\|\s*Moderator|🛡️|⭐|👑|⚡).*$/, '')
            .toLowerCase()
            .trim();
          const repliedList = qData.repliedUserIds || [];
          const repliedUsernames = (qData.repliedUsernames || []).map(u => u.toLowerCase().trim());
          const winnersList = qData.selectedWinners || [];

          const hasAlreadyReplied =
            repliedList.includes(message.userId) ||
            winnersList.some(w => w.userId === message.userId) ||
            (normName.length > 0 && repliedUsernames.includes(normName));

          if (hasAlreadyReplied) {
            throw new Error('You have already submitted an answer for this question. Only 1 attempt is allowed per scholar.');
          }
        }
      } catch (err: any) {
        if (err.message && err.message.includes('Only 1 attempt is allowed')) {
          throw err;
        }
        // Non-blocking for other errors
      }
    }

    const msgRef = doc(db, 'chatroom_live_messages', message.id);
    // Deep clone eliminating all undefined values to prevent Firestore rejection
    const cleanMsg = JSON.parse(JSON.stringify(message, (_, v) => (v === undefined ? null : v)));
    const millis = typeof message.timestamp === 'number' ? message.timestamp : Date.now();
    cleanMsg.timestamp = millis;
    cleanMsg.createdAtMillis = millis;
    cleanMsg.createdAt = serverTimestamp();
    cleanMsg.updatedAt = serverTimestamp();
    await setDoc(msgRef, cleanMsg, { merge: true });

    // AUTOMATIC EVALUATOR FOR LIVE CHALLENGES:
    // If this is a normal message from a user (not arbiter/announcement), evaluate against active questions
    if (message.type === 'normal' && message.userId !== 'grobax_arbiter' && message.messageText) {
      evaluateMessageForLiveQuestions(message).catch(e => console.warn('Message evaluation notice:', e));
    }
  } catch (err) {
    console.error('Error saving chatroom live message to Firestore:', err);
    throw err;
  }
};

export const deleteChatroomMessageFromFirestore = async (
  messageId: string
): Promise<void> => {
  try {
    const msgRef = doc(db, 'chatroom_live_messages', messageId);
    await setDoc(msgRef, { isDeleted: true, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    try {
      await deleteDoc(doc(db, 'chatroom_live_messages', messageId));
    } catch (e) {
      console.warn('Error deleting chatroom live message from Firestore:', e);
      throw err;
    }
  }
};

export const reactChatroomMessageInFirestore = async (
  messageId: string,
  emoji: string
): Promise<void> => {
  try {
    const msgRef = doc(db, 'chatroom_live_messages', messageId);
    let fallbackMsg: any = null;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('grobax_chatroom_messages');
        if (stored) {
          const list = JSON.parse(stored);
          if (Array.isArray(list)) {
            fallbackMsg = list.find((m: any) => m.id === messageId);
          }
        }
      } catch {}
    }

    const baseData = fallbackMsg ? { ...fallbackMsg } : {};
    delete baseData.reactions; // Don't overwrite reactions with stale snapshot

    await setDoc(
      msgRef,
      {
        ...baseData,
        reactions: {
          [emoji]: increment(1),
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('chatroom_message_reacted', {
          detail: { messageId, emoji },
        })
      );
    }
  } catch (err) {
    console.warn('Error updating reactions in Firestore:', err);
  }
};

// ==========================================
// DAILY CHAT RESPONSE ALLOWANCE SYSTEM
// ==========================================

export const getTodayLocalDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDailyChatLimitForTier = (
  tierName: 'free' | 'premium' | 'vip' | 'admin'
): number => {
  if (tierName === 'admin') return Infinity;
  if (tierName === 'vip') return 20;
  if (tierName === 'premium') return 15;
  return 2; // Free
};

/**
 * Synchronously retrieves cached daily chat usage from localStorage for instant 0ms UI lock/unlock
 */
export const getSynchronousDailyChatUsage = (
  userId: string,
  dateString?: string
): number => {
  if (!userId || typeof window === 'undefined') return 0;
  const targetDate = dateString || getTodayLocalDateString();

  try {
    // 1. Check primary local daily key
    const localKey = `grobax_daily_qa_${userId}_${targetDate}`;
    const directStored = localStorage.getItem(localKey);
    if (directStored !== null) {
      const parsed = parseInt(directStored, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }

    // 2. Check cached user profile JSON in localStorage
    const profileJson = localStorage.getItem(`grobax_user_profile_${userId}`);
    if (profileJson) {
      const profile = JSON.parse(profileJson);
      if (profile?.dailyQaUsage && profile.dailyQaUsage.date === targetDate) {
        const count = Number(profile.dailyQaUsage.count) || 0;
        try {
          localStorage.setItem(localKey, String(count));
        } catch {}
        return count;
      }
    }

    // 3. Check persistent daily usage map
    const mapJson = localStorage.getItem(`grobax_daily_usage_map_${userId}`);
    if (mapJson) {
      const map = JSON.parse(mapJson);
      if (map && map[targetDate] !== undefined) {
        const count = Number(map[targetDate]) || 0;
        return count;
      }
    }
  } catch {}

  return 0;
};

export const getUserDailyChatUsage = async (
  userId: string,
  dateString?: string
): Promise<{ date: string; count: number; lastSubmittedAt?: number }> => {
  const targetDate = dateString || getTodayLocalDateString();
  if (!userId || userId === 'guest') {
    return { date: targetDate, count: 0 };
  }

  const localKey = `grobax_daily_qa_${userId}_${targetDate}`;
  const syncCount = getSynchronousDailyChatUsage(userId, targetDate);

  try {
    // 1. Try reading directly from Firestore user doc
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.dailyQaUsage && data.dailyQaUsage.date === targetDate) {
        const count = typeof data.dailyQaUsage.count === 'number' ? data.dailyQaUsage.count : 0;
        const resolvedCount = Math.max(count, syncCount);
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem(localKey, String(resolvedCount));
            const profStr = localStorage.getItem(`grobax_user_profile_${userId}`);
            if (profStr) {
              const parsedProf = JSON.parse(profStr);
              parsedProf.dailyQaUsage = {
                date: targetDate,
                count: resolvedCount,
                lastSubmittedAt: data.dailyQaUsage.lastSubmittedAt || Date.now(),
              };
              localStorage.setItem(`grobax_user_profile_${userId}`, JSON.stringify(parsedProf));
            }
          }
        } catch {}
        return { date: targetDate, count: resolvedCount, lastSubmittedAt: data.dailyQaUsage.lastSubmittedAt };
      } else if (data.dailyQaUsage && data.dailyQaUsage.date !== targetDate) {
        // Different date (e.g. yesterday) -> Allowance refreshed for new day
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem(localKey, '0');
          }
        } catch {}
        return { date: targetDate, count: 0 };
      }
    }

    // 2. Also check dedicated daily_chat_responses collection as secondary verification
    const dailyDocRef = doc(db, 'daily_chat_responses', `${userId}_${targetDate}`);
    const dailySnap = await getDoc(dailyDocRef);
    if (dailySnap.exists()) {
      const dData = dailySnap.data();
      const count = typeof dData.count === 'number' ? dData.count : 0;
      const resolvedCount = Math.max(count, syncCount);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(localKey, String(resolvedCount));
        }
      } catch {}
      return { date: targetDate, count: resolvedCount, lastSubmittedAt: dData.lastSubmittedAt };
    }
  } catch (err) {
    console.warn('Notice: Firestore offline or initializing during daily chat usage read:', err);
  }

  // Fallback to local synchronous count
  return { date: targetDate, count: syncCount };
};

export const recordUserDailyChatResponse = async (
  userId: string,
  dateString: string,
  tierName: 'free' | 'premium' | 'vip' | 'admin'
): Promise<{ count: number; allowed: boolean; limit: number; remaining: number }> => {
  const targetDate = dateString || getTodayLocalDateString();
  const limit = getDailyChatLimitForTier(tierName);
  const localKey = `grobax_daily_qa_${userId}_${targetDate}`;

  // 1. Instant Synchronous Pre-flight check to prevent race condition leaks
  const syncCount = getSynchronousDailyChatUsage(userId, targetDate);
  if (tierName !== 'admin' && syncCount >= limit) {
    return {
      count: syncCount,
      allowed: false,
      limit,
      remaining: 0,
    };
  }

  // 2. Read server usage
  const currentUsage = await getUserDailyChatUsage(userId, targetDate);
  const currentCount = currentUsage.date === targetDate ? Math.max(currentUsage.count, syncCount) : 0;

  if (tierName !== 'admin' && currentCount >= limit) {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(localKey, String(currentCount));
      }
    } catch {}
    return {
      count: currentCount,
      allowed: false,
      limit,
      remaining: 0,
    };
  }

  const nextCount = currentCount + 1;
  const nowMillis = Date.now();

  // 1. Update localStorage immediately for 0ms reactivity
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(localKey, String(nextCount));

      // Update profile cache
      const profStr = localStorage.getItem(`grobax_user_profile_${userId}`);
      if (profStr) {
        const parsedProf = JSON.parse(profStr);
        parsedProf.dailyQaUsage = { date: targetDate, count: nextCount, lastSubmittedAt: nowMillis };
        localStorage.setItem(`grobax_user_profile_${userId}`, JSON.stringify(parsedProf));
      }

      // Update persistent map
      const mapKey = `grobax_daily_usage_map_${userId}`;
      const existingMap = localStorage.getItem(mapKey);
      const parsedMap = existingMap ? JSON.parse(existingMap) : {};
      parsedMap[targetDate] = nextCount;
      localStorage.setItem(mapKey, JSON.stringify(parsedMap));
    }
  } catch {}

  // 2. Persist to Firestore: User profile document
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(
      userDocRef,
      {
        dailyQaUsage: {
          date: targetDate,
          count: nextCount,
          lastSubmittedAt: nowMillis,
          tier: tierName,
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (userErr) {
    console.warn('User profile dailyQaUsage write notice:', userErr);
  }

  // 3. Persist to dedicated daily_chat_responses collection
  try {
    const dailyDocRef = doc(db, 'daily_chat_responses', `${userId}_${targetDate}`);
    const recordPayload: DailyChatResponseRecord = {
      id: `${userId}_${targetDate}`,
      userId,
      date: targetDate,
      count: nextCount,
      userTier: tierName,
      lastSubmittedAt: nowMillis,
    };
    await setDoc(
      dailyDocRef,
      {
        ...recordPayload,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (dailyErr) {
    console.warn('daily_chat_responses write notice:', dailyErr);
  }

  const remaining = tierName === 'admin' ? Infinity : Math.max(0, limit - nextCount);

  return {
    count: nextCount,
    allowed: true,
    limit,
    remaining,
  };
};

// ==========================================
// CHATROOM LIVE QUESTIONS & AUTOMATIC REWARD SYSTEM
// ==========================================

export const DEFAULT_CHATROOM_LIVE_SETTINGS: ChatroomLiveSettings = {
  allowFreeUsersToParticipate: true,
  premiumRequiredForRewards: false,
  defaultWinnerCount: 5,
  defaultGpRewardPerWinner: 50,
  defaultTimeLimitSeconds: 300,
  competitionScheduleNotice: 'Daily Q&A Live Challenge — Monday to Friday',
  isChatMuted: false,
  mutedUserIds: [],
};

export const fetchChatroomLiveSettingsFromFirestore = async (): Promise<ChatroomLiveSettings> => {
  try {
    const docSnap = await getDoc(doc(db, 'system_settings', 'chatroom_live'));
    if (docSnap.exists()) {
      return { ...DEFAULT_CHATROOM_LIVE_SETTINGS, ...docSnap.data() } as ChatroomLiveSettings;
    }
  } catch (err) {
    console.warn('Chatroom live settings fetch notice:', err);
  }
  return DEFAULT_CHATROOM_LIVE_SETTINGS;
};

export const saveChatroomLiveSettingsToFirestore = async (
  settings: Partial<ChatroomLiveSettings>,
  adminUid?: string,
  adminName?: string
): Promise<void> => {
  try {
    await setDoc(
      doc(db, 'system_settings', 'chatroom_live'),
      {
        ...settings,
        updatedAt: new Date().toISOString(),
        updatedByUid: adminUid || PRIMARY_SUPER_ADMIN_UID,
      },
      { merge: true }
    );

    if (adminUid) {
      await logAdminAuditAction(adminUid, adminName || 'Admin', 'UPDATE_CHATROOM_LIVE_SETTINGS', 'chatroom_live', settings);
    }
  } catch (err) {
    console.error('Error saving chatroom live settings to Firestore:', err);
    throw err;
  }
};

export const DEFAULT_ULTIMATE_SEARCH_RULES: UltimateSearchRulesData = {
  title: 'Daily GP Grab — Official Rules & Fair Play Guidelines',
  scheduleNotice: 'Competitions are hosted live in this chatroom every Monday through Friday at 7:00 PM (WAT). Questions are published directly by Community Management.',
  generalGuidelines: 'Fast-paced academic typed-answer speed rounds with instant GP wallet rewards. Answer with the exact word, name, or number in the chatbox below as soon as each challenge appears.',
  freeScholarPolicy: 'Free scholars are fully eligible to answer and earn verified correct status (✓). However, instant cash GP reward prizes are exclusive to registered Premium & VIP scholars. Free scholars can upgrade at any time to claim GP rewards.',
  rules: [
    {
      id: 'rule_1',
      title: 'Typed Answers Only',
      description: 'No multiple-choice guess buttons. Type the exact word, name, or number in the chatbox as soon as the question appears. Answers are case-insensitive and alias-tolerant.',
      icon: 'Zap',
    },
    {
      id: 'rule_2',
      title: 'First Eligible Scholars Win GP',
      description: 'The automated Grobaax Arbiter evaluates incoming answers chronologically down to the millisecond. The first eligible Premium or VIP scholars with the correct answer win the set GP bounty.',
      icon: 'Trophy',
    },
    {
      id: 'rule_3',
      title: 'Admin-Configured GP Rewards',
      description: 'Each confirmed winner receives an instant GP reward credited directly to their wallet balance (e.g., +50 GP, +100 GP, +350 GP) as configured by the Admin.',
      icon: 'Crown',
    },
    {
      id: 'rule_4',
      title: '1 Reply Per Question (Strict Anti-Spam)',
      description: 'Scholars cannot spam multiple guesses or post consecutive answers. Each scholar is permitted exactly 1 answer attempt per live question challenge.',
      icon: 'ShieldCheck',
    },
    {
      id: 'rule_5',
      title: 'Countdown Timer & Speed Window',
      description: 'Each challenge has an active countdown timer set by the Admin. Once the timer expires or all winner slots are filled, submissions are locked and the round concludes.',
      icon: 'Clock',
    },
  ],
};

export const fetchUltimateSearchRulesFromFirestore = async (): Promise<UltimateSearchRulesData> => {
  try {
    const docSnap = await getDoc(doc(db, 'system_settings', 'ultimate_search_rules'));
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...DEFAULT_ULTIMATE_SEARCH_RULES,
        ...data,
        rules: Array.isArray(data.rules) && data.rules.length > 0 ? data.rules : DEFAULT_ULTIMATE_SEARCH_RULES.rules,
      } as UltimateSearchRulesData;
    }
  } catch (err) {
    console.warn('Ultimate search rules fetch notice:', err);
  }
  return DEFAULT_ULTIMATE_SEARCH_RULES;
};

export const saveUltimateSearchRulesToFirestore = async (
  rulesData: Partial<UltimateSearchRulesData>,
  adminUid?: string,
  adminName?: string
): Promise<void> => {
  try {
    const payload = {
      ...rulesData,
      updatedAt: new Date().toISOString(),
      updatedByUid: adminUid || PRIMARY_SUPER_ADMIN_UID,
      updatedByName: adminName || 'Admin',
    };

    await setDoc(doc(db, 'system_settings', 'ultimate_search_rules'), payload, { merge: true });

    // Also sync into chatroom_live settings for backward compatibility
    await setDoc(
      doc(db, 'system_settings', 'chatroom_live'),
      {
        ultimateSearchRules: payload,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    if (adminUid) {
      await logAdminAuditAction(
        adminUid,
        adminName || 'Admin',
        'UPDATE_ULTIMATE_SEARCH_RULES',
        'ultimate_search_rules',
        payload
      );
    }
  } catch (err) {
    console.error('Error saving ultimate search rules to Firestore:', err);
    throw err;
  }
};

export const subscribeToUltimateSearchRules = (
  callback: (rules: UltimateSearchRulesData) => void
) => {
  return onSnapshot(
    doc(db, 'system_settings', 'ultimate_search_rules'),
    snapshot => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        callback({
          ...DEFAULT_ULTIMATE_SEARCH_RULES,
          ...data,
          rules: Array.isArray(data.rules) && data.rules.length > 0 ? data.rules : DEFAULT_ULTIMATE_SEARCH_RULES.rules,
        });
      } else {
        callback(DEFAULT_ULTIMATE_SEARCH_RULES);
      }
    },
    error => {
      console.warn('Ultimate search rules subscription notice:', error);
      callback(DEFAULT_ULTIMATE_SEARCH_RULES);
    }
  );
};

export const createChatroomLiveQuestionInFirestore = async (
  questionData: {
    questionText: string;
    correctAnswer: string;
    acceptedAlternativeAnswers?: string[];
    timeLimitSeconds?: number;
    winnerLimit?: number;
    gpRewardPerWinner?: number;
    allowFreeParticipation?: boolean;
    questionNumber?: number;
  },
  adminUid?: string,
  adminName?: string
): Promise<ChatroomLiveQuestion> => {
  try {
    const qId = 'clq_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const now = Date.now();
    const timeLimit = Math.max(15, Number(questionData.timeLimitSeconds) || 300);
    const endAt = now + timeLimit * 1000;
    const winnerLimit = Math.max(1, Number(questionData.winnerLimit) || 5);
    const gpReward = Math.max(1, Number(questionData.gpRewardPerWinner) || 50);

    // 0. Auto-close any prior active questions to ensure only this newly launched challenge is active
    try {
      const activeQuery = query(collection(db, 'chatroom_live_questions'), where('status', '==', 'active'));
      const activeSnap = await getDocs(activeQuery);
      if (!activeSnap.empty) {
        const batch = writeBatch(db);
        activeSnap.docs.forEach(d => {
          batch.update(d.ref, { status: 'closed', updatedAt: serverTimestamp() });
        });
        await batch.commit();
      }
    } catch (e) {
      console.warn('Notice closing prior active questions:', e);
    }

    // Auto-compute question number if not provided
    let questionNumber = Number(questionData.questionNumber);
    if (!questionNumber || isNaN(questionNumber)) {
      try {
        const allQuestionsSnap = await getDocs(query(collection(db, 'chatroom_live_questions'), limit(100)));
        questionNumber = allQuestionsSnap.size + 1;
      } catch {
        questionNumber = 1;
      }
    }

    const newQ: ChatroomLiveQuestion = {
      id: qId,
      questionNumber,
      questionText: questionData.questionText.trim(),
      correctAnswer: questionData.correctAnswer.trim(),
      acceptedAlternativeAnswers: (questionData.acceptedAlternativeAnswers || []).map(a => a.trim()).filter(Boolean),
      timeLimitSeconds: timeLimit,
      startAt: now,
      endAt,
      status: 'active',
      winnerLimit,
      gpRewardPerWinner: gpReward,
      allowFreeParticipation: questionData.allowFreeParticipation !== false,
      premiumRequiredForRewards: false,
      selectedWinners: [],
      totalSubmissionsCount: 0,
      createdAt: now,
    };

    // 1. Save question doc in Firestore
    await setDoc(doc(db, 'chatroom_live_questions', qId), {
      ...newQ,
      createdAtServer: serverTimestamp(),
      createdByUid: adminUid || PRIMARY_SUPER_ADMIN_UID,
      createdByName: adminName || 'Community Manager',
    });

    // 2. Post the official Question card message to the live chat feed
    const questionMessage: ChatroomLiveMessage = {
      id: 'msg_q_' + qId,
      userId: adminUid || 'admin_mod',
      userName: adminName ? `${adminName} 🛡️` : 'Community Manager 🛡️',
      userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      institution: 'Grobaax Community Management',
      department: 'Head Moderator',
      level: 'Admin',
      isPremium: true,
      messageText: `🎯 LIVE QUESTION #${newQ.questionNumber}: ${newQ.questionText}\n\n🏆 Reward: +${gpReward} GP each for the first ${winnerLimit} correct scholars!\n⏱️ Time Limit: ${Math.round(timeLimit / 60)} minutes. Type your answer directly in the chat below!`,
      timestamp: now,
      type: 'question',
      competitionRef: {
        competitionId: 'daily_live_chat',
        questionId: qId,
        questionNumber: newQ.questionNumber,
        totalQuestions: 10,
        questionText: newQ.questionText,
        status: 'active',
        gpRewardPerWinner: gpReward,
        winnerCountLimit: winnerLimit,
        allowFreeParticipation: true,
        timeLimitSeconds: timeLimit,
        startAt: now,
        endAt: endAt,
      },
      reactions: { '🎯': 1, '⚡': 1 },
    };

    await sendChatroomMessageToFirestore(questionMessage);

    if (adminUid) {
      await logAdminAuditAction(adminUid, adminName || 'Admin', 'CREATE_CHATROOM_QUESTION', qId, {
        questionText: newQ.questionText,
        winnerLimit,
        gpReward,
      });
    }

    return newQ;
  } catch (err) {
    console.error('Error creating chatroom live question in Firestore:', err);
    throw err;
  }
};

export const DAILY_SEARCH_POOL = [
  {
    questionText: 'What is the SI unit of electrical capacitance named after English scientist Michael Faraday?',
    correctAnswer: 'Farad',
    acceptedAlternativeAnswers: ['Farads', 'F'],
    timeLimitSeconds: 900,
    gpRewardPerWinner: 50,
    winnerLimit: 5,
  },
  {
    questionText: "Which Nigerian university was established in 1948 as a college of the University of London and became Nigeria's first premier degree-awarding university?",
    correctAnswer: 'University of Ibadan',
    acceptedAlternativeAnswers: ['UI', 'U.I.', 'University of Ibadan (UI)', 'Ibadan University'],
    timeLimitSeconds: 900,
    gpRewardPerWinner: 50,
    winnerLimit: 5,
  },
  {
    questionText: 'In computer science and algorithms, what is the asymptotic time complexity of binary search on a sorted array of N elements?',
    correctAnswer: 'O(log n)',
    acceptedAlternativeAnswers: ['O(logn)', 'Logarithmic', 'Log n', 'O(log N)', 'O(log(n))'],
    timeLimitSeconds: 900,
    gpRewardPerWinner: 50,
    winnerLimit: 5,
  },
  {
    questionText: 'Which fundamental subatomic particle carrying a negative elementary electric charge was discovered by J.J. Thomson in 1897?',
    correctAnswer: 'Electron',
    acceptedAlternativeAnswers: ['Electrons', 'e-'],
    timeLimitSeconds: 900,
    gpRewardPerWinner: 50,
    winnerLimit: 5,
  },
  {
    questionText: "What mathematical constant represents the ratio of a circle's circumference to its diameter, approximately equal to 3.14159?",
    correctAnswer: 'Pi',
    acceptedAlternativeAnswers: ['π', '3.14', '3.142', '22/7'],
    timeLimitSeconds: 900,
    gpRewardPerWinner: 50,
    winnerLimit: 5,
  },
  {
    questionText: 'What is the largest organ in the human body by surface area and total weight?',
    correctAnswer: 'Skin',
    acceptedAlternativeAnswers: ['The Skin', 'Integumentary system', 'Epidermis'],
    timeLimitSeconds: 900,
    gpRewardPerWinner: 50,
    winnerLimit: 5,
  },
  {
    questionText: 'Which economic law states that, all other factors being equal, as the price of a good increases, the quantity demanded decreases?',
    correctAnswer: 'Law of Demand',
    acceptedAlternativeAnswers: ['The Law of Demand', 'Demand Law'],
    timeLimitSeconds: 900,
    gpRewardPerWinner: 50,
    winnerLimit: 5,
  },
];

export const ensureActiveDailySearchQuestion = async (): Promise<ChatroomLiveQuestion | null> => {
  try {
    const q = query(
      collection(db, 'chatroom_live_questions'),
      where('status', '==', 'active'),
      limit(5)
    );
    const snap = await getDocs(q);
    const now = Date.now();
    const active = snap.docs
      .map(d => ({ ...d.data(), id: d.id } as ChatroomLiveQuestion))
      .find(item => item.status === 'active' && (!item.endAt || item.endAt > now) && ((item.selectedWinners || []).length < (item.winnerLimit || 5)));

    if (active) return active;

    const dayIndex = Math.floor(now / (1000 * 60 * 60 * 24)) % DAILY_SEARCH_POOL.length;
    const seed = DAILY_SEARCH_POOL[dayIndex] || DAILY_SEARCH_POOL[0];

    const newQuestion = await createChatroomLiveQuestionInFirestore(
      {
        questionText: seed.questionText,
        correctAnswer: seed.correctAnswer,
        acceptedAlternativeAnswers: seed.acceptedAlternativeAnswers,
        timeLimitSeconds: seed.timeLimitSeconds,
        winnerLimit: seed.winnerLimit,
        gpRewardPerWinner: seed.gpRewardPerWinner,
        questionNumber: (dayIndex + 1),
      },
      'grobax_arbiter',
      'Daily GP Grab 🎯'
    );
    return newQuestion;
  } catch (err) {
    console.warn('Notice ensuring active daily search question:', err);
    return null;
  }
};

export const closeChatroomLiveQuestionInFirestore = async (
  questionId: string,
  adminUid?: string,
  adminName?: string
): Promise<void> => {
  try {
    const qRef = doc(db, 'chatroom_live_questions', questionId);
    const qSnap = await getDoc(qRef);
    if (!qSnap.exists()) return;
    const qData = qSnap.data() as ChatroomLiveQuestion;

    await setDoc(qRef, { status: 'closed', updatedAt: serverTimestamp() }, { merge: true });

    try {
      const qMsgRef = doc(db, 'chatroom_live_messages', `msg_q_${questionId}`);
      await setDoc(
        qMsgRef,
        {
          'competitionRef.status': 'closed',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Notice updating question message on close:', e);
    }

    // Announce official completion in chat
    const completionMsg: ChatroomLiveMessage = {
      id: 'msg_q_closed_' + Date.now(),
      userId: 'grobax_arbiter',
      userName: 'Grobaax Arbiter 🎯',
      userAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
      institution: 'Official Live Q&A Arbiter',
      isPremium: true,
      messageText: `🏁 Live Question #${qData.questionNumber || 1} has concluded!\n\n✅ Official Correct Answer: "${qData.correctAnswer}"\n👑 Winners Rewarded: ${(qData.selectedWinners || []).length} / ${qData.winnerLimit || 5} scholars (${(qData.selectedWinners || []).map(w => '@' + w.userName).join(', ') || 'No winners'})`,
      timestamp: Date.now(),
      type: 'announcement',
      reactions: { '👏': 1, '🔥': 1 },
    };
    await sendChatroomMessageToFirestore(completionMsg);

    if (adminUid) {
      await logAdminAuditAction(adminUid, adminName || 'Admin', 'CLOSE_CHATROOM_QUESTION', questionId, {
        questionNumber: qData.questionNumber,
      });
    }
  } catch (err) {
    console.warn('Error closing chatroom live question:', err);
  }
};

// In-flight locks to guarantee zero double-rewarding on rapid submissions
const answerEvaluationLocks = new Set<string>();

// Scientific & general SI unit / term equivalence mapping
const SI_UNIT_SYNONYMS: Record<string, string[]> = {
  a: ['ampere', 'amperes', 'amp', 'amps'],
  ampere: ['a', 'amperes', 'amp', 'amps'],
  amperes: ['a', 'ampere', 'amp', 'amps'],
  amp: ['a', 'ampere', 'amperes', 'amps'],
  amps: ['a', 'ampere', 'amperes', 'amp'],
  v: ['volt', 'volts'],
  volt: ['v', 'volts'],
  volts: ['v', 'volt'],
  w: ['watt', 'watts'],
  watt: ['w', 'watts'],
  watts: ['w', 'watt'],
  j: ['joule', 'joules'],
  joule: ['j', 'joules'],
  joules: ['j', 'joule'],
  n: ['newton', 'newtons'],
  newton: ['n', 'newtons'],
  newtons: ['n', 'newton'],
  hz: ['hertz'],
  hertz: ['hz'],
  pa: ['pascal', 'pascals'],
  pascal: ['pa', 'pascals'],
  pascals: ['pa', 'pascal'],
  c: ['coulomb', 'coulombs'],
  coulomb: ['c', 'coulombs'],
  coulombs: ['c', 'coulomb'],
  f: ['farad', 'farads'],
  farad: ['f', 'farads'],
  farads: ['f', 'farad'],
  ohm: ['ohms', 'ω'],
  ohms: ['ohm', 'ω'],
  kg: ['kilogram', 'kilograms', 'kilo', 'kilos'],
  kilogram: ['kg', 'kilograms', 'kilo', 'kilos'],
  kilograms: ['kg', 'kilogram', 'kilo', 'kilos'],
  m: ['meter', 'meters', 'metre', 'metres'],
  meter: ['m', 'meters', 'metre', 'metres'],
  meters: ['m', 'meter', 'metre', 'metres'],
  s: ['sec', 'second', 'seconds'],
  second: ['s', 'sec', 'seconds'],
  seconds: ['s', 'sec', 'second'],
  k: ['kelvin'],
  kelvin: ['k'],
  mol: ['mole', 'moles'],
  mole: ['mol', 'moles'],
  moles: ['mol', 'mole'],
  cd: ['candela', 'candelas'],
  candela: ['cd', 'candelas'],
};

// Normalization helper
export const normalizeAnswerText = (txt: string): string => {
  return (txt || '')
    .toLowerCase()
    .replace(/^@\w+[\s:]*/, '') // remove leading reply mention
    .replace(/^(the\s+)?(correct\s+)?answer\s*(is|:|=)?\s*/i, '') // remove "the answer is", "answer:", etc.
    .replace(/^(it\s+is|its|it's)\s*/i, '') // remove "it is", "it's"
    .replace(/^option\s*/i, '') // remove "option"
    .trim()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, '')
    .replace(/\s+/g, ' ');
};

// Generates expanded set of normalized synonyms & variants
export const getAnswerVariants = (raw: string): string[] => {
  const base = normalizeAnswerText(raw);
  if (!base) return [];
  const variants = new Set<string>([base]);
  // Handle plural / singular
  if (base.endsWith('s') && base.length > 3) {
    variants.add(base.slice(0, -1));
  } else if (!base.endsWith('s')) {
    variants.add(base + 's');
  }
  // Handle synonyms
  const syns = SI_UNIT_SYNONYMS[base];
  if (syns) {
    syns.forEach(s => variants.add(normalizeAnswerText(s)));
  }
  return Array.from(variants);
};

// Safe regex escape helper to prevent invalid RegExp crashes on math/chemical formulas
export const escapeRegExp = (str: string): string => {
  return (str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Compares user submission against official answer and accepted alternatives
export const isChatroomAnswerCorrect = (
  submittedText: string,
  correctAnswer: string,
  acceptedAlternatives?: string[]
): boolean => {
  if (!submittedText || !correctAnswer) return false;
  const targetVariants = new Set<string>();
  getAnswerVariants(correctAnswer).forEach(v => targetVariants.add(v));
  (acceptedAlternatives || []).forEach(alt => {
    getAnswerVariants(alt).forEach(v => targetVariants.add(v));
  });

  const submissionVariants = getAnswerVariants(submittedText);
  return submissionVariants.some(sub => {
    if (targetVariants.has(sub)) return true;
    for (const tgt of targetVariants) {
      if (tgt.length > 1) {
        try {
          const escaped = escapeRegExp(tgt);
          const regex = new RegExp(`(^|\\s)${escaped}(\\s|$)`, 'i');
          if (regex.test(sub)) return true;
        } catch {
          if (sub === tgt || (tgt.length >= 3 && sub.includes(tgt))) return true;
        }
      }
    }
    return false;
  });
};

// Automatic evaluation and instant GP reward processor for live question responses
export const evaluateAndProcessLiveAnswer = async (
  questionId: string,
  user: {
    id: string;
    name?: string;
    username?: string;
    avatar?: string;
    institution?: string;
    isPremium?: boolean;
    isVip?: boolean;
    membershipTier?: string;
    gusTier?: string;
    gpBalance?: number;
    subscriptionTier?: string;
    subscriptionPlan?: string;
    activePlanId?: string;
    role?: string;
  },
  submittedAnswerText: string,
  isExplicitReplyToQuestion: boolean = false
): Promise<{
  isCorrect: boolean;
  isWinner: boolean;
  alreadyWon?: boolean;
  rank?: number;
  gpAwarded?: number;
  message?: string;
  isAttemptConsumed?: boolean;
}> => {
  const normalizedUserName = (user.name || user.username || '')
    .replace(/\s*(💎\s*\|\s*Moderator|🛡️|⭐|👑|⚡).*$/, '')
    .toLowerCase()
    .trim();
  const lockKey = `${questionId}_${user.id}_${normalizedUserName}`;
  if (answerEvaluationLocks.has(lockKey)) {
    return { isCorrect: false, isWinner: false, isAttemptConsumed: false };
  }

  try {
    answerEvaluationLocks.add(lockKey);

    const qRef = doc(db, 'chatroom_live_questions', questionId);
    const qSnap = await getDoc(qRef);
    if (!qSnap.exists()) {
      return { isCorrect: false, isWinner: false, isAttemptConsumed: false };
    }

    const question = qSnap.data() as ChatroomLiveQuestion;

    // Check if question is active
    if (question.status !== 'active') {
      return { isCorrect: false, isWinner: false, isAttemptConsumed: false, message: 'Question round has closed.' };
    }

    const now = Date.now();
    const maxWinners = Math.max(1, Number(question.winnerLimit) || 5);
    const currentWinners = question.selectedWinners || [];

    // Rule 1: Time Limit Check (Admin programmed time)
    if (question.endAt && now > question.endAt) {
      await setDoc(qRef, { status: 'closed', updatedAt: serverTimestamp() }, { merge: true });
      try {
        const qMsgRef = doc(db, 'chatroom_live_messages', `msg_q_${question.id}`);
        await setDoc(qMsgRef, { 'competitionRef.status': 'closed', updatedAt: serverTimestamp() }, { merge: true });
      } catch {}
      return { isCorrect: false, isWinner: false, isAttemptConsumed: false, message: 'Time expired for this question.' };
    }

    // Rule 2: Winner Limit Check (Admin programmed amount of winners)
    if (currentWinners.length >= maxWinners) {
      await setDoc(qRef, { status: 'closed', updatedAt: serverTimestamp() }, { merge: true });
      try {
        const qMsgRef = doc(db, 'chatroom_live_messages', `msg_q_${question.id}`);
        await setDoc(qMsgRef, { 'competitionRef.status': 'closed', updatedAt: serverTimestamp() }, { merge: true });
      } catch {}
      return { isCorrect: false, isWinner: false, isAttemptConsumed: false, message: 'All winner slots have been claimed.' };
    }

    // Rule 3: Single Attempt & Single Reward Per User (Scholars cannot reply twice per question)
    const repliedUserIds = question.repliedUserIds || [];
    const repliedUsernames = (question.repliedUsernames || []).map(u => u.toLowerCase().trim());
    const alreadyWon = currentWinners.some(
      w =>
        w.userId === user.id ||
        (w.userName && w.userName.toLowerCase().trim() === normalizedUserName && normalizedUserName.length > 0)
    );
    const alreadyReplied =
      repliedUserIds.includes(user.id) ||
      (normalizedUserName.length > 0 && repliedUsernames.includes(normalizedUserName)) ||
      alreadyWon;

    if (alreadyReplied) {
      return {
        isCorrect: false,
        isWinner: false,
        alreadyWon: alreadyWon,
        isAttemptConsumed: false,
        message: 'You have already submitted an answer for this question. Only 1 attempt is permitted.',
      };
    }

    // Authoritative Answer Correctness Check using robust synonyms and regex boundary matching
    const isMatch = isChatroomAnswerCorrect(
      submittedAnswerText,
      question.correctAnswer,
      question.acceptedAlternativeAnswers
    );

    if (!isMatch) {
      // If scholar specifically clicked "Reply to Answer" to this question, record their 1 attempt as wrong
      if (isExplicitReplyToQuestion) {
        await setDoc(
          qRef,
          {
            totalSubmissionsCount: increment(1),
            repliedUserIds: arrayUnion(user.id),
            repliedUsernames: arrayUnion(normalizedUserName),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        return { isCorrect: false, isWinner: false, isAttemptConsumed: true, message: 'Incorrect answer submitted.' };
      }

      // If scholar was simply chatting in the room without replying to the question card, do not mark wrong
      return { isCorrect: false, isWinner: false, isAttemptConsumed: false };
    }

    // MATCH FOUND! Check if user is Premium/VIP or Free Scholar
    // Only Premium and VIP scholars (and staff/admins) receive cash GP rewards
    let isStaffOrAdmin = Boolean(
      user.role === 'admin' ||
      user.role === 'super_admin' ||
      user.role === 'community_manager' ||
      user.role === 'staff' ||
      user.id === 'aGZBTsB4BBNvlY1A69hwfAb5DCJ3' ||
      user.id === 'iH02BTcB4B0BV2YLA60WwFAi50CJ3' ||
      user.id === 'grobax_arbiter' ||
      (user.name && (
        user.name.toLowerCase().includes('admin') ||
        user.name.toLowerCase().includes('moderator') ||
        user.name.toLowerCase().includes('staff') ||
        user.name.toLowerCase().includes('arbiter') ||
        user.name.toLowerCase().includes('barns')
      ))
    );

    let isUserVip = isStaffOrAdmin || Boolean(
      user.isVip ||
      (user.membershipTier && (user.membershipTier.toLowerCase().includes('vip') || user.membershipTier.toLowerCase().includes('titan'))) ||
      user.gusTier === 'Titan' ||
      (user.subscriptionTier && (user.subscriptionTier.toLowerCase().includes('vip') || user.subscriptionTier.toLowerCase().includes('titan'))) ||
      (user.subscriptionPlan && (user.subscriptionPlan.toLowerCase().includes('vip') || user.subscriptionPlan.toLowerCase().includes('titan')))
    );
    let isUserPremium = isStaffOrAdmin || isUserVip || Boolean(user.isPremium);

    // Authoritative Firestore database check of user's account for subscription tier verification
    try {
      const userSnap = await getDoc(doc(db, 'users', user.id));
      if (userSnap.exists()) {
        const uData = userSnap.data();
        const role = (uData.role || '').toLowerCase();
        const email = (uData.email || '').toLowerCase();
        const membership = ((uData.membershipTier || uData.tierName || '') + '').toLowerCase();
        const subTier = ((uData.subscriptionTier || '') + '').toLowerCase();
        const rawPlan = ((uData.activePlanId || uData.planId || uData.tier || '') + '').toLowerCase();
        const subPlan = ((uData.subscriptionPlan || '') + '').toLowerCase();

        if (
          role === 'admin' ||
          role === 'super_admin' ||
          role === 'community_manager' ||
          role === 'staff' ||
          Boolean(uData.managerRole) ||
          email === 'grobaxycompany@gmail.com' ||
          user.id === 'aGZBTsB4BBNvlY1A69hwfAb5DCJ3' ||
          user.id === 'iH02BTcB4B0BV2YLA60WwFAi50CJ3' ||
          user.id === 'grobax_arbiter'
        ) {
          isStaffOrAdmin = true;
        }

        const isExpired = uData.subscriptionExpiry
          ? new Date(uData.subscriptionExpiry).getTime() <= Date.now()
          : false;

        const dbIsVip = isStaffOrAdmin || (!isExpired && Boolean(
          uData.isVip ||
          uData.gusTier === 'Titan' ||
          rawPlan.includes('titan') ||
          rawPlan.includes('vip') ||
          rawPlan.includes('annual') ||
          membership.includes('vip') ||
          membership.includes('titan') ||
          membership.includes('annual') ||
          subTier.includes('vip') ||
          subTier.includes('titan') ||
          subTier.includes('annual') ||
          subPlan.includes('vip') ||
          subPlan.includes('titan') ||
          subPlan.includes('annual')
        ));

        const dbIsPremium = isStaffOrAdmin || (!isExpired && (dbIsVip || Boolean(
          uData.isPremium ||
          uData.isSubscribed ||
          (uData.subscription && uData.subscription.status === 'active') ||
          (rawPlan && !rawPlan.includes('free') && rawPlan !== 'starter scholar') ||
          (membership && !membership.includes('free') && membership !== 'starter scholar' && !membership.includes('scholar (starter)') && membership.trim().length > 0) ||
          (subTier && !subTier.includes('free') && subTier !== 'starter scholar' && !subTier.includes('scholar (starter)') && subTier.trim().length > 0) ||
          (subPlan && !subPlan.includes('free') && subPlan !== 'starter scholar' && subPlan.trim().length > 0)
        )));

        if (dbIsVip) {
          isUserVip = true;
          isUserPremium = true;
        } else if (dbIsPremium) {
          isUserPremium = true;
        }
      }
    } catch (uErr) {
      console.warn('Could not read user doc for tier check in live question evaluation:', uErr);
    }

    const isRewardEligible = isStaffOrAdmin || isUserVip || isUserPremium;

    // SCENARIO 1: FREE SCHOLAR
    // Free users can participate and the system marks them correct, but cash GP is reserved for Premium/VIP
    if (!isRewardEligible) {
      const freeRecord = {
        userId: user.id,
        userName: user.name || user.username || 'Grobaax Scholar',
        userAvatar:
          user.avatar ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        institution: user.institution || 'Grobaax Scholar',
        submittedAt: now,
        submittedAnswer: submittedAnswerText.trim(),
        isCorrect: true,
        tier: 'free',
      };

      // 1. Mark user attempt & correct answer on question doc
      await setDoc(
        qRef,
        {
          freeCorrectScholars: arrayUnion(freeRecord),
          repliedUserIds: arrayUnion(user.id),
          repliedUsernames: arrayUnion(normalizedUserName),
          totalSubmissionsCount: increment(1),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Sync question message in live feed with updated repliedUserIds
      try {
        const qMsgRef = doc(db, 'chatroom_live_messages', `msg_q_${question.id}`);
        await setDoc(
          qMsgRef,
          {
            'competitionRef.repliedUserIds': arrayUnion(user.id),
            'competitionRef.repliedUsernames': arrayUnion(normalizedUserName),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('Notice syncing question message in live feed:', e);
      }

      // Send real-time push notification indicating they are correct
      try {
        await sendBroadcastNotificationToFirestore(
          {
            title: `🎯 Correct Answer on Challenge #${question.questionNumber}!`,
            message: `You answered "${submittedAnswerText.trim()}" correctly! Great job! Note: Cash GP prizes are reserved for Premium & VIP scholars. Upgrade to claim GP on live challenges!`,
            type: 'gus',
            userId: user.id,
            targetUserId: user.id,
            actionUrl: '#upgrade',
          },
          'grobax_arbiter',
          'Grobaax Arbiter 🎯'
        );
      } catch (notifErr) {
        console.warn('Error dispatching notification to free correct user:', notifErr);
      }

      return {
        isCorrect: true,
        isWinner: false,
        gpAwarded: 0,
        isAttemptConsumed: true,
        message: `🎯 Correct answer: "${submittedAnswerText.trim()}"! (Free Scholar: GP prizes are reserved for Premium & VIP scholars)`,
      };
    }

    // SCENARIO 2: PREMIUM / VIP SCHOLAR (OR ADMIN/STAFF)
    // Compute new winner rank and award exact admin-programmed GP reward
    const winnerRank = currentWinners.length + 1;
    const gpAward = Math.max(1, Number(question.gpRewardPerWinner) || 50);

    const winnerRecord = {
      userId: user.id,
      userName: user.name || user.username || 'Grobaax Scholar',
      userAvatar:
        user.avatar ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      institution: user.institution || 'Grobaax Scholar',
      isPremium: Boolean(isUserPremium || isUserVip),
      isVip: isUserVip,
      membershipTier: user.membershipTier || (isUserVip ? 'VIP SCHOLAR' : 'PREMIUM SCHOLAR'),
      submittedAt: now,
      gpAwarded: gpAward,
      submittedAnswer: submittedAnswerText.trim(),
      rank: winnerRank,
    };

    const updatedWinners = [...currentWinners, winnerRecord];
    const isNowFull = updatedWinners.length >= maxWinners;

    // 1. Update Question doc with new winner, user attempt recorded, and totalSubmissions (close if slots filled)
    await setDoc(
      qRef,
      {
        selectedWinners: updatedWinners,
        repliedUserIds: arrayUnion(user.id),
        repliedUsernames: arrayUnion(normalizedUserName),
        totalSubmissionsCount: increment(1),
        status: isNowFull ? 'closed' : 'active',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Sync question message in live feed
    try {
      const qMsgRef = doc(db, 'chatroom_live_messages', `msg_q_${question.id}`);
      await setDoc(
        qMsgRef,
        {
          'competitionRef.selectedWinners': updatedWinners,
          'competitionRef.repliedUserIds': arrayUnion(user.id),
          'competitionRef.repliedUsernames': arrayUnion(normalizedUserName),
          'competitionRef.status': isNowFull ? 'closed' : 'active',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Notice syncing question message in live feed:', e);
    }

    // 2. Award exact GP to user's balance and sync authoritative ledger
    try {
      // Direct server-side authoritative update (updates Supabase DB and walletTransactions)
      fetch('/api/wallet/credit-live-reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          gpAward,
          questionId: question.id,
          questionNumber: question.questionNumber,
          winnerRank,
          questionText: question.questionText,
        }),
      }).catch((apiErr) => {
        console.warn('Backend live reward credit call notice:', apiErr);
      });

      // Firestore mirror update
      const userRef = doc(db, 'users', user.id);
      await setDoc(userRef, { gpBalance: increment(gpAward), updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      console.warn('Error incrementing user GP balance:', e);
    }

    // 3. Record transaction ledger in Firestore / Supabase adapter
    try {
      const txId = 'tx_lqa_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      await setDoc(doc(db, 'walletTransactions', txId), {
        id: txId,
        transactionId: txId,
        userId: user.id,
        userName: user.name || user.username || 'Grobaax Scholar',
        type: 'gp_earned',
        source: 'LIVE_QA_REWARD',
        category: 'DAILY_QA',
        amount: gpAward,
        unit: 'GP',
        currency: 'GP',
        title: `🏆 Daily GP Grab Reward #${winnerRank}`,
        description: `Winner #${winnerRank} reward for Live Q&A Challenge #${question.questionNumber}: "${question.questionText}"`,
        isCredit: true,
        status: 'completed',
        timestamp: now,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Error recording Live Q&A transaction:', e);
    }

    // 4. Dispatch instant UI event for immediate balance update in nav
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('grobaax_gp_awarded', {
            detail: {
              userId: user.id,
              gpAwarded: gpAward,
              questionNumber: question.questionNumber,
              winnerRank,
            },
          })
        );
      } catch {}
    }

    // 5. Send real-time push notification directly to the winner
    try {
      await sendBroadcastNotificationToFirestore(
        {
          title: `🏆 +${gpAward} GP Reward Claimed!`,
          message: `Congratulations! You answered Question #${question.questionNumber} correctly and earned +${gpAward} GP in Daily GP Grab Live! (Winner #${winnerRank} of ${maxWinners})`,
          type: 'gus',
          userId: user.id,
          targetUserId: user.id,
          actionUrl: '#daily_qa',
        },
        'grobax_arbiter',
        'Grobaax Arbiter 🎯'
      );
    } catch (notifErr) {
      console.warn('Error dispatching real-time push notification to winner:', notifErr);
    }

    return {
      isCorrect: true,
      isWinner: true,
      rank: winnerRank,
      gpAwarded: gpAward,
      isAttemptConsumed: true,
      message: `🎉 Correct answer! You won +${gpAward} GP (Winner #${winnerRank} of ${maxWinners})`,
    };
  } catch (err) {
    console.error('Error evaluating live question answer:', err);
    return { isCorrect: false, isWinner: false, isAttemptConsumed: false };
  } finally {
    // Release in-flight lock immediately so subsequent answers can be evaluated
    answerEvaluationLocks.delete(lockKey);
  }
};

// Automatic evaluator triggered on every chatroom message
export const evaluateMessageForLiveQuestions = async (message: ChatroomLiveMessage): Promise<void> => {
  try {
    const now = Date.now();
    let targetQuestionId = '';
    let isExplicitReply = false;

    // 1. Check if replying to a question
    if (message.replyTo?.id) {
      const rawId = message.replyTo.id;
      const strippedId = rawId.replace(/^msg_q_/, '');
      
      const qRef1 = doc(db, 'chatroom_live_questions', strippedId);
      const qSnap1 = await getDoc(qRef1);
      if (qSnap1.exists() && (qSnap1.data() as ChatroomLiveQuestion).status === 'active') {
        targetQuestionId = strippedId;
        isExplicitReply = true;
      } else {
        const qRef2 = doc(db, 'chatroom_live_questions', rawId);
        const qSnap2 = await getDoc(qRef2);
        if (qSnap2.exists() && (qSnap2.data() as ChatroomLiveQuestion).status === 'active') {
          targetQuestionId = rawId;
          isExplicitReply = true;
        }
      }
    }

    // 2. If no direct reply question ID, query all active questions
    if (!targetQuestionId) {
      const qQuery = query(
        collection(db, 'chatroom_live_questions'),
        where('status', '==', 'active')
      );
      const snap = await getDocs(qQuery);
      if (!snap.empty) {
        const validActiveQuestions: (ChatroomLiveQuestion & { id: string })[] = [];
        
        for (const docSnap of snap.docs) {
          const qData = docSnap.data() as ChatroomLiveQuestion;
          const maxWinners = Math.max(1, Number(qData.winnerLimit) || 5);
          const currentWinners = qData.selectedWinners || [];

          // Auto-close if expired
          if (qData.endAt && now > qData.endAt) {
            updateDoc(docSnap.ref, { status: 'closed', updatedAt: serverTimestamp() }).catch(() => {});
            continue;
          }

          // Auto-close if full
          if (currentWinners.length >= maxWinners) {
            updateDoc(docSnap.ref, { status: 'closed', updatedAt: serverTimestamp() }).catch(() => {});
            continue;
          }

          validActiveQuestions.push({ ...qData, id: docSnap.id });
        }

        // Pick the most recent active question
        if (validActiveQuestions.length > 0) {
          validActiveQuestions.sort((a, b) => (b.createdAt || b.startAt || 0) - (a.createdAt || a.startAt || 0));
          targetQuestionId = validActiveQuestions[0].id;
        }
      }
    }

    if (targetQuestionId) {
      const cleanName = (message.userName || 'Grobaax Scholar')
        .replace(/\s*(💎\s*\|\s*Moderator|🛡️|⭐|👑|⚡).*$/, '')
        .trim();

      const evalRes = await evaluateAndProcessLiveAnswer(
        targetQuestionId,
        {
          id: message.userId,
          name: cleanName,
          username: cleanName,
          avatar: message.userAvatar,
          institution: message.institution,
          isPremium: message.isPremium,
          isVip: message.isVip,
          membershipTier: message.membershipTier,
          role: message.role,
        },
        message.messageText,
        isExplicitReply
      );

      // Persist the evaluation marking directly on the chat message if attempt was consumed
      if (evalRes && evalRes.isAttemptConsumed) {
        try {
          const msgRef = doc(db, 'chatroom_live_messages', message.id);
          const evalStatus = evalRes.isCorrect ? 'correct' : 'wrong';
          await setDoc(
            msgRef,
            {
              evalStatus,
              isCorrect: Boolean(evalRes.isCorrect),
              isWinner: Boolean(evalRes.isWinner),
              gpAwarded: evalRes.gpAwarded || 0,
              winnerRank: evalRes.rank || null,
              targetQuestionId,
              answerEvaluation: {
                questionId: targetQuestionId,
                isCorrect: Boolean(evalRes.isCorrect),
                isPremium: Boolean(message.isPremium || message.isVip),
                isWinner: Boolean(evalRes.isWinner),
                gpAwarded: evalRes.gpAwarded || 0,
              },
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (saveErr) {
          console.warn('Notice saving evaluation to chatroom message:', saveErr);
        }
      }
    }
  } catch (err) {
    console.warn('Error in evaluateMessageForLiveQuestions:', err);
  }
};

// Seed default chatroom messages if Firestore collection is empty
export const seedFirestoreChatroomIfEmpty = async () => {
  try {
    if (typeof window !== 'undefined' && localStorage.getItem('grobax_seeded_chatroom')) {
      return;
    }
    const q = query(collection(db, 'chatroom_live_messages'), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) {
      const batch = writeBatch(db);
      for (const msg of MOCK_CHATROOM_MESSAGES) {
        const msgRef = doc(db, 'chatroom_live_messages', msg.id);
        batch.set(msgRef, {
          ...msg,
          createdAt: serverTimestamp(),
        });
      }
      await batch.commit();
      if (typeof window !== 'undefined') {
        localStorage.setItem('grobax_seeded_chatroom', 'true');
      }
      console.log('Seeded default chatroom live messages into Firestore.');
    } else {
      if (typeof window !== 'undefined') {
        localStorage.setItem('grobax_seeded_chatroom', 'true');
      }
    }
  } catch (err) {
    console.warn('Chatroom initial seed notice:', err);
  }
};

// ==========================================
// PLATFORM EVENTS CATALOG SYNC & MANAGEMENT
// ==========================================

export async function uploadEventCatalogImage(
  file: File,
  eventId: string
): Promise<{ downloadUrl: string; storagePath: string }> {
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `eventCatalog/${eventId}/${Date.now()}_${cleanFileName}`;
  try {
    const fileRef = storageRef(storage, path);
    const snapshot = await uploadBytes(fileRef, file, {
      contentType: file.type,
      customMetadata: {
        eventId,
        uploadedAt: new Date().toISOString(),
      },
    });
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return { downloadUrl, storagePath: path };
  } catch (storageErr) {
    console.warn('Firebase Storage upload notice, falling back to data URL encoding:', storageErr);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = (e.target?.result as string) || '';
        resolve({ downloadUrl: dataUrl, storagePath: path });
      };
      reader.onerror = () => {
        resolve({
          downloadUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
          storagePath: path,
        });
      };
      reader.readAsDataURL(file);
    });
  }
}

export async function deleteEventCatalogImage(storagePath?: string): Promise<void> {
  if (!storagePath || storagePath.startsWith('data:') || storagePath.startsWith('http')) return;
  try {
    const fileRef = storageRef(storage, storagePath);
    await deleteObject(fileRef);
  } catch (err) {
    console.warn('Notice deleting storage image:', err);
  }
}

export const savePlatformEventToFirestore = async (
  eventData: Partial<PlatformEventItem>,
  adminUid: string,
  adminName: string
): Promise<string> => {
  const eventId = eventData.id || `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const eventRef = doc(db, 'platformEvents', eventId);
  
  const catObj = PLATFORM_EVENT_CATEGORIES.find((c) => c.id === eventData.category);
  const categoryLabel = catObj?.label || eventData.categoryLabel || 'Platform Event';

  const defaultImg = 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80';
  const finalImg = eventData.imageUrl || eventData.image || defaultImg;
  const finalPrize = eventData.prizeReward ? eventData.prizeReward.trim() : '';

  const resolvedTargetTab = eventData.targetTab || (eventData.category === 'school_dome' ? 'school_dome' : catObj?.tabKey || 'daily_qa');
  const resolvedTargetSubTab = eventData.targetSubTab || catObj?.subTab || '';
  const resolvedChannelName = eventData.channelName || catObj?.channelName || '';

  const payload: any = {
    id: eventId,
    eventId,
    title: (eventData.title || '').trim(),
    category: eventData.category || (resolvedTargetTab === 'school_dome' ? 'school_dome' : 'gus'),
    categoryLabel,
    host: OFFICIAL_EVENT_HOST,
    startDate: eventData.startDate || new Date().toISOString().split('T')[0],
    endDate: eventData.endDate || new Date().toISOString().split('T')[0],
    eventTime: eventData.eventTime || '18:00 UTC',
    prizeReward: finalPrize,
    audience: 'all_users',
    description: (eventData.description || '').trim(),
    imageUrl: finalImg,
    imageStoragePath: eventData.imageStoragePath || '',
    status: eventData.status || 'Published',
    targetTab: resolvedTargetTab,
    targetSubTab: resolvedTargetSubTab,
    channelName: resolvedChannelName,
    channelUrl: eventData.channelUrl || '',
    targetChannel: eventData.targetChannel || resolvedTargetTab,
    createdBy: eventData.createdBy || adminUid,
    createdByName: eventData.createdByName || adminName,
    updatedAt: serverTimestamp(),
    // Backward compatibility aliases
    date: `${eventData.startDate || ''} to ${eventData.endDate || ''}`,
    time: eventData.eventTime || '18:00 UTC',
    prizePool: finalPrize,
    institutionHost: OFFICIAL_EVENT_HOST,
    image: finalImg,
    participantsCount: eventData.participantsCount || 0,
    maxParticipants: 0,
  };

  if (eventData.status === 'Published' && !eventData.publishedAt) {
    payload.publishedAt = serverTimestamp();
  }

  await setDoc(eventRef, payload, { merge: true });

  // Sync to legacy /events collection as well
  try {
    await setDoc(doc(db, 'events', eventId), payload, { merge: true });
  } catch (e) {
    console.warn('Legacy events mirror notice:', e);
  }

  // Update browser cache & notify UI listeners immediately
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('grobax_saved_platform_events');
      const list = raw ? JSON.parse(raw) : [];
      const itemToSave = { ...payload, id: eventId, eventId };
      const idx = Array.isArray(list) ? list.findIndex((e: any) => e.id === eventId || e.eventId === eventId) : -1;
      const updatedList = idx >= 0 ? list.map((e: any, i: number) => (i === idx ? { ...e, ...itemToSave } : e)) : [itemToSave, ...list];
      localStorage.setItem('grobax_saved_platform_events', JSON.stringify(updatedList));
      window.dispatchEvent(new CustomEvent('grobax_events_changed', { detail: itemToSave }));
    } catch {}
  }

  await logAdminAuditAction(
    adminUid,
    adminName,
    eventData.id ? 'EDIT_PLATFORM_EVENT' : 'CREATE_PLATFORM_EVENT',
    eventId,
    {
      title: payload.title,
      category: payload.category,
      status: payload.status,
      prizeReward: payload.prizeReward,
    }
  );

  return eventId;
};

export const deletePlatformEventFromFirestore = async (
  eventId: string,
  eventTitle: string,
  imageStoragePath: string | undefined,
  adminUid: string,
  adminName: string
): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'platformEvents', eventId));
  } catch (err) {
    console.warn('Error deleting from platformEvents:', err);
  }

  try {
    await deleteDoc(doc(db, 'events', eventId));
  } catch (e) {}

  if (imageStoragePath) {
    await deleteEventCatalogImage(imageStoragePath);
  }

  // Update browser cache & notify UI listeners immediately
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('grobax_saved_platform_events');
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          const updated = list.filter((e: any) => e.id !== eventId && e.eventId !== eventId);
          localStorage.setItem('grobax_saved_platform_events', JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent('grobax_events_changed', { detail: { id: eventId, deleted: true } }));
        }
      }
    } catch {}
  }

  await logAdminAuditAction(adminUid, adminName, 'DELETE_PLATFORM_EVENT', eventId, {
    title: eventTitle,
  });
};

export const togglePlatformEventStatusInFirestore = async (
  eventId: string,
  eventTitle: string,
  newStatus: PlatformEventStatus,
  adminUid: string,
  adminName: string
): Promise<void> => {
  const eventRef = doc(db, 'platformEvents', eventId);
  const updates: any = {
    status: newStatus,
    updatedAt: serverTimestamp(),
  };
  if (newStatus === 'Published') {
    updates.publishedAt = serverTimestamp();
  } else if (newStatus === 'Archived') {
    updates.archivedAt = serverTimestamp();
  }

  await updateDoc(eventRef, updates);
  try {
    await updateDoc(doc(db, 'events', eventId), updates);
  } catch (e) {}

  // Update browser cache & notify UI listeners immediately
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('grobax_saved_platform_events');
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          const updated = list.map((e: any) =>
            e.id === eventId || e.eventId === eventId ? { ...e, status: newStatus } : e
          );
          localStorage.setItem('grobax_saved_platform_events', JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent('grobax_events_changed', { detail: { id: eventId, status: newStatus } }));
        }
      }
    } catch {}
  }

  await logAdminAuditAction(
    adminUid,
    adminName,
    newStatus === 'Published' ? 'PUBLISH_PLATFORM_EVENT' : 'UNPUBLISH_PLATFORM_EVENT',
    eventId,
    {
      title: eventTitle,
      newStatus,
    }
  );
};

export const seedDefaultPlatformEventsIfEmpty = async () => {
  try {
    if (typeof window !== 'undefined' && localStorage.getItem('grobax_seeded_platform_events')) {
      return;
    }
    const q = query(collection(db, 'platformEvents'), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) {
      console.log('Seeding initial official Platform Events to Firestore...');
      const batch = writeBatch(db);

      const defaultEvents: Partial<PlatformEventItem>[] = [
        {
          id: 'ev_gus_championship_s1',
          eventId: 'ev_gus_championship_s1',
          title: 'Grobaax National Academic Championship Season 1',
          category: 'gus',
          categoryLabel: 'GUS National Championship',
          host: OFFICIAL_EVENT_HOST,
          startDate: '2026-09-01',
          endDate: '2026-09-14',
          eventTime: '18:00 UTC',
          prizeReward: '50,000 GP Prize Pool',
          audience: 'all_users',
          status: 'Published',
          description: 'The official Grobaax National Academic Championship brings together Universities, Polytechnics, and Colleges of Education scholars across the nation in live synchronous academic speed challenges.',
          imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
          image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
          date: '2026-09-01 to 2026-09-14',
          time: '18:00 UTC',
          prizePool: '50,000 GP Prize Pool',
          institutionHost: OFFICIAL_EVENT_HOST,
        },
        {
          id: 'ev_national_scholars_s1',
          eventId: 'ev_national_scholars_s1',
          title: 'National Scholars Arena — 32 Institution Elite Tournament',
          category: 'academic_olympiad',
          categoryLabel: 'National Academic Invitational',
          host: OFFICIAL_EVENT_HOST,
          startDate: '2026-09-20',
          endDate: '2026-10-05',
          eventTime: '19:00 UTC',
          prizeReward: '150,000 GP Prize Pool',
          audience: 'all_users',
          status: 'Published',
          description: 'The premier tournament featuring the highest ranked institutions across Universities, Polytechnics, and Colleges of Education competing in live academic and research speed battles.',
          imageUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&auto=format&fit=crop&q=80',
          image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&auto=format&fit=crop&q=80',
          date: '2026-09-20 to 2026-10-05',
          time: '19:00 UTC',
          prizePool: '150,000 GP Prize Pool',
          institutionHost: OFFICIAL_EVENT_HOST,
        },
        {
          id: 'ev_gus_s1_elim',
          eventId: 'ev_gus_s1_elim',
          title: 'GUS Season 1 — Grandmaster Elimination Olympiad',
          category: 'gus',
          categoryLabel: 'GUS Event',
          host: OFFICIAL_EVENT_HOST,
          startDate: '2026-08-18',
          endDate: '2026-08-19',
          eventTime: '18:00 UTC',
          prizeReward: '100,000 GP Prize Pool',
          audience: 'all_users',
          status: 'Published',
          description: 'Global Ultimate Search scholar screening and synchronized speed elimination tournament. Individual scholars compete through sequential difficulty rounds for massive GP rewards and Grandmaster titles.',
          imageUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop&q=80',
          image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop&q=80',
          date: '2026-08-18 to 2026-08-19',
          time: '18:00 UTC',
          prizePool: '100,000 GP Prize Pool',
          institutionHost: OFFICIAL_EVENT_HOST,
        },
        {
          id: 'ev_chatroom_live_daily',
          eventId: 'ev_chatroom_live_daily',
          title: 'Nightly Chatroom Live Academic Showdown',
          category: 'chatroom_live',
          categoryLabel: 'Chatroom Live Event',
          host: OFFICIAL_EVENT_HOST,
          startDate: '2026-08-15',
          endDate: '2026-08-30',
          eventTime: '20:00 UTC',
          prizeReward: '25,000 GP Daily Rewards',
          audience: 'all_users',
          status: 'Published',
          description: 'Daily live fast-fingers trivia and academic rapid-fire in the Grobaax Community Chatroom. First 5 verified answers to correctly solve questions earn direct GP drops into their wallets.',
          imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
          image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
          date: '2026-08-15 to 2026-08-30',
          time: '20:00 UTC',
          prizePool: '25,000 GP Daily Rewards',
          institutionHost: OFFICIAL_EVENT_HOST,
        },
        {
          id: 'ev_interfaculty_defense',
          eventId: 'ev_interfaculty_defense',
          title: 'Inter-Faculty Logic & Research Exposition',
          category: 'others',
          categoryLabel: 'Others Event',
          host: OFFICIAL_EVENT_HOST,
          startDate: '2026-10-10',
          endDate: '2026-10-15',
          eventTime: '16:00 UTC',
          prizeReward: '', // No prize configured
          audience: 'all_users',
          status: 'Draft',
          description: 'Open academic presentation defense and collaborative symposium. No cash prize attached — purely for academic honors and verified scholarly badges.',
          imageUrl: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop&q=80',
          image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop&q=80',
          date: '2026-10-10 to 2026-10-15',
          time: '16:00 UTC',
          prizePool: '',
          institutionHost: OFFICIAL_EVENT_HOST,
        },
      ];

      for (const ev of defaultEvents) {
        const evRef = doc(db, 'platformEvents', ev.id!);
        batch.set(evRef, {
          ...ev,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          publishedAt: ev.status === 'Published' ? serverTimestamp() : null,
        });
        batch.set(doc(db, 'events', ev.id!), {
          ...ev,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          publishedAt: ev.status === 'Published' ? serverTimestamp() : null,
        });
      }

      await batch.commit();
      if (typeof window !== 'undefined') {
        localStorage.setItem('grobax_seeded_platform_events', 'true');
      }
      console.log('Seeded default Platform Events to Firestore.');
    } else {
      if (typeof window !== 'undefined') {
        localStorage.setItem('grobax_seeded_platform_events', 'true');
      }
    }
  } catch (err) {
    console.warn('Platform Events initial seed notice:', err);
  }
};

// ==========================================
// GROBAAX SUG ELECTION SYSTEM FIREBASE SERVICES
// ==========================================

/**
 * Log an audit trail entry for SUG election actions
 */
export const logSugAudit = async (
  log: Omit<SugAuditLog, 'logId' | 'timestamp' | 'date'>
): Promise<void> => {
  try {
    const logId = `sug_log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();
    await setDoc(doc(db, 'sugAuditLogs', logId), sanitizeForFirestore({
      ...log,
      logId,
      timestamp: Date.now(),
      date: now.toISOString(),
      createdAt: serverTimestamp(),
    }));
  } catch (err) {
    console.warn('Error recording SUG audit log:', err);
  }
};

/**
 * Check if an active SUG Manager already exists for a specific institution
 */
export const getActiveSugManagerByInstitution = async (
  institutionId: string
): Promise<SugManager | null> => {
  try {
    const managerDoc = await getDoc(doc(db, 'sugManagers', institutionId));
    if (managerDoc.exists()) {
      const data = managerDoc.data() as SugManager;
      if (data.status === 'active') {
        return { ...data, id: managerDoc.id };
      }
    }
    // Also check query fallback
    const q = query(
      collection(db, 'sugManagers'),
      where('institutionId', '==', institutionId),
      where('status', '==', 'active'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      return { id: docSnap.id, ...(docSnap.data() as SugManager) };
    }
    return null;
  } catch (err) {
    console.warn('Error fetching active SUG manager for institution:', err);
    return null;
  }
};

/**
 * Get the current SUG Manager record for a given user UID if they are an approved active manager
 */
export const getSugManagerByUserId = async (
  userId: string
): Promise<SugManager | null> => {
  try {
    const q = query(
      collection(db, 'sugManagers'),
      where('userId', '==', userId),
      where('status', '==', 'active'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      return { id: docSnap.id, ...(docSnap.data() as SugManager) };
    }
    return null;
  } catch (err) {
    console.warn('Error checking SUG manager by userId:', err);
    return null;
  }
};

/**
 * Submit a new request for SUG Manager authorization
 */
export const submitSugManagerRequest = async (
  requestData: Omit<SugManagerRequest, 'requestId' | 'status' | 'submittedAt'>
): Promise<{ success: boolean; message: string; existingManager?: SugManager; requestId?: string }> => {
  try {
    // 1. Check if institution already has an active authorized SUG Manager
    const existingManager = await getActiveSugManagerByInstitution(requestData.institutionId);
    if (existingManager) {
      return {
        success: false,
        message: `Your institution already has an authorized SUG Manager (${existingManager.fullName}). Please contact the manager to conduct elections.`,
        existingManager,
      };
    }

    // 2. Check if user already submitted a pending request
    const existingUserReqQuery = query(
      collection(db, 'sugManagerRequests'),
      where('userId', '==', requestData.userId),
      where('status', '==', 'pending'),
      limit(1)
    );
    const userReqSnap = await getDocs(existingUserReqQuery);
    if (!userReqSnap.empty) {
      return {
        success: false,
        message: 'You already have a pending SUG Manager verification request currently under review.',
        requestId: userReqSnap.docs[0].id,
      };
    }

    // 3. Create new request
    const requestId = `sug_req_${Date.now()}_${requestData.userId.substring(0, 5)}`;
    const now = new Date().toISOString();
    const newRequest: SugManagerRequest = {
      ...requestData,
      requestId,
      status: 'pending',
      submittedAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, 'sugManagerRequests', requestId), sanitizeForFirestore({
      ...newRequest,
      createdAt: serverTimestamp(),
    }));

    await logSugAudit({
      actorUserId: requestData.userId,
      actorName: requestData.applicantName,
      actorEmail: requestData.applicantEmail,
      actorRole: 'student',
      action: 'SUBMIT_SUG_MANAGER_REQUEST',
      institutionId: requestData.institutionId,
      institutionName: requestData.institutionName,
      metadata: { sugPosition: requestData.sugPosition, studentId: requestData.studentId },
    });

    return {
      success: true,
      message: 'SUG Manager verification request submitted successfully for Grobaax administrative review.',
      requestId,
    };
  } catch (err: any) {
    console.error('Error submitting SUG Manager request:', err);
    throw new Error(err.message || 'Failed to submit request');
  }
};

/**
 * Approve a pending SUG Manager request (Grobaax Admin Action)
 */
export const approveSugManagerRequest = async (
  requestId: string,
  reviewerUid: string,
  reviewerName: string,
  verificationNotes?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const reqDoc = await getDoc(doc(db, 'sugManagerRequests', requestId));
    if (!reqDoc.exists()) {
      throw new Error('Request document not found');
    }
    const reqData = reqDoc.data() as SugManagerRequest;
    const now = new Date().toISOString();

    // 1. Revoke any previous active manager for this institution (ensures strictly 1 active manager per institution)
    const prevManagerQuery = query(
      collection(db, 'sugManagers'),
      where('institutionId', '==', reqData.institutionId),
      where('status', '==', 'active')
    );
    const prevSnap = await getDocs(prevManagerQuery);
    const batch = writeBatch(db);

    prevSnap.forEach((docSnap) => {
      batch.update(docSnap.ref, sanitizeForFirestore({
        status: 'revoked',
        revokedAt: now,
        revokedBy: reviewerUid,
        updatedAt: now,
      }));
    });

    // 2. Update request status to approved
    batch.update(doc(db, 'sugManagerRequests', requestId), sanitizeForFirestore({
      status: 'approved',
      reviewedAt: now,
      reviewedBy: reviewerUid,
      reviewedByName: reviewerName,
      verificationNotes: verificationNotes || 'Verified and approved by Grobaax Admin.',
      updatedAt: now,
    }));

    // 3. Create or update the active SUG Manager doc for this institution
    const managerDocRef = doc(db, 'sugManagers', reqData.institutionId);
    const newSugManager: SugManager = {
      managerId: reqData.institutionId,
      userId: reqData.userId,
      institutionId: reqData.institutionId,
      institutionName: reqData.institutionName,
      institutionCategory: reqData.institutionCategory,
      fullName: reqData.applicantName,
      email: reqData.applicantEmail,
      avatar: reqData.applicantAvatar,
      position: reqData.sugPosition,
      status: 'active',
      approvedAt: now,
      approvedBy: reviewerUid,
      approvedByName: reviewerName,
      updatedAt: now,
    };
    batch.set(managerDocRef, sanitizeForFirestore({
      ...newSugManager,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));

    // 4. Update the user's profile with isSugManager flag
    const userDocRef = doc(db, 'users', reqData.userId);
    batch.set(
      userDocRef,
      sanitizeForFirestore({
        isSugManager: true,
        sugInstitutionId: reqData.institutionId,
        sugInstitutionName: reqData.institutionName,
        sugPosition: reqData.sugPosition,
        updatedAt: serverTimestamp(),
      }),
      { merge: true }
    );

    await batch.commit();

    // 5. Audit Log
    await logSugAudit({
      actorUserId: reviewerUid,
      actorName: reviewerName,
      actorRole: 'SUPER_ADMIN',
      action: 'APPROVE_SUG_MANAGER',
      institutionId: reqData.institutionId,
      institutionName: reqData.institutionName,
      metadata: { requestId, approvedUserId: reqData.userId, approvedUserName: reqData.applicantName },
    });

    return { success: true, message: `SUG Manager authorization successfully granted to ${reqData.applicantName}.` };
  } catch (err: any) {
    console.error('Error approving SUG manager:', err);
    throw err;
  }
};

/**
 * Reject a pending SUG Manager request (Grobaax Admin Action)
 */
export const rejectSugManagerRequest = async (
  requestId: string,
  reviewerUid: string,
  reviewerName: string,
  rejectionReason: string,
  verificationNotes?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const reqDoc = await getDoc(doc(db, 'sugManagerRequests', requestId));
    if (!reqDoc.exists()) throw new Error('Request not found');
    const reqData = reqDoc.data() as SugManagerRequest;
    const now = new Date().toISOString();

    await updateDoc(doc(db, 'sugManagerRequests', requestId), sanitizeForFirestore({
      status: 'rejected',
      reviewedAt: now,
      reviewedBy: reviewerUid,
      reviewedByName: reviewerName,
      rejectionReason: rejectionReason || 'Information provided could not be verified by Grobaax.',
      verificationNotes: verificationNotes || '',
      updatedAt: now,
    }));

    await logSugAudit({
      actorUserId: reviewerUid,
      actorName: reviewerName,
      actorRole: 'SUPER_ADMIN',
      action: 'REJECT_SUG_MANAGER',
      institutionId: reqData.institutionId,
      institutionName: reqData.institutionName,
      metadata: { requestId, rejectionReason },
    });

    return { success: true, message: 'Request has been rejected.' };
  } catch (err: any) {
    console.error('Error rejecting SUG manager request:', err);
    throw err;
  }
};

/**
 * Suspend or Revoke an active SUG Manager (Grobaax Admin Action)
 */
export const updateSugManagerStatus = async (
  institutionId: string,
  newStatus: 'active' | 'suspended' | 'revoked',
  reviewerUid: string,
  reviewerName: string,
  reason?: string
): Promise<void> => {
  try {
    const managerDoc = await getDoc(doc(db, 'sugManagers', institutionId));
    if (!managerDoc.exists()) throw new Error('SUG Manager not found');
    const managerData = managerDoc.data() as SugManager;
    const now = new Date().toISOString();

    const batch = writeBatch(db);
    batch.update(doc(db, 'sugManagers', institutionId), sanitizeForFirestore({
      status: newStatus,
      updatedAt: now,
      statusChangeReason: reason || '',
    }));

    if (newStatus !== 'active') {
      // Remove flag from user
      batch.update(doc(db, 'users', managerData.userId), {
        isSugManager: false,
      });
    } else {
      batch.update(doc(db, 'users', managerData.userId), {
        isSugManager: true,
        sugInstitutionId: managerData.institutionId,
      });
    }

    await batch.commit();

    await logSugAudit({
      actorUserId: reviewerUid,
      actorName: reviewerName,
      actorRole: 'SUPER_ADMIN',
      action: `UPDATE_SUG_MANAGER_STATUS_${newStatus.toUpperCase()}`,
      institutionId: managerData.institutionId,
      institutionName: managerData.institutionName,
      metadata: { managerUserId: managerData.userId, newStatus, reason },
    });
  } catch (err) {
    console.error('Error updating SUG manager status:', err);
    throw err;
  }
};

/**
 * Revoke SUG Manager Authorization (Alias for Admin Panel)
 */
export const revokeSugManagerAuthorization = async (
  institutionIdOrManagerId: string,
  adminUid: string,
  adminName: string,
  reason?: string
): Promise<{ success: boolean; message: string }> => {
  await updateSugManagerStatus(institutionIdOrManagerId, 'revoked', adminUid, adminName, reason);
  return { success: true, message: 'SUG Manager authorization successfully revoked.' };
};

/**
 * Create a new SUG Voting Campaign
 */
export const createSugCampaignInFirestore = async (
  campaign: Omit<SugCampaign, 'campaignId' | 'createdAt' | 'updatedAt' | 'totalVotesCount'>,
  actorUid: string,
  actorName: string,
  actorRole: string
): Promise<string> => {
  try {
    const campaignId = `sug_camp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newCampaign: SugCampaign = {
      ...campaign,
      campaignId,
      totalVotesCount: 0,
      sectionsCount: 0,
      positionsCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, 'sugCampaigns', campaignId), sanitizeForFirestore({
      ...newCampaign,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));

    await logSugAudit({
      actorUserId: actorUid,
      actorName,
      actorRole,
      action: 'CREATE_SUG_CAMPAIGN',
      institutionId: campaign.institutionId,
      institutionName: campaign.institutionName,
      campaignId,
      campaignTitle: campaign.title,
    });

    return campaignId;
  } catch (err: any) {
    console.error('Error creating SUG campaign:', err);
    throw err;
  }
};

/**
 * Update an existing SUG Campaign
 */
export const updateSugCampaignInFirestore = async (
  campaignId: string,
  updates: Partial<SugCampaign>,
  actorUid: string,
  actorName: string,
  actorRole: string
): Promise<void> => {
  try {
    const now = new Date().toISOString();
    await updateDoc(doc(db, 'sugCampaigns', campaignId), sanitizeForFirestore({
      ...updates,
      updatedAt: now,
    }));

    await logSugAudit({
      actorUserId: actorUid,
      actorName,
      actorRole,
      action: 'UPDATE_SUG_CAMPAIGN',
      institutionId: updates.institutionId || '',
      campaignId,
      campaignTitle: updates.title,
    });
  } catch (err) {
    console.error('Error updating SUG campaign:', err);
    throw err;
  }
};

/**
 * Publish a Campaign (Transitions from Draft -> Scheduled / Voting Open)
 */
export const publishSugCampaignInFirestore = async (
  campaignId: string,
  actorUid: string,
  actorName: string,
  actorRole: string
): Promise<{ success: boolean; status: SugCampaignStatus }> => {
  try {
    const campDoc = await getDoc(doc(db, 'sugCampaigns', campaignId));
    if (!campDoc.exists()) throw new Error('Campaign not found');
    const camp = campDoc.data() as SugCampaign;

    const now = new Date();
    const startDate = new Date(camp.startAt);
    const endDate = new Date(camp.endAt);

    if (endDate <= startDate) {
      throw new Error('Voting end time must be after start time.');
    }

    // Determine initial status based on server time
    let status: SugCampaignStatus = 'Scheduled';
    if (now >= startDate && now <= endDate) {
      status = 'Voting Open';
    } else if (now > endDate) {
      status = 'Voting Closed';
    }

    const nowIso = now.toISOString();
    await updateDoc(doc(db, 'sugCampaigns', campaignId), sanitizeForFirestore({
      status,
      publishedAt: nowIso,
      updatedAt: nowIso,
    }));

    await logSugAudit({
      actorUserId: actorUid,
      actorName,
      actorRole,
      action: 'PUBLISH_SUG_CAMPAIGN',
      institutionId: camp.institutionId,
      institutionName: camp.institutionName,
      campaignId,
      campaignTitle: camp.title,
      metadata: { status },
    });

    return { success: true, status };
  } catch (err) {
    console.error('Error publishing SUG campaign:', err);
    throw err;
  }
};

/**
 * Conclude/End an active SUG Campaign and calculate/certify/publish final results.
 * Iterates through all elective positions, finalizes tallies, determines winners/ties,
 * updates the results documents to status 'final' (or 'tie_pending'), and marks the campaign
 * status as 'Results Published' so that results become immediately visible to students.
 */
export const endSugCampaignInFirestore = async (
  campaignId: string,
  actorUid: string,
  actorName: string,
  actorRole: string
): Promise<{ success: boolean; status: SugCampaignStatus; message: string }> => {
  try {
    const campDoc = await getDoc(doc(db, 'sugCampaigns', campaignId));
    if (!campDoc.exists()) throw new Error('Campaign not found in database.');
    const camp = campDoc.data() as SugCampaign;

    const nowIso = new Date().toISOString();

    // 1. Fetch all positions for this campaign
    const posQuery = query(collection(db, 'sugPositions'), where('campaignId', '==', campaignId));
    const posSnap = await getDocs(posQuery);
    const positionsList: SugPosition[] = [];
    posSnap.forEach((d) => {
      positionsList.push({ ...(d.data() as SugPosition), positionId: d.id });
    });

    // 2. Fetch all candidates for this campaign
    const candQuery = query(collection(db, 'sugCandidates'), where('campaignId', '==', campaignId));
    const candSnap = await getDocs(candQuery);
    const candidatesList: SugCandidate[] = [];
    candSnap.forEach((d) => {
      candidatesList.push({ ...(d.data() as SugCandidate), candidateId: d.id });
    });

    // 3. For each position, compute certified tallies & determine winners
    for (const pos of positionsList) {
      const posCandidates = candidatesList.filter((c) => c.positionId === pos.positionId);
      await finalizeSugPositionResults(campaignId, pos.positionId, posCandidates);
    }

    // 4. Update the campaign record in Firestore
    await updateDoc(doc(db, 'sugCampaigns', campaignId), sanitizeForFirestore({
      status: 'Results Published',
      resultsVisibility: 'live',
      concludedAt: nowIso,
      publishedAt: camp.publishedAt || nowIso,
      updatedAt: nowIso,
    }));

    // 5. Create SUG Audit Log
    await logSugAudit({
      actorUserId: actorUid,
      actorName,
      actorRole,
      action: 'END_SUG_CAMPAIGN',
      institutionId: camp.institutionId,
      institutionName: camp.institutionName,
      campaignId,
      campaignTitle: camp.title,
      metadata: {
        status: 'Results Published',
        positionsFinalized: positionsList.length,
        totalCandidates: candidatesList.length,
      },
    });

    return {
      success: true,
      status: 'Results Published',
      message: 'Campaign concluded successfully! Official election results have been certified and published for all students.',
    };
  } catch (err) {
    console.error('Error ending SUG campaign in Firestore:', err);
    throw err;
  }
};

/**
 * Re-open voting on an ended/scheduled SUG campaign (Admin / SUG Manager)
 */
export const reopenSugCampaignInFirestore = async (
  campaignId: string,
  newEndAt: string,
  actorUid: string,
  actorName: string,
  actorRole: string
): Promise<{ success: boolean; status: SugCampaignStatus }> => {
  try {
    const nowIso = new Date().toISOString();
    await updateDoc(doc(db, 'sugCampaigns', campaignId), sanitizeForFirestore({
      status: 'Voting Open',
      endAt: newEndAt,
      updatedAt: nowIso,
    }));

    await logSugAudit({
      actorUserId: actorUid,
      actorName,
      actorRole,
      action: 'REOPEN_SUG_CAMPAIGN',
      institutionId: '',
      campaignId,
      metadata: { newEndAt, status: 'Voting Open' },
    });

    return { success: true, status: 'Voting Open' };
  } catch (err) {
    console.error('Error reopening SUG campaign:', err);
    throw err;
  }
};

/**
 * Archive a completed SUG Campaign
 */
export const archiveSugCampaignInFirestore = async (
  campaignId: string,
  actorUid: string,
  actorName: string,
  actorRole: string
): Promise<void> => {
  try {
    const nowIso = new Date().toISOString();
    await updateDoc(doc(db, 'sugCampaigns', campaignId), sanitizeForFirestore({
      status: 'Archived',
      archivedAt: nowIso,
      updatedAt: nowIso,
    }));

    await logSugAudit({
      actorUserId: actorUid,
      actorName,
      actorRole,
      action: 'ARCHIVE_SUG_CAMPAIGN',
      institutionId: '',
      campaignId,
    });
  } catch (err) {
    console.error('Error archiving SUG campaign:', err);
    throw err;
  }
};

/**
 * Delete a SUG Campaign and all its sub-records (Admin / Authorized Manager)
 */
export const deleteSugCampaignFromFirestore = async (
  campaignId: string,
  actorUid: string,
  actorName: string,
  actorRole: string
): Promise<void> => {
  try {
    // 0. Get campaign data for audit log
    let institutionId = '';
    let campaignTitle = '';
    try {
      const campDoc = await getDoc(doc(db, 'sugCampaigns', campaignId));
      if (campDoc.exists()) {
        const d = campDoc.data();
        institutionId = d.institutionId || '';
        campaignTitle = d.title || '';
      }
    } catch (_) {}

    // 1. Delete sections
    const sectionsQuery = query(collection(db, 'sugSections'), where('campaignId', '==', campaignId));
    const sectionsSnap = await getDocs(sectionsQuery);

    // 2. Delete positions
    const positionsQuery = query(collection(db, 'sugPositions'), where('campaignId', '==', campaignId));
    const positionsSnap = await getDocs(positionsQuery);

    // 3. Delete candidates
    const candidatesQuery = query(collection(db, 'sugCandidates'), where('campaignId', '==', campaignId));
    const candidatesSnap = await getDocs(candidatesQuery);

    // 4. Delete results
    const resultsQuery = query(collection(db, 'sugResults'), where('campaignId', '==', campaignId));
    const resultsSnap = await getDocs(resultsQuery);

    // 5. Delete votes
    const votesQuery = query(collection(db, 'sugVotes'), where('campaignId', '==', campaignId));
    const votesSnap = await getDocs(votesQuery);

    const allRefs: any[] = [];
    sectionsSnap.forEach((d) => allRefs.push(d.ref));
    positionsSnap.forEach((d) => allRefs.push(d.ref));
    candidatesSnap.forEach((d) => allRefs.push(d.ref));
    resultsSnap.forEach((d) => allRefs.push(d.ref));
    votesSnap.forEach((d) => allRefs.push(d.ref));
    allRefs.push(doc(db, 'sugCampaigns', campaignId));

    // Delete in batches of 400 to respect Firestore batch limits
    const CHUNK_SIZE = 400;
    for (let i = 0; i < allRefs.length; i += CHUNK_SIZE) {
      const chunk = allRefs.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((ref) => batch.delete(ref));
      await batch.commit();
    }

    await logSugAudit({
      actorUserId: actorUid,
      actorName,
      actorRole,
      action: 'DELETE_SUG_CAMPAIGN',
      institutionId,
      campaignId,
      campaignTitle,
    });
  } catch (err) {
    console.error('Error deleting SUG campaign:', err);
    throw err;
  }
};

// ==========================================
// SECTIONS, POSITIONS, AND CANDIDATES MANAGEMENT
// ==========================================

export const saveSugSection = async (
  section: Omit<SugSection, 'sectionId' | 'createdAt' | 'updatedAt'> & { sectionId?: string }
): Promise<string> => {
  try {
    const sectionId = section.sectionId || `sug_sec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const docData: SugSection = {
      ...section,
      sectionId,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(doc(db, 'sugSections', sectionId), sanitizeForFirestore({
      ...docData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }), { merge: true });

    // Increment sections count on campaign
    await updateDoc(doc(db, 'sugCampaigns', section.campaignId), sanitizeForFirestore({
      sectionsCount: increment(section.sectionId ? 0 : 1),
      updatedAt: now,
    }));

    return sectionId;
  } catch (err) {
    console.error('Error saving SUG section:', err);
    throw err;
  }
};

export const deleteSugSection = async (sectionId: string, campaignId: string): Promise<void> => {
  try {
    // Delete attached positions & candidates
    const posQuery = query(collection(db, 'sugPositions'), where('sectionId', '==', sectionId));
    const posSnap = await getDocs(posQuery);
    const candQuery = query(collection(db, 'sugCandidates'), where('sectionId', '==', sectionId));
    const candSnap = await getDocs(candQuery);

    const batch = writeBatch(db);
    posSnap.forEach((d) => batch.delete(d.ref));
    candSnap.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, 'sugSections', sectionId));
    batch.update(doc(db, 'sugCampaigns', campaignId), sanitizeForFirestore({
      sectionsCount: increment(-1),
      updatedAt: new Date().toISOString(),
    }));
    await batch.commit();
  } catch (err) {
    console.error('Error deleting SUG section:', err);
    throw err;
  }
};

export const saveSugPosition = async (
  position: Omit<SugPosition, 'positionId' | 'createdAt' | 'updatedAt'> & { positionId?: string }
): Promise<string> => {
  try {
    const positionId = position.positionId || `sug_pos_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const docData: SugPosition = {
      ...position,
      positionId,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(doc(db, 'sugPositions', positionId), sanitizeForFirestore({
      ...docData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }), { merge: true });

    // Initialize result record for position if creating new
    if (!position.positionId) {
      const resultDocRef = doc(db, 'sugResults', `${position.campaignId}_${positionId}`);
      const initialResult: SugResult = {
        resultId: `${position.campaignId}_${positionId}`,
        campaignId: position.campaignId,
        sectionId: position.sectionId,
        positionId,
        positionTitle: position.title,
        candidateTotals: {},
        totalVotes: 0,
        status: 'provisional',
        calculatedAt: now,
      };
      await setDoc(resultDocRef, sanitizeForFirestore(initialResult), { merge: true });

      // Update positions count on campaign
      await updateDoc(doc(db, 'sugCampaigns', position.campaignId), sanitizeForFirestore({
        positionsCount: increment(1),
        updatedAt: now,
      }));
    }

    return positionId;
  } catch (err) {
    console.error('Error saving SUG position:', err);
    throw err;
  }
};

export const deleteSugPosition = async (positionId: string, campaignId: string): Promise<void> => {
  try {
    const candQuery = query(collection(db, 'sugCandidates'), where('positionId', '==', positionId));
    const candSnap = await getDocs(candQuery);

    const batch = writeBatch(db);
    candSnap.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, 'sugPositions', positionId));
    batch.delete(doc(db, 'sugResults', `${campaignId}_${positionId}`));
    batch.update(doc(db, 'sugCampaigns', campaignId), sanitizeForFirestore({
      positionsCount: increment(-1),
      updatedAt: new Date().toISOString(),
    }));
    await batch.commit();
  } catch (err) {
    console.error('Error deleting SUG position:', err);
    throw err;
  }
};

export const saveSugCandidate = async (
  candidate: Omit<SugCandidate, 'candidateId' | 'createdAt' | 'updatedAt'> & { candidateId?: string }
): Promise<string> => {
  try {
    const candidateId = candidate.candidateId || `sug_cand_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const docData: SugCandidate = {
      ...candidate,
      candidateId,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(doc(db, 'sugCandidates', candidateId), sanitizeForFirestore({
      ...docData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }), { merge: true });

    // Increment candidates count on position
    if (!candidate.candidateId) {
      await updateDoc(doc(db, 'sugPositions', candidate.positionId), sanitizeForFirestore({
        candidatesCount: increment(1),
        updatedAt: now,
      }));
    }

    return candidateId;
  } catch (err) {
    console.error('Error saving candidate:', err);
    throw err;
  }
};

export const deleteSugCandidate = async (candidateId: string, positionId: string): Promise<void> => {
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'sugCandidates', candidateId));
    batch.update(doc(db, 'sugPositions', positionId), sanitizeForFirestore({
      candidatesCount: increment(-1),
      updatedAt: new Date().toISOString(),
    }));
    await batch.commit();
  } catch (err) {
    console.error('Error deleting SUG candidate:', err);
    throw err;
  }
};

// ==========================================
// SECURE VOTING & RESULT ENGINE
// ==========================================

/**
 * Submit an eligible vote for a specific candidate & position.
 * Atomic idempotency key: `${campaignId}_${positionId}_${voterEligibilityKey}`.
 * Strictly prevents double-voting on backend!
 */
export const submitSugVoteInFirestore = async (votePayload: {
  campaignId: string;
  sectionId: string;
  positionId: string;
  candidateId: string;
  candidateName?: string;
  institutionId: string;
  facultyId?: string;
  departmentId?: string;
  voterProfile: UserProfile;
}): Promise<{ success: boolean; message: string }> => {
  try {
    const { campaignId, sectionId, positionId, candidateId, institutionId, voterProfile } = votePayload;
    const voterUid = voterProfile.id || voterProfile.uid;
    if (!voterUid) {
      throw new Error('User must be authenticated to cast a vote.');
    }

    // 1. Verify Campaign State
    const campDoc = await getDoc(doc(db, 'sugCampaigns', campaignId));
    if (!campDoc.exists()) throw new Error('Election campaign not found.');
    const camp = campDoc.data() as SugCampaign;

    const now = new Date();
    const startDate = new Date(camp.startAt);
    const endDate = new Date(camp.endAt);

    if (now < startDate) {
      throw new Error(`Voting has not opened yet. It starts on ${startDate.toLocaleString()}.`);
    }
    if (now > endDate || camp.status === 'Voting Closed' || camp.status === 'Archived') {
      throw new Error('Voting for this election campaign is closed.');
    }
    if (camp.status === 'Suspended') {
      throw new Error('This election is currently suspended by Grobaax administration.');
    }

    // 2. Verify Academic Institution Match
    const studentInstId = voterProfile.institutionId || voterProfile.academicProfile?.institutionId;
    if (studentInstId !== camp.institutionId) {
      throw new Error(
        `You are not eligible to vote in this election. This election is strictly restricted to students of ${camp.institutionName}.`
      );
    }

    // 3. Verify Section Scope (Faculty / Department restrictions)
    const secDoc = await getDoc(doc(db, 'sugSections', sectionId));
    if (secDoc.exists()) {
      const section = secDoc.data() as SugSection;
      if (section.scopeType === 'department' && section.departmentId) {
        const studentDeptId = voterProfile.departmentId || voterProfile.academicProfile?.departmentId;
        const studentDeptName = (voterProfile.department || voterProfile.academicProfile?.departmentName || '').toLowerCase();
        const secDeptName = (section.departmentName || '').toLowerCase();

        const deptMatches =
          (studentDeptId && studentDeptId === section.departmentId) ||
          (studentDeptName && secDeptName && (studentDeptName.includes(secDeptName) || secDeptName.includes(studentDeptName)));

        if (!deptMatches) {
          throw new Error(
            `You are not eligible to vote in this section (${section.title}). It is restricted to students of ${section.departmentName || 'the department'}.`
          );
        }
      }
    }

    // 4. Duplicate Vote Check (Atomic Document ID)
    const voteDocId = `${campaignId}_${positionId}_${voterUid}`;
    const existingVoteDoc = await getDoc(doc(db, 'sugVotes', voteDocId));
    if (existingVoteDoc.exists()) {
      throw new Error('You have already submitted a vote for this position. Votes cannot be recast.');
    }

    // 5. Submit Vote & Atomic Result Aggregate
    const nowIso = now.toISOString();
    const newVote: SugVote = {
      voteId: voteDocId,
      campaignId,
      sectionId,
      positionId,
      candidateId,
      institutionId,
      facultyId: votePayload.facultyId,
      departmentId: votePayload.departmentId,
      voterEligibilityKey: voterUid,
      submittedAt: nowIso,
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'sugVotes', voteDocId), sanitizeForFirestore({
      ...newVote,
      createdAt: serverTimestamp(),
    }));

    // Update Result tally atomically
    const resultDocRef = doc(db, 'sugResults', `${campaignId}_${positionId}`);
    batch.set(
      resultDocRef,
      sanitizeForFirestore({
        campaignId,
        sectionId,
        positionId,
        [`candidateTotals.${candidateId}`]: increment(1),
        totalVotes: increment(1),
        calculatedAt: nowIso,
      }),
      { merge: true }
    );

    // Update campaign total votes
    batch.update(doc(db, 'sugCampaigns', campaignId), sanitizeForFirestore({
      totalVotesCount: increment(1),
      updatedAt: nowIso,
    }));

    await batch.commit();

    return { success: true, message: 'Vote submitted and verified successfully!' };
  } catch (err: any) {
    console.error('Error submitting vote:', err);
    throw err;
  }
};

/**
 * Check if the current user has already cast a vote for a position
 */
export const checkUserHasVotedForPosition = async (
  campaignId: string,
  positionId: string,
  userId: string
): Promise<boolean> => {
  try {
    const voteDocId = `${campaignId}_${positionId}_${userId}`;
    const docSnap = await getDoc(doc(db, 'sugVotes', voteDocId));
    return docSnap.exists();
  } catch (err) {
    console.warn('Error checking vote status:', err);
    return false;
  }
};

/**
 * Get all vote status mappings for a user across a campaign's positions
 */
export const getUserCampaignVotes = async (
  campaignId: string,
  userId: string
): Promise<Record<string, string>> => {
  try {
    const q = query(
      collection(db, 'sugVotes'),
      where('campaignId', '==', campaignId),
      where('voterEligibilityKey', '==', userId)
    );
    const snap = await getDocs(q);
    const votedMap: Record<string, string> = {};
    snap.forEach((d) => {
      const vote = d.data() as SugVote;
      votedMap[vote.positionId] = vote.candidateId;
    });
    return votedMap;
  } catch (err) {
    console.warn('Error loading user campaign votes:', err);
    return {};
  }
};

/**
 * Calculate & Finalize Position Results with Tie Detection
 */
export const finalizeSugPositionResults = async (
  campaignId: string,
  positionId: string,
  candidates: SugCandidate[]
): Promise<SugResult> => {
  try {
    const resultDocRef = doc(db, 'sugResults', `${campaignId}_${positionId}`);
    const resultSnap = await getDoc(resultDocRef);
    const resultData = resultSnap.exists() ? (resultSnap.data() as SugResult) : null;
    const totals = resultData?.candidateTotals || {};

    let maxVotes = -1;
    let candidatesWithMaxVotes: string[] = [];
    let totalVotes = 0;

    for (const c of candidates) {
      const count = totals[c.candidateId] || 0;
      totalVotes += count;
      if (count > maxVotes) {
        maxVotes = count;
        candidatesWithMaxVotes = [c.candidateId];
      } else if (count === maxVotes && count > 0) {
        candidatesWithMaxVotes.push(c.candidateId);
      }
    }

    const isTie = candidatesWithMaxVotes.length > 1;
    const winnerId = isTie || maxVotes <= 0 ? undefined : candidatesWithMaxVotes[0];
    const winnerName = winnerId ? candidates.find((c) => c.candidateId === winnerId)?.fullName : undefined;

    const finalResult: SugResult = {
      resultId: `${campaignId}_${positionId}`,
      campaignId,
      sectionId: candidates[0]?.sectionId || '',
      positionId,
      candidateTotals: totals,
      totalVotes,
      winnerCandidateId: winnerId,
      winnerCandidateName: winnerName,
      isTie,
      tieCandidateIds: isTie ? candidatesWithMaxVotes : [],
      status: isTie ? 'tie_pending' : 'final',
      calculatedAt: new Date().toISOString(),
    };

    await setDoc(resultDocRef, sanitizeForFirestore(finalResult), { merge: true });
    return finalResult;
  } catch (err) {
    console.error('Error finalizing position results:', err);
    throw err;
  }
};

/**
 * Resolve an Election Tie (Grobaax Admin Procedure)
 */
export const resolveSugTieInFirestore = async (
  campaignId: string,
  positionId: string,
  resolvedWinnerCandidateId: string,
  resolvedWinnerName: string,
  adminUid: string,
  adminName: string,
  notes: string
): Promise<void> => {
  try {
    const resultDocRef = doc(db, 'sugResults', `${campaignId}_${positionId}`);
    const nowIso = new Date().toISOString();

    await updateDoc(resultDocRef, sanitizeForFirestore({
      winnerCandidateId: resolvedWinnerCandidateId,
      winnerCandidateName: resolvedWinnerName,
      resolvedWinnerCandidateId,
      status: 'resolved',
      isTie: false,
      tieResolutionNotes: notes,
      resolvedAt: nowIso,
      resolvedBy: adminUid,
      resolvedByName: adminName,
    }));

    await logSugAudit({
      actorUserId: adminUid,
      actorName: adminName,
      actorRole: 'SUPER_ADMIN',
      action: 'RESOLVE_SUG_TIE',
      campaignId,
      positionId,
      institutionId: '',
      metadata: { resolvedWinnerCandidateId, resolvedWinnerName, notes },
    });
  } catch (err) {
    console.error('Error resolving SUG tie:', err);
    throw err;
  }
};

/**
 * Resolve SUG Tie Breaker with Payload Object (Admin view wrapper)
 */
export const resolveSugTieBreakerInFirestore = async (payload: {
  campaignId: string;
  positionId: string;
  winnerCandidateId: string;
  winnerCandidateName: string;
  adminUid: string;
  adminName: string;
  resolutionNotes: string;
}): Promise<{ success: boolean; message: string }> => {
  await resolveSugTieInFirestore(
    payload.campaignId,
    payload.positionId,
    payload.winnerCandidateId,
    payload.winnerCandidateName,
    payload.adminUid,
    payload.adminName,
    payload.resolutionNotes
  );
  return { success: true, message: `Tie successfully resolved in favor of ${payload.winnerCandidateName}.` };
};

/**
 * Seed initial sample SUG Election campaigns if Firestore is clean
 */
export const seedDefaultSugElectionsIfEmpty = async () => {
  try {
    if (typeof window !== 'undefined' && localStorage.getItem('grobax_seeded_sug')) {
      return;
    }
    const campQuery = query(collection(db, 'sugCampaigns'), limit(1));
    const snap = await getDocs(campQuery);
    if (snap.empty) {
      console.log('Seeding demo SUG election campaigns...');

      const demoCampaignId = 'camp_unilag_sug_2026';
      const now = new Date();
      const startDate = new Date(now.getTime() - 2 * 3600 * 1000).toISOString(); // Started 2h ago
      const endDate = new Date(now.getTime() + 48 * 3600 * 1000).toISOString(); // Ends in 48h

      // 1. Campaign
      const demoCampaign: SugCampaign = {
        campaignId: demoCampaignId,
        institutionId: 'inst_unilag_1',
        institutionName: 'University of Lagos (UNILAG)',
        institutionLogo: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=200&auto=format&fit=crop&q=80',
        institutionCategory: 'University',
        createdBy: PRIMARY_SUPER_ADMIN_UID,
        createdByName: 'Grobaax Electoral Commission',
        managerId: PRIMARY_SUPER_ADMIN_UID,
        title: 'UNILAG General Students Union Government & Faculty Elections 2026',
        campaignType: 'general_sug',
        description:
          'Official University of Lagos 2026 SUG and Inter-Faculty Executive Council online elections. Cast your digital ballot securely with zero paperwork.',
        coverImage: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=1200&auto=format&fit=crop&q=80',
        electionInstructions:
          'Each verified UNILAG student has exactly 1 ballot vote per position. Voting is cryptographically logged and irreversible once confirmed.',
        status: 'Voting Open',
        startAt: startDate,
        endAt: endDate,
        publicVisibility: true,
        resultsVisibility: 'live',
        sectionsCount: 3,
        positionsCount: 4,
        totalVotesCount: 680,
        createdAt: startDate,
        updatedAt: now.toISOString(),
        publishedAt: startDate,
      };

      await setDoc(doc(db, 'sugCampaigns', demoCampaignId), demoCampaign);

      // 2. Sections
      const secGeneral: SugSection = {
        sectionId: 'sec_unilag_general',
        campaignId: demoCampaignId,
        institutionId: 'inst_unilag_1',
        title: 'General SUG Executive Council',
        description: 'Institution-wide positions voted on by all registered UNILAG students.',
        scopeType: 'institution',
        order: 1,
        status: 'active',
        createdAt: startDate,
        updatedAt: startDate,
      };

      const secEngineering: SugSection = {
        sectionId: 'sec_unilag_engineering',
        campaignId: demoCampaignId,
        institutionId: 'inst_unilag_1',
        title: 'Faculty of Engineering (UES)',
        description: 'Open to registered students in the Faculty of Engineering.',
        scopeType: 'faculty',
        facultyId: 'fac_engineering',
        facultyName: 'Faculty of Engineering',
        order: 2,
        status: 'active',
        createdAt: startDate,
        updatedAt: startDate,
      };

      const secCompSci: SugSection = {
        sectionId: 'sec_unilag_cs',
        campaignId: demoCampaignId,
        institutionId: 'inst_unilag_1',
        title: 'Department of Computer Science (NACOSS)',
        description: 'Open strictly to Department of Computer Science students.',
        scopeType: 'department',
        departmentId: 'dept_cs',
        departmentName: 'Computer Science',
        order: 3,
        status: 'active',
        createdAt: startDate,
        updatedAt: startDate,
      };

      await setDoc(doc(db, 'sugSections', secGeneral.sectionId), secGeneral);
      await setDoc(doc(db, 'sugSections', secEngineering.sectionId), secEngineering);
      await setDoc(doc(db, 'sugSections', secCompSci.sectionId), secCompSci);

      // 3. Dynamic Custom Positions
      const posPresident: SugPosition = {
        positionId: 'pos_sug_pres',
        campaignId: demoCampaignId,
        sectionId: secGeneral.sectionId,
        institutionId: 'inst_unilag_1',
        title: 'SUG President',
        description: 'Chief executive leader of the UNILAG Students Union Government.',
        order: 1,
        status: 'active',
        candidatesCount: 3,
        createdAt: startDate,
        updatedAt: startDate,
      };

      const posSportsDirector: SugPosition = {
        positionId: 'pos_sug_sports',
        campaignId: demoCampaignId,
        sectionId: secGeneral.sectionId,
        institutionId: 'inst_unilag_1',
        title: 'Director of Sports & Athletic Affairs',
        description: 'Coordinates inter-faculty leagues, marathon meets, and campus sports festivals.',
        order: 2,
        status: 'active',
        candidatesCount: 2,
        createdAt: startDate,
        updatedAt: startDate,
      };

      const posEngPresident: SugPosition = {
        positionId: 'pos_eng_pres',
        campaignId: demoCampaignId,
        sectionId: secEngineering.sectionId,
        institutionId: 'inst_unilag_1',
        title: 'Faculty President (UES)',
        description: 'Leads the Engineering Students Association council.',
        order: 1,
        status: 'active',
        candidatesCount: 2,
        createdAt: startDate,
        updatedAt: startDate,
      };

      const posCsPresident: SugPosition = {
        positionId: 'pos_cs_pres',
        campaignId: demoCampaignId,
        sectionId: secCompSci.sectionId,
        institutionId: 'inst_unilag_1',
        title: 'Departmental President (NACOSS)',
        description: 'Leads the Department of Computer Science student association.',
        order: 1,
        status: 'active',
        candidatesCount: 2,
        createdAt: startDate,
        updatedAt: startDate,
      };

      await setDoc(doc(db, 'sugPositions', posPresident.positionId), posPresident);
      await setDoc(doc(db, 'sugPositions', posSportsDirector.positionId), posSportsDirector);
      await setDoc(doc(db, 'sugPositions', posEngPresident.positionId), posEngPresident);
      await setDoc(doc(db, 'sugPositions', posCsPresident.positionId), posCsPresident);

      // 4. Candidates
      const c1: SugCandidate = {
        candidateId: 'cand_pres_1',
        campaignId: demoCampaignId,
        sectionId: secGeneral.sectionId,
        positionId: posPresident.positionId,
        institutionId: 'inst_unilag_1',
        fullName: 'Adebayo Oluwaseun',
        profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
        candidateNumber: '01',
        manifesto: 'Transforming campus welfare, subsidized shuttle logistics, and 24/7 solar study libraries across all hostels.',
        biography: 'Final year Law scholar, previous Hall Chairman, and campus student activist.',
        department: 'Law',
        level: '400L',
        status: 'active',
        createdAt: startDate,
        updatedAt: startDate,
      };

      const c2: SugCandidate = {
        candidateId: 'cand_pres_2',
        campaignId: demoCampaignId,
        sectionId: secGeneral.sectionId,
        positionId: posPresident.positionId,
        institutionId: 'inst_unilag_1',
        fullName: 'Chiamaka Nwachukwu',
        profileImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
        candidateNumber: '02',
        manifesto: 'Digital academic transparency, mental health support centers, and automated hostel maintenance tickets.',
        biography: '400L Computer Science scholar, Grobaax campus ambassador, and tech community lead.',
        department: 'Computer Science',
        level: '400L',
        status: 'active',
        createdAt: startDate,
        updatedAt: startDate,
      };

      const c3: SugCandidate = {
        candidateId: 'cand_pres_3',
        campaignId: demoCampaignId,
        sectionId: secGeneral.sectionId,
        positionId: posPresident.positionId,
        institutionId: 'inst_unilag_1',
        fullName: 'Ibrahim Danjuma',
        profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
        candidateNumber: '03',
        manifesto: 'Youth empowerment internships, sports arena renovations, and zero tuition penalty advocacy.',
        biography: 'Economics senior honor student with proven leadership track record in debating societies.',
        department: 'Economics',
        level: '300L',
        status: 'active',
        createdAt: startDate,
        updatedAt: startDate,
      };

      await setDoc(doc(db, 'sugCandidates', c1.candidateId), c1);
      await setDoc(doc(db, 'sugCandidates', c2.candidateId), c2);
      await setDoc(doc(db, 'sugCandidates', c3.candidateId), c3);

      // Initial results
      await setDoc(doc(db, 'sugResults', `${demoCampaignId}_${posPresident.positionId}`), {
        resultId: `${demoCampaignId}_${posPresident.positionId}`,
        campaignId: demoCampaignId,
        sectionId: secGeneral.sectionId,
        positionId: posPresident.positionId,
        positionTitle: posPresident.title,
        candidateTotals: {
          [c1.candidateId]: 295,
          [c2.candidateId]: 310,
          [c3.candidateId]: 75,
        },
        totalVotes: 680,
        status: 'provisional',
        winnerCandidateId: c2.candidateId,
        winnerCandidateName: c2.fullName,
        isTie: false,
        calculatedAt: now.toISOString(),
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('grobax_seeded_sug', 'true');
      }
      console.log('Seeded sample SUG election campaigns to Firestore.');
    } else {
      if (typeof window !== 'undefined') {
        localStorage.setItem('grobax_seeded_sug', 'true');
      }
    }
  } catch (err) {
    console.warn('SUG initial seed notice:', err);
  }
};

// =========================================================================
// GROBAAX MINIMART FIRESTORE OPERATIONS
// =========================================================================

export const fetchMinimartConfigFromFirestore = async (): Promise<MinimartConfig> => {
  try {
    const docRef = doc(db, 'minimartConfig', 'global');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as MinimartConfig;
    }
  } catch (err) {
    console.warn('Error fetching Minimart config from Firestore:', err);
  }
  return DEFAULT_MINIMART_CONFIG;
};

export const saveMinimartConfigToFirestore = async (config: Partial<MinimartConfig>): Promise<void> => {
  try {
    const docRef = doc(db, 'minimartConfig', 'global');
    await setDoc(docRef, { ...config, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    console.warn('Error saving Minimart config to Firestore:', err);
  }
};

export const saveMinimartProductToFirestore = async (product: MinimartProduct): Promise<void> => {
  try {
    const docRef = doc(db, 'minimartProducts', product.id);
    await setDoc(docRef, {
      ...product,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Error saving Minimart product to Firestore:', err);
  }
};

export const updateMinimartProductStatusInFirestore = async (
  productId: string,
  status: MinimartProduct['status']
): Promise<void> => {
  try {
    const docRef = doc(db, 'minimartProducts', productId);
    await updateDoc(docRef, {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Error updating Minimart product status in Firestore:', err);
  }
};

export const deleteMinimartProductFromFirestore = async (productId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'minimartProducts', productId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Direct deleteDoc notice, falling back to status update:', err);
    try {
      const docRef = doc(db, 'minimartProducts', productId);
      await updateDoc(docRef, {
        status: 'removed',
        updatedAt: new Date().toISOString(),
      });
    } catch (fallbackErr) {
      console.warn('Error marking Minimart product status in Firestore:', fallbackErr);
    }
  }

  // Also clean up any associated reports in Firestore
  try {
    const repSnap = await getDocs(
      query(collection(db, 'minimartReports'), where('productId', '==', productId))
    );
    if (!repSnap.empty) {
      const batch = writeBatch(db);
      repSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (repErr) {
    console.warn('Notice cleaning up minimart reports:', repErr);
  }
};

export const submitMinimartReportToFirestore = async (report: MinimartReport): Promise<void> => {
  try {
    const docRef = doc(db, 'minimartReports', report.id);
    await setDoc(docRef, {
      ...report,
      createdAt: new Date().toISOString(),
    });
    // Increment report counter on the product
    const productRef = doc(db, 'minimartProducts', report.productId);
    await updateDoc(productRef, {
      reportsCount: increment(1),
    });
  } catch (err) {
    console.warn('Error submitting Minimart report to Firestore:', err);
  }
};

export const moderateMinimartReportInFirestore = async (
  reportId: string,
  action: 'dismiss' | 'resolve' | 'suspend_product',
  adminNotes?: string,
  adminId?: string
): Promise<void> => {
  try {
    const reportRef = doc(db, 'minimartReports', reportId);
    const reportSnap = await getDoc(reportRef);
    if (reportSnap.exists()) {
      const data = reportSnap.data() as MinimartReport;
      await updateDoc(reportRef, {
        status: action === 'dismiss' ? 'dismissed' : 'resolved',
        reviewedAt: new Date().toISOString(),
        reviewedBy: adminId || 'Admin',
        adminNotes: adminNotes || '',
      });

      if (action === 'suspend_product' && data.productId) {
        await updateMinimartProductStatusInFirestore(data.productId, 'suspended');
      }
    }
  } catch (err) {
    console.warn('Error moderating Minimart report in Firestore:', err);
  }
};

export const saveMinimartCategoryToFirestore = async (category: MinimartCategory): Promise<void> => {
  try {
    const docRef = doc(db, 'minimartCategories', category.id);
    await setDoc(docRef, {
      ...category,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('Error saving Minimart category to Firestore:', err);
  }
};

export const deleteMinimartCategoryFromFirestore = async (categoryId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'minimartCategories', categoryId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Error deleting Minimart category from Firestore:', err);
  }
};

export const seedInitialMinimartDataToFirestore = async (): Promise<void> => {
  try {
    if (typeof window !== 'undefined' && localStorage.getItem('grobax_seeded_minimart')) {
      return;
    }

    // Seed Config
    const configRef = doc(db, 'minimartConfig', 'global');
    const configSnap = await getDoc(configRef);
    if (!configSnap.exists()) {
      await setDoc(configRef, DEFAULT_MINIMART_CONFIG);
    }

    // Seed Categories
    for (const cat of INITIAL_MINIMART_CATEGORIES) {
      const catRef = doc(db, 'minimartCategories', cat.id);
      const catSnap = await getDoc(catRef);
      if (!catSnap.exists()) {
        await setDoc(catRef, cat);
      }
    }

    // Clean up any legacy mock products (prod_1 through prod_9)
    const mockIds = ['prod_1', 'prod_2', 'prod_3', 'prod_4', 'prod_5', 'prod_6', 'prod_7', 'prod_8', 'prod_9'];
    for (const id of mockIds) {
      try {
        const prodRef = doc(db, 'minimartProducts', id);
        await deleteDoc(prodRef);
      } catch {
        // ignore
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('grobax_seeded_minimart', 'true');
    }
    console.log('Synchronized Minimart categories to Firestore.');
  } catch (err) {
    console.warn('Minimart initial seed notice:', err);
  }
};

export const cleanupMockMinimartProductsFromFirestore = async (): Promise<void> => {
  try {
    const mockIds = ['prod_1', 'prod_2', 'prod_3', 'prod_4', 'prod_5', 'prod_6', 'prod_7', 'prod_8', 'prod_9'];
    for (const id of mockIds) {
      try {
        const prodRef = doc(db, 'minimartProducts', id);
        await deleteDoc(prodRef);
      } catch {
        // ignore
      }
    }
  } catch (err) {
    console.warn('Notice cleaning up mock minimart products:', err);
  }
};

// ==========================================
// COMMUNITY POSTS & ANNOUNCEMENTS REAL-TIME FIRESTORE SYNC
// ==========================================

export const updateCommunityPostInFirestore = async (
  postId: string,
  updates: Partial<Post>
): Promise<void> => {
  try {
    const postRef = doc(db, 'posts', postId);
    const cleanedUpdates: any = {
      ...updates,
      updatedAt: serverTimestamp(),
    };
    if (updates.content !== undefined) cleanedUpdates.content = updates.content;
    if (updates.tags !== undefined) cleanedUpdates.tags = updates.tags;
    if (updates.image !== undefined) cleanedUpdates.image = updates.image;
    if (updates.attachments !== undefined) cleanedUpdates.attachments = updates.attachments;
    await updateDoc(postRef, cleanedUpdates);
  } catch (err) {
    console.warn('Error updating community post in Firestore:', err);
    throw err;
  }
};

export const saveCommunityPostToFirestore = async (post: Post): Promise<void> => {
  try {
    const postRef = doc(db, 'posts', post.id);
    const millis = (post as any).createdAtMillis || (post.id.startsWith('post_') && !isNaN(Number(post.id.split('_')[1])) ? Number(post.id.split('_')[1]) : Date.now());
    // Deep clone stripping all undefined values recursively to prevent Firestore write rejection
    const cleanPost = JSON.parse(JSON.stringify(post, (_, v) => (v === undefined ? null : v)));
    cleanPost.createdAtMillis = millis;
    cleanPost.createdAt = serverTimestamp();
    cleanPost.updatedAt = serverTimestamp();
    await setDoc(postRef, cleanPost, { merge: true });
  } catch (err) {
    console.error('Error saving community post to Firestore:', err);
    throw err;
  }
};

export const toggleLikeCommunityPostInFirestore = async (
  postId: string,
  newLikesCount: number,
  isLiked: boolean
): Promise<void> => {
  try {
    const postRef = doc(db, 'posts', postId);
    await setDoc(
      postRef,
      {
        likes: newLikesCount,
        isLiked,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Error updating post likes in Firestore:', err);
  }
};

export const addCommentToCommunityPostInFirestore = async (
  postId: string,
  updatedComments: PostComment[]
): Promise<void> => {
  try {
    const postRef = doc(db, 'posts', postId);
    const cleanComments = JSON.parse(JSON.stringify(updatedComments, (_, v) => (v === undefined ? null : v)));
    await setDoc(
      postRef,
      {
        commentsList: cleanComments,
        commentsCount: updatedComments.length,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('Error adding comment to post in Firestore:', err);
  }
};

export const saveAnnouncementToFirestore = async (announcement: Announcement): Promise<void> => {
  try {
    const annRef = doc(db, 'announcements', announcement.id);
    await setDoc(annRef, {
      ...announcement,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('Error saving announcement to Firestore:', err);
  }
};

export const deleteAnnouncementFromFirestore = async (announcementId: string): Promise<void> => {
  try {
    const annRef = doc(db, 'announcements', announcementId);
    await deleteDoc(annRef);
  } catch (err) {
    console.warn('Error deleting announcement from Firestore:', err);
  }
};

// =========================================================================
// SPONSORSHIP & ADS FIRESTORE OPERATIONS
// =========================================================================

export const saveSponsorshipCampaignToFirestore = async (
  campaign: SponsorshipCampaign,
  adminUid?: string,
  adminName?: string
): Promise<void> => {
  try {
    const spRef = doc(db, 'sponsors', campaign.id);
    const cleanData: Record<string, any> = {};
    for (const [k, v] of Object.entries(campaign)) {
      if (v !== undefined) {
        cleanData[k] = v;
      }
    }
    cleanData.updatedAt = serverTimestamp();
    await setDoc(spRef, cleanData, { merge: true });
  } catch (err) {
    console.warn('Error saving sponsorship campaign to Firestore:', err);
    throw err;
  }

  if (adminUid) {
    try {
      await logAdminAuditAction(
        adminUid,
        adminName || 'Admin',
        'SAVE_SPONSORSHIP_CAMPAIGN',
        campaign.id,
        {
          title: campaign.title,
          sponsorName: campaign.sponsorName,
          placement: campaign.placement,
          status: campaign.status,
        }
      );
    } catch (auditErr) {
      console.warn('Audit log notice for sponsorship save:', auditErr);
    }
  }
};

export const deleteSponsorshipCampaignFromFirestore = async (
  campaignId: string,
  campaignTitle?: string,
  adminUid?: string,
  adminName?: string
): Promise<void> => {
  try {
    const spRef = doc(db, 'sponsors', campaignId);
    await deleteDoc(spRef);
  } catch (err) {
    console.warn('Error deleting sponsorship campaign from Firestore:', err);
  }

  if (adminUid) {
    try {
      await logAdminAuditAction(
        adminUid,
        adminName || 'Admin',
        'DELETE_SPONSORSHIP_CAMPAIGN',
        campaignId,
        {
          campaignTitle: campaignTitle || '',
        }
      );
    } catch (auditErr) {
      console.warn('Audit log notice for sponsorship delete:', auditErr);
    }
  }
};

export const isMockSponsorshipCampaign = (c: any): boolean => {
  if (!c) return false;
  const id = String(c.id || '');
  if (['sp_1', 'sp_2', 'sp_3', 'sp_feed_1', 'sp_feed_2'].includes(id)) return true;
  if (id.startsWith('mock_sp_')) return true;
  const title = String(c.title || '');
  if (
    title.includes('MTN Scholar Data & Device Grant') ||
    title.includes('Airtel STEM Leadership Challenge') ||
    title.includes('FirstBank Academic Excellence Endowment') ||
    title.includes('MTN Tech Scholars') ||
    title.includes('Google Cloud AI Research Credits')
  ) {
    return true;
  }
  const sponsor = String(c.sponsorName || '');
  if (
    (sponsor.includes('MTN') && title.includes('Scholars')) ||
    (sponsor.includes('Airtel') && title.includes('STEM')) ||
    (sponsor.includes('FirstBank') && title.includes('Endowment')) ||
    (sponsor.includes('Google') && title.includes('Research Credits'))
  ) {
    return true;
  }
  return false;
};

export const cleanupMockSponsorshipCampaignsFromFirestore = async (): Promise<void> => {
  try {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('grobax_saved_sponsorships');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const clean = parsed.filter((c: any) => !isMockSponsorshipCampaign(c));
            localStorage.setItem('grobax_saved_sponsorships', JSON.stringify(clean));
          }
        }
      } catch {}
    }

    const mockIds = ['sp_1', 'sp_2', 'sp_3', 'sp_feed_1', 'sp_feed_2'];
    for (const id of mockIds) {
      try {
        await deleteDoc(doc(db, 'sponsors', id));
      } catch {}
    }

    try {
      const snap = await getDocs(collection(db, 'sponsors'));
      for (const d of snap.docs) {
        if (isMockSponsorshipCampaign({ id: d.id, ...d.data() })) {
          try {
            await deleteDoc(d.ref);
          } catch {}
        }
      }
    } catch {}
  } catch (err) {
    console.warn('Notice during mock sponsorships cleanup:', err);
  }
};

export const deleteUserFromFirestore = async (
  targetUserId: string,
  adminUid?: string,
  adminName?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!targetUserId) throw new Error('Target User ID is required');

    // 1. Fetch user data before deletion if possible to clean up reserved username
    let usernameToFree = '';
    try {
      const userRef = doc(db, 'users', targetUserId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const uData = userSnap.data();
        usernameToFree = uData.username || uData.usernameLower || '';
      }
    } catch (e) {
      console.warn('Could not read user profile prior to deletion:', e);
    }

    // 2. Delete the user document in Firestore
    const userDocRef = doc(db, 'users', targetUserId);
    await deleteDoc(userDocRef);

    // 3. Free the username reservation if exists
    if (usernameToFree) {
      try {
        const usernameRef = doc(db, 'usernames', usernameToFree.toLowerCase());
        await deleteDoc(usernameRef);
      } catch (e) {
        console.warn('Could not delete username reservation doc:', e);
      }
    }

    // 4. Remove manager assignment doc if exists
    try {
      const managerRef = doc(db, 'managerAssignments', targetUserId);
      await deleteDoc(managerRef);
    } catch (e) {}

    // 5. Clean up user subscriptions in Firestore
    try {
      const subQuery = query(collection(db, 'userSubscriptions'), where('userId', '==', targetUserId));
      const subSnap = await getDocs(subQuery);
      for (const subDoc of subSnap.docs) {
        await deleteDoc(subDoc.ref).catch(() => {});
      }
    } catch (subErr) {
      console.warn('Notice cleaning up userSubscriptions for deleted user:', subErr);
    }

    // 6. Clean up student verification requests if any
    try {
      const verifQuery = query(collection(db, 'verificationRequests'), where('userId', '==', targetUserId));
      const verifSnap = await getDocs(verifQuery);
      for (const vDoc of verifSnap.docs) {
        await deleteDoc(vDoc.ref).catch(() => {});
      }
    } catch (vErr) {
      console.warn('Notice cleaning up verificationRequests for deleted user:', vErr);
    }

    // 7. Clean up localStorage cache if on client
    try {
      localStorage.removeItem(`grobax_user_profile_${targetUserId}`);
      localStorage.removeItem(`grobax_custom_profile_${targetUserId}`);
    } catch (e) {}

    // 8. Log admin audit action
    if (adminUid) {
      try {
        await logAdminAuditAction(
          adminUid,
          adminName || 'Super Admin',
          'DELETE_USER_ACCOUNT',
          targetUserId,
          {
            deletedUserId: targetUserId,
            username: usernameToFree,
          }
        );
      } catch (auditErr) {
        console.warn('Audit log notice for user deletion:', auditErr);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error deleting user from Firestore:', err);
    return { success: false, error: err?.message || 'Failed to delete user document from Firestore' };
  }
};

export interface ActivateSubscriptionOptions {
  reference: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  planId?: string;
  planName?: string;
  targetTier?: 'free' | 'premium' | 'vip';
  amountNaira?: number;
  channel?: string;
  durationDays?: number;
}

export const activateUserSubscriptionInFirestore = async (
  options: ActivateSubscriptionOptions
): Promise<{ success: boolean; planName?: string; isVip?: boolean; expiryDate?: string; error?: string }> => {
  try {
    const {
      reference,
      userId,
      userEmail,
      userName,
      planId: rawPlanId,
      planName: rawPlanName,
      targetTier,
      amountNaira = 0,
      channel = 'paystack',
    } = options;

    if (!userId && !userEmail) {
      throw new Error('Either userId or userEmail is required to activate subscription.');
    }

    let targetUid = userId;

    // If userId not provided or looks like placeholder, lookup by email
    if (!targetUid || targetUid === 'guest' || targetUid === 'unknown' || targetUid === 'scholar') {
      if (userEmail) {
        try {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', userEmail.trim().toLowerCase()), limit(1));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            targetUid = qSnap.docs[0].id;
          }
        } catch (findErr) {
          console.warn('[Firebase] Notice looking up user by email:', findErr);
        }
      }
    }

    if (!targetUid || targetUid === 'guest' || targetUid === 'unknown') {
      targetUid = userId || (userEmail ? userEmail.replace(/[^a-zA-Z0-9]/g, '_') : 'scholar');
    }

    // Determine plan specifics
    const amount = Number(amountNaira || 0);
    const pId = (rawPlanId || '').toLowerCase().trim();
    const pName = (rawPlanName || '').toLowerCase().trim();

    const isTitanVip =
      targetTier === 'vip' ||
      pId.includes('titan') ||
      pId.includes('vip') ||
      pName.includes('titan') ||
      pName.includes('vip') ||
      pName.includes('annual') ||
      amount >= 20000;

    const isPro = !isTitanVip && (targetTier === 'premium' || pId.includes('pro') || pName.includes('pro') || pName.includes('champion') || amount >= 2000);

    // CRITICAL: Preserve exact plan name and ID if provided by user/admin/catalog
    const effectivePlanId = rawPlanId && rawPlanId.trim() !== ''
      ? rawPlanId.trim()
      : isTitanVip ? 'plan_titan_naira' : isPro ? 'plan_pro_naira' : 'plan_premium';

    const effectivePlanName = rawPlanName && rawPlanName.trim() !== ''
      ? rawPlanName.trim()
      : isTitanVip ? 'VIP' : isPro ? 'Champions Pro Scholar' : 'Premium';

    const durationDays = isTitanVip && (pName.includes('annual') || pId.includes('annual') || amount >= 20000) ? 365 : 30;
    const expiryDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    // 1. Update user profile document in Firestore
    const userDocRef = doc(db, 'users', targetUid);
    let existingData: any = {};
    try {
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        existingData = userSnap.data();
      }
    } catch (getErr) {
      console.warn('[Firebase] Notice fetching existing user doc:', getErr);
    }

    const userUpdates: any = {
      activePlanId: effectivePlanId,
      membershipTier: effectivePlanName,
      subscriptionTier: effectivePlanName,
      subscriptionPlan: effectivePlanName,
      planId: effectivePlanId,
      tier: effectivePlanName,
      plan: effectivePlanName,
      isSubscribed: true,
      isPremium: true,
      isVip: isTitanVip,
      gusTier: isTitanVip ? 'Titan' : isPro ? 'Master' : 'Scholar',
      subscriptionExpiry: expiryDate,
      verified: true,
      subscription: {
        planId: effectivePlanId,
        name: effectivePlanName,
        price: amount > 0 ? amount : (isTitanVip ? 800 : isPro ? 2500 : 100),
        currency: 'NGN',
        duration: isTitanVip && (pName.includes('annual') || amount >= 20000) ? '365 Days' : '1 Months',
        startDate: new Date().toISOString(),
        expiryDate,
        status: 'active',
        paymentReference: reference,
      },
      updatedAt: serverTimestamp(),
    };

    await setDoc(userDocRef, userUpdates, { merge: true });

    // 2. Write permanent record into userSubscriptions
    const subRecordRef = doc(db, 'userSubscriptions', `sub_${reference}`);
    await setDoc(subRecordRef, {
      subscriptionId: `sub_${reference}`,
      userId: targetUid,
      userName: userName || existingData.name || 'Grobaax Scholar',
      userEmail: userEmail || existingData.email || '',
      planId: effectivePlanId,
      planNameSnapshot: effectivePlanName,
      priceSnapshot: amount > 0 ? amount : (isTitanVip ? 800 : isPro ? 2500 : 100),
      currencySnapshot: 'NGN',
      durationSnapshot: isTitanVip && (pName.includes('annual') || amount >= 20000) ? '365 Days' : '1 Months',
      startDate: new Date().toISOString(),
      expiryDate,
      status: 'active',
      paymentReference: reference,
      channel,
      isVip: isTitanVip,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    // 3. Create celebration notification for scholar
    try {
      const notifRef = doc(collection(db, 'notifications'));
      await setDoc(notifRef, {
        id: notifRef.id,
        userId: targetUid,
        title: isTitanVip ? '👑 VIP Scholar Status Activated!' : '✨ Premium Plan Activated!',
        message: `Your payment was confirmed. You are now upgraded to ${effectivePlanName} with full platform privileges active immediately.`,
        type: 'subscription',
        read: false,
        createdAt: new Date().toISOString(),
      });
    } catch (nErr) {
      console.warn('Notice writing activation notification:', nErr);
    }

    return {
      success: true,
      planName: effectivePlanName,
      isVip: isTitanVip,
      expiryDate,
    };
  } catch (err: any) {
    console.error('Error activating user subscription in Firestore:', err);
    return {
      success: false,
      error: err?.message || 'Failed to activate subscription.',
    };
  }
};

export const cleanupDuplicateWalletTransactionsInFirestore = async (): Promise<number> => {
  try {
    const q = query(
      collection(db, 'walletTransactions'),
      orderBy('createdAt', 'desc'),
      limit(200)
    );
    const snap = await getDocs(q);
    if (snap.empty) return 0;

    const seenPaymentRefs = new Set<string>();
    const seenSignatures = new Set<string>();
    const docsToDelete: string[] = [];

    snap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const desc = String(data.description || '');
      const metaRef = data.meta?.paymentReference || data.meta?.reference;
      let ref = metaRef ? String(metaRef).trim() : null;
      if (!ref && desc) {
        const match = desc.match(/\((GRBX_[A-Z0-9_-]+|GP_SUB_[A-Z0-9_-]+|trx_[A-Z0-9_-]+)\)/i);
        if (match) ref = match[1].trim();
      }
      const userId = String(data.userId || '');

      if (ref) {
        const refKey = `${userId}_${ref.toLowerCase()}`;
        if (seenPaymentRefs.has(refKey)) {
          docsToDelete.push(docSnap.id);
          return;
        }
        seenPaymentRefs.add(refKey);
      }

      const time = data.createdAt?.toMillis
        ? data.createdAt.toMillis()
        : data.createdAt?.seconds
        ? data.createdAt.seconds * 1000
        : 0;
      const timeBucket = time ? Math.floor(time / (2 * 60 * 1000)) : 0;
      const sigKey = `${userId}_${data.type}_${data.amount}_${data.isCredit}_${timeBucket}_${data.title}`;
      if (timeBucket > 0) {
        if (seenSignatures.has(sigKey)) {
          docsToDelete.push(docSnap.id);
          return;
        }
        seenSignatures.add(sigKey);
      }
    });

    if (docsToDelete.length > 0) {
      const batch = writeBatch(db);
      docsToDelete.slice(0, 450).forEach((id) => {
        batch.delete(doc(db, 'walletTransactions', id));
      });
      await batch.commit();
      console.log(`Cleaned up ${docsToDelete.length} duplicate wallet transactions from Firestore.`);
    }

    return docsToDelete.length;
  } catch (err) {
    console.warn('Notice: Duplicate transactions cleanup:', err);
    return 0;
  }
};

export const cleanupDuplicateUserSubscriptionsInFirestore = async (): Promise<number> => {
  try {
    const snap = await getDocs(query(collection(db, 'userSubscriptions'), limit(100)));
    if (snap.empty) return 0;

    const seenRefs = new Set<string>();
    const toDelete: string[] = [];

    snap.docs.forEach((d) => {
      const data = d.data();
      const ref = (data.paymentReference || '').trim();
      const userId = data.userId || '';
      if (ref) {
        const key = `${userId}_${ref.toLowerCase()}`;
        if (seenRefs.has(key)) {
          toDelete.push(d.id);
          return;
        }
        seenRefs.add(key);
      }
    });

    if (toDelete.length > 0) {
      const batch = writeBatch(db);
      toDelete.forEach((id) => batch.delete(doc(db, 'userSubscriptions', id)));
      await batch.commit();
      console.log(`Cleaned up ${toDelete.length} duplicate user subscriptions.`);
    }
    return toDelete.length;
  } catch (err) {
    console.warn('Notice: Subscriptions cleanup:', err);
    return 0;
  }
};












