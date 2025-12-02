// FrontEnd/scripts/main.js

// ---------- CONFIG ----------

const API_BASE_URL = "http://localhost:3000";

// default AI-style images when tailor doesn't upload any
const DEFAULT_MALE_IMAGE = "../assets/images/tailor-default-male.jpg";
const DEFAULT_FEMALE_IMAGE = "../assets/images/tailor-default-female.jpg";

// specific photos for seeded tailors (optional)
const NAMED_TAILOR_IMAGES = {
  "Rajesh Kumar": "../assets/images/tailor-rajesh-kumar.jpg",
  "Priya Sharma": "../assets/images/tailor-priya-sharma.jpg",
  "Mohammed Ali": "../assets/images/tailor-mohammed-ali.jpg",
  "Neha Verma": "../assets/images/tailor-neha-verma.jpg",
  "Manav Mehta": "../assets/images/tailor-manav-mehta.jpg",
  "Meera Tailor": "../assets/images/tailor-meera-tailor.jpg",
  "Ankit Singh": "../assets/images/tailor-ankit-singh.jpg",
  "Sonal Desai": "../assets/images/tailor-sonal-desai.jpg",
  "Vikram Jain": "../assets/images/tailor-vikram-jain.jpg",
  "Ayesha Khan": "../assets/images/tailor-ayesha-khan.jpg",
  "Ritu Malhotra": "../assets/images/tailor-ritu-malhotra.jpg",
  "Karthik Iyer": "../assets/images/tailor-karthik-iyer.jpg",
  "Pooja Patil": "../assets/images/tailor-pooja-patil.jpg",
  "Farhan Shaikh": "../assets/images/tailor-farhan-shaikh.jpg",
  "Shraddha Joshi": "../assets/images/tailor-shraddha- joshi.png",
  "Deepak Yadav": "../assets/images/tailor-deepak-yadav.jpeg",
  "Nazia Siddiqui": "../assets/images/tailor-nazia-siddiqui.jpeg",
  "Harsh Patel": "../assets/images/tailor-harsh-patel.jpg",
  "Simran Kaur": "../assets/images/tailor-simran-kaur.jpg",
  "Arjun Nair": "../assets/images/tailor-arjun-nair.jpg",
};



// small helper: logged-in user
function getCurrentUser() {
  const raw = localStorage.getItem("tailorcart_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ====================================================
//  SIGNUP (CUSTOMER) FORM
// ====================================================

function initSignupForm() {
  const signupForm = document.getElementById("signupForm");
  if (!signupForm) return;

  const nameInput = document.getElementById("signupName");
  const emailInput = document.getElementById("signupEmail");
  const passwordInput = document.getElementById("signupPassword");
  const confirmPasswordInput = document.getElementById("signupConfirmPassword");
  const roleSelect = document.getElementById("signupRole");
  const termsCheck = document.getElementById("signupTermsCheck");
  const messageBox = document.getElementById("signupMessage");

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    messageBox.textContent = "";
    messageBox.style.color = "";

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const role = roleSelect.value;

    if (password !== confirmPassword) {
      messageBox.textContent = "Passwords do not match.";
      messageBox.style.color = "red";
      return;
    }

    if (!termsCheck.checked) {
      messageBox.textContent = "You must agree to the terms to continue.";
      messageBox.style.color = "red";
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        messageBox.textContent = data.error || "Signup failed.";
        messageBox.style.color = "red";
      } else {
        messageBox.textContent =
          "Account created successfully! Redirecting to sign in...";
        messageBox.style.color = "green";

        setTimeout(() => {
          window.location.href = "login.html";
        }, 1500);
      }
    } catch (error) {
      console.error("Signup error:", error);
      messageBox.textContent = "Something went wrong. Please try again.";
      messageBox.style.color = "red";
    }
  });
}

// ====================================================
//  LOGIN FORM
// ====================================================

