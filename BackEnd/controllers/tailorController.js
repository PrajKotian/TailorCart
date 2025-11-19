// BackEnd/controllers/tailorController.js

const { tailors, nextIds } = require("../models/dataStore");

// GET /api/tailors  → list all tailors
const getAllTailors = (req, res) => {
  res.json(tailors);
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
    specializations, // array of strings
    about
  } = req.body;

  if (!name || !city || !experienceYears || !startingPrice) {
    return res
      .status(400)
      .json({ error: "name, city, experienceYears, startingPrice are required" });
  }

  const newTailor = {
    id: nextIds.getNextTailorId(),
    userId: userId || null,
    name,
    city,
    area: area || "",
    experienceYears: Number(experienceYears),
    startingPrice: Number(startingPrice),
    specializations: Array.isArray(specializations) ? specializations : [],
    about: about || "",
    rating: 0
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