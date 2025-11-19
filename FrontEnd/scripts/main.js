// FrontEnd/scripts/main.js

//----Sign UP------------

document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signupForm");

  if (signupForm) {
    const nameInput = document.getElementById("signupName");
    const emailInput = document.getElementById("signupEmail");
    const passwordInput = document.getElementById("signupPassword");
    const confirmPasswordInput = document.getElementById("signupConfirmPassword");
    const roleSelect = document.getElementById("signupRole");
    const termsCheck = document.getElementById("signupTermsCheck");
    const messageBox = document.getElementById("signupMessage");

    signupForm.addEventListener("submit", async (event) => {
      event.preventDefault(); // stop normal form submit

      // Clear previous message
      messageBox.textContent = "";
      messageBox.style.color = "";

      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      const confirmPassword = confirmPasswordInput.value;
      const role = roleSelect.value;

      // Basic checks on frontend
      if (password !== confirmPassword) {
        messageBox.textContent = "Passwords do not match.";
        messageBox.style.color = "red";
        return;
      }

      if (!termsCheck.checked) {
        messageBox.textContent = "You must agree to the terms to continue.";
        messageBox.style.color = "red";
        return;
      }

      try {
        const response = await fetch("http://localhost:3000/api/auth/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name,
            email,
            password,
            role
          })
        });

        const data = await response.json();

        if (!response.ok) {
          // Backend sent an error (e.g. email already registered)
          messageBox.textContent = data.error || "Signup failed.";
          messageBox.style.color = "red";
        } else {
          // Success
          messageBox.textContent = "Account created successfully! Redirecting to sign in...";
          messageBox.style.color = "green";

          // Redirect to login page after 1.5 seconds
          setTimeout(() => {
            window.location.href = "login.html";
          }, 1500);
        }
      } catch (error) {
        console.error("Signup error:", error);
        messageBox.textContent = "Something went wrong. Please try again.";
        messageBox.style.color = "red";
      }
    });
  }
});

// ---------------- LOGIN FORM HANDLING ----------------

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");
    const messageBox = document.getElementById("loginMessage");

    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      messageBox.textContent = "";
      messageBox.style.color = "";

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      try {
        const response = await fetch("http://localhost:3000/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
          messageBox.textContent = data.error || "Login failed.";
          messageBox.style.color = "red";
        } else {
          messageBox.textContent = "Login successful! Redirecting...";
          messageBox.style.color = "green";

          // Save logged-in user (temporary solution)
          localStorage.setItem("tailorcart_user", JSON.stringify(data.user));

          // Redirect based on role
          setTimeout(() => {
            if (data.user.role === "tailor") {
              window.location.href = "tailor-dashboard.html"; // we will create later
            } else {
              window.location.href = "../pages/index.html";
            }
          }, 1500);
        }
      } catch (error) {
        console.error("Login error:", error);
        messageBox.textContent = "Something went wrong. Please try again.";
        messageBox.style.color = "red";
      }
    });
  }
});
