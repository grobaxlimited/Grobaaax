import React, { useState } from 'react';
import {
  GusLiveState,
  GusParticipantRecord,
  GusPrizeConfig,
  GusWinner,
  GusParticipantStatus,
  GusPrizeVisibility,
} from '../../types';
import { X, Check, Trash2, Trophy, Users, Flame, ShieldAlert, Award, Clock, Sparkles } from 'lucide-react';

// =========================================================================
// 1. MODAL: DIRECT LIVE ENGINE STATE OVERRIDE
// =========================================================================

interface GusLiveEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  liveState: GusLiveState | null;
  onSave: (updates: Partial<GusLiveState>) => Promise<void>;
}

export const GusLiveEditModal: React.FC<GusLiveEditModalProps> = ({
  isOpen,
  onClose,
  liveState,
  onSave,
}) => {
  if (!isOpen || !liveState) return null;

  const [status, setStatus] = useState<any>(liveState.status || 'WAITING');
  const [roundNum, setRoundNum] = useState<number>(liveState.currentRound || 1);
  const [roundName, setRoundName] = useState<string>(liveState.currentRoundName || `Round ${liveState.currentRound || 1}`);
  const [qOrder, setQOrder] = useState<number>(liveState.currentQuestionOrder || 1);
  const [qText, setQText] = useState<string>(liveState.question?.question || '');
  const [correctAnswer, setCorrectAnswer] = useState<string>(
    liveState.question?.correctAnswer || (liveState.question?.options && liveState.question.options[0]) || ''
  );
  const [topic, setTopic] = useState<string>(liveState.question?.topic || 'Academic Discipline');
  const [timeLimit, setTimeLimit] = useState<number>(liveState.timeLimitSeconds || 20);
  const [activeCount, setActiveCount] = useState<number>(liveState.activeParticipants || 0);
  const [elimCount, setElimCount] = useState<number>(liveState.eliminatedParticipants || 0);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSaving(true);
    try {
      const now = Date.now();
      await onSave({
        status,
        currentRound: Number(roundNum),
        currentRoundName: roundName,
        currentQuestionOrder: Number(qOrder),
        currentQuestionIndex: Number(qOrder) - 1,
        timeLimitSeconds: Number(timeLimit),
        activeParticipants: Number(activeCount),
        eliminatedParticipants: Number(elimCount),
        question: {
          id: liveState.question?.id || `gus_q_r${roundNum}_${qOrder}`,
          question: qText.trim(),
          correctAnswer: correctAnswer.trim(),
          topic: topic.trim(),
          difficulty: liveState.question?.difficulty || 'Medium',
          timeLimitSeconds: Number(timeLimit),
        },
        questionStartedAt: now,
        questionEndsAt: now + Number(timeLimit) * 1000,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(`Failed to update live state: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="max-w-xl w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl text-slate-900 dark:text-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Flame className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-black text-base">Direct Live Engine State Editor</h3>
              <p className="text-[11px] text-slate-400">Override and broadcast live stage parameters manually</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Live Stage Status:</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
              >
                <option value="WAITING">WAITING (Lobby)</option>
                <option value="LIVE">LIVE (Broadcasting)</option>
                <option value="PAUSED">PAUSED</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Seconds per Question:</label>
              <input
                type="number"
                value={timeLimit}
                onChange={e => setTimeLimit(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Current Round #:</label>
              <input
                type="number"
                value={roundNum}
                onChange={e => setRoundNum(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Question Order #:</label>
              <input
                type="number"
                value={qOrder}
                onChange={e => setQOrder(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">Round Title / Theme:</label>
            <input
              type="text"
              value={roundName}
              onChange={e => setRoundName(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">Question Prompt:</label>
            <textarea
              value={qText}
              onChange={e => setQText(e.target.value)}
              rows={2}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium resize-none"
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
            <label className="font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider text-[10px]">
              Authoritative Typed Correct Answer:
            </label>
            <input
              type="text"
              value={correctAnswer}
              onChange={e => setCorrectAnswer(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-emerald-500/40 rounded-xl text-emerald-600 dark:text-emerald-400 font-mono font-black"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Active Survivors Count:</label>
              <input
                type="number"
                value={activeCount}
                onChange={e => setActiveCount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold text-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Eliminated Count:</label>
              <input
                type="number"
                value={elimCount}
                onChange={e => setElimCount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold text-rose-500"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black shadow-md shadow-amber-600/20"
            >
              {saving ? 'Saving...' : 'Apply Live State Override'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================================================
// 2. MODAL: CREATE / EDIT PARTICIPANT RECORD
// =========================================================================

interface GusParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingParticipant: GusParticipantRecord | null;
  onSave: (record: Partial<GusParticipantRecord> & { userId: string; userName: string }) => Promise<void>;
}

export const GusParticipantModal: React.FC<GusParticipantModalProps> = ({
  isOpen,
  onClose,
  editingParticipant,
  onSave,
}) => {
  if (!isOpen) return null;

  const [userId, setUserId] = useState(editingParticipant?.userId || `user_${Date.now().toString(36)}`);
  const [userName, setUserName] = useState(editingParticipant?.userName || '');
  const [userAvatar, setUserAvatar] = useState(editingParticipant?.userAvatar || '');
  const [institution, setInstitution] = useState(editingParticipant?.institution || 'Federal University of Technology');
  const [department, setDepartment] = useState(editingParticipant?.department || 'Computer Science');
  const [level, setLevel] = useState(editingParticipant?.level || '400 Level');
  const [status, setStatus] = useState<GusParticipantStatus>(editingParticipant?.status || 'ACTIVE');
  const [currentRound, setCurrentRound] = useState(editingParticipant?.currentRound ?? 1);
  const [currentQuestion, setCurrentQuestion] = useState(editingParticipant?.currentQuestion ?? 1);
  const [correctAnswers, setCorrectAnswers] = useState(editingParticipant?.correctAnswers ?? 0);
  const [incorrectAnswers, setIncorrectAnswers] = useState(editingParticipant?.incorrectAnswers ?? 0);
  const [questionsCompleted, setQuestionsCompleted] = useState(editingParticipant?.questionsCompleted ?? 0);
  const [prizeAwardedGP, setPrizeAwardedGP] = useState(editingParticipant?.prizeAwardedGP ?? 0);
  const [isPremium, setIsPremium] = useState(editingParticipant?.isPremium ?? false);
  const [eliminationReason, setEliminationReason] = useState<any>(editingParticipant?.eliminationReason || '');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!userName.trim()) {
      setErrorMsg('Please enter participant scholar name.');
      return;
    }
    if (!userId.trim()) {
      setErrorMsg('Please enter user ID.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        id: editingParticipant?.id,
        userId: userId.trim(),
        userName: userName.trim(),
        userAvatar: userAvatar.trim() || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId.trim()}`,
        institution: institution.trim(),
        department: department.trim(),
        level: level.trim(),
        status,
        currentRound: Number(currentRound),
        currentQuestion: Number(currentQuestion),
        correctAnswers: Number(correctAnswers),
        incorrectAnswers: Number(incorrectAnswers),
        questionsCompleted: Number(questionsCompleted),
        prizeAwardedGP: Number(prizeAwardedGP),
        isPremium,
        eliminationReason: status === 'ELIMINATED' || status === 'DISQUALIFIED' ? eliminationReason || 'Wrong Answer' : undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(`Failed to save participant: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="max-w-lg w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl text-slate-900 dark:text-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-600/10 text-blue-600">
              <Users className="w-5 h-5" />
            </span>
            <h3 className="font-black text-base">
              {editingParticipant ? 'Edit Participant Details' : 'Register / Add New Participant'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Scholar Full Name:</label>
              <input
                type="text"
                value={userName}
                onChange={e => setUserName(e.target.value)}
                placeholder="e.g. Samuel Adebayo"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">User ID / Handle:</label>
              <input
                type="text"
                value={userId}
                disabled={!!editingParticipant}
                onChange={e => setUserId(e.target.value)}
                placeholder="e.g. samuel_ade"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono disabled:opacity-60"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">University / Institution:</label>
              <input
                type="text"
                value={institution}
                onChange={e => setInstitution(e.target.value)}
                placeholder="e.g. University of Lagos"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Department / Major:</label>
              <input
                type="text"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                placeholder="e.g. Mechanical Engineering"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Academic Level:</label>
              <select
                value={level}
                onChange={e => setLevel(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
              >
                <option value="100 Level">100 Level</option>
                <option value="200 Level">200 Level</option>
                <option value="300 Level">300 Level</option>
                <option value="400 Level">400 Level</option>
                <option value="500 Level">500 Level</option>
                <option value="Postgraduate">Postgraduate</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Current Status:</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="ELIMINATED">ELIMINATED</option>
                <option value="DISQUALIFIED">DISQUALIFIED</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Membership Tier:</label>
              <button
                type="button"
                onClick={() => setIsPremium(!isPremium)}
                className={`w-full py-2 px-2 rounded-xl font-bold border transition-all text-center ${
                  isPremium
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-800'
                }`}
              >
                {isPremium ? '👑 PRO Scholar' : 'Standard'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <div className="space-y-1">
              <label className="font-bold text-[10px] text-slate-400">Round #</label>
              <input
                type="number"
                value={currentRound}
                onChange={e => setCurrentRound(Number(e.target.value))}
                className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-mono font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-[10px] text-slate-400">Question #</label>
              <input
                type="number"
                value={currentQuestion}
                onChange={e => setCurrentQuestion(Number(e.target.value))}
                className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-mono font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-[10px] text-emerald-500">Correct</label>
              <input
                type="number"
                value={correctAnswers}
                onChange={e => setCorrectAnswers(Number(e.target.value))}
                className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-mono font-bold text-emerald-500"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-[10px] text-rose-500">Wrong</label>
              <input
                type="number"
                value={incorrectAnswers}
                onChange={e => setIncorrectAnswers(Number(e.target.value))}
                className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-mono font-bold text-rose-500"
              />
            </div>
          </div>

          {(status === 'ELIMINATED' || status === 'DISQUALIFIED') && (
            <div className="space-y-1">
              <label className="font-bold text-rose-600 dark:text-rose-400">Elimination Reason:</label>
              <select
                value={eliminationReason}
                onChange={e => setEliminationReason(e.target.value)}
                className="w-full px-3 py-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl font-bold text-rose-600 dark:text-rose-300"
              >
                <option value="Wrong Answer">Wrong Answer</option>
                <option value="Time Expired">Time Expired</option>
                <option value="Premium Required">Premium Required</option>
                <option value="Disqualified">Disqualified by Admin</option>
              </select>
            </div>
          )}

          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">Prize Awarded (GP):</label>
            <input
              type="number"
              value={prizeAwardedGP}
              onChange={e => setPrizeAwardedGP(Number(e.target.value))}
              placeholder="0"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold text-amber-500"
            />
          </div>

          <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black shadow-md shadow-blue-600/20"
            >
              {saving ? 'Saving...' : editingParticipant ? 'Save Participant Changes' : 'Register Participant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================================================
// 3. MODAL: CREATE / EDIT PRIZE TIER
// =========================================================================

interface GusPrizeTierModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingPrize: GusPrizeConfig | null;
  totalPrizePool: number;
  onSave: (prize: GusPrizeConfig) => Promise<void>;
}

export const GusPrizeTierModal: React.FC<GusPrizeTierModalProps> = ({
  isOpen,
  onClose,
  editingPrize,
  totalPrizePool,
  onSave,
}) => {
  if (!isOpen) return null;

  const [position, setPosition] = useState<number>(editingPrize?.position || 1);
  const [title, setTitle] = useState<string>(editingPrize?.title || editingPrize?.positionTitle || '1st Place Grandmaster');
  const [percentage, setPercentage] = useState<number>(editingPrize?.percentage || 70);
  const [gpAmount, setGpAmount] = useState<number>(
    editingPrize?.gpAmount || Math.round((totalPrizePool * (editingPrize?.percentage || 70)) / 100)
  );
  const [desc, setDesc] = useState<string>(editingPrize?.description || 'Awarded to the ultimate surviving scholar.');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePercentageChange = (pct: number) => {
    setPercentage(pct);
    setGpAmount(Math.round((totalPrizePool * pct) / 100));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!title.trim()) {
      setErrorMsg('Please enter a prize position title.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        id: editingPrize?.id,
        position: Number(position),
        positionTitle: title.trim(),
        title: title.trim(),
        percentage: Number(percentage),
        gpAmount: Number(gpAmount),
        description: desc.trim(),
        active: true,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(`Failed to save prize tier: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="max-w-md w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl text-slate-900 dark:text-white">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Trophy className="w-5 h-5" />
            </span>
            <h3 className="font-black text-base">
              {editingPrize ? 'Edit Prize Tier' : 'Add Prize Tier Configuration'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Position / Rank #:</label>
              <input
                type="number"
                value={position}
                onChange={e => setPosition(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Pool Percentage (%):</label>
              <input
                type="number"
                value={percentage}
                onChange={e => handlePercentageChange(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">Position Title:</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. 1st Place — Ultimate Scholar Champion"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">GP Reward Amount:</label>
            <input
              type="number"
              value={gpAmount}
              onChange={e => setGpAmount(Number(e.target.value))}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-black text-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">Description / Trophy Badge:</label>
            <input
              type="text"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="e.g. National Gold Trophy + Certified Certificate"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
            />
          </div>

          <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black shadow-md shadow-blue-600/20"
            >
              {saving ? 'Saving...' : 'Save Prize Tier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================================================
// 4. MODAL: CREATE / EDIT WINNER RECORD
// =========================================================================

interface GusWinnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingWinner: GusWinner | null;
  onSave: (winner: Partial<GusWinner> & { userId: string; userName: string }) => Promise<void>;
}

export const GusWinnerModal: React.FC<GusWinnerModalProps> = ({
  isOpen,
  onClose,
  editingWinner,
  onSave,
}) => {
  if (!isOpen) return null;

  const [position, setPosition] = useState<number>(editingWinner?.position || 1);
  const [positionTitle, setPositionTitle] = useState<string>(
    editingWinner?.positionTitle || '1st Place — Ultimate Scholar Champion'
  );
  const [userId, setUserId] = useState<string>(editingWinner?.userId || `winner_${Date.now().toString(36)}`);
  const [userName, setUserName] = useState<string>(editingWinner?.userName || '');
  const [userAvatar, setUserAvatar] = useState<string>(editingWinner?.userAvatar || '');
  const [institution, setInstitution] = useState<string>(editingWinner?.institution || 'Federal University of Technology');
  const [gpAwarded, setGpAwarded] = useState<number>(editingWinner?.gpAwarded || 500000);
  const [finalRoundReached, setFinalRoundReached] = useState<number>(editingWinner?.finalRoundReached || 8);
  const [finalScore, setFinalScore] = useState<number>(editingWinner?.finalScore || 80);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!userName.trim()) {
      setErrorMsg('Please enter scholar champion name.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        id: editingWinner?.id,
        position: Number(position),
        positionTitle: positionTitle.trim(),
        userId: userId.trim(),
        userName: userName.trim(),
        userAvatar: userAvatar.trim() || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId.trim()}`,
        institution: institution.trim(),
        gpAwarded: Number(gpAwarded),
        finalRoundReached: Number(finalRoundReached),
        finalScore: Number(finalScore),
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(`Failed to save winner record: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="max-w-md w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl text-slate-900 dark:text-white">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Award className="w-5 h-5" />
            </span>
            <h3 className="font-black text-base">
              {editingWinner ? 'Edit Winner Record' : 'Add Hall of Fame Champion'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Champion Name:</label>
              <input
                type="text"
                value={userName}
                onChange={e => setUserName(e.target.value)}
                placeholder="e.g. Chukwuebuka Obi"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">User ID / Handle:</label>
              <input
                type="text"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                placeholder="e.g. user_ebuka"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">Award / Position Title:</label>
            <input
              type="text"
              value={positionTitle}
              onChange={e => setPositionTitle(e.target.value)}
              placeholder="e.g. 1st Place Grandmaster Champion"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">University / Institution:</label>
            <input
              type="text"
              value={institution}
              onChange={e => setInstitution(e.target.value)}
              placeholder="e.g. Obafemi Awolowo University"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Position #:</label>
              <input
                type="number"
                value={position}
                onChange={e => setPosition(Number(e.target.value))}
                className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">GP Awarded:</label>
              <input
                type="number"
                value={gpAwarded}
                onChange={e => setGpAwarded(Number(e.target.value))}
                className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-black text-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Final Score:</label>
              <input
                type="number"
                value={finalScore}
                onChange={e => setFinalScore(Number(e.target.value))}
                className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black shadow-md shadow-blue-600/20"
            >
              {saving ? 'Saving...' : 'Save Champion Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================================================
// 6. MODAL: RESET COMPETITION & ALL PARTICIPANTS CONFIRMATION
// =========================================================================

interface GusResetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  seasonTitle?: string;
  totalParticipants?: number;
  activeParticipantsCount?: number;
}

export const GusResetConfirmModal: React.FC<GusResetConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  seasonTitle,
  totalParticipants,
  activeParticipantsCount,
}) => {
  const count = totalParticipants ?? activeParticipantsCount ?? 0;
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      setErrorMsg(`Reset failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="max-w-md w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl text-slate-900 dark:text-white">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5 text-rose-500">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="font-black text-base">Reset GUS Competition</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          <p className="font-bold text-slate-800 dark:text-slate-200">
            Are you sure you want to reset the competition back to <span className="text-blue-500">Round 1 Question 1</span>?
          </p>

          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 space-y-1.5">
            <div className="font-black uppercase tracking-wider text-[10px]">Actions to be executed:</div>
            <ul className="list-disc pl-4 space-y-1 text-[11px]">
              <li>All <strong>{count}</strong> participants will be restored to <strong>ACTIVE</strong> status.</li>
              <li>Eliminations, timeouts, and wrong answer strikes will be cleared.</li>
              <li>Live engine stage will return to <strong>Round 1, Question 1</strong> (Lobby Waiting state).</li>
              <li>Hall of Fame / Champion records for this run will be cleared.</li>
            </ul>
          </div>

          {seasonTitle && (
            <p className="text-[11px] text-slate-400">
              Target Season: <strong className="text-slate-700 dark:text-slate-300">{seasonTitle}</strong>
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Resetting...' : 'Yes, Reset to Round 1'}
          </button>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 7. MODAL: CONCLUDE SEASON & DISTRIBUTE PRIZE POOL CONFIRMATION
// =========================================================================

interface GusConcludeConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  seasonTitle?: string;
  prizePoolGP: number;
  activeSurvivorsCount?: number;
  survivorsCount?: number;
}

export const GusConcludeConfirmModal: React.FC<GusConcludeConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  seasonTitle,
  prizePoolGP,
  activeSurvivorsCount,
  survivorsCount,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const count = activeSurvivorsCount ?? survivorsCount ?? 0;
  const estimatedPerWinner = count > 0 ? Math.floor(prizePoolGP / count) : 0;

  const handleConfirm = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      setErrorMsg(`Conclude failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="max-w-md w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl text-slate-900 dark:text-white">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5 text-amber-500">
            <Trophy className="w-5 h-5" />
            <h3 className="font-black text-base">Conclude Season & Award Grand Prize</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          <p className="font-bold text-slate-800 dark:text-slate-200">
            You are about to conclude this season and award the grand prize pool to all surviving Grandmasters.
          </p>

          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span>Total Prize Pool:</span>
              <strong className="font-mono text-sm">{prizePoolGP.toLocaleString()} GP</strong>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span>Surviving Grandmasters:</span>
              <strong className="font-mono text-sm">{activeSurvivorsCount} Scholars</strong>
            </div>
            <div className="flex justify-between items-center text-xs pt-1.5 border-t border-amber-500/20 font-bold">
              <span>Estimated GP per Champion:</span>
              <strong className="font-mono text-base text-amber-500">
                {estimatedPerWinner.toLocaleString()} GP
              </strong>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Upon confirmation: GP balances will be credited immediately to winners' accounts, official transaction receipts logged, and winners crowned in the Hall of Fame.
          </p>
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:opacity-90 text-slate-950 font-black shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Concluding...' : 'Confirm & Award Prizes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 8. GENERIC IN-APP CONFIRMATION MODAL (Replaces window.confirm)
// =========================================================================

interface GusConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  confirmVariant?: 'danger' | 'primary' | 'warning';
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export const GusConfirmDialog: React.FC<GusConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  confirmVariant = 'danger',
  onClose,
  onConfirm,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      setErrorMsg(`Action failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const btnStyle =
    confirmVariant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
      : confirmVariant === 'warning'
      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20';

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="max-w-md w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl text-slate-900 dark:text-white">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            {confirmVariant === 'danger' ? (
              <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
                <Trash2 className="w-4 h-4" />
              </span>
            ) : (
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                <ShieldAlert className="w-4 h-4" />
              </span>
            )}
            <h3 className="font-black text-base">{title}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl font-black shadow-md cursor-pointer disabled:opacity-50 transition-all ${btnStyle}`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 8. MODAL: BULK DELETE QUESTIONS MODAL
// =========================================================================

interface GusBulkDeleteQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (mode: 'season' | 'round' | 'all' | 'selected') => Promise<void>;
  roundNumber: number;
  roundCount: number;
  seasonTitle: string;
  seasonCount: number;
  totalBankCount: number;
  selectedCount: number;
}

export const GusBulkDeleteQuestionsModal: React.FC<GusBulkDeleteQuestionsModalProps> = ({
  isOpen,
  onClose,
  onConfirmDelete,
  roundNumber,
  roundCount,
  seasonTitle,
  seasonCount,
  totalBankCount,
  selectedCount,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<'round' | 'season' | 'selected' | 'all'>(
    selectedCount > 0 ? 'selected' : 'round'
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const countForTarget = () => {
    switch (selectedTarget) {
      case 'selected':
        return selectedCount;
      case 'round':
        return roundCount;
      case 'season':
        return seasonCount;
      case 'all':
        return totalBankCount;
    }
  };

  const handleExecute = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await onConfirmDelete(selectedTarget);
      onClose();
    } catch (err: any) {
      setErrorMsg(`Failed to delete questions: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="max-w-lg w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl text-slate-900 dark:text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <Trash2 className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-black text-base">Bulk Delete Questions</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Purge multiple or all academic questions at once
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold">
            {errorMsg}
          </div>
        )}

        {/* Target Selector */}
        <div className="space-y-2.5">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Select Questions Scope to Delete:
          </label>

          <div className="space-y-2">
            {selectedCount > 0 && (
              <label
                className={`flex items-center justify-between p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedTarget === 'selected'
                    ? 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="deleteScope"
                    checked={selectedTarget === 'selected'}
                    onChange={() => setSelectedTarget('selected')}
                    className="w-4 h-4 text-rose-600 accent-rose-600"
                  />
                  <div>
                    <span className="font-black text-xs block">
                      Delete Multi-Selected Questions
                    </span>
                    <span className="text-[11px] opacity-75">
                      Only delete the specific items you manually checked
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-black bg-rose-500/20 text-rose-600 dark:text-rose-400">
                  {selectedCount} Selected
                </span>
              </label>
            )}

            <label
              className={`flex items-center justify-between p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                selectedTarget === 'round'
                  ? 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="deleteScope"
                  checked={selectedTarget === 'round'}
                  onChange={() => setSelectedTarget('round')}
                  className="w-4 h-4 text-rose-600 accent-rose-600"
                />
                <div>
                  <span className="font-black text-xs block">
                    Delete All in Round {roundNumber}
                  </span>
                  <span className="text-[11px] opacity-75">
                    Purge all questions created for Round {roundNumber} in "{seasonTitle}"
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-black bg-slate-200 dark:bg-slate-700">
                {roundCount} Questions
              </span>
            </label>

            <label
              className={`flex items-center justify-between p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                selectedTarget === 'season'
                  ? 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="deleteScope"
                  checked={selectedTarget === 'season'}
                  onChange={() => setSelectedTarget('season')}
                  className="w-4 h-4 text-rose-600 accent-rose-600"
                />
                <div>
                  <span className="font-black text-xs block">
                    Delete All in Current Season ("{seasonTitle}")
                  </span>
                  <span className="text-[11px] opacity-75">
                    Purge all 8 rounds of questions in this season
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-black bg-slate-200 dark:bg-slate-700">
                {seasonCount} Questions
              </span>
            </label>

            <label
              className={`flex items-center justify-between p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                selectedTarget === 'all'
                  ? 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="deleteScope"
                  checked={selectedTarget === 'all'}
                  onChange={() => setSelectedTarget('all')}
                  className="w-4 h-4 text-rose-600 accent-rose-600"
                />
                <div>
                  <span className="font-black text-xs block text-rose-500">
                    Purge Entire Global Question Bank
                  </span>
                  <span className="text-[11px] opacity-75">
                    Deletes all questions across all seasons and all rounds
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-black bg-rose-500/20 text-rose-600 dark:text-rose-400">
                {totalBankCount} Total
              </span>
            </label>
          </div>
        </div>

        {/* Danger Warning Note */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs space-y-1">
          <div className="font-black flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Permanent Deletion Warning</span>
          </div>
          <p className="text-[11px] opacity-90 leading-relaxed">
            This will permanently delete <strong>{countForTarget()} question(s)</strong> from Firebase. If needed, you can re-populate the standard 80 questions at any time using the "Seed 80 Questions" tool.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecute}
            disabled={loading || countForTarget() === 0}
            className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg shadow-rose-600/20 cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>{loading ? 'Deleting...' : `Confirm & Delete (${countForTarget()})`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
