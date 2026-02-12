/**
 * admin_notification.js - Adapted for Admin Scope
 */

const ADMIN_NOTIF_BTN = document.getElementById('config_button'); // Matches your admin ID
const VAPID_PUBLIC_KEY = 'BA0Y8SCjnZI0oRFfM8IH4ZY1Hpbh2kmeSVjQNwakIpz0ZndaH6OiuBhNO672CiLKDmCNqicVt4waCxbphGMGXEU';

const initAdminNotifications = () => {
    checkAdminSubscriptionState();
};

/**
 * Checks the Admin Service Worker scope directly.
 */
async function checkAdminSubscriptionState() {
    if (!ADMIN_NOTIF_BTN || !('serviceWorker' in navigator)) return;

    try {
        // CRITICAL: Point to the /admin/ scope
        const registration = await navigator.serviceWorker.getRegistration('/admin/');
        const subscription = await registration?.pushManager.getSubscription();

        updateAdminButtonUI(!!subscription);
    } catch (err) {
        console.error("Admin SW Check Error:", err);
        updateAdminButtonUI(false);
    }
}

function updateAdminButtonUI(isSubscribed) {
    if (!ADMIN_NOTIF_BTN) return;
    if (isSubscribed) {
        ADMIN_NOTIF_BTN.innerHTML = 'Disable Admin Notification 🔕';
        ADMIN_NOTIF_BTN.className = "btn btn-danger mb-4"; // Red for disable
    } else {
        ADMIN_NOTIF_BTN.innerHTML = 'Enable Admin Notification 🔔';
        ADMIN_NOTIF_BTN.className = "btn btn-primary mb-4"; // Blue/Green for enable
    }
}

// Helper for VAPID (Keep as is)
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
}

ADMIN_NOTIF_BTN.addEventListener('click', async () => {
    // Check state by button text
    const isCurrentlyEnabled = ADMIN_NOTIF_BTN.innerHTML.includes('Disable');

    if (isCurrentlyEnabled) {
        await handleAdminDisable();
    } else {
        await handleAdminEnable();
    }
});

async function handleAdminEnable() {
    try {
        if (typeof showSpinnerModal === 'function') showSpinnerModal();

        // 1. Point specifically to Admin SW
        let registration = await navigator.serviceWorker.getRegistration('/admin/');
        if (!registration) {
            registration = await navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin/' });
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            if (typeof hideSpinnerModal === 'function') hideSpinnerModal();
            return Swal.fire("Permission Denied", "Please allow notifications in settings.", "error");
        }

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });

        // 2. Fetch Global Admin ID from DB
        const { data: adminData } = await supabase.from('admin').select('admin_notification_id').eq('id', 1).single();
        const targetUuid = adminData?.admin_notification_id || 'admin_global_id';

        // 3. Unique Device ID (prevents one admin device from deleting another)
        const deviceId = 'admin_dev_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('admin_device_id', deviceId);

        // 4. Upsert to Subscribers Table
        await supabase.from('notification_subscribers').upsert({
            uuid: targetUuid,
            device_id: deviceId,
            subscribers: JSON.parse(JSON.stringify(subscription))
        });

        updateAdminButtonUI(true);
        if (typeof hideSpinnerModal === 'function') hideSpinnerModal();
        Swal.fire({ icon: 'success', title: 'Admin Alerts Enabled!' });

    } catch (err) {
        if (typeof hideSpinnerModal === 'function') hideSpinnerModal();
        console.error("Admin Setup Error:", err);
        Swal.fire({ icon: 'error', title: 'Setup Failed', text: err.message });
    }
}

async function handleAdminDisable() {
    const deviceID = localStorage.getItem('admin_device_id');
    if (typeof showSpinnerModal === 'function') showSpinnerModal();

    try {
        const registration = await navigator.serviceWorker.getRegistration('/admin/');
        const sub = await registration?.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();

        if (deviceID) {
            await supabase
                .from('notification_subscribers')
                .delete()
                .eq('device_id', deviceID);
        }

        updateAdminButtonUI(false);
        Swal.fire({ icon: 'success', title: 'Disabled', text: 'Admin alerts off for this device.' });
    } catch (err) {
        console.error("Disable error:", err);
    }
    if (typeof hideSpinnerModal === 'function') hideSpinnerModal();
}

initAdminNotifications();