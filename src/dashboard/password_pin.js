/**
 * password_pin.js - Realtime PIN and Password change logic with Validation
 */
(function () {
    let pinAttempts = 0;
    let passAttempts = 0;
    const LIMIT = 5;

    window.initSecurityForms = function () {
        const userUuid = window.userUuid;
        const db = window.supabase;

        // --- CHANGE PASSWORD LOGIC ---
        const passForm = document.getElementById('passch');
        passForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = new FormData(passForm);
            const oldPass = data.get('oldPassword');
            const newPass = data.get('newPassword');
            const confirmPass = data.get('confirmPassword'); // Ensure your HTML input has name="confirmPassword"

            // 1. Validation: Match Check
            if (newPass !== confirmPass) {
                return Swal.fire({ icon: 'error', title: 'Mismatch', text: 'New passwords do not match!', background: '#0C290F', color: '#fff' });
            }

            // 2. Security: Attempt Check
            if (passAttempts >= LIMIT) {
                await db.from('users').update({ activeuser: false }).eq('uuid', userUuid);
                window.location.href = '../login/index.html';
                return;
            }

            if (typeof showSpinnerModal === 'function') showSpinnerModal();

            // 3. Verify Old Password against Local State
            if (oldPass === window.dataBase.password) {
                const { error } = await db.from('users').update({ password: newPass }).eq('uuid', userUuid);

                if (typeof hideSpinnerModal === 'function') hideSpinnerModal();

                if (!error) {
                    // Update Local State for Realtime sync
                    window.dataBase.password = newPass;
                    window.dispatchEvent(new CustomEvent('userDataUpdated'));

                    passForm.reset();
                    Swal.fire({ icon: 'success', title: 'Password Updated', background: '#0C290F', color: '#fff' });
                }
            } else {
                if (typeof hideSpinnerModal === 'function') hideSpinnerModal();
                passAttempts++;
                Swal.fire({
                    icon: 'error',
                    title: 'Wrong Password',
                    text: `Incorrect current password. ${LIMIT - passAttempts} tries left.`,
                    background: '#0C290F',
                    color: '#fff'
                });
            }
        });

        // --- CHANGE PIN LOGIC ---
        const pinForm = document.getElementById('pin');
        pinForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = new FormData(pinForm);
            const oldPin = data.get('oldPin');
            const newPin = data.get('newPin');
            const confirmPin = data.get('confirmPin'); // Ensure your HTML input has name="confirmPin"

            // 1. Validation: Match Check
            if (String(newPin) !== String(confirmPin)) {
                return Swal.fire({ icon: 'error', title: 'Mismatch', text: 'New PINs do not match!', background: '#0C290F', color: '#fff' });
            }

            // 2. Security: Attempt Check
            if (pinAttempts >= LIMIT) {
                await db.from('users').update({ activeuser: false }).eq('uuid', userUuid);
                window.location.href = '../login/index.html';
                return;
            }

            if (typeof showSpinnerModal === 'function') showSpinnerModal();

            // 3. Verify Old PIN against Local State
            if (String(oldPin) === String(window.dataBase.pin)) {
                const { error } = await db.from('users').update({ pin: newPin }).eq('uuid', userUuid);

                if (typeof hideSpinnerModal === 'function') hideSpinnerModal();

                if (!error) {
                    // Update Local State for Realtime sync
                    window.dataBase.pin = newPin;
                    window.dispatchEvent(new CustomEvent('userDataUpdated'));

                    pinForm.reset();
                    Swal.fire({ icon: 'success', title: 'PIN Updated', background: '#0C290F', color: '#fff' });
                }
            } else {
                if (typeof hideSpinnerModal === 'function') hideSpinnerModal();
                pinAttempts++;
                Swal.fire({
                    icon: 'error',
                    title: 'Wrong PIN',
                    text: `Incorrect current PIN. ${LIMIT - pinAttempts} tries left.`,
                    background: '#0C290F',
                    color: '#fff'
                });
            }
        });
    };
})();