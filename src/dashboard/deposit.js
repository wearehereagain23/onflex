/**
 * deposit.js - Fixed Copy Logic
 */

const depositHtml = (db) => `
    <div class="popup-container" style="text-align: left; color: white;">
      <h2 style="margin-bottom: 15px; border-bottom: 1px solid #ffffff22; padding-bottom: 10px;">Bank Deposit Details</h2>
      
      <div class="info-block" style="display: flex; justify-content: space-between; margin-bottom: 10px; background: #ffffff11; padding: 10px; border-radius: 8px;">
        <div class="info-content">
            <span style="display: block; font-size: 10px; opacity: 0.7;">Bank Name</span>
            <span id="bankName">OnFlex</span>
        </div>
        <button onclick="copyText('bankName')" style="background:none; border:none; cursor:pointer; font-size: 1.2rem;">📋</button>
      </div>

      <div class="info-block" style="display: flex; justify-content: space-between; margin-bottom: 10px; background: #ffffff11; padding: 10px; border-radius: 8px;">
        <div class="info-content">
            <span style="display: block; font-size: 10px; opacity: 0.7;">Account Holder</span>
            <span id="accountHolder">${db.firstname} ${db.lastname}</span>
        </div>
        <button onclick="copyText('accountHolder')" style="background:none; border:none; cursor:pointer; font-size: 1.2rem;">📋</button>
      </div>

      <div class="info-block" style="display: flex; justify-content: space-between; background: #ffffff11; padding: 10px; border-radius: 8px;">
        <div class="info-content">
            <span style="display: block; font-size: 10px; opacity: 0.7;">Account Number</span>
            <span id="accountNumber">${db.accountNumber}</span>
        </div>
        <button onclick="copyText('accountNumber')" style="background:none; border:none; cursor:pointer; font-size: 1.2rem;">📋</button>
      </div>
      
      <div id="copyNotice" style="text-align: center; color: #10b981; font-size: 12px; margin-top: 10px; height: 15px; opacity: 0; transition: 0.3s;">Copied to clipboard!</div>
    </div>`;

// Optimized Copy Function (No Swal overlap)
window.copyText = (id) => {
  const text = document.getElementById(id).textContent;
  navigator.clipboard.writeText(text).then(() => {
    const notice = document.getElementById('copyNotice');
    if (notice) {
      notice.style.opacity = '1';
      setTimeout(() => { notice.style.opacity = '0'; }, 2000);
    }
  });
};

// Listener for the broadcast
window.addEventListener('userDataUpdated', () => {
  const depositTriggers = ['openDeposit', 'openDeposit2', 'openDeposit3'];

  const showModal = () => {
    if (window.dataBase) {
      Swal.fire({
        background: '#0C290F',
        showConfirmButton: false,
        width: 500,
        html: depositHtml(window.dataBase),
        // This prevents clicking copy buttons from accidentally triggering a close
        allowOutsideClick: true
      });
    }
  };

  depositTriggers.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.onclick = showModal;
  });
});