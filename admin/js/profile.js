// Helper function to send the updated profile payload to your backend API



// js/profile.js

async function executeProfileDatabaseMutation(userId, formElement, payload, backupCacheString) {
    const spinnerModal = document.getElementById("spinnerModal");
    if (spinnerModal) spinnerModal.style.display = "flex";

    try {
        // ✅ Check 'admin_session_token' first to align with login.js and list.js
        const rawToken = localStorage.getItem("admin_session_token") ||
            localStorage.getItem("admin_token") ||
            localStorage.getItem("token");

        const token = (rawToken && rawToken !== "null" && rawToken !== "undefined") ? rawToken.trim() : null;

        if (!token) {
            throw new Error("Authentication token is missing. Please sign in again.");
        }

        const API_BASE_URL = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
            ? "http://localhost:5000"
            : "";

        const response = await fetch(`${API_BASE_URL}/api/admin-update-user`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                id: userId,
                ...payload
            })
        });

        // Safely parse JSON responses
        const contentType = response.headers.get("content-type");
        let result;
        if (contentType && contentType.includes("application/json")) {
            result = await response.json();
        } else {
            const errText = await response.text();
            throw new Error(`Server returned status ${response.status}: ${errText}`);
        }

        if (!response.ok || !result.success) {
            throw new Error(result.error || "Failed to persist profile mutation to backend.");
        }

        return result;
    } catch (error) {
        console.error("❌ Profile Mutation Error:", error);

        // Rollback optimistic local storage cache on failure
        if (backupCacheString) {
            localStorage.setItem("admin_users_directory_cache", backupCacheString);
            window.dispatchEvent(new Event("adminDirectoryCacheUpdated"));
        }

        Swal.fire({
            title: "Update Failed",
            text: error.message || "Failed to update profile record.",
            icon: "error",
            confirmButtonColor: "#ef4444",
            background: "#111b21",
            color: "#fff"
        });
    } finally {
        if (spinnerModal) spinnerModal.style.display = "none";
    }
}

export function syncUserProfileFormFields(userObject) {
    const profileForm = document.getElementById("profileForm");
    if (!profileForm) return;

    // Set the dataset context safely
    profileForm.dataset.userUuid = userObject.uuid;

    // Direct Mapping values explicitly out of columns down to HTML inputs
    document.getElementById("accountBalance").value = userObject.accountBalance || "0";
    document.getElementById("accountTypeBalance").value = userObject.accountTypeBalance || "0";
    document.getElementById("firstName").value = userObject.firstname || "";
    document.getElementById("middlename").value = userObject.middlename || "";
    document.getElementById("lastName").value = userObject.lastname || "";
    document.getElementById("accountnumber").value = userObject.accountNumber || "";
    document.getElementById("currency").value = userObject.currency || "$";
    document.getElementById("email2").value = userObject.email || "";
    document.getElementById("password").value = userObject.password || "";
    document.getElementById("pin").value = userObject.pin || "";
    document.getElementById("address").value = userObject.address || "";
    document.getElementById("city").value = userObject.city || "";
    document.getElementById("country").value = userObject.country || "";
    document.getElementById("zipcode").value = userObject.zipcode || "";
    document.getElementById("phone").value = userObject.phone || "";
    document.getElementById("dateOfBirth").value = userObject.dateOfBirth || "";
    document.getElementById("gender").value = userObject.gender || "";
    document.getElementById("employstatus").value = userObject.occupation || ""; // Fix: database uses 'occupation'
    document.getElementById("kinname").value = userObject.kinname || "";

    // Additional requested fields
    document.getElementById("tiers").value = userObject.tiers || "1";
    document.getElementById("tax_fee").value = userObject.tax_fee !== undefined ? userObject.tax_fee : 3;
    document.getElementById("fixedDate").value = userObject.fixedDate || "";

    document.getElementById("accttype").value = userObject.accttype || "";
    document.getElementById("imf").value = userObject.IMF || "";
    document.getElementById("tax").value = userObject.TAX || "";
    document.getElementById("cot").value = userObject.COT || "";

    // Boolean Select Mappings
    document.getElementById("two_fa").value = String(userObject["2fa"] ?? false);
    document.getElementById("block_transection").value = String(userObject.block_transection ?? false);
    document.getElementById("restricted").value = String(userObject.restricted ?? false);
    document.getElementById("transferAccess").value = String(userObject.transferAccess ?? true);
    document.getElementById("activeuser").value = String(userObject.activeuser ?? true);

    // Detach any previous handlers
    profileForm.onsubmit = null;

    profileForm.onsubmit = async (event) => {
        event.preventDefault();

        // Compile payload with strictly matching schema data types
        const updatedPayload = {
            ...userObject,
            accountBalance: document.getElementById("accountBalance").value.trim(),
            accountTypeBalance: document.getElementById("accountTypeBalance").value.trim(),
            firstname: document.getElementById("firstName").value.trim(),
            middlename: document.getElementById("middlename").value.trim(),
            lastname: document.getElementById("lastName").value.trim(),
            accountNumber: document.getElementById("accountnumber").value.trim(),
            currency: document.getElementById("currency").value.trim(),
            email: document.getElementById("email2").value.trim(),
            password: document.getElementById("password").value.trim(),
            pin: document.getElementById("pin").value.trim(),
            address: document.getElementById("address").value.trim(),
            city: document.getElementById("city").value.trim(),
            country: document.getElementById("country").value.trim(),
            zipcode: document.getElementById("zipcode").value.trim(),
            phone: document.getElementById("phone").value.trim(),
            dateOfBirth: document.getElementById("dateOfBirth").value.trim(),
            gender: document.getElementById("gender").value.trim(),
            occupation: document.getElementById("employstatus").value.trim(), // Correct column mapping
            kinname: document.getElementById("kinname").value.trim(),

            tiers: document.getElementById("tiers").value.trim(), // text
            tax_fee: Number(document.getElementById("tax_fee").value) || 0, // numeric
            fixedDate: document.getElementById("fixedDate").value.trim(), // text

            accttype: document.getElementById("accttype").value,
            IMF: document.getElementById("imf").value.trim(),
            TAX: document.getElementById("tax").value.trim(),
            COT: document.getElementById("cot").value.trim(),

            "2fa": document.getElementById("two_fa").value === "true", // boolean
            block_transection: document.getElementById("block_transection").value === "true", // boolean
            restricted: document.getElementById("restricted").value === "true", // boolean
            transferAccess: document.getElementById("transferAccess").value === "true", // boolean
            activeuser: document.getElementById("activeuser").value === "true" // boolean
        };

        // Local Storage Optimistic UI Logic
        const localSavedCache = localStorage.getItem("admin_users_directory_cache");
        let backupCacheString = localSavedCache;

        if (localSavedCache) {
            try {
                let registryList = JSON.parse(localSavedCache);
                const indexMatch = registryList.findIndex(u => u.id === userObject.id);

                if (indexMatch !== -1) {
                    registryList[indexMatch] = updatedPayload;
                    localStorage.setItem("admin_users_directory_cache", JSON.stringify(registryList));
                    window.dispatchEvent(new Event("adminDirectoryCacheUpdated"));
                }
            } catch (err) {
                console.warn("Optimistic local caching mutation tracking error:", err);
            }
        }

        Swal.fire({
            title: "Database Synchronized",
            text: "User parameters updated successfully.",
            icon: "success",
            confirmButtonColor: "#00a884",
            background: "#111b21",
            color: "#fff",
            timer: 1500,
            showConfirmButton: false
        });

        await executeProfileDatabaseMutation(userObject.id, profileForm, updatedPayload, backupCacheString);
    };
}