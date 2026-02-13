/**
 * src/admin/profile/account/history.js
 * FIXED: Removed redundant declarations that caused SyntaxErrors
 */

// We NO LONGER declare urlParams, USERID, or showSpinnerModal here 
// as they are provided globally by profile.html

let currentPage = 0;
const pageSize = 10;

async function safe(fn) {
    try {
        await fn();
    } catch (err) {
        if (typeof window.hideSpinnerModal === 'function') window.hideSpinnerModal();
        console.error("History System Error:", err);
        Swal.fire({
            title: "Error",
            text: err.message,
            icon: 'error',
            background: '#0C290F',
            color: '#fff'
        });
    }
}

/**
 * 🛰️ REALTIME ENGINE
 * Main entry point called by profile.html
 */
window.initHistoryRealtime = async () => {
    const db = window.supabase;
    const userId = window.USERID;

    if (!userId || !db) return;

    // Corrected filter syntax in the channel config
    db.channel('history-realtime')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'history',
            filter: `uuid=eq.${userId}` // Realtime filters DO use this string format
        }, (payload) => {
            fetchHistoryPage(currentPage);
        })
        .subscribe();

    fetchHistoryPage(0);
    initHistoryFormListener();
};

/**
 * 📄 PAGINATION FETCH
 */
/**
 * 📄 PAGINATION FETCH
 * Changed to order by 'id' instead of 'date'
 */
async function fetchHistoryPage(page) {
    const db = window.supabase;
    const userId = window.USERID;

    if (!userId) return;

    currentPage = page;
    const start = page * pageSize;
    const end = start + pageSize - 1;

    // Corrected filter syntax: .eq('column', value)
    const { data, count, error } = await db
        .from('history')
        .select('*', { count: 'exact' })
        .eq('uuid', userId)
        .order('id', { ascending: false })
        .range(start, end);

    if (error) {
        console.error("Fetch Error:", error);
        return;
    }

    renderHistoryTable(data);
    renderPaginationControls(count);
}

/**
 * 🎨 RENDER TABLE
 */
function renderHistoryTable(data) {
    const tbody = document.getElementById('cvcx2');
    if (!tbody) return;
    tbody.innerHTML = '';

    data.forEach(item => {
        const color = item.transactionType === "Credit" ? '#2ecc71' : '#e74c3c';

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
 * 🔢 PAGINATION UI
 */
function renderPaginationControls(totalCount) {
    let nav = document.getElementById('table-nav');
    if (!nav) {
        nav = document.createElement('div');
        nav.id = 'table-nav';
        nav.className = 'mt-4 d-flex justify-content-center align-items-center gap-3';
        const tableContainer = document.getElementById('cvcx2')?.parentElement?.parentElement;
        if (tableContainer) tableContainer.appendChild(nav);
    }

    if (totalCount <= pageSize) {
        nav.innerHTML = '';
        return;
    }

    const hasNext = (currentPage + 1) * pageSize < totalCount;
    const hasPrev = currentPage > 0;

    let buttons = '';
    if (hasPrev) {
        buttons += `<button class="btn btn-outline-primary btn-sm" onclick="changePage(${currentPage - 1})"><i class="fa fa-arrow-left"></i> Previous</button>`;
    }

    buttons += `<span class="badge bg-light text-dark p-2">Page ${currentPage + 1}</span>`;

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
    const db = window.supabase;
    if (typeof window.showSpinnerModal === 'function') window.showSpinnerModal();

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

    const { error } = await db.from('history').update(updates).eq('id', rowId);
    if (typeof window.hideSpinnerModal === 'function') window.hideSpinnerModal();
    if (error) throw error;

    Swal.fire({ title: "Updated", icon: "success", timer: 800, showConfirmButton: false, background: '#0C290F', color: '#fff' });
});

window.deleteHistoryRow = (rowId) => safe(async () => {
    const db = window.supabase;
    const res = await Swal.fire({
        title: "Delete?",
        text: "This cannot be undone!",
        icon: "warning",
        showCancelButton: true,
        background: '#0C290F',
        color: '#fff'
    });

    if (res.isConfirmed) {
        const row = document.getElementById(`row-${rowId}`);
        if (row) row.style.opacity = '0.3';

        const { error } = await db.from('history').delete().eq('id', rowId);

        if (error) {
            if (row) row.style.opacity = '1';
            throw error;
        }
    }
});

/**
 * ➕ ADD NEW ROW HANDLER
 */
function initHistoryFormListener() {
    const db = window.supabase;
    const userId = window.USERID;
    const historyForm = document.getElementById('fom7');

    if (historyForm) {
        historyForm.addEventListener('submit', (ev) => safe(async () => {
            ev.preventDefault();
            if (typeof window.showSpinnerModal === 'function') window.showSpinnerModal();

            const fd = new FormData(ev.target);
            const insertData = {
                date: fd.get('historyDate'),
                amount: fd.get('historyAmount').replace(/,/g, ''),
                name: fd.get('receiverName'),
                description: fd.get('description'),
                status: fd.get('historyStatus'),
                bankName: fd.get('sources'),
                transactionType: fd.get('historyType'),
                withdrawFrom: "Account Balance",
                uuid: userId
            };

            const { error } = await db.from('history').insert([insertData]);

            if (typeof window.hideSpinnerModal === 'function') window.hideSpinnerModal();
            if (error) throw error;

            ev.target.reset();
            Swal.fire({
                title: "Saved",
                text: "Transaction added to history",
                icon: 'success',
                background: '#0C290F',
                color: '#fff'
            });
        }));
    }
}