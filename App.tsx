
import React, { useState, useEffect } from 'react';
import LoginView from './components/LoginView';
import PinSetupView from './components/PinSetupView';
import DashboardView from './components/DashboardView';
import InstallPrompt from './components/InstallPrompt';
import { ViewState, MemberData } from './types';
import { getMemberByPhone } from './services/membershipService';
import { getCachedMember, setCachedMember, clearCachedMember } from './utils/cache';

function App() {
  const [viewState, setViewState] = useState<ViewState>(ViewState.LOGIN);
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [setupPhone, setSetupPhone] = useState<string>('');
  const [isResetMode, setIsResetMode] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  // Initialize Theme
  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = storedTheme || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  // Check for persisted session via LocalStorage with instant cache hydration & background fetch
  useEffect(() => {
    const checkSession = async () => {
      const localSession = localStorage.getItem('hoa_session');
      if (!localSession) {
        setIsSessionLoading(false);
        return;
      }

      try {
        const session = JSON.parse(localSession);
        const portalType = session.portalType || 'member';

        if (session.expiry <= new Date().getTime()) {
          localStorage.removeItem('hoa_session');
          clearCachedMember();
          setIsSessionLoading(false);
          return;
        }

        // 1. Instant Cache Hydration: If cached member data exists, display immediately!
        const cached = getCachedMember(session.phone);
        let hasDisplayedFromCache = false;
        if (cached && cached.data) {
          setMemberData(cached.data);
          setViewState(ViewState.DASHBOARD);
          setIsSessionLoading(false);
          hasDisplayedFromCache = true;
        }

        // 2. Background Revalidation: Fetch fresh member data asynchronously
        try {
          const freshMember = await getMemberByPhone(session.phone, portalType);
          if (freshMember) {
            setMemberData(freshMember);
            setCachedMember(freshMember);
            setViewState(ViewState.DASHBOARD);
          } else if (!hasDisplayedFromCache) {
            // Only clear session if we have no cached profile and the backend says not found
            localStorage.removeItem('hoa_session');
            clearCachedMember();
          }
        } catch (fetchErr) {
          console.warn('[App] Background session revalidation failed (offline/slow network):', fetchErr);
          // If we already displayed from cache, preserve their session and view!
        }
      } catch (e) {
        console.error('[App] Failed to parse session:', e);
        localStorage.removeItem('hoa_session');
      } finally {
        setIsSessionLoading(false);
      }
    };

    checkSession();
  }, []);

  const handleLoginSuccess = (data: MemberData, portalType: 'member' | 'hmo' = 'member') => {
    localStorage.setItem('hoa_session', JSON.stringify({
       phone: data.phone.replace(/[\s\-\(\)]/g, ''),
       portalType: portalType,
       expiry: new Date().getTime() + (30 * 24 * 60 * 60 * 1000)
    }));
    setCachedMember(data);
    setMemberData(data);
    setViewState(ViewState.DASHBOARD);
  };

  const handleRequireSetup = (phone: string, portalType: 'member' | 'hmo' = 'member') => {
    setSetupPhone(phone);
    setIsResetMode(false);
    setViewState(ViewState.SETUP_PIN);
    localStorage.setItem('hoa_portal_type', portalType);
  };

  const handleResetPin = (phone: string, portalType: 'member' | 'hmo' = 'member') => {
    setSetupPhone(phone);
    setIsResetMode(true);
    setViewState(ViewState.SETUP_PIN);
    localStorage.setItem('hoa_portal_type', portalType);
  };

  const handleLogout = () => {
    localStorage.removeItem('hoa_session');
    clearCachedMember();
    setMemberData(null);
    setSetupPhone('');
    setIsResetMode(false);
    setViewState(ViewState.LOGIN);
  };

  const handleSetupSuccess = (member: MemberData) => {
    const portalType = localStorage.getItem('hoa_portal_type') || 'member';
    
    setCachedMember(member);
    setMemberData(member);
    setViewState(ViewState.DASHBOARD);
    setSetupPhone('');
    setIsResetMode(false);
    
    localStorage.setItem('hoa_session', JSON.stringify({
       phone: member.phone.replace(/[\s\-\(\)]/g, ''),
       portalType: portalType,
       expiry: new Date().getTime() + (30 * 24 * 60 * 60 * 1000)
    }));
    
    // Clean up temporary portal type
    localStorage.removeItem('hoa_portal_type');
  };

  const handleUpdateMemberData = (updated: MemberData) => {
    setMemberData(updated);
    setCachedMember(updated);
  };

  const handleSetupBack = () => {
    setViewState(ViewState.LOGIN);
    setSetupPhone('');
    setIsResetMode(false);
  };

  if (isSessionLoading) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-accent"></div>
      </div>
    );
  }

  return (
    <>
      {viewState === ViewState.LOGIN && (
        <LoginView 
          onSuccess={handleLoginSuccess} 
          onRequireSetup={handleRequireSetup}
          onResetPin={handleResetPin}
        />
      )}
      
      {viewState === ViewState.SETUP_PIN && (
        <PinSetupView 
          phone={setupPhone}
          onSuccess={handleSetupSuccess}
          onBack={handleSetupBack}
          isReset={isResetMode}
        />
      )}
      
      {viewState === ViewState.DASHBOARD && memberData && (
        <DashboardView 
          member={memberData} 
          onLogout={handleLogout} 
          onUpdateMemberData={handleUpdateMemberData}
        />
      )}

      <InstallPrompt />
    </>
  );
}

export default App;
