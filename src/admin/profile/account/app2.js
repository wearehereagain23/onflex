alert('rhyhryh');

// We initialize inside the export to ensure CONFIG is ready when called

export async function initAdminSettingsPage() {
    const config = window.CONFIG || (typeof CONFIG !== 'undefined' ? CONFIG : null);
    if (!config) return console.error("CONFIG missing");

    const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_KEY);

    // DOM Elements
    const settingsForm = document.getElementById('setStatus');
    const emailInput = document.getElementById('newEmail');
    const passwordInput = document.getElementById('adminPassword');
    const addressInput = document.getElementById('webAddress');
    const agree = document.getElementById('agree');

    const showSpinner = () => document.getElementById('spinnerModal')?.style.setProperty('display', 'flex');
    const hideSpinner = () => document.getElementById('spinnerModal')?.style.setProperty('display', 'none');

    /* ===== 1. Auth Guard ===== */
    const adminSession = localStorage.getItem('adminSession');
    const adminEmail = localStorage.getItem('adminEmail');

    if (adminSession !== 'active' || !adminEmail) {
        window.location.href = "../../login/index.html";
        return;
    }

}