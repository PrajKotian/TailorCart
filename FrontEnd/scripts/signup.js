// FrontEnd/scripts/signup.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signupForm");
  const msg = document.getElementById("signupMessage");

  if (!form || !msg) {
    console.error("❌ Signup form or message box not found");
    return;
  }

  function setMsg(text, type = "info") {
    const cls =
      type === "success"
        ? "text-success"
        : type === "error"
        ? "text-danger"
        : "text-muted";
    msg.className = `small mb-2 ${cls}`;
    msg.textContent = text;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // 🔒 HARD STOP browser refresh

    setMsg("");

    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const confirm = document.getElementById("signupConfirmPassword").value;
    const terms = document.getElementById("signupTermsCheck").checked;

    if (!name || !email || !password) {
      setMsg("All fields are required.", "error");
      return;
    }

    if (password !== confirm) {
      setMsg("Passwords do not match.", "error");
      return;
    }

    if (!terms) {
      setMsg("Please accept the terms.", "error");
      return;
    }

    try {
      setMsg("Creating your account...");

      await window.AuthStore.signup({
        name,
        email,
        password,
        role: "customer",
      });

      setMsg("✅ Account created! Redirecting...", "success");

      setTimeout(() => {
        window.location.href = "customer-dashboard.html";
      }, 400);
    } catch (err) {
      console.error(err);
      setMsg(err.message || "Signup failed", "error");
    }
  });
});
