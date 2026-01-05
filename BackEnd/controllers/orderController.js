// BackEnd/controllers/orderController.js
const { orders, nextIds, tailors } = require("../models/dataStore");

// Helpers
const nowISO = () => new Date().toISOString();

const findOrderOr404 = (id, res) => {
  const orderId = Number(id);
  const order = orders.find((o) => o.id === orderId);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return null;
  }
  return order;
};

const attachTailorSnapshot = (order) => {
  const tailor = tailors.find((t) => t.id === Number(order.tailorId)) || null;
  return { ...order, tailor };
};

const canCancel = (order) => !["DELIVERED", "CANCELLED"].includes(order.status);

// POST /api/orders  → create an order request (Customer)
const createOrderRequest = (req, res) => {
  const {
    userId,
    tailorId,
    garmentType,
    fabricOption,
    measurementMethod,
    measurements,
    address,
    preferredDate,
    preferredTimeSlot,
    designNotes,
    designImageUrl,
  } = req.body;

  if (!tailorId) return res.status(400).json({ error: "tailorId is required" });
  if (!garmentType) return res.status(400).json({ error: "garmentType is required" });
  if (!address) return res.status(400).json({ error: "delivery address is required" });

  const tailor = tailors.find((t) => t.id === Number(tailorId));
  if (!tailor) return res.status(404).json({ error: "Tailor not found for given tailorId" });

  const newOrder = {
    id: nextIds.getNextOrderId(),
    userId: userId || null,
    tailorId: Number(tailorId),

    garmentType,
    fabricOption: fabricOption || "customer", // customer|tailor
    measurementMethod: measurementMethod || "tailor", // tailor|manual
    measurements: measurements || {},

    address,
    preferredDate: preferredDate || null,
    preferredTimeSlot: preferredTimeSlot || "any",
    designNotes: designNotes || "",
    designImageUrl: designImageUrl || null,

    quote: {
      price: null,
      deliveryDays: null,
      expectedDeliveryDate: null,
      note: "",
      quotedAt: null,
    },
    payments: {
      advancePaid: 0,
      totalPaid: 0,
      currency: "INR",
    },

    status: "REQUESTED",
    history: [{ status: "REQUESTED", note: "Order requested", at: nowISO() }],
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };

  orders.push(newOrder);

  return res.status(201).json({
    message: "Order request created successfully",
    order: attachTailorSnapshot(newOrder),
  });
};

// GET /api/orders  → list all orders (admin/dev)
// ✅ supports filters: /api/orders?userId=1 or /api/orders?tailorId=2
const getAllOrders = (req, res) => {
  const { userId, tailorId } = req.query;

  let list = orders;

  if (userId != null && userId !== "") {
    list = list.filter((o) => String(o.userId) === String(userId));
  }
  if (tailorId != null && tailorId !== "") {
    list = list.filter((o) => String(o.tailorId) === String(tailorId));
  }

  res.json(list.map(attachTailorSnapshot));
};

// GET /api/orders/:id → single order
const getOrderById = (req, res) => {
  const order = findOrderOr404(req.params.id, res);
  if (!order) return;
  res.json(attachTailorSnapshot(order));
};

// GET /api/orders/by-customer?userId=1
const getOrdersByCustomer = (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: "userId query param required" });

  const list = orders
    .filter((o) => String(o.userId) === String(userId))
    .map(attachTailorSnapshot);

  res.json(list);
};

// GET /api/orders/by-tailor?tailorId=1
const getOrdersByTailor = (req, res) => {
  const tailorId = Number(req.query.tailorId);
  if (!tailorId) return res.status(400).json({ error: "tailorId query param required" });

  const list = orders.filter((o) => Number(o.tailorId) === tailorId).map(attachTailorSnapshot);
  res.json(list);
};

// POST /api/orders/:id/quote  (Tailor)
const quoteOrder = (req, res) => {
  const order = findOrderOr404(req.params.id, res);
  if (!order) return;

  if (order.status === "CANCELLED") {
    return res.status(400).json({ error: "Cannot quote a cancelled order" });
  }
  if (order.status === "DELIVERED") {
    return res.status(400).json({ error: "Cannot quote a delivered order" });
  }

  const { price, deliveryDays, expectedDeliveryDate, note } = req.body;

  if (price == null || Number(price) <= 0) {
    return res.status(400).json({ error: "Valid price is required" });
  }

  order.quote.price = Number(price);
  order.quote.deliveryDays = deliveryDays != null ? Number(deliveryDays) : null;
  order.quote.expectedDeliveryDate = expectedDeliveryDate || null;
  order.quote.note = note || "";
  order.quote.quotedAt = nowISO();

  order.status = "QUOTED";
  order.history.push({ status: "QUOTED", note: "Quote sent", at: nowISO() });
  order.updatedAt = nowISO();

  res.json({ message: "Order quoted successfully", order: attachTailorSnapshot(order) });
};

