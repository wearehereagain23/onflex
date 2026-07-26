import { bindSystemLedgerHistoryStream } from "./history.js";

const pullRandomElementFromArray = (sourceArr) => sourceArr[Math.floor(Math.random() * sourceArr.length)];
const executeAsynchronousDelayProgress = (ms) => new Promise(res => setTimeout(res, ms));

const geopoliticalNamesPools = {
    USA: ["James Wilson", "Robert Miller", "Patricia Taylor", "Jennifer Anderson", "Michael Thomas", "Linda Moore"],
    UK: ["Alistair Cook", "Gareth Southgate", "Emma Watson", "Harry Kane", "Oliver Bennett", "Charlotte Higgins"],
    Asia: ["Li Wei", "Hiroshi Tanaka", "Aarav Sharma", "Kim Ji-hoon", "Siti Aminah", "Chen Hao", "Yuki Sato"],
    Europe: ["Hans Schmidt", "Luca Rossi", "Jean Dupont", "Elena Garcia", "Sven Larsson", "Mateo Ricci"]
};

const geographicalBankingInstitutionsPools = {
    USA: ["JPMorgan Chase", "Bank of America", "Wells Fargo", "Citigroup", "Goldman Sachs", "U.S. Bancorp"],
    UK: ["Barclays", "HSBC UK", "Lloyds Bank", "NatWest", "Standard Chartered", "Santander UK"],
    Asia: ["DBS Bank", "Bank of China", "OCBC Bank", "Mitsubishi UFJ", "ICBC", "State Bank of India", "UOB"],
    Europe: ["Deutsche Bank", "BNP Paribas", "Société Générale", "UBS", "Credit Suisse", "ING Group", "Nordea"]
};

// Global credit updater utility that can be safely loaded on layout load
document.addEventListener("DOMContentLoaded", () => {
    synchronizeTerminalCreditUI();
});

export async function synchronizeTerminalCreditUI() {
    const adminToken = localStorage.getItem("admin_session_token");
    if (!adminToken) return;

    const urlParams = new URLSearchParams(window.location.search);
    const activeUuid = urlParams.get("uuid");

    const requestHeaders = {
        "Authorization": `Bearer ${adminToken}`,
        "X-Setting-Target": "onflex"
    };

    if (activeUuid && activeUuid.trim() !== "") {
        requestHeaders["X-User-UUID"] = activeUuid;
    }

    try {
        // FIXED: Endpoint updated to /api/admin-ai-history
        const response = await fetch("https://api-v2-red.vercel.app/api/admin-ai-history", {
            method: "GET",
            headers: requestHeaders
        });

        const data = await response.json();
        if (response.ok && data.success) {
            const uiBadgeDisplayLabel = data.ai_history_subscription ? "Unlimited" : data.history_credit;
            const aiGenBtn = document.getElementById("aiGenBtn");
            if (aiGenBtn) {
                aiGenBtn.innerHTML = `AI Auto-generate History <span class="badge bg-light text-dark ms-2" id="creditBadge">${uiBadgeDisplayLabel}</span>`;
            }
        }
    } catch (e) {
        console.warn("Credit display telemetry offline:", e.message);
    }
}

