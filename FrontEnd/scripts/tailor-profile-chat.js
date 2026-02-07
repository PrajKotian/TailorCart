// FrontEnd/scripts/tailor-profile-chat.js
(() => {
  "use strict";

  function normalizeRole(r) {
    return String(r || "").toLowerCase();
  }

  function getCurrentUser() {
    // Prefer AuthStore
    const u = window.AuthStore?.getCurrentUser?.();
    if (u?.id) {
      return {
        id: u.id,
        role: normalizeRole(u.activeRole || u.role || "customer"),
        name: u.name || "User",
      };
    }

    // Fallback localStorage
    try {
      const raw = localStorage.getItem("tc_current_user_v1");
      if (!raw) return null;
      const s = JSON.parse(raw);
      const uu = s?.user && typeof s.user === "object" ? s.user : s;

      return {
        id: uu?.id ?? s?.id ?? null,
        role: normalizeRole(uu?.activeRole ?? uu?.role ?? s?.activeRole ?? s?.role),
        name: uu?.name ?? s?.name ?? "User",
      };
    } catch {
      return null;
    }
  }

  function getTailorIdFromUrl() {
    const u = new URL(window.location.href);
    const id = u.searchParams.get("id") || u.searchParams.get("tailorId") || "";
    const n = Number(id);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function redirectToLoginWithReturn() {
    const here = window.location.pathname.split("/").pop() || "tailor-profile.html";
    const qs = window.location.search || "";
    const returnTo = `${here}${qs}`;
    window.location.href = `login.html?redirect=${encodeURIComponent(returnTo)}`;
  }

  function bindInquiryChatButton() {
    const btn = document.getElementById("tpChatBtn");
    const hint = document.getElementById("tpChatHint");
    if (!btn) return;

    const tailorId = getTailorIdFromUrl();
    const user = getCurrentUser();

    // Hint UI (optional)
    if (hint) {
      hint.textContent = "Chat opens in Inbox (Instagram style).";
    }

    btn.addEventListener("click", () => {
      const latestUser = getCurrentUser();

      if (!latestUser?.id) {
        alert("Please login first to chat.");
        redirectToLoginWithReturn();
        return;
      }

      if (normalizeRole(latestUser.role) !== "customer") {
        alert("Only customers can start chat from this page.");
        return;
      }

      if (!tailorId) {
        alert("Tailor id missing in URL. Open profile via tailors list (with ?id= or ?tailorId=).");
        return;
      }

      // ✅ New flow: open Instagram-like Inbox and auto-select tailor
      window.location.href = `inbox.html?tailorId=${encodeURIComponent(tailorId)}`;
    });
  }

  document.addEventListener("DOMContentLoaded", bindInquiryChatButton);
})();
