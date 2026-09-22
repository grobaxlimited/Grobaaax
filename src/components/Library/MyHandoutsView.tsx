import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Search,
  Download,
  Trash2,
  Calendar,
  Building,
  GraduationCap,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Filter,
  FileText,
} from 'lucide-react';
import { GeneratedHandout } from '../../types';
import {
  fetchUserGeneratedHandouts,
  deleteUserGeneratedHandout,
  exportHandoutToPdf,
} from '../../lib/handoutService';
import { useApp } from '../../context/AppContext';

interface MyHandoutsViewProps {
  onSelectHandout: (handout: GeneratedHandout) => void;
  onNavigateToGenerator: () => void;
}

export const MyHandoutsView: React.FC<MyHandoutsViewProps> = ({
  onSelectHandout,
  onNavigateToGenerator,
}) => {
  const { currentUser } = useApp();
  const [handouts, setHandouts] = useState<GeneratedHandout[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  const effectiveUserId = currentUser?.uid || currentUser?.id;

  const loadHandouts = async () => {
    if (!effectiveUserId) return;
    setIsLoading(true);
    try {
      const items = await fetchUserGeneratedHandouts(effectiveUserId);
      setHandouts(items);
    } catch (err) {
      console.warn('Error fetching saved handouts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHandouts();
  }, [effectiveUserId]);

  const handleDelete = async (e: React.MouseEvent, handoutId: string) => {
    e.stopPropagation();
    if (!effectiveUserId) return;
    if (window.confirm('Are you sure you want to delete this handout from your library?')) {
      await deleteUserGeneratedHandout(effectiveUserId, handoutId);
      setHandouts((prev) => prev.filter((h) => h.id !== handoutId));
    }
  };

  const handleDownloadPdf = (e: React.MouseEvent, handout: GeneratedHandout) => {
    e.stopPropagation();
    exportHandoutToPdf(handout);
  };

  const filteredHandouts = useMemo(() => {
    return handouts.filter((h) => {
      const matchesSearch =
        !searchQuery.trim() ||
        h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.institution.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.department.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategoryFilter === 'all' || h.institutionType === selectedCategoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [handouts, searchQuery, selectedCategoryFilter]);

  return (
    <div className="space-y-5">
      {/* Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-500" />
            My Handout Library
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Your private, generated academic handouts for study and offline revision.
          </p>
        </div>

        <button
          type="button"
          onClick={onNavigateToGenerator}
          className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 self-start sm:self-auto shadow-sm"
        >
          <Sparkles className="w-4 h-4" />
          <span>Generate New Handout</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search your handouts by course, topic, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Categories</option>
            <option value="University">University</option>
            <option value="Polytechnic">Polytechnic</option>
            <option value="College of Education">College of Education</option>
          </select>
        </div>
      </div>

      {/* Handouts List */}
      {isLoading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 dark:text-slate-400">Loading your academic handouts...</p>
        </div>
      ) : filteredHandouts.length === 0 ? (
        <div className="py-16 px-4 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            {searchQuery ? 'No matching handouts found' : 'No generated handouts yet'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? 'Try adjusting your search query or category filter.'
              : 'Select your institution, course, and topic to generate your first syllabus-aligned academic handout.'}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={onNavigateToGenerator}
              className="mt-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generate Your First Handout
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredHandouts.map((h) => (
            <div
              key={h.id}
              onClick={() => onSelectHandout(h)}
              className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-500/50 dark:hover:border-amber-500/50 transition cursor-pointer flex flex-col justify-between gap-4 shadow-sm hover:shadow-md group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300">
                    {h.course}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(h.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition line-clamp-2">
                  {h.title}
                </h3>

                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-1">
                  Topic: <span className="text-slate-800 dark:text-slate-200">{h.topic}</span>
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-amber-500" />
                    <span className="truncate max-w-[150px]">{h.institution}</span>
                  </span>
                  <span>•</span>
                  <span>{h.level}</span>
                  <span>•</span>
                  <span className="truncate max-w-[120px]">{h.department}</span>
                </div>

                {h.introduction && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 pt-1">
                    {h.introduction}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleDownloadPdf(e, h)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-xs font-medium transition flex items-center gap-1"
                    title="Export as PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, h.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition"
                    title="Delete Handout"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Read & Study <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
