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

  // Check for persisted session via Firebase Auth AND LocalStorage (Fallback)
  useEffect(() => {
    // 1. Check LocalStorage (Fallback for when Firebase Password mismatch occurs due to reset)
    const checkLocalSession = async () => {
       const localSession = localStorage.getItem('hoa_session');
       if (localSession) {
          try {
             const session = JSON.parse(localSession);
             if (session.expiry > new Date().getTime()) {
                const member = await getMemberByPhone(session.phone);
                if (member) {
                   setMemberData(member);
                   setViewState(ViewState.DASHBOARD);
                   setIsSessionLoading(false);
                   return true;
                }
             } else {
                localStorage.removeItem('hoa_session');
             }
          } catch (e) {
             localStorage.removeItem('hoa_session');
          }
       }
       return false;
    };

    // 2. Firebase Listener
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // If we already loaded from local storage, don't overwrite with null from Firebase init
      const hasLocalSession = await checkLocalSession();
      if (hasLocalSession) return;

      if (user && user.email) {
        // User is signed in via Firebase
        try {
          const phone = user.email.split('@')[0];
          const member = await getMemberByPhone(phone);
          
          if (member) {
            setMemberData(member);
            setViewState(ViewState.DASHBOARD);
          } else {
            console.error('User authenticated but not found in records');
            setViewState(ViewState.LOGIN);
          }
        } catch (e) {
          console.error("Failed to fetch member data for auth user", e);
          setViewState(ViewState.LOGIN);
        }
      } else {
        // User is signed out in Firebase, and we already checked LocalStorage above
        // So we stay at Login
        setMemberData(null);
        setViewState(ViewState.LOGIN);
      }
      setIsSessionLoading(false);
    });

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
      localStorage.removeItem('hoa_session'); // Clear fallback session
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
    
    // Set fallback session just in case, since we can't update Firebase password easily
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