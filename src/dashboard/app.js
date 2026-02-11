/**
 * SECTION 1: GLOBAL STATE
 */
let userSubscription = null;
let offset = 0;
const limit = 5;

// Generate Ref Code
let refCode1 = Math.floor(Math.random() * 1795);
let refCode2 = Math.floor(Math.random() * 1905);
let refCode3 = Math.floor(Math.random() * 3725);
window.refCode = `Rw${refCode1}/Xhc${refCode2}FVk/${refCode3}`;

const showSpinnerModal = () => {
  const el = document.getElementById('spinnerModal');
  if (el) el.style.display = 'flex';
};

const hideSpinnerModal = () => {
  const el = document.getElementById('spinnerModal');
  if (el) el.style.display = 'none';
};

function formatCurrency(amount, locale = 'en-US') {
  // Convert string to number just in case the DB sends a string
  const num = parseFloat(amount) || 0;

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

/**
 * SECTION 2: THEME ENGINE
 */
/**
 * SECTION 2: THEME ENGINE (Updated with Force Overrides)
 */
function applyAccountTheme(level) {
  const root = document.documentElement;
  const body = document.body; // Fix: Define body

  const activeLevel = level ? level.charAt(0).toUpperCase() + level.slice(1).toLowerCase() : "Starter";

  const themes = {
    "Mini": { bg: '#0b0036', pri: '#342eff', card: '#00094f', acc: '#161c30', mut: '#161c30' },
    "Silver": { bg: '#1e002d', pri: '#ff2ef5', card: '#120018', acc: '#2b1630', mut: '#2b1630' },
    "Gold": { bg: '#2c1c00', pri: '#e6b800', card: '#583e01', acc: '#302616', mut: '#936f34' },
    "Platinum": { bg: '#271900', pri: '#110600', card: '#000000', acc: '#241f16', mut: '#241f16' },
    "Starter": { bg: '#0a0f11ff', pri: '#1e9fbcff', card: '#0b161bff', acc: '#386a70ff', mut: '#132c2cff' }
  };

  const t = themes[activeLevel] || themes["Starter"];

  // 1. Set CSS Variables on root
  root.style.setProperty('--background', t.bg);
  root.style.setProperty('--primary', t.pri);
  root.style.setProperty('--card', t.card);
  root.style.setProperty('--accent', t.acc);
  root.style.setProperty('--muted', t.mut);

  // 2. Direct Body Style (Crucial for Safari/iOS scrolling)
  if (body) {
    body.style.backgroundColor = t.bg;
    body.style.minHeight = '100vh';
  }

  // 3. Update PWA / Mobile Browser Meta Theme (Fixes the status bar color)
  let metaTheme = document.querySelector('meta[name="theme-color"]');
  if (!metaTheme) {
    metaTheme = document.createElement('meta');
    metaTheme.name = "theme-color";
    document.getElementsByTagName('head')[0].appendChild(metaTheme);
  }
  metaTheme.content = t.bg;

  // 4. SAFARI REPAINT FIX
  // Forces browser to redraw the UI with the new variables
  root.style.display = 'none';
  root.offsetHeight; // Trigger reflow
  root.style.display = '';

  console.log("Dashboard Theme Synced:", activeLevel);
}
/**
 * SECTION 3: UI SYNC & REALTIME
 */
function syncUserToUI(doc) {
  if (!doc) return;

  // Check Active Status - Use strict boolean and string check
  if (doc.activeuser === false || doc.activeuser === "false") {
    hideSpinnerModal();
    autoLogout();
    return;
  }

  window.dataBase = doc;
  window.xdata = doc;
  window.userUuid = doc.uuid;
  window.dispatchEvent(new CustomEvent('userDataUpdated', { detail: doc }));

  // Update Notification Count
  const noteCount = document.getElementById('noteCounte');
  if (noteCount) noteCount.innerHTML = doc.notificationCount || '0';

  // Apply Colors
  applyAccountTheme(doc.accountLevel);

  hideSpinnerModal();
}

async function initDashboard() {
  const sessionStr = localStorage.getItem('user_session');
  if (!sessionStr) {
    window.location.href = "../login/index.html";
    return;
  }

  const session = JSON.parse(sessionStr);
  showSpinnerModal();

  try {
    // Initial Data Fetch
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('uuid', session.uuid)
      .single();

    if (error || !user) {
      console.error("User not found in DB");
      hideSpinnerModal();
      autoLogout();
      return;
    }

    syncUserToUI(user);

    // REALTIME SUBSCRIPTION
    if (userSubscription) userSubscription.unsubscribe();

    userSubscription = supabase
      .channel(`public:users:uuid=eq.${session.uuid}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `uuid=eq.${session.uuid}`
      }, (payload) => {
        syncUserToUI(payload.new);
      })
      .subscribe();

  } catch (err) {
    console.error("Dashboard Init Error:", err);
  }
}

async function signOutUser() {
  const result = await Swal.fire({
    title: 'Terminate Session?',
    text: "You will need to log in again to access your dashboard.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444', // Red for "Logout"
    cancelButtonColor: '#1a1a1a',  // Dark for "Stay"
    confirmButtonText: 'Yes, Logout',
    background: '#0C290F',
    color: '#fff',
    backdrop: `rgba(0,0,0,0.8)`
  });

  // 2. Only proceed if user clicked "Yes"
  if (result.isConfirmed) {
    console.log("🧼 Clearing session and logging out...");

    // Clear Security Markers
    localStorage.removeItem('isLocked');
    localStorage.removeItem('user_session');

    // Clear all temporary session data
    sessionStorage.clear();

    // Final Redirect to login
    window.location.href = '../login/index.html';
  } else {
    console.log("❌ Logout cancelled by user.");
  }
}

function autoLogout() {
  console.log("🧼 Clearing session and logging out...");

  // Clear Security Markers
  localStorage.removeItem('isLocked');
  localStorage.removeItem('user_session');

  // Clear all temporary session data
  sessionStorage.clear();

  // Final Redirect to login
  window.location.href = '../login/index.html';
}

/**
 * SECTION 4: EVENT LISTENERS
 */
document.addEventListener('DOMContentLoaded', () => {
  initDashboard();

  // Deposit Logic
  document.getElementById('openDeposit')?.addEventListener('click', () => {
    Swal.fire({
      background: '#0C290F',
      showConfirmButton: false,
      width: 600,
      html: `
                <div class="popup-container">
                    <h2>Deposit Details</h2>
                    <p>Bank: OnFlex</p>
                    <p>Account: ${dataBase.firstname} ${dataBase.lastname}</p>
                    <p>Number: ${dataBase.accountNumber}</p>
                </div>`
    });
  });

  // Transfer Prompts
  const triggerTransfer = () => {
    Swal.fire({
      title: "Transfer Type",
      background: '#0C290F',
      showDenyButton: true,
      confirmButtonText: "Local",
      denyButtonText: `International`,
      customClass: { popup: 'swal2Style' },
    }).then((result) => {
      if (result.isConfirmed) window.location.href = "./local.html";
      else if (result.isDenied) window.location.href = "./international.html";
    });
  };

  document.getElementById('Trans2')?.addEventListener('click', triggerTransfer);
  document.getElementById('Trans3')?.addEventListener('click', triggerTransfer);

  document.getElementById('goLoan')?.addEventListener('click', () => window.location.href = "loan.html");
  document.getElementById('cards')?.addEventListener('click', () => window.location.href = "cards.html");
  document.getElementById('logout')?.addEventListener('click', signOutUser);
});