// POST /api/orders/:id/accept (Customer)
const acceptQuote = (req, res) => {
  const order = findOrderOr404(req.params.id, res);
  if (!order) return;

  if (order.status !== "QUOTED") {
    return res.status(400).json({ error: "Order must be QUOTED to accept" });
  }

  order.status = "ACCEPTED";
  order.history.push({ status: "ACCEPTED", note: "Quote accepted", at: nowISO() });
  order.updatedAt = nowISO();

  res.json({ message: "Quote accepted", order: attachTailorSnapshot(order) });
};

// PATCH /api/orders/:id/status (Tailor progress OR cancel)
const updateOrderStatus = (req, res) => {
  const order = findOrderOr404(req.params.id, res);
  if (!order) return;

  const { status, note } = req.body;

  const allowed = ["IN_PROGRESS", "READY", "DELIVERED", "CANCELLED"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
  }

  if (status === "CANCELLED" && !canCancel(order)) {
    return res.status(400).json({ error: "Order cannot be cancelled at this stage" });
  }

  order.status = status;
  order.history.push({ status, note: note || "", at: nowISO() });
  order.updatedAt = nowISO();

  res.json({ message: "Order status updated", order: attachTailorSnapshot(order) });
};

// ✅ NEW: PATCH /api/orders/:id  (generic update endpoint)
const patchOrder = (req, res) => {
  const order = findOrderOr404(req.params.id, res);
  if (!order) return;

  const { status, note } = req.body;

  const allowed = ["CANCELLED", "IN_PROGRESS", "READY", "DELIVERED"];
  if (status && !allowed.includes(status)) {
    return res.status(400).json({
      error: `status (if provided) must be one of: ${allowed.join(", ")}`,
    });
  }

  if (status === "CANCELLED" && !canCancel(order)) {
    return res.status(400).json({ error: "Order cannot be cancelled at this stage" });
  }

  if (status) {
    order.status = status;
    order.history.push({ status, note: note || "Updated", at: nowISO() });
  }

  order.updatedAt = nowISO();
  res.json({ message: "Order updated", order: attachTailorSnapshot(order) });
};

// GET /api/orders/customer/summary?userId=usr_xxx
const customerSummary = (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: "userId query param required" });

  const my = orders.filter((o) => String(o.userId) === String(userId));

  const summary = {
    requested: my.filter((o) => o.status === "REQUESTED").length,
    quoted: my.filter((o) => o.status === "QUOTED").length,
    accepted: my.filter((o) => o.status === "ACCEPTED").length,
    inProgress: my.filter((o) => o.status === "IN_PROGRESS").length,
    ready: my.filter((o) => o.status === "READY").length,
    delivered: my.filter((o) => o.status === "DELIVERED").length,
    cancelled: my.filter((o) => o.status === "CANCELLED").length,
    total: my.length,
  };

  res.json({ summary, recent: my.slice(-10).reverse().map(attachTailorSnapshot) });
};


// GET /api/orders/tailor/summary?tailorId=1
const tailorSummary = (req, res) => {
  const tailorId = Number(req.query.tailorId);
  if (!tailorId) return res.status(400).json({ error: "tailorId query param required" });

  const my = orders.filter((o) => Number(o.tailorId) === tailorId);

  const summary = {
    requested: my.filter((o) => o.status === "REQUESTED").length,
    quoted: my.filter((o) => o.status === "QUOTED").length,
    accepted: my.filter((o) => o.status === "ACCEPTED").length,
    inProgress: my.filter((o) => o.status === "IN_PROGRESS").length,
    ready: my.filter((o) => o.status === "READY").length,
    delivered: my.filter((o) => o.status === "DELIVERED").length,
    cancelled: my.filter((o) => o.status === "CANCELLED").length,
    total: my.length,
  };

  res.json({ summary, recent: my.slice(-10).reverse().map(attachTailorSnapshot) });
};

module.exports = {
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
};
