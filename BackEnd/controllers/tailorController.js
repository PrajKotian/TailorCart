const store = require("../models/dataStore");

function parseJsonMaybe(value, fallback) {
  if (value == null) return fallback;
  if (Array.isArray(value)) return value;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return fallback;
    try {
      return JSON.parse(s);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

exports.getAllTailors = (req, res) => {
  res.json(store.tailors);
};

exports.getTailorById = (req, res) => {
  const id = Number(req.params.id);
  const t = store.tailors.find((t) => t.id === id);
  if (!t) return res.status(404).json({ error: "Tailor not found" });
  res.json(t);
};

// ✅ NEW: used by tailorDashboard.js
exports.getTailorByUserId = (req, res) => {
  const userId = String(req.params.userId);
  const t = store.tailors.find((t) => String(t.userId) === userId);
  if (!t) return res.status(404).json({ error: "Tailor not found" });
  res.json(t);
};

exports.createTailorProfile = (req, res) => {
  const id = store.nextIds.getNextTailorId();
  const body = req.body;

  // FormData sends strings → specializations/services are often JSON strings
  const specializations = parseJsonMaybe(body.specializations, []);
  const services = parseJsonMaybe(body.services, []);

  const tailor = {
    id,

    // ✅ CRITICAL: link auth user → tailor profile
    userId: body.userId != null ? String(body.userId) : null,

    name: body.name || "Tailor",
    email: body.email || "",
    city: body.city || "",
    area: body.area || "",

    experienceYears: Number(body.experienceYears) || 0,
    startingPrice: Number(body.startingPrice) || 0,
    gender: body.gender || "",

    rating: 4.5,
    specializations: Array.isArray(specializations) ? specializations : [],
    about: body.about || "",

    // ✅ store real services
    services: Array.isArray(services) ? services : [],

    profileImageUrl: req.file ? `/uploads/${req.file.filename}` : "",
  };

  store.tailors.push(tailor);
  res.status(201).json(tailor);
};

exports.updateTailorProfile = (req, res) => {
  const id = Number(req.params.id);
  const idx = store.tailors.findIndex((t) => t.id === id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });

  // Keep existing arrays unless overwritten; parse if JSON string comes in
  const next = { ...req.body };

  if (typeof next.specializations === "string") {
    const parsed = parseJsonMaybe(next.specializations, store.tailors[idx].specializations || []);
    next.specializations = Array.isArray(parsed) ? parsed : store.tailors[idx].specializations || [];
  }
  if (typeof next.services === "string") {
    const parsed = parseJsonMaybe(next.services, store.tailors[idx].services || []);
    next.services = Array.isArray(parsed) ? parsed : store.tailors[idx].services || [];
  }

  store.tailors[idx] = {
    ...store.tailors[idx],
    ...next,
    profileImageUrl: req.file ? `/uploads/${req.file.filename}` : store.tailors[idx].profileImageUrl,
  };

  res.json(store.tailors[idx]);
};

exports.deleteTailor = (req, res) => {
  const id = Number(req.params.id);
  store.tailors = store.tailors.filter((t) => t.id !== id);
  res.json({ ok: true });
};
