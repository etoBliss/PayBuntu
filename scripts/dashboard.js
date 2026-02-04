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

// Fetch and display transactions
function fetchTransactions(userId) {
  const transactionsBody = document.getElementById("transactionsBody");

  // In a real app, you would fetch from Firestore
  // For now, we'll simulate some transactions
  const transactions = [
    {
        id: 1,
        type: 'income',
        description: 'Salary Deposit',
        from: 'Paybuntu Inc',
        amount: 250000,
        date: new Date().toISOString(),
        status: 'completed'
    },
    {
        id: 2,
        type: 'expense',
        description: 'Netflix Subscription',
        to: 'Netflix',
        amount: -4500,
        date: new Date(Date.now() - 86400000).toISOString(),
        status: 'completed'
    },
    {
        id: 3,
        type: 'transfer',
        description: 'Transfer to John',
        to: 'John Doe',
        amount: -15000,
        date: new Date(Date.now() - 172800000).toISOString(),
        status: 'pending'
    }
  ];

  // Clear existing rows
  transactionsBody.innerHTML = "";

  // Add transaction rows
  transactions.forEach((transaction) => {
    const row = document.createElement("tr");

    const typeIconClass = `type-${transaction.type}`;
    let typeIcon;
    
    switch(transaction.type) {
        case 'income': typeIcon = 'fa-arrow-down'; break;
        case 'expense': typeIcon = 'fa-shopping-cart'; break;
        case 'transfer': typeIcon = 'fa-exchange-alt'; break;
        default: typeIcon = 'fa-circle';
    }

    const amountClass = transaction.amount > 0 ? "income" : "expense";

    row.innerHTML = `
          <td>
            <div class="transaction-type">
              <div class="type-icon ${typeIconClass}">
                <i class="fas ${typeIcon}"></i>
              </div>
              <div>
                <div style="font-weight: 500;">${transaction.description}</div>
                <div class="text-muted">${
                  transaction.amount > 0 ? "From: " : "To: "
                }${
      transaction.amount > 0 ? transaction.from : transaction.to
    }</div>
              </div>
            </div>
          </td>
          <td>${formatDate(transaction.date)}</td>
          <td class="transaction-amount ${amountClass}">${formatCurrency(
      transaction.amount
    )}</td>
          <td><span class="transaction-status status-${transaction.status}">${
      transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)
    }</span></td>
        `;

    transactionsBody.appendChild(row);
  });
}

// Set current date
function setCurrentDate() {
  const now = new Date();
  const options = { year: "numeric", month: "long", day: "numeric" };
  document.getElementById("currentDate").textContent = now.toLocaleDateString(
    "en-US",
    options
  );
}

// Initialize the dashboard
document.addEventListener("DOMContentLoaded", () => {
  setCurrentDate();

  // Check authentication state
  auth.onAuthStateChanged((user) => {
    if (!user) {
      // Redirect to login if not authenticated
      window.location.href = "login.html";
    } else {
      // Fetch user data from Firestore
      db.collection("users")
        .doc(user.uid)
        .get()
        .then((doc) => {
          if (doc.exists) {
            const userData = doc.data();
            updateDashboard(userData);
            fetchTransactions(user.uid);
          } else {
            console.log("No user data found");
          }
        })
        .catch((error) => {
          console.error("Error getting user data:", error);
        });
    }
  });

  // Add logout functionality
  document.getElementById("logoutBtn").addEventListener("click", () => {
    auth
      .signOut()
      .then(() => {
        window.location.href = "login.html";
      })
      .catch((error) => {
        console.error("Logout error:", error);
      });
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

  // Transfer Logic
  const recipientInput = document.getElementById("recipientInput");
  const feedback = document.getElementById("recipient meaningful-feedback"); // Note: ID in HTML had space, fixing selector logic or just using class in valid implementation. Warning: HTML ID 'recipient meaningful-feedback' is invalid.
  // Let's fix the ID in JS selection logic assuming the user won't change HTML immediately or use a robust selector.
  // Actually, I should use the class or fix the HTML. I'll assume I can select by the unique check class relative to input
  const feedbackBox = document.querySelector(".recipient-check");
  
  let verifiedRecipient = null;

  // Debounce function for search
  let timeout = null;
  recipientInput.addEventListener("input", function() {
      clearTimeout(timeout);
      const val = this.value.trim();
      verifiedRecipient = null;
      feedbackBox.className = "recipient-check";
      feedbackBox.textContent = "";
      
      if(val.length < 5) return;

      feedbackBox.textContent = "Searching user...";
      feedbackBox.classList.add("check-loading");

      timeout = setTimeout(() => verifyUser(val), 800);
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
              // Assume account number search implies strict equality
              // Note: You might want to store accountNumbers as strings to avoid type issues
              userQuery = db.collection("users").where("accountNumber", "==", query); 
              // If account number is stored as array in 'metadata', this is different.
              // Assuming 'accountNumber' field on user doc as per signup.js logic
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

  // Handle Transfer Submit
  document.getElementById("transferForm").addEventListener("submit", async(e) => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById("transferAmount").value);
      const btn = document.getElementById("sendMoneyBtn");
      const originalText = btn.innerHTML;

      if(!verifiedRecipient) {
          alert("Please enter a valid recipient first.");
          return;
      }

      if(!confirm(`Are you sure you want to send NGN ${formatCurrency(amount)} to ${verifiedRecipient.firstName}?`)) {
          return;
      }

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

              // 2. Get Recipient Info (Re-verify inside transaction for security)
              const recipientRef = db.collection("users").doc(verifiedRecipient.id);
              const recipientDoc = await transaction.get(recipientRef);
              if(!recipientDoc.exists) throw "Recipient account invalid.";

              // 3. Perform transfer
              const newSenderBalance = senderBalance - amount;
              const newRecipientBalance = (recipientDoc.data().balance || 0) + amount;

              transaction.update(senderRef, { balance: newSenderBalance });
              transaction.update(recipientRef, { balance: newRecipientBalance });

              // 4. Create Transaction Record
              const txRef = db.collection("transactions").doc();
              transaction.set(txRef, {
                  id: txRef.id,
                  userId: senderId,
                  amount: -amount, // Negative for sender
                  type: 'transfer',
                  description: `Transfer to ${verifiedRecipient.firstName}`,
                  to: verifiedRecipient.firstName + " " + verifiedRecipient.lastName,
                  toId: verifiedRecipient.id,
                  status: 'completed',
                  date: new Date().toISOString(),
                  timestamp: firebase.firestore.FieldValue.serverTimestamp()
              });
              
              // Optional: Create record for recipient too so it shows in their history
              // For a simple app, we might just query where userId OR toId matches
          });

          alert("Transfer Successful!");
          document.getElementById("transferForm").reset();
          feedbackBox.textContent = "";
          verifiedRecipient = null;
          
          // Switch back to dashboard to see updated balance
          document.querySelector('[data-target="view-dashboard"]').click();

      } catch (error) {
          console.error(error);
          alert("Transfer Failed: " + error);
      } finally {
          btn.disabled = false;
          btn.innerHTML = originalText;
      }
  });

});
