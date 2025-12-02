// BackEnd/routes/orderRoutes.js

const express = require("express");
const router = express.Router();

const {
  createOrderRequest,
  getAllOrders,
  getOrderById
} = require("../controllers/orderController");

// List all orders (later: filter by logged-in user)
router.get("/", getAllOrders);

// Get single order
router.get("/:id", getOrderById);

// Create new order request
router.post("/", createOrderRequest);

module.exports = router;
