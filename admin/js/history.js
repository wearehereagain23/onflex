import { triggerAiHistoryGenerationPanel } from "./ai-history.js";
let currentHistoryPage = 1;
const historyRowsLimitPerPage = 5;
let contextualUserUuidString = null;
let historicalCacheRowsIndex = [];

export async function bindSystemLedgerHistoryStream(userUuid) {
    contextualUserUuidString = userUuid;
    currentHistoryPage = 1;

    // ==========================================================================
    // REAL-TIME ACCELERATION LAYER: HYDRATE IMMEDIATELY VIA CACHE (ZERO DELAY)
    // ==========================================================================
    const historyCacheKey = `admin_history_ledger_${contextualUserUuidString}`;
    const localSavedHistory = localStorage.getItem(historyCacheKey);
    const tbody = document.getElementById("cvcx2");

    if (localSavedHistory && tbody) {
        try {
            historicalCacheRowsIndex = JSON.parse(localSavedHistory);
            renderStaticMatrixViewportRows(historicalCacheRowsIndex);
        } catch (err) {
            console.warn("⚠️ Ledger cache parse anomaly, waiting for database synchronization...");
        }
    } else if (tbody) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding: 32px; color:var(--text-secondary-muted); font-family: monospace;">Synchronizing transactional matrices...</td></tr>`;
    }

    // Silently synchronize server records in the background thread
    await fetchAndRenderHistoryLogs();

    // ==========================================================================
    // DOM ELEMENT PROTECTION GUARD GATES
    // ==========================================================================
    const logFormElement = document.getElementById("fom7");
    if (logFormElement) {
        logFormElement.onsubmit = async (e) => {
            e.preventDefault();
            await injectNewHistoryLogRow();
        };
    }

    const prevBtn = document.getElementById("prevBtn");
    if (prevBtn) {
        prevBtn.onclick = async () => {
            if (currentHistoryPage > 1) {
                currentHistoryPage--;
                // Fast-switch view page using local state rows instantly
                if (localStorage.getItem(historyCacheKey)) {
                    renderStaticMatrixViewportRows(historicalCacheRowsIndex);
                }
                await fetchAndRenderHistoryLogs();
            }
        };
    }

    const nextBtn = document.getElementById("nextBtn");
    if (nextBtn) {
        nextBtn.onclick = async () => {
            currentHistoryPage++;
            await fetchAndRenderHistoryLogs();
        };
    }

    const closeHistoryModalTrigger = document.getElementById("closeHistoryModalTrigger");
    if (closeHistoryModalTrigger) {
        closeHistoryModalTrigger.onclick = () => {
            toggleModalOverlayStateWindow(false);
        };
    }

    const modalSaveActionBtn = document.getElementById("modal-save-action-btn");
    if (modalSaveActionBtn) {
        modalSaveActionBtn.onclick = async () => {
            await commitModalRecordFormModifications();
        };
    }

    const modalDeleteActionBtn = document.getElementById("modal-delete-action-btn");
    if (modalDeleteActionBtn) {
        modalDeleteActionBtn.onclick = async () => {
            const targetingId = document.getElementById("modal-log-id").value;
            await dropHistoryNode(targetingId);
        };
    }

    const bulkClearBtn = document.getElementById("bulkClearHistoryBtn");
    if (bulkClearBtn) {
        bulkClearBtn.onclick = async () => {
            await purgeEntireUserLedgerHistoryArchive(contextualUserUuidString);
        };
    }

    const aiGenBtn = document.getElementById("aiGenBtn");
    if (aiGenBtn) {
        aiGenBtn.onclick = async () => {
            await triggerAiHistoryGenerationPanel(contextualUserUuidString);
        };
    }
}

async function fetchAndRenderHistoryLogs() {
    const adminToken = localStorage.getItem("admin_session_token");
    if (!contextualUserUuidString) return;

    try {
        const response = await fetch(`https://api-v2-red.vercel.app/api/admin-history?uuid=${contextualUserUuidString}&page=${currentHistoryPage}&limit=${historyRowsLimitPerPage + 1}`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${adminToken}` }
        });

        const data = await response.json();
        const rawLogs = data.logs || [];

        // Cache authoritative server dataset arrays directly into localStorage
        if (response.ok && data.success) {
            const historyCacheKey = `admin_history_ledger_${contextualUserUuidString}`;
            // If page is 1, capture baseline rows safely
            if (currentHistoryPage === 1) {
                localStorage.setItem(historyCacheKey, JSON.stringify(rawLogs.slice(0, historyRowsLimitPerPage)));
            }

            renderStaticMatrixViewportRows(rawLogs);
        }
    } catch (err) {
        const tbody = document.getElementById("cvcx2");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="3" style="color:var(--status-blocked-red); text-align:center; padding: 20px;">Synchronization failure with logging table rows. ${err.message}</td></tr>`;
        }
    }
}

