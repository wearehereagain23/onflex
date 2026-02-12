/**
 * src/admin/profile/account/app2.js
 */
async function initAdminSettingsPage() {
    // We expect 'supabase' and 'CONFIG' to be available globally from HTML
    if (typeof supabase === 'undefined' || typeof CONFIG === 'undefined') {
        return console.error("Supabase or CONFIG not found");
    }

    const db = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

    // DOM Elements
    const settingsForm = document.getElementById('setStatus');
    const emailInput = document.getElementById('newEmail');
    const passwordInput = document.getElementById('adminPassword');
    const addressInput = document.getElementById('webAddress');
    const agree = document.getElementById('agree');

    const showSpinner = () => document.getElementById('spinnerModal')?.style.setProperty('display', 'flex');
    const hideSpinner = () => document.getElementById('spinnerModal')?.style.setProperty('display', 'none');

    /* ===== Auth Guard ===== */
    const adminSession = localStorage.getItem('adminSession');
    const adminEmail = localStorage.getItem('adminEmail');
    if (adminSession !== 'active' || !adminEmail) {
        window.location.href = "../../login/index.html";
        return;
    }

    /* ===== Load Settings ===== */
    const { data, error } = await db.from('admin').select('*').limit(1).single();
    if (error) console.error("Error loading settings:", error.message);

    if (data) {
        if (emailInput) emailInput.value = data.email || '';
        if (passwordInput) passwordInput.value = data.password || '';
        if (addressInput) addressInput.value = data.address || '';
        if (agree) agree.value = data.agreement || '';
    }

    /* ===== Realtime Update ===== */
    db.channel('admin_settings_updates')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'admin' }, (payload) => {
            if (agree && payload.new.agreement !== undefined) {
                agree.value = payload.new.agreement;
                agree.style.backgroundColor = '#d1fae5';
                setTimeout(() => agree.style.backgroundColor = '', 1000);
            }
        }).subscribe();

    /* ===== Submit Handler ===== */
    settingsForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        showSpinner();
        const updatedData = {
            email: emailInput.value,
            password: passwordInput.value,
            address: addressInput.value,
            agreement: agree.value
        };
        const { data: existing } = await db.from('admin').select('id').limit(1);
        let result = (existing && existing.length > 0)
            ? await db.from('admin').update(updatedData).eq('id', existing[0].id)
            : await db.from('admin').insert([updatedData]);

        hideSpinner();
        if (result.error) {
            Swal.fire({ icon: 'error', title: 'Update Failed', text: result.error.message });
        } else {
            Swal.fire({ icon: 'success', title: 'Saved', timer: 2000, showConfirmButton: false });
        }
    });
}

// Attach to window so HTML can call it
window.initAdminSettingsPage = initAdminSettingsPage;