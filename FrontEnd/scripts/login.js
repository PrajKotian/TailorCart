(() => {
  const CURRENT_USER_KEY = "tc_current_user_v1";

  const form = document.getElementById("loginForm");
  const msgEl = document.getElementById("loginMessage");

  function setMsg(text, type = "info") {
    if (!msgEl) return;
    const cls =
      type === "success"
        ? "text-success"
        : type === "error"
        ? "text-danger"
        : "text-muted";
    msgEl.className = `small mb-2 ${cls}`;
    msgEl.textContent = text || "";
  }

  function getSelectedRole() {
    const v =
      document.getElementById("activeRole")?.value ||
      window.TC_ACTIVE_ROLE ||
      "customer";
    return String(v).toLowerCase().trim() || "customer";
  }

  function normalizeRoles(user) {
    const one = String(user?.role || "").toLowerCase().trim();
    const many = Array.isArray(user?.roles)
      ? user.roles.map((r) => String(r).toLowerCase().trim()).filter(Boolean)
      : [];
    return Array.from(new Set([...(one ? [one] : []), ...many]));
  }

  function saveSessionWithActiveRole(user, activeRole) {
    const roles = normalizeRoles(user);
    const session = { ...user, roles, activeRole };
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(session));
    return session;
  }

  function redirectAfterLogin(activeRole) {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");

    // ✅ Highest priority: return to requested page (order-request etc.)
    if (redirect) {
      window.location.href = decodeURIComponent(redirect);
      return;
    }

    // ✅ Default dashboards by role
    if (activeRole === "tailor") {
      window.location.href = "tailor-dashboard.html";
    } else {
      window.location.href = "customer-dashboard.html";
    }
  }

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMsg("");

    const email = document.getElementById("loginEmail")?.value?.trim() || "";
    const password = document.getElementById("loginPassword")?.value || "";
    const selectedRole = getSelectedRole();

    if (!email || !password) {
      setMsg("Please enter email and password.", "error");
      return;
    }

    try {
      setMsg("Signing you in...", "info");

      const user = await window.AuthStore.login({ email, password });
      const roles = normalizeRoles(user);

      if (roles.length && !roles.includes(selectedRole)) {
        window.AuthStore.logout();
        setMsg(
          `This account is not registered as ${selectedRole}. Please register as ${selectedRole}.`,
          "error"
        );
        return;
      }

      saveSessionWithActiveRole(user, selectedRole);

      setMsg("✅ Logged in successfully!", "success");
      setTimeout(() => redirectAfterLogin(selectedRole), 200);
    } catch (err) {
      setMsg(`❌ ${err.message || "Login failed."}`, "error");
    }
  });
})();
