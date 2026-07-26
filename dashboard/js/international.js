document.addEventListener("DOMContentLoaded", async () => {
    const BACKEND_DATA_URL = "http://localhost:5000/api/data";
    const BACKEND_TRANSFER_URL = "http://localhost:5000/api/international";
    const GLOBAL_PIN_URL = "http://localhost:5000/api/card-action";

    const rawSession = localStorage.getItem("user_session");
    if (!rawSession) { window.location.href = "../login/index.html"; return; }
    const session = JSON.parse(rawSession);

    const transferForm = document.getElementById("ffm");
    const balanceSelect = document.getElementById("withdrawFrom");
    const amountInput = document.getElementById("amount");
    const currencySelect = document.getElementById("currency");
    const descriptionInput = document.getElementById("home_address");

    const receiversNameInput = document.getElementById("receiversName");
    const receiverAccountNumberInput = document.getElementById("receiverAccountNumber");
    const receiverBankNameInput = document.getElementById("receiverBankName");
    const receiverSwiftCodeInput = document.getElementById("receiverSwiftCode");
    const receiverIBANumberInput = document.getElementById("receiverIBANumber");

    const mainBalanceHero = document.getElementById("accountBalance");
    const typeBalanceHero = document.getElementById("accountTypeBalance");
    const loanBalanceHero = document.getElementById("loanBalanace");
    const profileName = document.getElementById("profileName");
    const loanTypeLabel = document.getElementById("loanTypeLabel");
    const accountLevel = document.getElementById("accountLevel");
    const accountLevel2 = document.getElementById("accountLevel2");

    let cachedUserRecord = null;

    async function populateDashboard() {
        try {
            const res = await fetch(BACKEND_DATA_URL, { headers: { "Authorization": `Bearer ${session.token}` } });
            const data = await res.json();
            if (data.success) {
                cachedUserRecord = data.data;
                const u = cachedUserRecord;
                const s = u.currency || "$";
                if (mainBalanceHero) mainBalanceHero.innerText = `${s}${parseFloat(u.accountBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                if (typeBalanceHero) typeBalanceHero.innerText = `${s}${parseFloat(u.accountTypeBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                if (loanBalanceHero) loanBalanceHero.innerText = `${s}${parseFloat(u.loanAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                if (profileName) profileName.innerText = `${u.firstname || ""} ${u.lastname || ""}`;
                if (profileAccount) profileAccount.innerText = user.accountNumber || "Unavailable";
                if (accountLevel) accountLevel.innerText = user.tiers;
                if (accountLevel2) accountLevel2.innerText = user.tiers;
                if (loanTypeLabel) {
                    loanTypeLabel.innerText = u.loanApprovalStatus === "Approved" ? "Active " : "Pending ";
                }
            }
        } catch (e) {
            console.error(e);
        }
    }
    await populateDashboard();

    if (transferForm) {
        transferForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const hasPin = await OnFlexAuth.checkHasPin(cachedUserRecord);
            if (!hasPin) return;

            const kycStatus = (cachedUserRecord?.kyc || "").toLowerCase().trim();
            if (kycStatus !== "approved") {
                return Swal.fire({
                    title: "Verification Required",
                    text: "Please complete your account verification (KYC) before sending an international transfer.",
                    icon: "warning",
                    background: "#111115",
                    color: "#fff",
                    confirmButtonColor: "#0a698f"
                });
            }

            const selectedValue = (balanceSelect.value || "").toLowerCase().trim();
            let dbColumn = "accountBalance";

            if (selectedValue.includes("savings")) {
                dbColumn = "accountTypeBalance";
            } else if (selectedValue.includes("credit") || selectedValue.includes("loan")) {
                dbColumn = "loanAmount";
            }

            if (dbColumn === "accountTypeBalance" && cachedUserRecord?.fixedDate) {
                return Swal.fire({
                    title: "Funds Locked",
                    text: "This account balance is currently locked under fixed-term conditions.",
                    icon: "warning",
                    background: "#111115",
                    color: "#fff",
                    confirmButtonColor: "#0a698f"
                });
            }

            if (dbColumn === "loanAmount" && cachedUserRecord?.loanApprovalStatus !== "Approved") {
                return Swal.fire({
                    title: "Funds Unavailable",
                    text: "Your loan application is still under review and cannot be transferred at this time.",
                    icon: "error",
                    background: "#111115",
                    color: "#fff",
                    confirmButtonColor: "#0a698f"
                });
            }

            const typedAmount = parseFloat(amountInput.value) || 0;
            const availableFunds = parseFloat(cachedUserRecord[dbColumn] || 0);
            const userSymbol = cachedUserRecord.currency || "$";
            const selectedTargetCurrency = currencySelect.value;

            if (typedAmount <= 0) {
                return Swal.fire({
                    title: "Invalid Amount",
                    text: "Please enter a transfer amount greater than zero.",
                    icon: "warning",
                    background: "#111115",
                    color: "#fff",
                    confirmButtonColor: "#0a698f"
                });
            }
            if (typedAmount > availableFunds) {
                return Swal.fire({
                    title: "Insufficient Balance",
                    text: "You do not have enough funds available to complete this transfer.",
                    icon: "error",
                    background: "#111115",
                    color: "#fff",
                    confirmButtonColor: "#0a698f"
                });
            }

            const terms = await Swal.fire({
                title: "International Wire Transfer Agreement",
                html: `<div style="text-align:left; font-size:13px; line-height:1.6; color:#bbb; border:1px solid #222; padding:15px; border-radius:8px; background:#0b0b0f;">
        <p><strong>1. Processing Time:</strong> International transfers are processed via SWIFT and typically take 24 to 72 business hours to arrive.</p>
        <p><strong>2. Compliance & Verification:</strong> All transactions are monitored in accordance with regulatory requirements and Anti-Money Laundering (AML) standards.</p>
        <p><strong>3. Irrevocability:</strong> Once a transfer enters final processing, it cannot be canceled or modified.</p>
        <p><strong>4. Exchange Rates:</strong> Final amounts received may vary slightly due to real-time exchange rates and intermediary banking fees.</p>
        <p><strong>5. Accuracy:</strong> Please ensure all beneficiary, SWIFT code, and account details are accurate before confirming.</p>
                </div>`,
                showCancelButton: true,
                background: "#111115", color: "#fff", confirmButtonColor: "#0a698f",
                confirmButtonText: "Accept & Continue",
                cancelButtonText: "Cancel"
            });
            if (!terms.isConfirmed) return;

            const sourceIso = typeof getIsoCode === 'function' ? getIsoCode(userSymbol) : "USD";
            const targetIso = typeof getIsoCode === 'function' ? getIsoCode(selectedTargetCurrency) : "USD";
            const isSameCurrency = (sourceIso === targetIso);
            let exchangeRate = 1.0;
            let convertedAmount = typedAmount;

            if (!isSameCurrency) {
                Swal.fire({
                    title: 'Calculating Conversion...',
                    text: 'Fetching live exchange rates...',
                    background: "#111115",
                    color: "#fff",
                    confirmButtonColor: "#0a698f",
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });
                try {
                    const rateRes = await fetch(`https://open.er-api.com/v6/latest/${sourceIso}`);
                    const rateData = await rateRes.json();
                    exchangeRate = rateData.rates[targetIso] || 1.0;
                    convertedAmount = typedAmount * exchangeRate;
                } catch (e) {
                    console.warn(e);
                }
                Swal.close();
            }

            const previewHtml = `
            <div style="text-align: left; font-size: 0.95rem; line-height: 1.6; color: #eee; padding: 10px;">
                <p style="margin: 6px 0; border-bottom: 1px dashed #222; padding-bottom:6px;"><b>Beneficiary Name:</b> <span style="float: right; color: #2ecc71;">${receiversNameInput.value.trim()}</span></p>
                <p style="margin: 6px 0; border-bottom: 1px dashed #222; padding-bottom:6px;"><b>Account / IBAN:</b> <span style="float: right;">${receiverIBANumberInput.value.trim() || receiverAccountNumberInput.value.trim()}</span></p>
                <p style="margin: 6px 0; border-bottom: 1px dashed #222; padding-bottom:6px;"><b>Bank Name:</b> <span style="float: right;">${receiverBankNameInput.value.trim()}</span></p>
                <p style="margin: 6px 0; border-bottom: 1px dashed #222; padding-bottom:6px;"><b>SWIFT / BIC Code:</b> <span style="float: right;">${receiverSwiftCodeInput.value.trim()}</span></p>
                <p style="margin: 6px 0; border-bottom: 1px dashed #222; padding-bottom:6px; font-weight: bold;"><b>Transfer Amount:</b> <span style="float: right; color:#0a698f;">${userSymbol}${typedAmount.toFixed(2)}</span></p>
                ${!isSameCurrency ? `
                <p style="margin: 8px 0 0 0; color: #2ecc71;"><b>Recipient Receives:</b> <span style="float: right; font-weight:bold;">${selectedTargetCurrency}${convertedAmount.toFixed(2)}</span></p>
                <p style="margin: 2px 0 0 0; font-size: 11px; color: #888;"><b>Exchange Rate:</b> <span style="float: right;">1 ${userSymbol} = ${exchangeRate.toFixed(4)} ${selectedTargetCurrency}</span></p>
                ` : `
                <p style="margin: 8px 0 0 0; color: #888; font-size: 12px; text-align: center;">Same currency transfer - no conversion fee applied.</p>
                `}
            </div>`;

            const preview = await Swal.fire({
                title: 'Confirm Transfer Details',
                html: previewHtml,
                showCancelButton: true,
                background: "#111115", color: "#fff", confirmButtonColor: "#0a698f",
                confirmButtonText: 'Proceed to Authentication',
                cancelButtonText: 'Modify Details'
            });
            if (!preview.isConfirmed) return;

            const formDataPayload = {
                fullname: receiversNameInput.value.trim(),
                accountnumber: receiverAccountNumberInput.value.trim(),
                bankname: receiverBankNameInput.value.trim(),
                des: descriptionInput.value.trim(),
                amount: typedAmount,
                balanceSource: dbColumn
            };

            const authResponse = await OnFlexAuth.verifyPin(GLOBAL_PIN_URL, cachedUserRecord?._id || "user", "onflex", session.token);

            if (authResponse && authResponse.success) {
                const isRestricted = cachedUserRecord ? cachedUserRecord.restricted : false;
                const blockTransaction = cachedUserRecord ? cachedUserRecord.block_transection : false;
                const hasTransferAccess = cachedUserRecord ? cachedUserRecord.transferAccess : false;

                if (isRestricted === true) {
                    return Swal.fire({
                        title: "Transfer Restricted",
                        text: "Transfers are currently disabled on your account. Please contact customer support for assistance.",
                        icon: "error",
                        background: "#111115", color: "#fff", confirmButtonColor: "#0a698f"
                    });
                }

                if (blockTransaction === true) {
                    return Swal.fire({
                        title: "Account Blocked",
                        text: "Your account is temporarily blocked from making transfers. Please contact customer support.",
                        icon: "error",
                        background: "#111115", color: "#fff", confirmButtonColor: "#0a698f"
                    });
                }

                if (hasTransferAccess === true) {
                    initializeProgressSimulation(formDataPayload, 1, 0, 100, false, () => {
                        commitFinalTransaction(formDataPayload);
                    });
                } else {
                    handleCompliancePipeline(formDataPayload);
                }
            }
        });
    }

    async function handleCompliancePipeline(formDataPayload) {
        let codeIMF = await runComplianceModalStep("IMF", "Please enter your IMF clearance code to proceed.", 0, 27);
        if (!codeIMF) return;

        let codeTAX = await runComplianceModalStep("TAX", "Please enter your Global Tax clearance code to proceed.", 27, 63);
        if (!codeTAX) return;

        let codeCOT = await runComplianceModalStep("COT", "Please enter your Cost of Transfer (COT) authorization code.", 63, 96);
        if (!codeCOT) return;

        initializeProgressSimulation(formDataPayload, 4, 96, 100, true, () => {
            commitFinalTransaction(formDataPayload);
        });
    }

    function runComplianceModalStep(phaseName, helperHint, startPct, endPct) {
        return new Promise((resolve) => {
            initializeProgressSimulation(null, phaseName === "IMF" ? 1 : phaseName === "TAX" ? 2 : 3, startPct, endPct, true, () => {

                const openInputForm = () => {
                    Swal.fire({
                        title: `${phaseName} Verification Code`,
                        text: `${helperHint}`,
                        input: 'text',
                        inputAttributes: { autocomplete: 'off', required: 'true' },
                        background: "#111115", color: "#fff",
                        confirmButtonColor: "#0a698f", confirmButtonText: 'Verify Code',
                        showCancelButton: true,
                        cancelButtonText: 'Cancel',
                        allowOutsideClick: false,
                        preConfirm: async (submittedCode) => {
                            if (!submittedCode.trim()) {
                                Swal.showValidationMessage('Please enter a valid code');
                                return false;
                            }
                            try {
                                const response = await fetch(BACKEND_TRANSFER_URL, {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json",
                                        "Authorization": `Bearer ${session.token}`,
                                        "x-action-phase": `verify-${phaseName.toLowerCase()}`,
                                        "x-signature": "onflex"
                                    },
                                    body: JSON.stringify({ code: submittedCode.trim() })
                                });
                                const result = await response.json();

                                if (!response.ok || !result.success) {
                                    if (response.status === 403 || (result.error && result.error.includes("restricted"))) {
                                        Swal.close();
                                        await executeAccountLockoutOperation();
                                        resolve(false);
                                        return false;
                                    }
                                    throw new Error(result.error || `Invalid ${phaseName} Code. Please try again.`);
                                }
                                return true;
                            } catch (err) {
                                Swal.showValidationMessage(err.message || "Network error. Please try again.");
                                return false;
                            }
                        }
                    }).then((res) => {
                        if (res.isConfirmed) {
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    });
                };

                openInputForm();
            });
        });
    }

    function initializeProgressSimulation(formDataPayload, phaseIdx, start, end, injectGlitchNoise, finishCallback) {
        let currentPct = start;

        Swal.fire({
            title: 'Processing International Transfer...',
            html: `
                <div class="spinner-metric-text" id="swal-pct" style="color:#0a698f; font-size:2.5rem; font-weight:bold; margin:20px 0;">${currentPct}%</div>
                <p id="swal-msg" style="color:#888; font-size:0.9rem;">Connecting to global payment network...</p>
            `,
            background: "#111115", color: "#fff",
            confirmButtonColor: "#0a698f",
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
                const pctNode = document.getElementById("swal-pct");
                const msgNode = document.getElementById("swal-msg");

                function loopAnimation() {
                    if (currentPct >= end) {
                        setTimeout(() => {
                            Swal.close();
                            finishCallback();
                        }, 400);
                        return;
                    }

                    let delay = 20;
                    if (injectGlitchNoise) {
                        delay = Math.floor(Math.random() * 110) + 70;
                        if (Math.random() < 0.13 && currentPct > start && currentPct < (end - 3)) {
                            delay = Math.floor(Math.random() * 1400) + 1000;
                            if (msgNode) {
                                const latencies = [
                                    "Connecting to intermediary clearing bank...",
                                    "Verifying transfer route details...",
                                    "Synchronizing network security protocols...",
                                    "Optimizing wire transfer routing..."
                                ];
                                msgNode.innerHTML = `<span style="color:#eab308; font-style:italic;">⚠️ ${latencies[Math.floor(Math.random() * latencies.length)]}</span>`;
                            }
                        } else {
                            if (msgNode) {
                                if (phaseIdx === 1) msgNode.innerText = "Initializing routing framework...";
                                else if (phaseIdx === 2) msgNode.innerText = "Verifying compliance data...";
                                else msgNode.innerText = "Securing transaction tunnel...";
                            }
                        }
                    } else {
                        if (msgNode) msgNode.innerText = "Broadcasting transfer to central clearing system...";
                    }

                    setTimeout(() => {
                        currentPct++;
                        if (currentPct > end) currentPct = end;
                        if (pctNode) pctNode.innerText = `${currentPct}%`;
                        loopAnimation();
                    }, delay);
                }

                loopAnimation();
            }
        });
    }

    async function executeAccountLockoutOperation() {
        Swal.fire({
            title: 'Security Notice',
            text: 'Securing account session...',
            background: "#111115", color: "#fff",
            confirmButtonColor: "#0a698f",
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        await fetch(BACKEND_TRANSFER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session.token}`,
                "x-action-phase": "lock-account",
                "x-signature": "onflex"
            }
        });
        Swal.fire({
            title: "Access Restricted",
            text: "Transfers have been disabled on your account. Please contact customer support for assistance.",
            icon: "error",
            background: "#111115",
            color: "#fff",
            confirmButtonColor: "#0a698f"
        });
    }

    async function commitFinalTransaction(finalData) {
        Swal.fire({
            title: 'Finalizing Transfer...',
            text: 'Submitting transaction to the network...',
            background: "#111115",
            color: "#fff",
            confirmButtonColor: "#0a698f",
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            const finalCommit = await fetch(BACKEND_TRANSFER_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.token}`,
                    "x-action-phase": "commit-transfer",
                    "x-signature": "onflex"
                },
                body: JSON.stringify(finalData)
            });
            const commitResult = await finalCommit.json();

            if (!finalCommit.ok || !commitResult.success) {
                throw new Error(commitResult.error || "Unable to complete wire transfer.");
            }

            Swal.fire({
                title: "Transfer Successful",
                text: "Your international wire transfer has been processed successfully.",
                icon: "success",
                background: "#111115",
                color: "#fff",
                confirmButtonColor: "#0a698f"
            }).then(() => window.location.reload());
        } catch (err) {
            Swal.fire({
                title: "Transfer Failed",
                text: err.message || "An unexpected error occurred. Please try again.",
                icon: "error",
                background: "#111115",
                color: "#fff",
                confirmButtonColor: "#0a698f"
            });
        }
    }
});

window.pro = () => window.location.href = "profile.html";