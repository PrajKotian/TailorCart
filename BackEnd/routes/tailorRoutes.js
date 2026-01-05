const express = require("express");
const router = express.Router();
const tailorController = require("../controllers/tailorController");

let uploadSingle = (req, res, next) => next();
try {
  const upload = require("../middleware/upload");
  uploadSingle = upload.single("profileImage");
} catch {}

// ✅ ADD: fetch tailor profile by userId (needed by tailorDashboard.js)
router.get("/by-user/:userId", tailorController.getTailorByUserId);

router.get("/", tailorController.getAllTailors);
router.get("/:id", tailorController.getTailorById);
router.post("/", uploadSingle, tailorController.createTailorProfile);
router.put("/:id", uploadSingle, tailorController.updateTailorProfile);
router.delete("/:id", tailorController.deleteTailor);

module.exports = router;
