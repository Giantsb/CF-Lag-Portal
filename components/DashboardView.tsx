
import React, { useState, useEffect } from 'react';
import { 
  UserIcon, 
  CreditCardIcon, 
  ActivityIcon, 
  PhoneIcon, 
  AlertTriangleIcon, 
  XCircleIcon, 
  ClockIcon,
  CopyIcon,
  CheckCircleIcon,
  MenuIcon,
  XIcon,
  HomeIcon,
  LogOutIcon,
  DumbbellIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BellIcon,
  FileTextIcon
} from './Icons';
import { MemberData } from '../types';
import { logAnalyticsEvent } from '../services/firebase';
import ThemeToggle from './ThemeToggle';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, 
  eachDayOfInterval, isToday, subWeeks, addWeeks
} from 'date-fns';

interface DashboardViewProps {
  member: MemberData;
  onLogout: () => void;
}

type ScheduleDay = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
type ViewMode = 'month' | 'week' | 'day';

const SCHEDULE: Record<ScheduleDay, string[]> = {
  'Monday': ['06:30', '08:00', '17:00', '18:00', '19:00', '20:00'],
  'Tuesday': ['06:30', '08:00', '17:00', '18:00', '19:00', '20:00'],
  'Wednesday': ['06:30', '08:00', '17:00', '18:00', '19:00', '20:00'],
  'Thursday': ['06:30', '08:00', '17:00', '18:00', '19:00', '20:00'],
  'Friday': ['06:30', '08:00', '17:00', '18:00', '19:00'],
  'Saturday': ['07:00', '08:00', '09:00'],
  'Sunday': []
};

const HOLIDAY_TIMES = ['07:00', '08:00', '18:00', '19:00'];
const NIGERIAN_HOLIDAY_CALENDAR_ID = 'en-gb.ng#holiday@group.v.calendar.google.com';

const KEY_PARTS = [
  'QUl6YVN5', 
  'QnQ4M1pPLXpTZ', 
  'ERfNWI1VkY1dl', 
  'NtQzRIQl9ERHk4VFAw' 
];
const GOOGLE_API_KEY = atob(KEY_PARTS.join(''));

