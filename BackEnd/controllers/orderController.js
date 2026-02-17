// BackEnd/controllers/orderController.js
const Order = require("../models/Order");
const Tailor = require("../models/Tailor");

const nowISO = () => new Date().toISOString();

// ✅ Dummy Razorpay-like payment id generator
function makePaymentId(prefix = "pay") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
}

// ✅ clamp helper (prevents negative / overflow)
function clampNumber(n, min, max) {
  const num = Number(n);
  if (!Number.isFinite(num)) return min;
  return Math.max(min, Math.min(max, num));
}

async function attachTailorSnapshots(orderDocs) {
  const orders = Array.isArray(orderDocs) ? orderDocs : [orderDocs];

  const tailorIds = Array.from(
    new Set(
      orders
        .map((o) => Number(o.tailorId))
        .filter((n) => Number.isFinite(n) && n > 0)
    )
  );

  const tailors = await Tailor.find({ id: { $in: tailorIds } }).lean();
  const map = new Map(tailors.map((t) => [Number(t.id), t]));

  return orders.map((o) => ({
    ...o,
    tailor: map.get(Number(o.tailorId)) || null,
  }));
}

async function getNextOrderId() {
  const last = await Order.findOne().sort({ id: -1 }).select("id").lean();
  return (last?.id || 0) + 1;
}

// POST /api/orders  → create an order request (Customer)
const createOrderRequest = async (req, res) => {
  try {
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

    const tId = Number(tailorId);
    if (!Number.isFinite(tId)) return res.status(400).json({ error: "tailorId must be a number" });

    const tailor = await Tailor.findOne({ id: tId }).lean();
    if (!tailor) return res.status(404).json({ error: "Tailor not found for given tailorId" });

    const newOrder = {
      id: await getNextOrderId(),
      userId: userId != null ? String(userId) : null,
      tailorId: tId,

      garmentType,
      fabricOption: fabricOption || "customer",
      measurementMethod: measurementMethod || "tailor",
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

      // ✅ Existing payments fields remain the same
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

    const created = await Order.create(newOrder);
    const [withTailor] = await attachTailorSnapshots([created.toObject()]);

    return res.status(201).json({
      message: "Order request created successfully",
      order: withTailor,
    });
  } catch (err) {
    console.error("createOrderRequest error:", err);
    return res.status(500).json({ error: "Failed to create order request" });
  }
};

// GET /api/orders  → list all orders (admin/dev)
const getAllOrders = async (req, res) => {
  try {
    const { userId, tailorId } = req.query;

    const q = {};
    if (userId != null && userId !== "") q.userId = String(userId);
    if (tailorId != null && tailorId !== "") q.tailorId = Number(tailorId);

    const list = await Order.find(q).sort({ id: -1 }).lean();
    const withTailor = await attachTailorSnapshots(list);
    res.json(withTailor);
  } catch (err) {
    console.error("getAllOrders error:", err);
    return res.status(500).json({ error: "Failed to load orders" });
  }
};

// GET /api/orders/:id → single order
const getOrderById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const order = await Order.findOne({ id }).lean();
    if (!order) return res.status(404).json({ error: "Order not found" });

    const [withTailor] = await attachTailorSnapshots(order);
    res.json(withTailor);
  } catch (err) {
    console.error("getOrderById error:", err);
    return res.status(500).json({ error: "Failed to load order" });
  }
};

// GET /api/orders/by-customer?userId=xxx
const getOrdersByCustomer = async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "userId query param required" });

    const list = await Order.find({ userId: String(userId) }).sort({ id: -1 }).lean();
    const withTailor = await attachTailorSnapshots(list);
    res.json(withTailor);
  } catch (err) {
    console.error("getOrdersByCustomer error:", err);
    return res.status(500).json({ error: "Failed to load customer orders" });
  }
};

// GET /api/orders/by-tailor?tailorId=1
const getOrdersByTailor = async (req, res) => {
  try {
    const tailorId = Number(req.query.tailorId);
    if (!tailorId) return res.status(400).json({ error: "tailorId query param required" });

    const list = await Order.find({ tailorId }).sort({ id: -1 }).lean();
    const withTailor = await attachTailorSnapshots(list);
    res.json(withTailor);
  } catch (err) {
    console.error("getOrdersByTailor error:", err);
    return res.status(500).json({ error: "Failed to load tailor orders" });
  }
};

