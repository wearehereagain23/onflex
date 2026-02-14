/* ============================================================
   LOAN UI + REALTIME
   File: src/dashboard/loanUI.js
============================================================ */

(function () {

    if (!window.supabase) {
        console.error("Supabase not initialized");
        return;
    }

    const supabase = window.supabase;

    const LoanUI = {

        userUuid: null,
        subscription: null,

        init(userUuid, initialData) {
            this.userUuid = userUuid;

            this.render(initialData);
            this.setupRealtime();
            this.bindButtons();
        },

        /* ======================================================
           RENDER UI
        ====================================================== */

        render(data) {
            if (!data) return;

            this.updateBalances(data);
            this.updateLoanState(data);
            this.updateProfile(data);
        },

        updateBalances(data) {
            document.getElementById("loanBalanace").innerHTML =
                `${data.currency}${this.format(data.loanApprovalStatus === "Approved" ? data.loanAmount : 0)}`;

            document.getElementById("unsettledLoan").innerHTML =
                `${data.currency}${this.format(data.unsettledLoan)}`;
        },

        updateLoanState(data) {

            const status = data.loanApprovalStatus;
            const type = data.loanType;

            this.hideAllStates();

            if (!status) {
                document.getElementById('getStart')?.classList.remove('hiding');
                document.getElementById('getStart2')?.classList.remove('hiding');
                return;
            }

            if (status === "Pending") {
                if (type === "Personal") {
                    document.getElementById('pend')?.classList.remove('hiding');
                } else {
                    document.getElementById('pend2')?.classList.remove('hiding');
                }
            }

            if (status === "Approved") {
                if (type === "Personal") {
                    document.getElementById('hh3')?.classList.remove('hiding');
                } else {
                    document.getElementById('hhh3')?.classList.remove('hiding');
                }
            }
        },

        hideAllStates() {
            const ids = [
                "pend", "pend2",
                "hh3", "hhh3",
                "getStart", "getStart2"
            ];

            ids.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hiding');
            });
        },

        updateProfile(data) {
            document.getElementById("accountLevel").innerText = data.accountLevel;
            document.getElementById("accountBalance").innerHTML =
                `${data.currency}${this.format(data.accountBalance)}`;
        },

        /* ======================================================
           REALTIME SUBSCRIPTION
        ====================================================== */

        setupRealtime() {

            this.subscription = supabase
                .channel('loan-realtime')
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'users',
                        filter: `uuid=eq.${this.userUuid}`
                    },
                    (payload) => {
                        console.log("Realtime update:", payload.new);
                        this.render(payload.new);
                    }
                )
                .subscribe();
        },

        bindButtons() {
            document.getElementById('getStart')?.addEventListener('click', () => {
                document.getElementById('hh1')?.classList.remove('hiding');
            });

            document.getElementById('getStart2')?.addEventListener('click', () => {
                document.getElementById('xxx')?.classList.remove('hiding');
            });
        },

        format(num) {
            return Number(num || 0).toLocaleString();
        }
    };

    window.LoanUI = LoanUI;

})();
