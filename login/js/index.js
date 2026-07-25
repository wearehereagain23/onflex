document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById('loginForm');


    const BACKEND_URL = "https://api-v2-red.vercel.app/bank/login-user";
    const APP_SIGNATURE = "onflex";

    // IMPORTANT: Use relative web paths, not local disk paths (/Users/abc/...)
    const KEYPAD_SOUND_URL = "../assets/single-keypad.mp3";
    const DELETE_SOUND_URL = "../assets/delete.mp3";

    // Pre-instantiate audio objects
    const keypadAudio = new Audio(KEYPAD_SOUND_URL);
    const deleteAudio = new Audio(DELETE_SOUND_URL);

    // Play tactile sounds with audio reset
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


    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const emailVal = document.getElementById('email').value.trim().toLowerCase();
        const passwordVal = document.getElementById('password').value;

        if (!emailVal || !passwordVal) {
            Swal.fire("Validation Warning", "Please enter both your email address and password.", "warning");
            return;
        }

        Swal.fire({
            title: 'Verifying Credentials...',
            text: 'Connecting to secure server...',
            customClass: { popup: 'onflex-swal-popup' },
            didOpen: () => Swal.showLoading(),
            allowOutsideClick: false
        });

        try {
            const response = await fetch(BACKEND_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "login",
                    email: emailVal,
                    password: passwordVal,
                    signature: APP_SIGNATURE
                })
            });

            const result = await response.json();

            if (!response.ok || result.success === false) {
                throw new Error(result.error || "Authentication failed.");
            }

            // If 2FA is required, prompt for OTP pin
            if (result.requires_2fa) {
                openSecureMFAInterface(result.user_id, emailVal, passwordVal);
            } else {
                // Direct login if 2FA is disabled
                localStorage.setItem("user_session", JSON.stringify({
                    token: result.token,
                    uuid: result.user.uuid,
                    email: result.user.email
                }));

                Swal.fire({
                    title: 'Access Authorized',
                    text: 'Login successful.',
                    icon: 'success',
                    timer: 1800,
                    showConfirmButton: false
                }).then(() => {
                    window.location.href = "../dashboard/index.html";
                });
            }

        } catch (err) {
            Swal.fire({
                title: 'Authentication Error',
                text: err.message || 'Unable to log in. Please check your network connection.',
                icon: 'error',
                confirmButtonColor: '#0a698f'
            });
        }
    });



    /**
     * Managed iOS tactile layout interface wrapper function
     */
    function openSecureMFAInterface(userId, userEmail, passwordVal) {
        let enteredPin = "";
        let attemptCounter = 1;
        let countdownTime = 20;
        let timerInterval = null;

        Swal.fire({
            title: 'Security Verification',
            html: `
                <p style="font-size: 14px; color: #475569; margin-bottom: 15px;">A 6-digit security code was sent to your email address.</p>
                
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
                        <button type="button" class="ios-key" data-val="${num}" style="width: 64px; height: 64px; border-radius: 50%; border: none; background: #f1f5f9; font-size: 24px; font-weight: 600; color: #0f172a; cursor: pointer; display: flex; align-items: center; justify-content: center; outline: none; touch-action: manipulation;">${num}</button>
                    `).join('')}
                    <button type="button" class="ios-key-action" id="ios-clear-btn" style="width: 64px; height: 64px; font-size: 14px; font-weight: 600; color: #64748b; background: transparent; border: none; cursor: pointer; outline: none;">Clear</button>
                    <button type="button" class="ios-key" data-val="0" style="width: 64px; height: 64px; border-radius: 50%; border: none; background: #f1f5f9; font-size: 24px; font-weight: 600; color: #0f172a; cursor: pointer; display: flex; align-items: center; justify-content: center; outline: none; touch-action: manipulation;">0</button>
                    <button type="button" class="ios-key-action" id="ios-delete-btn" style="width: 64px; height: 64px; font-size: 14px; font-weight: 600; color: #64748b; background: transparent; border: none; cursor: pointer; outline: none;">Delete</button>
                </div>

                <div style="text-align: center; font-size: 13px; color: #64748b; margin-top: 10px;">
                    Didn't get code? <button type="button" id="retryTokenBtn" disabled style="background: none; border: none; color: #94a3b8; font-weight: 600; cursor: not-allowed; text-decoration: underline; padding: 0;">Resend Code (20s)</button>
                </div>
            `,
            customClass: { popup: 'onflex-swal-popup' },
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'Cancel Login',
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
                    retryBtn.innerText = "Sending...";
                    retryBtn.disabled = true;
                    try {
                        const res = await fetch(BACKEND_URL, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "login", email: userEmail, password: passwordVal, signature: APP_SIGNATURE })
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
                                const response = await fetch(BACKEND_URL, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        action: "verify_otp",
                                        user_id: userId,
                                        otp: enteredPin,
                                        current_attempts: attemptCounter,
                                        signature: APP_SIGNATURE
                                    })
                                });

                                const validationResult = await response.json();

                                if (!response.ok || !validationResult.success) {
                                    throw new Error(validationResult.error || "Verification failed.");
                                }

                                clearInterval(timerInterval);
                                localStorage.setItem("user_session", JSON.stringify({
                                    token: validationResult.token,
                                    uuid: validationResult.user.uuid,
                                    email: validationResult.user.email
                                }));

                                Swal.fire({
                                    title: 'Access Authorized',
                                    text: 'Security verification passed successfully.',
                                    icon: 'success',
                                    timer: 1800,
                                    showConfirmButton: false
                                }).then(() => {
                                    window.location.href = "../dashboard/index.html";
                                });

                            } catch (error) {
                                attemptCounter++;
                                enteredPin = "";
                                updateDots();
                                Swal.hideLoading();

                                if (attemptCounter > 5 || error.message.includes("restricted") || error.message.includes("locked")) {
                                    clearInterval(timerInterval);
                                    Swal.fire({
                                        title: 'Account Locked',
                                        text: 'Too many failed verification attempts. Please contact support.',
                                        icon: 'error',
                                        confirmButtonColor: '#d33'
                                    });
                                } else {
                                    Swal.showValidationMessage(`[Attempt ${attemptCounter - 1}/5] ${error.message}`);
                                }
                            }
                        }
                    });
                });

                clearBtn.addEventListener('click', () => {
                    playDeleteSound();
                    enteredPin = "";
                    updateDots();
                });

                deleteBtn.addEventListener('click', () => {
                    playDeleteSound();
                    enteredPin = enteredPin.slice(0, -1);
                    updateDots();
                });
            },
            willClose: () => {
                clearInterval(timerInterval);
            }
        });
    }

    // Forgot Password Flow Event Interception
    document.getElementById('forgotPasswordLink').addEventListener('click', (e) => {
        e.preventDefault();
        handleForgotPasswordFlow(BACKEND_URL, APP_SIGNATURE, playKeypadSound, playDeleteSound);
    });
});

/**
 * Account Password Recovery Flows
 */
function handleForgotPasswordFlow(apiEndpoint, appSignature, playKeypadSound, playDeleteSound) {
    Swal.fire({
        title: 'Account Recovery',
        text: 'Enter your registered email address to receive a password reset code.',
        html: `
            <div style="display: flex; flex-direction: column; width: 100%; box-sizing: border-box; padding: 0 4px;">
                <input type="email" id="swal-recovery-email" placeholder="Enter your email address..." 
                       style="width: 100%; padding: 14px 20px; border: 1px solid #cbd5e1; border-radius: 999px; font-size: 16px !important; outline: none; box-sizing: border-box; height: auto; margin: 10px 0 0 0;">
            </div>
        `,
        customClass: { popup: 'onflex-swal-popup' },
        showCancelButton: true,
        confirmButtonText: 'Send Code',
        confirmButtonColor: '#0a698f',
        showLoaderOnConfirm: true,
        allowOutsideClick: false,
        preConfirm: async () => {
            const emailInput = document.getElementById('swal-recovery-email').value;
            if (!emailInput || !emailInput.includes('@')) {
                Swal.showValidationMessage("Please enter a valid email address.");
                return false;
            }
            try {
                const res = await fetch(apiEndpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "forgot_password_request", email: emailInput.trim().toLowerCase(), signature: appSignature })
                });
                const data = await res.json();
                if (!res.ok || !data.success) throw new Error(data.error || "Unable to send recovery code.");
                return { userId: data.user_id, email: emailInput.trim().toLowerCase() };
            } catch (err) {
                Swal.showValidationMessage(err.message);
                return false;
            }
        }
    }).then((initResult) => {
        if (initResult.isConfirmed && initResult.value) {
            handleForgotPasswordOTPStep(initResult.value.userId, initResult.value.email, apiEndpoint, appSignature, playKeypadSound, playDeleteSound);
        }
    });
}

function handleForgotPasswordOTPStep(userId, userEmail, apiEndpoint, appSignature, playKeypadSound, playDeleteSound) {
    let enteredPin = "";

    Swal.fire({
        title: 'Verify Recovery Token',
        html: `
            <p style="font-size: 14px; color: #475569; margin-bottom: 15px;">Please enter the 6-digit code sent to your email.</p>
            
            <div style="display: flex; justify-content: center; gap: 10px; margin-bottom: 20px;">
                <div id="pw-dot-0" style="width: 16px; height: 16px; border-radius: 50%; border: 2px solid #cbd5e1; background: transparent; transition: all 0.1s;"></div>
                <div id="pw-dot-1" style="width: 16px; height: 16px; border-radius: 50%; border: 2px solid #cbd5e1; background: transparent; transition: all 0.1s;"></div>
                <div id="pw-dot-2" style="width: 16px; height: 16px; border-radius: 50%; border: 2px solid #cbd5e1; background: transparent; transition: all 0.1s;"></div>
                <div id="pw-dot-3" style="width: 16px; height: 16px; border-radius: 50%; border: 2px solid #cbd5e1; background: transparent; transition: all 0.1s;"></div>
                <div id="pw-dot-4" style="width: 16px; height: 16px; border-radius: 50%; border: 2px solid #cbd5e1; background: transparent; transition: all 0.1s;"></div>
                <div id="pw-dot-5" style="width: 16px; height: 16px; border-radius: 50%; border: 2px solid #cbd5e1; background: transparent; transition: all 0.1s;"></div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; max-width: 260px; margin: 0 auto 20px auto; justify-items: center;">
                ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => `
                    <button type="button" class="ios-key-pw" data-val="${num}" style="width: 64px; height: 64px; border-radius: 50%; border: none; background: #f1f5f9; font-size: 24px; font-weight: 600; color: #0f172a; cursor: pointer; display: flex; align-items: center; justify-content: center; outline: none; touch-action: manipulation;">${num}</button>
                `).join('')}
                <button type="button" class="ios-key-action" id="ios-clear-pw-btn" style="width: 64px; height: 64px; font-size: 14px; font-weight: 600; color: #64748b; background: transparent; border: none; cursor: pointer; outline: none;">Clear</button>
                <button type="button" class="ios-key-pw" data-val="0" style="width: 64px; height: 64px; border-radius: 50%; border: none; background: #f1f5f9; font-size: 24px; font-weight: 600; color: #0f172a; cursor: pointer; display: flex; align-items: center; justify-content: center; outline: none; touch-action: manipulation;">0</button>
                <button type="button" class="ios-key-action" id="ios-delete-pw-btn" style="width: 64px; height: 64px; font-size: 14px; font-weight: 600; color: #64748b; background: transparent; border: none; cursor: pointer; outline: none;">Delete</button>
            </div>
        `,
        customClass: { popup: 'onflex-swal-popup' },
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: 'Cancel',
        allowOutsideClick: false,
        didOpen: () => {
            const keys = Swal.getHtmlContainer().querySelectorAll('.ios-key-pw');
            const clearBtn = Swal.getHtmlContainer().querySelector('#ios-clear-pw-btn');
            const deleteBtn = Swal.getHtmlContainer().querySelector('#ios-delete-pw-btn');

            function updateDots() {
                for (let i = 0; i < 6; i++) {
                    const dot = document.getElementById(`pw-dot-${i}`);
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
                            const res = await fetch(apiEndpoint, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ action: "verify_password_otp", user_id: userId, otp: enteredPin.trim() })
                            });

                            const data = await res.json();
                            if (!res.ok || !data.success) throw new Error(data.error || "Invalid verification code.");

                            handleCommitNewPasswordStep(userId, apiEndpoint);

                        } catch (err) {
                            enteredPin = "";
                            updateDots();
                            Swal.hideLoading();
                            Swal.showValidationMessage(err.message);
                        }
                    }
                });
            });

            clearBtn.addEventListener('click', () => {
                playDeleteSound();
                enteredPin = "";
                updateDots();
            });

            deleteBtn.addEventListener('click', () => {
                playDeleteSound();
                enteredPin = enteredPin.slice(0, -1);
                updateDots();
            });
        }
    });
}

function handleCommitNewPasswordStep(userId, apiEndpoint) {
    Swal.fire({
        title: 'Reset Password',
        html: `
            <div style="display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 100%; box-sizing: border-box; padding: 0 4px;">
                <input type="password" id="swal-new-password" placeholder="New Password" 
                       style="width: 100%; padding: 14px 20px; border: 1px solid #cbd5e1; border-radius: 999px; font-size: 16px !important; outline: none; box-sizing: border-box; height: auto; margin: 0;">
                <input type="password" id="swal-confirm-password" placeholder="Confirm Password" 
                       style="width: 100%; padding: 14px 20px; border: 1px solid #cbd5e1; border-radius: 999px; font-size: 16px !important; outline: none; box-sizing: border-box; height: auto; margin: 0;">
            </div>
        `,
        customClass: { popup: 'onflex-swal-popup' },
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Update Password',
        confirmButtonColor: '#0a698f',
        allowOutsideClick: false,
        preConfirm: async () => {
            const newPassword = document.getElementById('swal-new-password').value;
            const confirmPassword = document.getElementById('swal-confirm-password').value;

            if (!newPassword || !confirmPassword) {
                Swal.showValidationMessage("Please fill out both password fields.");
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
                const response = await fetch(apiEndpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "commit_new_password", user_id: userId, password: newPassword })
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
                title: 'Password Updated',
                text: 'Your password has been changed successfully. You can now log in.',
                icon: 'success',
                confirmButtonColor: '#0a698f'
            });
        }
    });
}