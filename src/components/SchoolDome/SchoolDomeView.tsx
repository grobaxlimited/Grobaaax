import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { useApp, checkIsUserSubscribed } from '../../context/AppContext';
import {
  SchoolDomeMessage,
  SchoolDomeSeason,
  SchoolDomeQuestion,
  PRIMARY_SUPER_ADMIN_UID,
} from '../../types';
import { SchoolDomeMessageItem } from './SchoolDomeMessageItem';
import { SchoolDomeRulesModal } from './SchoolDomeRulesModal';
import { SchoolDomeContendersModal } from './SchoolDomeContendersModal';
import { ChatroomComposer } from '../Community/ChatroomLive/ChatroomComposer';
import { CreateSchoolDomeQuestionModal } from './CreateSchoolDomeQuestionModal';
import { SchoolDomeResultsTab } from './SchoolDomeResultsTab';
import {
  subscribeSchoolDomeActiveSeason,
  subscribeSchoolDomeActiveQuestion,
  subscribeSchoolDomeQuestions,
  subscribeSchoolDomeMessages,
  sendSchoolDomeMessage,
  reactSchoolDomeMessage,
  deleteSchoolDomeMessage,
  registerUserForSchoolDome,
  checkScholarSchoolDomePlanEligibility,
  closeSchoolDomeQuestion,
  extendSchoolDomeQuestionTime,
  isAnswerCorrect,
  DEFAULT_INITIAL_MESSAGES,
} from '../../lib/schoolDomeService';
import {
  getTodayLocalDateString,
  getSynchronousDailyChatUsage,
  getUserDailyChatUsage,
  recordUserDailyChatResponse,
  isSubscriptionExpired,
} from '../../lib/firebase';
import {
  MessageSquare,
  Search,
  Volume2,
  VolumeX,
  ArrowDown,
  ChevronUp,
  ChevronDown,
  Radio,
  Sparkles,
  Shield,
  ArrowUpRight,
  Crown,
  Trophy,
  Swords,
  CheckCircle2,
  Eye,
  AlertCircle,
  UserCheck,
  ScrollText,
  Users,
  UserX,
} from 'lucide-react';

// Web Audio API synthesizer for message chimes
function playAudioTone() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, ctx.currentTime);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch {
    // Suppressed audio error
  }
}

interface SchoolDomeViewProps {
  initialTab?: 'arena' | 'results';
}

