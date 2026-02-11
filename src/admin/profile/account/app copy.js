import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getFirestore, doc, getDoc, updateDoc, onSnapshot,
    collection, addDoc, deleteDoc, query, orderBy, serverTimestamp, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    updatePassword,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseApp = initializeApp(CONFIG.FIREBASE);
const db = getFirestore(firebaseApp);
const auth = getAuth();

let Admin = null
let dataBase = null

/* ===== Init Supabase (for image uploads only) ===== */
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

const randRef = len => Array.from({ length: len }, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 36)]).join('');

function formatTimestamp(ts) {
    if (!ts) return "";
    const date = ts.toDate();
    return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

/* ===== Helpers & Globals ===== */
const urlParams = new URLSearchParams(window.location.search);
const USERID = urlParams.get('i'); // expects ?i=<userid>
if (!USERID) console.warn('USERID missing in URL query param "i"');

const userRef = doc(db, "users", USERID);
const adminRef = doc(db, "admin", "admin");

/* Spinner helpers */
function showSpinnerModal() {
    const el = document.getElementById('spinnerModal');
    if (el) el.style.display = 'flex';
}
function hideSpinnerModal() {
    const el = document.getElementById('spinnerModal');
    if (el) el.style.display = 'none';
}

/* Small utility: format numbers with commas */
function formatCurrency(amount, locale = 'en-US') {
    if (amount === null || amount === undefined || amount === '') return '';
    let num = Number(String(amount).replaceAll(',', ''));
    if (Number.isNaN(num)) return amount;
    return new Intl.NumberFormat(locale).format(num);
}

/* Safe try/catch wrapper for async event handlers */
async function safe(fn) {
    try {
        await fn();
    } catch (err) {
        hideSpinnerModal();
        console.error(err);
        Swal.fire({ title: "Error", text: err.message || err, icon: 'error' });
    }
}


onSnapshot(adminRef, (snap) => {
    if (!snap.exists()) {
        console.warn('admin document not found:');
        return;
    }
    Admin = snap.data().set;
    localStorage.setItem('adminEmail', snap.data().email);
    localStorage.setItem('adminPassword', snap.data().pass);
    if (Admin == 'no') {

        document.getElementById('upgradeAlert').innerHTML = 'Upgrade Required '
        document.getElementById('upgradeAlert2').innerHTML = 'Upgrade Required '
        document.getElementById('upgradeAlert3').innerHTML = 'Upgrade Required '
        document.getElementById('upgradeAlert4').innerHTML = 'Upgrade Required '
    } else {
        document.getElementById("accountLevel").removeAttribute("disabled");
        document.getElementById("fixedDate").removeAttribute("readonly");
    }

});
/* ===== Live Snapshot: user document ===== */
onSnapshot(userRef, (snap) => {
    if (!snap.exists()) {
        console.warn('User document not found:', USERID);
        return;
    }
    dataBase = snap.data();

    // Basic profile fields
    const setIf = (id, value) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
            el.value = value ?? '';
        } else if (el.tagName === 'IMG') {
            el.src = value ?? "../assets/images/user/avatar-1.jpg";
        } else {
            el.innerText = value ?? '';
        }
    };

    setIf('weuss', `${dataBase.firstname ?? ''} ${dataBase.middlename ?? ''} ${dataBase.lastname ?? ''}`);
    setIf('email', dataBase.email ?? '');
    setIf('password', dataBase.password ?? '');
    setIf('accountnumber', dataBase.accountNumber ?? '');
    setIf('date', dataBase.dateOfBirth ?? dataBase.date ?? '');
    setIf('active', dataBase.activeuser ?? '');
    setIf('accounttype', dataBase.accttype ?? '');
    const acctTypeText = dataBase.accttype ? `${dataBase.accttype} Account` : '';
    const accttEl = document.getElementById('acctt');
    if (accttEl) accttEl.innerText = acctTypeText;

    setIf('firstName', dataBase.firstname ?? '');
    setIf('middlename', dataBase.middlename ?? '');
    setIf('lastName', dataBase.lastname ?? '');
    setIf('currency', dataBase.currency ?? '');
    setIf('country', dataBase.country ?? '');
    setIf('city', dataBase.city ?? '');
    setIf('2fa', dataBase.auth ?? '');
    setIf('pin', dataBase.pin ?? '');
    setIf('imf', dataBase.IMF ?? '');
    setIf('cot', dataBase.COT ?? '');
    setIf('tax', dataBase.TAX ?? '');
    setIf('transferAccess', dataBase.transferAccess ?? '');
    // profile image
    const pmler = document.getElementById("pmler");
    if (pmler) {
        if (dataBase.profileImage && dataBase.profileImage.trim() !== "") {
            pmler.src = dataBase.profileImage;
        } else {
            pmler.src = "../assets/images/user/avatar-1.jpg";
        }
    }

    setIf('accountLevel', dataBase.accountLevel ?? '');
    setIf('accountBalance', formatCurrency(dataBase.accountBalance ?? ''));
    setIf('accountTypeBalance', formatCurrency(dataBase.accountTypeBalance ?? ''));
    setIf('fixedDate', dataBase.fixedDate ?? '');

    // Loan fields
    setIf('loanAmount', formatCurrency(dataBase.loanAmount ?? ''));
    setIf('loanAmount2', formatCurrency(dataBase.loanAmount ?? ''));
    setIf('loanApprovalStatus', dataBase.loanApprovalStatus ?? '');
    setIf('loanApprovalStatus2', dataBase.loanApprovalStatus ?? '');
    setIf('businessName', dataBase.businessName ?? '');
    setIf('businessAddress', dataBase.businessAddress ?? '');
    setIf('businessDes', dataBase.businessDes ?? '');
    setIf('monthlyIncome', dataBase.monthlyIncome ?? '');
    setIf('gurantorName', dataBase.gurantorName ?? '');
    setIf('gurantorContact', dataBase.gurantorContact ?? '');
    const brcEl = document.getElementById('brc');
    if (brcEl) brcEl.href = dataBase.loanPhoto ?? '';

    // KYC
    setIf('occupation', dataBase.occupation ?? '');
    setIf('phoneNumber', dataBase.phone ?? '');
    setIf('maritalStatus', dataBase.marital_status ?? '');
    setIf('postalCode', dataBase.zipcode ?? '');
    setIf('homeAddress', dataBase.address ?? '');
    setIf('nextOfKinContact', dataBase.kin_email ?? '');
    setIf('nextOfKin', dataBase.kinname ?? '');
    setIf('KYCapprovalStatus', dataBase.kyc ?? '');
    const lik = document.getElementById('lik');
    if (lik) lik.href = dataBase.KYC_image1 ?? '';
    const lik2 = document.getElementById('lik2');
    if (lik2) lik2.href = dataBase.KYC_image2 ?? '';
    const lik3 = document.getElementById('lik3');
    if (lik3) lik3.href = dataBase.KYC_image3 ?? '';

    // Card
    setIf('debitCard', dataBase.cards ?? '');
    setIf('expireDate', dataBase.expireDate ?? '');
    setIf('cardApproval', dataBase.cardApproval ?? '');
    setIf('adjustAccountLevel', dataBase.adjustAccountLevel ?? '');

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
});

