import React, { useState } from 'react';
import { UserProfile, InstitutionCategory } from '../../../types';
import { joinGrobaaxCampus } from '../../../lib/campusService';
import {
  GraduationCap,
  Phone,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Loader2,
  Building2,
  BookOpen,
} from 'lucide-react';

interface CampusJoinScreenProps {
  currentUser: UserProfile;
  onJoined: (whatsappNumber: string) => void;
  onClose?: () => void;
}

export const CampusJoinScreen: React.FC<CampusJoinScreenProps> = ({
  currentUser,
  onJoined,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived academic info
  const institutionName =
    currentUser.institution ||
    currentUser.institutionName ||
    currentUser.academicProfile?.institutionName ||
    'Your Institution';

  const category: InstitutionCategory =
    currentUser.institutionCategory ||
    currentUser.academicProfile?.institutionCategory ||
    'University';

  const facultyName =
    currentUser.faculty ||
    currentUser.facultyName ||
    currentUser.academicProfile?.facultyName ||
    currentUser.academicProfile?.faculty ||
    'General Faculty';

  const departmentName =
    currentUser.department ||
    currentUser.departmentName ||
    currentUser.academicProfile?.departmentName ||
    'General Department';

  const levelName =
    currentUser.level ||
    currentUser.academicProfile?.level ||
    '100 Level';

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleaned = phoneNumber.replace(/[^0-9+]/g, '');
    const digits = cleaned.replace(/[^0-9]/g, '');

    if (digits.length < 10 || digits.length > 15) {
      setError('Please enter a valid WhatsApp phone number (e.g. 08012345678 or +2348012345678).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await joinGrobaaxCampus({
        userId: currentUser.id,
        whatsappNumber: cleaned,
        institution: institutionName,
        institutionCategory: category,
        faculty: facultyName,
        department: departmentName,
        level: levelName,
      });

      if (res.success && res.membership) {
        onJoined(res.membership.whatsappNumber);
      } else {
        setError(res.error || 'Failed to join Campus. Please try again.');
      }
    } catch (err: any) {
      setError(err?.message || 'Unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto my-6 p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-900/5 dark:shadow-black/40 space-y-6 animate-in fade-in zoom-in-95 duration-200">
      {/* Header Badge */}
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
          <GraduationCap className="w-9 h-9" />
        </div>

        <div className="space-y-1">
          <span className="px-3 py-1 text-[11px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 rounded-full">
            GROBAAX CAMPUS
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            JOIN GROBAAX CAMPUS
          </h2>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 max-w-md">
            Connect with students from your institution.
          </p>
        </div>
      </div>

      {/* Verified Academic Profile Pill */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <Building2 className="w-4 h-4 text-blue-500" />
          <span>Your Registered Campus</span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-base font-black text-slate-900 dark:text-slate-100">
              {institutionName}
            </h4>
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mt-0.5 flex-wrap">
              <span className="flex items-center gap-1 font-semibold">
                <BookOpen className="w-3.5 h-3.5 text-blue-500" /> {departmentName}
              </span>
              <span>•</span>
              <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-md font-bold text-[11px]">
                {levelName}
              </span>
            </div>
          </div>
          <span className="px-2 py-1 text-[10px] font-black uppercase tracking-wide bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 rounded-lg flex items-center gap-1 shrink-0">
            <CheckCircle2 className="w-3 h-3" /> Profile Synced
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Join Form */}
      <form onSubmit={handleJoin} className="space-y-4">
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            WhatsApp Number
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Phone className="w-4 h-4 text-blue-500" />
            </div>
            <input
              id="campus-whatsapp-number-input"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+234 XXX XXX XXXX"
              required
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-bold placeholder:font-normal placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>
              Your number is stored securely and only shared after you accept a chat request.
            </span>
          </p>
        </div>

        <button
          id="campus-join-submit-btn"
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-black text-sm uppercase tracking-wider hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-950/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Joining Campus...</span>
            </>
          ) : (
            <>
              <span>JOIN CAMPUS</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
