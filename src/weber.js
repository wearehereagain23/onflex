/**
 * src/admin/website.js
 * GLOBAL ADMIN SECURITY & REALTIME SYNC
 * (Adapted for non-module environment)
 */

(function () {
    // 1. Configuration Constants
    const SESSION_KEY = 'admin_active';
    const TIMEOUT_LIMIT = 30 * 60 * 1000; // 30 minutes

    /**
     * MAIN INITIALIZER
     */
    window.checkSiteAndAccountStatus = async () => {
        const db = window.supabase; // Accessing the global instance
        if (!db) return console.error("Supabase instance not found for security check.");

        try {
            checkInactivityTimeout();

            // Check Global Site Visibility and Agreement
            const { data: adminData } = await db
                .from('admin')
                .select('website_visibility, email, address, agreement')
                .eq('id', 1)
                .single();

            if (adminData) {
                // 1. KILL-SWITCH: Initial Load
                if (adminData.website_visibility === false) {
                    forceKillRedirect();
                    return;
                }

                // 2. AGREEMENT: Initial Load
                checkAgreementStatus(adminData.agreement, db);

                // 3. Footer UI
                updateFooterUI(adminData.email, adminData.address);
            }
        } catch (err) {
            console.error("Security Sync Error:", err);
        }
    };

    /**
     * KILL-SWITCH LOGIC
     */
    function forceKillRedirect() {
        if (!window.location.pathname.includes('404.html')) {
            window.location.href = window.location.origin + '/admin/404.html';
        }
    }

    /**
     * AGREEMENT LOGIC (Modal Gate)
     */
    function checkAgreementStatus(isAgreed, db) {
        if (isAgreed === false) {
            Swal.fire({
                title: 'Terms of Service & Disclaimer',
                html: `
                    <div style="text-align: left; font-size: 14px; color: #fff; line-height: 1.6;">
                        <p>Before proceeding, you must acknowledge these administrative terms:</p>
                        <ul style="padding-left: 20px;">
                            <li style="margin-bottom: 10px;"><b>Non-Abuse Policy:</b> Administrative tools must not be used for illegal activity or harm.</li>
                            <li style="margin-bottom: 10px;"><b>Developer Indemnification:</b> The developer is not liable for actions taken by the administrator.</li>
                        </ul>
                        <p style="font-size: 12px; color: #94a3b8;">Clicking "I Agree" accepts full legal responsibility.</p>
                    </div>
                `,
                icon: 'info',
                background: '#0C290F',
                color: '#fff',
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: true,
                confirmButtonText: 'I Agree and Accept Responsibility',
                confirmButtonColor: '#0ea365',
                preConfirm: async () => {
                    const { error } = await db
                        .from('admin')
                        .update({ agreement: true })
                        .eq('id', 1);

                    if (error) {
                        Swal.showValidationMessage(`Update failed: ${error.message}`);
                    }
                }
            });
        } else {
            // Close agreement modal if it's open and database says it's now true
            if (Swal.isVisible() && Swal.getTitle()?.innerText.includes('Terms')) {
                Swal.close();
            }
        }
    }

    /**
     * REAL-TIME SYNC ENGINE
     */
    function startRealtimeSync() {
        const db = window.supabase;
        if (!db) return;

        db.channel('global_admin_sync')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'admin',
                filter: 'id=eq.1'
            }, (payload) => {
                const data = payload.new;

                // 1. REALTIME KILL-SWITCH
                if (data.website_visibility === false) {
                    forceKillRedirect();
                }

                // 2. REALTIME AGREEMENT TOGGLE
                checkAgreementStatus(data.agreement, db);

                // 3. Update Footer
                updateFooterUI(data.email, data.address);
            }).subscribe();
    }

    /**
     * INACTIVITY & TIMEOUT
     */
    function checkInactivityTimeout() {
        const lastActive = localStorage.getItem('last_active_time');
        const now = Date.now();
        if (lastActive && (now - parseInt(lastActive) > TIMEOUT_LIMIT)) {
            handleRestriction("Session expired due to inactivity.");
        }
    }

    function updateLastActive() {
        localStorage.setItem('last_active_time', Date.now().toString());
    }

    function updateFooterUI(email, address) {
        const emailEl = document.getElementById('footerEmail');
        const addressEl = document.getElementById('footerAddress');
        if (emailEl) emailEl.innerText = email ? `Email: ${email}` : '';
        if (addressEl) addressEl.innerText = address ? `Address: ${address}` : '';
    }

    async function handleRestriction(message) {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem('last_active_time');
        alert(message);
        window.location.href = window.location.origin + '/admin/login/index.html';
    }

    // Global Listeners for activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(name => {
        document.addEventListener(name, updateLastActive);
    });

    // Execute on script load
    // We use a small timeout to ensure the global 'supabase' from the head script is ready
    setTimeout(() => {
        window.checkSiteAndAccountStatus();
        startRealtimeSync();
    }, 500);

})();