// src/sw.js

self.addEventListener('push', function (event) {
    const data = event.data ? event.data.json() : {};
    console.log("SW: Push received with data:", data); // LOG 1

    const targetUrl = (data.data && data.data.url) ? data.data.url : '/URL_MISSING';

    const options = {
        body: data.body || "New Message",
        data: { url: targetUrl }
    };

    event.waitUntil(self.registration.showNotification(data.title || "Alert", options));
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    const urlToOpen = event.notification.data.url;

    console.log("SW: Clicked! Attempting to open:", urlToOpen); // LOG 2

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            for (let client of windowClients) {
                if ('focus' in client) {
                    client.navigate(urlToOpen);
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(urlToOpen);
        })
    );
});