/**
 * src/admin/profile/account/allow_notification.js
 * iOS Optimized: Direct Execution Flow
 */
async function initAdminNotification(buttonId) {
    const adminDb = window.supabase;
    if (!adminDb) return;

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

    // Initial Sync
    updateBtnUI(getLocalStatus());

    CONFIG_BTN.onclick = async () => {
        // 🔥 iOS REQUIREMENT: Immediate Permission Request
        // Do not put this behind an 'await navigator.serviceWorker.ready' if possible
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                Swal.fire("Permission Denied", "iOS requires you to allow notifications in the prompt.", "warning");
                return;
            }

            const registration = await navigator.serviceWorker.getRegistration();
            if (!registration) {
                Swal.fire("Error", "Service Worker not found. Please refresh.", "error");
                return;
            }

            const currentSub = await registration.pushManager.getSubscription();

            if (currentSub) {
                // UNSUBSCRIBE
                await currentSub.unsubscribe();
                const dId = localStorage.getItem('admin_device_id');
                if (dId) await adminDb.from('notification_subscribers').delete().eq('device_id', dId);

                setLocalStatus(false);
                updateBtnUI(false);
                Swal.fire({ title: "Disabled", icon: "success", background: '#0C290F', color: '#fff' });
            } else {
                // SUBSCRIBE
                // 🔥 iOS TIP: Ensure the options are exactly like this
                const sub = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                });

                const targetUuid = "1";
                let uniqueId = localStorage.getItem('admin_device_id') || 'admin_node_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('admin_device_id', uniqueId);

                const { error } = await adminDb.from('notification_subscribers').upsert({
                    uuid: targetUuid,
                    device_id: uniqueId,
                    subscribers: JSON.parse(JSON.stringify(sub))
                });

                if (error) throw error;

                setLocalStatus(true);
                updateBtnUI(true);
                Swal.fire({ title: "Enabled!", icon: "success", background: '#0C290F', color: '#fff' });
            }
        } catch (err) {
            console.error("iOS Subscription Error:", err);
            Swal.fire({ title: "Failed", text: "Ensure you are using 'Add to Home Screen' version.", icon: "error" });
        }
    };
}

window.initAdminNotification = initAdminNotification;