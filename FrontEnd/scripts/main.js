// FrontEnd/scripts/main.js
console.log("✅ main.js loaded");

// ---------- CONFIG ----------
// Default backend is port 3000 (your current server.js)
(function initApiBase() {
  const DEFAULT_LOCAL_API = "http://localhost:3000";

  // If you ever deploy later, you can set this in HTML:
  // <meta name="tc-api-base" content="https://your-backend-domain.com">
  const meta = document.querySelector('meta[name="tc-api-base"]');
  const metaUrl = meta?.getAttribute("content")?.trim();

  // If some page already set window.API_BASE_URL, respect it
  if (window.API_BASE_URL && typeof window.API_BASE_URL === "string") {
    window.API_BASE_URL = window.API_BASE_URL.replace(/\/$/, "");
    return;
  }

  // Prefer meta if present (deployment-friendly)
  if (metaUrl) {
    window.API_BASE_URL = metaUrl.replace(/\/$/, "");
    return;
  }

  // Local dev default
  window.API_BASE_URL = "https://tailorcart.onrender.com";
})();

console.log("🌐 API_BASE_URL =", window.API_BASE_URL);

// default images when tailor doesn't upload any
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

// ---------- UTILS ----------
async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

// Clean old key on every page load (prevents legacy sessions)
(function cleanupLegacySession() {
  const legacy = localStorage.getItem("tailorcart_user");
  if (legacy) {
    console.warn("🧹 Removing legacy session key tailorcart_user");
    localStorage.removeItem("tailorcart_user");
  }
})();

