import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
const urlParams = new URLSearchParams(window.location.search);
const USERID = urlParams.get('i');

const NOTIFY_BTN = document.getElementById('NOTIFY');

NOTIFY_BTN?.addEventListener('click', async () => {
    const title = document.getElementById('title').value;
    const message = document.querySelector('input[name="notification"]').value;

    if (!title || !message) return Swal.fire("Required", "Fill all fields", "warning");
    if (!USERID) return Swal.fire("Error", "No User ID detected", "error");

    try {
        // 1. Fetch Admin Status
        const { data: admin } = await supabase.from('admin').select('admin_full_version').eq('id', 1).single();
        const isFullVersion = admin?.admin_full_version === true;

        // 2. ALWAYS save to 'notifications' table
        const { error: dbError } = await supabase.from('notifications').insert([{
            uuid: USERID,
            title: title,
            message: message
        }]);

        if (dbError) throw new Error("Could not save to database");

        // --- NEW LOGIC: INCREMENT NOTIFICATION COUNT ---
        // We call the SQL function we created in Step 1
        const { error: incError } = await supabase.rpc('increment_notification_count', { target_uuid: USERID });
        if (incError) console.error("Count Increment Failed:", incError.message);
        // -----------------------------------------------

        // 3. Conditional Push Logic
        if (isFullVersion) {
            const { data: subs } = await supabase.from('notification_subscribers').select('subscribers').eq('uuid', USERID);

            if (subs && subs.length > 0) {
                let successCount = 0;
                for (const s of subs) {
                    try {
                        const res = await fetch("/subscribe", {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                subscription: s.subscribers,
                                uuid: USERID,
                                title: title,
                                message: message,
                                url: "dashboard/index.html"
                            })
                        });
                        if (res.ok) successCount++;
                    } catch (e) { console.error("Push failed", e); }
                }

                return Swal.fire({
                    title: "Success",
                    text: `Push sent to ${successCount} device(s) and count updated.`,
                    icon: "success",
                    background: '#0C290F', color: '#fff'
                });
            }

            return Swal.fire({
                title: "Saved",
                text: "User has no active push devices. Count updated in dashboard.",
                icon: "info",
                background: '#0C290F', color: '#fff'
            });

        } else {
            return Swal.fire({
                title: "Delivered",
                text: "Notification count incremented and message saved.",
                icon: "success",
                background: '#0C290F', color: '#fff'
            });
        }

    } catch (err) {
        console.error(err);
        Swal.fire("Error", err.message, "error");
    } finally {
        document.getElementById('notification').reset();
    }
});