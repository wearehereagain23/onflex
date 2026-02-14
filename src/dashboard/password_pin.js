/**
 * password_pin.js - Two-Step Verification Flow (Fixed)
 */
(function () {
    let pinAttempts = 0;
    let passAttempts = 0;
    const LIMIT = 5;

    window.initSecurityForms = function () {
        const userUuid = window.userUuid;
        const db = window.supabase;

        // --- 🔐 CHANGE PASSWORD LOGIC ---
        const passForm = document.getElementById('passch');
        passForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = new FormData(passForm);

            // Matches HTML: name="newPassword" and name="newPassword2"
            const newPass = data.get('newPassword');
            const confirmPass = data.get('newPassword2');

            // 1. Match Check
            if (newPass !== confirmPass) {
                return Swal.fire({
                    icon: 'error',
                    title: 'Mismatch',
                    text: 'The new passwords do not match.',
                    background: '#0c1e29ff', color: '#fff'
                });
            }

            // 2. Security Check (Pre-lockout)
            if (passAttempts >= LIMIT) {
                return lockAccount(userUuid, db);
            }

            // 3. Prompt for OLD Password
            const { value: oldPassInput } = await Swal.fire({
                title: 'Enter Old Password',
                input: 'password',
                inputLabel: 'Verify your identity to save changes',
                inputPlaceholder: 'Enter current password',
                showCancelButton: true,
                background: '#0c1e29ff',
                color: '#fff',
                confirmButtonColor: '#1067b9ff'
            });

            if (!oldPassInput) return;

            if (typeof showSpinnerModal === 'function') showSpinnerModal();

            // 4. Verify against DB state
            if (oldPassInput === window.dataBase.password) {
                const { error } = await db.from('users').update({ password: newPass }).eq('uuid', userUuid);

                if (typeof hideSpinnerModal === 'function') hideSpinnerModal();

                if (!error) {
                    window.dataBase.password = newPass;
                    passAttempts = 0;
                    window.dispatchEvent(new CustomEvent('userDataUpdated'));
                    passForm.reset();
                    Swal.fire({ icon: 'success', title: 'Password Updated', background: '#0c1e29ff', color: '#fff' });
                }
            } else {
                if (typeof hideSpinnerModal === 'function') hideSpinnerModal();
                passAttempts++;
                handleFailure('Password', passAttempts);
            }
        });

        // --- 🔢 CHANGE PIN LOGIC ---
        const pinForm = document.getElementById('pin');
        pinForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = new FormData(pinForm);

            const newPin = data.get('newPin');
            const confirmPin = data.get('newPin2');

            // 1. 🔍 NEW VALIDATION: Must be exactly 4 numbers
            const pinRegex = /^\d{4}$/;
            if (!pinRegex.test(newPin)) {
                return Swal.fire({
                    icon: 'warning',
                    title: 'Invalid PIN',
                    text: 'The PIN must be exactly 4 numeric digits (e.g., 1234).',
                    background: '#0c1e29ff', color: '#fff'
                });
            }

            // 2. Match Check
            if (String(newPin) !== String(confirmPin)) {
                return Swal.fire({
                    icon: 'error',
                    title: 'Mismatch',
                    text: 'The new PINs do not match.',
                    background: '#0c1e29ff', color: '#fff'
                });
            }

            // 3. Security Check (Lockout)
            if (pinAttempts >= LIMIT) return lockAccount(userUuid, db);

            // 4. Prompt for OLD PIN
            const { value: oldPinInput } = await Swal.fire({
                title: 'Enter Old PIN',
                input: 'password',
                inputLabel: 'Verification Required',
                inputPlaceholder: '4-digit PIN',
                showCancelButton: true,
                background: '#0c1e29ff',
                color: '#fff',
                confirmButtonColor: '#1067b9ff'
            });

            if (!oldPinInput) return;

            if (typeof showSpinnerModal === 'function') showSpinnerModal();

            // 5. Verify against DB state
            if (String(oldPinInput) === String(window.dataBase.pin)) {
                const { error } = await db.from('users').update({ pin: newPin }).eq('uuid', userUuid);

                if (typeof hideSpinnerModal === 'function') hideSpinnerModal();

                if (!error) {
                    window.dataBase.pin = newPin;
                    pinAttempts = 0;
                    window.dispatchEvent(new CustomEvent('userDataUpdated'));
                    pinForm.reset();
                    Swal.fire({ icon: 'success', title: 'PIN Updated', background: '#0c1e29ff', color: '#fff' });
                }
            } else {
                if (typeof hideSpinnerModal === 'function') hideSpinnerModal();
                pinAttempts++;
                handleFailure('PIN', pinAttempts);
            }
        });

        // --- HELPERS ---

        function handleFailure(type, count) {
            const remaining = LIMIT - count;
            if (remaining <= 0) {
                lockAccount(userUuid, db);
            } else {
                Swal.fire({
                    icon: 'error',
                    title: `Incorrect ${type}`,
                    text: `Incorrect current ${type}. You have ${remaining} attempts left before account suspension.`,
                    background: '#0c1e29ff',
                    color: '#fff'
                });
            }
        }

        async function lockAccount(uuid, supabase) {
            await supabase.from('users').update({ activeuser: false }).eq('uuid', uuid);
            Swal.fire({
                icon: 'error',
                title: 'Account Suspended',
                text: 'Too many failed attempts. Your account has been locked for security.',
                confirmButtonText: 'Logout',
                allowOutsideClick: false,
                background: '#0c1e29ff',
                color: '#fff'
            }).then(() => {
                window.location.href = '../login/index.html';
            });
        }
    };
})();