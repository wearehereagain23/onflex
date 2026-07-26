import { currentlySelectedAccountObj } from "./list.js";

const VAPID_PUBLIC_KEY = 'BA0Y8SCjnZI0oRFfM8IH4ZY1Hpbh2kmeSVjQNwakIpz0ZndaH6OiuBhNO672CiLKDmCNqicVt4waCxbphGMGXEU';
const BACKEND_URL = "http://localhost:5000/api/notifications";
const SIGNATURE = "onflex";

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

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

// 1. Helper to retrieve or fallback device ID
function getAdminDeviceId() {
    let id = localStorage.getItem('admin_device_id');
    if (!id) {
        id = 'admin_node_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
        localStorage.setItem('admin_device_id', id);
    }
    return id;
}


// Inside chat-notification.js

export async function registerAdminSubscription(token) {
    const registration = await getActiveServiceWorker();
    const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    const deviceId = getAdminDeviceId();

    const response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "x-signature": SIGNATURE
        },
        body: JSON.stringify({
            action: "subscribe",
            uuid: SIGNATURE, // ✅ Fix: Send SIGNATURE ("onflex") as UUID
            device_id: deviceId,
            subscription: JSON.parse(JSON.stringify(sub)),
            signature: SIGNATURE
        })
    });

    const resData = await response.json();
    if (!response.ok || !resData.success) {
        throw new Error(resData.error || "Failed to sync push subscription on server.");
    }

    localStorage.setItem('is_admin_subscribed', 'true');
    return true;
}



// 3. Dispatch Modal Window
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

                const response = await fetch(BACKEND_URL, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json",
                        "x-signature": SIGNATURE
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
                    text: data.message || "Notification sent to user.",
                    background: '#0f172a',
                    color: '#fff'
                });

            } catch (err) {
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

// 4. Global Notification Click Handler
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

    const token = localStorage.getItem("admin_session_token") || localStorage.getItem("token");
    if (!token) {
        Swal.fire({ icon: "error", title: "Unauthorized", text: "Session token missing." });
        return;
    }

    try {
        // Step A: Trigger browser permission prompt first
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            Swal.fire({
                icon: "warning",
                title: "Permission Required",
                text: "Please enable browser notification permissions to send alerts.",
                background: '#0f172a', color: '#fff'
            });
            return;
        }

        Swal.showLoading();

        // Step B: Check server if device and signature match
        const deviceId = getAdminDeviceId();
        const checkRes = await fetch(BACKEND_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "x-signature": SIGNATURE
            },
            body: JSON.stringify({
                action: "check_admin_device",
                device_id: deviceId,
                signature: SIGNATURE
            })
        });

        const checkData = await checkRes.json();

        if (checkData.success && checkData.deviceMatches) {
            // Match found: Show the dispatch modal right away
            openSendNotificationModal(currentlySelectedAccountObj);
        } else {
            // Mismatch or empty: Register new push subscription automatically
            await registerAdminSubscription(token);
            openSendNotificationModal(currentlySelectedAccountObj);
        }

    } catch (err) {
        console.error("Error evaluating notification state:", err);
        Swal.fire({
            icon: "error",
            title: "Subscription Setup Failed",
            text: err.message || "Unable to sync admin device state.",
            background: '#0f172a',
            color: '#fff'
        });
    }
}, true);