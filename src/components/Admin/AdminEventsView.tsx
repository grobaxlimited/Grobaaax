import React, { useState, useEffect, useRef } from 'react';
import {
  PlatformEventItem,
  PlatformEventCategory,
  PlatformEventStatus,
  PLATFORM_EVENT_CATEGORIES,
  OFFICIAL_EVENT_HOST,
  PRIMARY_SUPER_ADMIN_UID,
  TabType,
} from '../../types';
import { resolveEventChannel } from '../../utils/eventNavigation';
import {
  db,
  savePlatformEventToFirestore,
  deletePlatformEventFromFirestore,
  togglePlatformEventStatusInFirestore,
  uploadEventCatalogImage,
} from '../../lib/firebase';
import {
  Calendar,
  Plus,
  Edit3,
  Trash2,
  Trophy,
  Users,
  Building2,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  Filter,
  X,
  Award,
  Upload,
  Image as ImageIcon,
  Eye,
  Check,
  AlertCircle,
  ArrowUpRight,
  ShieldCheck,
  Layers,
  HelpCircle,
  AlertTriangle,
  Compass,
} from 'lucide-react';
import { EventDetailsModal } from '../Home/EventDetailsModal';
import { useApp } from '../../context/AppContext';

const EVENT_IMAGE_PRESETS = [
  {
    name: 'School Dome Arena',
    category: 'school_dome',
    url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Institutional League',
    category: 'school_dome',
    url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Champions League',
    category: 'school_dome',
    url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'GUS University Clash',
    category: 'gus',
    url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Chatroom Live Gala',
    category: 'chatroom_live',
    url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'STEM & Tech Arena',
    category: 'others',
    url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Campus Debate Cup',
    category: 'others',
    url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop&q=80',
  },
];

