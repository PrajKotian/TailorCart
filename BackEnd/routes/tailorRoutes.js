const express = require("express");
const router = express.Router();

const {
  getAllTailors,
  getTailorById,
  createTailorProfile,
  deleteTailor
} = require("../controllers/tailorController");

// List all tailors
router.get("/", getAllTailors);

// Get tailor by ID
router.get("/:id", getTailorById);

// Create tailor
router.post("/", createTailorProfile);

// Delete tailor
router.delete("/:id", deleteTailor);

module.exports = router;
