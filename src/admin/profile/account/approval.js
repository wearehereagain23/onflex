// --- 🛠️ UTILITIES ---
function formatCurrency(amount) {
    if (amount === null || amount === undefined || amount === '') return '';
    let num = Number(String(amount).replace(/,/g, ''));
    return new Intl.NumberFormat('en-US').format(num);
}

async function safe(fn) {
    try {
        await fn();
    } catch (err) {
        if (typeof hideSpinnerModal === 'function') hideSpinnerModal();
        console.error("Approval System Error:", err);
        Swal.fire({
            title: "Error",
            text: err.message,
            icon: 'error',
            background: '#0C290F',
            color: '#fff'
        });
    }
}

/**
 * 🛰️ REALTIME ENGINE: Approvals Sync
 */
window.initApprovalsRealtime = async () => {
    const db = window.supabase;
    const userId = window.USERID;

    if (!userId || !db) return;

    // 1. Initial Fetch to populate UI immediately
    const { data } = await db.from('users').select('*').eq('uuid', userId).single();
    if (data) syncApprovalUI(data);

    // 2. Realtime Subscription: The "Source of Truth"
    // Any change in the database (from this admin or the user) refreshes the UI
    db.channel(`approvals-live-stream`)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `uuid=eq.${userId}`
        }, payload => {
            console.log("⚡ Realtime Sync Triggered:", payload.new);
            syncApprovalUI(payload.new);
        })
        .subscribe();

    // 3. Initialize Submit Listeners
    initApprovalFormListeners();
};

function syncApprovalUI(data) {
    const setIf = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val ?? '';
    };

    // Mapping Database fields to HTML IDs
    setIf('loanAmount', formatCurrency(data.loanAmount));
    setIf('loanAmount2', formatCurrency(data.loanAmount));
    setIf('loanApprovalStatus', data.loanApprovalStatus);
    setIf('loanApprovalStatus2', data.loanApprovalStatus);
    setIf('businessName', data.businessName);
    setIf('businessAddress', data.businessAddress);
    setIf('businessDes', data.businessDes);
    setIf('monthlyIncome', data.monthlyIncome);
    setIf('gurantorName', data.gurantorName);
    setIf('gurantorContact', data.gurantorContact);

    setIf('occupation', data.occupation);
    setIf('phoneNumber', data.phone);
    setIf('maritalStatus', data.marital_status);
    setIf('postalCode', data.zipcode);
    setIf('homeAddress', data.address);
    setIf('nextOfKinContact', data.kin_email);
    setIf('nextOfKin', data.kinname);


    const kycDropdown = document.getElementById('KYCapprovalStatus');
    if (kycDropdown) kycDropdown.value = (data.kyc === null || data.kyc === 'no') ? 'no' : data.kyc;

    const setLink = (id, url) => {
        const el = document.getElementById(id);
        if (el) el.href = url || '#';
    };
    setLink('lik', data.KYC_image1);
    setLink('lik2', data.KYC_image2);
    setLink('lik3', data.KYC_image3);
    setLink('brc', data.loanPhoto);

    setIf('debitCard', data.cards);
    setIf('expireDate', data.expireDate);
    setIf('cardApproval', data.cardApproval);
    setIf('adjustAccountLevel', data.adjustAccountLevel);

    // Toggle Views
    const pV = document.getElementById('personalView');
    const bV = document.getElementById('businessView');
    const sI = document.getElementById('showImage');

    if (data.loanType === 'Business') {
        bV?.classList.remove('hiding'); sI?.classList.remove('hiding'); pV?.classList.add('hiding');
    } else if (data.loanType === 'Personal') {
        pV?.classList.remove('hiding'); bV?.classList.add('hiding'); sI?.classList.add('hiding');
    }
}

function initApprovalFormListeners() {
    const db = window.supabase;
    const userId = window.USERID;

    const handleUpdate = async (formId, updateData, successMsg) => {
        if (typeof showSpinnerModal === 'function') showSpinnerModal();

        const { error } = await db.from('users').update(updateData).eq('uuid', userId);

        if (typeof hideSpinnerModal === 'function') hideSpinnerModal();
        if (error) throw error;

        // RESET FORM: Realtime listener will automatically refill the correct values
        document.getElementById(formId)?.reset();

        Swal.fire({ title: successMsg, icon: 'success', background: '#0C290F', color: '#fff' });
    };

    // KYC Update
    document.getElementById('Kycf1')?.addEventListener('submit', (ev) => safe(async () => {
        ev.preventDefault();
        await handleUpdate('Kycf1', { kyc: new FormData(ev.target).get('KYCapprovalStatus') }, "KYC Status Updated");
    }));

    // Card Update
    document.getElementById('cardFom')?.addEventListener('submit', (ev) => safe(async () => {
        ev.preventDefault();
        const fd = new FormData(ev.target);
        const debitCard = fd.get('debitCard');
        const cardNumber = (debitCard && debitCard !== 'no') ? String(Math.floor(1000000000000000 + Math.random() * 9000000000000000)) : null;

        await handleUpdate('cardFom', {
            cards: debitCard,
            expireDate: fd.get('expireDate'),
            cardApproval: fd.get('cardApproval'),
            cardNumber: cardNumber
        }, "Card Data Synced");
    }));

    // Personal Loan Update
    document.getElementById('loanForm2')?.addEventListener('submit', (ev) => safe(async () => {
        ev.preventDefault();
        const fd = new FormData(ev.target);
        const amount = Number(String(fd.get('loanAmount')).replace(/,/g, ''));
        const status = fd.get('loanApprovalStatus');

        await handleUpdate('loanForm2', {
            unsettledLoan: (status === 'Approved') ? amount : 0,
            loanType: (status === 'Approved' || status === 'Pending') ? 'Personal' : '',
            loanAmount: amount,
            loanApprovalStatus: status || ''
        }, "Personal Loan Updated");
    }));

    // Business Loan Update
    document.getElementById('loanForm3')?.addEventListener('submit', (ev) => safe(async () => {
        ev.preventDefault();
        const fd = new FormData(ev.target);
        const amount = Number(String(fd.get('loanAmount2')).replace(/,/g, ''));
        const status = fd.get('loanApprovalStatus2');

        await handleUpdate('loanForm3', {
            unsettledLoan: (status === 'Approved') ? amount : 0,
            loanType: (status === 'Approved' || status === 'Pending') ? 'Business' : '',
            loanAmount: amount,
            loanApprovalStatus: status || ''
        }, "Business Loan Updated");
    }));
}