const deleteBtn = document.getElementById('deleteUser');

// Helper functions
const showSpinner = () => document.getElementById('spinnerModal')?.style.setProperty('display', 'flex');
const hideSpinner = () => document.getElementById('spinnerModal')?.style.setProperty('display', 'none');

deleteBtn?.addEventListener('click', async (e) => {
    e.preventDefault();

    if (!USERID) {
        return Swal.fire("Error", "No user ID found.", "error");
    }

    try {
        // 1. VERSION CHECK: Lock deletion if not Full Version
        const { data: admin } = await supabase.from('admin').select('admin_full_version').eq('id', 1).single();

        if (!admin?.admin_full_version) {
            return Swal.fire({
                title: "Action Locked",
                text: "Upgrade to Full Version to delete users.",
                icon: "lock",
                background: '#0C290F',
                color: '#fff'
            });
        }

        // 2. CONFIRMATION
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

            const tables = [
                'chats',
                'notifications',
                'notification_subscribers',
                'history',
                'devices',
                'users'
            ];

            // Execute deletions sequentially
            for (const table of tables) {
                const { error } = await supabase.from(table).delete().eq('uuid', USERID);
                if (error) console.warn(`Note: Could not delete from ${table}:`, error.message);
            }

            hideSpinner();

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
        }
    } catch (err) {
        hideSpinner();
        console.error("Deletion Error:", err);
        Swal.fire({
            title: 'Error',
            text: err.message,
            icon: 'error',
            background: '#0C290F',
            color: '#fff'
        });
    }
});