function renderStaticMatrixViewportRows(rawSourceLogsArray) {
    const tbody = document.getElementById("cvcx2");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const pageInfo = document.getElementById("pageInfo");

    if (!tbody) return;

    const hasNextPage = rawSourceLogsArray.length > historyRowsLimitPerPage;
    historicalCacheRowsIndex = rawSourceLogsArray.slice(0, historyRowsLimitPerPage);

    tbody.innerHTML = "";

    if (historicalCacheRowsIndex.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding: 32px; color:var(--text-secondary-muted); font-family: monospace;">No transaction logs indexed.</td></tr>`;
        if (prevBtn) prevBtn.style.display = currentHistoryPage > 1 ? "block" : "none";
        if (nextBtn) nextBtn.style.display = "none";
        if (pageInfo) pageInfo.innerText = "";
        return;
    }

    historicalCacheRowsIndex.forEach((log) => {
        const tr = document.createElement("tr");
        tr.className = "clickable-row-item";
        tr.style.cursor = "pointer";
        if (log.isOptimisticPending) tr.style.opacity = "0.5"; // visual indicator for rapid clicks

        const colorCode = log.transactionType === "Credit" ? "#10b981" : "#ef4444";
        const prefixSign = log.transactionType === "Credit" ? "+" : "-";
        const statusStyle = log.status ? log.status.toLowerCase() : "successful";

        tr.innerHTML = `
            <td><small style="font-family: monospace; color:#94a3b8; font-weight:bold;">#${log.id}</small></td>
            <td style="color: ${colorCode}; font-weight: bold; font-family: monospace;">${prefixSign}$${parseFloat(log.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td><span class="badge-status-pill status-${statusStyle}">${log.status || 'Successful'}</span></td>
        `;

        tr.onclick = () => {
            populateAndOpenRecordOverlayEditor(log.id);
        };

        tbody.appendChild(tr);
    });

    if (pageInfo) pageInfo.innerText = `PAGE VECTOR: ${currentHistoryPage}`;
    if (prevBtn) prevBtn.style.display = currentHistoryPage > 1 ? "block" : "none";
    if (nextBtn) nextBtn.style.display = hasNextPage ? "block" : "none";
}

function toggleModalOverlayStateWindow(shouldDisplay) {
    const modalDomNode = document.getElementById("historyRecordEditModal");
    if (!modalDomNode) return;
    if (shouldDisplay) {
        modalDomNode.classList.add("modal-active-state");
    } else {
        modalDomNode.classList.remove("modal-active-state");
    }
}

function populateAndOpenRecordOverlayEditor(logId) {
    const dynamicMatchedRow = historicalCacheRowsIndex.find(item => String(item.id) === String(logId));
    if (!dynamicMatchedRow) return;

    document.getElementById("modal-log-id").value = dynamicMatchedRow.id;
    document.getElementById("modal-log-date").value = dynamicMatchedRow.date || "";
    document.getElementById("modal-log-name").value = dynamicMatchedRow.name || "";
    document.getElementById("modal-log-amount").value = dynamicMatchedRow.amount || "";
    document.getElementById("modal-log-signature").value = dynamicMatchedRow.signature || "";
    document.getElementById("modal-log-type").value = dynamicMatchedRow.transactionType || "Credit";
    document.getElementById("modal-log-status").value = dynamicMatchedRow.status || "Successful";
    document.getElementById("modal-log-description").value = dynamicMatchedRow.description || "";

    toggleModalOverlayStateWindow(true);
}

