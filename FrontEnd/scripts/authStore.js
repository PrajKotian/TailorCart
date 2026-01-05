(() => {
  const KEY = "tc_current_user_v1";
  const API_BASE = "http://localhost:5000";

  function saveSession(user) {
    const role = String(user.role || user.activeRole || "").toLowerCase();
    const session = {
      ...user,
      role,
      activeRole: role,
      roles: [role],
    };
    localStorage.setItem(KEY, JSON.stringify(session));
    return session;
  }

  async function api(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  async function login({ email, password }) {
    const res = await api("/api/auth/login", { email, password });
    return saveSession(res.user);
  }

  async function signup({ name, email, password, role }) {
    const res = await api("/api/auth/signup", {
      name,
      email,
      password,
      role,
    });
    return saveSession(res.user);
  }

  function logout() {
    localStorage.removeItem(KEY);
    window.location.href = "login.html";
  }

  function getCurrentUser() {
    try {
      const raw = localStorage.getItem("tc_current_user_v1");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  window.AuthStore = {
    login,
    signup,
    logout,
    getCurrentUser,
  };
})();
