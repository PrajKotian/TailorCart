// BackEnd/routes/tailorRoutes.js

const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");

const {
  getAllTailors,
  getTailorById,
  createTailorProfile,
  deleteTailor
} = require("../controllers/tailorController");

// ---------- MULTER CONFIG FOR FILE UPLOADS ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // uploads directory at BackEnd/uploads
    cb(null, path.join(__dirname, "..", "uploads"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `tailor-${unique}${ext}`);
  }
});

const upload = multer({
  storage
});

// ---------- ROUTES ----------

// List all tailors
router.get("/", getAllTailors);

// Get tailor by ID
router.get("/:id", getTailorById);

// Create tailor with optional profile image
// Expect field name "profileImage" for the image file
router.post("/", upload.single("profileImage"), createTailorProfile);

// Delete tailor
router.delete("/:id", deleteTailor);

module.exports = router;
