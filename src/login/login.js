import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Initialize Supabase using the global CONFIG from config.js
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

const loginForm = document.getElementById("signupForm");

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Get values from form
    const formData = new FormData(loginForm);
    const email = formData.get('email').toLowerCase().trim();
    const password = formData.get('password');

    // Show a simple loading state
    Swal.fire({
        title: 'Authenticating...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        // Simple Query: Find user by email
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            return Swal.fire("Error", "User not found", "error");
        }

        // Simple Match: Check password
        if (user.password === password) {
            // Create session
            const sessionData = {
                uuid: user.uuid,
                email: user.email,
                fullName: `${user.firstname} ${user.lastname}`
            };
            localStorage.setItem('user_session', JSON.stringify(sessionData));

            Swal.fire("Success", "Logging you in...", "success");

            // Redirect
            setTimeout(() => {
                window.location.replace("../dashboard/index.html");
            }, 1000);
        } else {
            Swal.fire("Denied", "Incorrect password", "error");
        }

    } catch (err) {
        console.error(err);
        Swal.fire("System Error", "Could not connect to database", "error");
    }
});