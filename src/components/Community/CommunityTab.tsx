import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Announcement } from '../../types';
import { NotificationBadge } from '../ui/NotificationBadge';
import { MinimartView } from './Minimart/MinimartView';
import { CampusView } from './Campus/CampusView';
import {
  ShoppingBag,
  Megaphone,
  Pin,
  GraduationCap,
} from 'lucide-react';

export const CommunityTab: React.FC = () => {
  const {
    announcements,
    sectionNotifications,
    markSectionAsRead,
    communitySubTab,
    setCommunitySubTab,
  } = useApp();

  // Community sub-tabs: 'minimart' | 'announcements' | 'campus'
  const currentTab = communitySubTab || 'minimart';

  // When sub-tab changes or loads, clear its notification state
  useEffect(() => {
    if (markSectionAsRead) {
      markSectionAsRead(currentTab);
    }
  }, [currentTab, markSectionAsRead]);

  const handleSubTabChange = (tab: 'minimart' | 'announcements' | 'campus') => {
    if (setCommunitySubTab) {
      setCommunitySubTab(tab);
    }
    if (markSectionAsRead) {
      markSectionAsRead(tab);
    }
  };

  const [annCategory, setAnnCategory] = useState<string>('All');

  // Filtered Announcements
  const filteredAnnouncements = (announcements || []).filter(a => {
    if (annCategory !== 'All' && a.category !== annCategory) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-3 sm:py-4 space-y-4">
      {/* Main Tabs Navigation Bar - Single Horizontal Scrollable Row */}
      <div className="flex items-center justify-between gap-2 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none w-full py-0.5">
          {/* Tab 1: Minimart */}
          <button
            id="community-subtab-minimart"
            onClick={() => handleSubTabChange('minimart')}
            className={`py-2 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
              currentTab === 'minimart'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-950/20 font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Campus Minimart</span>
            <NotificationBadge count={sectionNotifications?.minimart || 0} />
          </button>

          {/* Tab 2: Announcements */}
          <button
            id="community-subtab-announcements"
            onClick={() => handleSubTabChange('announcements')}
            className={`py-2 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
              currentTab === 'announcements'
                ? 'bg-blue-900 text-white shadow-md shadow-blue-950/30 border border-blue-700/50 font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>Official Announcements</span>
            <NotificationBadge count={sectionNotifications?.announcements || 0} />
          </button>

          {/* Tab 3: Campus */}
          <button
            id="community-subtab-campus"
            onClick={() => handleSubTabChange('campus')}
            className={`py-2 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
              currentTab === 'campus'
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-950/20 font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Campus</span>
            <NotificationBadge count={sectionNotifications?.campus || 0} />
          </button>
        </div>
      </div>

      {/* TAB: MINIMART */}
      {currentTab === 'minimart' && (
        <div className="animate-in fade-in duration-200">
          <MinimartView />
        </div>
      )}

      {/* TAB: ANNOUNCEMENTS */}
      {currentTab === 'announcements' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {(['All', 'Official', 'League Rule', 'Grant Opportunity', 'System Update'] as const).map(
              cat => (
                <button
                  key={cat}
                  onClick={() => setAnnCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all whitespace-nowrap cursor-pointer ${
                    annCategory === cat
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-amber-500/50'
                  }`}
                >
                  {cat === 'All' ? '📢 All Official Notices' : cat}
                </button>
              )
            )}
          </div>

          {/* Announcements List */}
          <div className="space-y-4">
            {filteredAnnouncements.map(ann => (
              <div
                key={ann.id}
                className={`p-6 rounded-2xl bg-white dark:bg-slate-900 border transition-all space-y-3 relative overflow-hidden ${
                  ann.isPinned
                    ? 'border-amber-500/60 dark:border-amber-500/40 shadow-lg shadow-amber-500/5'
                    : 'border-slate-200 dark:border-slate-800 shadow-xs'
                }`}
              >
                {ann.isPinned && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 px-3 py-1 rounded-bl-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                    <Pin className="w-3 h-3 fill-current" /> PINNED ANNOUNCEMENT
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-lg">
                    {ann.category}
                  </span>
                  {ann.priority && (
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                        ann.priority === 'Urgent' || ann.priority === 'High'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {ann.priority} Priority
                    </span>
                  )}
                  <span className="text-xs text-slate-400 ml-auto">{ann.date}</span>
                </div>

                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  {ann.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {ann.content}
                </p>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2 text-xs text-slate-500">
                  <img
                    src={ann.authorAvatar}
                    alt={ann.author}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {ann.author} ({ann.authorRole})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: CAMPUS */}
      {currentTab === 'campus' && (
        <div className="animate-in fade-in duration-200">
          <CampusView />
        </div>
      )}
    </div>
  );
};

