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
  "Neha Verma": "../assets/images/tailor-neha-verma.jpg"
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
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role
        })
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
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
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
          tailor.gender === "female" ? DEFAULT_FEMALE_IMAGE : DEFAULT_MALE_IMAGE;
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
            typeof svc.priceFrom === "number"
              ? `From ₹${svc.priceFrom}`
              : "";
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
//  FIND TAILORS / LIST PAGE
// ====================================================

function initTailorListPage() {
  const tailorListContainer = document.getElementById("tailorList");
  if (!tailorListContainer) return;

  loadTailors(tailorListContainer);
}

async function loadTailors(container) {
  const countEl = document.getElementById("tailorCount");
  container.innerHTML = "<p>Loading tailors...</p>";

  try {
    const response = await fetch(`${API_BASE_URL}/api/tailors`);
    const tailors = await response.json();

    if (!Array.isArray(tailors) || tailors.length === 0) {
      container.innerHTML = "<p>No tailors available yet.</p>";
      if (countEl) countEl.textContent = "0";
      return;
    }

    container.innerHTML = "";
    if (countEl) countEl.textContent = tailors.length.toString();

    tailors.forEach((tailor) => {
      const col = document.createElement("div");
      col.className = "col-md-6 col-lg-3";

      let imageSrc =
        tailor.profileImageUrl && tailor.profileImageUrl.trim() !== ""
          ? tailor.profileImageUrl.trim()
          : NAMED_TAILOR_IMAGES[tailor.name];

      if (!imageSrc) {
        imageSrc =
          tailor.gender === "female"
            ? DEFAULT_FEMALE_IMAGE
            : DEFAULT_MALE_IMAGE;
      }

      col.innerHTML = `
        <div class="card tailor-card h-100 border-0 shadow-sm">
          <img
            src="${imageSrc}"
            class="card-img-top"
            alt="${tailor.name}"
          >
          <div class="card-body">
            <h5 class="card-title mb-1">${tailor.name}</h5>
            <p class="text-muted small mb-2">
              📍 ${tailor.city}${tailor.area ? ", " + tailor.area : ""}
            </p>

            <div class="d-flex align-items-center mb-2">
              <span class="me-1">⭐</span>
              <span class="fw-semibold me-1">${tailor.rating || "4.8"}</span>
              <span class="text-muted small">(156)</span>
            </div>

            <p class="small text-muted mb-2">
              ${(tailor.specializations || []).join(" · ")}
            </p>
            <p class="small fw-semibold mb-3">From ₹${tailor.startingPrice}</p>

            <a href="tailor-profile.html?id=${tailor.id}" class="tailor-link">
              View Profile →
            </a>
          </div>
        </div>
      `;

      container.appendChild(col);
    });
  } catch (error) {
    console.error("Error loading tailors:", error);
    container.innerHTML =
      "<p>Failed to load tailors. Please try again later.</p>";
    if (countEl) countEl.textContent = "0";
  }
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
          description: desc
        });
      });
    }

    try {
      const formData = new FormData();

      formData.append("name", name);
      formData.append("email", email);      // currently ignored by backend
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
        body: formData
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
