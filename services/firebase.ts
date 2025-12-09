import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
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

// Fix: Cast import.meta to any to avoid TypeScript error about 'env' property
const env = (import.meta as any).env;

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
  return `${pin}00`; // Append 00 to meet length requirement transparently
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

// Messaging Wrappers
export const requestForToken = async () => {
  if (!messaging) return null;
  try {
    // Check if notification permission is granted
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return null;
      }
    }

    const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (currentToken) {
      console.log('FCM Token:', currentToken);
      return currentToken;
    } else {
      console.log('No registration token available.');
      return null;
    }
  } catch (err) {
    console.log('An error occurred while retrieving token. ', err);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (messaging) {
      onMessage(messaging, (payload) => {
        resolve(payload);
      });
    }
  });

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
  doc,
  setDoc,
  getDoc
};