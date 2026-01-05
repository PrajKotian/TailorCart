// FrontEnd/scripts/tailor-shop-edit.js
(() => {
  const API_BASE = window.API_BASE_URL || "http://localhost:5000";
  const SESSION_KEY = "tc_current_user_v1";

  const form = document.getElementById("shopEditForm");
  const msg = document.getElementById("shopEditMsg");

  const elShopName = document.getElementById("shopName");
  const elCity = document.getElementById("city");
  const elArea = document.getElementById("area");
  const elExp = document.getElementById("experienceYears");
  const elPrice = document.getElementById("startingPrice");
  const elGender = document.getElementById("gender");
  const elAbout = document.getElementById("about");
  const elOtherSpecs = document.getElementById("otherSpecializations");
  const specChecks = document.querySelectorAll(".specCheck");

  const elImage = document.getElementById("profileImage");
  const previewImg = document.getElementById("profilePreview");
  const previewHint = document.getElementById("previewHint");

  function setMsg(text, type = "info") {
    if (!msg) return;
    const cls =
      type === "success"
        ? "text-success"
        : type === "error"
        ? "text-danger"
        : "text-muted";
    msg.className = `small mb-3 ${cls}`;
    msg.textContent = text || "";
  }

  function safeParse(raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function getSession() {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? safeParse(raw) : null;
  }

  function requireTailorSession() {
    const s = getSession();
    const role = String(s?.activeRole || s?.role || "").toLowerCase();
    if (!s || role !== "tailor") {
      window.location.href = "login.html?role=tailor";
      return null;
    }
    return s;
  }

  function getSelectedSpecs() {
    return Array.from(specChecks)
      .filter((c) => c.checked)
      .map((c) => String(c.value || "").trim())
      .filter(Boolean);
  }

  function applySpecs(specs) {
    const set = new Set((specs || []).map((x) => String(x).toLowerCase().trim()));
    specChecks.forEach((c) => {
      const v = String(c.value || "").toLowerCase().trim();
      c.checked = set.has(v);
    });
  }

  function showExistingPreview(src) {
    if (!previewImg || !previewHint) return;
    if (!src) return;
    previewImg.src = src.startsWith("http") ? src : `${API_BASE}${src}`;
    previewImg.style.display = "block";
    previewHint.textContent = "Current profile image";
  }

  // Image preview on select
  elImage?.addEventListener("change", () => {
    const file = elImage.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    if (previewImg) {
      previewImg.src = url;
      previewImg.style.display = "block";
    }
    if (previewHint) previewHint.textContent = `Selected: ${file.name}`;
  });

  // Load tailor by userId mapping (same logic as your dashboard)
  async function findTailorByUserId(userId) {
    const res = await fetch(`${API_BASE}/api/tailors`);
    const list = await res.json().catch(() => []);
    if (!res.ok) throw new Error("Failed to load tailors list");

    const tailors = Array.isArray(list) ? list : [];
    return tailors.find((t) => String(t.userId) === String(userId)) || null;
  }

  async function loadForm(session) {
    setMsg("Loading your shop profile...");

    const tailor = await findTailorByUserId(session.id);
    if (!tailor) {
      setMsg(
        "Your tailor profile is not linked to this account yet (missing userId mapping). Please sign up again as tailor after latest fixes.",
        "error"
      );
      return null;
    }

    elShopName.value = tailor.shopName || tailor.name || "";
    elCity.value = tailor.city || "";
    elArea.value = tailor.area || "";
    elExp.value = tailor.experienceYears ?? "";
    elPrice.value = tailor.startingPrice ?? "";
    elGender.value = tailor.gender || "male";
    elAbout.value = tailor.about || "";

    applySpecs(tailor.specializations || []);
    showExistingPreview(tailor.profileImageUrl || "");

    setMsg("");
    return tailor;
  }

  async function save(tailorId) {
    const fd = new FormData();

    fd.append("shopName", elShopName.value.trim());
    fd.append("city", elCity.value.trim());
    fd.append("area", elArea.value.trim());
    fd.append("experienceYears", String(elExp.value || "").trim());
    fd.append("startingPrice", String(elPrice.value || "").trim());
    fd.append("gender", elGender.value);
    fd.append("about", elAbout.value.trim());

    const specs = getSelectedSpecs();
    fd.append("specializations", JSON.stringify(specs));

    const other = (elOtherSpecs.value || "").trim();
    fd.append("otherSpecializations", other);

    const file = elImage.files?.[0];
    if (file) fd.append("profileImage", file);

    const res = await fetch(`${API_BASE}/api/tailors/${tailorId}/shop`, {
      method: "PUT",
      body: fd,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to save shop profile.");

    return data;
  }

  // Init
  (async () => {
    const session = requireTailorSession();
    if (!session) return;

    const tailor = await loadForm(session);
    if (!tailor) return;

    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      try {
        setMsg("Saving changes...");
        const updated = await save(tailor.id);

        // Update preview if backend stored new file
        if (updated.profileImageUrl) showExistingPreview(updated.profileImageUrl);

        setMsg("✅ Saved successfully!", "success");
        setTimeout(() => {
          window.location.href = "tailor-dashboard.html";
        }, 600);
      } catch (err) {
        setMsg(`❌ ${err.message || "Save failed."}`, "error");
      }
    });
  })();
})();
