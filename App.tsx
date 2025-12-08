import React, { useState, useEffect } from 'react';
import LoginView from './components/LoginView';
import PinSetupView from './components/PinSetupView';
import DashboardView from './components/DashboardView';
import { ViewState, MemberData } from './types';
import { getMemberByPhone } from './services/membershipService';
import { auth, onAuthStateChanged, signOut } from './services/firebase';

function App() {
  const [viewState, setViewState] = useState<ViewState>(ViewState.LOGIN);
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [setupPhone, setSetupPhone] = useState<string>('');
  const [isResetMode, setIsResetMode] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  // Check for persisted session via Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        // User is signed in, fetch their member data
        try {
          // Extract phone from synthetic email (phone@crossfitlagos.app)
          const phone = user.email.split('@')[0];
          const member = await getMemberByPhone(phone);
          
          if (member) {
            setMemberData(member);
            setViewState(ViewState.DASHBOARD);
          } else {
            // User authenticated but not found in Sheet (rare edge case)
            console.error('User authenticated but not found in records');
            // Optional: signOut(auth);
            setViewState(ViewState.LOGIN);
          }
        } catch (e) {
          console.error("Failed to fetch member data for auth user", e);
          setViewState(ViewState.LOGIN);
        }
      } else {
        // User is signed out
        setMemberData(null);
        setViewState(ViewState.LOGIN);
      }
      setIsSessionLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setMemberData(null);
      setSetupPhone('');
      setIsResetMode(false);
      setViewState(ViewState.LOGIN);
    } catch (error) {
      console.error("Logout failed", error);
    }
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