function initLoginForm() {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");
  const messageBox = document.getElementById("loginMessage");

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    messageBox.textContent = "";
    messageBox.style.color = "";

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        messageBox.textContent = data.error || "Login failed.";
        messageBox.style.color = "red";
      } else {
        messageBox.textContent = "Login successful! Redirecting...";
        messageBox.style.color = "green";

        localStorage.setItem("tailorcart_user", JSON.stringify(data.user));

        setTimeout(() => {
          if (data.user.role === "tailor") {
            window.location.href = "tailor-dashboard.html"; // later
          } else {
            window.location.href = "index.html";
          }
        }, 1500);
      }
    } catch (error) {
      console.error("Login error:", error);
      messageBox.textContent = "Something went wrong. Please try again.";
      messageBox.style.color = "red";
    }
  });
}

// ====================================================
//  TAILOR PROFILE PAGE
// ====================================================

function initTailorProfilePage() {
  const profileSection = document.getElementById("tailorProfile");
  if (!profileSection) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    const nameEl = document.getElementById("tpName");
    if (nameEl) nameEl.textContent = "Tailor not found";
    return;
  }

  loadTailorProfile(id);
}

async function loadTailorProfile(id) {
  const nameEl = document.getElementById("tpName");
  const locEl = document.getElementById("tpLocation");
  const ratingEl = document.getElementById("tpRating");
  const badgesContainer = document.getElementById("tpSpecializationsBadges");
  const basePriceEl = document.getElementById("tpBasePrice");
  const aboutEl = document.getElementById("tpAbout");
  const imageEl = document.getElementById("tpImage");
  const servicesContainer = document.getElementById("tpServices");
  const servicesEmptyEl = document.getElementById("tpServicesEmpty");

  try {
    const response = await fetch(`${API_BASE_URL}/api/tailors/${id}`);
    const tailor = await response.json();

    if (!response.ok) {
      if (nameEl) nameEl.textContent = "Tailor not found";
      return;
    }

    if (nameEl) nameEl.textContent = tailor.name;

    if (locEl) {
      const experienceText = `${tailor.experienceYears}+ years experience`;
      locEl.textContent = `📍 ${tailor.city}${
        tailor.area ? ", " + tailor.area : ""
      } · ${experienceText}`;
    }

    if (ratingEl) ratingEl.textContent = tailor.rating || "4.8";

    if (basePriceEl) {
      basePriceEl.textContent = `From ₹${tailor.startingPrice} per garment`;
    }

    if (aboutEl) {
      aboutEl.textContent =
        tailor.about || "This tailor has not added a detailed description yet.";
    }

    if (imageEl) {
      let src =
        tailor.profileImageUrl && tailor.profileImageUrl.trim() !== ""
          ? tailor.profileImageUrl.trim()
          : NAMED_TAILOR_IMAGES[tailor.name];

      if (!src) {
        src =
          tailor.gender === "female"
            ? DEFAULT_FEMALE_IMAGE
            : DEFAULT_MALE_IMAGE;
      }

      imageEl.src = src;
      imageEl.alt = tailor.name;
    }

    if (badgesContainer) {
      badgesContainer.innerHTML = "";
      (tailor.specializations || []).forEach((spec) => {
        const span = document.createElement("span");
        span.className = "badge bg-light text-dark me-1 mb-1";
        span.textContent = spec;
        badgesContainer.appendChild(span);
      });
    }

    // ----- Dynamic services -----
    if (servicesContainer) {
      servicesContainer.innerHTML = "";
      const services = Array.isArray(tailor.services) ? tailor.services : [];

      if (!services.length) {
        if (servicesEmptyEl) servicesEmptyEl.classList.remove("d-none");
      } else {
        if (servicesEmptyEl) servicesEmptyEl.classList.add("d-none");

        services.forEach((svc) => {
          const col = document.createElement("div");
          col.className = "col-sm-6";

          const priceText =
            typeof svc.priceFrom === "number" ? `From ₹${svc.priceFrom}` : "";
          const durationText = svc.duration ? ` · ${svc.duration}` : "";
          const metaLine =
            priceText || durationText ? `${priceText}${durationText}` : "";

          col.innerHTML = `
            <div class="border rounded-3 p-3 h-100">
              <h6 class="mb-1">${svc.title || "Service"}</h6>
              ${
                metaLine
                  ? `<p class="small text-muted mb-1">${metaLine}</p>`
                  : ""
              }
              ${
                svc.description
                  ? `<p class="small text-muted mb-0">${svc.description}</p>`
                  : ""
              }
            </div>
          `;

          servicesContainer.appendChild(col);
        });
      }
    }
  } catch (error) {
    console.error("Error loading tailor profile:", error);
    if (nameEl) nameEl.textContent = "Error loading profile";
  }
}

