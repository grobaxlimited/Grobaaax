/**
 * ============================================================================
 * GROBAAX SUPABASE MASTER ADAPTER
 * ============================================================================
 * Complete drop-in replacement for Firestore & Firebase Auth backed by Supabase.
 * - Routes all document queries, writes, transactions, and real-time listeners to Supabase.
 * - Zero Firestore quota limits.
 * - Enforces Super Admin access for UID: 4403bd2b-e385-479b-af16-058582fa4ee3 / grobaxycompany@gmail.com
 */

import {
  supabase,
  supabaseAdmin,
  PRIMARY_SUPER_ADMIN_UID,
  SUPER_ADMIN_EMAIL,
  LEGACY_SUPER_ADMIN_UID,
  isSuperAdmin,
  getDocFromSupabase,
  setDocToSupabase,
  updateDocInSupabase,
  deleteDocFromSupabase,
  queryDocsFromSupabase,
  subscribeToSupabase,
} from './supabase';

export {
  supabase,
  supabaseAdmin,
  PRIMARY_SUPER_ADMIN_UID,
  SUPER_ADMIN_EMAIL,
  LEGACY_SUPER_ADMIN_UID,
  isSuperAdmin,
  getDocFromSupabase,
  setDocToSupabase,
  updateDocInSupabase,
  deleteDocFromSupabase,
  queryDocsFromSupabase,
  subscribeToSupabase,
};

// ---------------------------------------------------------------------------
// REFERENCE & QUERY TYPES
// ---------------------------------------------------------------------------

export interface DocumentReference {
  type: 'document';
  id: string;
  collection: string;
  path: string;
}

export interface CollectionReference {
  type: 'collection';
  id: string;
  collection: string;
  path: string;
}

export type WhereFilterOp =
  | '<'
  | '<='
  | '=='
  | '!='
  | '>='
  | '>'
  | 'array-contains'
  | 'in'
  | 'array-contains-any'
  | 'not-in';

export interface QueryConstraint {
  type: 'where' | 'orderBy' | 'limit' | 'startAfter';
  field?: string;
  op?: WhereFilterOp;
  value?: any;
  direction?: 'asc' | 'desc';
}

export interface Query {
  type: 'query';
  collection: string;
  constraints: QueryConstraint[];
}

export interface DocumentSnapshot<T = any> {
  id: string;
  ref: DocumentReference;
  exists: () => boolean;
  data: () => T | undefined;
}

export interface QuerySnapshot<T = any> {
  empty: boolean;
  size: number;
  docs: DocumentSnapshot<T>[];
  forEach: (callback: (doc: DocumentSnapshot<T>) => void) => void;
}

export type Unsubscribe = () => void;

// ---------------------------------------------------------------------------
// SPECIAL FIELD VALUES (serverTimestamp, increment, arrayUnion)
// ---------------------------------------------------------------------------

export const serverTimestamp = () => new Date().toISOString();

export const increment = (n: number) => ({
  __op: 'increment',
  value: n,
});

export const arrayUnion = (...items: any[]) => ({
  __op: 'arrayUnion',
  items,
});

export const arrayRemove = (...items: any[]) => ({
  __op: 'arrayRemove',
  items,
});

