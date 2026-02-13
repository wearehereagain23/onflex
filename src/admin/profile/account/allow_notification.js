/**
 * src/admin/profile/account/allow_notification.js
 * REWRITTEN: Using Direct Admin Table ID (id: 1) and Local Persistence
 */
async function initAdminNotification(buttonId) {
    const adminDb = window.supabase;

    if (!adminDb) {
        console.error("Supabase global instance not found.");
        return;
    }

    const CONFIG_BTN = document.getElementById(buttonId);
    const VAPID_PUBLIC_KEY = 'BA0Y8SCjnZI0oRFfM8IH4ZY1Hpbh2kmeSVjQNwakIpz0ZndaH6OiuBhNO672CiLKDmCNqicVt4waCxbphGMGXEU';

    if (!CONFIG_BTN) return;

    /**
     * --- LOCAL STORAGE HELPERS ---
     * We use these to check state without DB calls
     */
    const setLocalSubscriptionStatus = (status) => {
        localStorage.setItem('is_admin_subscribed', status ? 'true' : 'false');
    };

    const getLocalSubscriptionStatus = () => {
        return localStorage.getItem('is_admin_subscribed') === 'true';
    };

    const updateBtnUI = (isEnabled) => {
        if (isEnabled) {
            CONFIG_BTN.innerHTML = "Disable Admin Notification 🔕";
            CONFIG_BTN.className = "btn btn-danger mb-4 w-100";
        } else {
            CONFIG_BTN.innerHTML = "Enable Admin Notification 🔔";
            CONFIG_BTN.className = "btn btn-primary mb-4 w-100";
        }
    };

    const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    };

    /**
     * --- INITIAL STATE CHECK ---
     * Priority 1: Check LocalStorage for instant UI
     * Priority 2: Verify with Browser PushManager for accuracy
     */
    const localStatus = getLocalSubscriptionStatus();
    updateBtnUI(localStatus);

    try {
        const registration = await navigator.serviceWorker.ready;
        const currentSub = await registration.pushManager.getSubscription();

        // Sync local storage if browser state differs (e.g., cleared cache)
        const isActuallySubscribed = !!currentSub;
        if (isActuallySubscribed !== localStatus) {
            setLocalSubscriptionStatus(isActuallySubscribed);
            updateBtnUI(isActuallySubscribed);
        }
    } catch (e) {
        console.warn("Push verification failed:", e);
    }

    /**
     * --- TOGGLE LOGIC ---
     */
    CONFIG_BTN.onclick = async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const currentSub = await registration.pushManager.getSubscription();

            if (currentSub) {
                // 🛑 UNSUBSCRIBE FLOW
                await currentSub.unsubscribe();

                const deviceId = localStorage.getItem('admin_device_id');
                if (deviceId) {
                    await adminDb.from('notification_subscribers').delete().eq('device_id', deviceId);
                }

                setLocalSubscriptionStatus(false);
                updateBtnUI(false);
                Swal.fire({ title: "Disabled", text: "Device unsubscribed.", icon: "success", background: '#0C290F', color: '#fff' });
            } else {
                // ✅ SUBSCRIBE FLOW
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    Swal.fire("Permission Denied", "Enable notifications in browser settings.", "warning");
                    return;
                }

                const sub = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                });

                const targetUuid = "1"; // Constant Admin ID
                let uniqueId = localStorage.getItem('admin_device_id');
                if (!uniqueId) {
                    uniqueId = 'admin_node_' + Math.random().toString(36).substr(2, 9);
                    localStorage.setItem('admin_device_id', uniqueId);
                }

                const { error } = await adminDb.from('notification_subscribers').upsert({
                    uuid: targetUuid,
                    device_id: uniqueId,
                    subscribers: JSON.parse(JSON.stringify(sub))
                });

                if (error) throw error;

                setLocalSubscriptionStatus(true);
                updateBtnUI(true);
                Swal.fire({ title: "Enabled!", text: "This device is now registered.", icon: "success", background: '#0C290F', color: '#fff' });
            }
        } catch (err) {
            console.error("Toggle Error:", err);
            setLocalSubscriptionStatus(false); // Reset on error
            Swal.fire({ title: "Error", text: err.message, icon: "error", background: '#0C290F', color: '#fff' });
        }
    };
}

window.initAdminNotification = initAdminNotification;