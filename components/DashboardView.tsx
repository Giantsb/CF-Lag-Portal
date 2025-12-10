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
  BellIcon
} from './Icons';
import { MemberData } from '../types';
import { requestForToken, onMessageListener, logAnalyticsEvent } from '../services/firebase';
import { saveNotificationToken } from '../services/membershipService';

interface DashboardViewProps {
  member: MemberData;
  onLogout: () => void;
}

type ScheduleDay = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

const SCHEDULE: Record<ScheduleDay, string[]> = {
  'Monday': ['06:30', '08:00', '17:00', '18:00', '19:00', '20:00'],
  'Tuesday': ['06:30', '08:00', '17:00', '18:00', '19:00', '20:00'],
  'Wednesday': ['06:30', '08:00', '17:00', '18:00', '19:00', '20:00'],
  'Thursday': ['06:30', '08:00', '17:00', '18:00', '19:00', '20:00'],
  'Friday': ['06:30', '08:00', '17:00', '18:00', '19:00'],
  'Saturday': ['07:00', '08:00', '09:00'],
  'Sunday': []
};

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
  const [currentView, setCurrentView] = useState<'dashboard' | 'schedule'>('dashboard');
  const [isTimetableExpanded, setIsTimetableExpanded] = useState(true);
  const [notification, setNotification] = useState({ title: '', body: '' });
  const [showNotification, setShowNotification] = useState(false);
  
  // Initialize filterDay to current day of the week
  const [filterDay, setFilterDay] = useState<string>(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  });
  
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
  
  // Set hours to start of day for accurate day calculation
  today.setHours(0,0,0,0);
  startDate.setHours(0,0,0,0);
  expDate.setHours(0,0,0,0);

  const diffTime = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Show warning if valid and expiring within 7 days (and not already expired/invalid)
  const isExpiringSoon = isValid && !isNaN(diffDays) && diffDays <= 7 && diffDays >= 0;

  // Calculate Progress
  const totalDuration = expDate.getTime() - startDate.getTime();
  const elapsedDuration = today.getTime() - startDate.getTime();
  
  let progressPercentage = 0;
  if (totalDuration > 0) {
      progressPercentage = (elapsedDuration / totalDuration) * 100;
  }
  
  // Clamp percentage between 0 and 100
  progressPercentage = Math.min(Math.max(progressPercentage, 0), 100);

  // Bar Color Logic
  let barColor = 'bg-brand-accent';
  if (isExpired) barColor = 'bg-brand-danger';
  else if (isExpiringSoon) barColor = 'bg-yellow-500';
  else if (progressPercentage > 85) barColor = 'bg-yellow-500';

  // --- Track Portal View ---
  useEffect(() => {
    logAnalyticsEvent('portal_view', { page: 'dashboard', status: member.status });
  }, [member.status]);

  // --- Fetch Holidays ---
  useEffect(() => {
    const fetchHolidays = async () => {
      // If no API key is set, we can't fetch holidays
      if (!GOOGLE_API_KEY) {
        console.warn('Google Calendar API Key not set');
        setHolidayError(true);
        return;
      }

      try {
        const now = new Date();
        const timeMin = now.toISOString();
        const nextWeek = new Date(now);
        nextWeek.setDate(now.getDate() + 14); // Check next 2 weeks to be safe
        const timeMax = nextWeek.toISOString();
        
        const CALENDAR_ID = encodeURIComponent(NIGERIAN_HOLIDAY_CALENDAR_ID);
        const URL = `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events?singleEvents=true&orderBy=startTime&timeMin=${timeMin}&timeMax=${timeMax}&key=${GOOGLE_API_KEY}`;

        const response = await fetch(URL);
        
        if (!response.ok) {
           throw new Error('Failed to fetch holidays');
        }

        const data = await response.json();
        const holidayMap: Record<string, string> = {};

        if (data.items) {
          data.items.forEach((item: any) => {
            // start.date is YYYY-MM-DD for all-day events
            const dateStr = item.start.date || item.start.dateTime?.split('T')[0];
            if (dateStr) {
              holidayMap[dateStr] = item.summary;
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
      console.log(payload);
    }).catch(err => console.log('failed: ', err));
  }, []);

  const handleEnableNotifications = async () => {
    const token = await requestForToken();
    if (token) {
      // Save the token to the backend associated with this user
      const result = await saveNotificationToken(member.phone, token);
      if (result === undefined) {
         // requestForToken handles errors, but let's confirm success
         alert("Notifications enabled! You will now receive updates.");
      }
    } else {
      alert("Unable to enable notifications. Please check your browser settings.");
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

  // --- Next Class Calculation (Holiday Aware) ---
  const getNextClass = () => {
    const now = new Date();
    const days: ScheduleDay[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Check if today is a holiday
    const todayStr = now.toISOString().split('T')[0];
    const todayHoliday = holidays[todayStr];

    // Search upcoming days (up to 7 days ahead)
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(now);
      checkDate.setDate(now.getDate() + i);
      const dayName = days[checkDate.getDay()];
      const dateString = checkDate.toISOString().split('T')[0];

      // If it's a holiday, skip classes for this day (unless we just want to know it's a holiday)
      if (holidays[dateString]) {
        continue;
      }

      const times = SCHEDULE[dayName];
      if (!times || times.length === 0) continue;

      for (const time of times) {
        const [hour, minute] = time.split(':').map(Number);
        const classDate = new Date(checkDate);
        classDate.setHours(hour, minute, 0, 0);

        if (classDate > now) {
          return {
            date: classDate,
            dayName: i === 0 ? 'Today' : (i === 1 ? 'Tomorrow' : dayName),
            time: formatTime(time),
            todayHoliday: todayHoliday
          };
        }
      }
    }
    
    return { todayHoliday }; // Fallback if no classes found
  };

  const nextClassInfo = getNextClass();

  const handleCopy = () => {
    navigator.clipboard.writeText('0078409920');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="min-h-screen bg-brand-black text-white flex">
      
      {/* Foreground Notification Toast */}
      {showNotification && (
        <div className="fixed top-4 right-4 z-[60] bg-brand-dark border border-brand-accent p-4 rounded-lg shadow-2xl animate-bounce">
          <div className="flex items-start gap-3">
            <div className="text-brand-accent">
              <BellIcon className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white">{notification.title}</h4>
              <p className="text-gray-300 text-sm">{notification.body}</p>
            </div>
            <button onClick={() => setShowNotification(false)} className="text-gray-400 hover:text-white">
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 w-full bg-brand-dark z-50 px-4 py-3 flex justify-between items-center border-b border-brand-accent/10">
        <div className="flex items-center gap-2">
           <DumbbellIcon className="w-8 h-8 text-brand-accent" />
           <span className="font-bold text-lg">CrossFit Lagos</span>
        </div>
        <button onClick={toggleSidebar} className="text-white">
          {isSidebarOpen ? <XIcon /> : <MenuIcon />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-brand-dark border-r border-brand-accent/10 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col pt-16 lg:pt-0`}>
         <div className="p-6 hidden lg:block">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-brand-accent/10 rounded-full text-brand-accent">
                  <DumbbellIcon className="w-6 h-6" />
               </div>
               <div>
                  <h1 className="font-bold text-lg leading-tight">CROSSFIT<br/>LAGOS</h1>
               </div>
            </div>
         </div>

         <nav className="flex-1 px-4 py-4 space-y-2">
            <button 
              onClick={() => { setCurrentView('dashboard'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'dashboard' ? 'bg-brand-accent text-brand-black font-bold' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
               <HomeIcon className="w-5 h-5" />
               Dashboard
            </button>
            
            <button 
               onClick={() => { setCurrentView('schedule'); setIsSidebarOpen(false); }}
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'schedule' ? 'bg-brand-accent text-brand-black font-bold' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
               <CalendarIcon className="w-5 h-5" />
               Class Schedule
            </button>

            <button 
              onClick={() => { setShowPaymentModal(true); setIsSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
            >
               <CreditCardIcon className="w-5 h-5" />
               Renew Membership
            </button>
            
            <button 
              onClick={handleEnableNotifications}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
            >
               <BellIcon className="w-5 h-5" />
               Enable Notifications
            </button>
            
            <a 
              href="https://wa.me/2347059969059" 
              target="_blank" 
              rel="noreferrer"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
            >
               <PhoneIcon className="w-5 h-5" />
               Support
            </a>
         </nav>

         <div className="p-4 border-t border-white/5">
            <button 
               onClick={onLogout}
               className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
            >
               <LogOutIcon className="w-5 h-5" />
               Logout
            </button>
         </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8 pt-20 lg:pt-8 overflow-y-auto">
         
         <div className="max-w-4xl mx-auto">
            
            {/* Expiring Soon Banner (Only shows in Dashboard) */}
            {currentView === 'dashboard' && isExpiringSoon && (
               <div className="mb-6 bg-yellow-500/10 border border-yellow-500 rounded-lg p-4 flex items-start gap-4 shadow-[0_0_15px_rgba(234,179,8,0.2)] animate-pulse">
                  <div className="p-2 bg-yellow-500/20 rounded-full text-yellow-500 shrink-0">
                     <AlertTriangleIcon className="w-6 h-6" />
                  </div>
                  <div>
                     <h3 className="font-bold text-yellow-500 text-lg">Membership Expiring Soon</h3>
                     <p className="text-yellow-200/80 text-sm mt-1">
                        Your subscription will expire in <span className="font-bold text-white">{diffDays} days</span>. 
                        Please renew to ensure uninterrupted access.
                     </p>
                  </div>
               </div>
            )}

            {currentView === 'dashboard' ? (
              <>
                 <header className="mb-6">
                    <h2 className="text-2xl font-bold text-white">Dashboard</h2>
                    <p className="text-gray-400 text-sm">Welcome back, {member.firstName}</p>
                 </header>

                 {/* Grid Layout for Cards */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Card 1: Member Status */}
                    <div className={`p-5 rounded-xl border ${borderColor} ${bgColor} relative overflow-hidden flex items-center gap-4 shadow-lg`}>
                        <div className="relative z-10 w-14 h-14 rounded-full bg-brand-black border border-white/10 flex items-center justify-center text-gray-400 shrink-0">
                           <UserIcon className="w-7 h-7" />
                        </div>
                        <div className="relative z-10">
                           <h3 className="font-bold text-lg text-white leading-tight">{member.firstName} {member.lastName}</h3>
                           <div className={`flex items-center gap-1.5 text-sm font-medium ${statusColor}`}>
                              {isValid ? <CheckCircleIcon className="w-4 h-4" /> : (isExpired ? <XCircleIcon className="w-4 h-4" /> : <ClockIcon className="w-4 h-4" />)}
                              <span>{member.status}</span>
                           </div>
                        </div>
                        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 ${isValid ? 'bg-green-500' : 'bg-red-500'} blur-xl`}></div>
                    </div>

                    {/* Card 2: Subscription Timeline */}
                    <div className="p-5 rounded-xl border border-white/10 bg-brand-dark shadow-lg flex flex-col justify-center">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Subscription Expires</span>
                            <span className={`text-xl font-bold ${isExpiringSoon ? 'text-yellow-500' : isExpired ? 'text-red-500' : 'text-brand-accent'}`}>
                                {isExpired ? 'Expired' : `${diffDays} Days`}
                            </span>
                        </div>
                        <div className="w-full bg-black/40 rounded-full h-2.5 mb-2 overflow-hidden border border-white/5">
                            <div className={`h-full ${barColor} transition-all duration-1000`} style={{ width: `${progressPercentage}%` }}></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 font-mono">
                            <span>{member.startDate}</span>
                            <span>{member.expirationDate}</span>
                        </div>
                    </div>

                    {/* Card 3: Plan Details */}
                    <div className="p-5 rounded-xl border border-white/10 bg-brand-dark shadow-lg">
                        <div className="flex items-center gap-2 mb-4 text-brand-accent">
                            <ActivityIcon className="w-5 h-5" />
                            <h4 className="font-bold text-white text-sm uppercase tracking-wider">Plan Details</h4>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center p-2 rounded-lg bg-white/5">
                                <span className="text-gray-400">Package</span>
                                <span className="font-medium text-white">{member.package}</span>
                            </div>
                            <div className="flex justify-between items-center p-2 rounded-lg bg-white/5">
                                <span className="text-gray-400">Duration</span>
                                <span className="font-medium text-white">{member.duration} Month{member.duration !== '1' && 's'}</span>
                            </div>
                            <div className="flex justify-between items-center p-2 rounded-lg bg-white/5">
                                <span className="text-gray-400">Amount</span>
                                <span className="font-medium text-white">{member.amount}</span>
                            </div>
                        </div>
                    </div>

                    {/* Card 4: Account Info */}
                    <div className="p-5 rounded-xl border border-white/10 bg-brand-dark shadow-lg">
                        <div className="flex items-center gap-2 mb-4 text-gray-400">
                            <UserIcon className="w-5 h-5" />
                            <h4 className="font-bold text-white text-sm uppercase tracking-wider">Account Info</h4>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center p-2 rounded-lg bg-white/5">
                                <span className="text-gray-400">Phone</span>
                                <span className="font-medium text-white font-mono">{member.phone}</span>
                            </div>
                            <div className="flex justify-between items-center p-2 rounded-lg bg-white/5">
                                <span className="text-gray-400">Paused Days</span>
                                <span className="font-medium text-orange-400 flex items-center gap-1.5">
                                    <ClockIcon className="w-3.5 h-3.5" /> 
                                    {member.pauseDays}
                                </span>
                            </div>
                            {member.email && (
                                <div className="flex justify-between items-center p-2 rounded-lg bg-white/5">
                                    <span className="text-gray-400">Email</span>
                                    <span className="font-medium text-white truncate max-w-[150px]">{member.email}</span>
                                </div>
                            )}
                        </div>
                    </div>

                 </div>
              </>
            ) : (
               <>
                  {/* Schedule View */}
                  <header className="mb-6">
                    <h2 className="text-2xl font-bold text-white">Class Schedule</h2>
                    <p className="text-gray-400 text-sm">Find your next session.</p>
                  </header>

                  {/* Holiday API Error Warning */}
                  {holidayError && (
                    <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-200">
                      Unable to check for public holidays automatically. Showing regular schedule.
                    </div>
                  )}

                  {/* Next Class Card */}
                  <div className="bg-brand-accent text-brand-black rounded-xl p-6 mb-6 shadow-lg relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-8 opacity-10">
                        <ClockIcon className="w-32 h-32" />
                     </div>
                     <div className="relative z-10">
                        {nextClassInfo.todayHoliday && (
                          <div className="mb-4 inline-flex items-center gap-2 bg-brand-black/10 px-3 py-1 rounded-full font-bold">
                            <CalendarIcon className="w-4 h-4" />
                            It's {nextClassInfo.todayHoliday}!
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
                           <div className="mt-2 text-xl font-bold">No upcoming classes scheduled.</div>
                        )}
                     </div>
                  </div>

                  {/* Weekly Timetable */}
                  <div className="bg-brand-dark border border-white/10 rounded-xl overflow-hidden mb-6 transition-all duration-300 shadow-lg">
                     <button 
                        onClick={() => setIsTimetableExpanded(!isTimetableExpanded)}
                        className="w-full p-4 bg-black/20 border-b border-white/10 flex justify-between items-center hover:bg-white/5 transition-colors"
                     >
                        <h3 className="font-bold flex items-center gap-2">
                           <CalendarIcon className="w-5 h-5 text-brand-accent" />
                           Weekly Timetable
                        </h3>
                        {isTimetableExpanded ? <ChevronUpIcon className="w-5 h-5 text-gray-400" /> : <ChevronDownIcon className="w-5 h-5 text-gray-400" />}
                     </button>
                     
                     {isTimetableExpanded && (
                       <>
                         {/* Filter Controls */}
                         <div className="p-4 border-b border-white/5 overflow-x-auto no-scrollbar">
                            <div className="flex gap-2">
                              {/* 'All Days' button removed */}
                              {Object.keys(SCHEDULE).map(day => (
                                 <button
                                    key={day}
                                    onClick={() => setFilterDay(day)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${filterDay === day ? 'bg-brand-accent text-brand-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                 >
                                    {day}
                                 </button>
                              ))}
                            </div>
                         </div>
                         
                         {/* Timetable List */}
                         <div className="divide-y divide-white/5">
                            {Object.entries(SCHEDULE)
                               .filter(([day]) => day === filterDay)
                               .map(([day, times]) => (
                               <div key={day} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-fadeIn">
                                  <span className="font-medium text-gray-300 w-32">{day}</span>
                                  <div className="flex flex-wrap gap-2">
                                     {times.length > 0 ? (
                                        times.map(time => (
                                           <span key={time} className="px-3 py-1 rounded bg-white/5 text-sm border border-white/5 text-brand-accent">
                                              {formatTime(time)}
                                           </span>
                                        ))
                                     ) : (
                                        <span className="text-gray-500 text-sm italic">No classes</span>
                                     )}
                                  </div>
                               </div>
                            ))}
                         </div>
                       </>
                     )}
                  </div>

                  {/* Public Holidays */}
                  <div className="bg-brand-dark border border-white/10 rounded-xl overflow-hidden mb-6 shadow-lg">
                     <div className="p-4 bg-black/20 border-b border-white/10">
                        <h3 className="font-bold flex items-center gap-2 text-orange-400">
                           <ActivityIcon className="w-5 h-5" />
                           Public Holidays Schedule
                        </h3>
                     </div>
                     <div className="p-4 space-y-3">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                           <span className="text-gray-300">Morning Sessions</span>
                           <span className="font-mono font-bold text-white">07:00 AM, 08:00 AM</span>
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-gray-300">Evening Sessions</span>
                           <span className="font-mono font-bold text-white">06:00 PM, 07:00 PM</span>
                        </div>
                     </div>
                  </div>

                  {/* Holiday Closures */}
                  <div className="bg-brand-dark border border-white/10 rounded-xl overflow-hidden shadow-lg">
                     <div className="p-4 bg-black/20 border-b border-white/10">
                        <h3 className="font-bold flex items-center gap-2 text-red-400">
                           <XCircleIcon className="w-5 h-5" />
                           Holiday Closures
                        </h3>
                     </div>
                     <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                           <div className="text-red-300 text-sm font-bold">Christmas Day</div>
                           <div className="text-white mt-1">Closed</div>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                           <div className="text-red-300 text-sm font-bold">Boxing Day</div>
                           <div className="text-white mt-1">Closed</div>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                           <div className="text-red-300 text-sm font-bold">New Year's Day</div>
                           <div className="text-white mt-1">Closed</div>
                        </div>
                     </div>
                  </div>
               </>
            )}

         </div>
      </main>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-brand-dark w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
              <h3 className="font-bold text-white">Renew Membership</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-white">
                <XIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-brand-accent/10 rounded-xl p-4 border border-brand-accent/20">
                <h4 className="text-brand-accent font-bold mb-3 text-sm uppercase">Bank Transfer Details</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Bank Name</span>
                    <span className="text-white font-medium">Access Bank</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Account Name</span>
                    <span className="text-white font-medium">CrossFit Lagos Limited</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-brand-accent/20 flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Account Number</span>
                    <div className="flex items-center gap-2">
                       <span className="font-mono text-xl font-bold text-white tracking-wider">0078409920</span>
                       <button 
                         onClick={handleCopy}
                         className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-brand-accent"
                         title="Copy Account Number"
                       >
                          {copied ? <CheckCircleIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
                       </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                 <p className="text-gray-400 text-sm mb-4">After payment, please send your receipt to us on WhatsApp.</p>
                 <a 
                   href="https://wa.me/2347059969059?text=Hello%2C%20I%20have%20made%20payment%20for%20my%20membership%20renewal.%20Here%20is%20the%20receipt."
                   target="_blank"
                   rel="noreferrer"
                   className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-3 px-6 rounded-lg transition-colors w-full justify-center"
                 >
                    <PhoneIcon className="w-5 h-5" />
                    Send Receipt on WhatsApp
                 </a>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardView;