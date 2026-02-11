import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';



if (typeof CONFIG === 'undefined') {
    console.error("Configuration missing!");
}


// --- Configuration ---
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

const loginForm = document.getElementById("signupForm");

/**
 * Helper to show/hide the global spinner
 */
function toggleLoader(show) {
    document.getElementById('spinnerModal').style.display = show ? 'flex' : 'none';
}

/**
 * Handle Login Submission
 */

if (!loginForm) {
    console.error("Form #signupForm not found in DOM!");
} else {
    console.log("Login Engine Loaded Successfully.");

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        console.log("Submit button clicked!");
        const email = document.getElementById("email").value.trim().toLowerCase();
        const password = document.getElementById("password").value.trim();

        if (!email || !password) {
            return Swal.fire({
                icon: "warning",
                title: "Required",
                text: "Please enter email and password.",
                background: '#0c2129ff',
                customClass: { popup: 'swal2Style' }
            });
        }

        // 1. Check Password Lockout
        if (isLockedOut(email, 'pass')) return;

        toggleLoader(true);

        try {
            // Fetch user from DB
            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();

            if (error || !user) {
                toggleLoader(false);
                return Swal.fire({
                    icon: "error",
                    title: "Access Denied",
                    text: "Invalid email address.",
                    background: '#0c2729ff',
                    customClass: { popup: 'swal2Style' }
                });
            }

            // 2. Verify Password
            if (user.password !== password) {
                toggleLoader(false);
                handleFailure(email, 'pass');
                return;
            }

            // 3. CHECK IF ACCOUNT IS BLOCKED
            if (user.activeuser === false || user.activeuser === "false") {
                toggleLoader(false);
                return Swal.fire({
                    icon: 'error',
                    title: 'Account Blocked',
                    text: 'Your account has been suspended. Please contact admin for more information.',
                    background: '#0c2229ff',
                    color: '#fff',
                    confirmButtonColor: '#1086b9ff',
                    customClass: {
                        popup: 'swal2Style'
                    }
                });
            }


            // Success: Reset password attempts and move to Device Check
            resetAttempts(email, 'pass');
            await handleDeviceAndPin(user);

        } catch (err) {
            console.error(err);
            toggleLoader(false);
            Swal.fire({ icon: "error", title: "System Error", text: "Connection failed." });
        }
    });
}



/**
 * Handles Device Verification and PIN Modal
 */
// Add these constants at the top of your login.js if not already present
const MAX_PIN_RETRIES = 5;
let pinRetryCount = 0;

