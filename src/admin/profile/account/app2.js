alert('cqc')

// /**
//  * src/admin/profile/account/app2.js
//  * Pattern: ES Module Export
//  */
// import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// // We initialize inside the export to ensure CONFIG is ready when called

// export async function initAdminSettingsPage() {
//     const config = window.CONFIG || (typeof CONFIG !== 'undefined' ? CONFIG : null);
//     if (!config) return console.error("CONFIG missing");

//     const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_KEY);

//     // DOM Elements
//     const settingsForm = document.getElementById('setStatus');
//     const emailInput = document.getElementById('newEmail');
//     const passwordInput = document.getElementById('adminPassword');
//     const addressInput = document.getElementById('webAddress');
//     const agree = document.getElementById('agree');

//     const showSpinner = () => document.getElementById('spinnerModal')?.style.setProperty('display', 'flex');
//     const hideSpinner = () => document.getElementById('spinnerModal')?.style.setProperty('display', 'none');

//     /* ===== 1. Auth Guard ===== */
//     const adminSession = localStorage.getItem('adminSession');
//     const adminEmail = localStorage.getItem('adminEmail');

//     if (adminSession !== 'active' || !adminEmail) {
//         window.location.href = "../../login/index.html";
//         return;
//     }

//     /**
//      * 1. Load Data
//      */
//     const { data, error } = await supabase.from('admin').select('*').limit(1).single();
//     if (error) console.error("Error loading settings:", error.message);

//     if (data) {
//         if (emailInput) emailInput.value = data.email || '';
//         if (passwordInput) passwordInput.value = data.password || '';
//         if (addressInput) addressInput.value = data.address || '';
//         if (agree) agree.value = data.agreement || '';
//     }

//     /**
//      * 2. Realtime Listener
//      */
//     supabase.channel('admin_settings_updates')
//         .on('postgres_changes', {
//             event: 'UPDATE',
//             schema: 'public',
//             table: 'admin'
//         }, (payload) => {
//             const newData = payload.new;
//             if (agree && newData.agreement !== undefined) {
//                 agree.value = newData.agreement;
//                 agree.style.backgroundColor = '#d1fae5';
//                 setTimeout(() => agree.style.backgroundColor = '', 1000);
//             }
//         })
//         .subscribe();

//     /**
//      * 3. Submit Handler
//      */
//     settingsForm?.addEventListener('submit', async (e) => {
//         e.preventDefault();
//         showSpinner();

//         const updatedData = {
//             email: emailInput.value,
//             password: passwordInput.value,
//             address: addressInput.value,
//             agreement: agree.value
//         };

//         const { data: existing } = await supabase.from('admin').select('id').limit(1);

//         let result;
//         if (existing && existing.length > 0) {
//             result = await supabase.from('admin').update(updatedData).eq('id', existing[0].id);
//         } else {
//             result = await supabase.from('admin').insert([updatedData]);
//         }

//         hideSpinner();

//         if (result.error) {
//             Swal.fire({ icon: 'error', title: 'Update Failed', text: result.error.message });
//         } else {
//             Swal.fire({ icon: 'success', title: 'Saved', text: 'Settings updated successfully.', timer: 2000, showConfirmButton: false });
//         }
//     });

//     /**
//      * 4. Logout Logic
//      */
//     document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
//         e.preventDefault();
//         Swal.fire({
//             title: 'Logout?',
//             text: "Are you sure?",
//             icon: 'warning',
//             showCancelButton: true,
//             confirmButtonText: 'Yes, logout!',
//             background: '#0f172a',
//             color: '#fff'
//         }).then((result) => {
//             if (result.isConfirmed) {
//                 localStorage.clear();
//                 sessionStorage.clear();
//                 window.location.href = "../../login/index.html";
//             }
//         });
//     });
// }