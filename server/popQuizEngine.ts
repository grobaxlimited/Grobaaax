import fs from 'fs';
import path from 'path';
import { supabaseAdmin, isSuperAdmin } from '../src/lib/supabase';
import {
  PopQuizSession,
  PopQuizQuestion,
  PopQuizSubmission,
  PopQuizPublicState,
  PopQuizStatus,
} from '../src/types';

// Paths for durable file persistence (survives process restarts and cold starts)
const DATA_DIR = path.join(process.cwd(), 'server');
const SESSIONS_FILE = path.join(DATA_DIR, 'pop_quiz_sessions.json');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'pop_quiz_submissions.json');

// In-memory cache of sessions for zero-latency retrieval and resilient recovery
const sessionsCache = new Map<string, PopQuizSession>();
let hasInitializedFromStorage = false;

// Active question winner lock mutex per questionId
const questionWinnerLocks = new Set<string>();

// Track processed submission IDs to prevent replays
const processedSubmissionKeys = new Set<string>();

/**
 * Reads sessions from local JSON file
 */
function readSessionsFromDisk(): PopQuizSession[] {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[Pop Quiz Engine] Notice reading sessions disk cache:', err);
  }
  return [];
}

/**
 * Writes sessions to local JSON file
 */
function writeSessionsToDisk(sessions: PopQuizSession[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Pop Quiz Engine] Notice writing sessions disk cache:', err);
  }
}

/**
 * Appends submission to local JSON file
 */
function appendSubmissionToDisk(submission: PopQuizSubmission): void {
  try {
    let submissions: PopQuizSubmission[] = [];
    if (fs.existsSync(SUBMISSIONS_FILE)) {
      try {
        const raw = fs.readFileSync(SUBMISSIONS_FILE, 'utf-8');
        submissions = JSON.parse(raw) || [];
      } catch {}
    }
    submissions.push(submission);
    // Keep last 1000 submissions
    if (submissions.length > 1000) {
      submissions = submissions.slice(-1000);
    }
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Pop Quiz Engine] Notice writing submissions disk cache:', err);
  }
}

/**
 * Normalizes answer text for fair, robust comparison
 */
