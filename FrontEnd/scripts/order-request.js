// FrontEnd/scripts/order-request.js
console.log("✅ order-request.js is running");

document.addEventListener("DOMContentLoaded", () => {
  // Only run on order-request page
  const step1 = document.getElementById("orderStep1");
  const step2 = document.getElementById("orderStep2");
  const step3 = document.getElementById("orderStep3");
  if (!step1 || !step2 || !step3) return;

  // ---- LOGIN GUARD (customer only) ----
  const currentUser = window.AuthStore?.getCurrentUser?.();
  if (!currentUser || String(currentUser.role || "").toLowerCase() !== "customer") {
    const redirectTo = encodeURIComponent(window.location.href);
    window.location.href = `login.html?redirect=${redirectTo}`;
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const tailorId = params.get("tailorId"); // must exist to place order
  if (!tailorId) {
    alert("Missing tailorId in URL. Open this page from a tailor profile.");
    return;
  }

  const stepItems = document.querySelectorAll(".order-step-item");
  const successSection = document.getElementById("orderSuccess");
  const wrapper = document.getElementById("orderMultiStep");

  let currentStep = 1;
  let measurementMode = "tailor"; // "tailor" | "manual"

  function setStep(step) {
    currentStep = step;
    step1.classList.toggle("d-none", step !== 1);
    step2.classList.toggle("d-none", step !== 2);
    step3.classList.toggle("d-none", step !== 3);

    stepItems.forEach((item) => {
      const n = Number(item.dataset.step || 0);
      item.classList.toggle("active", n === step);
    });
  }

  function setMeasurementMode(mode) {
    measurementMode = mode;

    document.querySelectorAll(".order-measure-option").forEach((opt) => {
      opt.classList.toggle("active", opt.dataset.value === mode);
    });

    const manual = document.getElementById("measureManual");
    const warn = document.getElementById("measurementWarning");

    if (mode === "manual") {
      manual?.classList.remove("d-none");
      warn?.classList.remove("d-none");
    } else {
      manual?.classList.add("d-none");
      warn?.classList.add("d-none");
    }
  }

  function updateSummary() {
    const garment = document.getElementById("orderGarmentType")?.value || "—";
    const fabricOpt =
      document.querySelector("input[name='orderFabricOption']:checked")?.value || "customer";
    const fabricDetails = document.getElementById("orderFabricDetails")?.value?.trim() || "";

    const summaryGarment = document.getElementById("summaryGarment");
    const summaryFabric = document.getElementById("summaryFabric");
    const summaryMeasurement = document.getElementById("summaryMeasurement");

    if (summaryGarment) summaryGarment.textContent = garment;

    if (summaryFabric) {
      let t = fabricOpt === "tailor" ? "Tailor provides fabric" : "Customer will provide fabric";
      if (fabricDetails) t += ` (${fabricDetails})`;
      summaryFabric.textContent = t;
    }

    if (summaryMeasurement) {
      if (measurementMode === "tailor") {
        summaryMeasurement.textContent = "Tailor will take measurements";
      } else {
        const bust = document.getElementById("mBust")?.value;
        const waist = document.getElementById("mWaist")?.value;
        const hip = document.getElementById("mHip")?.value;
        const length = document.getElementById("mLength")?.value;

        const parts = [];
        if (bust) parts.push(`Bust ${bust}"`);
        if (waist) parts.push(`Waist ${waist}"`);
        if (hip) parts.push(`Hip ${hip}"`);
        if (length) parts.push(`Length ${length}"`);

        summaryMeasurement.textContent = parts.length ? `Manual: ${parts.join(", ")}` : "Manual";
      }
    }
  }

  // ---------- Step 1 ----------
  const garmentSelect = document.getElementById("orderGarmentType");
  const next1 = document.getElementById("orderNext1");

  next1?.addEventListener("click", (e) => {
    e.preventDefault();
    if (!garmentSelect || !garmentSelect.value) {
      alert("Please select a garment type to continue.");
      garmentSelect?.focus();
      return;
    }
    setStep(2);
  });

  // ---------- Step 2 ----------
  const back2 = document.getElementById("orderBack2");
  const next2 = document.getElementById("orderNext2");

  back2?.addEventListener("click", (e) => {
    e.preventDefault();
    setStep(1);
  });

  next2?.addEventListener("click", (e) => {
    e.preventDefault();
    updateSummary();
    setStep(3);
  });

  // Fabric info toggle
  const fabricTailorInfo = document.getElementById("fabricTailorInfo");
  document.querySelectorAll("input[name='orderFabricOption']").forEach((r) => {
    r.addEventListener("change", () => {
      const isTailor = r.value === "tailor" && r.checked;
      fabricTailorInfo?.classList.toggle("d-none", !isTailor);
    });
  });

  // Measurement mode cards
  document.querySelectorAll(".order-measure-option").forEach((opt) => {
    opt.addEventListener("click", () => setMeasurementMode(opt.dataset.value || "tailor"));
  });

  // ---------- Step 3 ----------
  const back3 = document.getElementById("orderBack3");
  back3?.addEventListener("click", (e) => {
    e.preventDefault();
    setStep(2);
  });

  // ---------- Design preview ----------
  const designInput = document.getElementById("orderDesignImage");
  const designPreview = document.getElementById("orderDesignPreview");
  const previewImg = designPreview?.querySelector("img");
  const useBasicToggle = document.getElementById("orderUseBasicDesign");

  designInput?.addEventListener("change", () => {
    const file = designInput.files?.[0];
    if (!file || !previewImg || !designPreview) {
      designPreview?.classList.add("d-none");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      previewImg.src = reader.result;
      designPreview.classList.remove("d-none");
    };
    reader.readAsDataURL(file);
  });

  useBasicToggle?.addEventListener("change", () => {
    const disabled = useBasicToggle.checked;
    if (designInput) designInput.disabled = disabled;
    if (disabled) {
      if (designInput) designInput.value = "";
      designPreview?.classList.add("d-none");
    }
  });

  // ---------- Submit ----------
  const submitBtn = document.getElementById("orderSubmit");

  submitBtn?.addEventListener("click", async (e) => {
    e.preventDefault();

    const address = document.getElementById("orderAddress")?.value?.trim() || "";
    if (address.length < 5) {
      alert("Please enter a valid delivery address.");
      return;
    }

    const garmentType = document.getElementById("orderGarmentType")?.value || "";
    const fabricOption =
      document.querySelector("input[name='orderFabricOption']:checked")?.value || "customer";

    // ✅ OPTION B FIX (match your HTML ids)
    const preferredDate = document.getElementById("orderDeliveryDate")?.value || null;
    const preferredTimeSlot = document.getElementById("orderTimeSlot")?.value || "any";

    const designNotes = document.getElementById("orderDesignNotes")?.value?.trim() || "";

    const measurements =
      measurementMode === "manual"
        ? {
            bust: document.getElementById("mBust")?.value || "",
            waist: document.getElementById("mWaist")?.value || "",
            hip: document.getElementById("mHip")?.value || "",
            length: document.getElementById("mLength")?.value || "",
          }
        : {};

    const payload = {
      userId: Number(currentUser.id) || currentUser.id,
      tailorId: Number(tailorId),
      garmentType,
      fabricOption,
      measurementMethod: measurementMode,
      measurements,
      address,
      preferredDate,
      preferredTimeSlot,
      designNotes,
      designImageUrl: null,
    };

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting...";

      // ✅ Use OrderStore if present (best) else fallback to raw fetch
      let data;
      if (window.OrderStore?.createOrderRequest) {
        data = await window.OrderStore.createOrderRequest(payload);
      } else {
        const base = window.API_BASE_URL || "http://localhost:3000";
        const res = await fetch(`${base}/api/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || data?.message || "Failed to submit order");
      }

      wrapper?.classList.add("d-none");
      successSection?.classList.remove("d-none");

      // try to show id if returned
      const createdId = data?.id ?? data?.order?.id ?? data?._id ?? data?.order?._id ?? null;
      const orderIdEl = document.getElementById("orderSuccessId");
      if (orderIdEl && createdId) orderIdEl.textContent = `Order #${createdId}`;
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to submit order. Please try again.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send Request to Tailor";
    }
  });

  setStep(1);
  setMeasurementMode("tailor");

  // Load tailor specializations into garment dropdown
  (async function loadTailorSpecializations() {
    try {
      if (!garmentSelect) return;

      const base = window.API_BASE_URL || "http://localhost:3000";
      const res = await fetch(`${base}/api/tailors/${encodeURIComponent(tailorId)}`);
      if (!res.ok) return;

      const tailor = await res.json().catch(() => null);
      if (!tailor) return;

      if (Array.isArray(tailor.specializations) && tailor.specializations.length) {
        garmentSelect.innerHTML = `<option value="">Select garment type</option>`;
        tailor.specializations.forEach((s) => {
          const opt = document.createElement("option");
          opt.value = s;
          opt.textContent = s;
          garmentSelect.appendChild(opt);
        });
      }
    } catch (err) {
      console.warn("Tailor load failed:", err);
    }
  })();
});
