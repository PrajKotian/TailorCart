/* FrontEnd/scripts/tailorAuth.js (CLEAN FIX for signup-tailor.html) */

(() => {
  const API_BASE = window.API_BASE_URL || "http://localhost:5000";

  const els = {
    joinForm: document.getElementById("joinTailorForm"),
    joinMsg: document.getElementById("joinTailorMessage"),
    servicesContainer: document.getElementById("servicesContainer"),
    addServiceBtn: document.getElementById("addServiceBtn"),

    loginForm: document.getElementById("tailorLoginForm"),
    loginMsg: document.getElementById("tailorLoginMessage"),
  };

  const SESSION_KEY = "tc_current_user_v1";

  function setMsg(el, msg, type = "info") {
    if (!el) return;
    const cls =
      type === "success"
        ? "text-success"
        : type === "error"
        ? "text-danger"
        : "text-muted";
    el.className = `small mb-2 ${cls}`;
    el.textContent = msg || "";
  }

  function safeTrim(v) {
    return (v ?? "").toString().trim();
  }

  async function apiFetch(url, options = {}) {
    const res = await fetch(url, options);
    const isJson = (res.headers.get("content-type") || "").includes("application/json");
    const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

    if (!res.ok) {
      const msg =
        (data && (data.error || data.message)) ||
        (typeof data === "string" && data) ||
        `Request failed (${res.status})`;
      throw new Error(msg);
    }
    return data;
  }

  function saveAuthSession(userObj) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(userObj));
    localStorage.removeItem("tailorcart_user");
    localStorage.removeItem("tc_tailor_session");
  }

  // ---------- Services UI ----------
  function addServiceRow(value = "") {
    if (!els.servicesContainer) return;

    const row = document.createElement("div");
    row.className = "d-flex gap-2 align-items-center mb-2";

    row.innerHTML = `
      <input type="text" class="form-control form-control-sm tc-service-input"
        placeholder="e.g. Saree Blouse Stitching"
        value="${String(value).replaceAll('"', "&quot;")}" />
      <button type="button" class="btn btn-outline-danger btn-sm">Remove</button>
    `;

    row.querySelector("button").addEventListener("click", () => row.remove());
    els.servicesContainer.appendChild(row);
  }

  function getServicesList() {
    const inputs = document.querySelectorAll(".tc-service-input");
    return Array.from(inputs)
      .map((i) => safeTrim(i.value))
      .filter(Boolean);
  }

  function servicesToObjects(serviceTitles, startingPrice) {
    const price = Number(startingPrice);
    const base = Number.isFinite(price) ? price : 0;

    // ✅ main.js uses svc.title, svc.priceFrom, svc.duration, svc.description
    return serviceTitles.map((title) => ({
      title,
      priceFrom: base || undefined,
      duration: "",
      description: "",
    }));
  }

  // ---------- Tailor Signup ----------
  async function handleTailorSignup(e) {
    e.preventDefault();
    setMsg(els.joinMsg, "");

    const name = safeTrim(document.getElementById("tailorName")?.value);
    const email = safeTrim(document.getElementById("tailorEmail")?.value);
    const password = document.getElementById("tailorPassword")?.value || "";
    const confirm = document.getElementById("tailorConfirmPassword")?.value || "";

    if (password.length < 6) return setMsg(els.joinMsg, "Password should be at least 6 characters.", "error");
    if (password !== confirm) return setMsg(els.joinMsg, "Passwords do not match.", "error");

    const city = safeTrim(document.getElementById("tailorCity")?.value);
    const area = safeTrim(document.getElementById("tailorArea")?.value);

    // ✅ FIX: backend needs experienceYears
    const experienceYears = safeTrim(document.getElementById("tailorExperience")?.value);

    const startingPrice = safeTrim(document.getElementById("tailorStartingPrice")?.value);
    const gender = safeTrim(document.getElementById("tailorGender")?.value);
    const about = safeTrim(document.getElementById("tailorAbout")?.value);

    const checkedSpecs = Array.from(document.querySelectorAll(".spec-checkbox:checked")).map((c) => c.value);

    const extraSpecs = safeTrim(document.getElementById("tailorExtraSpecializations")?.value);
    const extraList = extraSpecs ? extraSpecs.split(",").map((s) => safeTrim(s)).filter(Boolean) : [];

    const specializations = Array.from(new Set([...checkedSpecs, ...extraList]));

    const serviceTitles = getServicesList();
    const services = servicesToObjects(serviceTitles, startingPrice);

    const fileInput = document.getElementById("tailorProfileImage");
    const profileImageFile = fileInput?.files?.[0] || null;

    // 1) Create auth user
    setMsg(els.joinMsg, "Creating your tailor account...", "info");
    const signupResp = await apiFetch(`${API_BASE}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role: "tailor" }),
    });

    const createdUser = signupResp?.user || signupResp;
    if (!createdUser?.id) throw new Error("Signup succeeded but user id missing in response.");

    // 2) Create tailor profile
    setMsg(els.joinMsg, "Setting up your tailor profile...", "info");

    const fd = new FormData();
    fd.append("userId", String(createdUser.id));
    fd.append("name", name);
    fd.append("email", email);
    fd.append("city", city);
    fd.append("area", area);

    // ✅ CRITICAL FIX
    fd.append("experienceYears", experienceYears);

    fd.append("startingPrice", startingPrice);
    fd.append("gender", gender);
    fd.append("about", about);
    fd.append("specializations", JSON.stringify(specializations));
    fd.append("services", JSON.stringify(services));

    if (profileImageFile) fd.append("profileImage", profileImageFile);

    await apiFetch(`${API_BASE}/api/tailors`, { method: "POST", body: fd });

    saveAuthSession(createdUser);
    setMsg(els.joinMsg, "✅ Tailor account created successfully!", "success");

    setTimeout(() => {
      window.location.href = "tailor-dashboard.html";
    }, 600);
  }

  // ---------- Tailor Login ----------
  async function handleTailorLogin(e) {
    e.preventDefault();
    setMsg(els.loginMsg, "");

    const email = safeTrim(document.getElementById("loginEmail")?.value);
    const password = document.getElementById("loginPassword")?.value || "";

    try {
      setMsg(els.loginMsg, "Signing you in...", "info");

      const loginResp = await apiFetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const user = loginResp?.user || loginResp;

      if (!user || user.role !== "tailor") throw new Error("This account is not a tailor account.");

      saveAuthSession(user);

      setMsg(els.loginMsg, "✅ Logged in successfully!", "success");
      setTimeout(() => {
        window.location.href = "tailor-dashboard.html";
      }, 400);
    } catch (err) {
      setMsg(els.loginMsg, `❌ ${err.message}`, "error");
    }
  }

  // ---------- Init ----------
  if (els.servicesContainer) addServiceRow("");
  els.addServiceBtn?.addEventListener("click", () => addServiceRow(""));

  els.joinForm?.addEventListener("submit", (e) => {
    handleTailorSignup(e).catch((err) => setMsg(els.joinMsg, `❌ ${err.message}`, "error"));
  });

  els.loginForm?.addEventListener("submit", (e) => {
    handleTailorLogin(e).catch((err) => setMsg(els.loginMsg, `❌ ${err.message}`, "error"));
  });
})();
