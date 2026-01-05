// FrontEnd/scripts/about.js (WOW)
(function () {
  const bar = document.getElementById("tcProgressBar");
  const spot = document.getElementById("tcSpotlight");
  const stitchPath = document.getElementById("tcStitchPath");
  const needle = document.querySelector(".tc-needle");

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
  let mx = window.innerWidth * 0.5, my = window.innerHeight * 0.3;
  let tx = mx, ty = my;
  function onMove(e) { tx = e.clientX; ty = e.clientY; }
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

  // Parallax
  const parallaxEls = document.querySelectorAll("[data-parallax]");
  function parallaxTick() {
    const y = window.scrollY || 0;
    parallaxEls.forEach((el) => {
      const factor = parseFloat(el.getAttribute("data-parallax") || "0.2");
      el.style.transform = `translateY(${y * factor * 0.08}px)`;
    });
  }

  // Threadline fill
  const threadFill = document.getElementById("tcThreadFill");
  const threadLine = document.getElementById("tcThreadLine");
  function updateThreadFill() {
    if (!threadFill || !threadLine) return;
    const rect = threadLine.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const start = vh * 0.15;
    const end = vh * 0.85;
    const progress = (start - rect.top) / (rect.height + (start - end));
    const clamped = Math.max(0, Math.min(1, progress));
    threadFill.style.height = `${clamped * 100}%`;
  }

  // WOW: Stitch path draw + needle position tied to scroll
  let pathLen = 0;
  if (stitchPath) {
    pathLen = stitchPath.getTotalLength();
    stitchPath.style.strokeDasharray = `${pathLen}`;
    stitchPath.style.strokeDashoffset = `${pathLen}`;
  }

  function updateStitch() {
    if (!stitchPath || !needle || !pathLen) return;

    // animate first 35% of scroll (hero-focused)
    const doc = document.documentElement;
    const scrollTop = doc.scrollTop || document.body.scrollTop;
    const height = doc.scrollHeight - doc.clientHeight;
    const t = height > 0 ? scrollTop / height : 0;
    const heroT = Math.max(0, Math.min(1, t / 0.35));

    const draw = pathLen * (1 - heroT);
    stitchPath.style.strokeDashoffset = `${draw}`;

    const pt = stitchPath.getPointAtLength(pathLen * heroT);
    needle.setAttribute("cx", pt.x);
    needle.setAttribute("cy", pt.y);

    // small rotation feel
    needle.style.transform = `rotate(${heroT * 40}deg)`;
  }

  // WOW: Tilt cards (premium)
  const tiltEls = document.querySelectorAll(".tc-feature, .tc-glass, .tc-card, .tc-floatcard");
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

  // One scroll handler
  function onScroll() {
    updateProgress();
    parallaxTick();
    updateThreadFill();
    updateStitch();
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  onScroll();
})();
