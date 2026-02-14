/**
 * chat.js - Professional Real-time Chat (Complete Version)
 * Handles: Real-time sync, Image Uploads, Admin Notifications, and UI Logic
 */

let selectedFile = null;
let chatChannel = null;
let activeUser = null;

// --- 1. INITIALIZATION & LIVE SYNC ---

window.addEventListener('userDataUpdated', (e) => {
    const user = e.detail;
    if (user && user.uuid) {
        activeUser = user;
        loadChatHistory(user.uuid);
        subscribeToLiveChat(user.uuid);
        checkInitialUnread(user.uuid);
    }
});

/**
 * Checks for unread admin messages to trigger the "attention" vibration icon
 */
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

/**
 * Sets up Supabase Realtime channel for instant message arrival
 */
function subscribeToLiveChat(uuid) {
    if (chatChannel) supabase.removeChannel(chatChannel);

    chatChannel = supabase.channel(`chat-${uuid}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'chats',
            filter: `uuid=eq.${uuid}`
        }, (payload) => {
            appendMessage(payload.new);
            const modal = document.getElementById("chatModal");
            // If message is from admin and chat is closed, shake the icon
            if (payload.new.sender === 'admin' && modal.style.display !== "flex") {
                toggleVibration(true);
            }
        })
        .subscribe();
}

// --- 2. MESSAGE RENDERING ---

/**
 * Appends a message bubble to the chat body
 */
function appendMessage(msg) {
    const chatBody = document.getElementById("chatBody");
    if (!chatBody || document.getElementById(`msg-${msg.id}`)) return;

    const wrapper = document.createElement('div');
    wrapper.id = `msg-${msg.id}`;
    wrapper.className = `msg-wrapper ${msg.sender}-wrapper`;

    const time = new Date(msg.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

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

/**
 * Fetches all previous messages for the user
 */
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

// --- 3. CORE SENDING LOGIC ---

/**
 * Handles the text and image upload process
 */
async function handleMessageSend() {
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendChatBtn');
    const text = input.value.trim();

    if ((!text && !selectedFile) || !activeUser) return;

    // UI Lock
    sendBtn.disabled = true;
    const originalText = text;
    const fileToUpload = selectedFile; // Local reference to currently selected file

    // Immediate cleanup
    input.value = '';
    clearImageSelection();

    let imageUrl = null;

    try {
        // Handle Image Upload if exists
        if (fileToUpload) {
            const fileExt = fileToUpload.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const path = `chat/${activeUser.uuid}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('chat-attachments')
                .upload(path, fileToUpload);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from('chat-attachments').getPublicUrl(path);
            imageUrl = urlData.publicUrl;
        }

        // Insert into DB
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

        // Notify Staff
        await triggerAdminNotification(activeUser, originalText || "Sent an image");

    } catch (err) {
        console.error("Chat Send Error:", err.message);
        input.value = originalText; // Restore text on failure
        Swal.fire("Error", "Message failed to send. Try again.", "error");
    } finally {
        sendBtn.disabled = false;
        input.focus();
    }
}

/**
 * Triggers a push notification to the Admin Panel
 */
async function triggerAdminNotification(userData, messageText) {
    try {
        const { data: admin } = await supabase
            .from('admin')
            .select('id, admin_full_version')
            .eq('id', 1)
            .single();

        if (!admin?.admin_full_version || !admin?.id) return;

        const redirectUrl = "/admin/profile/account/profile.html?i=" + userData.uuid;

        await fetch('/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uuid: admin.id.toString(), // Send to admin ID "1"
                title: `Chat: ${userData.firstname}`,
                message: messageText,
                url: redirectUrl
            })
        });
    } catch (err) {
        console.error("Admin Push Error:", err);
    }
}

// --- 4. UI ASSISTANTS ---

/**
 * Captures image from hidden file input
 */
document.getElementById('chatImageInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        return Swal.fire("Too Large", "Image must be under 5MB", "warning");
    }

    selectedFile = file;
    const container = document.getElementById('imagePreviewContainer');
    const preview = document.getElementById('imagePreview');

    if (container && preview) {
        preview.src = URL.createObjectURL(file);
        container.style.display = 'flex';
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
    if (chatBody) {
        // Small timeout ensures the DOM has rendered the bubble
        setTimeout(() => {
            chatBody.scrollTop = chatBody.scrollHeight;
        }, 50);
    }
}

function toggleVibration(shouldActivate) {
    const btn = document.getElementById('chatBtn');
    if (btn) {
        shouldActivate ? btn.classList.add('attention-active') : btn.classList.remove('attention-active');
    }
}

async function markAsRead(uuid) {
    await supabase.from('chats')
        .update({ is_read: true })
        .eq('uuid', uuid)
        .eq('sender', 'admin')
        .eq('is_read', false);

    toggleVibration(false);
}

// --- 5. EVENT DELEGATION ---

document.addEventListener('click', async (e) => {
    const modal = document.getElementById("chatModal");

    // Open Modal
    if (e.target.closest('#chatBtn')) {
        modal.style.display = "flex";
        scrollToBottom();
        if (activeUser?.uuid) await markAsRead(activeUser.uuid);
        return;
    }

    // Close Modal
    if (e.target.closest('.close-chat') || e.target.id === 'closeChat' || e.target === modal) {
        modal.style.display = "none";
        return;
    }

    // Send Button
    if (e.target.closest('#sendChatBtn')) {
        handleMessageSend();
    }

    // Remove Image Preview
    if (e.target.closest('#removeImagePreview')) {
        clearImageSelection();
    }
});

// Input handling
document.getElementById('chatInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleMessageSend();
    }
});