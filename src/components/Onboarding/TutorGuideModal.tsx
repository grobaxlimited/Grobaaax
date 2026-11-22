import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ArrowLeft,
  ArrowRight,
  Pause,
  Play,
  Compass,
  ShoppingBag,
  Calendar,
  Swords,
  Users,
  Trophy,
  Wallet,
  ExternalLink,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  SceneWelcomeNavigation,
  SceneCoreSections,
  SceneOfficialEvents,
  SceneSchoolDomeRegister,
  SceneArenaContenders,
  SceneArenaResultsRules,
  SceneWalletProfile,
} from './visuals/TutorGuideScenes';

interface TutorGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GuideStep {
  id: string;
  shortLabel: string;
  category: string;
  title: string;
  summary: string;
  bullets: string[];
  actionLabel?: string;
  onAction?: () => void;
  renderScene: (isPlaying: boolean) => React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}

export const TutorGuideModal: React.FC<TutorGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { setActiveTab, navigateToCommunitySubTab, openWalletModal } = useApp();

  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  // Reset to step 0 and resume animation whenever freshly opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setIsPlaying(true);
    }
  }, [isOpen]);

  const jumpAndClose = useCallback(
    (action: () => void) => {
      onClose();
      setTimeout(() => {
        action();
      }, 60);
    },
    [onClose]
  );

  const steps: GuideStep[] = [
    {
      id: 'welcome-nav',
      shortLabel: 'Overview',
      category: '1 · PLATFORM NAVIGATION',
      title: 'Welcome to Grobaax & Top Navigation',
      summary:
        'Everything starts from your top navigation bar and Welcome banner. Switch between Home, School Dome, Hints, School Blog, Community, Notifications, and your GP Wallet in one tap.',
      bullets: [
        'Use the top icons anytime to jump between arenas and campus hubs.',
        'Tap "Explore Competitions" on the Welcome card to enter live competitions.',
        'Watch the Sponsor Ticker below the top bar for verified campus announcements.',
      ],
      actionLabel: 'Explore Competitions',
      onAction: () => jumpAndClose(() => setActiveTab('school_dome')),
      renderScene: (playing) => <SceneWelcomeNavigation isPlaying={playing} />,
      icon: Compass,
    },
    {
      id: 'core-sections',
      shortLabel: 'Sections',
      category: '2 · CORE CAMPUS HUBS',
      title: 'Mini Mart, Campus, Hints & School Blog',
      summary:
        'Each Home card unlocks a dedicated student service built to help you trade safely, network across institutions, prepare for competitions, and earn GP.',
      bullets: [
        'Mini Mart & Skills: Buy or sell textbooks, gadgets, and campus freelance services.',
        'Campus: Connect with verified students across institutions on WhatsApp.',
        'Hints (Strategy): Access official syllabus breakdowns & School Dome clues.',
        'School Blog: Read verified campus news or publish stories to earn GP rewards.',
      ],
      actionLabel: 'Open Mini Mart',
      onAction: () => jumpAndClose(() => navigateToCommunitySubTab('minimart')),
      renderScene: (playing) => <SceneCoreSections isPlaying={playing} />,
      icon: ShoppingBag,
    },
    {
      id: 'official-events',
      shortLabel: 'Events',
      category: '3 · OFFICIAL CAMPUS EVENTS',
      title: 'Discover Tournaments & Enter Arenas',
      summary:
        'Scroll down Home to browse Official Campus Events hosted by the Global Academic Directorate—filter by category, inspect rules, or launch right into a live tournament.',
      bullets: [
        'Filter between All Events, School Dome, Championship, and Olympiads.',
        'Tap "Details" on any event card to view dates, hosts, and eligibility.',
        'Tap "Enter School Dome Arena" to join the active competitive season.',
      ],
      actionLabel: 'View School Dome',
      onAction: () => jumpAndClose(() => setActiveTab('school_dome')),
      renderScene: (playing) => <SceneOfficialEvents isPlaying={playing} />,
      icon: Calendar,
    },
    {
      id: 'dome-register',
      shortLabel: 'Register',
      category: '4 · SCHOOL DOME ARENA',
      title: 'Register Early & Compete Before Time Runs Out',
      summary:
        'Inside School Dome, register before Question #1 launches. Once live elimination begins, submit accurate answers within the countdown timer to remain standing.',
      bullets: [
        'Tap "Register to Compete" in the arena banner before Question #1 drops.',
        'A green banner confirms: "You are Registered for Season #...".',
        'Answer pinned elimination questions accurately before the timer hits zero.',
      ],
      actionLabel: 'Open School Dome',
      onAction: () => jumpAndClose(() => setActiveTab('school_dome')),
      renderScene: (playing) => <SceneSchoolDomeRegister isPlaying={playing} />,
      icon: Swords,
    },
    {
      id: 'dome-contenders',
      shortLabel: 'Contenders',
      category: '5 · CONTENDERS & STANDINGS',
      title: 'Inspect Live Contenders, Standing & Knockouts',
      summary:
        'Tap the People Counter button in the School Dome header to see everyone registered, who is still Standing, who was Knocked Out, and the live GP share per survivor.',
      bullets: [
        'Look for the people icon with the live counter in the #school-dome top bar.',
        'Switch between Standing, Knocked Out, and All Enrolled rosters.',
        'Track your own survival status and projected prize pool payout in real time.',
      ],
      actionLabel: 'Go to Arena Header',
      onAction: () => jumpAndClose(() => setActiveTab('school_dome')),
      renderScene: (playing) => <SceneArenaContenders isPlaying={playing} />,
      icon: Users,
    },
    {
      id: 'dome-results-rules',
      shortLabel: 'Results & Rules',
      category: '6 · CHAMPIONS & OFFICIAL RULES',
      title: 'Check Past Winners & Official Arena Rules',
      summary:
        'Toggle the Trophy icon in the School Dome header to inspect Season Results, or tap the Rules Scroll icon on the right to verify prize distribution and elimination rules.',
      bullets: [
        'Tap the Trophy icon beside the live toggle to view Last People Standing winners.',
        'Search any completed season (e.g. "Season 1") to inspect scholar payouts.',
        'Tap the Scroll Rules icon to read Equal Prize Pool & Elimination criteria.',
      ],
      actionLabel: 'View Season Results',
      onAction: () => jumpAndClose(() => setActiveTab('school_dome_results')),
      renderScene: (playing) => <SceneArenaResultsRules isPlaying={playing} />,
      icon: Trophy,
    },
    {
      id: 'wallet-profile',
      shortLabel: 'Wallet & GP',
      category: '7 · WALLET & ACCOUNT HUB',
      title: 'Manage Your GP Balance, VTU & Withdrawals',
      summary:
        'Click your GP Balance pill at the top-right corner anytime to open your Wallet & Profile Hub—redeem 24/7 airtime & data, withdraw to your bank, or upgrade tiers.',
      bullets: [
        'Every 1 GP equals ₦1 value across campus services and cash-outs.',
        'Redeem MTN, Airtel, Glo & 9mobile airtime and data bundles 24/7.',
        'Upgrade to Premium or VIP tiers for full School Dome & Bonus Spin access.',
      ],
      actionLabel: 'Open Wallet Hub',
      onAction: () => jumpAndClose(() => openWalletModal('airtime_data')),
      renderScene: (playing) => <SceneWalletProfile isPlaying={playing} />,
      icon: Wallet,
    },
  ];

  const totalSteps = steps.length;
  const activeStep = steps[currentStep] || steps[0];

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      onClose();
    }
  }, [currentStep, totalSteps, onClose]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  // Body scroll lock & keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose, handleNext, handlePrev]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      id="grobaax-tutor-guide-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutor-guide-title"
      className="fixed inset-0 z-[9998] flex items-center justify-center p-2.5 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
      onTouchStart={(e) => {
        setTouchEndX(null);
        setTouchStartX(e.targetTouches[0].clientX);
      }}
      onTouchMove={(e) => setTouchEndX(e.targetTouches[0].clientX)}
      onTouchEnd={() => {
        if (touchStartX === null || touchEndX === null) return;
        const dist = touchStartX - touchEndX;
        if (dist > 55) handleNext();
        else if (dist < -55) handlePrev();
      }}
    >
      <div
        id="grobaax-tutor-guide-card"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] text-slate-900 dark:text-white"
      >
        {/* Top Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-gradient-to-r from-[#0d3fa8] via-[#104ec7] to-[#1c64e6] text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-[#ffbe1a]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                  Interactive Tutor Guide
                </span>
                <span className="text-[10px] font-bold text-blue-100/80">
                  • Step {currentStep + 1} of {totalSteps}
                </span>
              </div>
              <h2
                id="tutor-guide-title"
                className="text-sm sm:text-base font-black tracking-tight truncate"
              >
                {activeStep.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title={isPlaying ? 'Pause animation' : 'Play animation'}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden sm:inline">Play</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Tutor Guide"
              className="min-h-[38px] min-w-[38px] rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition cursor-pointer"
              title="Close Tutor Guide (reopen anytime via Tutor Guide button)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step Navigation Strip */}
        <div className="px-4 sm:px-6 py-2 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {steps.map((step, idx) => {
            const StepIcon = step.icon;
            const isCurrent = idx === currentStep;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStep(idx)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                  isCurrent
                    ? 'bg-blue-600 text-white shadow-sm'
                    : idx < currentStep
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <StepIcon className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {idx + 1}. {step.shortLabel}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main Body: Two-Zone Interactive Sandbox Layout */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left / Top Zone: Animated Interactive Visual Stage (7 cols on lg) */}
            <div className="lg:col-span-7 flex flex-col">
              {activeStep.renderScene(isPlaying)}
            </div>

            {/* Right / Bottom Zone: Concept Deck & Controls (5 cols on lg) */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="text-[11px] font-black tracking-wider uppercase text-blue-600 dark:text-blue-400">
                  {activeStep.category}
                </div>

                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
                  {activeStep.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {activeStep.summary}
                </p>

                <ul className="space-y-2 pt-1">
                  {activeStep.bullets.map((line, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-200 leading-snug"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {activeStep.actionLabel && activeStep.onAction && (
                <button
                  type="button"
                  onClick={activeStep.onAction}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/70 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <span>Try It Now: {activeStep.actionLabel}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                currentStep === 0
                  ? 'opacity-40 cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-500'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="hidden sm:inline-flex min-h-[42px] px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
            >
              Skip Guide
            </button>
          </div>

          {/* Center Progress Dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStep(idx)}
                aria-label={`Step ${idx + 1}: ${s.shortLabel}`}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentStep
                    ? 'w-6 bg-blue-600'
                    : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="min-h-[42px] px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-blue-600/25 transition cursor-pointer"
          >
            <span>{currentStep < totalSteps - 1 ? 'Next Step' : 'Done · Start Exploring'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
