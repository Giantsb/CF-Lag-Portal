
import React, { useState, useEffect } from 'react';
import { 
  DumbbellIcon, 
  CalendarIcon, 
  HistoryIcon, 
  ChevronDownIcon, 
  ChevronUpIcon,
  QuoteIcon,
  ClockIcon
} from './Icons';
import { WodEntry } from '../types';
import { WOD_SCRIPT_URL } from '../constants';

type WodMode = 'today' | 'history';

const WodContainer: React.FC = () => {
  const [mode, setMode] = useState<WodMode>('today');
  const [todayData, setTodayData] = useState<WodEntry | null>(null);
  const [historyData, setHistoryData] = useState<WodEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const fetchData = async (targetMode: WodMode) => {
    if (!WOD_SCRIPT_URL) {
      setError("WOD service URL is not configured.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${WOD_SCRIPT_URL}?mode=${targetMode}`);
      if (!response.ok) throw new Error("Failed to fetch WOD data");
      
      const result = await response.json();
      if (result.success) {
        if (targetMode === 'today') {
          setTodayData(result.data);
        } else {
          setHistoryData(result.data || []);
        }
      } else {
        setError(result.message || "No WOD data available at the moment.");
      }
    } catch (err) {
      setError("Unable to connect to workout service. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(mode);
  }, [mode]);

  const toggleAccordion = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const renderToday = () => {
    if (loading) return <LoadingSkeleton />;
    if (error) return <ErrorView message={error} onRetry={() => fetchData('today')} />;
    if (!todayData) return <RestDayView />;

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
    if (loading) return <LoadingSkeleton count={5} />;
    if (error) return <ErrorView message={error} onRetry={() => fetchData('history')} />;
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
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
         <div>
            <h2 className="text-3xl font-black text-brand-textPrimary tracking-tight">W.O.D</h2>
            <p className="text-brand-textSecondary font-medium">Forging elite fitness daily.</p>
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

      {mode === 'today' ? renderToday() : renderHistory()}
    </div>
  );
};

// Sub-components
const LoadingSkeleton = ({ count = 1 }) => (
  <div className="space-y-4 animate-pulse">
    {[...Array(count)].map((_, i) => (
      <div key={i} className="h-48 bg-brand-dark border border-brand-border rounded-2xl w-full" />
    ))}
  </div>
);

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
      No workout is scheduled for this date. Focus on recovery, mobility, and nutrition.
    </p>
  </div>
);

export default WodContainer;
