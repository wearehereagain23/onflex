/**
 * src/admin/profile/account/allow_notification.js
 * Cleaned Logic: SW handled by login, Version Lock added.
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

    // Sync UI on load
    updateBtnUI(getLocalStatus());

    CONFIG_BTN.onclick = async () => {
        try {
            // 1. VERSION CHECK: Is admin_full_version enabled?
            const { data: admin, error: vError } = await adminDb
                .from('admin')
                .select('admin_full_version')
                .eq('id', 1)
                .single();

            if (vError || !admin?.admin_full_version) {
                return Swal.fire({
                    title: "Access Denied",
                    text: "Admin Full Version is required to enable Push Notifications.",
                    icon: "lock",
                    background: '#0C290F',
                    color: '#fff',
                    confirmButtonColor: '#24a0a0'
                });
            }

            // 2. iOS GESTURE: Request permission first
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                return Swal.fire("Permission Denied", "Please allow notifications in browser settings.", "warning");
            }

            // 3. GET REGISTRATION (Assumes SW was registered in login)
            const registration = await navigator.serviceWorker.getRegistration();
            if (!registration) {
                throw new Error("Service Worker is not active. Please log out and log back in.");
            }

            const currentSub = await registration.pushManager.getSubscription();

            if (currentSub) {
                // --- UNSUBSCRIBE ---
                await currentSub.unsubscribe();
                const dId = localStorage.getItem('admin_device_id');
                if (dId) await adminDb.from('notification_subscribers').delete().eq('device_id', dId);

                setLocalStatus(false);
                updateBtnUI(false);
                Swal.fire({ title: "Disabled", icon: "success", background: '#0C290F', color: '#fff' });
            } else {
                // --- SUBSCRIBE ---
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
            console.error("Subscription Error:", err);
            Swal.fire({
                title: "Error",
                text: err.message || "Failed to process request.",
                icon: "error",
                background: '#0C290F',
                color: '#fff'
            });
        }
    };
}

window.initAdminNotification = initAdminNotification;