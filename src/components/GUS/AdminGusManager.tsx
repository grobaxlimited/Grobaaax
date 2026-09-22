import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  GusCompetition,
  GusSeason,
  GusRound,
  GusLiveState,
  GusParticipantRecord,
  GusQuestionBankItem,
  GusRoundEligibility,
  GusPrizeVisibility,
  GusParticipantStatus,
  GusPrizeConfig,
  GusWinner,
} from '../../types';
import {
  subscribeToGusLiveState,
  subscribeToGusCompetition,
  subscribeToGusParticipantsList,
  subscribeToGusQuestionBank,
  subscribeToGusSeasons,
  adminStartGusCompetition,
  adminAdvanceGusQuestion,
  adminPauseGusCompetition,
  adminResumeGusCompetition,
  adminResetGusCompetition,
  adminUpdateGusSettings,
  adminSaveGusQuestion,
  adminDeleteGusQuestion,
  createGusSeason,
  updateGusSeason,
  deleteGusSeason,
  addGusRoundToSeason,
  updateGusRoundInSeason,
  deleteGusRoundFromSeason,
  seedGusQuestionBank,
  concludeGusCompetition,
  adminSaveParticipant,
  adminDeleteParticipant,
  adminUpdateParticipantStatus,
  adminUpdateLiveStateManually,
  adminSavePrizeTier,
  adminDeletePrizeTier,
  adminSaveWinnerRecord,
  adminDeleteWinnerRecord,
  adminUpdateRules,
  DEFAULT_GUS_COMPETITION_ID,
  DEFAULT_GUS_SEASON_ID,
  SEED_GUS_ROUND_THEMES,
} from '../../lib/gusCompetition';
import {
  GusLiveEditModal,
  GusParticipantModal,
  GusPrizeTierModal,
  GusWinnerModal,
  GusResetConfirmModal,
  GusConcludeConfirmModal,
  GusConfirmDialog,
} from './GusAdminModals';
import {
  Award,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Trophy,
  Users,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Settings,
  ShieldAlert,
  Flame,
  Crown,
  Eye,
  Lock,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  BookOpen,
  Calendar,
  Send,
  HelpCircle,
  Check,
  X,
  Copy,
  UserPlus,
  Sliders,
  ListOrdered,
} from 'lucide-react';

interface AdminGusManagerProps {
  onClose?: () => void;
}

