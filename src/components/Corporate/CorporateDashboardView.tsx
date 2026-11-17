import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  ImagePlus,
  LayoutDashboard,
  Loader2,
  LogOut,
  Megaphone,
  MousePointerClick,
  Pause,
  Play,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  CORPORATE_PORTAL_ORIGIN,
  CorporatePortalRoute,
} from '../../utils/domainPortal';
import {
  CorporateAccount,
  CorporateAdCampaign,
  CorporateAnalyticsSummary,
  CorporatePayment,
  CorporatePlan,
  CorporateSubscription,
  createCorporateCampaign,
  deleteCorporateCampaign,
  fetchCorporateBilling,
  fetchCorporateCampaigns,
  fetchCorporateMe,
  fetchPublicCorporatePlans,
  initializeCorporatePayment,
  logoutCorporateAccount,
  updateCorporateCampaign,
  updateCorporateProfile,
  uploadCorporateMedia,
  verifyCorporatePayment,
} from '../../lib/corporateAdsService';

type DashboardTab = 'overview' | 'campaigns' | 'billing' | 'analytics' | 'profile';

interface CorporateDashboardViewProps {
  initialCompany: CorporateAccount;
  onNavigate: (
    event: React.MouseEvent<HTMLAnchorElement>,
    targetRoute: CorporatePortalRoute,
    targetPath: '/' | '/apply' | '/login' | '/dashboard'
  ) => void;
  onCompanyUpdated: (company: CorporateAccount | null) => void;
  onSignedOut: () => void;
}

