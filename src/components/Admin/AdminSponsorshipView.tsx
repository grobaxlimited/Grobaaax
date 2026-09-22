import React, { useState, useRef } from 'react';
import { SponsorshipCampaign } from '../../types';
import { useApp } from '../../context/AppContext';
import { normalizeDestinationUrl, safeOpenDestinationUrl } from '../../lib/urlUtils';
import { isMockSponsorshipCampaign } from '../../lib/firebase';
import {
  Tag,
  Plus,
  Edit3,
  Trash2,
  Play,
  Pause,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  Layers,
  Search,
  Filter,
  Upload,
  Image as ImageIcon,
  ArrowUpRight,
  Megaphone,
  Calendar,
  X,
  Shield,
  Clock,
  MousePointerClick,
  BarChart3,
  Copy,
} from 'lucide-react';

export function AdminSponsorshipView() {
  const {
    sponsorshipCampaigns,
    addSponsorshipCampaign,
    updateSponsorshipCampaign,
    deleteSponsorshipCampaign,
    currentUser,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | 'ticker' | 'feed' | 'preview'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Paused' | 'Draft'>('ALL');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<SponsorshipCampaign | null>(null);
  const [campaignToDelete, setCampaignToDelete] = useState<SponsorshipCampaign | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<SponsorshipCampaign>>({
    sponsorName: '',
    title: '',
    text: '',
    logo: '📢',
    banner: '',
    destinationUrl: '',
    ctaText: 'Learn More',
    tag: 'Academic',
    badgeLabel: 'Sponsored Partner',
    placement: 'Ticker',
    priority: 'High',
    status: 'Active',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleOpenCreateModal = (placement: 'Ticker' | 'CommunityFeed' = 'Ticker') => {
    setEditingCampaign(null);
    setFormData({
      sponsorName: '',
      title: '',
      text: '',
      logo: '📢',
      banner: '',
      destinationUrl: '',
      ctaText: placement === 'CommunityFeed' ? 'Claim Offer' : 'Learn More',
      tag: 'Academic',
      badgeLabel: 'Sponsored Partner',
      placement: placement,
      priority: 'High',
      status: 'Active',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (camp: SponsorshipCampaign) => {
    setEditingCampaign(camp);
    setFormData({
      ...camp,
    });
    setIsModalOpen(true);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image is too large. Please select an image under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormData(prev => ({ ...prev, banner: event.target?.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sponsorName || !formData.title || !formData.text) {
      alert('Please fill in Sponsor Name, Title, and Message / Copy text.');
      return;
    }

    try {
      const cleanUrl = formData.destinationUrl?.trim()
        ? normalizeDestinationUrl(formData.destinationUrl.trim())
        : '';

      if (editingCampaign) {
        await updateSponsorshipCampaign(editingCampaign.id, {
          sponsorName: formData.sponsorName,
          title: formData.title,
          text: formData.text,
          logo: formData.logo || '📢',
          banner: formData.banner || '',
          destinationUrl: cleanUrl,
          ctaText: formData.ctaText || 'Learn More',
          tag: formData.tag || '',
          badgeLabel: formData.badgeLabel || 'Sponsored',
          placement: formData.placement as any,
          priority: formData.priority as any,
          status: formData.status as any,
          startDate: formData.startDate || '',
          endDate: formData.endDate || '',
        });
        showToast(`Campaign "${formData.title}" updated successfully!`);
      } else {
        await addSponsorshipCampaign({
          sponsorName: formData.sponsorName || '',
          title: formData.title || '',
          text: formData.text || '',
          logo: formData.logo || '📢',
          banner: formData.banner || '',
          destinationUrl: cleanUrl,
          ctaText: formData.ctaText || 'Learn More',
          tag: formData.tag || '',
          badgeLabel: formData.badgeLabel || 'Sponsored',
          placement: (formData.placement as any) || 'Ticker',
          priority: (formData.priority as any) || 'High',
          status: (formData.status as any) || 'Active',
          startDate: formData.startDate || new Date().toISOString().split('T')[0],
          endDate: formData.endDate || '',
          impressions: 0,
          clicks: 0,
        });
        showToast(`Campaign "${formData.title}" launched successfully!`);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving campaign:', err);
      alert('Failed to save campaign. Please try again.');
    }
  };

  const handleToggleStatus = async (camp: SponsorshipCampaign) => {
    const newStatus = camp.status === 'Active' ? 'Paused' : 'Active';
    try {
      await updateSponsorshipCampaign(camp.id, { status: newStatus });
      showToast(`Campaign marked as ${newStatus}`);
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!campaignToDelete) return;
    try {
      await deleteSponsorshipCampaign(campaignToDelete.id);
      showToast(`Campaign "${campaignToDelete.title}" deleted.`);
      setCampaignToDelete(null);
    } catch (err) {
      console.error('Error deleting campaign:', err);
      alert('Failed to delete campaign.');
    }
  };

  // Real campaigns excluding any legacy mock data
  const realCampaigns = (sponsorshipCampaigns || []).filter(c => !isMockSponsorshipCampaign(c));

  // Filtered campaigns
  const filteredCampaigns = realCampaigns.filter((camp) => {
    // Tab filter
    if (activeTab === 'ticker' && camp.placement !== 'Ticker') return false;
    if (activeTab === 'feed' && camp.placement !== 'CommunityFeed') return false;

    // Status filter
    if (statusFilter !== 'ALL' && camp.status !== statusFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = camp.sponsorName.toLowerCase().includes(q);
      const matchTitle = camp.title.toLowerCase().includes(q);
      const matchText = camp.text.toLowerCase().includes(q);
      const matchTag = camp.tag?.toLowerCase().includes(q);
      return matchName || matchTitle || matchText || matchTag;
    }
    return true;
  });

  const totalCampaigns = realCampaigns.length;
  const activeTickerCount = realCampaigns.filter(c => c.status === 'Active' && c.placement === 'Ticker').length;
  const activeFeedCount = realCampaigns.filter(c => c.status === 'Active' && c.placement === 'CommunityFeed').length;
  const totalImpressions = realCampaigns.reduce((acc, c) => acc + (c.impressions || 0), 0);
  const totalClicks = realCampaigns.reduce((acc, c) => acc + (c.clicks || 0), 0);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Hero Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white border border-blue-800/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Sponsorship & Ads Control Center
            </span>
            <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Ticker Animation: Left → Right
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-amber-400" />
            Institutional Sponsorship & Feed Ads
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Manage top banner ticker announcements, sponsored scholar grants, and verified promoted cards across the student feed in real time.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <button
            onClick={() => handleOpenCreateModal('Ticker')}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Ticker Message</span>
          </button>

          <button
            onClick={() => handleOpenCreateModal('CommunityFeed')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Feed Ad Card</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Total Campaigns</span>
            <Tag className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalCampaigns}</p>
          <span className="text-[10px] text-slate-400">All registered promotions</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs">
            <span>Active Tickers</span>
            <Megaphone className="w-4 h-4" />
          </div>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{activeTickerCount}</p>
          <span className="text-[10px] text-slate-400">Scrolling Left → Right live</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 text-xs">
            <span>Active Feed Ads</span>
            <Layers className="w-4 h-4" />
          </div>
          <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{activeFeedCount}</p>
          <span className="text-[10px] text-slate-400">Promoted in student feed</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs">
            <span>Est. Engagement</span>
            <BarChart3 className="w-4 h-4" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {totalImpressions > 1000 ? `${(totalImpressions / 1000).toFixed(1)}k` : totalImpressions}
          </p>
          <span className="text-[10px] text-slate-400">{totalClicks} verified clicks</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          {[
            { id: 'all', label: 'All Campaigns', count: totalCampaigns },
            { id: 'ticker', label: 'Home Ticker Messages', count: activeTickerCount },
            { id: 'feed', label: 'Community Feed Ads', count: activeFeedCount },
            { id: 'preview', label: 'Live Preview Arena', count: null },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === t.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>{t.label}</span>
              {t.count !== null && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === t.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search and Filters */}
        {activeTab !== 'preview' && (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search sponsor or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Paused">Paused Only</option>
              <option value="Draft">Drafts Only</option>
            </select>
          </div>
        )}
      </div>

      {/* Tab: Live Preview Arena */}
      {activeTab === 'preview' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-500" />
                  Live Home Ticker Preview (Moving Left → Right)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This simulates how the announcement marquee renders across student screens.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {activeTickerCount} Active Items Loaded
              </span>
            </div>

            {/* Simulated Top Ticker Marquee */}
            <div className="w-full bg-gradient-to-r from-blue-950 via-slate-950 to-blue-950 text-white rounded-xl border border-blue-800/40 p-3 overflow-hidden shadow-inner">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-lg text-[10px] font-extrabold shrink-0 uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 animate-pulse text-amber-400" />
                  <span>Sponsors</span>
                </div>

                <div className="relative overflow-hidden flex-1 select-none">
                  {realCampaigns.filter(c => c.status === 'Active' && c.placement === 'Ticker').length === 0 ? (
                    <span className="text-xs text-slate-400 italic">
                      No active ticker campaigns live. Create a ticker campaign above to preview here.
                    </span>
                  ) : (
                    <div className="flex whitespace-nowrap animate-marquee-reverse gap-12 font-medium text-xs text-slate-200">
                      {realCampaigns
                        .filter(c => c.status === 'Active' && c.placement === 'Ticker')
                        .map((camp) => (
                          <div key={camp.id} className="flex items-center gap-2 shrink-0">
                            <span>{camp.logo || '📢'}</span>
                            <span className="font-bold text-amber-300">{camp.sponsorName}:</span>
                            <span>{camp.text}</span>
                            {camp.destinationUrl && (
                              <a
                                href={normalizeDestinationUrl(camp.destinationUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  safeOpenDestinationUrl(camp.destinationUrl);
                                }}
                                className="text-[10px] text-blue-400 hover:text-blue-300 underline font-bold cursor-pointer transition-colors"
                                title={`Visit: ${normalizeDestinationUrl(camp.destinationUrl)}`}
                              >
                                [{camp.ctaText || 'Learn More'}]
                              </a>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Simulated Feed Ad Preview */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-500" />
              Live Community Feed Ad Cards Preview
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sample student view rendering in the campus social community feed.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {realCampaigns.filter(c => c.status === 'Active' && c.placement === 'CommunityFeed').length === 0 ? (
                <div className="col-span-full py-12 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 space-y-2">
                  <div className="w-10 h-10 mx-auto rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    No active community feed ad cards live
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Create a new feed ad card above to preview how it renders in the student social feed.
                  </p>
                </div>
              ) : (
                realCampaigns
                  .filter(c => c.status === 'Active' && c.placement === 'CommunityFeed')
                  .map((camp) => (
                  <div
                    key={camp.id}
                    className="p-5 rounded-2xl bg-gradient-to-br from-blue-950/20 via-white dark:via-slate-900 to-indigo-950/20 border-2 border-blue-500/30 dark:border-blue-500/30 shadow-md space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600/10 dark:bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-lg shrink-0">
                          {camp.logo || '📢'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                              {camp.sponsorName}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 uppercase tracking-wider flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              {camp.badgeLabel || 'Sponsored'}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Official Partner Initiative • Promoted
                          </span>
                        </div>
                      </div>

                      {camp.tag && (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          #{camp.tag}
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                        {camp.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {camp.text}
                      </p>
                    </div>

                    {camp.banner && (
                      <div className="rounded-xl overflow-hidden max-h-56 border border-slate-200 dark:border-slate-800 shadow-xs">
                        <img src={camp.banner} alt={camp.title} className="w-full h-full object-cover" />
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-blue-500" />
                        Verified Grobaax Institutional Ad
                      </span>

                      {camp.destinationUrl && (
                        <a
                          href={normalizeDestinationUrl(camp.destinationUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            safeOpenDestinationUrl(camp.destinationUrl);
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer"
                        >
                          <span>{camp.ctaText || 'Learn More'}</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Campaigns Grid / List */}
      {activeTab !== 'preview' && (
        <div className="space-y-4">
          {filteredCampaigns.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Megaphone className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No sponsorship campaigns found
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Launch a new sponsor ticker marquee or feed banner to engage students across Nigeria.
              </p>
              <button
                onClick={() => handleOpenCreateModal()}
                className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 cursor-pointer"
              >
                Create First Campaign
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredCampaigns.map((camp) => {
                const isTicker = camp.placement === 'Ticker';
                const isActive = camp.status === 'Active';

                return (
                  <div
                    key={camp.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-2xl shrink-0 shadow-xs">
                            {camp.logo || '📢'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                                {camp.sponsorName}
                              </h3>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                                isActive
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              }`}>
                                {camp.status}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              {camp.title}
                            </span>
                          </div>
                        </div>

                        {/* Placement Pill */}
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border shrink-0 ${
                          isTicker
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                            : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
                        }`}>
                          {isTicker ? 'Home Ticker (L→R)' : 'Community Feed Ad'}
                        </span>
                      </div>

                      {/* Text Copy */}
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        {camp.text}
                      </p>

                      {/* Banner Preview if Feed Ad */}
                      {camp.banner && (
                        <div className="rounded-xl overflow-hidden max-h-40 border border-slate-200 dark:border-slate-800">
                          <img src={camp.banner} alt={camp.title} className="w-full h-full object-cover" />
                        </div>
                      )}

                      {/* Meta Pills */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        {camp.tag && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-semibold">
                            #{camp.tag}
                          </span>
                        )}
                        {camp.destinationUrl && (
                          <a
                            href={normalizeDestinationUrl(camp.destinationUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              safeOpenDestinationUrl(camp.destinationUrl);
                            }}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-bold underline underline-offset-2 hover:underline cursor-pointer truncate max-w-xs transition-colors"
                            title={`Open destination website: ${normalizeDestinationUrl(camp.destinationUrl)}`}
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate">{camp.destinationUrl}</span>
                          </a>
                        )}
                        {camp.startDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {camp.startDate} to {camp.endDate || 'Ongoing'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions Bar */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <button
                        onClick={() => handleToggleStatus(camp)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          isActive
                            ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200'
                            : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200'
                        }`}
                      >
                        {isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{isActive ? 'Pause Campaign' : 'Activate Live'}</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(camp)}
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition cursor-pointer"
                          title="Edit Campaign"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCampaignToDelete(camp)}
                          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
                          title="Delete Campaign"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Campaign Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {editingCampaign ? 'Edit Sponsorship Campaign' : 'Create New Sponsorship Campaign'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCampaign} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Placement Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Campaign Placement Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, placement: 'Ticker' }))}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                      formData.placement === 'Ticker'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-300'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-xs font-extrabold flex items-center gap-1.5">
                      <Megaphone className="w-3.5 h-3.5" />
                      Home Ticker Marquee
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Scrolls seamlessly Left → Right on Home header
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, placement: 'CommunityFeed' }))}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                      formData.placement === 'CommunityFeed'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-900 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-xs font-extrabold flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      Community Feed Ad Card
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Promoted card with banner & CTA button in post feed
                    </span>
                  </button>
                </div>
              </div>

              {/* Sponsor Name & Logo */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Sponsor / Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MTN Nigeria, Airtel, FirstBank"
                    value={formData.sponsorName}
                    onChange={(e) => setFormData(prev => ({ ...prev, sponsorName: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Logo / Emoji
                  </label>
                  <input
                    type="text"
                    placeholder="📱, 🏦, 🌐"
                    value={formData.logo}
                    onChange={(e) => setFormData(prev => ({ ...prev, logo: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Campaign Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Campaign Title / Headline *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MTN Tech Scholars 2026 5G Laptops & Grants"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Text Body / Ticker Announcement */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {formData.placement === 'Ticker' ? 'Ticker Announcement Copy *' : 'Feed Ad Description / Body Text *'}
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Enter the full announcement text or promotion details..."
                  value={formData.text}
                  onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Banner Image for Feed Ads */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Banner / Creative Image URL</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    Upload Image (Max 2MB)
                  </button>
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageFileUpload}
                  className="hidden"
                />
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={formData.banner}
                  onChange={(e) => setFormData(prev => ({ ...prev, banner: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formData.banner && (
                  <div className="mt-2 rounded-xl overflow-hidden max-h-36 border border-slate-200 dark:border-slate-700 relative group">
                    <img src={formData.banner} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, banner: '' }))}
                      className="absolute top-2 right-2 p-1 bg-slate-900/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Destination URL & CTA Button */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Destination URL / Link
                  </label>
                  <input
                    type="text"
                    placeholder="https://sponsor.com/grant or #league"
                    value={formData.destinationUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, destinationUrl: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    CTA Button Label
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Apply Now, Claim $300, Learn More"
                    value={formData.ctaText}
                    onChange={(e) => setFormData(prev => ({ ...prev, ctaText: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Tag & Badge Label */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Tag / Category Pill
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Scholarship, STEM, Finance, Grants"
                    value={formData.tag}
                    onChange={(e) => setFormData(prev => ({ ...prev, tag: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Badge Label
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Official Telecom Partner"
                    value={formData.badgeLabel}
                    onChange={(e) => setFormData(prev => ({ ...prev, badgeLabel: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Status & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                  >
                    <option value="Top">Top (Featured First)</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none font-bold"
                  >
                    <option value="Active">Active (Live)</option>
                    <option value="Paused">Paused</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
              </div>

              {/* Schedule Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition cursor-pointer"
                >
                  {editingCampaign ? 'Save Changes' : 'Launch Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {campaignToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Delete Campaign?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to delete <span className="font-bold text-slate-700 dark:text-slate-200">"{campaignToDelete.title}"</span>? This will immediately remove it from all live student tickers and feeds.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setCampaignToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