export function normalizeAnswer(ans: string): string {
  if (!ans) return '';
  return ans
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .toLowerCase()
    .trim()
    .replace(/^["'‘“]+|["'’”]+$/g, '') // remove surrounding quotes
    .replace(/\s+/g, ' ') // collapse multiple spaces
    .replace(/[\.\,\!\?]+$/g, '') // remove trailing punctuation
    .trim();
}

/**
 * Strips common conversational and filler prefixes/suffixes from student answers
 */
function stripFillers(str: string): string {
  return str
    .replace(/^(?:it\s+is|it\'s|the\s+answer\s+is|answer\s+is|answer\s*[:\-])\s+/i, '')
    .replace(/^(?:the|a|an|option|choice)\s+/i, '')
    .replace(/\s+(?:organelle|planet|process|blood\s+group|group|type)$/i, '')
    .replace(/^(?:planet|blood\s+group|group|type)\s+/i, '')
    .trim();
}

/**
 * Computes Levenshtein edit distance for typo tolerance
 */
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Extracts all valid semantic variants from an answer string
 */
function getAnswerVariants(text: string): string[] {
  const c = normalizeAnswer(text);
  if (!c) return [];
  const variants = new Set<string>([c]);

  const stripped = stripFillers(c);
  if (stripped) variants.add(stripped);

  // Split on slashes, semicolons, or 'or' (e.g., "Mitochondria / Mitochondrion", "O / O-")
  const parts = c.split(/[\/\|\;]|\s+or\s+/);
  if (parts.length > 1) {
    parts.forEach((p) => {
      const pc = normalizeAnswer(p);
      if (pc) {
        variants.add(pc);
        const ps = stripFillers(pc);
        if (ps) variants.add(ps);
      }
    });
  }

  // Remove parenthetical details: e.g. "O (negative)" -> "o", "Metamorphosis (complete)" -> "metamorphosis"
  const noParen = c.replace(/\([^\)]*\)/g, '').trim();
  if (noParen && noParen !== c) {
    variants.add(normalizeAnswer(noParen));
    variants.add(stripFillers(normalizeAnswer(noParen)));
  }

  // Biological and scientific plurals/singulars & synonyms
  const bioEquivalents: Record<string, string> = {
    mitochondria: 'mitochondrion',
    mitochondrion: 'mitochondria',
    amoeba: 'amoebae',
    amoebae: 'amoeba',
    bacteria: 'bacterium',
    bacterium: 'bacteria',
    fungus: 'fungi',
    fungi: 'fungus',
    nucleus: 'nuclei',
    nuclei: 'nucleus',
    protozoa: 'protozoon',
    protozoon: 'protozoa',
    metamorphosis: 'complete metamorphosis',
    'complete metamorphosis': 'metamorphosis',
  };

  Array.from(variants).forEach((v) => {
    if (bioEquivalents[v]) {
      variants.add(bioEquivalents[v]);
    }
  });

  return Array.from(variants);
}

/**
 * Checks if a submitted answer matches the correct answer
 * Supports:
 * - Direct matches & multi-word normalization
 * - Biological plurals/singulars (Mitochondria / Mitochondrion)
 * - Blood groups (O, O negative, O-, Type O, Blood group O)
 * - Conversational prefixes ("It is mitochondria", "Planet Venus")
 * - Typo tolerance (Levenshtein distance <= 1-2 for longer scientific words)
 */
export function isAnswerCorrect(submitted: string, correct: string): boolean {
  const subClean = normalizeAnswer(submitted);
  const corClean = normalizeAnswer(correct);
  if (!subClean || !corClean) return false;

  const subVariants = getAnswerVariants(submitted);
  const corVariants = getAnswerVariants(correct);

  // 1. Direct or variant cross-match
  for (const sv of subVariants) {
    for (const cv of corVariants) {
      if (sv === cv) return true;
    }
  }

  // 2. Special blood group logic (e.g. Universal donor 'O' matches O-, O negative, Type O, etc.)
  const isCorBloodGroupO = corVariants.some(
    (v) => v === 'o' || v === 'group o' || v === 'blood group o' || v === 'type o'
  );
  if (isCorBloodGroupO) {
    const isSubBloodGroupO = subVariants.some((v) =>
      ['o', 'o-', 'o+', 'o negative', 'o positive', 'group o', 'type o', 'blood group o', 'o neg', 'o pos'].includes(v)
    );
    if (isSubBloodGroupO) return true;
  }

  // 3. Typo tolerance (Levenshtein distance)
  for (const sv of subVariants) {
    for (const cv of corVariants) {
      if (cv.length >= 5) {
        const dist = levenshteinDistance(sv, cv);
        const maxDist = cv.length >= 8 ? 2 : 1;
        if (dist <= maxDist) return true;
      }
    }
  }

  // 4. Substring / Word inclusion for specific multi-word answers
  for (const cv of corVariants) {
    if (cv.length >= 5) {
      const words = subClean.split(/\s+/);
      if (words.includes(cv)) return true;
    }
  }

  return false;
}

/**
 * Broadcast event to connected clients via Supabase Realtime channel
 */
export async function broadcastPopQuizEvent(event: string, payload: any) {
  try {
    const channel = supabaseAdmin.channel('grobaax-realtime-bus');
    await channel.send({
      type: 'broadcast',
      event: `pop_quiz_${event}`,
      payload: {
        ...payload,
        timestamp: Date.now(),
      },
    });
  } catch (err) {
    // Non-blocking notice
  }
}

/**
 * Persists session across all storage layers (Memory + Disk + Supabase DB)
 */
export async function persistSession(session: PopQuizSession): Promise<void> {
  session.updatedAt = new Date().toISOString();
  sessionsCache.set(session.id, session);

  // 1. Immediately persist to disk file
  try {
    const allSessions = Array.from(sessionsCache.values());
    writeSessionsToDisk(allSessions);
  } catch (diskErr) {
    console.warn(`[Pop Quiz Engine] Notice disk save for session ${session.id}:`, diskErr);
  }

  // 2. Persist to Supabase pop_quiz_sessions table
  try {
    const row = {
      id: session.id,
      data: session,
      updated_at: session.updatedAt,
    };
    await supabaseAdmin.from('pop_quiz_sessions').upsert(row, { onConflict: 'id' });
  } catch (err: any) {
    console.warn(`[Pop Quiz Engine] Notice DB save for session ${session.id}:`, err?.message || err);
  }

  // 3. Dual-backup to liveSessions table
  try {
    await supabaseAdmin.from('liveSessions').upsert(
      {
        id: session.id,
        data: {
          ...session,
          type: 'pop_quiz',
        },
        updated_at: session.updatedAt,
      },
      { onConflict: 'id' }
    );
  } catch {}
}

/**
 * Ensures sessions are loaded into memory cache from disk and database
 */
export async function ensureSessionsLoaded(): Promise<void> {
  if (hasInitializedFromStorage && sessionsCache.size > 0) {
    return;
  }

  // 1. Load from disk first (instant)
  const diskSessions = readSessionsFromDisk();
  for (const s of diskSessions) {
    if (s && s.id) {
      sessionsCache.set(s.id, s);
    }
  }

  // 2. Load from Supabase DB to get freshest remote state
  try {
    const { data, error } = await supabaseAdmin
      .from('pop_quiz_sessions')
      .select('id, data, updated_at')
      .order('updated_at', { ascending: false })
      .limit(100);

    if (!error && Array.isArray(data)) {
      data.forEach((row: any) => {
        if (row?.data?.id) {
          const existing = sessionsCache.get(row.data.id);
          // If remote is newer or not in memory, use it
          if (!existing || new Date(row.updated_at).getTime() >= new Date(existing.updatedAt).getTime()) {
            sessionsCache.set(row.data.id, row.data);
          }
        }
      });
    }
  } catch (err: any) {
    console.warn('[Pop Quiz Engine] Notice loading sessions from db:', err?.message || err);
  }

  // Sync back to disk
  if (sessionsCache.size > 0) {
    writeSessionsToDisk(Array.from(sessionsCache.values()));
  }

  hasInitializedFromStorage = true;
}

/**
 * Loads all sessions from database/disk into in-memory cache
 */
export async function loadSessionsFromDatabase(): Promise<PopQuizSession[]> {
  await ensureSessionsLoaded();

  // Try refreshing from remote DB
  try {
    const { data, error } = await supabaseAdmin
      .from('pop_quiz_sessions')
      .select('id, data, updated_at')
      .order('updated_at', { ascending: false })
      .limit(100);

    if (!error && Array.isArray(data)) {
      data.forEach((row: any) => {
        if (row?.data?.id) {
          sessionsCache.set(row.data.id, row.data);
        }
      });
      writeSessionsToDisk(Array.from(sessionsCache.values()));
    }
  } catch (err: any) {
    console.warn('[Pop Quiz Engine] Notice refreshing sessions from db:', err?.message || err);
  }

  return Array.from(sessionsCache.values());
}

/**
 * Gets a session by ID
 */
export async function getSessionById(sessionId: string): Promise<PopQuizSession | null> {
  await ensureSessionsLoaded();

  if (sessionsCache.has(sessionId)) {
    return sessionsCache.get(sessionId)!;
  }

  try {
    const { data } = await supabaseAdmin
      .from('pop_quiz_sessions')
      .select('id, data')
      .eq('id', sessionId)
      .maybeSingle();

    if (data?.data) {
      sessionsCache.set(sessionId, data.data);
      return data.data;
    }
  } catch {}

  return null;
}

/**
 * Permanently deletes a session across all storage tiers (Memory + Disk + Supabase DB)
 */
export async function deleteSessionFromDatabase(sessionId: string): Promise<boolean> {
  await ensureSessionsLoaded();

  // 1. Remove from in-memory cache
  sessionsCache.delete(sessionId);

  // 2. Persist updated session list to disk
  try {
    const allSessions = Array.from(sessionsCache.values());
    writeSessionsToDisk(allSessions);
  } catch (diskErr) {
    console.warn(`[Pop Quiz Engine] Notice disk delete for session ${sessionId}:`, diskErr);
  }

  // 3. Delete from Supabase pop_quiz_sessions table
  try {
    await supabaseAdmin.from('pop_quiz_sessions').delete().eq('id', sessionId);
  } catch (err: any) {
    console.warn(`[Pop Quiz Engine] Notice DB delete for session ${sessionId}:`, err?.message || err);
  }

  // 4. Delete from Supabase liveSessions backup table
  try {
    await supabaseAdmin.from('liveSessions').delete().eq('id', sessionId);
  } catch {}

  // 5. Broadcast deletion event to all connected realtime clients
  try {
    await broadcastPopQuizEvent('session_deleted', { sessionId });
  } catch {}

  return true;
}

/**
 * Helper to parse a date + time string in Africa/Lagos (WAT, UTC+1)
 */
function parseLagosTimeMs(dateStr?: string, timeStr?: string): number | null {
  if (!dateStr || !timeStr) return null;
  try {
    // Standardize time string (e.g. "16:00" -> "16:00:00")
    let cleanTime = timeStr.trim();
    if (/^\d{1,2}:\d{2}$/.test(cleanTime)) {
      cleanTime = `${cleanTime}:00`;
    }
    const isoString = `${dateStr}T${cleanTime}+01:00`;
    const ms = new Date(isoString).getTime();
    return isNaN(ms) ? null : ms;
  } catch {
    return null;
  }
}

/**
 * Main Scheduling Engine Reconciliation Loop
 * Evaluates running sessions, publishes questions, closes expired ones.
 * Server-authoritative and durable.
 */
export async function evaluatePopQuizSessions(): Promise<void> {
  await ensureSessionsLoaded();

  const now = Date.now();
  const sessions = Array.from(sessionsCache.values());

  for (const session of sessions) {
    let hasChanged = false;

    // Strict Rule: Saving or scheduling a quiz must NOT automatically start it.
    // The administrator must explicitly click "Start Quiz" before questions can be published.
    // Therefore, do NOT auto-transition from 'scheduled' or 'draft' to 'running'.
    if (session.status !== 'running') {
      continue;
    }

    const questions = session.questions || [];
    if (questions.length === 0) {
      session.status = 'completed';
      session.endedAt = new Date().toISOString();
      await persistSession(session);
      continue;
    }

    // 1. Check current active question, if any
    const activeQuestion = questions.find((q) => q.status === 'active');

    if (activeQuestion) {
      // Check if question timer has expired
      const expiresAtMs = activeQuestion.expiresAt ? new Date(activeQuestion.expiresAt).getTime() : 0;
      if (expiresAtMs > 0 && now >= expiresAtMs) {
        // Close expired question cleanly
        activeQuestion.status = 'closed';
        activeQuestion.closedAt = new Date().toISOString();
        if (!activeQuestion.winnerUserId) {
          activeQuestion.closeReason = 'expired';
        }

        // Schedule next question interval from when this active question started
        const startedMs = activeQuestion.startedAt ? new Date(activeQuestion.startedAt).getTime() : now;
        const intervalMs = (session.intervalSeconds || 300) * 1000;
        const nextTargetMs = Math.max(now, startedMs + intervalMs);

        session.nextQuestionScheduledAt = new Date(nextTargetMs).toISOString();
        session.activeQuestionStartedAt = null;
        session.activeQuestionExpiresAt = null;
        hasChanged = true;

        console.info(`[Pop Quiz Engine] Question #${activeQuestion.order} in session ${session.id} expired.`);

        await broadcastPopQuizEvent('question_closed', {
          sessionId: session.id,
          questionId: activeQuestion.id,
          order: activeQuestion.order,
          revealedCorrectAnswer: activeQuestion.correctAnswer,
          winnerName: activeQuestion.winnerName || null,
          closeReason: activeQuestion.closeReason,
        });
      }
    } else {
      // No question is currently active.
      // Check if there are pending questions remaining
      const nextPendingQuestion = questions.find((q) => q.status === 'pending');

      if (!nextPendingQuestion) {
        // All questions have been played! Mark session as completed
        session.status = 'completed';
        session.endedAt = new Date().toISOString();
        session.activeQuestionStartedAt = null;
        session.activeQuestionExpiresAt = null;
        session.nextQuestionScheduledAt = null;
        hasChanged = true;
        console.info(`[Pop Quiz Engine] Session ${session.id} ("${session.title}") completed all questions!`);
        await broadcastPopQuizEvent('session_completed', { sessionId: session.id });
      } else {
        // Check end time constraint: Do not publish questions beyond configured end time!
        const sessionEndMs = parseLagosTimeMs(session.date, session.endTime);
        const isPastEndTime = sessionEndMs !== null && now >= sessionEndMs;

        if (isPastEndTime) {
          // Reached session end time window, complete the session
          session.status = 'completed';
          session.endedAt = new Date().toISOString();
          session.activeQuestionStartedAt = null;
          session.activeQuestionExpiresAt = null;
          session.nextQuestionScheduledAt = null;
          hasChanged = true;
          console.info(`[Pop Quiz Engine] Session ${session.id} ("${session.title}") ended at configured end time.`);
          await broadcastPopQuizEvent('session_completed', { sessionId: session.id });
        } else {
          // Check if scheduled interval has arrived
          let shouldPublish = false;

          if (!session.nextQuestionScheduledAt) {
            // First question or immediate continuation
            shouldPublish = true;
          } else {
            const nextScheduledMs = new Date(session.nextQuestionScheduledAt).getTime();
            if (now >= nextScheduledMs) {
              shouldPublish = true;
            }
          }

          if (shouldPublish) {
            // Activate the next question!
            const durationSeconds = session.questionDurationSeconds || 45;
            const startedAtIso = new Date().toISOString();
            const expiresAtIso = new Date(now + durationSeconds * 1000).toISOString();
            const intervalSeconds = session.intervalSeconds || 300;
            const nextScheduledAtIso = new Date(now + intervalSeconds * 1000).toISOString();

            nextPendingQuestion.status = 'active';
            nextPendingQuestion.startedAt = startedAtIso;
            nextPendingQuestion.expiresAt = expiresAtIso;

            session.currentQuestionIndex = nextPendingQuestion.order;
            session.activeQuestionStartedAt = startedAtIso;
            session.activeQuestionExpiresAt = expiresAtIso;
            session.nextQuestionScheduledAt = nextScheduledAtIso;
            hasChanged = true;

            console.info(
              `[Pop Quiz Engine] Published Question #${nextPendingQuestion.order} in session ${session.id}: "${nextPendingQuestion.questionText}"`
            );

            await broadcastPopQuizEvent('question_published', {
              sessionId: session.id,
              questionId: nextPendingQuestion.id,
              order: nextPendingQuestion.order,
              questionText: nextPendingQuestion.questionText,
              gpReward: nextPendingQuestion.gpReward,
              startedAt: startedAtIso,
              expiresAt: expiresAtIso,
            });
          }
        }
      }
    }

    if (hasChanged) {
      await persistSession(session);
    }
  }
}

/**
 * Produces the sanitized public state for student apps.
 * CRITICAL: NEVER reveals correct answers for pending or active questions!
 */
export async function getPublicPopQuizState(): Promise<PopQuizPublicState> {
  await ensureSessionsLoaded();
  await evaluatePopQuizSessions();

  const sessions = Array.from(sessionsCache.values());
  const runningSession = sessions.find((s) => s.status === 'running') || null;

  if (!runningSession) {
    return {
      hasActiveQuiz: false,
      session: null,
      activeQuestion: null,
      lastClosedQuestion: null,
      nextQuestionInSeconds: null,
      serverTime: Date.now(),
    };
  }

  const questions = runningSession.questions || [];
  const activeQ = questions.find((q) => q.status === 'active') || null;

  // Find the most recently closed question
  const closedQuestions = questions
    .filter((q) => q.status === 'closed' && q.closedAt)
    .sort((a, b) => new Date(b.closedAt!).getTime() - new Date(a.closedAt!).getTime());
  const lastClosedQ = closedQuestions[0] || null;

  const now = Date.now();
  let remainingSeconds = 0;
  if (activeQ && activeQ.expiresAt) {
    const expMs = new Date(activeQ.expiresAt).getTime();
    remainingSeconds = Math.max(0, Math.ceil((expMs - now) / 1000));
  }

  let nextQuestionInSeconds: number | null = null;
  if (!activeQ && runningSession.nextQuestionScheduledAt) {
    const nextMs = new Date(runningSession.nextQuestionScheduledAt).getTime();
    nextQuestionInSeconds = Math.max(0, Math.ceil((nextMs - now) / 1000));
  }

  return {
    hasActiveQuiz: true,
    session: {
      id: runningSession.id,
      title: runningSession.title,
      status: runningSession.status,
      totalQuestions: questions.length,
      currentQuestionIndex: runningSession.currentQuestionIndex,
      questionDurationSeconds: runningSession.questionDurationSeconds,
      intervalSeconds: runningSession.intervalSeconds,
      endTime: runningSession.endTime,
    },
    activeQuestion: activeQ
      ? {
          id: activeQ.id,
          order: activeQ.order,
          questionText: activeQ.questionText,
          gpReward: activeQ.gpReward,
          startedAt: activeQ.startedAt || '',
          expiresAt: activeQ.expiresAt || '',
          remainingSeconds,
          status: activeQ.status,
        }
      : null,
    lastClosedQuestion: lastClosedQ
      ? {
          id: lastClosedQ.id,
          order: lastClosedQ.order,
          questionText: lastClosedQ.questionText,
          revealedCorrectAnswer: lastClosedQ.correctAnswer, // Safe to reveal now that question is closed!
          winnerName: lastClosedQ.winnerName || null,
          winnerInstitution: lastClosedQ.winnerInstitution || null,
          closeReason: lastClosedQ.closeReason || null,
          gpAwarded: lastClosedQ.gpAwarded || null,
        }
      : null,
    nextQuestionInSeconds,
    serverTime: now,
  };
}

/**
 * Concurrency-Safe Student Answer Submission
 * Strictly enforces "FIRST CORRECT ANSWER WINS" via Mutex lock & atomic wallet credit
 */
export async function submitStudentAnswer(params: {
  sessionId: string;
  questionId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userInstitution?: string;
  submittedAnswer: string;
}): Promise<{
  success: boolean;
  isCorrect: boolean;
  isWinner: boolean;
  gpAwarded: number;
  message: string;
  correctAnswer?: string;
}> {
  await ensureSessionsLoaded();

  const { sessionId, questionId, userId, userName, userEmail, userInstitution, submittedAnswer } = params;

  if (!sessionId || !questionId || !userId || !submittedAnswer?.trim()) {
    return {
      success: false,
      isCorrect: false,
      isWinner: false,
      gpAwarded: 0,
      message: 'Missing required submission parameters.',
    };
  }

  // Deduplication check: prevent multiple submissions from same student for same question
  const dedupeKey = `sub_${sessionId}_${questionId}_${userId}`;
  if (processedSubmissionKeys.has(dedupeKey)) {
    return {
      success: false,
      isCorrect: false,
      isWinner: false,
      gpAwarded: 0,
      message: 'You have already submitted an answer for this question.',
    };
  }

  const session = await getSessionById(sessionId);
  if (!session || session.status !== 'running') {
    return {
      success: false,
      isCorrect: false,
      isWinner: false,
      gpAwarded: 0,
      message: 'This quiz is not currently running.',
    };
  }

  const questions = session.questions || [];
  const question = questions.find((q) => q.id === questionId);

  if (!question) {
    return {
      success: false,
      isCorrect: false,
      isWinner: false,
      gpAwarded: 0,
      message: 'Question not found in this session.',
    };
  }

  if (question.status !== 'active') {
    return {
      success: false,
      isCorrect: false,
      isWinner: false,
      gpAwarded: 0,
      message: 'This question is no longer active.',
    };
  }

  // Verify correctness first so we know whether the student's answer was right
  const isCorrect = isAnswerCorrect(submittedAnswer, question.correctAnswer);

  // Check deadline with a 3-second network transit grace period
  const now = Date.now();
  const expiresAtMs = question.expiresAt ? new Date(question.expiresAt).getTime() : 0;
  const isLate = expiresAtMs > 0 && now > expiresAtMs + 3000;

  if (isLate) {
    // Record late submission so admin can still inspect who submitted and if it was right
    const subRecord: PopQuizSubmission = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId,
      questionId,
      userId,
      userName,
      userEmail,
      userInstitution,
      submittedAnswer,
      isCorrect,
      isWinner: false,
      gpAwarded: 0,
      submittedAt: new Date().toISOString(),
    };

    appendSubmissionToDisk(subRecord);

    try {
      await supabaseAdmin.from('pop_quiz_submissions').upsert({
        id: subRecord.id,
        session_id: sessionId,
        question_id: questionId,
        user_id: userId,
        user_name: userName,
        user_email: userEmail || '',
        user_institution: userInstitution || '',
        submitted_answer: submittedAnswer,
        is_correct: isCorrect,
        is_winner: false,
        gp_awarded: 0,
        submitted_at: subRecord.submittedAt,
        data: subRecord,
        created_at: subRecord.submittedAt,
      });
    } catch {}

    return {
      success: false,
      isCorrect,
      isWinner: false,
      gpAwarded: 0,
      message: isCorrect
        ? 'Correct answer, but time expired for this question! Your answer has been logged.'
        : 'Time has expired for this question.',
    };
  }

  if (!isCorrect) {
    // Record incorrect submission
    const subRecord: PopQuizSubmission = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId,
      questionId,
      userId,
      userName,
      userEmail,
      userInstitution,
      submittedAnswer,
      isCorrect: false,
      isWinner: false,
      gpAwarded: 0,
      submittedAt: new Date().toISOString(),
    };

    appendSubmissionToDisk(subRecord);

    try {
      await supabaseAdmin.from('pop_quiz_submissions').upsert({
        id: subRecord.id,
        session_id: sessionId,
        question_id: questionId,
        user_id: userId,
        user_name: userName,
        user_email: userEmail || '',
        user_institution: userInstitution || '',
        submitted_answer: submittedAnswer,
        is_correct: false,
        is_winner: false,
        gp_awarded: 0,
        submitted_at: subRecord.submittedAt,
        data: subRecord,
        created_at: subRecord.submittedAt,
      });
    } catch {}

    return {
      success: true,
      isCorrect: false,
      isWinner: false,
      gpAwarded: 0,
      message: 'Incorrect answer. Try again before time runs out!',
    };
  }

  // The answer IS correct! Concurrency-Safe Winner selection using Question Mutex
  const lockKey = `lock_${questionId}`;
  if (questionWinnerLocks.has(lockKey) || question.winnerUserId) {
    // Another student beat them to it, but record this correct answer for Admin audit!
    const subRecord: PopQuizSubmission = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId,
      questionId,
      userId,
      userName,
      userEmail,
      userInstitution,
      submittedAnswer,
      isCorrect: true,
      isWinner: false,
      gpAwarded: 0,
      submittedAt: new Date().toISOString(),
    };

    appendSubmissionToDisk(subRecord);

    try {
      await supabaseAdmin.from('pop_quiz_submissions').upsert({
        id: subRecord.id,
        session_id: sessionId,
        question_id: questionId,
        user_id: userId,
        user_name: userName,
        user_email: userEmail || '',
        user_institution: userInstitution || '',
        submitted_answer: submittedAnswer,
        is_correct: true,
        is_winner: false,
        gp_awarded: 0,
        submitted_at: subRecord.submittedAt,
        data: subRecord,
        created_at: subRecord.submittedAt,
      });
    } catch {}

    return {
      success: true,
      isCorrect: true,
      isWinner: false,
      gpAwarded: 0,
      message: 'Correct answer, but another student submitted milliseconds earlier!',
    };
  }

  // Acquire lock immediately
  questionWinnerLocks.add(lockKey);

  try {
    // Mark student as processed so they cannot duplicate
    processedSubmissionKeys.add(dedupeKey);

    const gpReward = question.gpReward || session.defaultGpReward || 25;
    const wonAtIso = new Date().toISOString();

    // Set winner details on question
    question.winnerUserId = userId;
    question.winnerName = userName;
    question.winnerInstitution = userInstitution || '';
    question.winningAnswer = submittedAnswer;
    question.wonAt = wonAtIso;
    question.gpAwarded = gpReward;
    question.status = 'closed';
    question.closedAt = wonAtIso;
    question.closeReason = 'answered';

    // Set next question scheduled time
    const intervalSeconds = session.intervalSeconds || 300;
    session.nextQuestionScheduledAt = new Date(Date.now() + intervalSeconds * 1000).toISOString();
    session.activeQuestionStartedAt = null;
    session.activeQuestionExpiresAt = null;

    // Persist updated session to database & disk
    await persistSession(session);

    // Record winning submission
    const subRecord: PopQuizSubmission = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId,
      questionId,
      userId,
      userName,
      userEmail,
      userInstitution,
      submittedAnswer,
      isCorrect: true,
      isWinner: true,
      gpAwarded: gpReward,
      submittedAt: wonAtIso,
    };

    appendSubmissionToDisk(subRecord);

    try {
      await supabaseAdmin.from('pop_quiz_submissions').upsert({
        id: subRecord.id,
        session_id: sessionId,
        question_id: questionId,
        user_id: userId,
        user_name: userName,
        user_email: userEmail || '',
        user_institution: userInstitution || '',
        submitted_answer: submittedAnswer,
        is_correct: true,
        is_winner: true,
        gp_awarded: gpReward,
        submitted_at: wonAtIso,
        data: subRecord,
        created_at: wonAtIso,
      });
    } catch {}

    // Authoritatively award GP reward to winning student's wallet
    try {
      const userDocRes = await supabaseAdmin.from('users').select('id, data').eq('id', userId).single();
      let currentGp = 0;
      let currentWallet = 0;
      let currentTotalGp = 0;
      let userData: any = {};

      if (userDocRes.data) {
        userData = userDocRes.data.data || {};
        currentGp = Number(userData.gpBalance || 0);
        currentWallet = Number(userData.walletBalance || currentGp);
        currentTotalGp = Number(userData.totalGpEarned || 0);
      }

      const newGp = currentGp + gpReward;
      const newWallet = currentWallet + gpReward;
      const newTotalGp = currentTotalGp + gpReward;

      await supabaseAdmin.from('users').upsert({
        id: userId,
        data: {
          ...userData,
          id: userId,
          gpBalance: newGp,
          walletBalance: newWallet,
          totalGpEarned: newTotalGp,
          updatedAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      });

      // Update wallets table as well
      try {
        const walletRes = await supabaseAdmin.from('wallets').select('id, data').eq('id', userId).maybeSingle();
        const existingWallet = walletRes?.data?.data || {};
        await supabaseAdmin.from('wallets').upsert({
          id: userId,
          data: {
            ...existingWallet,
            id: userId,
            userId,
            gpBalance: newGp,
            balanceGP: newGp,
            updatedAt: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        });
      } catch {}

      // Insert transaction ledger record into both tables
      const txId = `TX_POPQUIZ_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const txPayload = {
        id: txId,
        transactionId: txId,
        userId,
        userName: userData.name || userData.fullName || userName || 'Scholar',
        userEmail: userData.email || userEmail || '',
        userAvatar: userData.profileImage || userData.avatar || '',
        institutionName: userData.institutionName || userData.institution || userInstitution || '',
        type: 'gp_earned',
        amount: gpReward,
        unit: 'GP',
        title: '⚡ Grobaax Pop Quiz Winner',
        description: `Won Question #${question.order} in "${session.title}" (+${gpReward} GP)`,
        isCredit: true,
        status: 'completed',
        createdAt: wonAtIso,
      };

      await supabaseAdmin.from('walletTransactions').upsert({
        id: txId,
        data: txPayload,
        updated_at: wonAtIso,
      });

      await supabaseAdmin.from('transactions').upsert({
        id: txId,
        data: txPayload,
        updated_at: wonAtIso,
      });
    } catch (walletErr: any) {
      console.error('[Pop Quiz Engine] Wallet credit error:', walletErr?.message || walletErr);
    }

    // Broadcast winner to all connected students in real time
    await broadcastPopQuizEvent('question_closed', {
      sessionId,
      questionId,
      order: question.order,
      revealedCorrectAnswer: question.correctAnswer,
      winnerName: userName,
      winnerInstitution: userInstitution || null,
      closeReason: 'answered',
      gpAwarded: gpReward,
    });

    return {
      success: true,
      isCorrect: true,
      isWinner: true,
      gpAwarded: gpReward,
      message: `🎉 CONGRATULATIONS! You answered first and won +${gpReward} GP!`,
      correctAnswer: question.correctAnswer,
    };
  } finally {
    // Release question lock
    questionWinnerLocks.delete(lockKey);
  }
}

