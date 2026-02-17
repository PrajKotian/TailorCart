// FrontEnd/scripts/tailor-reviews.js
(() => {
  "use strict";

  const API_BASE = (window.API_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
  const $ = (id) => document.getElementById(id);

  // ---------- helpers ----------
  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function safeJson(res) {
    try {
      return await res.json();
    } catch {
      return {};
    }
  }

  function normalizeRole(r) {
    return String(r || "").toLowerCase();
  }

  function getCurrentUser() {
    // ✅ Prefer AuthStore if present
    const u = window.AuthStore?.getCurrentUser?.();
    if (u?.id) {
      return {
        id: String(u.id),
        role: normalizeRole(u.activeRole || u.role),
        name: u.name || "User",
      };
    }

    // ✅ fallback local
    try {
      const raw = localStorage.getItem("tc_current_user_v1");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const uu = parsed?.user && typeof parsed.user === "object" ? parsed.user : parsed;
      if (!uu?.id) return null;
      return {
        id: String(uu.id),
        role: normalizeRole(uu.activeRole || uu.role),
        name: uu.name || "User",
      };
    } catch {
      return null;
    }
  }

  async function api(path, options = {}) {
    // ✅ Use AuthStore fetch if available (token headers, etc.)
    if (window.AuthStore?.authFetch) return window.AuthStore.authFetch(path, options);
    if (window.AuthStore?.apiFetch) return window.AuthStore.apiFetch(path, options);

    const res = await fetch(API_BASE + path, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data?.error || data?.message || "Request failed");
    return data;
  }

  function showNotice(kind, msg) {
    const box = $("trNotice");
    if (!box) return;
    box.style.display = "block";
    box.className = `alert alert-${kind} py-2 mb-3`;
    box.textContent = msg;
  }

  function clearNotice() {
    const box = $("trNotice");
    if (!box) return;
    box.style.display = "none";
    box.textContent = "";
    box.className = "";
  }

  function fmtDate(d) {
    try {
      const dt = new Date(d);
      if (Number.isNaN(dt.getTime())) return "—";
      return dt.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
    } catch {
      return "—";
    }
  }

  function stars(n) {
    const r = Math.max(0, Math.min(5, Number(n) || 0));
    return "★".repeat(r) + "☆".repeat(5 - r);
  }

  // ---------- API loaders (robust) ----------
  async function resolveTailorIdFromUser(userId) {
    // expected routes: /api/tailors/by-user/:userId
    const res = await api(`/api/tailors/by-user/${encodeURIComponent(userId)}`);

    // ✅ support multiple response shapes
    const t = res?.tailor || res?.data || res;
    const id = t?.id ?? t?._id ?? t?.tailorId;

    if (!id) {
      // helpful debug
      console.warn("[TailorReviews] by-user response:", res);
      throw new Error("Tailor profile not found for this account.");
    }
    return String(id);
  }

  async function loadSummary(tailorId) {
    const res = await api(`/api/reviews/tailor/${encodeURIComponent(tailorId)}/summary`);
    // ✅ allow {summary:{...}} or direct {avgRating,...}
    return res?.summary || res || { avgRating: 0, reviewsCount: 0 };
  }

  async function loadReviews(tailorId) {
    const res = await api(`/api/reviews/tailor/${encodeURIComponent(tailorId)}`);
    // ✅ allow array or {reviews:[...]}
    const list = Array.isArray(res) ? res : Array.isArray(res?.reviews) ? res.reviews : [];
    return list;
  }

  // ---------- render ----------
  function renderSummary(summary) {
    const avg = Number(summary?.avgRating || summary?.average || 0);
    const cnt = Number(summary?.reviewsCount || summary?.count || 0);

    $("trAvg") && ($("trAvg").textContent = avg ? avg.toFixed(1) : "0.0");
    $("trCount") && ($("trCount").textContent = String(cnt));
  }

  function renderReviews(list) {
    const wrap = $("trList");
    if (!wrap) return;

    if (!list.length) {
      wrap.innerHTML = `<p class="small text-muted mb-0">No reviews yet.</p>`;
      return;
    }

    wrap.innerHTML = list
      .map((r) => {
        const name = escapeHtml(r.customerName || r.customer?.name || "Customer");
        const text = escapeHtml(r.text || r.review || "");
        const when = fmtDate(r.createdAt || r.date);
        const rating = Number(r.rating || r.stars || 0);

        return `
          <div class="tc-review mb-3">
            <div class="d-flex justify-content-between align-items-start gap-2 flex-wrap">
              <div>
                <div class="fw-semibold">${name}</div>
                <div class="small">
                  <span class="tc-stars">${stars(rating)}</span>
                  <span class="text-muted">(${rating}/5)</span>
                </div>
              </div>
              <div class="small text-muted">${when}</div>
            </div>
            <div class="mt-2">${text}</div>
          </div>
        `;
      })
      .join("");
  }

  async function refreshAll(tailorId) {
    clearNotice();

    const wrap = $("trList");
    if (wrap) wrap.innerHTML = `<p class="small text-muted mb-0">Loading…</p>`;

    const summary = await loadSummary(tailorId);
    renderSummary(summary);

    const reviews = await loadReviews(tailorId);
    renderReviews(reviews);
  }

  // ---------- init ----------
  async function init() {
    // ✅ Hard guard: if authStore.js missing, you’ll know instantly
    if (!window.AuthStore) {
      console.warn("[TailorReviews] AuthStore missing. Include ../scripts/authStore.js before this script.");
    }

    const user = getCurrentUser();
    if (!user?.id) {
      showNotice("danger", "You are not logged in.");
      return;
    }

    try {
      const tailorId = await resolveTailorIdFromUser(user.id);
      await refreshAll(tailorId);

      $("trRefreshBtn")?.addEventListener("click", async () => {
        const btn = $("trRefreshBtn");
        try {
          btn && (btn.disabled = true);
          btn && (btn.textContent = "Refreshing...");
          await refreshAll(tailorId);
        } catch (e) {
          showNotice("danger", e?.message || "Failed to refresh reviews.");
        } finally {
          btn && (btn.disabled = false);
          btn && (btn.textContent = "Refresh");
        }
      });
    } catch (e) {
      showNotice("danger", e?.message || "Failed to load tailor reviews.");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
