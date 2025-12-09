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

const firebaseConfig = {
  apiKey: "AIzaSyDQDQPEtuwaidKkPY2dAVJmOfsF9HsnAtg",
  authDomain: "crossfit-lagos.firebaseapp.com",
  projectId: "crossfit-lagos",
  storageBucket: "crossfit-lagos.firebasestorage.app",
  messagingSenderId: "223587202820",
  appId: "1:223587202820:web:b153b48501ee447a480251",
  measurementId: "G-92Z38CF9FL" // Optional: Add if you have a specific measurement ID
};

const VAPID_KEY = "BKYrzCjx5Q3yKcqxkHzaEr7a17gT5-P2bWLDSbrEw3yrck_kEmHq1GESTaWlIttYhQCDev1QcWUyW77NcBIwNsM";

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