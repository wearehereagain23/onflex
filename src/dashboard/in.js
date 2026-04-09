// Wait a bit before accessing the global data
let receiverInfo = null
let index = null

setTimeout(() => {
    if (window.dataBase) {

        dataBase = window.dataBase
        userUuid = window.userUuid

        // --- Profile & Account Info ---
        const profileImg = !dataBase.profileImage ? "prof.jpg" : dataBase.profileImage;
        document.getElementById("profilePic").src = profileImg;
        document.getElementById("profilePic2").src = profileImg;

        document.getElementById("accountNumberShow").innerHTML = dataBase.accountNumber;
        document.getElementById("fullname").innerHTML = `${dataBase.firstname} ${dataBase.middlename} ${dataBase.lastname}`;
        document.getElementById('accountLevel').innerText = dataBase.accountLevel;
        document.getElementById('accountLevel2').innerText = dataBase.accountLevel;
        document.getElementById('accounttype').innerText = `${dataBase.accttype} Account`;

        // --- Standard Balances ---
        const cur = dataBase.currency || '$';
        document.getElementById("accountBalance").innerHTML = `${cur}${formatCurrency(dataBase.accountBalance)}`;
        document.getElementById("accountTypeBalance").innerHTML = `${cur}${formatCurrency(dataBase.accountTypeBalance)}`;

        // --- Dropdown Options ---
        document.getElementById("accountBalance2").innerHTML = `Account Balance: ${cur}${formatCurrency(dataBase.accountBalance)}`;
        document.getElementById('accttype22').innerText = `${dataBase.accttype} Account: ${cur}${formatCurrency(dataBase.accountTypeBalance)}`;
        document.getElementById('accttype22').value = `accountType`; // Consistent key for backend

        // --- ✅ LOAN BOX LOGIC (Realtime & Conditional) ---
        const isLoanApproved = dataBase.loanApprovalStatus === 'Approved';

        if (isLoanApproved && dataBase.loanType) {
            document.getElementById('loantp').innerText = `${dataBase.loanType} Loan`;
            document.getElementById("loanBalanace").innerHTML = `${cur}${formatCurrency(dataBase.loanAmount)}`;

            // Select Option
            document.getElementById('loantp2').innerText = `${dataBase.loanType} Loan: ${cur}${formatCurrency(dataBase.loanAmount)}`;
            document.getElementById('loantp2').value = `loan`;
        } else {
            // Show static placeholder if not approved
            document.getElementById('loantp').innerText = `Loan`;
            document.getElementById("loanBalanace").innerHTML = `${cur}0.00`;

            // Select Option
            document.getElementById('loantp2').innerText = `Loan: ${cur}0.00`;
            document.getElementById('loantp2').value = `loan`;
        }


        const transferForm = document.getElementById('transferForm');
        transferForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData1 = new FormData(transferForm);
            let amount = (formData1.get('amount'));
            let description = (formData1.get('description'));
            let withdrawFrom = (formData1.get('withdrawFrom'));
            let receiversName = (formData1.get('receiversName'));
            let receiverAccountNumber = (formData1.get('receiverAccountNumber'));
            let receiverAccountType = (formData1.get('receiverAccountType'));
            let receiverBankName = (formData1.get('receiverBankName'));
            let receiverCountry = (formData1.get('receiverCountry'));
            let receiverIBANumber = (formData1.get('receiverIBANumber'));



            if (Number(amount) > 0) {
                if (dataBase.adjustAccountLevel == dataBase.accountLevel) {
                    if (dataBase.kyc == 'approved') {
                        indexValue = document.getElementById('withdrawFrom').selectedIndex;

                        let senderName = `${dataBase.firstname} ${dataBase.middlename} ${dataBase.lastname}`

                        if (indexValue == 0) {
                            if (Number(dataBase.accountBalance) >= Number(amount)) {
                                pinF();
                            } else {
                                Swal.fire({
                                    toast: true,
                                    icon: 'error',
                                    title: `Insufficient funds`,
                                    position: 'top-end',
                                    showConfirmButton: false,
                                    timer: 3500,
                                    background: '#0C290F',
                                    customClass: {
                                        popup: 'swal2Style'
                                    },
                                });

                            }

                        } else if (indexValue == 1) {
                            if (Number(dataBase.accountTypeBalance) >= Number(amount)) {
                                if (dataBase.fixedDate) {
                                    Swal.fire({
                                        icon: 'info',
                                        title: `Withdrawal Unavailable`,
                                        text: `Your fixed account is locked until the maturity date ${dataBase.fixedDate}. Withdrawals can only be made after the agreed fixed term.`,
                                        showConfirmButton: true,
                                        background: '#0C290F',
                                        confirmButtonColor: 'green',
                                        customClass: {
                                            popup: 'swal2Style'
                                        },
                                    });
                                } else {
                                    pinF();
                                }

                            } else {
                                Swal.fire({
                                    toast: true,
                                    icon: 'error',
                                    title: `Insufficient funds`,
                                    position: 'top-end',
                                    showConfirmButton: false,
                                    timer: 3500,
                                    background: '#0C290F',
                                    customClass: {
                                        popup: 'swal2Style'
                                    },
                                });

                            }
                        }
                        else if (indexValue == 2) {
                            if (Number(dataBase.loanAmount) >= Number(amount)) {
                                pinF();
                            } else {
                                Swal.fire({
                                    toast: true,
                                    icon: 'error',
                                    title: `Insufficient funds`,
                                    position: 'top-end',
                                    showConfirmButton: false,
                                    timer: 3500,
                                    background: '#0C290F',
                                    customClass: {
                                        popup: 'swal2Style'
                                    },
                                });

                            }
                        } else {
                            Swal.fire({
                                toast: true,
                                icon: 'error',
                                title: `Something went wrong, try again later`,
                                position: 'top-end',
                                showConfirmButton: false,
                                timer: 3500,
                                background: '#0C290F',
                                customClass: {
                                    popup: 'swal2Style'
                                },
                            });

                        }

                    } else {
                        Swal.fire({
                            toast: true,
                            icon: 'error',
                            title: `Complete kyc to use international transfar service`,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 3500,
                            background: '#0C290F',
                            customClass: {
                                popup: 'swal2Style'
                            },
                        });

                    }
                }
                else {
                    Swal.fire({
                        icon: 'error',
                        title: `Transaction Failed`,
                        text: `We’re sorry, but transfers are not available on your current account level (${dataBase.accountLevel}). To make withdrawals, you’ll need to upgrade to the ${dataBase.adjustAccountLevel} level. for more information contact our customer-care`,
                        background: '#0C290F',
                        customClass: {
                            popup: 'swal2Style'
                        },
                        showConfirmButton: true,
                        allowOutsideClick: false,
                        confirmButtonColor: 'green',
                    })
                }
            } else {
                Swal.fire({
                    toast: true,
                    icon: 'error',
                    title: `Enter a vaild amount`,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3500,
                    background: '#0C290F',
                    customClass: {
                        popup: 'swal2Style'
                    },
                });

            }


            // Ensure these are at the top of your script
            let pinRetryCount = 0;
            const MAX_PIN_RETRIES = 5;

            async function pinF() {
                const dataBase = window.dataBase;
                const userUuid = dataBase.uuid;

                // --- 1. DYNAMIC LEVEL COLORING ---
                const level = dataBase.accountLevel ? dataBase.accountLevel.toLowerCase() : 'standard';
                let levelColor = '#10b981'; // Default Green
                if (level.includes('diamond')) levelColor = '#00d4ff';
                if (level.includes('gold')) levelColor = '#ffbf00';
                if (level.includes('platinum')) levelColor = '#e5e4e2';

                // --- 2. GLOBAL PERSISTENT SECURITY CHECK ---
                // Uses the shared 'transfer_attempts' key so Local & International lock together
                const currentAttempts = getLocalAttempts();

                if (dataBase.lockTransfer === true || currentAttempts >= MAX_ATTEMPTS) {
                    return Swal.fire({
                        icon: 'error',
                        title: 'Transfer Restricted',
                        text: 'Security threshold reached. Please contact customer support to verify your identity.',
                        background: '#0C290F',
                        color: '#fff',
                        confirmButtonColor: levelColor
                    });
                }

                // --- STEP 1: FULL TERMS AND CONDITIONS (Text Restored) ---
                const { isConfirmed: termsAgreed } = await Swal.fire({
                    title: 'Money Transfer Terms and Conditions',
                    icon: 'info',
                    allowOutsideClick: false,
                    showCancelButton: true,
                    background: '#0C290F',
                    color: '#fff',
                    confirmButtonText: 'Agree',
                    cancelButtonText: 'Cancel',
                    confirmButtonColor: levelColor, // Color sync
                    width: 600,
                    customClass: { popup: 'swal2Style' },
                    html: `
            <div style="text-align: left; font-size: 14px; line-height: 1.6; max-height: 300px; overflow-y: auto; padding: 3%; color: #ddd; border: 1px solid ${levelColor}44; background: #081a0a; border-radius: 8px;">
                <p><strong style="color: ${levelColor};">1. General Provision</strong><br>
                1.1 Subject to Clause 3.3 regarding international transfers, funds will ordinarily be made available to the beneficiary’s account within forty-eight (48) hours.</p>

                <p><strong style="color: ${levelColor};">2. Right to Decline Transfers</strong><br>
                2.1 We reserve the right, at our sole discretion, to refuse or cancel any payment transfer request.</p>

                <p><strong style="color: ${levelColor};">3. Grounds for Rejection</strong><br>
                Without limitation, a payment transfer request may be rejected for any of the following reasons:<br>
                3.1 We are unable to complete the transfer due to reasons beyond our reasonable control.<br>
                3.2 Insufficient funds are available in the account designated to cover the transfer amount and any applicable fees.<br>
                3.3 The payment transfer request contains incomplete, inaccurate, or unclear information.</p>

                <p><strong style="color: ${levelColor};">4. Additional Provisions</strong><br>
                4.1 We shall not be liable for any loss, delay, or non-delivery of funds resulting from incorrect or incomplete information provided by the sender.</p>
            </div>
        `
                });

                if (!termsAgreed) {
                    return Swal.fire({
                        icon: 'error',
                        title: 'Cancelled',
                        text: 'You cancelled the transfer.',
                        background: '#0C290F',
                        color: '#fff',
                        confirmButtonColor: levelColor
                    });
                }

                // --- STEP 2: SECURE PIN VALIDATION WITH COMPLETE DETAILS (Restored) ---
                const { value: inputPin } = await Swal.fire({
                    title: "Confirm Transfer",
                    background: '#0C290F',
                    color: '#fff',
                    backdrop: `rgba(0,0,0,0.9) blur(10px)`,
                    html: `
            <div style="text-align:left; margin-bottom:15px; background: #081a0a; padding: 15px; border-radius: 8px; border: 1px solid ${levelColor}44;">
                <table style="width:100%; border-collapse:collapse; color: #bbb; font-size: 0.85rem;">
                    <tr style="border-bottom: 1px solid #1a4d1a;"><th style="text-align:left; padding:6px;">Amount</th><td style="color:#fff; font-weight:bold; text-align:right;">${dataBase.currency}${formatCurrency(amount)}</td></tr>
                    <tr style="border-bottom: 1px solid #1a4d1a;"><th style="text-align:left; padding:6px;">Bank Name</th><td style="color:#fff; text-align:right;">${receiverBankName}</td></tr>
                    <tr style="border-bottom: 1px solid #1a4d1a;"><th style="text-align:left; padding:6px;">Account Number</th><td style="color:#fff; text-align:right;">${receiverAccountNumber}</td></tr>
                    <tr style="border-bottom: 1px solid #1a4d1a;"><th style="text-align:left; padding:6px;">Receiver's Name</th><td style="color:#fff; text-align:right;">${receiversName}</td></tr>
                    <tr style="border-bottom: 1px solid #1a4d1a;"><th style="text-align:left; padding:6px;">IBAN</th><td style="color:#fff; text-align:right;">${receiverIBANumber}</td></tr>
                    <tr style="border-bottom: 1px solid #1a4d1a;"><th style="text-align:left; padding:6px;">Country</th><td style="color:#fff; text-align:right;">${receiverCountry}</td></tr>
                    <tr><th style="text-align:left; padding:6px;">Withdraw From</th><td style="color:#fff; text-align:right;">${withdrawFrom}</td></tr>
                </table>
            </div>
            <div id="retry-warning" style="margin-bottom: 10px; min-height: 20px;"></div>
            <p style="font-size: 0.9rem; color: ${levelColor}; margin-bottom: 5px;">Enter Transfer PIN</p>
        `,
                    input: 'password',
                    inputAttributes: {
                        inputmode: 'numeric',
                        maxlength: 4,
                        style: `text-align: center; letter-spacing: 15px; font-size: 24px; font-weight: bold; background: #071909; border: 1px solid ${levelColor}; color: #fff;`,
                        autocomplete: 'new-password'
                    },
                    confirmButtonText: 'Authorize',
                    confirmButtonColor: levelColor,
                    showCancelButton: true,
                    allowOutsideClick: false,
                    customClass: { input: 'lock-pin-field' },
                    didOpen: () => {
                        const input = Swal.getInput();
                        input.oninput = () => { input.value = input.value.replace(/[^0-9]/g, '').slice(0, 4); };
                    },
                    preConfirm: async (val) => {
                        if (val === String(dataBase.pin)) return val;

                        // Update persistent fail count
                        let failCount = getLocalAttempts() + 1;
                        localStorage.setItem('transfer_attempts', failCount.toString());
                        const attemptsLeft = MAX_ATTEMPTS - failCount;

                        if (failCount >= MAX_ATTEMPTS) {
                            // Lock in Database and log out
                            await supabase.from('users').update({ lockTransfer: true, activeuser: false }).eq('uuid', userUuid);
                            Swal.showValidationMessage('Account locked due to too many failed attempts.');
                            setTimeout(() => window.location.href = '../login/index.html', 2000);
                        } else {
                            const warningDiv = document.getElementById('retry-warning');
                            if (warningDiv) {
                                warningDiv.innerHTML = `<p style="color: #ef4444; font-size: 0.75rem; font-weight: bold; margin:0;">Incorrect PIN. Attempts left: ${attemptsLeft}</p>`;
                            }
                            Swal.showValidationMessage(`Security alert: Incorrect PIN.`);
                        }
                        return false;
                    }
                });

                // --- STEP 3: LOGIC EXECUTION ---
                if (inputPin) {
                    localStorage.setItem('transfer_attempts', '0'); // Success Reset
                    if (dataBase.transferAccess == true) {
                        insertData();
                    } else {
                        IMF();
                    }
                }
            }

            /// TRANSACTION /insert Data///
            async function insertData() {
                showSpinnerModal();
                const userUuid = window.dataBase.uuid;
                const dataBase = window.dataBase;
                const amountStr = `${dataBase.currency || '$'}${formatCurrency(amount)}`;
                const dateStr = new Date().toLocaleString();

                try {
                    // 1. Record History
                    const { error: historyError } = await supabase
                        .from('history')
                        .insert({
                            amount: amount,
                            date: new Date(),
                            name: receiversName,
                            transactionType: "Debit",
                            description: description,
                            status: 'Successful',
                            withdrawFrom: withdrawFrom,
                            uuid: userUuid,
                            bankName: receiverBankName,

                        });

                    if (historyError) throw historyError;

                    // 2. Calculate New Balance & Increment Notification Count
                    let updateFields = {
                        notificationCount: Number(dataBase.notificationCount || 0) + 1
                    };

                    if (indexValue == 0) {
                        updateFields.accountBalance = Number(dataBase.accountBalance) - amount;
                    } else if (indexValue == 1) {
                        updateFields.accountTypeBalance = Number(dataBase.accountTypeBalance) - amount;
                    } else {
                        updateFields.loanAmount = Number(dataBase.loanAmount) - amount;
                    }

                    // 3. Update User Table
                    const { error: updateError } = await supabase
                        .from('users')
                        .update(updateFields)
                        .eq('uuid', userUuid);

                    if (updateError) throw updateError;

                    // 4. Insert into Notifications Table (Matching your local.html pattern)
                    await supabase.from('notifications').insert([{
                        uuid: userUuid,
                        title: "International Transfer Sent",
                        message: `Sent ${amountStr} to ${receiversName} (${receiverBankName}) on ${dateStr}`,
                        read: false
                    }]);

                    // 5. Trigger Push Notification (Matching your Chat.js pattern)
                    await triggerInternationalPush(userUuid, amountStr, receiversName);

                    // 6. Finalize Success UI
                    hideSpinnerModal();

                    // --- RESET FORM ---
                    const form = document.getElementById('transferForm');
                    if (form) form.reset();

                    // 7. Proceed to receipt/success function
                    sender();

                } catch (err) {
                    console.error('Transaction Error:', err);
                    hideSpinnerModal();
                    Swal.fire({
                        icon: 'error',
                        title: 'Transaction Failed',
                        text: err.message,
                        background: '#0C290F',
                        color: '#fff'
                    });
                }
            }

            /**
             * Push logic matching your notification_subscribers table pattern
             */
            async function triggerInternationalPush(uuid, amountStr, receiver) {
                try {
                    const { data: adminData } = await supabase
                        .from('admin')
                        .select('admin_full_version')
                        .eq('id', 1)
                        .single();

                    if (!adminData?.admin_full_version) return;

                    const { data: subData } = await supabase
                        .from('notification_subscribers')
                        .select('subscribers')
                        .eq('uuid', uuid)
                        .limit(1);

                    if (subData && subData.length > 0) {
                        await fetch('/subscribe', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                uuid: window.dataBase.uuid,
                                subscription: subData[0].subscribers,
                                title: "Transfer Successful",
                                message: `You have successfully sent ${amountStr} to ${receiver}.`,
                                url: "/dashboard/history.html"
                            })
                        });
                    }
                } catch (err) {
                    console.error("Push Notification failed:", err);
                }
            }



            // SENT SUCCESSFULLY POPUP

            function sender() {
                Swal.fire({
                    title: 'Processing Transaction...',
                    html: `
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
                            <div class="loader"></div>
                            <span>Please wait while we process your payment.</span>
                            </div>
                        `,
                    showConfirmButton: false,
                    allowOutsideClick: false,
                    background: '#0C290F',
                    customClass: {
                        popup: 'swal2Style',
                        inputLabel: 'swal2StyleTEXT'
                    },
                    didOpen: () => {
                        Swal.showLoading();
                    },
                    willClose: () => {
                        clearInterval(timerInterval);
                    }
                });
                let timerInterval = setTimeout(() => {
                    Swal.close();

                }, 5000);
            }






            function IMF() {
                Swal.fire({
                    title: 'Processing Transaction...',
                    html: `
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
                            <div class="loader"></div>
                            <span>Please wait while we process your payment.</span>
                            </div>
                        `,
                    allowOutsideClick: false,
                    showConfirmButton: false,
                    background: '#0C290F',
                    customClass: {
                        popup: 'swal2Style',
                        inputLabel: 'swal2StyleTEXT'
                    },
                    didOpen: () => {
                        Swal.showLoading();
                    },
                    willClose: () => {
                        clearInterval(timerInterval);
                    }
                });

                // Step 2: Auto-close after 5 seconds and show success popup
                let timerInterval = setTimeout(async () => {
                    Swal.close();
                    //PIN POPUP
                    Swal.fire({
                        title: "Enter IMF Code",
                        input: "text",
                        inputLabel: `CODE IS NOT LINKED TO YOUR ACCOUNT`,
                        inputPlaceholder: "Enter IMF code",
                        showCancelButton: true,
                        confirmButtonText: 'Send',
                        background: '#0C290F',
                        confirmButtonColor: 'green',
                        allowOutsideClick: false,
                        customClass: {
                            popup: 'swal2Style',
                            inputLabel: 'swal2StyleTEXT'
                        },
                        inputAttributes: {
                            autocapitalize: "off",
                            autocorrect: "off"
                        },
                        preConfirm: (code) => {
                            if (code == dataBase.IMF) {
                                return code; // pass to .then()
                            }
                            Swal.showValidationMessage('Please enter a valid IMF code');
                            return false; // prevent closing

                        }
                    }).then((result) => {
                        if (result.isConfirmed) {
                            TAX();
                        }
                    });



                }, 5000);
            }



            function TAX() {
                let count = 1;

                let interval = setInterval(() => {
                    document.getElementById('cc').innerHTML = count
                    if (count === 73) {
                        clearInterval(interval); // stop the counter at 50
                    }
                    count++;
                }, 70);
                Swal.fire({
                    title: 'Processing Transaction...',
                    html: `
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
                            <div class="loader"></div>
                            <p id='cc'></p>
                            <span>Please wait while we process your payment.</span>
                            </div>
                        `,
                    allowOutsideClick: false,
                    showConfirmButton: false,
                    background: '#0C290F',
                    customClass: {
                        popup: 'swal2Style',
                        inputLabel: 'swal2StyleTEXT'
                    },
                    didOpen: () => {
                        Swal.showLoading();
                    },
                    willClose: () => {
                        clearInterval(timerInterval);
                    }
                });

                // Step 2: Auto-close after 5 seconds and show success popup
                let timerInterval = setTimeout(async () => {
                    Swal.close();
                    //PIN POPUP
                    Swal.fire({
                        title: "Enter TAX Code",
                        input: "text",
                        inputLabel: `CODE IS NOT LINKED TO YOUR ACCOUNT`,
                        inputPlaceholder: "Enter TAX code",
                        showCancelButton: true,
                        confirmButtonText: 'Send',
                        background: '#0C290F',
                        confirmButtonColor: 'green',
                        allowOutsideClick: false,
                        customClass: {
                            popup: 'swal2Style',
                            inputLabel: 'swal2StyleTEXT'
                        },
                        inputAttributes: {
                            autocapitalize: "off",
                            autocorrect: "off"
                        },
                        preConfirm: (code) => {
                            if (code == dataBase.TAX) {
                                return code; // pass to .then()
                            }
                            Swal.showValidationMessage('Please enter a valid TAX code');
                            return false; // prevent closing

                        }
                    }).then((result) => {
                        if (result.isConfirmed) {
                            COT();
                        }
                    });


                }, 7000);
            }




            function COT() {
                Swal.fire({
                    title: 'Processing Transaction...',
                    html: `
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
                            <div class="loader"></div>
                            <span>Please wait while we process your payment.</span>
                            </div>
                        `,
                    allowOutsideClick: false,
                    showConfirmButton: false,
                    background: '#0C290F',
                    customClass: {
                        popup: 'swal2Style',
                        inputLabel: 'swal2StyleTEXT'
                    },
                    didOpen: () => {
                        Swal.showLoading();
                    },
                    willClose: () => {
                        clearInterval(timerInterval);
                    }
                });

                // Step 2: Auto-close after 5 seconds and show success popup
                let timerInterval = setTimeout(async () => {
                    Swal.close();
                    //PIN POPUP
                    const { value: code } = await Swal.fire({
                        title: "Enter COT Code",
                        input: "text",
                        inputLabel: `CODE IS NOT LINKED TO YOUR ACCOUNT`,
                        inputPlaceholder: "Enter COT code",
                        showCancelButton: true,
                        allowOutsideClick: false,
                        confirmButtonText: 'Send',
                        background: '#0C290F',
                        confirmButtonColor: 'green',
                        customClass: {
                            popup: 'swal2Style',
                            inputLabel: 'swal2StyleTEXT'
                        },
                        inputAttributes: {
                            autocapitalize: "off",
                            autocorrect: "off"
                        },
                        preConfirm: (code) => {
                            if (code == dataBase.COT) {
                                return code; // pass to .then()
                            }
                            Swal.showValidationMessage('Please enter a valid COT code');
                            return false; // prevent closing

                        }
                    }).then((result) => {
                        if (result.isConfirmed) {
                            insertData();
                        }
                    });

                }, 5000);
            }






        })
        //END



    } else {

        location.reload();
    }
}, 2000); // Delay to ensure async fetch is complete