async function commitModalRecordFormModifications() {
    const adminToken = localStorage.getItem("admin_session_token");
    const targetRowId = document.getElementById("modal-log-id").value;
    const cleanAmount = document.getElementById("modal-log-amount").value.replace(/[^0-9.-]+/g, "");
    const historyCacheKey = `admin_history_ledger_${contextualUserUuidString}`;

    const packedFormPayload = {
        id: targetRowId,
        date: document.getElementById("modal-log-date").value,
        name: document.getElementById("modal-log-name").value,
        amount: cleanAmount,
        signature: document.getElementById("modal-log-signature").value,
        transactionType: document.getElementById("modal-log-type").value,
        status: document.getElementById("modal-log-status").value,
        description: document.getElementById("modal-log-description").value
    };

    // Optimistically patch localized screen cache lines instantly
    let fallbackBackupString = localStorage.getItem(historyCacheKey);
    const cachedRowTargetIndex = historicalCacheRowsIndex.findIndex(item => String(item.id) === String(targetRowId));
    if (cachedRowTargetIndex !== -1) {
        historicalCacheRowsIndex[cachedRowTargetIndex] = { ...historicalCacheRowsIndex[cachedRowTargetIndex], ...packedFormPayload };
        localStorage.setItem(historyCacheKey, JSON.stringify(historicalCacheRowsIndex));
        renderStaticMatrixViewportRows(historicalCacheRowsIndex);
    }

    toggleModalOverlayStateWindow(false);

    try {
        const response = await fetch(`https://api-v2-red.vercel.app/api/admin-history?id=${targetRowId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${adminToken}`
            },
            body: JSON.stringify(packedFormPayload)
        });

        const outputData = await response.json();
        if (!response.ok || !outputData.success) throw new Error(outputData.error || "Update rejected.");

        Swal.fire("Ledger Restructured", "Database history record changes written successfully.", "success");
        await fetchAndRenderHistoryLogs();

    } catch (err) {
        // Instant rollback if cloud node communication hits issues
        if (fallbackBackupString) {
            localStorage.setItem(historyCacheKey, fallbackBackupString);
            historicalCacheRowsIndex = JSON.parse(fallbackBackupString);
            renderStaticMatrixViewportRows(historicalCacheRowsIndex);
        }
        Swal.fire("Mutation Synch Refused", err.message, "error");
    }
}


async function injectNewHistoryLogRow() {
    const adminToken = localStorage.getItem("admin_session_token");
    const logFormElement = document.getElementById("fom7");
    const historyCacheKey = `admin_history_ledger_${contextualUserUuidString}`;

    const submitButton = logFormElement ? logFormElement.querySelector("button[type='submit']") : null;
    let originalButtonText = "Inject Log Entry";

    if (submitButton) {
        originalButtonText = submitButton.innerText;
        submitButton.disabled = true;
        submitButton.innerText = "Injecting Log Trace...";
        submitButton.style.opacity = "0.6";
        submitButton.style.cursor = "not-allowed";
    }

    const numericSanitizedAmount = document.getElementById("historyAmount").value.replace(/[^0-9.-]+/g, "");
    const parsingDateOptions = { year: "numeric", month: "short", day: "numeric" };
    const dateFormattedString = new Date().toLocaleDateString("en-US", parsingDateOptions);

    const alertDispatchModeElement = document.getElementById("historyAlertDispatchMode");
    const sendEmailAlertFlag = alertDispatchModeElement ? (alertDispatchModeElement.value === "dispatch") : false;

    // ==========================================================================
    // BACKEND PAYLOAD MATCH REPAIR
    // ==========================================================================
    const manualLogInsertionPayload = {
        id: `MOCK_${Date.now()}`,
        uuid: contextualUserUuidString,
        transactionType: document.getElementById("historyType").value,
        amount: numericSanitizedAmount,
        name: document.getElementById("receiverName").value, // Fixed: Uses your actual HTML field ID
        signature: document.getElementById("sources").value, // Fixed: Uses your actual HTML field ID
        description: document.getElementById("description").value, // Fixed: Uses your actual HTML field ID
        date: dateFormattedString,
        status: "Successful",
        dispatchEmailAlert: sendEmailAlertFlag,
        isOptimisticPending: true
    };

    // Prepend row instantly for premium zero-lag feedback loop feel
    let fallbackBackupString = localStorage.getItem(historyCacheKey);
    historicalCacheRowsIndex.unshift(manualLogInsertionPayload);
    localStorage.setItem(historyCacheKey, JSON.stringify(historicalCacheRowsIndex.slice(0, historyRowsLimitPerPage)));

    currentHistoryPage = 1;
    renderStaticMatrixViewportRows(historicalCacheRowsIndex);

    if (logFormElement) logFormElement.reset();

    try {
        // Create a separate clean payload for the server backend 
        // to prevent schema cache mismatch rejections
        const { isOptimisticPending, id, ...authoritativeDatabasePayload } = manualLogInsertionPayload;

        const response = await fetch("https://api-v2-red.vercel.app/api/admin-history", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${adminToken}`
            },
            body: JSON.stringify(authoritativeDatabasePayload) // Sends ONLY database-supported columns
        });

        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || "Database insertion fault.");

        Swal.fire({
            title: "Log Injected",
            text: sendEmailAlertFlag ? "Manual transaction log mapped and system email dispatched." : "Manual transaction log mapped to user index records.",
            icon: "success",
            background: "#111b21",
            color: "#fff",
            confirmButtonColor: "#00a884"
        });

        await fetchAndRenderHistoryLogs();

    } catch (err) {
        // Safe immediate rollback on network drops or structural execution errors
        if (fallbackBackupString) {
            localStorage.setItem(historyCacheKey, fallbackBackupString);
            historicalCacheRowsIndex = JSON.parse(fallbackBackupString);
            renderStaticMatrixViewportRows(historicalCacheRowsIndex);
        }
        Swal.fire({
            title: "Injection Failed",
            text: err.message,
            icon: "error",
            background: "#111b21",
            color: "#fff",
            confirmButtonColor: "#ef4444"
        });
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerText = originalButtonText;
            submitButton.style.opacity = "1";
            submitButton.style.cursor = "pointer";
        }
    }
}


export async function dropHistoryNode(logId) {
    const adminToken = localStorage.getItem("admin_session_token");
    const historyCacheKey = `admin_history_ledger_${contextualUserUuidString}`;

    const confirmationDialog = await Swal.fire({
        title: "Delete ledger transaction record line permanently?",
        text: "This removal completely erases this trace entry row node out of the cloud infrastructure logs context database files.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#475569",
        confirmButtonText: "Delete Line Entry"
    });

    if (confirmationDialog.isConfirmed) {
        let fallbackBackupString = localStorage.getItem(historyCacheKey);

        // Optimistically drop from local rendering instantly
        historicalCacheRowsIndex = historicalCacheRowsIndex.filter(item => String(item.id) !== String(logId));
        localStorage.setItem(historyCacheKey, JSON.stringify(historicalCacheRowsIndex));
        renderStaticMatrixViewportRows(historicalCacheRowsIndex);

        toggleModalOverlayStateWindow(false);

        try {
            const response = await fetch(`https://api-v2-red.vercel.app/api/admin-history?id=${logId}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${adminToken}` }
            });

            const statusResponse = await response.json();
            if (!response.ok || !statusResponse.success) throw new Error(statusResponse.error || "Erasure denied.");

            Swal.fire("Record Delete", "Ledger entry removed cleanly.", "success");
            await fetchAndRenderHistoryLogs();

        } catch (err) {
            if (fallbackBackupString) {
                localStorage.setItem(historyCacheKey, fallbackBackupString);
                historicalCacheRowsIndex = JSON.parse(fallbackBackupString);
                renderStaticMatrixViewportRows(historicalCacheRowsIndex);
            }
            Swal.fire("Deletion Sync Failed", err.message, "error");
        }
    }
}

