
async function initAdminSettingsPage() {
    // 🔥 FIX: Use the global window.supabase directly. 
    // It is already a "Client", so we don't call createClient again.
    const db = window.supabase;

    if (!db) {
        return console.error("Global Supabase instance not found");
    }

    // DOM Elements
    const settingsForm = document.getElementById('setStatus');
    const emailInput = document.getElementById('newEmail');
    const passwordInput = document.getElementById('adminPassword');
    const addressInput = document.getElementById('webAddress');
    const agree = document.getElementById('agree');

    // Use the global helpers defined in your HTML
    const showSpinner = window.showSpinnerModal;
    const hideSpinner = window.hideSpinnerModal;

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
        if (showSpinner) showSpinner();

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

        if (hideSpinner) hideSpinner();

        if (result.error) {
            Swal.fire({ icon: 'error', title: 'Update Failed', text: result.error.message });
        } else {
            Swal.fire({ icon: 'success', title: 'Saved', timer: 2000, showConfirmButton: false });
        }
    });
}

window.initAdminSettingsPage = initAdminSettingsPage;

// Attach to window so HTML can call it
window.initAdminSettingsPage = initAdminSettingsPage;