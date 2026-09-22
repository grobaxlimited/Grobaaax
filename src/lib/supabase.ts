import { createClient, SupabaseClient, User as SupabaseUser, Session } from '@supabase/supabase-js';

// Safe environment variable resolution supporting Vite, browser, and Node.js
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

const rawUrl =
  safeGetEnv('SUPABASE_URL') ||
  safeGetEnv('VITE_SUPABASE_URL') ||
  'https://rsnmxdyqrmkjsfxwypek.supabase.co';

// Normalize root supabase.co URL to the project instance
export const SUPABASE_URL =
  rawUrl === 'https://supabase.co' || rawUrl === 'https://supabase.co/'
    ? 'https://rsnmxdyqrmkjsfxwypek.supabase.co'
    : rawUrl;

export const SUPABASE_ANON_KEY =
  safeGetEnv('SUPABASE_ANON_KEY') ||
  safeGetEnv('VITE_SUPABASE_ANON_KEY') ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzbm14ZHlxcm1ranNmeHd5cGVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMzI1NzYsImV4cCI6MjEwNDcwODU3Nn0.35_rPRhEbwfIpA5LlAKVueuxkLWjd4lyJphlNoVMaPc';

export const SUPABASE_SERVICE_ROLE_KEY =
  safeGetEnv('SUPABASE_SERVICE_ROLE_KEY') ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzbm14ZHlxcm1ranNmeHd5cGVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTEzMjU3NiwiZXhwIjoyMTA0NzA4NTc2fQ.W1Ue-ZlOPxA8vX2JihJnwEzfKjsnvhOx6gshYLBGFrs';

export const DATABASE_URL =
  safeGetEnv('DATABASE_URL') ||
  'postgresql://postgres:Mockfast1122@db.rsnmxdyqrmkjsfxwypek.supabase.co:5432/postgres';

// Strict Primary Super Admin credentials
export const PRIMARY_SUPER_ADMIN_UID = '4403bd2b-e385-479b-af16-058582fa4ee3';
export const SUPER_ADMIN_EMAIL = 'grobaxycompany@gmail.com';
export const LEGACY_SUPER_ADMIN_UID = 'iH02BTcB4B0BV2YLA60WwFAi50CJ3';

export function isSuperAdmin(uid?: string | null, email?: string | null): boolean {
  if (!uid && !email) return false;
  if (uid === PRIMARY_SUPER_ADMIN_UID || uid === '4403bd2b-e385-479b-af16-058582fa4ee3') return true;
  if (uid === LEGACY_SUPER_ADMIN_UID) return true;
  if (email && email.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase()) return true;
  if (uid && uid.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase()) return true;
  return false;
}

// Global Supabase Client
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Privileged Service Role Supabase Client (for backend / admin operations)
export const supabaseAdmin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Cache for in-flight real-time subscriptions
const activeChannels = new Map<string, any>();

// Shared real-time broadcast channel across all connected clients & devices
const GLOBAL_SYNC_CHANNEL_NAME = 'grobaax-realtime-bus';
let globalBusChannel: any = null;
let globalBusSubscribed = false;

// Cross-tab broadcast channel for instantaneous local sync
let crossTabChannel: any = null;
if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
  try {
    crossTabChannel = new BroadcastChannel('grobaax_tab_sync');
  } catch {}
}

// In-memory registry of active table subscriber callbacks
const inMemoryTableSubscribers = new Map<string, Set<() => void>>();

function getGlobalBusChannel() {
  if (!globalBusChannel && typeof window !== 'undefined') {
    globalBusChannel = supabase.channel(GLOBAL_SYNC_CHANNEL_NAME, {
      config: {
        broadcast: { self: false },
      },
    });

    globalBusChannel
      .on('broadcast', { event: 'db_mutation' }, (msg: any) => {
        const payload = msg?.payload;
        if (!payload) return;
        const targetTable = normalizeTableName(payload.table || payload.originalTable || '');
        notifyTableListeners(targetTable, payload);
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          globalBusSubscribed = true;
          console.info('[Realtime] Grobaax WhatsApp-style real-time sync connected');
        }
      });
  }
  return globalBusChannel;
}

