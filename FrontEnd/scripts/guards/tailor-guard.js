(() => {
  const KEY = "tc_current_user_v1";

  function redirect() {
    window.location.href = new URL("login.html?role=tailor", window.location.href).href;
  }

  const raw = localStorage.getItem(KEY);
  if (!raw) return redirect();

  let s;
  try {
    s = JSON.parse(raw);
  } catch {
    return redirect();
  }

  const role = String(s.role || s.activeRole || "").toLowerCase();

  // Auto-heal: keep session consistent to avoid conflicts across files
  if (role) {
    const fixed = { ...s, role, activeRole: role };
    localStorage.setItem(KEY, JSON.stringify(fixed));
  }

  if (role !== "tailor") return redirect();
})();
