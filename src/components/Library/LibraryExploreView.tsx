import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  BookOpen,
  Sparkles,
  GraduationCap,
  Building,
  Layers,
  ChevronRight,
  Zap,
  ArrowRight,
  CheckCircle2,
  Filter,
  Bookmark,
  ExternalLink,
  Award,
  Check,
  Compass,
} from 'lucide-react';
import {
  ALL_ACADEMIC_FACULTIES,
  SUGGESTED_SEARCH_TOPICS,
  INSTITUTION_CATEGORIES,
  InstitutionCategory,
  CourseItem,
  FacultyData,
} from '../../data/libraryAcademicData';
import { FEATURED_MASTER_HANDOUTS } from '../../data/featuredLibraryHandouts';
import { GeneratedHandout, HandoutInstitutionCategory } from '../../types';

interface FlattenedCourse {
  code: string;
  title: string;
  level: string;
  units?: number;
  description: string;
  coreTopics: string[];
  department: string;
  faculty: string;
  category: InstitutionCategory;
}

interface LibraryExploreViewProps {
  onSelectHandout: (handout: GeneratedHandout) => void;
  onStartGenerateWithContext: (prefill: {
    category?: HandoutInstitutionCategory;
    institution?: string;
    faculty?: string;
    department?: string;
    level?: string;
    course?: string;
    topic?: string;
    autoGenerate?: boolean;
  }) => void;
}

