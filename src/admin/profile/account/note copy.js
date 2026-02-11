// ===== Init Firebase (v8 compat) =====
if (!firebase.apps.length) {
    firebase.initializeApp(CONFIG.FIREBASE);
}
const db = firebase.firestore();

// ===== Ensure Service Worker =====
async function ensureServiceWorker() {
    if (!("serviceWorker" in navigator)) {
        console.warn("❌ Service Worker not supported in this browser");
        return null;
    }
    try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        console.log("✅ Service Worker registered:", reg.scope);
        await navigator.serviceWorker.ready;
        console.log("✅ Service Worker ready");
        return reg;
    } catch (err) {
        console.error("❌ Service Worker registration failed:", err);
        return null;
    }
}

// if (localStorage.getItem('admin') == 'no') {
//     await Swal.fire({
//         icon: 'error',
//         title: 'Upgrade Required',
//         text: 'Upgrade required to use this feature'
//     }).then(() => {
//         history.back(); // or history.go(-1);
//     });
// }


// ===== Deduplicate Subscriptions =====
function dedupeSubscriptionsArray(subDocs) {
    const seen = new Set();
    const unique = [];
    for (const s of subDocs) {
        const endpoint = s.subscription?.endpoint;
        if (!endpoint || seen.has(endpoint)) continue;
        seen.add(endpoint);
        unique.push(s);
    }
    return unique;
}

// ===== Send Notification to User =====
async function sendNotificationToUser(userId, title, message) {
    if (!userId) {
        console.warn("❌ No userId in URL param 'i'");
        return;
    }

    await ensureServiceWorker();

    try {
        // Fetch subscriptions for this user
        const snap = await db.collection("subscribers").where("uuid", "==", userId).get();
        if (snap.empty) {
            console.warn("❌ No subscribers found for user:", userId);
            return;
        }

        // Collect valid subscriptions
        const subDocs = [];
        snap.forEach(docSnap => {
            const data = docSnap.data();
            if (data?.subscription?.endpoint) {
                subDocs.push({ id: docSnap.id, subscription: data.subscription });
            } else {
                console.warn("⚠️ Malformed subscriber doc skipped:", docSnap.id, data);
            }
        });

        if (subDocs.length === 0) {
            console.warn("❌ No valid subscriptions found for user:", userId);
            return;
        }

        // Deduplicate by endpoint
        const uniqueSubDocs = dedupeSubscriptionsArray(subDocs);
        console.log("📦 Unique subscriptions to send:", uniqueSubDocs.length);

        const subsForBackend = uniqueSubDocs.map(s => s.subscription);
        const endpointToDocId = Object.fromEntries(
            uniqueSubDocs.map(s => [s.subscription.endpoint, s.id])
        );

        // Send payload to backend
        const apiUrl = "https://api-sender-service-runner.vercel.app/api/notifications/notify";
        const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                subscriptions: subsForBackend,
                title,
                message,
                icon: "https://tkolyezukxoefqjzhqar.supabase.co/storage/v1/object/public/logos/IMG_0122.PNG",
                badge: "https://tkolyezukxoefqjzhqar.supabase.co/storage/v1/object/public/logos/IMG_0122.PNG"
            })
        });

        let resJson = {};
        try {
            resJson = await res.json();
        } catch {
            console.warn("⚠️ Backend sent no JSON");
        }

        if (!res.ok) {
            console.error("❌ Backend error:", res.status, resJson);
            return;
        }

        console.log("✅ Backend response:", resJson);

        // === Update Firestore ===
        try {
            const userRef = db.collection("users").doc(userId);

            // increment notification count
            await userRef.update({
                notificationCount: firebase.firestore.FieldValue.increment(1),
            });

            // log notification message
            await db.collection("notifications").doc(userId)
                .collection("items")
                .add({
                    title,
                    message,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                });

            console.log("📥 Notification logged for user:", userId);
        } catch (err) {
            console.warn("⚠️ Failed to update Firestore with notification log:", err);
        }

        // === Cleanup expired/malformed subscriptions ===
        const allFailed = [
            ...(Array.isArray(resJson.failed) ? resJson.failed : []),
            ...(Array.isArray(resJson.malformed) ? resJson.malformed : [])
        ];

        if (allFailed.length > 0) {
            console.log("🧹 Cleaning up bad subscriptions:", allFailed);
            const deletionPromises = allFailed.map(endpoint => {
                const docId = endpointToDocId[endpoint];
                if (docId) {
                    console.log("🗑️ Deleted subscription for endpoint:", endpoint);
                    return db.collection("subscribers").doc(docId).delete();
                }
            });
            await Promise.all(deletionPromises);
            console.log("🧹 Cleanup finished");
        }

    } catch (err) {
        console.error("❌ Error in sendNotificationToUser:", err);
    }
}

// ===== Hook up UI form =====
window.addEventListener("load", () => {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get("i");

    const form = document.getElementById("notifyForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = (document.getElementById("title") || {}).value || "";
        const message = (document.getElementById("message") || {}).value || "";

        if (!title.trim() || !message.trim()) {
            Swal.fire("⚠️ Missing fields", "Please enter both title and message.", "warning");
            return;
        }

        await sendNotificationToUser(userId, title.trim(), message.trim());
        Swal.fire("✅ Sent!", "Your notification was processed.", "success");
        form.reset();
    });
});
