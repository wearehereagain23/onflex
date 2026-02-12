// 1. Use the ESM import (Ensure this is the ONLY way you load Supabase in this file)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// 2. Initialize with a unique variable name to avoid "is not a function" conflicts
const adminDb = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
const CONFIG_BTN = document.getElementById('config_button');
const VAPID_PUBLIC_KEY = 'BA0Y8SCjnZI0oRFfM8IH4ZY1Hpbh2kmeSVjQNwakIpz0ZndaH6OiuBhNO672CiLKDmCNqicVt4waCxbphGMGXEU';

/**
 * 🔄 INITIAL SYNC
 */
const initAdminNotifyLogic = async () => {
    if (!CONFIG_BTN) return;
    await syncAdminState();
};

async function syncAdminState() {
    // Note: use 'adminDb' instead of 'supabase'
    const { data: admin } = await adminDb.from('admin').select('*').eq('id', 1).single();

    // Check local SW registration to see if this device is ACTUALLY subscribed
    const registration = await navigator.serviceWorker.getRegistration('/admin/');
    const subscription = await registration?.pushManager.getSubscription();

    if (admin && !admin.admin_full_version) {
        CONFIG_BTN.disabled = true;
        CONFIG_BTN.innerHTML = '<i class="fa fa-lock me-2"></i>Upgrade Required';
        return;
    }

    updateBtnUI(!!subscription);
}

/**
 * 🎨 UI UPDATE
 */
function updateBtnUI(isEnabled) {
    if (!CONFIG_BTN) return;
    if (isEnabled) {
        CONFIG_BTN.innerHTML = "Disable Admin Notification 🔕";
        CONFIG_BTN.className = "btn btn-danger mb-4";
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
async function handleToggle(isCurrentlyEnabled) {
    try {
        if (Notification.permission === 'denied') {
            return Swal.fire({ title: "Access Blocked", text: "Reset permissions in browser settings.", icon: "error" });
        }

        // 1. Identify/Register Admin Service Worker
        let registration = await navigator.serviceWorker.getRegistration('/admin/');
        if (!registration) {
            registration = await navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin/' });
        }

        // Wait for it to be ready
        await navigator.serviceWorker.ready;

        if (isCurrentlyEnabled) {
            // --- DISABLE ---
            const sub = await registration.pushManager.getSubscription();
            if (sub) await sub.unsubscribe();

            const localId = localStorage.getItem('admin_device_id');
            if (localId) {
                await adminDb.from('notification_subscribers').delete().eq('device_id', localId);
            }

            updateBtnUI(false);
            Swal.fire({ title: "Disabled", icon: "success" });

        } else {
            // --- ENABLE ---
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return;

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });

            // Get the Admin UUID from DB
            const { data: adminData } = await adminDb.from('admin').select('admin_notification_id').eq('id', 1).single();
            const targetUuid = adminData?.admin_notification_id || 'admin_global';

            // Create unique device ID
            const uniqueId = 'admin_dev_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('admin_device_id', uniqueId);

            // Sync to Supabase
            const { error } = await adminDb.from('notification_subscribers').upsert({
                uuid: targetUuid,
                device_id: uniqueId,
                subscribers: JSON.parse(JSON.stringify(subscription))
            });

            if (error) throw error;

            updateBtnUI(true);
            Swal.fire({ title: "Enabled!", icon: "success" });
        }
    } catch (err) {
        console.error("Admin Notify Error:", err);
        Swal.fire({ title: "Setup Failed", text: err.message, icon: "error" });
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