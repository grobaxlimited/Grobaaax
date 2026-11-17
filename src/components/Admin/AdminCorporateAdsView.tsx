import React, { useCallback, useEffect, useState } from 'react';
import {
  Ban,
  Building2,
  CheckCircle2,
  CreditCard,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  History,
  Layers,
  Loader2,
  Megaphone,
  Pause,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  X,
  XCircle,
} from 'lucide-react';
import {
  CorporateAccount,
  CorporateAccountStatus,
  CorporateAdCampaign,
  CorporateAdminOverview,
  CorporateAuditLog,
  CorporatePayment,
  CorporatePlan,
  CorporateSubscription,
  adminCreateCorporatePlan,
  adminFetchCompanyDocumentUrl,
  adminFetchCorporateAuditLogs,
  adminFetchCorporateCampaigns,
  adminFetchCorporateCompanies,
  adminFetchCorporateOverview,
  adminFetchCorporatePayments,
  adminFetchCorporatePlans,
  adminFetchCorporateSubscriptions,
  adminReviewCorporateCampaign,
  adminUpdateCompanyStatus,
  adminUpdateCorporatePlan,
} from '../../lib/corporateAdsService';

type AdminCorpSubTab =
  | 'overview'
  | 'companies'
  | 'campaigns'
  | 'plans'
  | 'ledger'
  | 'audit';

const BADGE_STYLE: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
  Suspended: 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
  'Pending Review': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  Paused: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
  Draft: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  Expired: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
};

