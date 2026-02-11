/**
 * 1. SESSION & USER ID HANDLING
 * We parse the JSON object 'user_session' to get the uuid
 */
const sessionStr = localStorage.getItem('user_session');
let userId = null;

if (sessionStr) {
    const session = JSON.parse(sessionStr);
    userId = session.uuid;
    console.log("Logged in User UUID:", userId);
} else {
    console.error("No session found. Redirecting...");
    window.location.href = "../login/index.html";
}

/**
 * 2. RENDER FUNCTION
 * Updates the UI based on Database State (cards & cardApproval columns)
 */
function renderTopSection(dataBase) {
    if (!dataBase) return;

    // Update Profile Picture
    const profilePic = document.getElementById("profilePic");
    if (profilePic) {
        profilePic.src = !dataBase.profileImage ? "prof.jpg" : dataBase.profileImage;
    }

    const cardMap = {
        "Master": "masterbutt",
        "Visa": "visabutt",
        "Verve": "vervebutt",
        "Virtual": "virtualbutt"
    };

    // Reset all buttons to default state first
    Object.values(cardMap).forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.innerHTML = 'Apply Now';
            btn.style.color = '';
        }
    });

    // Check current database status
    const targetBtnId = cardMap[dataBase.cards];
    const targetBtn = document.getElementById(targetBtnId);

    if (targetBtn) {
        const status = String(dataBase.cardApproval).toLowerCase();

        if (status === 'approved') {
            targetBtn.innerHTML = 'Activated';
            targetBtn.style.color = '#00FF00'; // Success Green
        }
        else if (status === 'unapproved' || status === 'pending') {
            targetBtn.innerHTML = 'Pending';
            targetBtn.style.color = 'gold';
        }
    }
}

/**
 * 3. INITIAL FETCH & REALTIME SUBSCRIPTION
 */
async function initRealtime() {
    if (!userId) return;

    // Optional: showSpinnerModal(); 

    // Fetch initial data using global window.supabase
    const { data: initialData, error } = await window.supabase
        .from('users')
        .select('*')
        .eq('uuid', userId)
        .single();

    if (initialData) {
        window.dataBase = initialData; // Store globally for click handlers
        renderTopSection(initialData);
    }

    // Subscribe to Realtime updates for this specific user
    window.supabase
        .channel(`user-card-status-${userId}`)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `uuid=eq.${userId}`
        }, (payload) => {
            console.log("Realtime Update Received:", payload.new);
            window.dataBase = payload.new;
            renderTopSection(payload.new);
        })
        .subscribe();

    // Optional: hideSpinnerModal();
}

// Start the page logic
initRealtime();
///////END GETTING CARD DETAILS



////////// CARD SECTION START ////////////////


/** (Mastercard)
 * SECTION: Mastercard Application Handler
 * This logic handles the click event for the 'mms' (Mastercard) trigger.
 */
document.getElementById('mms')?.addEventListener('click', async () => {
    // 1. Check current data from the global window.dataBase (synced by Realtime)
    const db = window.dataBase;

    if (!db) {
        return Swal.fire({
            title: "Loading...",
            text: "Please wait for account synchronization.",
            icon: "info",
            background: '#0C290F',
            confirmButtonColor: 'green'
        });
    }

    // 2. KYC Validation Check
    if (db.kyc !== 'approved') {
        return Swal.fire({
            background: '#0C290F',
            confirmButtonColor: 'green',
            customClass: { popup: 'swal2Style' },
            title: 'KYC Required',
            text: "KYC must be verified before applying for a card.",
            icon: 'warning',
            confirmButtonText: 'Go to KYC'
        }).then((result) => {
            if (result.isConfirmed) window.location.href = 'security.html';
        });
    }

    // 3. Existing Card Check
    // If cards is not 'no' and not null, they already have a card or a pending request
    if (db.cards !== 'no' && db.cards !== null) {
        const isPending = (db.cardApproval === 'unapproved' || db.cardApproval === 'pending');

        return Swal.fire({
            background: '#0C290F',
            confirmButtonColor: 'green',
            customClass: { popup: 'swal2Style' },
            title: isPending ? 'Pending Card' : 'Active Card',
            text: isPending
                ? "You already applied for a card and it is currently pending approval."
                : "You already have an active card linked to your account.",
            icon: 'info',
            confirmButtonText: 'OK!'
        });
    }

    // 4. Important Notice & Application Submission
    Swal.fire({
        background: '#0C290F',
        confirmButtonColor: 'green',
        customClass: { popup: 'swal2Style' },
        title: 'Important Notice',
        text: "Ensure your personal details are accurate. Protect your PIN at all times. Proceed only if you agree to these safety terms.",
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Apply!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            // Show global spinner if defined
            if (typeof showSpinnerModal === 'function') showSpinnerModal();

            const { error } = await supabase
                .from('users')
                .update({
                    cards: 'Master',
                    cardApproval: 'unapproved',
                })
                .eq('uuid', userId);

            if (typeof hideSpinnerModal === 'function') hideSpinnerModal();

            if (error) {
                console.error('Error updating data:', error);
                Swal.fire("Error", "Could not submit application. Please try again.", "error");
            } else {
                Swal.fire({
                    background: '#0C290F',
                    confirmButtonColor: 'green',
                    customClass: { popup: 'swal2Style' },
                    title: 'Application Sent',
                    text: "Your request has been received. Please be patient — an agent will attend to you shortly.",
                    icon: 'success',
                    confirmButtonText: 'Ok!'
                });

                // NOTE: We removed location.reload(). 
                // The Realtime listener (postgres_changes) will catch this update 
                // and call renderTopSection() automatically to show "Pending".
            }
        }
    });
});



