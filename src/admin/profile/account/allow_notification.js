import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
const CONFIG_BTN = document.getElementById('config_button');

/**
 * 🔄 REALTIME & INITIAL SYNC
 */
const initAdminNotifyLogic = async () => {
    if (!CONFIG_BTN) return;
    await syncAdminState();

    supabase.channel('admin-notif-sync')
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'admin',
            filter: 'id=eq.1'
        }, payload => {
            syncAdminState();
        }).subscribe();
};

async function syncAdminState() {
    const { data: admin } = await supabase.from('admin').select('*').eq('id', 1).single();
    const localId = localStorage.getItem('admin_notification_id');
    const browserPermission = Notification.permission;

    // 1. Upgrade Required
    if (admin && !admin.admin_full_version) {
        CONFIG_BTN.disabled = true;
        CONFIG_BTN.innerHTML = '<i class="fa fa-lock me-2"></i>Upgrade Required';
        return;
    }

    // 2. Cleanup if permission was manually revoked in browser
    if (browserPermission === 'denied' && (localId || admin?.admin_notification_id)) {
        await cleanupAdminSubscription(admin?.admin_notification_id || localId);
        updateBtnUI(false);
        return;
    }

    // 3. Sync UI
    if (localId) {
        const { data: sub } = await supabase.from('notification_subscribers')
            .select('*')
            .eq('device_id', localId)
            .maybeSingle();

        updateBtnUI(!!sub);
    } else {
        updateBtnUI(false);
    }
}

/**
 * 🧹 CLEANUP LOGIC - DELETES ALL TRACES OF SUBSCRIPTION
 */
async function cleanupAdminSubscription(id) {
    if (!id) return;

    // A. Delete from subscribers table (using both possible column matches)
    await supabase.from('notification_subscribers')
        .delete()
        .or(`device_id.eq.${id},uuid.eq.${id}`);

    // B. Clear the admin table link
    await supabase.from('admin')
        .update({ admin_notification_id: null })
        .eq('id', 1);

    // C. Remove local storage trace
    localStorage.removeItem('admin_notification_id');

    console.log("Admin subscription completely deleted from DB and LocalStorage.");
}

/**
 * 🎨 UI UPDATE
 */
function updateBtnUI(isEnabled) {
    if (!CONFIG_BTN) return;
    if (isEnabled) {
        CONFIG_BTN.innerHTML = "Disable Admin Notification 🔕";
        CONFIG_BTN.className = "btn btn-danger mb-4"; // Changed to red to signify disable
        CONFIG_BTN.onclick = () => handleToggle(true);
    } else {
        CONFIG_BTN.innerHTML = "Enable Admin Notification 🔔";
        CONFIG_BTN.className = "btn btn-primary mb-4";
        CONFIG_BTN.onclick = () => handleToggle(false);
    }
}

/**
 * ⚡ TOGGLE HANDLER
 */
/**
 * ⚡ TOGGLE HANDLER - ADMIN MULTI-DEVICE EDITION
 */
async function handleToggle(isCurrentlyEnabled) {
    // 1. Check for blocked permissions
    if (Notification.permission === 'denied') {
        return Swal.fire({
            title: "Access Blocked",
            text: "Please reset notification permissions in your browser settings to enable alerts.",
            icon: "error",
            background: '#0c1d29ff',
            color: '#fff'
        });
    }

    // 2. Locate the Admin-specific Service Worker
    // We use the specific scope to ensure we don't grab the user-side worker
    if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin/' });
    }
    const registration = await navigator.serviceWorker.ready;

    if (!registration) {
        return Swal.fire({
            title: "PWA Error",
            text: "Admin Service Worker not detected. Please ensure you have added this app to your home screen.",
            icon: "warning",
            background: '#0c1d29ff',
            color: '#fff'
        });
    }

    if (isCurrentlyEnabled) {
        // --- 🔕 DISABLE PROCESS ---
        const localId = localStorage.getItem('admin_notification_id');

        try {
            // Unsubscribe from the Push Server via the browser
            const sub = await registration.pushManager.getSubscription();
            if (sub) await sub.unsubscribe();
        } catch (e) {
            console.warn("Browser unsubscription failed, proceeding with DB cleanup.", e);
        }

        // Wipe Database and LocalStorage traces
        await cleanupAdminSubscription(localId);

        updateBtnUI(false);
        Swal.fire({
            title: "Disabled",
            text: "This device will no longer receive admin alerts.",
            icon: "success",
            background: '#0c1d29ff',
            color: '#fff'
        });

    } else {
        // --- 🔔 ENABLE PROCESS ---
        try {
            // Request permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return syncAdminState();

            // Fetch VAPID Key from your Node.js backend
            const res = await fetch('/vapidPublicKey');
            const { key } = await res.json();

            // Subscribe the current device to the Push Server
            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(key)
            });

            /**
             * 🔗 MULTI-DEVICE LOGIC:
             * We fetch the 'admin_notification_id' from the admin table (e.g., 'admin_1').
             * This 'uuid' is shared by all admin devices, while 'device_id' remains unique.
             */
            const { data: adminData } = await supabase
                .from('admin')
                .select('admin_notification_id')
                .eq('id', 1)
                .single();

            const targetUuid = adminData?.admin_notification_id || 'admin_global_id';

            // Create a unique ID for THIS specific browser/phone
            const uniqueDeviceId = 'dev_' + Math.random().toString(36).substr(2, 9);

            localStorage.setItem('admin_notification_id', uniqueDeviceId);

            // Save to 'notification_subscribers'
            // Using UPSERT with device_id ensures we don't create duplicates for the same browser
            await supabase.from('notification_subscribers').upsert({
                uuid: targetUuid,        // The person (Admin)
                device_id: uniqueDeviceId, // The specific device (iPhone/Chrome)
                subscribers: sub         // The push token
            });

            updateBtnUI(true);
            Swal.fire({
                title: "Enabled",
                text: "This device is now registered for Admin alerts!",
                icon: "success",
                background: '#0c1d29ff',
                color: '#fff'
            });

        } catch (err) {
            console.error("Subscription Error:", err);
            Swal.fire({
                title: "Error",
                text: "Could not establish connection to the push server.",
                icon: "error",
                background: '#0c1f29ff',
                color: '#fff'
            });
        }
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

initAdminNotifyLogic();