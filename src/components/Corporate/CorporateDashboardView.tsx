import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
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
  Radio,
  Receipt,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  CORPORATE_PORTAL_ORIGIN,
  CorporatePortalRoute,
} from '../../utils/domainPortal';
import {
  DEFAULT_BRAND_HIGHLIGHT_COLOR,
  getBrandHighlightStyles,
  normalizeHexColor,
} from '../../utils/brandColor';
import { BrandColorPicker } from './BrandColorPicker';
import {
  CorporateAccount,
  CorporateAdCampaign,
  CorporateAnalyticsSummary,
  CorporatePayment,
  CorporatePlan,
  CorporateSubscription,
  CorporateTickerCampaign,
  createCorporateCampaign,
  createCorporateTickerCampaign,
  deleteCorporateCampaign,
  deleteCorporateTickerCampaign,
  fetchCorporateBilling,
  fetchCorporateCampaigns,
  fetchCorporateMe,
  fetchCorporateTickerCampaigns,
  fetchPublicCorporatePlans,
  initializeCorporatePayment,
  logoutCorporateAccount,
  updateCorporateCampaign,
  updateCorporateProfile,
  updateCorporateTickerCampaign,
  uploadCorporateMedia,
  verifyCorporatePayment,
} from '../../lib/corporateAdsService';

