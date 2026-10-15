import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { PopQuizPublicState } from '../../types';
import { supabase } from '../../lib/supabase';
import {
  Zap,
  Clock,
  Award,
  Trophy,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  X,
  Minimize2,
  Maximize2,
  Sparkles,
  ChevronRight,
  Flame,
} from 'lucide-react';

export function PopQuizActiveModal() {
  const { currentUser, firebaseUser } = useApp();

  const [quizState, setQuizState] = useState<PopQuizPublicState | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Submission state
  const [submittedAnswer, setSubmittedAnswer] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    isWinner?: boolean;
    gpAwarded?: number;
  } | null>(null);

  // Local countdown seconds synchronized with server expiresAt
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [nextInSeconds, setNextInSeconds] = useState<number | null>(null);

  // Prevent multiple submits per question on frontend
  const [hasSubmittedThisQuestion, setHasSubmittedThisQuestion] = useState<boolean>(false);
  const lastQuestionIdRef = useRef<string | null>(null);

  // Fetch active quiz state
  const fetchActiveQuiz = async () => {
    try {
      const res = await fetch('/api/pop-quiz/active');
      const data = await res.json();
      if (data.success) {
        setQuizState(data);

        // Auto-open modal when a new active question arrives
        const activeQ = data.activeQuestion;
        if (activeQ && activeQ.id !== lastQuestionIdRef.current) {
          lastQuestionIdRef.current = activeQ.id;
          setIsOpen(true);
          setIsMinimized(false);
          setSubmissionFeedback(null);
          setSubmittedAnswer('');
          setHasSubmittedThisQuestion(false);
        }
      }
    } catch {}
  };

  // 1. Initial fetch & periodic poll
  useEffect(() => {
    fetchActiveQuiz();
    const interval = setInterval(fetchActiveQuiz, 3000);
    return () => clearInterval(interval);
  }, []);

  // 2. Real-time subscription to Supabase Realtime channel
  useEffect(() => {
    const channel = supabase.channel('grobaax-realtime-bus');

    channel
      .on('broadcast', { event: 'pop_quiz_question_published' }, () => {
        fetchActiveQuiz();
      })
      .on('broadcast', { event: 'pop_quiz_question_closed' }, () => {
        fetchActiveQuiz();
      })
      .on('broadcast', { event: 'pop_quiz_session_completed' }, () => {
        fetchActiveQuiz();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 3. Local second countdown tick
  useEffect(() => {
    const timer = setInterval(() => {
      if (quizState?.activeQuestion?.expiresAt) {
        const expMs = new Date(quizState.activeQuestion.expiresAt).getTime();
        const diff = Math.max(0, Math.ceil((expMs - Date.now()) / 1000));
        setRemainingSeconds(diff);
      } else {
        setRemainingSeconds(0);
      }

      if (quizState?.nextQuestionInSeconds !== undefined && quizState?.nextQuestionInSeconds !== null) {
        setNextInSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : null));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [quizState]);

  // Sync remainingSeconds when state changes
  useEffect(() => {
    if (quizState?.activeQuestion?.remainingSeconds !== undefined) {
      setRemainingSeconds(quizState.activeQuestion.remainingSeconds);
    }
    if (quizState?.nextQuestionInSeconds !== undefined) {
      setNextInSeconds(quizState.nextQuestionInSeconds);
    }
  }, [quizState]);

  // Submit Answer Handler
  const handleSubmitAnswer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quizState?.activeQuestion || !submittedAnswer.trim() || isSubmitting) return;

    const studentUid = firebaseUser?.uid || currentUser?.id;
    if (!studentUid) {
      setSubmissionFeedback({
        type: 'error',
        message: 'Please sign in to participate and earn GP rewards!',
      });
      return;
    }

    setIsSubmitting(true);
    setSubmissionFeedback(null);

    try {
      const payload = {
        sessionId: quizState.session?.id,
        questionId: quizState.activeQuestion.id,
        userId: studentUid,
        userName: currentUser?.name || currentUser?.fullName || 'Scholar',
        userEmail: currentUser?.email || firebaseUser?.email || '',
        userInstitution: currentUser?.institutionName || currentUser?.institution || '',
        submittedAnswer: submittedAnswer.trim(),
      };

      const res = await fetch('/api/pop-quiz/submit-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.isWinner) {
        setSubmissionFeedback({
          type: 'success',
          message: data.message || `🎉 CONGRATULATIONS! You won +${data.gpAwarded} GP!`,
          isWinner: true,
          gpAwarded: data.gpAwarded,
        });
        setHasSubmittedThisQuestion(true);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wallet_balance_updated'));
        }
      } else if (data.isCorrect && !data.isWinner) {
        setSubmissionFeedback({
          type: 'info',
          message: data.message || 'Correct, but another student submitted milliseconds earlier!',
        });
        setHasSubmittedThisQuestion(true);
      } else if (!data.isCorrect) {
        setSubmissionFeedback({
          type: 'error',
          message: data.message || 'Incorrect answer. Try again before time expires!',
        });
      } else {
        setSubmissionFeedback({
          type: 'info',
          message: data.message || 'Answer recorded.',
        });
      }
    } catch (err: any) {
      setSubmissionFeedback({
        type: 'error',
        message: 'Network error submitting answer. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Only render if a quiz session is active or has an active question
  if (!quizState?.hasActiveQuiz || (!quizState?.activeQuestion && !quizState?.lastClosedQuestion)) {
    return null;
  }

  const activeQ = quizState.activeQuestion;
  const lastClosedQ = quizState.lastClosedQuestion;
  const totalDuration = quizState.session?.questionDurationSeconds || 45;
  const timerPercentage = Math.max(0, Math.min(100, (remainingSeconds / totalDuration) * 100));

  // If minimized, display sleek floating badge at bottom-right
  if (isMinimized) {
    return (
      <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <button
          onClick={() => {
            setIsMinimized(false);
            setIsOpen(true);
          }}
          className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-600 text-white font-bold text-xs shadow-2xl hover:shadow-blue-500/30 hover:scale-105 transition transform cursor-pointer border border-white/20"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
            <span>
              {activeQ ? `Question #${activeQ.order} Live (${remainingSeconds}s)` : 'Pop Quiz Round Active'}
            </span>
          </span>
          <Maximize2 className="w-3.5 h-3.5 opacity-75 hover:opacity-100 ml-1" />
        </button>
      </div>
    );
  }

  // If user explicitly closed the modal while round is running, show discreet trigger pill
  if (!isOpen) {
    return (
      <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900/90 text-white text-xs font-bold shadow-xl border border-blue-500/30 hover:bg-slate-800 transition cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>Pop Quiz ({activeQ ? `${remainingSeconds}s` : 'View Round'})</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-blue-500/30 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Top Header with Gradient Accent */}
        <div className="relative bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-5 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-300/30">
                <Zap className="w-4 h-4 fill-amber-400 text-amber-400" />
              </span>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300">
                  GROBAAX POP QUIZ
                </span>
                <h3 className="text-sm sm:text-base font-extrabold line-clamp-1">{quizState.session?.title}</h3>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title="Minimize popup"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Reward & Progress Badges */}
          <div className="mt-3 flex items-center justify-between text-xs font-semibold pt-2 border-t border-white/10">
            <span className="text-white/80">
              {activeQ
                ? `Question #${activeQ.order} of ${quizState.session?.totalQuestions || '?'}`
                : 'Round in Progress'}
            </span>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold">
              <Award className="w-3.5 h-3.5" />
              <span>+{activeQ?.gpReward || quizState.lastClosedQuestion?.gpAwarded || 25} GP REWARD</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {activeQ ? (
            <>
              {/* Animated Countdown Timer Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span>Time Remaining</span>
                  </span>
                  <span
                    className={`font-mono text-sm font-extrabold ${
                      remainingSeconds <= 10
                        ? 'text-rose-500 animate-pulse'
                        : remainingSeconds <= 20
                        ? 'text-amber-500'
                        : 'text-blue-500'
                    }`}
                  >
                    00:{remainingSeconds.toString().padStart(2, '0')}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                      remainingSeconds <= 10
                        ? 'bg-rose-500'
                        : remainingSeconds <= 20
                        ? 'bg-amber-500'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-500'
                    }`}
                    style={{ width: `${timerPercentage}%` }}
                  />
                </div>
              </div>

              {/* The Active Question Text */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
                  Question Challenge
                </div>
                <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-relaxed">
                  {activeQ.questionText}
                </p>
              </div>

              {/* Student Answer Input Form */}
              <form onSubmit={handleSubmitAnswer} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Type Your Answer (First Correct Answer Wins!):
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      autoFocus
                      disabled={isSubmitting || hasSubmittedThisQuestion || remainingSeconds <= 0}
                      value={submittedAnswer}
                      onChange={(e) => setSubmittedAnswer(e.target.value)}
                      placeholder="e.g. Mitochondria"
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    !submittedAnswer.trim() ||
                    isSubmitting ||
                    hasSubmittedThisQuestion ||
                    remainingSeconds <= 0
                  }
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition transform active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying Answer with Backend...</span>
                    </>
                  ) : hasSubmittedThisQuestion ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Answer Accepted</span>
                    </>
                  ) : remainingSeconds <= 0 ? (
                    <span>Time Expired</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Answer Now</span>
                    </>
                  )}
                </button>
              </form>

              {/* Submission Result / Feedback Message */}
              {submissionFeedback && (
                <div
                  className={`p-4 rounded-2xl border text-xs sm:text-sm font-medium animate-in zoom-in-95 duration-150 ${
                    submissionFeedback.type === 'success'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                      : submissionFeedback.type === 'error'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                      : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {submissionFeedback.type === 'success' ? (
                      <Trophy className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    ) : submissionFeedback.type === 'error' ? (
                      <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-bold">{submissionFeedback.message}</p>
                      {submissionFeedback.isWinner && (
                        <p className="text-[11px] text-amber-400/90 mt-1">
                          Your GP wallet has been authoritatively credited! Keep competing for upcoming questions.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            // No question is currently active — show results of last round & timer for next question
            <div className="space-y-5 text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
                <Clock className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Round Concluded
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {nextInSeconds !== null && nextInSeconds > 0
                    ? `Next question will be published automatically in ${Math.floor(nextInSeconds / 60)}m ${nextInSeconds % 60}s.`
                    : 'Awaiting the next scheduled question from the administrator.'}
                </p>
              </div>

              {/* Reveal Last Question & Winner */}
              {lastClosedQ && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-left space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-500">Previous: Question #{lastClosedQ.order}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      {lastClosedQ.closeReason === 'answered' ? 'Answered' : 'Timed Out'}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    "{lastClosedQ.questionText}"
                  </p>

                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Correct Answer:</span>
                    <strong className="text-emerald-500 font-mono text-sm">{lastClosedQ.revealedCorrectAnswer}</strong>
                  </div>

                  {lastClosedQ.winnerName ? (
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500 flex items-center gap-1 font-medium">
                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                        <span>Winner:</span>
                      </span>
                      <div className="text-right">
                        <strong className="text-amber-500 font-bold">{lastClosedQ.winnerName}</strong>
                        {lastClosedQ.winnerInstitution && (
                          <span className="text-[10px] text-slate-400 block">{lastClosedQ.winnerInstitution}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No student answered within the time limit.</p>
                  )}
                </div>
              )}

              {/* Next Question Countdown Timer */}
              {nextInSeconds !== null && nextInSeconds > 0 && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs font-bold text-blue-600 dark:text-blue-400">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                  <span>
                    Next Question in: {Math.floor(nextInSeconds / 60)}:{(nextInSeconds % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>Server-authoritative synchronization</span>
          <button
            onClick={() => setIsMinimized(true)}
            className="text-blue-500 hover:underline font-bold cursor-pointer"
          >
            Keep in Background
          </button>
        </div>
      </div>
    </div>
  );
}