export const LibraryExploreView: React.FC<LibraryExploreViewProps> = ({
  onSelectHandout,
  onStartGenerateWithContext,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFacultyFilter, setSelectedFacultyFilter] = useState<string>('all');
  const [expandedCourseCode, setExpandedCourseCode] = useState<string | null>(null);

  // Flatten all courses across the accredited Nigerian curriculum for universal search
  const allFlattenedCourses: FlattenedCourse[] = useMemo(() => {
    const list: FlattenedCourse[] = [];
    ALL_ACADEMIC_FACULTIES.forEach((fac) => {
      fac.departments.forEach((dept) => {
        dept.courses.forEach((crs) => {
          list.push({
            code: crs.code,
            title: crs.title,
            level: crs.level,
            units: crs.units,
            description: crs.description,
            coreTopics: crs.coreTopics || [],
            department: dept.name,
            faculty: fac.faculty,
            category: fac.category,
          });
        });
      });
    });
    return list;
  }, []);

  // Filtered search results
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allFlattenedCourses.filter((crs) => {
      // Category filter
      if (selectedCategory !== 'all' && crs.category !== selectedCategory) {
        return false;
      }
      // Faculty filter
      if (selectedFacultyFilter !== 'all' && crs.faculty !== selectedFacultyFilter) {
        return false;
      }
      // Query filter
      if (!q) return true;

      const inCode = crs.code.toLowerCase().includes(q);
      const inTitle = crs.title.toLowerCase().includes(q);
      const inDesc = crs.description.toLowerCase().includes(q);
      const inDept = crs.department.toLowerCase().includes(q);
      const inFaculty = crs.faculty.toLowerCase().includes(q);
      const inTopics = crs.coreTopics.some((t) => t.toLowerCase().includes(q));

      return inCode || inTitle || inDesc || inDept || inFaculty || inTopics;
    });
  }, [allFlattenedCourses, searchQuery, selectedCategory, selectedFacultyFilter]);

  // Suggested search prompts
  const popularKeywords = [
    'ELE 201',
    'Induction Motor',
    'Deadlock',
    'CSC 301',
    'Human Rights',
    'Thermodynamics',
    'Contract Law',
    'Biochemistry',
    'Physiology',
    'Transformer',
  ];

  // Map category to HandoutInstitutionCategory
  const toHandoutCategory = (cat: InstitutionCategory): HandoutInstitutionCategory => {
    if (cat === 'Polytechnic') return 'Polytechnic';
    if (cat === 'College of Education') return 'College of Education';
    return 'University';
  };

  return (
    <div className="space-y-8">
      {/* Hero Universal Search Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5" />
            <span>Universal Curriculum & AI Handout Search</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
            Find and Generate Comprehensive Study Handouts for Any Course or Topic
          </h2>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Search our accredited curriculum database across Nigerian Universities, Polytechnics, and Colleges of Education. Search by course code, title, or specific topic to study curated handouts or generate exhaustive, textbook-grade AI handouts on demand.
          </p>

          {/* Search Input Box */}
          <div className="pt-2">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-amber-400 absolute left-4 pointer-events-none" />
              <input
                id="library-universal-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any topic, course code, or syllabus item (e.g. ELE 201, Machine, Deadlock, Bernoulli, Contract Law, Glycolysis)..."
                className="w-full pl-12 pr-10 py-3.5 sm:py-4 rounded-xl bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/20 focus:border-amber-400 text-white placeholder-slate-400 text-sm sm:text-base font-medium outline-none transition shadow-inner backdrop-blur-md"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 p-1 rounded-md text-slate-400 hover:text-white transition text-xs font-bold bg-white/10"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Keyword Quick Tags */}
            <div className="flex items-center gap-2 flex-wrap pt-3 text-xs">
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Popular searches:
              </span>
              {popularKeywords.map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => setSearchQuery(kw)}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-amber-500 hover:text-slate-950 text-slate-300 text-xs font-medium border border-white/10 transition"
                >
                  {kw}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Decorative Background Glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* Featured Master Study Handouts (Instant Reading Shelf) */}
      {!searchQuery && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                  Featured Master Study Handouts
                </h3>
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  Ready to Study
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Curated, multi-module study guides with full derivations, worked examples, formulas, and examiner marking rubrics.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FEATURED_MASTER_HANDOUTS.map((handout) => (
              <div
                key={handout.id}
                className="flex flex-col justify-between rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md hover:border-amber-500/50 transition group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                      {handout.course.split('-')[0].trim()}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {handout.level}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition line-clamp-2">
                    {handout.title}
                  </h4>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3">
                    {handout.introduction}
                  </p>

                  <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                    <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                      <BookOpen className="w-3 h-3 text-amber-500" /> {handout.sections?.length || 0} Modules
                    </span>
                    <span>•</span>
                    <span>{handout.relevantExamples?.length || 0} Calculations</span>
                    <span>•</span>
                    <span>{handout.reviewQuestions?.length || 0} Exam Questions</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => onSelectHandout(handout)}
                    className="w-full py-2 px-3 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white transition text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Read Full Handout Now</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Instant AI Generation Banner for ANY User Search */}
      {searchQuery.trim().length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Instant AI Handout Available
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-950 dark:text-white">
              Want a comprehensive study handout specifically on "{searchQuery.trim()}"?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Our academic engine will generate a 5-6 module study guide with LaTeX formulas, derivations, definitions, worked calculations, and exam questions tailored to your level.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              onStartGenerateWithContext({
                topic: searchQuery.trim(),
                autoGenerate: false,
              })
            }
            className="shrink-0 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow transition"
          >
            <Zap className="w-4 h-4" />
            <span>Generate AI Handout for "{searchQuery.trim().substring(0, 24)}"</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Curriculum Catalog Section */}
      <div className="space-y-4">
        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-500" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Accredited Curriculum Directory ({searchResults.length} Courses Found)
            </h3>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-xs">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-lg font-bold transition whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Categories
            </button>
            {INSTITUTION_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-lg font-bold transition whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat.shortLabel}
              </button>
            ))}
          </div>
        </div>

        {/* Results List */}
        {searchResults.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
            <Search className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              No matching courses in current filter
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              You can still generate a complete, custom AI handout for any topic or course using the generator.
            </p>
            <button
              type="button"
              onClick={() =>
                onStartGenerateWithContext({
                  topic: searchQuery || '',
                  autoGenerate: false,
                })
              }
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate AI Handout for "{searchQuery || 'Custom Topic'}"</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {searchResults.map((course) => {
              const isExpanded = expandedCourseCode === course.code;
              const matchesSearch = searchQuery.trim().toLowerCase();

              return (
                <div
                  key={`${course.category}_${course.code}`}
                  className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    {/* Course Header & Badges */}
                    <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700">
                          {course.code}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          {course.level}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                        {course.category}
                      </span>
                    </div>

                    <h4 className="text-sm sm:text-base font-bold text-slate-950 dark:text-white leading-snug">
                      {course.title}
                    </h4>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                      {course.description}
                    </p>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Department: </span>
                      {course.department}
                    </div>

                    {/* Core Topics Checklist / Tags */}
                    {course.coreTopics && course.coreTopics.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          <span>Syllabus Topics ({course.coreTopics.length}):</span>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedCourseCode(isExpanded ? null : course.code)
                            }
                            className="text-amber-600 dark:text-amber-400 hover:underline"
                          >
                            {isExpanded ? 'Collapse' : 'Show All'}
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {(isExpanded ? course.coreTopics : course.coreTopics.slice(0, 3)).map(
                            (topic, idx) => {
                              const isHighlighted =
                                matchesSearch && topic.toLowerCase().includes(matchesSearch);

                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() =>
                                    onStartGenerateWithContext({
                                      category: toHandoutCategory(course.category),
                                      faculty: course.faculty,
                                      department: course.department,
                                      level: course.level,
                                      course: `${course.code} - ${course.title}`,
                                      topic: topic,
                                      autoGenerate: false,
                                    })
                                  }
                                  title={`Click to generate comprehensive AI handout for "${topic}"`}
                                  className={`text-left px-2.5 py-1 rounded-md text-[11px] transition flex items-center gap-1.5 ${
                                    isHighlighted
                                      ? 'bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-500/40 font-bold'
                                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-400 border border-slate-200/80 dark:border-slate-700'
                                  }`}
                                >
                                  <span className="truncate max-w-[200px] sm:max-w-[240px]">{topic}</span>
                                  <Sparkles className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                                </button>
                              );
                            }
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Course Card Action */}
                  <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">
                      {course.units ? `${course.units} Credit Units` : 'Accredited NUC/NBTE'}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        onStartGenerateWithContext({
                          category: toHandoutCategory(course.category),
                          faculty: course.faculty,
                          department: course.department,
                          level: course.level,
                          course: `${course.code} - ${course.title}`,
                          topic: course.coreTopics[0] || course.title,
                          autoGenerate: false,
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate Handout</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
