
import React, { useState, useEffect } from 'react';
import { 
  UserIcon, 
  CreditCardIcon, 
  ActivityIcon, 
  PhoneIcon, 
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
  FileTextIcon,
  ArrowDownCircleIcon,
  LockIcon
} from './Icons';
import { MemberData } from '../types';
import { logAnalyticsEvent } from '../services/firebase';
import ThemeToggle from './ThemeToggle';
import WodContainer from './WodContainer';
import GymAnnouncements from './GymAnnouncements';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, addDays, 
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
  const [currentView, setCurrentView] = useState<'dashboard' | 'schedule' | 'policies' | 'wod'>('dashboard');
  const [isPoliciesExpanded, setIsPoliciesExpanded] = useState(false);
  
  const [viewDate, setViewDate] = useState(new Date());
  const [scheduleViewMode, setScheduleViewMode] = useState<ViewMode>('month');
  const [holidays, setHolidays] = useState<Record<string, string>>({});
  
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
      } catch (err) {}
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
            
            {/* Restricted Content: WOD is only visible for valid members */}
            {isValid && (
              <button onClick={() => { setCurrentView('wod'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'wod' ? 'bg-brand-accent text-brand-accentText font-bold' : 'text-brand-textSecondary hover:bg-brand-surface'}`}><DumbbellIcon className="w-5 h-5" />Workout (WOD)</button>
            )}

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
         <div className="max-w-5xl mx-auto">
            {currentView === 'dashboard' && (
              <div className="space-y-6">
                 <header className="flex justify-between items-end">
                    <div>
                      <h2 className="text-3xl font-bold text-brand-textPrimary">Dashboard</h2>
                      <p className="text-brand-textSecondary">Welcome back, <span className="text-brand-accent font-bold">{member.firstName}</span></p>
                    </div>
                    <div className="hidden md:block">
                      <ThemeToggle />
                    </div>
                 </header>

                 {/* Announcement Section */}
                 <GymAnnouncements />

                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* MERGED CARD: Status + Identity + Expiry */}
                    <div className={`lg:col-span-2 p-6 rounded-3xl border-2 ${borderColor} ${bgColor} flex flex-col justify-between min-h-[180px] shadow-lg relative overflow-hidden transition-all duration-300`}>
                      {/* Background Decoration */}
                      <div className="absolute top-0 right-0 p-4 opacity-5">
                        <UserIcon className="w-32 h-32" />
                      </div>

                      <div className="flex justify-between items-start relative z-10">
                        <div className="flex gap-4">
                          <div className="p-3 bg-brand-black/20 rounded-2xl flex items-center justify-center">
                            <UserIcon className="w-8 h-8 text-brand-textPrimary" />
                          </div>
                          <div>
                            <h3 className="font-black text-2xl text-brand-textPrimary leading-none">{member.firstName} {member.lastName}</h3>
                            <p className="text-brand-textSecondary text-xs mt-1 font-medium">{member.email}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full bg-brand-black/40 ${statusColor} border border-white/5 tracking-wider`}>
                          {member.status}
                        </span>
                      </div>

                      <div className="my-6 relative z-10">
                         <div className="flex items-end gap-2">
                           <span className={`text-4xl font-black ${isExpiringSoon ? 'text-yellow-500' : 'text-brand-textPrimary'}`}>
                             {isExpired ? 'Expired' : `${diffDays}`}
                           </span>
                           {!isExpired && <span className="text-lg font-bold text-brand-textSecondary mb-1.5 uppercase">Days Left</span>}
                         </div>
                      </div>

                      <div className="w-full relative z-10">
                        <div className="flex justify-between items-center mb-2">
                           <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-widest"></span>
                           <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-widest">Subscription Expires: {member.expirationDate}</span>
                        </div>
                        <div className="w-full bg-brand-black/30 rounded-full h-3 mb-1 overflow-hidden p-0.5 border border-white/5">
                          <div className={`h-full transition-all duration-700 ease-out rounded-full ${barColor}`} style={{ width: `${progressPercentage}%` }}></div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions Card */}
                    <div className="p-6 rounded-3xl border border-brand-border bg-brand-dark flex flex-col justify-between min-h-[180px] shadow-md transition-all duration-300 hover:shadow-lg">
                      <div className="flex justify-between items-start">
                        <div className="p-3 bg-brand-accent/10 rounded-2xl text-brand-accent">
                          <ActivityIcon className="w-8 h-8" />
                        </div>
                        <span className="text-[10px] font-black text-brand-textSecondary uppercase tracking-widest">Shortcuts</span>
                      </div>
                      <div className="space-y-3 mt-4">
                        <button 
                          onClick={() => setShowPaymentModal(true)}
                          className="w-full bg-brand-accent text-brand-accentText text-sm font-black py-3 rounded-2xl hover:bg-brand-accentHover transition-all shadow-md shadow-brand-accent/10 active:scale-[0.98]"
                        >
                          RENEW MEMBERSHIP
                        </button>
                        <button 
                          onClick={() => setCurrentView('schedule')}
                          className="w-full bg-brand-surface text-brand-textPrimary text-sm font-black py-3 rounded-2xl hover:opacity-80 transition-all border border-brand-border active:scale-[0.98]"
                        >
                          VIEW CLASS TIMES
                        </button>
                      </div>
                    </div>
                 </div>

                 {/* Detailed Stats Row */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 bg-brand-dark border border-brand-border rounded-3xl p-6 shadow-sm">
                       <h3 className="text-[10px] font-black text-brand-textSecondary uppercase tracking-widest mb-6 flex items-center gap-2">
                         <FileTextIcon className="w-4 h-4 text-brand-accent" /> Subscription Data
                       </h3>
                       <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
                          <div>
                            <p className="text-[10px] font-black text-brand-textSecondary uppercase tracking-widest mb-2">Package</p>
                            <p className="font-bold text-brand-textPrimary text-lg">{member.package || 'Standard'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-brand-textSecondary uppercase tracking-widest mb-2">Rate</p>
                            <p className="font-bold text-brand-textPrimary text-lg">₦{member.amount || '0'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-brand-textSecondary uppercase tracking-widest mb-2">Start Date</p>
                            <p className="font-bold text-brand-textPrimary text-lg">{member.startDate}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-brand-textSecondary uppercase tracking-widest mb-2">Pause Days</p>
                            <p className="font-bold text-brand-textPrimary text-lg">{member.pauseDays || '0'}</p>
                          </div>
                       </div>
                    </div>

                    <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-3xl p-6 flex flex-col justify-center items-center text-center group transition-all duration-300 hover:bg-brand-accent/10">
                       <div className="w-12 h-12 bg-brand-accent rounded-2xl flex items-center justify-center text-brand-accentText mb-4 transform group-hover:rotate-12 transition-transform">
                          <DumbbellIcon className="w-6 h-6" />
                       </div>
                       <h4 className="font-black text-brand-textPrimary mb-2 uppercase text-xs tracking-widest">Support</h4>
                       <p className="text-xs text-brand-textSecondary mb-6 font-medium">Billing, workout queries, or account updates.</p>
                       <a 
                        href="https://wa.me/2347059969059" 
                        target="_blank" 
                        rel="noreferrer"
                        className="w-full py-3 bg-brand-accent text-brand-accentText rounded-2xl text-xs font-black flex items-center justify-center gap-2 hover:bg-brand-accentHover transition-all shadow-lg shadow-brand-accent/5"
                       >
                         <PhoneIcon className="w-3 h-3" /> SEND WHATSAPP MESSAGE 
                       </a>
                    </div>
                 </div>
              </div>
            )}
            
            {/* Double Check: Don't render WOD if member is invalid, even if state says otherwise */}
            {currentView === 'wod' && isValid && <WodContainer />}
            {currentView === 'wod' && !isValid && (
              <div className="bg-brand-dark border border-brand-border rounded-2xl p-8 text-center max-w-xl mx-auto shadow-2xl">
                 <div className="bg-brand-danger/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-danger">
                   <LockIcon className="w-10 h-10" />
                 </div>
                 <h2 className="text-2xl font-bold text-brand-textPrimary mb-2">Membership Required</h2>
                 <p className="text-brand-textSecondary mb-8 leading-relaxed">
                   The Workout of the Day (WOD) is premium content reserved for active members. Please renew your subscription to access daily training programs.
                 </p>
                 <button 
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full bg-brand-accent text-brand-accentText font-bold py-4 rounded-xl hover:bg-brand-accentHover transition-colors shadow-lg shadow-brand-accent/20"
                 >
                   Renew Subscription Now
                 </button>
              </div>
            )}

            {currentView === 'schedule' && (
              <div className="space-y-6">
                {/* Moved Next Class Card here */}
                <div className="p-6 rounded-3xl border border-brand-border bg-brand-dark flex flex-col justify-between shadow-lg">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-brand-accent/10 rounded-2xl text-brand-accent">
                      <ClockIcon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-black text-brand-textSecondary uppercase tracking-widest">Next Class</span>
                  </div>
                  <div>
                    {nextClassInfo.time ? (
                      <>
                        <p className="text-brand-accent font-black text-sm uppercase tracking-widest mb-1">{nextClassInfo.dayName}</p>
                        <h3 className="text-4xl font-black text-brand-textPrimary">{nextClassInfo.time}</h3>
                      </>
                    ) : (
                      <p className="text-brand-textSecondary text-sm font-medium italic">Check schedule for times</p>
                    )}
                  </div>
                </div>

                <div className="bg-brand-dark border border-brand-border rounded-3xl p-4 md:p-8 shadow-xl">
                  {renderCalendarHeader()}
                  {scheduleViewMode === 'month' && renderMonthView()}
                  {scheduleViewMode === 'week' && renderWeekView()}
                  {scheduleViewMode === 'day' && renderDayView()}
                </div>
              </div>
            )}

            {currentView === 'policies' && (
              <div className="bg-brand-dark p-8 rounded-3xl border border-brand-border max-w-3xl mx-auto animate-fadeIn shadow-lg">
                <h2 className="text-3xl font-black mb-4 text-brand-textPrimary tracking-tight">CrossFit Gym Policies & Terms</h2>
                <p className="text-brand-textSecondary text-sm font-medium leading-relaxed mb-8">
                  By creating an account or registering a membership, you agree to the policies below. These terms ensure a safe, fair, and consistent training environment for all members.
                </p>

                <div className="border-t border-brand-border pt-6">
                   <button
                      onClick={() => setIsPoliciesExpanded(!isPoliciesExpanded)}
                      className="w-full flex items-center justify-between p-4 rounded-2xl bg-brand-surface hover:bg-brand-accent/10 transition-all group border border-brand-border"
                   >
                      <span className="font-black text-xs uppercase tracking-widest text-brand-textPrimary">
                        {isPoliciesExpanded ? "Collapse Terms" : "View Full Terms & Policies"}
                      </span>
                      {isPoliciesExpanded ? (
                        <ChevronUpIcon className="w-5 h-5 text-brand-accent" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5 text-brand-textSecondary group-hover:text-brand-accent" />
                      )}
                   </button>

                   {isPoliciesExpanded && (
                      <div className="mt-10 space-y-10 animate-fadeIn">
                         {/* 1. Membership Overview */}
                         <section>
                            <h3 className="text-brand-accent font-black uppercase text-xs tracking-widest mb-4 pb-2 border-b border-brand-accent/20">1. Membership Overview</h3>
                            <ul className="space-y-4 text-sm text-brand-textSecondary font-medium">
                               <li className="flex gap-4">
                                  <span className="text-brand-accent font-bold mt-0.5">•</span>
                                  <span>All memberships are <strong>time-based</strong>, not attendance-based.</span>
                               </li>
                               <li className="flex gap-4">
                                  <span className="text-brand-accent font-bold mt-0.5">•</span>
                                  <span>Membership becomes active on the selected start date.</span>
                               </li>
                               <li className="flex gap-4">
                                  <span className="text-brand-accent font-bold mt-0.5">•</span>
                                  <span>Missed sessions or unused days cannot be refunded, rolled over, or extended.</span>
                               </li>
                            </ul>
                         </section>

                         {/* 2. Freeze Policy */}
                         <section>
                            <h3 className="text-brand-accent font-black uppercase text-xs tracking-widest mb-4 pb-2 border-b border-brand-accent/20">2. Membership Freeze (Pause) Policy</h3>
                            <p className="text-sm text-brand-textSecondary font-medium leading-relaxed mb-4">Members may request to pause their membership due to travel, injury, or personal reasons.</p>
                            
                            <div className="bg-brand-black/20 p-5 rounded-2xl border border-brand-border mb-6">
                               <h4 className="text-brand-textPrimary font-black text-[10px] uppercase mb-4 tracking-widest">Eligibility & Conditions</h4>
                               <ul className="space-y-3 text-xs text-brand-textSecondary">
                                  <li>• Freeze requests must be submitted <strong>before</strong> the planned break.</li>
                                  <li>• Only <strong>active memberships</strong> may be paused.</li>
                                  <li>• Approved pauses extend the membership by the same number of days.</li>
                                  <li>• Freeze requests will <strong>not</strong> be granted if submitted within <strong>7 days</strong> of the membership’s expiration or renewal date.</li>
                               </ul>
                            </div>

                            <div className="bg-brand-black/20 p-5 rounded-2xl border border-brand-border">
                               <h4 className="text-brand-textPrimary font-black text-[10px] uppercase mb-4 tracking-widest">Allowed Pause Duration</h4>
                               <ul className="space-y-3 text-xs text-brand-textSecondary font-bold">
                                  <li className="flex justify-between"><span>Monthly Plans</span> <span className="text-brand-accent">14 Days</span></li>
                                  <li className="flex justify-between"><span>3- & 6-Month Plans</span> <span className="text-brand-accent">14–20 Days</span></li>
                                  <li className="flex justify-between"><span>12-Month Plans</span> <span className="text-brand-accent">14–25 Days</span></li>
                               </ul>
                               <p className="text-[10px] text-brand-textSecondary italic mt-4 opacity-70">Note: Only one pause is allowed per membership cycle.</p>
                            </div>
                         </section>

                         {/* 3. Refund Policy */}
                         <section>
                            <h3 className="text-brand-accent font-black uppercase text-xs tracking-widest mb-4 pb-2 border-b border-brand-accent/20">3. Refund Policy</h3>
                            <p className="text-sm text-brand-textSecondary font-medium leading-relaxed mb-4">The gym maintains a strict no-refund policy. No refunds will be issued for:</p>
                            <div className="grid grid-cols-2 gap-3 mb-6">
                               <div className="p-3 bg-brand-surface rounded-xl text-[10px] font-black uppercase text-brand-textSecondary border border-brand-border text-center">Unused days</div>
                               <div className="p-3 bg-brand-surface rounded-xl text-[10px] font-black uppercase text-brand-textSecondary border border-brand-border text-center">Missed sessions</div>
                               <div className="p-3 bg-brand-surface rounded-xl text-[10px] font-black uppercase text-brand-textSecondary border border-brand-border text-center">Early cancellation</div>
                               <div className="p-3 bg-brand-surface rounded-xl text-[10px] font-black uppercase text-brand-textSecondary border border-brand-border text-center">Loss of interest</div>
                            </div>
                            <h4 className="text-brand-textPrimary font-black text-[10px] uppercase mb-2 tracking-widest">Exceptions (Management Review Only)</h4>
                            <ul className="space-y-2 text-xs text-brand-textSecondary">
                               <li>• Documented long-term medical conditions.</li>
                               <li>• Instances where the gym is unable to provide the contracted service.</li>
                            </ul>
                            <p className="text-[10px] text-brand-textSecondary mt-4 italic">If approved, refunds may be prorated.</p>
                         </section>

                         {/* 4. Non-Transferable */}
                         <section>
                            <h3 className="text-brand-accent font-black uppercase text-xs tracking-widest mb-2 pb-2 border-b border-brand-accent/20">4. Non-Transferable Memberships</h3>
                            <p className="text-sm text-brand-textSecondary font-medium">All memberships are personal and cannot be transferred or shared.</p>
                         </section>

                         {/* 5. Health & Safety */}
                         <section>
                            <h3 className="text-brand-accent font-black uppercase text-xs tracking-widest mb-4 pb-2 border-b border-brand-accent/20">5. Health & Safety Requirements</h3>
                            <ul className="space-y-3 text-sm text-brand-textSecondary font-medium">
                               <li className="flex gap-4"><span className="text-brand-accent font-bold">•</span><span>Members must disclose injuries or medical conditions.</span></li>
                               <li className="flex gap-4"><span className="text-brand-accent font-bold">•</span><span>Follow coaching instructions and train within your limits.</span></li>
                               <li className="flex gap-4"><span className="text-brand-accent font-bold">•</span><span>Use equipment safely and responsibly.</span></li>
                               <li className="flex gap-4"><span className="text-brand-accent font-bold">•</span><span>Wear suitable athletic attire and shoes.</span></li>
                            </ul>
                         </section>

                         {/* 6. Class Etiquette */}
                         <section>
                            <h3 className="text-brand-accent font-black uppercase text-xs tracking-widest mb-4 pb-2 border-b border-brand-accent/20">6. Class Etiquette & Conduct</h3>
                            <ul className="space-y-3 text-sm text-brand-textSecondary font-medium">
                               <li className="flex gap-4"><span className="text-brand-accent font-bold">•</span><span>Arrive on time for classes.</span></li>
                               <li className="flex gap-4"><span className="text-brand-accent font-bold">•</span><span>Respect coaches and fellow members.</span></li>
                               <li className="flex gap-4"><span className="text-brand-accent font-bold">•</span><span>Clean and return equipment after use.</span></li>
                               <li className="flex gap-4"><span className="text-brand-accent font-bold">!</span><span className="text-brand-danger font-bold">Unsafe or disruptive behavior may lead to membership termination without refund.</span></li>
                            </ul>
                         </section>

                         {/* 7. Photography */}
                         <section>
                            <h3 className="text-brand-accent font-black uppercase text-xs tracking-widest mb-4 pb-2 border-b border-brand-accent/20">7. Photography & Media</h3>
                            <ul className="space-y-3 text-sm text-brand-textSecondary font-medium">
                               <li className="flex gap-4"><span className="text-brand-accent font-bold">•</span><span>The gym may capture photos/videos during classes for community or promotional purposes.</span></li>
                               <li className="flex gap-4"><span className="text-brand-accent font-bold">•</span><span>Members may request exemption by notifying management in writing.</span></li>
                            </ul>
                         </section>

                         {/* 8. Liability */}
                         <section>
                            <h3 className="text-brand-accent font-black uppercase text-xs tracking-widest mb-4 pb-2 border-b border-brand-accent/20">8. Liability Waiver</h3>
                            <ul className="space-y-4 text-sm text-brand-textSecondary font-medium">
                               <li className="flex gap-4"><span className="text-brand-accent font-bold">•</span><span>You acknowledge that CrossFit training involves physical risk.</span></li>
                               <li className="flex gap-4"><span className="text-brand-accent font-bold">•</span><span>You participate voluntarily and assume responsibility for your own safety.</span></li>
                               <li className="flex gap-4"><span className="text-brand-accent font-bold">•</span><span>The gym is not liable for injuries caused by improper form, ignored instructions, or unsafe behavior.</span></li>
                            </ul>
                         </section>

                         {/* 9. Agreement */}
                         <section className="bg-brand-accent/5 p-6 rounded-2xl border border-brand-accent/20">
                            <h3 className="text-brand-accent font-black uppercase text-xs tracking-widest mb-2">9. Agreement</h3>
                            <p className="text-sm text-brand-textPrimary font-black italic">By registering or using the gym facilities, you confirm that you have read and agree to these terms.</p>
                         </section>
                      </div>
                   )}
                </div>
              </div>
            )}
         </div>
      </main>

      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-brand-dark w-full max-w-md rounded-3xl border border-brand-border p-8 shadow-2xl animate-scaleIn">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-black text-xl tracking-tight">Renew Membership</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-2 bg-brand-surface rounded-full hover:text-brand-accent transition-colors"><XIcon className="w-5 h-5" /></button>
            </div>
            
            <div className="bg-brand-accent/10 rounded-2xl p-6 mb-8 border border-brand-accent/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-brand-accent rounded-xl text-brand-accentText">
                  <CreditCardIcon className="w-5 h-5" />
                </div>
                <h4 className="text-brand-accent font-black text-xs uppercase tracking-widest">ELECTRONIC TRANSFER</h4>
              </div>
              
              <div className="space-y-4 text-sm font-bold">
                <div className="flex justify-between items-center pb-3 border-b border-brand-accent/10">
                  <span className="text-brand-textSecondary text-[10px] uppercase">Bank</span>
                  <span className="text-brand-textPrimary">Access Bank</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-brand-accent/10">
                  <span className="text-brand-textSecondary text-[10px] uppercase">Account</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-brand-textPrimary">0078409920</span>
                    <button onClick={handleCopy} className="text-brand-accent hover:text-brand-accentHover bg-brand-accent/20 p-1.5 rounded-lg">
                      {copied ? <CheckCircleIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-brand-textSecondary text-[10px] uppercase">Name</span>
                  <span className="text-brand-textPrimary">CrossFit Lagos</span>
                </div>
              </div>
            </div>

            <div className="text-center space-y-4">
               <p className="text-[10px] font-black text-brand-textSecondary uppercase tracking-widest px-4">Instant Activation required?</p>
               <a 
                href="https://wa.me/2347059969059?text=Hello,%20I've%20just%20renewed%20my%20membership%20via%20the%20portal.%20Attached%20is%20my%20receipt." 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center justify-center gap-2 w-full bg-green-600 text-white font-black py-4 rounded-2xl hover:bg-green-700 transition-all shadow-xl shadow-green-900/20 active:scale-[0.98]"
               >
                 <PhoneIcon className="w-5 h-5" /> WHATSAPP RECEIPT
               </a>
               <p className="text-[10px] text-brand-textSecondary/60 italic">Send a screenshot of your transfer for confirmation.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardView;
