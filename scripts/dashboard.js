// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBjv9QcHnzt97VLnA2s5kbO6aXAggKawe4",
  authDomain: "paybuntu.firebaseapp.com",
  projectId: "paybuntu",
  storageBucket: "paybuntu.firebasestorage.app",
  messagingSenderId: "614158103762",
  appId: "1:614158103762:web:b05592517738bf5b8e290b",
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

let is2FAVerified = false; 
let pendingTransferTask = null; // Store transfer logic if 2FA is needed
let systemConfig = {
    maintenanceMode: false,
    transferFeePercent: 0,
    minTransferFee: 0,
    broadcastMessage: ""
};

// ... existing code ...

// db.collection("transactions")
//   .where("userId", "==", userId)
//   .orderBy("timestamp", "desc")
//   .onSnapshot((querySnapshot) => {
//     const transactions = [];
//     querySnapshot.forEach((doc) => {
//       transactions.push({ id: doc.id, ...doc.data() });
//     });

//     // Now update your dashboard UI with this data
//     displayTransactions(transactions);
//   });


// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "NGN",
  }).format(amount);
}

// Format date
function formatDate(dateString) {
  const options = { year: "numeric", month: "short", day: "numeric" };
  return new Date(dateString).toLocaleDateString("en-US", options);
}