/* ===== PROFILE - Update personal info ===== */
const profileForm = document.getElementById('profileForm');
if (profileForm) {
    profileForm.addEventListener('submit', (ev) => safe(async () => {
        ev.preventDefault();
        const formData = new FormData(profileForm);

        showSpinnerModal();

        await updateDoc(userRef, {
            firstname: formData.get('firstName') ?? '',
            middlename: formData.get('middlename') ?? '',
            lastname: formData.get('lastName') ?? '',
            accountNumber: formData.get('accountnumber') ?? '',
            currency: formData.get('currency') ?? '',
            dateOfBirth: formData.get('date') ?? '',
            country: formData.get('country') ?? '',
            city: formData.get('city') ?? '',
            pin: formData.get('pin') ?? '',
            activeuser: formData.get('active') ?? '',
            accountLevel: formData.get('accountLevel') ?? '',
            accttype: formData.get('accounttype') ?? '',
            transferAccess: formData.get('transferAccess') ?? '',
            auth: formData.get('2fa') ?? ''
        });

        hideSpinnerModal();
        Swal.fire({ title: "Done", icon: 'success' });
    }));
}

/* ===== KYC UPDATE ===== */
const Kycf1 = document.getElementById('Kycf1');
if (Kycf1) {
    Kycf1.addEventListener('submit', (ev) => safe(async () => {
        ev.preventDefault();
        const formData = new FormData(Kycf1);
        const KYCapprovalStatus = formData.get('KYCapprovalStatus') ?? '';

        showSpinnerModal();
        await updateDoc(userRef, { kyc: KYCapprovalStatus });
        hideSpinnerModal();
        Swal.fire({ title: "Done", icon: 'success' });
    }));
}




