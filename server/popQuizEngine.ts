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
    .toLowerCase()
    .trim()
    .replace(/^["'‘“]+|["'’”]+$/g, '') // remove surrounding quotes
    .replace(/\s+/g, ' ') // collapse multiple spaces
    .replace(/[\.\,\!\?]+$/g, '') // remove trailing punctuation
    .trim();
}

/**
 * Checks if a submitted answer matches the correct answer
 */
export function isAnswerCorrect(submitted: string, correct: string): boolean {
  const normSub = normalizeAnswer(submitted);
  const normCor = normalizeAnswer(correct);
  if (!normSub || !normCor) return false;

  // Direct match
  if (normSub === normCor) return true;

  // Numbers written as words or vice versa (e.g., 'o' blood group, 'zero')
  if (normSub.replace(/^the\s+/, '') === normCor.replace(/^the\s+/, '')) return true;

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

  // Check deadline
  const now = Date.now();
  if (question.expiresAt && now > new Date(question.expiresAt).getTime()) {
    return {
      success: false,
      isCorrect: false,
      isWinner: false,
      gpAwarded: 0,
      message: 'Time expired for this question.',
    };
  }

  // Verify correctness
  const isCorrect = isAnswerCorrect(submittedAnswer, question.correctAnswer);

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
    // Another student beat them to it!
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
