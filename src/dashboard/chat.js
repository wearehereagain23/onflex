/**
 * chat.js - Production Ready (Vercel Fixed)
 */

let selectedFile = null;
let chatChannel = null;
let activeUser = null;

// --- 1. INITIALIZATION ---

window.addEventListener('userDataUpdated', (e) => {
    const user = e.detail;
    if (user && user.uuid) {
        activeUser = user;
        loadChatHistory(user.uuid);
        subscribeToLiveChat(user.uuid);
        checkInitialUnread(user.uuid);
    }
});

async function checkInitialUnread(uuid) {
    const { data } = await supabase.from('chats').select('id')
        .eq('uuid', uuid).eq('sender', 'admin').eq('is_read', false).limit(1);
    if (data && data.length > 0) toggleVibration(true);
}

function subscribeToLiveChat(uuid) {
    if (chatChannel) supabase.removeChannel(chatChannel);
    chatChannel = supabase.channel(`chat-${uuid}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chats', filter: `uuid=eq.${uuid}` },
            (payload) => {
                appendMessage(payload.new);
                const modal = document.getElementById("chatModal");
                if (payload.new.sender === 'admin' && modal.style.display !== "flex") toggleVibration(true);
            }).subscribe();
}

// --- 2. MESSAGE RENDERING ---

function appendMessage(msg) {
    const chatBody = document.getElementById("chatBody");
    if (!chatBody || document.getElementById(`msg-${msg.id}`)) return;

    const wrapper = document.createElement('div');
    wrapper.id = `msg-${msg.id}`;
    wrapper.className = `msg-wrapper ${msg.sender}-wrapper`;

    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    wrapper.innerHTML = `
        <div class="msg msg-${msg.sender}">
            ${msg.image_url ? `
                <div class="chat-image-box">
                    <img src="${msg.image_url}" class="msg-img" 
                         style="max-width:200px; border-radius:10px; cursor:pointer;" 
                         onclick="window.open('${msg.image_url}')"
                         onload="scrollToBottom()">
                </div>` : ''}
            ${msg.text ? `<div class="msg-text">${msg.text}</div>` : ''}
            <div class="msg-meta"><span class="msg-time">${time}</span></div>
        </div>
    `;
    chatBody.appendChild(wrapper);
    scrollToBottom();
}

async function loadChatHistory(uuid) {
    const chatBody = document.getElementById("chatBody");
    const { data, error } = await supabase.from('chats').select('*')
        .eq('uuid', uuid).order('created_at', { ascending: true });
    if (chatBody && data) {
        chatBody.innerHTML = '';
        data.forEach(appendMessage);
        scrollToBottom();
    }
}

// --- 3. CORE SENDING LOGIC (VERCEL FIXES) ---

async function handleMessageSend() {
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendChatBtn');
    if (!activeUser || (!input.value.trim() && !selectedFile)) return;

    if (sendBtn) sendBtn.disabled = true;
    const text = input.value.trim();
    const fileToUpload = selectedFile; // Capture for the async process

    let imageUrl = null;
    try {
        if (fileToUpload) {
            // FIX 1: Sanitize filename. Spaces and special chars break Vercel uploads
            const fileExt = fileToUpload.name.split('.').pop();
            const safeName = `${Date.now()}_userchat.${fileExt}`;
            const filePath = `chat/${safeName}`;

            // FIX 2: Explicitly define Content-Type. 
            // Browsers on localhost often infer this, but production proxies like Vercel need it explicit.
            const { error: uploadError } = await supabase.storage
                .from('chat-attachments')
                .upload(filePath, fileToUpload, {
                    contentType: fileToUpload.type,
                    upsert: false
                });

            if (uploadError) throw uploadError;

            const { data: publicUrl } = supabase.storage.from('chat-attachments').getPublicUrl(filePath);
            imageUrl = publicUrl.publicUrl;
        }

        const { error: insertError } = await supabase.from('chats').insert([{
            uuid: activeUser.uuid,
            text: text,
            sender: 'user',
            sender_name: activeUser.firstname || 'User',
            image_url: imageUrl,
            is_read: false
        }]);

        if (insertError) throw insertError;

        input.value = '';
        clearImageSelection();
        await triggerAdminNotification(activeUser, text || "Sent an attachment");

    } catch (err) {
        console.error("User Send Error:", err);
        Swal.fire({
            icon: 'error',
            title: 'Upload Failed',
            text: 'Ensure the image is under 5MB and your connection is stable.',
            background: '#0C290F', color: '#fff'
        });
    } finally {
        if (sendBtn) sendBtn.disabled = false;
        input.focus();
    }
}

async function triggerAdminNotification(userData, messageText) {
    try {
        const { data: admin } = await supabase.from('admin').select('id, admin_full_version').eq('id', 1).single();
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
    } catch (e) { console.error(e); }
}

// --- 4. UI HELPERS ---

document.getElementById('chatImageInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) return Swal.fire("Error", "File exceeds 5MB limit", "error");
        selectedFile = file;
        const preview = document.getElementById('imagePreview');
        const container = document.getElementById('imagePreviewContainer');
        if (preview) preview.src = URL.createObjectURL(file);
        if (container) container.style.display = 'flex';
    }
});

function clearImageSelection() {
    selectedFile = null;
    const container = document.getElementById('imagePreviewContainer');
    const fileInput = document.getElementById('chatImageInput');
    if (container) container.style.display = 'none';
    if (fileInput) fileInput.value = '';
}

function scrollToBottom() {
    const chatBody = document.getElementById("chatBody");
    if (chatBody) setTimeout(() => chatBody.scrollTop = chatBody.scrollHeight, 50);
}

function toggleVibration(shouldActivate) {
    const btn = document.getElementById('chatBtn');
    if (btn) shouldActivate ? btn.classList.add('attention-active') : btn.classList.remove('attention-active');
}

async function markAsRead(uuid) {
    await supabase.from('chats').update({ is_read: true }).eq('uuid', uuid).eq('sender', 'admin');
    toggleVibration(false);
}

// --- 5. EVENT LISTENERS ---

document.addEventListener('click', async (e) => {
    const modal = document.getElementById("chatModal");
    if (e.target.closest('#chatBtn')) {
        modal.style.display = "flex";
        scrollToBottom();
        if (activeUser?.uuid) await markAsRead(activeUser.uuid);
    } else if (e.target.closest('.close-chat') || e.target === modal) {
        modal.style.display = "none";
    } else if (e.target.closest('#sendChatBtn')) {
        handleMessageSend();
    } else if (e.target.closest('#removeImagePreview')) {
        clearImageSelection();
    }
});

document.getElementById('chatInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleMessageSend();
    }
});