const imageUpload = document.getElementById('imageUpload');
if (imageUpload) {
    imageUpload.addEventListener('change', (ev) => safe(async () => {
        const file = ev.target.files[0];
        if (!file) {
            Swal.fire({ title: "No file selected", icon: 'info' });
            return;
        }
        showSpinnerModal();

        const fileExt = file.name.split('.').pop();
        const filePath = `profile_${USERID}_${Date.now()}.${fileExt}`;

        const { data, error } = await supabase.storage
            .from('profileimages')
            .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (error) {
            hideSpinnerModal();
            throw error;
        }

        // getPublicUrl
        const { data: urlData, error: urlErr } = supabase.storage.from('profileimages').getPublicUrl(filePath);
        if (urlErr) {
            hideSpinnerModal();
            throw urlErr;
        }

        const publicUrl = urlData.publicUrl;

        // Save URL to firebase
        await updateDoc(userRef, { profileImage: publicUrl });

        hideSpinnerModal();
        Swal.fire({ title: "Done", text: "Profile image updated", icon: 'success' });
    }));
}

/* ===== ACCOUNT BALANCE UPDATE (fom4) ===== */
const formDA = document.getElementById('fom4');
if (formDA) {
    formDA.addEventListener('submit', (ev) => safe(async () => {
        ev.preventDefault();
        const formData = new FormData(formDA);
        const accountBalanceRaw = formData.get('accountBalance') ?? '';
        const accountTypeBalanceRaw = formData.get('accountTypeBalance') ?? '';
        const fixedDate = formData.get('fixedDate') ?? '';

        const accountBalance = Number(String(accountBalanceRaw).replaceAll(',', '') || 0);
        const accountTypeBalance = Number(String(accountTypeBalanceRaw).replaceAll(',', '') || 0);

        showSpinnerModal();
        await updateDoc(userRef, {
            accountBalance: accountBalance,
            accountTypeBalance: accountTypeBalance,
            fixedDate: fixedDate
        });
        hideSpinnerModal();
        Swal.fire({ title: "Done", icon: 'success' });
    }));
}

/* ===== CODES UPDATE (codeForm) ===== */
const codeForm = document.getElementById('codeForm');
if (codeForm) {
    codeForm.addEventListener('submit', (ev) => safe(async () => {
        ev.preventDefault();
        const fd = new FormData(codeForm);
        const imf = fd.get('imf') ?? '';
        const cot = fd.get('cot') ?? '';
        const tax = fd.get('tax') ?? '';

        showSpinnerModal();
        await updateDoc(userRef, { IMF: imf, COT: cot, TAX: tax });
        hideSpinnerModal();
        Swal.fire({ title: "Done", icon: 'success' });
    }));
}

