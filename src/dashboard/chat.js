/**
 * chat.js - Professional Real-time Chat
 */

let selectedFile = null;
let chatChannel = null;
const chatBtn = document.getElementById('chatBtn');
// Global user reference to ensure 'handleMessageSend' always has the ID
let activeUser = null;

// --- INITIALIZATION ---
window.addEventListener('userDataUpdated', (e) => {
    const user = e.detail;
    if (user && user.uuid) {
        activeUser = user; // Set our global reference
        loadChatHistory(user.uuid);
        subscribeToLiveChat(user.uuid);
        checkInitialUnread(user.uuid);
    }
});

async function checkInitialUnread(uuid) {
    const { data } = await supabase
        .from('chats')
        .select('id')
        .eq('uuid', uuid)
        .eq('sender', 'admin')
        .eq('is_read', false)
        .limit(1);

    if (data && data.length > 0) toggleVibration(true);
}

function subscribeToLiveChat(uuid) {
    if (chatChannel) supabase.removeChannel(chatChannel);

    // Ensure filter is precise
    chatChannel = supabase.channel(`chat-${uuid}`)
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

// --- MESSAGE RENDERING ---
function appendMessage(msg) {
    const chatBody = document.getElementById("chatBody");
    if (!chatBody || document.getElementById(`msg-${msg.id}`)) return;

    const wrapper = document.createElement('div');
    wrapper.id = `msg-${msg.id}`;
    wrapper.className = `msg-wrapper ${msg.sender}-wrapper`;

    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    wrapper.innerHTML = `
        <div class="msg msg-${msg.sender}">
            ${msg.image_url ? `<img src="${msg.image_url}" class="msg-img" style="max-width:200px; border-radius:10px; cursor:pointer;" onclick="window.open('${msg.image_url}')">` : ''}
            ${msg.text ? `<div class="msg-text">${msg.text}</div>` : ''}
            <div class="msg-meta"><span class="msg-time">${time}</span></div>
        </div>
    `;

    chatBody.appendChild(wrapper);
    scrollToBottom();
}

// --- LOADING ALL MESSAGES ---
async function loadChatHistory(uuid) {
    const chatBody = document.getElementById("chatBody");
    const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('uuid', uuid)
        .order('created_at', { ascending: true });

    if (error) return console.error("History Error:", error);

    if (chatBody && data) {
        chatBody.innerHTML = ''; // Clear loaders
        data.forEach(appendMessage);
        scrollToBottom();
    }
}

// --- CORE FUNCTIONS ---
async function handleMessageSend() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    const sendBtn = document.getElementById('sendChatBtn');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');

    // FIX: Use activeUser instead of window.dataBase
    if ((!text && !selectedFile) || !activeUser) return;

    sendBtn.disabled = true;
    const originalText = text;
    input.value = '';
    imagePreviewContainer.style.display = 'none';

    let imageUrl = null;

    try {
        if (selectedFile) {
            const fileExt = selectedFile.name.split('.').pop();
            const path = `chat/${activeUser.uuid}/${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('chat-attachments')
                .upload(path, selectedFile);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from('chat-attachments').getPublicUrl(path);
            imageUrl = urlData.publicUrl;
            selectedFile = null;
        }

        const { error: insertError } = await supabase
            .from('chats')
            .insert([{
                uuid: activeUser.uuid,
                text: originalText,
                image_url: imageUrl,
                sender: 'user',
                sender_name: activeUser.firstname || 'User',
                is_read: false
            }]);

        if (insertError) throw insertError;

        // Notification routing
        await triggerAdminNotification(activeUser, originalText || "Sent an image");

    } catch (err) {
        console.error("Chat Send Error:", err.message);
        input.value = originalText;
    } finally {
        sendBtn.disabled = false;
    }
}

async function triggerAdminNotification(userData, messageText) {
    try {
        const { data: admin } = await supabase.from('admin').select('*').eq('id', 1).single();
        if (!admin?.admin_full_version || !admin?.admin_notification_id) return;

        // Route to the specific admin profile view
        const redirectUrl = "/admin/profile/account/profile.html?i=" + userData.uuid;

        await fetch('/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uuid: admin.admin_notification_id, // TARGET: Admin's notify ID
                title: `Message from ${userData.firstname}`,
                message: messageText.substring(0, 50) + "...",
                url: redirectUrl
            })
        });
    } catch (err) {
        console.error("Admin Push Error:", err);
    }
}

// --- EVENT LISTENERS ---
document.addEventListener('click', async (e) => {
    const modal = document.getElementById("chatModal");

    if (e.target.closest('#chatBtn')) {
        modal.style.display = "flex";
        scrollToBottom();
        if (activeUser?.uuid) await markAsRead(activeUser.uuid);
        return;
    }

    if (e.target.closest('.close-chat') || e.target.id === 'closeChat' || e.target === modal) {
        modal.style.display = "none";
        return;
    }

    if (e.target.closest('#sendChatBtn')) {
        handleMessageSend();
    }
});

// Helper for 'Enter' key sending
document.getElementById('chatInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleMessageSend();
    }
});

function markAsRead(uuid) {
    supabase.from('chats').update({ is_read: true })
        .eq('uuid', uuid).eq('sender', 'admin').eq('is_read', false)
        .then(() => toggleVibration(false));
}

function toggleVibration(shouldActivate) {
    const btn = document.getElementById('chatBtn');
    if (btn) shouldActivate ? btn.classList.add('attention-active') : btn.classList.remove('attention-active');
}

function scrollToBottom() {
    const chatBody = document.getElementById("chatBody");
    if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;
}