/**
 * Loads all student submissions for a given session (merges disk cache + Supabase DB)
 */
export async function getSubmissionsForSession(sessionId: string): Promise<PopQuizSubmission[]> {
  const map = new Map<string, PopQuizSubmission>();

  // 1. Read from disk cache
  try {
    if (fs.existsSync(SUBMISSIONS_FILE)) {
      const raw = fs.readFileSync(SUBMISSIONS_FILE, 'utf-8');
      const diskList: PopQuizSubmission[] = JSON.parse(raw) || [];
      diskList
        .filter((sub) => sub.sessionId === sessionId)
        .forEach((sub) => map.set(sub.id, sub));
    }
  } catch (err) {
    console.warn('[Pop Quiz Engine] Notice reading submissions disk cache:', err);
  }

  // 2. Read from Supabase DB table
  try {
    const { data, error } = await supabaseAdmin
      .from('pop_quiz_submissions')
      .select('*')
      .eq('session_id', sessionId)
      .order('submitted_at', { ascending: true });

    if (!error && Array.isArray(data)) {
      data.forEach((row: any) => {
        const subData: PopQuizSubmission = row.data || {
          id: row.id,
          sessionId: row.session_id,
          questionId: row.question_id,
          userId: row.user_id,
          userName: row.user_name || 'Scholar',
          userEmail: row.user_email || '',
          userInstitution: row.user_institution || '',
          submittedAnswer: row.submitted_answer || '',
          isCorrect: Boolean(row.is_correct),
          isWinner: Boolean(row.is_winner),
          gpAwarded: Number(row.gp_awarded) || 0,
          submittedAt: row.submitted_at || row.created_at,
        };
        // Normalize properties
        if (row.user_name) subData.userName = row.user_name;
        if (row.submitted_answer) subData.submittedAnswer = row.submitted_answer;
        if (row.is_correct !== undefined) subData.isCorrect = Boolean(row.is_correct);
        if (row.is_winner !== undefined) subData.isWinner = Boolean(row.is_winner);
        if (row.gp_awarded !== undefined) subData.gpAwarded = Number(row.gp_awarded);
        if (row.submitted_at) subData.submittedAt = row.submitted_at;
        map.set(row.id, subData);
      });
    }
  } catch (err: any) {
    console.warn('[Pop Quiz Engine] Notice querying submissions from DB:', err?.message || err);
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
  );
}