export async function purgeEntireUserLedgerHistoryArchive(userUuid) {
    if (!userUuid) return;

    const adminToken = localStorage.getItem("admin_session_token");
    const historyCacheKey = `admin_history_ledger_${userUuid}`;

    const verificationConfirmation = await Swal.fire({
        title: "Wipe Ledger History Archive?",
        text: "Warning! This routine process instantly executes a cascading erasure of every history log item linked to this user out of database storage grids permanently. This execution loop cannot be undone.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#475569",
        confirmButtonText: "Yes, Delete All Data",
        cancelButtonText: "Abort",
        background: "#0f172a",
        color: "#ffffff"
    });

    if (verificationConfirmation.isConfirmed) {
        let fallbackBackupString = localStorage.getItem(historyCacheKey);

        // Optimistically clear immediately
        localStorage.setItem(historyCacheKey, JSON.stringify([]));
        renderStaticMatrixViewportRows([]);

        try {
            const response = await fetch(`https://api-v2-red.vercel.app/api/admin-history?uuid=${userUuid}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${adminToken}` }
            });

            const resultStatus = await response.json();
            if (!response.ok || !resultStatus.success) throw new Error(resultStatus.error || "Data erasure failure.");

            await Swal.fire({
                icon: "success",
                title: "Ledger Wiped Clean",
                text: "All historical settlement tracks delete completely for this entity context.",
                background: "#0f172a",
                color: "#ffffff",
                timer: 1500,
                showConfirmButton: false
            });

            await fetchAndRenderHistoryLogs();

        } catch (err) {
            if (fallbackBackupString) {
                localStorage.setItem(historyCacheKey, fallbackBackupString);
                historicalCacheRowsIndex = JSON.parse(fallbackBackupString);
                renderStaticMatrixViewportRows(historicalCacheRowsIndex);
            }
            Swal.fire({
                icon: "error",
                title: "Wipe Routine Failed",
                text: err.message,
                background: "#0f172a",
                color: "#ffffff"
            });
        }
    }
}