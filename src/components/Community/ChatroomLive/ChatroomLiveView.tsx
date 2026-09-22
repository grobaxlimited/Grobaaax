import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { useApp, checkIsUserSubscribed } from '../../../context/AppContext';
import {
  ChatroomLiveMessage,
  SponsorshipCampaign,
  PRIMARY_SUPER_ADMIN_UID,
} from '../../../types';
import { normalizeDestinationUrl, safeOpenDestinationUrl } from '../../../lib/urlUtils';
import { ChatroomMessageItem } from './ChatroomMessageItem';
import { ChatroomComposer } from './ChatroomComposer';
import { CreateLiveQuestionModal } from './CreateLiveQuestionModal';
import { ChatroomRulesModal } from './ChatroomRulesModal';
import {
  sendChatroomMessageToFirestore,
  deleteChatroomMessageFromFirestore,
  reactChatroomMessageInFirestore,
  updateUserProfileInFirestore,
  getTodayLocalDateString,
  getSynchronousDailyChatUsage,
  getUserDailyChatUsage,
  recordUserDailyChatResponse,
  getDailyChatLimitForTier,
  isMockSponsorshipCampaign,
} from '../../../lib/firebase';
import {
  MessageSquare,
  Search,
  Volume2,
  VolumeX,
  ArrowDown,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Radio,
  Sparkles,
  Shield,
  ArrowUpRight,
  HelpCircle,
  Crown,
  ScrollText,
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

export const ChatroomLiveView: React.FC = () => {
  const {
    currentUser,
    firebaseUser,
    role,
    isUserSubscribed,
    setWalletModalTab,
    setIsWalletModalOpen,
    openWalletModal,
    chatroomMessages,
    sendChatroomMessage,
    deleteChatroomMessage,
    reactChatroomMessage,
    sponsorshipCampaigns,
  } = useApp();

  // Grobaax central subscription source of truth
  const membership = (currentUser?.membershipTier || '').toLowerCase();
  const subTier = (currentUser?.subscriptionTier || '').toLowerCase();
  const plan = (((currentUser as any)?.subscriptionPlan || (currentUser as any)?.planId || (currentUser as any)?.tier || (currentUser as any)?.activePlanId) + '').toLowerCase();

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

  const isActivelySubscribed = isUserSubscribed || checkIsUserSubscribed(currentUser);

  const isVIP =
    !isStaffOrAdmin &&
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

  // Daily response count (Only increments on successful submission, never on keystrokes/typing)
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

  // Immediate synchronous sync whenever activeUserId, todayDate or currentUser changes
  useEffect(() => {
    if (activeUserId && activeUserId !== 'guest') {
      const syncVal = getSynchronousDailyChatUsage(activeUserId, todayDate);
      let latestCount = syncVal;
      if (currentUser?.dailyQaUsage) {
        if (currentUser.dailyQaUsage.date === todayDate) {
          latestCount = Math.max(syncVal, currentUser.dailyQaUsage.count || 0);
        } else {
          // Date is from previous day -> Allowance renewed
          latestCount = 0;
        }
      }
      setDailyResponseCount(latestCount);

      // Background cross-device server check
      let isMounted = true;
      getUserDailyChatUsage(activeUserId, todayDate)
        .then(usage => {
          if (isMounted) {
            if (usage.date === todayDate) {
              setDailyResponseCount(prev => Math.max(prev, usage.count));
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

  const handleOpenUpgrade = () => {
    if (openWalletModal) {
      openWalletModal('upgrade');
    } else if (setWalletModalTab && setIsWalletModalOpen) {
      setWalletModalTab('upgrade');
      setIsWalletModalOpen(true);
    }
  };

  const activeFeedAds = useMemo(() => {
    return (sponsorshipCampaigns || [])
      .filter(c => !isMockSponsorshipCampaign(c))
      .filter(c => {
        const isAct = c.status === 'Active' || (c.status as string)?.toLowerCase() === 'active';
        const pl = (c.placement || '').toLowerCase().replace(/[\s_-]/g, '');
        const isFeed = pl === 'communityfeed' || pl === 'feed' || pl === 'community' || pl === 'feedad' || pl === 'feedcard';
        return isAct && isFeed;
      })
      .sort((a, b) => {
        const pVal = (p?: string) => (p === 'Top' ? 3 : p === 'High' ? 2 : p === 'Medium' ? 1 : 0);
        return pVal(b.priority) - pVal(a.priority);
      });
  }, [sponsorshipCampaigns]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ChatroomLiveMessage | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isMuted] = useState(false);
  const [isPinnedAdExpanded, setIsPinnedAdExpanded] = useState(true);
  const [activePinnedAdIndex, setActivePinnedAdIndex] = useState(0);
  const [isCreateQuestionModalOpen, setIsCreateQuestionModalOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  // Filter messages by search query and hide automated Arbiter evaluation/congratulations spam
  const filteredMessages = useMemo(() => {
    return chatroomMessages.filter(m => {
      // Suppress automated Arbiter spam messages from live chat feed since outcome is marked directly on scholar answers
      const isArbiter =
        m.userId === 'grobax_arbiter' ||
        (m.userName && m.userName.toLowerCase().includes('arbiter'));

      if (isArbiter) {
        const text = m.messageText || '';
        if (
          text.includes('answered correctly:') ||
          text.includes('Congratulations @') ||
          text.includes('winner slots for Question #') ||
          text.includes('winner slots for Question') ||
          (text.includes('All') && text.includes('winner slots')) ||
          text.includes('Official Correct Answer:')
        ) {
          return false;
        }
      }

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        m.messageText.toLowerCase().includes(q) ||
        m.userName.toLowerCase().includes(q) ||
        m.institution?.toLowerCase().includes(q)
      );
    });
  }, [chatroomMessages, searchQuery]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasInitialScrolledRef = useRef(false);

  const isManagerOrAdmin = isStaffOrAdmin;

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
  }, [filteredMessages.length, showScrollBottom]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
    setShowScrollBottom(!isNearBottom);
  };

  // Pre-calculate which ads to render after each message index
  const adsAfterMessageMap = useMemo(() => {
    const map: { [msgIdx: number]: SponsorshipCampaign[] } = {};
    if (activeFeedAds.length === 0 || filteredMessages.length === 0) return map;

    const M = filteredMessages.length;
    const K = activeFeedAds.length;

    // Show first ad early after message 0 or 1, and cycle every 3-4 messages
    const firstPos = Math.min(1, M - 1);
    map[firstPos] = [activeFeedAds[0]];

    let adCursor = 1;
    for (let i = firstPos + 3; i < M; i += 3) {
      if (!map[i]) map[i] = [];
      map[i].push(activeFeedAds[adCursor % K]);
      adCursor++;
    }

    return map;
  }, [activeFeedAds, filteredMessages]);

  const hasUserRepliedToQuestionMessage = (msg: ChatroomLiveMessage): boolean => {
    if (msg.type !== 'question') return false;
    const qId = msg.competitionRef?.questionId || msg.id.replace(/^msg_q_/, '');
    const normName = (currentUser?.name || '').toLowerCase().trim();

    // 1. Check if user ID or normalized name is in question competitionRef replied lists
    if (msg.competitionRef?.repliedUserIds?.includes(currentUser.id)) return true;
    if (normName && msg.competitionRef?.repliedUsernames?.includes(normName)) return true;

    // 2. Check if user already won or is listed in selectedWinners
    if (msg.competitionRef?.selectedWinners?.some(w => w.userId === currentUser.id)) return true;

    // 3. Check if user already posted any response message targeting this question in the room
    const hasUserRepliedInChat = chatroomMessages.some(
      m =>
        m.userId === currentUser.id &&
        (m.replyTo?.id === msg.id || (qId && m.replyTo?.id === qId) || (qId && m.replyTo?.id === `msg_q_${qId}`))
    );
    if (hasUserRepliedInChat) return true;

    return false;
  };

  const hasRepliedToTarget = useMemo(() => {
    if (!replyTarget || replyTarget.type !== 'question') return false;
    return hasUserRepliedToQuestionMessage(replyTarget);
  }, [replyTarget, chatroomMessages, currentUser.id, currentUser?.name]);

  const handleSendMessage = async (text: string, replyTo?: ChatroomLiveMessage['replyTo']) => {
    // 1. Immediate Synchronous Check against state & local storage
    const currentSyncUsage = getSynchronousDailyChatUsage(activeUserId, todayDate);
    const effectiveCount = Math.max(dailyResponseCount, currentSyncUsage);

    if (!isStaffOrAdmin && effectiveCount >= maxDailyLimit) {
      setDailyResponseCount(effectiveCount);
      handleOpenUpgrade();
      return;
    }

    // Prevent replying twice to a question challenge
    if (replyTo?.id) {
      const isTargetingQuestion =
        replyTo.id.startsWith('msg_q_') ||
        chatroomMessages.some(m => m.id === replyTo.id && m.type === 'question');

      if (isTargetingQuestion) {
        const targetQMsg = chatroomMessages.find(
          m => m.id === replyTo.id || (m.competitionRef?.questionId && `msg_q_${m.competitionRef.questionId}` === replyTo.id)
        );
        if (targetQMsg && hasUserRepliedToQuestionMessage(targetQMsg)) {
          return;
        }
      }
    }

    // 2. Pre-record response in DB and check allowed status FIRST before message broadcast
    if (!isStaffOrAdmin) {
      try {
        const recordResult = await recordUserDailyChatResponse(activeUserId, todayDate, tierName);
        setDailyResponseCount(recordResult.count);
        if (!recordResult.allowed) {
          handleOpenUpgrade();
          return; // STOP! User has reached limit, do not send message
        }
      } catch (recErr) {
        console.warn('Record allowance pre-flight notice:', recErr);
        // If local sync check already met limit, stop
        if (effectiveCount >= maxDailyLimit) {
          handleOpenUpgrade();
          return;
        }
      }
    }

    const newMessage: ChatroomLiveMessage = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId: currentUser.id,
      userName: isStaffOrAdmin && !currentUser.name.includes('Support')
        ? `${currentUser.name} 💎 | Moderator`
        : currentUser.name,
      userAvatar: currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      institution: currentUser.institution || 'Grobaax Scholar',
      department: currentUser.department,
      level: currentUser.level,
      isPremium: isVIP || isPremium || isStaffOrAdmin,
      isVip: isVIP,
      membershipTier: isVIP ? 'VIP SCHOLAR' : isPremium ? 'PREMIUM SCHOLAR' : isStaffOrAdmin ? 'VIP SCHOLAR' : undefined,
      role: currentUser.role,
      equippedBadge: currentUser.equippedBadge,
      messageText: text,
      timestamp: Date.now(),
      type: 'normal',
      replyTo,
      reactions: {},
    };

    try {
      await sendChatroomMessage(newMessage);
    } catch (err) {
      console.warn('Daily Q&A message sync notice:', err);
    }

    if (soundEnabled) {
      playAudioTone();
    }
  };

  // React to a message with emoji
  const handleReactMessage = async (msgId: string, emoji: string) => {
    try {
      await reactChatroomMessage(msgId, emoji);
    } catch (err) {
      console.warn('React message notice:', err);
    }
  };

  // Delete message
  const handleDeleteMessage = async (msgId: string) => {
    try {
      await deleteChatroomMessage(msgId);
    } catch (err) {
      console.warn('Delete message notice:', err);
    }
  };

  // Mute User
  const handleMuteUser = (_userId: string, userName: string) => {
    // Non-blocking action notification
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
            <span className="truncate tracking-tight">daily-gp-grab</span>
          </div>

          {/* Active Live Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Radio className="w-3 h-3 animate-pulse text-emerald-500 shrink-0" />
            <span>Live Feed</span>
          </div>

          {/* Response Counter Header Badge */}
          <div className={`hidden lg:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition ${
            isStaffOrAdmin
              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
              : isVIP
              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
              : isPremium
              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30'
              : isLimitReached
              ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
          }`}>
            {isStaffOrAdmin ? (
              <span>Unlimited responses (Admin)</span>
            ) : isVIP ? (
              <span className="flex items-center gap-1">
                <Crown className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="font-bold text-amber-600 dark:text-amber-400">VIP Scholar:</span>
                <span>{dailyResponseCount} / {maxDailyLimit} today</span>
              </span>
            ) : isPremium ? (
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-blue-500 shrink-0" />
                <span className="font-bold text-blue-600 dark:text-blue-400">Premium:</span>
                <span>{dailyResponseCount} / {maxDailyLimit} today</span>
              </span>
            ) : (
              <span>
                {dailyResponseCount} / {maxDailyLimit} responses used today
                {isLimitReached ? ' (Limit Reached)' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Rules Button */}
          <button
            type="button"
            id="chatroom-rules-btn"
            onClick={() => setIsRulesModalOpen(true)}
            className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition shrink-0"
            title="Daily GP Grab Rules"
          >
            <ScrollText className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Rules</span>
          </button>

          {/* Admin Launch Live Question Button */}
          {isStaffOrAdmin && (
            <button
              onClick={() => setIsCreateQuestionModalOpen(true)}
              className="px-2.5 py-1 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer border border-amber-300 shrink-0"
              title="Launch Live Q&A Question Challenge"
            >
              <span className="w-4 h-4 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center font-black text-[10px]">Q</span>
              <span className="hidden sm:inline">Ask Question</span>
            </button>
          )}

          {/* Upgrade CTA button in header for Free & Premium users */}
          {(tierName === 'free' || tierName === 'premium') && (
            <button
              onClick={handleOpenUpgrade}
              className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-blue-900 to-indigo-800 hover:from-blue-800 hover:to-indigo-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer transition shrink-0"
              title="Upgrade Subscription Plan"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span className="hidden md:inline">{tierName === 'free' ? 'Upgrade Plan' : 'Get VIP'}</span>
            </button>
          )}

          {/* Search Toggle */}
          {isSearchOpen ? (
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
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
            {soundEnabled ? <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Pinned Live Feed Sponsored Card / Partner Initiative */}
      {activeFeedAds.length > 0 && (
        <div className="bg-gradient-to-r from-blue-900/10 via-indigo-900/10 to-amber-900/10 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-slate-900/40 border-b border-blue-500/20 px-3 sm:px-4 py-2 transition-all shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30 uppercase tracking-wider flex items-center gap-1 shrink-0">
                <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                {activeFeedAds[activePinnedAdIndex % activeFeedAds.length]?.badgeLabel || 'Featured Partner'}
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {activeFeedAds[activePinnedAdIndex % activeFeedAds.length]?.title}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {activeFeedAds.length > 1 && (
                <button
                  onClick={() => setActivePinnedAdIndex(prev => (prev + 1) % activeFeedAds.length)}
                  className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-white/60 dark:bg-slate-800/60 rounded-md border border-slate-200/50 dark:border-slate-700/50 cursor-pointer"
                  title="Next Sponsored Highlight"
                >
                  {(activePinnedAdIndex % activeFeedAds.length) + 1}/{activeFeedAds.length} ↻
                </button>
              )}
              {activeFeedAds[activePinnedAdIndex % activeFeedAds.length]?.destinationUrl && (
                <a
                  href={normalizeDestinationUrl(activeFeedAds[activePinnedAdIndex % activeFeedAds.length]?.destinationUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    safeOpenDestinationUrl(activeFeedAds[activePinnedAdIndex % activeFeedAds.length]?.destinationUrl);
                  }}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg transition flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <span>{activeFeedAds[activePinnedAdIndex % activeFeedAds.length]?.ctaText || 'Learn More'}</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              )}
              <button
                onClick={() => setIsPinnedAdExpanded(!isPinnedAdExpanded)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title={isPinnedAdExpanded ? 'Collapse' : 'Expand'}
              >
                {isPinnedAdExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Expanded detail banner */}
          {isPinnedAdExpanded && (
            <div className="mt-2 pt-2 border-t border-blue-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <span className="text-base shrink-0">{activeFeedAds[activePinnedAdIndex % activeFeedAds.length]?.logo || '📢'}</span>
                <span className="font-extrabold text-slate-900 dark:text-white shrink-0">
                  {activeFeedAds[activePinnedAdIndex % activeFeedAds.length]?.sponsorName}:
                </span>
                <span className="line-clamp-1">{activeFeedAds[activePinnedAdIndex % activeFeedAds.length]?.text}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. MAIN MESSAGE STREAM */}
      <div
        ref={setScrollContainerRef}
        onScroll={handleScroll}
        style={{ scrollBehavior: 'auto' }}
        className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/40"
      >
        {filteredMessages.map((msg, idx) => {
          const adsAfterThisMsg = adsAfterMessageMap[idx] || [];

          return (
            <React.Fragment key={msg.id}>
              <ChatroomMessageItem
                message={msg}
                currentUserId={currentUser.id}
                isManagerOrAdmin={isManagerOrAdmin}
                hasRepliedToQuestion={hasUserRepliedToQuestionMessage(msg)}
                onReply={m => setReplyTarget(m)}
                onDelete={handleDeleteMessage}
                onMuteUser={handleMuteUser}
                onReact={handleReactMessage}
                onOpenUpgradeModal={handleOpenUpgrade}
              />

              {/* Embedded Live Feed Ad Cards */}
              {adsAfterThisMsg.map((ad, adIdx) => (
                <div
                  key={`feed_ad_${ad.id}_${idx}_${adIdx}`}
                  className="my-3 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-blue-950/20 via-white dark:via-slate-900 to-indigo-950/20 border-2 border-blue-500/30 dark:border-blue-500/30 shadow-md space-y-3 transition-all hover:border-blue-400/50"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-blue-600/10 dark:bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-lg shrink-0 overflow-hidden">
                        {ad.logo && (ad.logo.startsWith('http') || ad.logo.startsWith('data:')) ? (
                          <img src={ad.logo} alt={ad.sponsorName} className="w-full h-full object-cover" />
                        ) : (
                          <span>{ad.logo || '📢'}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                            {ad.sponsorName}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 uppercase tracking-wider flex items-center gap-1 shrink-0">
                            <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                            {ad.badgeLabel || 'Sponsored'}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 block truncate">
                          Official Partner Initiative • Promoted
                        </span>
                      </div>
                    </div>

                    {ad.tag && (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                        #{ad.tag}
                      </span>
                    )}
                  </div>

                  {/* Title & Body */}
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {ad.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {ad.text}
                    </p>
                  </div>

                  {/* Banner */}
                  {ad.banner && (
                    <div className="rounded-xl overflow-hidden max-h-56 border border-slate-200 dark:border-slate-800 shadow-xs">
                      <img src={ad.banner} alt={ad.title} className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* Footer */}
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="truncate">Verified Grobaax Institutional Ad</span>
                    </span>

                    {ad.destinationUrl && (
                      <a
                        href={normalizeDestinationUrl(ad.destinationUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          safeOpenDestinationUrl(ad.destinationUrl);
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer shrink-0"
                      >
                        <span>{ad.ctaText || 'Learn More'}</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </React.Fragment>
          );
        })}

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

      {/* 3. DISCORD BOTTOM COMPOSER */}
      <ChatroomComposer
        onSendMessage={handleSendMessage}
        replyToMessage={replyTarget}
        onCancelReply={() => setReplyTarget(null)}
        isChatMuted={isMuted}
        channelName="daily-qa"
        dailyLimit={maxDailyLimit}
        usedCount={dailyResponseCount}
        isLimitReached={isLimitReached}
        tierName={tierName}
        isManagerOrAdmin={isManagerOrAdmin}
        hasRepliedToTarget={hasRepliedToTarget}
        onOpenUpgrade={handleOpenUpgrade}
        onOpenCreateQuestion={() => setIsCreateQuestionModalOpen(true)}
      />

      {/* Admin Live Question Launcher Modal */}
      {isCreateQuestionModalOpen && (
        <CreateLiveQuestionModal
          isOpen={isCreateQuestionModalOpen}
          onClose={() => setIsCreateQuestionModalOpen(false)}
          adminUid={currentUser.id}
          adminName={currentUser.name}
          onQuestionCreated={(_newQ) => {
            setIsCreateQuestionModalOpen(false);
          }}
        />
      )}

      {/* Daily GP Grab Rules & Settings Modal */}
      {isRulesModalOpen && (
        <ChatroomRulesModal
          isOpen={isRulesModalOpen}
          onClose={() => setIsRulesModalOpen(false)}
          onOpenUpgradeModal={handleOpenUpgrade}
          isPremium={isPremium || isVIP}
          isManagerOrAdmin={isStaffOrAdmin || isManagerOrAdmin}
          adminUid={currentUser?.id}
          adminName={currentUser?.name}
        />
      )}
    </div>
  );
};
