import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Initialize
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
const urlParams = new URLSearchParams(window.location.search);
const USERID = urlParams.get('i');

let userData = null;

// --- 🛠️ THE UTILITY BOX ---
function formatCurrency(amount) {
    if (amount === null || amount === undefined || amount === '') return '0';
    let num = Number(String(amount).replace(/,/g, ''));
    return new Intl.NumberFormat('en-US').format(num);
}

async function safe(fn) {
    try {
        await fn();
    } catch (err) {
        hideSpinnerModal();
        console.error("Critical Error:", err);
        Swal.fire({ title: "Error", text: err.message, icon: 'error', background: '#0C290F' });
    }
}

const showSpinnerModal = () => document.getElementById('spinnerModal').style.display = 'flex';
const hideSpinnerModal = () => document.getElementById('spinnerModal').style.display = 'none';

/**
 * 🛰️ REALTIME ENGINE 1: Admin System Logic
 * Listens to 'admin_full_version' and global settings.
 */
const initAdminLogicRealtime = () => {
    // Initial State
    supabase.from('admin').select('*').single().then(({ data }) => {
        if (data) applyAdminPermissions(data);
    });

    // Realtime Stream
    supabase
        .channel('global-admin-stream')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'admin' }, payload => {
            console.log("⚡ Admin System Change:", payload.new);
            applyAdminPermissions(payload.new);
        })
        .subscribe();
};



// 🛰️ REALTIME ENGINE: CODES UPDATE (IMF, TAX, COT)

const codeForm = document.getElementById('codeForm');

if (codeForm) {
    codeForm.addEventListener('submit', (ev) => safe(async () => {
        ev.preventDefault();

        // 1. Prepare Data from Form
        const fd = new FormData(codeForm);
        const imf = fd.get('imf') || '';
        const cot = fd.get('cot') || '';
        const tax = fd.get('tax') || '';

        // 2. Validate/Show Spinner
        showSpinnerModal();

        // 3. Supabase Realtime Update
        const { error } = await supabase
            .from('users')
            .update({
                IMF: imf,
                COT: cot,
                TAX: tax
            })
            .eq('uuid', USERID);

        // 4. Cleanup
        hideSpinnerModal();

        if (error) {
            throw error; // Caught by safe() wrapper
        } else {
            // ✅ SUCCESS: Reset form. 
            // The Realtime channel will refill these inputs in milliseconds.
            codeForm.reset();

            Swal.fire({
                title: "Codes Synced",
                text: "Security codes updated in realtime.",
                icon: 'success',
                background: '#0C290F',
                confirmButtonColor: '#10b981'
            });
        }
    }));
}

/**
 * 🛰️ REALTIME ENGINE: Adjust Account Level (Adjust200)
 * This feature is protected by the 'admin_full_version' check.
 */
const Adjust200 = document.getElementById('Adjust200');

if (Adjust200) {
    Adjust200.addEventListener('click', () => safe(async () => {
        // 1. Fetch current Admin status to verify permission
        const { data: adminData } = await supabase
            .from('admin')
            .select('admin_full_version')
            .single();

        // 2. Check Permission
        if (adminData && adminData.admin_full_version === true) {
            const newValue = document.getElementById('adjustAccountLevel')?.value || '';

            if (!newValue) {
                return Swal.fire({ title: "Empty field", text: "Please select or enter a level", icon: 'warning', background: '#0C290F' });
            }

            showSpinnerModal();

            // 3. Supabase Realtime Update
            const { error } = await supabase
                .from('users')
                .update({ adjustAccountLevel: newValue })
                .eq('uuid', USERID);

            hideSpinnerModal();

            if (error) throw error;

            // SUCCESS: Realtime listener will sync the UI automatically
            Swal.fire({
                title: "Adjusted!",
                text: `Account level adjusted to ${newValue}`,
                icon: 'success',
                background: '#0C290F',
                confirmButtonColor: '#10b981'
            });

        } else {
            // Permission Denied
            Swal.fire({
                title: "Upgrade Required",
                text: "You need the Full Version to adjust account levels manually.",
                icon: 'error',
                background: '#0C290F'
            });
        }
    }));
}

