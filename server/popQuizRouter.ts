import { Router, Request, Response } from 'express';
import {
  evaluatePopQuizSessions,
  getPublicPopQuizState,
  submitStudentAnswer,
  loadSessionsFromDatabase,
  getSessionById,
  persistSession,
  broadcastPopQuizEvent,
  deleteSessionFromDatabase,
  getSubmissionsForSession,
  manualAwardWinner,
} from './popQuizEngine';
import { PopQuizSession, PopQuizQuestion } from '../src/types';
import { parseBulkQuestionsText, convertParsedToQuestions } from '../src/utils/popQuizParser';

export const popQuizRouter = Router();

// Initialize in-memory cache from database at startup
loadSessionsFromDatabase().catch((err) => {
  console.warn('[Pop Quiz Router] Initial sessions load notice:', err?.message || err);
});

/**
 * GET /api/pop-quiz/active
 * Returns sanitized real-time state for students.
 * Automatically runs authoritative evaluation tick before replying.
 */
popQuizRouter.get('/active', async (_req: Request, res: Response) => {
  try {
    const state = await getPublicPopQuizState();
    return res.json({ success: true, ...state });
  } catch (err: any) {
    console.error('[Pop Quiz Router] Error fetching active state:', err?.message || err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

/**
 * POST /api/pop-quiz/submit-answer
 * Student submits an answer for the currently active question.
 * Atomically checks correctness and awards GP to first valid answer.
 */
popQuizRouter.post('/submit-answer', async (req: Request, res: Response) => {
  try {
    const { sessionId, questionId, userId, userName, userEmail, userInstitution, submittedAnswer } = req.body || {};

    if (!sessionId || !questionId || !userId || !submittedAnswer) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters (sessionId, questionId, userId, submittedAnswer).',
      });
    }

    const result = await submitStudentAnswer({
      sessionId,
      questionId,
      userId,
      userName: userName || 'Student Scholar',
      userEmail,
      userInstitution,
      submittedAnswer,
    });

    return res.json(result);
  } catch (err: any) {
    console.error('[Pop Quiz Router] Answer submission error:', err?.message || err);
    return res.status(500).json({ success: false, message: 'Server error processing answer submission.' });
  }
});

/**
 * GET /api/pop-quiz/sessions
 * List all quiz sessions (for Admin dashboard)
 */
popQuizRouter.get('/sessions', async (_req: Request, res: Response) => {
  try {
    await evaluatePopQuizSessions();
    const sessions = await loadSessionsFromDatabase();
    return res.json({ success: true, sessions });
  } catch (err: any) {
    console.error('[Pop Quiz Router] Error listing sessions:', err?.message || err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

/**
 * GET /api/pop-quiz/session/:id
 * Get full session details (with questions)
 */
popQuizRouter.get('/session/:id', async (req: Request, res: Response) => {
  try {
    await evaluatePopQuizSessions();
    const session = await getSessionById(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    return res.json({ success: true, session });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

/**
 * DELETE /api/pop-quiz/session/:id
 * Admin deletes a Pop Quiz session permanently
 */
popQuizRouter.delete('/session/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Session ID is required.' });
    }
    await deleteSessionFromDatabase(id);
    return res.json({ success: true, message: 'Quiz permanently deleted.' });
  } catch (err: any) {
    console.error('[Pop Quiz Router] Error deleting session:', err?.message || err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

/**
 * POST /api/pop-quiz/create-session
 * Admin creates a new Pop Quiz session
 */
popQuizRouter.post('/create-session', async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      date,
      startTime,
      endTime,
      timezone = 'Africa/Lagos',
      intervalMinutes = 5,
      questionDurationSeconds = 45,
      defaultGpReward = 25,
      rawQuestionsText,
      questions: clientQuestions,
      status = 'draft',
      createdByUid,
      createdByName,
    } = req.body || {};

    if (!title || !date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Title, date, start time, and end time are required.',
      });
    }

    const sessionId = `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const intervalMins = Math.max(0.5, Number(intervalMinutes) || 5);
    const intervalSecs = Math.round(intervalMins * 60);

    let parsedQuestions: PopQuizQuestion[] = [];

    if (Array.isArray(clientQuestions) && clientQuestions.length > 0) {
      parsedQuestions = clientQuestions.map((q: any, idx: number) => ({
        id: q.id || `q_${Date.now()}_${idx}`,
        sessionId,
        order: idx + 1,
        questionText: q.questionText,
        correctAnswer: q.correctAnswer,
        gpReward: Number(q.gpReward) || Number(defaultGpReward) || 25,
        status: 'pending',
        validationStatus: 'valid',
      }));
    } else if (rawQuestionsText && typeof rawQuestionsText === 'string') {
      const parsed = parseBulkQuestionsText(rawQuestionsText, defaultGpReward, sessionId);
      parsedQuestions = convertParsedToQuestions(parsed.items, sessionId);
    }

    const newSession: PopQuizSession = {
      id: sessionId,
      title: title.trim(),
      description: description ? description.trim() : '',
      date,
      startTime,
      endTime,
      timezone,
      intervalMinutes: intervalMins,
      intervalSeconds: intervalSecs,
      questionDurationSeconds: Number(questionDurationSeconds) || 45,
      defaultGpReward: Number(defaultGpReward) || 25,
      status: status === 'scheduled' ? 'scheduled' : 'draft',
      currentQuestionIndex: -1,
      totalQuestions: parsedQuestions.length,
      questions: parsedQuestions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUid,
      createdByName,
    };

    await persistSession(newSession);

    return res.json({
      success: true,
      message: 'Pop Quiz session created successfully.',
      session: newSession,
    });
  } catch (err: any) {
    console.error('[Pop Quiz Router] Create session error:', err?.message || err);
    return res.status(500).json({ success: false, message: 'Failed to create quiz session.' });
  }
});

/**
 * POST /api/pop-quiz/update-session
 * Update session details or questions
 */
popQuizRouter.post('/update-session', async (req: Request, res: Response) => {
  try {
    const { sessionId, sessionData } = req.body || {};
    if (!sessionId || !sessionData) {
      return res.status(400).json({ success: false, message: 'Missing sessionId or sessionData' });
    }

    const session = await getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Merge updates
    const updated: PopQuizSession = {
      ...session,
      ...sessionData,
      id: session.id, // Immutable ID
      updatedAt: new Date().toISOString(),
    };

    if (updated.intervalMinutes) {
      updated.intervalSeconds = Math.round(Number(updated.intervalMinutes) * 60);
    }

    if (Array.isArray(updated.questions)) {
      updated.totalQuestions = updated.questions.length;
    }

    await persistSession(updated);

    return res.json({ success: true, session: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to update session.' });
  }
});

/**
 * POST /api/pop-quiz/control
 * Admin controls quiz workflow:
 * - 'start': Explicitly starts the quiz!
 * - 'pause': Pauses running quiz
 * - 'resume': Resumes paused quiz
 * - 'end': Ends quiz immediately
 * - 'schedule': Sets status to scheduled
 * - 'save_draft': Saves as draft
 * - 'delete': Deletes session
 */
popQuizRouter.post('/control', async (req: Request, res: Response) => {
  try {
    const { sessionId, action } = req.body || {};

    if (!sessionId || !action) {
      return res.status(400).json({ success: false, message: 'sessionId and action are required.' });
    }

    const session = await getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    const nowIso = new Date().toISOString();

    switch (action) {
      case 'start': {
        // Prevent accidental duplicate start
        if (session.status === 'running') {
          return res.status(400).json({ success: false, message: 'This quiz is already running.' });
        }

        const questions = session.questions || [];
        if (questions.length === 0) {
          return res.status(400).json({ success: false, message: 'Cannot start a quiz without any questions.' });
        }

        // If all questions were already closed (from a previous session/run), reset them to pending
        const hasPendingOrActive = questions.some((q) => q.status === 'pending' || q.status === 'active');
        if (!hasPendingOrActive) {
          questions.forEach((q) => {
            q.status = 'pending';
            q.winnerUserId = undefined;
            q.winnerName = undefined;
            q.winningAnswer = undefined;
            q.wonAt = undefined;
            q.gpAwarded = undefined;
            q.startedAt = undefined;
            q.expiresAt = undefined;
            q.closedAt = undefined;
            q.closeReason = undefined;
          });
        }

        // Validate end time window: Ensure session doesn't instantly expire if scheduled time was earlier
        const now = Date.now();
        const lagosNow = new Date(now + 3600000); // UTC+1
        const todayDateStr = lagosNow.toISOString().split('T')[0];
        session.date = todayDateStr;

        // Ensure endTime is comfortably in the future to allow all questions to run
        const minNeededMs = Math.max(3600000, questions.length * (session.intervalSeconds || 300) * 1000 + 1800000);
        const futureDate = new Date(now + minNeededMs + 3600000);
        const futureHours = String(futureDate.getUTCHours()).padStart(2, '0');
        const futureMins = String(futureDate.getUTCMinutes()).padStart(2, '0');
        session.endTime = `${futureHours}:${futureMins}`;

        session.status = 'running';
        session.startedAt = nowIso;
        session.endedAt = undefined;

        // Find the first question to play
        const firstQ = questions.find((q) => q.status === 'pending') || questions[0];
        const durationSeconds = session.questionDurationSeconds || 45;
        const expiresAtIso = new Date(Date.now() + durationSeconds * 1000).toISOString();
        const intervalSeconds = session.intervalSeconds || 300;

        firstQ.status = 'active';
        firstQ.startedAt = nowIso;
        firstQ.expiresAt = expiresAtIso;

        session.currentQuestionIndex = firstQ.order;
        session.activeQuestionStartedAt = nowIso;
        session.activeQuestionExpiresAt = expiresAtIso;
        session.nextQuestionScheduledAt = new Date(Date.now() + intervalSeconds * 1000).toISOString();

        await persistSession(session);

        await broadcastPopQuizEvent('question_published', {
          sessionId: session.id,
          questionId: firstQ.id,
          order: firstQ.order,
          questionText: firstQ.questionText,
          gpReward: firstQ.gpReward,
          startedAt: nowIso,
          expiresAt: expiresAtIso,
        });

        return res.json({
          success: true,
          message: `Grobaax Pop Quiz started! Question #${firstQ.order} is now live.`,
          session,
        });
      }

      case 'pause': {
        if (session.status !== 'running') {
          return res.status(400).json({ success: false, message: 'Only running quizzes can be paused.' });
        }
        session.status = 'paused';
        await persistSession(session);
        await broadcastPopQuizEvent('session_paused', { sessionId });
        return res.json({ success: true, message: 'Quiz paused.', session });
      }

      case 'resume': {
        if (session.status !== 'paused') {
          return res.status(400).json({ success: false, message: 'Only paused quizzes can be resumed.' });
        }
        session.status = 'running';
        await persistSession(session);
        await broadcastPopQuizEvent('session_resumed', { sessionId });
        return res.json({ success: true, message: 'Quiz resumed.', session });
      }

      case 'end': {
        session.status = 'completed';
        session.endedAt = nowIso;
        // Close active question if any
        if (session.questions) {
          session.questions.forEach((q) => {
            if (q.status === 'active') {
              q.status = 'closed';
              q.closedAt = nowIso;
              q.closeReason = 'manual';
            }
          });
        }
        await persistSession(session);
        await broadcastPopQuizEvent('session_completed', { sessionId });
        return res.json({ success: true, message: 'Quiz ended.', session });
      }

      case 'schedule': {
        session.status = 'scheduled';
        await persistSession(session);
        return res.json({ success: true, message: 'Quiz scheduled.', session });
      }

      case 'save_draft': {
        session.status = 'draft';
        await persistSession(session);
        return res.json({ success: true, message: 'Draft saved.', session });
      }

      case 'delete': {
        await deleteSessionFromDatabase(sessionId);
        return res.json({ success: true, message: 'Quiz permanently deleted.' });
      }

      default:
        return res.status(400).json({ success: false, message: `Unknown action "${action}"` });
    }
  } catch (err: any) {
    console.error('[Pop Quiz Router] Control action error:', err?.message || err);
    return res.status(500).json({ success: false, message: 'Server error processing quiz control.' });
  }
});

