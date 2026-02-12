/**
 * src/admin/profile/account/aiHistory.js
 * REFACTORED: Removed redundant declarations for global compatibility
 */

// --- Regional Data Pools ---
const nameData = {
    USA: ["James Wilson", "Robert Miller", "Patricia Taylor", "Jennifer Anderson", "Michael Thomas", "Linda Moore"],
    UK: ["Alistair Cook", "Gareth Southgate", "Emma Watson", "Harry Kane", "Oliver Bennett", "Charlotte Higgins"],
    Asia: ["Li Wei", "Hiroshi Tanaka", "Aarav Sharma", "Kim Ji-hoon", "Siti Aminah", "Chen Hao", "Yuki Sato"],
    Europe: ["Hans Schmidt", "Luca Rossi", "Jean Dupont", "Elena Garcia", "Sven Larsson", "Mateo Ricci"]
};

const regionalBanks = {
    USA: ["JPMorgan Chase", "Bank of America", "Wells Fargo", "Citigroup", "Goldman Sachs", "U.S. Bancorp"],
    UK: ["Barclays", "HSBC UK", "Lloyds Bank", "NatWest", "Standard Chartered", "Santander UK"],
    Asia: ["DBS Bank", "Bank of China", "OCBC Bank", "Mitsubishi UFJ", "ICBC", "State Bank of India", "UOB"],
    Europe: ["Deutsche Bank", "BNP Paribas", "Société Générale", "UBS", "Credit Suisse", "ING Group", "Nordea"]
};

// --- Helpers ---
const randPick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const delay = (ms) => new Promise(res => setTimeout(res, ms));

/**
 * 🔒 ADMIN LOCK & BUTTON INITIALIZATION
 * Exported to window to be called by profile.html
 */
window.initAIHistoryLogic = async () => {
    const db = window.supabase;
    const userId = window.USERID;
    const aiBtn = document.getElementById('AIhis');

    if (!aiBtn || !db) return;

    // 1. Initial Check
    const { data: admin } = await db.from('admin').select('admin_full_version').eq('id', 1).single();
    handleAdminLock(admin?.admin_full_version);

    // 2. Realtime Listener for Admin Status
    db.channel('ai-admin-check')
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'admin',
            filter: 'id=eq.1'
        }, payload => {
            handleAdminLock(payload.new.admin_full_version);
        }).subscribe();

    aiBtn.addEventListener('click', () => {
        if (!aiBtn.classList.contains('disabled')) {
            openAIHistoryModal(userId);
        }
    });
};

function handleAdminLock(isFull) {
    const aiBtn = document.getElementById('AIhis');
    if (!aiBtn) return;

    if (isFull === false) {
        aiBtn.classList.add('disabled', 'btn-danger');
        aiBtn.classList.remove('btn-primary');
        aiBtn.innerHTML = '<i class="fa fa-lock me-2"></i>Upgrade Required (AI History Generator Locked)';
        aiBtn.onclick = (e) => {
            e.preventDefault();
            Swal.fire({
                title: "Upgrade Required",
                text: "Please upgrade to the full version to use the AI Generator.",
                icon: 'error',
                background: '#0C290F',
                color: '#fff'
            });
        };
    } else {
        aiBtn.classList.remove('disabled', 'btn-danger');
        aiBtn.classList.add('btn-primary');
        aiBtn.innerHTML = 'AI Auto-generate History';
        aiBtn.onclick = null;
    }
}

/**
 * 🖼️ SWAL FORM POPUP
 */
