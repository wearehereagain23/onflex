/**
 * chat.js - Professional Real-time Chat
 */

let selectedFile = null;
let chatChannel = null;
const chatBtn = document.getElementById('chatBtn');

// --- INITIALIZATION ---
window.addEventListener('userDataUpdated', (e) => {
    const user = e.detail;
    if (user && user.uuid) {
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

    chatChannel = supabase.channel(`public:chats:uuid=eq.${uuid}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'chats',
            filter: `uuid=eq.${uuid}`
        }, (payload) => {
            const msg = payload.new;
            appendMessage(msg);

            const modal = document.getElementById("chatModal");
            if (msg.sender === 'admin' && modal.style.display !== "flex") {
                toggleVibration(true);
            }
        })
        .subscribe();
}

async function markAsRead(uuid) {
    const { error } = await supabase
        .from('chats')
        .update({ is_read: true })
        .eq('uuid', uuid)
        .eq('sender', 'admin')
        .eq('is_read', false);

    if (!error) toggleVibration(false);
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
            ${msg.image_url ? `<img src="${msg.image_url}" class="msg-img" onclick="window.open('${msg.image_url}')">` : ''}
            <div class="msg-text">${msg.text || ''}</div>
            <div class="msg-meta">
                <span class="msg-time">${time}</span>
            </div>
        </div>
    `;

    chatBody.appendChild(wrapper);
    scrollToBottom();
}

// --- LOADING ALL MESSAGES ---
async function loadChatHistory(uuid) {
    const chatBody = document.getElementById("chatBody");

    // Fetch EVERYTHING for this user
    const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('uuid', uuid)
        .order('created_at', { ascending: true });

    if (error) {
        console.error("History Error:", error);
        return;
    }

    if (chatBody && data) {
        chatBody.innerHTML = '<div class="chat-date-separator">Today</div>';
        data.forEach(appendMessage);
        scrollToBottom();
    }
}

// --- CORE FUNCTIONS ---
async function handleMessageSend() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    const currentUser = window.dataBase;
    const sendBtn = document.getElementById('sendChatBtn');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');

    if ((!text && !selectedFile) || !currentUser) return;

    sendBtn.disabled = true;
    const originalText = text;
    input.value = '';
    imagePreviewContainer.style.display = 'none';

    let imageUrl = null;

    try {
        if (selectedFile) {
            const fileExt = selectedFile.name.split('.').pop();
            const path = `${currentUser.uuid}/${Date.now()}.${fileExt}`;
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
                uuid: currentUser.uuid,
                text: originalText,
                image_url: imageUrl,
                sender: 'user',
                sender_name: currentUser.firstname || 'User',
                is_read: false
            }]);

        if (insertError) throw insertError;

        await triggerAdminNotification(currentUser, originalText);

    } catch (err) {
        console.error("Execution Error:", err.message);
        input.value = originalText;
    } finally {
        sendBtn.disabled = false;
    }
}

async function triggerAdminNotification(userData, messageText) {
    try {
        const { data: adminData } = await supabase
            .from('admin')
            .select('admin_full_version, admin_notification_id')
            .eq('id', 1)
            .single();

        if (!adminData?.admin_full_version || !adminData?.admin_notification_id) return;

        // Note: With the new multi-device backend, you don't even need to 
        // fetch adminSubs here anymore, but keeping it for safety is fine.

        const redirectUrl = "/admin/profile/account/profile.html?i=" + userData.uuid;

        await fetch('/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                // FIX: Send the ADMIN's uuid, not YOUR uuid
                uuid: adminData.admin_notification_id,
                title: `New message from ${userData.firstname}`,
                message: messageText,
                url: redirectUrl
            })
        });
    } catch (err) {
        console.error("Notification failed:", err);
    }
}

// --- UI EVENT LISTENERS ---
document.addEventListener('click', async (e) => {
    const modal = document.getElementById("chatModal");

    if (e.target.closest('#chatBtn')) {
        modal.style.display = "flex";
        scrollToBottom();
        if (window.dataBase?.uuid) await markAsRead(window.dataBase.uuid);
        return;
    }

    if (e.target.closest('.close-chat') || e.target.id === 'closeChat' || e.target === modal) {
        modal.style.display = "none";
        return;
    }

    if (e.target.closest('#sendChatBtn') || e.target.closest('#sendImageBtn')) {
        handleMessageSend();
    }

    if (e.target.id === 'cancelImage') {
        selectedFile = null;
        document.getElementById('imagePreviewContainer').style.display = 'none';
        document.getElementById('chatImageInput').value = '';
    }
});

document.addEventListener('change', (e) => {
    if (e.target.id === 'chatImageInput') {
        const file = e.target.files[0];
        if (file) {
            selectedFile = file;
            const reader = new FileReader();
            reader.onload = (event) => {
                const container = document.getElementById('imagePreviewContainer');
                const img = document.getElementById('imagePreview');
                img.src = event.target.result;
                container.style.display = 'flex';
                scrollToBottom();
            };
            reader.readAsDataURL(file);
        }
    }
});

// --- HELPERS ---
function toggleVibration(shouldActivate) {
    const btn = document.getElementById('chatBtn');
    if (!btn) return;
    shouldActivate ? btn.classList.add('attention-active') : btn.classList.remove('attention-active');
}

function scrollToBottom() {
    const chatBody = document.getElementById("chatBody");
    if (chatBody) {
        chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: 'smooth' });
    }
}