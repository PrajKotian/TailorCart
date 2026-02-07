// FrontEnd/scripts/tailor-reviews.js
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  function showNotice(type, msg) {
    const box = $("trNotice");
    if (!box) return;
    box.style.display = "block";
    box.className = `alert alert-${type} py-2 mb-0`;
    box.textContent = msg;
  }

  function clearNotice() {
    const box = $("trNotice");
    if (!box) return;
    box.style.display = "none";
    box.textContent = "";
    box.className = "";
  }

  async function api(path, options = {}) {
    // Keep your existing auth integration if present
    if (window.AuthStore?.authFetch) return window.AuthStore.authFetch(path, options);
    if (window.AuthStore?.apiFetch) return window.AuthStore.apiFetch(path, options);

    const base = "http://localhost:5000";
    const res = await fetch(base + path, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || data?.message || "Request failed");
    return data;
  }

  // Some projects store user differently. We try AuthStore first, then localStorage.
  function getCurrentUser() {
    const u1 = window.AuthStore?.getCurrentUser?.();
    if (u1?.id) return u1;

    try {
      const raw = localStorage.getItem("tc_current_user_v1");
      if (!raw) return null;
      const u2 = JSON.parse(raw);
      if (u2?.id) return u2;
    } catch {
      // ignore
    }
    return null;
  }

  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function fmtDate(iso) {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "—";
      return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
    } catch {
      return "—";
    }
  }

  function stars(rating) {
    const r = Math.max(1, Math.min(5, Number(rating || 0)));
    // produces exactly 5 chars: filled + empty
    return "★★★★★☆☆☆☆☆".slice(5 - r, 10 - r);
  }

  async function resolveTailorIdFromUser(userId) {
    // Your backend commonly supports:
    // GET /api/tailors/by-user/:userId
    // If your endpoint differs, tell me and I will adjust.
    const t = await api(`/api/tailors/by-user/${encodeURIComponent(userId)}`);
    if (!t?.id) throw new Error("Tailor profile not found for this account.");
    return t.id;
  }

  async function loadSummary(tailorId) {
    const data = await api(`/api/reviews/tailor/${encodeURIComponent(tailorId)}/summary`);
    return data?.summary || { avgRating: 0, reviewsCount: 0 };
  }

  async function loadReviews(tailorId) {
    const list = await api(`/api/reviews/tailor/${encodeURIComponent(tailorId)}`);
    return Array.isArray(list) ? list : [];
  }

  function renderSummary(summary) {
    const avg = Number(summary?.avgRating || 0);
    const cnt = Number(summary?.reviewsCount || 0);

    if ($("trAvg")) $("trAvg").textContent = avg ? avg.toFixed(1) : "0.0";
    if ($("trCount")) $("trCount").textContent = String(cnt);
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
        const name = escapeHtml(r.customerName || "Customer");
        const text = escapeHtml(r.text || "");
        const when = fmtDate(r.createdAt);
        const rating = Number(r.rating || 0);

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
    if (wrap) wrap.innerHTML = `<p class="small text-muted mb-0">Loading...</p>`;

    const summary = await loadSummary(tailorId);
    renderSummary(summary);

    const reviews = await loadReviews(tailorId);
    renderReviews(reviews);
  }

  async function init() {
    const user = getCurrentUser();
    if (!user?.id) {
      showNotice("danger", "You are not logged in as a tailor.");
      return;
    }

    const tailorId = await resolveTailorIdFromUser(user.id);

    await refreshAll(tailorId);

    $("trRefreshBtn")?.addEventListener("click", async () => {
      try {
        $("trRefreshBtn").disabled = true;
        $("trRefreshBtn").textContent = "Refreshing...";
        await refreshAll(tailorId);
      } catch (e) {
        showNotice("danger", e?.message || "Failed to refresh reviews.");
      } finally {
        $("trRefreshBtn").disabled = false;
        $("trRefreshBtn").textContent = "Refresh";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    init().catch((e) => showNotice("danger", e?.message || "Failed to load reviews."));
  });
})();
