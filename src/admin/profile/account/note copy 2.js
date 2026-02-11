import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
const urlParams = new URLSearchParams(window.location.search);
const USERID = urlParams.get('i');

// Backend URL (Update this to your hosted port 9000 URL)
const BACKEND_URL = "http://localhost:9000";

// --- UTILITIES ---
const showSpinnerModal = () => document.getElementById('spinnerModal').style.display = 'flex';
const hideSpinnerModal = () => document.getElementById('spinnerModal').style.display = 'none';

async function safe(fn) {
    try { await fn(); } catch (err) {
        hideSpinnerModal();
        console.error(err);
        Swal.fire({ title: "Error", text: err.message, icon: 'error', background: '#0C290F' });
    }
}

/**
 * 🔒 ADMIN LOCK: Check Permission
 */
const initNotePermissions = async () => {
    const notifyBtn = document.getElementById('NOTIFY');
    const upgradeAlert = document.getElementById('upgradeAlert4');

    const { data: admin } = await supabase.from('admin').select('admin_full_version').eq('id', 1).single();

    if (admin && admin.admin_full_version === false) {
        notifyBtn.disabled = true;
        notifyBtn.classList.add('btn-secondary');
        if (upgradeAlert) upgradeAlert.innerText = " (Upgrade required to send notifications)";
    }
};

/**
 * 🚀 SEND NOTIFICATION LOGIC
 */
document.getElementById('NOTIFY')?.addEventListener('click', () => safe(async () => {
    const title = document.getElementById('title').value;
    const message = document.querySelector('input[name="notification"]').value;

    if (!title || !message) {
        return Swal.fire("Required", "Please fill title and message", "warning");
    }

    showSpinnerModal();

    // 1. Save to 'notifications' table (Always saved for User Dashboard History)
    const { error: dbError } = await supabase.from('notifications').insert([{
        uuid: USERID,
        title: title,
        message: message
    }]);

    if (dbError) throw dbError;

    // 2. Check for Subscribers (Push Notification)
    const { data: subscribers, error: subError } = await supabase
        .from('notification_subscribers')
        .select('subscribers')
        .eq('uuid', USERID);

    if (subError) throw subError;

    if (!subscribers || subscribers.length === 0) {
        // CASE: No Push enabled
        hideSpinnerModal();
        Swal.fire({
            title: "Delivered to Dashboard",
            text: "User has not enabled push notifications on their device. The message was saved to their history, but no popup alert was sent.",
            icon: "info",
            background: '#0C290F'
        });
    } else {
        // CASE: Active Subscribers found - Trigger Express Backend
        let pushCount = 0;

        for (const subRecord of subscribers) {
            try {
                const response = await fetch(`${BACKEND_URL}/subscribe`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        subscription: subRecord.subscribers, // The JSON object from DB
                        uuid: USERID,
                        title: title,
                        message: message
                    })
                });

                if (response.ok) pushCount++;
            } catch (e) {
                console.error("Push delivery failed for one device", e);
            }
        }

        hideSpinnerModal();
        Swal.fire({
            title: "Success",
            text: `Notification sent to ${pushCount} registered device(s).`,
            icon: "success",
            background: '#0C290F'
        });
    }

    // Reset Form
    document.getElementById('notification').reset();
}));

initNotePermissions();