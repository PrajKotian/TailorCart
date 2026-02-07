// FrontEnd/scripts/authStore.js
// Central auth API wrapper used by signup.js + login.js

(function () {
  const CURRENT_USER_KEY = "tc_current_user_v1";

  function resolveApiBase() {
    // If main.js already set it, use it
    if (window.API_BASE_URL && typeof window.API_BASE_URL === "string") {
      return window.API_BASE_URL.replace(/\/$/, "");
    }

    // Optional future: allow setting from HTML
    // <meta name="tc-api-base" content="https://your-backend-domain.com">
    const meta = document.querySelector('meta[name="tc-api-base"]');
    const metaUrl = meta?.getAttribute("content")?.trim();
    if (metaUrl) return metaUrl.replace(/\/$/, "");

    // Default for your current setup (BackEnd/server.js running on 3000)
    return "http://localhost:3000";
  }

  const API_BASE = resolveApiBase();
  console.log("🔐 AuthStore API_BASE =", API_BASE);

  async function safeJson(res) {
    try {
      return await res.json();
    } catch {
      return {};
    }
  }

  function saveUser(user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || "null");
    } catch {
      return null;
    }
  }

  function clearUser() {
    localStorage.removeItem(CURRENT_USER_KEY);
  }

  async function signup(payload) {
    const res = await fetch(`${API_BASE}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await safeJson(res);

    if (!res.ok) {
      throw new Error(data?.error || "Signup failed");
    }

    // Backend returns: { message, user }
    if (data?.user) saveUser(data.user);
    return data.user || data;
  }

  async function login(payload) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await safeJson(res);

    if (!res.ok) {
      throw new Error(data?.error || "Login failed");
    }

    // Backend returns: { message, user }
    if (data?.user) saveUser(data.user);
    return data.user || data;
  }

  function logout() {
    clearUser();
  }

  window.AuthStore = {
    signup,
    login,
    logout,
    getCurrentUser: getUser,
    setCurrentUser: saveUser,
    clearCurrentUser: clearUser,
    API_BASE,
  };
})();