export function AdminEventsView() {
  const { currentUser, events: contextEvents, deletePlatformEvent, savePlatformEvent, togglePlatformEventStatus } = useApp();
  const adminUid = currentUser?.id || PRIMARY_SUPER_ADMIN_UID;
  const adminName = currentUser?.name || 'Administrator';

  const [events, setEvents] = useState<PlatformEventItem[]>((contextEvents as any as PlatformEventItem[]) || []);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Sync events from AppContext global state
  useEffect(() => {
    if (contextEvents) {
      setEvents((contextEvents as any as PlatformEventItem[]) || []);
    }
  }, [contextEvents]);

  // Modal & Form State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<Partial<PlatformEventItem> | null>(null);
  const [previewEvent, setPreviewEvent] = useState<PlatformEventItem | null>(null);
  const [eventToDelete, setEventToDelete] = useState<PlatformEventItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Form Fields
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<PlatformEventCategory>('school_dome');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [eventTime, setEventTime] = useState<string>('18:00 UTC');
  const [prizeReward, setPrizeReward] = useState<string>('50,000 GP Prize Pool');
  const [description, setDescription] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>(
    'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80'
  );
  const [imageStoragePath, setImageStoragePath] = useState<string>('');
  const [status, setStatus] = useState<PlatformEventStatus>('Published');
  const [targetTab, setTargetTab] = useState<TabType>('school_dome');
  const [targetSubTab, setTargetSubTab] = useState<'minimart' | 'announcements' | 'campus' | ''>('');

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);



  const resetForm = () => {
    setEditingEvent(null);
    setTitle('');
    setCategory('school_dome');
    const today = new Date().toISOString().split('T')[0];
    const twoWeeksLater = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(twoWeeksLater);
    setEventTime('18:00 UTC');
    setPrizeReward('50,000 GP Prize Pool');
    setDescription('');
    setImageUrl('https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80');
    setImageStoragePath('');
    setStatus('Published');
    setTargetTab('school_dome');
    setTargetSubTab('');
    setFormError(null);
    setUploadProgressMsg('');
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEditModal = (ev: PlatformEventItem) => {
    setEditingEvent(ev);
    setTitle(ev.title || '');
    const resolvedCat = ev.category || (ev.targetTab === 'school_dome' ? 'school_dome' : 'school_dome');
    setCategory(resolvedCat);
    setStartDate(ev.startDate || new Date().toISOString().split('T')[0]);
    setEndDate(ev.endDate || new Date().toISOString().split('T')[0]);
    setEventTime(ev.eventTime || ev.time || '18:00 UTC');
    setPrizeReward(ev.prizeReward || ev.prizePool || '');
    setDescription(ev.description || '');
    setImageUrl(ev.imageUrl || ev.image || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80');
    setImageStoragePath(ev.imageStoragePath || '');
    setStatus(ev.status || 'Published');
    setTargetTab(ev.targetTab || (resolvedCat === 'school_dome' ? 'school_dome' : 'daily_qa'));
    setTargetSubTab(ev.targetSubTab || '');
    setFormError(null);
    setUploadProgressMsg('');
    setShowModal(true);
  };

  // Image Upload Handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    // File validation: Size (<= 2MB) and type
    if (file.size > 2 * 1024 * 1024) {
      setFormError('Image file size must be 2MB or less.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file (JPG, PNG, or WebP).');
      return;
    }

    setFormError(null);

    // Immediate Base64 preview for instantaneous visual feedback
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      if (base64) {
        setImageUrl(base64);
      }
    };
    reader.readAsDataURL(file);

    setUploadingImage(true);
    setUploadProgressMsg('Uploading image to Firebase Storage...');

    try {
      const eventId = editingEvent?.id || `ev_${Date.now()}`;
      const { downloadUrl, storagePath } = await uploadEventCatalogImage(file, eventId);
      if (downloadUrl) {
        setImageUrl(downloadUrl);
      }
      setImageStoragePath(storagePath);
      setUploadProgressMsg('Image uploaded and synced successfully!');
    } catch (err: any) {
      console.warn('Image storage upload notice:', err);
      setUploadProgressMsg('Image attached for this event.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveEvent = async (e: React.FormEvent, targetStatus?: PlatformEventStatus) => {
    e.preventDefault();
    setFormError(null);

    const finalTitle = title.trim();
    if (!finalTitle) {
      setFormError('Please enter an Event Title.');
      return;
    }

    if (!startDate || !endDate) {
      setFormError('Please select both a Start Date and an End Date.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setFormError('Start Date cannot be later than End Date.');
      return;
    }

    setIsSubmitting(true);

    const finalStatus: PlatformEventStatus = targetStatus || status;

    const resolvedTargetTab: TabType = (targetTab as TabType) || (category === 'school_dome' ? 'school_dome' : 'daily_qa');

    const payload: Partial<PlatformEventItem> = {
      id: editingEvent?.id,
      title: finalTitle,
      category,
      host: OFFICIAL_EVENT_HOST,
      startDate,
      endDate,
      eventTime: eventTime || '18:00 UTC',
      prizeReward: prizeReward ? prizeReward.trim() : '',
      audience: 'all_users',
      description: description.trim(),
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
      imageStoragePath,
      status: finalStatus,
      targetTab: resolvedTargetTab,
      targetSubTab: resolvedTargetTab === 'community' ? (targetSubTab as any || 'campus') : undefined,
    };

    try {
      let savedId = '';
      if (savePlatformEvent) {
        savedId = await savePlatformEvent(payload);
      } else {
        savedId = await savePlatformEventToFirestore(payload, adminUid, adminName);
      }

      const fullItem: PlatformEventItem = {
        ...payload,
        id: savedId,
        eventId: savedId,
      } as PlatformEventItem;

      setEvents((prev) => {
        const idx = prev.findIndex((ev) => ev.id === savedId || ev.id === editingEvent?.id);
        if (idx >= 0) {
          return prev.map((item, i) => (i === idx ? { ...item, ...fullItem } : item));
        }
        return [fullItem, ...prev];
      });

      setShowModal(false);
      resetForm();
    } catch (err: any) {
      console.error('Error saving platform event:', err);
      setFormError(err.message || 'Failed to save event to Firebase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = (ev: PlatformEventItem) => {
    setEventToDelete(ev);
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;
    setIsDeleting(true);
    try {
      await deletePlatformEventFromFirestore(
        eventToDelete.id,
        eventToDelete.title,
        eventToDelete.imageStoragePath,
        adminUid,
        adminName
      );
      if (deletePlatformEvent) {
        deletePlatformEvent(eventToDelete.id);
      }
      setEvents((prev) => prev.filter((e) => e.id !== eventToDelete.id));
      setEventToDelete(null);
    } catch (err) {
      console.error('Failed to delete event:', err);
      setFormError('Failed to delete event from catalog.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (ev: PlatformEventItem) => {
    const nextStatus: PlatformEventStatus = ev.status === 'Published' ? 'Unpublished' : 'Published';
    setEvents((prev) => prev.map((item) => (item.id === ev.id ? { ...item, status: nextStatus } : item)));
    try {
      if (togglePlatformEventStatus) {
        await togglePlatformEventStatus(ev.id, nextStatus);
      } else {
        await togglePlatformEventStatusInFirestore(ev.id, ev.title, nextStatus, adminUid, adminName);
      }
    } catch (err) {
      console.error('Failed to update event status:', err);
      alert('Failed to toggle event status.');
    }
  };

  // Filtered Events
  const filteredEvents = events.filter((ev) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      ev.title?.toLowerCase().includes(q) ||
      ev.host?.toLowerCase().includes(q) ||
      ev.category?.toLowerCase().includes(q) ||
      ev.description?.toLowerCase().includes(q);

    const matchesCategory =
      categoryFilter === 'All' ||
      ev.category === categoryFilter ||
      PLATFORM_EVENT_CATEGORIES.find((c) => c.label === categoryFilter)?.id === ev.category;

    const matchesStatus = statusFilter === 'All' || ev.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getCategoryBadgeClass = (cat: PlatformEventCategory) => {
    switch (cat) {
      case 'school_dome':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'gus':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'chatroom_live':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      case 'academic_olympiad':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'campus_hackathon':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'others':
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    }
  };

  const getStatusBadgeClass = (st: PlatformEventStatus) => {
    switch (st) {
      case 'Published':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'Draft':
        return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30';
      case 'Unpublished':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'Archived':
        return 'bg-zinc-500/15 text-zinc-500 border-zinc-500/30';
      default:
        return 'bg-slate-500/15 text-slate-500 border-slate-500/30';
    }
  };

  return (
    <div id="admin-events-view" className="space-y-6 text-slate-900 dark:text-white">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-950 via-blue-900 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl border border-blue-500/20">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
            Real-Time Platform Catalog
          </span>
          <h1 className="text-2xl font-black flex items-center gap-2 mt-1">
            <Calendar className="w-7 h-7 text-blue-400" /> Platform Events Management
          </h1>
          <p className="text-xs text-blue-200 mt-1 max-w-xl">
            Create, publish, and manage official inter-institutional events, qualification events, competitions, and other Grobaax events on the Home Page.
          </p>
        </div>

        <button
          id="create-platform-event-btn"
          onClick={handleOpenAddModal}
          className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" /> Create Platform Event
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs shadow-xs">
        {/* Search */}
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="event-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, category, host..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden"
          />
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          <span className="text-slate-400 text-[11px] font-bold shrink-0 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Category:
          </span>
          <button
            onClick={() => setCategoryFilter('All')}
            className={`px-3 py-1.5 rounded-xl font-bold text-[11px] whitespace-nowrap transition cursor-pointer ${
              categoryFilter === 'All'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All
          </button>
          {PLATFORM_EVENT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] whitespace-nowrap transition cursor-pointer ${
                categoryFilter === cat.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat.shortLabel}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-slate-400 text-[11px] font-bold">Status:</span>
          {(['All', 'Published', 'Draft', 'Unpublished'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-xl font-bold text-[11px] transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Events Cards Grid */}
      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          Loading platform events from Firestore database...
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-16 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
          <p className="font-medium">No platform events found matching the specified filters.</p>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition cursor-pointer"
          >
            Create First Platform Event
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredEvents.map((ev) => {
            const catObj = PLATFORM_EVENT_CATEGORIES.find((c) => c.id === ev.category);
            const catLabel = catObj?.label || ev.category;
            const isPublished = ev.status === 'Published';
            const hasPrize = Boolean(ev.prizeReward && ev.prizeReward.trim() !== '' && ev.prizeReward.trim() !== '0');

            return (
              <div
                key={ev.id}
                id={`admin-event-card-${ev.id}`}
                className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs hover:border-blue-500/40 hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Card Cover & Badges */}
                <div className="relative h-40 w-full bg-slate-950 overflow-hidden">
                  <img
                    src={ev.imageUrl || ev.image || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80'}
                    alt={ev.title}
                    className="w-full h-full object-cover opacity-80"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border ${getCategoryBadgeClass(ev.category)} bg-slate-950/80`}>
                      {catObj?.shortLabel || catLabel}
                    </span>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border ${getStatusBadgeClass(ev.status)} bg-slate-950/80`}>
                      {ev.status}
                    </span>
                  </div>

                  {/* Title & Host on cover bottom */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="font-black text-sm text-white leading-tight drop-shadow-sm line-clamp-1">
                      {ev.title}
                    </h3>
                    <p className="text-[11px] text-slate-300 font-medium flex items-center gap-1 mt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{ev.host || OFFICIAL_EVENT_HOST}</span>
                    </p>
                  </div>
                </div>

                {/* Details Body */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between text-xs">
                  {/* Meta Facts */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold block flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-blue-500" /> Date Window
                      </span>
                      <strong className="text-slate-800 dark:text-slate-200 font-bold block truncate mt-0.5">
                        {ev.startDate && ev.endDate ? `${ev.startDate} to ${ev.endDate}` : ev.date || 'TBD'}
                      </strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold block flex items-center gap-1">
                        <Clock className="w-3 h-3 text-indigo-500" /> Time & Audience
                      </span>
                      <strong className="text-slate-800 dark:text-slate-200 font-bold block truncate mt-0.5">
                        {ev.eventTime || ev.time || '18:00 UTC'} • All Users
                      </strong>
                    </div>
                  </div>

                  {/* Reward Pill (if configured) or placeholder notice */}
                  {hasPrize ? (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-black text-xs">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        <span>{ev.prizeReward}</span>
                      </div>
                      <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                        Configured Reward
                      </span>
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-dashed border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 italic">
                      No prize configured (Reward section omitted on User App)
                    </div>
                  )}

                  {/* Description snippet */}
                  {ev.description && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {ev.description}
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleStatus(ev)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition flex items-center gap-1.5 cursor-pointer ${
                          isPublished
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
                        }`}
                        title={isPublished ? 'Unpublish from Home Page' : 'Publish to Home Page'}
                      >
                        {isPublished ? 'Unpublish' : 'Publish Live'}
                      </button>

                      <button
                        onClick={() => setPreviewEvent(ev)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                        title="Preview how event appears to users"
                      >
                        <Eye className="w-3.5 h-3.5" /> Preview
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(ev)}
                        className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition cursor-pointer"
                        title="Edit Event Details"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteEvent(ev)}
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        title="Delete Event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT EVENT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div
            id="admin-event-form-modal"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-5 relative my-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    {editingEvent ? 'Edit Platform Event' : 'Create Official Platform Event'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Events published here appear in real-time on the Grobaax Home Page.
                  </p>
                </div>
              </div>

              <button
                id="close-admin-event-modal-btn"
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error message */}
            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={(e) => handleSaveEvent(e)} className="space-y-4 text-xs">
              {/* Event Title */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Event Title <span className="text-rose-500">*</span>
                </label>
                <input
                  id="event-form-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Grobaax Institutional League Season 1"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Category & Host */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Event Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="event-form-category"
                    value={category}
                    onChange={(e) => {
                      const newCat = e.target.value as PlatformEventCategory;
                      setCategory(newCat);
                      if (newCat === 'school_dome') {
                        setTargetTab('school_dome');
                        setTargetSubTab('');
                      } else if (newCat === 'gus' || newCat === 'academic_olympiad' || newCat === 'chatroom_live') {
                        setTargetTab('daily_qa');
                        setTargetSubTab('');
                      } else if (newCat === 'campus_hackathon' || newCat === 'others') {
                        setTargetTab('community');
                        setTargetSubTab('campus');
                      }
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white focus:border-blue-500 focus:outline-hidden"
                  >
                    {PLATFORM_EVENT_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Official Host (Fixed)
                  </label>
                  <div className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-between">
                    <span>{OFFICIAL_EVENT_HOST}</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  </div>
                </div>
              </div>

              {/* Destination Channel Routing */}
              <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      Destination Channel (Directs users to proper channel)
                    </label>
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                    Direct Channel Routing
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Primary Target Channel
                    </label>
                    <select
                      id="event-form-target-tab"
                      value={targetTab}
                      onChange={(e) => {
                        const val = e.target.value as TabType;
                        setTargetTab(val);
                        if (val === 'community') {
                          setTargetSubTab('campus');
                        } else {
                          setTargetSubTab('');
                        }
                      }}
                      className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white text-xs focus:border-blue-500 focus:outline-hidden"
                    >
                      <option value="school_dome">School Dome Arena</option>
                      <option value="daily_qa">Daily GP Grab</option>
                      <option value="community">Community / Campus / Mini Mart</option>
                      <option value="library">AI Academic Library & Assistant</option>
                      <option value="home">Home Hub</option>
                      <option value="profile">Student Profile Hub</option>
                    </select>
                  </div>

                  {targetTab === 'community' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Community Sub-Channel
                      </label>
                      <select
                        id="event-form-target-subtab"
                        value={targetSubTab || 'campus'}
                        onChange={(e) => setTargetSubTab(e.target.value as any)}
                        className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white text-xs focus:border-blue-500 focus:outline-hidden"
                      >
                        <option value="campus">Campus Network</option>
                        <option value="minimart">Mini Mart & Skills Listing</option>
                        <option value="announcements">Official Announcements</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Resolved routing preview */}
                {(() => {
                  const simulatedEv: Partial<PlatformEventItem> = {
                    category,
                    targetTab: targetTab ? (targetTab as TabType) : undefined,
                    targetSubTab: targetSubTab ? (targetSubTab as any) : undefined,
                  };
                  const resolved = resolveEventChannel(simulatedEv as PlatformEventItem);
                  return (
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-600 dark:text-slate-400">
                      <span>Directs users to:</span>
                      <strong className="text-blue-600 dark:text-blue-400">{resolved.label}</strong>
                      <span>• Button:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">"{resolved.actionText}"</span>
                    </div>
                  );
                })()}
              </div>

              {/* Date Window & Time Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="event-form-start-date"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="event-form-end-date"
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Event Time
                  </label>
                  <input
                    id="event-form-time"
                    type="text"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    placeholder="e.g. 18:00 UTC"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Prize & Audience */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Prize / Reward (Optional)
                  </label>
                  <input
                    id="event-form-prize"
                    type="text"
                    value={prizeReward}
                    onChange={(e) => setPrizeReward(e.target.value)}
                    placeholder="e.g. 100,000 GP Prize Pool (leave empty if none)"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white focus:border-blue-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    If left blank, the reward badge is automatically hidden on the User App.
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Audience Visibility
                  </label>
                  <div className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-between">
                    <span>All Registered Users (Public)</span>
                    <Users className="w-4 h-4 text-indigo-500" />
                  </div>
                </div>
              </div>

              {/* Image Upload & Preview */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Event Cover Image (Firebase Storage Upload or URL)
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  {/* Image Preview Box */}
                  <div className="relative h-24 rounded-2xl bg-slate-950 overflow-hidden border border-slate-200 dark:border-slate-800">
                    <img
                      src={imageUrl || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80'}
                      alt="Event Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80';
                      }}
                    />
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center text-white text-[10px] font-bold">
                        Uploading...
                      </div>
                    )}
                  </div>

                  {/* Upload Dropzone / Button */}
                  <div className="sm:col-span-2 space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5" /> Select Image File
                      </button>

                      <span className="text-[10px] text-slate-400">
                        Max 2MB (PNG, JPG, WebP)
                      </span>
                    </div>

                    {uploadProgressMsg && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
                        {uploadProgressMsg}
                      </span>
                    )}

                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Or paste direct image URL (https://...)"
                      className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-[11px] focus:border-blue-500 focus:outline-hidden"
                    />

                    {/* Quick Preset Images */}
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-bold text-slate-400">
                        Or pick from curated event presets:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {EVENT_IMAGE_PRESETS.map((p) => (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => {
                              setImageUrl(p.url);
                              setImageStoragePath('');
                              setUploadProgressMsg(`Selected preset: ${p.name}`);
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition cursor-pointer ${
                              imageUrl === p.url
                                ? 'bg-blue-600 text-white border-blue-500'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-500'
                            }`}
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Description */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Event Details & Guidelines
                </label>
                <textarea
                  id="event-form-description"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide comprehensive details, rules, syllabus, schedule, match format, and eligibility requirements for scholars..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-white focus:border-blue-500 focus:outline-hidden leading-relaxed"
                />
              </div>

              {/* Status Selector */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Publishing Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Published', 'Draft', 'Unpublished'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(st)}
                      className={`p-2.5 rounded-xl font-extrabold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 border ${
                        status === st
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {status === st && <Check className="w-3.5 h-3.5" />}
                      <span>{st}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer Form Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={(e) => handleSaveEvent(e, 'Draft')}
                    className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-50"
                  >
                    Save as Draft
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold shadow-md shadow-blue-600/30 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmitting ? 'Saving...' : editingEvent ? 'Save Changes' : 'Publish Event'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IN-APP DELETE EVENT CONFIRMATION MODAL */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Permanently Delete Event?
                </h3>
                <p className="text-xs text-slate-400">
                  This will remove the event from the catalog and user home feed.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
              <p className="text-sm font-black text-slate-900 dark:text-white">
                {eventToDelete.title}
              </p>
              <p className="text-xs text-slate-500">
                {eventToDelete.date || `${eventToDelete.startDate} - ${eventToDelete.endDate}`} • {eventToDelete.host}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setEventToDelete(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteEvent}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN EVENT PREVIEW MODAL */}
      {previewEvent && (
        <EventDetailsModal
          event={previewEvent}
          onClose={() => setPreviewEvent(null)}
        />
      )}
    </div>
  );
}
