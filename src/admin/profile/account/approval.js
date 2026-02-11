import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
const urlParams = new URLSearchParams(window.location.search);
const USERID = urlParams.get('i');

// --- UTILITIES ---
const showSpinnerModal = () => document.getElementById('spinnerModal').style.display = 'flex';
const hideSpinnerModal = () => document.getElementById('spinnerModal').style.display = 'none';

function formatCurrency(amount) {
    if (amount === null || amount === undefined || amount === '') return '';
    let num = Number(String(amount).replace(/,/g, ''));
    return new Intl.NumberFormat('en-US').format(num);
}

async function safe(fn) {
    try {
        await fn();
    } catch (err) {
        hideSpinnerModal();
        console.error("Approval System Error:", err);
        Swal.fire({ title: "Error", text: err.message, icon: 'error', background: '#0C290F' });
    }
}

/**
 * 🛰️ REALTIME ENGINE: Approvals Sync
 * This logic ensures all loan, KYC, and card fields stay updated in realtime.
 */
const initApprovalsRealtime = () => {
    if (!USERID) return;

    // Initial Fetch
    supabase.from('users').select('*').eq('uuid', USERID).single().then(({ data }) => {
        if (data) syncApprovalUI(data);
    });

    // Realtime Subscription
    supabase
        .channel(`approvals-live-stream`)
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

    // Adjust visibility for loan types (keep same logic)
    try {
        const personalView = document.getElementById('personalView');
        const businessView = document.getElementById('businessView');
        const showImage = document.getElementById('showImage');
        if (dataBase.loanType === 'Business') {
            if (showImage) showImage.classList.remove('hiding');
            if (personalView) personalView.classList.add('hiding');
            if (businessView) businessView.classList.remove('hiding');
        } else if (dataBase.loanType === 'Personal') {
            if (businessView) businessView.classList.add('hiding');
            if (personalView) personalView.classList.remove('hiding');
        } else {
            if (showImage) showImage.classList.add('hiding');
        }
    } catch (e) {
        // ignore
    }
}

// --- 💾 ACTION HANDLERS (SUBMITS) ---

// KYC Update
document.getElementById('Kycf1')?.addEventListener('submit', (ev) => safe(async () => {
    ev.preventDefault();
    showSpinnerModal();
    const { error } = await supabase.from('users').update({
        kyc: new FormData(ev.target).get('KYCapprovalStatus')
    }).eq('uuid', USERID);
    hideSpinnerModal();
    if (!error) {
        ev.target.reset(); // Realtime will refill
        Swal.fire({ title: "KYC Synced", icon: 'success', background: '#0C290F' });
    }
}));

// Card Update
document.getElementById('cardFom')?.addEventListener('submit', (ev) => safe(async () => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const debitCard = fd.get('debitCard');
    const cardNumber = debitCard && debitCard !== 'no' ? Math.floor(1000 + Math.random() * 9000) : null;

    showSpinnerModal();
    const { error } = await supabase.from('users').update({
        cards: debitCard,
        expireDate: fd.get('expireDate'),
        cardApproval: fd.get('cardApproval'),
        cardNumber: cardNumber
    }).eq('uuid', USERID);
    hideSpinnerModal();
    if (!error) {
        ev.target.reset();
        Swal.fire({ title: "Card Updated", icon: 'success', background: '#0C290F' });
    }
}));

// Personal Loan Update
document.getElementById('loanForm2')?.addEventListener('submit', (ev) => safe(async () => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const amount = Number(String(fd.get('loanAmount')).replace(/,/g, ''));
    const status = fd.get('loanApprovalStatus');

    showSpinnerModal();
    const { error } = await supabase.from('users').update({
        unsettledLoan: status ? amount : 0,
        loanType: status ? 'Personal' : '',
        loanAmount: status ? amount : 0,
        loanApprovalStatus: status || ''
    }).eq('uuid', USERID);
    hideSpinnerModal();
    if (!error) {
        ev.target.reset();
        Swal.fire({ title: "Personal Loan Synced", icon: 'success', background: '#0C290F' });
    }
}));

// Business Loan Update
document.getElementById('loanForm3')?.addEventListener('submit', (ev) => safe(async () => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const amount = Number(String(fd.get('loanAmount2')).replace(/,/g, ''));
    const status = fd.get('loanApprovalStatus2');

    showSpinnerModal();
    const { error } = await supabase.from('users').update({
        unsettledLoan: status ? amount : 0,
        loanType: status ? 'Business' : '',
        loanAmount: status ? amount : 0,
        loanApprovalStatus: status || ''
    }).eq('uuid', USERID);
    hideSpinnerModal();
    if (!error) {
        ev.target.reset();
        Swal.fire({ title: "Business Loan Synced", icon: 'success', background: '#0C290F' });
    }
}));

// Run
initApprovalsRealtime();