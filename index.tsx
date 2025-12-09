import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

if ('serviceWorker' in navigator) {
  // Pass Firebase config to Service Worker via URL parameters
  // This avoids hardcoding secrets in the static service worker file
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

  const swUrl = `./firebase-messaging-sw.js?firebaseConfig=${encodeURIComponent(JSON.stringify(firebaseConfig))}`;

  navigator.serviceWorker.register(swUrl)
    .then(function(registration) {
      console.log('Registration successful, scope is:', registration.scope);
    }).catch(function(err) {
      console.log('Service worker registration failed, error:', err);
    });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);