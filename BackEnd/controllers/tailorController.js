const Tailor = require("../models/Tailor");

// ==============================
// GET ALL TAILORS
// ==============================
exports.getAllTailors = async (req, res) => {
  try {
    const tailors = await Tailor.find().sort({ id: 1 }).lean();

    // ✅ normalize id for frontend consistency
    const normalized = tailors.map((t) => ({
      ...t,
      id: t.id ?? Number(t._id),
    }));

    return res.json(normalized);
  } catch (err) {
    console.error("getAllTailors error:", err);
    return res.status(500).json({ error: "Failed to load tailors" });
  }
};

// ==============================
// GET TAILOR BY ID
// ==============================
exports.getTailorById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const tailor = await Tailor.findOne({ id }).lean();
    if (!tailor) {
      return res.status(404).json({ error: "Tailor not found" });
    }

    return res.json({
      ...tailor,
      id: tailor.id ?? Number(tailor._id),
    });
  } catch (err) {
    console.error("getTailorById error:", err);
    return res.status(500).json({ error: "Failed to load tailor" });
  }
};

// ==============================
// GET TAILOR BY USER ID
// ==============================
exports.getTailorByUserId = async (req, res) => {
  try {
    const userId = String(req.params.userId);

    const tailor = await Tailor.findOne({ userId }).lean();
    if (!tailor) {
      return res.status(404).json({ error: "Tailor not found" });
    }

    return res.json({
      ...tailor,
      id: tailor.id ?? Number(tailor._id),
    });
  } catch (err) {
    console.error("getTailorByUserId error:", err);
    return res.status(500).json({ error: "Failed to load tailor" });
  }
};

// ==============================
// CREATE TAILOR PROFILE
// ==============================
exports.createTailorProfile = async (req, res) => {
  try {
    const body = req.body;

    const specializations =
      typeof body.specializations === "string"
        ? JSON.parse(body.specializations || "[]")
        : Array.isArray(body.specializations)
        ? body.specializations
        : [];

    const services =
      typeof body.services === "string"
        ? JSON.parse(body.services || "[]")
        : Array.isArray(body.services)
        ? body.services
        : [];

    const last = await Tailor.findOne().sort({ id: -1 }).select("id").lean();
    const nextId = (last?.id || 0) + 1;

    const created = await Tailor.create({
      id: nextId,
      userId: body.userId != null ? String(body.userId) : null,
      name: body.name || "Tailor",
      email: body.email || "",
      city: body.city || "",
      area: body.area || "",
      experienceYears: Number(body.experienceYears) || 0,
      startingPrice: Number(body.startingPrice) || 0,
      gender: body.gender || "",
      rating: Number(body.rating) || 4.5,
      specializations,
      about: body.about || "",
      services,
      profileImageUrl: req.file ? `/uploads/${req.file.filename}` : "",
    });

    return res.status(201).json({
      ...created.toObject(),
      id: created.id ?? Number(created._id),
    });
  } catch (err) {
    console.error("createTailorProfile error:", err);
    return res.status(500).json({ error: "Failed to create tailor" });
  }
};

// ==============================
// UPDATE TAILOR PROFILE
// ==============================
exports.updateTailorProfile = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await Tailor.findOne({ id });

    if (!existing) {
      return res.status(404).json({ error: "Tailor not found" });
    }

    const body = req.body;

    if (body.name != null) existing.name = body.name;
    if (body.email != null) existing.email = body.email;
    if (body.city != null) existing.city = body.city;
    if (body.area != null) existing.area = body.area;
    if (body.gender != null) existing.gender = body.gender;
    if (body.about != null) existing.about = body.about;

    if (body.experienceYears != null) {
      existing.experienceYears = Number(body.experienceYears) || 0;
    }

    if (body.startingPrice != null) {
      existing.startingPrice = Number(body.startingPrice) || 0;
    }

    if (body.specializations != null) {
      existing.specializations =
        typeof body.specializations === "string"
          ? JSON.parse(body.specializations || "[]")
          : Array.isArray(body.specializations)
          ? body.specializations
          : [];
    }

    if (body.services != null) {
      existing.services =
        typeof body.services === "string"
          ? JSON.parse(body.services || "[]")
          : Array.isArray(body.services)
          ? body.services
          : [];
    }

    if (req.file) {
      existing.profileImageUrl = `/uploads/${req.file.filename}`;
    }

    await existing.save();

    return res.json({
      ...existing.toObject(),
      id: existing.id ?? Number(existing._id),
    });
  } catch (err) {
    console.error("updateTailorProfile error:", err);
    return res.status(500).json({ error: "Failed to update tailor" });
  }
};

// ==============================
// DELETE TAILOR
// ==============================
exports.deleteTailor = async (req, res) => {
  try {
    const id = Number(req.params.id);
    await Tailor.deleteOne({ id });
    return res.json({ ok: true });
  } catch (err) {
    console.error("deleteTailor error:", err);
    return res.status(500).json({ error: "Failed to delete tailor" });
  }
};
