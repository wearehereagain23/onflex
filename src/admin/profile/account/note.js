/**
 * src/admin/profile/account/note.js
 * FIXED: De-duplication logic to prevent multiple alerts on same device
 */

window.initNoteLogic = () => {
    const db = window.supabase;
    const userId = window.USERID;
    const NOTIFY_BTN = document.getElementById('NOTIFY');

    if (!NOTIFY_BTN || !db) return;

    // Clean up existing listeners to prevent logic stacking
    const newButton = NOTIFY_BTN.cloneNode(true);
    NOTIFY_BTN.parentNode.replaceChild(newButton, NOTIFY_BTN);

    newButton.addEventListener('click', async () => {
        const titleEl = document.getElementById('title');
        const messageEl = document.querySelector('input[name="notification"]');
        const formEl = document.getElementById('notification');

        const title = titleEl?.value;
        const message = messageEl?.value;

        if (!title || !message) {
            return Swal.fire({ title: "Required", text: "Fill all fields", icon: "warning", background: '#0C290F', color: '#fff' });
        }

        try {
            if (window.showSpinnerModal) window.showSpinnerModal();

            // 1. Save to User Inbox (Only 1 record here)
            const { error: dbError } = await db.from('notifications').insert([{
                uuid: userId,
                title: title,
                message: message
            }]);
            if (dbError) throw dbError;

            // 2. Increment Badge
            await db.rpc('increment_notification_count', { target_uuid: userId });

            // 3. PUSH LOGIC
            const { data: admin } = await db.from('admin').select('admin_full_version').eq('id', 1).single();

            if (admin?.admin_full_version) {
                const { data: subs } = await db.from('notification_subscribers').select('subscribers').eq('uuid', userId);

                if (subs && subs.length > 0) {
                    // --- THE FIX: DE-DUPLICATE SUBSCRIPTIONS ---
                    // We use the 'endpoint' URL as a unique key so the same device isn't messaged twice
                    const uniqueSubs = new Map();
                    subs.forEach(s => {
                        const subObj = typeof s.subscribers === 'string' ? JSON.parse(s.subscribers) : s.subscribers;
                        if (subObj && subObj.endpoint) {
                            uniqueSubs.set(subObj.endpoint, subObj);
                        }
                    });

                    let successCount = 0;
                    // Now loop through the UNIQUE devices only
                    for (const subscription of uniqueSubs.values()) {
                        try {
                            const res = await fetch("/subscribe", {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    subscription: subscription,
                                    uuid: userId,
                                    title: title,
                                    message: message,
                                    url: "dashboard/index.html"
                                })
                            });
                            if (res.ok) successCount++;
                        } catch (e) { console.error("Push failed for one device", e); }
                    }

                    Swal.fire({
                        title: "Success",
                        text: `Notification sent. Reached ${successCount} unique device(s).`,
                        icon: "success",
                        background: '#0C290F', color: '#fff'
                    });
                }
            } else {
                Swal.fire({ title: "Sent", text: "Saved to user inbox.", icon: "success", background: '#0C290F', color: '#fff' });
            }

            if (formEl) formEl.reset();
        } catch (err) {
            Swal.fire("Error", err.message, "error");
        } finally {
            if (window.hideSpinnerModal) window.hideSpinnerModal();
        }
    });
};