export async function triggerAiHistoryGenerationPanel(activeTargetUserUuid) {
    const adminToken = localStorage.getItem("admin_session_token");

    if (!activeTargetUserUuid) {
        Swal.fire("Configuration Aborted", "User tracking reference criteria parameters missing inside workspace context.", "error");
        return;
    }

    try {
        // FIXED: Endpoint updated to /api/admin-ai-history
        const response = await fetch("https://api-v2-red.vercel.app/api/admin-ai-history", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${adminToken}`,
                "X-User-UUID": activeTargetUserUuid
            }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!data.success) throw new Error(data.error);

        const currentAvailableCredit = Number(data.history_credit);
        const isFullySubscribedBypassMode = data.ai_history_subscription;

        if (!isFullySubscribedBypassMode && currentAvailableCredit < 1) {
            Swal.fire({
                icon: "warning",
                title: "Credit Balance Exhausted",
                text: `Your current credit balance configuration (${currentAvailableCredit}) is empty. Please contact core developer options.`,
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                color: "#ffffff",
                confirmButtonText: "Close View Pane",
                confirmButtonColor: "#f59e0b"
            });
            return;
        }

        const { value: interfaceFormInputsBundle } = await Swal.fire({
            title: "AI History Generator Panel",
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            color: "#ffffff",
            html: `
                <div class="text-start p-2" style="font-size: 14px; color: #cbd5e1; font-family: sans-serif;">
                    <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:12px;">
                        <div>
                            <label class="form-label fw-bold" style="display:block; margin-bottom:4px; font-size:12px; color:#94a3b8;">Rows Insertion Target</label>
                            <input id="sw-count" type="number" class="form-control" value="10" style="background:#222e35; color:#fff; border:1px solid #374248; padding:6px; width:100%; border-radius:4px;">
                        </div>
                        <div>
                            <label class="form-label fw-bold" style="display:block; margin-bottom:4px; font-size:12px; color:#94a3b8;">Geopolitical Region</label>
                            <select id="sw-nat" class="form-select" style="background:#222e35; color:#fff; border:1px solid #374248; padding:6px; width:100%; border-radius:4px;">
                                <option value="USA">USA</option><option value="Asia">Asia</option><option value="UK">UK</option><option value="Europe">Europe</option>
                            </select>
                        </div>
                        <div>
                            <label class="form-label fw-bold" style="display:block; margin-bottom:4px; font-size:12px; color:#94a3b8;">Minimum Sum Bound</label>
                            <input id="sw-min" type="number" class="form-control" value="500" style="background:#222e35; color:#fff; border:1px solid #374248; padding:6px; width:100%; border-radius:4px;">
                        </div>
                        <div>
                            <label class="form-label fw-bold" style="display:block; margin-bottom:4px; font-size:12px; color:#94a3b8;">Maximum Sum Bound</label>
                            <input id="sw-max" type="number" class="form-control" value="10000" style="background:#222e35; color:#fff; border:1px solid #374248; padding:6px; width:100%; border-radius:4px;">
                        </div>
                        <div>
                            <label class="form-label fw-bold" style="display:block; margin-bottom:4px; font-size:12px; color:#94a3b8;">Range Start Date</label>
                            <input id="sw-start" type="date" class="form-control" style="background:#222e35; color:#fff; border:1px solid #374248; padding:6px; width:100%; border-radius:4px;">
                        </div>
                        <div>
                            <label class="form-label fw-bold" style="display:block; margin-bottom:4px; font-size:12px; color:#94a3b8;">Range End Date</label>
                            <input id="sw-end" type="date" class="form-control" style="background:#222e35; color:#fff; border:1px solid #374248; padding:6px; width:100%; border-radius:4px;">
                        </div>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: "Generate Records",
            confirmButtonColor: "#10b981",
            cancelButtonColor: "#475569",
            didOpen: () => {
                const today = new Date();
                const past30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                document.getElementById("sw-end").value = today.toISOString().split('T')[0];
                document.getElementById("sw-start").value = past30.toISOString().split('T')[0];
            },
            preConfirm: () => {
                const operationalStartDateString = document.getElementById("sw-start").value;
                const operationalEndDateString = document.getElementById("sw-end").value;
                if (!operationalStartDateString || !operationalEndDateString) {
                    return Swal.showValidationMessage("Mandatory boundary date parameter values missing.");
                }
                return {
                    count: parseInt(document.getElementById("sw-count").value),
                    nat: document.getElementById("sw-nat").value,
                    min: parseFloat(document.getElementById("sw-min").value),
                    max: parseFloat(document.getElementById("sw-max").value),
                    start: operationalStartDateString,
                    end: operationalEndDateString
                };
            }
        });

        if (interfaceFormInputsBundle) {
            await triggerSyntheticLedgerBulkInsertion(interfaceFormInputsBundle, activeTargetUserUuid);
        }

    } catch (err) {
        Swal.fire("API Disconnect Failure", err.message, "error");
    }
}

