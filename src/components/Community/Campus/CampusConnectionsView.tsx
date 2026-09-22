import React, { useState } from 'react';
import { CampusConnectionRequest, CampusStudentCard } from '../../../types';
import {
  Inbox,
  Send,
  Users,
  Check,
  X,
  ExternalLink,
  Clock,
  Crown,
  Gem,
  Loader2,
  BadgeCheck,
  Building2,
  GraduationCap,
} from 'lucide-react';

interface CampusConnectionsViewProps {
  received: CampusConnectionRequest[];
  sent: CampusConnectionRequest[];
  accepted: CampusConnectionRequest[];
  onAccept: (requestId: string, request: CampusConnectionRequest) => Promise<void>;
  onReject: (requestId: string, request: CampusConnectionRequest) => Promise<void>;
  onOpenWhatsApp: (targetUserId: string, targetName: string, requestId: string) => Promise<void>;
  currentUserId: string;
  students?: CampusStudentCard[];
}

function normalizeDisplayTier(tierValue?: string): 'free' | 'premium' | 'vip' {
  if (!tierValue) return 'free';
  const t = tierValue.toLowerCase().trim();
  if (t === 'vip' || t.includes('vip') || t.includes('titan') || t.includes('annual')) return 'vip';
  if (
    t === 'premium' ||
    t.includes('premium') ||
    t.includes('pro') ||
    t.includes('champion') ||
    t.includes('starter plan') ||
    t.includes('basic')
  ) {
    if (!t.includes('free') && t !== 'starter scholar') {
      return 'premium';
    }
  }
  return 'free';
}

