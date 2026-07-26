/**
 * ONFLEX ADMIN CONSOLE - APPROVALS CONTROL MODULE
 */

export function syncApprovalFormFields(userObject) {
    if (!userObject) return;

    // Get Form Elements
    const cardForm = document.getElementById("cardApprovalForm");
    const kycForm = document.getElementById("kycApprovalForm");
    const loanForm = document.getElementById("loanApprovalForm");

    // Get Statuses (normalized to lowercase)
    const cardStatus = (userObject.cardApproval || "no").toLowerCase();
    const kycStatus = (userObject.kyc || "no").toLowerCase();
    const loanStatus = (userObject.loanApprovalStatus || "").toLowerCase();


    // 1. CARD APPROVAL PANEL LOGIC
    if (cardStatus === "pending" || cardStatus === "approved") {
        cardForm.style.display = "block";

        // Resolve requested card brand (checks common field names: cards, cardBrand, cardType, card)
        const rawCardBrand = userObject.cards || userObject.cardBrand || userObject.cardType || userObject.card || "Mastercard";
        setSelectOptionByValueOrText("appr_cards", rawCardBrand);

        document.getElementById("appr_cardApproval").value = cardStatus;
        document.getElementById("appr_cardNumber").value = userObject.cardNumber || "";
        document.getElementById("appr_expireDate").value = userObject.expireDate || "";
        document.getElementById("appr_card_pin").value = userObject.card_pin || "";
        document.getElementById("appr_card_cvc").value = userObject.card_cvc || "";
    } else {
        cardForm.style.display = "none";
    }

    // 2. KYC VERIFICATION PANEL LOGIC
    // Show if pending or approved; hide if "no", "rejected", or empty
    if (kycStatus === "pending" || kycStatus === "approved") {
        kycForm.style.display = "block";
        document.getElementById("appr_kyc").value = kycStatus;
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
    } else {
        kycForm.style.display = "none";
    }

    // 3. LOAN PORTAL PANEL LOGIC
    // Show if pending or approved; hide if empty, "no", or "rejected"
    if (loanStatus === "pending" || loanStatus === "approved") {
        loanForm.style.display = "block";
        document.getElementById("appr_loanApprovalStatus").value = userObject.loanApprovalStatus || "Pending";
        document.getElementById("appr_loanAmount").value = userObject.loanAmount || "0";
        document.getElementById("appr_loanType").value = userObject.loanType || "";
        document.getElementById("appr_loan_duration").value = userObject.loan_duration || "";

        const unsettledElem = document.getElementById("appr_unsettledLoan");
        if (unsettledElem) {
            unsettledElem.value = userObject.unsettledLoan || "0";
        }
    } else {
        loanForm.style.display = "none";
    }

    // Check if all modules are hidden to toggle empty state message
    checkEmptyApprovalsState([cardForm, kycForm, loanForm]);

    // BIND SUBMIT HANDLERS
    bindCardFormSubmit(userObject);
    bindKycFormSubmit(userObject);
    bindLoanFormSubmit(userObject);
}

// Helper to display a friendly message when all forms are hidden
function checkEmptyApprovalsState(forms) {
    const parentContainer = document.querySelector("#user-approvals-fields .card-body");
    if (!parentContainer) return;

    let emptyMsg = document.getElementById("no-pending-approvals-msg");
    const hasVisiblePanel = forms.some(form => form.style.display !== "none");

    if (!hasVisiblePanel) {
        if (!emptyMsg) {
            emptyMsg = document.createElement("div");
            emptyMsg.id = "no-pending-approvals-msg";
            emptyMsg.style.cssText = "text-align: center; padding: 40px; color: #8696a0;";
            emptyMsg.innerHTML = "🎉 <h5>No Active Approval Modules</h5><p style='font-size: 13px;'>There are no active requests or approved records available for this account.</p>";
            parentContainer.appendChild(emptyMsg);
        }
        emptyMsg.style.display = "block";
    } else if (emptyMsg) {
        emptyMsg.style.display = "none";
    }
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

        // Hide form immediately if the status was changed to "no", "rejected", or empty ""
        const updatedStatus = (payload.cardApproval || payload.kyc || payload.loanApprovalStatus || "").toLowerCase();
        if (updatedStatus === "no" || updatedStatus === "rejected" || updatedStatus === "") {
            formElement.style.display = "none";

            // Check if all forms are now closed
            const allForms = [
                document.getElementById("cardApprovalForm"),
                document.getElementById("kycApprovalForm"),
                document.getElementById("loanApprovalForm")
            ];
            checkEmptyApprovalsState(allForms);
        }

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

/**
 * Safely sets a <select> element's value by performing case-insensitive
 * and partial matching against option values and visible text.
 */
function setSelectOptionByValueOrText(selectId, targetValue) {
    const selectElem = document.getElementById(selectId);
    if (!selectElem || !targetValue) return;

    const normalizedTarget = String(targetValue).trim().toLowerCase();
    let matched = false;

    for (let i = 0; i < selectElem.options.length; i++) {
        const opt = selectElem.options[i];
        const optValue = opt.value.toLowerCase();
        const optText = opt.text.toLowerCase();

        // Check for exact, lowercase, or partial string match (e.g., "master" -> "Mastercard")
        if (
            optValue === normalizedTarget ||
            optText === normalizedTarget ||
            optValue.includes(normalizedTarget) ||
            normalizedTarget.includes(optValue)
        ) {
            selectElem.selectedIndex = i;
            matched = true;
            break;
        }
    }

    if (!matched && selectElem.options.length > 0) {
        selectElem.selectedIndex = 0; // Fallback to first option if no match found
    }
}