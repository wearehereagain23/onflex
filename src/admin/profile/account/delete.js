/**
 * src/admin/profile/account/delete.js
 */
window.initDeleteUserLogic = () => {
    const deleteBtn = document.getElementById('deleteUser');
    // Use the global supabase instance initialized in the module
    const db = window.supabase;

    deleteBtn?.addEventListener('click', async (e) => {
        e.preventDefault();

        if (!window.USERID) {
            return Swal.fire("Error", "No user ID found.", "error");
        }

        try {
            // 1. Version Check
            const { data: admin } = await db.from('admin').select('admin_full_version').eq('id', 1).single();

            if (!admin?.admin_full_version) {
                return Swal.fire({
                    title: "Action Locked",
                    text: "Upgrade to Full Version to delete users.",
                    icon: "lock",
                    background: '#0c2429ff',
                    color: '#fff'
                });
            }

            // 2. Confirmation
            const result = await Swal.fire({
                title: 'Final Warning!',
                text: "This will wipe all user history and account data permanently.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, Delete All',
                background: '#0c2029ff',
                color: '#fff'
            });

            if (result.isConfirmed) {
                window.showSpinnerModal();

                const tables = ['chats', 'notifications', 'notification_subscribers', 'history', 'devices', 'users'];

                for (const table of tables) {
                    const { error } = await db.from(table).delete().eq('uuid', window.USERID);
                    if (error) console.warn(`Could not delete from ${table}:`, error.message);
                }

                window.hideSpinnerModal();

                Swal.fire({
                    title: 'User Deleted',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                    background: '#0c2529ff',
                    color: '#fff'
                }).then(() => {
                    window.location.href = "../../users/dashboard/users.html";
                });
            }
        } catch (err) {
            window.hideSpinnerModal();
            Swal.fire({ title: 'Error', text: err.message, icon: 'error', background: '#0c1a29ff', color: '#fff' });
        }
    });
};