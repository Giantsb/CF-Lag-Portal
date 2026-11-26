
import React, { useState, useEffect } from 'react';
import { 
  BellIcon, 
  AlertCircleIcon, 
  InfoIcon, 
  XIcon,
  WhatsAppIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from './Icons';
import { Announcement } from '../types';
import { WOD_SCRIPT_URL } from '../constants';
import { getCachedAnnouncements, setCachedAnnouncements } from '../utils/cache';

// Converts a phone string to international WhatsApp format (e.g. 07059969059 -> 2347059969059)
const toWhatsAppNumber = (rawPhone: string): string => {
  let cleaned = rawPhone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('234') && cleaned.length >= 13) {
    return cleaned;
  }
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return '234' + cleaned.substring(1);
  }
  if (cleaned.length === 10 && !cleaned.startsWith('234')) {
    return '234' + cleaned;
  }
  return cleaned;
};

// Extracts primary WhatsApp URL and button label from announcement message if present
const extractWhatsAppAction = (text: string): { url: string; label: string } | null => {
  if (!text) return null;

  // 1. Look for markdown WhatsApp link first so custom label is preserved
  const mdMatch = text.match(/\[([^\]]+)\]\(([^)]*(?:wa\.me|whatsapp)[^)]*)\)/i);
  if (mdMatch) {
    let url = mdMatch[2].trim();
    if (url.startsWith('wa.me/')) url = 'https://' + url;
    return { url, label: mdMatch[1].trim() || 'Chat on WhatsApp' };
  }

  // 2. Look for explicit wa.me or whatsapp link
  const urlMatch = text.match(/(?:https?:\/\/wa\.me\/[^\s]+|wa\.me\/[^\s]+|https?:\/\/(?:api|web)\.whatsapp\.com\/[^\s]+)/i);
  if (urlMatch) {
    let url = urlMatch[0];
    if (url.startsWith('wa.me/')) url = 'https://' + url;
    url = url.replace(/[.,;!?)]+$/, '');
    return { url, label: 'Chat on WhatsApp' };
  }

  // 3. Look for Nigerian phone number
  const phoneMatch = text.match(/(?:\+?234[\s.-]?)?0?[789][01]\d(?:[\s.-]?\d{3,4}){2}/i);
  if (phoneMatch) {
    const rawNumber = phoneMatch[0].trim();
    const waNumber = toWhatsAppNumber(rawNumber);
    return {
      url: `https://wa.me/${waNumber}`,
      label: `Chat on WhatsApp (${rawNumber})`
    };
  }

  return null;
};

// Checks whether an announcement's expiryDate is strictly in the past
const isAnnouncementExpired = (expiryDate?: string): boolean => {
  if (!expiryDate) return false;
  const trimmed = String(expiryDate).trim();
  if (!trimmed || trimmed.toUpperCase() === 'N/A') return false;

  // For date-only strings (e.g. YYYY-MM-DD), allow visibility through end of that local day
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    const endOfDay = new Date(y, m - 1, d, 23, 59, 59, 999);
    return Date.now() > endOfDay.getTime();
  }

  const parsedMs = Date.parse(trimmed);
  if (Number.isNaN(parsedMs)) return false;
  return Date.now() > parsedMs;
};

const safeParseStringArray = (raw: string | null): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
};

