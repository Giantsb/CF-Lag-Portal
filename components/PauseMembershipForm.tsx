
import React, { useState, useEffect } from 'react';
import { 
  XIcon, 
  CalendarIcon, 
  ClockIcon, 
  AlertCircleIcon, 
  CheckCircleIcon,
  PauseCircleIcon,
  InfoIcon
} from './Icons';
import { MemberData, PauseStatus } from '../types';
import { WOD_SCRIPT_URL } from '../constants';
import { differenceInDays, parseISO, isAfter, isBefore, startOfToday } from 'date-fns';

interface PauseMembershipFormProps {
  member: MemberData;
  onClose: () => void;
}

const REASONS = ['Travel', 'Medical', 'Work', 'Other'];

const PauseMembershipForm: React.FC<PauseMembershipFormProps> = ({ member, onClose }) => {
  const [status, setStatus] = useState<PauseStatus>('None');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    start: '',
    end: '',
    reason: 'Travel'
  });

  const today = startOfToday();
  const expDate = parseISO(member.expirationDate);
  const diffDays = differenceInDays(expDate, today);
  const isRestricted = diffDays <= 7;

  useEffect(() => {
    const fetchStatus = async () => {
      if (!WOD_SCRIPT_URL) return;
      try {
        const phone = member.phone.replace(/[\s\-\(\)]/g, '');
        const response = await fetch(`${WOD_SCRIPT_URL}?mode=pauseStatus&userId=${phone}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setStatus(result.status);
          }
        }
      } catch (err) {
        console.error('Failed to fetch pause status:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [member.phone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRestricted) return;

    if (!formData.start || !formData.end) {
      setError('Please select both start and end dates.');
      return;
    }

    const startDate = parseISO(formData.start);
    const endDate = parseISO(formData.end);

    if (isBefore(startDate, today)) {
      setError('Start date cannot be in the past.');
      return;
    }

    if (isBefore(endDate, startDate)) {
      setError('End date must be after the start date.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const phone = member.phone.replace(/[\s\-\(\)]/g, '');
      const response = await fetch(WOD_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          mode: 'pauseRequest',
          userId: phone,
          name: `${member.firstName} ${member.lastName}`,
          start: formData.start,
          end: formData.end,
          reason: formData.reason
        })
      });

      const result = await response.json();
      if (result.success) {
        setSuccess(true);
        setStatus('Pending');
      } else {
        setError(result.message || 'Failed to submit request.');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="w-10 h-10 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin mb-4" />
        <p className="text-brand-textSecondary text-sm font-bold">Checking Status...</p>
      </div>
    );
  }

  return (
    <div className="animate-scaleIn">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-accent/10 rounded-xl text-brand-accent">
            <PauseCircleIcon className="w-6 h-6" />
          </div>
          <h3 className="font-black text-xl tracking-tight">Pause Membership</h3>
        </div>
        <button onClick={onClose} className="p-2 bg-brand-surface rounded-full hover:text-brand-accent transition-colors">
          <XIcon className="w-5 h-5" />
        </button>
      </div>

      {status === 'Approved' ? (
        <div className="bg-brand-success/10 border border-brand-success/30 p-8 rounded-3xl text-center space-y-4">
          <div className="w-16 h-16 bg-brand-success/20 rounded-full flex items-center justify-center mx-auto text-brand-success">
            <CheckCircleIcon className="w-10 h-10" />
          </div>
          <h4 className="text-brand-success font-black text-xl">Request Approved</h4>
          <p className="text-brand-textSecondary text-sm leading-relaxed">
            Your membership pause has been approved and your expiration date has been updated on your dashboard.
          </p>
          <button onClick={onClose} className="w-full bg-brand-success text-white font-bold py-3 rounded-2xl">
            Great, thanks!
          </button>
        </div>
      ) : status === 'Pending' ? (
        <div className="bg-brand-accent/5 border border-brand-accent/20 p-8 rounded-3xl text-center space-y-4">
          <div className="w-16 h-16 bg-brand-accent/10 rounded-full flex items-center justify-center mx-auto text-brand-accent animate-pulse">
            <ClockIcon className="w-10 h-10" />
          </div>
          <h4 className="text-brand-accent font-black text-xl tracking-tight uppercase">Request Under Review</h4>
          <p className="text-brand-textSecondary text-sm leading-relaxed">
            We've received your pause request! Our team is currently reviewing it. You'll see the update here once processed.
          </p>
          <div className="pt-4">
            <button onClick={onClose} className="text-brand-textSecondary text-xs font-black uppercase tracking-widest hover:text-brand-textPrimary transition-colors">
              Close Window
            </button>
          </div>
        </div>
      ) : (
        <>
          {isRestricted ? (
            <div className="bg-brand-danger/10 border border-brand-danger/20 p-6 rounded-2xl mb-6 flex gap-4">
              <AlertCircleIcon className="w-6 h-6 text-brand-danger shrink-0" />
              <div>
                <p className="text-brand-danger font-bold text-sm">Requests Unavailable</p>
                <p className="text-brand-textSecondary text-xs mt-1">
                  Pause requests cannot be submitted within 7 days of your membership expiry ({member.expirationDate}).
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-brand-surface border border-brand-border p-4 rounded-2xl mb-6 flex gap-3 items-start">
               <InfoIcon className="w-5 h-5 text-brand-accent shrink-0 mt-0.5" />
               <p className="text-[11px] text-brand-textSecondary leading-relaxed font-medium">
                 Submitting this form does not instantly pause your membership. Our staff will review your request according to the gym policy.
               </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className={`space-y-4 ${isRestricted ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-brand-textSecondary uppercase tracking-widest mb-2 ml-1">
                  Start Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={formData.start}
                    onChange={(e) => setFormData({ ...formData, start: e.target.value })}
                    className="w-full bg-brand-input border border-brand-border rounded-xl px-4 py-3 text-sm text-brand-textPrimary focus:ring-2 focus:ring-brand-accent outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-brand-textSecondary uppercase tracking-widest mb-2 ml-1">
                  End Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={formData.end}
                    onChange={(e) => setFormData({ ...formData, end: e.target.value })}
                    className="w-full bg-brand-input border border-brand-border rounded-xl px-4 py-3 text-sm text-brand-textPrimary focus:ring-2 focus:ring-brand-accent outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-brand-textSecondary uppercase tracking-widest mb-2 ml-1">
                Reason for Pause
              </label>
              <select
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full bg-brand-input border border-brand-border rounded-xl px-4 py-3 text-sm text-brand-textPrimary focus:ring-2 focus:ring-brand-accent outline-none appearance-none transition-all"
              >
                {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {error && (
              <p className="text-brand-danger text-xs font-bold text-center bg-brand-danger/10 py-2 rounded-lg border border-brand-danger/20">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || isRestricted}
              className="w-full bg-brand-accent text-brand-accentText font-black py-4 rounded-2xl hover:bg-brand-accentHover transition-all shadow-lg shadow-brand-accent/20 disabled:opacity-50 active:scale-[0.98] mt-2"
            >
              {submitting ? 'SUBMITTING...' : 'SUBMIT PAUSE REQUEST'}
            </button>
          </form>
        </>
      )}
    </div>
  );
};

export default PauseMembershipForm;
