import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  onSnapshot,
  writeBatch,
  runTransaction,
  WhereFilterOp,
  Unsubscribe,
  QueryConstraint,
  db,
  auth,
} from './supabaseFirestoreAdapter';

export type Transaction = any;
export type DocumentData = any;

/**
 * ============================================================================
 * GROBAAX MASTER UNIFIED DATA ACCESS & CRUD ARCHITECTURE
 * ============================================================================
 * Standardized, high-performance, cached, and secure data access engine
 * used globally across all User App and Admin Panel features.
 */

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
  BATCH = 'batch',
  TRANSACTION = 'transaction',
  SUBSCRIBE = 'subscribe',
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
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function isQuotaExceededError(err: unknown): boolean {
  if (!err) return false;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('quota exceeded') ||
    msg.includes('resource-exhausted') ||
    msg.includes('free daily read units') ||
    msg.includes('quota limit')
  );
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  if (isQuotaExceededError(error)) {
    console.warn(`[Grobaax DataAccess] Daily free-tier Firestore quota limit reached on ${path}. Serving cached state.`, JSON.stringify(errInfo));
  } else {
    console.warn(`[Grobaax DataAccess] ${operationType.toUpperCase()} Notice on ${path}:`, JSON.stringify(errInfo));
  }
}

/**
 * Sanitize undefined values recursively for Firestore writes
 */
