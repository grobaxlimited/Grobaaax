import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  FileUp,
  ImagePlus,
  Loader2,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import {
  CORPORATE_LOGIN_URL,
  CORPORATE_PORTAL_ORIGIN,
  CorporatePortalRoute,
} from '../../utils/domainPortal';
import {
  DEFAULT_BRAND_HIGHLIGHT_COLOR,
  normalizeHexColor,
} from '../../utils/brandColor';
import { BrandColorPicker } from './BrandColorPicker';
import {
  CorporateAccount,
  StudentCompletionPrefill,
  completeCorporateApplication,
  registerCorporateAccount,
} from '../../lib/corporateAdsService';

interface CorporateApplicationViewProps {
  onNavigate: (
    event: React.MouseEvent<HTMLAnchorElement>,
    targetRoute: CorporatePortalRoute,
    targetPath: '/' | '/apply' | '/login' | '/dashboard'
  ) => void;
  onSuccess: (company: CorporateAccount) => void;
  completionPrefill?: StudentCompletionPrefill | null;
  onCancelCompletion?: () => void;
}

const INDUSTRIES = [
  'Banking & Financial Services',
  'Fintech & Payments',
  'Telecommunications & ISP',
  'EdTech & Online Learning',
  'Consumer Goods & FMCG',
  'E-Commerce & Retail',
  'Technology & Software',
  'Healthcare & Wellness',
  'Media & Entertainment',
  'Logistics & Mobility',
  'Other Corporate Sector',
];