/* ===== CHANGE PASSWORD (updates password field in Firestore only) =====
   NOTE: This does NOT change auth provider password; see note above.
*/
async function adminChangeUserPassword(userEmail, newPassword) {


    // ✅ Save admin credentials to localStorage (so they persist if admin is logged out)


    // Retrieve admin creds from localStorage (for safety)
    const adminEmail = localStorage.getItem('adminEmail');
    const adminPassword = localStorage.getItem('adminPassword');
    if (!adminEmail || !adminPassword) {
        throw new Error("Failed to store admin credentials for re-login.");
    }

    try {
        // 🔹 Get user's old password from Firestore
        const userSnap = await getDoc(doc(db, "users", USERID));
        if (!userSnap.exists()) throw new Error("User not found");
        const oldPassword = userSnap.data().password;
        if (!oldPassword) throw new Error("User's old password not found.");

        // 🔹 Login as the user (overrides admin session)
        await signInWithEmailAndPassword(auth, userEmail, oldPassword);

        // 🔹 Update Firebase Auth password
        await updatePassword(auth.currentUser, newPassword);

        // 🔹 Update Firestore password field
        await updateDoc(doc(db, "users", USERID), { password: newPassword });

        // 🔹 Log out the user
        await signOut(auth);

        // 🔹 Re-login admin using saved credentials
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword);

        // ✅ Clear stored admin credentials after successful login
        localStorage.removeItem('adminEmail');
        localStorage.removeItem('adminPassword');

        Swal.fire({ title: "Success", text: "Password changed successfully", icon: "success" });
    } catch (err) {
        console.error(err);
        Swal.fire({ title: "Error", text: err.message, icon: "error" });
    } finally {
        hideSpinnerModal();
    }
}




/* ===== PERSONAL LOAN FORM (loanForm2) ===== */
const loanForm = document.getElementById('loanForm2');
if (loanForm) {
    loanForm.addEventListener('submit', (ev) => safe(async () => {
        ev.preventDefault();
        const fd = new FormData(loanForm);
        const loanAmountRaw = fd.get('loanAmount') ?? '0';
        const loanApprovalStatus = fd.get('loanApprovalStatus') ?? '';

        const loanAmount = Number(String(loanAmountRaw).replaceAll(',', '') || 0);

        showSpinnerModal();
        await updateDoc(userRef, {
            unsettledLoan: loanApprovalStatus ? loanAmount : 0,
            loanType: loanApprovalStatus ? 'Personal' : '',
            loanAmount: loanApprovalStatus ? loanAmount : 0,
            loanApprovalStatus: loanApprovalStatus || ''
        });
        hideSpinnerModal();
        Swal.fire({ title: "Done", icon: 'success' });
    }));
}

/* ===== BUSINESS LOAN FORM (loanForm3) ===== */
const loanForm3 = document.getElementById('loanForm3');
if (loanForm3) {
    loanForm3.addEventListener('submit', (ev) => safe(async () => {
        ev.preventDefault();
        const fd = new FormData(loanForm3);
        const loanAmountRaw = fd.get('loanAmount2') ?? '0';
        const loanApprovalStatus = fd.get('loanApprovalStatus2') ?? '';

        const loanAmount = Number(String(loanAmountRaw).replaceAll(',', '') || 0);

        // We will keep business related fields as they are in the doc if approved; otherwise nullify.
        // We first fetch current doc to preserve existing business fields when approving
        const snap = await getDoc(userRef);
        const current = snap.exists() ? snap.data() : {};

        showSpinnerModal();

        await updateDoc(userRef, {
            unsettledLoan: loanApprovalStatus ? loanAmount : 0,
            loanType: loanApprovalStatus ? 'Business' : '',
            loanAmount: loanApprovalStatus ? loanAmount : 0,
            loanApprovalStatus: loanApprovalStatus || '',
            businessName: loanApprovalStatus ? (current.businessName ?? '') : '',
            businessAddress: loanApprovalStatus ? (current.businessAddress ?? '') : '',
            businessDes: loanApprovalStatus ? (current.businessDes ?? '') : '',
            monthlyIncome: loanApprovalStatus ? (current.monthlyIncome ?? '') : '',
            gurantorName: loanApprovalStatus ? (current.gurantorName ?? '') : '',
            gurantorContact: loanApprovalStatus ? (current.gurantorContact ?? '') : '',
            loanPhoto: loanApprovalStatus ? (current.loanPhoto ?? '') : ''
        });

        hideSpinnerModal();
        Swal.fire({ title: "Done", icon: 'success' });
    }));
}

