/**
 * ONFLEX PREMIUM - 2FA TOGGLE & LOGOUT CONTROLLER
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 [2FA Module] Initialized and listening...");

    const actionActivate2FA = document.getElementById('actionActivate2FA');
    const actionSystemLogout = document.getElementById('actionSystemLogout');

    const BACKEND_2FA_URL = "https://api-v2-red.vercel.app/api/2fa";
    const BACKEND_DATA_URL = "https://api-v2-red.vercel.app/api/data";

    // Helper: Safely resolve current session token from local storage
    const getAuthToken = () => {
        let token = localStorage.getItem("user_session_token") || localStorage.getItem("token") || "";
        const rawSession = localStorage.getItem("user_session");

        if (rawSession) {
            try {
                const parsedSession = JSON.parse(rawSession);
                token = parsedSession.token || parsedSession.session_token || parsedSession.user_session_token || token;
            } catch (e) {
                console.error("📋 [2FA Setup] Session parsing error:", e);
            }
        }
        return token;
    };

    let is2faEnabled = false;

    // Fetch initial 2FA status from /api/data
    const fetch2faStatus = async () => {
        const token = getAuthToken();
        if (!token) {
            console.warn("⚠️ [2FA] No auth token found on page load.");
            return;
        }

        try {
            const response = await fetch(BACKEND_DATA_URL, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!response.ok) return;

            const resData = await response.json();
            const userData = resData.data || resData.user || resData;

            is2faEnabled = Boolean(userData['2fa']);
            update2faButtonUI(is2faEnabled);
        } catch (err) {
            console.warn("⚠️ Could not fetch 2FA state:", err);
        }
    };

    const update2faButtonUI = (enabled) => {
        if (!actionActivate2FA) return;

        if (enabled) {
            actionActivate2FA.innerHTML = `<i data-lucide="shield-check"></i> Disable 2-Factor Auth (2FA)`;
            actionActivate2FA.style.backgroundColor = "#16a34a";
            actionActivate2FA.style.color = "#ffffff";
        } else {
            actionActivate2FA.innerHTML = `<i data-lucide="fingerprint"></i> Activate 2-Factor Auth (2FA)`;
            actionActivate2FA.style.backgroundColor = "";
            actionActivate2FA.style.color = "";
        }

        if (window.lucide) window.lucide.createIcons();
    };

    fetch2faStatus();

    // Toggle 2FA Handler
    if (actionActivate2FA) {
        actionActivate2FA.addEventListener('click', async () => {
            console.log("👇 [2FA Button] Clicked!");

            const currentToken = getAuthToken();

            if (!currentToken) {
                console.error("❌ [2FA] Clicked, but no token was retrieved from localStorage.");
                return Swal.fire({
                    icon: 'error',
                    title: 'Session Expired',
                    text: 'Please re-authenticate to change settings.',
                    confirmButtonColor: '#ef4444'
                });
            }

            const nextState = !is2faEnabled;
            const actionLabel = nextState ? "Activate" : "Disable";

            const confirmAction = await Swal.fire({
                title: `${actionLabel} 2-Factor Auth?`,
                text: `Are you sure you want to ${actionLabel.toLowerCase()} 2-Factor Authentication for your account?`,
                icon: 'question',
                background: '#0c1e29',
                color: '#fff',
                showCancelButton: true,
                confirmButtonColor: nextState ? '#22c55e' : '#ef4444',
                cancelButtonColor: '#64748b',
                confirmButtonText: `Yes, ${actionLabel}`
            });

            if (!confirmAction.isConfirmed) return;

            Swal.fire({
                title: 'Updating Security Settings...',
                background: '#0c1e29',
                color: '#fff',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            try {
                const response = await fetch(BACKEND_2FA_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${currentToken}`
                    },
                    body: JSON.stringify({ enable2fa: nextState })
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || "Failed to update 2FA state.");
                }

                is2faEnabled = nextState;
                update2faButtonUI(is2faEnabled);

                Swal.fire({
                    icon: 'success',
                    title: 'Security Updated',
                    text: `2-Factor Authentication has been ${is2faEnabled ? 'activated' : 'disabled'}.`,
                    background: '#0c1e29',
                    color: '#fff',
                    confirmButtonColor: '#0a698f'
                });

            } catch (err) {
                console.error("❌ [2FA Fault]:", err);
                Swal.fire({
                    icon: 'error',
                    title: 'Update Failed',
                    text: err.message || 'Could not update 2FA status.',
                    background: '#0c1e29',
                    color: '#fff',
                    confirmButtonColor: '#ef4444'
                });
            }
        });
    }

    // Secure Session Logout Handler
    if (actionSystemLogout) {
        actionSystemLogout.addEventListener('click', async () => {
            const logoutConfirm = await Swal.fire({
                title: 'Sign Out Session?',
                text: 'You will be returned to the login screen.',
                icon: 'warning',
                background: '#0c1e29',
                color: '#fff',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Yes, Log Out'
            });

            if (!logoutConfirm.isConfirmed) return;

            localStorage.clear();
            sessionStorage.clear();
            window.location.href = "../login.html";
        });
    }
});