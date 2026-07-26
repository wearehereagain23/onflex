document.addEventListener('DOMContentLoaded', () => {
    const rawSession = localStorage.getItem("user_session");
    if (!rawSession) {
        window.location.href = "../login/index.html";
        return;
    }
    const session = JSON.parse(rawSession);
    const userEmail = session.email;

    const BACKEND_SETTINGS_URL = "http://localhost:5000/api/settings";
    const BACKEND_LOGIN_URL = "http://localhost:5000/bank/login-user";
    const APP_SIGNATURE = "onflex";

    const keypadAudio = new Audio("../assets/single-keypad.mp3");
    const deleteAudio = new Audio("../assets/delete.mp3");

    // Audio triggers strictly guarded against non-user-initiated events
    function playKeypadSound() {
        try {
            keypadAudio.currentTime = 0;
            keypadAudio.play().catch(() => { });
        } catch (e) { }
    }

    function playDeleteSound() {
        try {
            deleteAudio.currentTime = 0;
            deleteAudio.play().catch(() => { });
        } catch (e) { }
    }

    const formUpdatePassword = document.getElementById('formUpdatePassword');
    const formUpdatePin = document.getElementById('formUpdatePin');
    const btnForgotPassword = document.getElementById('btnForgotPassword');

    const handleEnforcedAccountLockout = (reasonText) => {
        Swal.fire({
            icon: 'error',
            title: '🔒 Account Access Restricted',
            text: reasonText || 'Too many consecutive authentication failures detected. Your session has been terminated.',
            confirmButtonText: 'Exit Portal',
            allowOutsideClick: false,
            allowEscapeKey: false
        }).then(() => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.replace("../login/index.html");
        });
    };

    if (formUpdatePassword) {
        formUpdatePassword.addEventListener('submit', async (e) => {
            e.preventDefault();

            const oldPassword = document.getElementById('pwdOld').value;
            const newPassword = document.getElementById('pwdNew').value;
            const confirmPassword = document.getElementById('pwdConfirm').value;

            if (newPassword !== confirmPassword) {
                Swal.fire({
                    icon: 'error',
                    title: 'Passwords Do Not Match',
                    text: 'The new password and confirmation fields must match.',
                });
                return;
            }

            Swal.fire({ title: 'Updating Password...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

            try {
                const currentToken = session.token || session.user_session_token || localStorage.getItem("user_session_token");

                const response = await fetch(BACKEND_SETTINGS_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-setting-target": "password",
                        "Authorization": `Bearer ${currentToken}`
                    },
                    body: JSON.stringify({ currentPassword: oldPassword, newPassword: newPassword })
                });
                const data = await response.json();

                if (data.success) {
                    if (data.token) {
                        localStorage.setItem("user_session_token", data.token);
                    }
                    Swal.fire({
                        icon: 'success',
                        title: 'Password Updated',
                        text: 'Your password has been changed successfully.',
                    });
                    formUpdatePassword.reset();
                } else {
                    if (data.restricted === true || response.status === 403) {
                        handleEnforcedAccountLockout(data.error);
                        return;
                    }

                    Swal.fire({
                        icon: 'error',
                        title: 'Update Failed',
                        text: data.error || 'Failed to update password.',
                    });
                }
            } catch (err) {
                Swal.fire({
                    icon: 'error',
                    title: 'Connection Error',
                    text: 'Unable to reach the server. Please check your connection.',
                });
            }
        });
    }

    if (formUpdatePin) {
        formUpdatePin.addEventListener('submit', async (e) => {
            e.preventDefault();

            const pinVerificationInput = document.getElementById('pinVerificationPassword') || document.getElementById('pinOld');
            const currentPinValue = pinVerificationInput ? pinVerificationInput.value : '';

            const newPin = document.getElementById('pinNew').value;
            const confirmPin = document.getElementById('pinConfirm').value;

            if (newPin !== confirmPin) {
                Swal.fire({
                    icon: 'error',
                    title: 'PIN Mismatch',
                    text: 'The entered security PINs do not match.',
                });
                return;
            }

            Swal.fire({ title: 'Updating PIN...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

            try {
                const currentToken = session.token || session.user_session_token || localStorage.getItem("user_session_token");

                const response = await fetch(BACKEND_SETTINGS_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-setting-target": "pin",
                        "Authorization": `Bearer ${currentToken}`
                    },
                    body: JSON.stringify({ currentPin: currentPinValue, newPin: newPin })
                });
                const data = await response.json();

                if (data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'PIN Updated',
                        text: 'Your security PIN has been updated successfully.',
                    });
                    formUpdatePin.reset();
                } else {
                    if (data.restricted === true || response.status === 403) {
                        handleEnforcedAccountLockout(data.error);
                        return;
                    }

                    Swal.fire({
                        icon: 'error',
                        title: 'PIN Update Failed',
                        text: data.error || 'Failed to update PIN.',
                    });
                }
            } catch (err) {
                Swal.fire({
                    icon: 'error',
                    title: 'Connection Error',
                    text: 'Failed to sync with the server.',
                });
            }
        });
    }

    if (btnForgotPassword) {
        btnForgotPassword.addEventListener('click', async () => {
            if (!userEmail) {
                Swal.fire({ icon: 'error', title: 'Session Error', text: 'Could not find your logged-in email profile.' });
                return;
            }

            Swal.fire({
                title: 'Sending Recovery Code...',
                text: `Sending verification code to ${userEmail}`,
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            try {
                const res = await fetch(BACKEND_LOGIN_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        action: "forgot_password_request",
                        email: userEmail.trim().toLowerCase(),
                        signature: APP_SIGNATURE
                    })
                });

                // Read response as text first to handle unexpected HTML error pages safely
                const rawText = await res.text();
                let data;
                try {
                    data = JSON.parse(rawText);
                } catch (e) {
                    console.error("Backend returned non-JSON response:", rawText);
                    throw new Error("Server returned an invalid response (HTML instead of JSON). Check server logs.");
                }

                if (!res.ok || !data.success) {
                    throw new Error(data.error || "Failed to initiate recovery.");
                }

                openSecureMFAInterface(data.user_id, userEmail.trim().toLowerCase());

            } catch (err) {
                Swal.fire({ icon: 'error', title: 'Request Failed', text: err.message });
            }
        });
    }

    function openSecureMFAInterface(userId, targetedEmail) {
        let enteredPin = "";
        let countdownTime = 20;
        let timerInterval = null;

        Swal.fire({
            title: 'Verify Your Identity',
            html: `
                <p style="font-size: 14px; color: #475569; margin-bottom: 15px;">We sent a 6-digit code to <b>${targetedEmail}</b>.</p>
                
                <div style="display: flex; justify-content: center; gap: 10px; margin-bottom: 20px;">
                    <div id="dot-0" style="width: 16px; height: 16px; border-radius: 50%; border: 2px solid #cbd5e1; background: transparent; transition: all 0.1s;"></div>
                    <div id="dot-1" style="width: 16px; height: 16px; border-radius: 50%; border: 2px solid #cbd5e1; background: transparent; transition: all 0.1s;"></div>
                    <div id="dot-2" style="width: 16px; height: 16px; border-radius: 50%; border: 2px solid #cbd5e1; background: transparent; transition: all 0.1s;"></div>
                    <div id="dot-3" style="width: 16px; height: 16px; border-radius: 50%; border: 2px solid #cbd5e1; background: transparent; transition: all 0.1s;"></div>
                    <div id="dot-4" style="width: 16px; height: 16px; border-radius: 50%; border: 2px solid #cbd5e1; background: transparent; transition: all 0.1s;"></div>
                    <div id="dot-5" style="width: 16px; height: 16px; border-radius: 50%; border: 2px solid #cbd5e1; background: transparent; transition: all 0.1s;"></div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; max-width: 260px; margin: 0 auto 20px auto; justify-items: center;">
                    ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => `
                        <button type="button" class="ios-key" data-val="${num}" style="width: 64px; height: 64px; border-radius: 50%; border: none; background: #f1f5f9; font-size: 24px; font-weight: 600; color: #0f172a; cursor: pointer; display: flex; align-items: center; justify-content: center; outline: none;">${num}</button>
                    `).join('')}
                    <button type="button" class="ios-key-action" id="ios-clear-btn" style="width: 64px; height: 64px; font-size: 14px; font-weight: 600; color: #64748b; background: transparent; border: none; cursor: pointer;">Clear</button>
                    <button type="button" class="ios-key" data-val="0" style="width: 64px; height: 64px; border-radius: 50%; border: none; background: #f1f5f9; font-size: 24px; font-weight: 600; color: #0f172a; cursor: pointer; display: flex; align-items: center; justify-content: center; outline: none;">0</button>
                    <button type="button" class="ios-key-action" id="ios-delete-btn" style="width: 64px; height: 64px; font-size: 14px; font-weight: 600; color: #64748b; background: transparent; border: none; cursor: pointer;">Delete</button>
                </div>

                <div style="text-align: center; font-size: 13px; color: #64748b; margin-top: 10px;">
                    Didn't get code? <button type="button" id="retryTokenBtn" disabled style="background: none; border: none; color: #94a3b8; font-weight: 600; cursor: not-allowed; text-decoration: underline; padding: 0;">Resend Code (20s)</button>
                </div>
            `,
            customClass: { popup: 'onflex-swal-popup' },
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'Cancel',
            allowOutsideClick: false,
            didOpen: () => {
                const keys = Swal.getHtmlContainer().querySelectorAll('.ios-key');
                const clearBtn = Swal.getHtmlContainer().querySelector('#ios-clear-btn');
                const deleteBtn = Swal.getHtmlContainer().querySelector('#ios-delete-btn');
                const retryBtn = Swal.getHtmlContainer().querySelector('#retryTokenBtn');

                function startCountdownTimer() {
                    countdownTime = 20;
                    retryBtn.disabled = true;
                    retryBtn.style.color = '#94a3b8';
                    retryBtn.style.cursor = 'not-allowed';

                    clearInterval(timerInterval);
                    timerInterval = setInterval(() => {
                        countdownTime--;
                        retryBtn.innerText = `Resend Code (${countdownTime}s)`;

                        if (countdownTime <= 0) {
                            clearInterval(timerInterval);
                            retryBtn.disabled = false;
                            retryBtn.innerText = "Resend Code";
                            retryBtn.style.color = "#0a698f";
                            retryBtn.style.cursor = "pointer";
                        }
                    }, 1000);
                }

                startCountdownTimer();

                retryBtn.addEventListener('click', async () => {
                    if (retryBtn.disabled) return;
                    retryBtn.innerText = "Resend Code...";
                    retryBtn.disabled = true;
                    try {
                        const res = await fetch(BACKEND_LOGIN_URL, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                action: "forgot_password_request",
                                email: targetedEmail,
                                signature: APP_SIGNATURE
                            })
                        });
                        const resData = await res.json();
                        if (!res.ok || !resData.success) throw new Error(resData.error);
                        startCountdownTimer();
                    } catch (err) {
                        Swal.showValidationMessage(`Resend failed: ${err.message}`);
                        retryBtn.disabled = false;
                        retryBtn.innerText = "Resend Code";
                    }
                });

                function updateDots() {
                    for (let i = 0; i < 6; i++) {
                        const dot = document.getElementById(`dot-${i}`);
                        if (dot) {
                            if (i < enteredPin.length) {
                                dot.style.background = '#0a698f';
                                dot.style.borderColor = '#0a698f';
                            } else {
                                dot.style.background = 'transparent';
                                dot.style.borderColor = '#cbd5e1';
                            }
                        }
                    }
                }

                keys.forEach(key => {
                    key.addEventListener('click', async () => {
                        if (enteredPin.length >= 6) return;

                        playKeypadSound();
                        key.style.background = '#e2e8f0';
                        setTimeout(() => key.style.background = '#f1f5f9', 80);

                        enteredPin += key.getAttribute('data-val');
                        updateDots();

                        if (enteredPin.length === 6) {
                            Swal.showLoading();
                            try {
                                const response = await fetch(BACKEND_LOGIN_URL, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        action: "verify_password_otp",
                                        user_id: userId,
                                        otp: enteredPin,
                                        signature: APP_SIGNATURE
                                    })
                                });

                                const validationResult = await response.json();

                                if (!response.ok || !validationResult.success) {
                                    throw new Error(validationResult.error || "Verification code is invalid.");
                                }

                                clearInterval(timerInterval);
                                handleCommitNewPasswordStep(userId);

                            } catch (error) {
                                enteredPin = "";
                                updateDots();
                                Swal.hideLoading();

                                if (error.message.includes("restricted") || error.message.includes("locked")) {
                                    clearInterval(timerInterval);
                                    handleEnforcedAccountLockout(error.message);
                                } else {
                                    Swal.showValidationMessage(error.message);
                                }
                            }
                        }
                    });
                });

                clearBtn.addEventListener('click', () => { playDeleteSound(); enteredPin = ""; updateDots(); });
                deleteBtn.addEventListener('click', () => { playDeleteSound(); enteredPin = enteredPin.slice(0, -1); updateDots(); });
            },
            willClose: () => {
                clearInterval(timerInterval);
            }
        });
    }

    function handleCommitNewPasswordStep(userId) {
        Swal.fire({
            title: 'Set New Password',
            html: `
                <div style="display: flex; flex-direction: column; gap: 12px; width: 100%; box-sizing: border-box; padding: 0 4px;">
                    <input type="password" id="swal-new-password" placeholder="Enter New Password" 
                           style="width: 100%; padding: 14px 20px; border: 1px solid #cbd5e1; border-radius: 999px; font-size: 16px !important; outline: none; box-sizing: border-box; color: #0f172a;">
                    <input type="password" id="swal-confirm-password" placeholder="Confirm New Password" 
                           style="width: 100%; padding: 14px 20px; border: 1px solid #cbd5e1; border-radius: 999px; font-size: 16px !important; outline: none; box-sizing: border-box; color: #0f172a;">
                </div>
            `,
            customClass: { popup: 'onflex-swal-popup' },
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Save Password',
            confirmButtonColor: '#0a698f',
            allowOutsideClick: false,
            preConfirm: async () => {
                const newPassword = document.getElementById('swal-new-password').value;
                const confirmPassword = document.getElementById('swal-confirm-password').value;

                if (!newPassword || !confirmPassword) {
                    Swal.showValidationMessage("Please fill in both password fields.");
                    return false;
                }
                if (newPassword !== confirmPassword) {
                    Swal.showValidationMessage("Passwords do not match.");
                    return false;
                }
                if (newPassword.length < 8) {
                    Swal.showValidationMessage("Password must be at least 8 characters long.");
                    return false;
                }

                try {
                    const response = await fetch(BACKEND_LOGIN_URL, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            action: "commit_new_password",
                            user_id: userId,
                            password: newPassword,
                            signature: APP_SIGNATURE
                        })
                    });
                    const result = await response.json();
                    if (!response.ok || !result.success) throw new Error(result.error || "Failed to update password.");
                    return true;
                } catch (err) {
                    Swal.showValidationMessage(err.message);
                    return false;
                }
            }
        }).then((finalResult) => {
            if (finalResult.isConfirmed) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Your password has been changed successfully.',
                    icon: 'success',
                });
            }
        });
    }
});