/**
 * ==========================================================================
 * ONFLEX APPLICATION UNIFIED NOTIFICATION SUBSYSTEM (DATABASE CONNECTED)
 * ==========================================================================
 */
document.addEventListener("DOMContentLoaded", () => {

    // Define Express backend target URL
    const BACKEND_URL = "http://localhost:5000";
    const SIGNATURE = "onflex";

    // ----------------------------------------------------------------------
    // PHASE 1: EXACT BUTTON LOCATION ENGINE
    // ----------------------------------------------------------------------
    const locateNotificationBtn = () => {
        const primaryBtn = document.getElementById("notifyBtn") ||
            document.getElementById("notificationBtn") ||
            document.querySelector(".notification-btn");
        if (primaryBtn) return primaryBtn;

        const pathQuery = document.querySelector('button svg path[d^="M18 8A6"]') || document.querySelector('button svg path[d^="M6 8a6"]');
        return pathQuery ? pathQuery.closest('button') : null;
    };

    const notifBtn = locateNotificationBtn();
    if (!notifBtn) {
        console.warn("Unable to map notification action handle inside dashboard layout structure.");
        return;
    }

    // Keep notification bell icon always visible
    notifBtn.style.display = "";

    // ----------------------------------------------------------------------
    // PHASE 2: UI CONTAINER INJECTION
    // ----------------------------------------------------------------------
    const wrapper = document.createElement("div");
    wrapper.className = "notification-trigger-wrapper";
    notifBtn.parentNode.insertBefore(wrapper, notifBtn);
    wrapper.appendChild(notifBtn);

    const panelHtml = `
        <div id="notificationBadge" class="notification-badge"></div>
        <div id="notificationPanel" class="notification-panel">
            <div class="notification-panel-header">
                <span class="notification-panel-title">System Activity Log</span>
                <button id="notifClearAll" class="notification-clear-all">Clear All</button>
            </div>
            <div id="notificationPanelBody" class="notification-panel-body">
                <div id="notifEmptyState" class="notification-empty-state">No real-time portfolio logs flagged.</div>
                <div id="notifSpinner" class="notification-loading-spinner">
                    <div class="spinner-circle"></div>
                    <span>Synchronizing ledger accounts...</span>
                </div>
            </div>
        </div>
    `;
    wrapper.insertAdjacentHTML("beforeend", panelHtml);

    const panel = document.getElementById("notificationPanel");
    const badge = document.getElementById("notificationBadge");
    const panelBody = document.getElementById("notificationPanelBody");
    const clearAllBtn = document.getElementById("notifClearAll");
    const emptyState = document.getElementById("notifEmptyState");
    const spinner = document.getElementById("notifSpinner");

    let isPanelOpen = false;
    let isLoadingMore = false;
    let currentPage = 1;
    let hasMoreData = true;

    // Helper: Dynamic relative time formatter
    const formatTimeAgo = (dateString) => {
        if (!dateString) return "Recently";
        const date = new Date(dateString);
        const seconds = Math.floor((new Date() - date) / 1000);

        if (seconds < 60) return "Just now";
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 30) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    // Retrieve Auth Token
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
            console.error("Error reading token:", e);
        }
        return "";
    };

    // Decode User UUID
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

    const updateUnreadBadge = () => {
        const unreadCount = panelBody.querySelectorAll(".notification-item.unread").length;
        if (unreadCount > 0) {
            badge.classList.add("active");
        } else {
            badge.classList.remove("active");
        }
    };

    // Render single item from query
    const appendNotificationNode = (item) => {
        const element = document.createElement("div");
        element.className = `notification-item ${!item.read ? 'unread' : ''}`;
        element.dataset.id = item.id;

        const notifTitle = item.title || "System Notice";
        const notifBody = item.message || "";
        const formattedTime = formatTimeAgo(item.created_at);

        let iconMarkup = `<div class="notification-icon-box notif-icon-info"><svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></div>`;

        if (notifTitle.toLowerCase().includes("warn") || notifBody.toLowerCase().includes("alert")) {
            iconMarkup = `<div class="notification-icon-box notif-icon-warning"><svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/></svg></div>`;
        } else if (notifTitle.toLowerCase().includes("success") || notifBody.toLowerCase().includes("cleared") || notifBody.toLowerCase().includes("credited")) {
            iconMarkup = `<div class="notification-icon-box notif-icon-success"><svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></div>`;
        }

        element.innerHTML = `
            ${iconMarkup}
            <div class="notification-content">
                <span class="notification-text"><strong>${notifTitle}:</strong> ${notifBody}</span>
                <span class="notification-time">${formattedTime}</span>
            </div>
        `;

        element.addEventListener("click", async () => {
            if (element.classList.contains("unread")) {
                element.classList.remove("unread");
                updateUnreadBadge();

                const token = getAuthToken();
                if (token && item.id) {
                    try {
                        await fetch(`${BACKEND_URL}/api/notifications/read`, {
                            method: "PATCH",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`,
                                "x-signature": SIGNATURE
                            },
                            body: JSON.stringify({ id: item.id })
                        });
                    } catch (err) {
                        console.error("Failed to update notification read status:", err);
                    }
                }
            }
        });

        panelBody.insertBefore(element, spinner);
    };

    // ----------------------------------------------------------------------
    // PHASE 3: FETCH DATA FROM DATABASE API
    // ----------------------------------------------------------------------
    const fetchNotificationsFromDb = async (page = 1) => {
        if (isLoadingMore || !hasMoreData) return;

        isLoadingMore = true;
        spinner.classList.add("active");

        const token = getAuthToken();
        const userUuid = parseUserUuidFromToken(token);

        const requestUrl = `${BACKEND_URL}/api/notifications?uuid=${userUuid || ''}&page=${page}&limit=10&t=${Date.now()}`;

        try {
            const response = await fetch(requestUrl, {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                    "x-signature": SIGNATURE
                }
            });

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }

            const data = await response.json();
            const notificationsList = data.notifications || data.data || [];

            if (page === 1) {
                panelBody.querySelectorAll(".notification-item").forEach(el => el.remove());
            }

            if (notificationsList.length === 0) {
                hasMoreData = false;
                if (page === 1) {
                    emptyState.classList.add("active");
                }
            } else {
                emptyState.classList.remove("active");
                notificationsList.forEach(item => appendNotificationNode(item));
                updateUnreadBadge();
            }

        } catch (err) {
            console.error("Error fetching notifications from DB:", err);
        } finally {
            isLoadingMore = false;
            spinner.classList.remove("active");
        }
    };

    // Initial Load
    fetchNotificationsFromDb(1);

    // Toggle Panel Event
    notifBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        isPanelOpen = !isPanelOpen;
        panel.classList.toggle("active", isPanelOpen);
    });

    document.addEventListener("click", (e) => {
        if (isPanelOpen && !wrapper.contains(e.target)) {
            isPanelOpen = false;
            panel.classList.remove("active");
        }
    });

    // CLEAR ALL: PURGES MESSAGES FROM DB AND RESETS PANEL UI
    clearAllBtn.addEventListener("click", async () => {
        const token = getAuthToken();
        const userUuid = parseUserUuidFromToken(token);

        if (!token) return;

        try {
            const response = await fetch(`${BACKEND_URL}/api/notifications?uuid=${userUuid || ''}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                    "x-signature": SIGNATURE
                }
            });

            if (response.ok) {
                // Remove notification cards from panel
                panelBody.querySelectorAll(".notification-item").forEach(item => item.remove());

                // Reset UI indicators & state
                updateUnreadBadge();
                emptyState.classList.add("active");
                hasMoreData = false;
                currentPage = 1;
            } else {
                console.error("Failed to clear notifications on backend.");
            }
        } catch (err) {
            console.error("Error deleting notifications from database:", err);
        }
    });

    panelBody.addEventListener("scroll", () => {
        const scrollSpaceLeft = panelBody.scrollHeight - panelBody.scrollTop - panelBody.clientHeight;
        if (scrollSpaceLeft <= 15 && hasMoreData && !isLoadingMore) {
            currentPage++;
            fetchNotificationsFromDb(currentPage);
        }
    });
});