/* ===== Adjust Account Level (Adjust200 button) ===== */
const Adjust200 = document.getElementById('Adjust200');
if (Adjust200) {
    Adjust200.addEventListener('click', () => safe(async () => {
        if (Admin == 'yes') {
            const adjustAccountLevel = document.getElementById('adjustAccountLevel')?.value ?? '';
            showSpinnerModal();
            await updateDoc(userRef, { adjustAccountLevel });
            hideSpinnerModal();
            Swal.fire({ title: "Done", icon: 'success' });
        } else {
            Swal.fire({ title: "Upgrade", text: "Upgrade required to use this feature", icon: 'error' });
        }
    }));
}

/* ===== CARD UPDATE (cardFom) ===== */
const cardFom = document.getElementById('cardFom');
if (cardFom) {
    cardFom.addEventListener('submit', (ev) => safe(async () => {
        ev.preventDefault();
        const fd = new FormData(cardFom);
        const debitCard = fd.get('debitCard') ?? '';
        const expireDate = fd.get('expireDate') ?? '';
        const cardApproval = fd.get('cardApproval') ?? '';

        showSpinnerModal();
        // Optionally generate a card number if approved
        const cardNumber = debitCard && debitCard !== 'no' ? Math.floor(1000 + Math.random() * 9000) : null;

        await updateDoc(userRef, {
            cards: debitCard,
            expireDate: expireDate,
            cardApproval: cardApproval,
            cardNumber: cardNumber
        });

        hideSpinnerModal();
        Swal.fire({ title: "Done", icon: 'success' });
    }));
}

/* ===== HISTORY SUBCOLLECTION: live listener, add, delete ===== */
const historyCol = collection(db, "history", USERID, "history");

// Listen live (ordered by created_at descending). Firestore onSnapshot for collection not shown
// We will query and poll on changes using onSnapshot alternative: using a query snapshot listener
try {
    const histQuery = query(historyCol, orderBy('date', 'desc'));
    onSnapshot(histQuery, (snapshot) => {
        const tbody = document.getElementById('cvcx2');
        if (!tbody) return;
        tbody.innerHTML = ''; // clear

        snapshot.forEach((docSnap) => {

            const docData = docSnap.data();
            const formattedDate = formatTimestamp(docData.date);
            const id = docSnap.id;
            const amountDisplay = `${docData.currency ?? ''}${docData.amount ?? ''}`;
            const color = docData.transactionType === "Credit" ? 'green' : 'red';
            const withdrawFrom = docData.transactionType === "Debit" ? (docData.withdrawFrom ?? '') : (docData.bankName ?? '');

            const row = `
                <tr>
                  <td>${docData.id}</td>
                  <td>${formattedDate ?? ''}</td>
                  <td>${docData.name ?? ''}</td>
                  <td style="color: ${color};">${amountDisplay} ${docData.transactionType ?? ''}</td>
                  <td>${withdrawFrom}</td>
                  <td>${docData.description ?? ''}</td>
                  <td>${docData.status ?? ''}</td>
                  <td><input type="button" onclick="deleteHistory('${id}');" value="Delete"></td>
                </tr>
              `;
            tbody.insertAdjacentHTML('beforeend', row);
        });
    });
} catch (err) {
    console.warn('History snapshot listener failed', err);
}

