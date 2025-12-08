import React, { useState, useEffect } from 'react';
import LoginView from './components/LoginView';
import PinSetupView from './components/PinSetupView';
import DashboardView from './components/DashboardView';
import { ViewState, MemberData } from './types';
import { fetchMemberData } from './services/membershipService';

function App() {
  const [viewState, setViewState] = useState<ViewState>(ViewState.LOGIN);
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [setupPhone, setSetupPhone] = useState<string>('');
  const [isResetMode, setIsResetMode] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  // Check for persisted session on mount
  useEffect(() => {
    const checkSession = async () => {
      const storedSession = localStorage.getItem('hoa_session');
      if (storedSession) {
        try {
          const { phone, pin } = JSON.parse(storedSession);
          if (phone && pin) {
            const result = await fetchMemberData(phone, pin);
            if (result.success && result.member) {
              setMemberData(result.member);
              setViewState(ViewState.DASHBOARD);
            } else {
              // If credentials are no longer valid, clear session
              localStorage.removeItem('hoa_session');
            }
          }
        } catch (e) {
          console.error("Failed to restore session", e);
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

  const handleForgotPassword = (phone: string) => {
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

  switch (viewState) {
    case ViewState.LOGIN:
      return (
        <LoginView 
          onLoginSuccess={handleLoginSuccess} 
          onRequireSetup={handleRequireSetup}
          onForgotPassword={handleForgotPassword}
        />
      );
    case ViewState.SETUP_PIN:
      return (
        <PinSetupView 
          phone={setupPhone}
          onSuccess={handleSetupSuccess}
          onBack={handleSetupBack}
          isReset={isResetMode}
        />
      );
    case ViewState.DASHBOARD:
      if (!memberData) return null;
      return (
        <DashboardView 
          member={memberData} 
          onLogout={handleLogout} 
        />
      );
    default:
      return <div>Unknown Error</div>;
  }
}

export default App;