// Update the dashboard with user data
function updateDashboard(userData) {
  // Update user information
  const userAvatar = document.getElementById("userAvatar");
  const settingsAvatar = document.getElementById("settingsAvatar");
  const accountPageAvatar = document.getElementById("accountPageAvatar");

  if (userData.photoURL) {
    const avatarHtml = `<img src="${userData.photoURL}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
    if (userAvatar) userAvatar.innerHTML = avatarHtml;
    if (settingsAvatar) settingsAvatar.innerHTML = avatarHtml;
    if (accountPageAvatar) accountPageAvatar.innerHTML = avatarHtml;
  } else if (userData.firstName && userData.lastName) {
    const initials = userData.firstName.charAt(0) + userData.lastName.charAt(0);
    if (userAvatar) userAvatar.textContent = initials;
    if (settingsAvatar) settingsAvatar.textContent = initials;
    if (accountPageAvatar) accountPageAvatar.textContent = initials;
  }

  document.getElementById("welcomeMessage").textContent = `${
    userData.firstName + " " + userData.lastName 
  }!`;

  document.getElementById("userName").textContent = `${
    userData.firstName || ""
  } ${userData.lastName || ""}`;

  document.getElementById("userEmail").textContent = userData.email || "";

  // Update account information
  if (userData.balance !== undefined) {
    document.getElementById("balanceAmount").textContent = formatCurrency(
      userData.balance
    );
  }

  if (userData.accountNumber) {
    const accountNumber = userData.accountNumber;
    const maskedAccount = `${accountNumber}`;
    document.getElementById("accountNumber").textContent = maskedAccount;
  }

  if (userData.createdAt) {
    document.getElementById("memberSince").textContent = formatDate(
      userData.createdAt.toDate()
    );
  }

  // Populate Account Page
  const fullName = `${userData.firstName || ""} ${userData.lastName || ""}`;
  
  if(document.getElementById("accountPageName")) {
      document.getElementById("accountPageName").textContent = fullName;
      document.getElementById("accountPageEmail").textContent = userData.email || "";
      // Initial setting removed here; handled in unified block above
      
      document.getElementById("accInfoName").textContent = fullName;
      document.getElementById("accInfoNum").textContent = userData.accountNumber || "N/A";
      document.getElementById("accInfoEmail").textContent = userData.email || "";
      document.getElementById("accInfoPhone").textContent = userData.phone || "Not Set";
  }

  // Populate Settings Page
  if(document.getElementById("settingFirstName")) {
      document.getElementById("settingFirstName").value = userData.firstName || "";
      document.getElementById("settingLastName").value = userData.lastName || "";
      document.getElementById("settingEmail").value = userData.email || "";
      document.getElementById("settingPhone").value = userData.phone || "";
      
      // Update 2FA Switch
      const twoFactorToggle = document.getElementById("twoFactorToggle");
      if(twoFactorToggle) twoFactorToggle.checked = userData.twoFactorEnabled || false;

      // Update PIN Status
      const pinStatusText = document.getElementById("pinStatusText");
      const alertBox = document.getElementById("missingPinAlert");
      if(userData.transactionPin) {
          if(pinStatusText) pinStatusText.textContent = "Security Active (••••)";
          if(alertBox) alertBox.classList.add("hidden");
      } else {
          if(pinStatusText) pinStatusText.textContent = "Not set up yet";
          if(alertBox) alertBox.classList.remove("hidden");
      }
  }
}

// Settings Profile Update Logic
document.addEventListener("DOMContentLoaded", () => {
    // System Config Listener
    listenToSystemConfig();

    // Logout Logic
    const logoutBtn = document.getElementById("logoutBtn");
    if(logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            auth.signOut().then(() => {
                window.location.href = "login.html";
            });
        });
    }

    const profileForm = document.getElementById("profileForm");
    if(profileForm) {
        profileForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const btn = document.getElementById("saveProfileBtn");
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            btn.disabled = true;

            const updates = {
                firstName: document.getElementById("settingFirstName").value,
                lastName: document.getElementById("settingLastName").value,
                email: document.getElementById("settingEmail").value,
                phone: document.getElementById("settingPhone").value
            };

            try {
                await db.collection("users").doc(auth.currentUser.uid).update(updates);
                alert("Profile Updated Successfully!");
            } catch(err) {
                console.error(err);
                alert("Error updating profile: " + err.message);
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    // Avatar Upload Logic
    const avatarInput = document.getElementById("avatarUpload");
    if(avatarInput) {
        avatarInput.addEventListener("change", async (e) => {
             const file = e.target.files[0];
             if(!file) return;

             const statusText = document.getElementById("uploadStatusText");
             const originalText = statusText.textContent;
             statusText.textContent = "Uploading...";
             statusText.style.color = "var(--primary)";

             try {
                 // Cloudinary Upload (Using dhgkvj8wm)
                 const formData = new FormData();
                 formData.append('file', file);
                 formData.append('upload_preset', 'profilePictures');

                 const response = await fetch(`https://api.cloudinary.com/v1_1/dhgkvj8wm/image/upload`, {
                     method: 'POST',
                     body: formData
                 });

                 if (!response.ok) {
                    const errorData = await response.json();
                    console.error("Cloudinary Error Detail:", errorData);
                    throw new Error(errorData.error?.message || 'Image upload failed');
                 }
                 
                 const data = await response.json();
                 const downloadURL = data.secure_url;

                 // Update Auth and Firestore
                 await auth.currentUser.updateProfile({ photoURL: downloadURL });
                 await db.collection("users").doc(auth.currentUser.uid).update({ photoURL: downloadURL });

                 statusText.textContent = "Upload successful!";
                 statusText.style.color = "var(--accent)";
                 setTimeout(() => { statusText.textContent = originalText; statusText.style.color = ""; }, 3000);
             } catch(err) {
                 console.error("Full Upload Error:", err);
                 statusText.textContent = "Upload failed: " + err.message;
                 statusText.style.color = "var(--danger)";
             }
        });
    }

    // Password Change Logic
    const passwordForm = document.getElementById("passwordForm");
    if(passwordForm) {
        passwordForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const currentPass = document.getElementById("currentPassword").value;
            const newPass = document.getElementById("newPassword").value;
            const confirmPass = document.getElementById("confirmPassword").value;

            if(newPass !== confirmPass) {
                alert("New passwords do not match.");
                return;
            }

            try {
                // Re-authenticate user (Firebase security requirement for sensitive operations)
                const credential = firebase.auth.EmailAuthProvider.credential(auth.currentUser.email, currentPass);
                await auth.currentUser.reauthenticateWithCredential(credential);
                await auth.currentUser.updatePassword(newPass);
                alert("Password updated successfully!");
                closePasswordModal();
                passwordForm.reset();
            } catch(err) {
                console.error(err);
                alert("Password update failed: " + err.message);
            }
        });
    }

    // 2FA Toggle Logic
    const twoFactorToggle = document.getElementById("twoFactorToggle");
    if(twoFactorToggle) {
        twoFactorToggle.addEventListener("change", async (e) => {
            try {
                await db.collection("users").doc(auth.currentUser.uid).update({
                    twoFactorEnabled: e.target.checked
                });
            } catch(err) {
                console.error(err);
                alert("Failed to update 2FA status.");
                e.target.checked = !e.target.checked; // Revert
            }
        });
    }

    // Login History View Logic
    const viewHistoryBtn = document.getElementById("viewLoginHistoryBtn");
    if(viewHistoryBtn) {
        viewHistoryBtn.addEventListener("click", fetchLoginHistory);
    }

    // 2FA Verification Form
    const twoFactorForm = document.getElementById("twoFactorForm");
    if(twoFactorForm) {
        twoFactorForm.addEventListener("submit", (e) => {
            e.preventDefault();
            handle2FAVerification();
        });
    }

    // PIN Setup Form
    const setupPinForm = document.getElementById("setupPinForm");
    if(setupPinForm) {
        setupPinForm.addEventListener("submit", handlePinSetup);
    }
    const setupPinBtn = document.getElementById("setupPinBtn");
    if(setupPinBtn) setupPinBtn.onclick = openSetupPinModal;

    // PIN Verification Form (Transfers)
    const authPinForm = document.getElementById("authPinForm");
    if(authPinForm) {
        authPinForm.onsubmit = (e) => {
            e.preventDefault();
            handlePinVerification();
        }
    }

    // Proceed to PIN button (Confirmation Modal)
    const proceedToPinBtn = document.getElementById("proceedToPinBtn");
    if(proceedToPinBtn) {
        proceedToPinBtn.onclick = () => {
            closeConfirmModal();
            openEnterPinModal();
        };
    }

    // Phone Verification Mock Logic
    const verifyPhoneBtn = document.getElementById("verifyPhoneBtn");
    if(verifyPhoneBtn) {
        verifyPhoneBtn.addEventListener("click", () => {
            const phone = document.getElementById("settingPhone").value;
            if(!phone || phone.length < 10) {
                alert("Please enter a valid phone number first.");
                return;
            }
            
            const feedback = document.getElementById("phoneVerifyFeedback");
            feedback.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending code...';
            feedback.style.color = "var(--primary)";

            setTimeout(() => {
                const code = prompt("Enter the 6-digit code sent to " + phone + " (Use 123456)");
                if(code === "123456") {
                    feedback.innerHTML = '<i class="fas fa-check-circle"></i> Phone Verified';
                    feedback.style.color = "var(--accent)";
                    verifyPhoneBtn.disabled = true;
                    verifyPhoneBtn.textContent = "Verified";
                    // Update in Firestore
                    db.collection("users").doc(auth.currentUser.uid).update({ phoneVerified: true });
                } else {
                    feedback.innerHTML = '<i class="fas fa-times-circle"></i> Invalid code';
                    feedback.style.color = "var(--danger)";
                }
            }, 1500);
        });
    }

    // Chat Form Listener
    const chatForm = document.getElementById("chatForm");
    if(chatForm) {
        chatForm.addEventListener("submit", (e) => {
            e.preventDefault();
            sendSupportMessage();
        });
    }
});