// Helper to resolve special field values on objects (supports deep nesting and dot-notation)
export function resolveFieldUpdates(target: any, updates: any): any {
  if (!updates || typeof updates !== 'object') return updates;
  const result = { ...(target || {}) };

  for (const [key, val] of Object.entries(updates)) {
    // 1. Support dot-notation field paths (e.g. "reactions.🔥")
    if (key.includes('.')) {
      const parts = key.split('.');
      let cur = result;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object' || Array.isArray(cur[parts[i]])) {
          cur[parts[i]] = {};
        } else {
          cur[parts[i]] = { ...cur[parts[i]] };
        }
        cur = cur[parts[i]];
      }
      const lastKey = parts[parts.length - 1];
      if (val && typeof val === 'object' && (val as any).__op) {
        const op = (val as any).__op;
        if (op === 'increment') {
          cur[lastKey] = (Number(cur[lastKey]) || 0) + Number((val as any).value || 0);
        } else if (op === 'arrayUnion') {
          const existingArr = Array.isArray(cur[lastKey]) ? cur[lastKey] : [];
          const toAdd = (val as any).items || [];
          cur[lastKey] = Array.from(new Set([...existingArr, ...toAdd]));
        } else if (op === 'arrayRemove') {
          const existingArr = Array.isArray(cur[lastKey]) ? cur[lastKey] : [];
          const toRemove = new Set((val as any).items || []);
          cur[lastKey] = existingArr.filter((item: any) => !toRemove.has(item));
        }
      } else {
        cur[lastKey] = val;
      }
      continue;
    }

    // 2. Direct operations
    if (val && typeof val === 'object' && (val as any).__op) {
      const op = (val as any).__op;
      if (op === 'increment') {
        result[key] = (Number(result[key]) || 0) + Number((val as any).value || 0);
      } else if (op === 'arrayUnion') {
        const existingArr = Array.isArray(result[key]) ? result[key] : [];
        const toAdd = (val as any).items || [];
        result[key] = Array.from(new Set([...existingArr, ...toAdd]));
      } else if (op === 'arrayRemove') {
        const existingArr = Array.isArray(result[key]) ? result[key] : [];
        const toRemove = new Set((val as any).items || []);
        result[key] = existingArr.filter((item: any) => !toRemove.has(item));
      }
    } else if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      // 3. Deep merge nested objects (e.g. reactions: { '🔥': increment(1) })
      // Preserves existing keys in the nested object and recurses down to resolve nested increments
      result[key] = resolveFieldUpdates(result[key] || {}, val);
    } else {
      result[key] = val;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// FIRESTORE COMPATIBILITY FUNCTIONS
// ---------------------------------------------------------------------------

export function generateDocId(prefix: string = 'doc'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function collection(database: any, ...pathSegments: string[]): CollectionReference {
  const fullPath = pathSegments.filter(Boolean).join('/').replace(/^\/+|\/+$/g, '');
  const parts = fullPath.split('/');
  const collName = parts[parts.length - 1] || 'records';
  return {
    type: 'collection',
    id: collName,
    collection: collName,
    path: fullPath,
  };
}

export function doc(
  target: any,
  ...pathSegments: string[]
): DocumentReference {
  if (target?.type === 'collection') {
    const docId = pathSegments[0] || generateDocId();
    return {
      type: 'document',
      id: docId,
      collection: target.collection,
      path: `${target.path}/${docId}`,
    };
  }

  const allSegments = pathSegments.filter(Boolean).join('/').replace(/^\/+|\/+$/g, '');
  const parts = allSegments.split('/');

  if (parts.length === 1) {
    // only collection passed; generate ID
    const coll = parts[0];
    const docId = generateDocId();
    return {
      type: 'document',
      id: docId,
      collection: coll,
      path: `${coll}/${docId}`,
    };
  }

  const docId = parts[parts.length - 1];
  const coll = parts[parts.length - 2] || 'records';

  return {
    type: 'document',
    id: docId,
    collection: coll,
    path: allSegments,
  };
}

export function query(
  collRef: CollectionReference,
  ...constraints: QueryConstraint[]
): Query {
  return {
    type: 'query',
    collection: collRef.collection,
    constraints: constraints.filter(Boolean),
  };
}

export function where(field: string, op: WhereFilterOp, value: any): QueryConstraint {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): QueryConstraint {
  return { type: 'orderBy', field, direction };
}

export function limit(value: number): QueryConstraint {
  return { type: 'limit', value };
}

export function startAfter(value: any): QueryConstraint {
  return { type: 'startAfter', value };
}

export async function getDoc<T = any>(docRef: DocumentReference): Promise<DocumentSnapshot<T>> {
  if (!docRef || !docRef.id) {
    return {
      id: '',
      ref: docRef,
      exists: () => false,
      data: () => undefined,
    };
  }

  const data = await getDocFromSupabase<T>(docRef.collection, docRef.id);
  const exists = data !== null && data !== undefined;

  return {
    id: docRef.id,
    ref: docRef,
    exists: () => exists,
    data: () => (exists ? data : undefined),
  };
}

export async function getDocs<T = any>(target: CollectionReference | Query): Promise<QuerySnapshot<T>> {
  const collectionName = target.collection;
  const constraints = target.type === 'query' ? target.constraints : [];

  const whereOpts: [string, any, any][] = [];
  const orderOpts: { field: string; direction?: 'asc' | 'desc' }[] = [];
  let limitVal: number | undefined;

  for (const c of constraints) {
    if (c.type === 'where' && c.field && c.op !== undefined) {
      whereOpts.push([c.field, c.op, c.value]);
    } else if (c.type === 'orderBy' && c.field) {
      orderOpts.push({ field: c.field, direction: c.direction });
    } else if (c.type === 'limit' && c.value) {
      limitVal = c.value;
    }
  }

  const items = await queryDocsFromSupabase<T>(collectionName, {
    where: whereOpts,
    orderBy: orderOpts,
    limit: limitVal,
  });

  const docs: DocumentSnapshot<T>[] = items.map((item: any) => {
    const id = item.id || generateDocId();
    return {
      id,
      ref: {
        type: 'document',
        id,
        collection: collectionName,
        path: `${collectionName}/${id}`,
      },
      exists: () => true,
      data: () => item,
    };
  });

  return {
    empty: docs.length === 0,
    size: docs.length,
    docs,
    forEach: (cb) => docs.forEach(cb),
  };
}

export async function setDoc<T = any>(
  docRef: DocumentReference,
  data: T,
  options?: { merge?: boolean }
): Promise<void> {
  const merge = options?.merge ?? true;
  let finalData: any = data;
  if (merge) {
    const existing = await getDocFromSupabase(docRef.collection, docRef.id);
    finalData = resolveFieldUpdates(existing, data);
  } else {
    finalData = resolveFieldUpdates({}, data);
  }
  await setDocToSupabase(docRef.collection, docRef.id, finalData, merge);
}

export async function updateDoc<T = any>(
  docRef: DocumentReference,
  data: Partial<T>
): Promise<void> {
  const existing = await getDocFromSupabase(docRef.collection, docRef.id);
  const resolved = resolveFieldUpdates(existing, data);
  await setDocToSupabase(docRef.collection, docRef.id, resolved, true);
}

export async function deleteDoc(docRef: DocumentReference): Promise<void> {
  await deleteDocFromSupabase(docRef.collection, docRef.id);
}

export async function addDoc<T = any>(
  collRef: CollectionReference,
  data: T
): Promise<DocumentReference> {
  const docId = (data as any)?.id || generateDocId(collRef.collection.toLowerCase());
  const docRef: DocumentReference = {
    type: 'document',
    id: docId,
    collection: collRef.collection,
    path: `${collRef.path}/${docId}`,
  };

  await setDocToSupabase(collRef.collection, docId, { ...(data as any), id: docId }, true);
  return docRef;
}

export function onSnapshot(
  target: DocumentReference | CollectionReference | Query,
  onNext: (snapshot: any) => void,
  onError?: (err: any) => void
): Unsubscribe {
  if (target.type === 'document') {
    return subscribeToSupabase(
      target.collection,
      (items) => {
        const item = items.find((i) => i.id === target.id || (i as any).uid === target.id);
        const exists = Boolean(item);
        onNext({
          id: target.id,
          ref: target,
          exists: () => exists,
          data: () => (exists ? item : undefined),
        });
      },
      { filterDocId: target.id }
    );
  }

  // Collection or Query
  const collectionName = target.collection;
  const constraints = target.type === 'query' ? target.constraints : [];

  const whereOpts: [string, any, any][] = [];
  const orderOpts: { field: string; direction?: 'asc' | 'desc' }[] = [];
  let limitVal: number | undefined;

  for (const c of constraints) {
    if (c.type === 'where' && c.field && c.op !== undefined) {
      whereOpts.push([c.field, c.op, c.value]);
    } else if (c.type === 'orderBy' && c.field) {
      orderOpts.push({ field: c.field, direction: c.direction });
    } else if (c.type === 'limit' && c.value) {
      limitVal = c.value;
    }
  }

  return subscribeToSupabase(
    collectionName,
    (items) => {
      const docs = items.map((item: any) => {
        const id = item.id || generateDocId();
        return {
          id,
          ref: {
            type: 'document' as const,
            id,
            collection: collectionName,
            path: `${collectionName}/${id}`,
          },
          exists: () => true,
          data: () => item,
        };
      });

      onNext({
        empty: docs.length === 0,
        size: docs.length,
        docs,
        forEach: (cb: any) => docs.forEach(cb),
      });
    },
    {
      where: whereOpts,
      orderBy: orderOpts,
      limit: limitVal,
    }
  );
}

export function writeBatch(dbInstance?: any) {
  const operations: Array<() => Promise<void>> = [];

  return {
    set: (docRef: DocumentReference, data: any, options?: { merge?: boolean }) => {
      operations.push(() => setDoc(docRef, data, options));
    },
    update: (docRef: DocumentReference, data: any) => {
      operations.push(() => updateDoc(docRef, data));
    },
    delete: (docRef: DocumentReference) => {
      operations.push(() => deleteDoc(docRef));
    },
    commit: async () => {
      for (const op of operations) {
        await op();
      }
    },
  };
}

export async function runTransaction<T>(
  dbInstance: any,
  updateFunction: (transaction: any) => Promise<T>
): Promise<T> {
  const tx = {
    get: async (docRef: DocumentReference) => getDoc(docRef),
    set: (docRef: DocumentReference, data: any, options?: { merge?: boolean }) =>
      setDoc(docRef, data, options),
    update: (docRef: DocumentReference, data: any) => updateDoc(docRef, data),
    delete: (docRef: DocumentReference) => deleteDoc(docRef),
  };
  return updateFunction(tx);
}

// Global DB instance satisfying both Supabase and Firestore types
export const db: any = {
  type: 'supabase-firestore-facade',
  app: {} as any,
  toJSON: () => ({ type: 'supabase-firestore-facade' }),
};

// ---------------------------------------------------------------------------
// AUTH ADAPTER WITH SUPER ADMIN ENFORCEMENT
// ---------------------------------------------------------------------------

let cachedCurrentUser: any = null;
const authListeners = new Set<(user: any) => void>();

function handleSupabaseUser(rawUser: any) {
  if (!rawUser) {
    cachedCurrentUser = null;
    authListeners.forEach((listener) => listener(null));
    return;
  }

  const isSuper = isSuperAdmin(rawUser.id, rawUser.email);

  cachedCurrentUser = {
    uid: rawUser.id,
    id: rawUser.id,
    email: rawUser.email,
    displayName:
      rawUser.user_metadata?.full_name ||
      rawUser.user_metadata?.name ||
      (isSuper ? 'Grobaax Super Admin' : rawUser.email?.split('@')[0]),
    photoURL: rawUser.user_metadata?.avatar_url || rawUser.user_metadata?.picture || null,
    emailVerified: Boolean(rawUser.email_confirmed_at || rawUser.confirmed_at || isSuper),
    isAnonymous: false,
    providerData: [
      {
        providerId: 'supabase',
        email: rawUser.email,
        displayName: rawUser.user_metadata?.full_name || rawUser.email?.split('@')[0],
      },
    ],
    role: isSuper ? 'super_admin' : (rawUser.user_metadata?.role || 'student'),
    isSuperAdmin: isSuper,
    isPrimarySuperAdmin: isSuper,
    reload: async () => {},
    getIdToken: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token || '';
    },
  };

  authListeners.forEach((listener) => listener(cachedCurrentUser));
}

import { promptGoogleOneTap } from './googleAuthHelper';

// Check local storage for initial user or session and parse incoming tokens or code from URL
if (typeof window !== 'undefined') {
  // Synchronously restore cachedCurrentUser from Supabase storage so auth.currentUser is instantly available
  try {
    const rawToken = localStorage.getItem('sb-rsnmxdyqrmkjsfxwypek-auth-token');
    if (rawToken) {
      const parsed = JSON.parse(rawToken);
      if (parsed?.user?.id) {
        handleSupabaseUser(parsed.user);
      }
    }
  } catch (_) {}

  try {
    const currentHash = window.location.hash || '';
    const currentSearch = window.location.search || '';
    const isCallbackPath = window.location.pathname.startsWith('/auth/callback');

    let accessToken: string | null = null;
    let refreshToken: string | null = null;
    let code: string | null = null;

    if (currentHash && currentHash.includes('access_token=')) {
      const hashParams = new URLSearchParams(currentHash.replace(/^#/, ''));
      accessToken = hashParams.get('access_token');
      refreshToken = hashParams.get('refresh_token');
    }

    if (currentSearch) {
      const sParams = new URLSearchParams(currentSearch.replace(/^\?/, ''));
      code = sParams.get('code');
      if (!accessToken) {
        accessToken = sParams.get('access_token');
        refreshToken = sParams.get('refresh_token');
      }
    }

    const broadcastAuthSuccess = (sess?: any, aTok?: string, rTok?: string, cde?: string) => {
      const payload = {
        type: 'SUPABASE_AUTH_SUCCESS',
        hash: currentHash,
        search: currentSearch,
        code: cde || code,
        accessToken: aTok || sess?.access_token || accessToken,
        refreshToken: rTok || sess?.refresh_token || refreshToken,
        timestamp: Date.now(),
      };

      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('grobaax_oauth_channel');
          bc.postMessage(payload);
        }
      } catch (_) {}

      try {
        localStorage.setItem('grobaax_oauth_event', JSON.stringify(payload));
      } catch (_) {}

      if (window.opener) {
        try {
          window.opener.postMessage(payload, '*');
        } catch (_) {}
        setTimeout(() => {
          try { window.close(); } catch (_) {}
        }, 600);
      } else if (isCallbackPath) {
        // If this window itself was redirected (e.g. PWA in-place redirect), return to root
        setTimeout(() => {
          try {
            window.location.replace('/');
          } catch (_) {
            window.location.href = '/';
          }
        }, 350);
      }
    };

    // 1. If loaded with PKCE code parameter in URL (standard for modern Supabase OAuth)
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (!error && data?.user) {
          handleSupabaseUser(data.user);
          broadcastAuthSuccess(data.session, undefined, undefined, code);
        }
        if (!isCallbackPath) {
          try {
            window.history.replaceState(null, '', window.location.pathname);
          } catch (_) {}
        }
      });
    }
    // 2. If loaded with #access_token=... in the URL
    else if (accessToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      }).then(({ data, error }) => {
        if (!error && data?.user) {
          handleSupabaseUser(data.user);
          broadcastAuthSuccess(data.session, accessToken, refreshToken);
        }
        if (!isCallbackPath) {
          try {
            window.history.replaceState(null, '', window.location.pathname);
          } catch (_) {}
        }
      });
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user) {
        handleSupabaseUser(data.session.user);
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      handleSupabaseUser(session?.user || null);
    });
  } catch (e) {
    console.warn('[Supabase Auth] Init listener notice:', e);
  }
}