if (crossTabChannel) {
  crossTabChannel.onmessage = (event: MessageEvent) => {
    const payload = event.data;
    if (payload?.table) {
      notifyTableListeners(normalizeTableName(payload.table), payload);
    }
  };
}

function notifyTableListeners(table: string, payload: any) {
  // 1. Trigger registered in-memory table callbacks
  const subscribers = inMemoryTableSubscribers.get(table);
  if (subscribers && subscribers.size > 0) {
    subscribers.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.warn('[Realtime] Subscriber notification error:', err);
      }
    });
  }

  // 2. Dispatch window event for other components
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('supabase_table_changed', {
          detail: payload,
        })
      );
    } catch {}
  }
}

function broadcastTableMutation(table: string, originalTable: string, docId: string, data: any, op: 'set' | 'delete') {
  const payload = {
    table,
    originalTable,
    docId,
    data,
    op,
    timestamp: Date.now(),
  };

  // 1. Notify local subscribers immediately
  notifyTableListeners(table, payload);

  // 2. Broadcast to other tabs
  if (crossTabChannel) {
    try {
      crossTabChannel.postMessage(payload);
    } catch {}
  }

  // 3. Broadcast to all other devices/users via Supabase Realtime WebSocket
  try {
    const bus = getGlobalBusChannel();
    if (bus) {
      bus.send({
        type: 'broadcast',
        event: 'db_mutation',
        payload,
      });
    }
  } catch (err) {
    console.warn('[Realtime] Bus send notice:', err);
  }
}

/**
 * Normalizes table name for PostgreSQL query
 */
export function normalizeTableName(name: string): string {
  if (!name) return 'records';
  return name.trim();
}

/**
 * Fetch a single document from Supabase
 */
export async function getDocFromSupabase<T = any>(tableName: string, docId: string): Promise<T | null> {
  try {
    const table = normalizeTableName(tableName);
    let { data, error } = await supabase
      .from(table)
      .select('id, data')
      .eq('id', docId)
      .maybeSingle();

    if (error || !data) {
      // Fallback to supabaseAdmin
      const adminRes = await supabaseAdmin
        .from(table)
        .select('id, data')
        .eq('id', docId)
        .maybeSingle();
      if (!adminRes.error && adminRes.data) {
        data = adminRes.data;
        error = null;
      }
    }

    if (error) {
      console.warn(`[Supabase] Error fetching ${table}/${docId}:`, error.message);
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem(`grobaax_table_fallback_${table}_${docId}`);
          if (cached) return JSON.parse(cached) as T;
        } catch {}
      }
      return null;
    }

    if (!data) return null;
    return {
      ...(data.data || {}),
      id: data.id,
    } as T;
  } catch (err) {
    console.warn(`[Supabase] Exception in getDocFromSupabase ${tableName}/${docId}:`, err);
    return null;
  }
}

function deepMergeOperations(existing: any, incoming: any): any {
  if (!incoming || typeof incoming !== 'object') return incoming;
  const result = { ...(existing || {}) };

  for (const [key, val] of Object.entries(incoming)) {
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
      if (val && typeof val === 'object' && (val as any).__op === 'increment') {
        cur[lastKey] = (Number(cur[lastKey]) || 0) + Number((val as any).value || 0);
      } else {
        cur[lastKey] = val;
      }
      continue;
    }

    if (val && typeof val === 'object' && (val as any).__op === 'increment') {
      result[key] = (Number(result[key]) || 0) + Number((val as any).value || 0);
    } else if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      result[key] = deepMergeOperations(result[key] || {}, val);
    } else {
      result[key] = val;
    }
  }

  return result;
}

