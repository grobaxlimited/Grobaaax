import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  BookOpen,
  GraduationCap,
  Building,
  Layers,
  ChevronRight,
  Search,
  CheckCircle2,
  AlertCircle,
  Crown,
  Zap,
  Lock,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  Clock,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  HandoutInstitutionCategory,
  HANDOUT_INSTITUTION_CATEGORIES,
  getInstitutionsForCategory,
  getFacultiesForCategory,
  getDepartmentsForFaculty,
  getLevelsForCategory,
  getCuratedCoursesForDepartment,
  getSuggestedTopicsForCourse,
} from '../../data/aiHandoutAcademicData';
import {
  GeneratedHandout,
  HandoutUserQuotaInfo,
} from '../../types';
import {
  fetchUserHandoutQuota,
  generateHandoutViaApi,
} from '../../lib/handoutService';
import { resolveUserSubscriptionTier } from '../../lib/campusService';

export interface HandoutPrefillData {
  category?: HandoutInstitutionCategory;
  institution?: string;
  faculty?: string;
  department?: string;
  level?: string;
  course?: string;
  topic?: string;
}

interface HandoutGeneratorViewProps {
  onHandoutGenerated: (handout: GeneratedHandout) => void;
  initialPrefill?: HandoutPrefillData | null;
  onClearPrefill?: () => void;
}

