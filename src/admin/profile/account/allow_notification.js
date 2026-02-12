/**
 * src/admin/profile/account/allow_notification.js
 * No-Import Style
 */
async function initAdminNotification(buttonId) {
    // Check if the HTML-loaded Supabase exists
    if (typeof window.supabase === 'undefined' || typeof window.supabase.createClient !== 'function') {
        console.error("Supabase library not found. Ensure the HTML script is correct.");
        return;
    }

    const adminDb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
    const CONFIG_BTN = document.getElementById(buttonId);
    const VAPID_PUBLIC_KEY = 'BA0Y8SCjnZI0oRFfM8IH4ZY1Hpbh2kmeSVjQNwakIpz0ZndaH6OiuBhNO672CiLKDmCNqicVt4waCxbphGMGXEU';

    if (!CONFIG_BTN) return;

    // --- INTERNAL HELPERS ---
    const updateBtnUI = (isEnabled) => {
        if (isEnabled) {
            CONFIG_BTN.innerHTML = "Disable Admin Notification 🔕";
            CONFIG_BTN.className = "btn btn-danger mb-4";
        } else {
            CONFIG_BTN.innerHTML = "Enable Admin Notification 🔔";
            CONFIG_BTN.className = "btn btn-primary mb-4";
        }
    };

    const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
        return outputArray;
    };

    // --- 1. SYNC STATE ---
    const syncState = async () => {
        // Use adminDb here consistently
        const { data: admin } = await adminDb.from('admin').select('*').eq('id', 1).single();

        const registration = await navigator.serviceWorker.getRegistration('/admin/');
        const subscription = await registration?.pushManager.getSubscription();

        if (admin && !admin.admin_full_version) {
            CONFIG_BTN.disabled = true;
            CONFIG_BTN.innerHTML = '<i class="fa fa-lock me-2"></i>Upgrade Required';
            return;
        }
        updateBtnUI(!!subscription);
    };

    await syncState();

    // --- 2. CLICK HANDLER ---
    CONFIG_BTN.onclick = async () => {
        const isCurrentlyEnabled = CONFIG_BTN.innerHTML.includes('Disable');

        try {
            if (Notification.permission === 'denied') {
                return Swal.fire({ title: "Blocked", text: "Reset notification permissions in your browser.", icon: "error" });
            }

            let registration = await navigator.serviceWorker.getRegistration('/admin/');
            if (!registration) {
                registration = await navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin/' });
            }
            await navigator.serviceWorker.ready;

            if (isCurrentlyEnabled) {
                const sub = await registration.pushManager.getSubscription();
                if (sub) await sub.unsubscribe();

                const localId = localStorage.getItem('admin_device_id');
                if (localId) {
                    await adminDb.from('notification_subscribers').delete().eq('device_id', localId);
                }

                updateBtnUI(false);
                Swal.fire({ title: "Disabled", icon: "success" });
            } else {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') return;

                const sub = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                });

                const { data: adminData } = await adminDb.from('admin').select('admin_notification_id').eq('id', 1).single();
                const targetUuid = adminData?.admin_notification_id || 'admin_global';

                const uniqueId = 'admin_dev_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('admin_device_id', uniqueId);

                const { error } = await adminDb.from('notification_subscribers').upsert({
                    uuid: targetUuid,
                    device_id: uniqueId,
                    subscribers: JSON.parse(JSON.stringify(sub))
                });

                if (error) throw error;
                updateBtnUI(true);
                Swal.fire({ title: "Enabled!", icon: "success" });
            }
        } catch (err) {
            console.error("Admin Notify Error:", err);
            Swal.fire({ title: "Setup Failed", text: err.message, icon: "error" });
        }
    };
}

// Attach function to window so it can be called by the HTML module script
window.initAdminNotification = initAdminNotification;