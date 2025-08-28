const url = window.location.search;
const urldata = new URLSearchParams(url);
const i = urldata.get("i")
const au = urldata.get("au")
const u = urldata.get("u")

let publicVapidKey = null;
let NotiyData = null;
let subscription = null;
// // Register service worker & subscribe on load
if ("serviceWorker" in navigator) {
    setup().catch(err => console.error(err));
}

if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    alert("Push notifications are not supported on this browser/device.");
}

const permission = await Notification.requestPermission();
if (permission !== "granted") {
    alert("Notifications are blocked. Please allow them in settings.");
    return;
}

if (isIos() && !isInStandaloneMode()) {
    console.log("iOS Safari requires Add to Home Screen first");
    return;
}

async function setup() {

    // Ask user for permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
        alert("Please enable notifications to continue.");
        return;
    }
    alert('1')
    const res = await fetch("/vapidPublicKey");
    const data = await res.json();
    publicVapidKey = data.key;

    console.log("Registering Service Worker...");
    const register = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    console.log("Service Worker Registered!");
    alert('2')
    // ✅ Wait until service worker is ready
    const serviceWorkerReady = await navigator.serviceWorker.ready;

    console.log("Subscribing to Push...");
    alert('3')
    subscription = await serviceWorkerReady.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
    });
    alert('4')
    const subJSON = subscription.toJSON();
    NotiyData = subJSON;
    console.log(NotiyData.endpoint);
    alert('4')

}

// Handle "Send Notification" button click


function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}