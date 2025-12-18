
/* eslint-disable no-restricted-globals */
/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

console.log('[SW] Service Worker loading...');

// Initialize the Firebase app in the service worker by passing in the config
// from the URL query parameters.
const urlParams = new URLSearchParams(self.location.search);
const configString = urlParams.get('firebaseConfig');

if (configString) {
  try {
    const firebaseConfig = JSON.parse(decodeURIComponent(configString));
    console.log('[SW] Parsed Firebase Config successfully');
    
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log('[SW] Received background message ', payload);
      const notificationTitle = payload.notification.title || 'CrossFit Lagos';
      const notificationOptions = {
        body: payload.notification.body || 'New update from the gym!',
        icon: '/cfl-icon-190.png',
        badge: '/cfl-icon-190.png',
        data: payload.data
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });

    console.log('[SW] Firebase Messaging initialized');
  } catch (e) {
    console.error('[SW] Failed to parse or initialize Firebase in SW:', e);
  }
} else {
  console.warn('[SW] No firebaseConfig found in URL. Background notifications may not work.');
}

self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked:', event.notification.title);
  event.notification.close();
  
  const urlToOpen = event.notification.data?.link || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(windowClients) {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('install', () => {
  console.log('[SW] Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  console.log('[SW] Service Worker activated');
});
