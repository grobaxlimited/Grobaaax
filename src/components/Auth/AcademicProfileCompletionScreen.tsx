import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { isUsernameAvailable, completeUserAcademicProfileDoc } from '../../lib/firebase';
import { InstitutionCategory } from '../../types';
import {
  ACADEMIC_STRUCTURE_BY_CATEGORY,
  getFacultiesByCategory,
  getDepartmentsByFaculty,
} from '../../data/academicStructureData';
import {
  NIGERIAN_INSTITUTIONS,
  getNigerianInstitutionsByCategory,
  searchNigerianInstitutions,
  StaticInstitution,
} from '../../data/nigerianInstitutions';
import { ThemeToggle } from '../ui/ThemeToggle';
import {
  GraduationCap,
  Building2,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  Sparkles,
  ArrowRight,
  School,
  Search,
  Check,
  BookOpen,
  PenTool,
  RotateCcw,
} from 'lucide-react';

export const AcademicProfileCompletionScreen: React.FC = () => {
  const { firebaseUser, currentUser, setCurrentUser, logout, login, setActiveTab } = useApp();

  // Form states
  const initialFullName =
    (currentUser?.name && currentUser.name !== 'Alex Chen' && currentUser.name !== 'Scholar' ? currentUser.name : '') ||
    (currentUser?.fullName && currentUser.fullName !== 'Alex Chen' && currentUser.fullName !== 'Scholar' ? currentUser.fullName : '') ||
    firebaseUser?.displayName ||
    '';

  const [fullName, setFullName] = useState(initialFullName);

  const initialUsername =
    currentUser?.username && currentUser.username !== 'scholar' && currentUser.username !== 'alex_chen_mit'
      ? currentUser.username.replace(/^@/, '')
      : (firebaseUser?.displayName
          ? firebaseUser.displayName.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20)
          : (firebaseUser?.email?.split('@')[0] || `scholar_${firebaseUser?.uid?.substring(0, 5) || '01'}`)
        ).replace(/[^a-zA-Z0-9_]/g, '');

  const [username, setUsername] = useState(initialUsername);
  const [instCategory, setInstCategory] = useState<InstitutionCategory>('University');
  
  // Institution selection states
  const [isCustomInst, setIsCustomInst] = useState(false);
  const [customInstName, setCustomInstName] = useState('');
  const [customInstState, setCustomInstState] = useState('');
  const [selectedInstId, setSelectedInstId] = useState('');
  const [selectedInstName, setSelectedInstName] = useState('');
  const [selectedInstObj, setSelectedInstObj] = useState<StaticInstitution | null>(null);

  // Academic Level state
  const [selectedLevel, setSelectedLevel] = useState<string>('100 Level');

  // Search filter for static institutions list
  const [institutionSearchQuery, setInstitutionSearchQuery] = useState('');

  // Faculty & Department states
  const [selectedFaculty, setSelectedFaculty] = useState<string>('');
  const [customFaculty, setCustomFaculty] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [customDepartment, setCustomDepartment] = useState<string>('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Username validation
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [isUsernameValid, setIsUsernameValid] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState('');

  // Error message
  const [errorMessage, setErrorMessage] = useState('');

  // Check username uniqueness
  useEffect(() => {
    if (!username.trim()) {
      setIsUsernameValid(null);
      setUsernameError('');
      return;
    }

    if (username.trim().length < 3) {
      setIsUsernameValid(false);
      setUsernameError('Username must be at least 3 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      setIsUsernameValid(false);
      setUsernameError('Username can only contain letters, numbers, and underscores');
      return;
    }

    const timer = setTimeout(async () => {
      setUsernameChecking(true);
      const available = await isUsernameAvailable(username, firebaseUser?.uid);
      setUsernameChecking(false);
      setIsUsernameValid(available);
      if (!available) {
        setUsernameError('This username is already taken. Please choose another.');
      } else {
        setUsernameError('');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, firebaseUser?.uid]);

  // When Category changes, reset selection and set default level
  useEffect(() => {
    setSelectedInstId('');
    setSelectedInstName('');
    setSelectedInstObj(null);
    setIsCustomInst(false);
    setCustomInstName('');
    setCustomInstState('');
    setSelectedFaculty('');
    setCustomFaculty('');
    setSelectedDepartment('');
    setCustomDepartment('');
    setInstitutionSearchQuery('');

    if (instCategory === 'Polytechnic') {
      setSelectedLevel('ND 1');
    } else if (instCategory === 'College of Education') {
      setSelectedLevel('NCE 1');
    } else {
      setSelectedLevel('100 Level');
    }
  }, [instCategory]);

  // Filtered Nigerian Institutions from local static dataset
  const filteredInstitutions = searchNigerianInstitutions(institutionSearchQuery, instCategory);

  // Available faculties for selected category
  const availableFaculties = getFacultiesByCategory(instCategory);

  // Available departments for selected faculty
  const availableDepartments =
    selectedFaculty && selectedFaculty !== 'OTHER_CUSTOM'
      ? getDepartmentsByFaculty(instCategory, selectedFaculty)
      : [];

  const handleSelectInstitution = (inst: StaticInstitution) => {
    setIsCustomInst(false);
    setCustomInstName('');
    setSelectedInstId(inst.id);
    setSelectedInstName(inst.name);
    setSelectedInstObj(inst);
  };

  const handleEnableCustomInstitution = () => {
    setIsCustomInst(true);
    setSelectedInstId(`inst_custom_${Date.now()}`);
    setSelectedInstObj(null);
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!firebaseUser) {
      setErrorMessage('User session expired. Please sign in again.');
      return;
    }

    if (!fullName.trim()) {
      setErrorMessage('Please provide your real full name.');
      return;
    }

    if (!username.trim()) {
      setErrorMessage('Please provide a unique username.');
      return;
    }

    if (isUsernameValid === false) {
      setErrorMessage('Please select a valid, available username before submitting.');
      return;
    }

    const resolvedInstName = isCustomInst ? customInstName.trim() : selectedInstName.trim();
    if (!resolvedInstName) {
      setErrorMessage('Please select or enter your institution name.');
      return;
    }

    const resolvedFacultyName =
      selectedFaculty === 'OTHER_CUSTOM' ? customFaculty.trim() : selectedFaculty.trim();
    if (!resolvedFacultyName) {
      setErrorMessage(
        `Please select or specify your ${instCategory === 'University' ? 'Faculty' : 'School'}.`
      );
      return;
    }

    const resolvedDeptName =
      selectedDepartment === 'OTHER_CUSTOM' || selectedFaculty === 'OTHER_CUSTOM'
        ? customDepartment.trim()
        : (selectedDepartment || customDepartment).trim();

    if (!resolvedDeptName) {
      setErrorMessage('Please select or specify your Department / Course of study.');
      return;
    }

    const resolvedInstId = isCustomInst
      ? `custom_${resolvedInstName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30)}`
      : selectedInstId;

    setIsSubmitting(true);

    try {
      const selectedFacultyObj = availableFaculties.find(
        (f) => f.name === selectedFaculty || f.id === selectedFaculty
      );

      // Set local persistent flag immediately
      try {
        localStorage.setItem(`grobax_academic_completed_${firebaseUser.uid}`, 'true');
      } catch (_) {}

      const updatedProfile = await completeUserAcademicProfileDoc(firebaseUser.uid, {
        fullName: fullName.trim(),
        username: username.trim(),
        email: firebaseUser.email || currentUser?.email || '',
        institutionCategory: instCategory,
        institutionId: resolvedInstId,
        institutionName: resolvedInstName,
        facultyId: selectedFacultyObj?.id || 'custom_faculty',
        facultyName: resolvedFacultyName,
        faculty: resolvedFacultyName,
        departmentName: resolvedDeptName,
        level: selectedLevel,
        profileImage: firebaseUser.photoURL || currentUser?.avatar || undefined,
      });

      try {
        localStorage.setItem(`grobax_academic_completed_${firebaseUser.uid}`, 'true');
        localStorage.setItem(`grobax_user_profile_${firebaseUser.uid}`, JSON.stringify(updatedProfile));
      } catch (_) {}

      login(updatedProfile);
      setCurrentUser((prev: any) => ({
        ...prev,
        ...updatedProfile,
        academicProfileCompleted: true,
        institution: resolvedInstName,
        institutionName: resolvedInstName,
        faculty: resolvedFacultyName,
        department: resolvedDeptName,
        level: selectedLevel,
      }));
      setActiveTab('home');
    } catch (err: any) {
      console.error('Error saving academic profile:', err);
      setErrorMessage(err.message || 'Failed to save academic profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryLabel = instCategory === 'University' ? 'Faculty' : 'School';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white relative overflow-hidden font-sans transition-colors duration-200">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-blue-500/15 dark:bg-blue-600/20 blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-5 flex items-center justify-between relative z-10 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              GROBAAX
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-800 uppercase tracking-widest">
                ACADEMIC PROFILE
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => logout()}
            className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-900 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10 flex-1">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl p-6 sm:p-10 space-y-8">
          {/* Header Title Section */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300 text-xs font-bold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-300" />
              <span>Academic Profile Setup</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Complete Your Student Profile
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto font-medium">
              Select or type your institution, faculty, and department to join inter-institutional challenges and live student arenas.
            </p>

            {/* Authenticated Account Info Box */}
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-left">
              <img
                src={
                  firebaseUser?.photoURL ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${firebaseUser?.uid || 'user'}`
                }
                alt="Avatar"
                className="w-9 h-9 rounded-full ring-2 ring-blue-500/30 object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="text-xs">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{firebaseUser?.displayName || fullName || 'Scholar'}</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded font-black">
                    AUTHENTICATED
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  {firebaseUser?.email || ''}
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {errorMessage && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-3 animate-in fade-in">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Basic Identity Row: Full Name & Username */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Full Name</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Oluwaseun Adeleke"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span>@</span>
                    <span>Unique Username</span>
                    <span className="text-rose-500">*</span>
                  </span>
                  {usernameChecking && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" /> Checking...
                    </span>
                  )}
                  {!usernameChecking && isUsernameValid === true && (
                    <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" /> Available
                    </span>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                    @
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="oluwaseun_ui"
                    required
                    maxLength={20}
                    className={`w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border text-xs font-medium outline-none transition ${
                      isUsernameValid === false
                        ? 'border-rose-400 focus:ring-2 focus:ring-rose-500'
                        : isUsernameValid === true
                        ? 'border-emerald-400 focus:ring-2 focus:ring-emerald-500'
                        : 'border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500'
                    }`}
                  />
                </div>
                {usernameError && (
                  <p className="text-[10px] text-rose-500 font-semibold">{usernameError}</p>
                )}
              </div>
            </div>

            {/* Institution Category Segmented Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <School className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Institution Type</span>
                <span className="text-rose-500">*</span>
              </label>

              <div className="grid grid-cols-3 gap-2">
                {(['University', 'Polytechnic', 'College of Education'] as InstitutionCategory[]).map((cat) => {
                  const isSelected = instCategory === cat;
                  return (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setInstCategory(cat)}
                      className={`p-3 rounded-2xl text-xs font-black transition-all flex flex-col items-center gap-1 cursor-pointer border ${
                        isSelected
                          ? 'bg-blue-900 text-white shadow-md shadow-blue-950/30 border-blue-700 ring-2 ring-blue-500/50'
                          : 'bg-slate-50 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-base">
                        {cat === 'University' ? '🎓' : cat === 'Polytechnic' ? '⚙️' : '📚'}
                      </span>
                      <span className="truncate">{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Institution Section: Selection or Custom Typing */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Your Nigerian Institution</span>
                  <span className="text-rose-500">*</span>
                </label>

                {/* Toggle between Directory Selection and Custom Typing */}
                <button
                  type="button"
                  onClick={() => {
                    if (isCustomInst) {
                      setIsCustomInst(false);
                      setCustomInstName('');
                    } else {
                      handleEnableCustomInstitution();
                    }
                  }}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {isCustomInst ? (
                    <>
                      <RotateCcw className="w-3 h-3" />
                      <span>Choose from Directory</span>
                    </>
                  ) : (
                    <>
                      <PenTool className="w-3 h-3" />
                      <span>Can't find school? Type it</span>
                    </>
                  )}
                </button>
              </div>

              {isCustomInst ? (
                /* Custom Institution Name Inputs */
                <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-3 animate-in fade-in">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Type Your Institution's Full Name:
                    </label>
                    <input
                      type="text"
                      value={customInstName}
                      onChange={(e) => setCustomInstName(e.target.value)}
                      placeholder="e.g. Nigerian Army University, Biu or Mewar International University"
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        State / Location (Optional):
                      </label>
                      <input
                        type="text"
                        value={customInstState}
                        onChange={(e) => setCustomInstState(e.target.value)}
                        placeholder="e.g. Kano, Abuja, Lagos"
                        className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        Category Mode:
                      </label>
                      <div className="px-3.5 py-2 rounded-xl bg-white/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-blue-600 dark:text-blue-400">
                        ✍️ Custom {instCategory}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Standard Directory Search & Select */
                <div className="space-y-2">
                  {/* Search Bar for Institutions */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={institutionSearchQuery}
                      onChange={(e) => setInstitutionSearchQuery(e.target.value)}
                      placeholder={`Search ${filteredInstitutions.length}+ ${instCategory}s by name, acronym (e.g. UNILAG, FUTA), or state...`}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Scrollable Institution List */}
                  <div className="max-h-52 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 divide-y divide-slate-100 dark:divide-slate-800/60 shadow-inner">
                    {filteredInstitutions.length === 0 ? (
                      <div className="p-5 text-center space-y-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          No {instCategory} found matching "{institutionSearchQuery}".
                        </p>
                        <button
                          type="button"
                          onClick={handleEnableCustomInstitution}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <PenTool className="w-3.5 h-3.5" />
                          <span>Type "{institutionSearchQuery || 'My School'}" Manually</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        {filteredInstitutions.map((inst) => {
                          const isSelected = selectedInstId === inst.id;
                          return (
                            <button
                              type="button"
                              key={inst.id}
                              onClick={() => handleSelectInstitution(inst)}
                              className={`w-full p-3 text-left text-xs flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-500/15 text-blue-900 dark:text-blue-200 font-bold'
                                  : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-base shrink-0">{inst.logo}</span>
                                <div className="truncate">
                                  <div className="font-bold truncate">{inst.name}</div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                    {inst.shortName} • {inst.state} State ({inst.type})
                                  </div>
                                </div>
                              </div>
                              {isSelected && (
                                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                                  <Check className="w-3 h-3" />
                                </div>
                              )}
                            </button>
                          );
                        })}

                        {/* Direct option to type custom inside the list */}
                        <button
                          type="button"
                          onClick={handleEnableCustomInstitution}
                          className="w-full p-3 text-left text-xs flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-bold border-t border-dashed border-slate-200 dark:border-slate-800 cursor-pointer"
                        >
                          <PenTool className="w-3.5 h-3.5 shrink-0" />
                          <span>Can't find your school? Click here to type your custom institution name</span>
                        </button>
                      </>
                    )}
                  </div>

                  {/* Active Selection Badge */}
                  {selectedInstName && !isCustomInst && (
                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-center justify-between text-xs font-semibold text-blue-900 dark:text-blue-300">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-base">{selectedInstObj?.logo || '🏛️'}</span>
                        <span className="truncate">
                          Selected: <strong>{selectedInstName}</strong>
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 bg-blue-600 text-white rounded-full font-bold shrink-0">
                        Confirmed
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Academic Structure: Faculty & Department */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Faculty / School Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>{categoryLabel}</span>
                      <span className="text-rose-500">*</span>
                    </span>
                    {selectedFaculty === 'OTHER_CUSTOM' && (
                      <span className="text-[10px] text-blue-600 font-bold">Custom</span>
                    )}
                  </label>
                  <select
                    value={selectedFaculty}
                    onChange={(e) => {
                      setSelectedFaculty(e.target.value);
                      setSelectedDepartment('');
                      setCustomDepartment('');
                    }}
                    required
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none transition"
                  >
                    <option value="">-- Select {categoryLabel} --</option>
                    {availableFaculties.map((fac) => (
                      <option key={fac.id} value={fac.name}>
                        {fac.icon} {fac.name}
                      </option>
                    ))}
                    <option value="OTHER_CUSTOM">✍️ Other (Type Custom {categoryLabel})</option>
                  </select>
                </div>

                {/* Department Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <School className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Department / Course</span>
                      <span className="text-rose-500">*</span>
                    </span>
                    {selectedDepartment === 'OTHER_CUSTOM' && (
                      <span className="text-[10px] text-blue-600 font-bold">Custom</span>
                    )}
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    required
                    disabled={!selectedFaculty}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none transition disabled:opacity-50"
                  >
                    <option value="">
                      {selectedFaculty === 'OTHER_CUSTOM'
                        ? '✍️ Type Custom Department Below'
                        : selectedFaculty
                        ? '-- Select Department --'
                        : `-- First select ${categoryLabel} --`}
                    </option>
                    {availableDepartments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                    <option value="OTHER_CUSTOM">✍️ Other (Type Custom Department)</option>
                  </select>
                </div>
              </div>

              {/* Custom Faculty Input if "Other" selected */}
              {selectedFaculty === 'OTHER_CUSTOM' && (
                <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 animate-in fade-in">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <PenTool className="w-3 h-3 text-blue-600" />
                    <span>Type Your Exact {categoryLabel} Name:</span>
                  </label>
                  <input
                    type="text"
                    value={customFaculty}
                    onChange={(e) => setCustomFaculty(e.target.value)}
                    placeholder={`e.g. ${categoryLabel} of Environmental Sciences`}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none transition"
                  />
                </div>
              )}

              {/* Custom Department Input if "Other" or custom faculty selected */}
              {(selectedDepartment === 'OTHER_CUSTOM' || selectedFaculty === 'OTHER_CUSTOM') && (
                <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 animate-in fade-in">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <PenTool className="w-3 h-3 text-blue-600" />
                    <span>Type Your Exact Department / Course Name:</span>
                  </label>
                  <input
                    type="text"
                    value={customDepartment}
                    onChange={(e) => setCustomDepartment(e.target.value)}
                    placeholder="e.g. Cyber Security & Digital Forensics"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none transition"
                  />
                </div>
              )}
            </div>

            {/* Academic Level Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Academic Level</span>
                <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none transition"
              >
                {instCategory === 'Polytechnic' ? (
                  <>
                    <option value="ND 1">ND 1 (National Diploma 1)</option>
                    <option value="ND 2">ND 2 (National Diploma 2)</option>
                    <option value="HND 1">HND 1 (Higher National Diploma 1)</option>
                    <option value="HND 2">HND 2 (Higher National Diploma 2)</option>
                    <option value="Post-Grad">Post-Graduate / Professional</option>
                  </>
                ) : instCategory === 'College of Education' ? (
                  <>
                    <option value="NCE 1">NCE 1 (Nigeria Certificate in Education 1)</option>
                    <option value="NCE 2">NCE 2 (Nigeria Certificate in Education 2)</option>
                    <option value="NCE 3">NCE 3 (Nigeria Certificate in Education 3)</option>
                    <option value="Post-Grad">Post-Graduate / Professional</option>
                  </>
                ) : (
                  <>
                    <option value="100 Level">100 Level (Freshman / Year 1)</option>
                    <option value="200 Level">200 Level (Sophomore / Year 2)</option>
                    <option value="300 Level">300 Level (Junior / Year 3)</option>
                    <option value="400 Level">400 Level (Senior / Year 4)</option>
                    <option value="500 Level">500 Level (Finalist / Year 5)</option>
                    <option value="600 Level">600 Level (Medicine / Vet / Year 6)</option>
                    <option value="Post-Grad">Post-Graduate / Master's / PhD</option>
                  </>
                )}
              </select>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  (!isCustomInst && !selectedInstName) ||
                  (isCustomInst && !customInstName.trim()) ||
                  isUsernameValid === false
                }
                className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Academic Setup & Enter Grobaax</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] text-slate-400 dark:text-slate-600 border-t border-slate-200/50 dark:border-slate-800/50">
        ©2023 Grobaaxylimited • Inter-Institutional Arena
      </footer>
    </div>
  );
};
