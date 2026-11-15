import React, { useEffect, useMemo, useState } from 'react';
import { CampusSkillCategory } from '../../../types';
import { DEFAULT_CAMPUS_SKILL_CATEGORIES } from '../../../data/campusSkillsData';
import { fetchCampusSkillCategories } from '../../../lib/campusService';
import { Check, Search, Sparkles, X } from 'lucide-react';

interface CampusSkillsSelectorProps {
  selectedSkillNames: string[];
  selectedSkillIds?: string[];
  onChange: (skillIds: string[], skillNames: string[]) => void;
  allowSkip?: boolean;
  onSkip?: () => void;
  compact?: boolean;
}

export const CampusSkillsSelector: React.FC<CampusSkillsSelectorProps> = ({
  selectedSkillNames,
  selectedSkillIds = [],
  onChange,
  allowSkip = false,
  onSkip,
  compact = false,
}) => {
  const [categories, setCategories] = useState<CampusSkillCategory[]>(DEFAULT_CAMPUS_SKILL_CATEGORIES);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeGroup, setActiveGroup] = useState<string>('All');

  useEffect(() => {
    let mounted = true;
    fetchCampusSkillCategories()
      .then((list) => {
        if (mounted && Array.isArray(list) && list.length > 0) {
          setCategories(list.filter((c) => c.isActive !== false));
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const groups = useMemo(() => {
    const unique = Array.from(new Set(categories.map((c) => c.groupName || 'General Skills')));
    return ['All', ...unique];
  }, [categories]);

  const selectedNameSet = useMemo(
    () => new Set((selectedSkillNames || []).map((s) => s.trim().toLowerCase())),
    [selectedSkillNames]
  );

  const selectedIdSet = useMemo(
    () => new Set((selectedSkillIds || []).map((id) => id.trim())),
    [selectedSkillIds]
  );

  const isSkillSelected = (cat: CampusSkillCategory) => {
    return selectedIdSet.has(cat.id) || selectedNameSet.has(cat.name.trim().toLowerCase());
  };

  const filteredCategories = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return categories.filter((cat) => {
      const matchesGroup = activeGroup === 'All' || (cat.groupName || 'General Skills') === activeGroup;
      const matchesSearch =
        !q ||
        cat.name.toLowerCase().includes(q) ||
        (cat.groupName || '').toLowerCase().includes(q);
      return matchesGroup && matchesSearch;
    });
  }, [categories, activeGroup, searchTerm]);

  const toggleSkill = (cat: CampusSkillCategory) => {
    const currentlySelected = isSkillSelected(cat);
    const nextNamesSet = new Set(selectedSkillNames || []);
    const nextIdsSet = new Set(selectedSkillIds || []);

    if (currentlySelected) {
      // Remove both exact id and matching name case-insensitively
      for (const existing of Array.from(nextNamesSet)) {
        if (existing.trim().toLowerCase() === cat.name.trim().toLowerCase()) {
          nextNamesSet.delete(existing);
        }
      }
      nextIdsSet.delete(cat.id);
    } else {
      nextNamesSet.add(cat.name);
      nextIdsSet.add(cat.id);
    }

    onChange(Array.from(nextIdsSet), Array.from(nextNamesSet));
  };

  const handleClearAll = () => {
    onChange([], []);
    if (onSkip) onSkip();
  };

  return (
    <div className="space-y-3">
      {/* Header row with count & skip/clear action */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Your Skills</span>
          </span>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            ({selectedSkillNames.length} selected{allowSkip ? ' · Optional' : ''})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {selectedSkillNames.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] font-bold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors cursor-pointer"
            >
              Clear selection
            </button>
          )}
          {allowSkip && onSkip && (
            <button
              type="button"
              onClick={handleClearAll}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              Skip Skills
            </button>
          )}
        </div>
      </div>

      {/* Selected preview bar */}
      {selectedSkillNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60">
          {selectedSkillNames.map((name) => {
            const matchedCat = categories.find(
              (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase()
            );
            return (
              <button
                key={name}
                type="button"
                onClick={() =>
                  matchedCat
                    ? toggleSkill(matchedCat)
                    : onChange(
                        selectedSkillIds,
                        selectedSkillNames.filter((n) => n !== name)
                      )
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 transition-colors cursor-pointer"
                title="Click to remove"
              >
                <span>{name}</span>
                <X className="w-3 h-3 opacity-80" />
              </button>
            );
          })}
        </div>
      )}

      {/* Search skills input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search skills (e.g., Graphic Design, Web Dev, Tailoring...)"
          className="w-full pl-8 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Category group tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {groups.map((grp) => (
          <button
            key={grp}
            type="button"
            onClick={() => setActiveGroup(grp)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
              activeGroup === grp
                ? 'bg-slate-900 text-white dark:bg-blue-600 dark:text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {grp}
          </button>
        ))}
      </div>

      {/* Multi-select grid */}
      <div
        className={`grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto pr-1 ${
          compact ? 'max-h-44' : 'max-h-56'
        }`}
      >
        {filteredCategories.map((cat) => {
          const active = isSkillSelected(cat);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => toggleSkill(cat)}
              className={`px-2.5 py-2 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between gap-1.5 cursor-pointer ${
                active
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500'
              }`}
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="shrink-0 text-sm leading-none">{cat.icon || '✨'}</span>
                <span className="truncate">{cat.name}</span>
              </span>
              {active && <Check className="w-3.5 h-3.5 shrink-0 text-white" />}
            </button>
          );
        })}

        {filteredCategories.length === 0 && (
          <div className="col-span-full py-4 text-center text-xs text-slate-500 dark:text-slate-400">
            No skills match &ldquo;{searchTerm}&rdquo;.
          </div>
        )}
      </div>
    </div>
  );
};