// Modal Control Functions
function openPasswordModal() { document.getElementById('passwordModal').classList.remove('hidden'); }
function closePasswordModal() { document.getElementById('passwordModal').classList.add('hidden'); }
function closeLoginHistoryModal() { document.getElementById('loginHistoryModal').classList.add('hidden'); }

function openSetupPinModal() { 
    document.getElementById('setupPinModal').classList.remove('hidden'); 
    document.getElementById('setupPinForm').reset();
}
function closeSetupPinModal() { document.getElementById('setupPinModal').classList.add('hidden'); }

function openConfirmModal(recipient, amount, fee = 0) {
    document.getElementById('confirmRecipient').textContent = recipient;
    document.getElementById('confirmAmount').textContent = formatCurrency(amount);
    document.getElementById('confirmFee').textContent = fee > 0 ? formatCurrency(fee) : "Free";
    document.getElementById('confirmTransferModal').classList.remove('hidden');
}
function closeConfirmModal() { document.getElementById('confirmTransferModal').classList.add('hidden'); }

function openEnterPinModal() {
    document.getElementById('enterPinModal').classList.remove('hidden');
    document.getElementById('authPinInput').value = "";
    document.getElementById('pinAuthError').classList.add('hidden');
}
function closeEnterPinModal() { 
    document.getElementById('enterPinModal').classList.add('hidden'); 
}

function open2FAModal(isCritical = false) {
    const modal = document.getElementById('twoFactorModal');
    const closeBtn = document.getElementById('close2FAModal');
    if(isCritical) {
        closeBtn.classList.add('hidden'); // Cannot bypass during login
    } else {
        closeBtn.classList.remove('hidden');
    }
    modal.classList.remove('hidden');
    document.getElementById('twoFactorCode').value = "";
    document.getElementById('twoFactorError').classList.add('hidden');
}

function close2FAModal() { 
    document.getElementById('twoFactorModal').classList.add('hidden'); 
}

// --- System Configuration Support ---

function listenToSystemConfig() {
    console.log("Starting System Config Listener...");
    db.collection("metadata").doc("config").onSnapshot(doc => {
        if(doc.exists) {
            systemConfig = doc.data();
            console.log("System Config Updated:", systemConfig);
            applySystemConfig();
        } else {
            console.warn("System Config document missing!");
        }
    }, err => {
        console.error("System Config Sync Error:", err);
    });
}

