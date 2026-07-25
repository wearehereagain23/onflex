document.addEventListener("DOMContentLoaded", async () => {
    // Helper: Retrieve stored session token
    const getAuthToken = () => {
        let token = localStorage.getItem("user_session_token") || localStorage.getItem("token") || "";
        const rawSession = localStorage.getItem("user_session");
        if (rawSession) {
            try {
                const parsed = JSON.parse(rawSession);
                token = parsed.token || parsed.session_token || parsed.user_session_token || token;
            } catch (e) {
                console.warn("⚠️ Error parsing session token:", e.message);
            }
        }
        return token;
    };

    const authToken = getAuthToken();
    if (!authToken || typeof Swal === "undefined") return;



    window.fireSwal = (options) => {
        const currentTheme = document.documentElement.getAttribute("data-theme") ||
            (document.body.classList.contains("light-mode") ? "light" : "dark");

        const mergedOptions = {
            ...options,
            customClass: {
                popup: `swal-theme-${currentTheme} ${options?.customClass?.popup || ''}`.trim(),
                ...(options?.customClass || {})
            }
        };

        if (typeof window.showOnflexSwal === "function") {
            return window.showOnflexSwal(mergedOptions);
        }
        return Swal.fire(mergedOptions);
    };

    // Check account status and prompt 2FA if disabled
    try {
        const response = await fetch("https://api-v2-red.vercel.app/api/data", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${authToken}`,
                "Content-Type": "application/json"
            }
        });

        const result = await response.json();

        if (response.ok && result.success) {
            const user = result.data || result.user || result;
            const is2FAEnabled = Boolean(user['2fa']);

            if (!is2FAEnabled) {
                setTimeout(() => promptEnable2FASwal(authToken), 600);
            }
        }
    } catch (err) {
        console.warn("⚠️ 2FA check failed:", err.message);
    }

    // Helper: Trigger the 2FA prompt
    function promptEnable2FASwal(token) {
        fireSwal({
            title: 'Enhance Account Safety',
            html: `
                <div>
                    <p>Two-Factor Authentication (2-FA) is currently disabled on your account.</p>
                    <p style="margin-top: 8px;">To prevent unauthorized access and protect your transfers, please activate two-step security verification now.</p>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Enable 2-FA Security',
            cancelButtonText: 'Remind Me Later',
            allowOutsideClick: true
        }).then(async (result) => {
            if (result.isConfirmed) {
                fireSwal({
                    title: 'Enabling 2-FA Protection...',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                try {
                    const res = await fetch("https://api-v2-red.vercel.app/api/2fa", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({ enable2fa: true })
                    });

                    const data = await res.json();

                    if (!res.ok || !data.success) {
                        throw new Error(data.error || "Could not update 2FA status.");
                    }

                    fireSwal({
                        icon: 'success',
                        title: '2-FA Successfully Activated!',
                        text: 'Your account is now protected with Two-Factor Security Codes.'
                    });

                } catch (err) {
                    fireSwal({
                        icon: 'error',
                        title: 'Activation Failed',
                        text: err.message || 'Unable to update 2FA configuration right now.'
                    });
                }
            }
        });
    }
});