const STATUS_BADGE: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-800 border-amber-200',
  Approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Rejected: 'bg-rose-50 text-rose-800 border-rose-200',
  Suspended: 'bg-rose-50 text-rose-900 border-rose-300',
  Active: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  'Pending Review': 'bg-amber-50 text-amber-800 border-amber-200',
  Draft: 'bg-slate-100 text-slate-700 border-slate-200',
  Paused: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  Expired: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const CorporateDashboardView: React.FC<CorporateDashboardViewProps> = ({
  initialCompany,
  onNavigate,
  onCompanyUpdated,
  onSignedOut,
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const t = sp.get('tab');
      if (t === 'billing' || t === 'campaigns' || t === 'analytics' || t === 'profile') {
        return t;
      }
    }
    return 'overview';
  });

  const [company, setCompany] = useState<CorporateAccount>(initialCompany);
  const [activeSub, setActiveSub] = useState<CorporateSubscription | null>(null);
  const [subscriptions, setSubscriptions] = useState<CorporateSubscription[]>([]);
  const [payments, setPayments] = useState<CorporatePayment[]>([]);
  const [plans, setPlans] = useState<CorporatePlan[]>([]);
  const [campaigns, setCampaigns] = useState<CorporateAdCampaign[]>([]);
  const [summary, setSummary] = useState<CorporateAnalyticsSummary>({
    totalCampaigns: 0,
    activeCampaignsCount: 0,
    totalImpressions: 0,
    totalClicks: 0,
    ctr: 0,
  });

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [payingPlanId, setPayingPlanId] = useState<string | null>(null);
  const [receiptModal, setReceiptModal] = useState<CorporatePayment | null>(null);

  // Campaign Builder Modal
  const [isCampaignFormOpen, setIsCampaignFormOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [campName, setCampName] = useState('');
  const [campHeadline, setCampHeadline] = useState('');
  const [campAdText, setCampAdText] = useState('');
  const [campImageUrl, setCampImageUrl] = useState('');
  const [campDestUrl, setCampDestUrl] = useState('');
  const [campCtaLabel, setCampCtaLabel] = useState('Learn More');
  const [campDurationDays, setCampDurationDays] = useState(30);
  const [isUploadingCreative, setIsUploadingCreative] = useState(false);
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  // Company Profile Edit Form
  const [profBrandName, setProfBrandName] = useState(initialCompany.brandName || '');
  const [profWebsite, setProfWebsite] = useState(initialCompany.website || '');
  const [profDescription, setProfDescription] = useState(initialCompany.description || '');
  const [profContactName, setProfContactName] = useState(initialCompany.contactName || '');
  const [profPhone, setProfPhone] = useState(initialCompany.phone || '');
  const [profAddress, setProfAddress] = useState(initialCompany.address || '');
  const [profCountry, setProfCountry] = useState(initialCompany.country || '');
  const [profState, setProfState] = useState(initialCompany.state || '');
  const [profRegNo, setProfRegNo] = useState(initialCompany.registrationNumber || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, billingRes, campsRes, plansRes] = await Promise.all([
        fetchCorporateMe(),
        fetchCorporateBilling(),
        fetchCorporateCampaigns(),
        fetchPublicCorporatePlans(),
      ]);

      if (meRes.success && meRes.company) {
        setCompany(meRes.company);
        onCompanyUpdated(meRes.company);
        setProfBrandName(meRes.company.brandName || '');
        setProfWebsite(meRes.company.website || '');
        setProfDescription(meRes.company.description || '');
        setProfContactName(meRes.company.contactName || '');
        setProfPhone(meRes.company.phone || '');
        setProfAddress(meRes.company.address || '');
        setProfCountry(meRes.company.country || '');
        setProfState(meRes.company.state || '');
        setProfRegNo(meRes.company.registrationNumber || '');
        if (meRes.analyticsSummary) setSummary(meRes.analyticsSummary);
      }
      if (billingRes.success) {
        setActiveSub(billingRes.activeSubscription || null);
        setSubscriptions(billingRes.subscriptions || []);
        setPayments(billingRes.payments || []);
      }
      if (campsRes.success) {
        setCampaigns(campsRes.campaigns || []);
      }
      if (plansRes.success) {
        setPlans(plansRes.plans || []);
      }
    } finally {
      setLoading(false);
    }
  }, [onCompanyUpdated]);

  // Verify Paystack return URL if ?reference=... is present
  useEffect(() => {
    let mounted = true;
    const sp = new URLSearchParams(window.location.search);
    const ref = sp.get('reference') || sp.get('trxref');
    if (ref) {
      setActiveTab('billing');
      verifyCorporatePayment(ref)
        .then((res) => {
          if (!mounted) return;
          if (res.success && res.verified) {
            setNotice({
              type: 'success',
              text: 'Paystack payment verified! Your Corporate Advertising subscription is now active.',
            });
            if (res.payment) setReceiptModal(res.payment);
          } else if (res.isPending) {
            setNotice({
              type: 'error',
              text: 'Payment is still awaiting confirmation from Paystack. Refresh in a moment.',
            });
          } else {
            setNotice({
              type: 'error',
              text: res.error || 'Payment could not be verified as successful.',
            });
          }
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);
        })
        .finally(() => {
          if (mounted) loadAllData();
        });
    } else {
      loadAllData();
    }
    return () => {
      mounted = false;
    };
  }, [loadAllData]);

  const isCompanyApproved = company.status === 'Approved';
  const hasActiveSubscription = Boolean(activeSub && activeSub.status === 'active');

  const daysRemaining = useMemo(() => {
    if (!activeSub?.expiryDate) return 0;
    const ms = new Date(activeSub.expiryDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  }, [activeSub]);

  const handleSubscribe = async (planId: string) => {
    setNotice(null);
    if (!isCompanyApproved) {
      setNotice({
        type: 'error',
        text: 'Your company application must be Approved by Grobaax Admin before subscribing.',
      });
      return;
    }
    setPayingPlanId(planId);
    try {
      const origin =
        typeof window !== 'undefined' ? window.location.origin : CORPORATE_PORTAL_ORIGIN;
      const callbackUrl = `${origin}/dashboard?tab=billing`;
      const res = await initializeCorporatePayment(planId, callbackUrl);
      if (!res.success || !res.authorizationUrl) {
        setNotice({
          type: 'error',
          text: res.error || 'Unable to start Paystack checkout.',
        });
        return;
      }
      window.location.assign(res.authorizationUrl);
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: err?.message || 'Payment initialization failed.',
      });
    } finally {
      setPayingPlanId(null);
    }
  };

  const openNewCampaignModal = () => {
    setEditingCampaignId(null);
    setCampName('');
    setCampHeadline('');
    setCampAdText('');
    setCampImageUrl('');
    setCampDestUrl(company.website || '');
    setCampCtaLabel('Learn More');
    setCampDurationDays(activeSub?.campaignDurationDaysSnapshot || 30);
    setIsCampaignFormOpen(true);
  };

  const openEditCampaignModal = (c: CorporateAdCampaign) => {
    setEditingCampaignId(c.id);
    setCampName(c.campaignName);
    setCampHeadline(c.headline);
    setCampAdText(c.adText);
    setCampImageUrl(c.creativeImageUrl);
    setCampDestUrl(c.destinationUrl);
    setCampCtaLabel(c.ctaLabel || 'Learn More');
    setCampDurationDays(
      c.requestedDurationDays || activeSub?.campaignDurationDaysSnapshot || 30
    );
    setIsCampaignFormOpen(true);
  };

  const handleCreativeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4.5 * 1024 * 1024) {
      setNotice({ type: 'error', text: 'Creative image must be under 4.5 MB.' });
      return;
    }
    setIsUploadingCreative(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        if (typeof reader.result !== 'string') return;
        const res = await uploadCorporateMedia({
          kind: 'creative',
          dataUrl: reader.result,
          fileName: file.name,
        });
        if (res.success && res.imageUrl) {
          setCampImageUrl(res.imageUrl);
          setNotice({ type: 'success', text: 'Campaign creative image uploaded.' });
        } else {
          setNotice({ type: 'error', text: res.error || 'Image upload failed.' });
        }
      } finally {
        setIsUploadingCreative(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCampaign = async (submitForReview: boolean) => {
    setNotice(null);
    setIsSavingCampaign(true);
    try {
      const payload = {
        campaignName: campName.trim(),
        headline: campHeadline.trim(),
        adText: campAdText.trim(),
        creativeImageUrl: campImageUrl.trim(),
        destinationUrl: campDestUrl.trim(),
        ctaLabel: campCtaLabel.trim() || 'Learn More',
        requestedDurationDays: Number(campDurationDays) || 30,
        submitForReview,
      };

      const res = editingCampaignId
        ? await updateCorporateCampaign(editingCampaignId, payload)
        : await createCorporateCampaign(payload);

      if (!res.success) {
        setNotice({ type: 'error', text: res.error || 'Could not save campaign.' });
        return;
      }

      setIsCampaignFormOpen(false);
      setNotice({
        type: 'success',
        text: submitForReview
          ? 'Campaign submitted for Grobaax Admin review!'
          : 'Campaign saved as Draft.',
      });
      await loadAllData();
    } finally {
      setIsSavingCampaign(false);
    }
  };

  const handleCampaignTogglePause = async (c: CorporateAdCampaign, action: 'pause' | 'resume') => {
    setNotice(null);
    setActionBusyId(c.id);
    try {
      const res = await updateCorporateCampaign(c.id, { action });
      if (!res.success) {
        setNotice({ type: 'error', text: res.error || `Failed to ${action} campaign.` });
        return;
      }
      setNotice({
        type: 'success',
        text: action === 'pause' ? 'Campaign paused.' : 'Campaign resumed.',
      });
      await loadAllData();
    } finally {
      setActionBusyId(null);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    setNotice(null);
    setActionBusyId(id);
    try {
      const res = await deleteCorporateCampaign(id);
      if (!res.success) {
        setNotice({ type: 'error', text: res.error || 'Failed to delete campaign.' });
        return;
      }
      setNotice({ type: 'success', text: 'Campaign deleted.' });
      await loadAllData();
    } finally {
      setActionBusyId(null);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    setIsSavingProfile(true);
    try {
      const res = await updateCorporateProfile({
        brandName: profBrandName.trim(),
        website: profWebsite.trim(),
        description: profDescription.trim(),
        contactName: profContactName.trim(),
        phone: profPhone.trim(),
        address: profAddress.trim(),
        country: profCountry.trim(),
        state: profState.trim(),
        registrationNumber: profRegNo.trim(),
      });
      if (!res.success || !res.company) {
        setNotice({ type: 'error', text: res.error || 'Profile update failed.' });
        return;
      }
      setCompany(res.company);
      onCompanyUpdated(res.company);
      setNotice({ type: 'success', text: 'Company profile updated.' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4.5 * 1024 * 1024) {
      setNotice({ type: 'error', text: 'Document must be smaller than 4.5 MB.' });
      return;
    }
    setIsUploadingDoc(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        if (typeof reader.result !== 'string') return;
        const res = await uploadCorporateMedia({
          kind: 'verification_doc',
          dataUrl: reader.result,
          fileName: file.name,
        });
        if (res.success) {
          setNotice({ type: 'success', text: 'Verification document updated.' });
          await loadAllData();
        } else {
          setNotice({ type: 'error', text: res.error || 'Document upload failed.' });
        }
      } finally {
        setIsUploadingDoc(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-[#f4f7fe] text-slate-900 antialiased flex flex-col">
      {/* Top SaaS Workspace Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <a
              href={`${CORPORATE_PORTAL_ORIGIN}/`}
              onClick={(e) => onNavigate(e, 'landing', '/')}
              className="text-sm sm:text-base font-bold tracking-tight text-slate-900 whitespace-nowrap"
            >
              Grobaax Corporate Advertising
            </a>
            <span className="hidden md:inline text-slate-300">/</span>
            <span className="hidden md:inline text-xs font-semibold text-slate-600 truncate max-w-[200px]">
              {company.brandName || company.companyName}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${
                STATUS_BADGE[company.status] || 'bg-slate-100 text-slate-700'
              }`}
            >
              {company.status}
            </span>
            <a
              href={`${CORPORATE_PORTAL_ORIGIN}/`}
              onClick={(e) => onNavigate(e, 'landing', '/')}
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Portal Home</span>
            </a>
            <button
              type="button"
              onClick={() => {
                logoutCorporateAccount();
                onSignedOut();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Sub-Nav Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 border-t border-slate-100 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
              { id: 'billing', label: 'Plans & Billing', icon: CreditCard },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'profile', label: 'Company Profile', icon: Building2 },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-3 text-xs sm:text-sm font-bold inline-flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Global Status Banner */}
        {company.status === 'Pending' && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 sm:p-5 flex items-start gap-3.5">
            <Clock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-sm font-extrabold text-amber-900">
                Application Pending Grobaax Admin Review
              </h2>
              <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
                Thank you for applying, <strong>{company.companyName}</strong>. Your
                company profile is currently under review. Advertising plan purchases and
                campaign submissions unlock immediately once an Administrator marks your
                account as Approved.
              </p>
            </div>
          </div>
        )}

        {company.status === 'Rejected' && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 sm:p-5 flex items-start gap-3.5">
            <AlertCircle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-sm font-extrabold text-rose-900">
                Application Not Approved
              </h2>
              <p className="text-xs sm:text-sm text-rose-800 leading-relaxed">
                {company.adminFeedback ||
                  'Your application did not meet verification requirements. Update your company profile and reach out to Grobaax Corporate Support.'}
              </p>
            </div>
          </div>
        )}

        {company.status === 'Suspended' && (
          <div className="rounded-2xl bg-rose-50 border border-rose-300 p-4 sm:p-5 flex items-start gap-3.5">
            <ShieldAlert className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-sm font-extrabold text-rose-900">
                Corporate Account Suspended
              </h2>
              <p className="text-xs sm:text-sm text-rose-800 leading-relaxed">
                {company.adminFeedback ||
                  'Your corporate advertising privileges have been temporarily suspended by an administrator.'}
              </p>
            </div>
          </div>
        )}

        {notice && (
          <div
            className={`rounded-2xl p-4 border text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 ${
              notice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <span>{notice.text}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="p-1 rounded-lg hover:bg-black/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl bg-white border border-slate-200 p-12 flex items-center justify-center gap-3 text-sm font-semibold text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span>Loading Corporate Workspace...</span>
          </div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                      <span>Total Impressions</span>
                      <Eye className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
                      {summary.totalImpressions.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                      <span>Total Clicks</span>
                      <MousePointerClick className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
                      {summary.totalClicks.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                      <span>Overall CTR</span>
                      <BarChart3 className="w-4 h-4 text-violet-600" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
                      {summary.ctr}%
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                      <span>Active Campaigns</span>
                      <Megaphone className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
                      {summary.activeCampaignsCount}
                      {activeSub && (
                        <span className="text-sm font-semibold text-slate-400">
                          {' '}
                          / {activeSub.maxActiveCampaignsSnapshot}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-extrabold text-slate-900">
                        Active Subscription Plan
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveTab('billing')}
                        className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        Manage Plans &amp; Billing
                      </button>
                    </div>

                    {activeSub ? (
                      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-5 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="text-xs text-blue-100 font-semibold">
                              Current Package
                            </div>
                            <div className="text-xl font-extrabold">
                              {activeSub.planNameSnapshot}
                            </div>
                          </div>
                          <span className="px-3 py-1 rounded-full bg-white/15 text-xs font-bold tabular-nums">
                            {daysRemaining} days left
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-white/15 text-xs">
                          <div>
                            <div className="text-blue-200">Active Quota</div>
                            <div className="font-bold tabular-nums">
                              Up to {activeSub.maxActiveCampaignsSnapshot} campaigns
                            </div>
                          </div>
                          <div>
                            <div className="text-blue-200">Max Ad Duration</div>
                            <div className="font-bold tabular-nums">
                              {activeSub.campaignDurationDaysSnapshot} days
                            </div>
                          </div>
                          <div>
                            <div className="text-blue-200">Expires On</div>
                            <div className="font-bold tabular-nums">
                              {new Date(activeSub.expiryDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-[#f8faff] border border-slate-200 p-5 space-y-3">
                        <div className="text-sm font-bold text-slate-900">
                          No Active Subscription Yet
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {isCompanyApproved
                            ? 'Your company is approved! Select an advertising plan in Billing to launch School Blog campaigns.'
                            : 'Once your company application is Approved, you will be able to subscribe to an advertising plan here.'}
                        </p>
                        {isCompanyApproved && (
                          <button
                            type="button"
                            onClick={() => setActiveTab('billing')}
                            className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                          >
                            View Advertising Plans
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-5 rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xs space-y-4">
                    <h2 className="text-base font-extrabold text-slate-900">
                      Quick Actions
                    </h2>
                    <div className="space-y-2.5">
                      <button
                        type="button"
                        disabled={!isCompanyApproved || !hasActiveSubscription}
                        onClick={() => {
                          setActiveTab('campaigns');
                          openNewCampaignModal();
                        }}
                        className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold flex items-center justify-between disabled:opacity-45 cursor-pointer transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          <span>Create New Ad Campaign</span>
                        </span>
                        <span className="text-[11px] opacity-90">School Blog</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('billing')}
                        className="w-full py-3 px-4 rounded-xl border border-slate-200 bg-[#f8faff] hover:bg-slate-100 text-slate-800 text-xs sm:text-sm font-bold flex items-center justify-between cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Receipt className="w-4 h-4 text-blue-600" />
                          <span>Plans, Paystack &amp; Receipts</span>
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('profile')}
                        className="w-full py-3 px-4 rounded-xl border border-slate-200 bg-[#f8faff] hover:bg-slate-100 text-slate-800 text-xs sm:text-sm font-bold flex items-center justify-between cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>Update Company Profile &amp; Docs</span>
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CAMPAIGNS TAB */}
            {activeTab === 'campaigns' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                      Advertising Campaigns
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500">
                      Create and submit campaigns for Admin review before they run beneath
                      School Blog articles.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={!isCompanyApproved || !hasActiveSubscription}
                    onClick={openNewCampaignModal}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold disabled:opacity-45 cursor-pointer shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Campaign</span>
                  </button>
                </div>

                {(!isCompanyApproved || !hasActiveSubscription) && (
                  <div className="rounded-2xl bg-white border border-slate-200 p-5 text-xs sm:text-sm text-slate-600">
                    {!isCompanyApproved
                      ? 'Campaign creation requires an Approved company status.'
                      : 'Subscribe to an advertising plan in Plans & Billing to unlock campaign creation and submission.'}
                  </div>
                )}

                {campaigns.length === 0 ? (
                  <div className="rounded-3xl bg-white border border-slate-200 p-10 text-center space-y-3">
                    <Megaphone className="w-10 h-10 text-blue-600 mx-auto opacity-80" />
                    <h3 className="text-base font-bold text-slate-900">
                      No Ad Campaigns Created Yet
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                      Once your account is approved and subscribed to an active plan,
                      create your first sponsored School Blog advertisement here.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {campaigns.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-3xl bg-white border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-base font-extrabold text-slate-900">
                                {c.campaignName}
                              </h3>
                              <p className="text-xs text-slate-500">{c.headline}</p>
                            </div>
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${
                                STATUS_BADGE[c.status] || 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {c.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            {c.creativeImageUrl ? (
                              <img
                                src={c.creativeImageUrl}
                                alt={c.headline}
                                referrerPolicy="no-referrer"
                                className="w-20 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-20 h-16 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 shrink-0">
                                <Megaphone className="w-5 h-5" />
                              </div>
                            )}
                            <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                              {c.adText}
                            </p>
                          </div>

                          {c.status === 'Rejected' && c.rejectionReason && (
                            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
                              <strong>Admin Feedback:</strong> {c.rejectionReason}
                            </div>
                          )}

                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs tabular-nums">
                            <div>
                              <span className="text-slate-400 block text-[11px]">
                                Impressions
                              </span>
                              <strong className="text-slate-900">
                                {c.impressionsCount.toLocaleString()}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[11px]">
                                Clicks
                              </span>
                              <strong className="text-slate-900">
                                {c.clicksCount.toLocaleString()}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[11px]">
                                CTR
                              </span>
                              <strong className="text-slate-900">{c.ctr}%</strong>
                            </div>
                          </div>

                          {(c.startDate || c.expiryDate) && (
                            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                              <span>
                                Start:{' '}
                                {c.startDate
                                  ? new Date(c.startDate).toLocaleDateString()
                                  : '—'}
                              </span>
                              <span>
                                Expiry:{' '}
                                {c.expiryDate
                                  ? new Date(c.expiryDate).toLocaleDateString()
                                  : '—'}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                          {['Draft', 'Rejected', 'Paused', 'Pending Review'].includes(
                            c.status
                          ) && (
                            <button
                              type="button"
                              onClick={() => openEditCampaignModal(c)}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                          )}

                          {c.status === 'Active' && (
                            <button
                              type="button"
                              disabled={actionBusyId === c.id}
                              onClick={() => handleCampaignTogglePause(c, 'pause')}
                              className="px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-xs font-bold text-amber-800 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Pause className="w-3.5 h-3.5" />
                              <span>Pause</span>
                            </button>
                          )}

                          {c.status === 'Paused' && c.reviewedAt && (
                            <button
                              type="button"
                              disabled={actionBusyId === c.id}
                              onClick={() => handleCampaignTogglePause(c, 'resume')}
                              className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold text-emerald-800 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>Resume</span>
                            </button>
                          )}

                          {['Draft', 'Rejected'].includes(c.status) && (
                            <button
                              type="button"
                              disabled={actionBusyId === c.id}
                              onClick={() => handleDeleteCampaign(c.id)}
                              className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 inline-flex items-center gap-1 cursor-pointer ml-auto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PLANS & BILLING TAB */}
            {activeTab === 'billing' && (
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                        Advertising Plans &amp; Paystack Checkout
                      </h1>
                      <p className="text-xs sm:text-sm text-slate-500">
                        Plans and pricing are configured by Grobaax Administrators. Subscribing
                        renews or upgrades your corporate advertising quota.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => loadAllData()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Refresh Billing</span>
                    </button>
                  </div>

                  {plans.length === 0 ? (
                    <div className="rounded-3xl bg-white border border-slate-200 p-8 text-center text-sm text-slate-600">
                      No active corporate plans are published yet. An Administrator will
                      configure available corporate packages shortly.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {plans.map((plan) => {
                        const isCurrent = activeSub?.planId === plan.id;
                        return (
                          <div
                            key={plan.id}
                            className={`rounded-3xl border p-6 flex flex-col justify-between gap-5 ${
                              isCurrent
                                ? 'bg-blue-50/50 border-blue-400 shadow-sm'
                                : 'bg-white border-slate-200/80'
                            }`}
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <h3 className="text-lg font-extrabold text-slate-900">
                                  {plan.name}
                                </h3>
                                {isCurrent && (
                                  <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[11px] font-bold">
                                    Current Plan
                                  </span>
                                )}
                              </div>
                              <div className="text-3xl font-extrabold text-blue-700 tabular-nums">
                                ₦{Number(plan.monthlyPriceNaira).toLocaleString()}
                                <span className="text-xs font-semibold text-slate-500">
                                  {' '}
                                  / {plan.durationDays} days
                                </span>
                              </div>
                              {plan.description && (
                                <p className="text-xs text-slate-600 leading-relaxed">
                                  {plan.description}
                                </p>
                              )}
                              <div className="pt-2 border-t border-slate-100 space-y-2 text-xs text-slate-700">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <span>
                                    Max Active Campaigns:{' '}
                                    <strong className="tabular-nums">
                                      {plan.maxActiveCampaigns}
                                    </strong>
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <span>
                                    Campaign Duration Limit:{' '}
                                    <strong className="tabular-nums">
                                      {plan.campaignDurationDays} days
                                    </strong>
                                  </span>
                                </div>
                                {plan.features.map((feat, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>{feat}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={!isCompanyApproved || payingPlanId === plan.id}
                              onClick={() => handleSubscribe(plan.id)}
                              className="w-full py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-45 cursor-pointer transition-colors"
                            >
                              {payingPlanId === plan.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Redirecting to Paystack...</span>
                                </>
                              ) : (
                                <>
                                  <CreditCard className="w-4 h-4" />
                                  <span>
                                    {isCurrent ? 'Renew Plan' : 'Subscribe via Paystack'}
                                  </span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Payment History & Receipts */}
                <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xs space-y-4">
                  <h2 className="text-base font-extrabold text-slate-900">
                    Payment History &amp; Receipts
                  </h2>

                  {payments.length === 0 ? (
                    <p className="text-xs sm:text-sm text-slate-500">
                      No payment transactions recorded yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs sm:text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 text-xs">
                            <th className="py-2.5 pr-4 font-bold">Date</th>
                            <th className="py-2.5 pr-4 font-bold">Plan</th>
                            <th className="py-2.5 pr-4 font-bold">Reference</th>
                            <th className="py-2.5 pr-4 font-bold">Amount</th>
                            <th className="py-2.5 pr-4 font-bold">Status</th>
                            <th className="py-2.5 font-bold text-right">Receipt</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 tabular-nums">
                          {payments.map((p) => (
                            <tr key={p.id}>
                              <td className="py-3 pr-4 text-slate-600">
                                {new Date(p.createdAt).toLocaleDateString()}
                              </td>
                              <td className="py-3 pr-4 font-semibold text-slate-900">
                                {p.planNameSnapshot}
                              </td>
                              <td className="py-3 pr-4 font-mono text-xs text-slate-500">
                                {p.reference}
                              </td>
                              <td className="py-3 pr-4 font-bold text-slate-900">
                                ₦{Number(p.amountNaira).toLocaleString()}
                              </td>
                              <td className="py-3 pr-4">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                                    p.status === 'success'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : p.status === 'pending'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}
                                >
                                  {p.status}
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                {p.status === 'success' ? (
                                  <button
                                    type="button"
                                    onClick={() => setReceiptModal(p)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>View Receipt</span>
                                  </button>
                                ) : (
                                  <span className="text-slate-400 text-xs">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Subscription Ledger */}
                {subscriptions.length > 0 && (
                  <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xs space-y-4">
                    <h2 className="text-base font-extrabold text-slate-900">
                      Subscription History
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs sm:text-sm tabular-nums">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 text-xs">
                            <th className="py-2 pr-4 font-bold">Plan</th>
                            <th className="py-2 pr-4 font-bold">Start</th>
                            <th className="py-2 pr-4 font-bold">Expiry</th>
                            <th className="py-2 pr-4 font-bold">Quota</th>
                            <th className="py-2 font-bold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {subscriptions.map((s) => (
                            <tr key={s.id}>
                              <td className="py-2.5 pr-4 font-bold text-slate-900">
                                {s.planNameSnapshot}
                              </td>
                              <td className="py-2.5 pr-4 text-slate-600">
                                {new Date(s.startDate).toLocaleDateString()}
                              </td>
                              <td className="py-2.5 pr-4 text-slate-600">
                                {new Date(s.expiryDate).toLocaleDateString()}
                              </td>
                              <td className="py-2.5 pr-4 text-slate-600">
                                {s.maxActiveCampaignsSnapshot} campaigns
                              </td>
                              <td className="py-2.5">
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold capitalize">
                                  {s.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ANALYTICS TAB */}
            {activeTab === 'analytics' && (
              <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xs space-y-5">
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900">
                    Campaign Performance Breakdown
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Deduplicated School Blog impressions, clicks, and click-through rates
                    across your campaigns.
                  </p>
                </div>

                {campaigns.length === 0 ? (
                  <p className="text-sm text-slate-500 py-6">
                    No campaign telemetry available yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm tabular-nums">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 text-xs">
                          <th className="py-2.5 pr-4 font-bold">Campaign</th>
                          <th className="py-2.5 pr-4 font-bold">Status</th>
                          <th className="py-2.5 pr-4 font-bold">Impressions</th>
                          <th className="py-2.5 pr-4 font-bold">Clicks</th>
                          <th className="py-2.5 pr-4 font-bold">CTR</th>
                          <th className="py-2.5 font-bold">Expiry</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {campaigns.map((c) => (
                          <tr key={c.id}>
                            <td className="py-3 pr-4">
                              <div className="font-bold text-slate-900">
                                {c.campaignName}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {c.headline}
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                                  STATUS_BADGE[c.status] || 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {c.status}
                              </span>
                            </td>
                            <td className="py-3 pr-4 font-bold text-slate-900">
                              {c.impressionsCount.toLocaleString()}
                            </td>
                            <td className="py-3 pr-4 font-bold text-slate-900">
                              {c.clicksCount.toLocaleString()}
                            </td>
                            <td className="py-3 pr-4 font-bold text-blue-700">{c.ctr}%</td>
                            <td className="py-3 text-slate-600">
                              {c.expiryDate
                                ? new Date(c.expiryDate).toLocaleDateString()
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900">
                    Company Profile &amp; Verification Document
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Registered Company: <strong>{company.companyName}</strong> &middot;{' '}
                    Official Email: <strong>{company.officialEmail}</strong>
                  </p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Brand / Business Name
                      </label>
                      <input
                        type="text"
                        required
                        value={profBrandName}
                        onChange={(e) => setProfBrandName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Registration Number
                      </label>
                      <input
                        type="text"
                        value={profRegNo}
                        onChange={(e) => setProfRegNo(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Website
                      </label>
                      <input
                        type="url"
                        value={profWebsite}
                        onChange={(e) => setProfWebsite(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Contact Person
                      </label>
                      <input
                        type="text"
                        required
                        value={profContactName}
                        onChange={(e) => setProfContactName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        required
                        value={profPhone}
                        onChange={(e) => setProfPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        required
                        value={profAddress}
                        onChange={(e) => setProfAddress(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        State / Region
                      </label>
                      <input
                        type="text"
                        required
                        value={profState}
                        onChange={(e) => setProfState(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Country
                      </label>
                      <input
                        type="text"
                        required
                        value={profCountry}
                        onChange={(e) => setProfCountry(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Company Description
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={profDescription}
                        onChange={(e) => setProfDescription(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100">
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer">
                      {isUploadingDoc ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {company.supportingDocumentName
                          ? `Replace Doc (${company.supportingDocumentName})`
                          : 'Upload Verification Document'}
                      </span>
                      <input
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        onChange={handleDocUpload}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold cursor-pointer disabled:opacity-60"
                    >
                      {isSavingProfile ? 'Saving...' : 'Save Company Profile'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </main>

      {/* Campaign Builder + Live School Blog Sponsored Ad Preview Modal */}
      {isCampaignFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-4xl rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden my-6">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                {editingCampaignId ? 'Edit Ad Campaign' : 'Create Corporate Ad Campaign'}
              </h2>
              <button
                type="button"
                onClick={() => setIsCampaignFormOpen(false)}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-h-[82vh] overflow-y-auto">
              <div className="lg:col-span-7 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Internal Campaign Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={campName}
                    onChange={(e) => setCampName(e.target.value)}
                    placeholder="e.g. Back to Campus Student Promo"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ad Headline *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={90}
                    value={campHeadline}
                    onChange={(e) => setCampHeadline(e.target.value)}
                    placeholder="Zero-Fee Student Savings & Instant Card"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ad Description Text *
                  </label>
                  <textarea
                    rows={3}
                    required
                    maxLength={240}
                    value={campAdText}
                    onChange={(e) => setCampAdText(e.target.value)}
                    placeholder="Open a student digital account in under 3 minutes and enjoy zero transfer charges all semester."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      CTA Button Label
                    </label>
                    <input
                      type="text"
                      maxLength={32}
                      value={campCtaLabel}
                      onChange={(e) => setCampCtaLabel(e.target.value)}
                      placeholder="Learn More"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Requested Duration (Days)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={activeSub?.campaignDurationDaysSnapshot || 30}
                      value={campDurationDays}
                      onChange={(e) => setCampDurationDays(Number(e.target.value) || 30)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Destination Link URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={campDestUrl}
                    onChange={(e) => setCampDestUrl(e.target.value)}
                    placeholder="https://yourbrand.com/student-offer"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Ad Creative Banner Image *
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold cursor-pointer">
                      {isUploadingCreative ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ImagePlus className="w-4 h-4" />
                      )}
                      <span>
                        {isUploadingCreative
                          ? 'Uploading...'
                          : 'Upload Creative (JPG/PNG/WEBP)'}
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleCreativeUpload}
                        className="hidden"
                      />
                    </label>
                    {campImageUrl && (
                      <span className="text-xs font-semibold text-emerald-700">
                        Image attached
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Live School Blog Placement Preview */}
              <div className="lg:col-span-5 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Live School Blog Placement Preview
                </div>
                <div className="rounded-2xl border border-slate-200 bg-[#f8faff] p-4 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-bold uppercase tracking-wider text-blue-700">
                      Sponsored
                    </span>
                    <span>{company.brandName || company.companyName}</span>
                  </div>

                  {campImageUrl ? (
                    <div className="rounded-xl overflow-hidden border border-slate-200 aspect-[16/9] bg-slate-100">
                      <img
                        src={campImageUrl}
                        alt="Ad creative preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white aspect-[16/9] flex items-center justify-center text-xs text-slate-400">
                      Creative Image Preview
                    </div>
                  )}

                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold text-slate-900">
                      {campHeadline || 'Your Campaign Headline'}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {campAdText ||
                        'Concise advertisement message displayed directly beneath School Blog articles.'}
                    </p>
                  </div>

                  <div className="pt-1 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                      {campDestUrl || 'https://yourbrand.com'}
                    </span>
                    <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">
                      <span>{campCtaLabel || 'Learn More'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>

                <div className="pt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={isSavingCampaign || isUploadingCreative}
                    onClick={() => handleSaveCampaign(true)}
                    className="w-full py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold cursor-pointer disabled:opacity-50"
                  >
                    {isSavingCampaign ? 'Submitting...' : 'Submit for Admin Review'}
                  </button>
                  <button
                    type="button"
                    disabled={isSavingCampaign || isUploadingCreative}
                    onClick={() => handleSaveCampaign(false)}
                    className="w-full py-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold cursor-pointer disabled:opacity-50"
                  >
                    Save as Draft
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Invoice / Receipt Modal */}
      {receiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-[#1d4ed8] to-[#4f46e5] text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Receipt className="w-4 h-4" />
                <span>Corporate Advertising Receipt</span>
              </div>
              <button
                type="button"
                onClick={() => setReceiptModal(null)}
                className="p-1 rounded-full hover:bg-white/15 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs sm:text-sm tabular-nums">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="text-slate-400 text-xs">Receipt Number</div>
                  <div className="font-extrabold text-slate-900">
                    {receiptModal.receiptNumber || receiptModal.reference}
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                  PAID
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Billed Organization</span>
                  <strong className="text-slate-900">{company.companyName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Plan Subscribed</span>
                  <strong className="text-slate-900">{receiptModal.planNameSnapshot}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Paystack Reference</span>
                  <strong className="font-mono text-slate-900">
                    {receiptModal.reference}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Payment Date</span>
                  <strong className="text-slate-900">
                    {new Date(
                      receiptModal.paidAt || receiptModal.createdAt
                    ).toLocaleString()}
                  </strong>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 flex items-center justify-between">
                <span className="font-bold text-slate-700">Total Amount Paid</span>
                <span className="text-xl font-extrabold text-blue-700">
                  ₦{Number(receiptModal.amountNaira).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-bold cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptModal(null)}
                  className="px-4 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
