// Ensure this is line 1. No 'require' anywhere.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Initialize using the global CONFIG from config.js
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

const loginForm = document.getElementById("signupForm");

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(loginForm);
    const email = formData.get('email')?.toLowerCase().trim();
    const password = formData.get('password');

    Swal.fire({
        title: 'Checking Credentials...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            return Swal.fire("Access Denied", "User not found", "error");
        }

        if (user.password === password) {
            const sessionData = {
                uuid: user.uuid,
                email: user.email,
                fullName: `${user.firstname} ${user.lastname}`
            };
            localStorage.setItem('user_session', JSON.stringify(sessionData));

            Swal.fire("Success", "Welcome back!", "success");

            setTimeout(() => {
                window.location.replace("../dashboard/index.html");
            }, 1000);
        } else {
            Swal.fire("Error", "Invalid password", "error");
        }
    } catch (err) {
        console.error(err);
        Swal.fire("System Error", "Connection failed", "error");
    }
});