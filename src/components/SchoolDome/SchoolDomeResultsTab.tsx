import React, { useState, useEffect, useMemo } from 'react';
import { SchoolDomeSeason } from '../../types';
import { Search } from 'lucide-react';
import { subscribeSchoolDomeSeasons } from '../../lib/schoolDomeService';

interface SchoolDomeResultsTabProps {
  currentSeason: SchoolDomeSeason | null;
}

export const SchoolDomeResultsTab: React.FC<SchoolDomeResultsTabProps> = () => {
  const [seasons, setSeasons] = useState<SchoolDomeSeason[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const unsub = subscribeSchoolDomeSeasons((list) => {
      setSeasons(list);
    });
    return () => unsub();
  }, []);

  // Only completed seasons
  const completedSeasons = useMemo(() => {
    return seasons
      .filter((s) => s.status === 'ended')
      .sort((a, b) => (b.seasonNumber || 0) - (a.seasonNumber || 0));
  }, [seasons]);

  // Search filter for seasons (e.g. "Season 1", "Season 2", "1", "2")
  const displayedSeasons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return completedSeasons;

    return completedSeasons.filter((s) => {
      const seasonTitle = (s.title || '').toLowerCase();
      const seasonName = `season ${s.seasonNumber}`.toLowerCase();
      const seasonNum = String(s.seasonNumber);
      return seasonTitle.includes(q) || seasonName.includes(q) || seasonNum === q;
    });
  }, [completedSeasons, searchQuery]);

  return (
    <div
      id="school-dome-results-page"
      className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-3xl mx-auto w-full space-y-6"
    >
      {/* Search Bar for Seasons */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          id="school-dome-search-season-input"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search season (e.g. Season 1, Season 2)..."
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm text-slate-900 dark:text-white placeholder-slate-400 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
        />
      </div>

      {/* Completed Seasons Results List */}
      <div className="space-y-6">
        {displayedSeasons.length > 0 ? (
          displayedSeasons.map((season) => {
            const seasonLabel = `SEASON ${season.seasonNumber || 1}`;
            const winners = season.winners || [];

            return (
              <div
                key={season.id}
                id={`season-result-${season.id}`}
                className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
              >
                {/* Season Name / Number */}
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                    {seasonLabel}
                  </h2>
                  <p className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400 tracking-wider uppercase mt-1">
                    LAST PEOPLE STANDING
                  </p>
                </div>

                {/* Last People Standing / Winners List */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80 pt-1">
                  {winners.length > 0 ? (
                    winners.map((winner, idx) => {
                      const name = winner.userName || 'Scholar';
                      const institution = winner.institution || 'Verified Higher Institution';
                      const gpEarned = `${(winner.prizeWon || 0).toLocaleString()} GP`;
                      const avatar = winner.avatar;

                      return (
                        <div
                          key={winner.userId || idx}
                          id={`winner-item-${winner.userId || idx}`}
                          className="py-3.5 flex items-center gap-3 sm:gap-4 first:pt-0 last:pb-0"
                        >
                          {/* Profile pic */}
                          <div className="shrink-0">
                            {avatar ? (
                              <img
                                src={avatar}
                                alt={name}
                                className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-2xs"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center font-black text-base shadow-2xs">
                                {name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>

                          {/* Winner Details: Name — Institution — Equal GP */}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white flex items-center flex-wrap gap-x-2 gap-y-0.5">
                              <span className="font-extrabold text-slate-900 dark:text-white">
                                {name}
                              </span>
                              <span className="text-slate-400 dark:text-slate-500">—</span>
                              <span className="text-slate-600 dark:text-slate-300 font-medium">
                                {institution}
                              </span>
                              <span className="text-slate-400 dark:text-slate-500">—</span>
                              <span className="font-black text-amber-600 dark:text-amber-400">
                                {gpEarned}
                              </span>
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400 py-3">
                      No winners recorded for this season.
                    </p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-10 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-sm">
            {searchQuery ? (
              <p>No completed seasons found matching &ldquo;{searchQuery}&rdquo;</p>
            ) : (
              <p>No completed season results yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
