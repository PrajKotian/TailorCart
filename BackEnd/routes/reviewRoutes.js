// BackEnd/routes/reviewRoutes.js
const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");

// POST /api/reviews
router.post("/", reviewController.createReview);

// GET /api/reviews/tailor/:tailorId
router.get("/tailor/:tailorId", reviewController.getReviewsForTailor);

// GET /api/reviews/tailor/:tailorId/summary
router.get("/tailor/:tailorId/summary", reviewController.getTailorReviewSummary);

module.exports = router;