// ====================================================
// TAILOR PROFILE PAGE -> /api/tailors/:id
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
    const response = await fetch(`${window.API_BASE_URL}/api/tailors/${id}`);
    const tailor = await safeJson(response);

    if (!response.ok) {
      if (nameEl) nameEl.textContent = "Tailor not found";
      return;
    }

    // Attach tailorId to Request Order button
    const orderBtn = document.getElementById("tpRequestOrderBtn");
    if (orderBtn) orderBtn.href = `order-request.html?tailorId=${tailor.id}`;

    if (nameEl) nameEl.textContent = tailor.name || "Tailor";

    if (locEl) {
      const experienceText = `${tailor.experienceYears || 0}+ years experience`;
      locEl.textContent = `📍 ${tailor.city || ""}${tailor.area ? ", " + tailor.area : ""} · ${experienceText}`;
    }

    if (ratingEl) ratingEl.textContent = tailor.rating || "4.8";

    if (basePriceEl) {
      basePriceEl.textContent = tailor.startingPrice
        ? `From ₹${tailor.startingPrice} per garment`
        : "Price on request";
    }

    if (aboutEl) {
      aboutEl.textContent =
        tailor.about || "This tailor has not added a detailed description yet.";
    }

    if (imageEl) {
      let src = "";

      if (tailor.profileImageUrl && tailor.profileImageUrl.trim() !== "") {
        src = tailor.profileImageUrl.trim();
      } else if (NAMED_TAILOR_IMAGES?.[tailor.name]) {
        src = NAMED_TAILOR_IMAGES[tailor.name];
      } else {
        src =
          tailor.gender === "female" ? DEFAULT_FEMALE_IMAGE : DEFAULT_MALE_IMAGE;
      }

      imageEl.src = src;
      imageEl.alt = tailor.name || "Tailor";
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

    if (servicesContainer) {
      servicesContainer.innerHTML = "";
      const services = Array.isArray(tailor.services) ? tailor.services : [];

      if (!services.length) {
        servicesEmptyEl?.classList.remove("d-none");
      } else {
        servicesEmptyEl?.classList.add("d-none");

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
              ${metaLine ? `<p class="small text-muted mb-1">${metaLine}</p>` : ""}
              ${svc.description ? `<p class="small text-muted mb-0">${svc.description}</p>` : ""}
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
// FIND TAILORS PAGE (filters + pagination)
// ====================================================
function initTailorListPage() {
  const tailorListEl = document.getElementById("tailorList");
  if (!tailorListEl) return;

  const tailorCountEl = document.getElementById("tailorCount");
  const showingTextEl = document.getElementById("tailorShowingText");
  const paginationEl = document.getElementById("tailorPagination");

  const searchInput = document.getElementById("tailorSearchInput");
  const locationInput = document.getElementById("tailorLocationInput");
  const garmentFilter = document.getElementById("tailorGarmentFilter");
  const sortSelect = document.getElementById("tailorSortSelect");
  const applyFiltersBtn = document.getElementById("applyFiltersBtn");
  const resetFiltersBtn = document.getElementById("resetFiltersBtn");

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
    if (tailor.profileImageUrl && tailor.profileImageUrl.trim() !== "")
      return tailor.profileImageUrl.trim();
    if (NAMED_TAILOR_IMAGES[tailor.name]) return NAMED_TAILOR_IMAGES[tailor.name];
    if (tailor.gender === "female") return DEFAULT_FEMALE_IMAGE;
    return DEFAULT_MALE_IMAGE;
  }

  if (priceMaxInput && priceValueEl) {
    const updateLabel = () => {
      const val = Number(priceMaxInput.value || 0);
      if (!val || val >= 50000) priceValueEl.textContent = "Up to ₹50,000+";
      else priceValueEl.textContent = `Up to ₹${val.toLocaleString("en-IN")}`;
    };
    priceMaxInput.addEventListener("input", updateLabel);
    updateLabel();
  }

  async function fetchTailors() {
    try {
      const res = await fetch(`${window.API_BASE_URL}/api/tailors`);
      if (!res.ok) throw new Error("Failed to load tailors");
      const data = await safeJson(res);
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

    const q = (searchInput?.value || "").trim().toLowerCase();
    if (q) {
      result = result.filter((t) => {
        const inName = (t.name || "").toLowerCase().includes(q);
        const inSpecs = (t.specializations || []).some((spec) =>
          (spec || "").toLowerCase().includes(q)
        );
        return inName || inSpecs;
      });
    }

    const loc = (locationInput?.value || "").trim().toLowerCase();
    if (loc) {
      result = result.filter((t) => {
        const cityMatch = (t.city || "").toLowerCase().includes(loc);
        const areaMatch = (t.area || "").toLowerCase().includes(loc);
        return cityMatch || areaMatch;
      });
    }

    const garmentVal = garmentFilter?.value || "all";
    if (garmentVal && garmentVal !== "all") {
      const gLower = garmentVal.toLowerCase();
      result = result.filter((t) =>
        (t.specializations || []).some((spec) =>
          (spec || "").toLowerCase().includes(gLower)
        )
      );
    }

    if (priceMaxInput) {
      const maxPrice = Number(priceMaxInput.value);
      if (maxPrice && !Number.isNaN(maxPrice)) {
        result = result.filter(
          (t) => typeof t.startingPrice !== "number" || t.startingPrice <= maxPrice
        );
      }
    }

    if (ratingSelect) {
      const minRating = Number(ratingSelect.value);
      if (minRating && !Number.isNaN(minRating)) {
        result = result.filter((t) => (t.rating || 0) >= minRating);
      }
    }

    if (serviceCheckboxes && serviceCheckboxes.length) {
      const selected = Array.from(serviceCheckboxes)
        .filter((cb) => cb.checked)
        .map((cb) => cb.value.toLowerCase());

      if (selected.length) {
        result = result.filter((t) => {
          const specs = (t.specializations || []).join(" ").toLowerCase();
          return selected.some((svc) => specs.includes(svc));
        });
      }
    }

    const sortVal = sortSelect?.value || "rating";
    if (sortVal === "rating")
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sortVal === "priceLow")
      result.sort((a, b) => (a.startingPrice || 0) - (b.startingPrice || 0));
    else if (sortVal === "priceHigh")
      result.sort((a, b) => (b.startingPrice || 0) - (a.startingPrice || 0));

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
        const locationText = `${t.city || ""}${t.area ? ", " + t.area : ""}`;
        const specsText = (t.specializations || []).join(" · ");
        const rating = t.rating ? Number(t.rating).toFixed(1) : "4.5";
        const priceText = t.startingPrice ? `From ₹${t.startingPrice}` : "Price on request";

        col.innerHTML = `
          <div class="card tailor-card h-100 border-0 shadow-sm">
            <div class="tailor-card-img-wrapper">
              <img src="${imgSrc}" class="card-img-top" alt="${t.name || "Tailor"}">
            </div>
            <div class="card-body">
              <h5 class="card-title mb-1">${t.name || "Tailor"}</h5>
              <p class="text-muted small mb-2">📍 ${locationText}</p>

              <div class="d-flex align-items-center mb-2">
                <span class="me-1">⭐</span>
                <span class="fw-semibold me-1">${rating}</span>
                <span class="text-muted small">(reviews)</span>
              </div>

              <p class="small text-muted mb-2">${specsText}</p>
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
      if (total === 0) showingTextEl.textContent = "No tailors to show";
      else {
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
      li.className = `page-item${disabled ? " disabled" : ""}${active ? " active" : ""}`;

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
    for (let p = 1; p <= totalPages; p++) addPageItem(p, String(p), false, p === currentPage);
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
    if (serviceCheckboxes && serviceCheckboxes.length)
      serviceCheckboxes.forEach((cb) => (cb.checked = false));

    applyFilters(true);
  }

  applyFiltersBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    applyFilters(true);
  });

  resetFiltersBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    resetAllFilters();
  });

  applyFiltersSidebarBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    applyFilters(true);
  });

  resetFiltersSidebarBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    resetAllFilters();
  });

  searchInput?.addEventListener("keyup", (e) => {
    if (e.key === "Enter") applyFilters(true);
  });

  fetchTailors();
}

// ====================================================
// BOOTSTRAP (IMPORTANT: no auth handlers here)
// ====================================================
document.addEventListener("DOMContentLoaded", () => {
  initTailorProfilePage();
  initTailorListPage();
});
