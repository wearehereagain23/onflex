document.addEventListener("DOMContentLoaded", async () => {
    // ==========================================================================
    // DYNAMIC LOADING OVERLAY & ERROR BANNER INJECTION
    // ==========================================================================
    let loaderEl = document.getElementById("page-loader");
    if (!loaderEl) {
        loaderEl = document.createElement("div");
        loaderEl.id = "page-loader";
        loaderEl.innerHTML = `
            <div class="loader-spinner"></div>
            <div class="loader-text">Synchronizing session...</div>
        `;
        document.body.appendChild(loaderEl);
    }

    let errorBannerEl = document.getElementById("global-error-banner");
    if (!errorBannerEl) {
        errorBannerEl = document.createElement("div");
        errorBannerEl.id = "global-error-banner";
        document.body.appendChild(errorBannerEl);
    }

    const showGlobalError = (message) => {
        errorBannerEl.innerText = message || "An unexpected error occurred.";
        errorBannerEl.classList.add("banner-visible");
    };

    const hideLoader = () => {
        if (loaderEl) {
            loaderEl.classList.add("loader-hidden");
        }
    };

    const startTime = Date.now();
    const MINIMUM_LOADER_DELAY = 2000; // Delay between 1500ms and 2000ms

    const BACKEND_DATA_URL = "http://localhost:5000/api/data";
    const BACKEND_HISTORY_URL = "http://localhost:5000/api/history";
    const historyFeedContainer = document.querySelector(".modern-history-feed");

    // 1. Session verification gate check
    const rawSession = localStorage.getItem("user_session");
    if (!rawSession) {
        window.location.href = "../login/index.html";
        return;
    }

    const session = JSON.parse(rawSession);

    try {
        // 2. Query global database context
        const response = await fetch(BACKEND_DATA_URL, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${session.token}`,
                "Content-Type": "application/json"
            }
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || "Failed to establish synchronization with node data.");
        }

        const user = result.data;
        window.user = user;

        // ==========================================================================
        // IDENTITY & WELCOME TEXT WRAPPERS
        // ==========================================================================
        const profileAvatars = document.querySelectorAll(".user-avatar");
        if (user.profileImage && user.profileImage.trim() !== "") {
            profileAvatars.forEach(img => img.src = user.profileImage);
        }

        const firstName = user.firstname || "";
        const middleName = user.middlename ? user.middlename.trim() : "";
        const lastName = user.lastname || "";
        const userFullName = middleName ? `${firstName} ${middleName} ${lastName}` : `${firstName} ${lastName}`;
        const normalizedFullName = userFullName.trim() || "Valued Customer";

        const headerProfileNameEl = document.querySelector(".header-profile-name");
        if (headerProfileNameEl) headerProfileNameEl.innerText = normalizedFullName;

        const welcomeHighlightEl = document.querySelector(".welcome-title-wrap .user-highlight");
        if (welcomeHighlightEl) welcomeHighlightEl.innerText = normalizedFullName;


        // ==========================================================================
        // TIER UPGRADE LOGIC & COLOR CONFIGURATION
        // Modify hex values inside TIER_COLORS to adjust colors directly in JS
        // ==========================================================================
        const rawTier = String(user.tiers || "1").trim();

        // 🎨 EDIT YOUR TIER COLORS HERE:
        const TIER_COLORS = {
            "1": "#4cc3d9", // Tier 1 (Default Teal)
            "2": "#2563eb", // Tier 2 (Blue)
            "3": "#b45309"  // Tier 3 (Dark Gold)
        };

        // Get matching color or default to Tier 1
        const activeTierColor = TIER_COLORS[rawTier] || TIER_COLORS["1"];

        // Set global CSS property and data-tier attribute on <body>
        document.body.setAttribute("data-tier", rawTier);
        document.body.style.setProperty("--tier-accent", activeTierColor);

        let formattedTierDisplay = "";

        switch (rawTier) {
            case "3":
                formattedTierDisplay = "Tier 3 Premium";
                break;
            case "2":
                formattedTierDisplay = "Tier 2 Standard";
                break;
            case "1":
            default:
                formattedTierDisplay = "Tier 1 Basic";
                break;
        }

        const tiersEl = document.getElementById("tiers");
        if (tiersEl) {
            const roleParent = tiersEl.closest(".header-profile-role");
            if (roleParent) {
                roleParent.innerText = formattedTierDisplay;
            } else {
                tiersEl.innerText = formattedTierDisplay;
            }
        }

        const miniTierEl = document.getElementById("miniTier");
        if (miniTierEl) {
            const miniHero = miniTierEl.closest(".mini-value-hero");
            if (miniHero) {
                miniHero.innerText = formattedTierDisplay;
            } else {
                miniTierEl.innerText = formattedTierDisplay;
            }
        }



        // ==========================================================================
        // BALANCES & MATHEMATICAL PORTFOLIO VALUATION MATRIX
        // ==========================================================================
        const currencySymbol = user.currency || "$";
        const accountBalance = parseFloat(user.accountBalance || 0);
        const accountTypeBalance = parseFloat(user.accountTypeBalance || 0);
        const loanAmount = parseFloat(user.loanAmount || 0);

        const overallPortfolioValuation = accountBalance + accountTypeBalance + loanAmount;

        const fmtBalance = accountBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const fmtTypeBalance = accountTypeBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const fmtLoan = loanAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const fmtPortfolio = overallPortfolioValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const isLoanApproved = String(user.loanApprovalStatus).toLowerCase() === "approved";
        const customLoanPrefix = isLoanApproved && user.loanType ? `${user.loanType} ` : "";

        // ==========================================================================
        // LEFT SIDEBAR / MAIN ACCOUNTS ROW ARRAY MAPPING
        // ==========================================================================
        const accountsWrapper = document.querySelector(".accounts-list-wrapper");
        if (accountsWrapper) {
            const rows = accountsWrapper.querySelectorAll(".account-item-row");

            if (rows[0]) {
                const valDisplay = rows[0].querySelector(".account-value-display");
                if (valDisplay) valDisplay.innerText = `${currencySymbol}${fmtBalance}`;
            }

            if (rows[1]) {
                const nameLabel = rows[1].querySelector(".account-name-label");
                if (nameLabel) nameLabel.innerHTML = `<span id="accountType">${user.accttype || "Online"}</span> Account`;

                const valDisplay = rows[1].querySelector(".account-value-display");
                if (valDisplay) valDisplay.innerText = `${currencySymbol}${fmtTypeBalance}`;

                const fixedDateLabel = rows[1].querySelector(".account-sub-label");
                if (fixedDateLabel) {
                    if (user.fixedDate && user.fixedDate.trim() !== "") {
                        fixedDateLabel.innerHTML = `(Fixed) ${user.fixedDate} Ⓡ`;
                        fixedDateLabel.style.display = "block";
                    } else {
                        fixedDateLabel.style.display = "none";
                    }
                }
            }

            if (rows[2]) {
                const loanTypeSpan = rows[2].querySelector("#loanType");
                if (loanTypeSpan) {
                    loanTypeSpan.innerText = customLoanPrefix;
                } else {
                    const nameLabel = rows[2].querySelector(".account-name-label");
                    if (nameLabel) nameLabel.innerHTML = `<span id="loanType">${customLoanPrefix}</span>Loan`;
                }

                const valDisplay = rows[2].querySelector(".account-value-display");
                if (valDisplay) valDisplay.innerText = `${currencySymbol}${fmtLoan}`;
            }

            if (rows[3]) {
                const subBadge = rows[3].querySelector(".account-sub-label");
                const valDisplay = rows[3].querySelector(".account-value-display");

                if (String(user.cardApproval).toLowerCase() === "approved") {
                    const activeCardValue = String(user.cards || "Master").toUpperCase();
                    if (subBadge) {
                        subBadge.innerText = user.cards || "Master";
                        subBadge.className = "account-sub-label master-badge";
                    }
                    if (valDisplay) valDisplay.innerText = activeCardValue;
                } else {
                    if (subBadge) {
                        subBadge.innerText = "No Card";
                        subBadge.className = "account-sub-label";
                    }
                    if (valDisplay) valDisplay.innerText = "No Card";
                }
            }
        }

        // ==========================================================================
        // RIGHT COLUMN GRID: DYNAMIC OVERALL BALANCE PORTFOLIO DATA
        // ==========================================================================
        const portfolioTotalEl = document.getElementById("portfolioTotal");
        if (portfolioTotalEl) portfolioTotalEl.innerText = `${currencySymbol}${fmtPortfolio}`;

        const breakdownMainEl = document.getElementById("breakdownMain");
        if (breakdownMainEl) breakdownMainEl.innerText = `${currencySymbol}${fmtBalance}`;

        const breakdownTypeEl = document.getElementById("breakdownType");
        if (breakdownTypeEl) {
            const rowParent = breakdownTypeEl.parentElement;
            if (rowParent) rowParent.innerHTML = `<span>${user.accttype || "Online"} Account</span><span>${currencySymbol}${fmtTypeBalance}</span>`;
        }

        const breakdownLoanTypeEl = document.getElementById("breakdownLoanType");
        if (breakdownLoanTypeEl) {
            breakdownLoanTypeEl.innerText = customLoanPrefix;
        }
        const breakdownLoanEl = document.getElementById("breakdownLoan");
        if (breakdownLoanEl) {
            breakdownLoanEl.innerText = `${currencySymbol}${fmtLoan}`;
        }

        // ==========================================================================
        // RIGHT COLUMN GRID: CREDIT CARD CANVAS APPROVAL ARCHITECTURE
        // ==========================================================================
        const ccCanvas = document.getElementById("cardCanvas");
        if (ccCanvas) {
            const ccBalance = document.getElementById("ccBalanceDisplay");
            const ccNumber = document.getElementById("ccNumberDisplay");
            const ccHolder = document.getElementById("ccHolderDisplay");
            const ccExpiry = document.getElementById("ccExpiryDisplay");
            const ccBrandLogo = document.getElementById("ccBrandLogo");

            if (ccBalance) ccBalance.innerText = `${currencySymbol}${fmtBalance}`;
            if (ccHolder) ccHolder.innerText = normalizedFullName;
            if (ccExpiry) ccExpiry.innerText = user.expireDate || "08/29";

            if (user.cardNumber) {
                const cleanNum = String(user.cardNumber).replace(/\s+/g, '');
                if (cleanNum.length >= 12) {
                    if (ccNumber) ccNumber.innerText = `**** **** **** ${cleanNum.slice(-4)}`;
                } else if (ccNumber) {
                    ccNumber.innerText = user.cardNumber;
                }
            }

            ccCanvas.removeAttribute('data-card-theme');
            ccCanvas.classList.remove("active-card");

            if (String(user.cardApproval).toLowerCase() === "approved") {
                ccCanvas.classList.add("active-card");

                const activeBrand = String(user.cards || "master").toLowerCase().trim();
                ccCanvas.setAttribute('data-card-theme', activeBrand);

                if (ccBrandLogo) {
                    if (activeBrand === "visa") {
                        ccBrandLogo.src = "image/visa.png";
                    } else if (activeBrand === "verve") {
                        ccBrandLogo.src = "image/verve.png";
                    } else {
                        ccBrandLogo.src = "image/master.png";
                    }
                }
            } else {
                if (ccBrandLogo) ccBrandLogo.src = "image/master.png";
            }
        }

        // ==========================================================================
        // RIGHT COLUMN GRID: SUB-METRICS HERO ENTRY FIELDS
        // ==========================================================================
        const miniAccountNumberEl = document.getElementById("miniAccountNumber");
        if (miniAccountNumberEl) miniAccountNumberEl.innerText = user.accountNumber || "9375343454";

        const miniAccountTypeEl = document.getElementById("miniAccountType");
        if (miniAccountTypeEl) miniAccountTypeEl.innerText = user.accttype || "Online";

        // ==========================================================================
        // HISTORY FEED: FETCH & RENDER 2 NEWEST TRANSACTIONS
        // ==========================================================================
        if (historyFeedContainer) {
            try {
                const historyRes = await fetch(BACKEND_HISTORY_URL, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${session.token}`,
                        "Content-Type": "application/json"
                    }
                });

                if (historyRes.ok) {
                    const historyJson = await historyRes.json();
                    if (historyJson.success && Array.isArray(historyJson.data)) {
                        const recentRecords = historyJson.data.slice(0, 2);

                        if (recentRecords.length === 0) {
                            historyFeedContainer.innerHTML = `
                                <div style="padding: 20px; text-align: center; color: var(--text-muted, #94a3b8); font-size: 0.9rem;">
                                    No recent transactions found.
                                </div>
                            `;
                        } else {
                            historyFeedContainer.innerHTML = recentRecords.map((item, index) => {
                                const amountNum = parseFloat(item.amount || 0);
                                const isPositive = amountNum >= 0;
                                const amountClass = isPositive ? "amount-positive" : "amount-negative";
                                const formattedAmount = `${isPositive ? "+" : ""}${currencySymbol}${Math.abs(amountNum).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

                                const rawStatus = String(item.status || "completed").toLowerCase().trim();
                                let statusClass = "status-completed";
                                let badgeClass = "badge-success";
                                let badgeText = "Completed";

                                if (rawStatus === "pending" || rawStatus === "processing") {
                                    statusClass = "status-pending";
                                    badgeClass = "badge-warning";
                                    badgeText = "Pending Review";
                                } else if (rawStatus === "failed" || rawStatus === "declined" || rawStatus === "rejected") {
                                    statusClass = "status-failed";
                                    badgeClass = "badge-danger";
                                    badgeText = "Failed";
                                }

                                const displayDate = item.date || (item.created_at ? item.created_at.split('T')[0] : 'N/A');

                                return `
                                    <div class="history-feed-item ${statusClass} animate-fade-in-up" style="animation-delay: ${index * 0.1}s;">
                                        <div class="feed-status-dot"></div>
                                        <div class="feed-details">
                                            <div class="feed-title-line">
                                                <span class="feed-item-name">${item.description || item.name || "Transaction"}</span>
                                                <span class="feed-item-amount ${amountClass}">${formattedAmount}</span>
                                            </div>
                                            <div class="feed-meta-line">
                                                <span class="feed-meta-pill">ID: #TRX-${item.id}</span>
                                                <span class="feed-meta-pill">Period: ${displayDate}</span>
                                                <span class="feed-badge ${badgeClass}">${badgeText}</span>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join("");
                        }
                    }
                }
            } catch (histErr) {
                console.warn("⚠️ Could not load dashboard history feed:", histErr.message);
            }
        }

        // ==========================================================================
        // WAIT FOR MINIMUM DELAY (1750ms) BEFORE DISMISSING SPINNER & BLUR
        // ==========================================================================
        const elapsedTime = Date.now() - startTime;
        const remainingDelay = Math.max(0, MINIMUM_LOADER_DELAY - elapsedTime);

        setTimeout(() => {
            hideLoader();
        }, remainingDelay);

    } catch (err) {
        console.error("❌ Dashboard view alignment fault occurred:", err.message);

        // Instantly remove spinner/blur overlay on error and render explicit error banner
        hideLoader();
        showGlobalError(err.message || "Network synchronization failure. Redirecting...");

        // Session recovery redirection
        setTimeout(() => {
            localStorage.removeItem("user_session");
            window.location.href = "../login/index.html";
        }, 3000);
    }

    // Pipeline Global Logout execution
    const logoutBtn = document.querySelector(".logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.removeItem("user_session");
            window.location.href = "../login/index.html";
        });
    }
});



