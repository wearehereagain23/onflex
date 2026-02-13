/**
 * delete_account.js - Handles permanent account deletion
 */
window.initDeleteAccount = function () {
    const deleteBtn = document.getElementById('deleteAccount');
    if (!deleteBtn) return;

    deleteBtn.addEventListener('click', () => {
        const user = window.dataBase;
        const db = window.supabase;

        if (!user || !db) return;

        Swal.fire({
            background: '#0C290F',
            confirmButtonColor: '#ef4444',
            showCancelButton: true,
            cancelButtonColor: '#1a1a1a',
            title: 'Delete Account?',
            text: "This action is permanent. Ensure all balances are zero.",
            icon: 'warning',
            confirmButtonText: 'Verify & Delete',
            preConfirm: () => {
                if (Number(user.accountBalance) !== 0) {
                    Swal.showValidationMessage(`You still have ${user.currency}${user.accountBalance} in your balance`);
                    return false;
                }
                return true;
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                if (typeof showSpinnerModal === 'function') showSpinnerModal();

                try {
                    // 1. Delete History
                    await db.from('history').delete().eq('uuid', user.uuid);
                    // 2. Delete PWA data
                    await db.from('notification_subscribers').delete().eq('uuid', user.uuid);
                    // 3. Delete User
                    const { error } = await db.from('users').delete().eq('uuid', user.uuid);

                    if (error) throw error;

                    localStorage.clear();
                    sessionStorage.clear();

                    Swal.fire({
                        icon: 'success',
                        title: 'Deleted',
                        timer: 2000,
                        showConfirmButton: false
                    }).then(() => {
                        window.location.href = "../login/index.html";
                    });
                } catch (err) {
                    console.error('Delete failed:', err);
                    if (typeof hideSpinnerModal === 'function') hideSpinnerModal();
                }
            }
        });
    });
};