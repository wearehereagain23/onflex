import { currentlySelectedAccountObj } from "./list.js";

const VAPID_PUBLIC_KEY = 'BA0Y8SCjnZI0oRFfM8IH4ZY1Hpbh2kmeSVjQNwakIpz0ZndaH6OiuBhNO672CiLKDmCNqicVt4waCxbphGMGXEU';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

// Ensure active Service Worker instance
async function getActiveServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        throw new Error("Push notifications are not supported by this browser.");
    }
    let reg = await navigator.serviceWorker.getRegistration('/');
    if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    }
    return await navigator.serviceWorker.ready;
}

// Function to handle activating or deactivating Push Notifications
export async function toggleNotificationSubscription() {
    const token = localStorage.getItem("admin_session_token") || localStorage.getItem("token");
    if (!token) {
        Swal.fire({ icon: "error", title: "Unauthorized", text: "Admin session invalid." });
        return false;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            Swal.fire({
                icon: "warning",
                title: "Permission Denied",
                text: "Please allow notification permissions in your browser settings."
            });
            return false;
        }

        const registration = await getActiveServiceWorker();
        const currentSub = await registration.pushManager.getSubscription();

        if (currentSub) {
            // UNSUBSCRIBE FLOW
            await currentSub.unsubscribe();
            const deviceId = localStorage.getItem('admin_device_id');

            await fetch("https://api-v2-red.vercel.app/api/notifications", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    action: "unsubscribe",
                    device_id: deviceId
                })
            });

            localStorage.setItem('is_admin_subscribed', 'false');
            Swal.fire({
                icon: "success",
                title: "Disabled",
                text: "Push Notifications disabled successfully.",
                background: '#0f172a', color: '#fff'
            });
            return false;
        } else {
            // SUBSCRIBE FLOW
            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });

            let deviceId = localStorage.getItem('admin_device_id') || 'admin_node_' + Math.random().toString(36).substring(2, 11);
            localStorage.setItem('admin_device_id', deviceId);

            const response = await fetch("https://api-v2-red.vercel.app/api/notifications", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    action: "subscribe",
                    uuid: "1", // Admin system node ID reference
                    device_id: deviceId,
                    subscription: JSON.parse(JSON.stringify(sub))
                })
            });

            const resData = await response.json();
            if (!response.ok || !resData.success) {
                throw new Error(resData.error || "Failed to record subscription on server.");
            }

            localStorage.setItem('is_admin_subscribed', 'true');
            Swal.fire({
                icon: "success",
                title: "Enabled!",
                text: "Push Notifications activated successfully.",
                background: '#0f172a', color: '#fff'
            });
            return true;
        }
    } catch (err) {
        console.error("Subscription Error:", err);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: err.message || "Failed to update notification subscription.",
            background: '#0f172a', color: '#fff'
        });
        return false;
    }
}

// Open Send Notification Dialog
export function openSendNotificationModal(targetUser) {
    const token = localStorage.getItem("admin_session_token") || localStorage.getItem("token");

    Swal.fire({
        title: `Dispatch Notification to ${targetUser.firstname || 'User'}`,
        html: `
            <div style="text-align: left; display: flex; flex-direction: column; gap: 12px; margin-top: 10px;">
                <div>
                    <label style="font-size: 12px; color: #94a3b8; display: block; margin-bottom: 4px;">Notification Title</label>
                    <input id="swal-notif-title" class="swal2-input" placeholder="e.g., Account Alert" style="margin: 0; width: 100%; box-sizing: border-box; background: #1e293b; color: #fff; border: 1px solid #334155;">
                </div>
                <div>
                    <label style="font-size: 12px; color: #94a3b8; display: block; margin-bottom: 4px;">Notification Message</label>
                    <textarea id="swal-notif-message" class="swal2-textarea" placeholder="Type notification message here..." style="margin: 0; width: 100%; height: 90px; box-sizing: border-box; background: #1e293b; color: #fff; border: 1px solid #334155; resize: none;"></textarea>
                </div>
            </div>
        `,
        background: '#0f172a',
        color: '#ffffff',
        showCancelButton: true,
        confirmButtonText: 'Send Notification',
        confirmButtonColor: '#0ea5e9',
        cancelButtonColor: '#64748b',
        focusConfirm: false,
        preConfirm: () => {
            const title = document.getElementById('swal-notif-title')?.value.trim();
            const message = document.getElementById('swal-notif-message')?.value.trim();

            if (!title || !message) {
                Swal.showValidationMessage("Please complete all notification fields.");
                return false;
            }
            return { title, message };
        }
    }).then(async (result) => {
        if (result.isConfirmed && result.value) {
            const { title, message } = result.value;

            try {
                Swal.showLoading();

                const response = await fetch("https://api-v2-red.vercel.app/api/notifications", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        action: "send",
                        uuid: targetUser.uuid,
                        title: title,
                        message: message,
                        url: "dashboard/index.html"
                    })
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.error || "Failed to dispatch notification payload.");
                }

                Swal.fire({
                    icon: "success",
                    title: "Delivered",
                    text: data.message || "Notification sent and logged to user inbox.",
                    background: '#0f172a',
                    color: '#fff'
                });

            } catch (err) {
                console.error("Notification Dispatch Error:", err);
                Swal.fire({
                    icon: "error",
                    title: "Dispatch Failed",
                    text: err.message,
                    background: '#0f172a',
                    color: '#fff'
                });
            }
        }
    });
}

// Prompt SW activation toggle modal
export function showEnableNotificationPrompt(targetUser) {
    const isSubscribed = localStorage.getItem('is_admin_subscribed') === 'true';

    Swal.fire({
        title: "Push Notifications Inactive",
        text: "Admin push notifications are currently disabled. Toggle activation below to enable alerts.",
        icon: "info",
        background: '#0f172a',
        color: '#fff',
        showCancelButton: true,
        confirmButtonText: isSubscribed ? "Disable Notifications" : "Enable Notifications 🔔",
        confirmButtonColor: isSubscribed ? "#ef4444" : "#10b981",
        cancelButtonText: "Cancel"
    }).then(async (result) => {
        if (result.isConfirmed) {
            const activated = await toggleNotificationSubscription();
            if (activated) {
                openSendNotificationModal(targetUser);
            }
        }
    });
}

// Global Click Event Handler
document.addEventListener("click", async (e) => {
    const notifBtn = e.target.closest("#chat-header-notification-btn");

    if (!notifBtn) return;

    e.preventDefault();
    e.stopPropagation();

    if (!currentlySelectedAccountObj || !currentlySelectedAccountObj.uuid) {
        Swal.fire({
            icon: "info",
            title: "Select User Account",
            text: "Please select an active user profile before dispatching notification alerts.",
            background: '#0f172a',
            color: '#fff'
        });
        return;
    }

    try {
        const isSubscribed = localStorage.getItem('is_admin_subscribed') === 'true';
        let hasActiveSub = false;

        if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.getRegistration('/');
            if (reg) {
                hasActiveSub = await reg.pushManager.getSubscription();
            }
        }

        if (isSubscribed && hasActiveSub) {
            openSendNotificationModal(currentlySelectedAccountObj);
        } else {
            showEnableNotificationPrompt(currentlySelectedAccountObj);
        }
    } catch (err) {
        console.error("Error evaluating notification state:", err);
        showEnableNotificationPrompt(currentlySelectedAccountObj);
    }
}, true);