// POST /api/orders/:id/quote  (Tailor)
const quoteOrder = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const order = await Order.findOne({ id });
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (["CANCELLED", "DELIVERED"].includes(order.status)) {
      return res.status(400).json({ error: `Cannot quote a ${order.status.toLowerCase()} order` });
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

    await order.save();

    const [withTailor] = await attachTailorSnapshots(order.toObject());
    res.json({ message: "Order quoted successfully", order: withTailor });
  } catch (err) {
    console.error("quoteOrder error:", err);
    return res.status(500).json({ error: "Failed to quote order" });
  }
};

// POST /api/orders/:id/accept (Customer)
const acceptQuote = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const order = await Order.findOne({ id });
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (order.status !== "QUOTED") {
      return res.status(400).json({ error: "Order must be QUOTED to accept" });
    }

    order.status = "ACCEPTED";
    order.history.push({ status: "ACCEPTED", note: "Quote accepted", at: nowISO() });
    order.updatedAt = nowISO();

    await order.save();

    const [withTailor] = await attachTailorSnapshots(order.toObject());
    res.json({ message: "Quote accepted", order: withTailor });
  } catch (err) {
    console.error("acceptQuote error:", err);
    return res.status(500).json({ error: "Failed to accept quote" });
  }
};

// ✅ NEW: POST /api/orders/:id/pay-advance (Customer)
// Rule: allowed only after quote accepted (ACCEPTED or later)
// Default advance: 30% of quote price (or can pass amount in body)
const payAdvance = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const order = await Order.findOne({ id });
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (!["ACCEPTED", "IN_PROGRESS", "READY", "DELIVERED"].includes(order.status)) {
      return res.status(400).json({ error: "Advance payment allowed only after quote is accepted" });
    }

    const total = Number(order.quote?.price || 0);
    if (!total || total <= 0) {
      return res.status(400).json({ error: "Order must have a valid quoted price to pay" });
    }

    // already paid advance?
    if ((order.payments?.advancePaid || 0) > 0) {
      return res.status(400).json({ error: "Advance already paid" });
    }

    // amount can be passed, else default 30%
    const requestedAmount = req.body?.amount;
    const defaultAdvance = Math.round(total * 0.3);
    const advanceAmount = clampNumber(requestedAmount ?? defaultAdvance, 1, total);

    // update payments
    order.payments.advancePaid = advanceAmount;
    order.payments.totalPaid = clampNumber((order.payments.totalPaid || 0) + advanceAmount, 0, total);

    // history log (looks like real gateway)
    const pid = makePaymentId("rzp");
    order.history.push({
      status: order.status,
      note: `Payment success (Advance) • RazorpayRef: ${pid} • ₹${advanceAmount}`,
      at: nowISO(),
    });

    order.updatedAt = nowISO();
    await order.save();

    const [withTailor] = await attachTailorSnapshots(order.toObject());
    res.json({
      message: "Advance payment recorded (dummy Razorpay)",
      payment: { paymentId: pid, type: "ADVANCE", amount: advanceAmount, currency: order.payments.currency || "INR" },
      order: withTailor,
    });
  } catch (err) {
    console.error("payAdvance error:", err);
    return res.status(500).json({ error: "Failed to record advance payment" });
  }
};

// ✅ NEW: POST /api/orders/:id/pay-remaining (Customer)
// Rule: allowed only when order is READY (or later)
// Remaining = quote.price - totalPaid
const payRemaining = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const order = await Order.findOne({ id });
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (!["READY", "DELIVERED"].includes(order.status)) {
      return res.status(400).json({ error: "Remaining payment allowed only when order is READY / at delivery" });
    }

    const total = Number(order.quote?.price || 0);
    if (!total || total <= 0) {
      return res.status(400).json({ error: "Order must have a valid quoted price to pay" });
    }

    const alreadyPaid = Number(order.payments?.totalPaid || 0);
    const remaining = Math.max(0, total - alreadyPaid);

    if (remaining <= 0) {
      return res.status(400).json({ error: "No remaining payment pending" });
    }

    // amount can be passed but cannot exceed remaining
    const requestedAmount = req.body?.amount;
    const payAmount = clampNumber(requestedAmount ?? remaining, 1, remaining);

    order.payments.totalPaid = clampNumber(alreadyPaid + payAmount, 0, total);

    const pid = makePaymentId("rzp");
    order.history.push({
      status: order.status,
      note: `Payment success (Remaining) • RazorpayRef: ${pid} • ₹${payAmount}`,
      at: nowISO(),
    });

    // Optional: if fully paid & delivered already -> keep as is
    order.updatedAt = nowISO();
    await order.save();

    const [withTailor] = await attachTailorSnapshots(order.toObject());
    res.json({
      message: "Remaining payment recorded (dummy Razorpay)",
      payment: { paymentId: pid, type: "REMAINING", amount: payAmount, currency: order.payments.currency || "INR" },
      order: withTailor,
    });
  } catch (err) {
    console.error("payRemaining error:", err);
    return res.status(500).json({ error: "Failed to record remaining payment" });
  }
};

