/**
 * src/admin/profile/account/allow_notification.js
 * FINAL REWRITE: Chronological logic flow using global Supabase instance
 */
async function initAdminNotification(buttonId) {
    // 1. Reference Global Supabase
    const adminDb = window.supabase;

    if (!adminDb) {
        console.error("Supabase global instance not found. Initialization aborted.");
        return;
    }

    const CONFIG_BTN = document.getElementById(buttonId);
    const VAPID_PUBLIC_KEY = 'BA0Y8SCjnZI0oRFfM8IH4ZY1Hpbh2kmeSVjQNwakIpz0ZndaH6OiuBhNO672CiLKDmCNqicVt4waCxbphGMGXEU';

    if (!CONFIG_BTN) {
        console.error(`Button with ID "${buttonId}" not found in HTML.`);
        return;
    }

    /**
     * --- INTERNAL HELPERS ---
     */
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
     */
    try {
        const registration = await navigator.serviceWorker.ready;
        const currentSub = await registration.pushManager.getSubscription();
        updateBtnUI(!!currentSub);
    } catch (e) {
        console.warn("Service Worker not ready yet or blocked:", e);
    }

    /**
     * --- BUTTON CLICK LOGIC ---
     */
    CONFIG_BTN.onclick = async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const currentSub = await registration.pushManager.getSubscription();

            if (currentSub) {
                // 🛑 FLOW: UNSUBSCRIBE
                await currentSub.unsubscribe();

                // Optional: Remove from DB
                const deviceId = localStorage.getItem('admin_device_id');
                if (deviceId) {
                    await adminDb.from('notification_subscribers').delete().eq('device_id', deviceId);
                }

                updateBtnUI(false);
                Swal.fire({ title: "Disabled", text: "Notifications turned off.", icon: "success", background: '#0C290F', color: '#fff' });
            } else {
                // ✅ FLOW: SUBSCRIBE
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    Swal.fire("Permission Denied", "Please allow notifications in browser settings.", "warning");
                    return;
                }

                const sub = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                });

                // Get Admin Notification UUID target
                const { data: adminData } = await adminDb.from('admin').select('admin_notification_id').eq('id', 1).single();
                const targetUuid = adminData?.admin_notification_id || 'admin_global';

                // Generate or retrieve persistent device ID
                let uniqueId = localStorage.getItem('admin_device_id');
                if (!uniqueId) {
                    uniqueId = 'admin_node_' + Math.random().toString(36).substr(2, 9);
                    localStorage.setItem('admin_device_id', uniqueId);
                }

                // Upsert to Supabase
                const { error } = await adminDb.from('notification_subscribers').upsert({
                    uuid: targetUuid,
                    device_id: uniqueId,
                    subscribers: JSON.parse(JSON.stringify(sub))
                });

                if (error) throw error;

                updateBtnUI(true);
                Swal.fire({ title: "Enabled!", text: "You will now receive admin alerts.", icon: "success", background: '#0C290F', color: '#fff' });
            }
        } catch (err) {
            console.error("Admin Notify Toggle Error:", err);
            Swal.fire({ title: "Action Failed", text: err.message, icon: "error", background: '#0C290F', color: '#fff' });
        }
    };
}

// Global Export
window.initAdminNotification = initAdminNotification;