
// Fixed: Use compat imports to resolve "no exported member" errors for initializeApp, getAnalytics, and logEvent
import firebase from 'firebase/compat/app';
import 'firebase/compat/analytics';

// Safe environment variable access
const getEnv = () => {
  try {
    if ((import.meta as any).env) return (import.meta as any).env;
  } catch (e) {}
  try {
    if (typeof process !== 'undefined' && process.env) return process.env;
  } catch (e) {}
  return {};
};

const env = getEnv();

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
};

// Fixed: Initialize Firebase using compat syntax to ensure compatibility with the environment
const app = firebase.initializeApp(firebaseConfig);

// Fixed: Initialize Analytics using the compat API
export const analytics = typeof window !== 'undefined' ? firebase.analytics() : null;

/**
 * Helper to log analytics events with error handling
 */
export const logAnalyticsEvent = (eventName: string, eventParams?: any) => {
  try {
    if (analytics) {
      // Fixed: Use compat logEvent method on the analytics instance
      analytics.logEvent(eventName, eventParams);
    }
  } catch (err) {
    console.warn('Analytics log failed:', err);
  }
};

/**
 * Utility: iOS Detection
 */
export const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

/**
 * Utility: PWA Standalone Detection
 */
export const isStandalone = () => {
  return (window.navigator as any).standalone === true || 
         window.matchMedia('(display-mode: standalone)').matches;
};

/**
 * Utility: Format helpers (previously used for Firebase Auth compatibility)
 */
export const getEmailFromPhone = (phone: string) => {
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  return `${cleanPhone}@crossfitlagos.app`;
};

export const getPasswordFromPin = (pin: string) => {
  return `${pin}00`;
};