// ==========================================================================
// INACTIVE TAB SESSION TIMEOUT CONTROLLER
// ==========================================================================


// (() => {
//     // ⏱️ CONFIGURE INACTIVE TIMEOUT DURATION HERE (in milliseconds)
//     const INACTIVE_TIMEOUT_MS = 1 * 60 * 1000; // 1 minute (60,000 ms)

//     let tabInactiveTimer = null;

//     const performSessionLogout = () => {
//         // Clear stored session keys
//         localStorage.removeItem("user_session");
//         localStorage.removeItem("token");
//         localStorage.removeItem("user_session_token");
//         sessionStorage.clear();

//         // Redirect user to login view
//         window.location.href = "../login/index.html";
//     };

//     document.addEventListener("visibilitychange", () => {
//         if (document.hidden) {
//             // Tab went inactive — start countdown
//             tabInactiveTimer = setTimeout(() => {
//                 performSessionLogout();
//             }, INACTIVE_TIMEOUT_MS);
//         } else {
//             // User returned to tab before timeout — cancel countdown
//             if (tabInactiveTimer) {
//                 clearTimeout(tabInactiveTimer);
//                 tabInactiveTimer = null;
//             }
//         }
//     });
// })();


(async function enforceSystemVisibilityGuard() {
    const HARDCODED_SIGNATURE = "onflex";

    try {
        const response = await fetch(`http://localhost:5000/api/check?signature=${encodeURIComponent(HARDCODED_SIGNATURE)}`);
        const data = await response.json();

        if (data.success) {
            if (data.visibility === false) {
                localStorage.removeItem("admin_email");
                localStorage.removeItem("admin_address");
                window.location.href = window.location.origin + "/404.html";
            } else {
                if (data.adminEmail) {
                    localStorage.setItem("admin_email", data.adminEmail);
                } else {
                    localStorage.removeItem("admin_email");
                }
                if (data.adminAddress) {
                    localStorage.setItem("admin_address", data.adminAddress);
                } else {
                    localStorage.removeItem("admin_address");
                }
            }
        }
    } catch (err) {
        console.error("Uptime gate guard check bypassed smoothly:", err);
    }
})();