
import React, { useState, useEffect, useRef, useCallback } from 'react';
import LoginView from './components/LoginView';
import PinSetupView from './components/PinSetupView';
import DashboardView from './components/DashboardView';
import InstallPrompt from './components/InstallPrompt';
import SplashScreen, { SplashMode } from './components/SplashScreen';
import { ViewState, MemberData } from './types';
import { getMemberByPhone } from './services/membershipService';
import { getCachedMember, setCachedMember, clearCachedMember } from './utils/cache';

const SPLASH_SEEN_KEY = 'hoa_splash_seen';
const LAUNCH_SPLASH_MS = 2250;
const LOGIN_SPLASH_MS = 1350;
const FADE_OUT_MS = 380;

interface SplashState {
  mounted: boolean;
  visible: boolean;
  mode: SplashMode;
  memberName?: string;
  isNewMember?: boolean;
  canSkip: boolean;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const shouldShowLaunchSplash = () => {
  if (typeof window === 'undefined') return false;
  if (prefersReducedMotion()) return false;
  try {
    return sessionStorage.getItem(SPLASH_SEEN_KEY) !== '1';
  } catch {
    return false;
  }
};

function App() {
  const [viewState, setViewState] = useState<ViewState>(ViewState.LOGIN);
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [setupPhone, setSetupPhone] = useState<string>('');
  const [isResetMode, setIsResetMode] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  const initialShowSplash = useRef<boolean>(shouldShowLaunchSplash()).current;
  const [splash, setSplash] = useState<SplashState>({
    mounted: initialShowSplash,
    visible: initialShowSplash,
    mode: 'launch',
    canSkip: false,
  });
  const [launchReadyToDismiss, setLaunchReadyToDismiss] = useState(!initialShowSplash);

  const timersRef = useRef<number[]>([]);
  const splashRunIdRef = useRef(0);

  const clearSplashTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const dismissSplash = useCallback(() => {
    clearSplashTimers();
    splashRunIdRef.current += 1;
    try {
      sessionStorage.setItem(SPLASH_SEEN_KEY, '1');
    } catch {
      // Ignore storage access failures in private browsing
    }

    setSplash((prev) => (prev.mounted ? { ...prev, visible: false, canSkip: false } : prev));
    const unmountTimer = window.setTimeout(() => {
      setSplash((prev) => (prev.visible ? prev : { ...prev, mounted: false }));
    }, FADE_OUT_MS);
    timersRef.current.push(unmountTimer);
  }, [clearSplashTimers]);

  // Initialize Theme
  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = storedTheme || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  // Smart Pacing for Cold Launch Splash
  useEffect(() => {
    if (!initialShowSplash) return;

    const runId = ++splashRunIdRef.current;
    const skipTimer = window.setTimeout(() => {
      if (splashRunIdRef.current !== runId) return;
      setSplash((prev) => ({ ...prev, canSkip: true }));
    }, 700);

    const minRevealTimer = window.setTimeout(() => {
      if (splashRunIdRef.current !== runId) return;
      setLaunchReadyToDismiss(true);
    }, LAUNCH_SPLASH_MS);

    timersRef.current.push(skipTimer, minRevealTimer);

    return () => {
      clearSplashTimers();
    };
  }, [initialShowSplash, clearSplashTimers]);

  // Dismiss launch splash only once both session check & minimum reveal window finish
  useEffect(() => {
    if (splash.mounted && splash.mode === 'launch' && launchReadyToDismiss && !isSessionLoading) {
      dismissSplash();
    }
  }, [splash.mounted, splash.mode, launchReadyToDismiss, isSessionLoading, dismissSplash]);

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

  const triggerLoginTransition = useCallback(
    (member: MemberData, isNewMember = false) => {
      try {
        sessionStorage.setItem(SPLASH_SEEN_KEY, '1');
      } catch {
        // Ignore storage access failures
      }

      if (prefersReducedMotion()) return;

      clearSplashTimers();
      const runId = ++splashRunIdRef.current;

      setSplash({
        mounted: true,
        visible: true,
        mode: 'login',
        memberName: member.firstName,
        isNewMember,
        canSkip: false,
      });

      const skipTimer = window.setTimeout(() => {
        if (splashRunIdRef.current !== runId) return;
        setSplash((prev) => ({ ...prev, canSkip: true }));
      }, 450);

      const finishTimer = window.setTimeout(() => {
        if (splashRunIdRef.current !== runId) return;
        dismissSplash();
      }, LOGIN_SPLASH_MS);

      timersRef.current.push(skipTimer, finishTimer);
    },
    [clearSplashTimers, dismissSplash]
  );

  const handleLoginSuccess = (data: MemberData, portalType: 'member' | 'hmo' = 'member') => {
    localStorage.setItem('hoa_session', JSON.stringify({
       phone: data.phone.replace(/[\s\-\(\)]/g, ''),
       portalType: portalType,
       expiry: new Date().getTime() + (30 * 24 * 60 * 60 * 1000)
    }));
    setCachedMember(data);
    setMemberData(data);
    setViewState(ViewState.DASHBOARD);
    triggerLoginTransition(data, false);
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
    clearSplashTimers();
    splashRunIdRef.current += 1;
    setSplash({
      mounted: false,
      visible: false,
      mode: 'launch',
      canSkip: false,
    });
    localStorage.removeItem('hoa_session');
    clearCachedMember();
    setMemberData(null);
    setSetupPhone('');
    setIsResetMode(false);
    setViewState(ViewState.LOGIN);
  };

  const handleSetupSuccess = (member: MemberData) => {
    const portalType = localStorage.getItem('hoa_portal_type') || 'member';
    const wasReset = isResetMode;

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

    triggerLoginTransition(member, !wasReset);
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

  const handleSplashSkip = () => {
    if (splash.mode === 'launch') {
      setLaunchReadyToDismiss(true);
      if (!isSessionLoading) {
        dismissSplash();
      }
      return;
    }
    dismissSplash();
  };

  return (
    <>
      {isSessionLoading ? (
        <div className="min-h-screen bg-brand-black flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-accent"></div>
        </div>
      ) : (
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
      )}

      {splash.mounted && (
        <SplashScreen
          isVisible={splash.visible}
          mode={splash.mode}
          memberName={splash.memberName}
          isNewMember={splash.isNewMember}
          canSkip={splash.canSkip}
          onSkip={handleSplashSkip}
        />
      )}
    </>
  );
}

export default App;
