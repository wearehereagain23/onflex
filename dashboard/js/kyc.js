/**
 * ONFLEX PREMIUM - MULTI-STEP KYC VERIFICATION SYSTEM ENGINE
 */
document.addEventListener('DOMContentLoaded', () => {
    const actionVerifyAccount = document.getElementById('actionVerifyAccount');
    if (!actionVerifyAccount) return;

    const BACKEND_KYC_URL = "https://api-v2-red.vercel.app/api/settings";
    const BACKEND_DATA_URL = "https://api-v2-red.vercel.app/api/data";
    let capturedFaceBlob = null;
    let cameraStream = null;

    // Dynamically resolve session credentials from browser storage matrix
    const rawSession = localStorage.getItem("user_session");
    let userUuid = localStorage.getItem("user_uuid") || localStorage.getItem("uuid");
    let currentToken = localStorage.getItem("user_session_token") || localStorage.getItem("token") || "";

    if (rawSession) {
        try {
            const parsedSession = JSON.parse(rawSession);
            userUuid = parsedSession.uuid || parsedSession.id || parsedSession.user?.id || parsedSession.user?.uuid || userUuid;
            currentToken = parsedSession.token || parsedSession.session_token || parsedSession.user_session_token || currentToken;
        } catch (e) {
            console.error("📋 [KYC Setup] Session parsing error context:", e);
        }
    }

    // Utility: Compress image files to lightweight JPEG Base64 string
    const compressFileToBase64 = (file, maxWidth = 1200, quality = 0.7) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const compressedBase64 = canvas.toDataURL('image/jpeg', quality).split(',')[1];
                    resolve(compressedBase64);
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    };

    // Safety checks for active camera streams
    const killCameraStream = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
    };

    // --- FETCH CURRENT KYC STATE FROM /api/data ---
    const fetchKycStatus = async () => {
        if (!userUuid || !currentToken) return;

        try {
            const response = await fetch(BACKEND_DATA_URL, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${currentToken}`
                }
            });

            if (!response.ok) return;

            const resData = await response.json();
            const userData = resData.data || resData.user || resData;
            const kycStatus = (userData.kyc || "no").toLowerCase();

            updateKycButtonState(kycStatus);
        } catch (err) {
            console.warn("⚠️ Could not fetch active KYC status state:", err);
        }
    };

    // Helper: Update UI Button according to KYC status
    const updateKycButtonState = (status) => {
        if (status === 'pending') {
            actionVerifyAccount.innerHTML = `<i data-lucide="clock"></i> KYC Pending Under Review`;
            actionVerifyAccount.style.backgroundColor = "rgb(190, 162, 0)";
            actionVerifyAccount.disabled = true;
        } else if (status === 'approved' || status === 'verified' || status === 'yes') {
            actionVerifyAccount.innerHTML = `<i data-lucide="check-circle"></i> KYC Verified`;
            actionVerifyAccount.style.backgroundColor = "#16a34a";
            actionVerifyAccount.disabled = true;
        } else if (status === 'rejected') {
            actionVerifyAccount.innerHTML = `<i data-lucide="alert-triangle"></i> KYC Rejected - Re-apply`;
            actionVerifyAccount.style.backgroundColor = "#dc2626";
            actionVerifyAccount.disabled = false;
        } else {
            actionVerifyAccount.innerHTML = `<i data-lucide="shield"></i> Verify Account (KYC)`;
            actionVerifyAccount.disabled = false;
        }

        if (window.lucide) window.lucide.createIcons();
    };

    // Execute status verification check immediately upon script initialization
    fetchKycStatus();

    // Main action vector listener handler entry point
    actionVerifyAccount.addEventListener('click', async () => {
        if (!userUuid || !currentToken) {
            return Swal.fire({
                icon: 'error',
                title: 'Session Expired',
                text: 'Please re-authenticate to complete verification.',
                confirmButtonColor: '#ef4444'
            });
        }

        // --- STEP 1: TERMS & LEGAL GUIDANCE WINDOW ---
        const startWizard = await Swal.fire({
            title: 'Account Verification (KYC)',
            icon: 'info',
            iconColor: '#0a698f',
            background: '#0c1e29',
            color: '#fff',
            confirmButtonColor: '#0a698f',
            showCancelButton: true,
            cancelButtonColor: '#ef4444',
            confirmButtonText: 'Accept & Continue',
            html: `
                <div style="text-align: left; max-height: 280px; overflow-y: auto; font-size: 13px; line-height: 1.6; color: #cbd5e1; padding-right: 8px; border-bottom: 1px solid #1e293b;">
                    <p><strong>1. Purpose of Information Gathering</strong><br>To maintain full alignment with international banking guidelines, standard Anti-Money Laundering (AML) matrices, and Know Your Customer (KYC) regulatory compliance profiles, you are required to submit accurate verification data.</p>
                    <p><strong>2. Profile Data Security Protocols</strong><br>All credentials, utility records, and biometric snapshots captured during this security verification deployment are instantly tokenized and safely processed under institutional grade encryption frameworks.</p>
                    <p><strong>3. Submission Terms Alignment</strong><br>Providing fraudulent structural identification documentation, expired parameters, or intentionally mismatched details will trigger immediate account suspension and lock transactional features.</p>
                </div>
            `
        });

        if (!startWizard.isConfirmed) return;

        // --- STEP 2: PROFILE DATA INPUTS FORM ---
        const formInputsResult = await Swal.fire({
            title: 'Step 1: Identity Profile Info',
            background: '#0c1e29',
            color: '#fff',
            confirmButtonColor: '#0a698f',
            confirmButtonText: 'Next Page &rarr;',
            showCancelButton: true,
            cancelButtonColor: '#ef4444',
            focusConfirm: false,
            html: `
                <div style="text-align: left; display: flex; flex-direction: column; gap: 12px; font-size: 13px;">
                    <div>
                        <label style="display:block; margin-bottom:4px; color:#94a3b8;">Occupation Status</label>
                        <select id="kyc_occupation" class="swal2-input" style="width:100%; margin:0; background:#0f2d4a; color:#fff; border:1px solid #1e293b; height:42px;">
                            <option value="Employed">Employed</option>
                            <option value="Unemployed">Unemployed</option>
                            <option value="Retired">Retired</option>
                            <option value="Student">Student</option>
                        </select>
                    </div>
                    <div>
                        <label style="display:block; margin-bottom:4px; color:#94a3b8;">Marital Status</label>
                        <select id="kyc_marital" class="swal2-input" style="width:100%; margin:0; background:#0f2d4a; color:#fff; border:1px solid #1e293b; height:42px;">
                            <option value="Single">Single</option>
                            <option value="Married">Married</option>
                            <option value="Divorced">Divorced</option>
                            <option value="Widowed">Widowed</option>
                        </select>
                    </div>
                    <div>
                        <label style="display:block; margin-bottom:4px; color:#94a3b8;">Active Contact Phone Number</label>
                        <input type="text" id="kyc_phone" placeholder="+1..." class="swal2-input" style="width:100%; margin:0; background:#0f2d4a; color:#fff; border:1px solid #1e293b; height:42px;">
                    </div>
                    <div>
                        <label style="display:block; margin-bottom:4px; color:#94a3b8;">Postal / Zip Code</label>
                        <input type="text" id="kyc_zipcode" placeholder="e.g. 10001" class="swal2-input" style="width:100%; margin:0; background:#0f2d4a; color:#fff; border:1px solid #1e293b; height:42px;">
                    </div>
                    <div>
                        <label style="display:block; margin-bottom:4px; color:#94a3b8;">Residential Home Address</label>
                        <input type="text" id="kyc_address" placeholder="123 Main St..." class="swal2-input" style="width:100%; margin:0; background:#0f2d4a; color:#fff; border:1px solid #1e293b; height:42px;">
                    </div>
                    <div>
                        <label style="display:block; margin-bottom:4px; color:#94a3b8;">Next of Kin Legal Name</label>
                        <input type="text" id="kyc_kinname" class="swal2-input" style="width:100%; margin:0; background:#0f2d4a; color:#fff; border:1px solid #1e293b; height:42px;">
                    </div>
                    <div>
                        <label style="display:block; margin-bottom:4px; color:#94a3b8;">Next of Kin Contact Email / Phone</label>
                        <input type="text" id="kyc_kinemail" class="swal2-input" style="width:100%; margin:0; background:#0f2d4a; color:#fff; border:1px solid #1e293b; height:42px;">
                    </div>
                </div>
            `,
            preConfirm: () => {
                const phone = document.getElementById('kyc_phone').value.trim();
                const zipcode = document.getElementById('kyc_zipcode').value.trim();
                const address = document.getElementById('kyc_address').value.trim();
                const kinname = document.getElementById('kyc_kinname').value.trim();
                const kinemail = document.getElementById('kyc_kinemail').value.trim();

                if (!phone || !zipcode || !address || !kinname || !kinemail) {
                    Swal.showValidationMessage('All requested profile details fields (including Postal/Zip Code) are mandatory.');
                    return false;
                }

                const zipcodeRegex = /^[a-zA-Z0-9\s\-]{3,10}$/;
                if (!zipcodeRegex.test(zipcode)) {
                    Swal.showValidationMessage('Please enter a valid Postal / Zip Code.');
                    return false;
                }

                return {
                    occupation: document.getElementById('kyc_occupation').value,
                    marital_status: document.getElementById('kyc_marital').value,
                    phone: phone,
                    zipcode: zipcode,
                    address: address,
                    kinname: kinname,
                    kin_email: kinemail
                };
            }
        });

        if (!formInputsResult.isConfirmed) return;

        // --- STEP 3: DOCUMENT SUBMISSION ---
        const documentUploadResult = await Swal.fire({
            title: 'Step 2: Upload Documents',
            background: '#0c1e29',
            color: '#fff',
            confirmButtonColor: '#0a698f',
            confirmButtonText: 'Next Page &rarr;',
            showCancelButton: true,
            cancelButtonColor: '#ef4444',
            html: `
                <div style="text-align: left; display: flex; flex-direction: column; gap: 16px; font-size: 13px;">
                    <div>
                        <label style="display:block; margin-bottom:6px; color:#94a3b8;">Government Issued Photo ID</label>
                        <input type="file" id="kyc_file_id" accept="image/*" style="color:#fff;">
                    </div>
                    <div style="border-top: 1px solid #1e293b; padding-top: 12px;">
                        <label style="display:block; margin-bottom:6px; color:#94a3b8;">Paid Utility Bill / Bank Statement Proof</label>
                        <input type="file" id="kyc_file_bill" accept="image/*" style="color:#fff;">
                    </div>
                </div>
            `,
            preConfirm: () => {
                const fileIdEl = document.getElementById('kyc_file_id');
                const fileBillEl = document.getElementById('kyc_file_bill');

                if (!fileIdEl.files[0] || !fileBillEl.files[0]) {
                    Swal.showValidationMessage('Please select files for both documentation verification vectors.');
                    return false;
                }
                return { fileId: fileIdEl.files[0], fileBill: fileBillEl.files[0] };
            }
        });

        if (!documentUploadResult.isConfirmed) return;

        // --- STEP 4: REAL-TIME BIOMETRIC SELFIE CAMERA SNAPSHOT ---
        capturedFaceBlob = null;
        const faceBiometricResult = await Swal.fire({
            title: 'Step 3: Biometric Face Scan',
            background: '#0c1e29',
            color: '#fff',
            confirmButtonColor: '#22c55e',
            confirmButtonText: 'Submit Final Verification',
            showCancelButton: true,
            cancelButtonColor: '#ef4444',
            html: `
                <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
                    <video id="kyc_video" autoplay playsinline style="width: 100%; max-width: 320px; border-radius: 8px; background: #000; transform: scaleX(-1);"></video>
                    <canvas id="kyc_canvas" style="display:none;"></canvas>
                    <button type="button" id="kyc_snap_btn" class="swal2-confirm swal2-styled" style="background-color: #0a698f; margin: 0;">Capture Snapshot</button>
                    <img id="kyc_preview" style="display:none; width: 100%; max-width: 200px; border-radius: 8px; border: 2px solid #22c55e;" />
                </div>
            `,
            didOpen: async () => {
                const video = document.getElementById('kyc_video');
                const canvas = document.getElementById('kyc_canvas');
                const snapBtn = document.getElementById('kyc_snap_btn');
                const preview = document.getElementById('kyc_preview');

                try {
                    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
                    if (video) video.srcObject = cameraStream;
                } catch (err) {
                    console.error("Camera context connection failed:", err);
                    Swal.showValidationMessage("Could not unlock camera access permissions context framework.");
                }

                snapBtn.addEventListener('click', () => {
                    if (!video || !canvas) return;
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.translate(canvas.width, 0);
                    ctx.scale(-1, 1);
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                    canvas.toBlob((blob) => {
                        capturedFaceBlob = blob;
                        if (preview) {
                            preview.src = URL.createObjectURL(blob);
                            preview.style.display = 'block';
                        }
                        snapBtn.innerText = "Re-Capture Snapshot Face";
                    }, 'image/jpeg', 0.8);
                });
            },
            willClose: () => {
                killCameraStream();
            },
            preConfirm: () => {
                if (!capturedFaceBlob) {
                    Swal.showValidationMessage('You must capture your face snapshot before finalizing.');
                    return false;
                }
                return true;
            }
        });

        if (!faceBiometricResult.isConfirmed) return;

        // --- STEP 5: COMPRESS & TRANSMIT ---
        Swal.fire({
            title: 'Encrypting & Uploading...',
            background: '#0c1e29',
            color: '#fff',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            const [base64Id, base64Bill, base64Face] = await Promise.all([
                compressFileToBase64(documentUploadResult.value.fileId),
                compressFileToBase64(documentUploadResult.value.fileBill),
                compressFileToBase64(new File([capturedFaceBlob], 'face.jpg', { type: 'image/jpeg' }))
            ]);

            const finalPayload = {
                ...formInputsResult.value,
                signature: "onflex",
                kyc_image1: base64Id,
                kyc_image2: base64Bill,
                kyc_image3: base64Face
            };

            const response = await fetch(BACKEND_KYC_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-setting-target": "kyc",
                    "Authorization": `Bearer ${currentToken}`
                },
                body: JSON.stringify(finalPayload)
            });

            let result;
            const rawResponseText = await response.text();
            try {
                result = JSON.parse(rawResponseText);
            } catch (pErr) {
                if (response.status === 413) {
                    throw new Error("Payload size limit exceeded. Please upload smaller image files.");
                }
                throw new Error(`Server returned non-JSON response (${response.status}).`);
            }

            if (!response.ok || !result.success) {
                throw new Error(result.error || "Verification transmission rejected by gateway.");
            }

            Swal.fire({
                icon: 'info',
                title: 'KYC Pending',
                background: '#0c1e29',
                color: '#fff',
                confirmButtonColor: 'green',
                customClass: { popup: 'swal2Style' },
                text: "Your verification is currently under review. We’ll notify you as soon as it’s approved.",
                confirmButtonText: 'OK'
            });

            // Refresh KYC Status State
            updateKycButtonState('pending');

        } catch (error) {
            console.error("❌ [KYC Application Fault]:", error);
            Swal.fire({
                icon: 'error',
                title: 'Submission Refused',
                background: '#0c1e29',
                color: '#fff',
                text: error.message || 'Verification update failed execution bounds handling.',
                confirmButtonColor: '#ef4444'
            });
        }
    });
});