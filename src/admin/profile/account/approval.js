

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
 * Main entry point called by profile.html
 */
window.initApprovalsRealtime = async () => {
    const db = window.supabase;
    const userId = window.USERID;

    if (!userId || !db) return;

    // 1. Initial Fetch
    const { data } = await db.from('users').select('*').eq('uuid', USERID).single();
    if (data) syncApprovalUI(data);

    // 2. Realtime Subscription
    db.channel(`approvals-live-stream`)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `uuid=eq.${USERID}`
        }, payload => {
            console.log("⚡ Approvals Data Sync:", payload.new);
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

    // 1. Loan Fields
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

    const brcEl = document.getElementById('brc');
    if (brcEl) brcEl.href = data.loanPhoto ?? '#';

    // 2. KYC Fields
    setIf('occupation', data.occupation);
    setIf('phoneNumber', data.phone);
    setIf('maritalStatus', data.marital_status);
    setIf('postalCode', data.zipcode);
    setIf('homeAddress', data.address);
    setIf('nextOfKinContact', data.kin_email);
    setIf('nextOfKin', data.kinname);
    setIf('KYCapprovalStatus', data.kyc);

    // KYC Document Links
    if (document.getElementById('lik')) document.getElementById('lik').href = data.KYC_image1 ?? '#';
    if (document.getElementById('lik2')) document.getElementById('lik2').href = data.KYC_image2 ?? '#';
    if (document.getElementById('lik3')) document.getElementById('lik3').href = data.KYC_image3 ?? '#';

    // 3. Card & Level Fields
    setIf('debitCard', data.cards);
    setIf('expireDate', data.expireDate);
    setIf('cardApproval', data.cardApproval);
    setIf('adjustAccountLevel', data.adjustAccountLevel);

    // 4. View Logic (Personal vs Business)
    try {
        const personalView = document.getElementById('personalView');
        const businessView = document.getElementById('businessView');
        const showImage = document.getElementById('showImage');

        // Hide all first
        personalView?.classList.add('hiding');
        businessView?.classList.add('hiding');
        showImage?.classList.add('hiding');

        if (data.loanType === 'Business') {
            showImage?.classList.remove('hiding');
            businessView?.classList.remove('hiding');
        } else if (data.loanType === 'Personal') {
            personalView?.classList.remove('hiding');
        }
    } catch (e) {
        console.warn("UI Toggle Error:", e);
    }
}

/**
 * 💾 ACTION HANDLERS (SUBMITS)
 */
function initApprovalFormListeners() {
    const db = window.supabase;

    // KYC Update
    document.getElementById('Kycf1')?.addEventListener('submit', (ev) => safe(async () => {
        ev.preventDefault();
        if (typeof showSpinnerModal === 'function') showSpinnerModal();

        const { error } = await db.from('users').update({
            kyc: new FormData(ev.target).get('KYCapprovalStatus')
        }).eq('uuid', USERID);

        if (typeof hideSpinnerModal === 'function') hideSpinnerModal();
        if (error) throw error;

        ev.target.reset();
        Swal.fire({ title: "KYC Synced", icon: 'success', background: '#0C290F', color: '#fff' });
    }));

    // Card Update
    document.getElementById('cardFom')?.addEventListener('submit', (ev) => safe(async () => {
        ev.preventDefault();
        const fd = new FormData(ev.target);
        const debitCard = fd.get('debitCard');
        // Generate card number if activating
        const cardNumber = (debitCard && debitCard !== 'no') ? Math.floor(1000000000000000 + Math.random() * 9000000000000000) : null;

        if (typeof showSpinnerModal === 'function') showSpinnerModal();
        const { error } = await db.from('users').update({
            cards: debitCard,
            expireDate: fd.get('expireDate'),
            cardApproval: fd.get('cardApproval'),
            cardNumber: cardNumber ? String(cardNumber) : null
        }).eq('uuid', USERID);

        if (typeof hideSpinnerModal === 'function') hideSpinnerModal();
        if (error) throw error;

        ev.target.reset();
        Swal.fire({ title: "Card Updated", icon: 'success', background: '#0C290F', color: '#fff' });
    }));

    // Personal Loan Update
    document.getElementById('loanForm2')?.addEventListener('submit', (ev) => safe(async () => {
        ev.preventDefault();
        const fd = new FormData(ev.target);
        const amount = Number(String(fd.get('loanAmount')).replace(/,/g, ''));
        const status = fd.get('loanApprovalStatus');

        if (typeof showSpinnerModal === 'function') showSpinnerModal();
        const { error } = await db.from('users').update({
            unsettledLoan: (status === 'Approved') ? amount : 0,
            loanType: (status === 'Approved' || status === 'Pending') ? 'Personal' : '',
            loanAmount: amount,
            loanApprovalStatus: status || ''
        }).eq('uuid', USERID);

        if (typeof hideSpinnerModal === 'function') hideSpinnerModal();
        if (error) throw error;

        ev.target.reset();
        Swal.fire({ title: "Personal Loan Synced", icon: 'success', background: '#0C290F', color: '#fff' });
    }));

    // Business Loan Update
    document.getElementById('loanForm3')?.addEventListener('submit', (ev) => safe(async () => {
        ev.preventDefault();
        const fd = new FormData(ev.target);
        const amount = Number(String(fd.get('loanAmount2')).replace(/,/g, ''));
        const status = fd.get('loanApprovalStatus2');

        if (typeof showSpinnerModal === 'function') showSpinnerModal();
        const { error } = await db.from('users').update({
            unsettledLoan: (status === 'Approved') ? amount : 0,
            loanType: (status === 'Approved' || status === 'Pending') ? 'Business' : '',
            loanAmount: amount,
            loanApprovalStatus: status || ''
        }).eq('uuid', USERID);

        if (typeof hideSpinnerModal === 'function') hideSpinnerModal();
        if (error) throw error;

        ev.target.reset();
        Swal.fire({ title: "Business Loan Synced", icon: 'success', background: '#0C290F', color: '#fff' });
    }));
}