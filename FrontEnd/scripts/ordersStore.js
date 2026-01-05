// FrontEnd/scripts/ordersStore.js

// Backend-aligned statuses
const ORDER_STATUS = {
  REQUESTED: "REQUESTED",
  QUOTED: "QUOTED",
  ACCEPTED: "ACCEPTED",
  IN_PROGRESS: "IN_PROGRESS",
  READY: "READY",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
};

// (Optional) local fallback key
const ORDER_STORAGE_KEY = "tc_orders_v1";

function safeParse(json, fallback) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

function localLoadOrders() {
  const raw = localStorage.getItem(ORDER_STORAGE_KEY);
  if (!raw) return [];
  const parsed = safeParse(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

function localSaveOrders(list) {
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(list));
}

async function api(path, options = {}) {
  // Prefer AuthStore helper if present
  if (window.AuthStore?.authFetch) return window.AuthStore.authFetch(path, options);
  if (window.AuthStore?.apiFetch) return window.AuthStore.apiFetch(path, options);

  // fallback raw fetch
  const base = "http://localhost:5000";
  const res = await fetch(base + path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || "Request failed");
  return data;
}

const OrderStore = (function () {
  // -------- Backend Methods --------

  async function createOrderRequest(payload) {
    // payload must match backend createOrderRequest fields
    // { userId, tailorId, garmentType, fabricOption, measurementMethod, measurements, address, preferredDate, preferredTimeSlot, designNotes, designImageUrl }
    const data = await api("/api/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return data.order || data;
  }

  async function getOrderById(id) {
    const data = await api(`/api/orders/${id}`);
    return data.order || data;
  }

  async function getOrdersByCustomer(userId) {
    const data = await api(`/api/orders/by-customer?userId=${encodeURIComponent(userId)}`);
    return Array.isArray(data) ? data : data.orders || [];
  }

  async function getOrdersByTailor(tailorId) {
    const data = await api(`/api/orders/by-tailor?tailorId=${encodeURIComponent(tailorId)}`);
    return Array.isArray(data) ? data : data.orders || [];
  }

  async function quoteOrder(orderId, { price, priceQuote, deliveryDays, expectedDeliveryDate, note }) {
    // IMPORTANT: backend expects `price`
    // If your UI uses priceQuote, we accept it here and map to price.
    const finalPrice = price != null ? price : priceQuote;

    const data = await api(`/api/orders/${orderId}/quote`, {
      method: "POST",
      body: JSON.stringify({
        price: finalPrice,
        deliveryDays: deliveryDays ?? null,
        expectedDeliveryDate: expectedDeliveryDate ?? null,
        note: note ?? "",
      }),
    });
    return data.order || data;
  }

  async function acceptQuote(orderId) {
    const data = await api(`/api/orders/${orderId}/accept`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    return data.order || data;
  }

  async function updateStatus(orderId, status, note = "") {
    const data = await api(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, note }),
    });
    return data.order || data;
  }

  async function getCustomerSummary(userId) {
    return api(`/api/orders/customer/summary?userId=${encodeURIComponent(userId)}`);
  }

  async function getTailorSummary(tailorId) {
    return api(`/api/orders/tailor/summary?tailorId=${encodeURIComponent(tailorId)}`);
  }

  // -------- Optional Local Fallback Methods --------
  // (Useful while you’re still migrating screens; can be removed later)

  function localGetAllOrders() {
    return localLoadOrders();
  }

  function localClearAllOrders() {
    localStorage.removeItem(ORDER_STORAGE_KEY);
  }

  return {
    ORDER_STATUS,

    // Backend
    createOrderRequest,
    getOrderById,
    getOrdersByCustomer,
    getOrdersByTailor,
    quoteOrder,
    acceptQuote,
    updateStatus,
    getCustomerSummary,
    getTailorSummary,

    // Local fallback (optional)
    localGetAllOrders,
    localClearAllOrders,
  };
})();

if (typeof window !== "undefined") {
  window.OrderStore = OrderStore;
  window.ORDER_STATUS = ORDER_STATUS;
}
