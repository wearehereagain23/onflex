import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
const urlParams = new URLSearchParams(window.location.search);
const USERID = urlParams.get('i');

let currentPage = 0;
const pageSize = 10;

// --- UTILITIES ---
const showSpinnerModal = () => document.getElementById('spinnerModal').style.display = 'flex';
const hideSpinnerModal = () => document.getElementById('spinnerModal').style.display = 'none';

async function safe(fn) {
    try { await fn(); } catch (err) {
        hideSpinnerModal();
        console.error(err);
        Swal.fire({ title: "Error", text: err.message, icon: 'error', background: '#0C290F' });
    }
}

/**
 * 🛰️ REALTIME ENGINE
 */
const initHistoryRealtime = () => {
    if (!USERID) return;

    // Listen for ALL changes (* includes DELETE)
    supabase
        .channel('history-realtime')
        .on('postgres_changes', {
            event: '*', // 🔥 This MUST be '*' to catch deletions
            schema: 'public',
            table: 'history',
            filter: `uuid=eq.${USERID}`
        }, (payload) => {
            console.log("Change detected:", payload.eventType);

            // If a row was deleted, we force a refresh of the current page
            // This re-fetches the 10 rows from the DB, so the UI updates instantly
            fetchHistoryPage(currentPage);
        })
        .subscribe();

    fetchHistoryPage(0);
};

/**
 * 📄 PAGINATION FETCH
 */
async function fetchHistoryPage(page) {
    currentPage = page;
    const start = page * pageSize;
    const end = start + pageSize - 1;

    const { data, count, error } = await supabase
        .from('history')
        .select('*', { count: 'exact' })
        .eq('uuid', USERID)
        // 🔥 CHANGE THIS: Order by the transaction date, not the creation time
        .order('date', { ascending: false })
        .range(start, end);

    if (error) return console.error(error);

    renderHistoryTable(data);
    renderPaginationControls(count);
}

/**
 * 🎨 RENDER TABLE (Expanded Inputs)
 */
