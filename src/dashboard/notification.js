/**
 * notifications.js - Integrated with your CSS classes
 */

const dropdownMenu = document.getElementById('dropdownMenu');
const notificationList = document.getElementById('notificationList');
const noteCounteEl = document.getElementById('noteCounte');

// --- INITIALIZATION ---
window.addEventListener('userDataUpdated', (event) => {
    const user = event.detail;
    if (user && user.uuid) {
        // Log this to see what Supabase thinks the count is
        console.log("Current user count from DB:", user.notificationCount);

        // Force a small delay to ensure DOM is fully ready
        setTimeout(() => {
            updateBadgeUI(user.notificationCount);
        }, 100);

        if (!window.notifSubscribed) {
            setupRealtime(user.uuid);
            fetchNotifs(user.uuid);
            window.notifSubscribed = true;
        }
    }
});

// --- CORE FUNCTIONS ---

async function toggleNotifs() {
    const menu = document.getElementById('dropdownMenu');
    if (!menu) return;

    const isActive = menu.classList.contains('active');

    if (!isActive) {
        menu.style.display = 'flex';

        // REMOVE THIS: updateBadgeUI(0); 
        // Let the real-time listener handle hiding the badge when the DB updates

        if (window.dataBase?.uuid) {
            const uuid = window.dataBase.uuid;
            // Background reset
            supabase.from('users').update({ notificationCount: 0 }).eq('uuid', uuid).then();
            supabase.from('notifications').update({ read: true }).eq('uuid', uuid).eq('read', false).then();
        }

        setTimeout(() => {
            menu.classList.add('active', 'fade-in');
            menu.classList.remove('fade-out');
        }, 10);
    } else {
        menu.classList.add('fade-out');
        setTimeout(() => {
            menu.classList.remove('active', 'fade-in', 'fade-out');
            menu.style.display = 'none';
        }, 200);
    }
}

function updateBadgeUI(count) {
    const badge = document.getElementById('noteCounte');
    if (!badge) return;

    // Convert to number and handle null/undefined
    const cleanCount = Number(count) || 0;

    badge.innerHTML = cleanCount;

    if (cleanCount > 0) {
        // Use !important to override Tailwind's hidden classes if necessary
        badge.setAttribute('style', 'display: flex !important; visibility: visible !important; opacity: 1 !important;');
    } else {
        badge.setAttribute('style', 'display: none !important;');
    }
}

async function fetchNotifs(uuid) {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('uuid', uuid)
        .order('created_at', { ascending: false })
        .limit(10);

    if (!error && data) renderNotifs(data);
}

function renderNotifs(notifs) {
    const list = document.getElementById('notificationList');
    if (!list) {
        console.error("❌ Element #notificationList not found in DOM");
        return;
    }

    // Clear the list entirely before adding new items
    list.innerHTML = '';

    if (!notifs || notifs.length === 0) {
        list.innerHTML = '<li class="empty-notif">No messages yet</li>';
        return;
    }

    notifs.forEach(n => {
        const li = document.createElement('li');

        // Match the class 'unread' only if n.read is false
        // Your sample says 'true', so this will get 'notif-item'
        li.className = n.read ? 'notif-item' : 'unread';

        li.innerHTML = `
            <div class="notif-content">
                <div class="notif-title">${n.title || 'No Title'}</div>
                <div class="notif-message">${n.message || 'No Message Content'}</div>
                <div style="font-size:10px; opacity:0.5; margin-top:5px;">
                    ${new Date(n.created_at).toLocaleTimeString()}
                </div>
            </div>
        `;
        list.appendChild(li);
    });

    console.log("✅ Rendered " + notifs.length + " items into the list.");
}
function setupRealtime(uuid) {
    supabase.channel('user-profile-sync')
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `uuid=eq.${uuid}`
        }, (payload) => {
            updateBadgeUI(payload.new.notificationCount);
        }).subscribe();

    supabase.channel('notif-table-sync')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `uuid=eq.${uuid}`
        }, () => {
            fetchNotifs(uuid);
        }).subscribe();
}

// --- CLICK HANDLERS ---
document.addEventListener('click', (e) => {
    const btn = e.target.closest('#notifyBtn') || e.target.closest('.notif-trigger');
    const menu = document.getElementById('dropdownMenu');

    if (btn) {
        e.stopPropagation();
        toggleNotifs();
    } else if (menu && menu.classList.contains('active') && !menu.contains(e.target)) {
        toggleNotifs();
    }
});