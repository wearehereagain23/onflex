// register.js

// Initialize Supabase using the global window object
const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// Wait for DOM to load to find elements
document.addEventListener('DOMContentLoaded', () => {
    // ===== UI refs =====
    const form = document.getElementById('signupForm');
    const spinner = document.getElementById('spinnerModal');

    const els = {
        firstname: document.getElementById('firstname'),
        middlename: document.getElementById('middlename'),
        lastname: document.getElementById('lastname'),
        email: document.getElementById('email'),
        birth: document.getElementById('birth'),
        gender: document.getElementById('gender'),
        city: document.getElementById('city'),
        country: document.getElementById('country'),
        accounttype: document.getElementById('accounttype'),
        currency: document.getElementById('currency'),
        password: document.getElementById('password'),
        password2: document.getElementById('password2'),
        pin: document.getElementById('pin'),
    };

    const errs = {
        firstname: document.getElementById('firstnameErr'),
        middlename: document.getElementById('middlenameErr'),
        lastname: document.getElementById('lastnameErr'),
        email: document.getElementById('emailErr'),
        birth: document.getElementById('birthErr'),
        gender: document.getElementById('genderErr'),
        city: document.getElementById('cityErr'),
        country: document.getElementById('countryErr'),
        accounttype: document.getElementById('accounttypeErr'),
        currency: document.getElementById('currencyErr'),
        password: document.getElementById('passwordErr'),
        password2: document.getElementById('password2Err'),
        pin: document.getElementById('pinErr'),
    };

    const strengthFill = document.getElementById('strengthFill');
    const strengthLabel = document.getElementById('strengthLabel');

    // ===== Helpers =====
    const showSpinner = () => { if (spinner) spinner.style.display = 'flex'; };
    const hideSpinner = () => { if (spinner) spinner.style.display = 'none'; };

    // ===== Password strength =====
    function passwordScore(pw) {
        let s = 0;
        if (!pw) return 0;
        if (pw.length >= 8) s++;
        if (/[A-Z]/.test(pw)) s++;
        if (/[a-z]/.test(pw)) s++;
        if (/[0-9]/.test(pw)) s++;
        if (/[^A-Za-z0-9]/.test(pw)) s++;
        return s; // 0–5
    }

    function updateStrengthMeter(pw) {
        const score = passwordScore(pw);
        const pct = (score / 5) * 100;
        if (strengthFill) {
            strengthFill.style.width = pct + "%";
            strengthFill.style.background = pct < 40 ? "#ef4444" : pct < 80 ? "#f59e0b" : "#22c55e";
        }
        if (strengthLabel) {
            strengthLabel.textContent = pct < 40 ? "Weak" : pct < 80 ? "Medium" : "Strong";
        }
        return score;
    }

    // ===== Validation Logic =====
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    const required = v => String(v || '').trim().length > 0;
    const pinOk = v => /^[0-9]{4}$/.test(String(v || '').trim());
    const setErr = (key, msg = '') => { if (errs[key]) errs[key].textContent = msg; };

    function validateAll() {
        // Reset all errors
        Object.keys(errs).forEach(k => setErr(k, ''));

        let ok = true;
        if (!required(els.firstname.value)) { setErr('firstname', 'First name required'); ok = false; }
        if (!required(els.lastname.value)) { setErr('lastname', 'Last name required'); ok = false; }
        if (!emailRegex.test(els.email.value)) { setErr('email', 'Enter valid email'); ok = false; }
        if (!required(els.birth.value)) { setErr('birth', 'Date of birth required'); ok = false; }
        if (!required(els.gender.value)) { setErr('gender', 'Select gender'); ok = false; }
        if (!required(els.city.value)) { setErr('city', 'City required'); ok = false; }
        if (!required(els.country.value)) { setErr('country', 'Country required'); ok = false; }
        if (!required(els.accounttype.value)) { setErr('accounttype', 'Select account type'); ok = false; }
        if (!required(els.currency.value)) { setErr('currency', 'Select currency'); ok = false; }

        const score = updateStrengthMeter(els.password.value);
        if (score < 3) { setErr('password', 'Password too weak'); ok = false; }
        if (els.password2.value !== els.password.value) { setErr('password2', 'Passwords do not match'); ok = false; }
        if (!pinOk(els.pin.value)) { setErr('pin', 'PIN must be 4 digits'); ok = false; }

        return ok;
    }

    // Live validation & listeners
    if (els.password) {
        els.password.addEventListener('input', e => updateStrengthMeter(e.target.value));
    }

    Object.keys(els).forEach(key => {
        if (els[key]) els[key].addEventListener('input', validateAll);
    });

    // ===== Metadata Generator =====
    function genCodes() {
        const r = (n) => Math.floor(Math.random() * n);
        return {
            accountNumber: '937' + Math.floor(1000000 + r(9000000)),
            IMF: `IMF${r(1795)}wOd${r(105)}HS/A${r(3725)}`,
            TAX: `TAX${r(170395)}-GNC${r(1905)}XW${r(378825)}`,
            COT: `OPL${r(1795)}/COT${r(1905)}FVM/${r(3725)}`
        };
    }

    // ===== Submit Handler =====
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!validateAll()) {
                Swal.fire('Fix errors', 'Please correct the highlighted fields.', 'warning');
                return;
            }

            showSpinner();

            const payload = {
                firstname: els.firstname.value.trim(),
                middlename: els.middlename.value.trim(),
                lastname: els.lastname.value.trim(),
                city: els.city.value.trim(),
                country: els.country.value.trim(),
                email: els.email.value.trim(),
                dateOfBirth: els.birth.value,
                gender: els.gender.value,
                accttype: els.accounttype.value,
                currency: els.currency.value,
                pin: String(els.pin.value).trim(),
                password: els.password.value
            };

            try {
                // 1) Register with Supabase Auth
                const { data: authData, error: authErr } = await supabase.auth.signUp({
                    email: payload.email,
                    password: payload.password
                });

                if (authErr) throw authErr;

                // 2) Use the ID from auth registration
                const authId = authData.user.id;
                const { accountNumber, IMF, TAX, COT } = genCodes();

                // 3) Insert profile row into 'users' table
                const { error: insertErr } = await supabase
                    .from('users')
                    .insert([{
                        uuid: authId,
                        firstname: payload.firstname,
                        middlename: payload.middlename,
                        lastname: payload.lastname,
                        city: payload.city,
                        country: payload.country,
                        email: payload.email,
                        dateOfBirth: payload.dateOfBirth,
                        gender: payload.gender,
                        accttype: payload.accttype,
                        currency: payload.currency,
                        pin: payload.pin,
                        accountNumber: accountNumber,
                        IMF: IMF,
                        TAX: TAX,
                        COT: COT,
                        password: payload.password, // Added for your specific schema requirement
                        accountBalance: '0',
                        accountLevel: 'Starter',
                        activeuser: true,
                        date: new Date().toLocaleDateString()
                    }]);

                if (insertErr) throw insertErr;

                Swal.fire({
                    icon: 'success',
                    title: 'Welcome!',
                    text: 'Account created successfully.',
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    window.location.href = "../dashboard/index.html";
                });

            } catch (err) {
                hideSpinner();
                console.error(err);
                Swal.fire('❌ Error', err.message || 'Something went wrong.', 'error');
            }
        });
    }
});