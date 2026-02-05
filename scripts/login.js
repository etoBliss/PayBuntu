// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBjv9QcHnzt97VLnA2s5kbO6aXAggKawe4",
  authDomain: "paybuntu.firebaseapp.com",
  projectId: "paybuntu",
  storageBucket: "paybuntu.firebasestorage.app",
  messagingSenderId: "614158103762",
  appId: "1:614158103762:web:b05592517738bf5b8e290b",
};

// Initialize Firebase only once
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Wait for DOM to load before accessing elements
document.addEventListener("DOMContentLoaded", async () => {
  // Global Maintenance Check (for already logged-in users)
  auth.onAuthStateChanged(async (user) => {
    if (user) {
        try {
            const configDoc = await db.collection("metadata").doc("config").get();
            const maintenanceMode = configDoc.exists ? configDoc.data().maintenanceMode : false;
            
            if (maintenanceMode && user.email.toLowerCase() !== "paybuntu@gmail.com") {
                console.log("Persistence: Maintenance active. Signing out.");
                await auth.signOut();
            } else {
                window.location.href = "dashboard.html";
            }
        } catch (e) {
            console.error("Maintenance check error:", e);
            window.location.href = "dashboard.html"; // Fallback
        }
    }
  });

  // Get elements using IDs that MATCH YOUR HTML
  const loginForm = document.getElementById("loginForm");
  const loginBtn = document.getElementById("loginBtn");
  const googleLoginBtn = document.getElementById("googleLoginBtn");
  const forgotPasswordLink = document.getElementById("forgotPassword");
  const visibilityToggle = document.getElementById("visibilityToggle");
  const passwordInput = document.getElementById("password");

  visibilityToggle.innerHTML =
    '<span class="material-symbols-outlined">visibility_off</span>';
  // 1. Password visibility toggle
  if (visibilityToggle && passwordInput) {
    visibilityToggle.addEventListener("click", () => {
      if (passwordInput.type === "password") {
        passwordInput.type = "text";
        visibilityToggle.innerHTML =
          '<span class="material-symbols-outlined">visibility</span>';
      } else {
        passwordInput.type = "password";
        visibilityToggle.innerHTML =
          '<span class="material-symbols-outlined">visibility_off</span>';
      }
    });
  }

  // 2. Email/password login
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = "Logging in...";
      }

      try {
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        if (!email || !password) {
          throw new Error("Please enter both email and password");
        }

        const userCredential = await auth.signInWithEmailAndPassword(
          email,
          password
        );
        const user = userCredential.user;

        if (!user.emailVerified) {
          await user.sendEmailVerification();
          throw new Error(
            "Please verify your email first. A new verification email has been sent."
          );
        }
        const configDoc = await firebase.firestore().collection("metadata").doc("config").get();
        const systemConfig = configDoc.exists ? configDoc.data() : { maintenanceMode: false };

        if (systemConfig.maintenanceMode && user.email.toLowerCase() !== "paybuntu@gmail.com") {
          await auth.signOut();
          throw new Error("System is under maintenance. Please try again later.");
        }

        window.location.href = "./dashboard.html";
      } catch (error) {
        console.error("Login error:", error);
        alert(`Login failed: ${error.message}`);
      } finally {
        if (loginBtn) {
          loginBtn.disabled = false;
          loginBtn.textContent = "Login";
        }
      }
    });
  }

  // 3. Google login
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      googleLoginBtn.disabled = true;

      try {
        await auth.signInWithPopup(googleProvider);
        const configDoc = await firebase.firestore().collection("metadata").doc("config").get();
        const systemConfig = configDoc.exists ? configDoc.data() : { maintenanceMode: false };

        if (systemConfig.maintenanceMode && auth.currentUser.email.toLowerCase() !== "paybuntu@gmail.com") {
          await auth.signOut();
          throw new Error("System is under maintenance. Please try again later.");
        }

        window.location.href = "./dashboard.html";
      } catch (error) {
        console.error("Google login error:", error);
        alert(`Google login failed: ${error.message}`);
      } finally {
        googleLoginBtn.disabled = false;
      }
    });
  }

  // 4. Forgot password
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value.trim();

      if (!email) {
        alert("Please enter your email address first");
        return;
      }

      try {
        await auth.sendPasswordResetEmail(email);
        alert("Password reset email sent! Please check your inbox.");
      } catch (error) {
        console.error("Password reset error:", error);
        alert(`Error: ${error.message}`);
      }
    });
  }
});