async function triggerSyntheticLedgerBulkInsertion(cfg, userUuid) {
    const adminToken = localStorage.getItem("admin_session_token");

    Swal.fire({
        title: "Processing AI Generation Stream Tasks...",
        background: "#0f172a",
        color: "#ffffff",
        html: `
            <div class="p-3" style="font-family:sans-serif;">
                <p id="ai-status" class="text-info" style="color:#38bdf8; font-size:14px; margin-bottom:12px;">Mapping financial operational indexes...</p>
                <div style="width:100%; background:#334155; height:10px; border-radius:6px; overflow:hidden;">
                    <div id="ai-progress" style="width: 0%; height: 100%; background:#10b981; transition: width 0.3s ease;"></div>
                </div>
            </div>`,
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: async () => {
            const bar = document.getElementById("ai-progress");
            bar.style.width = "30%";

            let dynamicSynthesizedRowsArray = [];
            const parsedStartDateTime = new Date(cfg.start).getTime();
            const parsedEndDateTime = new Date(cfg.end).getTime();
            const layoutRenderingDateOptions = { year: "numeric", month: "short", day: "numeric" };

            for (let trackerIndex = 0; trackerIndex < cfg.count; trackerIndex++) {
                const targetNameIdentityString = pullRandomElementFromArray(geopoliticalNamesPools[cfg.nat]);
                const targetBankIdentityString = pullRandomElementFromArray(geographicalBankingInstitutionsPools[cfg.nat]);

                const randomlyAllocatedTimestampDelta = parsedStartDateTime + Math.random() * (parsedEndDateTime - parsedStartDateTime);
                const formattingDateString = new Date(randomlyAllocatedTimestampDelta).toLocaleDateString("en-US", layoutRenderingDateOptions);

                const generatedRandomAmount = (Math.random() * (cfg.max - cfg.min) + cfg.min).toFixed(2);

                dynamicSynthesizedRowsArray.push({
                    uuid: userUuid,
                    date: formattingDateString,
                    name: `${targetNameIdentityString} (${targetBankIdentityString})`,
                    amount: generatedRandomAmount,
                    transactionType: pullRandomElementFromArray(["Credit", "Debit"]),
                    description: "AI Generated Settlement Record Note",
                    signature: "onflex",
                    status: "Successful"
                });
            }

            dynamicSynthesizedRowsArray.sort((a, b) => new Date(b.date) - new Date(a.date));
            await executeAsynchronousDelayProgress(600);

            document.getElementById("ai-status").innerText = "Pushing data packets to secure node api tracks...";
            bar.style.width = "70%";

            const packageMutationPayload = {
                uuid: userUuid,
                generatedRowsArray: dynamicSynthesizedRowsArray
            };

            try {
                // FIXED: Endpoint updated to /api/admin-ai-history
                const response = await fetch("https://api-v2-red.vercel.app/api/admin-ai-history", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${adminToken}`
                    },
                    body: JSON.stringify(packageMutationPayload)
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error);
                if (!data.success) throw new Error(data.error);

                const historyCacheKey = `admin_history_ledger_${userUuid}`;
                const historicalCachedRows = localStorage.getItem(historyCacheKey);

                if (historicalCachedRows) {
                    try {
                        let parsedHistory = JSON.parse(historicalCachedRows);
                        let updatedHistoryArray = [...dynamicSynthesizedRowsArray, ...parsedHistory];
                        localStorage.setItem(historyCacheKey, JSON.stringify(updatedHistoryArray));
                    } catch (e) {
                        console.warn("Could not append generated history records directly to local storage cache.");
                    }
                }

                bar.style.width = "100%";
                await executeAsynchronousDelayProgress(400);

                await Swal.fire({
                    icon: "success",
                    title: "Synthetic Ledger Matrix Sync Complete",
                    text: `Successfully initialized rows mapping logs for ${cfg.nat} financial operational indexes.`,
                    timer: 1500,
                    showConfirmButton: false,
                    background: "#0f172a",
                    color: "#ffffff"
                });

                await bindSystemLedgerHistoryStream(userUuid);
                synchronizeTerminalCreditUI();

            } catch (error) {
                Swal.fire("Insertion Matrix Fault", error.message, "error");
            }
        }
    });
}