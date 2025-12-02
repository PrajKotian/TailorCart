// BackEnd/controllers/tailorController.js

const { tailors, nextIds } = require("../models/dataStore");

/**
 * GET /api/tailors
 * Optional query params:
 *  - city        (exact match, case-insensitive)
 *  - q           (free text: name, city, area, specializations)
 *  - spec        (match specialization text, e.g. "Lehenga")
 *  - minPrice    (numeric)
 *  - maxPrice    (numeric)
 */
const getAllTailors = (req, res) => {
  const { city, q, spec, minPrice, maxPrice } = req.query;

  let result = [...tailors];

  // Filter by city (if provided)
  if (city && city.trim() !== "") {
    const cityLower = city.trim().toLowerCase();
    result = result.filter(
      (t) => t.city && t.city.toLowerCase() === cityLower
    );
  }

  // Filter by specialization text (if provided)
  if (spec && spec.trim() !== "") {
    const specLower = spec.trim().toLowerCase();
    result = result.filter(
      (t) =>
        Array.isArray(t.specializations) &&
        t.specializations.some((s) =>
          s.toLowerCase().includes(specLower)
        )
    );
  }

  // Free text search (name, city, area, specializations)
  if (q && q.trim() !== "") {
    const qLower = q.trim().toLowerCase();
    result = result.filter((t) => {
      const inName = t.name && t.name.toLowerCase().includes(qLower);
      const inCity = t.city && t.city.toLowerCase().includes(qLower);
      const inArea =
        t.area && t.area.toLowerCase().includes(qLower);
      const inSpecs =
        Array.isArray(t.specializations) &&
        t.specializations.some((s) =>
          s.toLowerCase().includes(qLower)
        );

      return inName || inCity || inArea || inSpecs;
    });
  }

  // Price range
  if (minPrice) {
    const min = Number(minPrice);
    if (!Number.isNaN(min)) {
      result = result.filter(
        (t) => Number(t.startingPrice) >= min
      );
    }
  }

  if (maxPrice) {
    const max = Number(maxPrice);
    if (!Number.isNaN(max)) {
      result = result.filter(
        (t) => Number(t.startingPrice) <= max
      );
    }
  }

  res.json(result);
};

// GET /api/tailors/:id  → single tailor
const getTailorById = (req, res) => {
  const id = parseInt(req.params.id, 10);
  const tailor = tailors.find((t) => t.id === id);

  if (!tailor) {
    return res.status(404).json({ error: "Tailor not found" });
  }

  res.json(tailor);
};

// POST /api/tailors  → create tailor profile (from Join as Tailor form)
const createTailorProfile = (req, res) => {
  const {
    userId,          // optional for now, later link to Users
    name,
    city,
    area,
    experienceYears,
    startingPrice,
    specializations, // array or JSON string
    about,
    gender,          // "male" / "female" (optional)
    services         // array or JSON string
  } = req.body;

  if (!name || !city || !experienceYears || !startingPrice) {
    return res
      .status(400)
      .json({ error: "name, city, experienceYears, startingPrice are required" });
  }

  // If specializations/services come as JSON string (common with FormData)
  let parsedSpecs = [];
  if (typeof specializations === "string") {
    try {
      parsedSpecs = JSON.parse(specializations);
    } catch {
      parsedSpecs = [];
    }
  } else if (Array.isArray(specializations)) {
    parsedSpecs = specializations;
  }

  let parsedServices = [];
  if (typeof services === "string") {
    try {
      parsedServices = JSON.parse(services);
    } catch {
      parsedServices = [];
    }
  } else if (Array.isArray(services)) {
    parsedServices = services;
  }

  // If using multer, profile image url may be on req.file
  let profileImageUrl = "";
  if (req.file && req.file.filename) {
    // path relative to a "public/uploads" folder for example
    profileImageUrl = `/uploads/${req.file.filename}`;
  }

  const newTailor = {
    id: nextIds.getNextTailorId(),
    userId: userId || null,
    name,
    city,
    area: area || "",
    experienceYears: Number(experienceYears),
    startingPrice: Number(startingPrice),
    specializations: parsedSpecs,
    about: about || "",
    rating: 0,
    gender: gender || "male",
    profileImageUrl,
    services: parsedServices
  };

  tailors.push(newTailor);

  res.status(201).json({
    message: "Tailor profile created successfully",
    tailor: newTailor
  });
};

// DELETE /api/tailors/:id
const deleteTailor = (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = tailors.findIndex((t) => t.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Tailor not found" });
  }

  const deleted = tailors.splice(index, 1)[0];

  res.json({
    message: "Tailor deleted successfully",
    tailor: deleted
  });
};

module.exports = {
  getAllTailors,
  getTailorById,
  createTailorProfile,
  deleteTailor
};
