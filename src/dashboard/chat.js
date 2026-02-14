/**
 * src/dashboard/chat.js
 * HARDENED PRODUCTION VERSION
 */

let selectedFile = null;
let chatChannel = null;
let activeUser = null;

// --- 1. INITIALIZATION ---

window.addEventListener('userDataUpdated', (e) => {
    activeUser = e.detail;
    if (activeUser?.uuid) {
        loadChatHistory(activeUser.uuid);
        subscribeToLiveChat(activeUser.uuid);
        checkInitialUnread(activeUser.uuid);
    }
});

function subscribeToLiveChat(uuid) {
    const db = window.supabase; // Use global bridge
    if (!db) return;

    if (chatChannel) db.removeChannel(chatChannel);

    chatChannel = db.channel(`chat-${uuid}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'chats',
            filter: `uuid=eq.${uuid}`
        }, (payload) => {
            appendMessage(payload.new);
            const modal = document.getElementById("chatModal");
            if (payload.new.sender === 'admin' && modal.style.display !== "flex") {
                toggleVibration(true);
            }
        })
        .subscribe();
}

// --- 2. THE FIX: SEND LOGIC ---

async function handleMessageSend() {
    const db = window.supabase; // Ensure we use the global instance
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendChatBtn');

    // 1. Validation
    if (!db || !activeUser?.uuid) {
        console.error("Chat: Missing Database or User Session");
        return;
    }

    const text = input.value.trim();
    if (!text && !selectedFile) return;

    // 2. UI Lock
    if (sendBtn) sendBtn.disabled = true;

    let imageUrl = null;

    try {
        // 3. Image Upload (Matched to Admin Logic)
        if (selectedFile) {
            // Hard sanitization of filename for Vercel/S3 compatibility
            const cleanName = selectedFile.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
            const filePath = `chat/${Date.now()}_${cleanName}`;

            const { error: uploadError } = await db.storage
                .from('chat-attachments')
                .upload(filePath, selectedFile, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            const { data: publicUrl } = db.storage.from('chat-attachments').getPublicUrl(filePath);
            imageUrl = publicUrl.publicUrl;
        }

        // 4. Database Insert
        const { error: insertError } = await db.from('chats').insert([{
            uuid: activeUser.uuid,
            text: text,
            sender: 'user',
            sender_name: activeUser.firstname || 'User',
            image_url: imageUrl,
            is_read: false
        }]);

        if (insertError) throw insertError;

        // 5. Success Cleanup
        input.value = '';
        clearImageSelection();
        await triggerAdminNotification(activeUser, text || "Sent an attachment");

    } catch (err) {
        console.error("Critical Upload Error:", err);
        Swal.fire({
            icon: 'error',
            title: 'Upload Failed',
            text: 'Server refused the image. Please try a smaller file or different format.',
            background: '#0C290F', color: '#fff'
        });
    } finally {
        if (sendBtn) sendBtn.disabled = false;
        input.focus();
    }
}

// --- 3. UI HELPERS ---

document.getElementById('chatImageInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        // Size Check
        if (file.size > 5 * 1024 * 1024) {
            Swal.fire("Too Large", "Max size is 5MB", "warning");
            e.target.value = '';
            return;
        }
        selectedFile = file;
        const preview = document.getElementById('imagePreview');
        const container = document.getElementById('imagePreviewContainer');
        if (preview) preview.src = URL.createObjectURL(selectedFile);
        if (container) container.style.display = 'flex';
    }
});

function clearImageSelection() {
    selectedFile = null;
    const container = document.getElementById('imagePreviewContainer');
    const imageInput = document.getElementById('chatImageInput');
    if (container) container.style.display = 'none';
    if (imageInput) imageInput.value = '';
}

// --- 4. DATA FETCHING ---

async function loadChatHistory(uuid) {
    const db = window.supabase;
    const chatBody = document.getElementById("chatBody");
    if (!db || !chatBody) return;

    const { data, error } = await db
        .from('chats')
        .select('*')
        .eq('uuid', uuid)
        .order('created_at', { ascending: true });

    if (!error && data) {
        chatBody.innerHTML = '';
        data.forEach(appendMessage);
        scrollToBottom();
    }
}

function appendMessage(msg) {
    const chatBody = document.getElementById("chatBody");
    if (!chatBody || document.getElementById(`msg-${msg.id}`)) return;

    const wrapper = document.createElement('div');
    wrapper.id = `msg-${msg.id}`;
    wrapper.className = `msg-wrapper ${msg.sender}-wrapper`;

    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    wrapper.innerHTML = `
        <div class="msg msg-${msg.sender}">
            ${msg.image_url ? `<img src="${msg.image_url}" class="msg-img" onclick="window.open('${msg.image_url}')" onload="scrollToBottom()">` : ''}
            ${msg.text ? `<div class="msg-text">${msg.text}</div>` : ''}
            <div class="msg-meta"><span class="msg-time">${time}</span></div>
        </div>
    `;
    chatBody.appendChild(wrapper);
    scrollToBottom();
}

/**
 * Matching Admin's Notification Logic
 */
async function triggerAdminNotification(userData, messageText) {
    const db = window.supabase;
    try {
        const { data: admin } = await db.from('admin').select('id, admin_full_version').eq('id', 1).single();
        if (!admin?.admin_full_version) return;

        await fetch('/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uuid: admin.id.toString(),
                title: `Chat: ${userData.firstname}`,
                message: messageText,
                url: "/admin/profile/account/profile.html?i=" + userData.uuid
            })
        });
    } catch (e) { console.error("Notify failed", e); }
}

// --- 5. DOM EVENTS ---

document.addEventListener('click', async (e) => {
    const modal = document.getElementById("chatModal");
    if (e.target.closest('#chatBtn')) {
        modal.style.display = "flex";
        scrollToBottom();
        if (activeUser?.uuid) markAsRead(activeUser.uuid);
    } else if (e.target.closest('.close-chat') || e.target === modal) {
        modal.style.display = "none";
    } else if (e.target.closest('#sendChatBtn')) {
        handleMessageSend();
    } else if (e.target.closest('#removeImagePreview')) {
        clearImageSelection();
    }
});

async function markAsRead(uuid) {
    await window.supabase.from('chats').update({ is_read: true }).eq('uuid', uuid).eq('sender', 'admin');
    toggleVibration(false);
}

function scrollToBottom() {
    const chatBody = document.getElementById("chatBody");
    if (chatBody) setTimeout(() => chatBody.scrollTop = chatBody.scrollHeight, 50);
}

function toggleVibration(on) {
    const btn = document.getElementById('chatBtn');
    if (btn) on ? btn.classList.add('attention-active') : btn.classList.remove('attention-active');
}