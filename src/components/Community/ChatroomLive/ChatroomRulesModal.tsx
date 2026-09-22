import React, { useState, useEffect } from 'react';
import {
  X,
  Trophy,
  Zap,
  Crown,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sparkles,
  Edit3,
  Save,
  Plus,
  Trash2,
  HelpCircle,
  BookOpen,
  ScrollText,
} from 'lucide-react';
import {
  UltimateSearchRulesData,
  UltimateSearchRuleItem,
} from '../../../types';
import {
  DEFAULT_ULTIMATE_SEARCH_RULES,
  fetchUltimateSearchRulesFromFirestore,
  saveUltimateSearchRulesToFirestore,
  subscribeToUltimateSearchRules,
} from '../../../lib/firebase';

interface ChatroomRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUpgradeModal?: () => void;
  isPremium?: boolean;
  isManagerOrAdmin?: boolean;
  adminUid?: string;
  adminName?: string;
}

export const ChatroomRulesModal: React.FC<ChatroomRulesModalProps> = ({
  isOpen,
  onClose,
  onOpenUpgradeModal,
  isPremium,
  isManagerOrAdmin,
  adminUid,
  adminName,
}) => {
  const [rulesData, setRulesData] = useState<UltimateSearchRulesData>(DEFAULT_ULTIMATE_SEARCH_RULES);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<UltimateSearchRulesData>(DEFAULT_ULTIMATE_SEARCH_RULES);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Subscribe to real-time rules in Firestore
  useEffect(() => {
    if (!isOpen) return;

    // Fetch initial
    fetchUltimateSearchRulesFromFirestore().then(data => {
      setRulesData(data);
      setEditForm(data);
    });

    const unsubscribe = subscribeToUltimateSearchRules(data => {
      setRulesData(data);
      if (!isEditing) {
        setEditForm(data);
      }
    });

    return () => unsubscribe();
  }, [isOpen, isEditing]);

  if (!isOpen) return null;

  const handleStartEdit = () => {
    setEditForm(JSON.parse(JSON.stringify(rulesData)));
    setIsEditing(true);
    setSaveSuccessMsg('');
  };

  const handleCancelEdit = () => {
    setEditForm(JSON.parse(JSON.stringify(rulesData)));
    setIsEditing(false);
    setSaveSuccessMsg('');
  };

  const handleAddRuleItem = () => {
    const newItem: UltimateSearchRuleItem = {
      id: `rule_${Date.now()}`,
      title: 'New Rule',
      description: 'Describe the specific challenge rule requirement here.',
      icon: 'ShieldCheck',
    };
    setEditForm(prev => ({
      ...prev,
      rules: [...prev.rules, newItem],
    }));
  };

  const handleUpdateRuleItem = (id: string, field: 'title' | 'description', val: string) => {
    setEditForm(prev => ({
      ...prev,
      rules: prev.rules.map(r => (r.id === id ? { ...r, [field]: val } : r)),
    }));
  };

  const handleDeleteRuleItem = (id: string) => {
    setEditForm(prev => ({
      ...prev,
      rules: prev.rules.filter(r => r.id !== id),
    }));
  };

  const handleSaveRules = async () => {
    try {
      setIsSaving(true);
      await saveUltimateSearchRulesToFirestore(editForm, adminUid, adminName);
      setRulesData(editForm);
      setIsEditing(false);
      setSaveSuccessMsg('Rules updated and published successfully!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to save rules:', err);
      alert('Failed to save rules. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const getRuleIcon = (idx: number, iconName?: string) => {
    switch (iconName) {
      case 'Zap':
        return <Zap className="w-4 h-4 text-amber-500" />;
      case 'Trophy':
        return <Trophy className="w-4 h-4 text-blue-500" />;
      case 'Crown':
        return <Crown className="w-4 h-4 text-amber-400" />;
      case 'Clock':
        return <Clock className="w-4 h-4 text-rose-500" />;
      default:
        return idx % 2 === 0 ? (
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
        ) : (
          <Zap className="w-4 h-4 text-amber-500" />
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-950/20 via-indigo-900/10 to-slate-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl text-white shadow-md">
              <ScrollText className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                  {rulesData.title || 'Daily GP Grab — Official Rules'}
                </h2>
                {isManagerOrAdmin && !isEditing && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-400/20 border border-amber-400/30 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official competition regulations, typed answers, and GP payout guidelines
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isManagerOrAdmin && !isEditing && (
              <button
                type="button"
                id="admin-edit-rules-btn"
                onClick={handleStartEdit}
                className="px-2.5 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1 shadow-xs transition cursor-pointer"
                title="Admin: Set Rules for Daily GP Grab"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Set Rules</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {saveSuccessMsg && (
          <div className="px-5 py-2.5 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {isEditing ? (
            /* ADMIN EDIT MODE */
            <div className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Admin Mode: Customize the rules for the Daily GP Grab. Updates are synced live to all scholars in this chatroom.</span>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Rules Header Title
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Schedule Notice */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <span>Competition Schedule & Timing</span>
                </label>
                <textarea
                  rows={2}
                  value={editForm.scheduleNotice}
                  onChange={e => setEditForm(prev => ({ ...prev, scheduleNotice: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 resize-none"
                  placeholder="e.g. Competitions are hosted every Monday through Friday at 7:00 PM (WAT)..."
                />
              </div>

              {/* General Guidelines */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  General Guidelines / Description
                </label>
                <textarea
                  rows={2}
                  value={editForm.generalGuidelines || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, generalGuidelines: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 resize-none"
                />
              </div>

              {/* Free Scholar & GP Reward Policy */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>Free Scholar Participation & GP Rewards Policy</span>
                </label>
                <textarea
                  rows={3}
                  value={editForm.freeScholarPolicy || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, freeScholarPolicy: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 resize-none"
                />
              </div>

              {/* Rule Items */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Core Competition Rules ({editForm.rules.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddRuleItem}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer transition"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Rule</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {editForm.rules.map((rule, idx) => (
                    <div
                      key={rule.id || idx}
                      className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={rule.title}
                          onChange={e => handleUpdateRuleItem(rule.id, 'title', e.target.value)}
                          placeholder="Rule Title"
                          className="flex-1 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-black text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteRuleItem(rule.id)}
                          className="p-1 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                          title="Delete Rule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={rule.description}
                        onChange={e => handleUpdateRuleItem(rule.id, 'description', e.target.value)}
                        placeholder="Rule Description"
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden focus:border-blue-500 resize-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* USER VIEW MODE */
            <>
              {/* Schedule Banner */}
              <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-xs font-black text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                    Official Schedule & Timing
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {rulesData.scheduleNotice}
                  </p>
                </div>
              </div>

              {/* General Guidelines banner if present */}
              {rulesData.generalGuidelines && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-start gap-2.5">
                  <BookOpen className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                    {rulesData.generalGuidelines}
                  </p>
                </div>
              )}

              {/* Rule Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {rulesData.rules.map((rule, idx) => (
                  <div
                    key={rule.id || idx}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1.5"
                  >
                    <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-slate-100">
                      {getRuleIcon(idx, rule.icon)}
                      <span>{rule.title}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {rule.description}
                    </p>
                  </div>
                ))}
              </div>

              {/* Free Scholar & GP Reward Policy Notice */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-amber-800 dark:text-amber-300">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span>Free Scholar Policy vs Premium GP Rewards</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {rulesData.freeScholarPolicy ||
                    'Free scholars are verified with a green check (✓) when answering correctly. Instant cash GP prize payouts are reserved exclusively for Premium and VIP scholars.'}
                </p>
              </div>

              {/* User Status Card */}
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl ${
                      isPremium
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Your Status: {isPremium ? '👑 Grobaax Premium / VIP' : 'Free Scholar'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {isPremium
                        ? 'Eligible for all instant cash GP payouts & winner slots'
                        : 'Answers verified with (✓). Upgrade to earn instant cash GP payouts!'}
                    </div>
                  </div>
                </div>

                {!isPremium && onOpenUpgradeModal && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenUpgradeModal();
                    }}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer shrink-0 transition flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                    <span>Upgrade to earn GP</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          {isEditing ? (
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRules}
                disabled={isSaving}
                className="px-5 py-2 bg-gradient-to-r from-blue-900 to-indigo-800 hover:from-blue-800 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving Rules...' : 'Save & Publish Rules'}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              {isManagerOrAdmin ? (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="px-3 py-1.5 rounded-xl border border-amber-400/40 text-amber-700 dark:text-amber-300 hover:bg-amber-400/10 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Set Rules</span>
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition cursor-pointer"
              >
                Got It, Let's Chat!
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

