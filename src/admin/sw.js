// src/sw.js

// 1. FORCE IMMEDIATE ACTIVATION (Critical for iOS PWA)
self.addEventListener('install', (event) => {
    // Force the new SW to become active immediately
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Ensure the SW takes control of the PWA immediately without a refresh
    event.waitUntil(clients.claim());
    console.log("SW: Activated and claiming clients.");
});

// 2. PUSH RECEIVER
self.addEventListener('push', function (event) {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        data = { title: "Alert", body: event.data.text() };
    }

    console.log("SW: Push received:", data);

    const targetUrl = (data.data && data.data.url) ? data.data.url : '/';

    const options = {
        body: data.body || "New update available",
        icon: '/icon-512.png', // Add your icon path here
        badge: '/icon-512.png',
        data: { url: targetUrl },
        // iOS specific: usually requires interaction for notifications to show
        vibrate: [100, 50, 100]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || "Notification", options)
    );
});

// 3. NOTIFICATION CLICK HANDLER
self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    const urlToOpen = event.notification.data.url || '/';

    console.log("SW: Clicked! Target:", urlToOpen);

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            // Check if app window is already open
            for (let client of windowClients) {
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not open, open a new window
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});