// Renders announcement message with clickable links and WhatsApp phone numbers
const renderFormattedMessage = (text: string, isUrgent: boolean): React.ReactNode => {
  if (!text) return null;

  const COMBINED_REGEX = /(\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s]+|wa\.me\/[^\s]+|(?:\+?234[\s.-]?)?0?[789][01]\d(?:[\s.-]?\d{3,4}){2})/gi;
  const parts = text.split(COMBINED_REGEX);

  return parts.map((part, idx) => {
    if (!part) return null;

    // Check for markdown link [Label](url)
    const isMarkdown = part.startsWith('[') && part.includes('](') && part.endsWith(')');
    if (isMarkdown) {
      const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (match) {
        const label = match[1];
        let url = match[2];
        if (url.startsWith('wa.me/')) url = 'https://' + url;
        const isWa = url.includes('wa.me') || url.includes('whatsapp.com');
        return (
          <a
            key={idx}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 font-bold underline decoration-2 underline-offset-2 transition-colors ${
              isUrgent
                ? 'text-white hover:text-white/80'
                : isWa
                  ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300'
                  : 'text-brand-accent hover:underline'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {isWa && <WhatsAppIcon className="w-3.5 h-3.5 inline shrink-0" />}
            <span>{label}</span>
          </a>
        );
      }
    }

    // Check for raw URLs
    if (part.startsWith('http://') || part.startsWith('https://') || part.startsWith('wa.me/')) {
      let url = part;
      if (url.startsWith('wa.me/')) url = 'https://' + url;
      // Strip trailing punctuation
      url = url.replace(/[.,;!?)]+$/, '');
      const isWa = url.includes('wa.me') || url.includes('whatsapp.com');
      return (
        <a
          key={idx}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1 font-bold underline decoration-2 underline-offset-2 transition-colors ${
            isUrgent
              ? 'text-white hover:text-white/80'
              : isWa
                ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300'
                : 'text-brand-accent hover:underline'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {isWa && <WhatsAppIcon className="w-3.5 h-3.5 inline shrink-0" />}
          <span>{part}</span>
        </a>
      );
    }

    // Check for phone number
    const isPhone = /^(?:\+?234[\s.-]?)?0?[789][01]\d(?:[\s.-]?\d{3,4}){2}$/i.test(part.trim());
    if (isPhone) {
      const waNumber = toWhatsAppNumber(part.trim());
      const waUrl = `https://wa.me/${waNumber}`;
      return (
        <a
          key={idx}
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1 font-bold underline decoration-2 underline-offset-2 transition-all ${
            isUrgent
              ? 'text-white hover:text-white/80 bg-white/20 px-1.5 py-0.5 rounded'
              : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-600/25 dark:border-emerald-500/20 hover:border-emerald-500/40'
          }`}
          title="Open in WhatsApp"
          onClick={(e) => e.stopPropagation()}
        >
          <WhatsAppIcon className="w-3.5 h-3.5 inline shrink-0" />
          <span>{part}</span>
        </a>
      );
    }

    return <span key={idx}>{part}</span>;
  });
};

interface GymAnnouncementsProps {
  portalType?: 'member' | 'hmo';
  isHmo?: boolean;
  onHasAnnouncementsChange?: (hasLive: boolean) => void;
  className?: string;
}

const GymAnnouncements: React.FC<GymAnnouncementsProps> = ({
  portalType,
  isHmo,
  onHasAnnouncementsChange,
  className,
}) => {
  const cached = getCachedAnnouncements();
  const [announcements, setAnnouncements] = useState<Announcement[]>(
    Array.isArray(cached?.data) ? cached.data : []
  );
  const [loading, setLoading] = useState(!cached);
  const [dismissedTitles, setDismissedTitles] = useState<string[]>(() =>
    safeParseStringArray(localStorage.getItem('gym_dismissed_announcements'))
  );
  const [seenTitles, setSeenTitles] = useState<string[]>(() =>
    safeParseStringArray(localStorage.getItem('gym_seen_announcements'))
  );
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  // Determine user portal status
  let userIsHmo = isHmo;
  if (userIsHmo === undefined) {
    if (portalType) {
      userIsHmo = portalType === 'hmo';
    } else {
      try {
        const session = localStorage.getItem('hoa_session');
        if (session) {
          const parsed = JSON.parse(session);
          userIsHmo = parsed.portalType === 'hmo';
        }
      } catch {
        userIsHmo = false;
      }
    }
  }

  useEffect(() => {
    let isMounted = true;
    let seenTimer: number | undefined;

    const fetchAnnouncements = async () => {
      if (!WOD_SCRIPT_URL) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const url = `${WOD_SCRIPT_URL}?mode=announcements`;
        const response = await fetch(url);

        if (response.ok) {
          const result = await response.json();
          const dataList: Announcement[] | null = Array.isArray(result?.data?.announcements)
            ? result.data.announcements
            : Array.isArray(result?.announcements)
              ? result.announcements
              : null;

          if (result?.success && dataList && isMounted) {
            setAnnouncements(dataList);
            setCachedAnnouncements(dataList);

            // Mark displayed announcements as "seen" after 5 seconds
            seenTimer = window.setTimeout(() => {
              if (!isMounted) return;
              const allIds = dataList
                .map((a: Announcement) => (a.title || a.message || '').trim())
                .filter((id): id is string => Boolean(id));
              const currentSeen = safeParseStringArray(localStorage.getItem('gym_seen_announcements'));
              const updatedSeen = Array.from(new Set([...currentSeen, ...allIds]));
              setSeenTitles(updatedSeen);
              try {
                localStorage.setItem('gym_seen_announcements', JSON.stringify(updatedSeen));
              } catch {
                // Ignore storage quota errors
              }
            }, 5000);
          }
        }
      } catch (err) {
        console.error('[Announcements] Fetch failed:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAnnouncements();

    return () => {
      isMounted = false;
      if (seenTimer !== undefined) {
        window.clearTimeout(seenTimer);
      }
    };
  }, []);

  const handleDismiss = (title: string) => {
    const updatedDismissed = Array.from(new Set([...dismissedTitles, title]));
    setDismissedTitles(updatedDismissed);
    try {
      localStorage.setItem('gym_dismissed_announcements', JSON.stringify(updatedDismissed));
    } catch {
      // Ignore storage quota errors
    }
  };

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const activeAnnouncements = announcements.filter((a) => {
    if (!a || (!a.title && !a.message)) return false;

    // 1. Expiry filtering (prevents stale cached items from lingering past expiryDate)
    if (isAnnouncementExpired(a.expiryDate)) return false;

    // 2. Audience filtering
    const targetAudience = (a.audience || 'ALL').toString().trim().toUpperCase();
    if (targetAudience && targetAudience !== 'ALL') {
      const isHmoTarget = targetAudience === 'HMO' || targetAudience === 'HMOS';
      const isMemberTarget = targetAudience === 'MEMBER' || targetAudience === 'MEMBERS';
      if (userIsHmo && !isHmoTarget) return false;
      if (!userIsHmo && isHmoTarget) return false;
      if (userIsHmo && isMemberTarget) return false;
    }

    // 3. Dismissal filtering (urgent announcements stay pinned)
    const normalizedType = (a.type || 'info').toString().trim().toLowerCase();
    const announcementId = (a.title || a.message || '').trim();
    return normalizedType === 'urgent' || !dismissedTitles.includes(announcementId);
  });

  const hasLive = !loading && activeAnnouncements.length > 0;

  useEffect(() => {
    onHasAnnouncementsChange?.(hasLive);
  }, [hasLive, onHasAnnouncementsChange]);

  if (!hasLive) {
    return null;
  }

  return (
    <div className={className || 'space-y-4 animate-fadeIn'}>
      {activeAnnouncements.map((announcement, index) => {
        const normalizedType = (announcement.type || 'info').toString().trim().toLowerCase();
        const isUrgent = normalizedType === 'urgent';
        const isWarning = normalizedType === 'warning';
        const announcementId = (announcement.title || announcement.message || '').trim();
        // Logic: Show NEW if backend says isNew AND user hasn't seen it in a previous session
        const showNewBadge = Boolean(announcement.isNew) && !seenTitles.includes(announcementId);
        const whatsAppAction = extractWhatsAppAction(announcement.message);

        let bgColor = 'bg-brand-dark';
        let borderColor = 'border-brand-border';
        let textColor = 'text-brand-textPrimary';
        let iconColor = 'text-brand-accent';
        let Icon = InfoIcon;

        if (isUrgent) {
          bgColor = 'bg-brand-danger';
          borderColor = 'border-brand-danger shadow-lg shadow-brand-danger/20';
          textColor = 'text-white';
          iconColor = 'text-white';
          Icon = AlertCircleIcon;
        } else if (isWarning) {
          bgColor = 'bg-amber-500/10';
          borderColor = 'border-amber-500/30';
          textColor = 'text-brand-textPrimary';
          iconColor = 'text-amber-500';
          Icon = BellIcon;
        }

        const glowClass = isUrgent
          ? 'announcement-glow-urgent'
          : isWarning
            ? 'announcement-glow-warning'
            : 'announcement-glow-info';

        const itemKey = `${announcement.title || 'announcement'}-${index}`;
        const messageText = (announcement.message || '').trim();
        const lineCount = messageText.split(/\r?\n/).length;
        const isLongMessage = messageText.length > 90 || lineCount > 3;
        const isExpanded = Boolean(expandedKeys[itemKey]);

        return (
          <div
            key={itemKey}
            className={`relative p-5 rounded-3xl border ${borderColor} ${bgColor} ${textColor} ${glowClass} animate-announcement-card transition-all overflow-hidden group flex-1 flex flex-col justify-center`}
          >
            {isUrgent && (
              <div className="absolute top-0 right-0 p-1 opacity-10 transform translate-x-1/4 -translate-y-1/4 pointer-events-none">
                <AlertCircleIcon className="w-24 h-24" />
              </div>
            )}

            <div className="flex gap-3.5 relative z-10">
              <div className={`shrink-0 p-2 rounded-xl self-start ${isUrgent ? 'bg-white/20 animate-pulse' : 'bg-brand-surface'}`}>
                <Icon className={`w-6 h-6 ${iconColor}`} />
              </div>

              <div className="flex-1 pr-8 min-w-0">
                <div className="flex items-center flex-wrap gap-2 mb-1">
                  <h4 className={`font-black uppercase tracking-tight leading-snug ${isUrgent ? 'text-white' : 'text-brand-textPrimary'}`}>
                    {announcement.title}
                  </h4>
                  {showNewBadge && (
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${isUrgent ? 'bg-white text-brand-danger' : 'bg-brand-accent text-brand-accentText'}`}>
                      NEW
                    </span>
                  )}
                </div>
                <div
                  className={`text-sm leading-relaxed whitespace-pre-wrap break-words transition-all ${
                    isUrgent ? 'text-white/90 font-medium' : 'text-brand-textSecondary'
                  } ${isLongMessage && !isExpanded ? 'line-clamp-3' : ''}`}
                >
                  {renderFormattedMessage(announcement.message, isUrgent)}
                </div>

                {isLongMessage && (
                  <button
                    type="button"
                    onClick={() => toggleExpand(itemKey)}
                    aria-expanded={isExpanded}
                    className={`mt-2 inline-flex items-center gap-1 text-xs font-bold transition-colors ${
                      isUrgent
                        ? 'text-white hover:text-white/80'
                        : 'text-brand-accent hover:text-brand-accentHover'
                    }`}
                  >
                    <span>{isExpanded ? 'Show less' : 'Read more'}</span>
                    {isExpanded ? (
                      <ChevronUpIcon className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDownIcon className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}

                {whatsAppAction && (
                  <div className="mt-3 flex items-center">
                    <a
                      href={whatsAppAction.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 ${
                        isUrgent
                          ? 'bg-white text-brand-danger hover:bg-neutral-100 shadow-white/20'
                          : 'bg-[#25D366] hover:bg-[#20ba59] text-white shadow-[#25D366]/20'
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <WhatsAppIcon className="w-4 h-4 shrink-0" />
                      <span>{whatsAppAction.label}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                    </a>
                  </div>
                )}
              </div>

              {!isUrgent && (
                <button
                  type="button"
                  onClick={() => handleDismiss(announcementId)}
                  className="absolute -top-1 -right-1 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-brand-textSecondary hover:text-brand-textPrimary hover:bg-brand-surface transition-colors"
                  aria-label="Dismiss announcement"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GymAnnouncements;