/**
 * GET /api/pop-quiz/leaderboard/:sessionId
 * Round recap and winning students list
 */
popQuizRouter.get('/leaderboard/:sessionId', async (req: Request, res: Response) => {
  try {
    const session = await getSessionById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const winners = (session.questions || [])
      .filter((q) => q.status === 'closed' && q.winnerUserId)
      .map((q) => ({
        questionOrder: q.order,
        questionText: q.questionText,
        correctAnswer: q.correctAnswer,
        winnerName: q.winnerName,
        winnerInstitution: q.winnerInstitution,
        winningAnswer: q.winningAnswer,
        gpAwarded: q.gpAwarded || q.gpReward,
        wonAt: q.wonAt,
      }));

    return res.json({
      success: true,
      title: session.title,
      status: session.status,
      totalQuestions: (session.questions || []).length,
      winners,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

/**
 * GET /api/pop-quiz/cron-tick
 * Periodic cron tick endpoint (e.g. called by Vercel crons or uptime monitors)
 */
popQuizRouter.get('/cron-tick', async (_req: Request, res: Response) => {
  try {
    await evaluatePopQuizSessions();
    return res.json({ success: true, message: 'Pop Quiz tick executed successfully.', timestamp: Date.now() });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Tick failed' });
  }
});

/**
 * GET /api/pop-quiz/submissions/:sessionId
 * Admin fetches all student submissions for a session to review live answers
 */
popQuizRouter.get('/submissions/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required.' });
    }
    const submissions = await getSubmissionsForSession(sessionId);
    return res.json({ success: true, submissions });
  } catch (err: any) {
    console.error('[Pop Quiz Router] Error fetching submissions:', err?.message || err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

/**
 * POST /api/pop-quiz/manual-award
 * Admin manually awards a student as the winner for a question
 */
popQuizRouter.post('/manual-award', async (req: Request, res: Response) => {
  try {
    const { sessionId, questionId, userId, userName, userEmail, userInstitution, submittedAnswer, customGpReward } =
      req.body || {};

    if (!sessionId || !questionId || !userId || !submittedAnswer) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: sessionId, questionId, userId, submittedAnswer.',
      });
    }

    const result = await manualAwardWinner({
      sessionId,
      questionId,
      userId,
      userName: userName || 'Scholar',
      userEmail,
      userInstitution,
      submittedAnswer,
      customGpReward: customGpReward ? Number(customGpReward) : undefined,
    });

    return res.json(result);
  } catch (err: any) {
    console.error('[Pop Quiz Router] Error manual awarding winner:', err?.message || err);
    return res.status(500).json({ success: false, message: err?.message || 'Server error awarding winner.' });
  }
});
