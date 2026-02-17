// BackEnd/routes/orderRoutes.js
const express = require("express");
const router = express.Router();

const {
  createOrderRequest,
  getAllOrders,
  getOrderById,
  getOrdersByCustomer,
  getOrdersByTailor,
  quoteOrder,
  acceptQuote,
  updateOrderStatus,
  patchOrder,
  customerSummary,
  tailorSummary,

  // ✅ Payment controllers
  payAdvance,
  payRemaining,
} = require("../controllers/orderController"); // ✅ FIXED PATH

router.get("/", getAllOrders);

router.get("/customer/summary", customerSummary);
router.get("/tailor/summary", tailorSummary);

router.get("/by-customer", getOrdersByCustomer);
router.get("/by-tailor", getOrdersByTailor);

router.get("/:id", getOrderById);

router.post("/", createOrderRequest);

router.post("/:id/quote", quoteOrder);
router.post("/:id/accept", acceptQuote);

// ✅ NEW: payment routes (must match frontend + controller expectation)
router.post("/:id/pay-advance", payAdvance);
router.post("/:id/pay-remaining", payRemaining);

router.patch("/:id/status", updateOrderStatus);
router.patch("/:id", patchOrder);

module.exports = router;
