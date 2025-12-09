importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the config
// from the URL query parameters (passed from index.tsx).
const urlParams = new URLSearchParams(self.location.search);
const configString = urlParams.get('firebaseConfig');

if (configString) {
  try {
    const firebaseConfig = JSON.parse(decodeURIComponent(configString));
    
    firebase.initializeApp(firebaseConfig);

    // Retrieve an instance of Firebase Messaging so that it can handle background messages.
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Received background message ', payload);
      // Customize notification here
      const notificationTitle = payload.notification.title;
      const notificationOptions = {
        body: payload.notification.body,
        icon: '/cfl-icon-190.png'
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  } catch (e) {
    console.error('Failed to parse firebase config in SW', e);
  }
} else {
  console.warn('No firebaseConfig found in Service Worker URL parameters.');
}

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  // Open the app URL or the specific link sent from backend
  const urlToOpen = event.notification.data?.fcm_options?.link || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(windowClients) {
      // If a window is already open, focus it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});