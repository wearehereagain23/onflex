/**
 * ONFLEX PRIVATE FINANCIAL SYSTEM - IDENTITY LEDGER MANAGEMENT CONTROLLER
 */
document.addEventListener('DOMContentLoaded', async () => {
    const BACKEND_DATA_URL = "https://api-v2-red.vercel.app/api/data";
    const BACKEND_AVATAR_URL = "https://api-v2-red.vercel.app/api/profile";

    const rawSession = localStorage.getItem("user_session");
    if (!rawSession) {
        window.location.href = "../login/index.html";
        return;
    }
    const session = JSON.parse(rawSession);

    // Dynamic Element Interface Destructuring
    const virtualFileEndpoint = document.getElementById('virtualFileEndpoint');
    const avatarTriggerZone = document.getElementById('avatarTriggerZone');
    const cameraIconTrigger = document.getElementById('cameraIconTrigger');

    // UI Media Targets Matrix
    const displayHeroAvatar = document.getElementById('displayHeroAvatar');
    const heroMetaName = document.getElementById('heroMetaName');

    // Default Fallback Asset
    const DEFAULT_AVATAR = "./image/prof.jpg";
    let currentServerImage = null;

    // Structural Field Matrix Mapping Array
    const elementsMap = {
        firstName: document.getElementById('fieldFirstName'),
        middleName: document.getElementById('fieldMiddleName'),
        lastName: document.getElementById('fieldLastName'),
        dateOfBirth: document.getElementById('fieldDateOfBirth'),
        country: document.getElementById('fieldCountry'),
        city: document.getElementById('fieldCity'),
        email: document.getElementById('fieldEmail'),
        phoneNumber: document.getElementById('fieldPhoneNumber')
    };

    const unifiedSwalStyle = {
        background: "#111115",
        color: "#fff",
        confirmButtonColor: "#0a698f"
    };

    // Execute Main Lifecycle Flow Routine
    await synchronizeServerIdentityLedger();

    async function synchronizeServerIdentityLedger() {
        try {
            const response = await fetch(BACKEND_DATA_URL, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.token}`
                }
            });
            const incoming = await response.json();

            if (incoming.success && incoming.data) {
                const node = incoming.data;

                // Handle composite name variations safely
                const computedName = `${node.firstname || ''} ${node.lastname || ''}`.trim() || "Active Member";

                if (heroMetaName) heroMetaName.innerText = computedName;

                // Header Profile Updates
                const headerNameEl = document.querySelector('.header-profile-name');
                if (headerNameEl) headerNameEl.innerText = computedName;

                const headerAvatarEl = document.querySelector('.user-avatar');

                const rawTier = String(node.tiers || "1").trim();
                let formattedTierDisplay = "";

                switch (rawTier) {
                    case "3":
                        formattedTierDisplay = "Tier 3 Premium";
                        break;
                    case "2":
                        formattedTierDisplay = "Tier 2 Standard";
                        break;
                    case "1":
                    default:
                        formattedTierDisplay = "Tier 1 Basic";
                        break;
                }

                const headerTierEl = document.getElementById("tiers");
                if (headerTierEl) headerTierEl.innerText = rawTier;

                const cardTierEl = document.getElementById("tier");
                if (cardTierEl) cardTierEl.innerText = formattedTierDisplay;

                // Setup live server image tracking reference flags
                currentServerImage = (node.profileImage && node.profileImage.trim() !== "") ? node.profileImage : null;
                const activeImgSrc = currentServerImage || DEFAULT_AVATAR;

                if (displayHeroAvatar) displayHeroAvatar.src = activeImgSrc;
                if (headerAvatarEl) headerAvatarEl.src = activeImgSrc;

                // Safe normalized properties data maps alignment
                if (elementsMap.firstName) elementsMap.firstName.innerText = node.firstname || "—";
                if (elementsMap.middleName) elementsMap.middleName.innerText = node.middlename || "—";
                if (elementsMap.lastName) elementsMap.lastName.innerText = node.lastname || "—";
                if (elementsMap.dateOfBirth) elementsMap.dateOfBirth.innerText = node.dateOfBirth || "—";
                if (elementsMap.country) elementsMap.country.innerText = node.country || "Global";
                if (elementsMap.city) elementsMap.city.innerText = node.city || "—";
                if (elementsMap.email) elementsMap.email.innerText = node.email || "—";
                if (elementsMap.phoneNumber) elementsMap.phoneNumber.innerText = node.phone || "—";
            }
        } catch (networkErr) {
            console.error("Critical Profile Sync Interface Fault Encountered:", networkErr);
        }
    }

    // ==========================================
    // ASYNCHRONOUS AVATAR CONVERSION INTERFACE LAYER
    // ==========================================
    const openPhotoManagementConsole = (e) => {
        e.preventDefault();

        if (currentServerImage) {
            Swal.fire({
                ...unifiedSwalStyle,
                title: 'Manage Profile Photo',
                text: 'Select an operational pathway to alter current credential image metadata.',
                icon: 'info',
                showCancelButton: true,
                showDenyButton: true,
                confirmButtonText: 'Upload New Photo',
                denyButtonText: 'Delete Current Photo',
                cancelButtonText: 'Dismiss Console'
            }).then((res) => {
                if (res.isConfirmed) {
                    setTimeout(() => { virtualFileEndpoint.click(); }, 150);
                } else if (res.isDenied) {
                    executeAvatarDeletionSequence();
                }
            });
        } else {
            Swal.fire({
                ...unifiedSwalStyle,
                title: 'Upload Profile Image',
                text: 'Would you like to authorize access to local storage targets to select a picture profile asset?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Select File',
                cancelButtonText: 'Cancel'
            }).then((res) => {
                if (res.isConfirmed) {
                    setTimeout(() => { virtualFileEndpoint.click(); }, 150);
                }
            });
        }
    };

    if (avatarTriggerZone) avatarTriggerZone.addEventListener('click', openPhotoManagementConsole);
    if (cameraIconTrigger) cameraIconTrigger.addEventListener('click', openPhotoManagementConsole);

    if (virtualFileEndpoint) {
        virtualFileEndpoint.addEventListener('change', async (event) => {
            const collection = event.target.files;
            if (!collection || collection.length === 0) return;

            const binaryFile = collection[0];

            if (binaryFile.size > 3.5 * 1024 * 1024) {
                Swal.fire({
                    ...unifiedSwalStyle,
                    icon: 'warning',
                    title: 'Asset Footprint Exception',
                    text: 'Please select an identity image layout asset under 3.5 Megabytes.'
                });
                return;
            }

            const uploaderFormData = new FormData();
            uploaderFormData.append("avatarImageFile", binaryFile);

            Swal.fire({
                ...unifiedSwalStyle,
                title: 'Uploading Asset...',
                text: 'Synchronizing binary graphic files onto cloud infrastructure clusters.',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            try {
                const postResponse = await fetch(BACKEND_AVATAR_URL, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${session.token}`
                    },
                    body: uploaderFormData
                });

                const uploadSyncResult = await postResponse.json();

                if (uploadSyncResult.success) {
                    Swal.fire({
                        ...unifiedSwalStyle,
                        icon: 'success',
                        title: 'Dossier Asset Updated',
                        text: 'Your secure avatar biometric asset has been cataloged.',
                        timer: 2000,
                        showConfirmButton: false
                    });
                } else {
                    throw new Error(uploadSyncResult.error || "Institutional verification rejection.");
                }
            } catch (txError) {
                Swal.fire({
                    ...unifiedSwalStyle,
                    icon: 'error',
                    title: 'Upload Pipeline Fault',
                    text: txError.message || 'Verification could not process live sync.'
                });
            } finally {
                virtualFileEndpoint.value = "";
                await synchronizeServerIdentityLedger();
            }
        });
    }

    async function executeAvatarDeletionSequence() {
        Swal.fire({
            ...unifiedSwalStyle,
            title: 'Removing Profile Asset...',
            text: 'Reverting account image values down to fallback defaults.',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            const deleteResponse = await fetch(BACKEND_AVATAR_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.token}`
                },
                body: JSON.stringify({ isDeleteAction: true })
            });

            const deleteResult = await deleteResponse.json();

            if (deleteResult.success) {
                Swal.fire({
                    ...unifiedSwalStyle,
                    icon: 'success',
                    title: 'Asset Removed',
                    text: 'Avatar baseline successfully cleared.',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                throw new Error(deleteResult.error || "Database update clearing exception error.");
            }
        } catch (err) {
            Swal.fire({
                ...unifiedSwalStyle,
                icon: 'error',
                title: 'Deletion Blocked',
                text: err.message
            });
        } finally {
            await synchronizeServerIdentityLedger();
        }
    }

    if (window.lucide) lucide.createIcons();
});