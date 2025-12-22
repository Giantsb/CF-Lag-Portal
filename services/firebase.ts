
// Fixed: Use compat imports to resolve "no exported member" errors for initializeApp, getAnalytics, and logEvent
import firebase from 'firebase/compat/app';
import 'firebase/compat/analytics';

// Safe environment variable access with fallback to non-VITE prefixed names
const getEnv = () => {
  let env: any = {};
  try {
    if ((import.meta as any).env) env = { ...env, ...(import.meta as any).env };
  } catch (e) {}
  try {
    if (typeof process !== 'undefined' && process.env) env = { ...env, ...process.env };
  } catch (e) {}
  return env;
};

const env = getEnv();

// Helper to get variable with or without VITE_ prefix
const getVar = (key: string) => env[`VITE_${key}`] || env[key] || '';

export const firebaseConfig = {
  apiKey: getVar('FIREBASE_API_KEY'),
  authDomain: getVar('FIREBASE_AUTH_DOMAIN'),
  projectId: getVar('FIREBASE_PROJECT_ID'),
  storageBucket: getVar('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getVar('FIREBASE_MESSAGING_SENDER_ID'),
  appId: getVar('FIREBASE_APP_ID'),
  measurementId: getVar('FIREBASE_MEASUREMENT_ID')
};

// Validate config before initializing
const isConfigValid = !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

let app: firebase.app.App | null = null;
let analyticsInstance: firebase.analytics.Analytics | null = null;

if (isConfigValid) {
  try {
    // Initialize Firebase using compat syntax
    app = firebase.initializeApp(firebaseConfig);
    
    // Initialize Analytics only if we are in a browser environment
    if (typeof window !== 'undefined') {
      analyticsInstance = firebase.analytics();
    }
  } catch (err) {
    console.error('Firebase initialization failed:', err);
  }
} else {
  console.warn('Firebase config is incomplete. Analytics and Cloud Messaging are disabled.');
}

export const analytics = analyticsInstance;

/**
 * Helper to log analytics events with error handling
 */
export const logAnalyticsEvent = (eventName: string, eventParams?: any) => {
  try {
    if (analyticsInstance) {
      analyticsInstance.logEvent(eventName, eventParams);
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
 * Utility: Format helpers
 */
export const getEmailFromPhone = (phone: string) => {
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  return `${cleanPhone}@crossfitlagos.app`;
};

export const getPasswordFromPin = (pin: string) => {
  return `${pin}00`;
};
