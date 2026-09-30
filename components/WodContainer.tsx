
import React, { useState, useEffect, useCallback } from 'react';
import { 
  DumbbellIcon, 
  CalendarIcon, 
  HistoryIcon, 
  ChevronDownIcon, 
  ChevronUpIcon,
  QuoteIcon,
  ClockIcon,
  RefreshIcon,
  WifiOffIcon
} from './Icons';
import { WodEntry } from '../types';
import { WOD_SCRIPT_URL } from '../constants';
import FitnessLoader from './FitnessLoader';
import { 
  getCachedWodToday, 
  setCachedWodToday, 
  getCachedWodHistory, 
  setCachedWodHistory, 
  formatTimeAgo,
  isCacheExpired
} from '../utils/cache';

type WodMode = 'today' | 'history';

const WodContainer: React.FC = () => {
  const [mode, setMode] = useState<WodMode>('today');
  const [todayData, setTodayData] = useState<WodEntry | null>(null);
  const [historyData, setHistoryData] = useState<WodEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cacheTimestamp, setCacheTimestamp] = useState<number | null>(null);
  const [networkNotice, setNetworkNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRestDay, setIsRestDay] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const fetchData = useCallback(async (targetMode: WodMode, forceRefresh = false) => {
    if (!WOD_SCRIPT_URL) {
      setError("WOD service URL is not configured.");
      return;
    }

    // 1. Check localStorage and evaluate expiration (ExpiresAt / 24 hours)
    let hasValidCache = false;
    let expiredFallback: { entry?: WodEntry | null; isRestDay?: boolean; history?: WodEntry[]; timestamp: number } | null = null;

    if (targetMode === 'today') {
      const cached = getCachedWodToday();
      if (cached) {
        const expired = isCacheExpired(cached);
        if (!expired && !forceRefresh) {
          hasValidCache = true;
          setTodayData(cached.data.entry);
          setIsRestDay(cached.data.isRestDay);
          setCacheTimestamp(cached.timestamp);
        } else if (expired) {
          console.log('[WodContainer] Cached today WOD is older than 24h. Performing fresh fetch on load...');
          expiredFallback = {
            entry: cached.data.entry,
            isRestDay: cached.data.isRestDay,
            timestamp: cached.timestamp
          };
        }
      }
    } else {
      const cached = getCachedWodHistory();
      if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
        const expired = isCacheExpired(cached);
        if (!expired && !forceRefresh) {
          hasValidCache = true;
          setHistoryData(cached.data);
          setCacheTimestamp(cached.timestamp);
        } else if (expired) {
          console.log('[WodContainer] Cached history is older than 24h. Performing fresh fetch on load...');
          expiredFallback = {
            history: cached.data,
            timestamp: cached.timestamp
          };
        }
      }
    }

    if (hasValidCache) {
      // Valid cache (< 24 hours old): Display immediately and refresh in background
      setLoading(false);
      setIsRefreshing(true);
      setError(null);
    } else {
      // Data is missing, explicitly forced, or older than 24 hours:
      // Perform a fresh fetch regardless of network state upon next load
      setLoading(true);
      setIsRefreshing(false);
      setError(null);
      setIsRestDay(false);
    }

    // 2. Fresh Network Fetch
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch(`${WOD_SCRIPT_URL}?mode=${targetMode}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error("Failed to fetch WOD data");
      
      const result = await response.json();
      const now = Date.now();

      if (result.success) {
        if (targetMode === 'today') {
          setTodayData(result.data);
          setIsRestDay(false);
          setCachedWodToday(result.data, false);
        } else {
          setHistoryData(result.data || []);
          setCachedWodHistory(result.data || []);
        }
        setCacheTimestamp(now);
        setNetworkNotice(null);
        setError(null);
      } else {
        // Handle "No WOD found" as a rest day rather than a technical error
        if (targetMode === 'today' && result.message?.includes('No WOD found')) {
          setTodayData(null);
          setIsRestDay(true);
          setCachedWodToday(null, true);
          setCacheTimestamp(now);
          setNetworkNotice(null);
          setError(null);
        } else {
          if (!hasValidCache) {
            if (expiredFallback) {
              if (targetMode === 'today') {
                setTodayData(expiredFallback.entry || null);
                setIsRestDay(Boolean(expiredFallback.isRestDay));
              } else {
                setHistoryData(expiredFallback.history || []);
              }
              setCacheTimestamp(expiredFallback.timestamp);
              setNetworkNotice("Workout update unavailable. Displaying older cached version.");
            } else {
              setError(result.error || result.message || "No WOD data available at the moment.");
            }
          } else {
            setNetworkNotice("Latest workout update unavailable. Showing saved version.");
          }
        }
      }
    } catch (err: any) {
      console.warn(`[WodContainer] Network fetch failed for ${targetMode}:`, err.message);
      if (hasValidCache) {
        setNetworkNotice("Network slow or unavailable. Displaying cached workout.");
      } else if (expiredFallback) {
        // Cache expired (> 24h) and network was unavailable: fall back with explicit outdated notice
        if (targetMode === 'today') {
          setTodayData(expiredFallback.entry || null);
          setIsRestDay(Boolean(expiredFallback.isRestDay));
        } else {
          setHistoryData(expiredFallback.history || []);
        }
        setCacheTimestamp(expiredFallback.timestamp);
        setNetworkNotice("Workout data is older than 24 hours and could not be refreshed. Please check your internet connection.");
      } else {
        setError("Unable to connect to workout service. Please check your connection.");
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(mode);
  }, [mode, fetchData]);

  const toggleAccordion = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const renderToday = () => {
    if (loading) return <FitnessLoader type="random" label="Loading Today's Workout..." sublabel="CROSSFIT LAGOS" />;
    if (error && !todayData && !isRestDay) return <ErrorView message={error} onRetry={() => fetchData('today', true)} />;
    if (isRestDay || !todayData) return <RestDayView />;

    return (
      <div className="animate-fadeIn space-y-6">
        <div className="bg-brand-dark border border-brand-border rounded-2xl overflow-hidden shadow-xl">
           <div className="bg-brand-accent p-6 flex justify-between items-center">
              <div>
                <p className="text-brand-accentText/70 text-xs font-bold uppercase tracking-widest mb-1">Workout of the Day</p>
                <h3 className="text-2xl font-black text-brand-accentText">{todayData.date}</h3>
              </div>
              <DumbbellIcon className="w-10 h-10 text-brand-accentText/30" />
           </div>
           
           <div className="p-6 md:p-8">
              <div className="prose prose-invert max-w-none">
                <p className="whitespace-pre-wrap font-mono text-lg leading-relaxed text-brand-textPrimary">
                  {todayData.workout}
                </p>
              </div>

              {todayData.coach_notes && (
                <div className="mt-8 bg-brand-accent/5 border-l-4 border-brand-accent p-5 rounded-r-xl relative overflow-hidden group">
                  <QuoteIcon className="absolute -top-2 -right-2 w-16 h-16 text-brand-accent/10 transition-transform group-hover:scale-110" />
                  <h4 className="flex items-center gap-2 text-brand-accent font-bold text-sm uppercase tracking-wider mb-2">
                    <ClockIcon className="w-4 h-4" /> Coach's Tips
                  </h4>
                  <p className="text-brand-textSecondary text-sm italic leading-relaxed relative z-10">
                    {todayData.coach_notes}
                  </p>
                </div>
              )}
           </div>
        </div>
      </div>
    );
  };

  const renderHistory = () => {
    if (loading) return <FitnessLoader type="random" label="Loading Workout History..." sublabel="CROSSFIT LAGOS" />;
    if (error && historyData.length === 0) return <ErrorView message={error} onRetry={() => fetchData('history', true)} />;
    if (historyData.length === 0) return <RestDayView title="No History Found" />;

    return (
      <div className="animate-fadeIn space-y-3">
        {historyData.map((entry, index) => (
          <div key={index} className="bg-brand-dark border border-brand-border rounded-xl overflow-hidden transition-all duration-300">
            <button 
              onClick={() => toggleAccordion(index)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-brand-surface transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-brand-accent/10 rounded-lg text-brand-accent">
                   <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                   <p className="text-xs text-brand-textSecondary font-bold uppercase tracking-tighter">{entry.date}</p>
                   <p className="text-brand-textPrimary font-bold">{entry.displayDate || "Workout Session"}</p>
                </div>
              </div>
              {expandedIndex === index ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
            </button>
            
            {expandedIndex === index && (
              <div className="px-4 pb-6 pt-2 animate-slideInDown border-t border-brand-border/50">
                 <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-brand-textSecondary mb-4">
                   {entry.workout}
                 </p>
                 {entry.coach_notes && (
                    <div className="bg-brand-accent/5 p-3 rounded-lg border-l-2 border-brand-accent">
                       <p className="text-xs italic text-brand-textSecondary">{entry.coach_notes}</p>
                    </div>
                 )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
         <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black text-brand-textPrimary tracking-tight">Whiteboard</h2>
              <button
                onClick={() => fetchData(mode, true)}
                disabled={isRefreshing || loading}
                title="Refresh workouts"
                className="p-1.5 rounded-lg bg-brand-surface text-brand-textSecondary hover:text-brand-textPrimary hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <RefreshIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-brand-accent' : ''}`} />
              </button>
            </div>
            
            {/* Cache status & background sync indicator */}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <p className="text-brand-textSecondary text-sm font-medium">Get Fit. Stay Strong.</p>
              {cacheTimestamp && (
                <>
                  <span className="text-brand-textSecondary/40 text-xs">•</span>
                  <span className="text-xs text-brand-textSecondary/80">
                    Saved {formatTimeAgo(cacheTimestamp)}
                  </span>
                </>
              )}
              {isRefreshing && (
                <span className="inline-flex items-center gap-1 text-xs text-brand-accent font-medium animate-pulse">
                  • Syncing...
                </span>
              )}
            </div>
         </div>
         
         <div className="flex bg-brand-dark p-1 rounded-xl border border-brand-border shadow-inner">
            <button 
              onClick={() => setMode('today')}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-all ${mode === 'today' ? 'bg-brand-accent text-brand-accentText shadow-lg' : 'text-brand-textSecondary hover:text-brand-textPrimary'}`}
            >
              <DumbbellIcon className="w-4 h-4" /> Today
            </button>
            <button 
              onClick={() => setMode('history')}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-all ${mode === 'history' ? 'bg-brand-accent text-brand-accentText shadow-lg' : 'text-brand-textSecondary hover:text-brand-textPrimary'}`}
            >
              <HistoryIcon className="w-4 h-4" /> History
            </button>
         </div>
      </header>

      {/* Network / Offline Notice banner if displaying cached content during network trouble */}
      {networkNotice && (
        <div className="mb-6 p-3 px-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300 animate-fadeIn">
          <div className="flex items-center gap-2">
            <WifiOffIcon className="w-4 h-4 flex-shrink-0 text-amber-400" />
            <span>{networkNotice}</span>
          </div>
          <button 
            onClick={() => fetchData(mode, true)}
            className="font-bold underline hover:text-white ml-2 flex-shrink-0"
          >
            Retry Sync
          </button>
        </div>
      )}

      {mode === 'today' ? renderToday() : renderHistory()}
    </div>
  );
};

// Sub-components
const ErrorView = ({ message, onRetry }: { message: string, onRetry: () => void }) => (
  <div className="text-center py-12 px-6 bg-brand-danger/5 border border-brand-danger/20 rounded-2xl">
    <p className="text-brand-danger font-bold mb-4">{message}</p>
    <button onClick={onRetry} className="px-6 py-2 bg-brand-danger text-white rounded-lg font-bold text-sm hover:bg-brand-danger/80 transition-colors">
      Try Again
    </button>
  </div>
);

const RestDayView = ({ title = "Enjoy Your Rest Day!" }) => (
  <div className="text-center py-16 px-6 bg-brand-dark border border-brand-border rounded-2xl border-dashed">
    <div className="p-5 bg-brand-surface rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 text-brand-textSecondary/20">
      <DumbbellIcon className="w-10 h-10" />
    </div>
    <h3 className="text-xl font-bold text-brand-textPrimary mb-2">{title}</h3>
    <p className="text-brand-textSecondary text-sm max-w-xs mx-auto">
      No WOD found for today. Confirm with the class timetable before taking a rest day.
    </p>
  </div>
);

export default WodContainer;