export const HandoutGeneratorView: React.FC<HandoutGeneratorViewProps> = ({
  onHandoutGenerated,
  initialPrefill,
  onClearPrefill,
}) => {
  const { currentUser, userProfile, firebaseUser, isUserSubscribed, openWalletModal } = useApp();

  // Combine user info for robust tier resolution
  const mergedUser = useMemo(() => {
    return { ...(userProfile || {}), ...(currentUser || {}) };
  }, [userProfile, currentUser]);

  // Resolved user subscription tier
  const userTier: 'free' | 'premium' | 'vip' = useMemo(() => {
    return resolveUserSubscriptionTier(mergedUser);
  }, [mergedUser]);

  const effectiveUserId = useMemo(() => {
    return (
      currentUser?.id ||
      currentUser?.uid ||
      firebaseUser?.uid ||
      userProfile?.id ||
      userProfile?.uid ||
      ''
    );
  }, [currentUser?.id, currentUser?.uid, firebaseUser?.uid, userProfile?.id, userProfile?.uid]);

  // Academic Hierarchy Selection States
  const [selectedCategory, setSelectedCategory] = useState<HandoutInstitutionCategory>('University');
  const [institutionSearch, setInstitutionSearch] = useState<string>('');
  const [selectedInstitution, setSelectedInstitution] = useState<string>('');
  const [selectedFaculty, setSelectedFaculty] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [courseInput, setCourseInput] = useState<string>('');
  const [topicInput, setTopicInput] = useState<string>('');
  const [additionalInstruction, setAdditionalInstruction] = useState<string>('');

  // UI / Interaction States
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [quota, setQuota] = useState<HandoutUserQuotaInfo | null>(null);
  const [isLoadingQuota, setIsLoadingQuota] = useState<boolean>(false);

  // Load User Quota
  const loadQuota = async () => {
    if (!effectiveUserId) return;
    setIsLoadingQuota(true);
    try {
      const q = await fetchUserHandoutQuota(
        effectiveUserId,
        userTier,
        mergedUser?.subscriptionExpiry || userProfile?.subscriptionExpiry
      );
      setQuota(q);
    } catch (err) {
      console.warn('Quota load notice:', err);
    } finally {
      setIsLoadingQuota(false);
    }
  };

  useEffect(() => {
    loadQuota();
  }, [effectiveUserId, userTier, mergedUser?.subscriptionExpiry]);

  // Pre-fill Institution from User Profile if available
  useEffect(() => {
    if (userProfile?.institution && !selectedInstitution) {
      const allInsts = getInstitutionsForCategory(selectedCategory);
      const match = allInsts.find(
        (i) =>
          i.name.toLowerCase().includes(userProfile.institution.toLowerCase()) ||
          userProfile.institution.toLowerCase().includes(i.name.toLowerCase()) ||
          i.shortName.toLowerCase() === userProfile.institution.toLowerCase()
      );
      if (match) {
        setSelectedInstitution(match.name);
      } else {
        setSelectedInstitution(userProfile.institution);
      }
    }
  }, [userProfile?.institution, selectedCategory]);

  // Handle incoming prefill from Explore Search or Syllabus Click
  useEffect(() => {
    if (initialPrefill) {
      if (initialPrefill.category) setSelectedCategory(initialPrefill.category);
      if (initialPrefill.institution) setSelectedInstitution(initialPrefill.institution);
      if (initialPrefill.faculty) setSelectedFaculty(initialPrefill.faculty);
      if (initialPrefill.department) setSelectedDepartment(initialPrefill.department);
      if (initialPrefill.level) setSelectedLevel(initialPrefill.level);
      if (initialPrefill.course) setCourseInput(initialPrefill.course);
      if (initialPrefill.topic) setTopicInput(initialPrefill.topic);
    }
  }, [initialPrefill]);

  // Available Institutions for selected category
  const availableInstitutions = useMemo(() => {
    const list = getInstitutionsForCategory(selectedCategory);
    if (!institutionSearch.trim()) return list;
    const term = institutionSearch.toLowerCase();
    return list.filter(
      (inst) =>
        inst.name.toLowerCase().includes(term) ||
        inst.shortName.toLowerCase().includes(term) ||
        inst.state.toLowerCase().includes(term)
    );
  }, [selectedCategory, institutionSearch]);

  // Available Faculties/Schools
  const availableFaculties = useMemo(() => {
    return getFacultiesForCategory(selectedCategory);
  }, [selectedCategory]);

  // Reset dependent fields when Category changes
  const handleCategoryChange = (cat: HandoutInstitutionCategory) => {
    setSelectedCategory(cat);
    setSelectedInstitution('');
    setSelectedFaculty('');
    setSelectedDepartment('');
    setSelectedLevel('');
    setCourseInput('');
    setTopicInput('');
  };

  // Available Departments for chosen Faculty
  const availableDepartments = useMemo(() => {
    if (!selectedFaculty) return [];
    return getDepartmentsForFaculty(selectedCategory, selectedFaculty);
  }, [selectedCategory, selectedFaculty]);

  // Available Levels for Category
  const availableLevels = useMemo(() => {
    return getLevelsForCategory(selectedCategory);
  }, [selectedCategory]);

  // Curated Courses for selected Department
  const curatedCourses = useMemo(() => {
    if (!selectedDepartment) return [];
    return getCuratedCoursesForDepartment(selectedCategory, selectedDepartment, selectedLevel);
  }, [selectedCategory, selectedDepartment, selectedLevel]);

  // Suggested Topics for course
  const suggestedTopics = useMemo(() => {
    if (!courseInput) return [];
    return getSuggestedTopicsForCourse(courseInput);
  }, [courseInput]);

  // Active step sequence for generation loader
  const generationSteps = [
    'Verifying academic curriculum standards (NUC / NBTE / NCCE)...',
    'Analyzing academic faculty & department syllabus...',
    'Synthesizing core conceptual modules & theoretical principles...',
    'Formulating step-by-step worked examples & calculations...',
    'Compiling examination review questions & marking schemes...',
    'Finalizing formatted academic handout...',
  ];

  useEffect(() => {
    let timer: any;
    if (isGenerating) {
      setGenerationStep(0);
      timer = setInterval(() => {
        setGenerationStep((prev) => (prev < generationSteps.length - 1 ? prev + 1 : prev));
      }, 5000);
    }
    return () => clearInterval(timer);
  }, [isGenerating]);

  // Handout Generation Action
  const handleGenerate = async () => {
    if (!effectiveUserId && !currentUser && !firebaseUser) {
      setErrorMessage('Please sign in to generate academic handouts.');
      return;
    }

    if (!selectedInstitution) {
      setErrorMessage('Please select or enter your Institution.');
      return;
    }

    if (!selectedFaculty) {
      setErrorMessage('Please select your Faculty or School.');
      return;
    }

    if (!selectedDepartment) {
      setErrorMessage('Please select your Department.');
      return;
    }

    if (!selectedLevel) {
      setErrorMessage('Please select your Academic Level.');
      return;
    }

    if (!courseInput.trim()) {
      setErrorMessage('Please enter or select the Course code & title.');
      return;
    }

    if (!topicInput.trim()) {
      setErrorMessage('Please specify the exact Topic for the handout.');
      return;
    }

    if (quota && !quota.canGenerate) {
      setErrorMessage(
        userTier === 'free'
          ? "You have reached your free daily generation limit (2 handouts). Upgrade to Premium to generate up to 30 handouts every day!"
          : "You have reached your daily generation limit for today."
      );
      return;
    }

    setErrorMessage(null);
    setIsGenerating(true);

    try {
      const res = await generateHandoutViaApi({
        userId: effectiveUserId,
        userEmail: currentUser?.email || userProfile?.email || '',
        userDisplayName: userProfile?.name || currentUser?.displayName || 'Student',
        tier: userTier,
        subscriptionExpiry: mergedUser?.subscriptionExpiry || userProfile?.subscriptionExpiry,
        institutionType: selectedCategory,
        institution: selectedInstitution,
        faculty: selectedFaculty,
        department: selectedDepartment,
        level: selectedLevel,
        course: courseInput.trim(),
        topic: topicInput.trim(),
        additionalInstruction: additionalInstruction.trim() || undefined,
      });

      if (!res.success || !res.handout) {
        setErrorMessage(res.error || 'AI generation service failed. Please try again.');
        if (res.limitReached) {
          loadQuota();
        }
        return;
      }

      // Update Quota
      if (res.quota) {
        setQuota(res.quota);
      } else {
        loadQuota();
      }

      // Open viewer
      onHandoutGenerated(res.handout);
    } catch (err: any) {
      console.error('Handout generation error:', err);
      setErrorMessage(err?.message || 'An unexpected error occurred during handout generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const currentCategoryMeta = HANDOUT_INSTITUTION_CATEGORIES.find((c) => c.id === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Top Quota / Tier Status Card */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900/5 to-amber-500/5 dark:from-amber-500/10 dark:via-slate-900/40 dark:to-slate-900/20 p-4 sm:p-5 border border-amber-500/20 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold shrink-0 shadow-md shadow-amber-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  AI Academic Handout Generator
                </h2>
                {userTier === 'vip' ? (
                  <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    VIP TITAN • UNLIMITED
                  </span>
                ) : userTier === 'premium' ? (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                    PREMIUM • 30 / DAY
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    FREE SCHOLAR • 2 / DAY
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Generate study-grade, syllabus-aligned handouts tailored to your exact Nigerian institution curriculum.
              </p>
            </div>
          </div>

          {/* Daily Quota Counter Pill */}
          <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
            <div className="text-right">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Daily Allowance</div>
              <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                {quota?.dailyLimit === 'unlimited' ? (
                  <span className="text-emerald-500 flex items-center gap-1 justify-end">
                    <Zap className="w-4 h-4 fill-emerald-500" /> Unlimited
                  </span>
                ) : (
                  <span>
                    <strong className="text-amber-600 dark:text-amber-400">
                      {quota ? quota.todayCount : 0}
                    </strong>{' '}
                    / {quota ? quota.dailyLimit : (userTier === 'premium' ? 30 : 2)}
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1.5">
                      ({quota ? quota.remaining : (userTier === 'premium' ? 30 : 2)} left)
                    </span>
                  </span>
                )}
              </div>
            </div>

            {userTier === 'free' && (
              <button
                type="button"
                onClick={() => openWalletModal('upgrade')}
                className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shadow-sm"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Upgrade</span>
              </button>
            )}

            {userTier === 'premium' && (
              <button
                type="button"
                onClick={() => openWalletModal('upgrade')}
                className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Get VIP</span>
              </button>
            )}
          </div>
        </div>

        {/* Limit Reached Warning Alert */}
        {quota && !quota.canGenerate && (
          <div className="mt-3.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-800 dark:text-rose-200">
            <div className="flex items-start sm:items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <span className="font-bold">
                  Daily Handout Allowance Reached ({quota.todayCount}/{quota.dailyLimit}).
                </span>
                <p className="text-rose-700/80 dark:text-rose-300/80 mt-0.5">
                  {userTier === 'free'
                    ? 'Free accounts have a limit of 2 handouts/day. Upgrade to Premium for 30 daily handouts, or VIP for unlimited access!'
                    : 'Premium scholars have a limit of 30 handouts/day. Upgrade to VIP Titan for unlimited daily generations!'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openWalletModal('upgrade')}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shrink-0 self-start sm:self-auto shadow-sm"
            >
              {userTier === 'free' ? 'Upgrade to Premium (30/day) →' : 'Upgrade to VIP (Unlimited) →'}
            </button>
          </div>
        )}

        {/* Free Tier Callout if Remaining is Low */}
        {userTier === 'free' && quota && quota.canGenerate && typeof quota.remaining === 'number' && quota.remaining <= 1 && (
          <div className="mt-3 pt-3 border-t border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-800 dark:text-amber-300">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Free accounts get 2 handouts per day. Upgrade to Premium for 30 daily handouts!
            </span>
            <button
              type="button"
              onClick={() => openWalletModal('upgrade')}
              className="text-amber-900 dark:text-amber-200 font-bold underline hover:no-underline self-start sm:self-auto"
            >
              Unlock Premium Allowance →
            </button>
          </div>
        )}
      </div>

      {/* Main Generator Form Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Step 1: Category Selector Tabs */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">
            Step 1: Select Institution Category
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {HANDOUT_INSTITUTION_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between gap-1.5 relative overflow-hidden ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/10 text-slate-950 dark:text-white shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm">{cat.shortLabel.toUpperCase()}</span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 line-clamp-1">
                    {cat.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2 & 3: Academic Context Grid */}
        <div className="p-5 sm:p-7 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Institution Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-amber-500" />
                Institution ({selectedCategory})
              </label>

              <div className="relative">
                <select
                  value={selectedInstitution}
                  onChange={(e) => setSelectedInstitution(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                >
                  <option value="">Select your {selectedCategory}...</option>
                  {availableInstitutions.map((inst) => (
                    <option key={inst.id} value={inst.name}>
                      {inst.shortName ? `${inst.shortName} — ` : ''}{inst.name} ({inst.state} State)
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Custom Input if institution is not in dropdown */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-slate-400">Or type custom name:</span>
                <input
                  type="text"
                  placeholder="e.g. Lagos State University"
                  value={selectedInstitution}
                  onChange={(e) => setSelectedInstitution(e.target.value)}
                  className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Academic Level */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-amber-500" />
                Academic Level
              </label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              >
                <option value="">Select Level...</option>
                {availableLevels.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>

            {/* Faculty / School Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                {currentCategoryMeta?.facultyLabel || 'Faculty'} / School
              </label>
              <select
                value={selectedFaculty}
                onChange={(e) => {
                  setSelectedFaculty(e.target.value);
                  setSelectedDepartment('');
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              >
                <option value="">Select {currentCategoryMeta?.facultyLabel || 'Faculty'}...</option>
                {availableFaculties.map((f) => (
                  <option key={f.id} value={f.name}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Department Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                Department
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                disabled={!selectedFaculty}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium disabled:opacity-50"
              >
                <option value="">
                  {selectedFaculty ? 'Select Department...' : `Choose ${currentCategoryMeta?.facultyLabel || 'Faculty'} first...`}
                </option>
                {availableDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Step 4: Course & Topic Input */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Course Input & Suggestions */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Course Code & Title *</span>
                  {curatedCourses.length > 0 && (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-normal">
                      {curatedCourses.length} accredited courses available
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  placeholder="e.g. CSC 201 - Computer Programming I"
                  value={courseInput}
                  onChange={(e) => setCourseInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />

                {/* Quick select course chips */}
                {curatedCourses.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {curatedCourses.slice(0, 4).map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => setCourseInput(`${c.code} - ${c.title}`)}
                        className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
                      >
                        {c.code}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Specific Topic Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Specific Topic to Generate *</span>
                  <span className="text-[11px] text-slate-400 font-normal">Required</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Memory Management & Paging Algorithms"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />

                {/* Quick select suggested topics */}
                {suggestedTopics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {suggestedTopics.slice(0, 3).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTopicInput(t)}
                        className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition truncate max-w-[200px]"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Optional Instructions */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Optional Specific Instructions for AI</span>
                <span className="text-[11px] text-slate-400 font-normal">Optional</span>
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Focus on detailed mathematical derivations with worked examples, explain common exam pitfalls, and include 5 review essay questions."
                value={additionalInstruction}
                onChange={(e) => setAdditionalInstruction(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium resize-none"
              />
            </div>
          </div>

          {/* Error Message if any */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Active Generation Animation Indicator */}
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-3"
            >
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center animate-bounce shadow-lg shadow-amber-500/20">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Synthesizing Academic Handout...
                </h4>
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mt-1 animate-pulse">
                  {generationSteps[generationStep]}
                </p>
              </div>
              <div className="w-full max-w-xs mx-auto bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className="bg-amber-500 h-full rounded-full"
                  initial={{ width: '10%' }}
                  animate={{ width: `${((generationStep + 1) / generationSteps.length) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Please hold on while the server contacts Google Gemini with your Nigerian curriculum syllabus.
              </p>
            </motion.div>
          )}

          {/* Submit Action Button */}
          {!isGenerating && (
            <div className="pt-2 space-y-2">
              {quota && !quota.canGenerate ? (
                <button
                  type="button"
                  onClick={() => openWalletModal('upgrade')}
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-sm sm:text-base transition shadow-md shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  <Crown className="w-5 h-5" />
                  <span>
                    Daily Limit Reached ({quota.todayCount}/{quota.dailyLimit}) • Upgrade to Continue
                  </span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-sm sm:text-base transition shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 group"
                >
                  <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  <span>Generate Academic Handout</span>
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
