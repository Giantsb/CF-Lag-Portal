
import React, { useState, useEffect } from 'react';
import { 
  BellIcon, 
  AlertCircleIcon, 
  InfoIcon, 
  XIcon 
} from './Icons';
import { Announcement } from '../types';
import { WOD_SCRIPT_URL } from '../constants';

const GymAnnouncements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedTitles, setDismissedTitles] = useState<string[]>([]);

  useEffect(() => {
    // Load dismissed titles from localStorage
    const savedDismissed = localStorage.getItem('gym_dismissed_announcements');
    if (savedDismissed) {
      setDismissedTitles(JSON.parse(savedDismissed));
    }

    const fetchAnnouncements = async () => {
      if (!WOD_SCRIPT_URL) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${WOD_SCRIPT_URL}?mode=announcements`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && Array.isArray(result.data)) {
            setAnnouncements(result.data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch announcements:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  const handleDismiss = (title: string) => {
    const updatedDismissed = [...dismissedTitles, title];
    setDismissedTitles(updatedDismissed);
    localStorage.setItem('gym_dismissed_announcements', JSON.stringify(updatedDismissed));
  };

  const activeAnnouncements = announcements.filter(
    a => a.type === 'urgent' || !dismissedTitles.includes(a.title)
  );

  if (loading || activeAnnouncements.length === 0) return null;

  return (
    <div className="space-y-4 mb-6">
      {activeAnnouncements.map((announcement, index) => {
        const isUrgent = announcement.type === 'urgent';
        const isWarning = announcement.type === 'warning';
        
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

        return (
          <div 
            key={index}
            className={`relative p-5 rounded-2xl border ${borderColor} ${bgColor} ${textColor} animate-slideInDown transition-all overflow-hidden group`}
          >
            {/* Urgent background accent */}
            {isUrgent && (
              <div className="absolute top-0 right-0 p-1 opacity-20 transform translate-x-1/4 -translate-y-1/4">
                <AlertCircleIcon className="w-24 h-24" />
              </div>
            )}

            <div className="flex gap-4 relative z-10">
              <div className={`shrink-0 p-2 rounded-xl ${isUrgent ? 'bg-white/20' : 'bg-brand-surface'} ${isUrgent ? 'animate-pulse' : ''}`}>
                <Icon className={`w-6 h-6 ${iconColor}`} />
              </div>

              <div className="flex-1 pr-6">
                <h4 className={`font-black uppercase tracking-tight mb-1 ${isUrgent ? 'text-white' : 'text-brand-textPrimary'}`}>
                  {announcement.title}
                </h4>
                <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isUrgent ? 'text-white/90 font-medium' : 'text-brand-textSecondary'}`}>
                  {announcement.message}
                </p>
                {announcement.datePosted && (
                  <p className={`text-[10px] mt-3 uppercase tracking-widest font-bold opacity-60`}>
                    Posted: {announcement.datePosted}
                  </p>
                )}
              </div>

              {!isUrgent && (
                <button 
                  onClick={() => handleDismiss(announcement.title)}
                  className="absolute top-0 right-0 p-2 text-brand-textSecondary hover:text-brand-textPrimary transition-colors"
                >
                  <XIcon className="w-5 h-5" />
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
