// FrontEnd/scripts/main.js

//----Sign UP------------

document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signupForm");

  if (signupForm) {
    const nameInput = document.getElementById("signupName");
    const emailInput = document.getElementById("signupEmail");
    const passwordInput = document.getElementById("signupPassword");
    const confirmPasswordInput = document.getElementById("signupConfirmPassword");
    const roleSelect = document.getElementById("signupRole");
    const termsCheck = document.getElementById("signupTermsCheck");
    const messageBox = document.getElementById("signupMessage");

    signupForm.addEventListener("submit", async (event) => {
      event.preventDefault(); // stop normal form submit

      // Clear previous message
      messageBox.textContent = "";
      messageBox.style.color = "";

      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      const confirmPassword = confirmPasswordInput.value;
      const role = roleSelect.value;

      // Basic checks on frontend
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
        const response = await fetch("http://localhost:3000/api/auth/signup", {
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
          // Backend sent an error (e.g. email already registered)
          messageBox.textContent = data.error || "Signup failed.";
          messageBox.style.color = "red";
        } else {
          // Success
          messageBox.textContent = "Account created successfully! Redirecting to sign in...";
          messageBox.style.color = "green";

          // Redirect to login page after 1.5 seconds
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
});

// ---------------- LOGIN FORM HANDLING ----------------

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
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
        const response = await fetch("http://localhost:3000/api/auth/login", {
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

          // Save logged-in user (temporary solution)
          localStorage.setItem("tailorcart_user", JSON.stringify(data.user));

          // Redirect based on role
          setTimeout(() => {
            if (data.user.role === "tailor") {
              window.location.href = "tailor-dashboard.html"; // we will create later
            } else {
              window.location.href = "../pages/index.html";
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
});

// ---------------- TAILOR PROFILE PAGE ----------------

document.addEventListener("DOMContentLoaded", () => {
  const profileSection = document.getElementById("tailorProfile");

  if (profileSection) {
    // We are on tailor-profile.html
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
      // No id in URL
      const nameEl = document.getElementById("tpName");
      if (nameEl) nameEl.textContent = "Tailor not found";
      return;
    }

    loadTailorProfile(id);
  }
});

async function loadTailorProfile(id) {
  const nameEl = document.getElementById("tpName");
  const locEl = document.getElementById("tpLocation");
  const ratingEl = document.getElementById("tpRating");
  const badgesContainer = document.getElementById("tpSpecializationsBadges");
  const basePriceEl = document.getElementById("tpBasePrice");
  const aboutEl = document.getElementById("tpAbout");
  const imageEl = document.getElementById("tpImage");

  // Map tailor names to existing images
  const tailorImages = {
    "Rajesh Kumar": "../assets/images/tailor-rajesh-kumar.jpg",
    "Priya Sharma": "../assets/images/tailor-priya-sharma.jpg"
    // you can add Neha etc here later
  };

  try {
    const response = await fetch(`http://localhost:3000/api/tailors/${id}`);
    const tailor = await response.json();

    if (!response.ok) {
      if (nameEl) nameEl.textContent = "Tailor not found";
      return;
    }

    if (nameEl) nameEl.textContent = tailor.name;
    if (locEl) {
      const experienceText = `${tailor.experienceYears}+ years experience`;
      locEl.textContent = `📍 ${tailor.city}${tailor.area ? ", " + tailor.area : ""} · ${experienceText}`;
    }
    if (ratingEl) ratingEl.textContent = tailor.rating || "4.8";
    if (basePriceEl)
      basePriceEl.textContent = `From ₹${tailor.startingPrice} per garment`;
    if (aboutEl)
      aboutEl.textContent =
        tailor.about ||
        "This tailor has not added a detailed description yet.";

    if (imageEl) {
      imageEl.src =
        tailorImages[tailor.name] || "../assets/images/tailor-rajesh-kumar.jpg";
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
  } catch (error) {
    console.error("Error loading tailor profile:", error);
    if (nameEl) nameEl.textContent = "Error loading profile";
  }
}

// ---------------- FIND TAILORS PAGE ----------------

document.addEventListener("DOMContentLoaded", () => {
  const tailorListContainer = document.getElementById("tailorList");

  if (tailorListContainer) {
    loadTailors(tailorListContainer);
  }
});

async function loadTailors(container) {
  const countEl = document.getElementById("tailorCount");
  container.innerHTML = "<p>Loading tailors...</p>";

  // Map tailor names to image paths
  const tailorImages = {
    "Rajesh Kumar": "../assets/images/tailor-rajesh-kumar.jpg",
    "Priya Sharma": "../assets/images/tailor-priya-sharma.jpg",
    "Mohammed Ali": "../assets/images/tailor-mohammed-ali.jpg",
    "Neha Verma": "../assets/images/tailor-neha-verma.jpg"
  };

  try {
    const response = await fetch("http://localhost:3000/api/tailors");
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

      const imageSrc =
        tailorImages[tailor.name] || "../assets/images/tailor-rajesh-kumar.jpg";

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

// ---------------- JOIN AS TAILOR (CREATE TAILOR PROFILE) ----------------

document.addEventListener("DOMContentLoaded", () => {
  const joinTailorForm = document.getElementById("joinTailorForm");

  if (joinTailorForm) {
    const nameInput = document.getElementById("tailorName");
    const cityInput = document.getElementById("tailorCity");
    const areaInput = document.getElementById("tailorArea");
    const expInput = document.getElementById("tailorExperience");
    const priceInput = document.getElementById("tailorStartingPrice");
    const aboutInput = document.getElementById("tailorAbout");
    const extraSpecsInput = document.getElementById("tailorExtraSpecializations");
    const specsCheckboxes = document.querySelectorAll(".spec-checkbox");
    const messageBox = document.getElementById("joinTailorMessage");

    joinTailorForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      messageBox.textContent = "";
      messageBox.style.color = "";

      const name = nameInput.value.trim();
      const city = cityInput.value.trim();
      const area = areaInput.value.trim();
      const experienceYears = expInput.value;
      const startingPrice = priceInput.value;
      const about = aboutInput.value.trim();

      // Collect checked specializations
      const specializations = [];
      specsCheckboxes.forEach((cb) => {
        if (cb.checked) {
          specializations.push(cb.value);
        }
      });

      // Add extra specializations from text input
      if (extraSpecsInput && extraSpecsInput.value.trim().length > 0) {
        extraSpecsInput.value
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
          .forEach((s) => specializations.push(s));
      }

      try {
        const response = await fetch("http://localhost:3000/api/tailors", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name,
            city,
            area,
            experienceYears,
            startingPrice,
            specializations,
            about
          })
        });

        const data = await response.json();

        if (!response.ok) {
          messageBox.textContent = data.error || "Could not create tailor profile.";
          messageBox.style.color = "red";
        } else {
          messageBox.textContent =
            "Profile created successfully! Redirecting to Find Tailors...";
          messageBox.style.color = "green";

          // Clear form
          joinTailorForm.reset();

          // Redirect to Find Tailors after short delay
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
});