function applySystemConfig() {
    if(!systemConfig) return;
    
    // 1. Maintenance Mode
    // We check auth.currentUser. If not available yet, we might wait or assume not admin
    // To prevent flashing, we only redirect if we are SURE it's active
    const user = auth.currentUser;
    const isAdmin = user && user.email.toLowerCase() === "paybuntu@gmail.com";
    
    console.log("Applying System Config. Maintenance:", systemConfig.maintenanceMode, "IsAdmin:", isAdmin);

    if(systemConfig.maintenanceMode) {
        if(user && !isAdmin) {
             console.log("Maintenance active. Redirecting regular user.");
             window.location.href = "maintenance.html";
             return; // Stop further processing
        }
    }

    // 2. Broadcast Banner
    const banner = document.getElementById("broadcastBanner");
    const textSpan = document.getElementById("broadcastText");
    if(systemConfig.broadcastMessage && systemConfig.broadcastMessage.trim() !== "") {
        if(banner && textSpan) {
            textSpan.textContent = systemConfig.broadcastMessage;
            banner.classList.remove("hidden");
        }
    } else {
        if(banner) banner.classList.add("hidden");
    }
}

async function handle2FAVerification() {
    const code = document.getElementById('twoFactorCode').value;
    const errorMsg = document.getElementById('twoFactorError');
    const btn = document.getElementById('verify2FABtn');

    if(code === "123456") { // Mock 2FA Code
        is2FAVerified = true;
        
        // If this was protecting a transfer
        if(pendingTransferTask) {
            btn.disabled = true;
            btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processing...`;
            await pendingTransferTask();
            pendingTransferTask = null;
            close2FAModal();
        } else {
            // Only close and reset if it wasn't a transfer task (e.g. login)
            close2FAModal();
            document.querySelector('.dashboard-container').style.opacity = "1";
            document.querySelector('.dashboard-container').style.pointerEvents = "all";
        }
    } else {
        errorMsg.classList.remove('hidden');
        btn.classList.add('shake');
        setTimeout(() => btn.classList.remove('shake'), 500);
    }
}

// Transaction PIN Management Functions
async function handlePinSetup(e) {
    e.preventDefault();
    const pin = document.getElementById('newTransactionPin').value;
    const confirm = document.getElementById('confirmTransactionPin').value;

    if(pin.length !== 4) {
        alert("PIN must be exactly 4 digits.");
        return;
    }
    if(pin !== confirm) {
        alert("PINs do not match.");
        return;
    }

    try {
        await db.collection("users").doc(auth.currentUser.uid).update({
            transactionPin: pin
        });
        alert("Transaction PIN updated successfully!");
        closeSetupPinModal();
    } catch(err) {
        console.error(err);
        alert("Failed to update PIN: " + err.message);
    }
}

async function handlePinVerification() {
    const enteredPin = document.getElementById('authPinInput').value;
    const errorMsg = document.getElementById('pinAuthError');
    
    try {
        const userDoc = await db.collection("users").doc(auth.currentUser.uid).get();
        if(userDoc.data().transactionPin === enteredPin) {
            closeEnterPinModal();
            
            // Check for 2FA next
            if(userDoc.data().twoFactorEnabled) {
                open2FAModal();
            } else if(pendingTransferTask) {
                // Show loading in the PIN modal itself while execution happens
                const btn = document.getElementById('verifyPinBtn');
                btn.disabled = true;
                btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processing...`;
                
                await pendingTransferTask();
                pendingTransferTask = null;
                closeEnterPinModal();
                btn.disabled = false;
                btn.innerHTML = `Authorize`;
            }
        } else {  errorMsg.classList.remove('hidden');
        }
    } catch(err) {
        console.error(err);
        alert("Verification error: " + err.message);
    }
}

// Assign specific event listener for the Password Update button in Settings
document.addEventListener("DOMContentLoaded", () => {
    const changeBtn = document.getElementById("changePasswordBtn");
    if(changeBtn) changeBtn.onclick = openPasswordModal;
});

