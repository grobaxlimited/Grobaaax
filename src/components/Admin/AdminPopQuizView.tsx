import React, { useState, useEffect, useMemo } from 'react';
import {
  PopQuizSession,
  PopQuizQuestion,
  PopQuizStatus,
} from '../../types';
import { useApp } from '../../context/AppContext';
import {
  parseBulkQuestionsText,
  convertParsedToQuestions,
  ParsedQuestionItem,
} from '../../utils/popQuizParser';
import {
  Zap,
  Plus,
  Play,
  Pause,
  StopCircle,
  Clock,
  Calendar,
  Award,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Edit3,
  Trash2,
  Eye,
  FileText,
  RotateCcw,
  Sparkles,
  Trophy,
  Users,
  ChevronRight,
  ChevronDown,
  Info,
  Check,
  X,
  RefreshCw,
  Search,
} from 'lucide-react';

const DEFAULT_SAMPLE_QUESTIONS = `1. Which organelle is known as the powerhouse of the cell? — Mitochondria
2. Which planet rotates in the opposite direction to most planets? — Venus
3. What is the process by which a caterpillar becomes a butterfly? — Metamorphosis
4. Which blood group is commonly called the universal donor? — O
5. Which part of a plant absorbs most water from the soil? — Roots
6. What is the chemical symbol for Gold? — Au
7. In what year did Nigeria gain independence? — 1960
8. What is the hardest natural substance on Earth? — Diamond`;