export const AdminGusManager: React.FC<AdminGusManagerProps> = ({ onClose }) => {
  const { currentUser } = useApp();

  // Active admin tab
  const [adminTab, setAdminTab] = useState<
    'engine' | 'seasons' | 'rounds' | 'questions' | 'participants' | 'prizes' | 'winners' | 'settings'
  >('engine');

  // Real-time Firestore states
  const [competition, setCompetition] = useState<GusCompetition | null>(null);
  const [liveState, setLiveState] = useState<GusLiveState | null>(null);
  const [seasons, setSeasons] = useState<GusSeason[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(DEFAULT_GUS_SEASON_ID);
  const [participants, setParticipants] = useState<GusParticipantRecord[]>([]);
  const [questionBank, setQuestionBank] = useState<GusQuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Round for Question Bank / Round Manager
  const [selectedRoundTab, setSelectedRoundTab] = useState<number>(1);

  // Confirm and Action Modals
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [showConcludeConfirmModal, setShowConcludeConfirmModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    confirmVariant?: 'danger' | 'primary' | 'warning';
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  // Season Modal State
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [editingSeason, setEditingSeason] = useState<GusSeason | null>(null);
  const [sTitle, setSTitle] = useState('');
  const [sNumber, setSNumber] = useState(1);
  const [sDesc, setSDesc] = useState('');
  const [sStatus, setSStatus] = useState<'Draft' | 'Registration Open' | 'Live' | 'Completed'>('Registration Open');
  const [sRegStart, setSRegStart] = useState('');
  const [sRegEnd, setSRegEnd] = useState('');
  const [sCompStart, setSCompStart] = useState('');
  const [sCompEnd, setSCompEnd] = useState('');
  const [sPrizePool, setSPrizePool] = useState(500000);
  const [sPrizeVisibility, setSPrizeVisibility] = useState<GusPrizeVisibility>('VISIBLE');

  // Round Modal State
  const [showRoundModal, setShowRoundModal] = useState(false);
  const [editingRound, setEditingRound] = useState<GusRound | null>(null);
  const [rName, setRName] = useState('');
  const [rDate, setRDate] = useState('');
  const [rTimeLimit, setRTimeLimit] = useState(20);
  const [rEligibility, setREligibility] = useState<GusRoundEligibility>('FREE_AND_PREMIUM');
  const [rNumber, setRNumber] = useState(1);

  // Question Form Modal (Typed-Answer Based)
  const [showQModal, setShowQModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<GusQuestionBankItem | null>(null);
  const [qText, setQText] = useState('');
  const [qCorrectAnswer, setQCorrectAnswer] = useState('');
  const [qAcceptedAnswersText, setQAcceptedAnswersText] = useState('');
  const [qTopic, setQTopic] = useState('');
  const [qDifficulty, setQDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | 'Master'>('Medium');
  const [qTimeLimit, setQTimeLimit] = useState(20);
  const [qExplanation, setQExplanation] = useState('');
  const [qRoundNum, setQRoundNum] = useState(1);
  const [qOrder, setQOrder] = useState(1);

  // Live State Direct Override Modal
  const [showLiveEditModal, setShowLiveEditModal] = useState(false);

  // Participant CRUD Modal
  const [showPartModal, setShowPartModal] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<GusParticipantRecord | null>(null);

  // Prize Tier CRUD Modal
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [editingPrize, setEditingPrize] = useState<GusPrizeConfig | null>(null);

  // Winner CRUD Modal
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [editingWinner, setEditingWinner] = useState<GusWinner | null>(null);

  // Settings Form State
  const [settingsPrizePool, setSettingsPrizePool] = useState(500000);
  const [settingsVisibility, setSettingsVisibility] = useState<GusPrizeVisibility>('VISIBLE');
  const [settingsTimeLimit, setSettingsTimeLimit] = useState(20);
  const [rulesList, setRulesList] = useState<string[]>([]);
  const [newRuleInput, setNewRuleInput] = useState('');

  // Participants Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ELIMINATED' | 'COMPLETED' | 'DISQUALIFIED'>('ALL');

  // Engine Actions in progress
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Current selected season object
  const currentSeason = seasons.find(s => s.id === selectedSeasonId) || seasons[0] || null;
  const currentSeasonRounds = currentSeason?.rounds || [];
  const currentSeasonPrizes = currentSeason?.prizes || [
    { position: 1, positionTitle: '1st Place Grandmaster', percentage: 70, gpAmount: 350000 },
    { position: 2, positionTitle: '2nd Place Finalist', percentage: 20, gpAmount: 100000 },
    { position: 3, positionTitle: '3rd Place Finalist', percentage: 10, gpAmount: 50000 },
  ];
  const winnersList = competition?.winners || currentSeason?.winners || [];

  // Subscribe to Realtime Firebase Feeds
  useEffect(() => {
    const unsubComp = subscribeToGusCompetition(DEFAULT_GUS_COMPETITION_ID, comp => {
      if (comp) {
        setCompetition(comp);
        setSettingsPrizePool(comp.prizePoolGP || 500000);
        setSettingsVisibility(comp.prizePoolVisibility || 'VISIBLE');
        setSettingsTimeLimit(comp.timePerQuestionSeconds || 20);
        if (comp.rules && comp.rules.length > 0) {
          setRulesList(comp.rules);
        }
      }
    });

    const unsubLive = subscribeToGusLiveState(DEFAULT_GUS_COMPETITION_ID, state => {
      setLiveState(state);
      setLoading(false);
    });

    const unsubParts = subscribeToGusParticipantsList(DEFAULT_GUS_COMPETITION_ID, parts => {
      setParticipants(parts);
    });

    const unsubQuestions = subscribeToGusQuestionBank(selectedSeasonId, qb => {
      setQuestionBank(qb);
    });

    const unsubSeasons = subscribeToGusSeasons(sList => {
      setSeasons(sList);
      if (sList.length > 0 && !selectedSeasonId) {
        setSelectedSeasonId(sList[0].id);
      }
    });

    return () => {
      unsubComp();
      unsubLive();
      unsubParts();
      unsubQuestions();
      unsubSeasons();
    };
  }, [selectedSeasonId]);

  const showFeedback = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 3500);
  };

  // --- ENGINE CONTROLS ---
  const handleStartCompetition = async (round = 1) => {
    setActionLoading(true);
    try {
      await adminStartGusCompetition(DEFAULT_GUS_COMPETITION_ID, round, selectedSeasonId);
      showFeedback(`Competition started for ${currentSeason?.title || 'Season'} at Round ${round} Question 1!`);
    } catch (err: any) {
      showFeedback(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdvanceQuestion = async () => {
    setActionLoading(true);
    try {
      const res = await adminAdvanceGusQuestion(DEFAULT_GUS_COMPETITION_ID, selectedSeasonId);
      if (res.finished) {
        showFeedback('All rounds completed! Winners computed & prizes awarded.');
      } else {
        showFeedback(`Advanced to Round ${res.currentRound} Question ${res.currentQuestionOrder}!`);
      }
    } catch (err: any) {
      showFeedback(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    setActionLoading(true);
    try {
      await adminPauseGusCompetition(DEFAULT_GUS_COMPETITION_ID);
      showFeedback('Competition paused.');
    } catch (err: any) {
      showFeedback(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    setActionLoading(true);
    try {
      await adminResumeGusCompetition(DEFAULT_GUS_COMPETITION_ID);
      showFeedback('Competition timer resumed!');
    } catch (err: any) {
      showFeedback(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConclude = () => {
    setShowConcludeConfirmModal(true);
  };

  const executeConclude = async () => {
    setActionLoading(true);
    try {
      const res = await concludeGusCompetition(DEFAULT_GUS_COMPETITION_ID, selectedSeasonId);
      showFeedback(`Concluded! ${res.winners.length} winner(s) credited ${res.prizePerWinner.toLocaleString()} GP each.`);
    } catch (err: any) {
      showFeedback(`Error: ${err.message}`);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const handleReset = () => {
    setShowResetConfirmModal(true);
  };

  const executeReset = async () => {
    setActionLoading(true);
    try {
      await adminResetGusCompetition(DEFAULT_GUS_COMPETITION_ID, selectedSeasonId);
      showFeedback('Competition and all participants reset successfully to Round 1 Question 1.');
    } catch (err: any) {
      showFeedback(`Error: ${err.message}`);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const handleSeedQuestions = async (targetSeasonId?: string) => {
    setActionLoading(true);
    try {
      const sId = targetSeasonId || selectedSeasonId || DEFAULT_GUS_SEASON_ID;
      await seedGusQuestionBank(sId);
      showFeedback(`Verified & seeded 80 GUS academic questions for ${currentSeason?.title || 'season'} across all 8 rounds!`);
    } catch (err: any) {
      showFeedback(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // --- LIVE STATE DIRECT SAVE ---
  const handleSaveLiveState = async (updates: Partial<GusLiveState>) => {
    setActionLoading(true);
    try {
      await adminUpdateLiveStateManually(DEFAULT_GUS_COMPETITION_ID, updates);
      showFeedback('Live engine state updated directly in real time!');
    } catch (err: any) {
      showFeedback(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // --- SEASONS MANAGEMENT ---
  const openNewSeasonModal = () => {
    setEditingSeason(null);
    setSTitle(`GUS Season ${seasons.length + 1}: Inter-University Olympiad`);
    setSNumber(seasons.length + 1);
    setSDesc('Nationwide live elimination competition for university and polytechnic scholars.');
    setSStatus('Registration Open');
    setSRegStart(new Date().toISOString().split('T')[0]);
    setSRegEnd(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
    setSCompStart(new Date(Date.now() + 35 * 86400000).toISOString().split('T')[0]);
    setSCompEnd(new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0]);
    setSPrizePool(500000);
    setSPrizeVisibility('VISIBLE');
    setShowSeasonModal(true);
  };

  const openEditSeasonModal = (season: GusSeason) => {
    setEditingSeason(season);
    setSTitle(season.title);
    setSNumber(season.seasonNumber || 1);
    setSDesc(season.description || '');
    setSStatus(season.status as any);
    setSRegStart(season.registrationStartDate || '');
    setSRegEnd(season.registrationEndDate || '');
    setSCompStart(season.competitionStartDate || '');
    setSCompEnd(season.competitionEndDate || '');
    setSPrizePool(season.prizePoolGP || 500000);
    setSPrizeVisibility(season.prizePoolVisibility || 'VISIBLE');
    setShowSeasonModal(true);
  };

  const handleSaveSeason = async () => {
    if (!sTitle.trim()) {
      alert('Please enter a season title.');
      return;
    }

    setActionLoading(true);
    try {
      if (editingSeason) {
        await updateGusSeason(editingSeason.id, {
          title: sTitle.trim(),
          seasonNumber: sNumber,
          description: sDesc.trim(),
          status: sStatus,
          registrationStartDate: sRegStart,
          registrationEndDate: sRegEnd,
          competitionStartDate: sCompStart,
          competitionEndDate: sCompEnd,
          prizePoolGP: sPrizePool,
          prizePoolVisibility: sPrizeVisibility,
        });
        showFeedback(`Season "${sTitle}" updated successfully!`);
      } else {
        const newSeason = await createGusSeason({
          title: sTitle.trim(),
          seasonNumber: sNumber,
          description: sDesc.trim(),
          status: sStatus,
          registrationStartDate: sRegStart,
          registrationEndDate: sRegEnd,
          competitionStartDate: sCompStart,
          competitionEndDate: sCompEnd,
          prizePoolGP: sPrizePool,
          prizePoolVisibility: sPrizeVisibility,
        });
        setSelectedSeasonId(newSeason.id);
        showFeedback(`Season "${sTitle}" created successfully!`);
      }
      setShowSeasonModal(false);
    } catch (err: any) {
      showFeedback(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSeason = (seasonId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete GUS Season',
      message: 'Are you sure you want to delete this GUS season? All rounds, participants, and data linked to this season will be affected. This action cannot be undone.',
      confirmText: 'Delete Season',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await deleteGusSeason(seasonId);
          showFeedback('Season deleted.');
        } catch (err: any) {
          showFeedback(`Error: ${err.message}`);
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // --- DYNAMIC ROUNDS MANAGEMENT ---
  const openNewRoundModal = () => {
    setEditingRound(null);
    const nextNum = currentSeasonRounds.length + 1;
    setRNumber(nextNum);
    setRName(SEED_GUS_ROUND_THEMES[nextNum]?.title || `Round ${nextNum}: Academic Discipline`);
    setRDate(new Date(Date.now() + nextNum * 7 * 86400000).toISOString().split('T')[0]);
    setRTimeLimit(20);
    setREligibility(nextNum <= 2 ? 'FREE_AND_PREMIUM' : 'PREMIUM_ONLY');
    setShowRoundModal(true);
  };

  const openEditRoundModal = (round: GusRound) => {
    setEditingRound(round);
    setRNumber(round.roundNumber);
    setRName(round.name || round.title || `Round ${round.roundNumber}`);
    setRDate(round.date || '');
    setRTimeLimit(round.timePerQuestionSeconds || 20);
    setREligibility(round.eligibility || 'FREE_AND_PREMIUM');
    setShowRoundModal(true);
  };

  const handleSaveRound = async () => {
    if (!rName.trim()) {
      alert('Please enter a round name.');
      return;
    }

    setActionLoading(true);
    try {
      const activeSeasonId = currentSeason?.id || DEFAULT_GUS_SEASON_ID;
      if (editingRound) {
        await updateGusRoundInSeason(activeSeasonId, editingRound.id, {
          name: rName.trim(),
          title: rName.trim(),
          date: rDate,
          timePerQuestionSeconds: rTimeLimit,
          eligibility: rEligibility,
          roundNumber: rNumber,
        });
        showFeedback(`Round "${rName}" updated successfully!`);
      } else {
        await addGusRoundToSeason(activeSeasonId, {
          name: rName.trim(),
          date: rDate,
          roundNumber: rNumber,
          timePerQuestionSeconds: rTimeLimit,
          eligibility: rEligibility,
        });
        showFeedback(`Round "${rName}" added to season!`);
      }
      setShowRoundModal(false);
    } catch (err: any) {
      showFeedback(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRound = (roundId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Round',
      message: 'Are you sure you want to delete this round from the season? Questions assigned to this round will also be removed.',
      confirmText: 'Delete Round',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const activeSeasonId = currentSeason?.id || DEFAULT_GUS_SEASON_ID;
          await deleteGusRoundFromSeason(activeSeasonId, roundId);
          showFeedback('Round deleted from season.');
        } catch (err: any) {
          showFeedback(`Error: ${err.message}`);
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // --- QUESTION FORM MODAL (TYPED ANSWERS) ---
  const openNewQuestionModal = (roundNum: number) => {
    const existingInRound = questionBank.filter(q => q.roundNumber === roundNum);
    const roundObj = currentSeasonRounds.find(r => r.roundNumber === roundNum);

    setEditingQuestion(null);
    setQRoundNum(roundNum);
    setQOrder(existingInRound.length + 1);
    setQText('');
    setQCorrectAnswer('');
    setQAcceptedAnswersText('');
    setQTopic(roundObj?.name || SEED_GUS_ROUND_THEMES[roundNum]?.topic || 'Academic Discipline');
    setQDifficulty('Medium');
    setQTimeLimit(20);
    setQExplanation('');
    setShowQModal(true);
  };

  const openEditQuestionModal = (q: GusQuestionBankItem) => {
    setEditingQuestion(q);
    setQRoundNum(q.roundNumber || 1);
    setQOrder(q.questionOrder || 1);
    setQText(q.question);
    setQCorrectAnswer(q.correctAnswer || (q.options && q.options[q.correctOptionIndex || 0]) || '');
    setQAcceptedAnswersText((q.acceptedAnswers || []).join(', '));
    setQTopic(q.topic || 'Academic Discipline');
    setQDifficulty(q.difficulty || 'Medium');
    setQTimeLimit(q.timeLimitSeconds || 20);
    setQExplanation(q.explanation || '');
    setShowQModal(true);
  };

  const handleDuplicateQuestion = async (q: GusQuestionBankItem) => {
    setActionLoading(true);
    try {
      const existingInRound = questionBank.filter(item => item.roundNumber === q.roundNumber);
      await adminSaveGusQuestion({
        seasonId: selectedSeasonId,
        roundNumber: q.roundNumber || 1,
        roundName: q.roundName,
        questionOrder: existingInRound.length + 1,
        question: `${q.question} (Copy)`,
        correctAnswer: q.correctAnswer || 'Answer',
        acceptedAnswers: q.acceptedAnswers || [q.correctAnswer || 'Answer'],
        topic: q.topic,
        difficulty: q.difficulty,
        timeLimitSeconds: q.timeLimitSeconds,
        explanation: q.explanation,
        active: true,
      });
      showFeedback('Question duplicated successfully!');
    } catch (err: any) {
      showFeedback(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveQuestion = async () => {
    if (!qText.trim()) {
      showFeedback('Please enter a question prompt.');
      return;
    }
    if (!qCorrectAnswer.trim()) {
      showFeedback('Please enter the typed correct answer.');
      return;
    }

    const acceptedList = qAcceptedAnswersText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    if (!acceptedList.includes(qCorrectAnswer.trim())) {
      acceptedList.unshift(qCorrectAnswer.trim());
    }

    const roundObj = currentSeasonRounds.find(r => r.roundNumber === qRoundNum);

    setActionLoading(true);
    try {
      await adminSaveGusQuestion({
        id: editingQuestion?.id,
        seasonId: selectedSeasonId,
        roundNumber: qRoundNum,
        roundName: roundObj?.name || `Round ${qRoundNum}`,
        questionOrder: qOrder,
        question: qText.trim(),
        correctAnswer: qCorrectAnswer.trim(),
        acceptedAnswers: acceptedList,
        topic: qTopic.trim() || 'Academic Discipline',
        difficulty: qDifficulty,
        timeLimitSeconds: qTimeLimit,
        explanation: qExplanation.trim(),
        active: true,
      });

      showFeedback(`Question ${qOrder} for Round ${qRoundNum} saved!`);
      setShowQModal(false);
    } catch (err: any) {
      showFeedback(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteQuestion = (qId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Question',
      message: 'Are you sure you want to delete this question from the question bank?',
      confirmText: 'Delete Question',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await adminDeleteGusQuestion(qId);
          showFeedback('Question deleted from bank.');
        } catch (err: any) {
          showFeedback(`Error: ${err.message}`);
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // --- PARTICIPANTS CRUD ---
  const handleSaveParticipantRecord = async (
    record: Partial<GusParticipantRecord> & { userId: string; userName: string }
  ) => {
    setActionLoading(true);
    try {
      await adminSaveParticipant(DEFAULT_GUS_COMPETITION_ID, record);
      showFeedback(`Participant "${record.userName}" saved successfully!`);
    } catch (err: any) {
      showFeedback(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteParticipantRecord = (participantDocId: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Participant',
      message: `Are you sure you want to delete scholar participant "${name}" from this GUS competition?`,
      confirmText: 'Delete Participant',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await adminDeleteParticipant(DEFAULT_GUS_COMPETITION_ID, participantDocId);
          showFeedback(`Participant "${name}" deleted.`);
        } catch (err: any) {
          showFeedback(`Error: ${err.message}`);
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleQuickParticipantStatus = async (
    participantDocId: string,
    status: GusParticipantStatus,
    reason?: any
  ) => {
    setActionLoading(true);
    try {
      await adminUpdateParticipantStatus(DEFAULT_GUS_COMPETITION_ID, participantDocId, status, reason);
      showFeedback(`Participant status updated to ${status}!`);
    } catch (err: any) {
      showFeedback(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // --- PRIZE TIERS CRUD ---
  const handleSavePrizeTier = async (prize: GusPrizeConfig) => {
    setActionLoading(true);
    try {
      const activeSeasonId = currentSeason?.id || DEFAULT_GUS_SEASON_ID;
      await adminSavePrizeTier(activeSeasonId, prize);
      showFeedback(`Prize tier "${prize.positionTitle || prize.title}" saved!`);
    } catch (err: any) {
      showFeedback(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePrizeTier = (positionOrId: number | string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Prize Tier',
      message: 'Are you sure you want to delete this prize tier configuration?',
      confirmText: 'Delete Prize Tier',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const activeSeasonId = currentSeason?.id || DEFAULT_GUS_SEASON_ID;
          await adminDeletePrizeTier(activeSeasonId, positionOrId);
          showFeedback('Prize tier deleted.');
        } catch (err: any) {
          showFeedback(`Error: ${err.message}`);
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // --- WINNERS CRUD ---
  const handleSaveWinnerRecord = async (winner: Partial<GusWinner> & { userId: string; userName: string }) => {
    setActionLoading(true);
    try {
      await adminSaveWinnerRecord(DEFAULT_GUS_COMPETITION_ID, winner);
      showFeedback(`Champion "${winner.userName}" saved to Hall of Fame!`);
    } catch (err: any) {
      showFeedback(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteWinnerRecord = (winnerId: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Hall of Fame Champion',
      message: `Are you sure you want to remove "${name}" from the Hall of Fame winners list?`,
      confirmText: 'Remove Champion',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await adminDeleteWinnerRecord(DEFAULT_GUS_COMPETITION_ID, winnerId);
          showFeedback(`Winner "${name}" removed.`);
        } catch (err: any) {
          showFeedback(`Error: ${err.message}`);
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // --- RULES & SETTINGS CRUD ---
  const handleAddRule = () => {
    if (!newRuleInput.trim()) return;
    setRulesList([...rulesList, newRuleInput.trim()]);
    setNewRuleInput('');
  };

  const handleRemoveRule = (index: number) => {
    setRulesList(rulesList.filter((_, idx) => idx !== index));
  };

  const handleUpdateRuleText = (index: number, newText: string) => {
    const updated = [...rulesList];
    updated[index] = newText;
    setRulesList(updated);
  };

  const handleSaveGlobalSettings = async () => {
    setActionLoading(true);
    try {
      await adminUpdateGusSettings(DEFAULT_GUS_COMPETITION_ID, {
        prizePoolGP: settingsPrizePool,
        prizePoolVisibility: settingsVisibility,
        timePerQuestionSeconds: settingsTimeLimit,
      });
      await adminUpdateRules(DEFAULT_GUS_COMPETITION_ID, rulesList, selectedSeasonId);
      showFeedback('Competition global settings and rules saved successfully!');
    } catch (err: any) {
      showFeedback(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered lists
  const filteredParticipants = participants.filter(p => {
    const matchesSearch =
      p.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.institution?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.department?.toLowerCase().includes(searchQuery.toLowerCase());
    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && p.status === statusFilter;
  });

  const seasonQuestions = questionBank.filter(q => {
    if (!q.seasonId) return true;
    return q.seasonId === selectedSeasonId;
  });

  const filteredQuestions = seasonQuestions.filter(q => q.roundNumber === selectedRoundTab);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-6 animate-fadeIn">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
              Admin Master Control
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Full CRUD Enabled
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            GUS Competition Operations Panel
          </h1>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4" /> Return to GUS Hub
          </button>
        )}
      </div>

      {/* Global Feedback Banner */}
      {actionMsg && (
        <div className="p-3.5 rounded-2xl bg-blue-600 text-white text-xs font-bold flex items-center justify-between shadow-lg shadow-blue-600/20 animate-fadeIn">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-white hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-2 border-b border-slate-200 dark:border-slate-800 scrollbar-none text-xs font-bold">
        <button
          onClick={() => setAdminTab('engine')}
          className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
            adminTab === 'engine'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          <Flame className="w-4 h-4" /> Live Engine
        </button>

        <button
          onClick={() => setAdminTab('seasons')}
          className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
            adminTab === 'seasons'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" /> Seasons ({seasons.length})
        </button>

        <button
          onClick={() => setAdminTab('rounds')}
          className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
            adminTab === 'rounds'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" /> Rounds & Dates ({currentSeasonRounds.length})
        </button>

        <button
          onClick={() => setAdminTab('questions')}
          className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
            adminTab === 'questions'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" /> Question Bank ({questionBank.length})
        </button>

        <button
          onClick={() => setAdminTab('participants')}
          className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
            adminTab === 'participants'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          <Users className="w-4 h-4" /> Participants ({participants.length})
        </button>

        <button
          onClick={() => setAdminTab('prizes')}
          className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
            adminTab === 'prizes'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          <Trophy className="w-4 h-4" /> Prize Tiers ({currentSeasonPrizes.length})
        </button>

        <button
          onClick={() => setAdminTab('winners')}
          className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
            adminTab === 'winners'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          <Award className="w-4 h-4" /> Hall of Fame ({winnersList.length})
        </button>

        <button
          onClick={() => setAdminTab('settings')}
          className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
            adminTab === 'settings'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" /> Rules & Global
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LIVE ENGINE CONTROL */}
      {/* ========================================================================= */}
      {adminTab === 'engine' && (
        <div className="space-y-6">
          {/* Status & Telemetry Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Engine Status</span>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    liveState?.status === 'LIVE'
                      ? 'bg-emerald-500 animate-ping'
                      : liveState?.status === 'PAUSED'
                      ? 'bg-amber-500'
                      : 'bg-slate-400'
                  }`}
                />
                {liveState?.status || 'WAITING'}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Current Stage</span>
              <div className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400">
                R{liveState?.currentRound || 1} • Q{liveState?.currentQuestionOrder || 1}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Active Survivors</span>
              <div className="text-base sm:text-lg font-black text-emerald-500">
                {(liveState?.activeParticipants || 0).toLocaleString()}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Eliminated</span>
              <div className="text-base sm:text-lg font-black text-rose-500">
                {(liveState?.eliminatedParticipants || 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Action Control Panel */}
          <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 space-y-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-black">Live Competition Engine Dispatcher</h2>
                <p className="text-xs text-slate-400">
                  Broadcast typed-answer questions, control synchronized timers, or manually override live parameters.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowLiveEditModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold transition-all flex items-center gap-1.5 border border-amber-500/30 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Edit Live State Directly
                </button>
                <button
                  onClick={() => handleSeedQuestions()}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                  Seed 80 Questions
                </button>
              </div>
            </div>

            {/* Broadcast Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => handleStartCompetition(liveState?.currentRound || 1)}
                disabled={actionLoading}
                className="p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-black text-sm text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-5 h-5 fill-current" />
                Start Competition / Broadcast Q1
              </button>

              <button
                onClick={handleAdvanceQuestion}
                disabled={actionLoading || liveState?.status !== 'LIVE'}
                className="p-4 rounded-2xl bg-blue-600 hover:bg-blue-500 font-black text-sm text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer disabled:opacity-50"
              >
                <FastForward className="w-5 h-5 fill-current" />
                Advance to Next Question ⏭
              </button>

              {liveState?.status === 'LIVE' ? (
                <button
                  onClick={handlePause}
                  disabled={actionLoading}
                  className="p-4 rounded-2xl bg-amber-600 hover:bg-amber-500 font-black text-sm text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-600/30 cursor-pointer disabled:opacity-50"
                >
                  <Pause className="w-5 h-5 fill-current" />
                  Pause Engine Clock
                </button>
              ) : (
                <button
                  onClick={handleResume}
                  disabled={actionLoading}
                  className="p-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-black text-sm text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Resume Engine Clock
                </button>
              )}
            </div>

            {/* Danger Zone: Conclude & Reset */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={handleReset}
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 hover:text-rose-400 text-slate-400 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-slate-700"
              >
                <RotateCcw className="w-4 h-4" /> Reset to Round 1 (All Participants Active)
              </button>

              <button
                onClick={handleConclude}
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:opacity-90 font-black text-xs text-slate-950 transition-all flex items-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <Crown className="w-4 h-4" /> Conclude Season & Distribute Prize Pool
              </button>
            </div>
          </div>

          {/* Current Broadcast Question Preview with Typed Correct Answer */}
          {liveState?.question && (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <span className="text-xs font-bold text-slate-400 uppercase">
                  Active Question Broadcast Preview
                </span>
                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  {liveState.question.topic || 'Academic Logic'}
                </span>
              </div>

              <div className="space-y-3">
                <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                  {liveState.question.question}
                </p>

                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs space-y-1">
                  <span className="font-bold uppercase tracking-wider text-[10px] block">
                    Authoritative Typed Solution:
                  </span>
                  <div className="font-mono font-black text-sm">
                    {liveState.question.correctAnswer || (liveState.question.options && liveState.question.options[0]) || 'Typed Answer'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MULTIPLE SEASONS MANAGER */}
      {/* ========================================================================= */}
      {adminTab === 'seasons' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">GUS Seasons Manager</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Create, edit, save, and delete multiple seasons with custom date schedules and prize pools.
              </p>
            </div>

            <button
              onClick={openNewSeasonModal}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create New Season
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {seasons.map(s => {
              const isCurrent = s.id === selectedSeasonId;
              return (
                <div
                  key={s.id}
                  className={`p-5 rounded-3xl border-2 transition-all space-y-4 ${
                    isCurrent
                      ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-500 shadow-md'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-[10px] font-mono font-black uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      Season #{s.seasonNumber}
                    </span>

                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                        s.status === 'Live'
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : s.status === 'Registration Open'
                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">{s.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                      {s.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Registration:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {s.registrationStartDate || 'TBD'} to {s.registrationEndDate || 'TBD'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Competition:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {s.competitionStartDate || 'TBD'} to {s.competitionEndDate || 'TBD'}
                      </span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                      <span className="text-[10px] text-slate-400">Prize Pool:</span>
                      <span className="font-mono font-black text-amber-500">
                        {(s.prizePoolGP || 500000).toLocaleString()} GP
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setSelectedSeasonId(s.id);
                        showFeedback(`Active working season switched to "${s.title}"!`);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {isCurrent ? '✓ Active Working Season' : 'Select Season'}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditSeasonModal(s)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                        title="Edit Season"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSeason(s.id)}
                        className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 transition-all cursor-pointer"
                        title="Delete Season"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DYNAMIC ROUNDS & DATES MANAGER */}
      {/* ========================================================================= */}
      {adminTab === 'rounds' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-blue-500">
                  {currentSeason?.title || 'Active Season'}
                </span>
              </div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">Rounds & Schedule Manager</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Admin can add, edit, save, and delete rounds with custom names, scheduled dates, and question timers.
              </p>
            </div>

            <button
              onClick={openNewRoundModal}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add New Round
            </button>
          </div>

          <div className="space-y-3">
            {currentSeasonRounds.length === 0 ? (
              <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
                <Layers className="w-10 h-10 mx-auto text-slate-400" />
                <p className="text-xs text-slate-500">No rounds created for this season yet.</p>
                <button
                  onClick={openNewRoundModal}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
                >
                  Create Round 1
                </button>
              </div>
            ) : (
              currentSeasonRounds.map(r => {
                const roundQs = questionBank.filter(q => q.roundNumber === r.roundNumber);
                return (
                  <div
                    key={r.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:border-blue-500/40 transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 font-mono font-black text-sm flex items-center justify-center border border-blue-500/20">
                        R{r.roundNumber}
                      </span>
                      <div>
                        <h4 className="font-black text-sm text-slate-900 dark:text-white">
                          {r.name || r.title || `Round ${r.roundNumber}`}
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {r.date || 'Date not set'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {r.timePerQuestionSeconds || 20}s per question
                          </span>
                          <span>•</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {r.eligibility === 'PREMIUM_ONLY' ? '👑 Premium Only' : 'Free & Premium'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                        {roundQs.length} Questions
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedRoundTab(r.roundNumber);
                            setAdminTab('questions');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                        >
                          View Questions
                        </button>
                        <button
                          onClick={() => openEditRoundModal(r)}
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                          title="Edit Round"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRound(r.id)}
                          className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 transition-all cursor-pointer"
                          title="Delete Round"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: TYPED QUESTION BANK */}
      {/* ========================================================================= */}
      {adminTab === 'questions' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  Subjected Season
                </span>
                <select
                  value={selectedSeasonId}
                  onChange={e => setSelectedSeasonId(e.target.value)}
                  className="px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  {seasons.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.status})
                    </option>
                  ))}
                </select>
              </div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Typed-Answer Question Bank ({seasonQuestions.length} Questions in Season)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                All questions and answer keys created here belong strictly to <span className="font-bold text-slate-700 dark:text-slate-300">"{currentSeason?.title || 'Selected Season'}"</span>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleSeedQuestions(selectedSeasonId)}
                disabled={actionLoading}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                title="Populate 80 academic questions across all 8 rounds for this season"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                Seed 80 Questions for this Season
              </button>

              <button
                onClick={() => openNewQuestionModal(selectedRoundTab)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Question to Round {selectedRoundTab}
              </button>
            </div>
          </div>

          {/* Round Selector Tabs */}
          <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none border-b border-slate-200 dark:border-slate-800">
            {(currentSeasonRounds.length > 0
              ? currentSeasonRounds
              : Array.from({ length: 8 }, (_, i) => ({ roundNumber: i + 1, name: `Round ${i + 1}` }))
            ).map(r => {
              const isSelected = selectedRoundTab === r.roundNumber;
              const count = seasonQuestions.filter(q => q.roundNumber === r.roundNumber).length;
              return (
                <button
                  key={r.roundNumber}
                  onClick={() => setSelectedRoundTab(r.roundNumber)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  <span>Round {r.roundNumber}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isSelected ? 'bg-white/20 dark:bg-slate-900/20' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Questions in Selected Round */}
          <div className="space-y-3">
            {filteredQuestions.length === 0 ? (
              <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
                <BookOpen className="w-10 h-10 mx-auto text-slate-400" />
                <p className="text-xs text-slate-500">No questions added to Round {selectedRoundTab} yet.</p>
                <button
                  onClick={() => openNewQuestionModal(selectedRoundTab)}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer"
                >
                  Create First Question
                </button>
              </div>
            ) : (
              filteredQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-blue-600/10 text-blue-600 font-mono font-black text-xs flex items-center justify-center">
                        Q{q.questionOrder || idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {q.topic}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {q.difficulty} • {q.timeLimitSeconds || 20}s
                      </span>
                      <button
                        onClick={() => handleDuplicateQuestion(q)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                        title="Duplicate Question"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openEditQuestionModal(q)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                        title="Edit Question"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 transition-all cursor-pointer"
                        title="Delete Question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                    {q.question}
                  </p>

                  {/* Authoritative Typed Answer & Accepted Spellings */}
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider text-[10px]">
                        Typed Correct Answer:
                      </span>
                      <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                        {q.correctAnswer}
                      </span>
                    </div>
                    {q.acceptedAnswers && q.acceptedAnswers.length > 1 && (
                      <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 pt-0.5">
                        <span className="font-semibold">Accepted Aliases: </span>
                        {q.acceptedAnswers.join(' • ')}
                      </div>
                    )}
                  </div>

                  {q.explanation && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                      Solution Notes: {q.explanation}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: PARTICIPANTS (FULL CRUD) */}
      {/* ========================================================================= */}
      {adminTab === 'participants' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">Registered Participants</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Register scholars manually, edit scores/status, delete records, or revive/eliminate participants.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingParticipant(null);
                  setShowPartModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" /> Add Participant
              </button>
            </div>
          </div>

          {/* Filter Pills & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {(['ALL', 'ACTIVE', 'ELIMINATED', 'COMPLETED', 'DISQUALIFIED'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search scholar name, school..."
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2.5">
            {filteredParticipants.length === 0 ? (
              <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                No participants found matching current search.
              </div>
            ) : (
              filteredParticipants.map(p => (
                <div
                  key={p.id || p.userId}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={p.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.userId}`}
                      alt="Avatar"
                      className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-800"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{p.userName}</span>
                        {p.isPremium && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400">
                            PRO
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-mono">({p.userId})</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {p.institution} • {p.department} ({p.level})
                      </div>
                      {p.lastSubmittedAnswerText && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Last Typed Answer: "{p.lastSubmittedAnswerText}"
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 text-right">
                    <div className="text-xs text-left md:text-right">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">
                        {p.questionsCompleted || 0} Solved • R{p.currentRound || 1}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        <span className="text-emerald-500 font-bold">{p.correctAnswers || 0} Correct</span> /{' '}
                        <span className="text-rose-500 font-bold">{p.incorrectAnswers || 0} Wrong</span>
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                        p.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : p.status === 'COMPLETED'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          : p.status === 'DISQUALIFIED'
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {p.status}
                    </span>

                    {/* Action Buttons: Quick Status + Edit + Delete */}
                    <div className="flex items-center gap-1.5">
                      {p.status !== 'ACTIVE' && (
                        <button
                          onClick={() => handleQuickParticipantStatus(p.id || `${DEFAULT_GUS_COMPETITION_ID}_${p.userId}`, 'ACTIVE')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 text-[11px] font-bold transition-all"
                          title="Revive Scholar"
                        >
                          Revive
                        </button>
                      )}
                      {p.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleQuickParticipantStatus(p.id || `${DEFAULT_GUS_COMPETITION_ID}_${p.userId}`, 'ELIMINATED', 'Wrong Answer')}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 text-[11px] font-bold transition-all"
                          title="Eliminate"
                        >
                          Eliminate
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingParticipant(p);
                          setShowPartModal(true);
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                        title="Edit Participant"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteParticipantRecord(p.id || `${DEFAULT_GUS_COMPETITION_ID}_${p.userId}`, p.userName)}
                        className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 transition-all cursor-pointer"
                        title="Delete Participant"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: PRIZE TIERS & DISTRIBUTION */}
      {/* ========================================================================= */}
      {adminTab === 'prizes' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">Prize Tiers & Distribution</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure reward breakdown, percentage split of the prize pool, and trophy awards for each position.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingPrize(null);
                setShowPrizeModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Prize Tier
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {currentSeasonPrizes.map((pz, idx) => (
              <div
                key={pz.id || idx}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 font-mono font-black text-sm flex items-center justify-center">
                    #{pz.position}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    {pz.percentage || 0}% of Pool
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {pz.positionTitle || pz.title || `Position #${pz.position}`}
                  </h3>
                  <div className="text-lg font-mono font-black text-amber-500 mt-1">
                    {(pz.gpAmount || 0).toLocaleString()} GP
                  </div>
                  {pz.description && (
                    <p className="text-xs text-slate-400 mt-1">{pz.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setEditingPrize(pz);
                      setShowPrizeModal(true);
                    }}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                    title="Edit Prize Tier"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeletePrizeTier(pz.id || pz.position)}
                    className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 transition-all cursor-pointer"
                    title="Delete Prize Tier"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: HALL OF FAME / WINNERS (FULL CRUD) */}
      {/* ========================================================================= */}
      {adminTab === 'winners' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">GUS Hall of Fame & Winners</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage champion records, awarded prizes, and historic grandmaster victories.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingWinner(null);
                setShowWinnerModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Champion Record
            </button>
          </div>

          <div className="space-y-3">
            {winnersList.length === 0 ? (
              <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
                <Crown className="w-10 h-10 mx-auto text-amber-400" />
                <p className="text-xs text-slate-500">No champions recorded yet.</p>
                <button
                  onClick={() => {
                    setEditingWinner(null);
                    setShowWinnerModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer"
                >
                  Add First Champion Record
                </button>
              </div>
            ) : (
              winnersList.map(w => (
                <div
                  key={w.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 font-mono font-black text-sm flex items-center justify-center border border-amber-500/20">
                      #{w.position}
                    </span>
                    <div>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        {w.userName}
                        <span className="text-xs font-normal text-amber-500 font-mono">
                          • {w.positionTitle}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {w.institution} • Score: {w.finalScore} • Round {w.finalRoundReached} Finalist
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <span className="font-mono font-black text-amber-500 text-sm">
                      {w.gpAwarded.toLocaleString()} GP
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingWinner(w);
                          setShowWinnerModal(true);
                        }}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                        title="Edit Champion"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteWinnerRecord(w.id, w.userName)}
                        className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 transition-all cursor-pointer"
                        title="Delete Champion"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: RULES & GLOBAL SETTINGS */}
      {/* ========================================================================= */}
      {adminTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Global Parameters */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm">
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              Global Competition Parameters
            </h2>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Global Prize Pool (GP):
                </label>
                <input
                  type="number"
                  value={settingsPrizePool}
                  onChange={e => setSettingsPrizePool(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Prize Pool Visibility:
                </label>
                <select
                  value={settingsVisibility}
                  onChange={e => setSettingsVisibility(e.target.value as GusPrizeVisibility)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-bold"
                >
                  <option value="VISIBLE">Visible to All Scholars</option>
                  <option value="HIDDEN">Hidden / Blind Prize</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Default Time Limit per Question (Seconds):
                </label>
                <input
                  type="number"
                  value={settingsTimeLimit}
                  onChange={e => setSettingsTimeLimit(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>
            </div>

            <button
              onClick={handleSaveGlobalSettings}
              disabled={actionLoading}
              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition-all shadow-md shadow-blue-600/20 cursor-pointer"
            >
              Save Parameters & Rules
            </button>
          </div>

          {/* Rules Editor */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Competition Rules & Protocol
              </h2>
              <span className="text-xs text-slate-400 font-mono">{rulesList.length} Rules</span>
            </div>

            {/* Add Rule Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newRuleInput}
                onChange={e => setNewRuleInput(e.target.value)}
                placeholder="Add a new competition rule..."
                className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddRule();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddRule}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Add
              </button>
            </div>

            {/* Rules list */}
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 text-xs">
              {rulesList.map((rule, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 group"
                >
                  <span className="w-5 h-5 rounded-md bg-blue-500/10 text-blue-600 font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={rule}
                    onChange={e => handleUpdateRuleText(idx, e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-white font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveRule(idx)}
                    className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT SEASON */}
      {/* ========================================================================= */}
      {showSeasonModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="max-w-lg w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-base">
                {editingSeason ? 'Edit GUS Season' : 'Create New GUS Season'}
              </h3>
              <button onClick={() => setShowSeasonModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs max-h-[70vh] overflow-y-auto pr-1">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Season Title:</label>
                <input
                  type="text"
                  value={sTitle}
                  onChange={e => setSTitle(e.target.value)}
                  placeholder="e.g. GUS Season 2: Inter-University Championship"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Season Number:</label>
                  <input
                    type="number"
                    value={sNumber}
                    onChange={e => setSNumber(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Status:</label>
                  <select
                    value={sStatus}
                    onChange={e => setSStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Registration Open">Registration Open</option>
                    <option value="Live">Live</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Description:</label>
                <textarea
                  value={sDesc}
                  onChange={e => setSDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Registration Start:</label>
                  <input
                    type="date"
                    value={sRegStart}
                    onChange={e => setSRegStart(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Registration End:</label>
                  <input
                    type="date"
                    value={sRegEnd}
                    onChange={e => setSRegEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Competition Start:</label>
                  <input
                    type="date"
                    value={sCompStart}
                    onChange={e => setSCompStart(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Competition End:</label>
                  <input
                    type="date"
                    value={sCompEnd}
                    onChange={e => setSCompEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Prize Pool (GP):</label>
                  <input
                    type="number"
                    value={sPrizePool}
                    onChange={e => setSPrizePool(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Prize Visibility:</label>
                  <select
                    value={sPrizeVisibility}
                    onChange={e => setSPrizeVisibility(e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                  >
                    <option value="VISIBLE">Visible</option>
                    <option value="HIDDEN">Hidden</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowSeasonModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSeason}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-md shadow-blue-600/20"
              >
                {editingSeason ? 'Save Changes' : 'Create Season'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT ROUND */}
      {/* ========================================================================= */}
      {showRoundModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="max-w-md w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-base">
                {editingRound ? 'Edit Round Details' : 'Add New Round'}
              </h3>
              <button onClick={() => setShowRoundModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Round Name / Title:</label>
                <input
                  type="text"
                  value={rName}
                  onChange={e => setRName(e.target.value)}
                  placeholder="e.g. Preliminary Speed Logic"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Round Number:</label>
                  <input
                    type="number"
                    value={rNumber}
                    onChange={e => setRNumber(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Scheduled Date:</label>
                  <input
                    type="date"
                    value={rDate}
                    onChange={e => setRDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Seconds per Question:</label>
                  <input
                    type="number"
                    value={rTimeLimit}
                    onChange={e => setRTimeLimit(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Eligibility:</label>
                  <select
                    value={rEligibility}
                    onChange={e => setREligibility(e.target.value as GusRoundEligibility)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                  >
                    <option value="FREE_AND_PREMIUM">Free & Premium</option>
                    <option value="PREMIUM_ONLY">Premium Only</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowRoundModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRound}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-md shadow-blue-600/20"
              >
                {editingRound ? 'Save Round' : 'Add Round'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT QUESTION (TYPED-ANSWER BASED) */}
      {/* ========================================================================= */}
      {showQModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="max-w-lg w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-base">
                {editingQuestion ? 'Edit Typed Question' : `New Typed Question (Round ${qRoundNum})`}
              </h3>
              <button onClick={() => setShowQModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Round Number:</label>
                  <input
                    type="number"
                    value={qRoundNum}
                    onChange={e => setQRoundNum(Number(e.target.value))}
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
                <label className="font-bold text-slate-700 dark:text-slate-300">Question Prompt:</label>
                <textarea
                  value={qText}
                  onChange={e => setQText(e.target.value)}
                  rows={3}
                  placeholder="e.g. What is the derivative of f(x) = 3x² - 4x + 7 at x = 2?"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium resize-none"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                <div className="space-y-1">
                  <label className="font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider text-[10px]">
                    Typed Correct Answer (Required):
                  </label>
                  <input
                    type="text"
                    value={qCorrectAnswer}
                    onChange={e => setQCorrectAnswer(e.target.value)}
                    placeholder="e.g. 8"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-emerald-500/40 rounded-xl text-emerald-600 dark:text-emerald-400 font-mono font-black"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider text-[10px]">
                    Accepted Alternative Spellings / Aliases (Comma-separated):
                  </label>
                  <input
                    type="text"
                    value={qAcceptedAnswersText}
                    onChange={e => setQAcceptedAnswersText(e.target.value)}
                    placeholder="e.g. 8.0, eight, eight units"
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-xl text-slate-700 dark:text-slate-300 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Topic / Discipline:</label>
                  <input
                    type="text"
                    value={qTopic}
                    onChange={e => setQTopic(e.target.value)}
                    placeholder="e.g. Mathematics"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Difficulty:</label>
                  <select
                    value={qDifficulty}
                    onChange={e => setQDifficulty(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                    <option value="Master">Master</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Timer (Sec):</label>
                  <input
                    type="number"
                    value={qTimeLimit}
                    onChange={e => setQTimeLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Academic Explanation / Solution Notes:</label>
                <textarea
                  value={qExplanation}
                  onChange={e => setQExplanation(e.target.value)}
                  rows={2}
                  placeholder="Explain why this answer is correct..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowQModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuestion}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-md shadow-blue-600/20"
              >
                {editingQuestion ? 'Save Question' : 'Add Question'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DIRECT LIVE ENGINE STATE OVERRIDE */}
      {/* ========================================================================= */}
      <GusLiveEditModal
        isOpen={showLiveEditModal}
        onClose={() => setShowLiveEditModal(false)}
        liveState={liveState}
        onSave={handleSaveLiveState}
      />

      {/* ========================================================================= */}
      {/* MODAL: PARTICIPANT CRUD */}
      {/* ========================================================================= */}
      <GusParticipantModal
        isOpen={showPartModal}
        onClose={() => setShowPartModal(false)}
        editingParticipant={editingParticipant}
        onSave={handleSaveParticipantRecord}
      />

      {/* ========================================================================= */}
      {/* MODAL: PRIZE TIER CRUD */}
      {/* ========================================================================= */}
      <GusPrizeTierModal
        isOpen={showPrizeModal}
        onClose={() => setShowPrizeModal(false)}
        editingPrize={editingPrize}
        totalPrizePool={competition?.prizePoolGP || currentSeason?.prizePoolGP || 500000}
        onSave={handleSavePrizeTier}
      />

      {/* ========================================================================= */}
      {/* MODAL: WINNER CRUD */}
      {/* ========================================================================= */}
      <GusWinnerModal
        isOpen={showWinnerModal}
        onClose={() => setShowWinnerModal(false)}
        editingWinner={editingWinner}
        onSave={handleSaveWinnerRecord}
      />

      {/* ========================================================================= */}
      {/* MODAL: RESET CONFIRMATION */}
      {/* ========================================================================= */}
      <GusResetConfirmModal
        isOpen={showResetConfirmModal}
        onClose={() => setShowResetConfirmModal(false)}
        onConfirm={executeReset}
        seasonTitle={currentSeason?.title}
        activeParticipantsCount={participants.length}
      />

      {/* ========================================================================= */}
      {/* MODAL: CONCLUDE CONFIRMATION */}
      {/* ========================================================================= */}
      <GusConcludeConfirmModal
        isOpen={showConcludeConfirmModal}
        onClose={() => setShowConcludeConfirmModal(false)}
        onConfirm={executeConclude}
        seasonTitle={currentSeason?.title}
        prizePoolGP={competition?.prizePoolGP || currentSeason?.prizePoolGP || 500000}
        survivorsCount={liveState?.activeParticipants || 0}
      />

      {/* ========================================================================= */}
      {/* MODAL: IN-APP CONFIRM DIALOG */}
      {/* ========================================================================= */}
      {confirmDialog && (
        <GusConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog(null)}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          confirmVariant={confirmDialog.confirmVariant}
        />
      )}
    </div>
  );
};
