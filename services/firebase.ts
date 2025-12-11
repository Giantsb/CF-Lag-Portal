import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updatePassword 
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc 
} from "firebase/firestore";
import { 
  getMessaging, 
  getToken, 
  onMessage 
} from "firebase/messaging";
import {
  getAnalytics,
  logEvent
} from "firebase/analytics";
import { SCRIPT_URL } from '../constants';

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

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
};

const VAPID_KEY = env.VITE_FIREBASE_VAPID_KEY;
const APPS_SCRIPT_URL = SCRIPT_URL; // Using constant SCRIPT_URL

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Analytics Initialization
let analytics = null;
try {
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
  }
} catch (err) {
  console.error('Analytics failed to init', err);
}

// Messaging initialization requires handling browser compatibility
let messaging = null;
try {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        messaging = getMessaging(app);
    }
} catch (err) {
    console.error('Messaging failed to init', err);
}

// Helper to construct synthetic email from phone
export const getEmailFromPhone = (phone: string) => {
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  return `${cleanPhone}@crossfitlagos.app`;
};

// Helper to construct password from PIN (Firebase requires 6 chars min)
export const getPasswordFromPin = (pin: string) => {
  return `${pin}00`;
};

// Analytics Helper
export const logAnalyticsEvent = (eventName: string, params?: any) => {
  if (analytics) {
    try {
      logEvent(analytics, eventName, params);
    } catch (e) {
      console.warn('Failed to log analytics event', e);
    }
  }
};

// iOS Detection
const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

const isStandalone = () => {
  return (window.navigator as any).standalone === true || 
         window.matchMedia('(display-mode: standalone)').matches;
};

// Save token to Google Sheets via Apps Script
const saveTokenToBackend = async (token: string, phone: string): Promise<boolean> => {
  if (!APPS_SCRIPT_URL) {
    console.error('APPS_SCRIPT_URL not configured');
    return false;
  }

  try {
    console.log('Saving token to backend for phone:', phone);
    
    // Try standard fetch first (for updated backend scripts that handle CORS)
    try {
        const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8', 
        },
        body: JSON.stringify({
            action: 'saveFCMToken',
            phone: phone,
            fcmToken: token
        })
        });

        if (response.ok) {
             const result = await response.json();
             if (result.success) return true;
        }
    } catch (e) {
        console.warn('Standard fetch failed, trying no-cors fallback', e);
    }

    // Fallback to no-cors (fire and forget)
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'saveFCMToken',
        phone: phone,
        fcmToken: token
      })
    });

    return true;
  } catch (error) {
    console.error('Error saving token to backend:', error);
    return false;
  }
};

// Main token request function with iOS fixes
export const requestForToken = async (userPhone?: string): Promise<string | null> => {
  if (!messaging) {
    console.log('Firebase Messaging is not initialized or supported in this browser.');
    return null;
  }

  if (!VAPID_KEY) {
    console.error('VAPID_KEY is missing from environment variables. Cannot request token.');
    return null;
  }

  // iOS PWA Check
  if (isIOS() && !isStandalone()) {
    console.log('⚠️ iOS detected but not running as PWA. Please add to home screen first.');
    return null;
  }

  try {
    // Step 1: Request notification permission
    if (Notification.permission !== 'granted') {
      console.log('Requesting notification permission...');
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        console.log('Notification permission denied by user');
        return null;
      }
      console.log('✅ Notification permission granted');
    }

    // Step 2: Wait for service worker with retry logic (iOS needs this)
    let registration;
    try {
      console.log('Waiting for service worker registration...');
      
      // iOS PWA may need extra time for service worker activation
      if (isIOS()) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<ServiceWorkerRegistration>((_, reject) => 
          setTimeout(() => reject(new Error('Service worker timeout after 10s')), 10000)
        )
      ]);

      console.log('✅ Service worker ready:', registration.active?.state);
    } catch (swError) {
      console.error('Service worker not ready:', swError);
      
      // Attempt manual registration as fallback
      try {
        console.log('Attempting manual service worker registration...');
        registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        await navigator.serviceWorker.ready;
        console.log('✅ Service worker manually registered');
      } catch (regError) {
        console.error('Failed to register service worker:', regError);
        return null;
      }
    }

    if (!registration || !registration.active) {
      console.error('No active service worker found after registration');
      return null;
    }

    // Step 3: Get FCM token
    console.log('Requesting FCM token...');
    const currentToken = await getToken(messaging, { 
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration 
    });

    if (currentToken) {
      console.log('✅ FCM Token obtained:', currentToken.substring(0, 20) + '...');
      
      // Step 4: Save token to backend (CRITICAL FIX)
      const phone = userPhone || localStorage.getItem('userPhone');
      if (phone) {
        const saved = await saveTokenToBackend(currentToken, phone);
        if (saved) {
          // Store token locally as backup
          localStorage.setItem('fcmToken', currentToken);
          console.log('✅ Token saved to backend and localStorage');
        } else {
          console.warn('⚠️ Token obtained but failed to save to backend');
        }
      } else {
        console.warn('⚠️ No phone number available to associate with token');
        console.warn('Pass userPhone parameter or set localStorage.userPhone');
      }
      
      return currentToken;
    } else {
      console.log('❌ No registration token available. Check:');
      console.log('  - VAPID key is correct');
      console.log('  - Service worker is properly configured');
      console.log('  - Firebase project has Web Push certificates');
      return null;
    }
  } catch (err) {
    console.error('❌ Error retrieving token:', err);
    
    // iOS-specific error handling
    if (isIOS()) {
      console.log('iOS Troubleshooting:');
      console.log('  1. Ensure iOS 16.4 or later');
      console.log('  2. App must be added to home screen');
      console.log('  3. Must be opened from home screen icon');
      console.log('  4. Check if service worker is registered in Settings > Safari > Advanced');
    }
    
    return null;
  }
};

// Listener for foreground messages
export const onMessageListener = () =>
  new Promise((resolve) => {
    if (messaging) {
      onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);
        resolve(payload);
      });
    } else {
      console.warn('Messaging not initialized, cannot listen for messages');
    }
  });

// Helper to check if notifications are supported and enabled
export const checkNotificationSupport = () => {
  const support = {
    supported: 'Notification' in window,
    serviceWorkerSupported: 'serviceWorker' in navigator,
    permission: Notification?.permission || 'default',
    isIOS: isIOS(),
    isStandalone: isStandalone(),
    messagingInitialized: messaging !== null
  };

  console.log('Notification Support Check:', support);
  return support;
};

// Export instances and modular functions directly
export { 
  app, 
  auth, 
  db, 
  messaging,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  doc,
  setDoc,
  getDoc,
  isIOS,
  isStandalone
};