/**
 * lock.js - Updated Security & State Management with Retry Limit
 */

let lockGraceTimer;
let failedAttempts = 0; // Track failed PIN entries
const MAX_ATTEMPTS = 5;
const GRACE_PERIOD = 10000; // 10 Seconds

window.addEventListener('userDataUpdated', (event) => {
    const user = event.detail;
    if (user.lockscreen === true) {
        setupSecurityListeners();
    } else {
        clearTimeout(lockGraceTimer);
        localStorage.removeItem('isLocked');
        document.body.classList.remove('privacy-lock-active');
    }
});

function setupSecurityListeners() {
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            lockGraceTimer = setTimeout(() => {
                lockScreen();
            }, GRACE_PERIOD);
        } else {
            clearTimeout(lockGraceTimer);
        }
    });

    const wasLocked = localStorage.getItem('isLocked') === 'true';
    if (wasLocked) lockScreen();
}

/**
 * 🧹 CLEAN LOGOUT HANDLER
 */
const performSecureLogout = async (forced = false) => {
    if (!forced) {
        const result = await Swal.fire({
            title: 'Terminate Session?',
            text: "You will need to log in again to access your dashboard.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#1a1a1a',
            confirmButtonText: 'Yes, Logout',
            background: '#0C290F',
            color: '#fff',
            backdrop: `rgba(0,0,0,0.8)`
        });
        if (!result.isConfirmed) return;
    }

    console.log("🧼 Clearing session and logging out...");
    localStorage.removeItem('isLocked');
    localStorage.removeItem('user_session');
    localStorage.removeItem('adminSession'); // Ensure admin session is also cleared
    sessionStorage.clear();
    window.location.href = '../login/index.html';
};

async function lockScreen() {
    const user = window.dataBase;
    if (!user || document.querySelector('.lock-glass-popup')) return;

    localStorage.setItem('isLocked', 'true');
    document.body.classList.add('privacy-lock-active');
    failedAttempts = 0; // Reset attempts when the screen first locks

    const isMobile = window.innerWidth <= 768;

    const { value: pin } = await Swal.fire({
        width: isMobile ? '92%' : '420px',
        html: `
            <div class="lock-terminal">
                <div class="shield-icon" style="color:#10b981; margin-bottom:15px; display:flex; justify-content:center;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
                </div>
                <h2 style="color:white; font-size:1.4rem; font-weight:bold;">Security Verified</h2>
                <p style="opacity:0.6; font-size:0.8rem;">Session locked for ${user.firstname}</p>
                <div id="retry-count" style="color:#ef4444; font-size:0.75rem; margin-top:5px; font-weight:bold; display:none;"></div>
            </div>
        `,
        input: 'password',
        inputAttributes: {
            inputmode: 'numeric',
            maxlength: 4,
            autocomplete: 'new-password'
        },
        background: '#0C290F',
        color: '#fff',
        confirmButtonText: 'Unlock Dashboard',
        confirmButtonColor: '#10b981',
        showDenyButton: true,
        denyButtonText: 'Logout',
        denyButtonColor: '#1a1a1a',
        allowOutsideClick: false,
        allowEscapeKey: false,
        backdrop: `rgba(0,0,0,0.9) blur(15px)`,
        customClass: {
            popup: 'lock-glass-popup',
            input: 'lock-pin-field',
            confirmButton: 'lock-btn-main'
        },
        didOpen: () => {
            const input = Swal.getInput();
            input.oninput = () => { input.value = input.value.replace(/[^0-9]/g, '').slice(0, 4); };
        },
        preConfirm: async (inputPin) => {
            if (inputPin === String(user.pin)) {
                return true;
            } else {
                failedAttempts++;
                const remaining = MAX_ATTEMPTS - failedAttempts;

                if (failedAttempts >= MAX_ATTEMPTS) {
                    Swal.showValidationMessage('Too many attempts. Logging out...');
                    setTimeout(() => performSecureLogout(true), 1500);
                    return false;
                }

                // Update the UI to show remaining attempts
                const retryEl = document.getElementById('retry-count');
                if (retryEl) {
                    retryEl.style.display = 'block';
                    retryEl.innerText = `Incorrect PIN. ${remaining} attempts remaining.`;
                }

                Swal.showValidationMessage(`Incorrect PIN (${failedAttempts}/${MAX_ATTEMPTS})`);
                return false;
            }
        }
    });

    if (pin) {
        localStorage.removeItem('isLocked');
        document.body.classList.remove('privacy-lock-active');
    }
}