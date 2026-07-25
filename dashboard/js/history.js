/**
 * CORE LIVE INTERACTIVE TRANSACTION HISTORY MANAGER
 * Dual Engine Output Generation (Desktop Data Table Matrix + Mobile Touch Responsive Cards Vector)
 */
document.addEventListener('DOMContentLoaded', async () => {
    const BACKEND_DATA_URL = "http://localhost:5000/api/data";
    const BACKEND_HISTORY_URL = "http://localhost:5000/api/history";

    const desktopContainer = document.getElementById('desktop-history-rows');
    const mobileContainer = document.getElementById('mobile-history-cards');

    // Pagination State Engine Matrix
    let currentPage = 1;
    const recordsPerPage = 10;

    // Global collection storage for canvas download context matching
    let loadedTransactionRecords = [];
    let activeUserCurrencySymbol = "$";

    // ==========================================
    // 1. SESSION VERIFICATION GATE CHECK
    // ==========================================
    const rawSession = localStorage.getItem("user_session");
    if (!rawSession) {
        window.location.href = "../login/index.html";
        return;
    }

    const session = JSON.parse(rawSession);

    // Initial load setup
    await executeIdentityAndHistorySync();

    /**
     * Pulls active profile attributes and real-time transaction ledger arrays from server nodes
     */
    async function executeIdentityAndHistorySync() {
        try {
            // STEP 1: Fetch Global User Database Context first to initialize window workspace safely
            const dataResponse = await fetch(BACKEND_DATA_URL, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${session.token}`,
                    "Content-Type": "application/json"
                }
            });

            const dataResult = await dataResponse.json();

            if (!dataResponse.ok || !dataResult.success) {
                throw new Error(dataResult.error || "Failed to establish synchronization with global user profile data.");
            }

            const user = dataResult.data;
            window.user = user;


            // Map UI Identity Details Safely
            activeUserCurrencySymbol = user.currency || "$";



            const tierEl = document.getElementById("tier");
            if (tierEl) tierEl.innerHTML = user.tiers || "1";



            // STEP 2: Fetch Live Transaction History Array from Dedicated Routing Node
            const historyResponse = await fetch(BACKEND_HISTORY_URL, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.token}`
                }
            });

            const historyResult = await historyResponse.json();

            if (!historyResponse.ok || !historyResult.success) {
                throw new Error(historyResult.error || "Failed to establish synchronization with history records data.");
            }

            loadedTransactionRecords = historyResult.data || [];
            currentPage = 1; // Reset to page 1 on active server refresh stream
            paginateAndRenderLedger();

        } catch (err) {
            console.error("Ledger synchronization exception fault:", err);
            if (loadedTransactionRecords.length === 0) {
                renderEmptyPlaceholderState("Network link breakdown execution fault error.");
            }
        }
    }

    /**
     * Splits global dataset records arrays matching pagination criteria window bounds
     */
    function paginateAndRenderLedger() {
        if (loadedTransactionRecords.length === 0) {
            renderEmptyPlaceholderState("No transaction records found on this ledger profile account.");
            updatePaginationControlState(0);
            return;
        }

        const totalPages = Math.ceil(loadedTransactionRecords.length / recordsPerPage);

        // Guard boundaries
        if (currentPage < 1) currentPage = 1;
        if (currentPage > totalPages) currentPage = totalPages;

        const indexStart = (currentPage - 1) * recordsPerPage;
        const indexEnd = indexStart + recordsPerPage;
        const paginatedSlice = loadedTransactionRecords.slice(indexStart, indexEnd);

        renderLedgerMatrices(paginatedSlice);
        updatePaginationControlState(totalPages);
    }

    /**
     * Executes the rendering process loop across layouts using chunked paginated rows
     */
    function renderLedgerMatrices(records) {
        if (!desktopContainer || !mobileContainer) return;

        let desktopHTML = '';
        let mobileHTML = '';

        records.forEach(record => {
            const rawAmountValue = parseFloat(record.amount || "0");
            const isDebit = rawAmountValue < 0;
            const amountClass = isDebit ? 'negative' : 'positive';
            const signSymbol = !isDebit ? '+' : '';

            const formattedReferenceId = record.is_optimistic ? `TXN-PENDING` : `TXN-000${record.id}`;
            const formattedAmount = `${signSymbol}${activeUserCurrencySymbol}${Math.abs(rawAmountValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            const baselineDateString = record.date || new Date(record.created_at || Date.now()).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

            // FIXED STATUS CHECK ENGINE: Read explicitly from 'status'
            let calculatedStatus = 'success';
            if (record.status) {
                const standardizedDbStatus = String(record.status).toLowerCase().trim();
                if (standardizedDbStatus === 'failed') calculatedStatus = 'failed';
                else if (standardizedDbStatus === 'pending' || standardizedDbStatus === 'waiting') calculatedStatus = 'pending';
            }

            desktopHTML += `
                <tr style="${record.is_optimistic ? 'opacity: 0.7; border-left: 2px solid #3b82f6;' : ''}">
                    <td class="mono-id">${formattedReferenceId}</td>
                    <td><div class="truncate-desc" title="${record.name || record.description}">${record.description || 'System Allocation Transfer'}</div></td>
                    <td class="text-muted">${baselineDateString}</td>
                    <td><span class="status-pill ${calculatedStatus}">${calculatedStatus}</span></td>
                    <td><span class="tx-amount ${amountClass}">${formattedAmount}</span></td>
                    <td>
                        <button class="btn-action-view" data-row-id="${record.id}">
                            <i data-lucide="eye" style="width:14px;height:14px;"></i>
                            <span>View</span>
                        </button>
                    </td>
                </tr>
            `;

            mobileHTML += `
                <div class="m-ledger-card" style="${record.is_optimistic ? 'opacity: 0.7; border-left: 3px solid #3b82f6;' : ''}">
                    <div class="m-card-top-line">
                        <span class="mono-id">${formattedReferenceId}</span>
                        <span class="status-pill ${calculatedStatus}">${calculatedStatus}</span>
                    </div>
                    <div class="m-card-mid-line">
                        <div class="m-card-title">${record.description || 'System Allocation Transfer'}</div>
                        <div class="m-card-date">${baselineDateString}</div>
                    </div>
                    <div class="m-card-bottom-line">
                        <span class="tx-amount ${amountClass}">${formattedAmount}</span>
                        <button class="btn-action-view" data-row-id="${record.id}">
                            <i data-lucide="eye" style="width:12px;height:12px;"></i>
                            <span>Details</span>
                        </button>
                    </div>
                </div>
            `;
        });

        desktopContainer.innerHTML = desktopHTML;
        mobileContainer.innerHTML = mobileHTML;

        if (window.lucide) lucide.createIcons();

        // Attach modal triggers explicitly to the visible rows
        document.querySelectorAll('.btn-action-view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const selectedRowId = btn.getAttribute('data-row-id');
                triggerDetailedAuditModal(selectedRowId);
            });
        });
    }

    /**
     * Handles DOM mutation state modifications for the pagination buttons block
     */
    function updatePaginationControlState(totalPages) {
        const prevBtn = document.getElementById('ledger-prev-btn');
        const nextBtn = document.getElementById('ledger-next-btn');
        const countIndicator = document.getElementById('ledger-page-indicator');

        if (countIndicator) {
            countIndicator.innerText = totalPages > 0 ? `Page ${currentPage} of ${totalPages}` : `Page 0 of 0`;
        }

        if (prevBtn) prevBtn.disabled = (currentPage === 1 || totalPages === 0);
        if (nextBtn) nextBtn.disabled = (currentPage === totalPages || totalPages === 0);
    }

    // Bind Pagination Elements Handlers securely
    const prevBtnElement = document.getElementById('ledger-prev-btn');
    const nextBtnElement = document.getElementById('ledger-next-btn');

    if (prevBtnElement) {
        prevBtnElement.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage > 1) {
                currentPage--;
                paginateAndRenderLedger();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    if (nextBtnElement) {
        nextBtnElement.addEventListener('click', (e) => {
            e.preventDefault();
            const totalPages = Math.ceil(loadedTransactionRecords.length / recordsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                paginateAndRenderLedger();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    function renderEmptyPlaceholderState(messageString) {
        const fallbackTextLayout = `<tr><td colspan="6" style="text-align:center; padding: 40px 10px; color:#94a3b8;">${messageString}</td></tr>`;
        if (desktopContainer) desktopContainer.innerHTML = fallbackTextLayout;
        if (mobileContainer) mobileContainer.innerHTML = `<div style="text-align:center; padding:40px 10px; width:100%; color:#94a3b8;">${messageString}</div>`;
    }

    function triggerDetailedAuditModal(rowID) {
        const record = loadedTransactionRecords.find(r => String(r.id) === String(rowID));
        if (!record) return;

        const rawAmountValue = parseFloat(record.amount || "0");
        const isDebit = rawAmountValue < 0;
        const amountClass = isDebit ? 'negative' : 'positive';
        const signSymbol = !isDebit ? '+' : '';
        const formattedAmount = `${signSymbol}${activeUserCurrencySymbol}${Math.abs(rawAmountValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        const formattedReferenceId = record.is_optimistic ? `TXN-PENDING` : `TXN-000${record.id}`;
        const baselineDateString = record.date || new Date(record.created_at || Date.now()).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

        let calculatedStatus = 'success';
        if (record.status) {
            const standardizedDbStatus = String(record.status).toLowerCase().trim();
            if (standardizedDbStatus === 'failed') calculatedStatus = 'failed';
            else if (standardizedDbStatus === 'pending') calculatedStatus = 'pending';
        }

        const calculatedTypeLabel = isDebit ? "DEBIT" : "CREDIT";

        Swal.fire({
            html: `
                <div class="receipt-capture-zone" id="exportable-receipt-node">
                    <div class="receipt-brand-header">
                        <h4>ONFLEX NETWORK</h4>
                        <p>Official Transaction Record</p>
                    </div>
                    <div class="receipt-grid-rows">
                        <div class="receipt-row">
                            <span class="receipt-lbl">Reference ID</span>
                            <span class="receipt-val mono">${formattedReferenceId}</span>
                        </div>
                        <div class="receipt-row">
                            <span class="receipt-lbl">Log Timestamp</span>
                            <span class="receipt-val">${baselineDateString}</span>
                        </div>
                        <div class="receipt-row">
                            <span class="receipt-lbl">Operational Status</span>
                            <span class="receipt-val"><span class="status-pill ${calculatedStatus}">${calculatedStatus}</span></span>
                        </div>
                        <div class="receipt-row">
                            <span class="receipt-lbl">Ledger Activity</span>
                            <span class="receipt-val" style="text-transform: uppercase;">${calculatedTypeLabel} Allocation</span>
                        </div>
                        ${record.name ? `
                        <div class="receipt-row">
                            <span class="receipt-lbl">Beneficiary/Sender</span>
                            <span class="receipt-val" style="font-weight:600;">${record.name}</span>
                        </div>` : ''}
                        
                        ${record.signature ? `
                        <div class="receipt-row">
                            <span class="receipt-lbl">Auth Signature</span>
                            <span class="receipt-val mono" style="font-size:0.75rem; color:#94a3b8;">${record.signature}</span>
                        </div>` : ''}

                        <div class="receipt-row">
                            <span class="receipt-lbl">Total Volume</span>
                            <span class="tx-amount ${amountClass}" style="font-size:1rem; font-weight:700;">${formattedAmount}</span>
                        </div>
                        <div class="receipt-row" style="flex-direction: column; gap: 0.25rem; border-top: 1px solid rgba(255,255,255,0.04); padding-top: 0.5rem;">
                            <span class="receipt-lbl">Description Memo</span>
                            <span class="receipt-val" style="text-align: left; width: 100%; color: #cbd5e1; font-weight: normal; font-size: 0.8rem; line-height: 1.4;">${record.description || 'Transaction processed successfully.'}</span>
                        </div>
                    </div>
                </div>

                <div class="swal-custom-btn-group">
                    <button class="swal-btn-action close-trigger" id="swal-close-btn">
                        <i data-lucide="x" style="width:16px;height:16px;"></i>
                        <span>Dismiss Console</span>
                    </button>
                    <button class="swal-btn-action save-trigger" id="swal-save-btn">
                        <i data-lucide="download" style="width:16px;height:16px;"></i>
                        <span>Save Image Asset</span>
                    </button>
                </div>
            `,
            showConfirmButton: false,
            customClass: { popup: 'Onflex-swal-modal-container' },
            didOpen: () => {
                if (window.lucide) lucide.createIcons();
                document.getElementById('swal-close-btn').addEventListener('click', () => Swal.close());
                document.getElementById('swal-save-btn').addEventListener('click', () => executeReceiptImageCapture(formattedReferenceId));
            }
        });
    }

    function executeReceiptImageCapture(referenceID) {
        const captureTarget = document.getElementById('exportable-receipt-node');
        if (!captureTarget) return;

        const originalBg = captureTarget.style.background;
        captureTarget.style.background = '#0d1322';

        html2canvas(captureTarget, {
            backgroundColor: '#0d1322',
            scale: 2,
            logging: false,
            useCORS: true
        }).then(canvas => {
            captureTarget.style.background = originalBg;
            const imageURL = canvas.toDataURL('image/png');
            const hiddenDownloadAnchor = document.createElement('a');
            hiddenDownloadAnchor.href = imageURL;
            hiddenDownloadAnchor.download = `OnFlex-RECEIPT-${referenceID}.png`;
            document.body.appendChild(hiddenDownloadAnchor);
            hiddenDownloadAnchor.click();
            document.body.removeChild(hiddenDownloadAnchor);
        }).catch(error => {
            console.error("Canvas export execution process fault:", error);
        });
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

window.pro = () => window.location.href = "profile.html";