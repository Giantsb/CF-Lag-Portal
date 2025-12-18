
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { getServiceWorkerUrl, firebaseConfig } from './services/firebase';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

if ('serviceWorker' in navigator) {
  // Only attempt registration if apiKey exists
  if (firebaseConfig.apiKey) {
      const swUrl = getServiceWorkerUrl();

      navigator.serviceWorker.register(swUrl)
        .then(function(registration) {
          console.log('Registration successful, scope is:', registration.scope);
        }).catch(function(err) {
          console.log('Service worker registration failed, error:', err);
        });
  }
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