// Fetch and display Login History
async function fetchLoginHistory() {
    const list = document.getElementById("loginHistoryList");
    const modal = document.getElementById("loginHistoryModal");
    modal.classList.remove("hidden");
    list.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading history...</div>';

    try {
        const snapshot = await db.collection("login_history")
            .where("userId", "==", auth.currentUser.uid)
            // .orderBy("timestamp", "desc") // Removed to avoid index requirement
            .limit(50)
            .get();

        if(snapshot.empty) {
            list.innerHTML = '<div style="text-align: center; padding: 20px;">No recent login history found.</div>';
            return;
        }

        // Sort client-side
        const historyDocs = [];
        snapshot.forEach(doc => historyDocs.push(doc.data()));
        historyDocs.sort((a, b) => {
            const dateA = a.timestamp ? a.timestamp.toDate() : new Date();
            const dateB = b.timestamp ? b.timestamp.toDate() : new Date();
            return dateB - dateA;
        });

        list.innerHTML = "";
        historyDocs.slice(0, 10).forEach(data => {
            const date = data.timestamp ? data.timestamp.toDate() : new Date();
            const item = document.createElement("div");
            item.style.padding = "12px";
            item.style.borderBottom = "1px solid var(--border)";
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600;">Login detected</div>
                        <div class="text-muted" style="font-size: 13px;">${data.device || 'Unknown Device'} • ${data.browser || 'Unknown Browser'}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 14px;">${date.toLocaleDateString()}</div>
                        <div class="text-muted" style="font-size: 12px;">${date.toLocaleTimeString()}</div>
                    </div>
                </div>
            `;
            list.appendChild(item);
        });
    } catch(err) {
        console.error(err);
        list.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--danger);">Failed to load history: ${err.message}</div>`;
    }
}

// Record login session
async function recordLogin(user) {
    try {
        // Basic device/browser info
        const userAgent = navigator.userAgent;
        let browser = "Other";
        if(userAgent.indexOf("Chrome") > -1) browser = "Chrome";
        else if(userAgent.indexOf("Firefox") > -1) browser = "Firefox";
        else if(userAgent.indexOf("Safari") > -1) browser = "Safari";

        await db.collection("login_history").add({
            userId: user.uid,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            device: navigator.platform,
            browser: browser,
            ip: "Logged Session" // Web client can't easily get IP without external service
        });
    } catch(err) {
        console.warn("Failed to record login:", err);
    }
}

// Listen for live transactions
function listenToTransactions(userId) {
  const transactionsBody = document.getElementById("transactionsBody");

  // Real-time listener
  // NOTE: Removed .orderBy("timestamp") to avoid needing a manual Firestore Index creation.
  // We will sort client-side instead.
  db.collection("transactions")
    .where("userId", "==", userId)
    // .limit(50) removed to ensure we get ALL records since we can't sort server-side without index
    .onSnapshot((snapshot) => {
      transactionsBody.innerHTML = "";
      
      if(snapshot.empty) {
          transactionsBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px;">No transactions yet</td></tr>`;
          return;
      }

      // Convert to array and sort client-side
      let docs = [];
      snapshot.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));
      
      // Sort by date/timestamp descending
      docs.sort((a, b) => {
          const dateA = a.timestamp ? a.timestamp.toDate() : new Date(a.date);
          const dateB = b.timestamp ? b.timestamp.toDate() : new Date(b.date);
          return dateB - dateA;
      });

      docs.forEach((transaction) => {
        const row = document.createElement("tr");
        row.style.cursor = "pointer";
        row.onclick = () => showTransactionDetails(transaction);

        const typeIconClass = `type-${transaction.type}`;
        let typeIcon;
        
        // Map types (transfer_out, transfer_in, etc)
        if(transaction.type.includes('in') || transaction.type === 'income') typeIcon = 'fa-arrow-down';
        else if(transaction.type.includes('out')) typeIcon = 'fa-paper-plane';
        else if(transaction.type === 'expense') typeIcon = 'fa-shopping-cart';
        else typeIcon = 'fa-circle';

        const amountClass = transaction.amount > 0 ? "income" : "expense";

        row.innerHTML = `
              <td>
                <div class="transaction-type">
                  <div class="type-icon ${typeIconClass}" style="background: ${transaction.amount > 0 ? 'rgba(52, 168, 83, 0.1)' : 'rgba(234, 67, 53, 0.1)'}; color: ${transaction.amount > 0 ? 'var(--accent)' : 'var(--danger)'}">
                    <i class="fas ${typeIcon}"></i>
                  </div>
                  <div>
                    <div style="font-weight: 500;">${transaction.description}</div>
                    <div class="text-muted" style="font-size: 12px;">${formatDate(transaction.date)}</div>
                  </div>
                </div>
              </td>
              <td class="desktop-only">${formatDate(transaction.date)}</td>
              <td class="transaction-amount ${amountClass}">${formatCurrency(transaction.amount)}</td>
              <td><span class="transaction-status status-${transaction.status}">${transaction.status.toUpperCase()}</span></td>
            `;

        transactionsBody.appendChild(row);
      });
    }, (error) => {
        console.error("Error listening to transactions:", error);
        transactionsBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: red;">Error loading data: ${error.message}</td></tr>`;
    });
}

