// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBjv9QcHnzt97VLnA2s5kbO6aXAggKawe4",
  authDomain: "paybuntu.firebaseapp.com",
  projectId: "paybuntu",
  storageBucket: "paybuntu.appspot.com",
  messagingSenderId: "614158103762",
  appId: "1:614158103762:web:b05592517738bf5b8e290b",
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// Optimize Firestore connection
db.settings({
  merge: true,
});

// Google Auth Provider
const provider = new firebase.auth.GoogleAuthProvider();
provider.addScope("email");
provider.addScope("profile");

// DOM Elements
const signupForm = document.getElementById("signupForm");
const googleBtn = document.getElementById("googleBtn");

// Generate unique account number
async function generateAccountNumber() {
  const accountRef = db.collection("metadata").doc("accountNumbers");
  const accountNumber =
    "PB-" + Math.floor(1000000000 + Math.random() * 9000000000);

  try {
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(accountRef);
      const existingNumbers = doc.exists ? doc.data().numbers || [] : [];

      if (existingNumbers.includes(accountNumber)) {
        throw "Number exists, retrying";
      }

      transaction.set(
        accountRef,
        {
          numbers: firebase.firestore.FieldValue.arrayUnion(accountNumber),
        },
        { merge: true }
      );
    });

    return accountNumber;
  } catch (error) {
    console.log("Retrying account number generation...", error);
    return generateAccountNumber();
  }
}

// Save user data with initial balance and transaction
async function saveUserData(user, firstName, lastName, email) {
  const accountNumber = await generateAccountNumber();
  const batch = db.batch();

  // Create user document
  const userRef = db.collection("users").doc(user.uid);
  batch.set(userRef, {
    uid: user.uid,
    firstName: firstName,
    lastName: lastName,
    email: email,
    accountNumber: accountNumber,
    balance: 25000, // ₦25,000 signup bonus
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });

  // Create signup bonus transaction
  const txRef = db.collection("transactions").doc();
  batch.set(txRef, {
    id: txRef.id,
    userId: user.uid,
    type: "credit",
    amount: 25000,
    currency: "NGN",
    description: "Signup Bonus",
    status: "success",
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();
  return true;
}

// Email/Password Signup
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Get form values
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const confirmPassword = document
    .getElementById("confirmPassword")
    .value.trim();
  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const button = document.getElementById("signUp");

  // UI feedback
  button.innerHTML = "Signing Up...";
  button.disabled = true;

  try {
    // Validate inputs
    if (!email || !password || !firstName || !lastName) {
      throw new Error("Please fill all required fields");
    }

    if (password !== confirmPassword) {
      throw new Error("Passwords do not match");
    }

    if (!isPasswordStrong(password)) {
      throw new Error(
        "Password must contain uppercase, lowercase, number, and symbol"
      );
    }

    // Create user
    const userCredential = await auth.createUserWithEmailAndPassword(
      email,
      password
    );
    const user = userCredential.user;

    // Save user data and create initial transaction
    await saveUserData(user, firstName, lastName, email);

    // Send verification email
    await user.sendEmailVerification({
      url: window.location.origin + "/login.html",
    });

    alert("Account created! Please verify your email.");
    window.location.href = "./login.html";
  } catch (error) {
    console.error("Signup error:", error);
    alert(`Signup failed: ${error.message}`);
  } finally {
    button.innerHTML = "Sign Up";
    button.disabled = false;
  }
});

// Google Signup
googleBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  googleBtn.disabled = true;

  try {
    const result = await auth.signInWithPopup(provider);
    const user = result.user;
    const nameParts = user.displayName.split(" ");

    // Only save data for new users
    if (result.additionalUserInfo.isNewUser) {
      await saveUserData(
        user,
        nameParts[0] || "",
        nameParts.slice(1).join(" ") || "",
        user.email
      );
    }

    window.location.href = "./dashboard.html";
  } catch (error) {
    console.error("Google signup error:", error);
    alert(`Google signup failed: ${error.message}`);
  } finally {
    googleBtn.disabled = false;
  }
});

// Password strength checker
function isPasswordStrong(password) {
  const strongPattern =
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^\w ])\S{8,20}$/;
  return strongPattern.test(password);
}
