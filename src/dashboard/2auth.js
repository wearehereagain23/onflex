/**
 * 2auth.js - Realtime Screen Lock (2FA) and Logout logic
 */
window.initTwoFactor = function () {
    const lockBtn = document.getElementById('2FAX');
    const userUuid = window.userUuid;
    const db = window.supabase;

    if (!lockBtn) return;

    // Helper function to update the global state and trigger UI refresh across the app
    const syncRealtimeUI = (newState) => {
        if (window.dataBase) {
            window.dataBase.lockscreen = newState;
            // Broadcast the update so security.html and other modules react immediately
            window.dispatchEvent(new CustomEvent('userDataUpdated'));
        }
    };

    lockBtn.addEventListener('click', async () => {
        // Access the current state from the global object
        const isCurrentlyEnabled = window.dataBase.lockscreen;

        if (isCurrentlyEnabled === false) {
            // Logic to ENABLE
            const result = await Swal.fire({
                background: '#0C290F',
                confirmButtonColor: 'green',
                showCancelButton: true,
                title: 'Enable Screen Lock?',
                text: "Adds an extra layer of protection by requiring PIN verification when your screen is inactive.",
                icon: 'info',
                confirmButtonText: 'Enable Now'
            });

            if (result.isConfirmed) {
                if (typeof showSpinnerModal === 'function') showSpinnerModal();

                const { error } = await db.from('users')
                    .update({ lockscreen: true })
                    .eq('uuid', userUuid);

                if (typeof hideSpinnerModal === 'function') hideSpinnerModal();

                if (!error) {
                    syncRealtimeUI(true); // Update state in realtime
                    Swal.fire({
                        icon: 'success',
                        title: 'Active',
                        text: 'Screen Lock is now enabled.',
                        background: '#0C290F',
                        color: '#fff'
                    });
                } else {
                    Swal.fire({ icon: 'error', title: 'Update Failed', text: error.message });
                }
            }

        } else {
            // Logic to DISABLE
            const result = await Swal.fire({
                background: '#0C290F',
                confirmButtonColor: '#ef4444',
                showCancelButton: true,
                title: 'Disable Security?',
                text: "Turning this off makes your account less secure. Proceed?",
                icon: 'warning',
                confirmButtonText: 'Disable'
            });

            if (result.isConfirmed) {
                if (typeof showSpinnerModal === 'function') showSpinnerModal();

                const { error } = await db.from('users')
                    .update({ lockscreen: false })
                    .eq('uuid', userUuid);

                if (typeof hideSpinnerModal === 'function') hideSpinnerModal();

                if (!error) {
                    syncRealtimeUI(false); // Update state in realtime
                    Swal.fire({
                        icon: 'success',
                        title: 'Disabled',
                        text: 'Security layer removed.',
                        background: '#0C290F',
                        color: '#fff'
                    });
                } else {
                    Swal.fire({ icon: 'error', title: 'Update Failed', text: error.message });
                }
            }
        }
    });

    // --- LOGOUT LOGIC ---
    const logoutBtn = document.getElementById('logoutB');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const result = await Swal.fire({
                title: 'Logout?',
                text: "Your session will be ended.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                background: '#0C290F',
                color: '#fff'
            });

            if (result.isConfirmed) {
                localStorage.removeItem('isLocked');
                localStorage.removeItem('user_session');
                sessionStorage.clear();
                window.location.href = '../login/index.html';
            }
        });
    }
};