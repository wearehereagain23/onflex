// sw.js

// Install and cache some files
self.addEventListener("install", (event) => {
    self.skipWaiting(); // Activate immediately
    console.log("Service Worker installing…");
    event.waitUntil(
        caches.open("v1").then((cache) => {
            return cache.addAll([
                "/",
                "/register.html",
                "/login.html",
                "/manifest.json"
            ]);
        })
    );
    self.skipWaiting();
});



self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            if (self.registration.navigationPreload) {
                await self.registration.navigationPreload.enable();
            }
            // Clear old caches if any
            const keys = await caches.keys();
            await Promise.all(keys.map(key => caches.delete(key)));
        })()
    );
    console.log("Service Worker activated.");
    self.clients.claim(); // Take control of clients without reload
});

// Fetch (basic cache-first strategy)
self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((resp) => {
            return resp || fetch(event.request);
        })
    );
});

// ✅ Handle Push Events
self.addEventListener("push", (event) => {
    console.log("Push received:", event);

    let data = {};
    try {
        data = event.data.json(); // Expect JSON payload
    } catch (e) {
        data = { title: "📢 New Notification", body: event.data.text() };
    }

    const title = data.title || "📢 Default Title";
    const options = {
        body: data.body || "This is a default message.",
        icon: data.icon || "/icon-192.png",
        badge: data.badge || "/icon-192.png",
        tag: data.tag || "general-notification",
        renotify: true // replaces old if same tag
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// ✅ Handle Notification Click
self.addEventListener("notificationclick", (event) => {
    console.log("Notification click received.");
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
            // Reuse open tab if available
            for (const client of clientList) {
                if (client.url.includes("/") && "focus" in client) {
                    return client.focus();
                }
            }
            // Otherwise open new
            if (clients.openWindow) {
                return clients.openWindow("/");
            }
        })
    );
});