export const auth: any = {
  get currentUser() {
    return cachedCurrentUser;
  },
  onAuthStateChanged: (callback: (user: any) => void) => {
    authListeners.add(callback);
    // Fire immediately with cached current user if available
    callback(cachedCurrentUser);
    return () => {
      authListeners.delete(callback);
    };
  },
};

export const onAuthStateChanged = (
  authInstance: any,
  callback: (user: any) => void
): Unsubscribe => {
  return auth.onAuthStateChanged(callback);
};

export async function signInWithEmailAndPassword(authInstance: any, email: string, pass: string) {
  const cleanEmail = email.trim().toLowerCase();

  let { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: pass,
  });

  // If Supabase returns an error mentioning email confirmation, auto-confirm using admin API and retry
  if (
    error &&
    (error.message?.toLowerCase().includes('email not confirmed') ||
      error.message?.toLowerCase().includes('not confirmed'))
  ) {
    try {
      const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
      const targetUser = (userList?.users as any[])?.find(
        (u: any) => u.email?.toLowerCase() === cleanEmail
      );
      if (targetUser) {
        await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
          email_confirm: true,
        });
        // Retry sign in
        const retry = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: pass,
        });
        data = retry.data;
        error = retry.error;
      }
    } catch (adminErr) {
      console.warn('[Supabase Auth] Auto-confirm error:', adminErr);
    }
  }

  if (error) {
    throw new Error(error.message);
  }

  handleSupabaseUser(data.user);
  return { user: cachedCurrentUser };
}