export const SchoolDomeView: React.FC<SchoolDomeViewProps> = ({ initialTab = 'arena' }) => {
  const {
    currentUser,
    firebaseUser,
    role,
    isUserSubscribed,
    setWalletModalTab,
    setIsWalletModalOpen,
    openWalletModal,
  } = useApp();

  const [currentSeason, setCurrentSeason] = useState<SchoolDomeSeason | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<SchoolDomeQuestion | null>(null);
  const [messages, setMessages] = useState<SchoolDomeMessage[]>(() => {
    try {
      const cached = localStorage.getItem('grobax_school_dome_cached_messages');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_INITIAL_MESSAGES;
  });
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'arena' | 'results'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Subscriptions to Season, Active Question, and Messages
  useEffect(() => {
    const unsubSeason = subscribeSchoolDomeActiveSeason((season) => {
      setCurrentSeason(season);
    });

    const handleSeasonUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setCurrentSeason(prev => (prev ? { ...prev, ...detail } : detail));
      }
    };
    window.addEventListener('school_dome_season_updated', handleSeasonUpdated);

    const handleMessageReacted = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.messageId && detail.emoji) {
        setMessages(prev =>
          prev.map(m => {
            if (m.id !== detail.messageId) return m;
            const reactions = { ...(m.reactions || {}) };
            reactions[detail.emoji] = (Number(reactions[detail.emoji]) || 0) + 1;
            return { ...m, reactions };
          })
        );
      }
    };
    window.addEventListener('school_dome_message_reacted', handleMessageReacted);

    return () => {
      unsubSeason();
      window.removeEventListener('school_dome_season_updated', handleSeasonUpdated);
      window.removeEventListener('school_dome_message_reacted', handleMessageReacted);
    };
  }, []);

  // Subscribe to live messages immediately so chats are visible right away
  useEffect(() => {
    const seasonId = currentSeason?.id || 'season_dome_1';
    const unsubMsg = subscribeSchoolDomeMessages(seasonId, (msgs) => {
      setMessages(prev => {
        // Merge with optimistic reaction state to prevent jitter during multi-clicks
        const map = new Map<string, SchoolDomeMessage>();
        msgs.forEach(m => map.set(m.id, m));
        prev.forEach(p => {
          if (map.has(p.id)) {
            const existing = map.get(p.id)!;
            const mergedReactions = { ...(existing.reactions || {}) };
            if (p.reactions) {
              for (const [em, cnt] of Object.entries(p.reactions)) {
                mergedReactions[em] = Math.max(Number(mergedReactions[em]) || 0, Number(cnt) || 0);
              }
            }
            map.set(p.id, { ...existing, reactions: mergedReactions });
          }
        });
        const combined = Array.from(map.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        try {
          localStorage.setItem('grobax_school_dome_cached_messages', JSON.stringify(combined));
        } catch {}
        return combined;
      });
    });
    return () => unsubMsg();
  }, [currentSeason?.id]);

  const [seasonQuestions, setSeasonQuestions] = useState<SchoolDomeQuestion[]>([]);

  useEffect(() => {
    if (!currentSeason?.id) return;
    const unsubQ = subscribeSchoolDomeActiveQuestion(currentSeason.id, (q) => {
      setActiveQuestion(q);
    });
    return () => unsubQ();
  }, [currentSeason?.id]);

  useEffect(() => {
    if (!currentSeason?.id) return;
    const unsubAllQ = subscribeSchoolDomeQuestions(currentSeason.id, (list) => {
      setSeasonQuestions(list);
    });
    return () => unsubAllQ();
  }, [currentSeason?.id]);

  // Grobaax central subscription source of truth
  const membership = (currentUser?.membershipTier || '').toLowerCase();
  const subTier = (currentUser?.subscriptionTier || '').toLowerCase();
  const plan = (
    ((currentUser as any)?.subscriptionPlan ||
      (currentUser as any)?.planId ||
      (currentUser as any)?.tier ||
      (currentUser as any)?.activePlanId) + ''
  ).toLowerCase();

  const isStaffOrAdmin =
    role === 'admin' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'community_manager' ||
    Boolean((currentUser as any)?.managerRole) ||
    firebaseUser?.uid === PRIMARY_SUPER_ADMIN_UID ||
    firebaseUser?.email === 'grobaxycompany@gmail.com' ||
    currentUser?.email === 'grobaxycompany@gmail.com' ||
    currentUser?.name?.toLowerCase().includes('admin') ||
    currentUser?.name?.toLowerCase().includes('staff');

  // Auto-close active question when countdown timer expires so non-responders are automatically eliminated
  const closingQuestionRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeQuestion || activeQuestion.status !== 'active') return;
    if (closingQuestionRef.current === activeQuestion.id) return;
    const diff = activeQuestion.endAt - Date.now();
    if (diff <= 0) {
      closingQuestionRef.current = activeQuestion.id;
      closeSchoolDomeQuestion(currentSeason?.id || 'season_dome_1', activeQuestion.id).catch(() => {});
      return;
    }
    const timer = setTimeout(() => {
      closingQuestionRef.current = activeQuestion.id;
      closeSchoolDomeQuestion(currentSeason?.id || 'season_dome_1', activeQuestion.id).catch(() => {});
    }, Math.max(100, diff));
    return () => clearTimeout(timer);
  }, [activeQuestion?.id, activeQuestion?.status, activeQuestion?.endAt, currentSeason?.id]);

  const isActivelySubscribed = isUserSubscribed || checkIsUserSubscribed(currentUser);
  const isUserExpired = !isStaffOrAdmin && isSubscriptionExpired(currentUser);

  const isVIP =
    !isStaffOrAdmin &&
    !isUserExpired &&
    Boolean(
      currentUser?.isVip ||
      currentUser?.gusTier === 'Titan' ||
      membership.includes('vip') ||
      membership.includes('titan') ||
      subTier.includes('vip') ||
      subTier.includes('titan') ||
      plan.includes('vip') ||
      plan.includes('titan') ||
      plan.includes('annual')
    );

  const isPremium =
    !isStaffOrAdmin &&
    !isUserExpired &&
    !isVIP &&
    Boolean(
      isActivelySubscribed ||
      currentUser?.isPremium ||
      (membership && !membership.includes('free') && membership.trim().length > 0) ||
      (subTier && !subTier.includes('free') && subTier.trim().length > 0) ||
      (plan && !plan.includes('free') && plan.trim().length > 0)
    );

  const tierName: 'free' | 'premium' | 'vip' | 'admin' = isStaffOrAdmin
    ? 'admin'
    : isVIP
    ? 'vip'
    : isPremium
    ? 'premium'
    : 'free';

  // Daily Limits: Free (2), Premium (15), VIP (20), Admin/Manager (Unlimited)
  const maxDailyLimit = isStaffOrAdmin ? Infinity : isVIP ? 20 : isPremium ? 15 : 2;

  // Consistent daily date basis (YYYY-MM-DD in local time)
  const todayDate = useMemo(() => getTodayLocalDateString(), []);
  const activeUserId = currentUser?.id || currentUser?.uid || firebaseUser?.uid || 'guest';

  // Daily response count (Only increments on successful submission)
  const [dailyResponseCount, setDailyResponseCount] = useState<number>(() => {
    try {
      const syncVal = getSynchronousDailyChatUsage(activeUserId, todayDate);
      if (currentUser?.dailyQaUsage && currentUser.dailyQaUsage.date === todayDate) {
        return Math.max(syncVal, currentUser.dailyQaUsage.count || 0);
      }
      return syncVal;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    if (activeUserId && activeUserId !== 'guest') {
      const syncVal = getSynchronousDailyChatUsage(activeUserId, todayDate);
      let latestCount = syncVal;
      if (currentUser?.dailyQaUsage) {
        if (currentUser.dailyQaUsage.date === todayDate) {
          latestCount = Math.max(syncVal, currentUser.dailyQaUsage.count || 0);
        } else {
          latestCount = 0;
        }
      }
      setDailyResponseCount(latestCount);

      let isMounted = true;
      getUserDailyChatUsage(activeUserId, todayDate)
        .then((usage) => {
          if (isMounted) {
            if (usage.date === todayDate) {
              setDailyResponseCount((prev) => Math.max(prev, usage.count));
            } else {
              setDailyResponseCount(0);
            }
          }
        })
        .catch(() => {});

      return () => {
        isMounted = false;
      };
    }
  }, [activeUserId, todayDate, currentUser?.dailyQaUsage?.date, currentUser?.dailyQaUsage?.count]);

  const isLimitReached = !isStaffOrAdmin && dailyResponseCount >= maxDailyLimit;

  const [isRegistering, setIsRegistering] = useState(false);

  // Participation & Spectator Status
  const isRegistrationOpen = Boolean(
    currentSeason &&
    !currentSeason.isRegistrationLocked &&
    !currentSeason.firstQuestionLaunched &&
    currentSeason.status !== 'ended'
  );
  const isUserRegistered = Boolean(currentSeason?.registeredUserIds?.includes(currentUser.id));
  const isUserEliminated = Boolean(currentSeason?.eliminatedUserIds?.includes(currentUser.id));
  const isUserStanding = Boolean(currentSeason?.activeUserIds?.includes(currentUser.id));
  const isSpectator = !isStaffOrAdmin && (!isUserRegistered || isUserEliminated || !isUserStanding);

  const handleRegister = async () => {
    if (!currentSeason?.id || isRegistering) return;
    try {
      setIsRegistering(true);
      const res = await registerUserForSchoolDome(currentSeason.id, currentUser);
      if (!res.success) {
        alert(res.message);
      }
    } catch (err: any) {
      console.error('Registration failed:', err);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleOpenUpgrade = () => {
    if (openWalletModal) {
      openWalletModal('upgrade');
    } else if (setWalletModalTab && setIsWalletModalOpen) {
      setWalletModalTab('upgrade');
      setIsWalletModalOpen(true);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<SchoolDomeMessage | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isCreateQuestionModalOpen, setIsCreateQuestionModalOpen] = useState(false);
  const [isContendersModalOpen, setIsContendersModalOpen] = useState(false);

  // Filter messages by search query and completely hide automated Arbiter question conclusion & verification spam
  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      // 1. Hide automated Arbiter question conclusion, answer verification, and elimination notifications
      const isArbiter =
        m.userId === 'grobax_arbiter' ||
        (m.userName && m.userName.toLowerCase().includes('arbiter'));

      if (isArbiter) {
        const text = m.messageText || '';
        // Hide round conclusion messages, official answers, correct announcements, knockouts, and ticket spam
        if (
          text.includes('CONCLUDED!') ||
          text.includes('Official Answer') ||
          text.includes('solved Question #') ||
          text.includes('advances to the next battle') ||
          text.includes('KNOCKED OUT:') ||
          text.includes('has been eliminated') ||
          text.includes('has entered the Arena') ||
          text.includes('winner slots for Question #')
        ) {
          return false;
        }
      }

      // 2. Search query filter
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        m.messageText?.toLowerCase().includes(q) ||
        m.userName?.toLowerCase().includes(q) ||
        m.institution?.toLowerCase().includes(q)
      );
    });
  }, [messages, searchQuery]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasInitialScrolledRef = useRef(false);

  const scrollToBottom = useCallback((smooth = false) => {
    if (scrollContainerRef.current) {
      if (smooth) {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      } else {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    } else if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
    setShowScrollBottom(false);
  }, []);

  // Instant positioning callback ref: directly snaps to the bottom as soon as container mounts
  const setScrollContainerRef = useCallback((node: HTMLDivElement | null) => {
    scrollContainerRef.current = node;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, []);

  // Reset scroll flag when switching between Arena and Champions
  useEffect(() => {
    if (activeTab === 'arena') {
      hasInitialScrolledRef.current = false;
    }
  }, [activeTab]);

  // Direct instant display of last chat on load - no smooth scrolling from top to bottom
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || filteredMessages.length === 0) return;

    if (!hasInitialScrolledRef.current) {
      container.scrollTop = container.scrollHeight;
      hasInitialScrolledRef.current = true;

      const frameId = requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      });
      const timerId = setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      }, 50);

      return () => {
        cancelAnimationFrame(frameId);
        clearTimeout(timerId);
      };
    } else if (!showScrollBottom) {
      // Keep pinned to latest chat without scrolling from the top
      container.scrollTop = container.scrollHeight;
    }
  }, [filteredMessages.length, showScrollBottom, activeTab]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
    setShowScrollBottom(!isNearBottom);
  };

  const hasUserRepliedToQuestionMessage = (msg: SchoolDomeMessage): boolean => {
    if (msg.type !== 'question') return false;
    const qId = msg.competitionRef?.questionId || msg.id.replace(/^dome_msg_q_/, '').replace(/^sdq_/, '');
    const normName = (currentUser?.name || '').toLowerCase().trim();

    if (msg.competitionRef?.repliedUserIds?.includes(currentUser.id)) return true;
    if (normName && (msg.competitionRef as any)?.repliedUsernames?.includes(normName)) return true;
    if (msg.competitionRef?.selectedWinners?.some((w) => w.userId === currentUser.id)) return true;

    const hasUserRepliedInChat = messages.some(
      (m) =>
        m.userId === currentUser.id &&
        (m.replyTo?.id === msg.id || (qId && m.replyTo?.id === qId) || (qId && m.replyTo?.id === `dome_msg_q_${qId}`))
    );
    if (hasUserRepliedInChat) return true;

    return false;
  };

  const hasRepliedToTarget = useMemo(() => {
    if (!replyTarget || replyTarget.type !== 'question') return false;
    return hasUserRepliedToQuestionMessage(replyTarget);
  }, [replyTarget, messages, currentUser.id, currentUser?.name]);

  // Subscription plan eligibility for the active question
  const questionPlanEligibility = useMemo(() => {
    return checkScholarSchoolDomePlanEligibility(currentUser, activeQuestion);
  }, [currentUser, activeQuestion]);

  // Subscription plan eligibility for the current reply target
  const replyTargetPlanEligibility = useMemo(() => {
    if (!replyTarget || replyTarget.type !== 'question') {
      return { isEligible: true, userPlanName: '', requiredPlanText: '' };
    }
    const targetQId =
      replyTarget.competitionRef?.questionId ||
      replyTarget.id.replace(/^dome_msg_q_/, '').replace(/^msg_sdq_/, '');
    const qObj = activeQuestion?.id === targetQId ? activeQuestion : activeQuestion;
    return checkScholarSchoolDomePlanEligibility(currentUser, qObj);
  }, [replyTarget, activeQuestion, currentUser]);

  const handleSendMessage = async (text: string, replyTo?: SchoolDomeMessage['replyTo']) => {
    // Whenever admin clicks End Season, typing is strictly unavailable for regular users; admin remains open
    if (currentSeason?.status === 'ended' && !isStaffOrAdmin) {
      return;
    }

    // Non-registered or eliminated users can spectate but cannot type/participate
    if (!isStaffOrAdmin && isSpectator) {
      return;
    }

    // Prevent replying twice to a question challenge
    if (replyTo?.id) {
      const isTargetingQuestion =
        replyTo.id.startsWith('dome_msg_q_') ||
        replyTo.id.startsWith('msg_sdq_') ||
        messages.some((m) => m.id === replyTo.id && m.type === 'question');

      if (isTargetingQuestion) {
        if (!replyTargetPlanEligibility.isEligible && !isStaffOrAdmin) {
          alert(
            `Your subscription plan (${replyTargetPlanEligibility.userPlanName}) is not eligible to answer this question. Required: ${replyTargetPlanEligibility.requiredPlanText}. Your tournament standing is safe.`
          );
          return;
        }

        const targetQMsg = messages.find(
          (m) =>
            m.id === replyTo.id ||
            (m.competitionRef?.questionId &&
              (`dome_msg_q_${m.competitionRef.questionId}` === replyTo.id ||
                `msg_sdq_${m.competitionRef.questionId}` === replyTo.id))
        );
        if (targetQMsg && hasUserRepliedToQuestionMessage(targetQMsg)) {
          return;
        }
      }
    }

    const resolvedUserPlan = checkScholarSchoolDomePlanEligibility(currentUser, null);

    const newMessage: SchoolDomeMessage = {
      id: 'sdm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      seasonId: currentSeason?.id || 'season_dome_1',
      userId: currentUser.id,
      userName: isStaffOrAdmin && !currentUser.name.includes('Support')
        ? `${currentUser.name} 💎 | Moderator`
        : currentUser.name,
      userAvatar:
        currentUser.avatar ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      institution: currentUser.institution || 'Grobaax Scholar',
      department: currentUser.department,
      level: currentUser.level,
      isPremium: isVIP || isPremium || isStaffOrAdmin,
      isVip: isVIP,
      membershipTier: isVIP
        ? 'VIP SCHOLAR'
        : isPremium
        ? 'PREMIUM SCHOLAR'
        : isStaffOrAdmin
        ? 'VIP SCHOLAR'
        : 'FREE SCHOLAR',
      subscriptionTier: isUserExpired ? 'free' : (currentUser.subscriptionTier || (isVIP ? 'vip' : isPremium ? 'premium' : 'free')),
      subscriptionPlan: isUserExpired ? 'Free Scholar' : (currentUser.subscriptionPlan || resolvedUserPlan.userPlanName),
      planId: isUserExpired ? '' : (currentUser.activePlanId || (currentUser as any).planId || resolvedUserPlan.userPlanId),
      equippedBadge: currentUser.equippedBadge,
      messageText: text,
      timestamp: Date.now(),
      type: 'normal',
      replyTo,
      reactions: {},
    };

    // If answering active question in standing, stamp marking sign fields immediately
    if (activeQuestion && activeQuestion.status === 'active') {
      const isRegistered = currentSeason?.registeredUserIds?.includes(currentUser.id);
      const isStanding = currentSeason?.activeUserIds?.includes(currentUser.id);
      if (isRegistered && isStanding) {
        const isCorr = isAnswerCorrect(
          text,
          activeQuestion.correctAnswer,
          activeQuestion.acceptedAlternativeAnswers
        );
        newMessage.isAnswer = true;
        newMessage.isCorrect = isCorr;
        newMessage.evalStatus = isCorr ? 'correct' : 'wrong';
        newMessage.questionId = activeQuestion.id;
        newMessage.questionNumber = activeQuestion.questionNumber;
      }
    }

    // Optimistic message append so chat appears immediately like WhatsApp without refreshing
    setMessages(prev => {
      const exists = prev.some(m => m.id === newMessage.id);
      if (exists) return prev;
      const updated = [...prev, newMessage];
      try {
        localStorage.setItem('grobax_school_dome_cached_messages', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await sendSchoolDomeMessage(newMessage, currentSeason, activeQuestion, currentUser);
    } catch (err) {
      console.warn('School Dome message sync notice:', err);
    }

    if (soundEnabled) {
      playAudioTone();
    }
  };

  const handleReactMessage = async (msgId: string, emoji: string) => {
    // Instant optimistic update for 0ms latency feedback
    setMessages(prev => {
      const updated = prev.map(m => {
        if (m.id !== msgId) return m;
        const reactions = { ...(m.reactions || {}) };
        reactions[emoji] = (Number(reactions[emoji]) || 0) + 1;
        return { ...m, reactions };
      });
      try {
        localStorage.setItem('grobax_school_dome_cached_messages', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await reactSchoolDomeMessage(msgId, emoji);
    } catch (err) {
      console.warn('React message notice:', err);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      await deleteSchoolDomeMessage(msgId);
    } catch (err) {
      console.warn('Delete message notice:', err);
    }
  };

  const handleMuteUser = (_userId: string, userName: string) => {
    console.info(`User ${userName} muted locally.`);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-70px)] sm:h-[calc(100dvh-80px)] min-h-[500px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* 1. DISCORD-STYLE CHANNEL HEADER */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
        {/* Left: Channel indicator & Live Status */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-100 font-extrabold text-sm sm:text-base">
            <span className="text-blue-500 dark:text-blue-400 font-black text-base sm:text-lg">#</span>
            <span className="text-sm">💬</span>
            <span className="truncate tracking-tight">school-dome</span>
          </div>

          {/* Arena vs Results View Mode Toggle */}
          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80">
            <button
              type="button"
              onClick={() => setActiveTab('arena')}
              className={`p-1.5 rounded-lg transition cursor-pointer flex items-center justify-center ${
                activeTab === 'arena'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Arena"
              aria-label="Arena"
            >
              <Radio className={`w-3.5 h-3.5 ${activeTab === 'arena' ? 'animate-pulse text-emerald-500' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('results')}
              className={`p-1.5 rounded-lg transition cursor-pointer flex items-center justify-center ${
                activeTab === 'results'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Champions"
              aria-label="Champions"
            >
              <Trophy className={`w-3.5 h-3.5 ${activeTab === 'results' ? 'text-amber-500' : ''}`} />
            </button>
          </div>

          {/* Live Contenders Count & Elimination Status Icon */}
          {currentSeason && (
            <div className="shrink-0">
              <button
                type="button"
                id="btn-open-contenders-breakdown"
                onClick={() => setIsContendersModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 dark:from-blue-950/40 dark:to-indigo-950/40 dark:hover:from-blue-900/60 dark:hover:to-indigo-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/90 dark:border-blue-800/80 rounded-xl shadow-xs transition cursor-pointer shrink-0"
                title={`View Registered (${currentSeason.registeredUserIds?.length || 0}), Standing (${currentSeason.activeUserIds?.length ?? 0}), and Knockout (${currentSeason.eliminatedUserIds?.length || 0}) Members`}
                aria-label="View Contenders Breakdown"
              >
                <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <div className="flex items-baseline gap-0.5 font-black text-xs tabular-nums text-slate-900 dark:text-white">
                  <span>
                    {currentSeason.firstQuestionLaunched || (currentSeason.eliminatedUserIds && currentSeason.eliminatedUserIds.length > 0)
                      ? (currentSeason.activeUserIds?.length ?? 0)
                      : (currentSeason.registeredUserIds?.length ?? 0)}
                  </span>
                  {(currentSeason.firstQuestionLaunched || (currentSeason.eliminatedUserIds && currentSeason.eliminatedUserIds.length > 0)) && (
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                      /{currentSeason.registeredUserIds?.length ?? 0}
                    </span>
                  )}
                </div>
                <span className="hidden sm:inline text-[10px] font-extrabold uppercase tracking-wider text-blue-600/80 dark:text-blue-400/80">
                  {currentSeason.firstQuestionLaunched || (currentSeason.eliminatedUserIds && currentSeason.eliminatedUserIds.length > 0)
                    ? 'Standing'
                    : 'Registered'}
                </span>
                {currentSeason.activeUserIds && currentSeason.activeUserIds.length > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                )}
              </button>
            </div>
          )}

          {/* Season Statistics Badge (Desktop wide) */}
          {currentSeason && (
            <div className="hidden xl:flex items-center gap-2 px-3 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              <span>Season #{currentSeason.seasonNumber || 1}</span>
              <span>•</span>
              <span className="text-amber-600 dark:text-amber-400">
                {currentSeason.prizePool?.toLocaleString()} {currentSeason.prizeCurrency || 'GP'} Pool
              </span>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Rules Button (Visible on the top of the school dome card) */}
          <button
            type="button"
            onClick={() => setIsRulesModalOpen(true)}
            className="p-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60 rounded-xl shadow-xs transition flex items-center justify-center cursor-pointer shrink-0"
            title="View School Dome Arena Rules"
            aria-label="Rules"
          >
            <ScrollText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          </button>

          {/* Admin Launch Live Question Button */}
          {isStaffOrAdmin && (
            <button
              onClick={() => setIsCreateQuestionModalOpen(true)}
              className="px-2.5 py-1 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer border border-amber-300 shrink-0"
              title="Launch Live Q&A Question Challenge"
            >
              <span className="w-4 h-4 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center font-black text-[10px]">
                Q
              </span>
              <span className="hidden sm:inline">Ask Question</span>
            </button>
          )}

          {/* Search Toggle */}
          {isSearchOpen ? (
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                autoFocus
                className="w-36 sm:w-52 pl-3 pr-7 py-1 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-blue-500"
              />
              <button
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Search chat"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Registration & Survival Status Banner */}
      {currentSeason && (
        <div
          onClick={() => setIsContendersModalOpen(true)}
          className="px-3 sm:px-4 py-2 bg-transparent hover:bg-slate-50/50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-100 border-b border-slate-200/70 dark:border-slate-800/80 shrink-0 flex items-center justify-between gap-3 flex-wrap cursor-pointer transition"
          title="Click to view full Contenders Breakdown (Registered, Standing, and Knockout members)"
        >
          <div className="flex items-center gap-2 text-xs min-w-0">
            {currentSeason.status === 'ended' ? (
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold">
                <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Season #{currentSeason.seasonNumber} Concluded! Prizes have been awarded. Awaiting the Arbiter to start the next season.</span>
              </div>
            ) : isRegistrationOpen ? (
              isUserRegistered ? (
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>You are Registered for Season #{currentSeason.seasonNumber}! Question #1 locks registration.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold">
                  <Swords className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Season #{currentSeason.seasonNumber} Registration is OPEN! Register before Question #1 launches.</span>
                </div>
              )
            ) : isUserEliminated ? (
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-medium">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>You were eliminated from Season #{currentSeason.seasonNumber}. Spectator Mode active (watching live).</span>
              </div>
            ) : isUserStanding ? (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Active Contender • {currentSeason.activeUserIds?.length || 0} scholars standing for {currentSeason.prizePool.toLocaleString()} {currentSeason.prizeCurrency || 'GP'}!</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
                <Eye className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Registration closed upon Question #1 launch. Spectator Mode active (watching live).</span>
              </div>
            )}
          </div>

          {/* Register Button if open and user not yet registered */}
          {isRegistrationOpen && !isUserRegistered && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={isRegistering}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRegister();
                }}
                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5 shrink-0 hover:scale-105 active:scale-95"
              >
                <UserCheck className="w-4 h-4" />
                <span>{isRegistering ? 'Registering...' : 'Register to Compete'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* CONTENT: EITHER CHAMPIONS RESULTS BOARD OR LIVE ARENA */}
      {activeTab === 'results' ? (
        <SchoolDomeResultsTab currentSeason={currentSeason} />
      ) : (
        <>
          {/* 2. MAIN MESSAGE STREAM */}
          <div
            ref={setScrollContainerRef}
            onScroll={handleScroll}
            style={{ scrollBehavior: 'auto' }}
            className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/40"
          >
            {filteredMessages.map((msg) => (
              <SchoolDomeMessageItem
                key={msg.id}
                message={msg}
                currentUserId={currentUser.id}
                isManagerOrAdmin={isStaffOrAdmin}
                hasRepliedToQuestion={hasUserRepliedToQuestionMessage(msg)}
                isSpectator={isSpectator}
                activeQuestion={activeQuestion}
                questions={seasonQuestions}
                onReply={(m) => setReplyTarget(m)}
                onDelete={handleDeleteMessage}
                onMuteUser={handleMuteUser}
                onReact={handleReactMessage}
                onCloseQuestion={isStaffOrAdmin ? (qId) => closeSchoolDomeQuestion(currentSeason?.id || 'season_dome_1', qId) : undefined}
                onExtendTime={isStaffOrAdmin ? (qId, extra) => extendSchoolDomeQuestionTime(qId, extra) : undefined}
              />
            ))}

            <div ref={messagesEndRef} />
          </div>

      {/* Floating Scroll To Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom()}
          className="absolute bottom-20 right-6 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-500 transition-all cursor-pointer z-20 flex items-center gap-1.5 text-xs font-bold"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span>Latest</span>
        </button>
      )}

          {/* 3. DISCORD BOTTOM COMPOSER OR SPECTATOR BAR OR SEASON ENDED (TYPING UNAVAILABLE STRICTLY FOR REGULAR USERS) */}
          {currentSeason?.status === 'ended' && !isStaffOrAdmin ? (
            <div className="p-3.5 sm:p-4 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                      Season #{currentSeason?.seasonNumber || 1} Has Concluded
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                      Typing Unavailable
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    The competition has ended. All prizes have been distributed equally to the surviving champions.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsRulesModalOpen(true)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  View Rules
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('results')}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Champions Board</span>
                </button>
              </div>
            </div>
          ) : isSpectator ? (
            <div className="p-3.5 bg-slate-100 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Eye className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="truncate">
                  {isUserEliminated
                    ? `You have been eliminated from Season #${currentSeason?.seasonNumber || 1}. You can watch all questions and answers in real-time, but cannot participate.`
                    : `Registration for Season #${currentSeason?.seasonNumber || 1} closed when Question #1 launched. Spectators can watch all questions and answers in real-time.`}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 font-black text-[11px] border border-amber-500/30 shrink-0 uppercase tracking-wider">
                Spectator Mode
              </span>
            </div>
          ) : (
            <div className="flex flex-col shrink-0">
              {currentSeason?.status === 'ended' && isStaffOrAdmin && (
                <div className="px-3.5 py-2 bg-amber-500/10 dark:bg-amber-950/40 border-t border-amber-500/30 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 min-w-0">
                    <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="font-bold truncate">
                      Season #{currentSeason.seasonNumber || 1} Concluded • Admin Channel Open
                    </span>
                    <span className="hidden md:inline text-[11px] text-slate-600 dark:text-slate-300 truncate">
                      (Typing is locked for regular participants, but open for administrators)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveTab('results')}
                      className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      View Champions
                    </button>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                      Admin Mode
                    </span>
                  </div>
                </div>
              )}
              <ChatroomComposer
                onSendMessage={handleSendMessage}
                replyToMessage={replyTarget as any}
                onCancelReply={() => setReplyTarget(null)}
                isChatMuted={false}
                channelName="school-dome"
                dailyLimit={9999}
                usedCount={0}
                isLimitReached={false}
                tierName={tierName}
                isManagerOrAdmin={isStaffOrAdmin}
                hasRepliedToTarget={hasRepliedToTarget}
                isQuestionPlanIneligible={Boolean(
                  !isStaffOrAdmin &&
                    replyTarget?.type === 'question' &&
                    !replyTargetPlanEligibility.isEligible
                )}
                questionPlanIneligibleReason={(replyTargetPlanEligibility as any).reason}
                onOpenUpgrade={handleOpenUpgrade}
                onOpenCreateQuestion={() => setIsCreateQuestionModalOpen(true)}
              />
            </div>
          )}
        </>
      )}

      {/* Admin Live Question Launcher Modal */}
      {isCreateQuestionModalOpen && (
        <CreateSchoolDomeQuestionModal
          isOpen={isCreateQuestionModalOpen}
          onClose={() => setIsCreateQuestionModalOpen(false)}
          season={currentSeason}
          adminUid={currentUser.id}
          adminName={currentUser.name}
          defaultWinnerCount={1}
          defaultGpReward={500}
          onQuestionCreated={(createdQ) => {
            setActiveQuestion(createdQ);
            setSeasonQuestions((prev) => {
              const filtered = prev.filter((q) => q.id !== createdQ.id);
              return [...filtered, createdQ].sort((a, b) => a.questionNumber - b.questionNumber);
            });
            setCurrentSeason((prev) =>
              prev
                ? {
                    ...prev,
                    currentQuestionNumber: createdQ.questionNumber,
                    firstQuestionLaunched: true,
                    isRegistrationLocked: true,
                  }
                : prev
            );

            const qMsg: SchoolDomeMessage = {
              id: 'dome_msg_q_' + createdQ.id,
              seasonId: currentSeason?.id || 'season_dome_1',
              userId: currentUser.id || PRIMARY_SUPER_ADMIN_UID,
              userName: `${currentUser.name} 🛡️ (Arbiter)`,
              userAvatar:
                currentUser.avatar ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
              institution: currentUser.institution || 'Grobaax High Arbiter Command',
              isPremium: true,
              isVip: true,
              messageText: `⚡ ELIMINATION QUESTION #${createdQ.questionNumber}: ${createdQ.questionText}\n\n⏱️ Time Limit: ${Math.round(
                createdQ.timeLimitSeconds / 60
              )} min. Answer correctly to survive!`,
              timestamp: Date.now(),
              type: 'question',
              questionId: createdQ.id,
              questionNumber: createdQ.questionNumber,
              competitionRef: {
                competitionId: 'school_dome',
                questionId: createdQ.id,
                questionNumber: createdQ.questionNumber,
                totalQuestions: 100,
                questionText: createdQ.questionText,
                status: 'active',
                gpRewardPerWinner: 0,
                winnerCountLimit: 1,
                allowFreeParticipation: true,
                timeLimitSeconds: createdQ.timeLimitSeconds,
                startAt: createdQ.startAt,
                endAt: createdQ.endAt,
              },
            };

            setMessages((prev) => {
              const exists = prev.some((m) => m.id === qMsg.id);
              return exists ? prev : [...prev, qMsg];
            });

            setIsCreateQuestionModalOpen(false);
          }}
        />
      )}

      {/* Rules Popup Card */}
      <SchoolDomeRulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        season={currentSeason}
      />

      {/* Contenders Breakdown Pop-up Modal for all phone screens */}
      <SchoolDomeContendersModal
        isOpen={isContendersModalOpen}
        onClose={() => setIsContendersModalOpen(false)}
        season={currentSeason}
        currentUser={currentUser}
        isUserRegistered={isUserRegistered}
        isUserStanding={isUserStanding}
        isUserEliminated={isUserEliminated}
        isRegistrationOpen={isRegistrationOpen}
        isRegistering={isRegistering}
        onRegister={handleRegister}
      />
    </div>
  );
};
