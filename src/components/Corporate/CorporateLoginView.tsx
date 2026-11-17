import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import {
  CORPORATE_APPLY_URL,
  CORPORATE_PORTAL_ORIGIN,
  CorporatePortalRoute,
} from '../../utils/domainPortal';
import { CorporateAccount, loginCorporateAccount } from '../../lib/corporateAdsService';

interface CorporateLoginViewProps {
  onNavigate: (
    event: React.MouseEvent<HTMLAnchorElement>,
    targetRoute: CorporatePortalRoute,
    targetPath: '/' | '/apply' | '/login' | '/dashboard'
  ) => void;
  onSuccess: (company: CorporateAccount) => void;
}

export const CorporateLoginView: React.FC<CorporateLoginViewProps> = ({
  onNavigate,
  onSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await loginCorporateAccount(email.trim(), password);
      if (!res.success || !res.company) {
        setError(res.error || 'Invalid corporate credentials.');
        return;
      }
      onSuccess(res.company);
    } catch (err: any) {
      setError(err?.message || 'Unable to reach Corporate Portal server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7fe] text-slate-900 antialiased flex flex-col">
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <a
            href={`${CORPORATE_PORTAL_ORIGIN}/`}
            onClick={(e) => onNavigate(e, 'landing', '/')}
            className="text-sm sm:text-base font-bold tracking-tight text-slate-900 whitespace-nowrap"
          >
            Grobaax Corporate Advertising
          </a>
          <div className="flex items-center gap-3">
            <a
              href={`${CORPORATE_PORTAL_ORIGIN}/`}
              onClick={(e) => onNavigate(e, 'landing', '/')}
              className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Portal Home</span>
            </a>
            <a
              href={CORPORATE_APPLY_URL}
              onClick={(e) => onNavigate(e, 'apply', '/apply')}
              className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap"
            >
              Apply to Advertise
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-[#1d4ed8] via-[#2563eb] to-[#4f46e5] text-white p-6 sm:p-7 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Company Account Login
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/90">
              Sign in to track application status, manage plans, and run approved
              School Blog campaigns.
            </p>
          </div>

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
                Official Business Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="marketing@company.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
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
                <span>Corporate Advertiser Portal &middot; Separate from student accounts</span>
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};