export function AdminPopQuizView() {
  const { currentUser } = useApp();

  const [activeTab, setActiveTab] = useState<'sessions' | 'create' | 'live' | 'history'>('sessions');
  const [sessions, setSessions] = useState<PopQuizSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State for creating/editing quiz session
  const [quizTitle, setQuizTitle] = useState<string>('Grobaax Campus Pop Quiz #1');
  const [quizDescription, setQuizDescription] = useState<string>('Live speed quiz competition. First scholar to submit correct answer wins GP!');
  const [quizDate, setQuizDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>(() => {
    const d = new Date();
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(Math.floor(d.getMinutes() / 5) * 5).padStart(2, '0');
    return `${h}:${m}`;
  });
  const [endTime, setEndTime] = useState<string>(() => {
    const d = new Date(Date.now() + 3600000 * 2);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(Math.floor(d.getMinutes() / 5) * 5).padStart(2, '0');
    return `${h}:${m}`;
  });
  const [intervalMinutes, setIntervalMinutes] = useState<number>(3);
  const [questionDurationSeconds, setQuestionDurationSeconds] = useState<number>(45);
  const [defaultGpReward, setDefaultGpReward] = useState<number>(25);
  const [rawQuestionsText, setRawQuestionsText] = useState<string>(DEFAULT_SAMPLE_QUESTIONS);

  // Parsed Questions state
  const [parsedItems, setParsedItems] = useState<ParsedQuestionItem[]>([]);
  const [hasParsed, setHasParsed] = useState<boolean>(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editQuestionText, setEditQuestionText] = useState<string>('');
  const [editAnswerText, setEditAnswerText] = useState<string>('');
  const [editGpReward, setEditGpReward] = useState<number>(25);

  // Selected session for viewing/editing
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [previewModalSession, setPreviewModalSession] = useState<PopQuizSession | null>(null);
  const [confirmStartSession, setConfirmStartSession] = useState<PopQuizSession | null>(null);

  // Auto-parse on load if items empty
  useEffect(() => {
    if (!hasParsed && rawQuestionsText) {
      handleParseText();
    }
  }, []);

  // Fetch sessions from backend
  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pop-quiz/sessions');
      const data = await res.json();
      if (data.success && Array.isArray(data.sessions)) {
        setSessions(data.sessions);
      }
    } catch (err: any) {
      console.warn('Error fetching pop quiz sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleParseText = () => {
    const result = parseBulkQuestionsText(rawQuestionsText, defaultGpReward);
    setParsedItems(result.items);
    setHasParsed(true);

    if (result.hasErrors) {
      setStatusMessage({
        type: 'error',
        text: `Found ${result.invalidCount} malformed line(s). Please correct them before saving.`,
      });
    } else {
      setStatusMessage({
        type: 'success',
        text: `Successfully parsed ${result.validCount} valid question(s)!`,
      });
    }
  };

  const handleEditItemSave = (itemId: string) => {
    setParsedItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const isTextValid = Boolean(editQuestionText.trim());
          const isAnsValid = Boolean(editAnswerText.trim());
          const isValid = isTextValid && isAnsValid;
          return {
            ...item,
            questionText: editQuestionText.trim(),
            correctAnswer: editAnswerText.trim(),
            gpReward: Math.max(1, Number(editGpReward) || 25),
            isValid,
            validationError: isValid ? undefined : !isTextValid ? 'Question text is empty' : 'Answer is empty',
          };
        }
        return item;
      })
    );
    setEditingItemId(null);
  };

  const handleDeleteParsedItem = (itemId: string) => {
    setParsedItems((prev) => prev.filter((i) => i.id !== itemId).map((item, idx) => ({ ...item, order: idx + 1 })));
  };

  const handleUpdateItemReward = (itemId: string, reward: number) => {
    setParsedItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, gpReward: Math.max(1, reward) } : item))
    );
  };

  const invalidCount = useMemo(() => parsedItems.filter((i) => !i.isValid).length, [parsedItems]);
  const validCount = useMemo(() => parsedItems.filter((i) => i.isValid).length, [parsedItems]);

  // Create session handler
  const handleSaveSession = async (targetStatus: 'draft' | 'scheduled') => {
    if (invalidCount > 0) {
      setStatusMessage({
        type: 'error',
        text: `Cannot save while there are ${invalidCount} invalid question lines. Please fix or delete them.`,
      });
      return;
    }

    if (validCount === 0) {
      setStatusMessage({
        type: 'error',
        text: 'Please parse at least one valid question.',
      });
      return;
    }

    setActionLoading(true);
    setStatusMessage(null);

    try {
      const questions = convertParsedToQuestions(parsedItems, '');
      const payload = {
        title: quizTitle,
        description: quizDescription,
        date: quizDate,
        startTime,
        endTime,
        timezone: 'Africa/Lagos',
        intervalMinutes,
        questionDurationSeconds,
        defaultGpReward,
        questions,
        status: targetStatus,
        createdByUid: currentUser?.id,
        createdByName: currentUser?.name || 'Administrator',
      };

      const res = await fetch('/api/pop-quiz/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          type: 'success',
          text: targetStatus === 'scheduled' ? 'Quiz session scheduled successfully!' : 'Quiz draft saved successfully!',
        });
        await fetchSessions();
        setActiveTab('sessions');
      } else {
        setStatusMessage({ type: 'error', text: data.message || 'Failed to create session.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Server error saving session.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Quiz control handler
  const handleQuizControl = async (sessionId: string, action: string) => {
    setActionLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/pop-quiz/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, action }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: data.message || `Action ${action} executed successfully!` });
        await fetchSessions();
        setConfirmStartSession(null);
      } else {
        setStatusMessage({ type: 'error', text: data.message || `Failed to execute ${action}.` });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Server error executing control action.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Find currently running session
  const runningSession = sessions.find((s) => s.status === 'running') || null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 pb-12">
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-blue-500/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold tracking-wide border border-blue-400/30">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>TIMED SPEED COMPETITION</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Grobaax Pop Quiz Management</h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Configure bulk questions, set custom schedules, publish live questions with server-authoritative intervals, and reward the fastest correct student automatically.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setActiveTab('create');
                setStatusMessage(null);
              }}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-blue-600/30 transition transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Quiz</span>
            </button>
            <button
              onClick={fetchSessions}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition cursor-pointer"
              title="Refresh sessions"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Live Running Badge Indicator */}
        {runningSession && (
          <div className="mt-4 pt-4 border-t border-blue-500/30 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                Live Quiz in Progress: {runningSession.title}
              </span>
              <span className="text-xs text-slate-400">
                (Question {runningSession.currentQuestionIndex > 0 ? runningSession.currentQuestionIndex : 1} of {runningSession.totalQuestions})
              </span>
            </div>
            <button
              onClick={() => setActiveTab('live')}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 underline cursor-pointer"
            >
              Open Live Monitor <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-medium border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Section Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'sessions'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>All Quizzes</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
            {sessions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'create'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Create & Bulk Import</span>
        </button>

        <button
          onClick={() => setActiveTab('live')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'live'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Live Monitor</span>
          {runningSession && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>Results & Winners</span>
        </button>
      </div>

      {/* TAB 1: ALL SESSIONS LIST */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Configured Pop Quizzes</h2>
            <span className="text-xs text-slate-500">Default timezone: Africa/Lagos (WAT, UTC+1)</span>
          </div>

          {sessions.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
                <Zap className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">No Pop Quizzes Configured Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Create a quiz session, paste question-and-answer pairs in bulk, and schedule it or start it when you're ready!
              </p>
              <button
                onClick={() => setActiveTab('create')}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs inline-flex items-center gap-2 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Pop Quiz</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map((session) => {
                const isRunning = session.status === 'running';
                const isPaused = session.status === 'paused';
                const isScheduled = session.status === 'scheduled';
                const isCompleted = session.status === 'completed';
                const isDraft = session.status === 'draft';

                return (
                  <div
                    key={session.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isRunning
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 animate-pulse'
                              : isPaused
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              : isScheduled
                              ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                              : isCompleted
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                          }`}
                        >
                          {session.status}
                        </span>
                        <span className="text-[11px] font-bold text-amber-500 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5" />
                          {session.defaultGpReward} GP / question
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">{session.title}</h3>
                      {session.description && (
                        <p className="text-xs text-slate-500 line-clamp-2">{session.description}</p>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-500" />
                          <span>{session.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-blue-500" />
                          <span>
                            {session.startTime} - {session.endTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <RotateCcw className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Interval: {session.intervalMinutes}m</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span>Time/Q: {session.questionDurationSeconds}s</span>
                        </div>
                      </div>

                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Questions: <span className="font-bold text-blue-500">{(session.questions || []).length}</span>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setPreviewModalSession(session)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                        title="Preview questions"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {isDraft && (
                          <button
                            onClick={() => handleQuizControl(session.id, 'schedule')}
                            disabled={actionLoading}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-600/10 text-blue-600 hover:bg-blue-600 hover:text-white text-xs font-bold transition cursor-pointer"
                          >
                            Schedule
                          </button>
                        )}

                        {(isDraft || isScheduled || isCompleted) && (
                          <button
                            onClick={() => setConfirmStartSession(session)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-bold flex items-center gap-1 transition shadow-sm cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>{isCompleted ? 'Restart' : 'Start Quiz'}</span>
                          </button>
                        )}

                        {isRunning && (
                          <>
                            <button
                              onClick={() => handleQuizControl(session.id, 'pause')}
                              disabled={actionLoading}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-500 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                            >
                              <Pause className="w-3.5 h-3.5" />
                              <span>Pause</span>
                            </button>
                            <button
                              onClick={() => handleQuizControl(session.id, 'end')}
                              disabled={actionLoading}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-500 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                            >
                              <StopCircle className="w-3.5 h-3.5" />
                              <span>End</span>
                            </button>
                          </>
                        )}

                        {isPaused && (
                          <button
                            onClick={() => handleQuizControl(session.id, 'resume')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>Resume</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleQuizControl(session.id, 'delete')}
                          disabled={actionLoading}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                          title="Delete session"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CREATE & BULK IMPORT */}
      {activeTab === 'create' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                <span>1. Configure Quiz Session Parameters</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Customize title, schedule window, question interval, duration, and default GP reward.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Quiz Title *</label>
                <input
                  type="text"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="e.g. Grobaax Campus Speed Quiz #1"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Quiz Date (YYYY-MM-DD) *</label>
                <input
                  type="date"
                  value={quizDate}
                  onChange={(e) => setQuizDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Timezone</label>
                <input
                  type="text"
                  value="Africa/Lagos (WAT, UTC+1)"
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Start Time (WAT) *</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">End Time (WAT) *</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Interval Between Questions (Minutes) *
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={intervalMinutes}
                  onChange={(e) => setIntervalMinutes(parseFloat(e.target.value) || 1)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Time Allowed to Answer Each Question (Seconds) *
                </label>
                <input
                  type="number"
                  min="10"
                  max="300"
                  step="5"
                  value={questionDurationSeconds}
                  onChange={(e) => setQuestionDurationSeconds(parseInt(e.target.value, 10) || 45)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Default GP Reward Per Question *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={defaultGpReward}
                    onChange={(e) => setDefaultGpReward(parseInt(e.target.value, 10) || 25)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-amber-500">GP</span>
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Short Description</label>
                <input
                  type="text"
                  value={quizDescription}
                  onChange={(e) => setQuizDescription(e.target.value)}
                  placeholder="Optional brief description"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* BULK QUESTION IMPORT TEXTAREA */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  <span>2. Bulk Question Import (Large Text Area)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Paste hundreds of questions. Format: <span className="font-mono font-bold text-blue-500">1. Question text — Correct Answer</span> (separated by em dash "—").
                </p>
              </div>

              <button
                onClick={handleParseText}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer self-start sm:self-auto"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Parse Questions</span>
              </button>
            </div>

            <textarea
              rows={9}
              value={rawQuestionsText}
              onChange={(e) => setRawQuestionsText(e.target.value)}
              placeholder="Paste questions here... Example:&#10;1. Which organelle is known as the powerhouse of the cell? — Mitochondria&#10;2. Which planet rotates in the opposite direction to most planets? — Venus"
              className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4 text-slate-500">
                <span>Total Items: <strong className="text-slate-900 dark:text-white">{parsedItems.length}</strong></span>
                <span>Valid: <strong className="text-emerald-500">{validCount}</strong></span>
                {invalidCount > 0 && <span>Invalid: <strong className="text-rose-500">{invalidCount}</strong></span>}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRawQuestionsText(DEFAULT_SAMPLE_QUESTIONS)}
                  className="text-xs text-blue-500 hover:underline cursor-pointer"
                >
                  Insert Sample Questions
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  onClick={() => setRawQuestionsText('')}
                  className="text-xs text-rose-500 hover:underline cursor-pointer"
                >
                  Clear Area
                </button>
              </div>
            </div>
          </div>

          {/* PREVIEW AND CONFIRMATION TABLE */}
          {hasParsed && (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span>3. Questions Preview & Confirmation</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Review parsed questions, customize individual GP rewards, edit questions/answers, and resolve validation errors.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSaveSession('draft')}
                    disabled={actionLoading || invalidCount > 0 || validCount === 0}
                    className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                  >
                    Save as Draft
                  </button>
                  <button
                    onClick={() => handleSaveSession('scheduled')}
                    disabled={actionLoading || invalidCount > 0 || validCount === 0}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition disabled:opacity-50 cursor-pointer"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Confirm & Schedule Quiz</span>
                  </button>
                </div>
              </div>

              {invalidCount > 0 && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>
                    <strong>{invalidCount} line(s) contain validation errors.</strong> You must correct or delete them before scheduling or saving.
                  </span>
                </div>
              )}

              {/* Table of Parsed Questions */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3">Question Text</th>
                      <th className="p-3">Correct Answer</th>
                      <th className="p-3 w-28">GP Reward</th>
                      <th className="p-3 w-24 text-center">Status</th>
                      <th className="p-3 w-24 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {parsedItems.map((item) => {
                      const isEditing = editingItemId === item.id;

                      if (isEditing) {
                        return (
                          <tr key={item.id} className="bg-blue-50/50 dark:bg-blue-950/20">
                            <td className="p-3 text-center font-bold text-slate-500">{item.order}</td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={editQuestionText}
                                onChange={(e) => setEditQuestionText(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-500 text-xs text-slate-900 dark:text-white"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={editAnswerText}
                                onChange={(e) => setEditAnswerText(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-500 text-xs text-slate-900 dark:text-white font-mono"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                min="1"
                                value={editGpReward}
                                onChange={(e) => setEditGpReward(parseInt(e.target.value, 10) || 25)}
                                className="w-20 px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-500 text-xs font-bold text-amber-500"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <span className="text-[10px] font-bold text-blue-500">Editing</span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleEditItemSave(item.id)}
                                  className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                                  title="Save changes"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingItemId(null)}
                                  className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-400 hover:text-white"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${
                            !item.isValid ? 'bg-rose-50/50 dark:bg-rose-950/20' : ''
                          }`}
                        >
                          <td className="p-3 text-center font-bold text-slate-500">{item.order}</td>
                          <td className="p-3">
                            <span className="font-medium text-slate-900 dark:text-slate-100">{item.questionText}</span>
                            {item.validationError && (
                              <p className="text-[11px] text-rose-500 font-medium mt-0.5">{item.validationError}</p>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                              {item.correctAnswer || '(empty)'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="1"
                                value={item.gpReward}
                                onChange={(e) => handleUpdateItemReward(item.id, parseInt(e.target.value, 10) || 25)}
                                className="w-16 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                              <span className="text-[11px] font-bold text-slate-400">GP</span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            {item.isValid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                                <Check className="w-3 h-3" /> Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-bold">
                                <AlertCircle className="w-3 h-3" /> Invalid
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditingItemId(item.id);
                                  setEditQuestionText(item.questionText);
                                  setEditAnswerText(item.correctAnswer);
                                  setEditGpReward(item.gpReward);
                                }}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition cursor-pointer"
                                title="Edit question"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteParsedItem(item.id)}
                                className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                                title="Delete question"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LIVE MONITOR */}
      {activeTab === 'live' && (
        <div className="space-y-6">
          {!runningSession ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                <Clock className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">No Live Quiz Currently Running</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Start a quiz from the "All Quizzes" list or create a new quiz session to begin real-time question publishing.
              </p>
              <button
                onClick={() => setActiveTab('sessions')}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs cursor-pointer"
              >
                View Available Quizzes
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Running Quiz Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 border border-blue-500/30 text-white shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">LIVE SESSION</span>
                    </div>
                    <h2 className="text-2xl font-black">{runningSession.title}</h2>
                    <p className="text-xs text-slate-300">
                      Started at {runningSession.startedAt ? new Date(runningSession.startedAt).toLocaleTimeString() : 'now'} • Ends at {runningSession.endTime} (WAT)
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleQuizControl(runningSession.id, 'pause')}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause Quiz</span>
                    </button>
                    <button
                      onClick={() => handleQuizControl(runningSession.id, 'end')}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <StopCircle className="w-3.5 h-3.5" />
                      <span>End Quiz</span>
                    </button>
                  </div>
                </div>

                {/* Progress Indicators */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Current Question</div>
                    <div className="text-lg font-black text-blue-400 mt-1">
                      #{runningSession.currentQuestionIndex > 0 ? runningSession.currentQuestionIndex : 1} of {runningSession.totalQuestions}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Question Interval</div>
                    <div className="text-lg font-black text-indigo-400 mt-1">{runningSession.intervalMinutes} mins</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Time Allowed</div>
                    <div className="text-lg font-black text-amber-400 mt-1">{runningSession.questionDurationSeconds}s</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">GP Reward</div>
                    <div className="text-lg font-black text-emerald-400 mt-1">{runningSession.defaultGpReward} GP</div>
                  </div>
                </div>
              </div>

              {/* Real-time Questions Feed */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Question Run-Down & Live Winners</span>
                </h3>

                <div className="space-y-3">
                  {(runningSession.questions || []).map((q) => {
                    const isActive = q.status === 'active';
                    const isClosed = q.status === 'closed';
                    const hasWinner = Boolean(q.winnerUserId);

                    return (
                      <div
                        key={q.id}
                        className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isActive
                            ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                            : isClosed
                            ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/60 opacity-60'
                        }`}
                      >
                        <div className="space-y-1 max-w-xl">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-blue-600 dark:text-blue-400">
                              Question #{q.order}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                isActive
                                  ? 'bg-emerald-500 text-white animate-pulse'
                                  : isClosed
                                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                              }`}
                            >
                              {q.status}
                            </span>
                            <span className="text-[11px] font-bold text-amber-500">+{q.gpReward} GP</span>
                          </div>
                          <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">{q.questionText}</p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            Correct Answer: <strong className="text-emerald-500">{q.correctAnswer}</strong>
                          </p>
                        </div>

                        {/* Winner details if answered */}
                        <div className="text-right">
                          {hasWinner ? (
                            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left sm:text-right space-y-0.5">
                              <div className="text-[10px] font-bold text-amber-500 flex items-center sm:justify-end gap-1">
                                <Trophy className="w-3 h-3 text-amber-500" />
                                <span>WINNER</span>
                              </div>
                              <div className="text-xs font-bold text-slate-900 dark:text-white">{q.winnerName}</div>
                              {q.winnerInstitution && (
                                <div className="text-[10px] text-slate-400">{q.winnerInstitution}</div>
                              )}
                              <div className="text-[10px] font-bold text-emerald-500">+{q.gpAwarded || q.gpReward} GP Awarded</div>
                            </div>
                          ) : isClosed ? (
                            <div className="text-xs text-slate-400 italic">
                              {q.closeReason === 'expired' ? 'Time expired (No winner)' : 'Closed'}
                            </div>
                          ) : isActive ? (
                            <div className="text-xs font-bold text-blue-500 animate-pulse">
                              Awaiting student answers...
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400">Scheduled next</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: RESULTS & WINNERS */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Past Quizzes & Results</h2>

          {sessions.filter((s) => s.status === 'completed').length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <Trophy className="w-8 h-8 text-amber-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">No Completed Quizzes Yet</h3>
              <p className="text-xs text-slate-500">
                Completed quiz results and winning scholars will appear here with full reward histories.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions
                .filter((s) => s.status === 'completed')
                .map((session) => {
                  const winnersCount = (session.questions || []).filter((q) => q.winnerUserId).length;
                  const totalGpAwarded = (session.questions || []).reduce(
                    (acc, q) => acc + (q.winnerUserId ? q.gpAwarded || q.gpReward : 0),
                    0
                  );

                  return (
                    <div
                      key={session.id}
                      className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase">
                              COMPLETED
                            </span>
                            <span className="text-xs text-slate-400">{session.date}</span>
                          </div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">{session.title}</h3>
                        </div>

                        <div className="flex items-center gap-4 text-xs">
                          <div>
                            <span className="text-slate-400">Winners: </span>
                            <strong className="text-blue-500 font-bold">{winnersCount}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400">Total GP Won: </span>
                            <strong className="text-amber-500 font-bold">+{totalGpAwarded} GP</strong>
                          </div>
                        </div>
                      </div>

                      {/* Winners List */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        {(session.questions || []).map((q) => (
                          <div
                            key={q.id}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2"
                          >
                            <div className="space-y-0.5 max-w-[70%]">
                              <span className="text-[10px] font-bold text-blue-500">Q#{q.order}</span>
                              <p className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                                {q.questionText}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                Answer: <span className="text-emerald-500">{q.correctAnswer}</span>
                              </p>
                            </div>
                            <div className="text-right">
                              {q.winnerName ? (
                                <>
                                  <div className="text-xs font-bold text-amber-500 flex items-center gap-1 justify-end">
                                    <Trophy className="w-3 h-3" />
                                    <span>{q.winnerName}</span>
                                  </div>
                                  <div className="text-[10px] text-emerald-400 font-bold">+{q.gpAwarded || q.gpReward} GP</div>
                                </>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">No Winner</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* CONFIRM START QUIZ MODAL */}
      {confirmStartSession && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <Play className="w-6 h-6 fill-emerald-500" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Start Grobaax Pop Quiz?</h3>
              <p className="text-xs text-slate-500">
                You are about to start <strong className="text-slate-900 dark:text-white">"{confirmStartSession.title}"</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>Important:</span>
              </p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                Question #1 will immediately publish to all active students. Subsequent questions will automatically publish every{' '}
                <strong>{confirmStartSession.intervalMinutes} minutes</strong>.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setConfirmStartSession(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleQuizControl(confirmStartSession.id, 'start')}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW QUIZ MODAL */}
      {previewModalSession && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{previewModalSession.title}</h3>
                <span className="text-xs text-slate-500">
                  {(previewModalSession.questions || []).length} questions • Interval: {previewModalSession.intervalMinutes}m • Time/Q: {previewModalSession.questionDurationSeconds}s
                </span>
              </div>
              <button
                onClick={() => setPreviewModalSession(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
              {(previewModalSession.questions || []).map((q) => (
                <div
                  key={q.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-500">Question #{q.order}</span>
                    <span className="font-bold text-amber-500">+{q.gpReward} GP</span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">{q.questionText}</p>
                  <p className="text-xs text-emerald-500 font-mono">
                    Correct Answer: <strong>{q.correctAnswer}</strong>
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setPreviewModalSession(null)}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
