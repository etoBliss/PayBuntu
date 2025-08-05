// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBjv9QcHnzt97VLnA2s5kbO6aXAggKawe4",
  authDomain: "paybuntu.firebaseapp.com",
  projectId: "paybuntu",
  storageBucket: "paybuntu.appspot.com",
  messagingSenderId: "614158103762",
  appId: "1:614158103762:web:b05592517738bf5b8e290b",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// Optimize Firestore connection
db.settings({
  merge: true,
});

let currentUser = null;

auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = user;
    try {
      const userDoc = await db.collection("users").doc(user.uid).get();

      if (!userDoc.exists) {
        await createUserDocument(user);
        return;
      }

      const userData = userDoc.data();
      updateUserUI(userData);
      loadTransactions();
    } catch (error) {
      console.error("Error loading user data:", error);
      showError("Error loading account information");
    }
  } else {
    window.location.href = "/login.html";
  }
});

async function createUserDocument(user) {
  try {
    const accountNumber =
      "PB-" + Math.floor(1000000000 + Math.random() * 9000000000);
    const nameParts = user.email.split("@")[0].split(".");
    const firstName =
      nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1);
    const lastName =
      nameParts.length > 1
        ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1)
        : "User";

    // Create user with ₦25,000 signup bonus
    await db.collection("users").doc(user.uid).set({
      firstName,
      lastName,
      email: user.email,
      accountNumber,
      balance: 25000,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    // Add signup bonus transaction
    await db.collection("transactions").add({
      userId: user.uid,
      type: "credit",
      amount: 25000,
      currency: "NGN",
      description: "Signup Bonus",
      status: "completed",
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    });

    // Update UI
    updateUserUI({
      firstName,
      lastName,
      accountNumber,
      balance: 25000,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    showError("Error setting up your account");
  }
}

function updateUserUI(userData) {
  document.querySelector(
    ".user-name"
  ).textContent = `${userData.firstName} ${userData.lastName}`;
  document.querySelector(
    ".user-account"
  ).textContent = `Account: ${userData.accountNumber}`;
  document.querySelector(
    ".balance-amount"
  ).textContent = `₦${userData.balance.toLocaleString("en-US")}`;
  document.querySelector(".user-avatar").textContent =
    userData.firstName.charAt(0) + userData.lastName.charAt(0);
}

async function loadTransactions() {
  try {
    const transactionsList = document.getElementById("transactionsList");
    transactionsList.innerHTML = "<p>Loading transactions...</p>";

    const querySnapshot = await db
      .collection("transactions")
      .where("userId", "==", currentUser.uid)
      .orderBy("timestamp", "desc")
      .limit(20)
      .get();

    transactionsList.innerHTML = "";

    if (querySnapshot.empty) {
      transactionsList.innerHTML = "<p>No transactions found</p>";
      return;
    }

    querySnapshot.forEach((doc) => {
      const tx = doc.data();
      const isCredit = tx.type === "credit";
      const symbol = tx.currency === "USD" ? "$" : "₦";
      const date = tx.timestamp.toDate().toLocaleDateString();

      const div = document.createElement("div");
      div.className = "transaction-item";
      div.innerHTML = `
        <div class="transaction-info">
          <div class="transaction-icon ${
            isCredit ? "icon-income" : "icon-expense"
          }">
            <i class="fas ${isCredit ? "fa-arrow-down" : "fa-arrow-up"}"></i>
          </div>
          <div class="transaction-details">
            <h3>${tx.description}</h3>
            <p>${date}</p>
            ${
              tx.recipient
                ? `<p>To: ${tx.recipient} (${tx.recipientAccount})</p>`
                : ""
            }
            ${
              tx.sender ? `<p>From: ${tx.sender} (${tx.senderAccount})</p>` : ""
            }
            <span class="status-badge status-${tx.status}">${tx.status}</span>
          </div>
        </div>
        <div class="transaction-amount ${
          isCredit ? "amount-income" : "amount-expense"
        }">
          ${isCredit ? "+" : "-"}${symbol}${tx.amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
      })}
        </div>`;
      transactionsList.appendChild(div);
    });
  } catch (error) {
    console.error("Error loading transactions:", error);
    showError("Error loading transactions");
  }
}

async function transferMoney() {
  const recipientAccount = document
    .getElementById("recipientAccount")
    .value.trim();
  const recipientName = document.getElementById("recipientName");
  const amount = parseFloat(document.getElementById("transferAmount").value);
  const note =
    document.getElementById("transferNote").value ||
    `Transfer to ${recipientAccount}`;

  // Validate inputs
  if (!recipientAccount || !recipientName.dataset.uid) {
    showError("Invalid recipient account");
    return;
  }

  if (!amount || amount <= 0) {
    showError("Please enter a valid amount");
    return;
  }

  if (recipientName.dataset.uid === currentUser.uid) {
    showError("You cannot transfer to yourself");
    return;
  }

  try {
    // Get sender data
    const senderDoc = await db.collection("users").doc(currentUser.uid).get();
    const senderData = senderDoc.data();

    if (senderData.balance < amount) {
      showError("Insufficient funds");
      return;
    }

    // Get recipient data
    const recipientDoc = await db
      .collection("users")
      .doc(recipientName.dataset.uid)
      .get();
    const recipientData = recipientDoc.data();

    // Create a batch operation
    const batch = db.batch();

    // Update sender balance
    const senderRef = db.collection("users").doc(currentUser.uid);
    batch.update(senderRef, {
      balance: senderData.balance - amount,
    });

    // Update recipient balance
    const recipientRef = db.collection("users").doc(recipientName.dataset.uid);
    batch.update(recipientRef, {
      balance: recipientData.balance + amount,
    });

    // Create sender transaction
    const senderTxRef = db.collection("transactions").doc();
    batch.set(senderTxRef, {
      userId: currentUser.uid,
      type: "debit",
      amount,
      currency: "NGN",
      description: note,
      recipient: `${recipientData.firstName} ${recipientData.lastName}`,
      recipientAccount: recipientData.accountNumber,
      status: "completed",
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    });

    // Create recipient transaction
    const recipientTxRef = db.collection("transactions").doc();
    batch.set(recipientTxRef, {
      userId: recipientName.dataset.uid,
      type: "credit",
      amount,
      currency: "NGN",
      description: `Payment from ${senderData.firstName} ${senderData.lastName}`,
      sender: `${senderData.firstName} ${senderData.lastName}`,
      senderAccount: senderData.accountNumber,
      status: "completed",
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    });

    // Commit the batch
    await batch.commit();

    // Update UI
    updateUserUI({
      ...senderData,
      balance: senderData.balance - amount,
    });

    // Clear form
    document.getElementById("recipientAccount").value = "";
    document.getElementById("transferAmount").value = "";
    document.getElementById("transferNote").value = "";
    recipientName.value = "";
    delete recipientName.dataset.uid;

    // Show success
    alert(
      `Successfully transferred ₦${amount.toLocaleString()} to ${
        recipientData.firstName
      }`
    );

    // Reload transactions
    loadTransactions();
  } catch (error) {
    console.error("Transfer error:", error);
    showError("Transfer failed. Please try again.");
  }
}

// function showError(message) {
//   const errorElement = document.getElementById("transactionError");
//   errorElement.textContent = message;
//   errorElement.style.display = "block";
//   setTimeout(() => {
//     errorElement.style.display = "none";
//   }, 5000);
// }

// Initialize the transaction page
document.addEventListener("DOMContentLoaded", () => {
  // Set up tabs
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", function () {
      document
        .querySelectorAll(".tab")
        .forEach((t) => t.classList.remove("active"));
      this.classList.add("active");

      const tabId = this.getAttribute("data-tab");
      document
        .querySelectorAll(".tab-content")
        .forEach((c) => c.classList.remove("active"));
      document.getElementById(`${tabId}Tab`).classList.add("active");

      if (tabId === "history") {
        loadTransactions();
      }
    });
  });

  // Account lookup
  document
    .getElementById("recipientAccount")
    .addEventListener("input", async function () {
      const accountNumber = this.value.trim();
      const recipientName = document.getElementById("recipientName");

      if (accountNumber.length < 10) {
        recipientName.value = "";
        return;
      }

      try {
        const querySnapshot = await db
          .collection("users")
          .where("accountNumber", "==", accountNumber)
          .limit(1)
          .get();

        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          recipientName.value = `${userData.firstName} ${userData.lastName}`;
          recipientName.dataset.uid = querySnapshot.docs[0].id;
        } else {
          recipientName.value = "Account not found";
          delete recipientName.dataset.uid;
        }
      } catch (error) {
        // console.error("Account lookup error:", error);
        // showError("Error finding recipient");
      }
    });

  // Transfer button
  document
    .getElementById("transferBtn")
    .addEventListener("click", transferMoney);
});
