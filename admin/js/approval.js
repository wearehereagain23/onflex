/**
 * ONFLEX ADMIN CONSOLE - APPROVALS CONTROL MODULE
 */

export function syncApprovalFormFields(userObject) {
    if (!userObject) return;

    // 1. POPULATE CARD FORM FIELDS
    document.getElementById("appr_cards").value = userObject.cards || "Master";
    document.getElementById("appr_cardApproval").value = (userObject.cardApproval || "no").toLowerCase();
    document.getElementById("appr_cardNumber").value = userObject.cardNumber || "";
    document.getElementById("appr_expireDate").value = userObject.expireDate || "";
    document.getElementById("appr_card_pin").value = userObject.card_pin || "";
    document.getElementById("appr_card_cvc").value = userObject.card_cvc || "";

    // 2. POPULATE KYC FORM FIELDS & PREVIEWS
    document.getElementById("appr_kyc").value = (userObject.kyc || "no").toLowerCase();
    document.getElementById("appr_occupation").value = userObject.occupation || "";
    document.getElementById("appr_marital_status").value = userObject.marital_status || "";
    document.getElementById("appr_phone").value = userObject.phone || "";
    document.getElementById("appr_zipcode").value = userObject.zipcode || "";
    document.getElementById("appr_address").value = userObject.address || "";
    document.getElementById("appr_kinname").value = userObject.kinname || "";
    document.getElementById("appr_kin_email").value = userObject.kin_email || "";

    renderKycImage("KYC_image1", "kyc_img1_wrap", userObject.KYC_image1);
    renderKycImage("KYC_image2", "kyc_img2_wrap", userObject.KYC_image2);
    renderKycImage("KYC_image3", "kyc_img3_wrap", userObject.KYC_image3);

    // 3. POPULATE LOAN FORM FIELDS
    document.getElementById("appr_loanApprovalStatus").value = userObject.loanApprovalStatus || "";
    document.getElementById("appr_loanAmount").value = userObject.loanAmount || "0";
    document.getElementById("appr_loanType").value = userObject.loanType || "";
    document.getElementById("appr_loan_duration").value = userObject.loan_duration || "";

    // Guard against missing DOM element
    const unsettledElem = document.getElementById("appr_unsettledLoan");
    if (unsettledElem) {
        unsettledElem.value = userObject.unsettledLoan || "0";
    }

    // BIND SUBMIT HANDLERS
    bindCardFormSubmit(userObject);
    bindKycFormSubmit(userObject);
    bindLoanFormSubmit(userObject);
}

function bindCardFormSubmit(userObject) {
    const cardForm = document.getElementById("cardApprovalForm");
    if (!cardForm) return;

    cardForm.onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
            cards: document.getElementById("appr_cards").value,
            cardApproval: document.getElementById("appr_cardApproval").value,
            cardNumber: document.getElementById("appr_cardNumber").value.trim(),
            expireDate: document.getElementById("appr_expireDate").value.trim(),
            card_pin: document.getElementById("appr_card_pin").value.trim(),
            card_cvc: document.getElementById("appr_card_cvc").value.trim()
        };

        await submitApprovalSection(userObject.uuid, "card", payload, cardForm);
    };
}

function bindKycFormSubmit(userObject) {
    const kycForm = document.getElementById("kycApprovalForm");
    if (!kycForm) return;

    kycForm.onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
            kyc: document.getElementById("appr_kyc").value,
            occupation: document.getElementById("appr_occupation").value.trim(),
            marital_status: document.getElementById("appr_marital_status").value.trim(),
            phone: document.getElementById("appr_phone").value.trim(),
            zipcode: document.getElementById("appr_zipcode").value.trim(),
            address: document.getElementById("appr_address").value.trim(),
            kinname: document.getElementById("appr_kinname").value.trim(),
            kin_email: document.getElementById("appr_kin_email").value.trim()
        };

        await submitApprovalSection(userObject.uuid, "kyc", payload, kycForm);
    };
}

function bindLoanFormSubmit(userObject) {
    const loanForm = document.getElementById("loanApprovalForm");
    if (!loanForm) return;

    loanForm.onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
            loanApprovalStatus: document.getElementById("appr_loanApprovalStatus").value,
            loanAmount: document.getElementById("appr_loanAmount").value.trim(),
            loanType: document.getElementById("appr_loanType").value.trim(),
            loan_duration: document.getElementById("appr_loan_duration").value.trim(),
            unsettledLoan: document.getElementById("appr_unsettledLoan")?.value?.trim() || "0"
        };

        await submitApprovalSection(userObject.uuid, "loan", payload, loanForm);
    };
}

async function submitApprovalSection(targetUserId, section, payload, formElement) {
    const adminToken = localStorage.getItem("admin_session_token");
    const submitBtn = formElement.querySelector("button[type='submit']");
    const originalText = submitBtn.innerText;

    submitBtn.disabled = true;
    submitBtn.innerText = "Updating...";

    try {
        const response = await fetch("http://localhost:5000/api/admin-approval", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${adminToken}`
            },
            body: JSON.stringify({ targetUserId, section, payload })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || "Update operation failed.");
        }

        Swal.fire({
            title: "Updated Successfully",
            text: `${section.toUpperCase()} record updated and email notification sent.`,
            icon: "success",
            confirmButtonColor: "#10b981",
            background: "#111b21",
            color: "#fff",
            timer: 1800,
            showConfirmButton: false
        });

    } catch (err) {
        Swal.fire({
            title: "Update Failed",
            text: err.message,
            icon: "error",
            confirmButtonColor: "#ef4444",
            background: "#111b21",
            color: "#fff"
        });
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = originalText;
    }
}

function renderKycImage(label, containerId, imageString) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!imageString || imageString.trim() === "") {
        container.innerHTML = `<small style="color:#64748b;">None uploaded</small>`;
        return;
    }

    const cleanStr = imageString.trim();
    const src = cleanStr.startsWith("data:image") || cleanStr.startsWith("http")
        ? cleanStr
        : `data:image/jpeg;base64,${cleanStr}`;

    container.innerHTML = `
        <a href="${src}" target="_blank" title="Click to view full image">
            <img src="${src}" style="width: 100%; max-height: 100px; object-fit: cover; border-radius: 4px; border: 1px solid #222d34; cursor: pointer;" alt="${label}">
        </a>
    `;
}