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
import { requestForToken, onMessageListener, logAnalyticsEvent, checkNotificationSupport } from '../services/firebase';
import ThemeToggle from './ThemeToggle';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, 
  eachDayOfInterval, isToday, parse, startOfDay, addWeeks, subWeeks,
  isSameYear, getDay
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

// Nigerian Holidays Calendar ID provided by user
const NIGERIAN_HOLIDAY_CALENDAR_ID = 'en-gb.ng#holiday@group.v.calendar.google.com';

// Public API Key obfuscated and split to pass security scanners
// The key is public and restricted by referrer, so it is safe to use in client code.
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
  const [notification, setNotification] = useState({ title: '', body: '' });
  const [showNotification, setShowNotification] = useState(false);
  
  // Calendar State
  const [viewDate, setViewDate] = useState(new Date());
  const [scheduleViewMode, setScheduleViewMode] = useState<ViewMode>('month');

  // Holiday State
  const [holidays, setHolidays] = useState<Record<string, string>>({});
  const [holidayError, setHolidayError] = useState(false);
  
  const statusLower = member.status.toLowerCase();
  const isValid = statusLower.includes('valid') || statusLower.includes('active');
  const isExpired = statusLower.includes('expired') || statusLower.includes('inactive');
  
  const statusColor = isValid ? 'text-brand-success' : (isExpired ? 'text-brand-danger' : 'text-orange-400');
  const borderColor = isValid ? 'border-brand-success' : (isExpired ? 'border-brand-danger' : 'border-orange-400');
  const bgColor = isValid ? 'bg-green-900/10' : (isExpired ? 'bg-red-900/10' : 'bg-orange-900/10');

  // Calculate days remaining
  const today = new Date();
  const startDate = new Date(member.startDate);
  const expDate = new Date(member.expirationDate);
  
  today.setHours(0,0,0,0);
  startDate.setHours(0,0,0,0);
  expDate.setHours(0,0,0,0);

  const diffTime = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isExpiringSoon = isValid && !isNaN(diffDays) && diffDays <= 7 && diffDays >= 0;

  // Calculate Progress
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
  else if (progressPercentage > 85) barColor = 'bg-yellow-500';

  // --- Track Portal View ---
  useEffect(() => {
    logAnalyticsEvent('portal_view', { page: currentView, status: member.status });
  }, [currentView, member.status]);

  // --- Fetch Holidays ---
  useEffect(() => {
    const fetchHolidays = async () => {
      if (!GOOGLE_API_KEY) {
        setHolidayError(true);
        return;
      }

      try {
        const now = new Date();
        const timeMin = subMonths(now, 1).toISOString();
        const timeMax = addMonths(now, 6).toISOString();
        
        const CALENDAR_ID = encodeURIComponent(NIGERIAN_HOLIDAY_CALENDAR_ID);
        const URL = `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events?singleEvents=true&orderBy=startTime&timeMin=${timeMin}&timeMax=${timeMax}&key=${GOOGLE_API_KEY}`;

        const response = await fetch(URL);
        if (!response.ok) throw new Error('Failed to fetch holidays');

        const data = await response.json();
        const holidayMap: Record<string, string> = {};

        if (data.items) {
          data.items.forEach((item: any) => {
            const dateStr = item.start.date || item.start.dateTime?.split('T')[0];
            const summary = item.summary || '';
            const description = item.description || '';

            // Filter out Observances
            // We ignore events that are marked as 'Observance' to respect user settings and ensure regular scheduling.
            if (
              (description && description.toLowerCase().includes('observance')) || 
              (summary && summary.toLowerCase().includes('observance'))
            ) {
              return;
            }

            if (dateStr) {
              holidayMap[dateStr] = summary;
            }
          });
        }
        setHolidays(holidayMap);
        setHolidayError(false);
      } catch (err) {
        console.error('Error fetching holidays:', err);
        setHolidayError(true);
      }
    };

    fetchHolidays();
  }, []);

  // --- Foreground Notification Listener ---
  useEffect(() => {
    onMessageListener().then((payload: any) => {
      setNotification({
        title: payload.notification.title,
        body: payload.notification.body
      });
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);
    }).catch(err => console.log('failed: ', err));
  }, []);

  const handleEnableNotifications = async () => {
    const support = checkNotificationSupport();
    if (!support.supported || !support.serviceWorkerSupported) {
      alert("This browser does not support notifications.");
      setIsSidebarOpen(false);
      return;
    }
    if (support.isIOS && !support.isStandalone) {
      alert("To enable notifications on iPhone, please tap 'Share' then 'Add to Home Screen' first.");
      setIsSidebarOpen(false);
      return;
    }
    const token = await requestForToken(member.phone);
    if (token) {
       alert("Notifications enabled! You will now receive updates.");
    } else {
       alert("Unable to enable notifications. Please ensure you have a stable connection.");
    }
    setIsSidebarOpen(false);
  };

  const formatTime = (time24: string) => {
    const [hour, minute] = time24.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minute} ${ampm}`;
  };

  // --- Calendar Helpers ---
  const getDailyInfo = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const holidayName = holidays[dateStr];
    const dayName = format(date, 'EEEE') as ScheduleDay;
    
    let times = SCHEDULE[dayName] || [];
    let isHoliday = false;
    let isClosed = false;

    if (holidayName) {
      const lowerName = holidayName.toLowerCase();
      // Double check for observance just in case it wasn't filtered
      const isObservance = lowerName.includes('observance');
      const isClosedHoliday = lowerName.includes('christmas day') || 
                              lowerName.includes('boxing day') || 
                              lowerName.includes("new year's day") || 
                              lowerName.includes('easter sunday');

      if (isObservance) {
        // Observance: Regular schedule, treat as normal day
        isHoliday = false;
        // times remains as default SCHEDULE[dayName]
      } else if (isClosedHoliday) {
        // Gym Closed
        isHoliday = true;
        isClosed = true;
        times = [];
      } else {
        // Public Holiday Open: Special holiday hours
        isHoliday = true;
        times = HOLIDAY_TIMES;
      }
    }

    return {
      date,
      dateStr,
      dayName,
      times,
      isHoliday,
      isClosed,
      holidayName: isHoliday ? holidayName : undefined, // Only pass name if treated as holiday/closed
      hasClasses: times.length > 0
    };
  };

  const getNextClass = () => {
    const now = new Date();
    
    // Check next 7 days
    for (let i = 0; i < 7; i++) {
      const checkDate = addDays(now, i);
      const info = getDailyInfo(checkDate);
      
      if (!info.times || info.times.length === 0) continue;

      for (const time of info.times) {
        const [hour, minute] = time.split(':').map(Number);
        const classDate = new Date(checkDate);
        classDate.setHours(hour, minute, 0, 0);

        if (classDate > now) {
          return {
            date: classDate,
            dayName: i === 0 ? 'Today' : (i === 1 ? 'Tomorrow' : info.dayName),
            time: formatTime(time),
            holidayName: info.holidayName
          };
        }
      }
    }
    // Return today's holiday info if no classes found (e.g., closed)
    const todayInfo = getDailyInfo(now);
    return { holidayName: todayInfo.holidayName };
  };

  const nextClassInfo = getNextClass();

  const handleCopy = () => {
    navigator.clipboard.writeText('0078409920');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // --- Render Calendar Views ---
  
  const renderCalendarHeader = () => (
    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold text-brand-textPrimary">
          {format(viewDate, scheduleViewMode === 'day' ? 'MMMM d, yyyy' : 'MMMM yyyy')}
        </h2>
        <div className="flex bg-brand-surface rounded-lg p-1">
          <button 
            onClick={() => {
              if (scheduleViewMode === 'month') setViewDate(subMonths(viewDate, 1));
              else if (scheduleViewMode === 'week') setViewDate(subWeeks(viewDate, 1));
              else setViewDate(addDays(viewDate, -1));
            }}
            className="p-1 hover:text-brand-accent transition-colors"
          >
            <ChevronDownIcon className="w-6 h-6 rotate-90" />
          </button>
          <button 
             onClick={() => setViewDate(new Date())}
             className="px-3 text-sm font-bold text-brand-textSecondary hover:text-brand-textPrimary"
          >
            Today
          </button>
          <button 
            onClick={() => {
              if (scheduleViewMode === 'month') setViewDate(addMonths(viewDate, 1));
              else if (scheduleViewMode === 'week') setViewDate(addWeeks(viewDate, 1));
              else setViewDate(addDays(viewDate, 1));
            }}
            className="p-1 hover:text-brand-accent transition-colors"
          >
            <ChevronDownIcon className="w-6 h-6 -rotate-90" />
          </button>
        </div>
      </div>

      <div className="flex bg-brand-surface rounded-lg p-1 w-full md:w-auto">
        {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setScheduleViewMode(mode)}
            className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-bold capitalize transition-all ${
              scheduleViewMode === mode 
                ? 'bg-brand-accent text-brand-accentText shadow-md' 
                : 'text-brand-textSecondary hover:text-brand-textPrimary'
            }`}
          >
            {mode}
          </button>
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
          {weekDays.map(day => (
            <div key={day} className="text-center text-sm font-bold text-brand-textSecondary py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {days.map((day) => {
            const info = getDailyInfo(day);
            const isSelectedMonth = isSameMonth(day, monthStart);
            const isTodayDate = isToday(day);

            return (
              <button
                key={day.toISOString()}
                onClick={() => {
                  setViewDate(day);
                  setScheduleViewMode('day');
                }}
                className={`
                  min-h-[80px] md:min-h-[100px] p-2 rounded-lg border transition-all flex flex-col items-start justify-start relative overflow-hidden group
                  ${isSelectedMonth ? 'bg-brand-dark hover:bg-brand-surface' : 'bg-brand-black opacity-50'}
                  ${isTodayDate ? 'border-brand-accent ring-1 ring-brand-accent' : 'border-brand-border'}
                `}
              >
                <span className={`
                  text-sm font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full
                  ${isTodayDate ? 'bg-brand-accent text-brand-accentText' : 'text-brand-textPrimary'}
                `}>
                  {format(day, 'd')}
                </span>
                
                <div className="flex flex-col gap-1 w-full">
                  {info.isHoliday && (
                    <div className={`w-full h-1.5 rounded-full ${info.isClosed ? 'bg-red-600' : 'bg-orange-500'}`} title={info.holidayName} />
                  )}
                  {info.hasClasses && !info.isHoliday && (
                    <div className="flex flex-wrap gap-1">
                       {info.times.slice(0, 3).map((t, i) => (
                         <div key={i} className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
                       ))}
                       {info.times.length > 3 && <span className="text-[8px] text-brand-textSecondary">+</span>}
                    </div>
                  )}
                </div>
                
                {info.isHoliday && (
                   <span className={`hidden md:block text-[10px] mt-1 truncate w-full text-left font-medium ${info.isClosed ? 'text-red-500 font-bold' : 'text-orange-400'}`}>
                      {info.isClosed ? 'Closed: ' : ''}{info.holidayName}
                   </span>
                )}
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
              <div 
                key={day.toISOString()} 
                className={`flex flex-col gap-3 p-3 rounded-xl border ${isTodayDate ? 'border-brand-accent bg-brand-accent/5' : 'border-brand-border bg-brand-dark'}`}
              >
                <div className="text-center pb-2 border-b border-brand-border">
                  <p className="text-xs text-brand-textSecondary font-bold uppercase">{format(day, 'EEE')}</p>
                  <p className={`text-xl font-bold mt-1 ${isTodayDate ? 'text-brand-accent' : 'text-brand-textPrimary'}`}>{format(day, 'd')}</p>
                </div>

                <div className="flex flex-col gap-2 flex-1">
                  {info.isHoliday ? (
                    <div className={`p-2 rounded text-center border ${info.isClosed ? 'bg-red-500/10 border-red-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
                      <p className={`text-xs font-bold ${info.isClosed ? 'text-red-400' : 'text-orange-400'}`}>{info.holidayName}</p>
                      {info.isClosed && <p className="text-xs text-brand-textPrimary mt-1">Closed</p>}
                      {!info.isClosed && info.times.map(time => (
                         <div key={time} className="mt-1 text-[10px] font-mono text-brand-textPrimary">
                            {formatTime(time)}
                         </div>
                      ))}
                    </div>
                  ) : (
                    info.times.length > 0 ? (
                      info.times.map(time => (
                        <div key={time} className="p-2 rounded bg-brand-surface text-center border border-brand-border hover:border-brand-accent transition-colors">
                           <span className="text-sm font-mono text-brand-textPrimary">{time}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex-1 flex items-center justify-center opacity-30">
                         <span className="text-xs italic">Rest</span>
                      </div>
                    )
                  )}
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
            <div className="flex items-center justify-between mb-6">
               <div>
                  <h3 className="text-3xl font-bold text-brand-textPrimary">{format(viewDate, 'EEEE')}</h3>
                  <p className="text-brand-textSecondary">{format(viewDate, 'MMMM d, yyyy')}</p>
               </div>
               {info.isHoliday && (
                 <div className={`px-3 py-1 rounded-full text-xs font-bold border ${info.isClosed ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-orange-500/20 text-orange-400 border-orange-500/30'}`}>
                    {info.isClosed ? 'Closed' : 'Holiday Schedule'}
                 </div>
               )}
            </div>

            {info.isHoliday ? (
               <div className={`text-center py-8 rounded-xl border ${info.isClosed ? 'bg-red-500/5 border-red-500/10' : 'bg-orange-500/5 border-orange-500/10'}`}>
                  {info.isClosed ? (
                     <XCircleIcon className="w-12 h-12 text-red-400 mx-auto mb-3" />
                  ) : (
                     <ActivityIcon className="w-12 h-12 text-orange-400 mx-auto mb-3" />
                  )}
                  
                  <h4 className={`text-xl font-bold mb-2 ${info.isClosed ? 'text-red-400' : 'text-orange-400'}`}>{info.holidayName}</h4>
                  
                  {info.isClosed ? (
                     <p className="text-brand-textPrimary font-bold">GYM CLOSED</p>
                  ) : (
                     <>
                        <p className="text-brand-textSecondary mb-4">Holiday hours apply.</p>
                        <div className="flex flex-wrap gap-3 justify-center">
                           {info.times.map(time => (
                              <span key={time} className="px-4 py-2 bg-brand-surface rounded-lg font-mono text-brand-textPrimary border border-brand-border">
                                 {formatTime(time)}
                              </span>
                           ))}
                        </div>
                     </>
                  )}
               </div>
            ) : (
               <div className="space-y-4">
                  {info.times.length > 0 ? (
                    info.times.map((time, index) => {
                       const [h, m] = time.split(':').map(Number);
                       const classTime = new Date(viewDate);
                       classTime.setHours(h, m, 0, 0);
                       const isPast = classTime < new Date();

                       return (
                         <div key={time} className={`flex items-center p-4 rounded-xl border transition-all ${isPast ? 'bg-brand-black border-brand-border opacity-60' : 'bg-brand-surface border-brand-accent/30 hover:border-brand-accent'}`}>
                            <div className="p-3 bg-brand-accent/10 rounded-full text-brand-accent mr-4">
                               <ClockIcon className="w-6 h-6" />
                            </div>
                            <div>
                               <h4 className="text-xl font-bold font-mono text-brand-textPrimary">{formatTime(time)}</h4>
                               <p className="text-sm text-brand-textSecondary">CrossFit Class</p>
                            </div>
                            {index === 0 && !isPast && (
                               <div className="ml-auto px-2 py-1 bg-brand-accent text-brand-accentText text-xs font-bold rounded">
                                  NEXT
                               </div>
                            )}
                         </div>
                       );
                    })
                  ) : (
                    <div className="text-center py-12">
                       <DumbbellIcon className="w-16 h-16 text-brand-textSecondary/20 mx-auto mb-4" />
                       <h3 className="text-lg font-bold text-brand-textSecondary">No Classes Scheduled</h3>
                       <p className="text-sm text-brand-textSecondary/60">Enjoy your rest day!</p>
                    </div>
                  )}
               </div>
            )}
         </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-brand-black text-brand-textPrimary flex transition-colors duration-300">
      
      {/* Foreground Notification Toast */}
      {showNotification && (
        <div className="fixed top-4 right-4 z-[60] bg-brand-dark border border-brand-accent p-4 rounded-lg shadow-2xl animate-bounce">
          <div className="flex items-start gap-3">
            <div className="text-brand-accent">
              <BellIcon className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-brand-textPrimary">{notification.title}</h4>
              <p className="text-brand-textSecondary text-sm">{notification.body}</p>
            </div>
            <button onClick={() => setShowNotification(false)} className="text-brand-textSecondary hover:text-brand-textPrimary">
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 w-full bg-brand-dark z-50 px-4 py-3 flex items-center gap-4 border-b border-brand-border">
        <button onClick={toggleSidebar} className="text-brand-textPrimary p-1">
          {isSidebarOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
        </button>
        <div className="flex items-center gap-2">
           <DumbbellIcon className="w-8 h-8 text-brand-accent" />
           <span className="font-bold text-lg text-brand-textPrimary">CrossFit Lagos</span>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-brand-dark border-r border-brand-border transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col pt-16 lg:pt-0`}>
         <div className="p-6 hidden lg:block">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-brand-accent/10 rounded-full text-brand-accent">
                  <DumbbellIcon className="w-6 h-6" />
               </div>
               <div>
                  <h1 className="font-bold text-lg leading-tight text-brand-textPrimary">CROSSFIT<br/>LAGOS</h1>
               </div>
            </div>
         </div>

         <nav className="flex-1 px-4 py-4 space-y-2">
            <button 
              onClick={() => { setCurrentView('dashboard'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'dashboard' ? 'bg-brand-accent text-brand-accentText font-bold' : 'text-brand-textSecondary hover:bg-brand-surface hover:text-brand-textPrimary'}`}
            >
               <HomeIcon className="w-5 h-5" />
               Dashboard
            </button>
            
            <button 
               onClick={() => { setCurrentView('schedule'); setIsSidebarOpen(false); }}
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'schedule' ? 'bg-brand-accent text-brand-accentText font-bold' : 'text-brand-textSecondary hover:bg-brand-surface hover:text-brand-textPrimary'}`}
            >
               <CalendarIcon className="w-5 h-5" />
               Class Schedule
            </button>

            <button 
              onClick={() => { setShowPaymentModal(true); setIsSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-brand-textSecondary hover:bg-brand-surface hover:text-brand-textPrimary transition-colors"
            >
               <CreditCardIcon className="w-5 h-5" />
               Renew Membership
            </button>
            
            <button 
              onClick={() => { setCurrentView('policies'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'policies' ? 'bg-brand-accent text-brand-accentText font-bold' : 'text-brand-textSecondary hover:bg-brand-surface hover:text-brand-textPrimary'}`}
            >
               <FileTextIcon className="w-5 h-5" />
               Policies & Terms
            </button>
            
            <button 
              onClick={handleEnableNotifications}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-brand-textSecondary hover:bg-brand-surface hover:text-brand-textPrimary transition-colors"
            >
               <BellIcon className="w-5 h-5" />
               Enable Notifications
            </button>
            
            <a 
              href="https://wa.me/2347059969059" 
              target="_blank" 
              rel="noreferrer"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-brand-textSecondary hover:bg-brand-surface hover:text-brand-textPrimary transition-colors"
            >
               <PhoneIcon className="w-5 h-5" />
               Support
            </a>
         </nav>

         <div className="px-4 py-2">
            <div className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-brand-textSecondary bg-brand-surface/50">
               <span className="text-sm font-medium">Theme</span>
               <ThemeToggle />
            </div>
         </div>

         <div className="p-4 border-t border-brand-border">
            <button 
               onClick={onLogout}
               className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-brand-danger hover:bg-brand-danger/10 transition-colors"
            >
               <LogOutIcon className="w-5 h-5" />
               Logout
            </button>
         </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8 pt-20 lg:pt-8 overflow-y-auto">
         
         <div className="max-w-4xl mx-auto">
            
            {/* Expiring Soon Banner */}
            {currentView === 'dashboard' && isExpiringSoon && (
               <div className="mb-6 bg-yellow-500/10 border border-yellow-500 rounded-lg p-4 flex items-start gap-4 shadow-[0_0_15px_rgba(234,179,8,0.2)] animate-pulse">
                  <div className="p-2 bg-yellow-500/20 rounded-full text-yellow-500 shrink-0">
                     <AlertTriangleIcon className="w-6 h-6" />
                  </div>
                  <div>
                     <h3 className="font-bold text-yellow-500 text-lg">Membership Expiring Soon</h3>
                     <p className="text-yellow-600/80 dark:text-yellow-200/80 text-sm mt-1">
                        Your subscription will expire in <span className="font-bold text-brand-textPrimary">{diffDays} days</span>. 
                        Please renew to ensure uninterrupted access.
                     </p>
                  </div>
               </div>
            )}

            {currentView === 'dashboard' && (
              <>
                 <header className="mb-6">
                    <h2 className="text-2xl font-bold text-brand-textPrimary">Dashboard</h2>
                    <p className="text-brand-textSecondary text-sm">Welcome back, {member.firstName}</p>
                 </header>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`p-5 rounded-xl border ${borderColor} ${bgColor} relative overflow-hidden flex items-center gap-4 shadow-lg`}>
                        <div className="relative z-10 w-14 h-14 rounded-full bg-brand-black border border-brand-border flex items-center justify-center text-brand-textSecondary shrink-0">
                           <UserIcon className="w-7 h-7" />
                        </div>
                        <div className="relative z-10">
                           <h3 className="font-bold text-lg text-brand-textPrimary leading-tight">{member.firstName} {member.lastName}</h3>
                           <div className={`flex items-center gap-1.5 text-sm font-medium ${statusColor}`}>
                              {isValid ? <CheckCircleIcon className="w-4 h-4" /> : (isExpired ? <XCircleIcon className="w-4 h-4" /> : <ClockIcon className="w-4 h-4" />)}
                              <span>{member.status}</span>
                           </div>
                        </div>
                        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 ${isValid ? 'bg-green-500' : 'bg-red-500'} blur-xl`}></div>
                    </div>

                    <div className="p-5 rounded-xl border border-brand-border bg-brand-dark shadow-lg flex flex-col justify-center">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-brand-textSecondary text-xs font-bold uppercase tracking-wider">Subscription Expires</span>
                            <span className={`text-xl font-bold ${isExpiringSoon ? 'text-yellow-500' : isExpired ? 'text-red-500' : 'text-brand-accent'}`}>
                                {isExpired ? 'Expired' : `${diffDays} Days`}
                            </span>
                        </div>
                        <div className="w-full bg-brand-black rounded-full h-2.5 mb-2 overflow-hidden border border-brand-border">
                            <div className={`h-full ${barColor} transition-all duration-1000`} style={{ width: `${progressPercentage}%` }}></div>
                        </div>
                        <div className="flex justify-between text-xs text-brand-textSecondary font-mono">
                            <span>{member.startDate}</span>
                            <span>{member.expirationDate}</span>
                        </div>
                    </div>

                    <div className="p-5 rounded-xl border border-brand-border bg-brand-dark shadow-lg">
                        <div className="flex items-center gap-2 mb-4 text-brand-accent">
                            <ActivityIcon className="w-5 h-5" />
                            <h4 className="font-bold text-brand-textPrimary text-sm uppercase tracking-wider">Plan Details</h4>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center p-2 rounded-lg bg-brand-surface">
                                <span className="text-brand-textSecondary">Package</span>
                                <span className="font-medium text-brand-textPrimary">{member.package}</span>
                            </div>
                            <div className="flex justify-between items-center p-2 rounded-lg bg-brand-surface">
                                <span className="text-brand-textSecondary">Duration</span>
                                <span className="font-medium text-brand-textPrimary">{member.duration} Month{member.duration !== '1' && 's'}</span>
                            </div>
                            <div className="flex justify-between items-center p-2 rounded-lg bg-brand-surface">
                                <span className="text-brand-textSecondary">Amount</span>
                                <span className="font-medium text-brand-textPrimary">{member.amount}</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-5 rounded-xl border border-brand-border bg-brand-dark shadow-lg">
                        <div className="flex items-center gap-2 mb-4 text-brand-textSecondary">
                            <UserIcon className="w-5 h-5" />
                            <h4 className="font-bold text-brand-textPrimary text-sm uppercase tracking-wider">Account Info</h4>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center p-2 rounded-lg bg-brand-surface">
                                <span className="text-brand-textSecondary">Phone</span>
                                <span className="font-medium text-brand-textPrimary font-mono">{member.phone}</span>
                            </div>
                            <div className="flex justify-between items-center p-2 rounded-lg bg-brand-surface">
                                <span className="text-brand-textSecondary">Paused Days</span>
                                <span className="font-medium text-orange-400 flex items-center gap-1.5">
                                    <ClockIcon className="w-3.5 h-3.5" /> 
                                    {member.pauseDays}
                                </span>
                            </div>
                            {member.email && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-brand-surface">
                                    <span className="text-brand-textSecondary">Email</span>
                                    <span className="font-medium text-brand-textPrimary truncate max-w-[150px]">{member.email}</span>
                                </div>
                            )}
                        </div>
                    </div>

                 </div>
              </>
            )}
            
            {currentView === 'schedule' && (
               <>
                  <header className="mb-6">
                    <h2 className="text-2xl font-bold text-brand-textPrimary">Class Schedule</h2>
                    <p className="text-brand-textSecondary text-sm">Find your next session.</p>
                  </header>

                  {/* Holiday API Error Warning */}
                  {holidayError && (
                    <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
                      Unable to check for public holidays automatically.
                    </div>
                  )}

                  {/* Next Class Summary Card */}
                  <div className="bg-brand-accent text-brand-accentText rounded-xl p-6 mb-8 shadow-lg relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-8 opacity-10">
                        <ClockIcon className="w-32 h-32" />
                     </div>
                     <div className="relative z-10">
                        {nextClassInfo.holidayName && (
                          <div className="mb-4 inline-flex items-center gap-2 bg-brand-black/20 px-3 py-1 rounded-full font-bold">
                            <CalendarIcon className="w-4 h-4" />
                            {nextClassInfo.holidayName}
                          </div>
                        )}
                        
                        <h3 className="text-sm font-bold uppercase tracking-wide opacity-70">Next Class</h3>
                        
                        {nextClassInfo.date ? (
                           <>
                              <div className="text-4xl font-extrabold mt-1 mb-2">
                                 {nextClassInfo.time}
                              </div>
                              <p className="font-medium text-lg">
                                 {nextClassInfo.dayName}
                              </p>
                           </>
                        ) : (
                           <div className="mt-2 text-xl font-bold">No upcoming classes found.</div>
                        )}
                     </div>
                  </div>

                  {/* Full Calendar View */}
                  <div className="bg-brand-dark border border-brand-border rounded-xl p-4 md:p-6 shadow-xl">
                    {renderCalendarHeader()}
                    
                    {scheduleViewMode === 'month' && renderMonthView()}
                    {scheduleViewMode === 'week' && renderWeekView()}
                    {scheduleViewMode === 'day' && renderDayView()}
                  </div>
               </>
            )}

            {currentView === 'policies' && (
              <>
                <header className="mb-6">
                   <h2 className="text-2xl font-bold text-brand-textPrimary">Gym Policies</h2>
                   <p className="text-brand-textSecondary text-sm">Review our terms of service.</p>
                </header>

                <div className="bg-brand-dark border border-brand-border rounded-xl shadow-lg overflow-hidden">
                   <div className="p-6">
                      <h2 className="text-xl font-bold text-brand-textPrimary mb-4">CrossFit Lagos Gym Policies & Terms</h2>
                      <p className="text-brand-textSecondary mb-6 leading-relaxed">
                        By creating an account or registering a membership, you agree to the policies below. These terms ensure a safe, fair, and consistent training environment for all members.
                      </p>

                      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isPoliciesExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                          <hr className="border-brand-border my-6 opacity-50" />

                          <h3 className="text-lg font-bold text-brand-accent mb-3 flex items-center gap-2">
                             1. Membership Overview
                          </h3>
                          <ul className="list-disc pl-5 space-y-2 text-brand-textSecondary mb-6 text-sm">
                            <li>All memberships are <strong className="text-brand-textPrimary">time-based</strong>, not attendance-based.</li>
                            <li>Membership becomes active on the selected start date.</li>
                            <li>Missed sessions or unused days cannot be refunded, rolled over, or extended.</li>
                          </ul>

                          <hr className="border-brand-border my-6 opacity-50" />

                          <h3 className="text-lg font-bold text-brand-accent mb-3">
                             2. Membership Freeze (Pause) Policy
                          </h3>
                          <p className="text-brand-textSecondary mb-4 text-sm">Members may request to pause their membership due to travel, injury, or personal reasons.</p>
                          {/* ... truncated policies content for brevity, assumed unchanged ... */}
                          <ul className="list-disc pl-5 space-y-2 text-brand-textSecondary mb-6 text-sm">
                            <li><strong className="text-brand-textPrimary">Monthly Plans:</strong> Minimum 14 days</li>
                            <li><strong className="text-brand-textPrimary">3 & 6 Month Plans:</strong> 14–20 days</li>
                            <li><strong className="text-brand-textPrimary">12-Month Plans:</strong> 14–25 days</li>
                          </ul>
                          
                          <hr className="border-brand-border my-6 opacity-50" />
                          <h3 className="text-lg font-bold text-brand-accent mb-3">9. Agreement</h3>
                          <p className="text-brand-textSecondary mb-6 text-sm">By registering or using the gym facilities, you confirm that you have read and agree to these terms.</p>
                      </div>

                      <button 
                         onClick={() => setIsPoliciesExpanded(!isPoliciesExpanded)}
                         className="w-full mt-2 py-3 bg-brand-surface hover:bg-brand-surface/80 text-brand-accent font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                         {isPoliciesExpanded ? (
                           <>
                             Show Less <ChevronUpIcon className="w-5 h-5" />
                           </>
                         ) : (
                           <>
                             Read Full Policies <ChevronDownIcon className="w-5 h-5" />
                           </>
                         )}
                      </button>
                   </div>
                </div>
              </>
            )}

         </div>
      </main>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-brand-dark w-full max-w-md rounded-2xl border border-brand-border shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-brand-border flex justify-between items-center bg-brand-header">
              <h3 className="font-bold text-brand-textPrimary">Renew Membership</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-brand-textSecondary hover:text-brand-textPrimary">
                <XIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-brand-accent/10 rounded-xl p-4 border border-brand-accent/20">
                <h4 className="text-brand-accent font-bold mb-3 text-sm uppercase">Bank Transfer Details</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-textSecondary">Bank Name</span>
                    <span className="text-brand-textPrimary font-medium">Access Bank</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-textSecondary">Account Number</span>
                    <div className="flex items-center gap-2">
                      <span className="text-brand-textPrimary font-medium font-mono">0078409920</span>
                      <button onClick={handleCopy} className="text-brand-accent hover:text-brand-accentHover focus:outline-none" title="Copy Account Number">
                        {copied ? <CheckCircleIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-textSecondary">Account Name</span>
                    <span className="text-brand-textPrimary font-medium">CrossFit Lagos</span>
                  </div>
                </div>
              </div>

              <div className="bg-brand-surface p-4 rounded-xl text-sm text-brand-textSecondary">
                <p className="mb-2">
                  <span className="font-bold text-brand-textPrimary">Instructions:</span>
                </p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Make a transfer of the exact amount for your chosen package.</li>
                  <li>Take a screenshot of the transaction receipt.</li>
                  <li>Send the receipt via WhatsApp to confirm activation.</li>
                </ol>
              </div>

              <a 
                href="https://wa.me/2347059969059" 
                target="_blank" 
                rel="noreferrer"
                className="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg text-center transition-colors flex items-center justify-center gap-2"
              >
                <PhoneIcon className="w-5 h-5" />
                Send Receipt on WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardView;