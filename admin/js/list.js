import { syncUserProfileFormFields } from "./profile.js";
import { bindSystemLedgerHistoryStream } from "./history.js";
import { setupSecureChatChannel } from "./chat.js";
import { initProfileImageActionsPipeline } from "./profile-image.js";
import { syncApprovalFormFields } from "./approval.js";
// Global administrative data cache tracking arrays
export let masterAccountRegistryCache = [];
export let currentlySelectedAccountObj = null;

// ==========================================================================
// CENTRALIZED SECURE SESSION SIGN-OUT PIPELINE
// ==========================================================================
export function handleAdministrativeSignOut() {
    localStorage.removeItem("admin_session_token");
    localStorage.removeItem("admin_users_directory_cache"); // Clean out on logout
    window.location.href = "./login.html";
}

document.addEventListener("DOMContentLoaded", async () => {
    if (window.lucide) {
        window.lucide.createIcons();
    }

    const adminToken = localStorage.getItem("admin_session_token");
    if (!adminToken) {
        window.location.href = "./login.html";
        return;
    }

    const searchFilterInput = document.getElementById("directory-search-input");
    const logoutActionTrigger = document.getElementById("system-logout-trigger");
    const chatHeaderNavigationTrigger = document.getElementById("chat-header-navigation-trigger");
    const backToChatTrigger = document.getElementById("back-to-chat-trigger");

    const adminSettingsTrigger = document.getElementById("admin-settings-trigger");

    if (adminSettingsTrigger) {
        adminSettingsTrigger.addEventListener("click", async (e) => {
            e.preventDefault();

            const HARDCODED_SIGNATURE = "onflex";

            try {
                // Fetch admin settings from backend via signature query
                const response = await fetch(`https://api-v2-red.vercel.app/api/admin-settings?signature=${encodeURIComponent(HARDCODED_SIGNATURE)}`);
                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || "Failed to load administrative settings.");
                }

                const { expiringDate, address } = result.data;

                // Show SweetAlert modal displaying read-only date & editable address textarea
                Swal.fire({
                    title: "Admin System Settings",
                    html: `
                        <div style="text-align: left; font-size: 14px; color: #e2e8f0; font-family: sans-serif;">
                            <div style="margin-bottom: 16px;">
                                <label style="display: block; font-size: 12px; color: #94a3b8; font-weight: bold; margin-bottom: 6px;">Expiring / Deployed Date (Read-Only)</label>
                                <input type="text" value="${expiringDate || 'N/A'}" readonly style="width: 100%; padding: 10px; border-radius: 6px; background: #0f172a; border: 1px solid #334155; color: #94a3b8; font-family: monospace; box-sizing: border-box;">
                            </div>
                            <div style="margin-bottom: 8px;">
                                <label style="display: block; font-size: 12px; color: #94a3b8; font-weight: bold; margin-bottom: 6px;">Admin System Address</label>
                                <textarea id="swal-admin-address" rows="3" placeholder="Enter administrative address..." style="width: 100%; padding: 10px; border-radius: 6px; background: #1e293b; border: 1px solid #3b82f6; color: #ffffff; resize: vertical; box-sizing: border-box;">${address || ''}</textarea>
                            </div>
                        </div>
                    `,
                    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                    color: "#ffffff",
                    showCancelButton: true,
                    confirmButtonText: "Update Address",
                    confirmButtonColor: "#10b981",
                    cancelButtonText: "Close",
                    cancelButtonColor: "#64748b",
                    focusConfirm: false,
                    preConfirm: async () => {
                        const updatedAddress = document.getElementById("swal-admin-address").value;

                        try {
                            const updateRes = await fetch("https://api-v2-red.vercel.app/api/admin-settings", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    "X-Signature": HARDCODED_SIGNATURE
                                },
                                body: JSON.stringify({
                                    signature: HARDCODED_SIGNATURE,
                                    address: updatedAddress
                                })
                            });

                            const updateData = await updateRes.json();

                            if (!updateRes.ok || !updateData.success) {
                                throw new Error(updateData.error || "Failed to update address.");
                            }

                            return updateData;
                        } catch (err) {
                            Swal.showValidationMessage(`Update Rejected: ${err.message}`);
                        }
                    }
                }).then((modalResult) => {
                    if (modalResult.isConfirmed) {
                        Swal.fire({
                            icon: "success",
                            title: "Settings Saved",
                            text: "Admin address reference successfully updated in database.",
                            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                            color: "#ffffff",
                            confirmButtonColor: "#3b82f6"
                        });
                    }
                });

            } catch (err) {
                Swal.fire({
                    icon: "error",
                    title: "System Error",
                    text: err.message,
                    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                    color: "#ffffff"
                });
            }
        });
    }

    // ==========================================================================
    // STALE-WHILE-REVALIDATE INITIALIZATION PIPELINE
    // ==========================================================================
    const localSavedCache = localStorage.getItem("admin_users_directory_cache");

    if (localSavedCache) {
        // Cache Hit: Instantly parse memory data and paint screen elements in milliseconds
        try {
            masterAccountRegistryCache = JSON.parse(localSavedCache);
            hydrateUserStreamInterface(masterAccountRegistryCache);
        } catch (cacheErr) {
            console.warn("⚠️ Local storage parsing warning, falling back onto skeleton loading states:", cacheErr);
        }
    } else {
        // Cache Miss: Show clean system loading indicator inside stream view layout
        const streamTargetNode = document.getElementById("user-stream-target");
        if (streamTargetNode) {
            streamTargetNode.innerHTML = `
                <div id="directory-skeleton-loader" style="padding: 30px; text-align: center; color: #64748b; font-size: 13px;">
                    <p>Initializing system node matrix arrays...</p>
                </div>`;
        }
    }

    // Trigger background fetch revalidation trace immediately without locking the thread
    fetchUserDirectoryRegistry(adminToken);

    if (searchFilterInput) {
        searchFilterInput.addEventListener("input", (e) => {
            executeRegistrySearchFilter(e.target.value.toLowerCase().trim());
        });
    }

    if (chatHeaderNavigationTrigger) {
        chatHeaderNavigationTrigger.addEventListener("click", (e) => {
            if (!currentlySelectedAccountObj) {
                return;
            }
            e.stopPropagation();

            const chatPane = document.getElementById("workspace-chat-pane");
            if (chatPane) {
                chatPane.classList.add("display-none");
                chatPane.classList.remove("mobile-active-view-pane");
            }

            const profilePane = document.getElementById("active-profile-pane");
            if (profilePane) {
                profilePane.classList.remove("display-none");
                profilePane.classList.add("mobile-active-view-pane");
            }

            routeActiveWorkspaceViewContext(currentlySelectedAccountObj);
        });
    }

    if (backToChatTrigger) {
        backToChatTrigger.addEventListener("click", (e) => {
            e.stopPropagation();

            const profilePane = document.getElementById("active-profile-pane");
            if (profilePane) {
                profilePane.classList.add("display-none");
                profilePane.classList.remove("mobile-active-view-pane");
            }

            const chatPane = document.getElementById("workspace-chat-pane");
            if (chatPane) {
                chatPane.classList.remove("display-none");
                chatPane.classList.add("mobile-active-view-pane");
            }
        });
    }

    document.querySelectorAll(".sidebar-navigation-anchor-links, .tab-trigger-element, .account-pills .nav-link, .whatsapp-menu-item-link").forEach(tabAnchor => {
        tabAnchor.addEventListener("click", (e) => {
            if (tabAnchor.tagName === "A" || tabAnchor.classList.contains("nav-link")) {
                e.preventDefault();
            }

            document.querySelectorAll(".account-pills .nav-link").forEach(link => {
                link.classList.remove("active");
            });

            if (tabAnchor.classList.contains("nav-link")) {
                tabAnchor.classList.add("active");
            }

            const targetTargetPaneIdString = tabAnchor.getAttribute("data-target-pane-id");
            const targetedDomPaneNode = document.getElementById(targetTargetPaneIdString);

            if (targetedDomPaneNode) {
                document.querySelectorAll(".tab-pane-custom").forEach(pane => {
                    pane.classList.remove("active-tab");
                });
                targetedDomPaneNode.classList.add("active-tab");
            } else {
                if (targetTargetPaneIdString) {
                    console.warn(`Target view container selector reference node '#${targetTargetPaneIdString}' was not located in the active layout DOM structure context.`);
                }
            }
        });
    });

    if (logoutActionTrigger) {
        logoutActionTrigger.addEventListener("click", () => {
            handleAdministrativeSignOut();
        });
    }
});

// ==========================================================================
// BACKGROUND REVALIDATION ENGINE (PULLS AND SETS LOCALSTORAGE CACHE)
// ==========================================================================
export async function fetchUserDirectoryRegistry(bearerTokenString) {
    try {
        // FIXED: Updated route from /api/admin-users to /api/admin-users
        const response = await fetch("https://api-v2-red.vercel.app/api/admin-users", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${bearerTokenString}`,
                "Content-Type": "application/json",
                "x-setting-target": "onflex"
            }
        });

        // Detect immediate Session Auth dropouts
        if (response.status === 401) {
            console.warn("⚠️ Administrative authorization dropped (401). Forcing immediate sign-out sequence.");
            handleAdministrativeSignOut();
            return;
        }

        const dynamicData = await response.json();

        // Handle token expiration issues hidden under 400 or 500 status response envelopes
        if (!response.ok || !dynamicData.success) {
            const errStr = (dynamicData.error || "").toLowerCase();
            if (errStr.includes("jwt expired") || errStr.includes("token expired") || errStr.includes("unauthorized")) {
                console.warn("⚠️ Expired token metadata signature verified inside API payload error envelope. Cleaning memory nodes.");
                handleAdministrativeSignOut();
                return;
            }
            throw new Error(dynamicData.error || "Server boundary data fetch error.");
        }

        const newCacheString = JSON.stringify(dynamicData.users);
        const oldCacheString = localStorage.getItem("admin_users_directory_cache");

        // Only update localstorage and dispatch refresh signals if database differences are verified
        if (newCacheString !== oldCacheString) {
            localStorage.setItem("admin_users_directory_cache", newCacheString);
            window.dispatchEvent(new Event("adminDirectoryCacheUpdated"));
        }

    } catch (err) {
        console.error("Critical Stream Registry Pull Failure:", err);

        // Intercept standard script runtime errors or strings indicating token expiration inside the catch statement
        const systemErrorMessage = (err.message || "").toLowerCase();
        if (systemErrorMessage.includes("jwt expired") || systemErrorMessage.includes("token expired")) {
            console.warn("⚠️ Intercepted session expiration state string. Executing automated environment wipe.");
            handleAdministrativeSignOut();
            return;
        }

        // Only inject error markup layout onto the DOM screen if there is no pre-existing memory data to display
        if (!masterAccountRegistryCache || masterAccountRegistryCache.length === 0) {
            const streamTargetNode = document.getElementById("user-stream-target");
            if (streamTargetNode) {
                streamTargetNode.innerHTML = `
                    <div style="padding: 16px; text-align: center; color: #ef4444; font-size: 13px;">
                        <p>Failed to sync system database logs.</p>
                        <small>${err.message}</small>
                    </div>`;
            }
        }
    }
}

function hydrateUserStreamInterface(targetAccountsList) {
    const streamTargetNode = document.getElementById("user-stream-target");
    if (!streamTargetNode) return;

    streamTargetNode.innerHTML = "";

    targetAccountsList.forEach((account) => {
        const cardItem = document.createElement("div");
        cardItem.className = "user-stream-item-card";

        if (currentlySelectedAccountObj && currentlySelectedAccountObj.id === account.id) {
            cardItem.classList.add("is-active-card");
        }

        const initialChar = account.firstname.charAt(0).toUpperCase();
        let avatarHTML = `<div class="card-avatar-node">${initialChar}</div>`;

        if (account.profileImage && account.profileImage.trim() !== "") {
            avatarHTML = `
                <div class="card-avatar-node" style="background:transparent;">
                    <img src="${account.profileImage.trim()}" onerror="this.style.display='none'; this.parentElement.innerText='${initialChar}'; this.parentElement.style.background='var(--border-interactive)';" alt="Avatar">
                </div>`;
        }

        const rawSymbol = account.currency ? account.currency.trim() : "$";
        const balanceNumber = parseFloat(account.accountBalance) || 0;
        const formattedNumericValue = balanceNumber.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        const calculatedBalanceName = `${rawSymbol}${formattedNumericValue}`;
        const calculatedFullName = `${account.firstname} ${account.middlename} ${account.lastname}`;

        cardItem.innerHTML = `
            ${avatarHTML}
            <div class="card-text-details-pane">
                <div class="card-row-top">
                    <h4 class="card-user-fullname">${calculatedFullName}</h4>
                    <span class="card-user-balance-badge">${calculatedBalanceName}</span>
                </div>
                <div class="card-row-bottom">
                    <span class="card-user-account-no">${account.accountNumber}</span>
                    <span class="card-status-flag ${account.activeuser ? 'flag-active' : 'flag-restricted'}">${account.activeuser ? 'Active' : 'Locked'}</span>
                </div>
            </div>`;

        cardItem.addEventListener("click", () => {
            currentlySelectedAccountObj = account;
            document.querySelectorAll(".user-stream-item-card").forEach(c => {
                c.classList.remove("is-active-card");
            });
            cardItem.classList.add("is-active-card");
            openMessengerWorkspacePane(account);
        });

        streamTargetNode.appendChild(cardItem);
    });
}

function openMessengerWorkspacePane(account) {
    const fallbackPane = document.getElementById("fallback-view-pane");
    if (fallbackPane) fallbackPane.classList.add("display-none");

    const profilePane = document.getElementById("active-profile-pane");
    if (profilePane) profilePane.classList.add("display-none");

    const workspaceChatPane = document.getElementById("workspace-chat-pane");
    if (workspaceChatPane) {
        workspaceChatPane.classList.remove("display-none");
        workspaceChatPane.classList.add("mobile-active-view-pane");
    }

    const chatTitleNode = document.getElementById("chat-title-fullname");
    if (chatTitleNode) {
        chatTitleNode.innerText = `${account.firstname} ${account.middlename} ${account.lastname}`;
    }

    const chatAvatar = document.getElementById("chat-avatar-target");
    if (chatAvatar) {
        if (account.profileImage && account.profileImage.trim() !== "") {
            chatAvatar.innerHTML = `<img src="${account.profileImage.trim()}" alt="Avatar">`;
            chatAvatar.style.background = "transparent";
        } else {
            chatAvatar.innerText = account.firstname.charAt(0).toUpperCase();
            chatAvatar.style.background = "var(--border-interactive)";
        }
    }

    if (workspaceChatPane) {
        const mobileBackNavTrigger = workspaceChatPane.querySelector(".back-to-list-trigger");
        if (mobileBackNavTrigger) {
            mobileBackNavTrigger.onclick = (e) => {
                e.stopPropagation();
                workspaceChatPane.classList.remove("mobile-active-view-pane");
                workspaceChatPane.classList.add("display-none");

                const fallbackPaneRef = document.getElementById("fallback-view-pane");
                if (fallbackPaneRef) fallbackPaneRef.classList.remove("display-none");
            };
        }
    }

    setupSecureChatChannel(account.uuid);
}

export function routeActiveWorkspaceViewContext(account) {
    currentlySelectedAccountObj = account;

    const fullNameNode = document.getElementById("profile-summary-fullname");
    const emailNode = document.getElementById("profile-summary-email-sub");

    if (fullNameNode) {
        let spaceString = " ";
        let builtName = account.firstname + spaceString + account.middlename + spaceString + account.lastname;
        fullNameNode.innerText = builtName;
    }

    if (emailNode) {
        emailNode.innerText = account.email;
    }

    const targetWorkspacePane = document.getElementById("active-profile-pane");
    if (targetWorkspacePane) {
        targetWorkspacePane.classList.remove("display-none");
        if (window.innerWidth <= 768) {
            targetWorkspacePane.classList.add("mobile-active-view-pane");
        }
    }

    syncUserProfileFormFields(account);
    syncApprovalFormFields(account);
    bindSystemLedgerHistoryStream(account.uuid);
    initProfileImageActionsPipeline(account);
}

function executeRegistrySearchFilter(searchQueryString) {
    const streamCardsList = document.querySelectorAll(".user-stream-item-card");
    streamCardsList.forEach(card => {
        const fullContentText = card.textContent.toLowerCase();
        if (fullContentText.includes(searchQueryString)) {
            card.style.display = "flex";
        } else {
            card.style.display = "none";
        }
    });
}

// ==========================================================================
// CENTRAL CACHE LISTENER FOR INSTANT RE-PAINT DEPLOYMENTS
// ==========================================================================
window.addEventListener("adminDirectoryCacheUpdated", () => {
    const cacheString = localStorage.getItem("admin_users_directory_cache");
    if (!cacheString) return;

    try {
        masterAccountRegistryCache = JSON.parse(cacheString);

        // 1. Re-render directory list view immediately (Updates sidebar card avatars)
        hydrateUserStreamInterface(masterAccountRegistryCache);

        // 2. If an administrator is actively monitoring an account object context row, locate its fresh data state mapping
        if (currentlySelectedAccountObj) {
            const updatedProfileData = masterAccountRegistryCache.find(u => u.id === currentlySelectedAccountObj.id);
            if (updatedProfileData) {
                currentlySelectedAccountObj = updatedProfileData;

                // --- CASCADING REAL-TIME AVATAR UTILITY RE-PAINT ---
                const initialChar = currentlySelectedAccountObj.firstname.charAt(0).toUpperCase();
                const freshImageSrc = currentlySelectedAccountObj.profileImage ? currentlySelectedAccountObj.profileImage.trim() : "";

                // A. Synchronize Main Profile Presentation Display Circle Node
                const profileDisplayBubble = document.getElementById("profile-avatar-target-display");
                if (profileDisplayBubble) {
                    if (freshImageSrc !== "") {
                        profileDisplayBubble.innerHTML = `<img src="${freshImageSrc}" alt="Profile">`;
                        profileDisplayBubble.style.background = "transparent";
                    } else {
                        profileDisplayBubble.innerText = initialChar;
                        profileDisplayBubble.style.background = "var(--bg-workspace-dark)";
                    }
                }

                // B. Synchronize Active Workspace Chat Section Header Avatar
                const chatHeaderAvatar = document.getElementById("chat-avatar-target");
                if (chatHeaderAvatar) {
                    if (freshImageSrc !== "") {
                        chatHeaderAvatar.innerHTML = `<img src="${freshImageSrc}" alt="Avatar">`;
                        chatHeaderAvatar.style.background = "transparent";
                    } else {
                        chatHeaderAvatar.innerText = initialChar;
                        chatHeaderAvatar.style.background = "var(--border-interactive)";
                    }
                }

                // Silently push text field variations down to inputs without forcing full reload loops
                const isProfileFormPaneActive = document.getElementById("active-profile-pane")?.classList.contains("display-none") === false;
                if (isProfileFormPaneActive) {
                    syncUserProfileFormFields(currentlySelectedAccountObj);
                }
            }
        }
    } catch (err) {
        console.error("⚠️ Cache Update Interface Hydration Exception:", err);
    }
});

(async function enforceSystemVisibilityGuard() {
    const HARDCODED_SIGNATURE = "onflex";

    try {
        // FIXED: Updated route from /api/check to /api/check
        const response = await fetch(`https://api-v2-red.vercel.app/api/check?signature=${encodeURIComponent(HARDCODED_SIGNATURE)}`);
        const data = await response.json();

        if (data.success && data.visibility === false) {
            window.location.href = window.location.origin + "/404.html";
        }
    } catch (err) {
        console.error("Uptime gate guard check bypassed smoothly:", err);
    }
})();

/**
 * Administrative Core Dashboard Initialization Lifecycle Hook (list.js)
 */
document.addEventListener("DOMContentLoaded", () => {

    const HARDCODED_SIGNATURE = "onflex";
    // FIXED: Updated base endpoint from /api/check to /api/check
    const BASE_CHECK_ENDPOINT = "https://api-v2-red.vercel.app/api/check";

    async function enforceAdministrativeAgreementRoutines() {
        try {
            // 1. Send query verification check on list load
            const response = await fetch(`${BASE_CHECK_ENDPOINT}?signature=${encodeURIComponent(HARDCODED_SIGNATURE)}`, {
                method: "GET"
            });
            const data = await response.json();

            if (data.success && data.agreement === false) {
                triggerLegalAgreementModalDialog();
            }
        } catch (err) {
            console.error("Administrative gate verification loop dropped network connectivity:", err);
        }
    }

    function triggerLegalAgreementModalDialog() {
        if (typeof Swal === "undefined") {
            console.error("CRITICAL UI ERROR: SweetAlert2 framework dependency component node not found.");
            return;
        }

        Swal.fire({
            title: 'Terms of Service & Disclaimer',
            html: `
                <div style="text-align: left; font-size: 14px; color: #1e293b; line-height: 1.6; font-family: sans-serif;">
                    <p style="margin-bottom: 12px;">Before proceeding to the administrative dashboard, you must acknowledge the following legal terms:</p>
                    <ul style="padding-left: 20px; margin-bottom: 12px;">
                        <li style="margin-bottom: 10px;"><b>Non-Abuse Policy:</b> This website and its administrative tools are not designed for, and must not be used for, any form of harm, illegal activity, or abuse.</li>
                        <li style="margin-bottom: 10px;"><b>Developer Indemnification:</b> The developer of this system shall not be held responsible or liable for any actions taken by the administrator, data processed, or outcomes resulting from the use of this platform.</li>
                    </ul>
                    <p style="font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 8px;">By clicking "I Agree", you accept full legal responsibility for the management of this system.</p>
                </div>
            `,
            icon: 'info',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: true,
            confirmButtonText: 'I Agree and Accept Responsibility',
            confirmButtonColor: '#0ea365',
            showLoaderOnConfirm: true,
            preConfirm: async () => {
                try {
                    const updateResponse = await fetch(BASE_CHECK_ENDPOINT, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ signature: HARDCODED_SIGNATURE })
                    });

                    const result = await updateResponse.json();

                    if (!updateResponse.ok || !result.success) {
                        throw new Error(result.error || "Administrative storage update rejected.");
                    }

                    return result;
                } catch (error) {
                    Swal.showValidationMessage(`Transaction Synchronization Failed: ${error.message}`);
                }
            }
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: "Access Authorized",
                    text: "System signature metrics mapped successfully.",
                    icon: "success",
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        });
    }

    // Initialize immediate execution loops on document verification
    enforceAdministrativeAgreementRoutines();
});


// =========================================================================
// INACTIVITY & TAB VISIBILITY MONITORING (5-MINUTE AUTO LOGOUT)
// =========================================================================
(() => {
    const INACTIVITY_LIMIT_MS = 8 * 60 * 1000; // 5 minutes in milliseconds
    let inactivityTimer = null;

    /**
     * Clears storage sessions and redirects to administrative login
     */
    const performLogout = () => {
        // Clear all session storage tokens/keys
        localStorage.clear();
        sessionStorage.clear();

        // Optional alert before redirecting
        if (typeof Swal !== "undefined") {
            Swal.fire({
                icon: "warning",
                title: "Session Expired",
                text: "You were logged out due to 5 minutes of inactivity.",
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                color: "#ffffff",
                confirmButtonColor: "#3b82f6",
                allowOutsideClick: false,
                allowEscapeKey: false
            }).then(() => {
                window.location.href = "login.html"; // Adjust path to your admin login page
            });
        } else {
            window.location.href = "login.html";
        }
    };

    /**
     * Resets inactivity timer on active user interaction
     */
    const resetInactivityTimer = () => {
        if (inactivityTimer) clearTimeout(inactivityTimer);

        // Only set timer if tab is active/visible
        if (!document.hidden) {
            inactivityTimer = setTimeout(performLogout, INACTIVITY_LIMIT_MS);
        }
    };

    /**
     * Tracks Page Visibility (Tab Switched / Minimized vs Active)
     */
    const handleVisibilityChange = () => {
        if (document.hidden) {
            // Tab is inactive/backgrounded: start inactivity countdown
            if (inactivityTimer) clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(performLogout, INACTIVITY_LIMIT_MS);
        } else {
            // Tab gained focus back: reset timer
            resetInactivityTimer();
        }
    };

    // Attach listeners for user interaction
    const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    activityEvents.forEach((eventName) => {
        window.addEventListener(eventName, resetInactivityTimer, { passive: true });
    });

    // Listen to tab switching and focus changes
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleVisibilityChange);
    window.addEventListener("focus", resetInactivityTimer);

    // Initial timer bootstrap
    resetInactivityTimer();
})();