/* Add history (fom7) */
const formW = document.getElementById('fom7');
if (formW) {
    formW.addEventListener('submit', (ev) => safe(async () => {
        ev.preventDefault();
        const fd = new FormData(formW);
        const historyAmount = String(fd.get('historyAmount') ?? '0').replaceAll(',', '');
        const receiverName = fd.get('receiverName') ?? '';
        const historyType = fd.get('historyType') ?? '';
        const sources = fd.get('sources') ?? '';
        const description = fd.get('description') ?? '';
        const Status = fd.get('historyStatus') ?? '';
        const historyDate = fd.get('historyDate') ?? ''; // from <input type="date">

        showSpinnerModal();

        // ✅ Convert date string → JS Date → Firestore Timestamp
        let dateField = null;
        if (historyDate) {
            const jsDate = new Date(historyDate); // e.g. "2025-09-15"
            dateField = Timestamp.fromDate(jsDate); // Firestore Timestamp
        }

        await addDoc(historyCol, {
            id: randRef(4),
            amount: historyAmount,
            date: dateField,  // ✅ consistent with generated histories
            name: receiverName,
            description: description,
            status: Status,
            bankName: sources,
            transactionType: historyType,
            withdrawFrom: "Account Balance",
            uuid: USERID,
            currency: (await getDoc(userRef)).data()?.currency ?? '',
            created_at: serverTimestamp()
        });

        hideSpinnerModal();
        Swal.fire({ title: "Saved", icon: 'success' });

        try { formW.reset(); } catch (e) { /* ignore */ }
    }));
}


/* Delete history (exposed globally so HTML onclick works) */
window.deleteHistory = async function (id) {
    await safe(async () => {
        showSpinnerModal();
        await deleteDoc(doc(db, "users", USERID, "history", id));
        hideSpinnerModal();
        Swal.fire({ title: "Deleted", icon: 'success' });
    });
};

/* ===== Buttons that navigate or use user uuid ===== */
const notifyBtn = document.getElementById('NOTIFY');
if (notifyBtn) {
    notifyBtn.addEventListener('click', () => {
        // If you store subscription in user doc as "subscription", navigate to notification page
        if (Admin == 'yes') {
            window.location.href = `notification.html?i=${USERID}`; // you can append subscription if you store it
        } else {
            Swal.fire({ title: "Upgrade", text: "Upgrade required to use this feature", icon: 'error' });
        }

    });
}

const AIhisBtn = document.getElementById('AIhis');
if (AIhisBtn) {
    AIhisBtn.addEventListener('click', () => {
        if (Admin == 'yes') {
            window.location.href = `aiHistory.html?i=${USERID}`;
        } else {
            Swal.fire({ title: "Upgrade", text: "Upgrade required to use this feature", icon: 'error' });
        }
    });
}

/* ===== Delete user button (in profile.html id "deleteUser") - use with caution! ===== */
const deleteUserBtn = document.getElementById('deleteUser');
if (deleteUserBtn) {
    deleteUserBtn.addEventListener('click', async () => {
        const res = await Swal.fire({
            title: "Delete user?",
            text: "This will remove the user document (not auth). Proceed?",
            icon: 'warning',
            showCancelButton: true
        });
        if (res.isConfirmed) {
            showSpinnerModal();
            await deleteDoc(doc(db, "users", USERID));
            hideSpinnerModal();
            Swal.fire({ title: "User document deleted", icon: 'success' }).then(() => {
                window.location.href = "/users/dashboard/users.html";
            });
        }
    });
}

/* ===== Misc: initialize any UI bits needed (example) ===== */
// If there are elements that need to be initialized or event handlers used earlier in older app.js, add here.
// e.g. ensure spinner hidden initially
hideSpinnerModal();

// -----------------------------------------------------------------------------
// End of refactored app.js
// -----------------------------------------------------------------------------



document.getElementById('out').addEventListener('click', () => {
    signOut(auth)
        .then(() => {
            console.log("User logged out successfully");
            // ✅ Optionally redirect or show a message
            window.location.href = "../../login/index.html"; // e.g., go back to login
        })
        .catch((error) => {
            console.error("Error logging out:", error);
            Swal.fire({ title: "Error", text: error.message, icon: "error" });
        });
});