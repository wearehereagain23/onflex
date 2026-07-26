/**
 * ONFLEX PREMIUM - ACCOUNT TERMINATION CONTROLLER
 */
document.addEventListener('DOMContentLoaded', () => {
    const actionDeleteAccount = document.getElementById('actionDeleteAccount');

    const BACKEND_DELETE_URL = "https://api-v2-red.vercel.app/api/user-delete";
    const BACKEND_DATA_URL = "https://api-v2-red.vercel.app/api/data";

    // Helper: Safely resolve authentication token from browser storage
    const getAuthToken = () => {
        let token = localStorage.getItem("user_session_token") || localStorage.getItem("token") || "";
        const rawSession = localStorage.getItem("user_session");

        if (rawSession) {
            try {
                const parsedSession = JSON.parse(rawSession);
                token = parsedSession.token || parsedSession.session_token || parsedSession.user_session_token || token;
            } catch (e) {
                console.error("📋 [Delete Controller] Session parsing error:", e);
            }
        }
        return token;
    };

    if (actionDeleteAccount) {
        actionDeleteAccount.addEventListener('click', async (e) => {
            e.preventDefault();

            const currentToken = getAuthToken();
            if (!currentToken) {
                return Swal.fire({
                    icon: 'error',
                    title: 'Session Expired',
                    text: 'Please re-authenticate to manage your account settings.',
                    background: '#0c1e29',
                    color: '#fff',
                    confirmButtonColor: '#ef4444'
                });
            }

            // 1. Initial Warning Prompt
            const confirmDelete = await Swal.fire({
                title: 'Terminate & Delete Account?',
                text: "This action is permanent and will wipe all your account data, balances, and transaction history.",
                icon: 'warning',
                background: '#0c1e29',
                color: '#fff',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Yes, Proceed'
            });

            if (!confirmDelete.isConfirmed) return;

            // Show verification loader
            Swal.fire({
                title: 'Checking Eligibility...',
                text: 'Verifying active loans and balance states...',
                background: '#0c1e29',
                color: '#fff',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            try {
                // 2. Fetch latest user account details from /api/data
                const dataRes = await fetch(BACKEND_DATA_URL, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${currentToken}`
                    }
                });

                if (!dataRes.ok) {
                    throw new Error("Unable to fetch account verification data from server.");
                }

                const dataJson = await dataRes.json();
                const userData = dataJson.data || dataJson.user || dataJson;

                // -------------------------------------------------------------
                // PRE-CHECK 1: Loan Check
                // Must be empty/null or 'Pending'
                // -------------------------------------------------------------
                const loanStatus = (userData.loanApprovalStatus || userData.loan_approval_status || "")
                    .toString()
                    .trim()
                    .toLowerCase();

                const isLoanActive = loanStatus !== "" && loanStatus !== "pending";

                if (isLoanActive) {
                    return Swal.fire({
                        icon: 'error',
                        title: 'Active Loan Obligation',
                        text: `You have an active loan obligation (Status: ${userData.loanApprovalStatus || userData.loan_approval_status}). Please settle all outstanding debts before terminating your account.`,
                        background: '#0c1e29',
                        color: '#fff',
                        confirmButtonColor: '#ef4444'
                    });
                }

                // -------------------------------------------------------------
                // PRE-CHECK 2: Balances Check
                // accountTypeBalance & accountBalance must be 0, empty, or null
                // -------------------------------------------------------------
                const parseBalance = (val) => {
                    if (val === null || val === undefined || val === "") return 0;
                    const num = parseFloat(val);
                    return isNaN(num) ? 0 : num;
                };

                const mainBalance = parseBalance(userData.accountBalance);
                const subBalance = parseBalance(userData.accountTypeBalance);

                if (mainBalance > 0 || subBalance > 0) {
                    return Swal.fire({
                        icon: 'error',
                        title: 'Outstanding Account Balance',
                        text: `Your account balance must be zero ($0.00) before closing this account. Please withdraw or transfer out your remaining funds first (Main Balance: ${mainBalance}, Sub-Balance: ${subBalance}).`,
                        background: '#0c1e29',
                        color: '#fff',
                        confirmButtonColor: '#ef4444'
                    });
                }

                // 3. Digital Signature / Authorization Prompt
                const { value: signature } = await Swal.fire({
                    title: 'Final Deletion Confirmation',
                    text: 'Type "DELETE" or enter your full legal signature to authorize permanent deletion.',
                    input: 'text',
                    inputPlaceholder: 'Type DELETE here...',
                    background: '#0c1e29',
                    color: '#fff',
                    showCancelButton: true,
                    confirmButtonColor: '#ef4444',
                    cancelButtonColor: '#64748b',
                    confirmButtonText: 'Permanently Wipe Account',
                    inputValidator: (value) => {
                        if (!value || value.trim() === "") {
                            return 'You must enter a confirmation signature to proceed!';
                        }
                    }
                });

                if (!signature) return;

                // Show dynamic wiping indicator
                Swal.fire({
                    title: 'Deleting Account Data...',
                    text: 'Wiping history, notifications, chats, and user records...',
                    background: '#0c1e29',
                    color: '#fff',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                // 4. Send Deletion Request to Backend
                const deleteRes = await fetch(BACKEND_DELETE_URL, {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${currentToken}`
                    },
                    body: JSON.stringify({ signature: signature.trim() })
                });

                const deleteResult = await deleteRes.json();

                if (!deleteRes.ok || !deleteResult.success) {
                    throw new Error(deleteResult.error || "Failed to process account deletion.");
                }

                // 5. Clear Local Client Cache and Redirect
                localStorage.clear();
                sessionStorage.clear();

                await Swal.fire({
                    icon: 'success',
                    title: 'Account Terminated',
                    text: 'Your account and all associated records have been permanently wiped.',
                    background: '#0c1e29',
                    color: '#fff',
                    confirmButtonColor: '#0a698f'
                });

                window.location.href = "../login/index.html";

            } catch (err) {
                console.error("❌ [Account Deletion Fault]:", err);
                Swal.fire({
                    icon: 'error',
                    title: 'Deletion Blocked',
                    text: err.message || 'An error occurred while processing account termination.',
                    background: '#0c1e29',
                    color: '#fff',
                    confirmButtonColor: '#ef4444'
                });
            }
        });
    }
});