/**
 * src/admin/profile/account/note.js
 * REFACTORED: Uses Global Bridge architecture
 */

window.initNoteLogic = () => {
    const db = window.supabase;
    const userId = window.USERID;
    const NOTIFY_BTN = document.getElementById('NOTIFY');

    if (!NOTIFY_BTN || !db) return;

    NOTIFY_BTN.addEventListener('click', async () => {
        const titleEl = document.getElementById('title');
        const messageEl = document.querySelector('input[name="notification"]');
        const formEl = document.getElementById('notification');

        const title = titleEl?.value;
        const message = messageEl?.value;

        if (!title || !message) {
            return Swal.fire({
                title: "Required",
                text: "Please fill in all fields",
                icon: "warning",
                background: '#0C290F', color: '#fff'
            });
        }

        if (!userId) return Swal.fire("Error", "No User ID detected in URL", "error");

        try {
            if (window.showSpinnerModal) window.showSpinnerModal();

            // 1. Fetch Admin Status (Full vs Lite version)
            const { data: admin } = await db.from('admin').select('admin_full_version').eq('id', 1).single();
            const isFullVersion = admin?.admin_full_version === true;

            // 2. ALWAYS save to 'notifications' table for the user's inbox
            const { error: dbError } = await db.from('notifications').insert([{
                uuid: userId,
                title: title,
                message: message
            }]);

            if (dbError) throw new Error("Could not save to database");

            // 3. Increment Notification Badge Count via RPC
            const { error: incError } = await db.rpc('increment_notification_count', { target_uuid: userId });
            if (incError) console.error("Count Increment Failed:", incError.message);

            // 4. Conditional Push Logic (Browser Notifications)
            if (isFullVersion) {
                const { data: subs } = await db.from('notification_subscribers').select('subscribers').eq('uuid', userId);

                if (subs && subs.length > 0) {
                    let successCount = 0;
                    for (const s of subs) {
                        try {
                            const res = await fetch("/subscribe", {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    subscription: s.subscribers,
                                    uuid: userId,
                                    title: title,
                                    message: message,
                                    url: "dashboard/index.html"
                                })
                            });
                            if (res.ok) successCount++;
                        } catch (e) { console.error("Push fetch failed", e); }
                    }

                    Swal.fire({
                        title: "Success",
                        text: `Push sent to ${successCount} device(s) and count updated.`,
                        icon: "success",
                        background: '#0C290F', color: '#fff'
                    });
                } else {
                    Swal.fire({
                        title: "Saved",
                        text: "Record saved. User has no active push devices enabled.",
                        icon: "info",
                        background: '#0C290F', color: '#fff'
                    });
                }
            } else {
                // Lite Version Feedback
                Swal.fire({
                    title: "Delivered",
                    text: "Notification saved to user inbox (Push requires Full Version).",
                    icon: "success",
                    background: '#0C290F', color: '#fff'
                });
            }

            // Reset form on success
            if (formEl) formEl.reset();

        } catch (err) {
            console.error("Note Logic Error:", err);
            Swal.fire({
                title: "Error",
                text: err.message,
                icon: "error",
                background: '#0C290F', color: '#fff'
            });
        } finally {
            if (window.hideSpinnerModal) window.hideSpinnerModal();
        }
    });
};