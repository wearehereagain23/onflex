/**
 * ONFLEX PREMIUM - CORE SERVICE WORKER PIPELINE
 */

// Listen for background push event dispatches from the Web-Push server matrix
self.addEventListener('push', (event) => {
    let payload = {
        title: "OnFlex Premium Alert",
        body: "A new transaction or profile action occurred on your account.",
        icon: "/icon-512.png",
        badge: "/icon-512.png",
        url: "/"
    };

    if (event.data) {
        try {
            payload = event.data.json();
        } catch (e) {
            payload.body = event.data.text();
        }
    }

    const options = {
        body: payload.body,
        icon: payload.icon || "/icon-512.png",
        badge: payload.badge || "/icon-512.png",
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            url: payload.url || "/"
        }
    };

    event.waitUntil(
        self.registration.showNotification(payload.title, options)
    );
});

// Handle user clicking the visible notification window banner
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let client of windowClients) {
                if (client.url.includes(targetUrl) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});