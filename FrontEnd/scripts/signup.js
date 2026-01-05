(() => {
  const form = document.getElementById("signupForm");
  const msg = document.getElementById("signupMessage");

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

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMsg("");

    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const confirm = document.getElementById("signupConfirmPassword").value;

    if (password !== confirm) {
      setMsg("Passwords do not match.", "error");
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
      }, 500);
    } catch (err) {
      setMsg(`❌ ${err.message}`, "error");
    }
  });
})();