// Show Transaction Details Modal
function showTransactionDetails(tx) {
    // Create Modal HTML dynamically if it doesn't exist
    let modal = document.getElementById('txModal');
    if(!modal) {
        modal = document.createElement('div');
        modal.id = 'txModal';
        modal.className = 'modal-overlay hidden';
        modal.innerHTML = `
            <div class="modal-content fade-in">
                <div class="modal-header">
                    <h3>Transaction Details</h3>
                    <button class="close-modal" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body" id="txModalBody">
                    <!-- Content populated via JS -->
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="closeModal()">Close</button>
                    <button class="btn btn-primary" id="downloadReceiptBtn"><i class="fas fa-download"></i> Receipt</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Populate Data
    const isCredit = tx.amount > 0;
    const body = document.getElementById('txModalBody');
    body.innerHTML = `
        <div class="tx-summary">
            <div class="tx-amount ${isCredit ? 'income' : 'expense'}">${formatCurrency(Math.abs(tx.amount))}</div>
            <div class="tx-status status-${tx.status}">${tx.status.toUpperCase()}</div>
        </div>
        <div class="tx-details-list">
            <div class="detail-row">
                <span>Type</span>
                <span>${isCredit ? 'Credit' : 'Debit'}</span>
            </div>
             <div class="detail-row">
                <span>Date</span>
                <span>${new Date(tx.date).toLocaleString()}</span>
            </div>
            <div class="detail-row">
                <span>Reference</span>
                <span style="font-family: monospace; font-size: 12px;">${tx.id}</span>
            </div>
             <div class="detail-row">
                <span>Description</span>
                <span>${tx.description}</span>
            </div>
            ${tx.note ? `<div class="detail-row"><span>Note</span><span>${tx.note}</span></div>` : ''}
        </div>
    `;

    document.getElementById('downloadReceiptBtn').onclick = () => printReceipt(tx);

    modal.classList.remove('hidden');
}

function closeModal() {
    const modal = document.getElementById('txModal');
    if(modal) modal.classList.add('hidden');
}

// Generate Receipt
function printReceipt(tx) {
    const w = window.open('', '_blank');
    w.document.write(`
        <html>
        <head>
            <title>Transaction Receipt - ${tx.id}</title>
            <style>
                body { font-family: 'Courier New', Courier, monospace; padding: 40px; text-align: center; color: #333; }
                .receipt { max-width: 400px; margin: 0 auto; border: 2px dashed #ccc; padding: 20px; }
                .amount { font-size: 24px; font-weight: bold; margin: 20px 0; }
                .row { display: flex; justify-content: space-between; margin: 10px 0; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                .footer { margin-top: 30px; font-size: 12px; color: #666; }
                .logo { font-size: 20px; font-weight: bold; margin-bottom: 10px; }
            </style>
        </head>
        <body>
            <div class="receipt">
                <div class="logo">PAYBUNTU</div>
                <div>Transaction Receipt</div>
                <div class="amount">${formatCurrency(Math.abs(tx.amount))}</div>
                
                <div class="row"><span>Status</span><span>${tx.status.toUpperCase()}</span></div>
                <div class="row"><span>Date</span><span>${new Date(tx.date).toLocaleDateString()}</span></div>
                <div class="row"><span>Type</span><span>${tx.amount > 0 ? 'Credit' : 'Debit'}</span></div>
                <div class="row"><span>Ref</span><span>${tx.id.substring(0, 8)}...</span></div>
                
                <p><strong>${tx.description}</strong></p>
                
                <div class="footer">
                    Generated on ${new Date().toLocaleString()}<br>
                    Thank you for banking with Paybuntu.
                </div>
            </div>
            <script>window.print();</script>
        </body>
        </html>
    `);
    w.document.close();
}


// Set current date
function setCurrentDate() {
  const now = new Date();
  const options = { year: "numeric", month: "long", day: "numeric" };
  const dateEl = document.getElementById("currentDate");
  if(dateEl) dateEl.textContent = now.toLocaleDateString("en-US", options);
}

// Initialize the dashboard
document.addEventListener("DOMContentLoaded", () => {
    // ... (Existing Init Code)
    setCurrentDate();

    // Check authentication state
    auth.onAuthStateChanged((user) => {
        // Re-apply system config once auth state is known (to correctly identify admin)
        if(typeof applySystemConfig === "function") applySystemConfig();

        if (!user) {
            window.location.href = "login.html";
        } else {
            // Record this session
            recordLogin(user);

            // Listen to User Data
            db.collection("users").doc(user.uid).onSnapshot((doc) => {
                if(doc.exists) {
                    const userData = doc.data();
                    updateDashboard(userData);

                    // 2FA Login Shield
                    if(userData.twoFactorEnabled && !is2FAVerified) {
                        document.querySelector('.dashboard-container').style.opacity = "0.1";
                        document.querySelector('.dashboard-container').style.pointerEvents = "none";
                        open2FAModal(true);
                    }
                }
            });
            
            // Listen to Transactions
            listenToTransactions(user.uid);
        }
    });

  // Transfer User Verification Logic
  const recipientInput = document.getElementById("recipientInput");
  const feedbackBox = document.querySelector(".recipient-check");
  let verifiedRecipient = null;
  let searchTimeout = null;

  recipientInput.addEventListener("input", function() {
      clearTimeout(searchTimeout);
      const val = this.value.trim();
      verifiedRecipient = null;
      feedbackBox.className = "recipient-check";
      feedbackBox.textContent = "";
      
      if(val.length < 5) return;

      feedbackBox.textContent = "Searching user...";
      feedbackBox.classList.add("check-loading");

      searchTimeout = setTimeout(() => verifyUser(val), 800);
  });

  async function verifyUser(query) {
      try {
          // Check if searching self
          if(auth.currentUser.email === query) {
              throw new Error("You cannot send money to yourself.");
          }

          let userQuery;
          // Determine if email or account number
          if(query.includes("@")) {
              userQuery = db.collection("users").where("email", "==", query);
          } else {
              // Assume account number search
              userQuery = db.collection("users").where("accountNumber", "==", query); 
          }

          const snapshot = await userQuery.limit(1).get();
          
          if(snapshot.empty) {
              throw new Error("User not found.");
          }

          const userDoc = snapshot.docs[0];
          verifiedRecipient = { id: userDoc.id, ...userDoc.data() };
          
          feedbackBox.className = "recipient-check check-success";
          feedbackBox.innerHTML = `<i class="fas fa-check-circle"></i> Found: <b>${verifiedRecipient.firstName} ${verifiedRecipient.lastName}</b>`;

      } catch (e) {
          feedbackBox.className = "recipient-check check-error";
          feedbackBox.innerHTML = `<i class="fas fa-times-circle"></i> ${e.message}`;
          verifiedRecipient = null;
      }
  }

  // Transfer Logic Submit
  document.getElementById("transferForm").addEventListener("submit", async(e) => {
      e.preventDefault();
      
      const amount = parseFloat(document.getElementById("transferAmount").value);
      
      // Calculate Fee based on systemConfig
      const fee = Math.max(systemConfig.minTransferFee || 0, amount * ((systemConfig.transferFeePercent || 0) / 100));
      const totalDeduction = amount + fee;

      const executeTransfer = async () => {
          const note = document.getElementById("transferNote").value || "";
          const btn = document.getElementById("sendMoneyBtn");
          const originalText = btn.innerHTML;

          if(!verifiedRecipient) {
              alert("Please enter a valid recipient first.");
              return;
          }

          btn.disabled = true;
          btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processing...`;

          try {
              const senderId = auth.currentUser.uid;
              
              await db.runTransaction(async (transaction) => {
                  // Transaction logic...
                  const senderRef = db.collection("users").doc(senderId);
                  const senderDoc = await transaction.get(senderRef);
                  if(!senderDoc.exists) throw "Sender info missing";
                  
                  const senderBalance = senderDoc.data().balance || 0;
                  if(senderBalance < totalDeduction) {
                      throw `Insufficient funds. Total required: ${formatCurrency(totalDeduction)} (Inc. ${formatCurrency(fee)} fee)`;
                  }

                  const recipientRef = db.collection("users").doc(verifiedRecipient.id);
                  const recipientDoc = await transaction.get(recipientRef);
                  if(!recipientDoc.exists) throw "Recipient account invalid.";

                  const newSenderBalance = senderBalance - totalDeduction;
                  const newRecipientBalance = (recipientDoc.data().balance || 0) + amount;

                  transaction.update(senderRef, { balance: newSenderBalance });
                  transaction.update(recipientRef, { balance: newRecipientBalance });

                  const senderTxRef = db.collection("transactions").doc();
                  transaction.set(senderTxRef, {
                      id: senderTxRef.id, userId: senderId, amount: -totalDeduction,
                      type: 'transfer_out', description: `Transfer to ${verifiedRecipient.firstName} (Fee: ${formatCurrency(fee)})`,
                      note: note, relatedUser: { name: verifiedRecipient.firstName + " " + verifiedRecipient.lastName, id: verifiedRecipient.id },
                      status: 'completed', date: new Date().toISOString(), timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                      fee: fee, baseAmount: amount
                  });
                  
                  const recipientTxRef = db.collection("transactions").doc();
                  transaction.set(recipientTxRef, {
                      id: recipientTxRef.id, userId: verifiedRecipient.id, amount: amount,
                      type: 'transfer_in', description: `Received from ${senderDoc.data().firstName}`,
                      note: note, relatedUser: { name: senderDoc.data().firstName + " " + senderDoc.data().lastName, id: senderId },
                      status: 'completed', date: new Date().toISOString(), timestamp: firebase.firestore.FieldValue.serverTimestamp()
                  });
              });

              // Show Success Modal instead of Alert
              showSuccessModal(verifiedRecipient.firstName + " " + verifiedRecipient.lastName, amount);
              
              document.getElementById("transferForm").reset();
              document.querySelector(".recipient-check").innerHTML = "";
              verifiedRecipient = null;

          } catch (error) {
              console.error(error);
              alert("Transfer Failed: " + error);
          } finally {
              btn.disabled = false;
              btn.innerHTML = originalText;
          }
      };

      // Guard with PIN then 2FA
      const userSnap = await db.collection("users").doc(auth.currentUser.uid).get();
      const userData = userSnap.data();

      if(!userData.transactionPin) {
          alert("You must set up a Transaction PIN before you can send money.");
          openSetupPinModal();
          return;
      }

      pendingTransferTask = executeTransfer;
      openConfirmModal(verifiedRecipient.firstName + " " + verifiedRecipient.lastName, amount, fee);
  });

  // Add navigation functionality (SPA Routing)
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", function () {
      const targetId = this.getAttribute("data-target");
      if (!targetId) return;

      // Update Active Nav
      document
        .querySelectorAll(".nav-item")
        .forEach((i) => i.classList.remove("active"));
      this.classList.add("active");

      // Update Active View
      document.querySelectorAll(".view-section").forEach((view) => {
        view.classList.add("hidden");
      });
      document.getElementById(targetId).classList.remove("hidden");
    });
  });

  // Mobile Sidebar Toggle Logic
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.querySelector(".sidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");

  function toggleSidebar() {
      sidebar.classList.toggle("active");
      sidebarOverlay.classList.toggle("active");
  }

  function closeSidebar() {
      sidebar.classList.remove("active");
      sidebarOverlay.classList.remove("active");
  }

  if(menuToggle) {
      menuToggle.addEventListener("click", toggleSidebar);
  }

  if(sidebarOverlay) {
      sidebarOverlay.addEventListener("click", closeSidebar);
  }

  // Close sidebar when a nav item is clicked
  document.querySelectorAll(".nav-item").forEach(item => {
      item.addEventListener("click", () => {
          if(window.innerWidth <= 992) {
              closeSidebar();
          }
      });
  });
});

