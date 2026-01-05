// FrontEnd/scripts/navbar-auth.js
(function () {
  "use strict";

  const CURRENT_USER_KEY = "tc_current_user_v1";

  function safeParse(raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function getSessionUser() {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;

    const s = safeParse(raw);
    if (!s || typeof s !== "object") return null;

    const activeRole = String(s.activeRole || s.role || "")
      .toLowerCase()
      .trim();

    return {
      ...s,
      activeRole,
      name: s.name || s.fullName || s.username || s.email || "User",
    };
  }

  function clearSession() {
    localStorage.removeItem(CURRENT_USER_KEY);
  }

  function show(el) {
    if (el) el.classList.remove("d-none");
  }

  function hide(el) {
    if (el) el.classList.add("d-none");
  }

  function getInitial(name) {
    return (name && name[0] ? name[0] : "U").toUpperCase();
  }

  function go(pageFile) {
    window.location.href = new URL(pageFile, window.location.href).href;
  }

  function goToLogin(role) {
    go(role ? `login.html?role=${role}` : "login.html");
  }

  function setDropdownLinkByText(root, containsText, href) {
    if (!root) return;
    const links = root.querySelectorAll("a.dropdown-item");
    links.forEach((a) => {
      const t = (a.textContent || "").toLowerCase();
      if (t.includes(containsText.toLowerCase())) a.setAttribute("href", href);
    });
  }

  function applyRoleBasedNavbar(user) {
    const navAuth = document.getElementById("navAuth");
    if (!navAuth) return;

    const role = (user?.activeRole || "").toLowerCase();
    const dd = navAuth.querySelector(".dropdown-menu");
    const rightBtn = navAuth.querySelector(".nav-neworder-btn");

    if (role === "tailor") {
      setDropdownLinkByText(dd, "my profile", "tailor-dashboard.html");
      setDropdownLinkByText(dd, "my orders", "tailor-orders.html");
      if (rightBtn) {
        rightBtn.textContent = "View Requests";
        rightBtn.setAttribute("href", "tailor-orders.html");
      }
    } else {
      setDropdownLinkByText(dd, "my profile", "profile.html");
      setDropdownLinkByText(dd, "my orders", "customer-dashboard.html");
      if (rightBtn) {
        rightBtn.textContent = "+ New Order";
        rightBtn.setAttribute("href", "tailors.html");
      }
    }
  }

  function applyNavbar() {
    const navGuest = document.getElementById("navGuest");
    const navAuth = document.getElementById("navAuth");

    const navUserName = document.getElementById("navUserName");
    const navUserAvatar = document.getElementById("navUserAvatar");
    const navUserNameMenu = document.getElementById("navUserNameMenu");
    const navLogoutBtn = document.getElementById("navLogoutBtn");

    if (!navGuest || !navAuth) return;

    const user = getSessionUser();

    if (!user) {
      hide(navAuth);
      show(navGuest);
      return;
    }

    hide(navGuest);
    show(navAuth);

    if (navUserName) navUserName.textContent = user.name;
    if (navUserNameMenu) navUserNameMenu.textContent = user.name;
    if (navUserAvatar) navUserAvatar.textContent = getInitial(user.name);

    applyRoleBasedNavbar(user);

    if (navLogoutBtn) {
      navLogoutBtn.onclick = function () {
        const role = user?.activeRole || "";
        clearSession();
        goToLogin(role);
      };
    }
  }

  document.addEventListener("DOMContentLoaded", applyNavbar);
})();