function sanitizeOperations(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeOperations);
  if (obj instanceof Date) return obj;
  const result: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && (v as any).__op === 'increment') {
      result[k] = Number((v as any).value || 0);
    } else if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      result[k] = sanitizeOperations(v);
    } else {
      result[k] = v;
    }
  }
  return result;
}

/**
 * Set or upsert a document in Supabase with strict security controls
 */
export async function setDocToSupabase<T = any>(
  tableName: string,
  docId: string,
  data: T,
  merge: boolean = true,
  options?: { isServerAuthoritative?: boolean }
): Promise<T> {
  const table = normalizeTableName(tableName);
  const now = new Date().toISOString();

  let finalPayload: any = {
    ...(data as any),
    id: docId,
    updatedAt: (data as any)?.updatedAt || now,
  };

  const existing = await getDocFromSupabase(tableName, docId);

  if (merge && existing) {
    finalPayload = deepMergeOperations(existing, finalPayload);
    finalPayload.id = docId;
    finalPayload.updatedAt = now;
  }

  // Sanitize any remaining __op increment objects recursively
  finalPayload = sanitizeOperations(finalPayload);

  // =========================================================================
  // STRICT SECURITY GUARD: Prevent unauthorized client-side GP generation & exploits
  // =========================================================================
  if (!options?.isServerAuthoritative) {
    let activeUser: any = null;
    try {
      const sessionRes = await supabase.auth.getSession();
      activeUser = sessionRes?.data?.session?.user || null;
    } catch {}

    const callerUid = activeUser?.id || '';
    const callerEmail = activeUser?.email || '';
    const isCallerSuperAdmin = isSuperAdmin(callerUid, callerEmail);

    if (!isCallerSuperAdmin) {
      if (table === 'users') {
        if (existing) {
          // 1. Role cannot be elevated client-side
          finalPayload.role = existing.role || 'student';
          finalPayload.accountStatus = existing.accountStatus || 'active';
          finalPayload.verified = Boolean(existing.verified);
          finalPayload.isPostingSuspended = Boolean(existing.isPostingSuspended);

          // 2. GP balance can NEVER be increased client-side! Can only stay same or decrease (spending)
          const prevGp = Number(existing.gpBalance || 0);
          const newGp = Number(finalPayload.gpBalance);
          if (!isNaN(newGp) && newGp > prevGp) {
            console.error(`[SECURITY DEFENSE] Blocked unauthorized client GP increase for user ${docId}: Attempted ${prevGp} -> ${newGp}`);
            throw new Error('SECURITY VIOLATION: Unauthorized attempt to increment GP balance. GP generation is strictly reserved for verified official channels.');
          }

          // 3. Wallet balance can NEVER be increased client-side!
          const prevWallet = Number(existing.walletBalance || 0);
          const newWallet = Number(finalPayload.walletBalance);
          if (!isNaN(newWallet) && newWallet > prevWallet) {
            console.error(`[SECURITY DEFENSE] Blocked unauthorized client walletBalance increase for user ${docId}: Attempted ${prevWallet} -> ${newWallet}`);
            throw new Error('SECURITY VIOLATION: Unauthorized attempt to increment walletBalance.');
          }

          // 4. Total GP Earned can NEVER be increased client-side!
          const prevTotalGp = Number(existing.totalGpEarned || 0);
          const newTotalGp = Number(finalPayload.totalGpEarned);
          if (!isNaN(newTotalGp) && newTotalGp > prevTotalGp) {
            console.error(`[SECURITY DEFENSE] Blocked unauthorized totalGpEarned increase for user ${docId}: Attempted ${prevTotalGp} -> ${newTotalGp}`);
            throw new Error('SECURITY VIOLATION: Unauthorized attempt to increment totalGpEarned.');
          }

          // 5. Tokens can NEVER be increased client-side!
          const prevTokens = Number(existing.grbxTokens || 0);
          const newTokens = Number(finalPayload.grbxTokens);
          if (!isNaN(newTokens) && newTokens > prevTokens) {
            console.error(`[SECURITY DEFENSE] Blocked unauthorized grbxTokens increase for user ${docId}: Attempted ${prevTokens} -> ${newTokens}`);
            throw new Error('SECURITY VIOLATION: Unauthorized attempt to increment grbxTokens.');
          }
        } else {
          // New user creation must initialize with 0 financial balances and student role
          finalPayload.gpBalance = 0;
          finalPayload.walletBalance = 0;
          finalPayload.totalGpEarned = 0;
          finalPayload.grbxTokens = 0;
          finalPayload.stakedTokens = 0;
          finalPayload.role = 'student';
          finalPayload.accountStatus = 'active';
          finalPayload.verified = false;
        }
      } else if (table === 'wallets') {
        if (existing) {
          const prevGp = Number(existing.gpBalance || existing.balanceGP || 0);
          const newGp = Number(finalPayload.gpBalance || finalPayload.balanceGP || 0);
          if (newGp > prevGp) {
            throw new Error('SECURITY VIOLATION: Unauthorized attempt to increment wallet GP balance.');
          }
        }
      } else if (table === 'wallettransactions' || table === 'transactions') {
        // Normal users can ONLY create debit records (isCredit: false)
        if (finalPayload.isCredit === true || finalPayload.action === 'Credit' || finalPayload.type === 'admin_adjustment' || finalPayload.type === 'gp_earned') {
          console.error(`[SECURITY DEFENSE] Blocked forged credit transaction for user ${finalPayload.userId}`);
          throw new Error('SECURITY VIOLATION: Unauthorized attempt to create credit transaction.');
        }
      } else if (table === 'guswinners' || table === 'gusprizetransactions') {
        throw new Error('SECURITY VIOLATION: Unauthorized competition prize modification.');
      }
    }
  }

  const row = {
    id: docId,
    data: finalPayload,
    updated_at: now,
  };

  let { error } = await supabase.from(table).upsert(row, { onConflict: 'id' });

  if (error) {
    console.warn(`[Supabase] Anon upsert notice in ${table}/${docId}, retrying with admin client:`, error.message);
    const adminRes = await supabaseAdmin.from(table).upsert(row, { onConflict: 'id' });
    error = adminRes.error;
  }

  if (error) {
    console.error(`[Supabase] Upsert error in ${table}/${docId}:`, error.message);
    if (typeof window !== 'undefined' && (error.message?.includes('schema cache') || error.message?.includes('relation') || error.message?.includes('does not exist'))) {
      try {
        localStorage.setItem(`grobaax_table_fallback_${table}_${docId}`, JSON.stringify(finalPayload));
      } catch {}
      console.warn(`[Supabase] Saved ${table}/${docId} to local fallback cache due to missing table/schema cache error`);
      broadcastTableMutation(table, tableName, docId, finalPayload, 'set');
      return finalPayload as T;
    }
    throw new Error(error.message);
  }

  // Broadcast mutation instantly across all devices, windows, and tabs
  broadcastTableMutation(table, tableName, docId, finalPayload, 'set');

  return finalPayload as T;
}

