// BackEnd/controllers/orderController.js

const { orders, nextIds, tailors } = require("../models/dataStore");

// POST /api/orders  → create an order request
const createOrderRequest = (req, res) => {
  const {
    userId,             // optional for now
    tailorId,           // which tailor this order is for
    garmentType,
    fabricOption,       // "customer" or "tailor"
    measurementMethod,  // "tailor" or "manual"
    measurements,       // { bust, waist, hip, length } or {}
    address,
    preferredDate,      // string YYYY-MM-DD
    preferredTimeSlot,  // "any", "morning", "evening"
    designNotes,
    designImageUrl      // we'll keep null / simple string for now
  } = req.body;

  // ---- Basic validation ----
  if (!tailorId) {
    return res.status(400).json({ error: "tailorId is required" });
  }
  if (!garmentType) {
    return res.status(400).json({ error: "garmentType is required" });
  }
  if (!address) {
    return res.status(400).json({ error: "delivery address is required" });
  }

  // Optional sanity check: ensure tailor exists
  const tailor = tailors.find((t) => t.id === Number(tailorId));
  if (!tailor) {
    return res.status(404).json({ error: "Tailor not found for given tailorId" });
  }

  const newOrder = {
    id: nextIds.getNextOrderId(),
    userId: userId || null,
    tailorId: Number(tailorId),
    garmentType,
    fabricOption: fabricOption || "customer",
    measurementMethod: measurementMethod || "tailor",
    measurements: measurements || {},
    address,
    preferredDate: preferredDate || null,
    preferredTimeSlot: preferredTimeSlot || "any",
    designNotes: designNotes || "",
    designImageUrl: designImageUrl || null,
    status: "pending", // tailor has not yet reviewed
    createdAt: new Date().toISOString()
  };

  orders.push(newOrder);

  return res.status(201).json({
    message: "Order request created successfully",
    order: newOrder
  });
};

// GET /api/orders  → list all orders (later we can filter by userId)
const getAllOrders = (req, res) => {
  res.json(orders);
};

// GET /api/orders/:id → single order
const getOrderById = (req, res) => {
  const id = parseInt(req.params.id, 10);
  const order = orders.find((o) => o.id === id);

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  res.json(order);
};

module.exports = {
  createOrderRequest,
  getAllOrders,
  getOrderById
};