// PATCH /api/orders/:id/status
const updateOrderStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const order = await Order.findOne({ id });
    if (!order) return res.status(404).json({ error: "Order not found" });

    const { status, note } = req.body;
    const allowed = ["IN_PROGRESS", "READY", "DELIVERED", "CANCELLED"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
    }

    // ✅ payment safety: do not allow DELIVERED if remaining not paid
    if (status === "DELIVERED") {
      const total = Number(order.quote?.price || 0);
      const paid = Number(order.payments?.totalPaid || 0);
      if (total > 0 && paid < total) {
        return res.status(400).json({ error: "Cannot mark DELIVERED until full payment is completed" });
      }
    }

    order.status = status;
    order.history.push({ status, note: note || "", at: nowISO() });
    order.updatedAt = nowISO();

    await order.save();

    const [withTailor] = await attachTailorSnapshots(order.toObject());
    res.json({ message: "Order status updated", order: withTailor });
  } catch (err) {
    console.error("updateOrderStatus error:", err);
    return res.status(500).json({ error: "Failed to update status" });
  }
};

// PATCH /api/orders/:id  (generic patch)
const patchOrder = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const order = await Order.findOne({ id });
    if (!order) return res.status(404).json({ error: "Order not found" });

    const { status, note } = req.body;
    const allowed = ["CANCELLED", "IN_PROGRESS", "READY", "DELIVERED"];
    if (status && !allowed.includes(status)) {
      return res.status(400).json({ error: `status (if provided) must be one of: ${allowed.join(", ")}` });
    }

    if (status) {
      // ✅ payment safety: do not allow DELIVERED if remaining not paid
      if (status === "DELIVERED") {
        const total = Number(order.quote?.price || 0);
        const paid = Number(order.payments?.totalPaid || 0);
        if (total > 0 && paid < total) {
          return res.status(400).json({ error: "Cannot mark DELIVERED until full payment is completed" });
        }
      }

      order.status = status;
      order.history.push({ status, note: note || "Updated", at: nowISO() });
    }

    order.updatedAt = nowISO();
    await order.save();

    const [withTailor] = await attachTailorSnapshots(order.toObject());
    res.json({ message: "Order updated", order: withTailor });
  } catch (err) {
    console.error("patchOrder error:", err);
    return res.status(500).json({ error: "Failed to patch order" });
  }
};

// GET /api/orders/customer/summary?userId=xxx
const customerSummary = async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "userId query param required" });

    const my = await Order.find({ userId: String(userId) }).lean();
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

    const recent = my.slice(-10).reverse();
    const withTailor = await attachTailorSnapshots(recent);

    res.json({ summary, recent: withTailor });
  } catch (err) {
    console.error("customerSummary error:", err);
    return res.status(500).json({ error: "Failed to load summary" });
  }
};

// GET /api/orders/tailor/summary?tailorId=1
const tailorSummary = async (req, res) => {
  try {
    const tailorId = Number(req.query.tailorId);
    if (!tailorId) return res.status(400).json({ error: "tailorId query param required" });

    const my = await Order.find({ tailorId }).lean();
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

    const recent = my.slice(-10).reverse();
    const withTailor = await attachTailorSnapshots(recent);

    res.json({ summary, recent: withTailor });
  } catch (err) {
    console.error("tailorSummary error:", err);
    return res.status(500).json({ error: "Failed to load summary" });
  }
};

module.exports = {
  createOrderRequest,
  getAllOrders,
  getOrderById,
  getOrdersByCustomer,
  getOrdersByTailor,
  quoteOrder,
  acceptQuote,

  // ✅ exported new payment controllers
  payAdvance,
  payRemaining,

  updateOrderStatus,
  patchOrder,
  customerSummary,
  tailorSummary,
};
