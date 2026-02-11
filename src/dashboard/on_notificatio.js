/**
 * on_notification.js - Robust Subscription Logic
 */

const NOTIF_BTN = document.getElementById('on_notification');
const VAPID_PUBLIC_KEY = 'BA0Y8SCjnZI0oRFfM8IH4ZY1Hpbh2kmeSVjQNwakIpz0ZndaH6OiuBhNO672CiLKDmCNqicVt4waCxbphGMGXEU';

const initNotifications = () => {
    if (window.dataBase) {
        checkInitialState(window.dataBase);
    } else {
        window.addEventListener('userDataUpdated', (e) => checkInitialState(e.detail));
    }
};

async function checkInitialState(user) {
    if (!NOTIF_BTN) return;
    const localDeviceID = localStorage.getItem('device_id');

    if (Notification.permission === 'denied' && localDeviceID) {
        await handleDisable(true);
        return;
    }

    if (localDeviceID && user && user.uuid) {
        const { data } = await supabase
            .from('notification_subscribers')
            .select('uuid')
            .eq('device_id', localDeviceID)
            .maybeSingle();

        updateButtonUI(!!data);
    } else {
        updateButtonUI(false);
    }
}

function updateButtonUI(isSubscribed) {
    if (!NOTIF_BTN) return;
    if (isSubscribed) {
        NOTIF_BTN.innerHTML = 'Disable notification 🔕';
        NOTIF_BTN.style.backgroundColor = '#10b981';
    } else {
        NOTIF_BTN.innerHTML = 'Enable notification 🔔';
        NOTIF_BTN.style.backgroundColor = '#ef4444';
    }
}

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
    if (!user || !user.uuid) return;

    const isCurrentlyEnabled = NOTIF_BTN.innerHTML.includes('Disable');

    if (isCurrentlyEnabled) {
        await handleDisable(false);
        Swal.fire({
            icon: 'success',
            title: 'Notifications Disabled',
            text: 'Successfully unsubscribed.',
            background: '#0C290F',
            color: '#fff',
            confirmButtonColor: '#10b981'
        });
    } else {
        try {
            if (typeof showSpinnerModal === 'function') showSpinnerModal();

            // 1. Request Permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                if (typeof hideSpinnerModal === 'function') hideSpinnerModal();
                return Swal.fire("Permission Denied", "Enable notifications in browser settings.", "error");
            }

            // 2. Get Service Worker Ready
            // Use a timeout to prevent infinite spinning if SW fails
            const registration = await Promise.race([
                navigator.serviceWorker.ready,
                new Promise((_, reject) => setTimeout(() => reject(new Error('SW Timeout')), 5000))
            ]);

            // 3. Subscribe
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });

            let deviceID = localStorage.getItem('device_id') || 'dev_' + Math.random().toString(36).substr(2, 9);

            // 4. Save to Database
            const { error } = await supabase.from('notification_subscribers').upsert({
                uuid: user.uuid,
                device_id: deviceID,
                subscribers: subscription // Ensure your DB column name matches this key
            });

            if (error) throw error;

            localStorage.setItem('device_id', deviceID);
            updateButtonUI(true);
            if (typeof hideSpinnerModal === 'function') hideSpinnerModal();

            Swal.fire({
                icon: 'success',
                title: 'Notifications Enabled',
                text: 'You will now receive alerts!',
                background: '#0C290F',
                color: '#fff',
                confirmButtonColor: '#10b981'
            });

        } catch (err) {
            if (typeof hideSpinnerModal === 'function') hideSpinnerModal();
            console.error("Subscription error:", err);
            Swal.fire({
                icon: 'error',
                title: 'Notice',
                text: 'Notification setup failed. Please refresh and try again.',
                background: '#0C290F',
                color: '#fff',
                confirmButtonColor: '#ef4444'
            });
        }
    }
});

async function handleDisable(silent = false) {
    const deviceID = localStorage.getItem('device_id');
    const user = window.dataBase;
    if (!silent && typeof showSpinnerModal === 'function') showSpinnerModal();

    try {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();

        if (deviceID && user) {
            await supabase.from('notification_subscribers').delete().match({ device_id: deviceID });
        }

        localStorage.removeItem('device_id');
        updateButtonUI(false);
    } catch (err) {
        console.error("Disable error:", err);
    }

    if (!silent && typeof hideSpinnerModal === 'function') hideSpinnerModal();
}

initNotifications();