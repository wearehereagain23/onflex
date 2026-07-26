/**
 * ==========================================================================
 * ONFLEX APPLICATION UNIFIED POPUP SYSTEM & LIVE CORE HANDLERS
 * ==========================================================================
 */
document.addEventListener("DOMContentLoaded", async () => {

    // ----------------------------------------------------------------------
    // PHASE 1: AUTOMATIC REAL-TIME CALENDAR CALCULATION
    // ----------------------------------------------------------------------
    const updateDashboardDate = () => {
        const dateEl = document.getElementById("dashboardDate");
        if (!dateEl) return;

        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const today = new Date();
        dateEl.textContent = today.toLocaleDateString('en-US', options);
    };
    updateDashboardDate();

    // ----------------------------------------------------------------------
    // FETCH PROFILE VARIABLES TO ASSIGN TO INJECTED STRUCTURAL MARKUP
    // ----------------------------------------------------------------------
    let accountNumber = "9834 0291 8843 0192"; // Fallbacks
    let clearAccountNumber = "9834029188430192";
    let userFullName = "OnFlex Settlement Desk";
    let dynamicAccountType = "Corporate Escrow Vault";

    const rawSession = localStorage.getItem("user_session");
    if (rawSession) {
        try {
            const session = JSON.parse(rawSession);
            const response = await fetch("http://localhost:5000/api/data", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${session.token}`,
                    "Content-Type": "application/json"
                }
            });
            const result = await response.json();

            if (response.ok && result.success) {
                const user = result.data;

                // 1. Map dynamic account number formatted into blocks of 4
                if (user.accountNumber) {
                    const rawNum = String(user.accountNumber).replace(/\s+/g, '');
                    clearAccountNumber = rawNum;
                    accountNumber = rawNum.replace(/(\d{4})(?=\d)/g, '$1 ');
                }

                // 2. Map dynamic user full name layout assembly
                const firstName = user.firstname || "";
                const middleName = user.middlename ? user.middlename.trim() : "";
                const lastName = user.lastname || "";
                const compiledName = middleName ? `${firstName} ${middleName} ${lastName}` : `${firstName} ${lastName}`;
                if (compiledName.trim() !== "") {
                    userFullName = compiledName.trim();
                }

                // 3. Map dynamic account type field context values
                if (user.accttype && user.accttype.trim() !== "") {
                    dynamicAccountType = `${user.accttype.trim()} Account`;
                }
            }
        } catch (err) {
            console.warn("⚠️ Popup system failed to fetch live account variables. Applying fallback routing layout.", err.message);
        }
    }

    // ----------------------------------------------------------------------
    // PHASE 2: INJECT ADVANCED MODERN POPUPS INTO THE DOM
    // ----------------------------------------------------------------------
    const injectPopupStructures = () => {
        if (document.getElementById("onflexDepositPopup")) return;

        const markup = `
            <div id="onflexDepositPopup" class="onflex-popup-overlay">
                <div class="onflex-popup-card advanced-deposit-card">
                    <div class="onflex-popup-header">
                        <h3>Bank Deposit Details</h3>
                        <button class="onflex-popup-close" data-close-popup>&times;</button>
                    </div>
                    <div class="onflex-popup-body">
                        <p class="popup-intro-text">Use the credentials below to transfer funds via wire or online banking app.</p>
                        
                        <div class="deposit-grid-layout">
                            <div class="deposit-row-item">
                                <span class="row-label">Bank Name</span>
                                <div class="row-value-wrapper">
                                    <span class="row-text-value">OnFlex Bank</span>
                                </div>
                            </div>
                            
                            <div class="deposit-row-item">
                                <span class="row-label">Account Name</span>
                                <div class="row-value-wrapper">
                                    <span class="row-text-value">${userFullName}</span>
                                </div>
                            </div>
                            
                            <div class="deposit-row-item">
                                <span class="row-label">Account Type</span>
                                <div class="row-value-wrapper">
                                    <span class="row-text-value">${dynamicAccountType}</span>
                                </div>
                            </div>
                            
                            <div class="deposit-row-item highlight-row">
                                <span class="row-label">Account Number</span>
                                <div class="row-value-wrapper">
                                    <span class="row-text-value account-num">${accountNumber}</span>
                                    <button id="popupCopyBtn" class="row-copy-btn">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="advanced-status-banner">
                            <div class="status-dot pulsing"></div>
                            <span>Funds post automatically after multi-sig approval clears.</span>
                        </div>
                    </div>
                </div>
            </div>

            <div id="onflexTransferPopup" class="onflex-popup-overlay">
                <div class="onflex-popup-card matrix-card">
                    <div class="onflex-popup-header">
                        <h3>Send & Transfer Capital</h3>
                        <button class="onflex-popup-close" data-close-popup>&times;</button>
                    </div>
                    <div class="onflex-popup-body matrix-hub-body">
                        <p class="popup-intro-text">Choose your preferred transaction network parameters:</p>
                        
                        <div class="matrix-routing-grid">
                            <a href="local.html" class="matrix-route-btn">
                                <div class="route-icon-box primary-accent">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                </div>
                                <div class="route-content">
                                    <h4>Local Transfer Node</h4>
                                    <span>Send money quickly to domestic clearing network accounts.</span>
                                </div>
                            </a>

                            <a href="international.html" class="matrix-route-btn">
                                <div class="route-icon-box orange-accent">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                                </div>
                                <div class="route-content">
                                    <h4>International SWIFT Node</h4>
                                    <span>Wire capital globally across cross-border settlement rails.</span>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <div id="onflexHistoryPopup" class="onflex-popup-overlay">
                <div class="onflex-popup-card matrix-card">
                    <div class="onflex-popup-header">
                        <h3>Transaction History Ledger</h3>
                        <button class="onflex-popup-close" data-close-popup>&times;</button>
                    </div>
                    <div class="onflex-popup-body matrix-hub-body">
                        <p class="popup-intro-text">Select account network to view historical data logs:</p>
                        
                        <div class="matrix-routing-grid">
                            <a href="local.html" class="matrix-route-btn">
                                <div class="route-icon-box primary-accent">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                </div>
                                <div class="route-content">
                                    <h4>Local Clearings History</h4>
                                    <span>View statements and details for domestic records.</span>
                                </div>
                            </a>

                            <a href="international.html" class="matrix-route-btn">
                                <div class="route-icon-box orange-accent">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                                </div>
                                <div class="route-content">
                                    <h4>International Wire Logs</h4>
                                    <span>Track incoming and outgoing international settlements.</span>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML("beforeend", markup);

        // Bind the clipboard copy function programmatically
        const copyBtn = document.getElementById("popupCopyBtn");
        if (copyBtn) {
            copyBtn.addEventListener("click", () => {
                navigator.clipboard.writeText(clearAccountNumber);
                alert("Account number copied successfully!");
            });
        }
    };
    injectPopupStructures();

    const depositOverlay = document.getElementById("onflexDepositPopup");
    const transferOverlay = document.getElementById("onflexTransferPopup");
    const historyOverlay = document.getElementById("onflexHistoryPopup");

    // ----------------------------------------------------------------------
    // PHASE 3: EVENT DELEGATION WITH PAGE EXCLUSION FILTERS
    // ----------------------------------------------------------------------
    document.body.addEventListener("click", (e) => {
        // 1. Dismiss Modals Click Configuration
        if (e.target.hasAttribute("data-close-popup") || e.target.classList.contains("onflex-popup-overlay")) {
            depositOverlay.classList.remove("visible");
            transferOverlay.classList.remove("visible");
            historyOverlay.classList.remove("visible");
            return;
        }

        // PRE-CHECK: If the click target is an anchor link pointing to an actual webpage, let it navigate naturally!
        const contextualLink = e.target.closest("a");
        if (contextualLink && contextualLink.getAttribute("href") && contextualLink.getAttribute("href") !== "#") {
            return;
        }

        // 2. Catch DEPOSIT Modals Triggers
        const isDeposit = e.target.closest(".pill-btn-primary") ||
            (e.target.closest(".action-square-btn") && e.target.closest(".action-square-btn").textContent.trim().includes("Deposit")) ||
            (e.target.closest(".nav-link") && e.target.closest(".nav-link").textContent.trim().includes("Deposit"));

        if (isDeposit) {
            e.preventDefault();
            depositOverlay.classList.add("visible");
            return;
        }

        // 3. Catch TRANSFER Modals Triggers
        const isTransfer = (e.target.closest(".action-square-btn") && e.target.closest(".action-square-btn").textContent.trim().includes("Transfer")) ||
            (e.target.closest(".mobile-nav-pill") && e.target.closest(".mobile-nav-pill").textContent.trim().includes("Transfer"));

        if (isTransfer) {
            e.preventDefault();
            transferOverlay.classList.add("visible");
            return;
        }
    });
});