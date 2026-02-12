/**
 * src/admin/profile/account/admin_chat.js
 * REFACTORED: For Global Bridge architecture & centralized initialization
 */

// Local state variables (not shared)
let selectedFile = null;
let page = 0;
const PAGE_SIZE = 10; // Increased for better UX
let isFetching = false;
let hasMore = true;

/**
 * 🚀 INITIALIZE CHAT
 * Called by profile.html inside window.addEventListener('load')
 */
window.initAdminChat = async () => {
    const db = window.supabase;
    const userId = window.USERID;

    if (!userId || !db) {
        console.error("Chat Error: Supabase or USERID not found.");
        return;
    }

    // 1. Fetch the first batch
    await fetchMessages();

    // 2. Realtime Listener for new messages
    db.channel('admin_live_chat')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'chats',
            filter: `uuid=eq.${userId}`
        }, (payload) => {
            // New messages append to bottom
            renderMessage(payload.new, false);
            scrollToBottom();
        }).subscribe();

    // 3. Attach DOM Event Listeners
    setupChatListeners();
};

/**
 * 📨 PAGINATED FETCH
 */
async function fetchMessages() {
    const db = window.supabase;
    const userId = window.USERID;
    const chatBody = document.getElementById('chatBody');

    if (isFetching || !hasMore || !chatBody) return;
    isFetching = true;

    const start = page * PAGE_SIZE;
    const end = start + PAGE_SIZE - 1;

    const { data, error } = await db
        .from('chats')
        .select('*')
        .eq('uuid', userId)
        .order('created_at', { ascending: false })
        .range(start, end);

    if (error) {
        console.error("Fetch Error:", error);
    } else if (data) {
        if (data.length < PAGE_SIZE) hasMore = false;

        const oldScrollHeight = chatBody.scrollHeight;

        data.forEach(msg => {
            renderMessage(msg, true);
        });

        if (page === 0) {
            scrollToBottom();
        } else {
            chatBody.scrollTop = chatBody.scrollHeight - oldScrollHeight;
        }

        page++;
    }
    isFetching = false;
}

/**
 * 🎨 RENDER MESSAGE
 */
function renderMessage(msg, prepend = false) {
    const chatBody = document.getElementById('chatBody');
    if (!chatBody || document.getElementById(`msg-${msg.id}`)) return;

    const isMe = msg.sender === 'admin';
    const msgDiv = document.createElement('div');
    msgDiv.id = `msg-${msg.id}`;
    msgDiv.className = `message ${isMe ? 'sent' : 'received'}`;

    msgDiv.innerHTML = `
        <div class="message-content">
            ${msg.image_url ? `<img src="${msg.image_url}" class="chat-img" onload="if(!${prepend}) scrollToBottom()">` : ''}
            ${msg.text ? `<span>${msg.text}</span>` : ''}
            <span class="time">${new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
    `;

    if (prepend) {
        chatBody.prepend(msgDiv);
    } else {
        chatBody.appendChild(msgDiv);
    }
}

/**
 * 🛠️ DOM LISTENERS
 */
function setupChatListeners() {
    const chatBody = document.getElementById('chatBody');
    const chatInput = document.getElementById('chatInput');
    const imageInput = document.getElementById('chatImageInput');
    const sendBtn = document.getElementById('sendChatBtn');
    const removeImgBtn = document.getElementById('removeImage');

    if (sendBtn) sendBtn.addEventListener('click', handleSendMessage);

    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });
    }

    if (imageInput) {
        imageInput.addEventListener('change', (e) => {
            selectedFile = e.target.files[0];
            if (selectedFile) {
                const preview = document.getElementById('imagePreview');
                const container = document.getElementById('imagePreviewContainer');
                if (preview) preview.src = URL.createObjectURL(selectedFile);
                if (container) container.style.display = 'flex';
            }
        });
    }

    if (removeImgBtn) removeImgBtn.addEventListener('click', clearImage);

    if (chatBody) {
        chatBody.addEventListener('scroll', () => {
            if (chatBody.scrollTop === 0 && hasMore && !isFetching) {
                fetchMessages();
            }
        });
    }
}

/**
 * 💬 SEND MESSAGE LOGIC
 */
async function handleSendMessage() {
    const db = window.supabase;
    const userId = window.USERID;
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendChatBtn');

    const text = chatInput?.value.trim();
    if (!text && !selectedFile) return;

    if (sendBtn) sendBtn.disabled = true;

    let imageUrl = null;
    try {
        if (selectedFile) {
            const filePath = `chat/${Date.now()}_${selectedFile.name}`;
            const { error: uploadError } = await db.storage.from('chat-attachments').upload(filePath, selectedFile);
            if (uploadError) throw uploadError;

            const { data: publicUrl } = db.storage.from('chat-attachments').getPublicUrl(filePath);
            imageUrl = publicUrl.publicUrl;
        }

        const { error: insertError } = await db.from('chats').insert([{
            uuid: userId,
            text: text,
            sender: 'admin',
            image_url: imageUrl,
            is_read: false
        }]);

        if (insertError) throw insertError;

        if (chatInput) chatInput.value = '';
        clearImage();
        notifyUser(userId, text || "Sent an attachment");

    } catch (err) {
        console.error("Admin Send Error:", err);
    } finally {
        if (sendBtn) sendBtn.disabled = false;
        if (chatInput) chatInput.focus();
    }
}

/**
 * 🔔 PUSH NOTIFICATIONS
 */
async function notifyUser(userUuid, messageText) {
    const db = window.supabase;
    try {
        const { data: admin } = await db.from('admin').select('admin_full_version').eq('id', 1).single();
        if (!admin || admin.admin_full_version !== true) return;

        await fetch('/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uuid: userUuid,
                title: `Admin Support`,
                message: messageText,
                url: "../dashboard/index.html"
            })
        });
    } catch (e) {
        console.error("Notification Error:", e);
    }
}

function clearImage() {
    selectedFile = null;
    const container = document.getElementById('imagePreviewContainer');
    const imageInput = document.getElementById('chatImageInput');
    if (container) container.style.display = 'none';
    if (imageInput) imageInput.value = '';
}

function scrollToBottom() {
    const chatBody = document.getElementById('chatBody');
    if (!chatBody) return;
    setTimeout(() => {
        chatBody.scrollTop = chatBody.scrollHeight;
    }, 50);
}