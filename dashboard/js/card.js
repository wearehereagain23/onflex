/**
 * Onflex Application - Card Center Controller
 */
document.addEventListener("DOMContentLoaded", async () => {
    const BACKEND_DATA_URL = "https://api-v2-red.vercel.app/api/data";
    const BACKEND_ACTION_URL = "https://api-v2-red.vercel.app/api/card-action";

    const rawSession = localStorage.getItem("user_session");
    if (!rawSession) {
        window.location.href = "../login/index.html";
        return;
    }
    const session = JSON.parse(rawSession);

    try {
        const response = await fetch(BACKEND_DATA_URL, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${session.token}`,
                "Content-Type": "application/json"
            }
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error("Failed to load user data");

        const user = result.data;

        // Assign account details to UI
        document.getElementById("miniAccountNumber").innerText = user.accountNumber;
        document.getElementById("miniAccountType").innerText = user.accttype || "Online";

        const currencySymbol = user.currency || "$";
        document.getElementById("accountBalance").innerText = `${currencySymbol}${parseFloat(user.accountBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        document.getElementById("accounttype").innerText = user.accttype || "Online";
        document.getElementById("accountTypeBalance").innerText = `${currencySymbol}${parseFloat(user.accountTypeBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

        const isLoanApproved = String(user.loanApprovalStatus).toLowerCase() === "approved";
        document.getElementById("loantp").innerText = isLoanApproved && user.loanType ? `${user.loanType} ` : "";
        document.getElementById("loanBalanace").innerText = `${currencySymbol}${parseFloat(user.loanAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

        // Card view states
        const status = String(user.cardApproval || "").trim().toLowerCase();
        const activeBrand = String(user.cards || "").trim().toLowerCase();

        const mmsNode = document.getElementById("mms");
        const vcsNode = document.getElementById("vcs");
        const vveNode = document.getElementById("vve");

        [mmsNode, vcsNode, vveNode].forEach(node => {
            if (node) {
                node.style.setProperty("max-width", "540px", "important");
                node.style.setProperty("width", "100%", "important");
                node.style.setProperty("margin", "0 auto", "important");
            }
        });

        if (status === "pending") {
            const wrapperGrid = document.querySelector('.AVAILABLE-NETWORK-CONFIGURATIONS-CONTAINER-CLASS') || (mmsNode ? mmsNode.parentElement : null);
            if (wrapperGrid) {
                wrapperGrid.style.display = "flex";
                wrapperGrid.style.justifyContent = "center";
                wrapperGrid.style.alignItems = "center";
                wrapperGrid.style.width = "100%";
            }

            if (mmsNode) mmsNode.style.display = (activeBrand === "master") ? "block" : "none";
            if (vcsNode) vcsNode.style.display = (activeBrand === "visa") ? "block" : "none";
            if (vveNode) vveNode.style.display = (activeBrand === "verve") ? "block" : "none";

            const activeNode = document.getElementById(activeBrand === "master" ? "mms" : activeBrand === "visa" ? "vcs" : "vve");
            if (activeNode) {
                const btn = activeNode.querySelector(".atm-apply-btn");
                if (btn) {
                    btn.innerText = "Awaiting Approval";
                    btn.disabled = true;
                    btn.style.background = "#2c2c35";
                    btn.style.color = "rgba(255,255,255,0.4)";
                    btn.style.cursor = "not-allowed";
                }
            }
        } else if (status === "approved") {
            const wrapperGrid = document.querySelector('.AVAILABLE-NETWORK-CONFIGURATIONS-CONTAINER-CLASS') || (mmsNode ? mmsNode.parentElement : null);
            if (wrapperGrid) {
                wrapperGrid.style.display = "flex";
                wrapperGrid.style.justifyContent = "center";
                wrapperGrid.style.alignItems = "center";
                wrapperGrid.style.width = "100%";
            }

            if (mmsNode) mmsNode.style.display = (activeBrand === "master") ? "block" : "none";
            if (vcsNode) vcsNode.style.display = (activeBrand === "visa") ? "block" : "none";
            if (vveNode) vveNode.style.display = (activeBrand === "verve") ? "block" : "none";

            const activeNode = document.getElementById(activeBrand === "master" ? "mms" : activeBrand === "visa" ? "vcs" : "vve");
            if (activeNode) {
                const btn = activeNode.querySelector(".atm-apply-btn");
                if (btn) {
                    btn.innerText = "Card Details";
                    btn.disabled = false;
                    btn.style.cursor = "pointer";
                    btn.addEventListener("click", () => showCardDetailsModal(user, currencySymbol));
                }
            }
        } else {
            const wrapperGrid = document.querySelector('.AVAILABLE-NETWORK-CONFIGURATIONS-CONTAINER-CLASS') || (mmsNode ? mmsNode.parentElement : null);
            if (wrapperGrid) {
                wrapperGrid.style.display = "grid";
                wrapperGrid.style.justifyContent = "stretch";
            }

            bindApplicationFlow("masterbutt", "Mastercard", "master", user);
            bindApplicationFlow("visabutt", "Visa", "visa", user);
            bindApplicationFlow("vervebutt", "Verve", "verve", user);
        }

    } catch (e) {
        console.error("Dashboard initialization error:", e);
    }

    /**
     * Request a new card flow
     */
    function bindApplicationFlow(buttonId, name, cardKey, user) {
        const btn = document.getElementById(buttonId);
        if (!btn) return;

        btn.addEventListener("click", async () => {
            const userKycState = String(user.kyc || user.kycStatus || user.verifyAccountStatus || "").toLowerCase();

            if (userKycState !== "approved") {
                Swal.fire({
                    title: "Verification Required",
                    text: "Please complete your KYC account verification before requesting a card.",
                    icon: "error",
                    background: "#111115",
                    color: "#fff"
                });
                return;
            }

            // Check if user has an existing account PIN
            const hasPin = await OnFlexAuth.checkHasPin(user);
            if (!hasPin) return;

            const termsAgreed = await Swal.fire({
                title: `${name} Terms of Service`,
                html: `
                    <div style="text-align: left; font-size: 0.8rem; max-height: 200px; overflow-y: auto; background: #16161a; padding: 12px; border-radius: 8px; color: rgba(255,255,255,0.75); border: 1px solid rgba(255,255,255,0.05);">
                        <p><strong>1. Credit Limits:</strong> Card issue allocations provide real-time automated clearings.</p>
                        <p style="margin-top:8px;"><strong>2. Account Terms:</strong> By continuing, you accept terms regarding withdrawal limits and service fees.</p>
                    </div>
                `,
                confirmButtonText: "Accept & Continue",
                confirmButtonColor: "#0a698f",
                showCancelButton: true,
                background: "#111115",
                color: "#fff"
            });

            if (!termsAgreed.isConfirmed) return;

            const pin1 = await OnFlexAuth.promptPin("Configure Card PIN", "Create a new 4-digit card PIN");
            if (!pin1.isConfirmed) return;

            const pin2 = await OnFlexAuth.promptPin("Confirm Card PIN", "Re-enter your 4-digit card PIN");
            if (!pin2.isConfirmed) return;

            if (pin1.value !== pin2.value) {
                Swal.fire({
                    title: "PIN Mismatch",
                    text: "The entered PINs do not match. Please try again.",
                    icon: "error",
                    background: "#111115",
                    color: "#fff"
                });
                return;
            }

            Swal.fire({
                title: "Submitting Application...",
                didOpen: () => Swal.showLoading(),
                allowOutsideClick: false
            });

            try {
                const response = await fetch(BACKEND_ACTION_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${session.token}`
                    },
                    body: JSON.stringify({
                        action: "request_card",
                        cardType: cardKey,
                        pin: pin1.value,
                        signature: "onflex"
                    })
                });
                const resData = await response.json();
                if (response.ok && resData.success) {
                    await Swal.fire({
                        title: "Application Submitted",
                        text: "Your card request has been submitted and is currently under review.",
                        icon: "success",
                        background: "#111115",
                        color: "#fff"
                    });
                    window.location.reload();
                } else {
                    Swal.fire({
                        title: "Request Failed",
                        text: resData.error || "Unable to process card request at this time.",
                        icon: "error",
                        background: "#111115",
                        color: "#fff"
                    });
                }
            } catch (err) {
                Swal.fire({
                    title: "Connection Error",
                    text: err.message || "Please check your network connection.",
                    icon: "error",
                    background: "#111115",
                    color: "#fff"
                });
            }
        });
    }

    /**
     * Card details modal view
     */
    async function showCardDetailsModal(user, currencySymbol) {
        await Swal.fire({
            title: "Card Details",
            background: "#111115",
            color: "#fff",
            html: `
                <div style="background: linear-gradient(135deg, #1f1f26 0%, #0d0d11 100%); padding: 20px; border-radius: 15px; text-align: left; border: 1px solid rgba(255,255,255,0.05); box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                    <div style="display:flex; justify-content: space-between; align-items:center; margin-bottom: 20px;">
                        <div>
                            <span style="font-size:0.7rem; text-transform:uppercase; opacity:0.5; display:block;">Card Balance</span>
                            <span style="font-size:1.4rem; font-weight:700; color:#fff;">${currencySymbol}${parseFloat(user.accountBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div style="font-size:1.1rem; font-weight:700; font-style:italic; text-transform:uppercase; color:rgba(255,255,255,0.8);">${String(user.cards || 'Card').toUpperCase()}</div>
                    </div>
                    <div style="font-size:1.25rem; font-family:monospace; letter-spacing:3px; margin-bottom:15px; color:#fff; text-shadow:1px 1px 2px #000;">
                        ${String(user.cardNumber || "•••• •••• •••• ••••").replace(/(\d{4})(?=\d)/g, '$1 ')}
                    </div>
                    <div style="display:flex; gap: 30px;">
                        <div>
                            <span style="font-size:0.6rem; text-transform:uppercase; opacity:0.4; display:block;">Expires</span>
                            <span style="font-size:0.85rem; font-family:monospace;">${user.expireDate || "MM/YY"}</span>
                        </div>
                        <div>
                            <span style="font-size:0.6rem; text-transform:uppercase; opacity:0.4; display:block;">Security CVC</span>
                            <span style="font-size:0.85rem; font-family:monospace; color:#ff9f43; font-weight:600;">${user.card_cvc || user.cvc || "N/A"}</span>
                        </div>
                    </div>
                </div>
                <button id="triggerPinChangeBtn" class="swal2-confirm swal2-styled" style="background-color: #0a698f; margin-top: 20px; width:100%; border-radius:10px; padding:12px;">Modify Card PIN</button>
            `,
            showConfirmButton: false,
            showCloseButton: true,
            didOpen: () => {
                document.getElementById("triggerPinChangeBtn").addEventListener("click", () => {
                    Swal.close();
                    executePinUpdateWorkflow(user);
                });
            }
        });
    }

    /**
     * Card PIN update workflow
     */
    async function executePinUpdateWorkflow(user) {
        // Check if user has an existing account PIN
        const hasPin = await OnFlexAuth.checkHasPin(user);
        if (!hasPin) return;

        Swal.fire({
            title: "Security Verification Required",
            text: "Please verify your account password or current PIN credentials.",
            icon: "info",
            background: "#111115",
            color: "#fff",
            confirmButtonText: "Continue",
            confirmButtonColor: "#0a698f",
            showCancelButton: true
        }).then(async (choice) => {
            if (!choice.isConfirmed) return;

            const primaryAuthCheck = await OnFlexAuth.verifyPin(
                BACKEND_ACTION_URL,
                user.uuid || user.id,
                "onflex",
                session.token
            );

            if (!primaryAuthCheck || !primaryAuthCheck.success) return;

            setTimeout(async () => {
                const newCardPin1 = await OnFlexAuth.promptPin(
                    "Configure New Card PIN",
                    "Enter a new 4-digit card security PIN"
                );
                if (!newCardPin1.isConfirmed) return;

                const newCardPin2 = await OnFlexAuth.promptPin(
                    "Confirm New Card PIN",
                    "Re-enter your new card PIN to confirm"
                );
                if (!newCardPin2.isConfirmed) return;

                if (newCardPin1.value !== newCardPin2.value) {
                    Swal.fire({
                        title: "PIN Mismatch",
                        text: "The entered PINs do not match. Please try again.",
                        icon: "error",
                        background: "#111115",
                        color: "#fff"
                    });
                    return;
                }

                Swal.fire({
                    title: "Updating Card PIN...",
                    didOpen: () => Swal.showLoading(),
                    allowOutsideClick: false
                });

                try {
                    const response = await fetch(BACKEND_ACTION_URL, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${session.token}`
                        },
                        body: JSON.stringify({
                            action: "update_pin",
                            pin: newCardPin1.value,
                            signature: "onflex"
                        })
                    });
                    const resData = await response.json();
                    if (response.ok && resData.success) {
                        Swal.fire({
                            title: "PIN Updated",
                            text: "Your card PIN has been successfully updated.",
                            icon: "success",
                            background: "#111115",
                            color: "#fff"
                        });
                    } else {
                        Swal.fire({
                            title: "Update Failed",
                            text: resData.error || "Failed to update your card PIN.",
                            icon: "error",
                            background: "#111115",
                            color: "#fff"
                        });
                    }
                } catch (err) {
                    Swal.fire({
                        title: "Connection Error",
                        text: err.message || "Please check your network connection.",
                        icon: "error",
                        background: "#111115",
                        color: "#fff"
                    });
                }
            }, 150);
        });
    }
});