/** Visa Card
 * SECTION: Visa Card Application Handler
 * Handles the 'vcs' click event using Realtime data synchronization.
 */
document.getElementById('vcs')?.addEventListener('click', async () => {
    // 1. Get current state from the global synced object
    const db = window.dataBase;

    if (!db) {
        return Swal.fire({
            title: "Syncing...",
            text: "Please wait while we verify your account status.",
            icon: "info",
            background: '#0C290F',
            confirmButtonColor: 'green'
        });
    }

    // 2. KYC Validation
    if (db.kyc !== 'approved') {
        return Swal.fire({
            background: '#0C290F',
            confirmButtonColor: 'green',
            customClass: { popup: 'swal2Style' },
            title: 'KYC Required',
            text: "KYC must be verified before applying for a card.",
            icon: 'warning',
            confirmButtonText: 'Go to KYC'
        }).then((result) => {
            if (result.isConfirmed) window.location.href = 'security.html';
        });
    }

    // 3. Existing Card/Application Check
    if (db.cards !== 'no' && db.cards !== null) {
        const isPending = (db.cardApproval === 'unapproved' || db.cardApproval === 'pending');

        return Swal.fire({
            background: '#0C290F',
            confirmButtonColor: 'green',
            customClass: { popup: 'swal2Style' },
            title: isPending ? 'Pending Card' : 'Active Card',
            text: isPending
                ? "You already have a pending Visa card application. Please wait for approval."
                : "You already have an active card linked to your account.",
            icon: 'info',
            confirmButtonText: 'OK!'
        });
    }

    // 4. Terms Notice & Update
    Swal.fire({
        background: '#0C290F',
        confirmButtonColor: 'green',
        customClass: { popup: 'swal2Style' },
        title: 'Important Notice',
        text: "Before applying for a Visa card, ensure your details are accurate. Proceed only if you agree to our safety terms.",
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Apply!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            if (typeof showSpinnerModal === 'function') showSpinnerModal();

            const { error } = await supabase
                .from('users')
                .update({
                    cards: 'Visa',
                    cardApproval: 'unapproved',
                })
                .eq('uuid', userId);

            if (typeof hideSpinnerModal === 'function') hideSpinnerModal();

            if (error) {
                console.error('Update Error:', error);
                Swal.fire("Error", "Request failed. Check your connection and try again.", "error");
            } else {
                Swal.fire({
                    background: '#0C290F',
                    confirmButtonColor: 'green',
                    customClass: { popup: 'swal2Style' },
                    title: 'Application Sent',
                    text: "Your Visa card request has been received. An agent will attend to you shortly.",
                    icon: 'success',
                    confirmButtonText: 'Ok!'
                });

                // Realtime subscription automatically triggers renderTopSection()
                // The button will change to "Pending" instantly without a refresh.
            }
        }
    });
});


/** Verve Card
 * SECTION: Verve Card Application Handler
 * Handles the 'vve' click event with Realtime state management.
 */
