import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// 1. Initialize Supabase
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// 2. DOM Refs
const form = document.getElementById('signupForm');
const spinner = document.getElementById('spinnerModal');
const passwordInput = document.getElementById('password');
const strengthFill = document.getElementById('strengthFill');
const strengthLabel = document.getElementById('strengthLabel');

// 3. Helper Functions
const showSpinner = () => spinner.style.display = 'flex';
const hideSpinner = () => spinner.style.display = 'none';

function validateForm(payload) {
    let isValid = true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

    const setError = (fieldId, message) => {
        const errorEl = document.getElementById(fieldId + 'Err');
        if (errorEl) {
            errorEl.textContent = message;
            isValid = false;
        }
    };

    // Clear previous errors
    document.querySelectorAll('.error').forEach(el => el.textContent = '');

    if (!payload.firstname?.trim()) setError('firstname', 'First name is required');
    if (!payload.lastname?.trim()) setError('lastname', 'Last name is required');
    if (!payload.city?.trim()) setError('city', 'City is required');
    if (!payload.country) setError('country', 'Country is required');
    if (!payload.birth) setError('birth', 'Date of birth is required');
    if (!payload.gender) setError('gender', 'Gender is required');
    if (!payload.accounttype) setError('accounttype', 'Select account type');
    if (!payload.currency) setError('currency', 'Select currency');

    if (!payload.email?.trim()) {
        setError('email', 'Email is required');
    } else if (!emailRegex.test(payload.email)) {
        setError('email', 'Invalid email format');
    }

    if (!payload.password || payload.password.length < 8) {
        setError('password', 'Password must be at least 8 chars');
    }
    if (payload.password !== payload.password2) {
        setError('password2', 'Passwords do not match');
    }
    if (!/^\d{4}$/.test(payload.pin)) {
        setError('pin', 'PIN must be 4 digits');
    }

    return isValid;
}

// Password Strength
passwordInput.addEventListener('input', () => {
    const pw = passwordInput.value;
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    const pct = (s / 4) * 100;
    strengthFill.style.width = pct + "%";
    strengthFill.style.background = pct < 50 ? "#ef4444" : pct < 100 ? "#f59e0b" : "#22c55e";
    strengthLabel.textContent = pct < 50 ? "Weak" : pct < 100 ? "Medium" : "Strong";
});

// Metadata Generator
function genCodes() {
    const r = (n) => Math.floor(Math.random() * n);
    return {
        accountNumber: '937' + Math.floor(1000000 + Math.random() * 9000000),
        IMF: `IMF${r(1795)}wOd${r(105)}HS/A${r(3725)}`,
        TAX: `TAX${r(170395)}-GNC${r(1905)}XW${r(378825)}`,
        COT: `OPL${r(1795)}/COT${r(1905)}FVM/${r(3725)}`
    };
}

// 4. Submit Logic
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    if (!validateForm(payload)) {
        Swal.fire('Warning', 'Please fix the errors', 'warning');
        return;
    }

    showSpinner();

    try {
        // ✅ OBSERVER: Check if Email already exists to avoid duplicates
        const { data: checkEmail, error: checkErr } = await supabase
            .from('users')
            .select('email')
            .eq('email', payload.email.trim())
            .maybeSingle();

        if (checkEmail) {
            hideSpinner();
            document.getElementById('emailErr').textContent = "This email is already in use";
            throw new Error('Account already exists with this email');
        }

        const userUUID = crypto.randomUUID();
        const codes = genCodes();

        // ✅ DATA INSERT: Matching your SQL Schema exactly
        const { error: insertErr } = await supabase
            .from('users')
            .insert([{
                uuid: userUUID,
                firstname: payload.firstname,
                middlename: payload.middlename || '',
                lastname: payload.lastname,
                email: payload.email.trim(),
                password: payload.password,
                dateOfBirth: payload.birth, // Schema uses text for this
                gender: payload.gender,
                city: payload.city,
                country: payload.country,
                accttype: payload.accounttype,
                currency: payload.currency,
                pin: payload.pin,
                accountNumber: codes.accountNumber,
                IMF: codes.IMF,
                TAX: codes.TAX,
                COT: codes.COT,
                accountBalance: '0', // Schema default is '0'::text
                accountLevel: 'Starter',
                activeuser: true,
                transferAccess: true,
                date: new Date().toLocaleDateString()
            }]);

        if (insertErr) throw insertErr;

        // Create Local Session
        localStorage.setItem('user_session', JSON.stringify({
            uuid: userUUID,
            email: payload.email
        }));

        Swal.fire({
            title: 'Welcome!',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        }).then(() => {
            window.location.href = "../dashboard/index.html";
        });

    } catch (err) {
        hideSpinner();
        Swal.fire('Error', err.message, 'error');
    }
});