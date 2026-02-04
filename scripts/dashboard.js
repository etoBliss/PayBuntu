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

  // Add navigation functionality
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", function () {
      document
        .querySelectorAll(".nav-item")
        .forEach((i) => i.classList.remove("active"));
      this.classList.add("active");
    });
  });
});