export async function createUserWithEmailAndPassword(authInstance: any, email: string, pass: string) {
  const cleanEmail = email.trim().toLowerCase();

  // Try creating user pre-confirmed using supabaseAdmin so their account is active immediately
  let user: any = null;
  const { data: adminData, error: adminErr } = await supabaseAdmin.auth.admin.createUser({
    email: cleanEmail,
    password: pass,
    email_confirm: true,
  });

  if (!adminErr && adminData?.user) {
    user = adminData.user;
  } else if (
    adminErr &&
    (adminErr.message?.toLowerCase().includes('already') || adminErr.message?.toLowerCase().includes('exists'))
  ) {
    throw new Error('An account with this email already exists. Please log in instead.');
  } else {
    // Fallback to standard signUp
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: cleanEmail,
      password: pass,
    });

    if (signUpErr) {
      throw new Error(signUpErr.message);
    }

    user = signUpData.user;
    if (user?.id) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(user.id, { email_confirm: true });
      } catch (_) {}
    }
  }

  // Immediately sign in with password to establish persistent JWT session in browser
  const { data: sessionData, error: sessionErr } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: pass,
  });

  if (sessionData?.user) {
    handleSupabaseUser(sessionData.user);
  } else if (user) {
    handleSupabaseUser(user);
  } else if (sessionErr) {
    throw new Error(sessionErr.message);
  }

  return { user: cachedCurrentUser };
}