// ====================================================
//  FIND TAILORS / LIST PAGE (filters + pagination)
// ====================================================

function initTailorListPage() {
  const tailorListEl = document.getElementById("tailorList");
  if (!tailorListEl) return; // not on tailors.html

  const tailorCountEl = document.getElementById("tailorCount");
  const showingTextEl = document.getElementById("tailorShowingText");
  const paginationEl = document.getElementById("tailorPagination");

  // top-bar filters
  const searchInput = document.getElementById("tailorSearchInput");
  const locationInput = document.getElementById("tailorLocationInput");
  const garmentFilter = document.getElementById("tailorGarmentFilter");
  const sortSelect = document.getElementById("tailorSortSelect");
  const applyFiltersBtn = document.getElementById("applyFiltersBtn");
  const resetFiltersBtn = document.getElementById("resetFiltersBtn");

  // sidebar filters
  const priceMaxInput = document.getElementById("filterPriceMax");
  const priceValueEl = document.getElementById("filterPriceValue");
  const ratingSelect = document.getElementById("filterRating");
  const deliverySelect = document.getElementById("filterDelivery");
  const serviceCheckboxes = document.querySelectorAll(".filter-service-checkbox");
  const applyFiltersSidebarBtn = document.getElementById("applyFiltersSidebarBtn");
  const resetFiltersSidebarBtn = document.getElementById("resetFiltersSidebarBtn");

  const pageSize = 8;
  let allTailors = [];
  let filteredTailors = [];
  let currentPage = 1;

  function getImageForTailor(tailor) {
    if (tailor.profileImageUrl && tailor.profileImageUrl.trim() !== "") {
      return tailor.profileImageUrl.trim();
    }
    if (NAMED_TAILOR_IMAGES[tailor.name]) {
      return NAMED_TAILOR_IMAGES[tailor.name];
    }
    if (tailor.gender === "female") return DEFAULT_FEMALE_IMAGE;
    return DEFAULT_MALE_IMAGE;
  }

  // slider label
  if (priceMaxInput && priceValueEl) {
    const updateLabel = () => {
      const val = Number(priceMaxInput.value || 0);
      if (!val || val >= 50000) {
        priceValueEl.textContent = "Up to ₹50,000+";
      } else {
        priceValueEl.textContent = `Up to ₹${val.toLocaleString("en-IN")}`;
      }
    };
    priceMaxInput.addEventListener("input", updateLabel);
    updateLabel();
  }

  async function fetchTailors() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tailors`);
      if (!res.ok) throw new Error("Failed to load tailors");
      const data = await res.json();
      allTailors = Array.isArray(data) ? data : [];
      applyFilters(true);
    } catch (err) {
      console.error("Error loading tailors:", err);
      tailorListEl.innerHTML =
        '<div class="col-12"><p class="text-danger small mb-0">Could not load tailors. Please try again.</p></div>';
      if (tailorCountEl) tailorCountEl.textContent = "0";
    }
  }

  function applyFilters(resetPage = false) {
    let result = [...allTailors];

    // --- search by name / spec ---
    const q = (searchInput?.value || "").trim().toLowerCase();
    if (q) {
      result = result.filter((t) => {
        const inName = t.name.toLowerCase().includes(q);
        const inSpecs = (t.specializations || []).some((spec) =>
          spec.toLowerCase().includes(q)
        );
        return inName || inSpecs;
      });
    }

    // --- location (city or area) ---
    const loc = (locationInput?.value || "").trim().toLowerCase();
    if (loc) {
      result = result.filter((t) => {
        const cityMatch = t.city.toLowerCase().includes(loc);
        const areaMatch = (t.area || "").toLowerCase().includes(loc);
        return cityMatch || areaMatch;
      });
    }

    // --- garment type from dropdown (matches specializations text) ---
    const garmentVal = garmentFilter?.value || "all";
    if (garmentVal && garmentVal !== "all") {
      const gLower = garmentVal.toLowerCase();
      result = result.filter((t) =>
        (t.specializations || []).some((spec) =>
          spec.toLowerCase().includes(gLower)
        )
      );
    }

    // --- price max slider ---
    if (priceMaxInput) {
      const maxPrice = Number(priceMaxInput.value);
      if (maxPrice && !Number.isNaN(maxPrice)) {
        result = result.filter((t) => {
          if (typeof t.startingPrice !== "number") return true;
          return t.startingPrice <= maxPrice;
        });
      }
    }

    // --- minimum rating ---
    if (ratingSelect) {
      const minRating = Number(ratingSelect.value);
      if (minRating && !Number.isNaN(minRating)) {
        result = result.filter((t) => (t.rating || 0) >= minRating);
      }
    }

    // --- delivery time (optional field deliveryCategory: fast/normal/slow) ---
    if (deliverySelect) {
      const delVal = deliverySelect.value;
      if (delVal && delVal !== "any") {
        result = result.filter((t) => (t.deliveryCategory || "any") === delVal);
      }
    }

    // --- services checkboxes (match within specializations text) ---
    if (serviceCheckboxes && serviceCheckboxes.length) {
      const selectedServices = Array.from(serviceCheckboxes)
        .filter((cb) => cb.checked)
        .map((cb) => cb.value.toLowerCase());

      if (selectedServices.length) {
        result = result.filter((t) => {
          const specs = (t.specializations || []).join(" ").toLowerCase();
          return selectedServices.some((svc) => specs.includes(svc));
        });
      }
    }

    // --- sorting ---
    const sortVal = sortSelect?.value || "rating";
    if (sortVal === "rating") {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortVal === "priceLow") {
      result.sort((a, b) => (a.startingPrice || 0) - (b.startingPrice || 0));
    } else if (sortVal === "priceHigh") {
      result.sort((a, b) => (b.startingPrice || 0) - (a.startingPrice || 0));
    }

    filteredTailors = result;
    if (resetPage) currentPage = 1;
    render();
  }

  function render() {
    const total = filteredTailors.length;
    const startIndex = (currentPage - 1) * pageSize;
    const pageItems = filteredTailors.slice(startIndex, startIndex + pageSize);

    if (tailorCountEl) tailorCountEl.textContent = String(total);
    tailorListEl.innerHTML = "";

    if (!total) {
      tailorListEl.innerHTML =
        '<div class="col-12"><p class="text-muted small mb-0">No tailors found for selected filters.</p></div>';
    } else {
      pageItems.forEach((t) => {
        const col = document.createElement("div");
        col.className = "col-md-6 col-lg-3";

        const imgSrc = getImageForTailor(t);
        const locationText = `${t.city}${t.area ? ", " + t.area : ""}`;
        const specsText = (t.specializations || []).join(" · ");
        const rating = t.rating ? t.rating.toFixed(1) : "4.5";
        const priceText = t.startingPrice
          ? `From ₹${t.startingPrice}`
          : "Price on request";

        col.innerHTML = `
          <div class="card tailor-card h-100 border-0 shadow-sm">
            <div class="tailor-card-img-wrapper">
              <img
                src="${imgSrc}"
                class="card-img-top"
                alt="${t.name}"
              >
            </div>
            <div class="card-body">
              <h5 class="card-title mb-1">${t.name}</h5>
              <p class="text-muted small mb-2">
                📍 ${locationText}
              </p>

              <div class="d-flex align-items-center mb-2">
                <span class="me-1">⭐</span>
                <span class="fw-semibold me-1">${rating}</span>
                <span class="text-muted small">(reviews)</span>
              </div>

              <p class="small text-muted mb-2">
                ${specsText}
              </p>
              <p class="small fw-semibold mb-3">${priceText}</p>

              <a href="tailor-profile.html?id=${t.id}" class="tailor-link">
                View Profile →
              </a>
            </div>
          </div>
        `;

        tailorListEl.appendChild(col);
      });
    }

    renderPagination(total);

    if (showingTextEl) {
      if (total === 0) {
        showingTextEl.textContent = "No tailors to show";
      } else {
        const startNum = startIndex + 1;
        const endNum = Math.min(startIndex + pageSize, total);
        showingTextEl.textContent = `Showing ${startNum}–${endNum} of ${total} tailors`;
      }
    }
  }

  function renderPagination(total) {
    if (!paginationEl) return;
    paginationEl.innerHTML = "";

    const totalPages = Math.ceil(total / pageSize);
    if (totalPages <= 1) return;

    function addPageItem(page, label = page, disabled = false, active = false) {
      const li = document.createElement("li");
      li.className = `page-item${disabled ? " disabled" : ""}${
        active ? " active" : ""
      }`;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "page-link";
      btn.textContent = label;

      if (!disabled && !active) {
        btn.addEventListener("click", () => {
          currentPage = page;
          render();
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      }

      li.appendChild(btn);
      paginationEl.appendChild(li);
    }

    addPageItem(currentPage - 1, "«", currentPage === 1);

    for (let p = 1; p <= totalPages; p++) {
      addPageItem(p, String(p), false, p === currentPage);
    }

    addPageItem(currentPage + 1, "»", currentPage === totalPages);
  }

  function resetAllFilters() {
    if (searchInput) searchInput.value = "";
    if (locationInput) locationInput.value = "";
    if (garmentFilter) garmentFilter.value = "all";
    if (sortSelect) sortSelect.value = "rating";

    if (priceMaxInput) {
      priceMaxInput.value = priceMaxInput.max || "50000";
      priceMaxInput.dispatchEvent(new Event("input"));
    }
    if (ratingSelect) ratingSelect.value = "0";
    if (deliverySelect) deliverySelect.value = "any";
    if (serviceCheckboxes && serviceCheckboxes.length) {
      serviceCheckboxes.forEach((cb) => (cb.checked = false));
    }

    applyFilters(true);
  }

  // Buttons (top bar)
  applyFiltersBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    applyFilters(true);
  });
  resetFiltersBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    resetAllFilters();
  });

  // Buttons (sidebar)
  applyFiltersSidebarBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    applyFilters(true);
  });
  resetFiltersSidebarBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    resetAllFilters();
  });

  // Enter key on search
  searchInput?.addEventListener("keyup", (e) => {
    if (e.key === "Enter") {
      applyFilters(true);
    }
  });

  fetchTailors();
}


// ====================================================
//  JOIN AS TAILOR (DYNAMIC SERVICES + FILE UPLOAD)
// ====================================================

function initJoinTailorForm() {
  const joinTailorForm = document.getElementById("joinTailorForm");
  if (!joinTailorForm) return;

  const nameInput = document.getElementById("tailorName");
  const emailInput = document.getElementById("tailorEmail");
  const passwordInput = document.getElementById("tailorPassword");
  const confirmPasswordInput = document.getElementById("tailorConfirmPassword");

  const cityInput = document.getElementById("tailorCity");
  const areaInput = document.getElementById("tailorArea");
  const expInput = document.getElementById("tailorExperience");
  const priceInput = document.getElementById("tailorStartingPrice");
  const aboutInput = document.getElementById("tailorAbout");
  const extraSpecsInput = document.getElementById("tailorExtraSpecializations");
  const specsCheckboxes = document.querySelectorAll(".spec-checkbox");
  const messageBox = document.getElementById("joinTailorMessage");

  const profileImageInput = document.getElementById("tailorProfileImage");
  const genderSelect = document.getElementById("tailorGender");

  const servicesContainer = document.getElementById("servicesContainer");
  const addServiceBtn = document.getElementById("addServiceBtn");

  // helper: create service block
  function createServiceBlock(index) {
    if (!servicesContainer) return;

    const wrapper = document.createElement("div");
    wrapper.className = "border rounded-3 p-3 mb-3 service-item";

    wrapper.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-2">
        <span class="small fw-semibold">Service ${index + 1}</span>
        <button type="button" class="btn btn-sm btn-link text-danger p-0 remove-service-btn">
          Remove
        </button>
      </div>
      <div class="mb-2">
        <label class="form-label small">Title</label>
        <input
          type="text"
          class="form-control form-control-sm service-title"
          placeholder="e.g. Saree Blouse Stitching"
        />
      </div>
      <div class="row g-2">
        <div class="col-sm-6">
          <label class="form-label small">From Price (₹)</label>
          <input
            type="number"
            class="form-control form-control-sm service-price"
          />
        </div>
        <div class="col-sm-6">
          <label class="form-label small">Typical Duration</label>
          <input
            type="text"
            class="form-control form-control-sm service-duration"
            placeholder="e.g. 5–7 days"
          />
        </div>
      </div>
      <div class="mt-2">
        <label class="form-label small">Short Description</label>
        <textarea
          class="form-control form-control-sm service-desc"
          rows="2"
          placeholder="What do you offer in this service?"
        ></textarea>
      </div>
    `;

    const removeBtn = wrapper.querySelector(".remove-service-btn");
    removeBtn.addEventListener("click", () => {
      servicesContainer.removeChild(wrapper);
    });

    servicesContainer.appendChild(wrapper);
  }

  // start with 1 empty service by default
  if (servicesContainer) {
    createServiceBlock(0);
  }

  if (addServiceBtn) {
    addServiceBtn.addEventListener("click", () => {
      const currentCount =
        servicesContainer.querySelectorAll(".service-item").length;
      createServiceBlock(currentCount);
    });
  }

  joinTailorForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    messageBox.textContent = "";
    messageBox.style.color = "";

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (password !== confirmPassword) {
      messageBox.textContent = "Passwords do not match.";
      messageBox.style.color = "red";
      return;
    }

    const city = cityInput.value.trim();
    const area = areaInput.value.trim();
    const experienceYears = expInput.value;
    const startingPrice = priceInput.value;
    const about = aboutInput.value.trim();

    const gender = genderSelect ? genderSelect.value : "male";

    // collect specializations
    const specializations = [];
    specsCheckboxes.forEach((cb) => {
      if (cb.checked) {
        specializations.push(cb.value);
      }
    });

    if (extraSpecsInput && extraSpecsInput.value.trim().length > 0) {
      extraSpecsInput.value
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .forEach((s) => specializations.push(s));
    }

    // collect dynamic services
    const services = [];
    if (servicesContainer) {
      servicesContainer.querySelectorAll(".service-item").forEach((item) => {
        const title = item.querySelector(".service-title").value.trim();
        if (!title) return; // skip empty

        const priceVal = item.querySelector(".service-price").value;
        const duration = item.querySelector(".service-duration").value.trim();
        const desc = item.querySelector(".service-desc").value.trim();

        services.push({
          title,
          priceFrom: priceVal ? Number(priceVal) : null,
          duration,
          description: desc,
        });
      });
    }

    try {
      const formData = new FormData();

      formData.append("name", name);
      formData.append("email", email); // currently ignored by backend
      formData.append("password", password); // currently ignored by backend
      formData.append("city", city);
      formData.append("area", area);
      formData.append("experienceYears", experienceYears);
      formData.append("startingPrice", startingPrice);
      formData.append("about", about);
      formData.append("gender", gender);

      formData.append("specializations", JSON.stringify(specializations));
      formData.append("services", JSON.stringify(services));

      if (profileImageInput && profileImageInput.files[0]) {
        formData.append("profileImage", profileImageInput.files[0]);
      }

      const response = await fetch(`${API_BASE_URL}/api/tailors`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        messageBox.textContent =
          data.error || "Could not create tailor profile.";
        messageBox.style.color = "red";
      } else {
        messageBox.textContent =
          "Profile created successfully! Redirecting to Find Tailors...";
        messageBox.style.color = "green";

        joinTailorForm.reset();

        setTimeout(() => {
          window.location.href = "tailors.html";
        }, 1500);
      }
    } catch (error) {
      console.error("Join as tailor error:", error);
      messageBox.textContent = "Something went wrong. Please try again.";
      messageBox.style.color = "red";
    }
  });
}