type DashboardTab = 'overview' | 'campaigns' | 'ticker' | 'billing' | 'analytics' | 'profile';

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
      if (
        t === 'billing' ||
        t === 'campaigns' ||
        t === 'ticker' ||
        t === 'analytics' ||
        t === 'profile'
      ) {
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
  const [tickerCampaigns, setTickerCampaigns] = useState<CorporateTickerCampaign[]>([]);
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
  const [upgradingTicker, setUpgradingTicker] = useState(false);
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
  const [campHighlightColor, setCampHighlightColor] = useState(
    normalizeHexColor(initialCompany.brandHighlightColor, DEFAULT_BRAND_HIGHLIGHT_COLOR)
  );
  const [campSyncBrandColor, setCampSyncBrandColor] = useState(true);
  const [isUploadingCreative, setIsUploadingCreative] = useState(false);
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  // Sponsor Ticker Builder Modal (Text-Only)
  const [isTickerFormOpen, setIsTickerFormOpen] = useState(false);
  const [editingTickerId, setEditingTickerId] = useState<string | null>(null);
  const [tickerName, setTickerName] = useState('');
  const [tickerShortMessage, setTickerShortMessage] = useState('');
  const [tickerHeadline, setTickerHeadline] = useState('');
  const [tickerFullDesc, setTickerFullDesc] = useState('');
  const [tickerDestUrl, setTickerDestUrl] = useState('');
  const [tickerCtaLabel, setTickerCtaLabel] = useState('Learn More');
  const [tickerDurationDays, setTickerDurationDays] = useState(30);
  const [tickerHighlightColor, setTickerHighlightColor] = useState(
    normalizeHexColor(initialCompany.brandHighlightColor, DEFAULT_BRAND_HIGHLIGHT_COLOR)
  );
  const [tickerSyncBrandColor, setTickerSyncBrandColor] = useState(true);
  const [isSavingTicker, setIsSavingTicker] = useState(false);

  // Company Profile Edit Form
  const [profBrandName, setProfBrandName] = useState(initialCompany.brandName || '');
  const [profLogoUrl, setProfLogoUrl] = useState(initialCompany.logoUrl || '');
  const [profHighlightColor, setProfHighlightColor] = useState(
    normalizeHexColor(initialCompany.brandHighlightColor, DEFAULT_BRAND_HIGHLIGHT_COLOR)
  );
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
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, billingRes, campsRes, tickersRes, plansRes] = await Promise.all([
        fetchCorporateMe(),
        fetchCorporateBilling(),
        fetchCorporateCampaigns(),
        fetchCorporateTickerCampaigns(),
        fetchPublicCorporatePlans(),
      ]);

      if (meRes.success && meRes.company) {
        setCompany(meRes.company);
        onCompanyUpdated(meRes.company);
        setProfBrandName(meRes.company.brandName || '');
        setProfLogoUrl(meRes.company.logoUrl || '');
        setProfHighlightColor(
          normalizeHexColor(meRes.company.brandHighlightColor, DEFAULT_BRAND_HIGHLIGHT_COLOR)
        );
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
      if (tickersRes.success) {
        setTickerCampaigns(tickersRes.tickerCampaigns || []);
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
            const isTickerUpgradePay = res.payment?.purchaseType === 'ticker_upgrade';
            setNotice({
              type: 'success',
              text: isTickerUpgradePay
                ? 'Paystack payment verified! Your Sponsor Ticker add-on is now active.'
                : 'Paystack payment verified! Your Corporate Advertising subscription is now active.',
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

  const hasTickerPlanAccess = Boolean(
    hasActiveSubscription &&
      Number(activeSub?.maxTickerCampaignsSnapshot || 0) >= 1 &&
      (activeSub?.sponsorTickerModeSnapshot === 'included' ||
        activeSub?.sponsorTickerModeSnapshot === 'required' ||
        (activeSub?.sponsorTickerModeSnapshot === 'optional_upgrade' &&
          activeSub?.tickerUpgradeActive))
  );

  const canPurchaseTickerUpgrade = Boolean(
    isCompanyApproved &&
      hasActiveSubscription &&
      activeSub?.sponsorTickerModeSnapshot === 'optional_upgrade' &&
      !activeSub?.tickerUpgradeActive &&
      Number(activeSub?.tickerUpgradePriceSnapshot || 0) > 0
  );

  const tickerTotals = useMemo(() => {
    return tickerCampaigns.reduce(
      (acc, t) => {
        if (t.status === 'Active') acc.activeCount += 1;
        acc.barImpressions += Number(t.barImpressionsCount || 0);
        acc.barClicks += Number(t.barClicksCount || 0);
        acc.detailViews += Number(t.detailViewsCount || 0);
        acc.websiteClicks += Number(t.websiteClicksCount || 0);
        return acc;
      },
      {
        activeCount: 0,
        barImpressions: 0,
        barClicks: 0,
        detailViews: 0,
        websiteClicks: 0,
      }
    );
  }, [tickerCampaigns]);

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
      const res = await initializeCorporatePayment(planId, callbackUrl, 'plan_subscription');
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

  const handleSubscribeTickerUpgrade = async () => {
    if (!activeSub?.planId) return;
    setNotice(null);
    setUpgradingTicker(true);
    try {
      const origin =
        typeof window !== 'undefined' ? window.location.origin : CORPORATE_PORTAL_ORIGIN;
      const callbackUrl = `${origin}/dashboard?tab=billing`;
      const res = await initializeCorporatePayment(
        activeSub.planId,
        callbackUrl,
        'ticker_upgrade'
      );
      if (!res.success || !res.authorizationUrl) {
        setNotice({
          type: 'error',
          text: res.error || 'Unable to start Sponsor Ticker upgrade checkout.',
        });
        return;
      }
      window.location.assign(res.authorizationUrl);
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: err?.message || 'Upgrade payment initialization failed.',
      });
    } finally {
      setUpgradingTicker(false);
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
    setCampHighlightColor(
      normalizeHexColor(company.brandHighlightColor, DEFAULT_BRAND_HIGHLIGHT_COLOR)
    );
    setCampSyncBrandColor(true);
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
    setCampHighlightColor(
      normalizeHexColor(
        c.brandHighlightColor || company.brandHighlightColor,
        DEFAULT_BRAND_HIGHLIGHT_COLOR
      )
    );
    setCampSyncBrandColor(true);
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
        brandHighlightColor: normalizeHexColor(campHighlightColor),
        applyColorToBrand: campSyncBrandColor,
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

  // Sponsor Ticker Builder Modal (Text-Only)
  const openNewTickerModal = () => {
    setEditingTickerId(null);
    setTickerName('');
    setTickerShortMessage('');
    setTickerHeadline('');
    setTickerFullDesc('');
    setTickerDestUrl(company.website || '');
    setTickerCtaLabel('Learn More');
    setTickerDurationDays(activeSub?.tickerCampaignDurationDaysSnapshot || 30);
    setTickerHighlightColor(
      normalizeHexColor(company.brandHighlightColor, DEFAULT_BRAND_HIGHLIGHT_COLOR)
    );
    setTickerSyncBrandColor(true);
    setIsTickerFormOpen(true);
  };

  const openEditTickerModal = (t: CorporateTickerCampaign) => {
    setEditingTickerId(t.id);
    setTickerName(t.campaignName);
    setTickerShortMessage(t.shortMessage);
    setTickerHeadline(t.headline);
    setTickerFullDesc(t.fullDescription);
    setTickerDestUrl(t.destinationUrl);
    setTickerCtaLabel(t.ctaLabel || 'Learn More');
    setTickerDurationDays(
      t.requestedDurationDays || activeSub?.tickerCampaignDurationDaysSnapshot || 30
    );
    setTickerHighlightColor(
      normalizeHexColor(
        t.brandHighlightColor || company.brandHighlightColor,
        DEFAULT_BRAND_HIGHLIGHT_COLOR
      )
    );
    setTickerSyncBrandColor(true);
    setIsTickerFormOpen(true);
  };

  const handleSaveTickerCampaign = async (submitForReview: boolean) => {
    setNotice(null);
    setIsSavingTicker(true);
    try {
      const payload = {
        campaignName: tickerName.trim(),
        shortMessage: tickerShortMessage.trim(),
        headline: tickerHeadline.trim(),
        fullDescription: tickerFullDesc.trim(),
        destinationUrl: tickerDestUrl.trim(),
        ctaLabel: tickerCtaLabel.trim() || 'Learn More',
        requestedDurationDays: Number(tickerDurationDays) || 30,
        brandHighlightColor: normalizeHexColor(tickerHighlightColor),
        applyColorToBrand: tickerSyncBrandColor,
        submitForReview,
      };

      const res = editingTickerId
        ? await updateCorporateTickerCampaign(editingTickerId, payload)
        : await createCorporateTickerCampaign(payload);

      if (!res.success) {
        setNotice({ type: 'error', text: res.error || 'Could not save Sponsor Ticker ad.' });
        return;
      }

      setIsTickerFormOpen(false);
      setNotice({
        type: 'success',
        text: submitForReview
          ? 'Sponsor Ticker ad submitted for Grobaax Admin review!'
          : 'Sponsor Ticker ad saved as Draft.',
      });
      await loadAllData();
    } finally {
      setIsSavingTicker(false);
    }
  };

  const handleTickerTogglePause = async (
    t: CorporateTickerCampaign,
    action: 'pause' | 'resume'
  ) => {
    setNotice(null);
    setActionBusyId(t.id);
    try {
      const res = await updateCorporateTickerCampaign(t.id, { action });
      if (!res.success) {
        setNotice({ type: 'error', text: res.error || `Failed to ${action} ticker ad.` });
        return;
      }
      setNotice({
        type: 'success',
        text: action === 'pause' ? 'Sponsor Ticker ad paused.' : 'Sponsor Ticker ad resumed.',
      });
      await loadAllData();
    } finally {
      setActionBusyId(null);
    }
  };

  const handleDeleteTicker = async (id: string) => {
    setNotice(null);
    setActionBusyId(id);
    try {
      const res = await deleteCorporateTickerCampaign(id);
      if (!res.success) {
        setNotice({ type: 'error', text: res.error || 'Failed to delete ticker ad.' });
        return;
      }
      setNotice({ type: 'success', text: 'Sponsor Ticker ad deleted.' });
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
        brandHighlightColor: normalizeHexColor(profHighlightColor),
        logoUrl: profLogoUrl.trim(),
      });
      if (!res.success || !res.company) {
        setNotice({ type: 'error', text: res.error || 'Profile update failed.' });
        return;
      }
      setCompany(res.company);
      onCompanyUpdated(res.company);
      setNotice({
        type: 'success',
        text: 'Company profile, brand logo & highlight color updated across School Blog and Sponsor Ticker.',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4.5 * 1024 * 1024) {
      setNotice({ type: 'error', text: 'Company logo image must be smaller than 4.5 MB.' });
      return;
    }
    setNotice(null);
    setIsUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        if (typeof reader.result !== 'string') return;
        const res = await uploadCorporateMedia({
          kind: 'logo',
          dataUrl: reader.result,
          fileName: file.name,
        });
        if (res.success && res.imageUrl) {
          setProfLogoUrl(res.imageUrl);
          if (res.company) {
            setCompany(res.company);
            onCompanyUpdated(res.company);
          }
          setNotice({
            type: 'success',
            text: 'Company logo uploaded! It now appears on your sponsored blog advertisements.',
          });
        } else {
          setNotice({ type: 'error', text: res.error || 'Logo upload failed.' });
        }
      } finally {
        setIsUploadingLogo(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = async () => {
    setNotice(null);
    setIsUploadingLogo(true);
    try {
      const res = await updateCorporateProfile({ logoUrl: '' });
      if (res.success && res.company) {
        setProfLogoUrl('');
        setCompany(res.company);
        onCompanyUpdated(res.company);
        setNotice({ type: 'success', text: 'Company logo removed.' });
      } else {
        setNotice({ type: 'error', text: res.error || 'Could not remove company logo.' });
      }
    } finally {
      setIsUploadingLogo(false);
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
              { id: 'campaigns', label: 'School Blog Ads', icon: Megaphone },
              { id: 'ticker', label: 'Sponsor Ticker', icon: Radio },
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
                        onClick={() => {
                          setActiveTab('ticker');
                          if (isCompanyApproved && hasTickerPlanAccess) {
                            openNewTickerModal();
                          }
                        }}
                        className="w-full py-3 px-4 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-900 text-xs sm:text-sm font-bold flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Radio className="w-4 h-4 text-indigo-600" />
                          <span>Sponsor Ticker Ads</span>
                        </span>
                        <span className="text-[11px] font-semibold text-indigo-600 tabular-nums">
                          {hasTickerPlanAccess
                            ? `${tickerTotals.activeCount} / ${activeSub?.maxTickerCampaignsSnapshot ?? 0}`
                            : canPurchaseTickerUpgrade
                            ? 'Upgrade'
                            : 'Text Bar'}
                        </span>
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
                            <div className="flex items-start gap-2.5 min-w-0">
                              {(c.logoUrl || company.logoUrl) ? (
                                <img
                                  src={c.logoUrl || company.logoUrl}
                                  alt={`${company.brandName} logo`}
                                  referrerPolicy="no-referrer"
                                  className="w-8 h-8 rounded-lg object-contain bg-white border border-slate-200 p-0.5 shrink-0"
                                />
                              ) : null}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-base font-extrabold text-slate-900 truncate">
                                    {c.campaignName}
                                  </h3>
                                  <span
                                    style={
                                      getBrandHighlightStyles(
                                        c.brandHighlightColor || company.brandHighlightColor
                                      ).pillStyle
                                    }
                                    className="px-2 py-0.5 rounded text-[10px] font-black border"
                                  >
                                    {company.brandName || company.companyName}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">{c.headline}</p>
                              </div>
                            </div>
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap shrink-0 ${
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

            {/* SPONSOR TICKER TAB (TEXT-ONLY) */}
            {activeTab === 'ticker' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                      Sponsor Ticker Campaigns (Text-Only)
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500">
                      Run scrolling promotional text announcements in Grobaax&apos;s student Sponsor Ticker bar. Clicking opens the Active Sponsors list and your Advertiser Details modal.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={!isCompanyApproved || !hasTickerPlanAccess}
                    onClick={openNewTickerModal}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold disabled:opacity-45 cursor-pointer shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Sponsor Ticker Ad</span>
                  </button>
                </div>

                {/* Isolated Sponsor Ticker Totals */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
                  <div className="rounded-2xl bg-white border border-slate-200/80 p-4 space-y-1">
                    <div className="text-[11px] font-bold text-slate-500">Ticker Bar Impressions</div>
                    <div className="text-xl font-extrabold text-slate-900">
                      {tickerTotals.barImpressions.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white border border-slate-200/80 p-4 space-y-1">
                    <div className="text-[11px] font-bold text-slate-500">Ticker Bar Clicks</div>
                    <div className="text-xl font-extrabold text-blue-700">
                      {tickerTotals.barClicks.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white border border-slate-200/80 p-4 space-y-1">
                    <div className="text-[11px] font-bold text-slate-500">Advertiser Detail Views</div>
                    <div className="text-xl font-extrabold text-indigo-700">
                      {tickerTotals.detailViews.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white border border-slate-200/80 p-4 space-y-1">
                    <div className="text-[11px] font-bold text-slate-500">Website Link Clicks</div>
                    <div className="text-xl font-extrabold text-emerald-700">
                      {tickerTotals.websiteClicks.toLocaleString()}
                    </div>
                  </div>
                </div>

                {!isCompanyApproved ? (
                  <div className="rounded-2xl bg-white border border-slate-200 p-5 text-xs sm:text-sm text-slate-600">
                    Sponsor Ticker creation requires an Approved company status.
                  </div>
                ) : !hasActiveSubscription ? (
                  <div className="rounded-2xl bg-white border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-slate-600">
                    <span>
                      Subscribe to an eligible advertising plan in Plans &amp; Billing to run Sponsor Ticker campaigns.
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('billing')}
                      className="px-4 py-2 rounded-full bg-blue-600 text-white text-xs font-bold cursor-pointer"
                    >
                      View Plans
                    </button>
                  </div>
                ) : canPurchaseTickerUpgrade ? (
                  <div className="rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 p-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1 max-w-xl">
                      <h3 className="text-sm font-extrabold text-slate-900">
                        Unlock Sponsor Ticker Add-on ({activeSub?.planNameSnapshot})
                      </h3>
                      <p className="text-xs text-slate-600">
                        Your current subscription supports up to{' '}
                        <strong>{activeSub?.maxTickerCampaignsSnapshot}</strong> Sponsor Ticker
                        campaign(s) as an optional paid add-on. Unlock now to publish scrolling
                        ticker announcements.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={upgradingTicker}
                      onClick={handleSubscribeTickerUpgrade}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {upgradingTicker ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CreditCard className="w-4 h-4" />
                      )}
                      <span>
                        Unlock Sponsor Ticker (₦
                        {Number(activeSub?.tickerUpgradePriceSnapshot || 0).toLocaleString()})
                      </span>
                    </button>
                  </div>
                ) : !hasTickerPlanAccess ? (
                  <div className="rounded-2xl bg-white border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-slate-600">
                    <span>
                      Your current plan (<strong>{activeSub?.planNameSnapshot}</strong>) only covers School Blog Footer advertisements. Upgrade to a Sponsor Ticker-enabled plan under Plans &amp; Billing.
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('billing')}
                      className="px-4 py-2 rounded-full bg-blue-600 text-white text-xs font-bold cursor-pointer"
                    >
                      Browse Plans
                    </button>
                  </div>
                ) : null}

                {tickerCampaigns.length === 0 ? (
                  <div className="rounded-3xl bg-white border border-slate-200 p-10 text-center space-y-3">
                    <Radio className="w-10 h-10 text-blue-600 mx-auto opacity-80" />
                    <h3 className="text-base font-bold text-slate-900">
                      No Sponsor Ticker Ads Yet
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                      Sponsor Ticker ads are strictly text-only announcements that scroll across the
                      top ticker bar and open your full offer card when tapped by students.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {tickerCampaigns.map((t) => (
                      <div
                        key={t.id}
                        className="rounded-3xl bg-white border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-base font-extrabold text-slate-900">
                                {t.campaignName}
                              </h3>
                              <p className="text-xs font-semibold text-blue-700">{t.headline}</p>
                            </div>
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${
                                STATUS_BADGE[t.status] || 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {t.status}
                            </span>
                          </div>

                          {/* Exact text-only bar preview strip */}
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 flex items-center gap-2 overflow-hidden">
                            <span className="shrink-0 inline-flex items-center gap-1 pr-2 border-r border-slate-300 text-[10px] font-black uppercase tracking-wider text-blue-600">
                              <Sparkles className="w-3 h-3" />
                              <span>SPONSOR TICKER</span>
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px] truncate">
                              <span
                                style={
                                  getBrandHighlightStyles(
                                    t.brandHighlightColor || company.brandHighlightColor
                                  ).pillStyle
                                }
                                className="px-2 py-0.5 rounded border font-black text-[10px] shrink-0"
                              >
                                {company.brandName || company.companyName}
                              </span>
                              <span className="font-semibold text-slate-700 truncate">
                                {t.shortMessage}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                            {t.fullDescription}
                          </p>

                          <div className="text-[11px] text-slate-500 truncate">
                            CTA: <strong>{t.ctaLabel}</strong> &middot; {t.destinationUrl}
                          </div>

                          {t.status === 'Rejected' && t.rejectionReason && (
                            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
                              <strong>Admin Feedback:</strong> {t.rejectionReason}
                            </div>
                          )}

                          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs tabular-nums">
                            <div>
                              <span className="text-slate-400 block text-[10px]">Bar Views</span>
                              <strong className="text-slate-900">
                                {t.barImpressionsCount.toLocaleString()}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Bar Taps</span>
                              <strong className="text-slate-900">
                                {t.barClicksCount.toLocaleString()}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Details</span>
                              <strong className="text-slate-900">
                                {t.detailViewsCount.toLocaleString()}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Site Clicks</span>
                              <strong className="text-emerald-700">
                                {t.websiteClicksCount.toLocaleString()}
                              </strong>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                          {['Draft', 'Rejected', 'Paused', 'Pending Review'].includes(
                            t.status
                          ) && (
                            <button
                              type="button"
                              onClick={() => openEditTickerModal(t)}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                          )}

                          {t.status === 'Active' && (
                            <button
                              type="button"
                              disabled={actionBusyId === t.id}
                              onClick={() => handleTickerTogglePause(t, 'pause')}
                              className="px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-xs font-bold text-amber-800 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Pause className="w-3.5 h-3.5" />
                              <span>Pause</span>
                            </button>
                          )}

                          {t.status === 'Paused' && t.reviewedAt && (
                            <button
                              type="button"
                              disabled={actionBusyId === t.id}
                              onClick={() => handleTickerTogglePause(t, 'resume')}
                              className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold text-emerald-800 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>Resume</span>
                            </button>
                          )}

                          {['Draft', 'Rejected'].includes(t.status) && (
                            <button
                              type="button"
                              disabled={actionBusyId === t.id}
                              onClick={() => handleDeleteTicker(t.id)}
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
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                                  <span>
                                    Sponsor Ticker:{' '}
                                    <strong>
                                      {plan.sponsorTickerMode === 'included'
                                        ? `Included (${plan.maxTickerCampaigns || 1} ad${
                                            (plan.maxTickerCampaigns || 1) > 1 ? 's' : ''
                                          })`
                                        : plan.sponsorTickerMode === 'required'
                                        ? `Bundled (${plan.maxTickerCampaigns || 1} ad${
                                            (plan.maxTickerCampaigns || 1) > 1 ? 's' : ''
                                          })`
                                        : plan.sponsorTickerMode === 'optional_upgrade'
                                        ? `Optional Add-on (+₦${Number(
                                            plan.tickerUpgradePriceNaira || 0
                                          ).toLocaleString()})`
                                        : 'Blog Footer Only'}
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

                            <div className="space-y-2">
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

                              {isCurrent && canPurchaseTickerUpgrade && (
                                <button
                                  type="button"
                                  disabled={upgradingTicker}
                                  onClick={handleSubscribeTickerUpgrade}
                                  className="w-full py-2.5 rounded-full border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                  {upgradingTicker ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Radio className="w-3.5 h-3.5" />
                                  )}
                                  <span>
                                    Upgrade: Add Sponsor Ticker (₦
                                    {Number(
                                      activeSub?.tickerUpgradePriceSnapshot || 0
                                    ).toLocaleString()}
                                    )
                                  </span>
                                </button>
                              )}
                            </div>
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
              <div className="space-y-6">
                <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xs space-y-5">
                  <div>
                    <h1 className="text-xl font-extrabold text-slate-900">
                      School Blog Campaign Performance Breakdown
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500">
                      Deduplicated School Blog impressions, clicks, and click-through rates
                      across your banner campaigns.
                    </p>
                  </div>

                  {campaigns.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4">
                      No School Blog campaign telemetry available yet.
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

                {/* Isolated Sponsor Ticker Analytics */}
                <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xs space-y-5">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900">
                      Sponsor Ticker Performance Breakdown
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500">
                      Isolated telemetry for scrolling ticker bar impressions, bar taps, detail modal views, and Visit Website clicks.
                    </p>
                  </div>

                  {tickerCampaigns.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4">
                      No Sponsor Ticker telemetry available yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs sm:text-sm tabular-nums">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 text-xs">
                            <th className="py-2.5 pr-4 font-bold">Ticker Campaign</th>
                            <th className="py-2.5 pr-4 font-bold">Status</th>
                            <th className="py-2.5 pr-4 font-bold">Bar Views</th>
                            <th className="py-2.5 pr-4 font-bold">Bar Clicks</th>
                            <th className="py-2.5 pr-4 font-bold">Detail Views</th>
                            <th className="py-2.5 pr-4 font-bold">Site Clicks</th>
                            <th className="py-2.5 font-bold">Site CTR</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {tickerCampaigns.map((t) => (
                            <tr key={t.id}>
                              <td className="py-3 pr-4">
                                <div className="font-bold text-slate-900">{t.campaignName}</div>
                                <div className="text-[11px] text-slate-500 line-clamp-1">
                                  {t.shortMessage}
                                </div>
                              </td>
                              <td className="py-3 pr-4">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                                    STATUS_BADGE[t.status] || 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {t.status}
                                </span>
                              </td>
                              <td className="py-3 pr-4 font-bold text-slate-900">
                                {t.barImpressionsCount.toLocaleString()}
                              </td>
                              <td className="py-3 pr-4 font-bold text-blue-700">
                                {t.barClicksCount.toLocaleString()}
                              </td>
                              <td className="py-3 pr-4 font-bold text-indigo-700">
                                {t.detailViewsCount.toLocaleString()}
                              </td>
                              <td className="py-3 pr-4 font-bold text-emerald-700">
                                {t.websiteClicksCount.toLocaleString()}
                              </td>
                              <td className="py-3 font-bold text-slate-800">{t.websiteCtr}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                {/* Brand Logo & Text Highlight Color Studio */}
                {(() => {
                  const previewBrandStyle = getBrandHighlightStyles(profHighlightColor);
                  const previewName = profBrandName.trim() || company.brandName || company.companyName;
                  return (
                    <div className="rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                      <div>
                        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                          Brand Logo &amp; Text Highlight Appearance
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500">
                          Your company logo renders on sponsored ads beneath School Blog posts. Your brand highlight color styles text highlights on both School Blog ads and the scrolling Sponsor Ticker.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        <div className="lg:col-span-6 space-y-5">
                          {/* Company Logo Upload */}
                          <div className="rounded-2xl border border-slate-200 bg-[#f8faff] p-4 flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden p-1.5 shrink-0 shadow-2xs">
                              {profLogoUrl ? (
                                <img
                                  src={profLogoUrl}
                                  alt={`${previewName} logo`}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-contain rounded-lg"
                                />
                              ) : (
                                <Building2 className="w-7 h-7 text-slate-400" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="text-xs font-extrabold text-slate-900">
                                Company Logo (Blog Ads)
                              </div>
                              <p className="text-[11px] text-slate-500">
                                Square PNG, JPG, or WEBP recommended (up to 4.5 MB). Shown beside your brand name beneath blog posts.
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer">
                                  {isUploadingLogo ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <ImagePlus className="w-3.5 h-3.5" />
                                  )}
                                  <span>
                                    {isUploadingLogo
                                      ? 'Uploading...'
                                      : profLogoUrl
                                      ? 'Change Logo'
                                      : 'Upload Logo'}
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    onChange={handleLogoUpload}
                                    className="hidden"
                                  />
                                </label>
                                {profLogoUrl && (
                                  <button
                                    type="button"
                                    disabled={isUploadingLogo}
                                    onClick={handleRemoveLogo}
                                    className="px-3 py-1.5 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Brand Highlight Color Selector */}
                          <div className="rounded-2xl border border-slate-200 bg-[#f8faff] p-4">
                            <BrandColorPicker
                              value={profHighlightColor}
                              onChange={setProfHighlightColor}
                              label="Brand Text Highlight Color (Blog + Sponsor Ticker)"
                              helperText="Click 'Save Company Profile' below after choosing a color to apply it across your brand's blog post ads and Sponsor Ticker highlights."
                            />
                          </div>
                        </div>

                        {/* Live Dual Placement Preview */}
                        <div className="lg:col-span-6 space-y-4">
                          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Live Brand Placement Previews
                          </div>

                          <div className="space-y-1.5">
                            <div className="text-[11px] font-semibold text-slate-500">
                              1. Sponsor Ticker Bar (Text-Only Highlight)
                            </div>
                            <div className="w-full overflow-hidden bg-white border border-slate-200 rounded-xl py-2 px-3 flex items-center">
                              <span className="shrink-0 inline-flex items-center gap-1 pr-2 border-r border-slate-300 mr-2 text-[10px] font-black uppercase tracking-wider text-blue-600">
                                <Sparkles className="w-3 h-3 text-blue-500" />
                                <span>SPONSOR TICKER</span>
                              </span>
                              <div className="flex items-center gap-1.5 text-[11px] truncate">
                                <span
                                  style={previewBrandStyle.pillStyle}
                                  className="px-2 py-0.5 rounded border text-[10px] font-black shrink-0"
                                >
                                  {previewName}
                                </span>
                                <span className="text-slate-700 font-semibold truncate">
                                  Sample promotional message scrolling on the Grobaax Sponsor Ticker...
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="text-[11px] font-semibold text-slate-500">
                              2. School Blog Footer Ad (Logo + Highlight Color)
                            </div>
                            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-2xs">
                              <div
                                aria-hidden="true"
                                style={previewBrandStyle.accentBarStyle}
                                className="absolute inset-x-0 top-0 h-1"
                              />
                              <div className="flex items-center gap-2 pt-0.5">
                                {profLogoUrl ? (
                                  <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 p-0.5 flex items-center justify-center shrink-0">
                                    <img
                                      src={profLogoUrl}
                                      alt={`${previewName} logo`}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-contain rounded"
                                    />
                                  </div>
                                ) : (
                                  <div
                                    style={previewBrandStyle.iconBoxStyle}
                                    className="w-7 h-7 rounded-lg border flex items-center justify-center shrink-0"
                                  >
                                    <Building2 className="w-3.5 h-3.5" />
                                  </div>
                                )}
                                <span
                                  style={previewBrandStyle.pillStyle}
                                  className="px-2 py-0.5 rounded-md border text-[11px] font-black"
                                >
                                  {previewName}
                                </span>
                                <span
                                  style={previewBrandStyle.softBadgeStyle}
                                  className="px-2 py-0.5 rounded-md border text-[10px] font-extrabold uppercase tracking-wider"
                                >
                                  Sponsored
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-bold text-slate-800 truncate">
                                  Your Sponsored Headline Beneath Campus Articles
                                </span>
                                <span
                                  style={previewBrandStyle.ctaButtonStyle}
                                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full border text-[11px] font-bold shrink-0"
                                >
                                  <span>Learn More</span>
                                  <ExternalLink className="w-3 h-3" />
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                  <div>
                    <h1 className="text-xl font-extrabold text-slate-900">
                      Company Profile &amp; Verification Document
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500">
                      Registered Company: <strong>{company.companyName}</strong> &middot;{' '}
                      Account Email: <strong>{company.officialEmail}</strong>
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

                <div className="rounded-2xl border border-slate-200 bg-[#f8faff] p-4 space-y-3">
                  <BrandColorPicker
                    compact
                    value={campHighlightColor}
                    onChange={setCampHighlightColor}
                    syncToBrand={campSyncBrandColor}
                    onSyncToBrandChange={setCampSyncBrandColor}
                    label="Brand Text Highlight Color"
                  />

                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {company.logoUrl ? (
                        <img
                          src={company.logoUrl}
                          alt={`${company.brandName} logo`}
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-lg object-contain bg-white border border-slate-200 p-0.5 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-slate-800">
                          Company Logo on Blog Ad
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {company.logoUrl ? 'Logo attached to your brand ads' : 'No company logo uploaded yet'}
                        </div>
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-200 bg-white hover:bg-blue-50 text-blue-700 text-[11px] font-bold cursor-pointer shrink-0">
                      {isUploadingLogo ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <ImagePlus className="w-3 h-3" />
                      )}
                      <span>{company.logoUrl ? 'Change Logo' : 'Upload Logo'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Live School Blog Placement Preview */}
              {(() => {
                const campStyle = getBrandHighlightStyles(campHighlightColor);
                const displayBrand = company.brandName || company.companyName;
                return (
                  <div className="lg:col-span-5 space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Live School Blog Placement Preview
                    </div>
                    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-[#f8faff] p-4 space-y-3">
                      <div
                        aria-hidden="true"
                        style={campStyle.accentBarStyle}
                        className="absolute inset-x-0 top-0 h-1"
                      />
                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 pt-0.5">
                        <div className="flex items-center gap-2 min-w-0">
                          {company.logoUrl ? (
                            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 p-0.5 flex items-center justify-center shrink-0">
                              <img
                                src={company.logoUrl}
                                alt={`${displayBrand} logo`}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-contain rounded"
                              />
                            </div>
                          ) : (
                            <div
                              style={campStyle.iconBoxStyle}
                              className="w-7 h-7 rounded-lg border flex items-center justify-center shrink-0"
                            >
                              <Building2 className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <span
                            style={campStyle.pillStyle}
                            className="px-2 py-0.5 rounded-md border text-[10px] font-black truncate max-w-[140px]"
                          >
                            {displayBrand}
                          </span>
                          <span
                            style={campStyle.softBadgeStyle}
                            className="px-1.5 py-0.5 rounded border text-[9px] font-extrabold uppercase tracking-wider shrink-0"
                          >
                            Sponsored
                          </span>
                        </div>
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
                        <span
                          style={campStyle.ctaButtonStyle}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full border text-xs font-bold shrink-0"
                        >
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
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Sponsor Ticker Builder Modal (Strictly Text-Only — Zero Image Upload) */}
      {isTickerFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-4xl rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden my-6">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Radio className="w-4 h-4 text-blue-600" />
                <span>
                  {editingTickerId
                    ? 'Edit Sponsor Ticker Ad'
                    : 'Create Sponsor Ticker Campaign (Text-Only)'}
                </span>
              </h2>
              <button
                type="button"
                onClick={() => setIsTickerFormOpen(false)}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-h-[82vh] overflow-y-auto">
              <div className="lg:col-span-7 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Internal Ticker Campaign Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={tickerName}
                    onChange={(e) => setTickerName(e.target.value)}
                    placeholder="e.g. Semester Zero-Fee Student Promo"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Short Scrolling Ticker Message (Bar Text) *
                    </label>
                    <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
                      {tickerShortMessage.length}/140
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    minLength={5}
                    maxLength={140}
                    value={tickerShortMessage}
                    onChange={(e) => setTickerShortMessage(e.target.value)}
                    placeholder="Get instant student transfers with zero charges all semester!"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Scrolls right-to-left inside the student SPONSOR TICKER bar (text only).
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Promotional Headline (Details Popup) *
                    </label>
                    <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
                      {tickerHeadline.length}/100
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    minLength={4}
                    maxLength={100}
                    value={tickerHeadline}
                    onChange={(e) => setTickerHeadline(e.target.value)}
                    placeholder="Zero-Fee Campus Banking for Verified Students"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Full Promotional Description *
                    </label>
                    <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
                      {tickerFullDesc.length}/600
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    required
                    minLength={10}
                    maxLength={600}
                    value={tickerFullDesc}
                    onChange={(e) => setTickerFullDesc(e.target.value)}
                    placeholder="Explain the full offer shown when students click your brand inside the Active Sponsors popup."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Visit Button Label
                    </label>
                    <input
                      type="text"
                      maxLength={32}
                      value={tickerCtaLabel}
                      onChange={(e) => setTickerCtaLabel(e.target.value)}
                      placeholder="Visit Website"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Duration (Days)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={activeSub?.tickerCampaignDurationDaysSnapshot || 30}
                      value={tickerDurationDays}
                      onChange={(e) => setTickerDurationDays(Number(e.target.value) || 30)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Approved Destination URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={tickerDestUrl}
                    onChange={(e) => setTickerDestUrl(e.target.value)}
                    placeholder="https://yourbrand.com/campus-offer"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-[#f8faff] p-4">
                  <BrandColorPicker
                    compact
                    value={tickerHighlightColor}
                    onChange={setTickerHighlightColor}
                    syncToBrand={tickerSyncBrandColor}
                    onSyncToBrandChange={setTickerSyncBrandColor}
                    label="Brand Text Highlight Color"
                  />
                </div>
              </div>

              {/* Live Preview Panel */}
              {(() => {
                const tickerStyle = getBrandHighlightStyles(tickerHighlightColor);
                const displayBrand = company.brandName || company.companyName;
                return (
                  <div className="lg:col-span-5 space-y-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Live Student Experience Preview
                    </div>

                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold text-slate-500">
                        1. Student Sponsor Ticker Bar (Text-Only)
                      </div>
                      <div className="w-full overflow-hidden bg-white border border-slate-200 rounded-xl py-1.5 px-3 flex items-center">
                        <div className="shrink-0 flex items-center gap-1 pr-2 font-black text-blue-600 border-r border-slate-300 mr-2 text-[10px] uppercase tracking-wider">
                          <Sparkles className="w-3 h-3 text-blue-500" />
                          <span>SPONSOR TICKER</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] truncate">
                          <span
                            style={tickerStyle.pillStyle}
                            className="px-2 py-0.5 text-[10px] font-black rounded border shrink-0"
                          >
                            {displayBrand}
                          </span>
                          <span className="text-slate-700 font-semibold truncate">
                            {tickerShortMessage || 'Your short ticker promotion scrolls here...'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold text-slate-500">
                        2. Advertiser Details Popup Preview
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-[#f8faff] p-4 space-y-3">
                        <div className="flex items-center justify-between text-[11px]">
                          <span
                            style={tickerStyle.pillStyle}
                            className="px-2 py-0.5 rounded-md border font-black"
                          >
                            {displayBrand}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        </div>
                        <h4 className="text-sm font-extrabold text-slate-900">
                          {tickerHeadline || 'Promotional Offer Headline'}
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {tickerFullDesc ||
                            'Full offer details appear cleanly inside the Advertiser Details modal when a student selects your brand from Active Sponsors.'}
                        </p>
                        <div className="pt-1 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                            {tickerDestUrl || 'https://yourbrand.com'}
                          </span>
                          <span
                            style={tickerStyle.ctaButtonStyle}
                            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full border text-xs font-bold shrink-0"
                          >
                            <span>{tickerCtaLabel || 'Visit Website'}</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col gap-2">
                      <button
                        type="button"
                        disabled={isSavingTicker}
                        onClick={() => handleSaveTickerCampaign(true)}
                        className="w-full py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold cursor-pointer disabled:opacity-50"
                      >
                        {isSavingTicker ? 'Submitting...' : 'Submit for Admin Review'}
                      </button>
                      <button
                        type="button"
                        disabled={isSavingTicker}
                        onClick={() => handleSaveTickerCampaign(false)}
                        className="w-full py-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold cursor-pointer disabled:opacity-50"
                      >
                        Save as Draft
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Printable Invoice / Receipt Modal */}
      {receiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-[#1d4ed8] to-[#4f46e5] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5 font-bold text-sm">
                <img
                  src="/assets/aistudio/img_1_1794948944738_4ef63eec.jpg"
                  alt="Grobaax Logo"
                  referrerPolicy="no-referrer"
                  className="w-6 h-6 rounded-lg object-cover border border-white/25 shrink-0"
                />
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
