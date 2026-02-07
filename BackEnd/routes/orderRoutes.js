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

router.patch("/:id/status", updateOrderStatus);
router.patch("/:id", patchOrder);

module.exports = router;