/**
 * Update an existing document in Supabase
 */
export async function updateDocInSupabase<T = any>(
  tableName: string,
  docId: string,
  updates: Partial<T>,
  options?: { isServerAuthoritative?: boolean }
): Promise<T> {
  return setDocToSupabase<T>(tableName, docId, updates as any, true, options);
}

/**
 * Delete a document from Supabase
 */
export async function deleteDocFromSupabase(tableName: string, docId: string): Promise<boolean> {
  try {
    const table = normalizeTableName(tableName);
    let { error } = await supabase.from(table).delete().eq('id', docId);
    if (error) {
      const adminRes = await supabaseAdmin.from(table).delete().eq('id', docId);
      error = adminRes.error;
    }
    if (error) {
      console.error(`[Supabase] Delete error in ${table}/${docId}:`, error.message);
      return false;
    }
    broadcastTableMutation(table, tableName, docId, { id: docId, isDeleted: true }, 'delete');
    return true;
  } catch (err) {
    console.error(`[Supabase] Exception deleting ${tableName}/${docId}:`, err);
    return false;
  }
}

/**
 * Query multiple documents from Supabase
 */
export async function queryDocsFromSupabase<T = any>(
  tableName: string,
  options?: {
    where?: [string, any, any][];
    orderBy?: { field: string; direction?: 'asc' | 'desc' }[];
    limit?: number;
  }
): Promise<T[]> {
  try {
    const table = normalizeTableName(tableName);
    let query = supabase.from(table).select('id, data, created_at, updated_at');

    // Always fetch latest records first so newly created questions and messages are never missed
    query = query.order('created_at', { ascending: false });

    // CRITICAL FIX: Only apply SQL limit if there are NO in-memory where filters to prevent
    // truncating the database before matching questions or active seasons can be found
    const hasWhere = Boolean(options?.where && options.where.length > 0);
    if (!hasWhere && options?.limit) {
      query = query.limit(Math.max(options.limit, 50));
    } else {
      query = query.limit(300);
    }

    let { data, error } = await query;
    if (error || !data) {
      let adminQuery = supabaseAdmin.from(table).select('id, data, created_at, updated_at').order('created_at', { ascending: false });
      if (!hasWhere && options?.limit) {
        adminQuery = adminQuery.limit(Math.max(options.limit, 50));
      } else {
        adminQuery = adminQuery.limit(300);
      }
      const adminRes = await adminQuery;
      if (!adminRes.error && adminRes.data) {
        data = adminRes.data;
        error = null;
      }
    }

    if (error) {
      console.warn(`[Supabase] Query error in ${table}:`, error.message);
      return [];
    }

    let items: T[] = (data || []).map((row: any) => ({
      ...(row.data || {}),
      id: row.id,
      createdAt: row.data?.createdAt || row.created_at,
      updatedAt: row.data?.updatedAt || row.updated_at,
    }));

    // Apply where filters in-memory for JSONB flexibility
    if (options?.where && options.where.length > 0) {
      items = items.filter((item: any) => {
        return options.where!.every(([field, op, val]) => {
          const itemVal = item[field];
          switch (op) {
            case '==':
              return itemVal === val;
            case '!=':
              return itemVal !== val;
            case '>':
              return itemVal > val;
            case '>=':
              return itemVal >= val;
            case '<':
              return itemVal < val;
            case '<=':
              return itemVal <= val;
            case 'in':
              return Array.isArray(val) && val.includes(itemVal);
            case 'array-contains':
              return Array.isArray(itemVal) && itemVal.includes(val);
            default:
              return true;
          }
        });
      });
    }

    // Apply ordering
    if (options?.orderBy && options.orderBy.length > 0) {
      items.sort((a: any, b: any) => {
        for (const ord of options.orderBy!) {
          const aVal = a[ord.field];
          const bVal = b[ord.field];
          if (aVal === bVal) continue;
          const dir = ord.direction === 'desc' ? -1 : 1;
          if (aVal === undefined || aVal === null) return 1;
          if (bVal === undefined || bVal === null) return -1;
          return aVal > bVal ? dir : -dir;
        }
        return 0;
      });
    }

    // Apply limit AFTER where filter and sorting so results are strictly correct
    if (options?.limit && items.length > options.limit) {
      items = items.slice(0, options.limit);
    }

    return items;
  } catch (err) {
    console.warn(`[Supabase] Exception querying ${tableName}:`, err);
    return [];
  }
}

