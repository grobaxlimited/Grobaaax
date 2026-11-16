import React, { useEffect, useMemo, useState } from 'react';
import {
  AdminBloggerRewardEntry,
  AdminRewardTransactionEntry,
  AdminSuspiciousViewSignal,
  SchoolBlogArticle,
  SchoolBlogAuditLog,
  SchoolBlogRecord,
  SchoolBlogReport,
  SchoolBlogRewardMilestone,
  SchoolBloggerApplication,
  SchoolBloggerAssignment,
} from '../../types';
import {
  adminApproveBloggerApplication,
  adminDismissBlogReport,
  adminModerateSchoolBlogArticle,
  adminRejectBloggerApplication,
  adminUpdateBloggerStatus,
  adminUpdateSchoolBlogStatus,
  fetchAdminSchoolBlogOverview,
} from '../../lib/schoolBlogService';
import {
  AlertCircle,
  Ban,
  Building2,
  CheckCircle2,
  ClipboardList,
  Coins,
  Eye,
  FileText,
  Flag,
  Loader2,
  Newspaper,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react';

type AdminBlogSubTab =
  | 'blogs'
  | 'applications'
  | 'bloggers'
  | 'moderation'
  | 'rewards'
  | 'audit';

interface ActionModalState {
  title: string;
  description: string;
  confirmLabel: string;
  confirmTone: 'blue' | 'amber' | 'rose' | 'emerald';
  requireReason?: boolean;
  defaultNote?: string;
  onConfirm: (note: string) => Promise<void>;
}

export const AdminSchoolBlogsView: React.FC = () => {
  const [subTab, setSubTab] = useState<AdminBlogSubTab>('applications');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [appStatusFilter, setAppStatusFilter] = useState<string>('Pending');
  const [selectedAppDetail, setSelectedAppDetail] = useState<SchoolBloggerApplication | null>(null);

  const [summary, setSummary] = useState({
    totalInstitutionsWithBlogs: 0,
    activeInstitutionsCount: 0,
    totalApplicationsCount: 0,
    pendingApplicationsCount: 0,
    rejectedApplicationsCount: 0,
    withdrawnApplicationsCount: 0,
    activeBloggersCount: 0,
    suspendedBloggersCount: 0,
    removedBloggersCount: 0,
    publishedArticlesCount: 0,
    totalArticlesCount: 0,
    openReportsCount: 0,
  });
  const [rewardSummary, setRewardSummary] = useState({
    totalGpCredited: 0,
    totalMilestonesPaid: 0,
    totalEligibleViews: 0,
    rewardedBloggersCount: 0,
    flaggedAnomaliesCount: 0,
  });
  const [blogs, setBlogs] = useState<Array<SchoolBlogRecord & { totalArticlesCount?: number }>>([]);
  const [applications, setApplications] = useState<SchoolBloggerApplication[]>([]);
  const [bloggers, setBloggers] = useState<SchoolBloggerAssignment[]>([]);
  const [articles, setArticles] = useState<SchoolBlogArticle[]>([]);
  const [reports, setReports] = useState<SchoolBlogReport[]>([]);
  const [auditLogs, setAuditLogs] = useState<SchoolBlogAuditLog[]>([]);
  const [bloggerRewards, setBloggerRewards] = useState<AdminBloggerRewardEntry[]>([]);
  const [rewardMilestones, setRewardMilestones] = useState<
    Array<SchoolBlogRewardMilestone & { bloggerName?: string; institutionName?: string }>
  >([]);
  const [rewardTransactions, setRewardTransactions] = useState<AdminRewardTransactionEntry[]>([]);
  const [suspiciousActivity, setSuspiciousActivity] = useState<AdminSuspiciousViewSignal[]>([]);

  const [actionModal, setActionModal] = useState<ActionModalState | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [isActionRunning, setIsActionRunning] = useState(false);

  const loadOverview = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchAdminSchoolBlogOverview();
      if (res.success) {
        if (res.summary) {
          setSummary((prev) => ({
            ...prev,
            activeInstitutionsCount: res.summary!.totalInstitutionsWithBlogs,
            ...res.summary,
          }));
        }
        if (res.rewardSummary) setRewardSummary(res.rewardSummary);
        setBlogs(res.blogs || []);
        setApplications(res.applications || []);
        setBloggers(res.bloggers || []);
        setArticles(res.articles || []);
        setReports(res.reports || []);
        setAuditLogs(res.auditLogs || []);
        setBloggerRewards(res.bloggerRewards || []);
        setRewardMilestones(res.rewardMilestones || []);
        setRewardTransactions(res.rewardTransactions || []);
        setSuspiciousActivity(res.suspiciousActivity || []);
      } else {
        setError(res.error || 'Failed to load School Blogs governance data.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error connecting to School Blogs Admin API.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 5000);
  };

  const openModal = (cfg: ActionModalState) => {
    setActionNote(cfg.defaultNote || '');
    setActionModal(cfg);
  };

  const executeModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModal) return;
    if (actionModal.requireReason && !actionNote.trim()) return;
    setIsActionRunning(true);
    setError(null);
    try {
      await actionModal.onConfirm(actionNote.trim());
      setActionModal(null);
      await loadOverview();
    } catch (err: any) {
      setError(err?.message || 'Action failed.');
    } finally {
      setIsActionRunning(false);
    }
  };

  const q = searchTerm.trim().toLowerCase();

  const filteredBlogs = useMemo(
    () =>
      blogs.filter(
        (b) =>
          !q ||
          b.institutionName.toLowerCase().includes(q) ||
          (b.shortName || '').toLowerCase().includes(q) ||
          (b.activeBlogger?.userName || '').toLowerCase().includes(q)
      ),
    [blogs, q]
  );

  const filteredApplications = useMemo(
    () =>
      applications.filter((app) => {
        const matchesStatus = appStatusFilter === 'All' || app.status === appStatusFilter;
        const matchesSearch =
          !q ||
          app.applicantName.toLowerCase().includes(q) ||
          app.institutionName.toLowerCase().includes(q) ||
          app.department.toLowerCase().includes(q);
        return matchesStatus && matchesSearch;
      }),
    [applications, appStatusFilter, q]
  );

  const filteredBloggers = useMemo(
    () =>
      bloggers.filter(
        (b) =>
          !q ||
          b.userName.toLowerCase().includes(q) ||
          b.institutionName.toLowerCase().includes(q) ||
          b.department.toLowerCase().includes(q)
      ),
    [bloggers, q]
  );

  const filteredArticles = useMemo(
    () =>
      articles.filter(
        (a) =>
          !q ||
          a.title.toLowerCase().includes(q) ||
          a.institutionName.toLowerCase().includes(q) ||
          a.authorName.toLowerCase().includes(q)
      ),
    [articles, q]
  );

  const openReports = useMemo(
    () => reports.filter((r) => r.status === 'open'),
    [reports]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
            <Newspaper className="w-4 h-4" />
            <span>Campus Editorial Governance</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            School Blogger Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Review free School Blogger applications, approve or reject applicants, manage institutional blogger access, moderate articles, and monitor 200-follower GP rewards.
          </p>
        </div>

        <button
          type="button"
          onClick={loadOverview}
          disabled={isLoading}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 self-start md:self-auto cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total Apps', value: summary.totalApplicationsCount || applications.length, icon: ClipboardList },
          { label: 'Pending Apps', value: summary.pendingApplicationsCount, icon: AlertCircle },
          { label: 'Approved Bloggers', value: summary.activeBloggersCount, icon: UserCheck },
          { label: 'Rejected Apps', value: summary.rejectedApplicationsCount || 0, icon: XCircle },
          { label: 'Suspended', value: summary.suspendedBloggersCount || 0, icon: Ban },
          {
            label: 'GP Credited',
            value: `${rewardSummary.totalGpCredited.toLocaleString()}`,
            icon: Coins,
          },
          { label: 'Open Reports', value: summary.openReportsCount, icon: Flag },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>{stat.label}</span>
                <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                {stat.value}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Navigation & Search */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
          {[
            {
              id: 'applications' as AdminBlogSubTab,
              label: `Applications (${summary.pendingApplicationsCount})`,
            },
            { id: 'bloggers' as AdminBlogSubTab, label: `Bloggers (${bloggers.length})` },
            {
              id: 'moderation' as AdminBlogSubTab,
              label: `Articles & Reports (${openReports.length})`,
            },
            { id: 'blogs' as AdminBlogSubTab, label: `Institution Blogs (${blogs.length})` },
            {
              id: 'rewards' as AdminBlogSubTab,
              label: `GP Rewards & Monitoring`,
            },
            { id: 'audit' as AdminBlogSubTab, label: 'Audit Logs' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                subTab === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px] lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by school, student, or headline..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Main Panel Content */}
      {isLoading ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <Loader2 className="w-7 h-7 text-blue-600 animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">Loading School Blogs data...</p>
        </div>
      ) : subTab === 'applications' ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {['Pending', 'Approved', 'Rejected', 'Withdrawn', 'All'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setAppStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  appStatusFilter === st
                    ? 'bg-slate-900 text-white dark:bg-blue-600'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {filteredApplications.length === 0 ? (
            <div className="p-10 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500">
              No {appStatusFilter !== 'All' ? appStatusFilter.toLowerCase() : ''} blogger applications found.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredApplications.map((app) => (
                <div
                  key={app.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-black text-slate-900 dark:text-white">
                          {app.applicantName}
                        </h3>
                        <span
                          className={`text-[11px] font-black uppercase tracking-wider ${
                            app.status === 'Pending'
                              ? 'text-amber-600'
                              : app.status === 'Approved'
                              ? 'text-emerald-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {app.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        <strong className="text-blue-600 dark:text-blue-400">
                          {app.institutionName}
                        </strong>{' '}
                        · {app.department} · {app.level}
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Applied {new Date(app.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-1.5 text-xs">
                    <div>
                      <span className="font-bold text-slate-700 dark:text-slate-300">Motivation: </span>
                      <span className="text-slate-600 dark:text-slate-300">{app.reason}</span>
                    </div>
                      {app.experience && (
                        <div>
                          <span className="font-bold text-slate-700 dark:text-slate-300">Experience: </span>
                          <span className="text-slate-600 dark:text-slate-300">{app.experience}</span>
                        </div>
                      )}
                      {app.additionalInfo && (
                        <div>
                          <span className="font-bold text-slate-700 dark:text-slate-300">Additional Info: </span>
                          <span className="text-slate-600 dark:text-slate-300">{app.additionalInfo}</span>
                        </div>
                      )}
                      {app.reviewNotes && (
                        <div>
                          <span className="font-bold text-slate-700 dark:text-slate-300">Review Notes: </span>
                          <span className="text-slate-600 dark:text-slate-300">{app.reviewNotes}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setSelectedAppDetail(app)}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Full Application</span>
                      </button>

                      {app.status === 'Pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openModal({
                                title: 'Reject Blogger Application',
                                description: `Reject ${app.applicantName}'s request to manage ${app.institutionName} Blog.`,
                                confirmLabel: 'Reject Application',
                                confirmTone: 'rose',
                                requireReason: true,
                                onConfirm: async (note) => {
                                  const res = await adminRejectBloggerApplication(app.id, note);
                                  if (!res.success) throw new Error(res.error || 'Reject failed.');
                                  setSelectedAppDetail(null);
                                  showNotice('Blogger application rejected.');
                                },
                              })
                            }
                            className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Reject</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openModal({
                                title: `Approve School Blogger for ${app.institutionName}`,
                                description: `Approving ${app.applicantName} grants School Blogger publishing access for ${app.institutionName} while preserving existing articles.`,
                                confirmLabel: 'Approve & Appoint',
                                confirmTone: 'emerald',
                                defaultNote: 'Approved as official School Blogger.',
                                onConfirm: async (note) => {
                                  const res = await adminApproveBloggerApplication(app.id, note);
                                  if (!res.success) throw new Error(res.error || 'Approval failed.');
                                  setSelectedAppDetail(null);
                                  showNotice(
                                    `${app.applicantName} approved as School Blogger for ${app.institutionName}.`
                                  );
                                },
                              })
                            }
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Approve &amp; Appoint</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
              ))}
            </div>
          )}
        </div>
      ) : subTab === 'bloggers' ? (
        <div className="space-y-3">
          {filteredBloggers.length === 0 ? (
            <div className="p-10 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500">
              No school blogger assignments recorded yet.
            </div>
          ) : (
            filteredBloggers.map((b) => (
              <div
                key={b.id}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                      {b.userName}
                    </h4>
                    <span
                      className={`text-[11px] font-black uppercase tracking-wider ${
                        b.status === 'active'
                          ? 'text-emerald-600'
                          : b.status === 'suspended'
                          ? 'text-amber-600'
                          : 'text-slate-500'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                    {b.institutionName} · {b.department} ({b.level})
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Appointed {new Date(b.appointedAt).toLocaleDateString()} by {b.appointedByName}
                    {b.endReason ? ` · Note: ${b.endReason}` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {b.status === 'active' && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          openModal({
                            title: 'Suspend School Blogger',
                            description: `Suspend ${b.userName}'s publishing access for ${b.institutionName}. Existing articles remain unaffected.`,
                            confirmLabel: 'Suspend Blogger',
                            confirmTone: 'amber',
                            requireReason: true,
                            onConfirm: async (note) => {
                              const res = await adminUpdateBloggerStatus(b.id, 'suspended', note);
                              if (!res.success) throw new Error(res.error || 'Suspend failed.');
                              showNotice('Blogger suspended.');
                            },
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Suspend</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openModal({
                            title: 'Revoke School Blogger Access',
                            description: `Revoke ${b.userName}'s School Blogger publishing access for ${b.institutionName}. Published articles remain visible unless moderated separately.`,
                            confirmLabel: 'Revoke Blogger',
                            confirmTone: 'rose',
                            requireReason: true,
                            onConfirm: async (note) => {
                              const res = await adminUpdateBloggerStatus(b.id, 'removed', note);
                              if (!res.success) throw new Error(res.error || 'Remove failed.');
                              showNotice('Blogger removed.');
                            },
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </>
                  )}

                  {(b.status === 'suspended' || b.status === 'removed') && (
                    <button
                      type="button"
                      onClick={() =>
                        openModal({
                          title: 'Reactivate School Blogger Privileges',
                          description: `Restore publishing access for ${b.userName} on ${b.institutionName} Blog.`,
                          confirmLabel: 'Reactivate Blogger',
                          confirmTone: 'emerald',
                          onConfirm: async (note) => {
                            const res = await adminUpdateBloggerStatus(b.id, 'active', note);
                            if (!res.success) throw new Error(res.error || 'Reactivate failed.');
                            showNotice('Blogger privileges reactivated.');
                          },
                        })
                      }
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reactivate</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : subTab === 'moderation' ? (
        <div className="space-y-6">
          {/* Open Reports */}
          <div className="space-y-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>Open Article Reports ({openReports.length})</span>
            </h3>
            {openReports.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500">
                All student reports have been resolved.
              </div>
            ) : (
              openReports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="text-xs font-black text-rose-600 dark:text-rose-400">
                      Reported Article: {rep.articleTitle || rep.articleId}
                    </div>
                    <div className="text-xs text-slate-700 dark:text-slate-300">
                      <strong>Reason:</strong> {rep.reason}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {rep.institutionName} · Reported by {rep.reporterName} on{' '}
                      {new Date(rep.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await adminDismissBlogReport(rep.id);
                        if (res.success) {
                          showNotice('Report dismissed.');
                          loadOverview();
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      Dismiss Report
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        openModal({
                          title: 'Remove Reported Article',
                          description: `Remove "${rep.articleTitle}" from public School Blog feed.`,
                          confirmLabel: 'Remove Article',
                          confirmTone: 'rose',
                          requireReason: true,
                          defaultNote: rep.reason,
                          onConfirm: async (note) => {
                            const res = await adminModerateSchoolBlogArticle(
                              rep.articleId,
                              'remove',
                              note
                            );
                            if (!res.success) throw new Error(res.error || 'Remove failed.');
                            showNotice('Article removed and related reports resolved.');
                          },
                        })
                      }
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                    >
                      Remove Article
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* All Articles Moderation Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
              All School Blog Articles ({filteredArticles.length})
            </h3>
            {filteredArticles.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                No school blog articles found.
              </div>
            ) : (
              filteredArticles.map((art) => (
                <div
                  key={art.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 text-[11px] font-bold flex-wrap">
                      <span
                        className={`uppercase ${
                          art.status === 'published'
                            ? 'text-emerald-600'
                            : art.status === 'removed'
                            ? 'text-rose-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {art.status}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-blue-600 dark:text-blue-400">{art.institutionName}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-500">{art.category}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-500 tabular-nums flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {art.viewsCount}
                      </span>
                    </div>
                    <div className="font-black text-sm text-slate-900 dark:text-white truncate">
                      {art.title}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Author: {art.authorName}
                      {art.moderationReason ? ` · Moderation Note: ${art.moderationReason}` : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {art.status === 'published' && (
                      <button
                        type="button"
                        onClick={() =>
                          openModal({
                            title: 'Unpublish Article',
                            description: `Hide "${art.title}" from the public feed until edited or restored.`,
                            confirmLabel: 'Unpublish',
                            confirmTone: 'amber',
                            onConfirm: async (note) => {
                              const res = await adminModerateSchoolBlogArticle(
                                art.id,
                                'unpublish',
                                note
                              );
                              if (!res.success) throw new Error(res.error || 'Failed.');
                              showNotice('Article unpublished.');
                            },
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-bold cursor-pointer"
                      >
                        Unpublish
                      </button>
                    )}

                    {art.status !== 'removed' && (
                      <button
                        type="button"
                        onClick={() =>
                          openModal({
                            title: 'Remove Article',
                            description: `Remove "${art.title}" for policy violation.`,
                            confirmLabel: 'Remove Article',
                            confirmTone: 'rose',
                            requireReason: true,
                            onConfirm: async (note) => {
                              const res = await adminModerateSchoolBlogArticle(
                                art.id,
                                'remove',
                                note
                              );
                              if (!res.success) throw new Error(res.error || 'Failed.');
                              showNotice('Article removed.');
                            },
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold cursor-pointer"
                      >
                        Remove
                      </button>
                    )}

                    {(art.status === 'removed' || art.status === 'unpublished') && (
                      <button
                        type="button"
                        onClick={() =>
                          openModal({
                            title: 'Restore Article',
                            description: `Publish "${art.title}" back to ${art.institutionName} Blog.`,
                            confirmLabel: 'Restore & Publish',
                            confirmTone: 'emerald',
                            onConfirm: async (note) => {
                              const res = await adminModerateSchoolBlogArticle(
                                art.id,
                                'restore',
                                note
                              );
                              if (!res.success) throw new Error(res.error || 'Failed.');
                              showNotice('Article restored.');
                            },
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : subTab === 'blogs' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredBlogs.map((b) => (
            <div
              key={b.institutionId}
              className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl shrink-0">{b.logo || '🏛️'}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-black text-sm text-slate-900 dark:text-white truncate">
                        {b.institutionName}
                      </h4>
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          b.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {b.shortName} · {b.category} · {b.state}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 tabular-nums shrink-0">
                  {b.publishedArticlesCount || 0} published
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between gap-2 flex-wrap">
                <span>
                  Blogger:{' '}
                  <strong>{b.activeBlogger ? b.activeBlogger.userName : 'Unassigned'}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 tabular-nums">
                    Total posts: {b.totalArticlesCount || 0}
                  </span>
                  {b.status === 'active' ? (
                    <button
                      type="button"
                      onClick={() =>
                        openModal({
                          title: `Suspend ${b.institutionName} Blog`,
                          description:
                            'Deactivating this School Blog hides articles and pauses publishing until reactivated.',
                          confirmLabel: 'Suspend Blog',
                          confirmTone: 'rose',
                          requireReason: true,
                          onConfirm: async (note) => {
                            const res = await adminUpdateSchoolBlogStatus(
                              b.institutionId,
                              'suspended',
                              note
                            );
                            if (!res.success) throw new Error(res.error || 'Suspend failed.');
                            showNotice(`${b.institutionName} School Blog suspended.`);
                          },
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[11px] font-bold cursor-pointer"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        openModal({
                          title: `Reactivate ${b.institutionName} Blog`,
                          description: 'Restore public subscriber access and blogger publishing.',
                          confirmLabel: 'Activate Blog',
                          confirmTone: 'emerald',
                          onConfirm: async (note) => {
                            const res = await adminUpdateSchoolBlogStatus(
                              b.institutionId,
                              'active',
                              note
                            );
                            if (!res.success) throw new Error(res.error || 'Activate failed.');
                            showNotice(`${b.institutionName} School Blog activated.`);
                          },
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                    >
                      Activate
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : subTab === 'rewards' ? (
        /* GP Rewards & View Integrity Monitoring */
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: 'Total GP Credited',
                value: `${rewardSummary.totalGpCredited.toLocaleString()} GP`,
              },
              {
                label: 'Milestones Paid',
                value: rewardSummary.totalMilestonesPaid.toLocaleString(),
              },
              {
                label: 'Total Eligible Views',
                value: rewardSummary.totalEligibleViews.toLocaleString(),
              },
              {
                label: 'Suspicious Signals',
                value: rewardSummary.flaggedAnomaliesCount.toLocaleString(),
              },
            ].map((card) => (
              <div
                key={card.label}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1"
              >
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {card.label}
                </div>
                <div className="text-xl font-black text-blue-600 dark:text-blue-400 tabular-nums">
                  {card.value}
                </div>
              </div>
            ))}
          </div>

          {/* Per-Blogger GP Totals */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Coins className="w-4 h-4 text-blue-600" />
              <span>Blogger Reward Totals ({bloggerRewards.length})</span>
            </h3>
            {bloggerRewards.length === 0 ? (
              <p className="text-xs text-slate-500">No blogger reward records yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {bloggerRewards
                  .filter(
                    (br) =>
                      !q ||
                      br.userName.toLowerCase().includes(q) ||
                      br.institutionName.toLowerCase().includes(q)
                  )
                  .map((br) => (
                    <div
                      key={`${br.userId}_${br.institutionId}`}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                          <span>{br.userName}</span>
                          <span
                            className={`text-[10px] uppercase font-black ${
                              br.status === 'active'
                                ? 'text-emerald-600'
                                : br.status === 'suspended'
                                ? 'text-amber-600'
                                : 'text-slate-500'
                            }`}
                          >
                            {br.status}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                              br.isRewardEligible
                                ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                            }`}
                          >
                            {Number(br.followerCount || 0).toLocaleString()} / 200 Followers
                          </span>
                        </div>
                        <div className="text-slate-500 dark:text-slate-400">
                          {br.institutionName} · {br.publishedArticlesCount} published posts
                          {typeof br.qualifyingViews === 'number'
                            ? ` · ${br.qualifyingViews.toLocaleString()} qualifying views`
                            : ''}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 tabular-nums">
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 uppercase font-bold">
                            Eligible Views
                          </div>
                          <div className="font-bold text-slate-700 dark:text-slate-200">
                            {br.eligibleViews.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 uppercase font-bold">
                            Milestones
                          </div>
                          <div className="font-bold text-slate-700 dark:text-slate-200">
                            {br.milestonesAchieved}
                          </div>
                        </div>
                        <div className="text-right min-w-[84px]">
                          <div className="text-[10px] text-slate-400 uppercase font-bold">
                            Total GP
                          </div>
                          <div className="font-black text-blue-600 dark:text-blue-400">
                            {br.totalGpEarned.toLocaleString()} GP
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Automatic Milestone Credit & Wallet Ledger */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Reward Milestone Records ({rewardMilestones.length})
              </h3>
              {rewardMilestones.length === 0 ? (
                <p className="text-xs text-slate-500">No 250-view milestones credited yet.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
                  {rewardMilestones.map((m) => (
                    <div key={m.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white truncate">
                          {m.articleTitle || m.articleId}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {m.bloggerName} · {m.institutionName} · #{m.milestoneNumber} (
                          {m.eligibleViewThreshold} views)
                        </div>
                      </div>
                      <div className="text-right shrink-0 tabular-nums">
                        <div className="font-black text-blue-600 dark:text-blue-400">
                          +{m.gpAmount.toLocaleString()} GP
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(m.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>View Integrity &amp; Wallet Payouts ({rewardTransactions.length})</span>
              </h3>
              {suspiciousActivity.length === 0 ? (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  No abnormal view velocity spikes or duplicate traffic anomalies detected.
                </div>
              ) : (
                <div className="space-y-2">
                  {suspiciousActivity.map((sig) => (
                    <div
                      key={sig.id}
                      className={`p-3 rounded-2xl border text-xs space-y-0.5 ${
                        sig.severity === 'warning'
                          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="font-black">{sig.title}</div>
                      <div className="text-[11px] opacity-90">{sig.details}</div>
                    </div>
                  ))}
                </div>
              )}

              {rewardTransactions.length > 0 && (
                <div className="pt-2 divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                  {rewardTransactions.map((tx) => (
                    <div key={tx.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                          {tx.userName} · {tx.articleTitle || tx.institutionName}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">{tx.id}</div>
                      </div>
                      <div className="font-black text-emerald-600 tabular-nums shrink-0">
                        +{tx.amount.toLocaleString()} GP
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Audit Logs */
        <div className="space-y-2.5">
          {auditLogs.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              No School Blog audit entries logged yet.
            </div>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-black text-slate-900 dark:text-white">
                    {log.action} · {log.institutionName || 'Platform'}
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    Actor: <strong>{log.actorName}</strong> ({log.actorRole}) · Target:{' '}
                    {log.targetType} ({log.targetId})
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 shrink-0 tabular-nums">
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Confirmation & Notes Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  {actionModal.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {actionModal.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={executeModal} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {actionModal.requireReason ? 'Reason / Note (Required)' : 'Admin Note (Optional)'}
                </label>
                <textarea
                  rows={3}
                  required={actionModal.requireReason}
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="Enter moderation or review notes..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionRunning || (actionModal.requireReason && !actionNote.trim())}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-bold cursor-pointer disabled:opacity-50 ${
                    actionModal.confirmTone === 'rose'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : actionModal.confirmTone === 'amber'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : actionModal.confirmTone === 'emerald'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isActionRunning ? 'Processing...' : actionModal.confirmLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Application Review Modal */}
      {selectedAppDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setSelectedAppDetail(null)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  School Blogger Application Review
                </div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white">
                  {selectedAppDetail.applicantName}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedAppDetail.institutionName} · {selectedAppDetail.department} ({selectedAppDetail.level})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAppDetail(null)}
                className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-500">Status</span>
                <span className="font-black uppercase text-slate-900 dark:text-white">
                  {selectedAppDetail.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-500">Submitted</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {new Date(selectedAppDetail.createdAt).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block">
                  Reason for Applying:
                </span>
                <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {selectedAppDetail.reason}
                </p>
              </div>
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block">
                  Previous Writing / Journalism Experience:
                </span>
                <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {selectedAppDetail.experience || 'None provided'}
                </p>
              </div>
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block">
                  Additional Relevant Information:
                </span>
                <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {selectedAppDetail.additionalInfo || 'None provided'}
                </p>
              </div>
              {selectedAppDetail.reviewNotes && (
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">
                    Admin Review Notes:
                  </span>
                  <p className="text-slate-600 dark:text-slate-300 mt-1">
                    {selectedAppDetail.reviewNotes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedAppDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
              {selectedAppDetail.status === 'Pending' && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      openModal({
                        title: 'Reject Blogger Application',
                        description: `Reject ${selectedAppDetail.applicantName}'s application for ${selectedAppDetail.institutionName}.`,
                        confirmLabel: 'Reject Application',
                        confirmTone: 'rose',
                        requireReason: true,
                        onConfirm: async (note) => {
                          const res = await adminRejectBloggerApplication(selectedAppDetail.id, note);
                          if (!res.success) throw new Error(res.error || 'Reject failed.');
                          setSelectedAppDetail(null);
                          showNotice('Blogger application rejected.');
                        },
                      })
                    }
                    className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold cursor-pointer"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      openModal({
                        title: `Approve School Blogger for ${selectedAppDetail.institutionName}`,
                        description: `Approving ${selectedAppDetail.applicantName} grants official School Blogger access for ${selectedAppDetail.institutionName}.`,
                        confirmLabel: 'Approve & Appoint',
                        confirmTone: 'emerald',
                        defaultNote: 'Approved as official School Blogger.',
                        onConfirm: async (note) => {
                          const res = await adminApproveBloggerApplication(selectedAppDetail.id, note);
                          if (!res.success) throw new Error(res.error || 'Approval failed.');
                          setSelectedAppDetail(null);
                          showNotice(
                            `${selectedAppDetail.applicantName} approved as School Blogger for ${selectedAppDetail.institutionName}.`
                          );
                        },
                      })
                    }
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Approve &amp; Appoint
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
