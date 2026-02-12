import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

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

/**
 * 1. Fetch Current Admin Settings
 * Reads the first row from the 'admin' table
 */
async function loadAdminSettings() {

    if (adminSession !== 'active' || !adminEmail) {
        window.location.href = "../../login/index.html";
        return;
    }

    const { data, error } = await supabase.from('admin').select('*').limit(1).single();
    if (error) return console.error("Error loading settings:", error.message);

    if (data) {

        document.getElementById('newEmail').value = data.email;
        document.getElementById('adminPassword').value = data.password || '';
        document.getElementById('webAddress').value = data.address || '';
        document.getElementById('agree').value = data.agreement || '';

    }
}

/**
 * 3. REALTIME LISTENER
 * Updates the 'Agree Terms' select option automatically 
 * when the database changes.
 */
supabase.channel('admin_settings_updates')
    .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'admin'
    }, (payload) => {
        const newData = payload.new;
        const agreementSelect = document.getElementById('agree');

        if (agreementSelect && newData.agreement !== undefined) {
            agreementSelect.value = newData.agreement;

            // Optional: Visual feedback that the field updated in realtime
            agreementSelect.style.transition = 'background-color 0.5s';
            agreementSelect.style.backgroundColor = '#d1fae5'; // Light green flash
            setTimeout(() => {
                agreementSelect.style.backgroundColor = '';
            }, 1000);

            console.log("Realtime Update: Terms Agreement set to", newData.agreement);
        }
    })
    .subscribe();

/**
 * 2. Update Admin Settings
 * Updates the existing record or inserts if empty
 */
settingsForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const updatedData = {
        email: emailInput.value,
        password: passwordInput.value,
        address: addressInput.value,
        agreement: agree.value
    };

    showSpinner();

    // First, check if a row exists to decide between update or insert
    const { data: existing } = await supabase.from('admin').select('id').limit(1);

    let result;
    if (existing && existing.length > 0) {
        // Update the existing row
        result = await supabase
            .from('admin')
            .update(updatedData)
            .eq('id', existing[0].id);
    } else {
        // Insert new row if table is empty
        result = await supabase
            .from('admin')
            .insert([updatedData]);
    }

    hideSpinner();

    if (result.error) {
        Swal.fire({
            icon: 'error',
            title: 'Update Failed',
            text: result.error.message
        });
    } else {
        Swal.fire({
            icon: 'success',
            title: 'Settings Saved',
            text: 'Admin credentials and address updated successfully.',
            timer: 2000,
            showConfirmButton: false
        });
    }
});

// Logout Logic for Sub-pages
document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();

    Swal.fire({
        title: 'Are you sure?',
        text: "You will be logged out of the admin session!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, logout!',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#ffffff'
    }).then((result) => {
        if (result.isConfirmed) {
            // 1. Clear session
            localStorage.clear();
            sessionStorage.clear();

            // 2. Redirect - Note the "../../../" to go back 3 folders 
            // from /admin/profile/account/ to the root login
            window.location.href = "../../login/index.html";
        }
    });
});

// Initialize on page load
loadAdminSettings();