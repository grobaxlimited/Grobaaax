import React, { useState, useMemo } from 'react';
import {
  StaticInstitution,
  NIGERIAN_INSTITUTIONS,
  searchNigerianInstitutions,
} from '../../../data/nigerianInstitutions';
import {
  Building2,
  Search,
  Globe,
  ArrowLeft,
  GraduationCap,
  Sparkles,
  Crown,
  ChevronRight,
  MapPin,
  X,
} from 'lucide-react';

interface ConnectOtherSchoolsViewProps {
  onSelectInstitution: (institution: StaticInstitution) => void;
  onBackToHomeSchool: () => void;
  homeInstitutionName: string;
  currentViewingInstitutionName?: string;
}

export const ConnectOtherSchoolsView: React.FC<ConnectOtherSchoolsViewProps> = ({
  onSelectInstitution,
  onBackToHomeSchool,
  homeInstitutionName,
  currentViewingInstitutionName,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    'All' | 'University' | 'Polytechnic' | 'College of Education'
  >('All');

  // Filter institutions using the fast search utility
  const filteredInstitutions = useMemo(() => {
    return searchNigerianInstitutions(searchQuery, selectedCategory);
  }, [searchQuery, selectedCategory]);

  return (
    <div className="space-y-4">
      {/* 1. Header Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            id="back-to-home-school-btn"
            type="button"
            onClick={onBackToHomeSchool}
            className="self-start px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to My School ({homeInstitutionName})</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
              <Crown className="w-3 h-3 text-amber-500" />
              VIP & PRO CAMPUS NETWORK
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Globe className="w-6 h-6 text-amber-500 shrink-0" />
            <span>Connect with Other Campuses</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            Search and select any institution across Nigeria to explore its faculties, academic
            departments, and discover fellow scholars to connect with on WhatsApp.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="search-nigerian-institutions-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search 250+ institutions by name, acronym (e.g., UNILAG, UI, OAU, FUTA, ABU, YABATECH), state..."
            className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500 transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'All', label: 'All Institutions (250+)' },
            { id: 'University', label: 'Universities' },
            { id: 'Polytechnic', label: 'Polytechnics' },
            { id: 'College of Education', label: 'Colleges of Education' },
          ].map((cat) => (
            <button
              key={cat.id}
              id={`filter-cat-${cat.id.toLowerCase().replace(/\s+/g, '-')}`}
              type="button"
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Results Header */}
      <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-500 dark:text-slate-400">
        <span>Showing {filteredInstitutions.length} institutions</span>
        {currentViewingInstitutionName && (
          <span className="text-amber-600 dark:text-amber-400">
            Currently viewing: {currentViewingInstitutionName}
          </span>
        )}
      </div>

      {/* 3. Institutions Grid */}
      {filteredInstitutions.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
            No institution found matching &ldquo;{searchQuery}&rdquo;
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Try searching with a shorter keyword or switch the category filter above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredInstitutions.map((inst) => {
            const isCurrentlyViewed =
              currentViewingInstitutionName &&
              currentViewingInstitutionName.toLowerCase() === inst.name.toLowerCase();
            const isHome =
              homeInstitutionName &&
              homeInstitutionName.toLowerCase() === inst.name.toLowerCase();

            return (
              <div
                key={inst.id}
                id={`inst-card-${inst.id}`}
                onClick={() => onSelectInstitution(inst)}
                className={`group p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  isCurrentlyViewed
                    ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-400 dark:border-amber-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-md'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-2xl p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
                      {inst.logo || '🏛️'}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {inst.shortName}
                      </span>
                      {isHome && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                          My School
                        </span>
                      )}
                      {isCurrentlyViewed && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                          Viewing
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 leading-snug group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-2">
                      {inst.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {inst.state} State
                      </span>
                      <span>•</span>
                      <span>{inst.type}</span>
                      <span>•</span>
                      <span>{inst.category}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-all">
                  <span>Explore Campus &amp; Faculties</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
