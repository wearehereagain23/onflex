document.addEventListener('DOMContentLoaded', async () => {
    const BACKEND_DATA_URL = "http://localhost:5000/api/data";
    const BACKEND_LOAN_UPDATE_URL = "http://localhost:5000/api/loan-action";
    const GLOBAL_PIN_URL = "http://localhost:5000/api/card-action";

    const rawSession = localStorage.getItem("user_session");
    if (!rawSession) { window.location.href = "../login/index.html"; return; }
    const session = JSON.parse(rawSession);

    const DYNAMIC_INTEREST_RATE = 5;
    const MAX_AUTHORIZED_LIMIT = 25000.00;
    const MIN_AUTHORIZED_LIMIT = 50.00;

    const headerInterestRate = document.getElementById('headerInterestRate');
    const ledgerRateLabel = document.getElementById('ledgerRateLabel');
    const displayMaxLimit = document.getElementById('displayMaxLimit');
    const hintMaxLimit = document.getElementById('hintMaxLimit');
    const loanAmountInput = document.getElementById('loanAmountInput');
    const loanTermSelect = document.getElementById('loanTerm');
    const loanPurposeSelect = document.getElementById('loanPurpose');
    const liveCalcWidget = document.getElementById('liveCalcWidget');

    const calcPrincipal = document.getElementById('calcPrincipal');
    const calcInterest = document.getElementById('calcInterest');
    const calcTotal = document.getElementById('calcTotal');
    const calcMonthly = document.getElementById('calcMonthly');

    const utilizationPercent = document.getElementById('utilizationPercent');
    const utilizationBar = document.getElementById('utilizationBar');

    const loanForm = document.getElementById('loanApplicationForm');
    const loanFormWrapper = document.querySelector('.loan-form-wrapper');

    const mainBalanceHero = document.getElementById("accountBalance");
    const typeBalanceHero = document.getElementById("accountTypeBalance");
    const loanBalanceHero = document.getElementById("loanBalanace");
    const profileName = document.getElementById("profileName");
    const loanTypeLabel = document.getElementById("loanTypeLabel");
    const tier = document.getElementById("tier");
    const tiersNav = document.getElementById("tiers");
    const loanTypeMiniLabel = document.getElementById("loantp");

    let cachedUserRecord = null;

    const unifiedSwalStyle = {
        background: "#111115",
        color: "#fff",
        confirmButtonColor: "#0a698f"
    };

    function renderLoanStateLayout(userRecord) {
        const status = (userRecord.loanApprovalStatus || '').trim();
        const currencySymbol = userRecord.currency || "$";
        const amt = parseFloat(userRecord.loanAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

        if (loanTypeMiniLabel) loanTypeMiniLabel.innerText = userRecord.loanType ? `${userRecord.loanType} ` : "";

        if (status === "Pending") {
            loanFormWrapper.innerHTML = `
                <div class="card-ui unified-form-padding" style="text-align: center; padding: 40px !important;">
                    <div style="color: #f59e0b; font-size: 3rem; margin-bottom: 16px;">⏳</div>
                    <h3 class="panel-title" style="margin-bottom: 8px;">Application Pending Review</h3>
                    <p class="panel-desc" style="margin-bottom: 24px;">Your loan request is currently being reviewed by our underwriting team.</p>
                    <div style="background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); border-radius: 8px; padding: 16px; text-align: left; margin-bottom: 20px;">
                        <p style="margin: 6px 0; font-size: 0.9rem;"><b>Requested Loan:</b> <span style="float: right; color: #f59e0b;">${currencySymbol}${amt}</span></p>
                        <p style="margin: 6px 0; font-size: 0.9rem;"><b>Type:</b> <span style="float: right;">${userRecord.loanType || 'N/A'} Loan</span></p>
                    </div>
                    <p style="font-size: 0.8rem; color: #8a99ad; font-style: italic;">Applications are usually processed within 24 business hours.</p>
                </div>`;
            return;
        }

        if (status === "Approved") {
            const principalBase = parseFloat(userRecord.loanAmount || 0);
            const rawInterest = principalBase * (DYNAMIC_INTEREST_RATE / 100);
            const totalPayableAmount = principalBase + rawInterest;

            loanFormWrapper.innerHTML = `
                <div class="card-ui unified-form-padding" style="padding: 40px !important;">
                    <div class="panel-header-badge" style="margin-bottom: 20px;">
                        <h3 class="panel-title">Active Loan Balance</h3>
                        <span class="feed-badge badge-success" style="background: rgba(16, 185, 129, 0.15); color: #10b981; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;">Active</span>
                    </div>
                    <p class="panel-desc" style="margin-bottom: 24px;">Your loan has been approved. You can view your current balance and settle your debt below.</p>
                    
                    <div class="live-calculation-card" style="display: block; margin-bottom: 24px;">
                        <div class="calc-data-grid">
                            <div class="calc-item">
                                <span class="calc-label">Principal Amount</span>
                                <span class="calc-value">${currencySymbol}${principalBase.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div class="calc-item">
                                <span class="calc-label">Interest (${DYNAMIC_INTEREST_RATE}%)</span>
                                <span class="calc-value text-orange">${currencySymbol}${rawInterest.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div class="calc-item border-top-divider" style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px; margin-top: 4px; font-weight:600;">
                                <span class="calc-label">Total Amount Payable</span>
                                <span class="calc-value text-teal">${currencySymbol}${totalPayableAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>

                    <button type="button" id="executePaybackBtn" class="full-width-btn" style="background: #10b981; color: #fff; border-radius:8px; padding:12px; cursor:pointer;">
                        Repay & Settle Loan
                    </button>
                </div>`;

            document.getElementById('executePaybackBtn').addEventListener('click', handleLoanAmortizationPayback);
            return;
        }
    }

    async function populateDashboard() {
        try {
            const res = await fetch(BACKEND_DATA_URL, { headers: { "Authorization": `Bearer ${session.token}` } });
            const data = await res.json();
            if (data.success) {
                cachedUserRecord = data.data;
                const u = cachedUserRecord;
                if (tier) tier.innerHTML = u.tiers || "1";
                if (tiersNav) tiersNav.innerHTML = u.tiers || "1";

                const s = u.currency || "$";
                if (mainBalanceHero) mainBalanceHero.innerText = `${s}${parseFloat(u.accountBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                if (typeBalanceHero) typeBalanceHero.innerText = `${s}${parseFloat(u.accountTypeBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                if (loanBalanceHero) loanBalanceHero.innerText = `${s}${parseFloat(u.loanAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                if (profileName) profileName.innerText = `${u.firstname || ""} ${u.lastname || ""}`;

                if (loanTypeLabel) {
                    loanTypeLabel.innerText = u.loanApprovalStatus === "Approved" ? "Active " : "Pending ";
                }

                renderLoanStateLayout(u);
            }
        } catch (e) {
            console.error(e);
        }
    }
    await populateDashboard();

    const decimalRateMultiplier = DYNAMIC_INTEREST_RATE / 100;

    if (headerInterestRate) headerInterestRate.textContent = `${DYNAMIC_INTEREST_RATE.toFixed(2)}%`;
    if (ledgerRateLabel) ledgerRateLabel.textContent = `${DYNAMIC_INTEREST_RATE}%`;
    if (displayMaxLimit) displayMaxLimit.textContent = `$${MAX_AUTHORIZED_LIMIT.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    if (hintMaxLimit) hintMaxLimit.textContent = `$${MAX_AUTHORIZED_LIMIT.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    function performLiveCalculations() {
        if (!loanAmountInput || !loanTermSelect || !liveCalcWidget) return;
        const value = parseFloat(loanAmountInput.value);
        const months = parseInt(loanTermSelect.value) || 12;

        if (!isNaN(value) && value >= MIN_AUTHORIZED_LIMIT && value <= MAX_AUTHORIZED_LIMIT) {
            const interestCost = value * decimalRateMultiplier;
            const absoluteTotal = value + interestCost;
            const monthlyInstalment = absoluteTotal / months;

            if (calcPrincipal) calcPrincipal.textContent = `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
            if (calcInterest) calcInterest.textContent = `$${interestCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
            if (calcTotal) calcTotal.textContent = `$${absoluteTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
            if (calcMonthly) calcMonthly.textContent = `$${monthlyInstalment.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

            const usagePercentage = Math.min(((value / MAX_AUTHORIZED_LIMIT) * 100), 100);
            if (utilizationPercent) utilizationPercent.textContent = `${Math.round(usagePercentage)}%`;
            if (utilizationBar) utilizationBar.style.width = `${usagePercentage}%`;

            liveCalcWidget.style.display = 'block';
        } else {
            liveCalcWidget.style.display = 'none';
            if (utilizationPercent) utilizationPercent.textContent = '0%';
            if (utilizationBar) utilizationBar.style.width = '0%';
        }
    }

    if (loanAmountInput) loanAmountInput.addEventListener('input', performLiveCalculations);
    if (loanTermSelect) loanTermSelect.addEventListener('change', performLiveCalculations);
    performLiveCalculations();

    if (loanForm) {
        loanForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const hasPin = await OnFlexAuth.checkHasPin(cachedUserRecord);
            if (!hasPin) return;

            const kycStatus = (cachedUserRecord?.kyc || "").toLowerCase().trim();
            if (kycStatus !== "approved") {
                return Swal.fire({
                    ...unifiedSwalStyle,
                    icon: 'warning',
                    title: 'Verification Required',
                    text: 'Please complete your account verification (KYC) before applying for a loan.'
                });
            }

            const finalValue = parseFloat(loanAmountInput.value);
            if (isNaN(finalValue) || finalValue < MIN_AUTHORIZED_LIMIT || finalValue > MAX_AUTHORIZED_LIMIT) {
                return Swal.fire({
                    ...unifiedSwalStyle,
                    icon: 'error',
                    title: 'Invalid Amount',
                    text: `Please enter an amount between $${MIN_AUTHORIZED_LIMIT} and $${MAX_AUTHORIZED_LIMIT.toLocaleString()}.`
                });
            }

            const selectedPurposeText = loanPurposeSelect.options[loanPurposeSelect.selectedIndex].text;
            const selectedDurationText = loanTermSelect.options[loanTermSelect.selectedIndex].text;

            const confirmation = await Swal.fire({
                ...unifiedSwalStyle,
                title: 'Submit Loan Application?',
                text: `Are you sure you want to apply for a $${finalValue.toLocaleString()} loan?`,
                showCancelButton: true,
                confirmButtonText: 'Proceed to PIN',
                cancelButtonText: 'Cancel'
            });

            if (!confirmation.isConfirmed) return;

            const authenticationChallenge = await OnFlexAuth.verifyPin(
                GLOBAL_PIN_URL,
                session.user?.id || session.user?.uuid || cachedUserRecord?.uuid,
                "onflex",
                session.token
            );

            if (!authenticationChallenge || !authenticationChallenge.success) {
                return;
            }

            setTimeout(async () => {
                Swal.fire({
                    ...unifiedSwalStyle,
                    title: 'Submitting Application...',
                    text: 'Processing your request...',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                const updatePayload = {
                    loanApprovalStatus: "Pending",
                    loanType: selectedPurposeText,
                    loanAmount: finalValue.toString(),
                    loan_duration: selectedDurationText,
                    signature: cachedUserRecord?.signature || "Signed electronically via OnFlex Vault Node Engine"
                };

                try {
                    const response = await fetch(BACKEND_LOAN_UPDATE_URL, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${session.token}`
                        },
                        body: JSON.stringify(updatePayload)
                    });
                    const result = await response.json();

                    if (!response.ok || !result.success) {
                        throw new Error(result.error || "Unable to submit application.");
                    }

                    Swal.fire({
                        ...unifiedSwalStyle,
                        icon: 'success',
                        title: 'Application Submitted',
                        text: 'Your loan application has been submitted and is currently under review.'
                    }).then(() => window.location.reload());

                } catch (err) {
                    Swal.fire({
                        ...unifiedSwalStyle,
                        icon: 'error',
                        title: 'Submission Failed',
                        text: err.message || "An unexpected error occurred."
                    });
                }
            }, 150);
        });
    }

    async function handleLoanAmortizationPayback() {
        const hasPin = await OnFlexAuth.checkHasPin(cachedUserRecord);
        if (!hasPin) return;

        const principalBase = parseFloat(cachedUserRecord.loanAmount || 0);
        const interestCost = principalBase * (DYNAMIC_INTEREST_RATE / 100);
        const totalPayableDebt = principalBase + interestCost;
        const currencySymbol = cachedUserRecord.currency || "$";

        const { value: selectedSourceChannel } = await Swal.fire({
            ...unifiedSwalStyle,
            title: "Select Repayment Source",
            text: `Total repayment amount: ${currencySymbol}${totalPayableDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            input: "select",
            inputOptions: {
                accountBalance: `Primary Account Balance (${currencySymbol}${parseFloat(cachedUserRecord.accountBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })})`,
                accountTypeBalance: `Vault Account Balance (${currencySymbol}${parseFloat(cachedUserRecord.accountTypeBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })})`
            },
            inputPlaceholder: "Choose funding source",
            showCancelButton: true,
            cancelButtonText: "Cancel",
            inputValidator: (value) => {
                if (!value) return "Please select an account to pay from.";
            }
        });

        if (!selectedSourceChannel) return;

        let currentFundingPoolValue = parseFloat(cachedUserRecord[selectedSourceChannel] || 0);
        let updatedAccountBalance = parseFloat(cachedUserRecord.accountBalance || 0);
        let updatedAccountTypeBalance = parseFloat(cachedUserRecord.accountTypeBalance || 0);

        if (selectedSourceChannel === "accountTypeBalance") {
            if (cachedUserRecord?.fixedDate && cachedUserRecord.fixedDate.trim() !== "") {
                return Swal.fire({
                    title: "Withdrawal Locked",
                    text: "This account balance is currently locked under fixed-term conditions.",
                    icon: "warning",
                    background: "#111115",
                    color: "#fff",
                    confirmButtonColor: "#0a698f"
                });
            }

            if (currentFundingPoolValue < totalPayableDebt) {
                return Swal.fire({
                    ...unifiedSwalStyle,
                    icon: "error",
                    title: "Insufficient Balance",
                    text: `Your Vault account balance (${currencySymbol}${currentFundingPoolValue.toLocaleString()}) is insufficient to cover this loan repayment.`
                });
            }

            updatedAccountTypeBalance = currentFundingPoolValue - totalPayableDebt;
        } else {
            if (currentFundingPoolValue < totalPayableDebt) {
                return Swal.fire({
                    ...unifiedSwalStyle,
                    icon: "error",
                    title: "Insufficient Balance",
                    text: `Your Primary account balance (${currencySymbol}${currentFundingPoolValue.toLocaleString()}) is insufficient to cover this loan repayment.`
                });
            }

            updatedAccountBalance = currentFundingPoolValue - totalPayableDebt;
        }

        const finalConfirmation = await Swal.fire({
            ...unifiedSwalStyle,
            title: "Confirm Loan Repayment",
            text: "Are you sure you want to deduct funds to settle your active loan?",
            showCancelButton: true,
            confirmButtonText: "Proceed to PIN",
            cancelButtonText: "Cancel"
        });

        if (!finalConfirmation.isConfirmed) return;

        const authenticationChallenge = await OnFlexAuth.verifyPin(
            GLOBAL_PIN_URL,
            session.user?.id || session.user?.uuid || cachedUserRecord?.uuid,
            "onflex",
            session.token
        );

        if (!authenticationChallenge || !authenticationChallenge.success) {
            return;
        }

        setTimeout(async () => {
            Swal.fire({
                ...unifiedSwalStyle,
                title: "Processing Repayment...",
                text: "Updating accounts and settling balance...",
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const paybackPayload = {
                loanApprovalStatus: "no",
                loanType: "",
                loanAmount: "0",
                loan_duration: "",
                accountBalance: updatedAccountBalance.toString(),
                accountTypeBalance: updatedAccountTypeBalance.toString(),
                selectedSourceChannel: selectedSourceChannel,
                signature: cachedUserRecord?.signature || "Signed electronically via OnFlex Vault Node Engine"
            };

            try {
                const response = await fetch(BACKEND_LOAN_UPDATE_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${session.token}`
                    },
                    body: JSON.stringify(paybackPayload)
                });
                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || "Unable to settle loan repayment.");
                }

                Swal.fire({
                    ...unifiedSwalStyle,
                    icon: 'success',
                    title: 'Loan Settled',
                    text: 'Your loan has been successfully paid off.'
                }).then(() => window.location.reload());

            } catch (err) {
                Swal.fire({
                    ...unifiedSwalStyle,
                    icon: 'error',
                    title: 'Repayment Failed',
                    text: err.message || "An error occurred while settling your loan."
                });
            }
        }, 150);
    }
});

window.pro = () => window.location.href = "profile.html";