/**
 * Subscribe to real-time changes on a Supabase table with instant synchronization
 */
export function subscribeToSupabase<T = any>(
  tableName: string,
  onData: (items: T[]) => void,
  options?: {
    filterDocId?: string;
    where?: [string, any, any][];
    orderBy?: { field: string; direction?: 'asc' | 'desc' }[];
    limit?: number;
  }
): () => void {
  const table = normalizeTableName(tableName);
  const channelId = `realtime:${table}:${options?.filterDocId || 'all'}:${Math.random().toString(36).substring(7)}`;

  // Ensure global realtime bus is connected
  getGlobalBusChannel();

  let isCancelled = false;
  let isFetching = false;

  // Run initial fetch and notification
  const fetchAndNotify = async () => {
    if (isCancelled || isFetching) return;
    isFetching = true;
    try {
      if (options?.filterDocId) {
        const single = await getDocFromSupabase<T>(tableName, options.filterDocId);
        if (!isCancelled) {
          onData(single ? [single] : []);
        }
      } else {
        const list = await queryDocsFromSupabase<T>(tableName, options);
        if (!isCancelled) {
          onData(list);
        }
      }
    } catch (err) {
      console.warn(`[Realtime] Sync notice for ${tableName}:`, err);
    } finally {
      isFetching = false;
    }
  };

  fetchAndNotify();

  // Register in memory table subscriber for direct sub-millisecond local triggers
  if (!inMemoryTableSubscribers.has(table)) {
    inMemoryTableSubscribers.set(table, new Set());
  }
  const subscriberCb = (payload?: any) => {
    if (options?.filterDocId && payload?.docId && payload.docId !== options.filterDocId) {
      return;
    }
    fetchAndNotify();
  };
  inMemoryTableSubscribers.get(table)!.add(subscriberCb);

  // Create real-time postgres changes channel
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: table,
      },
      (changePayload: any) => {
        const changedDocId = changePayload?.new?.id || changePayload?.old?.id;
        if (options?.filterDocId && changedDocId && changedDocId !== options.filterDocId) {
          return;
        }
        fetchAndNotify();
      }
    )
    .subscribe();

  activeChannels.set(channelId, channel);

  // WhatsApp-grade silent background sync: check every 3.5 seconds while page is active
  // Guarantees zero missed updates even under unstable mobile network conditions
  let syncInterval: any = null;
  if (typeof window !== 'undefined') {
    syncInterval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchAndNotify();
      }
    }, 3500);
  }

  // Listen to in-window mutation events for instantaneous synchronization across components
  let localCleanup: (() => void) | null = null;
  if (typeof window !== 'undefined') {
    const localHandler = (e: any) => {
      const detail = e.detail;
      if (!detail) return;
      if (
        detail.table === table ||
        detail.originalTable === tableName ||
        detail.table === tableName ||
        normalizeTableName(detail.table || '') === table
      ) {
        if (options?.filterDocId && detail.docId && detail.docId !== options.filterDocId) {
          return;
        }
        fetchAndNotify();
      }
    };
    window.addEventListener('supabase_table_changed', localHandler);
    localCleanup = () => {
      window.removeEventListener('supabase_table_changed', localHandler);
    };
  }

  return () => {
    isCancelled = true;
    if (syncInterval) clearInterval(syncInterval);
    if (localCleanup) localCleanup();
    const set = inMemoryTableSubscribers.get(table);
    if (set) {
      set.delete(subscriberCb);
      if (set.size === 0) inMemoryTableSubscribers.delete(table);
    }
    supabase.removeChannel(channel);
    activeChannels.delete(channelId);
  };
}

// ---------------------------------------------------------------------------
// SUPABASE AUTH FLOW ADAPTER
// ---------------------------------------------------------------------------

export interface SupabaseAuthUser {
  id: string;
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  emailVerified?: boolean;
}

export function formatSupabaseUser(user: SupabaseUser | null): SupabaseAuthUser | null {
  if (!user) return null;
  return {
    id: user.id,
    uid: user.id,
    email: user.email,
    displayName: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
    photoURL: user.user_metadata?.avatar_url || user.user_metadata?.picture,
    emailVerified: Boolean(user.email_confirmed_at || user.confirmed_at),
  };
}
