import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import {
  CORPORATE_APPLY_URL,
  CORPORATE_PORTAL_ORIGIN,
  CorporatePortalRoute,
} from '../../utils/domainPortal';
import {
  CorporateAccount,
  StudentCompletionPrefill,
  completeCorporatePasswordReset,
  loginCorporateAccount,
  requestCorporatePasswordReset,
} from '../../lib/corporateAdsService';

const GROBAAX_LOGO_SRC = '/assets/aistudio/img_1_1794948944738_4ef63eec.jpg';

interface CorporateLoginViewProps {
  onNavigate: (
    event: React.MouseEvent<HTMLAnchorElement>,
    targetRoute: CorporatePortalRoute,
    targetPath: '/' | '/apply' | '/login' | '/dashboard'
  ) => void;
  onSuccess: (company: CorporateAccount) => void;
  onRequiresCompletion?: (prefill: StudentCompletionPrefill) => void;
}

type AuthPanelMode = 'login' | 'forgot' | 'reset';

export const CorporateLoginView: React.FC<CorporateLoginViewProps> = ({
  onNavigate,
  onSuccess,
  onRequiresCompletion,
}) => {
  const [mode, setMode] = useState<AuthPanelMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot & Recovery state
  const [recoveryToken, setRecoveryToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect Supabase recovery link hash/query (?reset=1#access_token=...&type=recovery)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hashRaw = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    const hashParams = new URLSearchParams(hashRaw);
    const searchParams = new URLSearchParams(window.location.search);
    const accessToken =
      hashParams.get('access_token') || searchParams.get('access_token') || '';
    const tokenType = hashParams.get('type') || searchParams.get('type') || '';

    if (accessToken && (tokenType === 'recovery' || searchParams.get('reset') === '1')) {
      setRecoveryToken(accessToken);
      setMode('reset');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setIsLoading(true);
    try {
      const res = await loginCorporateAccount(email.trim(), password);
      if (res.success && res.requiresApplicationCompletion && res.prefill) {
        onRequiresCompletion?.(res.prefill);
        return;
      }
      if (!res.success || !res.company) {
        setError(
          res.error ||
            'Invalid email address or password. Check your spelling or reset your password.'
        );
        return;
      }
      onSuccess(res.company);
    } catch (err: any) {
      setError(err?.message || 'Unable to reach Corporate Portal server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setIsLoading(true);
    try {
      const res = await requestCorporatePasswordReset(email.trim());
      if (!res.success) {
        setError(res.error || 'Could not send reset email. Please check your email.');
        return;
      }
      setInfoMessage(
        res.message ||
          'If an advertiser account exists for that email, a password reset link has been sent to your inbox.'
      );
    } catch (err: any) {
      setError(err?.message || 'Unable to send password reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await completeCorporatePasswordReset(recoveryToken, newPassword);
      if (!res.success || !res.company) {
        setError(res.error || 'Reset link expired. Please request a new password reset email.');
        return;
      }
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/dashboard');
      }
      onSuccess(res.company);
    } catch (err: any) {
      setError(err?.message || 'Password reset failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7fe] text-slate-900 antialiased flex flex-col">
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <a
            href={`${CORPORATE_PORTAL_ORIGIN}/`}
            onClick={(e) => onNavigate(e, 'landing', '/')}
            className="inline-flex items-center gap-2.5 text-sm sm:text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            <img
              src={GROBAAX_LOGO_SRC}
              alt="Grobaax Logo"
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-xl object-cover shrink-0 shadow-xs"
            />
            <span className="sm:hidden">Grobaax Ads</span>
            <span className="hidden sm:inline">Grobaax Corporate Advertising</span>
          </a>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <a
              href={`${CORPORATE_PORTAL_ORIGIN}/`}
              onClick={(e) => onNavigate(e, 'landing', '/')}
              className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">Home</span>
            </a>
            <a
              href={CORPORATE_APPLY_URL}
              onClick={(e) => onNavigate(e, 'apply', '/apply')}
              className="px-3.5 sm:px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              Apply to Advertise
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-12">
        <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-[#1d4ed8] via-[#2563eb] to-[#4f46e5] text-white p-6 sm:p-7 space-y-2.5">
            <div className="flex items-center gap-3">
              <img
                src={GROBAAX_LOGO_SRC}
                alt="Grobaax Logo"
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-xl object-cover border border-white/25 shadow-sm shrink-0"
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight">
                  {mode === 'forgot'
                    ? 'Reset Password'
                    : mode === 'reset'
                    ? 'Choose New Password'
                    : 'Company Account Login'}
                </h1>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-blue-100/95 leading-relaxed">
              {mode === 'forgot'
                ? 'Enter the email address registered on your advertiser account to receive a recovery link.'
                : mode === 'reset'
                ? 'Enter a new password for your Grobaax Corporate Advertiser account.'
                : 'Sign in with your company credentials or your existing Grobaax student account email and password.'}
            </p>
          </div>

          {mode === 'login' && (
            <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-5">
              {error && (
                <div
                  role="alert"
                  className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-semibold"
                >
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com or marketing@company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Existing Grobaax student accounts, personal emails (Gmail, Yahoo), and official business emails are all valid.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setInfoMessage(null);
                      setMode('forgot');
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-3.5 pr-11 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Company Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-3 border-t border-slate-100 text-center space-y-2">
                <p className="text-xs text-slate-500">
                  Haven&apos;t registered your business on Grobaax?{' '}
                  <a
                    href={CORPORATE_APPLY_URL}
                    onClick={(e) => onNavigate(e, 'apply', '/apply')}
                    className="font-bold text-blue-600 hover:underline"
                  >
                    Apply to Advertise
                  </a>
                </p>
                <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Corporate Advertiser Portal &middot; Student &amp; Company Sign-In Supported</span>
                </p>
              </div>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="p-6 sm:p-7 space-y-5">
              {error && (
                <div
                  role="alert"
                  className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-semibold"
                >
                  {error}
                </div>
              )}

              {infoMessage && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-medium flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{infoMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Registered Email Address
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com or marketing@company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Send Password Reset Link</span>
                  </>
                )}
              </button>

              <div className="pt-2 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setInfoMessage(null);
                    setMode('login');
                  }}
                  className="text-xs font-bold text-slate-600 hover:text-blue-600 inline-flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Company Login</span>
                </button>
              </div>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleResetSubmit} className="p-6 sm:p-7 space-y-5">
              {error && (
                <div
                  role="alert"
                  className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-semibold"
                >
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full pl-3.5 pr-11 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Save Password &amp; Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};
