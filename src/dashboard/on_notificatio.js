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
        // 1. Safe Spinner Trigger
        if (typeof showSpinnerModal === 'function') showSpinnerModal();

        // 2. Cross-Platform Detection
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

        // 3. Conditional PWA Requirement
        // Only force "Add to Home Screen" if the user is on a mobile device (specifically iOS)
        if (isMobile && !isStandalone) {
            if (typeof hideSpinnerModal === 'function') hideSpinnerModal();
            return Swal.fire({
                icon: 'info',
                title: "PWA Required",
                text: "On mobile, please 'Add to Home Screen' from your browser menu to enable notifications.",
                background: '#0c2129ff',
                color: '#fff'
            });
        }

        // 4. Permission Request
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            if (typeof hideSpinnerModal === 'function') hideSpinnerModal();
            return Swal.fire({
                icon: "error",
                title: "Permission Denied",
                text: "Please enable notifications in your browser or device settings.",
                background: '#0c2129ff',
                color: '#fff'
            });
        }

        // 5. Service Worker Readiness
        // We use a timeout race to prevent the infinite spinner on bugged iOS versions
        const registration = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Service Worker timeout. Please refresh.')), 10000))
        ]);

        if (!registration.pushManager) {
            throw new Error("Push notifications are not supported by this browser.");
        }

        // 6. Subscribe to Push Service
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });

        // 7. Retrieve Device ID (Fix for the 'Variable not found' error)
        // We check the window object first (for the Module) then fallback to localStorage
        const deviceId = (window.getOrCreateDeviceId)
            ? window.getOrCreateDeviceId()
            : localStorage.getItem('device_id');

        if (!deviceId) {
            throw new Error("Unable to verify Device ID. Please refresh the page.");
        }

        // 8. Sync with Supabase
        const { error } = await supabase.from('notification_subscribers').upsert({
            uuid: user.uuid,
            device_id: deviceId,
            subscribers: JSON.parse(JSON.stringify(subscription)) // Critical: sanitize for Postgres
        });

        if (error) throw error;

        // 9. Success UI Update
        updateButtonUI(true);
        if (typeof hideSpinnerModal === 'function') hideSpinnerModal();

        Swal.fire({
            icon: 'success',
            title: 'Device Registered!',
            text: 'You will now receive real-time alerts on this device.',
            background: '#0C290F',
            color: '#fff',
            confirmButtonColor: '#10b981'
        });

    } catch (err) {
        if (typeof hideSpinnerModal === 'function') hideSpinnerModal();
        console.error("Setup Error:", err);
        Swal.fire({
            icon: 'error',
            title: 'Setup Failed',
            text: err.message,
            background: '#0c2129ff',
            color: '#fff'
        });
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