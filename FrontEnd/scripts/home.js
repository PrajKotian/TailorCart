// FrontEnd/scripts/home.js (Home WOW)
(function () {
  const bar = document.getElementById("tcProgressBar");
  const spot = document.getElementById("tcSpotlight");
  const cursorThread = document.getElementById("tcCursorThread");

  const stitchPath = document.getElementById("tcStitchPath");
  const needle = document.querySelector(".tc-needle");

  const atelierToggle = document.getElementById("tcAtelierToggle");

  const homeSearchBtn = document.getElementById("homeSearchBtn");
  const homeSearchQ = document.getElementById("homeSearchQ");
  const homeSearchCity = document.getElementById("homeSearchCity");

  // Progress
  function updateProgress() {
    const doc = document.documentElement;
    const scrollTop = doc.scrollTop || document.body.scrollTop;
    const height = doc.scrollHeight - doc.clientHeight;
    const p = height > 0 ? (scrollTop / height) * 100 : 0;
    if (bar) bar.style.width = `${p}%`;
  }

  // Reveal
  const revealEls = document.querySelectorAll(".tc-reveal");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add("is-inview");
      });
    },
    { threshold: 0.12 }
  );
  revealEls.forEach((el) => io.observe(el));

  // Spotlight follow (smooth)
  let mx = window.innerWidth * 0.5,
    my = window.innerHeight * 0.3;
  let tx = mx,
    ty = my;

  function onMove(e) {
    tx = e.clientX;
    ty = e.clientY;

    // Cursor thread
    if (cursorThread) {
      cursorThread.style.opacity = "1";
      cursorThread.style.left = `${tx}px`;
      cursorThread.style.top = `${ty}px`;
    }
  }
  window.addEventListener("mousemove", onMove);

  function animateSpot() {
    mx += (tx - mx) * 0.08;
    my += (ty - my) * 0.08;
    if (spot) {
      spot.style.left = `${mx}px`;
      spot.style.top = `${my}px`;
    }
    requestAnimationFrame(animateSpot);
  }
  animateSpot();

  // // WOW: Stitch path draw + needle tied to scroll (hero-focused)
  // let pathLen = 0;
  // if (stitchPath) {
  //   pathLen = stitchPath.getTotalLength();
  //   stitchPath.style.strokeDasharray = `${pathLen}`;
  //   stitchPath.style.strokeDashoffset = `${pathLen}`;
  // }

  // function updateStitch() {
  //   if (!stitchPath || !needle || !pathLen) return;

  //   const doc = document.documentElement;
  //   const scrollTop = doc.scrollTop || document.body.scrollTop;
  //   const height = doc.scrollHeight - doc.clientHeight;
  //   const t = height > 0 ? scrollTop / height : 0;

  //   // Animate mostly in early scroll (hero)
  //   const heroT = Math.max(0, Math.min(1, t / 0.33));

  //   const draw = pathLen * (1 - heroT);
  //   stitchPath.style.strokeDashoffset = `${draw}`;

  //   const pt = stitchPath.getPointAtLength(pathLen * heroT);
  //   needle.setAttribute("cx", pt.x);
  //   needle.setAttribute("cy", pt.y);
  //   needle.style.transform = `rotate(${heroT * 40}deg)`;
  // }

  // WOW: Tilt cards (premium)
  const tiltEls = document.querySelectorAll(".tc-tilt");
  function attachTilt(el) {
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      const rx = (py - 0.5) * -8;
      const ry = (px - 0.5) * 10;
      el.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;
    });
    el.addEventListener("mouseleave", () => {
      el.style.transform = "";
    });
  }
  tiltEls.forEach(attachTilt);

  // Magnetic buttons
  const magnets = document.querySelectorAll(".tc-magnetic");
  magnets.forEach((btn) => {
    btn.addEventListener("mousemove", (e) => {
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      btn.style.transform = `translate(${dx * 0.08}px, ${dy * 0.08}px)`;
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "translate(0,0)";
    });
  });

  // Atelier Mode toggle (adds extra “craft mood”)
  if (atelierToggle) {
    atelierToggle.addEventListener("click", () => {
      document.body.classList.toggle("is-atelier");
    });
  }

  // Home search → deep link to tailors.html
  function goSearch() {
    const q = (homeSearchQ?.value || "").trim();
    const city = (homeSearchCity?.value || "").trim();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (city) params.set("city", city);
    window.location.href = `tailors.html?${params.toString()}`;
  }
  homeSearchBtn?.addEventListener("click", goSearch);
  homeSearchQ?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") goSearch();
  });
  homeSearchCity?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") goSearch();
  });

  // One scroll handler
  function onScroll() {
    updateProgress();
    updateStitch();
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  // Hide cursor thread on mobile / touch
  window.addEventListener(
    "touchstart",
    () => {
      if (cursorThread) cursorThread.style.opacity = "0";
    },
    { passive: true }
  );

  // Prevent magnetic transform from breaking layout for inline links in cards
  document.querySelectorAll("a.tc-magnetic").forEach((a) => {
    a.style.display = "inline-flex";
  });
})();
