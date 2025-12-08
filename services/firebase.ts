import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDQDQPEtuwaidKkPY2dAVJmOfsF9HsnAtg",
  authDomain: "crossfit-lagos.firebaseapp.com",
  projectId: "crossfit-lagos",
  storageBucket: "crossfit-lagos.firebasestorage.app",
  messagingSenderId: "223587202820",
  appId: "1:223587202820:web:b153b48501ee447a480251"
};

// VAPID Key provided
const VAPID_KEY = "BKYrzCjx5Q3yKcqxkHzaEr7a17gT5-P2bWLDSbrEw3yrck_kEmHq1GESTaWlIttYhQCDev1QcWUyW77NcBIwNsM";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const requestForToken = async () => {
  try {
    const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (currentToken) {
      console.log('FCM Token:', currentToken);
      // In a real app, you would send this token to your backend (Google Sheet/Script)
      // to associate it with the user's phone number.
      return currentToken;
    } else {
      console.log('No registration token available. Request permission to generate one.');
      return null;
    }
  } catch (err) {
    console.log('An error occurred while retrieving token. ', err);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });

export { messaging };
