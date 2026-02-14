/**
 * src/dashboard/chat.js
 * FINAL PRODUCTION FIX: Dedicated Listeners & Robust Preview
 */

let selectedFile = null;
let chatChannel = null;
let activeUser = null;


document.addEventListener('DOMContentLoaded', () => {
    setupImageListener();
});

// --- 1. INITIALIZATION & UI SYNC ---
window.addEventListener('userDataUpdated', (e) => {
    activeUser = e.detail;
    if (activeUser?.uuid) {
        loadChatHistory(activeUser.uuid);
        subscribeToLiveChat(activeUser.uuid);
        checkInitialUnread(activeUser.uuid);
    }
});


// --- 2. FIXED: IMAGE PREVIEW LOGIC ---
// We attach this directly to the element as soon as the script loads
const setupImageListener = () => {
    const fileInput = document.getElementById('chatImageInput');

    // Based on your HTML, these are the active preview IDs
    const previewImg = document.getElementById('newImagePreview');
    const previewContainer = document.getElementById('newImagePreviewArea');

    if (!fileInput) {
        console.error("chatImageInput not found");
        return;
    }

    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            Swal.fire("Invalid Type", "Please select an image file", "warning");
            return;
        }

        selectedFile = file;

        if (previewImg && previewContainer) {
            if (previewImg.src.startsWith('blob:')) URL.revokeObjectURL(previewImg.src);

            previewImg.src = URL.createObjectURL(file);
            previewContainer.style.display = 'block'; // Show the preview area
            console.log("Preview active for:", file.name);
        }
    };
};

// Initialize immediately
setupImageListener();

// --- 3. UPDATED: SEND LOGIC ---

async function handleMessageSend() {
    const db = window.supabase;
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendChatBtn');

    if (!db || !activeUser?.uuid) return;

    const text = input.value.trim();
    if (!text && !selectedFile) return;

    if (sendBtn) sendBtn.disabled = true;

    try {
        let imageUrl = null;
        if (selectedFile) {
            const safeName = selectedFile.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
            const filePath = `chat/${Date.now()}_${safeName}`;

            const { error: uploadError } = await db.storage
                .from('chat-attachments')
                .upload(filePath, selectedFile);

            if (uploadError) throw uploadError;

            const { data: publicUrl } = db.storage.from('chat-attachments').getPublicUrl(filePath);
            imageUrl = publicUrl.publicUrl;
        }

        const { error: insertError } = await db.from('chats').insert([{
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
        await triggerAdminNotification(activeUser, text || "Sent an image");

    } catch (err) {
        console.error("Chat Error:", err);
        Swal.fire("Error", "Message failed to send.", "error");
    } finally {
        if (sendBtn) sendBtn.disabled = false;
        input.focus();
    }
}

// --- 4. DATA & REALTIME ---

function subscribeToLiveChat(uuid) {
    const db = window.supabase;
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
        }).subscribe();
}

function appendMessage(msg) {
    const chatBody = document.getElementById("chatBody");
    if (!chatBody || document.getElementById(`msg-${msg.id}`)) return;

    const wrapper = document.createElement('div');
    wrapper.id = `msg-${msg.id}`;
    wrapper.className = `msg-wrapper ${msg.sender}-wrapper`;

    wrapper.innerHTML = `
        <div class="msg msg-${msg.sender}">
            ${msg.image_url ? `<img src="${msg.image_url}" class="msg-img" onclick="window.open('${msg.image_url}')" onload="scrollToBottom()">` : ''}
            ${msg.text ? `<div class="msg-text">${msg.text}</div>` : ''}
            <div class="msg-meta"><span class="msg-time">${new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
        </div>
    `;
    chatBody.appendChild(wrapper);
    scrollToBottom();
}

async function loadChatHistory(uuid) {
    const { data } = await window.supabase.from('chats').select('*').eq('uuid', uuid).order('created_at', { ascending: true });
    if (data) {
        document.getElementById("chatBody").innerHTML = '';
        data.forEach(appendMessage);
        scrollToBottom();
    }
}

// --- 5. HELPERS ---
function clearImageSelection() {
    selectedFile = null;
    const imageInput = document.getElementById('chatImageInput');
    const container = document.getElementById('newImagePreviewArea');
    const previewImg = document.getElementById('newImagePreview');

    if (imageInput) imageInput.value = '';
    if (container) container.style.display = 'none';
    if (previewImg) previewImg.src = '';
}

async function triggerAdminNotification(userData, messageText) {
    try {
        const { data: admin } = await window.supabase.from('admin').select('id, admin_full_version').eq('id', 1).single();
        if (!admin?.admin_full_version) return;
        await fetch('/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uuid: admin.id.toString(),
                title: `Message from ${userData.firstname}`,
                message: messageText,
                url: "/admin/profile/account/profile.html?i=" + userData.uuid
            })
        });
    } catch (e) { console.error(e); }
}

// Event Delegation for Clicks
document.addEventListener('click', (e) => {
    const modal = document.getElementById("chatModal");

    // The "Cancel" button in your footer preview
    if (e.target.id === 'btnCancelUpload' || e.target.id === 'cancelImage') {
        clearImageSelection();
        return;
    }

    // The "Send Image" button in your footer preview
    if (e.target.id === 'btnSendImage' || e.target.id === 'sendImageBtn') {
        handleMessageSend();
        return;
    }

    if (e.target.closest('#chatBtn')) {
        modal.style.display = "flex";
        scrollToBottom();
        if (activeUser?.uuid) markAsRead(activeUser.uuid);
    } else if (e.target.closest('.close-btn') || e.target.id === 'closeChat' || e.target === modal) {
        modal.style.display = "none";
    } else if (e.target.closest('#sendChatBtn')) {
        handleMessageSend();
    }
});

// Keypress logic
document.getElementById('chatInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleMessageSend();
    }
});

function scrollToBottom() {
    const chatBody = document.getElementById("chatBody");
    if (chatBody) setTimeout(() => chatBody.scrollTop = chatBody.scrollHeight, 50);
}