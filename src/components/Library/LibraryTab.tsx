import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, BookOpen, Crown, Compass } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { GeneratedHandout } from '../../types';
import { HandoutGeneratorView, HandoutPrefillData } from './HandoutGeneratorView';
import { MyHandoutsView } from './MyHandoutsView';
import { HandoutViewerModal } from './HandoutViewerModal';
import { LibraryExploreView } from './LibraryExploreView';

export const LibraryTab: React.FC = () => {
  const { currentUser, openWalletModal } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'explore' | 'generate' | 'my_handouts'>('explore');
  const [selectedHandout, setSelectedHandout] = useState<GeneratedHandout | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);
  const [prefillData, setPrefillData] = useState<HandoutPrefillData | null>(null);

  const handleHandoutGenerated = (handout: GeneratedHandout) => {
    setSelectedHandout(handout);
    setIsViewerOpen(true);
  };

  const handleSelectHandout = (handout: GeneratedHandout) => {
    setSelectedHandout(handout);
    setIsViewerOpen(true);
  };

  const handleStartGenerateWithContext = (prefill: {
    category?: any;
    institution?: string;
    faculty?: string;
    department?: string;
    level?: string;
    course?: string;
    topic?: string;
    autoGenerate?: boolean;
  }) => {
    setPrefillData({
      category: prefill.category,
      institution: prefill.institution,
      faculty: prefill.faculty,
      department: prefill.department,
      level: prefill.level,
      course: prefill.course,
      topic: prefill.topic,
    });
    setActiveSubTab('generate');
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Top Header & Sub-Nav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight">
              Academic Library
            </h1>
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              AI Handouts
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Search tertiary curricula, study master handouts, and generate comprehensive, textbook-grade study guides across Nigerian Universities, Polytechnics, and Colleges of Education.
          </p>
        </div>

        {/* Sub-Nav Pill Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveSubTab('explore')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition whitespace-nowrap ${
              activeSubTab === 'explore'
                ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Compass className="w-4 h-4 text-amber-500" />
            <span>Explore & Search</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('generate')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition whitespace-nowrap ${
              activeSubTab === 'generate'
                ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>AI Generator</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('my_handouts')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition whitespace-nowrap ${
              activeSubTab === 'my_handouts'
                ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4 text-amber-500" />
            <span>My Handouts</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div>
        {activeSubTab === 'explore' ? (
          <LibraryExploreView
            onSelectHandout={handleSelectHandout}
            onStartGenerateWithContext={handleStartGenerateWithContext}
          />
        ) : activeSubTab === 'generate' ? (
          <HandoutGeneratorView
            onHandoutGenerated={handleHandoutGenerated}
            initialPrefill={prefillData}
            onClearPrefill={() => setPrefillData(null)}
          />
        ) : (
          <MyHandoutsView
            onSelectHandout={handleSelectHandout}
            onNavigateToGenerator={() => setActiveSubTab('generate')}
          />
        )}
      </div>

      {/* Handout Study Viewer Modal */}
      <HandoutViewerModal
        handout={selectedHandout}
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
      />
    </div>
  );
};
