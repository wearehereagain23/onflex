/**
 * kyc.js - Final Matched Logic
 */
var fi = null;

window.initKYC = function () {
    const modal = document.getElementById('kycModal');
    const steps = document.querySelectorAll('.step');
    const indicators = document.querySelectorAll('.progress-step');
    const KYCForm = document.getElementById('KYCForm');
    const video = document.getElementById('camera');
    const canvas = document.getElementById('snapshot');
    const previewImg = document.getElementById('previewImg');
    const sspContainer = document.getElementById('ssp');

    // Identify navigation buttons
    const btnNext = document.querySelector('button[onclick="nextStep()"]');
    const btnPrev = document.querySelector('button[onclick="prevStep()"]');

    let stream = null;
    let currentStep = 0;

    // --- 1. EXPOSE NAVIGATION TO WINDOW ---
    window.showStep = (index) => {
        steps.forEach((step, i) => step.classList.toggle('active', i === index));
        indicators.forEach((el, i) => el.classList.toggle('active', i === index));
        currentStep = index;

        // --- BUTTON VISIBILITY LOGIC ---
        // Hide Previous on first step
        if (btnPrev) btnPrev.style.display = (index === 0) ? 'none' : 'inline-block';

        // HIDE NEXT ON LAST STEP (Step 2)
        if (btnNext) {
            btnNext.style.display = (index === steps.length - 1) ? 'none' : 'inline-block';
        }

        // Camera trigger for Step 2
        if (index === 2) {
            window.startCamera();
        } else {
            window.stopCamera();
        }
    };

    window.nextStep = () => {
        const inputs = steps[currentStep].querySelectorAll('input, select, textarea');
        for (const input of inputs) {
            if (!input.checkValidity()) return input.reportValidity();
        }
        if (currentStep < steps.length - 1) {
            window.showStep(currentStep + 1);
        }
    };

    window.prevStep = () => {
        if (currentStep > 0) {
            window.showStep(currentStep - 1);
        }
    };

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

    // --- 2. CAMERA & PHOTO ---
    window.startCamera = async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (video) video.srcObject = stream;
        } catch (err) {
            console.error("Camera access denied", err);
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
            if (previewImg) {
                previewImg.src = URL.createObjectURL(blob);
                previewImg.style.display = 'block';
            }
            document.getElementById('CPB').innerText = "Re-Capture Face";

            // Show the hidden submit button container
            if (sspContainer) {
                sspContainer.style.display = 'block';
                const subBtn = sspContainer.querySelector('button[type="submit"]');
                if (subBtn) subBtn.style.display = 'inline-block';
            }
        }, 'image/png');
    };

    // --- 3. SUBMISSION ---
    KYCForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!fi) return Swal.fire("Required", "Please capture your face photo.", "warning");

        if (typeof showSpinnerModal === 'function') showSpinnerModal();
        const db = window.supabase;
        const userUuid = window.userUuid;
        const formData = new FormData(KYCForm);

        try {
            const upload = async (file, name) => {
                const path = `kyc/${userUuid}_${name}_${Date.now()}.png`;
                await db.storage.from('profileimages').upload(path, file);
                return db.storage.from('profileimages').getPublicUrl(path).data.publicUrl;
            };

            const [url1, url2, url3] = await Promise.all([
                upload(formData.get('imageUpload'), 'id'),
                upload(formData.get('imageUpload2'), 'bill'),
                upload(fi, 'face')
            ]);

            const payload = {
                occupation: formData.get('occupation'),
                phone: formData.get('phoneNumber'),
                marital_status: formData.get('marital_status'),
                zipcode: formData.get('postal_code'),
                address: formData.get('home_address'),
                kinname: formData.get('kin'),
                kin_email: formData.get('kin_email'),
                kyc: 'pending',
                KYC_image1: url1, KYC_image2: url2, KYC_image3: url3
            };

            await db.from('users').update(payload).eq('uuid', userUuid);

            if (window.dataBase) {
                Object.assign(window.dataBase, payload);
                window.dispatchEvent(new CustomEvent('userDataUpdated'));
            }

            if (typeof hideSpinnerModal === 'function') hideSpinnerModal();
            window.closeModal();
            Swal.fire({ icon: 'success', title: 'Submitted', background: '#0c1e29ff', color: '#fff' });

        } catch (err) {
            if (typeof hideSpinnerModal === 'function') hideSpinnerModal();
            Swal.fire("Error", err.message, "error");
        }
    });
};

// Initialize
initKYC();