function renderHistoryTable(data) {
    const tbody = document.getElementById('cvcx2');
    if (!tbody) return;
    tbody.innerHTML = '';

    data.forEach(item => {
        const color = item.transactionType === "Credit" ? '#2ecc71' : '#e74c3c';

        // Using min-width to expand inputs so data is visible
        const row = `
            <tr id="row-${item.id}">
              <td><input type="text" class="form-control" style="min-width: 80px;" id="id-${item.id}" value="${item.id}"></td>
              <td><input type="date" class="form-control" style="min-width: 130px;" id="date-${item.id}" value="${item.date ? item.date.split('T')[0] : ''}"></td>
              <td><input type="text" class="form-control" style="min-width: 150px;" id="name-${item.id}" value="${item.name || ''}"></td>
              <td>
                <div class="d-flex flex-column gap-1">
                    <input type="text" class="form-control" style="color:${color}; font-weight:bold; min-width: 100px;" id="amt-${item.id}" value="${item.amount}">
                    <select class="form-control" id="type-${item.id}">
                        <option value="Debit" ${item.transactionType === 'Debit' ? 'selected' : ''}>Debit</option>
                        <option value="Credit" ${item.transactionType === 'Credit' ? 'selected' : ''}>Credit</option>
                    </select>
                </div>
              </td>
              <td><input type="text" class="form-control" style="min-width: 120px;" id="src-${item.id}" value="${item.bankName || item.withdrawFrom || ''}"></td>
              <td><textarea class="form-control" style="min-width: 180px; height: 38px;" id="desc-${item.id}">${item.description || ''}</textarea></td>
              <td>
                <select class="form-control" style="min-width: 110px;" id="stat-${item.id}">
                    <option value="Successful" ${item.status === 'Successful' ? 'selected' : ''}>Successful</option>
                    <option value="Pending" ${item.status === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="Failed" ${item.status === 'Failed' ? 'selected' : ''}>Failed</option>
                </select>
              </td>
              <td>
                <button class="btn btn-primary btn-sm w-100" onclick="updateHistoryRow('${item.id}')">Update</button>
              </td>
              <td>
                <button class="btn btn-danger btn-sm w-100" onclick="deleteHistoryRow('${item.id}')">Delete</button>
              </td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', row);
    });
}

/**
 * 🔢 SMART PAGINATION LOGIC
 */
function renderPaginationControls(totalCount) {
    let nav = document.getElementById('table-nav');
    if (!nav) {
        nav = document.createElement('div');
        nav.id = 'table-nav';
        nav.className = 'mt-4 d-flex justify-content-center align-items-center gap-3';
        document.getElementById('cvcx2').parentElement.parentElement.appendChild(nav);
    }

    // Only show pagination if total data is greater than page size
    if (totalCount <= pageSize) {
        nav.innerHTML = '';
        return;
    }

    const hasNext = (currentPage + 1) * pageSize < totalCount;
    const hasPrev = currentPage > 0;

    let buttons = '';

    // Logic: Only show Previous if we aren't on page 1
    if (hasPrev) {
        buttons += `<button class="btn btn-outline-primary btn-sm" onclick="changePage(${currentPage - 1})"><i class="fa fa-arrow-left"></i> Previous</button>`;
    }

    buttons += `<span class="badge bg-light text-dark p-2">Page ${currentPage + 1}</span>`;

    // Logic: Only show Next if there is more data ahead
    if (hasNext) {
        buttons += `<button class="btn btn-outline-primary btn-sm" onclick="changePage(${currentPage + 1})">Next <i class="fa fa-arrow-right"></i></button>`;
    }

    nav.innerHTML = buttons;
}

window.changePage = (p) => fetchHistoryPage(p);

/**
 * 💾 ACTIONS
 */
window.updateHistoryRow = (rowId) => safe(async () => {
    showSpinnerModal();
    const updates = {
        id: document.getElementById(`id-${rowId}`).value,
        date: document.getElementById(`date-${rowId}`).value,
        name: document.getElementById(`name-${rowId}`).value,
        amount: document.getElementById(`amt-${rowId}`).value.replace(/,/g, ''),
        transactionType: document.getElementById(`type-${rowId}`).value,
        bankName: document.getElementById(`src-${rowId}`).value,
        description: document.getElementById(`desc-${rowId}`).value,
        status: document.getElementById(`stat-${rowId}`).value,
    };

    const { error } = await supabase.from('history').update(updates).eq('id', rowId);
    hideSpinnerModal();
    if (!error) {
        Swal.fire({ title: "Updated", icon: "success", timer: 800, showConfirmButton: false, background: '#0C290F' });
    }
});

window.deleteHistoryRow = (rowId) => safe(async () => {
    const res = await Swal.fire({
        title: "Delete?",
        text: "Permanent action!",
        icon: "warning",
        showCancelButton: true,
        background: '#0C290F'
    });

    if (res.isConfirmed) {
        // 1. Instant UI removal (Optimistic Update)
        const row = document.getElementById(`row-${rowId}`);
        if (row) row.style.opacity = '0.3'; // Visual feedback it's being deleted

        // 2. Perform DB deletion
        const { error } = await supabase.from('history').delete().eq('id', rowId);

        if (error) {
            if (row) row.style.opacity = '1'; // Bring it back if it failed
            throw error;
        }

        // Note: The Realtime listener will handle the full table refresh automatically!
    }
});


/* ➕ ADD NEW ROW */
document.getElementById('fom7')?.addEventListener('submit', (ev) => safe(async () => {
    ev.preventDefault();
    showSpinnerModal();
    const fd = new FormData(ev.target);

    // 1. Prepare data mapping exactly to your schema columns
    const insertData = {
        date: fd.get('historyDate'), // Matches 'date' text null
        amount: fd.get('historyAmount').replace(/,/g, ''), // Matches 'amount' text null
        name: fd.get('receiverName'), // Matches 'name'
        description: fd.get('description'), // Matches 'description'
        status: fd.get('historyStatus'), // Matches 'status'
        bankName: fd.get('sources'), // Matches "bankName" (quoted in schema)
        transactionType: fd.get('historyType'), // Matches "transactionType" (quoted in schema)
        withdrawFrom: "Account Balance", // Matches "withdrawFrom" (quoted in schema)
        uuid: USERID // Matches 'uuid'
        // 'id' and 'created_at' are handled automatically by Supabase
    };

    // 2. Insert into Supabase
    const { error } = await supabase
        .from('history')
        .insert([insertData]); // Pass as an array

    hideSpinnerModal();

    if (error) {
        console.error("Supabase Insert Error:", error);
        throw error;
    } else {
        ev.target.reset();
        Swal.fire({
            title: "Saved",
            text: "Transaction added to history",
            icon: 'success',
            background: '#0C290F'
        });
    }
}));

initHistoryRealtime();