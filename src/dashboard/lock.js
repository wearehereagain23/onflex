/**
 * lock.js - Updated Security & State Management
 */

let lockGraceTimer;
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
    // 1. Detect when user leaves the tab
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            lockGraceTimer = setTimeout(() => {
                lockScreen();
            }, GRACE_PERIOD);
        } else {
            // Cancel lock if user returns within 10s
            clearTimeout(lockGraceTimer);
        }
    });

    // 2. Persistent state check on load
    const wasLocked = localStorage.getItem('isLocked') === 'true';
    if (wasLocked) lockScreen();
}

/**
 * 🧹 CLEAN LOGOUT HANDLER
 * Clears security flags and session data before redirecting
 */
const performSecureLogout = async () => {
    // 1. Show Warning Popup
    const result = await Swal.fire({
        title: 'Terminate Session?',
        text: "You will need to log in again to access your dashboard.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444', // Red for "Logout"
        cancelButtonColor: '#1a1a1a',  // Dark for "Stay"
        confirmButtonText: 'Yes, Logout',
        background: '#0C290F',
        color: '#fff',
        backdrop: `rgba(0,0,0,0.8)`
    });

    // 2. Only proceed if user clicked "Yes"
    if (result.isConfirmed) {
        console.log("🧼 Clearing session and logging out...");

        // Clear Security Markers
        localStorage.removeItem('isLocked');
        localStorage.removeItem('user_session');

        // Clear all temporary session data
        sessionStorage.clear();

        // Final Redirect to login
        window.location.href = '../login/index.html';
    } else {
        console.log("❌ Logout cancelled by user.");
    }
};

async function lockScreen() {
    const user = window.dataBase;
    if (!user || document.querySelector('.lock-glass-popup')) return;

    localStorage.setItem('isLocked', 'true');
    document.body.classList.add('privacy-lock-active');

    const isMobile = window.innerWidth <= 768;

    const { value: pin } = await Swal.fire({
        width: isMobile ? '92%' : '420px',
        html: `
            <div class="lock-terminal">
                <div class="shield-icon" style="color:var(--primary); margin-bottom:15px; display:flex; justify-content:center;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
                </div>
                <h2 style="color:white; font-size:1.4rem; font-weight:bold;">Security Verified</h2>
                <p style="opacity:0.6; font-size:0.8rem;">Session locked for ${user.firstname}</p>
            </div>
        `,
        input: 'password',
        inputAttributes: {
            inputmode: 'numeric',
            maxlength: 4,
            autocomplete: 'new-password',
            autocapitalize: 'off',
            autocorrect: 'off',
            spellcheck: 'false',
            // 2. Ensuring the numeric keypad triggers on mobile without saving data
            inputmode: 'numeric'
        },
        background: '#0C290F',
        color: '#fff',
        confirmButtonText: 'Unlock Dashboard',
        confirmButtonColor: '#10b981',
        showDenyButton: true,
        denyButtonText: 'Terminate Session',
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
        preConfirm: (inputPin) => {
            if (inputPin === String(user.pin)) return true;
            Swal.showValidationMessage('Incorrect PIN');
            return false;
        }
    });

    if (pin) {
        localStorage.removeItem('isLocked');
        document.body.classList.remove('privacy-lock-active');
    } else {
        // User clicked "Terminate Session"
        performSecureLogout();
    }
}