async function openAIHistoryModal(userId) {
    if (!userId) return Swal.fire("Error", "No User ID detected", "error");

    const { value: formValues } = await Swal.fire({
        title: 'AI History Generator',
        background: '#0C290F',
        color: '#ffffff',
        html: `
            <div class="text-start p-2" style="font-size: 14px;">
                <div class="row g-3">
                    <div class="col-6"><label>Rows</label><input id="sw-count" type="number" class="swal2-input m-0 w-100" value="10"></div>
                    <div class="col-6">
                        <label>Region</label>
                        <select id="sw-nat" class="swal2-input m-0 w-100">
                            <option value="Asia">Asia</option><option value="USA">USA</option><option value="UK">UK</option><option value="Europe">Europe</option>
                        </select>
                    </div>
                    <div class="col-6"><label>Min Amt</label><input id="sw-min" type="number" class="swal2-input m-0 w-100" value="500"></div>
                    <div class="col-6"><label>Max Amt</label><input id="sw-max" type="number" class="swal2-input m-0 w-100" value="10000"></div>
                    <div class="col-12 mt-2">
                        <div class="d-flex gap-2">
                            <div class="w-50"><label>Start Date</label><input id="sw-start" type="date" class="swal2-input m-0 w-100"></div>
                            <div class="w-50"><label>End Date</label><input id="sw-end" type="date" class="swal2-input m-0 w-100"></div>
                        </div>
                    </div>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Generate Records',
        confirmButtonColor: '#10b981',
        preConfirm: () => {
            const start = document.getElementById('sw-start').value;
            const end = document.getElementById('sw-end').value;
            if (!start || !end) return Swal.showValidationMessage('Select a date range');
            return {
                count: parseInt(document.getElementById('sw-count').value),
                nat: document.getElementById('sw-nat').value,
                min: document.getElementById('sw-min').value,
                max: document.getElementById('sw-max').value,
                start, end
            }
        }
    });

    if (formValues) runAIGenerator(formValues, userId);
}


async function runAIGenerator(cfg, userId) {
    const db = window.supabase;

    Swal.fire({
        title: 'Processing AI Ledger...',
        background: '#0C290F',
        color: '#ffffff',
        html: `
            <div class="p-3">
                <p id="ai-status">Calculating chronological balance...</p>
                <div style="width:100%; background:#1e293b; height:10px; border-radius:5px; overflow:hidden;">
                    <div id="ai-progress" style="width:0%; height:100%; background:#10b981; transition: width 0.3s;"></div>
                </div>
            </div>`,
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: async () => {
            const status = document.getElementById('ai-status');
            const bar = document.getElementById('ai-progress');

            bar.style.width = "20%";

            // 1. Generate all random timestamps first
            let timestamps = [];
            const startTs = new Date(cfg.start).getTime();
            const endTs = new Date(cfg.end).getTime();

            for (let i = 0; i < cfg.count; i++) {
                timestamps.push(startTs + Math.random() * (endTs - startTs));
            }

            // 2. 🔥 CRITICAL FIX: Sort timestamps Oldest to Newest
            // This ensures that as ID increases, the Date also increases
            timestamps.sort((a, b) => a - b);

            bar.style.width = "40%";
            status.innerText = "Sequencing transactions...";

            // 3. Map to row objects
            let newRows = timestamps.map(ts => {
                const person = randPick(nameData[cfg.nat]);
                const bank = randPick(regionalBanks[cfg.nat]);
                const generatedDate = new Date(ts).toISOString().split('T')[0];

                return {
                    uuid: userId,
                    date: generatedDate,
                    name: `${person} (${bank})`,
                    amount: (Math.random() * (cfg.max - cfg.min) + parseFloat(cfg.min)).toFixed(2),
                    transactionType: randPick(["Credit", "Debit"]),
                    status: "Successful",
                    bankName: bank,
                    description: "AI Generated Transfer",
                    withdrawFrom: "Account Balance"
                };
            });

            bar.style.width = "70%";
            status.innerText = "Writing to financial core...";
            await delay(800);

            // 4. Insert into DB
            const { error } = await db.from('history').insert(newRows);

            bar.style.width = "100%";
            if (error) {
                Swal.fire({ icon: 'error', title: 'Error', text: error.message, background: '#0C290F', color: '#fff' });
            } else {
                Swal.fire({
                    icon: 'success',
                    title: 'Sync Complete',
                    text: `${cfg.count} chronological records added.`,
                    timer: 1500,
                    showConfirmButton: false,
                    background: '#0C290F',
                    color: '#fff'
                });
            }
        }
    });
}