export const CampusConnectionsView: React.FC<CampusConnectionsViewProps> = ({
  received,
  sent,
  accepted,
  onAccept,
  onReject,
  onOpenWhatsApp,
  currentUserId,
  students = [],
}) => {
  const [activeTab, setActiveTab] = useState<'received' | 'sent' | 'accepted'>('received');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Student map for resolving live scholar tiers and badges
  const studentsMap = React.useMemo(() => {
    const map = new Map<string, CampusStudentCard>();
    students.forEach((s) => {
      map.set(s.id, s);
      if (s.username) map.set(s.username.toLowerCase(), s);
      if (s.name) map.set(s.name.toLowerCase(), s);
    });
    return map;
  }, [students]);

  const getResolvedTier = (userId: string, userName: string, cachedTier?: string): 'free' | 'premium' | 'vip' => {
    const liveStudent = studentsMap.get(userId) || studentsMap.get(userName.toLowerCase());
    if (liveStudent && liveStudent.tier) {
      return normalizeDisplayTier(liveStudent.tier);
    }
    return normalizeDisplayTier(cachedTier);
  };

  const getResolvedBlueBadge = (userId: string, userName: string, tier: 'free' | 'premium' | 'vip'): boolean => {
    const liveStudent = studentsMap.get(userId) || studentsMap.get(userName.toLowerCase());
    if (liveStudent) {
      return Boolean(liveStudent.hasBlueBadge || liveStudent.isVerified || liveStudent.tier === 'premium' || liveStudent.tier === 'vip');
    }
    return tier === 'premium' || tier === 'vip';
  };

  const handleAccept = async (req: CampusConnectionRequest) => {
    setLoadingId(req.id);
    try {
      await onAccept(req.id, req);
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (req: CampusConnectionRequest) => {
    setLoadingId(req.id);
    try {
      await onReject(req.id, req);
    } finally {
      setLoadingId(null);
    }
  };

  const handleChat = async (req: CampusConnectionRequest) => {
    setLoadingId(req.id);
    try {
      const isSender = req.senderId === currentUserId;
      const targetUserId = isSender ? req.recipientId : req.senderId;
      const targetName = isSender ? req.recipientName : req.senderName;
      await onOpenWhatsApp(targetUserId, targetName, req.id);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 overflow-x-auto scrollbar-none">
        <button
          id="campus-conn-tab-received"
          type="button"
          onClick={() => setActiveTab('received')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'received'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Inbox className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Received Requests</span>
          {received.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
              {received.length}
            </span>
          )}
        </button>

        <button
          id="campus-conn-tab-sent"
          type="button"
          onClick={() => setActiveTab('sent')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'sent'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Send className="w-4 h-4 text-blue-500" />
          <span>Sent Requests</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
            {sent.length}
          </span>
        </button>

        <button
          id="campus-conn-tab-accepted"
          type="button"
          onClick={() => setActiveTab('accepted')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'accepted'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Connected Scholars</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
            {accepted.length}
          </span>
        </button>
      </div>

      {/* 1. RECEIVED REQUESTS */}
      {activeTab === 'received' && (
        <div className="space-y-3">
          {received.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <Inbox className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                No Pending Received Requests
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                When students from your institution request to connect with you, they will appear here.
              </p>
            </div>
          ) : (
            received.map((req) => {
              const displayTier = getResolvedTier(req.senderId, req.senderName, req.senderTier);
              const showBlueBadge = getResolvedBlueBadge(req.senderId, req.senderName, displayTier);

              return (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 gap-3 shadow-xs hover:border-blue-500/30 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={req.senderAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${req.senderId}`}
                      alt={req.senderName}
                      className="w-11 h-11 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                          {req.senderName}
                        </span>
                        {showBlueBadge && (
                          <span title="Verified Scholar">
                            <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-500/20 shrink-0" />
                          </span>
                        )}
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                        {displayTier === 'vip' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            <Crown className="w-2.5 h-2.5 text-amber-500" /> VIP
                          </span>
                        )}
                        {displayTier === 'premium' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                            <Gem className="w-2.5 h-2.5 text-blue-500" /> Premium
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                        {req.senderInstitution && (
                          <p className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 truncate text-[11px]">
                            <Building2 className="w-3 h-3 shrink-0" />
                            <span className="truncate">{req.senderInstitution}</span>
                          </p>
                        )}
                        <p className="truncate flex items-center gap-1.5 flex-wrap">
                          {req.senderFaculty && (
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                              {req.senderFaculty} •
                            </span>
                          )}
                          <span>{req.senderDepartment || 'Scholar'}</span>
                          <span>•</span>
                          <span>{req.senderLevel || '100 Level'}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleAccept(req)}
                      disabled={loadingId === req.id}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {loadingId === req.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Accept</span>
                    </button>
                    <button
                      onClick={() => handleReject(req)}
                      disabled={loadingId === req.id}
                      className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all active:scale-95 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 2. SENT REQUESTS */}
      {activeTab === 'sent' && (
        <div className="space-y-3">
          {sent.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <Send className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                No Sent Requests
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Explore your faculty and department directory to connect with fellow scholars.
              </p>
            </div>
          ) : (
            sent.map((req) => {
              const displayTier = getResolvedTier(req.recipientId, req.recipientName, req.recipientTier);
              const showBlueBadge = getResolvedBlueBadge(req.recipientId, req.recipientName, displayTier);

              return (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 gap-3 shadow-xs hover:border-blue-500/30 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={req.recipientAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${req.recipientId}`}
                      alt={req.recipientName}
                      className="w-11 h-11 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                          {req.recipientName}
                        </span>
                        {showBlueBadge && (
                          <span title="Verified Scholar">
                            <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-500/20 shrink-0" />
                          </span>
                        )}
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                        {displayTier === 'vip' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            <Crown className="w-2.5 h-2.5 text-amber-500" /> VIP
                          </span>
                        )}
                        {displayTier === 'premium' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                            <Gem className="w-2.5 h-2.5 text-blue-500" /> Premium
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                        {req.recipientInstitution && (
                          <p className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 truncate text-[11px]">
                            <Building2 className="w-3 h-3 shrink-0" />
                            <span className="truncate">{req.recipientInstitution}</span>
                          </p>
                        )}
                        <p className="truncate flex items-center gap-1.5 flex-wrap">
                          {req.recipientFaculty && (
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                              {req.recipientFaculty} •
                            </span>
                          )}
                          <span>{req.recipientDepartment || 'Scholar'}</span>
                          <span>•</span>
                          <span>{req.recipientLevel || '100 Level'}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {req.status === 'PENDING' && (
                      <span className="px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30 text-xs font-bold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Pending
                      </span>
                    )}
                    {req.status === 'ACCEPTED' && (
                      <button
                        onClick={() => handleChat(req)}
                        disabled={loadingId === req.id}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        {loadingId === req.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ExternalLink className="w-3.5 h-3.5" />
                        )}
                        <span>Chat</span>
                      </button>
                    )}
                    {req.status === 'REJECTED' && (
                      <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold">
                        Declined
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 3. ACCEPTED CONNECTIONS */}
      {activeTab === 'accepted' && (
        <div className="space-y-3">
          {accepted.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                No Connected Scholars Yet
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Once a connection request is accepted, your verified scholar connections will appear here with instant WhatsApp chat access.
              </p>
            </div>
          ) : (
            accepted.map((req) => {
              const isSender = req.senderId === currentUserId;
              const otherId = isSender ? req.recipientId : req.senderId;
              const otherName = isSender ? req.recipientName : req.senderName;
              const otherAvatar = isSender ? req.recipientAvatar : req.senderAvatar;
              const otherDept = isSender ? req.recipientDepartment : req.senderDepartment;
              const otherLevel = isSender ? req.recipientLevel : req.senderLevel;
              const otherInstitution = isSender ? req.recipientInstitution : req.senderInstitution;
              const otherFaculty = isSender ? req.recipientFaculty : req.senderFaculty;
              const cachedTier = isSender ? req.recipientTier : req.senderTier;
              const displayTier = getResolvedTier(otherId, otherName, cachedTier);
              const showBlueBadge = getResolvedBlueBadge(otherId, otherName, displayTier);

              return (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 gap-3 shadow-xs hover:border-blue-500/40 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={otherAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(otherName)}`}
                      alt={otherName}
                      className="w-11 h-11 rounded-full object-cover border-2 border-blue-500/30 shrink-0 bg-slate-100"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                          {otherName}
                        </span>
                        {showBlueBadge && (
                          <span title="Verified Scholar">
                            <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-500/20 shrink-0" />
                          </span>
                        )}
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                        {displayTier === 'vip' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            <Crown className="w-2.5 h-2.5 text-amber-500" /> VIP
                          </span>
                        )}
                        {displayTier === 'premium' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                            <Gem className="w-2.5 h-2.5 text-blue-500" /> Premium
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                        {otherInstitution && (
                          <p className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 truncate text-[11px]">
                            <Building2 className="w-3 h-3 shrink-0" />
                            <span className="truncate">{otherInstitution}</span>
                          </p>
                        )}
                        <p className="truncate flex items-center gap-1.5 flex-wrap">
                          {otherFaculty && (
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                              {otherFaculty} •
                            </span>
                          )}
                          <span>{otherDept || 'Scholar'}</span>
                          <span>•</span>
                          <span>{otherLevel || '100 Level'}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <button
                      onClick={() => handleChat(req)}
                      disabled={loadingId === req.id}
                      className="px-3.5 sm:px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs active:scale-96 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {loadingId === req.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ExternalLink className="w-3.5 h-3.5" />
                      )}
                      <span>Chat on WhatsApp</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
