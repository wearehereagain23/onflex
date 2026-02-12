
const deleteBtn = document.getElementById('deleteUser');

// Helper functions
const showSpinner = () => document.getElementById('spinnerModal')?.style.setProperty('display', 'flex');
const hideSpinner = () => document.getElementById('spinnerModal')?.style.setProperty('display', 'none');

deleteBtn?.addEventListener('click', async (e) => {
    e.preventDefault();

    if (!USERID) {
        return Swal.fire("Error", "No user ID found.", "error");
    }

    const result = await Swal.fire({
        title: 'Final Warning!',
        text: "This will wipe all user history, chats, and account data permanently.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, Delete All',
        background: '#0C290F',
        color: '#fff'
    });

    if (result.isConfirmed) {
        showSpinner();

        try {
            const tables = [
                'chats',
                'notifications',
                'notification_subscribers',
                'history',
                'devices',
                'users' // Deleted last to avoid foreign key errors
            ];

            // Execute deletions
            for (const table of tables) {
                const { error } = await supabase.from(table).delete().eq('uuid', USERID);
                if (error) console.warn(`Note: Could not delete from ${table}:`, error.message);
            }

            // 🚀 CRITICAL FIX: Hide spinner BEFORE showing the success alert
            hideSpinner();

            // 🚀 CRITICAL FIX: Use a timer + .then() for redirect
            Swal.fire({
                title: 'User Deleted',
                text: 'Redirecting to user list...',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
                background: '#0C290F',
                color: '#fff'
            }).then(() => {
                window.location.href = "../../users/dashboard/users.html";
            });

        } catch (err) {
            hideSpinner(); // Ensure spinner hides on error
            console.error("Deletion Error:", err);
            Swal.fire({
                title: 'Error',
                text: 'Operation failed: ' + err.message,
                icon: 'error',
                background: '#0C290F',
                color: '#fff'
            });
        }
    }
});