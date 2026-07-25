/**
 * ==========================================================================
 * ONFLEX GLOBAL UNIFIED AUTHENTICATION INTERACTIVE PRESET WINDOW NODES
 * ==========================================================================
 */

// Global pre-instantiated audio objects with relative paths
const keypadAudio = new Audio("../assets/single-keypad.mp3");
const deleteAudio = new Audio("../assets/delete.mp3");

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

const OnFlexAuth = {

    async checkHasPin(user) {
        // Evaluate if pin is set (handles empty string, null, undefined, or missing key)
        const hasPin = user && user.pin !== undefined && user.pin !== null && String(user.pin).trim() !== "";

        if (!hasPin) {
            await Swal.fire({
                title: "Security PIN Required",
                text: "You need to set up a 4-digit transaction PIN before accessing this feature. Please visit your Account Settings to configure it.",
                icon: "warning",
                background: "#111115",
                color: "#fff",
                confirmButtonText: "Go to Settings",
                confirmButtonColor: "#0a698f",
                showCancelButton: true,
                cancelButtonText: "Cancel",
                cancelButtonColor: "rgba(255,255,255,0.1)",
                allowOutsideClick: false
            }).then((result) => {
                if (result.isConfirmed) {
                    location.href = "./security.html";
                }
            });
            return false;
        }

        return true;
    },


    /**
     * WORKFLOW 1: SECURE 4-DIGIT PIN CREATION / INITIAL CONFIGURATION
     * Used across administrative setups and card initialization flows.
     */
    async promptPin(titleText = "Configure Secure PIN", subtitleText = "Create a new 4-digit card security signature code") {
        let enteredPin = "";

        return Swal.fire({
            title: titleText,
            background: "#111115",
            color: "#fff",
            html: `
                <div style="font-size: 0.85rem; opacity: 0.65; margin-bottom: 20px; color: #fff; text-align: center;">${subtitleText}</div>
                
                <div class="onflex-pin-dots" style="display: flex; justify-content: center; gap: 16px; margin-bottom: 25px;">
                    <div id="create-dot-0" style="width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.2); background: transparent; transition: all 0.15s ease;"></div>
                    <div id="create-dot-1" style="width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.2); background: transparent; transition: all 0.15s ease;"></div>
                    <div id="create-dot-2" style="width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.2); background: transparent; transition: all 0.15s ease;"></div>
                    <div id="create-dot-3" style="width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.2); background: transparent; transition: all 0.15s ease;"></div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 240px; margin: 0 auto; justify-items: center;">
                    ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => `
                        <button type="button" class="onflex-key" data-val="${num}" style="width: 60px; height: 60px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.05); background: #16161a; font-size: 22px; font-weight: 600; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; outline: none; transition: background 0.1s; touch-action: manipulation;">${num}</button>
                    `).join('')}
                    <button type="button" class="onflex-action-key" id="create-clear-btn" style="width: 60px; height: 60px; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.4); background: transparent; border: none; cursor: pointer; outline: none;">Clear</button>
                    <button type="button" class="onflex-key" data-val="0" style="width: 60px; height: 60px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.05); background: #16161a; font-size: 22px; font-weight: 600; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; outline: none; transition: background 0.1s; touch-action: manipulation;">0</button>
                    <button type="button" class="onflex-action-key" id="create-delete-btn" style="width: 60px; height: 60px; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.4); background: transparent; border: none; cursor: pointer; outline: none;">Delete</button>
                </div>
            `,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'Cancel',
            cancelButtonColor: 'rgba(255,255,255,0.1)',
            allowOutsideClick: false,
            didOpen: () => {
                const popup = Swal.getPopup();
                const keys = popup.querySelectorAll('.onflex-key');
                const clearBtn = popup.querySelector('#create-clear-btn');
                const deleteBtn = popup.querySelector('#create-delete-btn');

                function updateDots() {
                    for (let i = 0; i < 4; i++) {
                        const dot = document.getElementById(`create-dot-${i}`);
                        if (dot) {
                            if (i < enteredPin.length) {
                                dot.style.background = '#0a698f';
                                dot.style.borderColor = '#0a698f';
                                dot.style.boxShadow = '0 0 8px #0a698f';
                            } else {
                                dot.style.background = 'transparent';
                                dot.style.borderColor = 'rgba(255,255,255,0.2)';
                                dot.style.boxShadow = 'none';
                            }
                        }
                    }
                }

                keys.forEach(key => {
                    key.addEventListener('click', () => {
                        if (enteredPin.length >= 4) return;

                        playKeypadSound();

                        key.style.background = '#0a698f';
                        setTimeout(() => key.style.background = '#16161a', 100);

                        enteredPin += key.getAttribute('data-val');
                        updateDots();

                        if (enteredPin.length === 4) {
                            Swal.clickConfirm();
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
            preConfirm: () => {
                return enteredPin;
            }
        }).then(result => {
            if (result.isConfirmed) {
                return { isConfirmed: true, value: result.value };
            }
            return { isConfirmed: false, value: "" };
        });
    },

    /**
     * WORKFLOW 2: SECURE 4-DIGIT PIN AUTHENTICATION / VERIFICATION INTERFACE
     * Handles account entrance actions with attempt counter lockout constraints.
     */
    async verifyPin(backendUrl, userId, appSignature, suppliedToken = "") {
        let enteredPin = "";
        let attemptCounter = 0;
        const maxAttempts = 5;

        // Fallback: If token parameter is missing, read it cleanly directly from local storage context
        let activeToken = suppliedToken;
        if (!activeToken) {
            try {
                const rawSession = localStorage.getItem("user_session");
                if (rawSession) {
                    const parsed = JSON.parse(rawSession);
                    activeToken = parsed.token || "";
                }
            } catch (e) {
                console.error("Session parse warning:", e);
            }
        }

        return new Promise((resolve) => {
            function launchModal() {
                Swal.fire({
                    title: 'Enter Secure PIN',
                    background: "#111115",
                    color: "#fff",
                    html: `
                        <div style="font-size: 0.85rem; opacity: 0.65; margin-bottom: 20px; color: #fff; text-align: center;">Provide your 4-digit terminal verification access code.</div>
                        
                        <div class="onflex-pin-dots" style="display: flex; justify-content: center; gap: 16px; margin-bottom: 25px;">
                            <div id="auth-dot-0" style="width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.2); background: transparent; transition: all 0.15s ease;"></div>
                            <div id="auth-dot-1" style="width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.2); background: transparent; transition: all 0.15s ease;"></div>
                            <div id="auth-dot-2" style="width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.2); background: transparent; transition: all 0.15s ease;"></div>
                            <div id="auth-dot-3" style="width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.2); background: transparent; transition: all 0.15s ease;"></div>
                        </div>

                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 240px; margin: 0 auto; justify-items: center;">
                            ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => `
                                <button type="button" class="onflex-auth-key" data-val="${num}" style="width: 60px; height: 60px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.05); background: #16161a; font-size: 22px; font-weight: 600; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; outline: none; transition: background 0.1s; touch-action: manipulation;">${num}</button>
                            `).join('')}
                            <button type="button" class="onflex-action-key" id="auth-clear-btn" style="width: 60px; height: 60px; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.4); background: transparent; border: none; cursor: pointer; outline: none;">Clear</button>
                            <button type="button" class="onflex-auth-key" data-val="0" style="width: 60px; height: 60px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.05); background: #16161a; font-size: 22px; font-weight: 600; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; outline: none; transition: background 0.1s; touch-action: manipulation;">0</button>
                            <button type="button" class="onflex-action-key" id="auth-delete-btn" style="width: 60px; height: 60px; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.4); background: transparent; border: none; cursor: pointer; outline: none;">Delete</button>
                        </div>
                    `,
                    showConfirmButton: false,
                    showCancelButton: true,
                    cancelButtonText: 'Abort Request',
                    cancelButtonColor: 'rgba(255,255,255,0.1)',
                    allowOutsideClick: false,
                    didOpen: () => {
                        const popup = Swal.getPopup();
                        const keys = popup.querySelectorAll('.onflex-auth-key');
                        const clearBtn = popup.querySelector('#auth-clear-btn');
                        const deleteBtn = popup.querySelector('#auth-delete-btn');

                        function updateDots() {
                            for (let i = 0; i < 4; i++) {
                                const dot = document.getElementById(`auth-dot-${i}`);
                                if (dot) {
                                    if (i < enteredPin.length) {
                                        dot.style.background = '#0a698f';
                                        dot.style.borderColor = '#0a698f';
                                        dot.style.boxShadow = '0 0 8px #0a698f';
                                    } else {
                                        dot.style.background = 'transparent';
                                        dot.style.borderColor = 'rgba(255,255,255,0.2)';
                                        dot.style.boxShadow = 'none';
                                    }
                                }
                            }
                        }

                        keys.forEach(key => {
                            key.addEventListener('click', async () => {
                                if (enteredPin.length >= 4) return;

                                playKeypadSound();

                                key.style.background = '#0a698f';
                                setTimeout(() => key.style.background = '#16161a', 100);

                                enteredPin += key.getAttribute('data-val');
                                updateDots();

                                if (enteredPin.length === 4) {
                                    Swal.showLoading();
                                    try {
                                        const headers = {
                                            "Content-Type": "application/json"
                                        };
                                        if (activeToken) {
                                            headers["Authorization"] = `Bearer ${activeToken}`;
                                        }

                                        const response = await fetch(backendUrl, {
                                            method: "POST",
                                            headers: headers,
                                            body: JSON.stringify({
                                                action: "verify_pin",
                                                user_id: userId,
                                                pin: enteredPin,
                                                signature: appSignature
                                            })
                                        });

                                        const validationResult = await response.json();

                                        if (!response.ok || !validationResult.success) {
                                            throw new Error(validationResult.error || "PIN verification failed.");
                                        }

                                        Swal.close();
                                        resolve({ success: true, token: validationResult.token, user: validationResult.user });

                                    } catch (error) {
                                        enteredPin = "";
                                        updateDots();
                                        Swal.hideLoading();

                                        if (error.message.includes("restricted") || error.message.includes("locked")) {
                                            Swal.fire({
                                                title: 'Terminal Restrictive Action',
                                                text: 'Security violation metrics triggered. Operation context locked.',
                                                icon: 'error',
                                                background: '#111115',
                                                color: '#fff',
                                                confirmButtonColor: '#e74c3c'
                                            }).then(() => {
                                                resolve({ success: false, lockout: true });
                                            });
                                        } else {
                                            Swal.showValidationMessage(`${error.message}`);
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
                    }
                }).then((result) => {
                    if (result.isDismissed) {
                        resolve({ success: false, dismissed: true });
                    }
                });
            }

            launchModal();
        });
    }
};