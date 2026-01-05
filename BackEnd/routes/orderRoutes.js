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
} = require("../controllers/orderController");

// list all (supports ?userId= & ?tailorId=)
router.get("/", getAllOrders);

// summaries
router.get("/customer/summary", customerSummary);
router.get("/tailor/summary", tailorSummary);

// filters
router.get("/by-customer", getOrdersByCustomer);
router.get("/by-tailor", getOrdersByTailor);

// single order details
router.get("/:id", getOrderById);

// create new order
router.post("/", createOrderRequest);

// tailor quote
router.post("/:id/quote", quoteOrder);

// customer accept
router.post("/:id/accept", acceptQuote);

// tailor progress/cancel
router.patch("/:id/status", updateOrderStatus);

// generic patch
router.patch("/:id", patchOrder);

module.exports = router;
