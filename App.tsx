
import React, { useState, useEffect } from 'react';
import LoginView from './components/LoginView';
import PinSetupView from './components/PinSetupView';
import DashboardView from './components/DashboardView';
import InstallPrompt from './components/InstallPrompt';
import { ViewState, MemberData } from './types';
import { getMemberByPhone } from './services/membershipService';

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

  // Check for persisted session via LocalStorage
  useEffect(() => {
    const checkSession = async () => {
       const localSession = localStorage.getItem('hoa_session');
       if (localSession) {
          try {
             const session = JSON.parse(localSession);
             if (session.expiry > new Date().getTime()) {
                const member = await getMemberByPhone(session.phone);
                if (member) {
                   setMemberData(member);
                   setViewState(ViewState.DASHBOARD);
                } else {
                   localStorage.removeItem('hoa_session');
                }
             } else {
                localStorage.removeItem('hoa_session');
             }
          } catch (e) {
             localStorage.removeItem('hoa_session');
          }
       }
       setIsSessionLoading(false);
    };

    checkSession();
  }, []);

  const handleLoginSuccess = (data: MemberData) => {
    setMemberData(data);
    setViewState(ViewState.DASHBOARD);
  };

  const handleRequireSetup = (phone: string) => {
    setSetupPhone(phone);
    setIsResetMode(false);
    setViewState(ViewState.SETUP_PIN);
  };

  const handleResetPin = (phone: string) => {
    setSetupPhone(phone);
    setIsResetMode(true);
    setViewState(ViewState.SETUP_PIN);
  };

  const handleLogout = () => {
    localStorage.removeItem('hoa_session');
    setMemberData(null);
    setSetupPhone('');
    setIsResetMode(false);
    setViewState(ViewState.LOGIN);
  };

  const handleSetupSuccess = (member: MemberData) => {
    setMemberData(member);
    setViewState(ViewState.DASHBOARD);
    setSetupPhone('');
    setIsResetMode(false);
    
    localStorage.setItem('hoa_session', JSON.stringify({
       phone: member.phone.replace(/[\s\-\(\)]/g, ''),
       expiry: new Date().getTime() + (30 * 24 * 60 * 60 * 1000)
    }));
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
        />
      )}

      <InstallPrompt />
    </>
  );
}

export default App;
