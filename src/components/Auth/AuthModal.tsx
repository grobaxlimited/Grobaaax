import React, { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  auth,
  signInWithGoogle,
  setSessionFromUrlOrHash,
  createUserProfileDoc,
  ensureUserInFirestore,
  isUsernameAvailable,
  isEmailAvailable,
  formatAuthError,
} from '../../lib/firebase';
import { UserProfile } from '../../types';
import { Button } from '../ui/Button';
import {
  GraduationCap,
  Sparkles,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Link2,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (userProfile: UserProfile) => void;
  initialMode?: 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'LOGIN',
}) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD'>(initialMode);

  // Form Fields - Login / Forgot Password
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Form Fields - Registration
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');

  // Username validation states
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [isUsernameValid, setIsUsernameValid] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState('');

  // Email validation & uniqueness states
  const [emailChecking, setEmailChecking] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState<boolean | null>(null);
  const [emailError, setEmailError] = useState('');

  // UI Error & Processing States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  const [showPasteHelper, setShowPasteHelper] = useState(false);
  const [pastedUrl, setPastedUrl] = useState('');
  const [isPastingToken, setIsPastingToken] = useState(false);
  const [pasteError, setPasteError] = useState('');

  useEffect(() => {
    setMode(initialMode);
    setErrorMessage('');
    setResetSuccessMsg('');
    setEmailError('');
    setIsEmailValid(null);
    setShowPasteHelper(false);
    setPastedUrl('');
    setPasteError('');
  }, [initialMode, isOpen]);

  // Username validation
  useEffect(() => {
    if (mode !== 'REGISTER' || !username.trim()) {
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
      const available = await isUsernameAvailable(username);
      setUsernameChecking(false);
      setIsUsernameValid(available);
      if (!available) {
        setUsernameError('This username is already taken');
      } else {
        setUsernameError('');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, mode]);

  // Email validation and uniqueness check to strictly prevent duplicate accounts
  useEffect(() => {
    if (mode !== 'REGISTER' || !email.trim()) {
      setIsEmailValid(null);
      setEmailError('');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      setIsEmailValid(false);
      setEmailError('Please enter a valid email address');
      return;
    }

    const timer = setTimeout(async () => {
      setEmailChecking(true);
      const available = await isEmailAvailable(email.trim());
      setEmailChecking(false);
      setIsEmailValid(available);
      if (!available) {
        setEmailError('This email is already registered with another account');
      } else {
        setEmailError('');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [email, mode]);

  if (!isOpen) return null;

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      
      const profile = await ensureUserInFirestore(user, {
        email: email.trim(),
      });

      if (profile.isPostingSuspended) {
        setErrorMessage('Your account is currently suspended. Please contact platform administration.');
      }

      onAuthSuccess(profile);
      onClose();
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMessage(formatAuthError(err.code || err.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const user = await signInWithGoogle();
      if (user) {
        const profile = await ensureUserInFirestore(user);
        onAuthSuccess(profile);
        onClose();
      }
    } catch (err: any) {
      const isCancelledOrClosed =
        err?.code === 'auth/cancelled-popup-request' ||
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/timeout' ||
        err?.message?.includes('cancelled-popup-request') ||
        err?.message?.includes('Pending promise was never set') ||
        err?.message?.includes('popup-closed-by-user') ||
        err?.message?.includes('closed or cancelled') ||
        err?.message?.includes('cancelled') ||
        err?.message?.includes('closed') ||
        err?.message?.includes('timed out');

      if (isCancelledOrClosed) {
        console.log('Google sign-in completed or cancelled.');
      } else {
        console.error('Google Sign-In Error:', err);
        setErrorMessage(formatAuthError(err.code || err.message || ''));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasteConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedUrl.trim() || isPastingToken) return;
    setIsPastingToken(true);
    setPasteError('');

    try {
      const user = await setSessionFromUrlOrHash(pastedUrl.trim());
      const profile = await ensureUserInFirestore(user);
      onAuthSuccess(profile);
      onClose();
    } catch (err: any) {
      setPasteError(err.message || 'Could not parse credentials from the provided link.');
    } finally {
      setIsPastingToken(false);
    }
  };

  // Handle Password Reset
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setResetSuccessMsg('');

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSuccessMsg(`Password reset instructions sent to ${email.trim()}. Check your inbox.`);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setErrorMessage(formatAuthError(err.code || err.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Registration Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim() || !email.trim() || !password || !username.trim()) {
      setErrorMessage('All credential fields are required.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (isUsernameValid === false) {
      setErrorMessage('Please choose an available and valid username before proceeding.');
      return;
    }

    if (isEmailValid === false) {
      setErrorMessage(emailError || 'This email is already registered with another account. Please sign in instead.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    // Pre-flight check email uniqueness
    try {
      const emailAvailable = await isEmailAvailable(email.trim());
      if (!emailAvailable) {
        setIsEmailValid(false);
        setEmailError('This email is already registered with another account');
        setErrorMessage('This email is already registered. Please sign in with your password instead of creating a duplicate account.');
        setIsSubmitting(false);
        return;
      }
    } catch (checkErr) {
      console.warn('Pre-flight email check notice:', checkErr);
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const uid = userCredential.user.uid;

      try {
        await updateProfile(userCredential.user, {
          displayName: fullName.trim(),
        });
      } catch (pErr) {
        console.warn('Could not update Firebase user displayName:', pErr);
      }

      // Create user document with academicProfileCompleted: false and emailVerified: false
      let profile: UserProfile;
      try {
        profile = await createUserProfileDoc(uid, {
          fullName: fullName.trim(),
          username: username.trim(),
          email: email.trim(),
          emailVerified: false,
          academicProfileCompleted: false,
        });
      } catch (docErr) {
        console.warn('Direct createUserProfileDoc fallback active:', docErr);
        profile = await ensureUserInFirestore(userCredential.user, {
          fullName: fullName.trim(),
          name: fullName.trim(),
          username: username.trim(),
          email: email.trim(),
          emailVerified: false,
          academicProfileCompleted: false,
        });
      }

      onAuthSuccess(profile);
      onClose();
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.code === 'auth/email-already-in-use' || err.message?.includes('email-already-in-use') || err.message?.includes('already registered') || err.message?.includes('already exists')) {
        setIsEmailValid(false);
        setEmailError('This email is already registered with another account');
        setErrorMessage('An account with this email address already exists. Please sign in instead.');
      } else {
        setErrorMessage(formatAuthError(err.code || err.message || ''));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 sm:p-7 relative overflow-hidden max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1 mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-2">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {mode === 'LOGIN'
              ? 'Sign In to Grobaax Arena'
              : mode === 'REGISTER'
              ? 'Create Scholar Account'
              : 'Reset Your Password'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {mode === 'LOGIN'
              ? 'Access institutional leagues, live Dome duels & wallet'
              : mode === 'REGISTER'
              ? 'Register your credentials and complete your academic profile'
              : 'Enter your email to receive recovery instructions'}
          </p>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1 font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Reset Success Message */}
        {resetSuccessMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1 font-medium">{resetSuccessMsg}</span>
          </div>
        )}

        {/* ===================== MODE: LOGIN ===================== */}
        {mode === 'LOGIN' && (
          <div className="space-y-4 overflow-y-auto pr-1">
            <button
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              type="button"
              className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continue with Google Account
            </button>

            {/* Paste Redirect Link Helper */}
            {showPasteHelper && (
              <div className="w-full bg-blue-50/80 dark:bg-slate-900/90 border border-blue-200 dark:border-blue-900/50 rounded-xl p-3 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Having trouble connecting?
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPasteHelper(false)}
                    className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer font-medium"
                  >
                    Close
                  </button>
                </div>
                <form onSubmit={handlePasteConnect} className="space-y-2">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    If redirected to a callback URL or token, paste it here to complete sign-in:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={pastedUrl}
                      onChange={(e) => setPastedUrl(e.target.value)}
                      placeholder="Paste callback URL or token"
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={isPastingToken || !pastedUrl.trim()}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
                    >
                      {isPastingToken ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                      <span>Connect</span>
                    </button>
                  </div>
                  {pasteError && (
                    <p className="text-[10px] text-rose-500 font-medium">{pasteError}</p>
                  )}
                </form>
              </div>
            )}

            <div className="relative flex items-center justify-center my-2">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              <span className="bg-white dark:bg-slate-900 px-3 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Or with Email
              </span>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="scholar@university.edu.ng"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('FORGOT_PASSWORD');
                      setErrorMessage('');
                    }}
                    className="text-[10px] text-amber-500 hover:underline font-bold"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 transition-all font-medium"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="amber"
                className="w-full py-3 text-xs font-black shadow-lg shadow-amber-500/20"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Authenticating Scholar...
                  </span>
                ) : (
                  'Sign In to Dashboard'
                )}
              </Button>
            </form>

            <p className="text-center text-xs text-slate-500 pt-2">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('REGISTER');
                  setErrorMessage('');
                }}
                className="font-bold text-amber-500 hover:text-amber-400"
              >
                Register as Scholar
              </button>
            </p>
          </div>
        )}

        {/* ===================== MODE: FORGOT_PASSWORD ===================== */}
        {mode === 'FORGOT_PASSWORD' && (
          <div className="space-y-4">
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="scholar@university.edu.ng"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 transition-all"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="amber"
                className="w-full py-3 text-xs font-black"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Sending instructions...
                  </span>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setErrorMessage('');
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                ← Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* ===================== MODE: REGISTER ===================== */}
        {mode === 'REGISTER' && (
          <div className="space-y-4 overflow-y-auto pr-1 flex-1">
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <button
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                type="button"
                className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50 mb-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Quick Sign Up with Google
              </button>

              <div className="space-y-1">
                <label className="text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Johnson"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                  Unique Username
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                    placeholder="scholar_01"
                    required
                    className="w-full pl-8 pr-9 py-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 transition-all font-medium"
                  />
                  {usernameChecking && (
                    <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-amber-500" />
                  )}
                  {!usernameChecking && isUsernameValid === true && (
                    <CheckCircle2 className="absolute right-3 top-3 w-4 h-4 text-emerald-500" />
                  )}
                  {!usernameChecking && isUsernameValid === false && (
                    <AlertCircle className="absolute right-3 top-3 w-4 h-4 text-rose-500" />
                  )}
                </div>
                {usernameError && <p className="text-[10px] text-rose-500 font-medium pt-0.5">{usernameError}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="scholar@university.edu.ng"
                    required
                    className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 transition-all font-medium"
                  />
                  {emailChecking && (
                    <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-amber-500" />
                  )}
                  {!emailChecking && isEmailValid === true && (
                    <CheckCircle2 className="absolute right-3 top-3 w-4 h-4 text-emerald-500" />
                  )}
                  {!emailChecking && isEmailValid === false && (
                    <AlertCircle className="absolute right-3 top-3 w-4 h-4 text-rose-500" />
                  )}
                </div>
                {emailError && <p className="text-[10px] text-rose-500 font-medium pt-0.5">{emailError}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                  Password (Min. 6 Chars)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 transition-all font-medium"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="amber"
                className="w-full py-3 text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20"
                disabled={isSubmitting || isUsernameValid === false || isEmailValid === false || emailChecking || usernameChecking}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Creating Account...
                  </span>
                ) : (
                  <>
                    <span>Create Account & Complete Profile</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>

              <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
                Next: Select your verified Nigerian institution, faculty, department & level.
              </p>
            </form>

            <p className="text-center text-xs text-slate-500 pt-2">
              Already registered?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setErrorMessage('');
                }}
                className="font-bold text-amber-500 hover:text-amber-400"
              >
                Sign In
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