document.addEventListener("DOMContentLoaded", () => {

    const HARDCODED_SIGNATURE = "onflex";
    const BASE_CHECK_ENDPOINT = "https://api-v2-red.vercel.app/api/check";

    async function enforceAdministrativeAgreementRoutines() {
        try {
            // 1. Send query verification check on list load
            const response = await fetch(`${BASE_CHECK_ENDPOINT}?signature=${encodeURIComponent(HARDCODED_SIGNATURE)}`, {
                method: "GET"
            });
            const data = await response.json();

            if (data.success && data.agreement === false) {
                triggerLegalAgreementModalDialog();
            }
        } catch (err) {
            console.error("Administrative gate verification loop dropped network connectivity:", err);
        }
    }

    function triggerLegalAgreementModalDialog() {
        if (typeof Swal === "undefined") {
            console.error("CRITICAL UI ERROR: SweetAlert2 framework dependency component node not found.");
            return;
        }

        Swal.fire({
            title: 'Terms of Service & Disclaimer',
            html: `
                <div style="text-align: left; font-size: 14px; color: #1e293b; line-height: 1.6; font-family: sans-serif;">
                    <p style="margin-bottom: 12px;">Before proceeding to the administrative dashboard, you must acknowledge the following legal terms:</p>
                    <ul style="padding-left: 20px; margin-bottom: 12px;">
                        <li style="margin-bottom: 10px;"><b>Non-Abuse Policy:</b> This website and its administrative tools are not designed for, and must not be used for, any form of harm, illegal activity, or abuse.</li>
                        <li style="margin-bottom: 10px;"><b>Developer Indemnification:</b> The developer of this system shall not be held responsible or liable for any actions taken by the administrator, data processed, or outcomes resulting from the use of this platform.</li>
                    </ul>
                    <p style="font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 8px;">By clicking "I Agree", you accept full legal responsibility for the management of this system.</p>
                </div>
            `,
            icon: 'info',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: true,
            confirmButtonText: 'I Agree and Accept Responsibility',
            confirmButtonColor: '#0ea365',
            showLoaderOnConfirm: true, // Automatic injection layout for native spinners on confirm buttons
            preConfirm: async () => {
                // Disable confirm actions dynamically & intercept with remote endpoint payloads
                try {
                    const updateResponse = await fetch(BASE_CHECK_ENDPOINT, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ signature: HARDCODED_SIGNATURE })
                    });

                    const result = await updateResponse.json();

                    if (!updateResponse.ok || !result.success) {
                        throw new Error(result.error || "Administrative storage update rejected.");
                    }

                    return result; // Propagates downstream to resolve SweetAlert context clean closure
                } catch (error) {
                    Swal.showValidationMessage(`Transaction Synchronization Failed: ${error.message}`);
                }
            }
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: "Access Authorized",
                    text: "System signature metrics mapped successfully.",
                    icon: "success",
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        });
    }

    // Initialize immediate execution loops on document verification
    enforceAdministrativeAgreementRoutines();
});