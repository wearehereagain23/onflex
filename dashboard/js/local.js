document.addEventListener("DOMContentLoaded", async () => {
    const BACKEND_DATA_URL = "http://localhost:5000/api/data";
    const BACKEND_TRANSFER_URL = "http://localhost:5000/api/local";
    const GLOBAL_PIN_URL = "http://localhost:5000/api/card-action";

    const rawSession = localStorage.getItem("user_session");
    if (!rawSession) {
        window.location.href = "../login/index.html";
        return;
    }
    const session = JSON.parse(rawSession);

    const transferForm = document.getElementById("transferForm");
    const balanceSelect = document.getElementById("withdrawFrom");
    const accountInput = document.getElementById("accountNumber");
    const amountInput = document.getElementById("amount");
    const descriptionInput = document.getElementById("home_address");

    const mainBalanceHero = document.getElementById("accountBalance");
    const typeBalanceHero = document.getElementById("accountTypeBalance");
    const loanBalanceHero = document.getElementById("loanBalanace");
    const accountTypeLabel = document.getElementById("accounttype");
    const loanTypeLabel = document.getElementById("loantp");

    const profileName = document.getElementById("profileName");
    const profileAccount = document.getElementById("profileAccount");
    const accountLevel = document.getElementById("accountLevel");
    const accountLevel2 = document.getElementById("accountLevel2");
    const profileTypeDisplay = document.getElementById("profileTypeDisplay");

    let cachedUserRecord = null;

    async function populateDashboardMetrics() {
        try {
            const syncCheck = await fetch(BACKEND_DATA_URL, {
                method: "GET",
                headers: { "Authorization": `Bearer ${session.token}` }
            });
            const syncData = await syncCheck.json();

            if (syncCheck.ok && syncData.success) {
                cachedUserRecord = syncData.data;
                const user = cachedUserRecord;

                const symbol = user.currency || "$";

                if (profileName) profileName.innerText = `${user.firstname || ""} ${user.lastname || ""}`.trim() || "Active Client";
                if (profileAccount) profileAccount.innerText = user.accountNumber || "Unavailable";
                if (accountLevel) accountLevel.innerText = user.tiers;
                if (accountLevel2) accountLevel2.innerText = user.tiers;
                if (profileTypeDisplay) profileTypeDisplay.innerText = `${user.accttype || "Standard"} Node`;

                if (mainBalanceHero) mainBalanceHero.innerText = `${symbol}${parseFloat(user.accountBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                if (typeBalanceHero) typeBalanceHero.innerText = `${symbol}${parseFloat(user.accountTypeBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                if (loanBalanceHero) loanBalanceHero.innerText = `${symbol}${parseFloat(user.loanAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

                if (accountTypeLabel) accountTypeLabel.innerText = user.accttype || "Savings";
                if (loanTypeLabel) loanTypeLabel.innerText = user.loanApprovalStatus === "Approved" ? "Active " : "Pending ";
            }
        } catch (err) {
            console.error(err);
        }
    }

    await populateDashboardMetrics();

    if (!transferForm) return;

    transferForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const hasPin = await OnFlexAuth.checkHasPin(cachedUserRecord);
        if (!hasPin) return;

        const uiSelection = balanceSelect.value;
        let databaseBalanceColumn = "accountBalance";
        if (uiSelection === "accountType") databaseBalanceColumn = "accountTypeBalance";
        if (uiSelection === "loan") databaseBalanceColumn = "loanAmount";

        const recipientAccount = String(accountInput.value).trim();
        const typedAmount = parseFloat(amountInput.value) || 0;
        const typedDescription = descriptionInput ? descriptionInput.value : "";

        if (!recipientAccount || typedAmount <= 0) {
            Swal.fire({
                title: "Invalid Input",
                text: "Please enter a valid destination account number and amount.",
                icon: "error",
                background: "#111115",
                color: "#fff",
                confirmButtonColor: "#0a698f"
            });
            return;
        }

        if (databaseBalanceColumn === "accountTypeBalance" && cachedUserRecord?.fixedDate) {
            Swal.fire({
                title: "Funds Unavailable",
                text: "This account balance is currently locked under fixed-term conditions.",
                icon: "warning",
                background: "#111115",
                color: "#fff",
                confirmButtonColor: "#0a698f"
            });
            return;
        }

        Swal.fire({
            title: "Verifying Details...",
            text: "Calculating transfer fees and recipient information...",
            background: "#111115",
            color: "#fff",
            didOpen: () => Swal.showLoading(),
            allowOutsideClick: false
        });

        let previewDetails = null;
        try {
            const previewResponse = await fetch(BACKEND_TRANSFER_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.token}`
                },
                body: JSON.stringify({
                    accountNumber: recipientAccount,
                    amount: typedAmount,
                    description: typedDescription,
                    balanceSource: databaseBalanceColumn,
                    signature: "onflex",
                    isPreview: true
                })
            });

            const previewData = await previewResponse.json();
            if (!previewResponse.ok || !previewData.success) {
                throw new Error(previewData.error || "Unable to retrieve transfer details.");
            }
            previewDetails = previewData.data;
        } catch (err) {
            Swal.fire({
                title: "Transfer Error",
                text: err.message,
                icon: "error",
                background: "#111115",
                color: "#fff",
                confirmButtonColor: "#e74c3c"
            });
            return;
        }

        const {
            recipientName,
            senderSymbol,
            recipientSymbol,
            baseAmount,
            taxApplied,
            totalDeduction,
            recipientCredit,
            exchangeRate,
            currenciesMatch
        } = previewDetails;

        let previewHtml = `
            <div style="text-align: left; font-family: sans-serif; color: #fff; padding: 10px;">
                <p style="margin-bottom: 8px; border-bottom: 1px solid #222; padding-bottom: 6px;">
                    <strong>Beneficiary:</strong> <span style="color: #2ecc71; float: right;">${recipientName}</span>
                </p>
                <p style="margin-bottom: 8px; border-bottom: 1px solid #222; padding-bottom: 6px;">
                    <strong>Transfer Value:</strong> <span style="float: right;">${senderSymbol}${baseAmount}</span>
                </p>
                <p style="margin-bottom: 8px; border-bottom: 1px solid #222; padding-bottom: 6px;">
                    <strong>Description:</strong> <span style="float: right; color: #ccc;">${typedDescription || "N/A"}</span>
                </p>
        `;

        if (!currenciesMatch) {
            previewHtml += `
                <p style="margin-bottom: 8px; border-bottom: 1px solid #222; padding-bottom: 6px; color: #ff9f43;">
                    <strong>Conversion Rate:</strong> <span style="float: right;">1 ${senderSymbol} = ${exchangeRate} ${recipientSymbol}</span>
                </p>
                <p style="margin-bottom: 8px; border-bottom: 1px solid #222; padding-bottom: 6px; color: #2ecc71;">
                    <strong>Recipient Receives:</strong> <span style="float: right; font-weight: bold;">${recipientSymbol}${recipientCredit}</span>
                </p>
                <p style="margin-bottom: 8px; border-bottom: 1px solid #222; padding-bottom: 6px; color: #e74c3c;">
                    <strong>Processing Fee:</strong> <span style="float: right;">${senderSymbol}${taxApplied}</span>
                </p>
                <p style="margin-bottom: 4px; font-size: 1.1rem;">
                    <strong>Total Debit:</strong> <span style="color: #e74c3c; font-weight: bold; float: right;">${senderSymbol}${totalDeduction}</span>
                </p>
            `;
        } else {
            previewHtml += `
                <p style="margin-bottom: 8px; border-bottom: 1px solid #222; padding-bottom: 6px; color: #2ecc71;">
                    <strong>Processing Fee:</strong> <span style="float: right; color: #2ecc71; font-weight: bold;">${senderSymbol}0.00</span>
                </p>
                <p style="margin-bottom: 4px; font-size: 1.1rem;">
                    <strong>Total Debit:</strong> <span style="color: #2ecc71; font-weight: bold; float: right;">${senderSymbol}${baseAmount}</span>
                </p>
            `;
        }

        previewHtml += `</div>`;

        const confirmResult = await Swal.fire({
            title: "Confirm Transfer",
            html: previewHtml,
            icon: "info",
            background: "#111115",
            color: "#fff",
            showCancelButton: true,
            confirmButtonColor: "#0a698f",
            cancelButtonColor: "#222",
            confirmButtonText: "Proceed to PIN",
            cancelButtonText: "Cancel"
        });

        if (!confirmResult.isConfirmed) return;

        const authenticationChallenge = await OnFlexAuth.verifyPin(
            GLOBAL_PIN_URL,
            session.user?.id || session.user?.uuid || cachedUserRecord?.uuid,
            "onflex",
            session.token
        );

        if (!authenticationChallenge || !authenticationChallenge.success) {
            return;
        }

        Swal.fire({
            title: "Processing Transfer...",
            text: "Completing your transaction. Please wait...",
            background: "#111115",
            color: "#fff",
            didOpen: () => Swal.showLoading(),
            allowOutsideClick: false
        });

        try {
            const response = await fetch(BACKEND_TRANSFER_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.token}`
                },
                body: JSON.stringify({
                    accountNumber: recipientAccount,
                    amount: typedAmount,
                    description: typedDescription,
                    balanceSource: databaseBalanceColumn,
                    signature: "onflex",
                    isPreview: false
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                Swal.fire({
                    title: "Transfer Successful",
                    text: result.message || "Your transfer has been processed successfully.",
                    icon: "success",
                    background: "#111115",
                    color: "#fff",
                    confirmButtonColor: "#0a698f"
                }).then(() => {
                    transferForm.reset();
                    window.location.reload();
                });
            } else {
                Swal.fire({
                    title: "Transfer Failed",
                    text: result.error || "Unable to complete transfer at this time.",
                    icon: "error",
                    background: "#111115",
                    color: "#fff",
                    confirmButtonColor: "#e74c3c"
                });
            }
        } catch (error) {
            Swal.fire({
                title: "Network Error",
                text: "Unable to connect to server. Please check your connection and try again.",
                icon: "error",
                background: "#111115",
                color: "#fff",
                confirmButtonColor: "#e74c3c"
            });
        }
    });
});

function pro() {
    window.location.href = "profile.html";
}