export async function sendPasswordResetEmail(authInstance: any, email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
  if (error) {
    throw new Error(error.message);
  }
}

export async function signOut(authInstance?: any) {
  await supabase.auth.signOut();
  handleSupabaseUser(null);
}

export async function updateProfile(user: any, profile: { displayName?: string; photoURL?: string }) {
  await supabase.auth.updateUser({
    data: {
      full_name: profile.displayName,
      avatar_url: profile.photoURL,
    },
  });
  if (cachedCurrentUser) {
    if (profile.displayName) cachedCurrentUser.displayName = profile.displayName;
    if (profile.photoURL) cachedCurrentUser.photoURL = profile.photoURL;
    authListeners.forEach((l) => l(cachedCurrentUser));
  }
}

export async function deleteUser(_user: any): Promise<void> {
  await supabase.auth.signOut();
  handleSupabaseUser(null);
}

export async function updatePassword(_user: any, newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

export async function reauthenticateWithCredential(_user: any, _cred: any): Promise<void> {}

export const EmailAuthProvider = {
  credential: (email: string, pass: string) => ({ email, pass }),
};

export async function sendEmailVerification(_user: any): Promise<void> {}

export const signInWithGoogle = async (): Promise<any> => {
  if (typeof window === 'undefined') {
    throw new Error('Google sign-in is only available in browser environments.');
  }

  // 1. Capture current user ID (if any) before sign-in begins
  const initialUserId = cachedCurrentUser?.uid || cachedCurrentUser?.id || null;

  // Clear any existing OAuth event before starting
  try {
    localStorage.removeItem('grobaax_oauth_event');
  } catch (_) {}

  const origin = window.location.origin;
  const redirectUrl = `${origin}/auth/callback`;

  // 1. Try native in-app Google Identity Services (One Tap) first
  // If user selects their account in the native bottom sheet, no navigation or external tab occurs at all!
  try {
    const idToken = await promptGoogleOneTap();
    if (idToken) {
      console.log('[Google Auth] Credential received from Google One Tap');
      const { data: idData, error: idErr } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (!idErr && idData?.user) {
        handleSupabaseUser(idData.user);
        return cachedCurrentUser;
      }
      if (idErr) {
        console.warn('[Google Auth] signInWithIdToken notice:', idErr);
      }
    }
  } catch (gisErr) {
    console.log('[Google Auth] One Tap prompt skipped or unavailable:', gisErr);
  }

  // 2. Open Google OAuth via target popup window
  // In an installed PWA or mobile browser, opening via popup keeps the standalone PWA active in the background.
  // When the OAuth completes at /auth/callback, the callback immediately closes itself (window.close())
  // and hands off credentials via BroadcastChannel and localStorage, so the user remains in the pure PWA without the [X] top bar.
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true, // Generate the URL so we can open it in a closable target window
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.url) {
    throw new Error('Supabase did not return an authorization URL. Please verify Google provider configuration in Supabase.');
  }

  return new Promise((resolve, reject) => {
    let resolved = false;
    const startTime = Date.now();
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    const cleanup = () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
      if (bc) {
        try { bc.close(); } catch (_) {}
      }
      if (pollTimer) clearInterval(pollTimer);
    };

    const finishWithSession = async (
      hash?: string,
      search?: string,
      explicitCode?: string,
      explicitAccessToken?: string,
      explicitRefreshToken?: string
    ) => {
      if (resolved) return;
      try {
        console.log('[Google Auth] finishWithSession triggered:', {
          hasHash: Boolean(hash),
          hasSearch: Boolean(search),
          hasCode: Boolean(explicitCode),
          hasAccessToken: Boolean(explicitAccessToken),
        });

        // 1. Direct tokens or extracted from hash
        let aToken = explicitAccessToken;
        let rToken = explicitRefreshToken;
        if (!aToken && hash) {
          const params = new URLSearchParams(hash.replace(/^#/, ''));
          aToken = params.get('access_token') || undefined;
          rToken = params.get('refresh_token') || undefined;
        }

        if (aToken) {
          const { data: sData, error: sErr } = await supabase.auth.setSession({
            access_token: aToken,
            refresh_token: rToken || '',
          });
          if (!sErr && sData?.user) {
            handleSupabaseUser(sData.user);
            resolved = true;
            cleanup();
            resolve(cachedCurrentUser);
            return;
          }
        }

        // 2. PKCE code flow from search or explicit code
        let code = explicitCode;
        if (!code && search) {
          const params = new URLSearchParams(search.replace(/^\?/, ''));
          code = params.get('code') || undefined;
        }

        if (code) {
          const { data: sData, error: sErr } = await supabase.auth.exchangeCodeForSession(code);
          if (!sErr && sData?.user) {
            handleSupabaseUser(sData.user);
            resolved = true;
            cleanup();
            resolve(cachedCurrentUser);
            return;
          }
        }

        // 3. Check active Supabase session (must be valid session)
        const { data: curr } = await supabase.auth.getSession();
        if (curr?.session?.user) {
          if (!initialUserId || curr.session.user.id !== initialUserId || explicitCode || aToken) {
            handleSupabaseUser(curr.session.user);
            resolved = true;
            cleanup();
            resolve(cachedCurrentUser);
            return;
          }
        }

        // 4. Check localStorage direct token if available
        try {
          const localToken = localStorage.getItem('sb-rsnmxdyqrmkjsfxwypek-auth-token');
          if (localToken) {
            const parsed = JSON.parse(localToken);
            if (parsed?.access_token && parsed?.refresh_token) {
              const { data: sData, error: sErr } = await supabase.auth.setSession({
                access_token: parsed.access_token,
                refresh_token: parsed.refresh_token,
              });
              if (!sErr && sData?.user && (!initialUserId || sData.user.id !== initialUserId)) {
                handleSupabaseUser(sData.user);
                resolved = true;
                cleanup();
                resolve(cachedCurrentUser);
                return;
              }
            }
          }
        } catch (_) {}
      } catch (err) {
        console.warn('[Supabase OAuth] Session extraction notice:', err);
      }
    };

    // 1. PostMessage handler from popup
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SUPABASE_AUTH_SUCCESS') {
        console.log('[Google Auth] Received SUPABASE_AUTH_SUCCESS via postMessage');
        finishWithSession(
          event.data.hash,
          event.data.search,
          event.data.code,
          event.data.accessToken,
          event.data.refreshToken
        );
      }
    };
    window.addEventListener('message', handleMessage);

    // 2. Storage event listener (fires across tabs / windows on the same origin)
    const handleStorage = (event: StorageEvent) => {
      if ((event.key === 'grobaax_oauth_event' || event.key === 'sb-rsnmxdyqrmkjsfxwypek-auth-token') && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          if (parsed?.type === 'SUPABASE_AUTH_SUCCESS') {
            console.log('[Google Auth] Received SUPABASE_AUTH_SUCCESS via storage event');
            finishWithSession(
              parsed.hash,
              parsed.search,
              parsed.code,
              parsed.accessToken,
              parsed.refreshToken
            );
          } else if (parsed?.access_token) {
            finishWithSession();
          }
        } catch (_) {}
      }
    };
    window.addEventListener('storage', handleStorage);

    // 3. BroadcastChannel listener
    let bc: any = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('grobaax_oauth_channel');
        bc.onmessage = (event: MessageEvent) => {
          if (event.data?.type === 'SUPABASE_AUTH_SUCCESS') {
            console.log('[Google Auth] Received SUPABASE_AUTH_SUCCESS via BroadcastChannel');
            finishWithSession(
              event.data.hash,
              event.data.search,
              event.data.code,
              event.data.accessToken,
              event.data.refreshToken
            );
          }
        };
      }
    } catch (_) {}

    // Open OAuth popup window in iframe environments
    const width = 520;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      data.url,
      'grobaax_google_oauth',
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
    );

    if (!popup) {
      const fallback = window.open(data.url, '_blank');
      if (!fallback) {
        cleanup();
        const popupErr: any = new Error('Please allow popups for this site to complete Google sign in.');
        popupErr.code = 'auth/popup-blocked';
        reject(popupErr);
        return;
      }
    }

    // Monitor session state and popup closed state
    const pollTimer = setInterval(async () => {
      if (resolved) return;

      try {
        const stored = localStorage.getItem('grobaax_oauth_event');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.type === 'SUPABASE_AUTH_SUCCESS' && parsed.timestamp >= startTime) {
            console.log('[Google Auth] Found grobaax_oauth_event during poll');
            finishWithSession(
              parsed.hash,
              parsed.search,
              parsed.code,
              parsed.accessToken,
              parsed.refreshToken
            );
            return;
          }
        }
      } catch (_) {}

      const { data: curr } = await supabase.auth.getSession();
      if (curr?.session?.user && (!initialUserId || curr.session.user.id !== initialUserId)) {
        console.log('[Google Auth] New session user detected in poll:', curr.session.user.id);
        handleSupabaseUser(curr.session.user);
        resolved = true;
        cleanup();
        resolve(cachedCurrentUser);
        return;
      }

      const elapsed = Date.now() - startTime;
      const gracePeriod = isMobile ? 60000 : 35000;

      if (popup && popup.closed && elapsed > gracePeriod) {
        if (!resolved) {
          cleanup();
          const cancelErr: any = new Error('Google sign-in was cancelled before completion.');
          cancelErr.code = 'auth/popup-closed-by-user';
          reject(cancelErr);
        }
      }
    }, 1000);

    // Safety timeout: 4 minutes
    setTimeout(() => {
      if (!resolved) {
        cleanup();
        const timeoutErr: any = new Error('Google sign-in timed out. Please try again.');
        timeoutErr.code = 'auth/timeout';
        reject(timeoutErr);
      }
    }, 240000);
  });
};