async function handleDeviceAndPin(userData) {
    const email = userData.email;
    const userUuid = userData.uuid;

    const localDeviceId = localStorage.getItem('device_id');
    const { data: deviceRecord } = await supabase
        .from('devices')
        .select('*')
        .eq('uuid', userUuid)
        .eq('device_id', localDeviceId)
        .maybeSingle();

    if (!localDeviceId || !deviceRecord) {
        const newDeviceId = localDeviceId || 'dev_' + Math.random().toString(36).substr(2, 9);
        const subData = localStorage.getItem('serviceObject') ? JSON.parse(localStorage.getItem('serviceObject')) : null;
        await supabase.from('devices').insert([{
            uuid: userUuid,
            device_id: newDeviceId,
            subscribers: subData
        }]);
        localStorage.setItem('device_id', newDeviceId);
    }

    toggleLoader(false);

    // 2. PIN Lockout Check (Previous local lockout logic)
    if (isLockedOut(email, 'pin')) return;

    // 3. Show PIN Modal
    const { value: enteredPin } = await Swal.fire({
        title: 'SECURITY VERIFICATION',
        html: `
            <div style="font-size: 3rem; margin-bottom: 15px;">🔐</div>
            <p style="font-weight: 600;">Identity Confirmed: ${userData.firstname}</p>
            <p style="font-size: 0.85rem; color: #ccc; margin-bottom: 10px;">Enter your 4-digit Transaction PIN to unlock access.</p>
            
            <div id="pin-retry-warning" style="min-height: 25px; margin-bottom: 10px;"></div>

            <input type="password" id="swal-input-pin" class="swal2-input lock-pin-field" 
                   placeholder="****" maxlength="4" autofocus
                   style="text-align: center; letter-spacing: 15px; font-size: 2rem; width: 80%; margin: 0 auto; color: #fff; background: #08161aff; border: 1px solid #1a384dff;">
        `,
        background: '#0c2429ff',
        confirmButtonText: 'UNLOCK ACCESS',
        confirmButtonColor: '#1a384dff',
        customClass: { popup: 'swal2Style' },
        focusConfirm: false,
        allowOutsideClick: false,
        preConfirm: async () => {
            const pin = document.getElementById('swal-input-pin').value;

            if (!/^\d{4}$/.test(pin)) {
                Swal.showValidationMessage('Please enter a valid 4-digit PIN');
                return false;
            }

            // --- PIN MATCH CHECK ---
            if (pin === String(userData.pin)) {
                return pin;
            } else {
                // Increment retries on failure
                pinRetryCount++;
                const attemptsLeft = MAX_PIN_RETRIES - pinRetryCount;

                if (pinRetryCount >= MAX_PIN_RETRIES) {
                    // 1. Permanently block user in Supabase
                    await supabase.from('users').update({ activeuser: false }).eq('uuid', userUuid);

                    // 2. Clear Session and Local Storage
                    localStorage.clear();
                    sessionStorage.clear();

                    Swal.showValidationMessage('CRITICAL: Account locked due to security violations.');

                    // 3. Force exit
                    setTimeout(() => {
                        window.location.replace("../login/index.html");
                    }, 2500);
                } else {
                    // Show dynamic warning after first wrong attempt
                    const warningDiv = document.getElementById('pin-retry-warning');
                    if (warningDiv) {
                        warningDiv.innerHTML = `<p style="color: #ef4444; font-size: 0.85rem; font-weight: bold; margin:0;">
                            Incorrect PIN. Attempts left: ${attemptsLeft}
                        </p>`;
                    }
                    Swal.showValidationMessage('Invalid Security PIN');
                    document.getElementById('swal-input-pin').value = ''; // Clear input for next try
                }
                return false;
            }
        }
    });

    if (enteredPin) {
        pinRetryCount = 0; // Reset global count
        resetAttempts(email, 'pin');

        Swal.fire({
            icon: 'success',
            title: 'ACCESS GRANTED',
            text: 'Synchronizing secure session...',
            timer: 1500,
            showConfirmButton: false,
            background: '#0c2029ff',
            customClass: { popup: 'swal2Style' },
            didOpen: () => Swal.showLoading()
        });

        const sessionData = {
            uuid: userData.uuid,
            email: userData.email,
            fullName: `${userData.firstname} ${userData.lastname}`
        };
        localStorage.setItem('user_session', JSON.stringify(sessionData));

        setTimeout(() => {
            window.location.replace("../dashboard/index.html");
        }, 1600);
    }
}

/** * SECURITY UTILITY FUNCTIONS 
 */

function handleFailure(email, type, userData = null) {
    const attemptKey = `attempts_${type}_${email}`;
    const lockoutKey = `lockout_${type}_${email}`;

    let attempts = parseInt(localStorage.getItem(attemptKey) || 0) + 1;
    localStorage.setItem(attemptKey, attempts);

    if (attempts >= MAX_ATTEMPTS) {
        const expiry = Date.now() + LOCKOUT_DURATION;
        localStorage.setItem(lockoutKey, expiry);
        localStorage.removeItem(attemptKey);
        Swal.fire({
            icon: 'error',
            title: 'Security Lockout',
            text: `Too many failed ${type === 'pin' ? 'PIN' : 'password'} attempts. Access suspended for 30 minutes.`,
            background: '#0c1e29ff',
            customClass: { popup: 'swal2Style' }
        });
    } else {
        const remaining = MAX_ATTEMPTS - attempts;
        Swal.fire({
            icon: 'warning',
            title: 'Access Denied',
            text: `Invalid ${type === 'pin' ? 'PIN' : 'password'}. ${remaining} attempts remaining.`,
            background: '#0c2729ff',
            customClass: { popup: 'swal2Style' }
        }).then(() => {
            if (type === 'pin' && userData) handleDeviceAndPin(userData);
        });
    }
}

function isLockedOut(email, type) {
    const lockoutKey = `lockout_${type}_${email}`;
    const lockoutTime = localStorage.getItem(lockoutKey);

    if (lockoutTime && Date.now() < lockoutTime) {
        const remainingMs = lockoutTime - Date.now();
        const minutes = Math.ceil(remainingMs / 1000 / 60);
        Swal.fire({
            icon: 'error',
            title: 'Locked',
            text: `Account suspended. Try again in ${minutes} minutes.`,
            background: '#0c1f29ff',
            customClass: { popup: 'swal2Style' }
        });
        return true;
    }
    return false;
}

function resetAttempts(email, type) {
    localStorage.removeItem(`attempts_${type}_${email}`);
    localStorage.removeItem(`lockout_${type}_${email}`);
}