function showSuccessModal(recipient, amount) {
    document.getElementById('successRecipient').textContent = recipient;
    document.getElementById('successAmount').textContent = formatCurrency(amount);
    document.getElementById('successRef').textContent = '#' + Math.random().toString(36).substr(2, 9).toUpperCase();
    document.getElementById('successModal').classList.remove('hidden');
}

function closeSuccessAndGoHome() {
    document.getElementById('successModal').classList.add('hidden');
    document.querySelector('[data-target="view-dashboard"]').click();
}

// --- Live Support Chat Functions ---
let chatUnsubscribe = null;

function openSupportChat() {
    document.getElementById('supportChatModal').classList.remove('hidden');
    listenToChatMessages();
}

function closeSupportChat() {
    document.getElementById('supportChatModal').classList.add('hidden');
    if(chatUnsubscribe) chatUnsubscribe();
}

function listenToChatMessages() {
    const userId = auth.currentUser.uid;
    const chatBox = document.getElementById('chatMessages');

    chatUnsubscribe = db.collection("support_chats").doc(userId).onSnapshot(doc => {
        if(doc.exists) {
            const data = doc.data();
            const messages = data.messages || [];
            
            // Render basic messages
            chatBox.innerHTML = `
                <div class="chat-bubble bot">
                    Hello! I'm your Paybuntu support assistant. How can I help you today?
                </div>
                ${messages.map(msg => `
                    <div class="chat-bubble ${msg.sender === 'admin' ? 'admin' : 'user'}">
                        ${msg.text}
                    </div>
                `).join('')}
            `;
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    });
}

async function sendSupportMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if(!text) return;

    const userId = auth.currentUser.uid;
    input.value = "";

    try {
        const chatRef = db.collection("support_chats").doc(userId);
        const chatDoc = await chatRef.get();
        
        // Fetch user basic info for identification
        const userDoc = await db.collection("users").doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        const userName = userData.fullName || "User";

        const newMessage = {
            text: text,
            sender: 'user',
            timestamp: new Date().toISOString()
        };

        if(!chatDoc.exists) {
            await chatRef.set({
                userId: userId,
                userEmail: auth.currentUser.email,
                userName: userName, // Added for privacy-safe admin viewing
                messages: [newMessage],
                lastMessage: text,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                hasUnread: true
            });
        } else {
            await chatRef.update({
                messages: firebase.firestore.FieldValue.arrayUnion(newMessage),
                lastMessage: text,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                hasUnread: true,
                userName: userName // Ensure it's up to date
            });
        }
    } catch(err) {
        console.error("Chat Send Error:", err);
        alert("Failed to send message.");
    }
}

