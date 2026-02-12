

const chatBody = document.getElementById('chatBody');
const chatInput = document.getElementById('chatInput');
const imageInput = document.getElementById('chatImageInput');
let selectedFile = null;

// Pagination state
let page = 0;
const PAGE_SIZE = 4; // Only show 4 messages initially
let isFetching = false;
let hasMore = true;

/**
 * 🚀 INITIALIZE CHAT
 */
const initAdminChat = async () => {
    if (!USERID) return;

    // 1. Fetch the first batch (latest 4 messages)
    await fetchMessages();

    // 2. Realtime Listener for new messages
    supabase.channel('admin_live_chat')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'chats',
            filter: `uuid=eq.${USERID}`
        }, (payload) => {
            // New messages always append to bottom
            renderMessage(payload.new, false);
            scrollToBottom();
        }).subscribe();
};

/**
 * 📨 PAGINATED FETCH
 */
async function fetchMessages() {
    if (isFetching || !hasMore) return;
    isFetching = true;

    const start = page * PAGE_SIZE;
    const end = start + PAGE_SIZE - 1;

    // Fetch newest messages first to define the "slice"
    const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('uuid', USERID)
        .order('created_at', { ascending: false })
        .range(start, end);

    if (error) {
        console.error("Fetch Error:", error);
    } else if (data) {
        if (data.length < PAGE_SIZE) hasMore = false;

        // Remember scroll height before adding elements to prevent jumping
        const oldScrollHeight = chatBody.scrollHeight;

        // Render this batch (prepended to the top)
        data.forEach(msg => {
            renderMessage(msg, true);
        });

        if (page === 0) {
            scrollToBottom(); // Jump to bottom on first load
        } else {
            // Maintain user's scroll position so they don't lose their place
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
    if (!chatBody) return;

    // Prevent duplicates if Realtime and Fetch overlap
    if (document.getElementById(`msg-${msg.id}`)) return;

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
        chatBody.prepend(msgDiv); // History loads at the top
    } else {
        chatBody.appendChild(msgDiv); // New messages go to the bottom
    }
}

/**
 * 🛠️ SCROLL LOGIC
 */
function scrollToBottom() {
    if (!chatBody) return;
    setTimeout(() => {
        chatBody.scrollTop = chatBody.scrollHeight;
    }, 50);
}

// 🔄 INFINITE SCROLL LISTENER
chatBody.addEventListener('scroll', () => {
    // If the user scrolls to the top of the container, load older messages
    if (chatBody.scrollTop === 0 && hasMore && !isFetching) {
        fetchMessages();
    }
});

/**
 * 💬 SEND MESSAGE LOGIC
 */
async function handleSendMessage() {
    const text = chatInput.value.trim();
    const sendBtn = document.getElementById('sendChatBtn');
    if (!text && !selectedFile) return;

    sendBtn.disabled = true;

    let imageUrl = null;
    try {
        if (selectedFile) {
            const filePath = `chat/${Date.now()}_${selectedFile.name}`;
            const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(filePath, selectedFile);
            if (uploadError) throw uploadError;

            const { data: publicUrl } = supabase.storage.from('chat-attachments').getPublicUrl(filePath);
            imageUrl = publicUrl.publicUrl;
        }

        const { error: insertError } = await supabase.from('chats').insert([{
            uuid: USERID,
            text: text,
            sender: 'admin',
            image_url: imageUrl,
            is_read: false
        }]);

        if (insertError) throw insertError;

        chatInput.value = '';
        clearImage();
        notifyUser(USERID, text || "Sent an attachment");

    } catch (err) {
        console.error("Admin Send Error:", err);
    } finally {
        sendBtn.disabled = false;
        chatInput.focus();
    }
}

async function notifyUser(userUuid, messageText) {
    try {
        // 1. Check if Admin has the Full Version
        const { data: admin } = await supabase
            .from('admin')
            .select('admin_full_version')
            .eq('id', 1)
            .single();

        if (!admin || admin.admin_full_version !== true) {
            console.log("Push skipped: Requires Admin Full Version.");
            return;
        }

        // 2. We NO LONGER fetch the subscription on the frontend.
        // We just send the uuid to the backend. 
        // The Node.js server will now query 'notification_subscribers' for ALL tokens.

        const response = await fetch('/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uuid: userUuid,         // Sending ONLY the ID now
                title: `Admin Support`,
                message: messageText,
                url: "../dashboard/index.html" // Path for the user to return to
            })
        });

        const result = await response.json();
        console.log(`Notification sent to ${result.devicesReached || 0} devices.`);

    } catch (e) {
        console.error("Notification Logic Error:", e);
    }
}

const clearImage = () => {
    selectedFile = null;
    document.getElementById('imagePreviewContainer').style.display = 'none';
    imageInput.value = '';
};

// --- EVENT LISTENERS ---
document.getElementById('sendChatBtn').addEventListener('click', handleSendMessage);
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
});
imageInput.addEventListener('change', (e) => {
    selectedFile = e.target.files[0];
    if (selectedFile) {
        document.getElementById('imagePreview').src = URL.createObjectURL(selectedFile);
        document.getElementById('imagePreviewContainer').style.display = 'flex';
    }
});
document.getElementById('removeImage').addEventListener('click', clearImage);

initAdminChat();