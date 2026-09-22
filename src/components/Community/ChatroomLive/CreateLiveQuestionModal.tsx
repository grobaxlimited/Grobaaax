import React, { useState } from 'react';
import {
  HelpCircle,
  Trophy,
  Users,
  Clock,
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  Flame,
} from 'lucide-react';
import { createChatroomLiveQuestionInFirestore } from '../../../lib/firebase';
import { ChatroomLiveQuestion } from '../../../types';

interface CreateLiveQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminUid?: string;
  adminName?: string;
  defaultWinnerCount?: number;
  defaultGpReward?: number;
  defaultTimeLimitSeconds?: number;
  onQuestionCreated?: (question: ChatroomLiveQuestion) => void;
}

export const CreateLiveQuestionModal: React.FC<CreateLiveQuestionModalProps> = ({
  isOpen,
  onClose,
  adminUid,
  adminName,
  defaultWinnerCount = 5,
  defaultGpReward = 50,
  defaultTimeLimitSeconds = 300,
  onQuestionCreated,
}) => {
  const [questionText, setQuestionText] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [alternativeAnswers, setAlternativeAnswers] = useState('');
  const [winnerLimit, setWinnerLimit] = useState(defaultWinnerCount);
  const [gpReward, setGpReward] = useState(defaultGpReward);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(Math.round(defaultTimeLimitSeconds / 60) || 5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) {
      setErrorMsg('Please enter a valid question.');
      return;
    }
    if (!correctAnswer.trim()) {
      setErrorMsg('Please specify the official correct answer.');
      return;
    }
    if (winnerLimit < 1) {
      setErrorMsg('Winner limit must be at least 1 scholar.');
      return;
    }
    if (gpReward < 1) {
      setErrorMsg('GP Reward per winner must be greater than 0.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');

      const altArray = alternativeAnswers
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const createdQ = await createChatroomLiveQuestionInFirestore(
        {
          questionText: questionText.trim(),
          correctAnswer: correctAnswer.trim(),
          acceptedAlternativeAnswers: altArray,
          winnerLimit: Number(winnerLimit),
          gpRewardPerWinner: Number(gpReward),
          timeLimitSeconds: Number(timeLimitMinutes) * 60,
          allowFreeParticipation: true,
        },
        adminUid,
        adminName
      );

      if (onQuestionCreated) {
        onQuestionCreated(createdQ);
      }

      // Reset & Close
      setQuestionText('');
      setCorrectAnswer('');
      setAlternativeAnswers('');
      onClose();
    } catch (err: any) {
      console.error('Error creating question:', err);
      setErrorMsg(err?.message || 'Failed to post live question. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-lg shadow-md">
              Q
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>Post Live Q&A Challenge</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] uppercase font-bold tracking-wider border border-amber-400/30">
                  Instant Rewards
                </span>
              </h2>
              <p className="text-xs text-blue-200/90 mt-0.5">
                First scholars to type the exact answer in live chat win instant GP
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Question Text */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Question Text / Challenge</span>
            </label>
            <textarea
              required
              rows={3}
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
              placeholder="e.g. What is the capital city of Osun State, Nigeria?"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>

          {/* Correct Answer */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Official Correct Answer</span>
              </span>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-normal italic">
                (Hidden from scholars until round ends)
              </span>
            </label>
            <input
              required
              type="text"
              value={correctAnswer}
              onChange={e => setCorrectAnswer(e.target.value)}
              placeholder="e.g. Osogbo"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-semibold"
            />
          </div>

          {/* Alternative Answers */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Alternative Accepted Spellings / Answers (Optional, comma-separated)
            </label>
            <input
              type="text"
              value={alternativeAnswers}
              onChange={e => setAlternativeAnswers(e.target.value)}
              placeholder="e.g. Oshogbo, Osogbo City, Oshogbo City"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>

          {/* Reward & Winner Limits Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {/* GP per winner */}
            <div className="p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-1">
              <label className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>GP Reward / Winner</span>
              </label>
              <input
                type="number"
                min={5}
                max={5000}
                step={5}
                value={gpReward}
                onChange={e => setGpReward(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-500/40 rounded-xl text-xs font-black text-slate-900 dark:text-amber-300 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400 block">Credited instantly</span>
            </div>

            {/* Winner Limit */}
            <div className="p-3 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 rounded-2xl space-y-1">
              <label className="text-[11px] font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-blue-500" />
                <span>Winners to Reward</span>
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={winnerLimit}
                onChange={e => setWinnerLimit(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-500/40 rounded-xl text-xs font-black text-slate-900 dark:text-blue-300 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400 block">First {winnerLimit} scholars</span>
            </div>

            {/* Time Limit */}
            <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Time Limit (Mins)</span>
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={timeLimitMinutes}
                onChange={e => setTimeLimitMinutes(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-black text-slate-900 dark:text-white focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400 block">{timeLimitMinutes * 60} seconds</span>
            </div>
          </div>

          {/* Rule Note */}
          <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              <strong>Fair Play Rules:</strong> Only the first <strong>{winnerLimit}</strong> distinct Premium or VIP scholars with the correct answer will receive <strong>+{gpReward} GP</strong>. Free scholars can participate and are verified as correct, but GP prizes are awarded only to Premium & VIP scholars. 1 attempt per scholar.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !questionText.trim() || !correctAnswer.trim()}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-900 via-indigo-800 to-blue-900 hover:from-blue-800 hover:to-indigo-700 text-white text-xs sm:text-sm font-black rounded-xl shadow-lg shadow-blue-900/20 flex items-center gap-2 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span>Posting Question...</span>
              ) : (
                <>
                  <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>Launch Live Challenge</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
