/**
 * src/admin/profile/account/allow_notification.js
 * Express Backend Interfaced Push Notification Activation Handler
 */
async function initAdminNotification(buttonId) {
    const CONFIG_BTN = document.getElementById(buttonId);
    const VAPID_PUBLIC_KEY = 'BA0Y8SCjnZI0oRFfM8IH4ZY1Hpbh2kmeSVjQNwakIpz0ZndaH6OiuBhNO672CiLKDmCNqicVt4waCxbphGMGXEU';

    if (!CONFIG_BTN) return;

    const setLocalStatus = (s) => localStorage.setItem('is_admin_subscribed', s ? 'true' : 'false');
    const getLocalStatus = () => localStorage.getItem('is_admin_subscribed') === 'true';

    const updateBtnUI = (isEnabled) => {
        CONFIG_BTN.innerHTML = isEnabled ? "Disable Admin Notification 🔕" : "Enable Admin Notification 🔔";
        CONFIG_BTN.className = isEnabled ? "btn btn-danger mb-4 w-100" : "btn btn-primary mb-4 w-100";
    };

    const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
    };

    // Ensure Service Worker is registered
    const getActiveServiceWorker = async () => {
        if (!('serviceWorker' in navigator)) {
            throw new Error("Push Notifications are not supported in this browser.");
        }
        let reg = await navigator.serviceWorker.getRegistration('/');
        if (!reg) {
            reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        }
        return await navigator.serviceWorker.ready;
    };

    // Sync UI on initial load
    updateBtnUI(getLocalStatus());

    CONFIG_BTN.onclick = async () => {
        const token = localStorage.getItem("admin_session_token") || localStorage.getItem("token");

        if (!token) {
            return Swal.fire({
                icon: "error",
                title: "Unauthorized",
                text: "Admin session token missing. Please re-authenticate.",
                background: '#0C290F',
                color: '#fff'
            });
        }

        try {
            // 1. Request browser notification permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                return Swal.fire({
                    title: "Permission Denied",
                    text: "Please allow notifications in your browser settings.",
                    icon: "warning",
                    background: '#0C290F',
                    color: '#fff'
                });
            }

            // 2. Obtain Service Worker registration instance
            const registration = await getActiveServiceWorker();
            const currentSub = await registration.pushManager.getSubscription();

            if (currentSub) {
                // --- UNSUBSCRIBE FLOW ---
                await currentSub.unsubscribe();
                const dId = localStorage.getItem('admin_device_id');

                const response = await fetch("https://api-v2-red.vercel.app/api/notifications", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        action: "unsubscribe",
                        device_id: dId
                    })
                });

                const resData = await response.json();
                if (!response.ok || !resData.success) {
                    throw new Error(resData.error || "Failed to remove subscription from backend server.");
                }

                setLocalStatus(false);
                updateBtnUI(false);
                Swal.fire({ title: "Disabled", icon: "success", background: '#0C290F', color: '#fff' });

            } else {
                // --- SUBSCRIBE FLOW ---
                const sub = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                });

                let uniqueId = localStorage.getItem('admin_device_id') || 'admin_node_' + Math.random().toString(36).substring(2, 11);
                localStorage.setItem('admin_device_id', uniqueId);

                const response = await fetch("https://api-v2-red.vercel.app/api/notifications", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        action: "subscribe",
                        uuid: "1", // Admin reference identity target
                        device_id: uniqueId,
                        subscription: JSON.parse(JSON.stringify(sub))
                    })
                });

                const resData = await response.json();
                if (!response.ok || !resData.success) {
                    throw new Error(resData.error || "Failed to record subscription on backend server.");
                }

                setLocalStatus(true);
                updateBtnUI(true);
                Swal.fire({ title: "Enabled!", icon: "success", background: '#0C290F', color: '#fff' });
            }
        } catch (err) {
            console.error("Subscription Execution Error:", err);
            Swal.fire({
                title: "Error",
                text: err.message || "Failed to process notification status update.",
                icon: "error",
                background: '#0C290F',
                color: '#fff'
            });
        }
    };
}

window.initAdminNotification = initAdminNotification;