const DashboardView: React.FC<DashboardViewProps> = ({ member, onLogout }) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'schedule' | 'policies'>('dashboard');
  const [isPoliciesExpanded, setIsPoliciesExpanded] = useState(false);
  
  const [viewDate, setViewDate] = useState(new Date());
  const [scheduleViewMode, setScheduleViewMode] = useState<ViewMode>('month');
  const [holidays, setHolidays] = useState<Record<string, string>>({});
  const [holidayError, setHolidayError] = useState(false);
  
  const statusLower = member.status.toLowerCase();
  const isValid = statusLower.includes('valid') || statusLower.includes('active');
  const isExpired = statusLower.includes('expired') || statusLower.includes('inactive');
  
  const statusColor = isValid ? 'text-brand-success' : (isExpired ? 'text-brand-danger' : 'text-orange-400');
  const borderColor = isValid ? 'border-brand-success' : (isExpired ? 'border-brand-danger' : 'border-orange-400');
  const bgColor = isValid ? 'bg-green-900/10' : (isExpired ? 'bg-red-900/10' : 'bg-orange-900/10');

  const today = new Date();
  const startDate = new Date(member.startDate);
  const expDate = new Date(member.expirationDate);
  
  today.setHours(0,0,0,0);
  startDate.setHours(0,0,0,0);
  expDate.setHours(0,0,0,0);

  const diffTime = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isExpiringSoon = isValid && !isNaN(diffDays) && diffDays <= 7 && diffDays >= 0;

  const totalDuration = expDate.getTime() - startDate.getTime();
  const elapsedDuration = today.getTime() - startDate.getTime();
  
  let progressPercentage = 0;
  if (totalDuration > 0) {
      progressPercentage = (elapsedDuration / totalDuration) * 100;
  }
  progressPercentage = Math.min(Math.max(progressPercentage, 0), 100);

  let barColor = 'bg-brand-accent';
  if (isExpired) barColor = 'bg-brand-danger';
  else if (isExpiringSoon) barColor = 'bg-yellow-500';

  useEffect(() => {
    logAnalyticsEvent('portal_view', { page: currentView, status: member.status });
  }, [currentView, member.status]);

  useEffect(() => {
    const fetchHolidays = async () => {
      if (!GOOGLE_API_KEY) return;
      try {
        const now = new Date();
        const timeMin = subMonths(now, 1).toISOString();
        const timeMax = addMonths(now, 6).toISOString();
        const CALENDAR_ID = encodeURIComponent(NIGERIAN_HOLIDAY_CALENDAR_ID);
        const URL = `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events?singleEvents=true&orderBy=startTime&timeMin=${timeMin}&timeMax=${timeMax}&key=${GOOGLE_API_KEY}`;
        const response = await fetch(URL);
        if (response.ok) {
          const data = await response.json();
          const holidayMap: Record<string, string> = {};
          data.items?.forEach((item: any) => {
            const dateStr = item.start.date || item.start.dateTime?.split('T')[0];
            const summary = item.summary || '';
            const description = item.description || '';
            if (!(description.toLowerCase().includes('observance') || summary.toLowerCase().includes('observance'))) {
              if (dateStr) holidayMap[dateStr] = summary;
            }
          });
          setHolidays(holidayMap);
        }
      } catch (err) {
        setHolidayError(true);
      }
    };
    fetchHolidays();
  }, []);

  const formatTime = (time24: string) => {
    const [hour, minute] = time24.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minute} ${ampm}`;
  };

  const getDailyInfo = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const holidayName = holidays[dateStr];
    const dayName = format(date, 'EEEE') as ScheduleDay;
    let times = SCHEDULE[dayName] || [];
    let isHoliday = false;
    let isClosed = false;
    if (holidayName) {
      const lowerName = holidayName.toLowerCase();
      const isClosedHoliday = lowerName.includes('christmas day') || lowerName.includes('boxing day') || lowerName.includes("new year's day") || lowerName.includes('easter sunday');
      if (isClosedHoliday) {
        isHoliday = true;
        isClosed = true;
        times = [];
      } else {
        isHoliday = true;
        times = HOLIDAY_TIMES;
      }
    }
    return { date, dateStr, dayName, times, isHoliday, isClosed, holidayName: isHoliday ? holidayName : undefined, hasClasses: times.length > 0 };
  };

  const getNextClass = () => {
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const checkDate = addDays(now, i);
      const info = getDailyInfo(checkDate);
      if (!info.times || info.times.length === 0) continue;
      for (const time of info.times) {
        const [hour, minute] = time.split(':').map(Number);
        const classDate = new Date(checkDate);
        classDate.setHours(hour, minute, 0, 0);
        if (classDate > now) return { date: classDate, dayName: i === 0 ? 'Today' : (i === 1 ? 'Tomorrow' : info.dayName), time: formatTime(time), holidayName: info.holidayName };
      }
    }
    return { holidayName: getDailyInfo(now).holidayName };
  };

  const nextClassInfo = getNextClass();
  const handleCopy = () => {
    navigator.clipboard.writeText('0078409920');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderCalendarHeader = () => (
    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold text-brand-textPrimary">{format(viewDate, scheduleViewMode === 'day' ? 'MMMM d, yyyy' : 'MMMM yyyy')}</h2>
        <div className="flex bg-brand-surface rounded-lg p-1">
          <button onClick={() => { if (scheduleViewMode === 'month') setViewDate(subMonths(viewDate, 1)); else if (scheduleViewMode === 'week') setViewDate(subWeeks(viewDate, 1)); else setViewDate(addDays(viewDate, -1)); }} className="p-1 hover:text-brand-accent transition-colors"><ChevronDownIcon className="w-6 h-6 rotate-90" /></button>
          <button onClick={() => setViewDate(new Date())} className="px-3 text-sm font-bold text-brand-textSecondary hover:text-brand-textPrimary">Today</button>
          <button onClick={() => { if (scheduleViewMode === 'month') setViewDate(addMonths(viewDate, 1)); else if (scheduleViewMode === 'week') setViewDate(addWeeks(viewDate, 1)); else setViewDate(addDays(viewDate, 1)); }} className="p-1 hover:text-brand-accent transition-colors"><ChevronDownIcon className="w-6 h-6 -rotate-90" /></button>
        </div>
      </div>
      <div className="flex bg-brand-surface rounded-lg p-1 w-full md:w-auto">
        {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
          <button key={mode} onClick={() => setScheduleViewMode(mode)} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-bold capitalize transition-all ${scheduleViewMode === mode ? 'bg-brand-accent text-brand-accentText shadow-md' : 'text-brand-textSecondary hover:text-brand-textPrimary'}`}>{mode}</button>
        ))}
      </div>
    </div>
  );

  const renderMonthView = () => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="animate-fadeIn">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (<div key={day} className="text-center text-sm font-bold text-brand-textSecondary py-2">{day}</div>))}
        </div>
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {days.map((day) => {
            const info = getDailyInfo(day);
            const isSelectedMonth = isSameMonth(day, monthStart);
            const isTodayDate = isToday(day);
            return (
              <button key={day.toISOString()} onClick={() => { setViewDate(day); setScheduleViewMode('day'); }} className={`min-h-[80px] md:min-h-[100px] p-2 rounded-lg border transition-all flex flex-col items-start justify-start relative overflow-hidden group ${isSelectedMonth ? 'bg-brand-dark hover:bg-brand-surface' : 'bg-brand-black opacity-50'} ${isTodayDate ? 'border-brand-accent ring-1 ring-brand-accent' : 'border-brand-border'}`}>
                <span className={`text-sm font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isTodayDate ? 'bg-brand-accent text-brand-accentText' : 'text-brand-textPrimary'}`}>{format(day, 'd')}</span>
                <div className="flex flex-col gap-1 w-full">
                  {info.isHoliday && (<div className={`w-full h-1.5 rounded-full ${info.isClosed ? 'bg-red-600' : 'bg-orange-500'}`} title={info.holidayName} />)}
                  {info.hasClasses && !info.isHoliday && (<div className="flex flex-wrap gap-1">{info.times.slice(0, 3).map((t, i) => (<div key={i} className="w-1.5 h-1.5 rounded-full bg-brand-accent" />))}</div>)}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startDate = startOfWeek(viewDate);
    const endDate = endOfWeek(viewDate);
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    return (
      <div className="animate-fadeIn overflow-x-auto pb-4 no-scrollbar">
        <div className="grid grid-cols-7 min-w-[800px] gap-4">
          {days.map((day) => {
            const info = getDailyInfo(day);
            const isTodayDate = isToday(day);
            return (
              <div key={day.toISOString()} className={`flex flex-col gap-3 p-3 rounded-xl border ${isTodayDate ? 'border-brand-accent bg-brand-accent/5' : 'border-brand-border bg-brand-dark'}`}>
                <div className="text-center pb-2 border-b border-brand-border"><p className="text-xs text-brand-textSecondary font-bold uppercase">{format(day, 'EEE')}</p><p className={`text-xl font-bold mt-1 ${isTodayDate ? 'text-brand-accent' : 'text-brand-textPrimary'}`}>{format(day, 'd')}</p></div>
                <div className="flex flex-col gap-2 flex-1">
                  {info.isHoliday ? (<div className={`p-2 rounded text-center border ${info.isClosed ? 'bg-red-500/10 border-red-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}><p className={`text-xs font-bold ${info.isClosed ? 'text-red-400' : 'text-orange-400'}`}>{info.holidayName}</p></div>) : (info.times.length > 0 ? (info.times.map(time => (<div key={time} className="p-2 rounded bg-brand-surface text-center border border-brand-border hover:border-brand-accent transition-colors"><span className="text-sm font-mono text-brand-textPrimary">{time}</span></div>))) : (<div className="flex-1 flex items-center justify-center opacity-30"><span className="text-xs italic">Rest</span></div>))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const info = getDailyInfo(viewDate);
    return (
      <div className="animate-fadeIn max-w-2xl mx-auto">
         <div className="bg-brand-dark border border-brand-border rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6"><div><h3 className="text-3xl font-bold text-brand-textPrimary">{format(viewDate, 'EEEE')}</h3><p className="text-brand-textSecondary">{format(viewDate, 'MMMM d, yyyy')}</p></div></div>
            {info.isHoliday ? (<div className="text-center py-8"><h4 className={`text-xl font-bold mb-2 ${info.isClosed ? 'text-red-400' : 'text-orange-400'}`}>{info.holidayName}</h4><p className="text-brand-textPrimary font-bold">{info.isClosed ? 'GYM CLOSED' : 'Holiday Hours Apply'}</p></div>) : (
               <div className="space-y-4">{info.times.length > 0 ? (info.times.map(time => (<div key={time} className="flex items-center p-4 rounded-xl border bg-brand-surface border-brand-accent/30"><div className="p-3 bg-brand-accent/10 rounded-full text-brand-accent mr-4"><ClockIcon className="w-6 h-6" /></div><div><h4 className="text-xl font-bold font-mono text-brand-textPrimary">{formatTime(time)}</h4><p className="text-sm text-brand-textSecondary">CrossFit Class</p></div></div>))) : (<div className="text-center py-12"><DumbbellIcon className="w-16 h-16 text-brand-textSecondary/20 mx-auto mb-4" /><h3 className="text-lg font-bold text-brand-textSecondary">No Classes Scheduled</h3></div>)}</div>
            )}
         </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-brand-black text-brand-textPrimary flex transition-colors duration-300">
      <div className="lg:hidden fixed top-0 w-full bg-brand-dark z-50 px-4 py-3 flex items-center gap-4 border-b border-brand-border">
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-brand-textPrimary p-1">{isSidebarOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}</button>
        <div className="flex items-center gap-2"><DumbbellIcon className="w-8 h-8 text-brand-accent" /><span className="font-bold text-lg text-brand-textPrimary">CrossFit Lagos</span></div>
      </div>

      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-brand-dark border-r border-brand-border transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col pt-16 lg:pt-0`}>
         <nav className="flex-1 px-4 py-4 space-y-2">
            <button onClick={() => { setCurrentView('dashboard'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'dashboard' ? 'bg-brand-accent text-brand-accentText font-bold' : 'text-brand-textSecondary hover:bg-brand-surface'}`}><HomeIcon className="w-5 h-5" />Dashboard</button>
            <button onClick={() => { setCurrentView('schedule'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'schedule' ? 'bg-brand-accent text-brand-accentText font-bold' : 'text-brand-textSecondary hover:bg-brand-surface'}`}><CalendarIcon className="w-5 h-5" />Schedule</button>
            <button onClick={() => { setShowPaymentModal(true); setIsSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-brand-textSecondary hover:bg-brand-surface"><CreditCardIcon className="w-5 h-5" />Renew</button>
            <button onClick={() => { setCurrentView('policies'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'policies' ? 'bg-brand-accent text-brand-accentText font-bold' : 'text-brand-textSecondary hover:bg-brand-surface'}`}><FileTextIcon className="w-5 h-5" />Policies</button>
            <a href="https://wa.me/2347059969059" target="_blank" rel="noreferrer" className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-brand-textSecondary hover:bg-brand-surface"><PhoneIcon className="w-5 h-5" />Support</a>
         </nav>
         <div className="p-4 border-t border-brand-border">
            <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-brand-danger hover:bg-brand-danger/10 transition-colors"><LogOutIcon className="w-5 h-5" />Logout</button>
         </div>
      </aside>

      <main className="flex-1 p-4 lg:p-8 pt-20 lg:pt-8 overflow-y-auto">
         <div className="max-w-4xl mx-auto">
            {currentView === 'dashboard' && (
              <>
                 <header className="mb-6"><h2 className="text-2xl font-bold text-brand-textPrimary">Dashboard</h2><p className="text-brand-textSecondary text-sm">Welcome, {member.firstName}</p></header>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`p-5 rounded-xl border ${borderColor} ${bgColor} flex items-center gap-4`}><div className="w-14 h-14 rounded-full bg-brand-black flex items-center justify-center"><UserIcon className="w-7 h-7" /></div><div><h3 className="font-bold text-lg text-brand-textPrimary">{member.firstName} {member.lastName}</h3><div className={`flex items-center gap-1.5 text-sm font-medium ${statusColor}`}><span>{member.status}</span></div></div></div>
                    <div className="p-5 rounded-xl border border-brand-border bg-brand-dark"><div className="flex justify-between items-end mb-2"><span className="text-brand-textSecondary text-xs font-bold uppercase">Expires</span><span className={`text-xl font-bold ${isExpiringSoon ? 'text-yellow-500' : 'text-brand-accent'}`}>{isExpired ? 'Expired' : `${diffDays} Days`}</span></div><div className="w-full bg-brand-black rounded-full h-2.5 mb-2 overflow-hidden"><div className={`h-full ${barColor}`} style={{ width: `${progressPercentage}%` }}></div></div></div>
                 </div>
              </>
            )}
            {currentView === 'schedule' && (<div className="bg-brand-dark border border-brand-border rounded-xl p-4 md:p-6 shadow-xl">{renderCalendarHeader()}{scheduleViewMode === 'month' && renderMonthView()}{scheduleViewMode === 'week' && renderWeekView()}{scheduleViewMode === 'day' && renderDayView()}</div>)}
            {currentView === 'policies' && (<div className="bg-brand-dark p-6 rounded-xl border border-brand-border"><h2 className="text-xl font-bold mb-4">Policies</h2><p className="text-brand-textSecondary">Membership is time-based. Freezing is allowed for long-term plans with notice.</p></div>)}
         </div>
      </main>

      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-brand-dark w-full max-w-md rounded-2xl border border-brand-border p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6"><h3 className="font-bold">Renew Membership</h3><button onClick={() => setShowPaymentModal(false)}><XIcon className="w-6 h-6" /></button></div>
            <div className="bg-brand-accent/10 rounded-xl p-4 mb-6"><h4 className="text-brand-accent font-bold mb-3 text-sm">BANK TRANSFER</h4><div className="space-y-2 text-sm"><div className="flex justify-between"><span>Bank</span><span>Access Bank</span></div><div className="flex justify-between"><span>Account</span><span>0078409920</span></div><div className="flex justify-between"><span>Name</span><span>CrossFit Lagos</span></div></div></div>
            <a href="https://wa.me/2347059969059" target="_blank" rel="noreferrer" className="block w-full bg-green-600 text-white font-bold py-3 rounded-lg text-center">WhatsApp Receipt</a>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardView;
