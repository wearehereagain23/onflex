/**
 * ==========================================================================
 * ONFLEX LIVECHAT DESKTOP & MOBILE SIDEBAR CONTROLLER ENGINE (USER SIDE)
 * ==========================================================================
 */
document.addEventListener("DOMContentLoaded", () => {
    // Dynamic initialization of layout elements into current page context
    if (!document.getElementById("liveChatSidebar")) {
        const chatHtml = `
            <div id="chatBackdropDimmer" class="chat-backdrop-dimmer"></div>
            <div id="liveChatSidebar" class="live-chat-sidebar">
                <div class="chat-sidebar-header">
                    <div class="chat-sidebar-title">💬 Live Support Chat</div>
                    <button id="closeChatBtn" class="chat-close-btn" aria-label="Close Chat Window">&times;</button>
                </div>
                <div id="chatSidebarBody" class="chat-sidebar-body">
                    <div class="msg-wrapper msg-support-wrap">
                        <div class="msg-bubble msg-support-bubble">Welcome to OnFlex Live Assistance! Type your text query below or attach an image file directly. How can we serve your portfolio updates?</div>
                    </div>
                </div>
                <div class="chat-sidebar-footer">
                    <div class="chat-input-wrapper">
                        <label for="chatImageFile" class="chat-action-icon" aria-label="Attach Local Image Asset">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                        </label>
                        <input type="file" id="chatImageFile" accept="image/*" style="display: none;">
                        
                        <input type="text" id="chatTextInput" class="chat-text-input" placeholder="Message content...">
                        
                        <div id="chatSendBtn" class="chat-action-icon" aria-label="Send Query">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML("beforeend", chatHtml);
    }

    // Capture Local Node Elements DOM Binding Matrix References
    const sidebar = document.getElementById("liveChatSidebar");
    const backdrop = document.getElementById("chatBackdropDimmer");
    const closeBtn = document.getElementById("closeChatBtn");
    const sendBtn = document.getElementById("chatSendBtn");
    const textInput = document.getElementById("chatTextInput");
    const fileInput = document.getElementById("chatImageFile");
    const chatBody = document.getElementById("chatSidebarBody");

    // Dual Platform Interface Action Triggers Hooks
    const desktopTrigger = document.getElementById("headerChatBtn");
    const mobileTrigger = document.getElementById("mobileChatTrigger");

    // Unified Express Endpoint Host Resolver
    const BACKEND_URL = "https://api-v2-red.vercel.app";
    const SIGNATURE = "onflex";
    const API_ENDPOINT = `${BACKEND_URL}/api/admin-chat`;

    let chatPollingInterval = null;
    let localMessagesCache = [];

    // Retrieve Active User Session Token
    const getAuthToken = () => {
        const directToken = localStorage.getItem("token") ||
            sessionStorage.getItem("token") ||
            localStorage.getItem("user_session_token");
        if (directToken) return directToken;

        try {
            const rawSession = localStorage.getItem("user_session") || sessionStorage.getItem("user_session");
            if (rawSession) {
                const parsed = JSON.parse(rawSession);
                if (parsed && parsed.token) return parsed.token;
            }
        } catch (e) {
            console.error("Error reading user_session token:", e);
        }

        return "";
    };

    // Decode JWT payload locally to pass explicit user_uuid
    const parseUserUuidFromToken = (jwtToken) => {
        if (!jwtToken) return null;
        try {
            const base64Url = jwtToken.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            const decoded = JSON.parse(jsonPayload);
            return decoded.uuid || decoded.id || decoded.userId || decoded.sub || null;
        } catch (e) {
            return null;
        }
    };

    const toggleOpenChat = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation(); // Prevents event from firing notification handlers
        }
        sidebar.classList.add("active");
        backdrop.classList.add("active");
        fetchLiveMessages();
        if (!chatPollingInterval) {
            chatPollingInterval = setInterval(fetchLiveMessages, 5000);
        }
    };

    const toggleCloseChat = () => {
        sidebar.classList.remove("active");
        backdrop.classList.remove("active");
        if (chatPollingInterval) {
            clearInterval(chatPollingInterval);
            chatPollingInterval = null;
        }
    };

    if (desktopTrigger) desktopTrigger.addEventListener("click", toggleOpenChat);
    if (mobileTrigger) mobileTrigger.addEventListener("click", toggleOpenChat);

    closeBtn.addEventListener("click", toggleCloseChat);
    backdrop.addEventListener("click", toggleCloseChat);

    const injectMessageNode = (textPayload, isUserOwner = true, imagePayload = null, isSavedToDb = false) => {
        const wrap = document.createElement("div");
        wrap.className = `msg-wrapper ${isUserOwner ? 'msg-user-wrap' : 'msg-support-wrap'}`;

        const bubble = document.createElement("div");
        bubble.className = `msg-bubble ${isUserOwner ? 'msg-user-bubble' : 'msg-support-bubble'}`;

        if (imagePayload) {
            const previewImg = document.createElement("img");
            previewImg.src = imagePayload;
            previewImg.className = "chat-preview-img";
            previewImg.style.maxWidth = "100%";
            previewImg.style.borderRadius = "6px";
            previewImg.style.display = "block";
            previewImg.style.marginBottom = "4px";
            bubble.appendChild(previewImg);
        }

        if (textPayload) {
            const textNode = document.createElement("div");
            textNode.textContent = textPayload;
            bubble.appendChild(textNode);
        }

        // Ticks indicator for sent user messages
        if (isUserOwner) {
            const tickNode = document.createElement("span");
            tickNode.className = "chat-tick-status";
            tickNode.style.cssText = "font-size: 11px; margin-left: 6px; float: right; opacity: 0.7; font-weight: 600;";
            // Double tick (✓✓) if confirmed saved in DB, Single tick (✓) if optimistic pending
            tickNode.innerHTML = isSavedToDb ? "&#10003;&#10003;" : "&#10003;";
            bubble.appendChild(tickNode);
        }

        wrap.appendChild(bubble);
        chatBody.appendChild(wrap);
        chatBody.scrollTop = chatBody.scrollHeight;
    };

    const renderDatabaseChatHistory = (messages) => {
        chatBody.innerHTML = `
            <div class="msg-wrapper msg-support-wrap">
                <div class="msg-bubble msg-support-bubble">Welcome to OnFlex Live Assistance! Type your text query below or attach an image file directly. How can we serve your portfolio updates?</div>
            </div>
        `;

        messages.forEach(msg => {
            const isUserOwner = (msg.sender_role === "user");
            // Database loaded messages set isSavedToDb = true
            injectMessageNode(msg.message_body, isUserOwner, msg.attachment_url, true);
        });
    };

    const fetchLiveMessages = async () => {
        const currentToken = getAuthToken();
        if (!currentToken) return;

        const userUuid = parseUserUuidFromToken(currentToken);
        const requestUrl = userUuid
            ? `${API_ENDPOINT}?uuid=${userUuid}&page=1&limit=50&t=${Date.now()}`
            : `${API_ENDPOINT}?page=1&limit=50&t=${Date.now()}`;

        try {
            const res = await fetch(requestUrl, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${currentToken}`,
                    "x-signature": SIGNATURE
                }
            });

            if (!res.ok) return;

            const textResponse = await res.text();
            if (!textResponse) return;

            const result = JSON.parse(textResponse);
            const serverMsgs = result.chats || result.data || result.messages || [];

            if (JSON.stringify(serverMsgs) !== JSON.stringify(localMessagesCache)) {
                localMessagesCache = serverMsgs;
                renderDatabaseChatHistory(serverMsgs);
            }
        } catch (err) {
            console.error("Chat sync error:", err.message);
        }
    };

    const processTextMessageSend = async () => {
        const currentToken = getAuthToken();
        if (!currentToken) {
            alert("Session expired. Please log in again.");
            return;
        }

        const rawContent = textInput.value.trim();
        const selectedAssetFile = fileInput.files[0];

        if (!rawContent && !selectedAssetFile) return;

        let attachmentUrl = null;

        if (selectedAssetFile) {
            attachmentUrl = await new Promise((resolve) => {
                const dataReader = new FileReader();
                dataReader.onload = (event) => resolve(event.target.result);
                dataReader.readAsDataURL(selectedAssetFile);
            });
        }

        const userUuid = parseUserUuidFromToken(currentToken);

        textInput.value = "";
        fileInput.value = "";

        // Optimistic UI Append with single tick (isSavedToDb = false)
        injectMessageNode(rawContent, true, attachmentUrl, false);

        try {
            const response = await fetch(API_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${currentToken}`,
                    "x-signature": SIGNATURE
                },
                body: JSON.stringify({
                    user_uuid: userUuid,
                    message_body: rawContent || null,
                    attachment_url: attachmentUrl || null,
                    signature: SIGNATURE
                })
            });

            if (!response.ok) return;

            const textResponse = await response.text();
            const resData = textResponse ? JSON.parse(textResponse) : {};

            if (resData.success) {
                fetchLiveMessages();
            }
        } catch (err) {
            console.error("Error dispatching chat payload:", err);
        }
    };

    sendBtn.addEventListener("click", processTextMessageSend);
    textInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") processTextMessageSend();
    });

    fileInput.addEventListener("change", () => {
        if (fileInput.files.length > 0) {
            processTextMessageSend();
        }
    });
});