/**
 * on_notification.js - Enhanced Independent Device Logic
 */

const NOTIF_BTN = document.getElementById('on_notification');
const VAPID_PUBLIC_KEY = 'BA0Y8SCjnZI0oRFfM8IH4ZY1Hpbh2kmeSVjQNwakIpz0ZndaH6OiuBhNO672CiLKDmCNqicVt4waCxbphGMGXEU';

const initNotifications = () => {
    // Check state immediately on load based on actual browser subscription
    checkActualSubscriptionState();
};

/**
 * Checks the local Service Worker subscription directly.
 * This ensures the button reflects THIS device only.
 */
async function checkActualSubscriptionState() {
    if (!NOTIF_BTN || !('serviceWorker' in navigator)) return;

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        // If subscription exists locally, the button is "Enabled"
        updateButtonUI(!!subscription);
    } catch (err) {
        console.error("Error checking subscription:", err);
        updateButtonUI(false);
    }
}

function updateButtonUI(isSubscribed) {
    if (!NOTIF_BTN) return;
    if (isSubscribed) {
        NOTIF_BTN.innerHTML = 'Disable notification 🔕';
        NOTIF_BTN.style.backgroundColor = '#10b981'; // Green
    } else {
        NOTIF_BTN.innerHTML = 'Enable notification 🔔';
        NOTIF_BTN.style.backgroundColor = '#ef4444'; // Red
    }
}

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
}

NOTIF_BTN.addEventListener('click', async () => {
    const user = window.dataBase;
    if (!user || !user.uuid) {
        return Swal.fire("Error", "User session not found. Please re-login.", "error");
    }

    // Determine state by looking at the current button text
    const isCurrentlyEnabled = NOTIF_BTN.innerHTML.includes('Disable');

    if (isCurrentlyEnabled) {
        await handleDisable(false);
    } else {
        await handleEnable(user);
    }
});

async function handleEnable(user) {
    try {
        if (typeof showSpinnerModal === 'function') showSpinnerModal();

        // 1. Browser Permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            if (typeof hideSpinnerModal === 'function') hideSpinnerModal();
            return Swal.fire("Permission Denied", "Please enable notifications in your browser settings.", "error");
        }

        // 2. SW Registration
        const registration = await navigator.serviceWorker.ready;

        // 3. Create Subscription
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });

        // 4. Generate/Retrieve a Device ID unique to THIS browser
        let deviceID = localStorage.getItem('device_id');
        if (!deviceID) {
            deviceID = 'dev_' + Math.random().toString(36).substr(2, 9) + Date.now();
            localStorage.setItem('device_id', deviceID);
        }

        // 5. Upsert to Supabase
        const { error } = await supabase.from('notification_subscribers').upsert({
            uuid: user.uuid,
            device_id: deviceID,
            subscribers: subscription
        });

        if (error) throw error;

        updateButtonUI(true);
        if (typeof hideSpinnerModal === 'function') hideSpinnerModal();

        Swal.fire({
            icon: 'success',
            title: 'Notifications Enabled',
            text: 'This device is now registered for alerts!',
            background: '#0C290F', color: '#fff', confirmButtonColor: '#10b981'
        });

    } catch (err) {
        if (typeof hideSpinnerModal === 'function') hideSpinnerModal();
        console.error("Enable Error:", err);
        Swal.fire({ icon: 'error', title: 'Failed', text: 'Subscription failed. Check your connection.', background: '#0C290F' });
    }
}

async function handleDisable(silent = false) {
    const deviceID = localStorage.getItem('device_id');
    const user = window.dataBase;

    if (!silent && typeof showSpinnerModal === 'function') showSpinnerModal();

    try {
        // 1. Unsubscribe locally
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();

        // 2. Remove ONLY this device from the DB
        if (deviceID && user) {
            await supabase
                .from('notification_subscribers')
                .delete()
                .match({ device_id: deviceID, uuid: user.uuid });
        }

        updateButtonUI(false);

        if (!silent) {
            Swal.fire({
                icon: 'success',
                title: 'Disabled',
                text: 'Notifications turned off for this device.',
                background: '#0C290F', color: '#fff'
            });
        }
    } catch (err) {
        console.error("Disable error:", err);
    }

    if (!silent && typeof hideSpinnerModal === 'function') hideSpinnerModal();
}

// Run on load
initNotifications();