// ====================================================
//  BOOTSTRAP ALL INIT FUNCTIONS
// ====================================================

document.addEventListener("DOMContentLoaded", () => {
  initSignupForm();
  initLoginForm();
  initTailorProfilePage();
  initTailorListPage();
  initJoinTailorForm();
});
// ---------------- ORDER REQUEST FLOW ----------------

document.addEventListener("DOMContentLoaded", () => {
  const step1 = document.getElementById("orderStep1");
  const step2 = document.getElementById("orderStep2");
  const step3 = document.getElementById("orderStep3");
  const successSection = document.getElementById("orderSuccess");
  const stepItems = document.querySelectorAll(".order-step-item");

  // Only run on order-request page
  if (!step1 || !step2 || !step3) return;

  let currentStep = 1;

  const orderState = {
    garmentType: "",
    fabric: "customer",
    measurement: "tailor",
  };

  function goToStep(step) {
    currentStep = step;
    [step1, step2, step3].forEach((s, idx) => {
      const visible = idx + 1 === step;
      s.classList.toggle("d-none", !visible);
    });

    stepItems.forEach((item) => {
      const stepNum = Number(item.dataset.step);
      item.classList.toggle("active", stepNum === step);
    });
  }

  // Make step indicators clickable (backwards only)
  stepItems.forEach((item) => {
    item.addEventListener("click", () => {
      const targetStep = Number(item.dataset.step);
      if (targetStep <= currentStep) {
        goToStep(targetStep);
      }
    });
  });

  // ---- STEP 1 ----
  const garmentSelect = document.getElementById("orderGarmentType");
  const designInput = document.getElementById("orderDesignImage");
  const designPreview = document.getElementById("orderDesignPreview");
  const useBasicToggle = document.getElementById("orderUseBasicDesign");
  const next1 = document.getElementById("orderNext1");

  // Optional: load tailor data based on ?tailorId=
  (async function loadTailorForOrder() {
    try {
      const params = new URLSearchParams(window.location.search);
      const tailorId = params.get("tailorId");
      if (!tailorId) return;

      const res = await fetch(`http://localhost:3000/api/tailors/${tailorId}`);
      if (!res.ok) return;
      const tailor = await res.json();

      // Populate garment types from tailor specializations if available
      if (
        garmentSelect &&
        Array.isArray(tailor.specializations) &&
        tailor.specializations.length
      ) {
        garmentSelect.innerHTML =
          '<option value="">Select garment type</option>';
        tailor.specializations.forEach((spec) => {
          const opt = document.createElement("option");
          opt.value = spec;
          opt.textContent = spec;
          garmentSelect.appendChild(opt);
        });
      }
    } catch (err) {
      console.warn("Could not load tailor data for order:", err);
    }
  })();

  if (designInput && designPreview) {
    designInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) {
        designPreview.classList.add("d-none");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        designPreview.querySelector("img").src = reader.result;
        designPreview.classList.remove("d-none");
      };
      reader.readAsDataURL(file);
    });
  }

  if (useBasicToggle && designInput) {
    useBasicToggle.addEventListener("change", () => {
      const disabled = useBasicToggle.checked;
      designInput.disabled = disabled;
      if (disabled) {
        designInput.value = "";
        if (designPreview) designPreview.classList.add("d-none");
      }
    });
  }

  if (next1) {
    next1.addEventListener("click", () => {
      if (!garmentSelect.value) {
        alert("Please select a garment type to continue.");
        garmentSelect.focus();
        return;
      }
      orderState.garmentType = garmentSelect.value;
      goToStep(2);
    });
  }

  // ---- STEP 2 ----
  const fabricRadios = document.querySelectorAll(
    "input[name='orderFabricOption']"
  );
  const fabricTailorInfo = document.getElementById("fabricTailorInfo");
  const measureOptions = document.querySelectorAll(".order-measure-option");
  const measureManual = document.getElementById("measureManual");
  const measurementWarning = document.getElementById("measurementWarning");

  const back2 = document.getElementById("orderBack2");
  const next2 = document.getElementById("orderNext2");

  fabricRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      if (radio.checked) {
        orderState.fabric = radio.value;
        const tailorSelected = radio.value === "tailor";
        if (fabricTailorInfo) {
          fabricTailorInfo.classList.toggle("d-none", !tailorSelected);
        }
      }
    });
  });

  function setMeasurementMode(mode) {
    orderState.measurement = mode;
    measureOptions.forEach((opt) => {
      opt.classList.toggle("active", opt.dataset.value === mode);
    });

    const isManual = mode === "manual";
    if (measureManual) measureManual.classList.toggle("d-none", !isManual);
    if (measurementWarning)
      measurementWarning.classList.toggle("d-none", isManual ? false : true);
  }

  measureOptions.forEach((opt) => {
    opt.addEventListener("click", () => {
      const mode = opt.dataset.value;
      setMeasurementMode(mode);
    });
  });

  // default
  setMeasurementMode("tailor");

  if (back2) {
    back2.addEventListener("click", () => goToStep(1));
  }

  if (next2) {
    next2.addEventListener("click", () => {
      // No heavy validation here for now; can be added later
      updateSummary();
      goToStep(3);
    });
  }

  // ---- STEP 3 & SUMMARY ----
  const summaryGarment = document.getElementById("summaryGarment");
  const summaryFabric = document.getElementById("summaryFabric");
  const summaryMeasurement = document.getElementById("summaryMeasurement");

  const summaryStitching = document.getElementById("summaryStitching");
  const summaryFabricCharge = document.getElementById("summaryFabricCharge");
  const summaryAddOns = document.getElementById("summaryAddOns");
  const summaryTotal = document.getElementById("summaryTotal");

  const back3 = document.getElementById("orderBack3");
  const submitBtn = document.getElementById("orderSubmit");

  function updateSummary() {
    if (summaryGarment)
      summaryGarment.textContent = orderState.garmentType || "—";

    if (summaryFabric) {
      summaryFabric.textContent =
        orderState.fabric === "tailor"
          ? "Tailor provides fabric"
          : "Customer will provide fabric";
    }

    if (summaryMeasurement) {
      let label = "Tailor will take measurements";
      if (orderState.measurement === "manual")
        label = "Customer-entered measurements";
      summaryMeasurement.textContent = label;
    }

    // Price texts (no fixed numbers)
    if (summaryStitching)
      summaryStitching.textContent = "To be quoted by tailor";
    if (summaryFabricCharge)
      summaryFabricCharge.textContent = "Depends on fabric choice";
    if (summaryAddOns) summaryAddOns.textContent = "If applicable";
    if (summaryTotal)
      summaryTotal.textContent = "Will be shared after tailor review";
  }

  if (back3) {
    back3.addEventListener("click", () => goToStep(2));
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", (e) => {
      e.preventDefault();

      // TODO: In future, send request to backend (POST /api/orders)
      // For now just show success screen
      const wrapper = document.getElementById("orderMultiStep");
      if (wrapper && successSection) {
        wrapper.classList.add("d-none");
        successSection.classList.remove("d-none");
      }
    });
  }
});
