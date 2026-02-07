// BackEnd/controllers/reviewController.js
const Review = require("../models/Review");
const Order = require("../models/Order");
const Conversation = require("../models/Conversation"); // ✅ NEW

function toInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function nowISO() {
  return new Date().toISOString();
}
async function getNextReviewId() {
  const last = await Review.findOne().sort({ id: -1 }).select("id").lean();
  return (last?.id || 0) + 1;
}

/**
 * POST /api/reviews
 * Body: { orderId, customerId, rating (1-5), text }
 */
exports.createReview = async (req, res) => {
  try {
    const { orderId, customerId, rating, text } = req.body || {};

    const oid = toInt(orderId);
    const cid = String(customerId || "").trim();
    const rt = toInt(rating);
    const msg = String(text || "").trim();

    if (!oid || !cid) return res.status(400).json({ error: "orderId and customerId are required" });
    if (!rt || rt < 1 || rt > 5) return res.status(400).json({ error: "rating must be between 1 and 5" });
    if (msg.length < 2) return res.status(400).json({ error: "Review text too short" });
    if (msg.length > 800) return res.status(400).json({ error: "Review too long (max 800 characters)" });

    const order = await Order.findOne({ id: oid });
    if (!order) return res.status(404).json({ error: "Order not found" });

    const status = String(order.status || "").toUpperCase();
    if (status !== "DELIVERED") {
      return res.status(400).json({ error: "You can review only after the order is DELIVERED" });
    }

    if (String(order.userId || "") !== cid) {
      return res.status(403).json({ error: "This order does not belong to you" });
    }

    if (order.reviewId) {
      return res.status(400).json({ error: "Review already submitted for this order" });
    }

    const existing = await Review.findOne({ orderId: oid }).select("id").lean();
    if (existing) {
      order.reviewId = existing.id;
      await order.save();
      return res.status(400).json({ error: "Review already submitted for this order" });
    }

    const tailorId = toInt(order.tailorId);
    if (!tailorId) return res.status(400).json({ error: "Order missing tailorId" });

    const review = await Review.create({
      id: await getNextReviewId(),
      orderId: oid,
      tailorId,
      customerId: cid,
      rating: rt,
      text: msg,
      createdAt: nowISO(),
    });

    // Link review to order
    order.reviewId = review.id;
    await order.save();

    // ✅ IMPORTANT: lock the conversation instantly (fast inbox)
    // We store reviewId as string for consistency with Conversation schema
    const reviewIdStr = String(review.id);

    await Conversation.findOneAndUpdate(
      { orderId: String(oid) },
      {
        $set: {
          locked: true,
          reviewId: reviewIdStr,
          lastMessageText: "✅ Review submitted — chat closed",
          lastMessageAt: new Date(),
        },
      },
      { new: true }
    ).lean().catch(() => null);

    return res.status(201).json({ ok: true, review });
  } catch (err) {
    console.error("createReview error:", err);
    return res.status(500).json({ error: "Server error creating review" });
  }
};

// rest unchanged
exports.getReviewsForTailor = async (req, res) => {
  try {
    const tailorId = toInt(req.params.tailorId);
    if (!tailorId) return res.status(400).json({ error: "Invalid tailorId" });

    const list = await Review.find({ tailorId }).sort({ createdAt: -1 }).lean();
    return res.json(list);
  } catch (err) {
    console.error("getReviewsForTailor error:", err);
    return res.status(500).json({ error: "Server error fetching reviews" });
  }
};

exports.getTailorReviewSummary = async (req, res) => {
  try {
    const tailorId = toInt(req.params.tailorId);
    if (!tailorId) return res.status(400).json({ error: "Invalid tailorId" });

    const agg = await Review.aggregate([
      { $match: { tailorId } },
      {
        $group: {
          _id: "$tailorId",
          avgRating: { $avg: "$rating" },
          reviewsCount: { $sum: 1 },
        },
      },
    ]);

    const row = agg[0] || { avgRating: 0, reviewsCount: 0 };

    return res.json({
      tailorId,
      summary: {
        avgRating: Number(row.avgRating || 0),
        reviewsCount: Number(row.reviewsCount || 0),
      },
    });
  } catch (err) {
    console.error("getTailorReviewSummary error:", err);
    return res.status(500).json({ error: "Server error fetching review summary" });
  }
};
