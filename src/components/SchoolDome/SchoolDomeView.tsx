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
import { SchoolDomeComposer } from './SchoolDomeComposer';
import { SchoolDomeRegistrationModal } from './SchoolDomeRegistrationModal';
import { SchoolDomeQuestionCard } from './SchoolDomeQuestionCard';
import { CreateSchoolDomeQuestionModal } from './CreateSchoolDomeQuestionModal';
import { SchoolDomeResultsTab } from './SchoolDomeResultsTab';
import { WhatsAppChatBackground } from '../common/WhatsAppChatBackground';
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
  pauseSchoolDomeSeason,
  resumeSchoolDomeSeason,
  isAnswerCorrect,
  getCanonicalQuestionId,
  DEFAULT_INITIAL_SEASON,
  DEFAULT_INITIAL_QUESTION,
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
  Pause,
  Play,
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

  const [currentSeason, setCurrentSeason] = useState<SchoolDomeSeason | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('grobax_school_dome_active_season');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed) return parsed;
        }
      }
    } catch {}
    return DEFAULT_INITIAL_SEASON;
  });
  const [activeQuestion, setActiveQuestion] = useState<SchoolDomeQuestion | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('grobax_school_dome_active_question');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.status === 'active') return parsed;
        }
      }
    } catch {}
    return DEFAULT_INITIAL_QUESTION?.status === 'active' ? DEFAULT_INITIAL_QUESTION : null;
  });
  const [messages, setMessages] = useState<SchoolDomeMessage[]>(() => {
    try {
      const cached = localStorage.getItem('grobax_school_dome_cached_messages');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m: SchoolDomeMessage) => {
            if (m.id === 'dome_msg_q_13' && m.competitionRef && m.competitionRef.status === 'closed' && DEFAULT_INITIAL_QUESTION?.status === 'active') {
              return {
                ...m,
                competitionRef: {
                  ...m.competitionRef,
                  status: 'active',
                  endAt: DEFAULT_INITIAL_QUESTION.endAt,
                },
              };
            }
            return m;
          });
        }
      }
    } catch {}
    return DEFAULT_INITIAL_MESSAGES;
  });
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
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
        setCurrentSeason(detail);
        if (detail.seasonNumber === 1 && !detail.firstQuestionLaunched && (detail.totalQuestionsLaunched || 0) === 0) {
          setActiveQuestion(null);
          setSeasonQuestions([]);
        }
      }
    };
    window.addEventListener('school_dome_season_updated', handleSeasonUpdated);

    const handleSeasonReset = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setCurrentSeason(detail);
        setActiveQuestion(null);
        setSeasonQuestions([]);
        setReplyTarget(null);
      }
    };
    window.addEventListener('school_dome_season_reset', handleSeasonReset);

    const handleMessagesReset = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (Array.isArray(detail)) {
        setMessages(detail);
      }
    };
    window.addEventListener('school_dome_messages_reset', handleMessagesReset);

    const handleActiveQuestionUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setActiveQuestion(detail || null);
    };
    window.addEventListener('school_dome_active_question_updated', handleActiveQuestionUpdated);

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

    const handleMessagePosted = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.id) {
        setMessages(prev => {
          const exists = prev.some(m => m.id === detail.id);
          return exists ? prev : [...prev, detail];
        });
      }
    };
    window.addEventListener('school_dome_message_posted', handleMessagePosted);

    const handleQuestionLaunched = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.question) {
        setActiveQuestion(detail.question);
        setSeasonQuestions(prev => {
          const filtered = prev.filter(q => q.id !== detail.question.id);
          return [...filtered, detail.question].sort((a, b) => a.questionNumber - b.questionNumber);
        });
        if (detail.message) {
          setMessages(prev => {
            const exists = prev.some(m => m.id === detail.message.id);
            return exists ? prev : [...prev, detail.message];
          });
        }
      }
    };
    window.addEventListener('school_dome_question_launched', handleQuestionLaunched);

    return () => {
      unsubSeason();
      window.removeEventListener('school_dome_season_updated', handleSeasonUpdated);
      window.removeEventListener('school_dome_season_reset', handleSeasonReset);
      window.removeEventListener('school_dome_messages_reset', handleMessagesReset);
      window.removeEventListener('school_dome_active_question_updated', handleActiveQuestionUpdated);
      window.removeEventListener('school_dome_message_reacted', handleMessageReacted);
      window.removeEventListener('school_dome_message_posted', handleMessagePosted);
      window.removeEventListener('school_dome_question_launched', handleQuestionLaunched);
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
          if (!map.has(p.id)) {
            // CRITICAL: Preserve recent optimistic in-flight messages so they never disappear when Firestore snapshot arrives!
            if ((Date.now() - (p.timestamp || 0)) < 45000 && !p.isDeleted) {
              map.set(p.id, p);
            }
          } else {
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

  const [seasonQuestions, setSeasonQuestions] = useState<SchoolDomeQuestion[]>(() => {
    return DEFAULT_INITIAL_QUESTION ? [DEFAULT_INITIAL_QUESTION] : [];
  });

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
    Boolean(currentUser?.name && currentUser.name.toLowerCase().includes('admin')) ||
    Boolean(currentUser?.name && currentUser.name.toLowerCase().includes('staff'));

  // Real-time ticking sensor to instantly remove the pinned question card when its time expires
  const [nowTick, setNowTick] = useState<number>(Date.now());
  useEffect(() => {
    if (!activeQuestion || activeQuestion.status !== 'active') return;
    const interval = setInterval(() => {
      const now = Date.now();
      setNowTick(now);
      if (activeQuestion && activeQuestion.status === 'active' && activeQuestion.endAt && activeQuestion.endAt <= now) {
        setActiveQuestion((prev) => (prev && prev.id === activeQuestion.id ? { ...prev, status: 'closed' } : prev));
        closeSchoolDomeQuestion(currentSeason?.id || 'season_dome_1', activeQuestion.id).catch(() => {});
      }
    }, 500);
    return () => clearInterval(interval);
  }, [activeQuestion?.id, activeQuestion?.status, activeQuestion?.endAt, currentSeason?.id]);

  // Auto-close active question when countdown timer expires so non-responders are automatically eliminated
  const closingQuestionRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeQuestion || activeQuestion.status !== 'active') return;
    if (closingQuestionRef.current === activeQuestion.id) return;
    const diff = activeQuestion.endAt - Date.now();

    // If question was already in the past, close idempotently without false eliminations
    if (diff <= 0) {
      closingQuestionRef.current = activeQuestion.id;
      setActiveQuestion((prev) => (prev && prev.id === activeQuestion.id ? { ...prev, status: 'closed' } : prev));
      closeSchoolDomeQuestion(currentSeason?.id || 'season_dome_1', activeQuestion.id).catch(() => {});
      return;
    }

    const handleTimeout = () => {
      closingQuestionRef.current = activeQuestion.id;

      // Rule: Users are eliminated by not answering a particular question before the time expired
      const cUid = currentUser?.id || (currentUser as any)?.uid;
      const cAltUid = (currentUser as any)?.uid || currentUser?.id;
      const isStanding = Boolean(
        (cUid && currentSeason?.activeUserIds?.includes(cUid)) ||
        (cAltUid && currentSeason?.activeUserIds?.includes(cAltUid))
      );
      const hasSurvived = Boolean(
        (cUid && activeQuestion.survivorUserIds?.includes(cUid)) ||
        (cAltUid && activeQuestion.survivorUserIds?.includes(cAltUid))
      );

      if (isStanding && !hasSurvived && !isStaffOrAdmin) {
        setCurrentSeason((prev) => {
          if (!prev) return prev;
          const newActive = (prev.activeUserIds || []).filter((id) => id !== cUid && id !== cAltUid);
          const newEliminated = Array.from(new Set([...(prev.eliminatedUserIds || []), cUid]));
          const updated = { ...prev, activeUserIds: newActive, eliminatedUserIds: newEliminated };
          try {
            localStorage.setItem('grobax_school_dome_active_season', JSON.stringify(updated));
          } catch {}
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('school_dome_season_updated', { detail: updated }));
          }
          return updated;
        });
      }

      // Mark activeQuestion closed locally
      setActiveQuestion((prev) => (prev && prev.id === activeQuestion.id ? { ...prev, status: 'closed' } : prev));

      // Close question and record elimination reasons in Firestore
      closeSchoolDomeQuestion(currentSeason?.id || 'season_dome_1', activeQuestion.id).catch(() => {});
    };

    const timer = setTimeout(handleTimeout, Math.max(100, diff));
    return () => clearTimeout(timer);
  }, [
    activeQuestion?.id,
    activeQuestion?.status,
    activeQuestion?.endAt,
    activeQuestion?.survivorUserIds,
    currentSeason?.id,
    currentSeason?.activeUserIds,
    currentUser.id,
    (currentUser as any)?.uid,
    isStaffOrAdmin,
  ]);

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

  // Participation & Spectator Status (Users cannot participate or register any longer after the first question has been launched)
  const isRegistrationOpen = Boolean(
    currentSeason &&
    (currentSeason.status === 'active' || currentSeason.status === 'registration_open') &&
    !currentSeason.isRegistrationLocked &&
    !currentSeason.firstQuestionLaunched &&
    (currentSeason.totalQuestionsLaunched || 0) === 0 &&
    (currentSeason.currentQuestionNumber || 0) === 0 &&
    (!activeQuestion || activeQuestion.status === 'closed' || activeQuestion.seasonId !== currentSeason.id)
  );
  const currentUid = currentUser?.id || (currentUser as any)?.uid || '';
  const currentAltUid = (currentUser as any)?.uid || currentUser?.id || '';

  const isUserRegistered = Boolean(
    (currentUid && currentSeason?.registeredUserIds?.includes(currentUid)) ||
    (currentAltUid && currentSeason?.registeredUserIds?.includes(currentAltUid))
  );
  const isUserEliminated = Boolean(
    (currentUid && currentSeason?.eliminatedUserIds?.includes(currentUid)) ||
    (currentAltUid && currentSeason?.eliminatedUserIds?.includes(currentAltUid))
  );
  // Standing means registered and not eliminated from the season
  const isUserStanding = isUserRegistered && !isUserEliminated;
  const isSpectator = !isStaffOrAdmin && (!isUserRegistered || isUserEliminated);

  const handleRegister = async () => {
    if (!currentSeason?.id || isRegistering) return;
    if (!isRegistrationOpen) {
      alert('Registration is permanently closed. Users cannot participate or register any longer after the first question has been launched.');
      return;
    }
    try {
      setIsRegistering(true);
      const res = await registerUserForSchoolDome(currentSeason.id, currentUser);
      if (res.success) {
        setCurrentSeason((prev) => {
          if (!prev) return prev;
          const reg = Array.from(new Set([...(prev.registeredUserIds || []), currentUid]));
          const act = Array.from(new Set([...(prev.activeUserIds || []), currentUid]));
          const updated = { ...prev, registeredUserIds: reg, activeUserIds: act };
          try {
            localStorage.setItem('grobax_school_dome_active_season', JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent('school_dome_season_updated', { detail: updated }));
          } catch {}
          return updated;
        });
      } else {
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
  const [isTogglingPauseSeason, setIsTogglingPauseSeason] = useState(false);

  const handleTogglePauseSeason = async () => {
    if (!currentSeason || !isStaffOrAdmin || isTogglingPauseSeason) return;
    try {
      setIsTogglingPauseSeason(true);
      if (currentSeason.status === 'paused') {
        await resumeSchoolDomeSeason(currentSeason.id, currentUser.id, currentUser.name);
      } else {
        await pauseSchoolDomeSeason(currentSeason.id, currentUser.id, currentUser.name);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update season status.');
    } finally {
      setIsTogglingPauseSeason(false);
    }
  };

  // Filter messages by search query and completely hide automated Arbiter question conclusion & verification spam
  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      if (!m || typeof m !== 'object') return false;
      // Filter out empty/corrupt messages
      if (!m.messageText && !m.competitionRef && m.type !== 'question') return false;

      // 1. Hide automated Arbiter question conclusion, answer verification, and elimination notifications
      const mUserName = String(m.userName || '').toLowerCase();
      const isArbiter =
        m.userId === 'grobax_arbiter' ||
        mUserName.includes('arbiter');

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
        Boolean(m.messageText && String(m.messageText).toLowerCase().includes(q)) ||
        Boolean(m.userName && String(m.userName).toLowerCase().includes(q)) ||
        Boolean(m.institution && String(m.institution).toLowerCase().includes(q))
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

  const hasUserRepliedToQuestionMessage = useCallback((msg: SchoolDomeMessage): boolean => {
    if (!msg || msg.type !== 'question') return false;

    // Resolve current user ID accurately
    const cUid = currentUser?.id || (currentUser as any)?.uid;
    if (!cUid) return false;
    const cAltUid = (currentUser as any)?.uid || currentUser?.id;

    // Resolve question identifiers
    const canonicalQId = getCanonicalQuestionId(msg);
    const qNumber = msg.competitionRef?.questionNumber || msg.questionNumber;

    // 1. Check if user's UID is in question message's repliedUserIds
    const msgReplied = msg.competitionRef?.repliedUserIds;
    if (Array.isArray(msgReplied) && (msgReplied.includes(cUid) || (cAltUid && msgReplied.includes(cAltUid)))) {
      return true;
    }

    // 2. Check if user's UID is in activeQuestion's repliedUserIds (only for matching question)
    if (activeQuestion && canonicalQId && getCanonicalQuestionId(activeQuestion) === canonicalQId) {
      if (Array.isArray(activeQuestion.repliedUserIds) && (activeQuestion.repliedUserIds.includes(cUid) || (cAltUid && activeQuestion.repliedUserIds.includes(cAltUid)))) {
        return true;
      }
    }

    // 3. Check if user's UID is in seasonQuestions' matching repliedUserIds
    if (seasonQuestions && seasonQuestions.length > 0 && canonicalQId) {
      const matchingQ = seasonQuestions.find((q) => getCanonicalQuestionId(q) === canonicalQId);
      if (matchingQ && Array.isArray(matchingQ.repliedUserIds) && (matchingQ.repliedUserIds.includes(cUid) || (cAltUid && matchingQ.repliedUserIds.includes(cAltUid)))) {
        return true;
      }
    }

    // 4. Check if the user has an actual evaluated answer (isAnswer: true) targeting this specific question in the chat feed
    const hasAnswerInChat = messages.some((m) => {
      const isUser = m.userId === cUid || (cAltUid && m.userId === cAltUid);
      if (!isUser) return false;
      // Must be an actual evaluated answer attempt, not casual chatting
      if (!m.isAnswer) return false;
      const mQId = getCanonicalQuestionId(m.questionId || m);
      if (canonicalQId && mQId && mQId === canonicalQId) {
        return true;
      }
      if (m.replyTo?.id) {
        const replyTargetQId = getCanonicalQuestionId(m.replyTo.id);
        if (canonicalQId && replyTargetQId && replyTargetQId === canonicalQId) {
          return true;
        }
      }
      if ((m.replyTo as any)?.questionId) {
        const targetQId = getCanonicalQuestionId((m.replyTo as any).questionId);
        if (canonicalQId && targetQId && targetQId === canonicalQId) {
          return true;
        }
      }
      return false;
    });

    if (hasAnswerInChat) return true;

    return false;
  }, [currentUser?.id, (currentUser as any)?.uid, activeQuestion, seasonQuestions, messages]);

  const hasRepliedToTarget = useMemo(() => {
    if (!replyTarget || replyTarget.type !== 'question') return false;
    return hasUserRepliedToQuestionMessage(replyTarget);
  }, [replyTarget, hasUserRepliedToQuestionMessage]);

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

    // Whenever season is paused, typing and answers are strictly locked for regular users; admin announcements remain open
    if (currentSeason?.status === 'paused' && !isStaffOrAdmin) {
      return;
    }

    // Non-registered or eliminated users can spectate but cannot type/participate
    if (!isStaffOrAdmin && isSpectator) {
      return;
    }

    // Check if this message is specifically targeting a question card
    const activeQCanonicalId = activeQuestion ? getCanonicalQuestionId(activeQuestion.id) : '';
    const targetQCanonicalId = replyTo?.id ? getCanonicalQuestionId(replyTo.id) : '';

    let targetQuestionObj: SchoolDomeQuestion | null = null;
    if (activeQuestion && (
      (activeQCanonicalId && targetQCanonicalId && activeQCanonicalId === targetQCanonicalId) ||
      replyTo?.id === activeQuestion.id ||
      replyTo?.id === `msg_${activeQuestion.id}` ||
      (replyTo as any)?.questionId === activeQuestion.id ||
      messages.some((m) => m.id === replyTo?.id && m.type === 'question' && getCanonicalQuestionId(m) === activeQCanonicalId)
    )) {
      targetQuestionObj = activeQuestion;
    } else if (replyTo?.id) {
      const qMsg = messages.find(m => m.id === replyTo.id && m.type === 'question');
      if (qMsg?.competitionRef) {
        targetQuestionObj = {
          id: qMsg.competitionRef.questionId,
          seasonId: currentSeason?.id || 'season_dome_1',
          questionNumber: qMsg.competitionRef.questionNumber,
          questionText: qMsg.competitionRef.questionText,
          correctAnswer: qMsg.competitionRef.correctAnswer,
          acceptedAlternativeAnswers: (qMsg.competitionRef as any).acceptedAlternativeAnswers || [],
          timeLimitSeconds: qMsg.competitionRef.timeLimitSeconds || 300,
          startAt: qMsg.competitionRef.startAt || qMsg.timestamp,
          endAt: qMsg.competitionRef.endAt || (qMsg.timestamp + 300000),
          status: qMsg.competitionRef.status || 'active',
          survivorUserIds: (qMsg.competitionRef as any).survivorUserIds || [],
          eliminatedUserIds: (qMsg.competitionRef as any).eliminatedUserIds || [],
          repliedUserIds: qMsg.competitionRef.repliedUserIds || [],
          totalSubmissionsCount: 0,
          createdAt: qMsg.timestamp || Date.now(),
        };
      } else if (activeQuestion && (targetQCanonicalId.includes('dome_q_') || targetQCanonicalId.includes('sdq_'))) {
        targetQuestionObj = activeQuestion;
      }
    }

    const isTargetingAnyQuestion = Boolean(targetQuestionObj);

    // Prevent replying twice to a question challenge
    if (isTargetingAnyQuestion && targetQuestionObj) {
      if (!replyTargetPlanEligibility.isEligible && !isStaffOrAdmin) {
        alert(
          `Your subscription plan (${replyTargetPlanEligibility.userPlanName}) is not eligible to answer this question. Required: ${replyTargetPlanEligibility.requiredPlanText}. Your tournament standing is safe.`
        );
        return;
      }

      const targetQMsg = messages.find(
        (m) =>
          m.id === replyTo?.id ||
          (m.competitionRef?.questionId &&
            (`dome_msg_q_${m.competitionRef.questionId}` === replyTo?.id ||
              `msg_sdq_${m.competitionRef.questionId}` === replyTo?.id))
      ) || (activeQuestion ? { id: `msg_${activeQuestion.id}`, type: 'question', competitionRef: { questionId: activeQuestion.id } } as any : null);

      if (targetQMsg && hasUserRepliedToQuestionMessage(targetQMsg)) {
        alert(
          `You have already submitted an answer for Question #${targetQuestionObj.questionNumber || 1}. Each scholar is only allowed 1 attempt per question card. You can continue chatting normally for other purposes without replying to the question card.`
        );
        setReplyTarget(null);
        return;
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

    // RULE: Only messages specifically replying to the question card are treated and evaluated as answers!
    // If standing users are texting for other purposes, it is normal chat and does NOT evaluate as an answer or eliminate them.
    if (isTargetingAnyQuestion && targetQuestionObj && targetQuestionObj.status === 'active') {
      const cUid = currentUser?.id || (currentUser as any)?.uid;
      const cAltUid = (currentUser as any)?.uid || currentUser?.id;
      const isRegistered = Boolean(
        (cUid && currentSeason?.registeredUserIds?.includes(cUid)) ||
        (cAltUid && currentSeason?.registeredUserIds?.includes(cAltUid)) ||
        (currentUser?.id === 'user_student')
      );
      const isStanding = Boolean(
        isRegistered &&
        !currentSeason?.eliminatedUserIds?.includes(cUid) &&
        !(cAltUid && currentSeason?.eliminatedUserIds?.includes(cAltUid))
      );
      if ((isRegistered && isStanding) || isStaffOrAdmin) {
        const isCorr = isAnswerCorrect(
          text,
          targetQuestionObj.correctAnswer,
          targetQuestionObj.acceptedAlternativeAnswers
        );
        newMessage.isAnswer = true;
        newMessage.isCorrect = isCorr;
        newMessage.evalStatus = isCorr ? 'correct' : 'wrong';
        newMessage.questionId = targetQuestionObj.id;
        newMessage.questionNumber = targetQuestionObj.questionNumber;

        // Rule: Users are eliminated by answering wrong
        if (!isCorr) {
          setCurrentSeason((prev) => {
            if (!prev) return prev;
            const newActive = (prev.activeUserIds || []).filter((id) => id !== cUid && id !== cAltUid);
            const newEliminated = Array.from(new Set([...(prev.eliminatedUserIds || []), cUid]));
            const updated = { ...prev, activeUserIds: newActive, eliminatedUserIds: newEliminated };
            try {
              localStorage.setItem('grobax_school_dome_active_season', JSON.stringify(updated));
            } catch {}
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('school_dome_season_updated', { detail: updated }));
            }
            return updated;
          });
          setActiveQuestion((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              eliminatedUserIds: Array.from(new Set([...(prev.eliminatedUserIds || []), cUid])),
              repliedUserIds: Array.from(new Set([...(prev.repliedUserIds || []), cUid])),
            };
          });
        } else {
          setActiveQuestion((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              survivorUserIds: Array.from(new Set([...(prev.survivorUserIds || []), cUid])),
              repliedUserIds: Array.from(new Set([...(prev.repliedUserIds || []), cUid])),
            };
          });
        }

        // Also update message in messages list so repliedUserIds reflects immediately
        setMessages((prev) =>
          prev.map((m) => {
            if (m.type === 'question' && getCanonicalQuestionId(m) === getCanonicalQuestionId(targetQuestionObj?.id)) {
              const prevReplied = m.competitionRef?.repliedUserIds || [];
              return {
                ...m,
                competitionRef: {
                  ...m.competitionRef!,
                  repliedUserIds: Array.from(new Set([...prevReplied, cUid])),
                },
              };
            }
            return m;
          })
        );

        // Reset replyTarget so subsequent texts are regular chat
        setReplyTarget(null);
      }
    }

    // Optimistic message append so chat appears immediately in 0ms like WhatsApp
    setMessages(prev => {
      const exists = prev.some(m => m.id === newMessage.id);
      if (exists) return prev;
      const updated = [...prev, newMessage];
      try {
        localStorage.setItem('grobax_school_dome_cached_messages', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (soundEnabled) {
      playAudioTone();
    }

    // Direct instant snap to bottom so new post is immediately in view
    requestAnimationFrame(() => {
      scrollToBottom(false);
    });

    // Notify local listeners right away for instant drop across all tabs/modals
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('school_dome_message_posted', { detail: newMessage }));
    }

    // Background asynchronous sync to Firestore & competition evaluation without blocking the post drop
    sendSchoolDomeMessage(newMessage, currentSeason, activeQuestion, currentUser).catch((err) => {
      console.warn('School Dome message sync notice:', err);
    });
  };

  const handleAnswerSubmit = (msg: SchoolDomeMessage, answerText: string) => {
    handleSendMessage(answerText, {
      id: msg.id,
      userName: msg.userName,
      messageSnippet: msg.competitionRef?.questionText || msg.messageText,
      institution: msg.institution,
      questionId: msg.competitionRef?.questionId || (msg as any).questionId || msg.id,
    } as any);
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

          {/* WhatsApp Authentic Wallpaper Theme Indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 shadow-2xs" title="WhatsApp Authentic Doodle Wallpaper Theme Active">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>WhatsApp Wallpaper</span>
          </div>
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

          {/* Admin Pause / Resume Season Toggle Button */}
          {isStaffOrAdmin && currentSeason && currentSeason.status !== 'ended' && (
            <button
              type="button"
              disabled={isTogglingPauseSeason}
              onClick={handleTogglePauseSeason}
              className={`px-2.5 py-1 text-xs font-black rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                currentSeason.status === 'paused'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white border-emerald-400 shadow-emerald-500/20 animate-pulse'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border-amber-500/40'
              }`}
              title={
                currentSeason.status === 'paused'
                  ? 'Season is paused. Click to resume live gameplay and contender chat.'
                  : 'Pause active season. Freezes timer countdowns, questions, and contender chat.'
              }
            >
              {currentSeason.status === 'paused' ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span className="hidden sm:inline">{isTogglingPauseSeason ? 'Resuming...' : 'Resume Season'}</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden sm:inline">{isTogglingPauseSeason ? 'Pausing...' : 'Pause Season'}</span>
                </>
              )}
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
            ) : currentSeason.status === 'paused' ? (
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-black">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                <Pause className="w-4 h-4 text-amber-500 shrink-0" />
                <span>PAUSED: Season #{currentSeason.seasonNumber} is currently on hold by Arbiter. Elimination questions, timers, and chat are frozen.</span>
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
                <span>You were eliminated from Season #{currentSeason.seasonNumber} (wrong answer or time expired). Spectator Mode active (watching live).</span>
              </div>
            ) : isUserStanding ? (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Active Contender • {currentSeason.activeUserIds?.length || 0} scholars standing for {currentSeason.prizePool.toLocaleString()} {currentSeason.prizeCurrency || 'GP'}! (Answer correctly before time expires to survive)</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
                <Eye className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Registration closed upon Question #1 launch. Users cannot participate or register after Question #1 (Spectator Mode active).</span>
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

      {/* Dedicated Season Paused Notice Banner */}
      {currentSeason?.status === 'paused' && (
        <div className="px-3.5 sm:px-4 py-2.5 bg-amber-500/15 dark:bg-amber-950/60 border-b border-amber-500/30 flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/40">
              <Pause className="w-4 h-4" />
            </div>
            <div>
              <div className="font-black text-amber-800 dark:text-amber-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Season #{currentSeason.seasonNumber} is Currently Paused</span>
              </div>
              <p className="text-[11px] text-amber-700/90 dark:text-amber-300/80">
                Arena battles, timer countdowns, and contender responses are paused. Standing contenders remain safe.
              </p>
            </div>
          </div>
          {isStaffOrAdmin && (
            <button
              type="button"
              disabled={isTogglingPauseSeason}
              onClick={handleTogglePauseSeason}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition hover:scale-105 active:scale-95 cursor-pointer shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{isTogglingPauseSeason ? 'Resuming...' : 'Resume Season'}</span>
            </button>
          )}
        </div>
      )}

      {/* CONTENT: EITHER CHAMPIONS RESULTS BOARD OR LIVE ARENA */}
      {activeTab === 'results' ? (
        <SchoolDomeResultsTab currentSeason={currentSeason} />
      ) : (
        <>
          {/* 1. ACTIVE LIVE ELIMINATION QUESTION PINNED CARD (Disappears when time expires, reappears on new question) */}
          {activeQuestion && activeQuestion.status === 'active' && activeQuestion.endAt > nowTick && (
            <div className="p-2 sm:p-2.5 bg-slate-900/95 border-b border-amber-500/30 shrink-0 shadow-md">
              <SchoolDomeQuestionCard
                question={activeQuestion}
                season={currentSeason}
                role={currentUser?.role}
                isManagerOrAdmin={isStaffOrAdmin}
                hasRepliedToQuestion={hasUserRepliedToQuestionMessage({
                  id: `msg_${activeQuestion.id}`,
                  type: 'question',
                  competitionRef: {
                    questionId: activeQuestion.id,
                    questionNumber: activeQuestion.questionNumber,
                    questionText: activeQuestion.questionText,
                    status: 'active',
                    repliedUserIds: activeQuestion.repliedUserIds,
                  },
                } as any)}
                isUserRegistered={isUserRegistered}
                isUserStanding={isUserStanding || isStaffOrAdmin}
                isUserPlanEligible={questionPlanEligibility.isEligible}
                userPlanName={questionPlanEligibility.userPlanName}
                requiredPlanText={questionPlanEligibility.requiredPlanText}
                planIneligibleReason={questionPlanEligibility.reason}
                onOpenUpgrade={handleOpenUpgrade}
                onCloseQuestion={isStaffOrAdmin ? (qId) => closeSchoolDomeQuestion(currentSeason?.id || 'season_dome_1', qId) : undefined}
                onExtendTime={isStaffOrAdmin ? (qId, extra) => extendSchoolDomeQuestionTime(qId, extra) : undefined}
                onReplyToAnswer={(q) => {
                  const targetMsg = messages.find(m => m.type === 'question' && getCanonicalQuestionId(m) === getCanonicalQuestionId(q.id)) || {
                    id: `msg_${q.id}`,
                    type: 'question',
                    userId: PRIMARY_SUPER_ADMIN_UID,
                    userName: 'Grobaxy Limited 🛡️',
                    messageText: q.questionText,
                    timestamp: q.startAt,
                    seasonId: currentSeason?.id || 'season_dome_1',
                    competitionRef: {
                      questionId: q.id,
                      questionNumber: q.questionNumber,
                      questionText: q.questionText,
                      correctAnswer: q.correctAnswer,
                      timeLimitSeconds: q.timeLimitSeconds,
                      startAt: q.startAt,
                      endAt: q.endAt,
                      status: q.status,
                    },
                  } as SchoolDomeMessage;
                  setReplyTarget(targetMsg);
                  if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
                  }
                }}
                onAnswerSubmit={(q, text) => {
                  handleAnswerSubmit({
                    id: `msg_${q.id}`,
                    type: 'question',
                    userName: 'Grobaxy Limited 🛡️',
                    messageText: q.questionText,
                    timestamp: q.startAt,
                    seasonId: currentSeason?.id || 'season_dome_1',
                    competitionRef: {
                      questionId: q.id,
                      questionNumber: q.questionNumber,
                      questionText: q.questionText,
                      correctAnswer: q.correctAnswer,
                      timeLimitSeconds: q.timeLimitSeconds,
                      startAt: q.startAt,
                      endAt: q.endAt,
                      status: q.status,
                    },
                  } as any, text);
                }}
              />
            </div>
          )}

          {/* 2. MAIN MESSAGE STREAM WITH WHATSAPP DOODLE WALLPAPER */}
          <WhatsAppChatBackground className="flex-1">
            <div
              ref={setScrollContainerRef}
              onScroll={handleScroll}
              style={{ scrollBehavior: 'auto' }}
              className="flex-1 h-full overflow-y-auto p-2 sm:p-4 space-y-3"
            >
              {filteredMessages.map((msg) => (
                <SchoolDomeMessageItem
                  key={msg.id}
                  message={msg}
                  currentUserId={currentUser.id}
                  isManagerOrAdmin={isStaffOrAdmin}
                  hasRepliedToQuestion={hasUserRepliedToQuestionMessage(msg)}
                  isSpectator={isSpectator}
                  isUserRegistered={isUserRegistered}
                  isUserStanding={isUserStanding || isStaffOrAdmin}
                  activeQuestion={activeQuestion}
                  questions={seasonQuestions}
                  onReply={(m) => {
                    setReplyTarget(m);
                    if (scrollContainerRef.current) {
                      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
                    }
                  }}
                  onAnswerSubmit={handleAnswerSubmit}
                  onOpenRegistration={() => setIsRegistrationModalOpen(true)}
                  onDelete={handleDeleteMessage}
                  onMuteUser={handleMuteUser}
                  onReact={handleReactMessage}
                  onCloseQuestion={isStaffOrAdmin ? (qId) => closeSchoolDomeQuestion(currentSeason?.id || 'season_dome_1', qId) : undefined}
                  onExtendTime={isStaffOrAdmin ? (qId, extra) => extendSchoolDomeQuestionTime(qId, extra) : undefined}
                />
              ))}

              <div ref={messagesEndRef} />
            </div>
          </WhatsAppChatBackground>

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
          ) : currentSeason?.status === 'paused' && !isStaffOrAdmin ? (
            <div className="p-3.5 sm:p-4 bg-amber-50 dark:bg-amber-950/40 border-t border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <Pause className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-amber-900 dark:text-amber-200 text-xs sm:text-sm">
                      Season #{currentSeason?.seasonNumber || 1} Paused by Arbiter
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      Typing &amp; Responses Frozen
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80 mt-0.5">
                    {isUserStanding
                      ? '🛡️ You are still standing! Contender countdowns and question submissions are on hold until the Arbiter resumes the season.'
                      : 'Arena responses and chat are temporarily frozen until the Arbiter resumes live gameplay.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsRulesModalOpen(true)}
                  className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-800/60 text-amber-900 dark:text-amber-200 text-xs font-bold rounded-xl transition cursor-pointer border border-amber-300/80 dark:border-amber-700/80"
                >
                  View Rules
                </button>
              </div>
            </div>
          ) : isSpectator ? (
            <div className="p-3.5 bg-slate-100 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Eye className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="truncate">
                  {isUserEliminated
                    ? `You were eliminated from Season #${currentSeason?.seasonNumber || 1} (wrong answer or time expired). You can watch all live questions as a spectator.`
                    : isRegistrationOpen
                    ? `Registration is open for Season #${currentSeason?.seasonNumber || 1}! Register now to participate in challenges.`
                    : `Registration closed when Question #1 launched. Users cannot participate or register after Question #1 has been launched (Spectator Mode active).`}
                </span>
              </div>
              {isRegistrationOpen && !isUserRegistered ? (
                <button
                  type="button"
                  onClick={() => setIsRegistrationModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-slate-950 font-black text-xs shadow-md transition cursor-pointer shrink-0"
                >
                  Register Free
                </button>
              ) : (
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 font-black text-[11px] border border-amber-500/30 shrink-0 uppercase tracking-wider">
                  Spectator Mode
                </span>
              )}
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
              {currentSeason?.status === 'paused' && isStaffOrAdmin && (
                <div className="px-3.5 py-2 bg-amber-500/15 dark:bg-amber-950/60 border-t border-amber-500/40 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 min-w-0">
                    <Pause className="w-3.5 h-3.5 text-amber-500 shrink-0 fill-current" />
                    <span className="font-black truncate">
                      Season #{currentSeason.seasonNumber || 1} is Paused • Admin Arbiter Console Active
                    </span>
                    <span className="hidden md:inline text-[11px] text-amber-700 dark:text-amber-400 truncate">
                      (Typing locked for regular contenders, open for arbiter broadcasts)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isTogglingPauseSeason}
                      onClick={handleTogglePauseSeason}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] rounded-lg shadow-xs transition hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1"
                    >
                      <Play className="w-3 h-3 fill-white" />
                      <span>{isTogglingPauseSeason ? 'Resuming...' : 'Resume Season'}</span>
                    </button>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                      Arbiter
                    </span>
                  </div>
                </div>
              )}
              <SchoolDomeComposer
                onSendMessage={handleSendMessage}
                replyToMessage={replyTarget}
                onCancelReply={() => setReplyTarget(null)}
                isChatMuted={false}
                isPaused={currentSeason?.status === 'paused'}
                channelName="school-dome"
                isManagerOrAdmin={isStaffOrAdmin}
                hasRepliedToTarget={hasRepliedToTarget}
                isUserRegistered={isUserRegistered}
                isUserStanding={isUserStanding}
                isRegistrationLocked={!isRegistrationOpen}
                onOpenRegister={() => setIsRegistrationModalOpen(true)}
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
          onQuestionCreated={(createdQ, qMsgOpt) => {
            setIsCreateQuestionModalOpen(false);
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

            const qMsg: SchoolDomeMessage = qMsgOpt || {
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

            requestAnimationFrame(() => {
              scrollToBottom(true);
            });
          }}
        />
      )}

      {/* Rules Popup Card */}
      <SchoolDomeRulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        season={currentSeason}
      />

      {/* Free Registration Modal */}
      {isRegistrationModalOpen && currentSeason && (
        <SchoolDomeRegistrationModal
          isOpen={isRegistrationModalOpen}
          onClose={() => setIsRegistrationModalOpen(false)}
          season={currentSeason}
          currentUser={currentUser}
          onRegistrationSuccess={() => {
            setIsRegistrationModalOpen(false);
          }}
        />
      )}

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
