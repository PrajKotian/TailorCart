const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");

router.post("/signup", authController.signup);
router.post("/login", authController.login);

// ✅ Addresses endpoints (profile page)
router.get("/addresses", authController.getAddresses);
router.put("/addresses", authController.putAddresses);

module.exports = router;
