/**
 * checker.js - Pure Admin Session Guard
 */
(function () {
    const INACTIVITY_LIMIT = 30 * 60 * 1000;
    const LOGIN_PATH = "../../login/index.html";
    let timeoutId;

    const logoutAdmin = () => {
        localStorage.removeItem('adminSession');
        localStorage.removeItem('adminEmail');
        window.location.href = LOGIN_PATH;
    };

    const resetTimer = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(logoutAdmin, INACTIVITY_LIMIT);
    };

    // Activity listeners
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(name => {
        document.addEventListener(name, resetTimer, true);
    });

    // Auto-check on load
    if (localStorage.getItem('adminSession') !== 'active') {
        if (!window.location.pathname.includes('/login/')) {
            window.location.href = LOGIN_PATH;
        }
    } else {
        resetTimer();
    }

    // Sync across tabs
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && localStorage.getItem('adminSession') !== 'active') {
            logoutAdmin();
        }
    });
})();