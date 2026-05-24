/* ==========================================================
   NEXUS.AI — Interface behaviour
   - Scroll-reveal on [data-reveal]
   - Animated typewriter placeholder
   - Prompt submit -> password modal
   - Password modal: strength, show/hide, auth flow
   - Counting metrics
   - Pointer tracking on capability cards
========================================================== */

(() => {
  "use strict";

  // ---------- Scroll reveal ----------
  const reveals = document.querySelectorAll("[data-reveal]");
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting){
        e.target.classList.add("in");
        // trigger metric count on view
        if (e.target.classList.contains("metric")) startCount(e.target);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  reveals.forEach(el => io.observe(el));

  // ---------- Metric count-up ----------
  function startCount(metricEl){
    const numEl = metricEl.querySelector(".metric-num");
    if (!numEl) return;
    const target = parseFloat(numEl.getAttribute("data-count"));
    const suffix = numEl.getAttribute("data-suffix") || "";
    const isInt = Number.isInteger(target);
    const dur = 1400;
    const start = performance.now();
    function tick(now){
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = target * eased;
      numEl.innerHTML = (isInt ? Math.round(val).toLocaleString() : val.toFixed(2)) +
        `<span class="unit">${suffix}</span>`;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ---------- Pointer glow on cards ----------
  document.querySelectorAll(".card").forEach(card => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });

  // ---------- Typewriter placeholder ----------
  const typer = document.getElementById("promptTyper");
  const input = document.getElementById("promptInput");
  const PHRASES = [
    "Summarize this 40-page research paper into 5 bullets…",
    "Generate a React component from a Figma URL…",
    "Explain why my Kubernetes pod is crashing…",
    "Draft an email to reschedule tomorrow's review…",
    "Analyze Q1 revenue vs. forecast across 12 regions…",
    "Translate this SQL query into Polars…"
  ];
  let phrase = 0, ch = 0, dir = 1, pauseTicks = 0;
  function step(){
    if (!typer) return;
    if (input && input.value.length > 0){
      typer.classList.add("hidden");
      return setTimeout(step, 400);
    }
    typer.classList.remove("hidden");
    const full = PHRASES[phrase];
    if (pauseTicks > 0){ pauseTicks--; return setTimeout(step, 40); }
    if (dir > 0){
      ch++;
      if (ch >= full.length){ dir = -1; pauseTicks = 40; }
    } else {
      ch--;
      if (ch <= 0){ dir = 1; phrase = (phrase + 1) % PHRASES.length; pauseTicks = 6; }
    }
    typer.textContent = full.slice(0, ch);
    const delay = dir > 0 ? 38 + Math.random() * 40 : 18;
    setTimeout(step, delay);
  }
  step();

  input?.addEventListener("input", () => {
    if (input.value.length > 0) typer?.classList.add("hidden");
    else typer?.classList.remove("hidden");
  });

  // ---------- Suggestion chips ----------
  document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      if (!input) return;
      input.value = chip.getAttribute("data-suggest") || chip.textContent;
      input.focus();
      typer?.classList.add("hidden");
    });
  });

  // ---------- Password modal ----------
  const modal = document.getElementById("pwModal");
  const modalCard = modal?.querySelector(".modal-card");
  const form = document.getElementById("promptForm");
  const pwForm = document.getElementById("pwForm");
  const pwInput = document.getElementById("pwInput");
  const pwMsg = document.getElementById("pwMsg");
  const pwEye = document.getElementById("pwEye");
  const bars = [0,1,2,3].map(i => document.getElementById(`pwBar${i}`));
  const queryEcho = document.getElementById("queryEcho");
  const sessionIdEl = document.getElementById("sessionId");
  const closeBtn = document.getElementById("modalClose");
  const cancelBtn = document.getElementById("pwCancel");

  function randSession(){
    const rand = () => Math.random().toString(16).slice(2, 6);
    return `nx-${rand()}-${rand()}`;
  }

  function openModal(query){
    if (!modal) return;
    if (queryEcho) queryEcho.textContent = query || "(empty prompt)";
    if (sessionIdEl) sessionIdEl.textContent = randSession();
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    if (pwInput){
      pwInput.value = "";
      updateStrength("");
      setTimeout(() => pwInput.focus(), 280);
    }
    if (pwMsg){ pwMsg.textContent = ""; pwMsg.className = "pw-msg mono-micro"; }
  }
  function closeModal(){
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  // Hero prompt submit
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input?.value?.trim() || "";
    openModal(q);
  });

  // Also open on Enter in chip focus (native form submit covers input)
  closeBtn?.addEventListener("click", closeModal);
  cancelBtn?.addEventListener("click", closeModal);
  modal?.querySelector(".modal-backdrop")?.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal?.classList.contains("open")) closeModal();
  });

  // Password strength
  function updateStrength(v){
    let score = 0;
    if (v.length >= 4) score = 1;
    if (v.length >= 8) score = 2;
    if (v.length >= 10 && /[0-9]/.test(v)) score = 3;
    if (v.length >= 12 && /[^A-Za-z0-9]/.test(v)) score = 4;
    bars.forEach((b, i) => b?.classList.toggle("on", i < score));
  }
  pwInput?.addEventListener("input", () => updateStrength(pwInput.value));

  // Show/hide
  pwEye?.addEventListener("click", () => {
    if (!pwInput) return;
    const isPw = pwInput.type === "password";
    pwInput.type = isPw ? "text" : "password";
    pwEye.style.color = isPw ? "var(--accent)" : "";
  });

  // Auth submit — no real auth; theatrical feedback.
  pwForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!pwInput || !pwMsg) return;
    const val = pwInput.value;
    if (val.length < 4){
      pwMsg.textContent = "// key rejected — minimum 4 characters";
      pwMsg.className = "pw-msg mono-micro err";
      modalCard?.classList.remove("shake");
      // restart animation
      void modalCard?.offsetWidth;
      modalCard?.classList.add("shake");
      return;
    }
    pwMsg.textContent = "// handshake in progress…";
    pwMsg.className = "pw-msg mono-micro";
    let dots = 0;
    const t = setInterval(() => {
      dots = (dots + 1) % 4;
      pwMsg.textContent = "// handshake in progress" + ".".repeat(dots);
    }, 250);
    setTimeout(() => {
      clearInterval(t);
      pwMsg.textContent = "// access denied · credentials not recognised";
      pwMsg.className = "pw-msg mono-micro err";
      modalCard?.classList.remove("shake");
      void modalCard?.offsetWidth;
      modalCard?.classList.add("shake");
    }, 1600);
  });

})();