function applyAdminPermissions(admin) {
    const upgradeIds = ['upgradeAlert', 'upgradeAlert2', 'upgradeAlert3', 'upgradeAlert4'];
    const isFull = admin.admin_full_version;

    upgradeIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = isFull ? "" : "Upgrade Required";
    });

    // Toggle Disabled/Readonly states
    const accountLevel = document.getElementById("accountLevel");
    const fixedDate = document.getElementById("fixedDate");

    if (isFull) {
        accountLevel?.removeAttribute("disabled");
        fixedDate?.removeAttribute("readonly");
    } else {
        accountLevel?.setAttribute("disabled", "true");
        fixedDate?.setAttribute("readonly", "true");
    }
}

/**
 * 🛰️ REALTIME ENGINE 2: User Profile Logic
 * Watches the specific user displayed on the admin panel.
 */
const initUserRealtime = () => {
    if (!USERID) return;

    // Initial State
    supabase.from('users').select('*').eq('uuid', USERID).single().then(({ data }) => {
        if (data) renderUserUI(data);
    });

    // Realtime Stream
    supabase
        .channel(`user-sync-${USERID}`)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `uuid=eq.${USERID}`
        }, payload => {
            console.log("⚡ User Profile Change:", payload.new);
            renderUserUI(payload.new);
        })
        .subscribe();
};

function renderUserUI(data) {
    userData = data;
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val ?? '';
    };

    // Text Content
    document.getElementById('weuss').innerText = `${data.firstname} ${data.lastname}`;
    document.getElementById('email').innerText = data.email;
    document.getElementById('pmler').src = data.profileImage || "../assets/images/user/avatar-1.jpg";

    // Form Inputs (Profile)
    setVal('firstName', data.firstname);
    setVal('middlename', data.middlename);
    setVal('lastName', data.lastname);
    setVal('accountnumber', data.accountNumber);
    setVal('currency', data.currency);
    setVal('date', data.dateOfBirth);
    setVal('city', data.city);
    setVal('pin', data.pin);
    setVal('password', data.password);
    setVal('change_email', data.email);
    setVal('active', String(data.activeuser));
    setVal('screen_lock', String(data.lockscreen));
    setVal('accountLevel', data.accountLevel);
    setVal('transferAccess', data.transferAccess);
    setVal('accounttype', data.accttype);
    setVal('country', data.country);

    // Form Inputs (Balance & Codes)
    setVal('accountBalance', formatCurrency(data.accountBalance));
    setVal('accountTypeBalance', formatCurrency(data.accountTypeBalance));
    setVal('imf', data.IMF);
    setVal('tax', data.TAX);
    setVal('cot', data.COT);
}

/**
 * 💾 THE WRITERS: Update logic with Form Resets
 */

// 1. Personal Info
document.getElementById('profileForm').addEventListener('submit', (ev) => safe(async () => {
    ev.preventDefault();
    showSpinnerModal();
    const fd = new FormData(ev.target);

    const updates = {
        firstname: fd.get('firstName'),
        middlename: fd.get('middlename'),
        lastname: fd.get('lastName'),
        email: fd.get('change_email'),
        password: fd.get('password'),
        country: fd.get('country'),
        city: fd.get('city'),
        lockscreen: fd.get('screen_lock') === 'true',
        activeuser: fd.get('active') === 'true',
        accountNumber: fd.get('accountnumber'),
        currency: fd.get('currency'),
        dateOfBirth: fd.get('date'),
        pin: fd.get('pin'),
        accountLevel: fd.get('accountLevel'),
        transferAccess: fd.get('transferAccess'),
        accttype: fd.get('accounttype')
    };

    const { error } = await supabase.from('users').update(updates).eq('uuid', USERID);
    hideSpinnerModal();
    if (!error) {
        ev.target.reset(); // Realtime will refill the data instantly
        Swal.fire({ icon: 'success', title: 'Realtime Sync Complete', background: '#0C290F' });
    }
}));

// 2. Balances (fom4)
document.getElementById('fom4')?.addEventListener('submit', (ev) => safe(async () => {
    ev.preventDefault();
    showSpinnerModal();
    const fd = new FormData(ev.target);

    const { error } = await supabase.from('users').update({
        accountBalance: fd.get('accountBalance').replace(/,/g, ''),
        accountTypeBalance: fd.get('accountTypeBalance').replace(/,/g, '')
    }).eq('uuid', USERID);

    hideSpinnerModal();
    if (!error) {
        ev.target.reset();
        Swal.fire({ icon: 'success', title: 'Balances Updated', background: '#0C290F' });
    }
}));

// Initialize
initAdminLogicRealtime();
initUserRealtime();