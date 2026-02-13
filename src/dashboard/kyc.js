/**
 * kyc.js - Realtime Integrated Camera, Modal, and Upload Logic
 */
var fi = null; // Global variable to store the captured face image file

window.initKYC = function () {
    const modal = document.getElementById('kycModal');
    const steps = document.querySelectorAll('.step');
    const indicators = document.querySelectorAll('.progress-step');
    const buttons = document.querySelectorAll('.buttons .button');
    const video = document.getElementById('camera');
    const canvas = document.getElementById('snapshot');
    const previewImg = document.getElementById('previewImg');
    const faceFile = document.getElementById('face_file');

    let stream = null;
    let currentStep = 0;

    // --- STEP NAVIGATION ---
    window.showStep = (index) => {
        if (!steps.length) return;
        steps.forEach((step, i) => step.classList.toggle('active', i === index));
        indicators.forEach((el, i) => el.classList.toggle('active', i === index));

        if (buttons.length >= 3) {
            buttons[0].style.display = index === 0 ? 'none' : 'inline-block';
            buttons[1].style.display = index < steps.length - 1 ? 'inline-block' : 'none';
            buttons[2].style.display = index === steps.length - 1 ? 'inline-block' : 'none';
        }
        currentStep = index;
    };

    window.nextStep = () => {
        const inputs = steps[currentStep].querySelectorAll('input, select, textarea');
        for (const input of inputs) {
            if (!input.checkValidity()) return input.reportValidity();
        }

        if (currentStep < steps.length - 1) {
            currentStep++;
            window.showStep(currentStep);
            if (currentStep === 2) window.startCamera();
        }
    };

    window.prevStep = () => {
        if (currentStep > 0) {
            currentStep--;
            window.showStep(currentStep);
            if (currentStep !== 2) window.stopCamera();
        }
    };

    // --- MODAL CONTROLS ---
    window.openModal = () => {
        if (modal) {
            modal.style.display = 'flex';
            window.showStep(0);
        }
    };

    window.closeModal = () => {
        if (modal) {
            modal.style.display = 'none';
            window.stopCamera();
        }
    };

    // --- CAMERA LOGIC ---
    window.startCamera = async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (video) video.srcObject = stream;
        } catch (err) {
            alert("Camera access denied: " + err);
        }
    };

    window.stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
    };

    window.snapPhoto = () => {
        if (!video || !canvas) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        canvas.toBlob(blob => {
            fi = new File([blob], 'face_snapshot.png', { type: 'image/png' });
            if (previewImg) previewImg.src = URL.createObjectURL(blob);
            const cpb = document.getElementById('CPB');
            if (cpb) cpb.innerHTML = "Re-Capture Face";
            document.getElementById('ssp')?.classList.remove('hider');
        });
    };

    // --- SUBMISSION LOGIC (REALTIME) ---
    const KYCForm = document.getElementById('KYCForm');
    KYCForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (typeof showSpinnerModal === 'function') showSpinnerModal();

        const db = window.supabase;
        const userUuid = window.userUuid;
        const formData = new FormData(KYCForm);

        try {
            // 1. Prepare Data for Update
            const updatePayload = {
                occupation: formData.get('occupation'),
                phone: formData.get('phoneNumber'),
                marital_status: formData.get('marital_status'),
                zipcode: formData.get('postal_code'),
                address: formData.get('home_address'),
                kin_email: formData.get('kin_email'),
                kinname: formData.get('kin'),
                kyc: 'pending', // Update status to pending instantly
            };

            // 2. Perform Supabase Update
            const { error: updateError } = await db.from('users')
                .update(updatePayload)
                .eq('uuid', userUuid);

            if (updateError) throw updateError;

            // 3. Handle File Upload if exists
            let finalImageUrl = window.dataBase.KYC_image3;
            if (fi) {
                const filePath = `kyc/${userUuid}_${Date.now()}.png`;
                const { error: uploadError } = await db.storage
                    .from('profileimages')
                    .upload(filePath, fi);

                if (uploadError) throw uploadError;

                const { data: urlData } = db.storage.from('profileimages').getPublicUrl(filePath);
                finalImageUrl = urlData.publicUrl;

                await db.from('users')
                    .update({ KYC_image3: finalImageUrl })
                    .eq('uuid', userUuid);
            }

            // 4. REALTIME STATE UPDATE
            // Instead of reloading, we merge the new data into the global object
            if (window.dataBase) {
                Object.assign(window.dataBase, updatePayload);
                window.dataBase.KYC_image3 = finalImageUrl;

                // 5. BROADCAST THE UPDATE
                // This triggers renderSecurityPage() in security.html instantly
                window.dispatchEvent(new CustomEvent('userDataUpdated'));
            }

            if (typeof hideSpinnerModal === 'function') hideSpinnerModal();
            window.closeModal();

            Swal.fire({
                icon: 'success',
                title: 'KYC Submitted',
                text: 'Your information is being reviewed.',
                background: '#0C290F',
                color: '#fff'
            });

        } catch (err) {
            console.error("KYC Error:", err);
            if (typeof hideSpinnerModal === 'function') hideSpinnerModal();
            Swal.fire({
                icon: 'error',
                title: 'Submission Failed',
                text: err.message,
                background: '#0C290F',
                color: '#fff'
            });
        }
    });
};