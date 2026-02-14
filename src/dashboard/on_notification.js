/**
 * on_notification.js - Synchronized with notification_subscribers table
 * FIXED: Updated column name to 'subscribers' to match schema.
 */

const VAPID_PUBLIC_KEY = 'BA0Y8SCjnZI0oRFfM8IH4ZY1Hpbh2kmeSVjQNwakIpz0ZndaH6OiuBhNO672CiLKDmCNqicVt4waCxbphGMGXEU';

/**
 * 🛰️ BOOTSTRAPPER
 * This is called by security.html's renderSecurityPage
 */
window.initNotifications = async () => {
    const NOTIF_BTN = document.getElementById('on_notification');
    if (!NOTIF_BTN) return;

    // 1. Check current browser subscription status
    await checkActualSubscriptionState(NOTIF_BTN);

    // 2. Fresh Event Listener (removes old ones to prevent double-firing)
    const newBtn = NOTIF_BTN.cloneNode(true);
    NOTIF_BTN.parentNode.replaceChild(newBtn, NOTIF_BTN);

    newBtn.addEventListener('click', async () => {
        const targetUuid = window.userUuid || (window.dataBase ? window.dataBase.uuid : null);

        if (!targetUuid) {
            return Swal.fire("Session Error", "User data not loaded. Please refresh.", "error");
        }

        const isCurrentlyEnabled = newBtn.innerHTML.includes('Disable');

        if (isCurrentlyEnabled) {
            await handleDisable(targetUuid, newBtn);
        } else {
            await handleEnable(targetUuid, newBtn);
        }
    });

    // 3. Realtime Admin Watcher 
    // If admin_full_version is toggled, it ensures the check happens on next click
    window.supabase.channel('admin-notif-watch')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'admin', filter: 'id=eq.1' }, () => {
            console.log("⚡ Admin permissions updated via Realtime");
        }).subscribe();
};

async function checkActualSubscriptionState(btn) {
    if (!('serviceWorker' in navigator)) return;
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        updateButtonUI(!!subscription, btn);
    } catch (err) {
        updateButtonUI(false, btn);
    }
}

function updateButtonUI(isSubscribed, btn) {
    if (!btn) return;
    btn.innerHTML = isSubscribed ? 'Disable notification 🔕' : 'Enable notification 🔔';
    btn.style.backgroundColor = isSubscribed ? '#10b981' : '#ef4444';
    btn.className = "btn w-100 text-white p-3 fw-bold"; // Custom styling
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
}



/**
 * 🔔 ENABLE
 */
async function handleEnable(targetUuid, btn) {
    const db = window.supabase;
    if (typeof showSpinnerModal === 'function') showSpinnerModal();

    try {
        // 1. Realtime Admin Version Check
        const { data: admin } = await db.from('admin').select('admin_full_version').eq('id', 1).single();

        if (!admin?.admin_full_version) {
            if (typeof hideSpinnerModal === 'function') hideSpinnerModal();
            return Swal.fire({
                title: 'Upgrade Required',
                text: 'Notification features are currently locked. Please upgrade.',
                icon: 'warning',
                background: '#0c1e29ff', color: '#fff'
            });
        }

        // 2. Browser Permissions
        const registration = await navigator.serviceWorker.ready;
        const permission = await Notification.requestPermission();

        if (permission !== 'granted') {
            if (typeof hideSpinnerModal === 'function') hideSpinnerModal();
            return Swal.fire({ title: "Permission Denied", text: "Please allow notifications in browser settings.", icon: "error" });
        }

        // 3. PWA Subscription
        const sub = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });

        const deviceID = localStorage.getItem('device_id') || ('dev_' + Math.random().toString(36).substr(2, 9));
        localStorage.setItem('device_id', deviceID);

        // 4. DB Sync (MATCHED TO YOUR SCHEMA)
        const { error } = await db.from('notification_subscribers').upsert({
            uuid: targetUuid,
            device_id: deviceID,
            subscribers: JSON.parse(JSON.stringify(sub)) // Matches your 'subscribers' json column
        }, { onConflict: 'device_id' });

        if (error) throw error;

        updateButtonUI(true, btn);
        if (typeof hideSpinnerModal === 'function') hideSpinnerModal();
        Swal.fire({ icon: 'success', title: 'Notifications Enabled!', background: '#0c2029ff', color: '#fff' });

    } catch (err) {
        if (typeof hideSpinnerModal === 'function') hideSpinnerModal();
        Swal.fire({ icon: 'error', title: 'Setup Failed', text: err.message });
    }
}

/**
 * 🔕 DISABLE
 */
async function handleDisable(targetUuid, btn) {
    const db = window.supabase;
    const deviceID = localStorage.getItem('device_id');
    if (typeof showSpinnerModal === 'function') showSpinnerModal();

    try {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();

        if (deviceID) {
            await db.from('notification_subscribers').delete().match({ device_id: deviceID, uuid: targetUuid });
        }

        updateButtonUI(false, btn);
        if (typeof hideSpinnerModal === 'function') hideSpinnerModal();
        Swal.fire({ icon: 'success', title: 'Notifications Disabled', background: '#0c2129ff', color: '#fff' });
    } catch (err) {
        if (typeof hideSpinnerModal === 'function') hideSpinnerModal();
        console.error("Disable error:", err);
    }
}

// Initial Run
initNotifications();