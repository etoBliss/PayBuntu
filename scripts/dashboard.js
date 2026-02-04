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

// const userId = firebase.auth().currentUser.uid;

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
  if (userData.firstName && userData.lastName) {
    userAvatar.textContent =
      userData.firstName.charAt(0) + userData.lastName.charAt(0);
  }

  document.getElementById("welcomeMessage").textContent = `Welcome back, ${
    userData.firstName || "User"
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
        if (!user) {
            window.location.href = "login.html";
        } else {
            // Listen to User Data
            db.collection("users").doc(user.uid).onSnapshot((doc) => {
                if(doc.exists) updateDashboard(doc.data());
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
      const note = document.getElementById("transferNote").value || "";
      const btn = document.getElementById("sendMoneyBtn");
      const originalText = btn.innerHTML;

      if(!verifiedRecipient) {
          alert("Please enter a valid recipient first.");
          return;
      }
      
      // ... (Confirm Logic) ...

      btn.disabled = true;
      btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processing...`;

      try {
          const senderId = auth.currentUser.uid;
          
          await db.runTransaction(async (transaction) => {
              // 1. Get Sender Info
              const senderRef = db.collection("users").doc(senderId);
              const senderDoc = await transaction.get(senderRef);
              if(!senderDoc.exists) throw "Sender info missing";
              
              const senderBalance = senderDoc.data().balance || 0;
              if(senderBalance < amount) {
                  throw "Insufficient funds.";
              }

              // 2. Get Recipient Info
              const recipientRef = db.collection("users").doc(verifiedRecipient.id);
              const recipientDoc = await transaction.get(recipientRef);
              if(!recipientDoc.exists) throw "Recipient account invalid.";

              // 3. Perform transfer
              const newSenderBalance = senderBalance - amount;
              const newRecipientBalance = (recipientDoc.data().balance || 0) + amount;

              transaction.update(senderRef, { balance: newSenderBalance });
              transaction.update(recipientRef, { balance: newRecipientBalance });

              // 4. Create DUAL Transaction Records
              
              // Record for Sender (Debit)
              const senderTxRef = db.collection("transactions").doc();
              transaction.set(senderTxRef, {
                  id: senderTxRef.id,
                  userId: senderId,
                  amount: -amount,
                  type: 'transfer_out',
                  description: `Transfer to ${verifiedRecipient.firstName}`,
                  note: note,
                  relatedUser: { name: verifiedRecipient.firstName + " " + verifiedRecipient.lastName, id: verifiedRecipient.id },
                  status: 'completed',
                  date: new Date().toISOString(),
                  timestamp: firebase.firestore.FieldValue.serverTimestamp()
              });
              
              // Record for Recipient (Credit)
              const recipientTxRef = db.collection("transactions").doc();
              transaction.set(recipientTxRef, {
                  id: recipientTxRef.id,
                  userId: verifiedRecipient.id,
                  amount: amount,
                  type: 'transfer_in',
                  description: `Received from ${senderDoc.data().firstName}`,
                  note: note,
                  relatedUser: { name: senderDoc.data().firstName + " " + senderDoc.data().lastName, id: senderId },
                  status: 'completed',
                  date: new Date().toISOString(),
                  timestamp: firebase.firestore.FieldValue.serverTimestamp()
              });
          });

          alert("Transfer Successful!");
          document.getElementById("transferForm").reset();
          document.querySelector(".recipient-check").innerHTML = "";
          verifiedRecipient = null;
          document.querySelector('[data-target="view-dashboard"]').click();

      } catch (error) {
          console.error(error);
          alert("Transfer Failed: " + error);
      } finally {
          btn.disabled = false;
          btn.innerHTML = originalText;
      }
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
});