/**
 * Manually connect session from a redirected URL (with #access_token=... or ?code=...)
 */
export const setSessionFromUrlOrHash = async (input: string): Promise<any> => {
  if (!input || typeof input !== 'string') {
    throw new Error('Please provide a valid redirect URL or token.');
  }

  const trimmed = input.trim();
  let accessToken: string | null = null;
  let refreshToken: string | null = null;
  let code: string | null = null;

  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://dummy.com/${trimmed}`);
    if (url.hash) {
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
      accessToken = hashParams.get('access_token');
      refreshToken = hashParams.get('refresh_token');
    }
    if (!accessToken && url.search) {
      const searchParams = new URLSearchParams(url.search);
      accessToken = searchParams.get('access_token');
      refreshToken = searchParams.get('refresh_token');
      code = searchParams.get('code');
    }
  } catch (_) {
    // If not standard URL format
  }

  if (!accessToken) {
    const accessMatch = trimmed.match(/access_token=([^&]+)/);
    if (accessMatch) accessToken = decodeURIComponent(accessMatch[1]);
    const refreshMatch = trimmed.match(/refresh_token=([^&]+)/);
    if (refreshMatch) refreshToken = decodeURIComponent(refreshMatch[1]);
  }

  if (!accessToken && trimmed.startsWith('eyJ')) {
    accessToken = trimmed;
  }

  if (accessToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || '',
    });
    if (error) {
      throw new Error(error.message);
    }
    if (data?.user) {
      handleSupabaseUser(data.user);
      return cachedCurrentUser;
    }
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      throw new Error(error.message);
    }
    if (data?.user) {
      handleSupabaseUser(data.user);
      return cachedCurrentUser;
    }
  }

  throw new Error('No authentication tokens found in the URL. Please ensure you copied the entire address.');
};