/**
 * Admin manually awards a student as the winner for a question
 */
export async function manualAwardWinner(params: {
  sessionId: string;
  questionId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userInstitution?: string;
  submittedAnswer: string;
  customGpReward?: number;
}): Promise<{ success: boolean; message: string; gpAwarded: number }> {
  await ensureSessionsLoaded();
  const { sessionId, questionId, userId, userName, userEmail, userInstitution, submittedAnswer, customGpReward } = params;

  const session = await getSessionById(sessionId);
  if (!session) {
    return { success: false, message: 'Session not found', gpAwarded: 0 };
  }

  const question = (session.questions || []).find((q) => q.id === questionId);
  if (!question) {
    return { success: false, message: 'Question not found in session', gpAwarded: 0 };
  }

  const gpReward = customGpReward || question.gpReward || session.defaultGpReward || 25;
  const wonAtIso = new Date().toISOString();

  // Set winner details on question
  question.winnerUserId = userId;
  question.winnerName = userName;
  question.winnerInstitution = userInstitution || '';
  question.winningAnswer = submittedAnswer;
  question.wonAt = wonAtIso;
  question.gpAwarded = gpReward;
  question.status = 'closed';
  question.closedAt = wonAtIso;
  question.closeReason = 'answered';

  // Persist updated session
  await persistSession(session);

  // Update submission record to isCorrect: true, isWinner: true, gpAwarded: gpReward
  try {
    await supabaseAdmin
      .from('pop_quiz_submissions')
      .update({
        is_correct: true,
        is_winner: true,
        gp_awarded: gpReward,
      })
      .eq('session_id', sessionId)
      .eq('question_id', questionId)
      .eq('user_id', userId);
  } catch {}

  // Credit user's wallet
  try {
    const userDocRes = await supabaseAdmin.from('users').select('id, data').eq('id', userId).maybeSingle();
    let currentGp = 0;
    let currentWallet = 0;
    let currentTotalGp = 0;
    let userData: any = {};

    if (userDocRes?.data) {
      userData = userDocRes.data.data || {};
      currentGp = Number(userData.gpBalance || 0);
      currentWallet = Number(userData.walletBalance || currentGp);
      currentTotalGp = Number(userData.totalGpEarned || 0);
    }

    const newGp = currentGp + gpReward;
    const newWallet = currentWallet + gpReward;
    const newTotalGp = currentTotalGp + gpReward;

    await supabaseAdmin.from('users').upsert({
      id: userId,
      data: {
        ...userData,
        id: userId,
        gpBalance: newGp,
        walletBalance: newWallet,
        totalGpEarned: newTotalGp,
        updatedAt: wonAtIso,
      },
      updated_at: wonAtIso,
    });

    try {
      const walletRes = await supabaseAdmin.from('wallets').select('id, data').eq('id', userId).maybeSingle();
      const existingWallet = walletRes?.data?.data || {};
      await supabaseAdmin.from('wallets').upsert({
        id: userId,
        data: {
          ...existingWallet,
          id: userId,
          userId,
          gpBalance: newGp,
          balanceGP: newGp,
          updatedAt: wonAtIso,
        },
        updated_at: wonAtIso,
      });
    } catch {}

    const txId = `TX_POPQUIZ_MANUAL_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const txPayload = {
      id: txId,
      transactionId: txId,
      userId,
      userName: userData.name || userData.fullName || userName || 'Scholar',
      userEmail: userData.email || userEmail || '',
      userAvatar: userData.profileImage || userData.avatar || '',
      institutionName: userData.institutionName || userData.institution || userInstitution || '',
      type: 'gp_earned',
      amount: gpReward,
      unit: 'GP',
      title: '⚡ Grobaax Pop Quiz Winner (Admin Verified)',
      description: `Awarded Question #${question.order} in "${session.title}" (+${gpReward} GP)`,
      isCredit: true,
      status: 'completed',
      createdAt: wonAtIso,
    };

    await supabaseAdmin.from('walletTransactions').upsert({
      id: txId,
      data: txPayload,
      updated_at: wonAtIso,
    });
  } catch (err) {
    console.error('[Pop Quiz Engine] Error manual crediting wallet:', err);
  }

  // Broadcast winner to all connected clients
  await broadcastPopQuizEvent('question_closed', {
    sessionId,
    questionId,
    order: question.order,
    revealedCorrectAnswer: question.correctAnswer,
    winnerName: userName,
    winnerInstitution: userInstitution || null,
    closeReason: 'answered',
    gpAwarded: gpReward,
  });

  return {
    success: true,
    message: `Awarded +${gpReward} GP to ${userName} as winner of Question #${question.order}!`,
    gpAwarded: gpReward,
  };
}
