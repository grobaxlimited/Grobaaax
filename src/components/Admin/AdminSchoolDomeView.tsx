import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  SchoolDomeSeason,
  SchoolDomeQuestion,
  SchoolDomeMessage,
} from '../../types';
import {
  subscribeSchoolDomeActiveSeason,
  subscribeSchoolDomeActiveQuestion,
  subscribeSchoolDomeQuestions,
  subscribeSchoolDomeMessages,
  deleteSchoolDomeMessage,
  closeSchoolDomeQuestion,
  extendSchoolDomeQuestionTime,
  endSchoolDomeSeasonAndDistributePrize,
  deleteAllSchoolDomeSeasons,
} from '../../lib/schoolDomeService';
import { CreateSchoolDomeQuestionModal } from '../SchoolDome/CreateSchoolDomeQuestionModal';
import { SchoolDomeAdminSeasonModal } from '../SchoolDome/SchoolDomeAdminSeasonModal';
import {
  Swords,
  CheckCircle2,
  Settings,
  Play,
  Square,
  Trophy,
  AlertCircle,
  X,
  Users,
  Award,
  Sparkles,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  Pencil,
} from 'lucide-react';

export const AdminSchoolDomeView: React.FC = () => {
  const { currentUser } = useApp();

  const [currentSeason, setCurrentSeason] = useState<SchoolDomeSeason | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<SchoolDomeQuestion | null>(null);
  const [questions, setQuestions] = useState<SchoolDomeQuestion[]>([]);
  const [messages, setMessages] = useState<SchoolDomeMessage[]>([]);

  const [isCreateQModalOpen, setIsCreateQModalOpen] = useState(false);
  const [isAdminSeasonModalOpen, setIsAdminSeasonModalOpen] = useState(false);
  const [seasonModalInitialTab, setSeasonModalInitialTab] = useState<'edit' | 'manage' | 'new_season'>('edit');
  const [isEndingSeason, setIsEndingSeason] = useState(false);
  const [isConfirmEndModalOpen, setIsConfirmEndModalOpen] = useState(false);
  const [endSeasonError, setEndSeasonError] = useState<string | null>(null);
  const [endSeasonSuccessResult, setEndSeasonSuccessResult] = useState<{
    seasonNumber: number;
    winnersCount: number;
    prizePerWinner: number;
    totalPrize: number;
    currency: string;
  } | null>(null);

  // Delete All Seasons state
  const [isConfirmDeleteAllModalOpen, setIsConfirmDeleteAllModalOpen] = useState(false);
  const [isDeletingAllSeasons, setIsDeletingAllSeasons] = useState(false);
  const [deleteAllSuccessMsg, setDeleteAllSuccessMsg] = useState<string | null>(null);
  const [deleteAllError, setDeleteAllError] = useState<string | null>(null);

  const handleExecuteDeleteAllSeasons = async () => {
    try {
      setIsDeletingAllSeasons(true);
      setDeleteAllError(null);
      setDeleteAllSuccessMsg(null);

      const freshSeason = await deleteAllSchoolDomeSeasons(currentUser?.id, currentUser?.name);
      setCurrentSeason(freshSeason);
      setActiveQuestion(null);
      setQuestions([]);
      setDeleteAllSuccessMsg('All seasons and past champions have been permanently deleted! School Dome has restarted fresh from Season 1.');
      setTimeout(() => {
        setIsConfirmDeleteAllModalOpen(false);
        setDeleteAllSuccessMsg(null);
      }, 2000);
    } catch (err: any) {
      setDeleteAllError(err?.message || 'Failed to delete all seasons.');
    } finally {
      setIsDeletingAllSeasons(false);
    }
  };

  useEffect(() => {
    const unsub = subscribeSchoolDomeActiveSeason((s) => {
      setCurrentSeason(s);
    });

    const handleSeasonUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setCurrentSeason(prev => (prev ? { ...prev, ...detail } : detail));
      }
    };
    window.addEventListener('school_dome_season_updated', handleSeasonUpdated);

    return () => {
      unsub();
      window.removeEventListener('school_dome_season_updated', handleSeasonUpdated);
    };
  }, []);

  useEffect(() => {
    if (!currentSeason?.id) return;
    const unsubQ = subscribeSchoolDomeActiveQuestion(currentSeason.id, (q) => {
      setActiveQuestion(q);
    });
    const unsubAllQ = subscribeSchoolDomeQuestions(currentSeason.id, (list) => {
      setQuestions(list);
    });
    const unsubMsg = subscribeSchoolDomeMessages(currentSeason.id, (msgs) => {
      setMessages(msgs);
    });
    return () => {
      unsubQ();
      unsubAllQ();
      unsubMsg();
    };
  }, [currentSeason?.id]);

  const standingCount = currentSeason?.activeUserIds?.length || 0;
  const registeredCount = currentSeason?.registeredUserIds?.length || 0;
  const prizePool = currentSeason?.prizePool !== undefined ? currentSeason.prizePool : 50000;
  const currency = currentSeason?.prizeCurrency || 'GP';
  const prizePrefix = currency === 'NGN' ? '₦' : '';
  const prizeSuffix = currency === 'GP' ? ' GP' : '';
  const prizePerWinner = Math.floor(prizePool / Math.max(1, standingCount));

  const handleStartSeasonClick = () => {
    setSeasonModalInitialTab('new_season');
    setIsAdminSeasonModalOpen(true);
  };

  const handleDirectEndSeason = () => {
    if (!currentSeason) return;
    setEndSeasonError(null);
    setEndSeasonSuccessResult(null);
    setIsConfirmEndModalOpen(true);
  };

  const executeConcludeSeason = async () => {
    if (!currentSeason) return;
    if (currentSeason.status === 'ended') {
      setEndSeasonError('This season has already concluded.');
      return;
    }

    try {
      setIsEndingSeason(true);
      setEndSeasonError(null);
      const res = await endSchoolDomeSeasonAndDistributePrize(currentSeason.id, currentUser.id, currentUser.name);
      setEndSeasonSuccessResult({
        seasonNumber: currentSeason.seasonNumber,
        winnersCount: res.winners.length,
        prizePerWinner: res.prizePerWinner,
        totalPrize: currentSeason.prizePool,
        currency: currentSeason.prizeCurrency || 'GP',
      });
    } catch (err: any) {
      setEndSeasonError(err?.message || 'Failed to end season and split prize pool.');
    } finally {
      setIsEndingSeason(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-lg">
            <Swords className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                School Dome Arena Administration
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                Official Arbiter Console
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Manage elimination questions, season lifecycle, registration locks, and equal prize pool distribution
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {currentSeason && (
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* EDIT SEASON Button */}
            <button
              type="button"
              onClick={() => {
                setSeasonModalInitialTab('edit');
                setIsAdminSeasonModalOpen(true);
              }}
              className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-black rounded-xl shadow-md transition hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
              title="Edit current active season title, prize pool, currency, status, rules, and registration gates"
            >
              <Pencil className="w-4 h-4" />
              <span>EDIT SEASON</span>
            </button>

            {/* START SEASON Button */}
            <button
              type="button"
              onClick={handleStartSeasonClick}
              className={`px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-xl shadow-md transition hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                currentSeason.status === 'ended' ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900 shadow-emerald-500/20 shadow-lg animate-pulse' : ''
              }`}
              title="Start a new competition season, set prize pool & rules, and open registration"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>START SEASON</span>
            </button>

            {/* END SEASON Button */}
            <button
              type="button"
              disabled={isEndingSeason || currentSeason.status === 'ended'}
              onClick={handleDirectEndSeason}
              className={`px-4 py-2 text-white text-xs font-black rounded-xl shadow-md transition flex items-center gap-1.5 ${
                currentSeason.status === 'ended'
                  ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-70'
                  : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 hover:scale-105 active:scale-95 cursor-pointer'
              }`}
              title={currentSeason.status === 'ended' ? 'Season has already ended. Click START SEASON to begin the next season.' : 'End the season, find last scholars standing, and split prize pool equally into Grobaax wallets'}
            >
              <Square className="w-4 h-4 fill-white" />
              <span>{isEndingSeason ? 'SPLITTING PRIZE...' : currentSeason.status === 'ended' ? 'SEASON ENDED' : 'END SEASON'}</span>
            </button>

            {/* Yellow Q Launch Question Button */}
            <button
              type="button"
              onClick={() => {
                if (currentSeason.status === 'ended') {
                  alert('The current season has concluded. Please click "START SEASON" to launch the next competition season before asking questions.');
                  return;
                }
                setIsCreateQModalOpen(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 text-xs font-black rounded-xl shadow-md transition hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
              title="Launch elimination question for Free, Premium, or VIP contenders with specific time limit"
            >
              <span className="w-4 h-4 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center font-black text-[10px]">
                Q
              </span>
              <span>Launch Question (Yellow Q)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSeasonModalInitialTab('manage');
                setIsAdminSeasonModalOpen(true);
              }}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
            >
              <Settings className="w-4 h-4 text-amber-500" />
              <span>Settings</span>
            </button>

            {/* DELETE ALL SEASONS Button */}
            <button
              type="button"
              onClick={() => {
                setDeleteAllError(null);
                setDeleteAllSuccessMsg(null);
                setIsConfirmDeleteAllModalOpen(true);
              }}
              className="px-3.5 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-700 dark:text-rose-400 border border-rose-500/30 text-xs font-black rounded-xl transition hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
              title="Delete all previous seasons and wipe the Champions page to start fresh from Season 1"
            >
              <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Delete All Seasons</span>
            </button>
          </div>
        )}
      </div>

      {currentSeason ? (
        <div className="space-y-4">
          {/* Active Question Banner if Live */}
          {activeQuestion && (
            <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white border border-amber-500/40 shadow-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="animate-pulse w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="text-xs font-black uppercase text-amber-400 tracking-wider">
                    ACTIVE QUESTION #{activeQuestion.questionNumber} IN PROGRESS
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => extendSchoolDomeQuestionTime(activeQuestion.id, 60)}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold cursor-pointer transition"
                  >
                    +60s Time
                  </button>
                  <button
                    type="button"
                    onClick={() => closeSchoolDomeQuestion(currentSeason.id, activeQuestion.id)}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold cursor-pointer transition"
                  >
                    End Question
                  </button>
                </div>
              </div>

              <h3 className="text-base sm:text-lg font-black text-white">
                « {activeQuestion.questionText} »
              </h3>

              <div className="flex items-center gap-4 text-xs text-slate-300 flex-wrap">
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  Answer: {activeQuestion.correctAnswer}
                </span>
                <span>•</span>
                <span>{activeQuestion.survivorUserIds?.length || 0} Survived so far</span>
                <span>•</span>
                <span>{activeQuestion.eliminatedUserIds?.length || 0} Knocked out</span>
              </div>
            </div>
          )}

          {/* Concluded Season Alert Banner */}
          {currentSeason.status === 'ended' && (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-black text-sm">Season #{currentSeason.seasonNumber} Concluded — No Season Currently Active</p>
                  <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5">
                    This season has ended and prizes were distributed. No competition is running until you click <strong>START SEASON</strong> above or edit this season to re-activate it.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSeasonModalInitialTab('edit');
                    setIsAdminSeasonModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1"
                >
                  <Pencil className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Edit Season</span>
                </button>
                <button
                  type="button"
                  onClick={handleStartSeasonClick}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl text-xs shadow-md transition hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>START NEXT SEASON</span>
                </button>
              </div>
            </div>
          )}

          {/* Clean Focused Season Status Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-bold text-slate-500 dark:text-slate-400">Current Season:</span>
              <span className="font-black text-slate-900 dark:text-white text-sm">
                {currentSeason.title?.toLowerCase().startsWith('season #')
                  ? currentSeason.title
                  : `Season #${currentSeason.seasonNumber} — ${currentSeason.title}`}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                currentSeason.status === 'ended'
                  ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
                  : currentSeason.status === 'active'
                  ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                  : 'bg-blue-500/15 text-blue-600 border-blue-500/30'
              }`}>
                {currentSeason.status === 'ended' ? 'Concluded / Inactive' : currentSeason.status === 'active' ? 'Active' : 'Registration Open'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSeasonModalInitialTab('edit');
                  setIsAdminSeasonModalOpen(true);
                }}
                className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-md border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold cursor-pointer transition flex items-center gap-1"
                title="Edit this season"
              >
                <Pencil className="w-3 h-3" />
                <span>Edit</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-slate-600 dark:text-slate-300 font-semibold">
              <span>Prize Pool: <strong className="text-amber-500 font-black">{prizePrefix}{prizePool.toLocaleString()}{prizeSuffix}</strong></span>
              <span>Registered: <strong className="text-slate-900 dark:text-white font-black">{registeredCount}</strong></span>
              <span>Standing: <strong className="text-emerald-500 font-black">{standingCount}</strong></span>
              <span>Registration: <strong className={currentSeason.isRegistrationLocked ? 'text-amber-500 font-black' : 'text-emerald-500 font-black'}>{currentSeason.isRegistrationLocked ? 'Locked' : 'Open'}</strong></span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-xs text-slate-500">
          Loading School Dome Arena data...
        </div>
      )}

      {/* Modals */}
      {currentSeason && (
        <>
          <CreateSchoolDomeQuestionModal
            isOpen={isCreateQModalOpen}
            onClose={() => setIsCreateQModalOpen(false)}
            season={currentSeason}
            adminUid={currentUser?.id}
            adminName={currentUser?.name}
            onQuestionCreated={(q) => {
              setActiveQuestion(q);
            }}
          />

          <SchoolDomeAdminSeasonModal
            isOpen={isAdminSeasonModalOpen}
            onClose={() => setIsAdminSeasonModalOpen(false)}
            season={currentSeason}
            adminUid={currentUser?.id}
            adminName={currentUser?.name}
            initialTab={seasonModalInitialTab}
            onSeasonUpdated={() => {
              // Read immediately from localStorage if available to eliminate any latency
              try {
                const stored = localStorage.getItem('grobax_school_dome_active_season');
                if (stored) {
                  setCurrentSeason(JSON.parse(stored));
                }
              } catch {}
            }}
          />

          {/* End Season & Prize Distribution Modal */}
          {isConfirmEndModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => setIsConfirmEndModalOpen(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                {endSeasonSuccessResult ? (
                  <div className="text-center space-y-4 py-2">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
                      <Trophy className="w-8 h-8 animate-bounce" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-black text-slate-900 dark:text-white">
                        Season #{endSeasonSuccessResult.seasonNumber} Concluded!
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Prizes have been successfully split and distributed directly into scholars' wallets.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-center">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Pool</span>
                        <span className="text-sm font-black text-amber-500">
                          {prizePrefix}{endSeasonSuccessResult.totalPrize.toLocaleString()}{prizeSuffix}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Winners</span>
                        <span className="text-sm font-black text-emerald-500">
                          {endSeasonSuccessResult.winnersCount} Scholars
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Per Winner</span>
                        <span className="text-sm font-black text-blue-500">
                          {prizePrefix}{endSeasonSuccessResult.prizePerWinner.toLocaleString()}{prizeSuffix}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-left text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Automated Systems Dispatched:</p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                          Individual winner push notifications sent, wallet balance credited with verified transaction logs, and official Results announcement broadcasted across Grobaax.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsConfirmEndModalOpen(false)}
                      className="w-full py-2.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">
                          Conclude Season #{currentSeason.seasonNumber}?
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {currentSeason.title}
                        </p>
                      </div>
                    </div>

                    {endSeasonError && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-medium">
                        {endSeasonError}
                      </div>
                    )}

                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-2.5 text-xs">
                      <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                        <span>Total Prize Pool:</span>
                        <strong className="text-amber-500 font-black text-sm">
                          {prizePrefix}{prizePool.toLocaleString()}{prizeSuffix}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                        <span>Scholars Last Standing:</span>
                        <strong className="text-emerald-500 font-black text-sm">
                          {standingCount} scholar{standingCount === 1 ? '' : 's'}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <span>Equal Share Per Scholar:</span>
                        <strong className="text-blue-500 font-black text-sm">
                          {prizePrefix}{prizePerWinner.toLocaleString()}{prizeSuffix} each
                        </strong>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Concluded seasons freeze competition questions, lock survival statuses, credit winners' Grobaax wallets immediately, and post celebratory announcements in the Results tab.
                    </p>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsConfirmEndModalOpen(false)}
                        className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isEndingSeason || currentSeason.status === 'ended'}
                        onClick={executeConcludeSeason}
                        className="flex-1 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                      >
                        {isEndingSeason ? (
                          <>
                            <span className="animate-spin text-xs">↻</span>
                            <span>Splitting Prize...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            <span>Confirm & Distribute</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Confirm Delete All Seasons Modal */}
          {isConfirmDeleteAllModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
              <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-rose-500/40 rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4">
                <button
                  type="button"
                  disabled={isDeletingAllSeasons}
                  onClick={() => setIsConfirmDeleteAllModalOpen(false)}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                      Danger Zone • Irreversible
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      Delete All Seasons
                    </h3>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-800 dark:text-rose-300 space-y-2 leading-relaxed">
                  <p className="font-bold">
                    What this action will do:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-[11px] font-medium">
                    <li>Permanently delete all previous seasons (Season 1, Season 2, Season 3, Season 4, Season 5, etc.) from the database.</li>
                    <li>Wipe all previous question challenges and participant records.</li>
                    <li>Clear the Champions page completely to start with a fresh slate.</li>
                    <li>Reset the School Dome Arena so you can <strong>start fresh from Season 1</strong>.</li>
                  </ul>
                </div>

                {deleteAllSuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{deleteAllSuccessMsg}</span>
                  </div>
                )}

                {deleteAllError && (
                  <div className="p-3 rounded-xl bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{deleteAllError}</span>
                  </div>
                )}

                {!deleteAllSuccessMsg && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isDeletingAllSeasons}
                      onClick={() => setIsConfirmDeleteAllModalOpen(false)}
                      className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isDeletingAllSeasons}
                      onClick={handleExecuteDeleteAllSeasons}
                      className="flex-1 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-50 text-white font-black text-xs rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                    >
                      {isDeletingAllSeasons ? (
                        <>
                          <span className="animate-spin text-xs">↻</span>
                          <span>Deleting Seasons...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          <span>Yes, Delete All Seasons</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
