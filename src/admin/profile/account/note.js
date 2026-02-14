/**
 * src/admin/profile/account/note.js
 * FIXED: Matched to Chat Logic (No frontend loops)
 */
window.initNoteLogic = () => {
    const db = window.supabase;
    const userId = window.USERID;
    const NOTIFY_BTN = document.getElementById('NOTIFY');

    if (!NOTIFY_BTN || !db) return;

    // Remove old listeners
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

            // 1. Save to database (User's Inbox)
            const { error: dbError } = await db.from('notifications').insert([{
                uuid: userId,
                title: title,
                message: message
            }]);
            if (dbError) throw dbError;

            // 2. Increment Badge Count
            await db.rpc('increment_notification_count', { target_uuid: userId });

            // 3. PUSH LOGIC (SPYING ON CHAT LOGIC)
            // We check admin version first
            const { data: admin } = await db.from('admin').select('admin_full_version').eq('id', 1).single();

            if (admin?.admin_full_version === true) {
                // We send ONLY the uuid, title, and message to the server
                // Just like handleSendMessage() does in admin_chat.js
                await fetch("/subscribe", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        uuid: userId,      // The server uses this to find the unique devices
                        title: title,
                        message: message,
                        url: "dashboard/index.html"
                    })
                });

                Swal.fire({
                    title: "Success",
                    text: `Notification delivered to user's devices.`,
                    icon: "success",
                    background: '#0C290F', color: '#fff'
                });
            } else {
                Swal.fire({ title: "Delivered", text: "Saved to user inbox (Lite Version).", icon: "success", background: '#0C290F', color: '#fff' });
            }

            if (formEl) formEl.reset();

        } catch (err) {
            console.error("Note Logic Error:", err);
            Swal.fire({ title: "Error", text: err.message, icon: "error", background: '#0C290F', color: '#fff' });
        } finally {
            if (window.hideSpinnerModal) window.hideSpinnerModal();
        }
    });
};

// Auto-run
if (document.getElementById('NOTIFY')) window.initNoteLogic();