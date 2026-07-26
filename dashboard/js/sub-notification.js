/**
 * ONFLEX PREMIUM - PUSH NOTIFICATION SUBSCRIPTION ENGINE
 */
document.addEventListener('DOMContentLoaded', async () => {
    const toggleNotifications = document.getElementById('toggleNotifications');
    if (!toggleNotifications) return;

    // Direct production endpoint
    const BACKEND_SETTINGS_URL = "http://localhost:5000/api/notifications";
    const APP_SIGNATURE = "onflex";

    // Hardcoded VAPID Public Key matching the admin implementation
    const VAPID_PUBLIC_KEY = 'BA0Y8SCjnZI0oRFfM8IH4ZY1Hpbh2kmeSVjQNwakIpz0ZndaH6OiuBhNO672CiLKDmCNqicVt4waCxbphGMGXEU';

    // Helper to clear UI safely if exceptions happen
    const revertToggleUI = (state) => {
        toggleNotifications.checked = state;
        localStorage.setItem("notification_active", state ? "true" : "false");
    };

    // Helper to translate core response messages into clear user copy
    const getFriendlyErrorMessage = (errMsg) => {
        if (!errMsg) return "An unexpected error occurred while syncing configuration.";
        const low = errMsg.toLowerCase();
        if (low.includes("expired") || low.includes("unauthorized") || low.includes("token") || low.includes("auth")) {
            return "Your security session has expired. Please log out and back in.";
        }
        if (low.includes("permission")) {
            return "Notification permissions were denied. Please check your browser site settings.";
        }
        return errMsg;
    };

    // 1. Initial State Verification Engine (Syncs LocalStorage & Service Worker)
    async function checkSubscriptionState() {
        const localPersistedState = localStorage.getItem("notification_active");

        if (localPersistedState === null || localPersistedState === "false") {
            localStorage.setItem("notification_active", "false");
            toggleNotifications.checked = false;
        } else {
            toggleNotifications.checked = true;
        }

        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            toggleNotifications.checked = false;
            toggleNotifications.disabled = true;
            localStorage.setItem("notification_active", "false");
            return;
        }

        try {
            const swReady = await Promise.race([
                navigator.serviceWorker.ready,
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout waiting for SW")), 2000))
            ]);

            const subscription = await swReady.pushManager.getSubscription();
            const isSubscribed = !!subscription;
            toggleNotifications.checked = isSubscribed;
            localStorage.setItem("notification_active", isSubscribed ? "true" : "false");
        } catch (err) {
            console.warn("📋 [Notification Setup] SW status evaluation fallback to local context:", err.message);
            toggleNotifications.checked = (localStorage.getItem("notification_active") === "true");
        }
    }

    // Convert Base64 VAPID Key to Array buffer context
    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    // 2. Execution Action Subscriptions Pipeline
    async function handleSubscriptionChange() {
        const shouldEnable = toggleNotifications.checked;
        localStorage.setItem("notification_active", shouldEnable ? "true" : "false");

        Swal.fire({
            title: shouldEnable ? 'Enabling Notifications...' : 'Disabling Notifications...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            Swal.fire({ icon: 'error', title: 'Device Not Supported', text: 'This browser or device does not support push notifications.', confirmButtonColor: '#ef4444' });
            revertToggleUI(false);
            return;
        }

        const rawSession = localStorage.getItem("user_session");
        let userUuid = localStorage.getItem("user_uuid") || localStorage.getItem("uuid");
        let currentToken = localStorage.getItem("user_session_token") || localStorage.getItem("token") || "";

        if (rawSession) {
            try {
                const parsedSession = JSON.parse(rawSession);
                userUuid = parsedSession.uuid || parsedSession.id || parsedSession.user?.id || parsedSession.user?.uuid || userUuid;
                currentToken = parsedSession.token || parsedSession.session_token || parsedSession.user_session_token || currentToken;
            } catch (e) {
                console.error("📋 [Notification Setup] Failed parsing session storage array:", e);
            }
        }

        if (!userUuid || !currentToken) {
            Swal.fire({
                icon: 'error',
                title: 'Session Error',
                text: 'Could not resolve identity parameters. Please re-authenticate.',
                confirmButtonColor: '#ef4444'
            });
            revertToggleUI(!shouldEnable);
            return;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            let systemPayload = {};

            if (shouldEnable) {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    throw new Error("Permission denied. Please enable notifications in your browser.");
                }

                const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                });

                let deviceId = localStorage.getItem('device_id');
                if (!deviceId) {
                    deviceId = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
                    localStorage.setItem('device_id', deviceId);
                }

                const subJson = JSON.parse(JSON.stringify(subscription));

                systemPayload = {
                    action: "subscribe",
                    uuid: userUuid,
                    device_id: deviceId,
                    subscription: subJson,
                    subscribers: subJson,
                    signature: APP_SIGNATURE
                };

            } else {
                const subscription = await registration.pushManager.getSubscription();
                if (subscription) {
                    await subscription.unsubscribe();
                }

                const deviceId = localStorage.getItem('device_id');
                systemPayload = {
                    action: "unsubscribe",
                    uuid: userUuid,
                    device_id: deviceId,
                    signature: APP_SIGNATURE
                };
            }

            const response = await fetch(BACKEND_SETTINGS_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-setting-target": "notifications",
                    "Authorization": `Bearer ${currentToken}`,
                    "x-signature": APP_SIGNATURE
                },
                body: JSON.stringify(systemPayload)
            });

            const syncResult = await response.json();

            if (!response.ok || !syncResult.success) {
                throw new Error(syncResult.error || "Target operational execution routing command returned invalid context.");
            }

            Swal.fire({
                icon: 'success',
                title: shouldEnable ? 'Notifications Active' : 'Notifications Silenced',
                text: shouldEnable ? 'You will now receive transaction updates instantly.' : 'Push notification alerts have been removed.',
                confirmButtonColor: '#0a698f'
            });

        } catch (error) {
            console.error("❌ [Notification Sync Error]:", error);
            revertToggleUI(!shouldEnable);
            Swal.fire({
                icon: 'error',
                title: 'Sync Action Failed',
                text: getFriendlyErrorMessage(error.message),
                confirmButtonColor: '#ef4444'
            });
        }
    }

    if ('serviceWorker' in navigator && 'PushManager' in window) {
        navigator.serviceWorker.register('/sw.js')
            .then(() => {
                return checkSubscriptionState();
            })
            .catch((err) => {
                console.error('❌ [Notification System] Service Worker registration crashed:', err);
                toggleNotifications.checked = (localStorage.getItem("notification_active") === "true");
            });
    } else {
        await checkSubscriptionState();
    }

    toggleNotifications.addEventListener('change', handleSubscriptionChange);
});