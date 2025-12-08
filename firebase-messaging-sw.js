importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
firebase.initializeApp({
  apiKey: "AIzaSyDQDQPEtuwaidKkPY2dAVJmOfsF9HsnAtg",
  authDomain: "crossfit-lagos.firebaseapp.com",
  projectId: "crossfit-lagos",
  storageBucket: "crossfit-lagos.firebasestorage.app",
  messagingSenderId: "223587202820",
  appId: "1:223587202820:web:b153b48501ee447a480251"
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png' // You might want to update this to a valid icon path
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});