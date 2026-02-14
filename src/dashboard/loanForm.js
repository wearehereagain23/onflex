/* ============================================================
   LOAN FORM LOGIC
   File: src/dashboard/loanForm.js
   Handles:
   - Personal Loan submission
   - Business Loan submission
   - Image Upload
   - Supabase Updates
   - Form Reset
============================================================ */

(function () {

    if (!window.supabase) {
        console.error("Supabase not initialized");
        return;
    }

    const supabase = window.supabase;

    const LoanForm = {
        userUuid: null,
        dataBase: null,
        initialized: false,

        init(userUuid, dataBase) {
            if (this.initialized) return;
            this.initialized = true;

            this.userUuid = userUuid;
            this.dataBase = dataBase;

            this.bindPersonalLoan();
            this.bindBusinessLoan();
            this.bindImageUpload();
        },

        /* ======================================================
           PERSONAL LOAN
        ====================================================== */

        bindPersonalLoan() {
            const form = document.getElementById('loanFom');
            if (!form) return;

            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const formData = new FormData(form);
                const amount = Number(formData.get('amount'));

                if (!amount || amount <= 0) {
                    return this.toast("Enter a valid amount", "error");
                }

                if (amount >= 500) {
                    return this.toast(`Can't borrow more than ${this.dataBase.currency}500`, "error");
                }

                if (this.dataBase.accountLevel === "Starter") {
                    return this.toast("Starter account cannot apply for loan", "error");
                }

                await this.submitLoan({
                    amount,
                    loanType: "Personal"
                });

                form.reset(); // ✅ RESET FORM
            });
        },

        /* ======================================================
           BUSINESS LOAN
        ====================================================== */

        bindBusinessLoan() {
            const form = document.getElementById('loanFom2');
            if (!form) return;

            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const formData = new FormData(form);

                const amount = Number(formData.get('amount'));
                const businessName = formData.get('businessName');
                const businessAddress = formData.get('businessAddress');
                const businessDes = formData.get('businessDes');
                const monthlyIncome = formData.get('monthlyIncome');
                const gurantorName = formData.get('gurantorName');
                const gurantorContact = formData.get('gurantorContact');

                if (!amount || amount <= 0) {
                    return this.toast("Enter a valid amount", "error");
                }

                if (amount >= 10000) {
                    return this.toast(`Can't borrow more than ${this.dataBase.currency}10000`, "error");
                }

                if (this.dataBase.accountLevel === "Starter") {
                    return this.toast("Starter account cannot apply for loan", "error");
                }

                await this.submitLoan({
                    amount,
                    loanType: "Business",
                    businessName,
                    businessAddress,
                    businessDes,
                    monthlyIncome,
                    gurantorName,
                    gurantorContact
                });

                form.reset(); // ✅ RESET FORM
            });
        },

        /* ======================================================
           COMMON LOAN SUBMITTER
        ====================================================== */

        async submitLoan(payload) {
            try {
                const updateData = {
                    unsettledLoan: payload.amount,
                    loanAmount: payload.amount,
                    loanType: payload.loanType,
                    loanApprovalStatus: "Pending",
                    ...payload
                };

                const { error } = await supabase
                    .from('users')
                    .update(updateData)
                    .eq('uuid', this.userUuid);

                if (error) throw error;

                this.toast("Application successful. Await admin approval.", "success");

            } catch (err) {
                console.error(err);
                this.toast("Failed to submit application", "error");
            }
        },

        /* ======================================================
           IMAGE UPLOAD
        ====================================================== */

        bindImageUpload() {
            const input = document.getElementById('profilePicture');
            if (!input) return;

            input.addEventListener('change', async (event) => {

                const file = event.target.files[0];
                if (!file) return this.toast("Select an image file", "error");

                try {
                    const fileExt = file.name.split('.').pop();
                    const filePath = `${Date.now()}.${fileExt}`;

                    const { error } = await supabase
                        .storage
                        .from('profileimages')
                        .upload(filePath, file);

                    if (error) throw error;

                    const { data } = supabase
                        .storage
                        .from('profileimages')
                        .getPublicUrl(filePath);

                    await supabase
                        .from('users')
                        .update({ loanPhoto: data.publicUrl })
                        .eq('uuid', this.userUuid);

                    this.toast("Image uploaded successfully", "success");

                } catch (err) {
                    console.error(err);
                    this.toast("Image upload failed", "error");
                }
            });
        },

        toast(message, type = "success") {
            Swal.fire({
                toast: true,
                icon: type,
                title: message,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1500,
                background: '#0C290F'
            });
        }
    };

    window.LoanForm = LoanForm;

})();
