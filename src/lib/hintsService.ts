import {
  db,
  auth,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from './firebase';
import { CompetitionHint, CompetitionHintType, HintSubscriptionTier, HintStatus } from '../types';
import { grobaxNotificationService } from './notificationService';

export const HINTS_COLLECTION = 'competition_hints';
const CACHE_KEY = 'grobax_competition_hints_cache';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
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

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
    },
  };
  console.error('Firestore Hints Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Reads locally cached hints for instant hydration
 */
export function getCachedCompetitionHints(): CompetitionHint[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CompetitionHint[];
  } catch (err) {
    console.warn('Failed to parse cached hints:', err);
    return [];
  }
}

/**
 * Saves hints to local cache for instant UI rendering
 */
export function setCachedCompetitionHints(hints: CompetitionHint[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(hints));
  } catch (err) {
    console.warn('Failed to cache hints:', err);
  }
}

/**
 * Subscribes to real-time competition hints from Firestore.
 */
export function subscribeToCompetitionHints(
  onUpdate: (hints: CompetitionHint[]) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    const hintsRef = collection(db, HINTS_COLLECTION);
    const q = query(hintsRef, orderBy('createdAt', 'desc'), limit(20));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: CompetitionHint[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          // Extract questions safely from array, or fallback to preparationMessage/title
          let questions: string[] = [];
          if (Array.isArray(data.possibleQuestions)) {
            questions = data.possibleQuestions.filter((q: any) => typeof q === 'string' && q.trim().length > 0);
          } else if (typeof data.preparationMessage === 'string' && data.preparationMessage.trim()) {
            questions = [data.preparationMessage.trim()];
          }

          items.push({
            id: docSnap.id,
            competitionType: data.competitionType as CompetitionHintType,
            possibleQuestions: questions,
            roundLabel: data.roundLabel || '',
            title: data.title || '',
            category: data.category || '',
            topic: data.topic || '',
            areasToPrepare: Array.isArray(data.areasToPrepare) ? data.areasToPrepare : [],
            preparationMessage: data.preparationMessage || '',
            accessLevel: (data.accessLevel as HintSubscriptionTier) || 'both',
            status: (data.status as HintStatus) || 'published',
            createdByUid: data.createdByUid || '',
            createdByName: data.createdByName || '',
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
          });
        });

        setCachedCompetitionHints(items);
        onUpdate(items);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, HINTS_COLLECTION);
        } catch (err) {
          if (onError) onError(err as Error);
        }
      }
    );

    return unsubscribe;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, HINTS_COLLECTION);
  }
}

export interface CreateHintInput {
  competitionType: CompetitionHintType;
  possibleQuestions: string[];
  roundLabel?: string;
  title?: string;
  category?: string;
  topic?: string;
  areasToPrepare?: string[];
  preparationMessage?: string;
  accessLevel: HintSubscriptionTier;
  status: HintStatus;
  createdByUid?: string;
  createdByName?: string;
}

/**
 * Creates a new competition hint in Firestore
 */
export async function createCompetitionHint(input: CreateHintInput): Promise<CompetitionHint> {
  const docId = `hint_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const hintDocRef = doc(db, HINTS_COLLECTION, docId);
  const now = new Date().toISOString();

  const cleanedQuestions = Array.isArray(input.possibleQuestions)
    ? input.possibleQuestions.map((q) => q.trim()).filter((q) => q.length > 0)
    : [];

  const newHint: CompetitionHint = {
    id: docId,
    competitionType: input.competitionType,
    possibleQuestions: cleanedQuestions,
    roundLabel: (input.roundLabel || '').trim(),
    title: (input.title || '').trim(),
    category: (input.category || '').trim(),
    topic: (input.topic || '').trim(),
    areasToPrepare: Array.isArray(input.areasToPrepare)
      ? input.areasToPrepare.filter((item) => item.trim().length > 0)
      : [],
    preparationMessage: (input.preparationMessage || '').trim(),
    accessLevel: input.accessLevel,
    status: input.status,
    createdByUid: input.createdByUid || auth?.currentUser?.uid || '',
    createdByName: input.createdByName || auth?.currentUser?.displayName || 'Admin',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(hintDocRef, {
      ...newHint,
      serverCreatedAt: serverTimestamp(),
      serverUpdatedAt: serverTimestamp(),
    });

    // Update local cache
    const current = getCachedCompetitionHints();
    setCachedCompetitionHints([newHint, ...current]);

    if (newHint.status === 'published') {
      grobaxNotificationService.incrementSection('hints', 1);
    }

    return newHint;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${HINTS_COLLECTION}/${docId}`);
  }
}

/**
 * Updates an existing competition hint in Firestore
 */
export async function updateCompetitionHint(
  id: string,
  updates: Partial<Omit<CompetitionHint, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, HINTS_COLLECTION, id);
  const now = new Date().toISOString();

  try {
    await updateDoc(docRef, {
      ...updates,
      updatedAt: now,
      serverUpdatedAt: serverTimestamp(),
    });

    // Update local cache
    const current = getCachedCompetitionHints();
    const updated = current.map((item) => (item.id === id ? { ...item, ...updates, updatedAt: now } : item));
    setCachedCompetitionHints(updated);

    if (updates.status === 'published') {
      grobaxNotificationService.incrementSection('hints', 1);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${HINTS_COLLECTION}/${id}`);
  }
}

/**
 * Deletes a competition hint from Firestore
 */
export async function deleteCompetitionHint(id: string): Promise<void> {
  const docRef = doc(db, HINTS_COLLECTION, id);

  try {
    await deleteDoc(docRef);

    // Update local cache
    const current = getCachedCompetitionHints();
    setCachedCompetitionHints(current.filter((item) => item.id !== id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${HINTS_COLLECTION}/${id}`);
  }
}