export function sanitizeData<T = any>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => sanitizeData(item)) as unknown as T;
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj as Record<string, any>)) {
    if (value !== undefined) {
      if (value && typeof value === 'object' && !(value instanceof Date)) {
        result[key] = sanitizeData(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result as T;
}

// ---------------------------------------------------------------------------
// IN-MEMORY CACHE & REQUEST DEDUPLICATION
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class GrobaaxDataEngine {
  private cache = new Map<string, CacheEntry<any>>();
  private inFlightRequests = new Map<string, Promise<any>>();
  private defaultTtlMs = 60 * 1000; // 1 minute default cache for read optimizations

  /**
   * Deduplicates concurrent identical async requests
   */
  private async deduplicate<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    if (this.inFlightRequests.has(key)) {
      return this.inFlightRequests.get(key) as Promise<T>;
    }
    const promise = fetcher().finally(() => {
      this.inFlightRequests.delete(key);
    });
    this.inFlightRequests.set(key, promise);
    return promise;
  }

  /**
   * Set cache entry
   */
  setCache<T>(key: string, data: T, ttlMs: number = this.defaultTtlMs): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Get valid cache entry if not expired
   */
  getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  /**
   * Invalidate specific cache keys or collections
   */
  invalidateCache(prefixOrKey?: string): void {
    if (!prefixOrKey) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key === prefixOrKey || key.startsWith(`${prefixOrKey}:`) || key.startsWith(`${prefixOrKey}/`)) {
        this.cache.delete(key);
      }
    }
  }

  // -------------------------------------------------------------------------
  // CORE CRUD STANDARDS
  // -------------------------------------------------------------------------

  /**
   * CREATE: Adds or overwrites a document with unified sanitization
   */
  async create<T = any>(
    collectionPath: string,
    data: T,
    customId?: string
  ): Promise<{ id: string; data: T }> {
    const sanitized = sanitizeData(data);
    const docId = customId || (data as any)?.id || doc(collection(db, collectionPath)).id;
    const docRef = doc(db, collectionPath, docId);
    const payload = {
      ...sanitized,
      id: docId,
      createdAt: (sanitized as any)?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(docRef, payload);
      this.invalidateCache(collectionPath);
      return { id: docId, data: payload as T };
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${collectionPath}/${docId}`);
    }
  }

  /**
   * Alias for get()
   */
  async getById<T = any>(
    collectionPath: string,
    docId: string,
    options?: { useCache?: boolean; ttlMs?: number; forceRefresh?: boolean }
  ): Promise<T | null> {
    return this.get<T>(collectionPath, docId, options);
  }

  /**
   * Alias for list()
   */
  async find<T = any>(
    collectionPath: string,
    options?: {
      where?: [string, WhereFilterOp, any][];
      orderBy?: { field: string; direction?: 'asc' | 'desc' }[];
      limitCount?: number;
      limit?: number;
      startAfter?: any;
      useCache?: boolean;
      ttlMs?: number;
    }
  ): Promise<T[]> {
    return this.list<T>(collectionPath, {
      ...options,
      limit: options?.limit ?? options?.limitCount,
    });
  }

  /**
   * READ: Single document with optional caching & in-flight deduplication
   */
  async get<T = any>(
    collectionPath: string,
    docId: string,
    options?: { useCache?: boolean; ttlMs?: number; forceRefresh?: boolean }
  ): Promise<T | null> {
    if (!docId) return null;
    const cacheKey = `${collectionPath}/${docId}`;

    if (options?.useCache && !options?.forceRefresh) {
      const cached = this.getCache<T>(cacheKey);
      if (cached !== null) return cached;
    }

    return this.deduplicate(cacheKey, async () => {
      try {
        const docRef = doc(db, collectionPath, docId);
        const snap = await getDoc(docRef);
        if (!snap.exists()) return null;
        const result = { id: snap.id, ...snap.data() } as T;
        if (options?.useCache) {
          this.setCache(cacheKey, result, options.ttlMs);
        }
        return result;
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, cacheKey);
        const cached = this.getCache<T>(cacheKey);
        return cached || null;
      }
    });
  }

  /**
   * LIST / QUERY: Standard query listing with where, orderBy, pagination, and caching
   */
  async list<T = any>(
    collectionPath: string,
    options?: {
      where?: [string, WhereFilterOp, any][];
      orderBy?: { field: string; direction?: 'asc' | 'desc' }[];
      limit?: number;
      startAfter?: any;
      useCache?: boolean;
      ttlMs?: number;
      forceRefresh?: boolean;
    }
  ): Promise<T[]> {
    const queryKey = `${collectionPath}:query:${JSON.stringify(options || {})}`;

    if (options?.useCache && !options?.forceRefresh) {
      const cached = this.getCache<T[]>(queryKey);
      if (cached !== null) return cached;
    }

    return this.deduplicate(queryKey, async () => {
      try {
        const constraints: QueryConstraint[] = [];

        if (options?.where) {
          for (const [f, op, val] of options.where) {
            if (val !== undefined) {
              constraints.push(where(f, op, val));
            }
          }
        }

        if (options?.orderBy) {
          for (const ord of options.orderBy) {
            constraints.push(orderBy(ord.field, ord.direction || 'asc'));
          }
        }

        if (options?.startAfter) {
          constraints.push(startAfter(options.startAfter));
        }

        const safeLimit = options?.limit && options.limit > 0 ? options.limit : 50;
        constraints.push(firestoreLimit(safeLimit));

        const q = query(collection(db, collectionPath), ...constraints);

        const snap = await getDocs(q);
        const results = snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));

        if (options?.useCache) {
          this.setCache(queryKey, results, options.ttlMs);
        }
        return results;
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, collectionPath);
        const cached = this.getCache<T[]>(queryKey);
        return cached || [];
      }
    });
  }

  /**
   * UPDATE: Updates existing document partially with timestamp and cache eviction
   */
  async update<T = any>(collectionPath: string, docId: string, data: Partial<T>): Promise<void> {
    if (!docId) throw new Error(`Document ID is required for update in ${collectionPath}`);
    const sanitized = sanitizeData({
      ...data,
      updatedAt: (data as any)?.updatedAt || new Date().toISOString(),
    });

    try {
      const docRef = doc(db, collectionPath, docId);
      await updateDoc(docRef, sanitized as DocumentData);
      this.invalidateCache(collectionPath);
      this.invalidateCache(`${collectionPath}/${docId}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${collectionPath}/${docId}`);
    }
  }

  /**
   * DELETE: Deletes document with optional cascade deletion of related child records
   */
  async delete(
    collectionPath: string,
    docId: string,
    options?: {
      cascade?: { collection: string; foreignKey: string }[];
    }
  ): Promise<void> {
    if (!docId) return;

    try {
      // 1. Process cascade collections if requested
      if (options?.cascade && options.cascade.length > 0) {
        for (const target of options.cascade) {
          const childQuery = query(collection(db, target.collection), where(target.foreignKey, '==', docId));
          const childSnap = await getDocs(childQuery);
          if (!childSnap.empty) {
            for (let i = 0; i < childSnap.docs.length; i += 400) {
              const chunk = childSnap.docs.slice(i, i + 400);
              const batch = writeBatch(db);
              chunk.forEach((d) => batch.delete(d.ref));
              await batch.commit();
            }
            this.invalidateCache(target.collection);
          }
        }
      }

      // 2. Delete primary document
      const docRef = doc(db, collectionPath, docId);
      await deleteDoc(docRef);
      this.invalidateCache(collectionPath);
      this.invalidateCache(`${collectionPath}/${docId}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${collectionPath}/${docId}`);
    }
  }

  /**
   * BATCH: Executes multiple writes/deletes atomically in chunked batches (up to 450 per batch)
   */
  async batch(
    operations: {
      type: 'set' | 'update' | 'delete';
      collection: string;
      id: string;
      data?: any;
    }[]
  ): Promise<void> {
    if (operations.length === 0) return;

    try {
      const affectedCollections = new Set<string>();

      for (let i = 0; i < operations.length; i += 400) {
        const chunk = operations.slice(i, i + 400);
        const batchInstance = writeBatch(db);

        for (const op of chunk) {
          affectedCollections.add(op.collection);
          const docRef = doc(db, op.collection, op.id);

          if (op.type === 'delete') {
            batchInstance.delete(docRef);
          } else if (op.type === 'update') {
            batchInstance.update(docRef, sanitizeData({ ...op.data, updatedAt: new Date().toISOString() }));
          } else if (op.type === 'set') {
            batchInstance.set(
              docRef,
              sanitizeData({
                ...op.data,
                id: op.id,
                updatedAt: new Date().toISOString(),
              }),
              { merge: true }
            );
          }
        }
        await batchInstance.commit();
      }

      affectedCollections.forEach((col) => this.invalidateCache(col));
    } catch (err) {
      handleFirestoreError(err, OperationType.BATCH, 'batch_operation');
    }
  }

  /**
   * TRANSACTION: Runs an atomic transaction with consistent error boundary
   */
  async transaction<T>(updateFunction: (transaction: Transaction) => Promise<T>): Promise<T> {
    try {
      const result = await runTransaction(db, updateFunction);
      this.invalidateCache();
      return result;
    } catch (err) {
      handleFirestoreError(err, OperationType.TRANSACTION, 'atomic_transaction');
    }
  }

  /**
   * SUBSCRIBE (LIST): Real-time live listener for dynamic/interactive collections
   */
  subscribe<T = any>(
    collectionPath: string,
    options: {
      where?: [string, WhereFilterOp, any][];
      orderBy?: { field: string; direction?: 'asc' | 'desc' }[];
      limit?: number;
    },
    callback: (data: T[]) => void,
    onError?: (err: any) => void
  ): Unsubscribe {
    const constraints: QueryConstraint[] = [];

    if (options.where) {
      for (const [f, op, val] of options.where) {
        if (val !== undefined) {
          constraints.push(where(f, op, val));
        }
      }
    }

    if (options.orderBy) {
      for (const ord of options.orderBy) {
        constraints.push(orderBy(ord.field, ord.direction || 'asc'));
      }
    }

    const safeLimit = options.limit && options.limit > 0 ? options.limit : 50;
    constraints.push(firestoreLimit(safeLimit));

    const q = query(collection(db, collectionPath), ...constraints);

    const cacheKey = `${collectionPath}:subscribe_last_cache`;

    return onSnapshot(
      q,
      (snap) => {
        const results = snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
        this.setCache(cacheKey, results, 10 * 60 * 1000);
        callback(results);
      },
      (err) => {
        const cached = this.getCache<T[]>(cacheKey);
        if (cached && cached.length > 0) {
          try {
            callback(cached);
          } catch (_) {}
        }
        if (onError) {
          onError(err);
        } else {
          handleFirestoreError(err, OperationType.SUBSCRIBE, collectionPath);
        }
      }
    );
  }

  /**
   * SUBSCRIBE (DOC): Real-time single document listener
   */
  subscribeDoc<T = any>(
    collectionPath: string,
    docId: string,
    callback: (data: T | null) => void,
    onError?: (err: any) => void
  ): Unsubscribe {
    const docRef = doc(db, collectionPath, docId);
    const cacheKey = `${collectionPath}/${docId}`;

    return onSnapshot(
      docRef,
      (snap) => {
        if (!snap.exists()) {
          callback(null);
        } else {
          const docData = { id: snap.id, ...snap.data() } as T;
          this.setCache(cacheKey, docData, 10 * 60 * 1000);
          callback(docData);
        }
      },
      (err) => {
        const cached = this.getCache<T>(cacheKey);
        if (cached) {
          try {
            callback(cached);
          } catch (_) {}
        }
        if (onError) {
          onError(err);
        } else {
          handleFirestoreError(err, OperationType.SUBSCRIBE, `${collectionPath}/${docId}`);
        }
      }
    );
  }
}

// Global Singleton Instance
export const grobaxDataService = new GrobaaxDataEngine();
export const grobaaxDataService = grobaxDataService;
export const GrobaaxDataAccess = grobaxDataService;
export const GrobaxDataAccess = grobaxDataService;

// ---------------------------------------------------------------------------
// FEATURE DOMAIN REPOSITORIES
// ---------------------------------------------------------------------------

/**
 * USER & AUTH REPOSITORY
 */
export const UserRepo = {
  getProfile: (uid: string) => grobaxDataService.get('users', uid, { useCache: true, ttlMs: 30000 }),
  setProfile: (uid: string, data: any) => grobaxDataService.create('users', data, uid),
  updateProfile: (uid: string, data: any) => grobaxDataService.update('users', uid, data),
  listUsers: (limitCount = 200) => grobaxDataService.list('users', { limit: limitCount }),
  subscribeProfile: (uid: string, cb: (u: any) => void) => grobaxDataService.subscribeDoc('users', uid, cb),
};

/**
 * INSTITUTIONS & ACADEMIC REPOSITORY
 */
export const InstitutionRepo = {
  list: (options?: { useCache?: boolean; ttlMs?: number }) =>
    grobaxDataService.list('institutions', {
      orderBy: [{ field: 'name', direction: 'asc' }],
      useCache: options?.useCache ?? true,
      ttlMs: options?.ttlMs ?? 120000,
    }),
  get: (id: string) => grobaxDataService.get('institutions', id, { useCache: true }),
  create: (data: any, customId?: string) => grobaxDataService.create('institutions', data, customId),
  update: (id: string, data: any) => grobaxDataService.update('institutions', id, data),
  saveInstitution: (data: any) => grobaxDataService.create('institutions', data, data.id),
  delete: (id: string) =>
    grobaxDataService.delete('institutions', id, {
      cascade: [
        { collection: 'departments', foreignKey: 'institutionId' },
      ],
    }),
  deleteInstitution: (id: string) =>
    grobaxDataService.delete('institutions', id, {
      cascade: [
        { collection: 'departments', foreignKey: 'institutionId' },
      ],
    }),
  subscribe: (cb: (list: any[]) => void) =>
    grobaxDataService.subscribe('institutions', { orderBy: [{ field: 'name', direction: 'asc' }] }, cb),
  subscribeInstitutions: (cb: (list: any[]) => void) =>
    grobaxDataService.subscribe('institutions', { orderBy: [{ field: 'name', direction: 'asc' }] }, cb),
};

/**
 * GUS COMPETITION REPOSITORY
 */
export const GusRepo = {
  getActiveCompetition: (id = 'active_gus_competition') => grobaxDataService.get('gusCompetitions', id),
  saveCompetition: (data: any, id = 'active_gus_competition') =>
    grobaxDataService.create('gusCompetitions', data, id),
  subscribeActive: (id: string, cb: (comp: any) => void) =>
    grobaxDataService.subscribeDoc('gusCompetitions', id, cb),
  listQuestions: (competitionId?: string) =>
    grobaxDataService.list(
      'gusQuestions',
      competitionId ? { where: [['competitionId', '==', competitionId]] } : {}
    ),
  saveQuestion: (data: any) => grobaxDataService.create('gusQuestions', data),
  deleteQuestion: (id: string) => grobaxDataService.delete('gusQuestions', id),
};

/**
 * MINIMART REPOSITORY
 */
export const MinimartRepo = {
  listProducts: () => grobaxDataService.list('minimartProducts', { orderBy: [{ field: 'createdAt', direction: 'desc' }] }),
  getProduct: (id: string) => grobaxDataService.get('minimartProducts', id),
  saveProduct: (data: any, customId?: string) => grobaxDataService.create('minimartProducts', data, customId || data?.id),
  updateProduct: (id: string, data: any) => grobaxDataService.update('minimartProducts', id, data),
  deleteProduct: (id: string) =>
    grobaxDataService.delete('minimartProducts', id, {
      cascade: [{ collection: 'minimartReports', foreignKey: 'productId' }],
    }),
  listCategories: () => grobaxDataService.list('minimartCategories', { useCache: true, ttlMs: 300000 }),
  subscribeConfig: (cb: (c: any) => void) =>
    grobaxDataService.subscribeDoc('minimartConfig', 'global', cb),
  subscribeCategories: (cb: (cats: any[]) => void) =>
    grobaxDataService.subscribe('minimartCategories', { orderBy: [{ field: 'displayOrder', direction: 'asc' }] }, cb),
  subscribeProducts: (cb: (prods: any[]) => void) =>
    grobaxDataService.subscribe('minimartProducts', { orderBy: [{ field: 'createdAt', direction: 'desc' }] }, cb),
};

/**
 * FINANCE & WALLET REPOSITORY
 */
export const FinanceRepo = {
  listTransactions: (userId?: string, limitCount = 100) =>
    grobaxDataService.list(
      'transactions',
      userId
        ? { where: [['userId', '==', userId]], orderBy: [{ field: 'timestamp', direction: 'desc' }], limit: limitCount }
        : { orderBy: [{ field: 'timestamp', direction: 'desc' }], limit: limitCount }
    ),
  recordTransaction: (tx: any) => grobaxDataService.create('transactions', tx),
  listWithdrawals: (limitCount = 100) =>
    grobaxDataService.list('withdrawals', { orderBy: [{ field: 'createdAt', direction: 'desc' }], limit: limitCount }),
  createWithdrawal: (w: any) => grobaxDataService.create('withdrawals', w),
  updateWithdrawal: (id: string, data: any) => grobaxDataService.update('withdrawals', id, data),
};

// Aliases for seamless camelCase imports across the application
export const userRepo = UserRepo;
export const institutionRepo = InstitutionRepo;
export const gusRepo = GusRepo;
export const minimartRepo = MinimartRepo;
export const financeRepo = FinanceRepo;