export const AdminCorporateAdsView: React.FC = () => {
  const [subTab, setSubTab] = useState<AdminCorpSubTab>('overview');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Overview + Date Range
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [overview, setOverview] = useState<CorporateAdminOverview | null>(null);

  // Companies
  const [companyFilter, setCompanyFilter] = useState('All');
  const [companySearch, setCompanySearch] = useState('');
  const [companies, setCompanies] = useState<CorporateAccount[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CorporateAccount | null>(null);
  const [companyDocUrl, setCompanyDocUrl] = useState<string | null>(null);
  const [companyDocLoading, setCompanyDocLoading] = useState(false);
  const [companyFeedback, setCompanyFeedback] = useState('');
  const [companyActionBusy, setCompanyActionBusy] = useState(false);

  // Campaigns
  const [campFilter, setCampFilter] = useState('All');
  const [campSearch, setCampSearch] = useState('');
  const [campaigns, setCampaigns] = useState<CorporateAdCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<CorporateAdCampaign | null>(null);
  const [campReason, setCampReason] = useState('');
  const [campActionBusy, setCampActionBusy] = useState(false);

  // Plans
  const [plans, setPlans] = useState<CorporatePlan[]>([]);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [planPrice, setPlanPrice] = useState('');
  const [planDurationDays, setPlanDurationDays] = useState('30');
  const [planMaxCampaigns, setPlanMaxCampaigns] = useState('1');
  const [planCampDurationDays, setPlanCampDurationDays] = useState('30');
  const [planFeaturesText, setPlanFeaturesText] = useState('');
  const [planIsActive, setPlanIsActive] = useState(true);
  const [planSortOrder, setPlanSortOrder] = useState('1');
  const [planSaving, setPlanSaving] = useState(false);

  // Ledger & Audit
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('All');
  const [payments, setPayments] = useState<CorporatePayment[]>([]);
  const [subscriptions, setSubscriptions] = useState<CorporateSubscription[]>([]);
  const [auditLogs, setAuditLogs] = useState<CorporateAuditLog[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, compRes, campRes, planRes, payRes, subRes, logRes] = await Promise.all([
        adminFetchCorporateOverview(fromDate || undefined, toDate || undefined),
        adminFetchCorporateCompanies(companyFilter, companySearch || undefined),
        adminFetchCorporateCampaigns(campFilter, campSearch || undefined),
        adminFetchCorporatePlans(),
        adminFetchCorporatePayments(paymentStatusFilter),
        adminFetchCorporateSubscriptions(),
        adminFetchCorporateAuditLogs(),
      ]);

      if (ovRes.success && ovRes.overview) setOverview(ovRes.overview);
      if (compRes.success && compRes.companies) setCompanies(compRes.companies);
      if (campRes.success && campRes.campaigns) setCampaigns(campRes.campaigns);
      if (planRes.success && planRes.plans) setPlans(planRes.plans);
      if (payRes.success && payRes.payments) setPayments(payRes.payments);
      if (subRes.success && subRes.subscriptions) setSubscriptions(subRes.subscriptions);
      if (logRes.success && logRes.logs) setAuditLogs(logRes.logs);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, companyFilter, companySearch, campFilter, campSearch, paymentStatusFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleInspectCompany = async (comp: CorporateAccount) => {
    setSelectedCompany(comp);
    setCompanyFeedback(comp.adminFeedback || '');
    setCompanyDocUrl(null);
    if (comp.supportingDocumentUrl) {
      setCompanyDocLoading(true);
      try {
        const res = await adminFetchCompanyDocumentUrl(comp.id);
        if (res.success && res.signedUrl) {
          setCompanyDocUrl(res.signedUrl);
        }
      } finally {
        setCompanyDocLoading(false);
      }
    }
  };

  const handleCompanyStatusChange = async (status: CorporateAccountStatus) => {
    if (!selectedCompany) return;
    setNotice(null);
    if ((status === 'Rejected' || status === 'Suspended') && companyFeedback.trim().length < 3) {
      setNotice({
        type: 'error',
        text: 'Please provide feedback/reason before rejecting or suspending a company.',
      });
      return;
    }
    setCompanyActionBusy(true);
    try {
      const res = await adminUpdateCompanyStatus(
        selectedCompany.id,
        status,
        companyFeedback.trim()
      );
      if (!res.success || !res.company) {
        setNotice({ type: 'error', text: res.error || 'Failed to update company status.' });
        return;
      }
      setSelectedCompany(res.company);
      setNotice({
        type: 'success',
        text: `${res.company.companyName} status updated to ${status}.`,
      });
      await loadData();
    } finally {
      setCompanyActionBusy(false);
    }
  };

  const handleCampaignReview = async (
    action: 'approve' | 'reject' | 'pause' | 'suspend'
  ) => {
    if (!selectedCampaign) return;
    setNotice(null);
    if (action === 'reject' && campReason.trim().length < 3) {
      setNotice({
        type: 'error',
        text: 'Please enter a rejection reason so the company knows what to revise.',
      });
      return;
    }
    setCampActionBusy(true);
    try {
      const res = await adminReviewCorporateCampaign(selectedCampaign.id, {
        action,
        rejectionReason: campReason.trim(),
        adminFeedback: campReason.trim(),
      });
      if (!res.success || !res.campaign) {
        setNotice({ type: 'error', text: res.error || 'Failed to review campaign.' });
        return;
      }
      setSelectedCampaign(res.campaign);
      setNotice({
        type: 'success',
        text: `Campaign "${res.campaign.campaignName}" updated (${res.campaign.status}).`,
      });
      await loadData();
    } finally {
      setCampActionBusy(false);
    }
  };

  const openCreatePlanModal = () => {
    setEditingPlanId(null);
    setPlanName('');
    setPlanDescription('');
    setPlanPrice('');
    setPlanDurationDays('30');
    setPlanMaxCampaigns('1');
    setPlanCampDurationDays('30');
    setPlanFeaturesText(
      'Sponsored placement beneath School Blog articles\nImpressions & clicks analytics dashboard\nDedicated campaign review support'
    );
    setPlanIsActive(true);
    setPlanSortOrder(String(plans.length + 1));
    setPlanModalOpen(true);
  };

  const openEditPlanModal = (p: CorporatePlan) => {
    setEditingPlanId(p.id);
    setPlanName(p.name);
    setPlanDescription(p.description || '');
    setPlanPrice(String(p.monthlyPriceNaira));
    setPlanDurationDays(String(p.durationDays));
    setPlanMaxCampaigns(String(p.maxActiveCampaigns));
    setPlanCampDurationDays(String(p.campaignDurationDays));
    setPlanFeaturesText((p.features || []).join('\n'));
    setPlanIsActive(p.isActive);
    setPlanSortOrder(String(p.sortOrder || 1));
    setPlanModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    setPlanSaving(true);
    try {
      const features = planFeaturesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const payload = {
        name: planName.trim(),
        description: planDescription.trim(),
        monthlyPriceNaira: Number(planPrice),
        durationDays: Math.max(1, Number(planDurationDays) || 30),
        maxActiveCampaigns: Math.max(1, Number(planMaxCampaigns) || 1),
        campaignDurationDays: Math.max(1, Number(planCampDurationDays) || 30),
        placementEligibility: ['school_blog_article_footer'],
        features,
        isActive: planIsActive,
        sortOrder: Number(planSortOrder) || 1,
      };

      const res = editingPlanId
        ? await adminUpdateCorporatePlan(editingPlanId, payload)
        : await adminCreateCorporatePlan(payload);

      if (!res.success) {
        setNotice({ type: 'error', text: res.error || 'Could not save corporate plan.' });
        return;
      }

      setPlanModalOpen(false);
      setNotice({
        type: 'success',
        text: editingPlanId
          ? 'Corporate advertising plan updated.'
          : 'New corporate advertising plan created.',
      });
      await loadData();
    } finally {
      setPlanSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Corporate Advertising Portal Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Verify companies on advertise.grobaax.com, manage Corporate Subscription Plans,
            moderate School Blog ad creatives, and audit corporate revenue.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadData()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
        {(
          [
            { id: 'overview', label: 'Financial Overview', icon: TrendingUp },
            {
              id: 'companies',
              label: `Companies (${overview?.pendingCompaniesCount ?? 0} Pending)`,
              icon: Building2,
            },
            {
              id: 'campaigns',
              label: `Ad Campaigns (${overview?.pendingCampaignsCount ?? 0} Review)`,
              icon: Megaphone,
            },
            { id: 'plans', label: 'Subscription Plans', icon: Layers },
            { id: 'ledger', label: 'Payments & Subs', icon: Receipt },
            { id: 'audit', label: 'Audit Logs', icon: History },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {notice && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
          }`}
        >
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. FINANCIAL OVERVIEW */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-end justify-between gap-4">
            <div className="text-xs text-slate-600 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white block">
                Corporate Advertising Revenue Ledger
              </strong>
              100% isolated platform revenue &mdash; never shared with student or blogger GP
              wallets.
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  To
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              {(fromDate || toDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setFromDate('');
                    setToDate('');
                  }}
                  className="mt-4 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-1">
              <div className="text-xs font-bold text-slate-500">Total Verified Revenue</div>
              <div className="text-2xl font-black text-emerald-600">
                ₦{Number(overview?.totalRevenueNaira || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400">
                {overview?.successfulPaymentsCount || 0} successful Paystack payment(s)
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-1">
              <div className="text-xs font-bold text-slate-500">Active / Expired Subs</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {overview?.activeSubscriptionsCount || 0}{' '}
                <span className="text-sm font-semibold text-slate-400">
                  / {overview?.expiredSubscriptionsCount || 0} exp
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                {overview?.approvedCompaniesCount || 0} approved companies
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-1">
              <div className="text-xs font-bold text-slate-500">Pending / Failed Pay</div>
              <div className="text-2xl font-black text-amber-600">
                {overview?.pendingPaymentsCount || 0}{' '}
                <span className="text-sm font-semibold text-rose-500">
                  / {overview?.failedPaymentsCount || 0} failed
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Pending ₦{Number(overview?.pendingAmountNaira || 0).toLocaleString()}
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-1">
              <div className="text-xs font-bold text-slate-500">Ad Delivery Totals</div>
              <div className="text-2xl font-black text-blue-600">
                {Number(overview?.totalImpressions || 0).toLocaleString()}{' '}
                <span className="text-xs font-semibold text-slate-400">views</span>
              </div>
              <div className="text-[11px] text-slate-400">
                {Number(overview?.totalClicks || 0).toLocaleString()} clicks &middot;{' '}
                {overview?.ctr || 0}% CTR
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Revenue Breakdown by Corporate Plan
            </h2>
            {!overview?.revenueByPlan?.length ? (
              <p className="text-xs text-slate-500">
                No completed corporate plan payments inside this date filter.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs tabular-nums">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                      <th className="py-2 pr-4">Plan Name</th>
                      <th className="py-2 pr-4">Verified Payments</th>
                      <th className="py-2">Total Revenue (NGN)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {overview.revenueByPlan.map((row) => (
                      <tr key={row.planId}>
                        <td className="py-2.5 pr-4 font-bold text-slate-900 dark:text-white">
                          {row.planName}
                        </td>
                        <td className="py-2.5 pr-4">{row.paymentCount}</td>
                        <td className="py-2.5 font-extrabold text-emerald-600">
                          ₦{Number(row.revenueNaira).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. COMPANIES & APPLICATIONS */}
      {subTab === 'companies' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {['All', 'Pending', 'Approved', 'Rejected', 'Suspended'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setCompanyFilter(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border ${
                    companyFilter === s
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                placeholder="Search company, brand, email..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            {companies.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No corporate applications match this filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500">
                      <th className="p-3.5 font-bold">Company / Brand</th>
                      <th className="p-3.5 font-bold">Industry</th>
                      <th className="p-3.5 font-bold">Account Email</th>
                      <th className="p-3.5 font-bold">Location</th>
                      <th className="p-3.5 font-bold">Status</th>
                      <th className="p-3.5 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {companies.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {c.companyName}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Brand: {c.brandName}
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300">
                          {c.industry}
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300">
                          {c.officialEmail}
                        </td>
                        <td className="p-3.5 text-slate-500">
                          {c.state}, {c.country}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                              BADGE_STYLE[c.status] || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleInspectCompany(c)}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] cursor-pointer"
                          >
                            Review Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. AD CAMPAIGNS MODERATION */}
      {subTab === 'campaigns' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {['All', 'Pending Review', 'Active', 'Paused', 'Rejected', 'Suspended', 'Expired'].map(
                (s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setCampFilter(s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border ${
                      campFilter === s
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {s}
                  </button>
                )
              )}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={campSearch}
                onChange={(e) => setCampSearch(e.target.value)}
                placeholder="Search campaign or brand..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.length === 0 ? (
              <div className="md:col-span-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-500">
                No corporate ad campaigns match this filter.
              </div>
            ) : (
              campaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-extrabold text-blue-600">
                        {camp.brandName || camp.companyName}
                      </div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {camp.campaignName}
                      </h3>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                        BADGE_STYLE[camp.status] || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {camp.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {camp.creativeImageUrl && (
                      <img
                        src={camp.creativeImageUrl}
                        alt={camp.headline}
                        referrerPolicy="no-referrer"
                        className="w-20 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                    )}
                    <div className="min-w-0 space-y-1">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {camp.headline}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {camp.adText}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800 tabular-nums">
                    <span>
                      {camp.impressionsCount.toLocaleString()} views &middot;{' '}
                      {camp.clicksCount.toLocaleString()} clicks ({camp.ctr}% CTR)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCampaign(camp);
                        setCampReason(camp.rejectionReason || camp.adminFeedback || '');
                      }}
                      className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                    >
                      Moderate Ad
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. CORPORATE SUBSCRIPTION PLANS */}
      {subTab === 'plans' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Admin-Configured Corporate Plans
              </h2>
              <p className="text-xs text-slate-500">
                Create or update pricing, billing durations, campaign quotas, and
                placement availability displayed on advertise.grobaax.com.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreatePlanModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Corporate Plan</span>
            </button>
          </div>

          {plans.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-500">
              No corporate subscription plans created yet. Click &ldquo;Create Corporate
              Plan&rdquo; to publish your first advertising tier.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                        {p.name}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="text-2xl font-black text-blue-600 tabular-nums">
                      ₦{Number(p.monthlyPriceNaira).toLocaleString()}
                      <span className="text-xs font-semibold text-slate-400">
                        {' '}
                        / {p.durationDays} days
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{p.description}</p>
                    <div className="text-xs space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800 tabular-nums">
                      <div>
                        Max Active Campaigns: <strong>{p.maxActiveCampaigns}</strong>
                      </div>
                      <div>
                        Max Campaign Duration:{' '}
                        <strong>{p.campaignDurationDays} days</strong>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEditPlanModal(p)}
                    className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Plan Settings</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. PAYMENTS & SUBSCRIPTIONS LEDGER */}
      {subTab === 'ledger' && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Corporate Paystack Payment Transactions
              </h2>
              <div className="flex items-center gap-1.5">
                {['All', 'success', 'pending', 'failed'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setPaymentStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize cursor-pointer border ${
                      paymentStatusFilter === st
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs tabular-nums">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2 pr-3">Company</th>
                    <th className="py-2 pr-3">Plan</th>
                    <th className="py-2 pr-3">Reference</th>
                    <th className="py-2 pr-3">Amount</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2.5 pr-3 font-bold">
                        {p.companyName || p.brandName || p.companyId}
                      </td>
                      <td className="py-2.5 pr-3">{p.planNameSnapshot}</td>
                      <td className="py-2.5 pr-3 font-mono text-[11px] text-slate-500">
                        {p.reference}
                      </td>
                      <td className="py-2.5 pr-3 font-bold">
                        ₦{Number(p.amountNaira).toLocaleString()}
                      </td>
                      <td className="py-2.5 pr-3 capitalize font-bold">{p.status}</td>
                      <td className="py-2.5 text-slate-500">
                        {new Date(p.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Corporate Subscriptions
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs tabular-nums">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2 pr-3">Company</th>
                    <th className="py-2 pr-3">Plan</th>
                    <th className="py-2 pr-3">Quota</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2">Expires</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {subscriptions.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2.5 pr-3 font-bold">
                        {s.companyName || s.brandName}
                      </td>
                      <td className="py-2.5 pr-3">{s.planNameSnapshot}</td>
                      <td className="py-2.5 pr-3">
                        {s.maxActiveCampaignsSnapshot} campaigns
                      </td>
                      <td className="py-2.5 pr-3 capitalize font-bold">{s.status}</td>
                      <td className="py-2.5 text-slate-500">
                        {new Date(s.expiryDate).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. AUDIT LOGS */}
      {subTab === 'audit' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
            Corporate Portal Audit Trail
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-2 pr-3">Actor</th>
                  <th className="py-2 pr-3">Action</th>
                  <th className="py-2 pr-3">Target</th>
                  <th className="py-2">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {auditLogs.map((l) => (
                  <tr key={l.id}>
                    <td className="py-2.5 pr-3 font-semibold">
                      {l.actor_name}{' '}
                      <span className="text-slate-400">({l.actor_role})</span>
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-[11px] font-bold text-blue-600">
                      {l.action}
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600 dark:text-slate-300">
                      {l.target_type} &middot; {l.target_id.slice(0, 12)}
                    </td>
                    <td className="py-2.5 text-slate-500 tabular-nums">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* COMPANY INSPECTION & APPROVAL MODAL */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {selectedCompany.companyName}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedCompany(null)}
                className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl">
                <div>
                  <span className="text-slate-400 block">Brand Name</span>
                  <strong className="text-slate-900 dark:text-white">
                    {selectedCompany.brandName}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Industry</span>
                  <strong className="text-slate-900 dark:text-white">
                    {selectedCompany.industry}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Registration Number</span>
                  <strong>{selectedCompany.registrationNumber || 'Not provided'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Website</span>
                  <strong>{selectedCompany.website || 'Not provided'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Contact Person</span>
                  <strong>{selectedCompany.contactName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Account Email / Phone</span>
                  <strong>
                    {selectedCompany.officialEmail} &middot; {selectedCompany.phone}
                  </strong>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block">Address</span>
                  <strong>
                    {selectedCompany.address}, {selectedCompany.state},{' '}
                    {selectedCompany.country}
                  </strong>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block">Description</span>
                  <p className="text-slate-700 dark:text-slate-200 mt-0.5 leading-relaxed">
                    {selectedCompany.description}
                  </p>
                </div>
              </div>

              {selectedCompany.supportingDocumentUrl && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-blue-200 bg-blue-50/70 dark:bg-blue-950/30 dark:border-blue-800">
                  <span className="font-bold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>
                      {selectedCompany.supportingDocumentName || 'Verification Document'}
                    </span>
                  </span>
                  {companyDocLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  ) : companyDocUrl ? (
                    <a
                      href={companyDocUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 text-white font-bold"
                    >
                      <span>View Document</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-slate-500">Unavailable</span>
                  )}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Admin Feedback / Reason (Required for Rejection or Suspension)
                </label>
                <textarea
                  rows={2}
                  value={companyFeedback}
                  onChange={(e) => setCompanyFeedback(e.target.value)}
                  placeholder="Optional approval note, or clear explanation if rejecting/suspending..."
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={companyActionBusy}
                  onClick={() => handleCompanyStatusChange('Approved')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve Company</span>
                </button>
                <button
                  type="button"
                  disabled={companyActionBusy}
                  onClick={() => handleCompanyStatusChange('Rejected')}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
                <button
                  type="button"
                  disabled={companyActionBusy}
                  onClick={() => handleCompanyStatusChange('Suspended')}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Suspend</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CAMPAIGN REVIEW MODAL */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Moderate Ad: {selectedCampaign.campaignName}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedCampaign(null)}
                className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 bg-slate-50/70 dark:bg-slate-800/40">
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-blue-600">
                    Sponsored &middot;{' '}
                    {selectedCampaign.brandName || selectedCampaign.companyName}
                  </span>
                  <span className="text-slate-500">
                    Requested: {selectedCampaign.requestedDurationDays} days
                  </span>
                </div>
                {selectedCampaign.creativeImageUrl && (
                  <img
                    src={selectedCampaign.creativeImageUrl}
                    alt={selectedCampaign.headline}
                    referrerPolicy="no-referrer"
                    className="w-full max-h-56 object-cover rounded-xl border border-slate-200"
                  />
                )}
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {selectedCampaign.headline}
                </h4>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {selectedCampaign.adText}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <a
                    href={selectedCampaign.destinationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    <span>{selectedCampaign.destinationUrl}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="px-3 py-1 rounded-full bg-blue-600 text-white font-bold">
                    {selectedCampaign.ctaLabel}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Moderator Notes / Rejection Reason
                </label>
                <textarea
                  rows={2}
                  value={campReason}
                  onChange={(e) => setCampReason(e.target.value)}
                  placeholder="Required if rejecting..."
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={campActionBusy}
                  onClick={() => handleCampaignReview('approve')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Approve &amp; Activate</span>
                </button>
                <button
                  type="button"
                  disabled={campActionBusy}
                  onClick={() => handleCampaignReview('reject')}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
                <button
                  type="button"
                  disabled={campActionBusy}
                  onClick={() => handleCampaignReview('pause')}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </button>
                <button
                  type="button"
                  disabled={campActionBusy}
                  onClick={() => handleCampaignReview('suspend')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Suspend</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT CORPORATE PLAN MODAL */}
      {planModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>
                  {editingPlanId
                    ? 'Edit Corporate Plan'
                    : 'Create Corporate Advertising Plan'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setPlanModalOpen(false)}
                className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="p-6 space-y-4 overflow-y-auto text-xs">
              <div>
                <label className="block font-bold mb-1">Plan Name *</label>
                <input
                  type="text"
                  required
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="e.g. Campus Enterprise Partner"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Description</label>
                <input
                  type="text"
                  value={planDescription}
                  onChange={(e) => setPlanDescription(e.target.value)}
                  placeholder="Best for universities, banks, or consumer brands"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Price (NGN ₦) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={planPrice}
                    onChange={(e) => setPlanPrice(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Plan Billing Days *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={planDurationDays}
                    onChange={(e) => setPlanDurationDays(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Max Active Campaigns *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={planMaxCampaigns}
                    onChange={(e) => setPlanMaxCampaigns(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Campaign Duration Limit (Days)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={planCampDurationDays}
                    onChange={(e) => setPlanCampDurationDays(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">
                  Features (One per line)
                </label>
                <textarea
                  rows={3}
                  value={planFeaturesText}
                  onChange={(e) => setPlanFeaturesText(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-2 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planIsActive}
                    onChange={(e) => setPlanIsActive(e.target.checked)}
                    className="rounded"
                  />
                  <span>Active &amp; Visible for Purchase</span>
                </label>

                <div className="flex items-center gap-2">
                  <span>Order:</span>
                  <input
                    type="number"
                    value={planSortOrder}
                    onChange={(e) => setPlanSortOrder(e.target.value)}
                    className="w-16 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 tabular-nums"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPlanModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={planSaving}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {planSaving ? 'Saving...' : 'Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
