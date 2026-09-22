import React from 'react';
import { PlatformEventItem, PLATFORM_EVENT_CATEGORIES } from '../../types';
import {
  Calendar,
  Clock,
  Trophy,
  Users,
  Building2,
  X,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Compass,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { resolveEventChannel } from '../../utils/eventNavigation';

interface EventDetailsModalProps {
  event: PlatformEventItem;
  onClose: () => void;
}

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({ event, onClose }) => {
  const { navigateToEventChannel } = useApp();

  const categoryMeta = PLATFORM_EVENT_CATEGORIES.find((c) => c.id === event.category);
  const categoryLabel = categoryMeta?.label || event.categoryLabel || event.category;
  const channelInfo = resolveEventChannel(event);

  const handleActionClick = () => {
    onClose();
    if (navigateToEventChannel) {
      navigateToEventChannel(event);
    }
  };

  const getActionTitle = () => {
    return channelInfo.actionText;
  };

  const isPublished = event.status === 'Published';
  const hasPrize = Boolean(event.prizeReward && event.prizeReward.trim() !== '' && event.prizeReward.trim() !== '0');

  // Format date range nicely
  const formatDateRange = () => {
    if (event.startDate && event.endDate) {
      if (event.startDate === event.endDate) return event.startDate;
      return `${event.startDate} — ${event.endDate}`;
    }
    return event.date || 'Scheduled Platform Event';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div
        id="event-details-modal"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Cover Hero Banner */}
        <div className="relative h-52 sm:h-64 w-full bg-slate-950 overflow-hidden">
          <img
            src={event.imageUrl || event.image || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80'}
            alt={event.title}
            className="w-full h-full object-cover opacity-85"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

          {/* Close Button */}
          <button
            id="close-event-modal-btn"
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white backdrop-blur-md flex items-center justify-center transition border border-white/10 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Category & Status Badges */}
          <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-900/90 text-white backdrop-blur-md border border-blue-400/30 shadow-md">
              {categoryLabel}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border ${
                isPublished
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
              }`}
            >
              {isPublished ? 'Live & Active' : event.status}
            </span>
          </div>

          {/* Title on Hero Bottom */}
          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-md">
              {event.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium flex items-center gap-1.5 mt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Hosted by <strong className="text-white">{event.host || 'Global Academic Directorate'}</strong></span>
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 text-slate-900 dark:text-white max-h-[calc(85vh-16rem)] overflow-y-auto">
          {/* Key Facts / Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-900 dark:text-blue-400" /> Date Window
              </span>
              <p className="font-extrabold text-slate-900 dark:text-white text-xs">{formatDateRange()}</p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-900 dark:text-blue-400" /> Time
              </span>
              <p className="font-extrabold text-slate-900 dark:text-white text-xs">{event.eventTime || event.time || '18:00 UTC'}</p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Audience
              </span>
              <p className="font-extrabold text-slate-900 dark:text-white text-xs">All Registered Users</p>
            </div>

            {/* Target Channel Destination */}
            <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 space-y-1 col-span-2 sm:col-span-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider block">
                    Target Channel Destination
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-xs">
                    {channelInfo.label}
                  </span>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${channelInfo.badgeClass}`}>
                Direct Route
              </span>
            </div>
          </div>

          {/* Prize Pool Section - Completely omitted if empty */}
          {hasPrize && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Official Competition Reward
                  </span>
                  <h4 className="text-base font-black text-amber-700 dark:text-amber-300">
                    {event.prizeReward}
                  </h4>
                </div>
              </div>
              <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
            </div>
          )}

          {/* Description / Event Details */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Event Details & Guidelines
            </h4>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-2 whitespace-pre-line font-medium">
              {event.description ||
                'Official inter-institutional platform competition organized and monitored by the Global Academic Directorate. Check the corresponding arena for rules and match schedules.'}
            </div>
          </div>

          {/* Institutional Host Verification */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <strong className="block text-slate-900 dark:text-white font-bold">{event.host || 'Global Academic Directorate'}</strong>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Official Directorate of Grobaax Academic Systems</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Verified
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            id="modal-dismiss-btn"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Close
          </button>

          <button
            id="modal-enter-arena-btn"
            onClick={handleActionClick}
            className="px-6 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-blue-950/30 transition cursor-pointer"
          >
            <span>{getActionTitle()}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
