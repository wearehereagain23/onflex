// ===== API Connection Core Parameters =====
const BACKEND_URL = "https://api-v2-red.vercel.app/register-user";
const APP_SIGNATURE = "onflex";

// ===== UI Reference Elements =====
const form = document.getElementById('signupForm');
const spinner = document.getElementById('spinnerModal');
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');
const dot1 = document.getElementById('dot1');
const dot2 = document.getElementById('dot2');

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
    password2: document.getElementById('password2')
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
    password2: document.getElementById('password2Err')
};

const showSpinner = () => spinner.style.display = 'flex';
const hideSpinner = () => spinner.style.display = 'none';
const setErr = (key, msg = '') => { if (errs[key]) errs[key].textContent = msg; };

// Validation Helper Functions
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const isNotEmpty = v => String(v || '').trim().length > 0;

function getPasswordScore(pw) {
    let score = 0;
    if ((pw || '').length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
}

// ===== Live Validation Rules Engine =====
const validators = {
    firstname: (v) => isNotEmpty(v) ? '' : 'First name is required',
    middlename: () => '', // Optional field
    lastname: (v) => isNotEmpty(v) ? '' : 'Last name is required',
    email: (v) => {
        if (!isNotEmpty(v)) return 'Email address is required';
        return emailRegex.test(v) ? '' : 'Please enter a valid email address';
    },
    birth: (v) => isNotEmpty(v) ? '' : 'Date of birth is required',
    gender: (v) => isNotEmpty(v) ? '' : 'Please select your gender',
    city: (v) => isNotEmpty(v) ? '' : 'City is required',
    country: (v) => isNotEmpty(v) ? '' : 'Please select your country',
    accounttype: (v) => isNotEmpty(v) ? '' : 'Please select an account type',
    currency: (v) => isNotEmpty(v) ? '' : 'Please choose your primary currency',
    password: (v) => {
        if (!isNotEmpty(v)) return 'Password is required';
        return getPasswordScore(v) < 3 ? 'Password must be stronger (8+ characters with mixed types)' : '';
    },
    password2: (v) => {
        if (!isNotEmpty(v)) return 'Please confirm your password';
        return v === els.password.value ? '' : 'Passwords do not match';
    }
};

// Bind Real-time Input Listeners
Object.keys(els).forEach(key => {
    els[key].addEventListener('input', () => {
        const errorMsg = validators[key](els[key].value);
        setErr(key, errorMsg);

        if (key === 'password') {
            const score = getPasswordScore(els[key].value);
            const pct = (score / 5) * 100;
            const fill = document.getElementById('strengthFill');
            const label = document.getElementById('strengthLabel');
            fill.style.width = pct + "%";
            fill.style.background = pct < 40 ? "#ef4444" : pct < 80 ? "#f59e0b" : "#22c55e";
            label.textContent = pct < 40 ? "Weak" : pct < 80 ? "Medium" : "Strong";

            if (els.password2.value) setErr('password2', validators.password2(els.password2.value));
        }
    });
});

function checkStep1() {
    let isValid = true;
    ['firstname', 'lastname', 'email', 'birth', 'gender', 'city', 'country'].forEach(key => {
        const err = validators[key](els[key].value);
        if (err) { setErr(key, err); isValid = false; }
    });
    return isValid;
}

function checkStep2() {
    let isValid = true;
    ['accounttype', 'currency', 'password', 'password2'].forEach(key => {
        const err = validators[key](els[key].value);
        if (err) { setErr(key, err); isValid = false; }
    });
    return isValid;
}

// ===== Control Step Actions =====
nextBtn.addEventListener('click', () => {
    if (checkStep1()) {
        step1.classList.remove('active-step');
        step2.classList.add('active-step');
        dot2.classList.add('active');
    } else {
        Swal.fire({
            title: 'Incomplete Details',
            text: 'Please clear errors or fill all required fields before proceeding.',
            icon: 'warning',
            confirmButtonColor: '#0a778f'
        });
    }
});

prevBtn.addEventListener('click', () => {
    step2.classList.remove('active-step');
    step1.classList.add('active-step');
    dot2.classList.remove('active');
});



// Dedicated Registration Submission Handler
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!checkStep1() || !checkStep2()) {
        Swal.fire({
            title: 'Validation Errors',
            text: 'Please review and fill out all required fields.',
            icon: 'error',
            confirmButtonColor: '#0a778f'
        });
        return;
    }

    showSpinner();

    // Directly structured payload for /register-user
    const registerPayload = {
        signature: APP_SIGNATURE,
        firstname: els.firstname.value.trim(),
        middlename: els.middlename.value.trim(),
        lastname: els.lastname.value.trim(),
        email: els.email.value.trim(),
        birth: els.birth.value,
        gender: els.gender.value,
        city: els.city.value.trim(),
        country: els.country.value,
        accounttype: els.accounttype.value,
        currency: els.currency.value,
        password: els.password.value,
    };

    try {
        const response = await fetch("https://api-v2-red.vercel.app/register-user", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(registerPayload)
        });

        const result = await response.json();
        hideSpinner();

        if (result.success) {
            const userData = result.user || {};

            // Match EXACT structure expected by index.js (session.token)
            const sessionObject = {
                token: result.token,
                uuid: userData.uuid || "",
                email: userData.email || els.email.value.trim()
            };

            // Save primary session key used by dashboard index.js
            localStorage.setItem("user_session", JSON.stringify(sessionObject));

            // Save supporting keys
            localStorage.setItem("user_token", result.token);
            localStorage.setItem("user_data", JSON.stringify(userData));
            localStorage.setItem("notification_active", "false");

            Swal.fire({
                title: 'Registration Successful',
                text: 'Initializing dashboard environment...',
                icon: 'success',
                timer: 1800,
                showConfirmButton: false
            }).then(() => {
                window.location.href = "../dashboard/index.html";
            });
        } else {
            Swal.fire({
                title: 'Registration Failed',
                text: result.error || 'Registration failed on server.',
                icon: 'error',
                confirmButtonColor: '#0a778f'
            });
        }

    } catch (networkError) {
        hideSpinner();
        console.error("Connection Error:", networkError);
        Swal.fire({
            title: 'Network Error',
            text: 'Could not connect to the server.',
            icon: 'error',
            confirmButtonColor: '#0a778f'
        });
    }
});