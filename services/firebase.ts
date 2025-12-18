
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
import { getAnalytics, logEvent } from "firebase/analytics";
import { SCRIPT_URL } from '../constants';

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

const VAPID_KEY = env.VITE_FIREBASE_VAPID_KEY;
const APPS_SCRIPT_URL = SCRIPT_URL;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let analytics: any = null;
try {
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
  }
} catch (err) {
  console.error('Analytics failed to init', err);
}

let messaging: any = null;
try {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        messaging = getMessaging(app);
    }
} catch (err) {
    console.error('Messaging failed to init', err);
}

export const getServiceWorkerUrl = () => {
  if (!firebaseConfig.apiKey) return '/firebase-messaging-sw.js';
  return `/firebase-messaging-sw.js?firebaseConfig=${encodeURIComponent(JSON.stringify(firebaseConfig))}`;
};

export const getEmailFromPhone = (phone: string) => {
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  return `${cleanPhone}@crossfitlagos.app`;
};

export const getPasswordFromPin = (pin: string) => {
  return `${pin}00`;
};

export const logAnalyticsEvent = (eventName: string, params?: any) => {
  if (analytics) {
    try {
      logEvent(analytics, eventName, params);
    } catch (e) {
      console.warn('Failed to log analytics event', e);
    }
  }
};

const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

const isStandalone = () => {
  return (window.navigator as any).standalone === true || 
         window.matchMedia('(display-mode: standalone)').matches;
};

const saveTokenToBackend = async (token: string, phone: string): Promise<boolean> => {
  if (!APPS_SCRIPT_URL) return false;
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'saveFCMToken',
        phone: phone,
        fcmToken: token
      })
    });
    return true;
  } catch (error) {
    console.error('Error saving token:', error);
    return false;
  }
};

export const requestForToken = async (userPhone?: string): Promise<string | null> => {
  if (!messaging || !('serviceWorker' in navigator)) {
    console.error('Messaging or ServiceWorker not supported');
    return null;
  }
  
  if (!VAPID_KEY) {
    console.error('VAPID_KEY is missing');
    return null;
  }

  if (isIOS() && !isStandalone()) {
    console.warn('iOS notifications require standalone mode');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const swUrl = getServiceWorkerUrl();
    console.log('FCM: Attempting to get registration for:', swUrl);

    // Use a race to avoid 10s timeout hanging the UI
    const registration = await Promise.race([
      (async () => {
        let reg = await navigator.serviceWorker.getRegistration(swUrl);
        if (!reg) {
          console.log('FCM: No registration found, registering new...');
          reg = await navigator.serviceWorker.register(swUrl);
        }
        
        // Ensure the service worker is active before proceeding
        if (reg.installing) {
           console.log('FCM: Service worker installing...');
           await new Promise((resolve) => {
             reg!.installing?.addEventListener('statechange', (e: any) => {
               if (e.target.state === 'activated') resolve(true);
             });
           });
        }
        
        // Wait for ready state with the specific registration
        return reg;
      })(),
      new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Service worker registration timed out after 8s')), 8000)
      )
    ]);

    if (!registration) {
      console.error('FCM: Registration failed or timed out');
      return null;
    }

    const currentToken = await getToken(messaging, { 
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration 
    });

    if (currentToken) {
      const phone = userPhone || localStorage.getItem('userPhone');
      if (phone) {
        await saveTokenToBackend(currentToken, phone);
        localStorage.setItem('fcmToken', currentToken);
      }
      return currentToken;
    }
    return null;
  } catch (err) {
    console.error('FCM: Error retrieving token:', err);
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

export const checkNotificationSupport = () => ({
  supported: 'Notification' in window,
  serviceWorkerSupported: 'serviceWorker' in navigator,
  permission: Notification?.permission || 'default',
  isIOS: isIOS(),
  isStandalone: isStandalone(),
  messagingInitialized: messaging !== null
});

export { 
  app, auth, db, messaging,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword,
  doc, setDoc, getDoc, isIOS, isStandalone
};