document.getElementById('vve')?.addEventListener('click', async () => {
    // 1. Reference the globally synced database object
    const db = window.dataBase;

    if (!db) {
        return Swal.fire({
            title: "Syncing...",
            text: "Establishing secure connection, please wait.",
            icon: "info",
            background: '#0C290F',
            confirmButtonColor: 'green'
        });
    }

    // 2. KYC Validation Check
    if (db.kyc !== 'approved') {
        return Swal.fire({
            background: '#0C290F',
            confirmButtonColor: 'green',
            customClass: { popup: 'swal2Style' },
            title: 'KYC Required',
            text: "KYC must be verified before applying for a card.",
            icon: 'warning',
            confirmButtonText: 'Go to KYC'
        }).then((result) => {
            if (result.isConfirmed) window.location.href = 'security.html';
        });
    }

    // 3. Existing Card/Request Validation
    if (db.cards !== 'no' && db.cards !== null) {
        const isPending = (db.cardApproval === 'unapproved' || db.cardApproval === 'pending');

        return Swal.fire({
            background: '#0C290F',
            confirmButtonColor: 'green',
            customClass: { popup: 'swal2Style' },
            title: isPending ? 'Pending Card' : 'Active Card',
            text: isPending
                ? "You already have a pending Verve card application. Please wait for approval."
                : "You already have an active card linked to your account.",
            icon: 'info',
            confirmButtonText: 'OK!'
        });
    }

    // 4. Terms Prompt & Realtime Database Update
    Swal.fire({
        background: '#0C290F',
        confirmButtonColor: 'green',
        customClass: { popup: 'swal2Style' },
        title: 'Important Notice',
        text: "Before applying for a Verve card, ensure your personal details are accurate. Proceed only if you agree to these safety terms.",
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Apply!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            // Use global spinner from app.js if available
            if (typeof showSpinnerModal === 'function') showSpinnerModal();

            const { error } = await supabase
                .from('users')
                .update({
                    cards: 'Verve',
                    cardApproval: 'unapproved',
                })
                .eq('uuid', userId);

            if (typeof hideSpinnerModal === 'function') hideSpinnerModal();

            if (error) {
                console.error('Update Error:', error);
                Swal.fire("Error", "Could not process request. Please check your network.", "error");
            } else {
                Swal.fire({
                    background: '#0C290F',
                    confirmButtonColor: 'green',
                    customClass: { popup: 'swal2Style' },
                    title: 'Application Sent',
                    text: "Your Verve card application has been received. An agent will attend to you shortly.",
                    icon: 'success',
                    confirmButtonText: 'Ok!'
                });

                // NO RELOAD: The postgres_changes listener in initRealtime() 
                // will see the card change and run renderTopSection() for you.
            }
        }
    });
});


/** Virtual Card
 * SECTION: Virtual Card Application Handler
 * Handles the 'vtc' click event with Realtime data syncing.
 */
document.getElementById('vtc')?.addEventListener('click', async () => {
    // 1. Reference the global synced data
    const db = window.dataBase;

    if (!db) {
        return Swal.fire({
            title: "Wait...",
            text: "Synchronizing with secure servers.",
            icon: "info",
            background: '#0C290F',
            confirmButtonColor: 'green'
        });
    }

    // 2. KYC Validation
    if (db.kyc !== 'approved') {
        return Swal.fire({
            background: '#0C290F',
            confirmButtonColor: 'green',
            customClass: { popup: 'swal2Style' },
            title: 'KYC Required',
            text: "KYC must be verified before applying for a virtual card.",
            icon: 'warning',
            confirmButtonText: 'Go to KYC'
        }).then((result) => {
            if (result.isConfirmed) window.location.href = 'security.html';
        });
    }

    // 3. Status Check (Is there already a card or request?)
    if (db.cards !== 'no' && db.cards !== null) {
        const isPending = (db.cardApproval === 'unapproved' || db.cardApproval === 'pending');

        return Swal.fire({
            background: '#0C290F',
            confirmButtonColor: 'green',
            customClass: { popup: 'swal2Style' },
            title: isPending ? 'Pending Card' : 'Active Card',
            text: isPending
                ? "Your Virtual card application is currently being processed."
                : "You already have an active card linked to your account.",
            icon: 'info',
            confirmButtonText: 'OK!'
        });
    }

    // 4. Terms and Realtime Update
    Swal.fire({
        background: '#0C290F',
        confirmButtonColor: 'green',
        customClass: { popup: 'swal2Style' },
        title: 'Important Notice',
        text: "Ensure your personal details are accurate and updated. Proceed only if you agree to these safety terms.",
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Apply!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            // Trigger spinner from app.js
            if (typeof showSpinnerModal === 'function') showSpinnerModal();

            const { error } = await supabase
                .from('users')
                .update({
                    cards: 'Virtual',
                    cardApproval: 'unapproved',
                })
                .eq('uuid', userId);

            if (typeof hideSpinnerModal === 'function') hideSpinnerModal();

            if (error) {
                console.error('Update Error:', error);
                Swal.fire("Error", "Submission failed. Please try again.", "error");
            } else {
                Swal.fire({
                    background: '#0C290F',
                    confirmButtonColor: 'green',
                    customClass: { popup: 'swal2Style' },
                    title: 'Application Sent',
                    text: "Your Virtual card request has been received. An agent will attend to you shortly.",
                    icon: 'success',
                    confirmButtonText: 'Ok!'
                });

                // NO RELOAD: The postgres_changes channel we set up in the top section
                // will detect this update and immediately update the button to 'Pending'.
            }
        }
    });
});



////////// CARD SECTION END ////////////////


