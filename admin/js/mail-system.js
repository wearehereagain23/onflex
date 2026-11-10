import { masterAccountRegistryCache } from "./list.js";

export function syncMailFormFields(userRecord) {
    const emailInput = document.getElementById("supportEmail");
    if (emailInput && userRecord) {
        emailInput.value = userRecord.email || "";
    }
}

export function getMailPayload() {
    const emailInput = document.getElementById("supportEmail");
    const messageInput = document.getElementById("supportMessage");
    const imageInput = document.getElementById("adminEmailImage");

    return {
        recipientEmail: emailInput ? emailInput.value.trim() : "",
        supportMessage: messageInput ? messageInput.value.trim() : "",
        adminImage: imageInput && imageInput.files.length > 0 ? imageInput.files[0] : null
    };
}

export async function executeMailDispatch(userId, payload) {
    const token = localStorage.getItem("admin_session_token");

    const formData = new FormData();
    formData.append("recipientEmail", payload.recipientEmail);
    formData.append("supportMessage", payload.supportMessage);
    if (payload.adminImage) {
        formData.append("adminImage", payload.adminImage);
    }

    const response = await fetch(`https://bank-app-api-wqst.vercel.app/api/bank/send-email/${userId}`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "x-setting-target": "onflex"
            // Note: Do NOT set "Content-Type": "application/json" here. 
            // Fetch will automatically set it to multipart/form-data with the correct boundary.
        },
        body: formData
    });

    let result;
    const responseText = await response.text();
    try {
        result = JSON.parse(responseText);
    } catch (e) {
        throw new Error(`Server returned non-JSON response (${response.status}): ${responseText}`);
    }

    if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to dispatch email.");
    }

    if (typeof Swal !== "undefined") {
        Swal.fire({
            icon: "success",
            title: "Email Sent",
            text: "Your message has been successfully delivered."
        });
    }

    return result;
}

/**
 * Encapsulated DOM event binder for the email dispatch form (Validation removed)
 */
export function initMailDispatchFormHandler() {
    const emailDispatchForm = document.getElementById("emailDispatchForm");
    if (!emailDispatchForm) return;

    emailDispatchForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const submitBtn = emailDispatchForm.querySelector("button[type='submit']");
        const originalBtnText = submitBtn ? submitBtn.innerText : "Send Email";

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = "Dispatching...";
            }

            const payload = getMailPayload();

            // Fallback resolution if no active workspace user is selected:
            // Match user by input email or default to the first available cached user record
            let targetUserId = null;
            if (typeof currentlySelectedAccountObj !== "undefined" && currentlySelectedAccountObj && currentlySelectedAccountObj.id) {
                targetUserId = currentlySelectedAccountObj.id;
            } else if (masterAccountRegistryCache && masterAccountRegistryCache.length > 0) {
                const matchedUser = masterAccountRegistryCache.find(u => u.email?.toLowerCase() === payload.recipientEmail.toLowerCase());
                targetUserId = matchedUser ? matchedUser.id : masterAccountRegistryCache[0].id;
            } else {
                throw new Error("No user records available in cache to process dispatch context.");
            }

            await executeMailDispatch(targetUserId, payload);

            const messageInput = document.getElementById("supportMessage");
            if (messageInput) messageInput.value = "";
            const imageInput = document.getElementById("adminEmailImage");
            if (imageInput) imageInput.value = "";

        } catch (error) {
            console.error("Mail Dispatch Processing Error:", error);
            if (typeof Swal !== "undefined") {
                Swal.fire({
                    icon: "error",
                    title: "Dispatch Failed",
                    text: error.message || "An error occurred while sending the email."
                });
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = originalBtnText;
            }
        }
    });
}