export const CorporateApplicationView: React.FC<CorporateApplicationViewProps> = ({
  onNavigate,
  onSuccess,
  completionPrefill,
  onCancelCompletion,
}) => {
  const isCompletionMode = Boolean(completionPrefill?.officialEmail);

  const [companyName, setCompanyName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');

  const [contactName, setContactName] = useState(completionPrefill?.contactName || '');
  const [officialEmail, setOfficialEmail] = useState(completionPrefill?.officialEmail || '');
  const [phone, setPhone] = useState(completionPrefill?.phone || '');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('Nigeria');
  const [state, setState] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [supportingDoc, setSupportingDoc] = useState<{
    dataUrl: string;
    fileName: string;
  } | null>(null);
  const [companyLogo, setCompanyLogo] = useState<{
    dataUrl: string;
    fileName: string;
  } | null>(null);
  const [brandHighlightColor, setBrandHighlightColor] = useState(
    DEFAULT_BRAND_HIGHLIGHT_COLOR
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (completionPrefill?.officialEmail) {
      setOfficialEmail(completionPrefill.officialEmail);
      if (completionPrefill.contactName && !contactName) {
        setContactName(completionPrefill.contactName);
      }
      if (completionPrefill.phone && !phone) {
        setPhone(completionPrefill.phone);
      }
    }
  }, [completionPrefill, contactName, phone]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4.5 * 1024 * 1024) {
      setError('Verification document must be smaller than 4.5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSupportingDoc({ dataUrl: reader.result, fileName: file.name });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4.5 * 1024 * 1024) {
      setError('Company logo image must be smaller than 4.5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCompanyLogo({ dataUrl: reader.result, fileName: file.name });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isCompletionMode) {
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const basePayload = {
        companyName: companyName.trim(),
        brandName: brandName.trim(),
        industry: industry.trim(),
        registrationNumber: registrationNumber.trim(),
        website: website.trim(),
        description: description.trim(),
        contactName: contactName.trim(),
        officialEmail: officialEmail.trim(),
        phone: phone.trim(),
        address: address.trim(),
        country: country.trim(),
        state: state.trim(),
        brandHighlightColor: normalizeHexColor(brandHighlightColor),
        companyLogo,
        supportingDocument: supportingDoc,
      };

      const res = isCompletionMode
        ? await completeCorporateApplication(basePayload)
        : await registerCorporateAccount({ ...basePayload, password });

      if (!res.success || !res.company) {
        setError(res.error || 'Could not submit application. Please review your details.');
        return;
      }

      onSuccess(res.company);
    } catch (err: any) {
      setError(err?.message || 'Network error while submitting application.');
    } finally {
      setIsSubmitting(false);
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
              src="/assets/aistudio/img_1_1794948944738_4ef63eec.jpg"
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
              <span>Home</span>
            </a>
            <a
              href={CORPORATE_LOGIN_URL}
              onClick={(e) => onNavigate(e, 'login', '/login')}
              className="px-3.5 sm:px-4 py-2 rounded-full border border-blue-200 bg-white hover:bg-blue-50 text-blue-700 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              Company Login
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="rounded-3xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-[#1d4ed8] via-[#2563eb] to-[#4f46e5] text-white p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-3">
              <img
                src="/assets/aistudio/img_1_1794948944738_4ef63eec.jpg"
                alt="Grobaax Logo"
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-xl object-cover border border-white/25 shadow-sm shrink-0"
              />
              <span className="text-xs font-semibold text-blue-100">
                Corporate Advertiser Application
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isCompletionMode
                ? 'Complete Your Corporate Application'
                : 'Apply to Advertise on Grobaax'}
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/95 max-w-2xl leading-relaxed">
              {isCompletionMode
                ? 'Your Grobaax account credentials are verified. Simply complete your organization details below to enter the Corporate Advertising Portal for review.'
                : 'Complete your company profile below. Applications start in Pending status for review by Grobaax Administrators. Once approved, your organization can subscribe to an advertising plan and submit campaigns.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
            {isCompletionMode && (
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    Signed in as <strong>{officialEmail}</strong> &mdash; complete only the
                    remaining organization details below to submit your Corporate Advertising
                    application.
                  </span>
                </div>
                {onCancelCompletion && (
                  <button
                    type="button"
                    onClick={onCancelCompletion}
                    className="text-xs font-bold text-blue-700 hover:underline cursor-pointer shrink-0"
                  >
                    Use a different account
                  </button>
                )}
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold"
              >
                {error}
              </div>
            )}

            {/* Section 1: Company Profile */}
            <div className="space-y-4">
              <h2 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-2">
                1. Organization &amp; Brand Details
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Registered Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Zenith Digital Holdings Ltd"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Brand / Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="Public brand name shown in ads"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Industry / Category *
                  </label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Company Registration Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    placeholder="CAC / RC Number"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Company Website (Optional)
                  </label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://yourcompany.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Short Description of Company / Brand *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your company's products or services and what you intend to advertise to campus readers..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-[#f8faff] p-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 p-1 flex items-center justify-center overflow-hidden shrink-0">
                      {companyLogo?.dataUrl ? (
                        <img
                          src={companyLogo.dataUrl}
                          alt="Company logo preview"
                          className="w-full h-full object-contain rounded-lg"
                        />
                      ) : (
                        <Building2 className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <div className="text-xs font-bold text-slate-800">
                        Company Logo (Optional)
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Shown on sponsored ads beneath blog posts.
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-200 bg-white hover:bg-blue-50 text-blue-700 text-[11px] font-bold cursor-pointer">
                          <ImagePlus className="w-3.5 h-3.5" />
                          <span>{companyLogo ? 'Change Logo' : 'Upload Logo'}</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={handleLogoChange}
                            className="hidden"
                          />
                        </label>
                        {companyLogo && (
                          <button
                            type="button"
                            onClick={() => setCompanyLogo(null)}
                            className="text-[11px] font-bold text-slate-500 hover:text-rose-600 cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <BrandColorPicker
                    compact
                    value={brandHighlightColor}
                    onChange={setBrandHighlightColor}
                    label="Brand Text Highlight Color (Optional)"
                    helperText="Applies to highlights beneath blog posts & on Sponsor Ticker."
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Primary Contact & Location */}
            <div className="space-y-4">
              <h2 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-2">
                2. Contact &amp; Address Details
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Contact Person&apos;s Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Full name of authorized representative"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Email Address (Business or Personal) *
                  </label>
                  <input
                    type="email"
                    required
                    readOnly={isCompletionMode}
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={officialEmail}
                    onChange={(e) => {
                      if (!isCompletionMode) setOfficialEmail(e.target.value);
                    }}
                    placeholder="you@gmail.com or marketing@company.com"
                    className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isCompletionMode
                        ? 'bg-slate-100 text-slate-600 cursor-not-allowed'
                        : 'bg-white'
                    }`}
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    {isCompletionMode
                      ? 'Linked automatically to your signed-in Grobaax account.'
                      : 'Normal personal emails (e.g. Gmail, Yahoo) and business emails are both supported for login.'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Business Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234 800 000 0000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Country *
                  </label>
                  <input
                    type="text"
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Nigeria"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    State / Region *
                  </label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Lagos"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Business Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street office address"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Verification Document & Account Credentials */}
            <div className="space-y-4">
              <h2 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-2">
                {isCompletionMode
                  ? '3. Supporting Verification Document'
                  : '3. Verification Document & Portal Account Password'}
              </h2>

              <div className="rounded-2xl border border-dashed border-slate-300 bg-[#f8faff] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileUp className="w-4 h-4 text-blue-600" />
                    <span>Supporting Verification Document (Optional)</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    CAC certificate, business license, or official letterhead (PDF, JPG, PNG,
                    WEBP up to 4.5 MB). Stored privately for Admin review only.
                  </p>
                  {supportingDoc && (
                    <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1 pt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Attached: {supportingDoc.fileName}</span>
                    </p>
                  )}
                </div>

                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 text-blue-700 text-xs font-bold cursor-pointer shrink-0">
                  <span>{supportingDoc ? 'Replace File' : 'Upload Document'}</span>
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {!isCompletionMode && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Portal Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
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
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Confirm Password *
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-blue-50/70 border border-blue-100 p-4 text-xs text-slate-600 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                This application creates a dedicated Corporate Advertiser account completely
                separate from student scholar accounts. All company details are verified by
                Grobaax Administrators before advertising plans or placements are unlocked.
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Encrypted authentication via Supabase Auth</span>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-600/20 disabled:opacity-60 cursor-pointer transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Application...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Corporate Application</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};
