// Three scroll pieces for the home page: the sideways project strip, the
// profile whose photo follows the paragraph being read, and the colour wash
// behind the project index.
(() => {
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const narrow = () => window.matchMedia("(max-width: 760px)").matches;
  const rows = [...document.querySelectorAll(".studio .work-list [data-project]")];

  // The strip is built from the index rows, so a project is only ever listed once.
  const strip = document.querySelector("[data-work-strip]");
  const track = strip && strip.querySelector("[data-strip-track]");
  if (strip && track && rows.length) {
    let wip = 0;
    let done = 0;
    rows.forEach((row) => {
      const card = document.createElement("a");
      card.className = "strip-card";
      card.href = row.getAttribute("href");
      card.style.setProperty("--card", row.dataset.color || "#d8d6d0");
      const img = row.dataset.poster || (row.dataset.kind === "image" ? row.dataset.src : "");
      const num = row.classList.contains("is-wip")
        ? `-${String(++wip).padStart(2, "0")}`
        : String(++done).padStart(2, "0");
      const fit = row.dataset.fit === "contain" ? " is-contain" : "";
      const tag = row.querySelector("em")?.textContent || "";
      card.innerHTML =
        `<span class="strip-card__media${fit}"><img src="${img}" alt="" loading="lazy"></span>` +
        `<span class="strip-card__foot"><span class="strip-card__num">${num}</span>` +
        `<strong>${row.dataset.title}</strong><span class="strip-card__tag">${tag}</span></span>`;
      track.append(card);
    });

    const cards = [...track.children];
    const counter = strip.querySelector("[data-strip-count]");
    let span = 0;

    const size = () => {
      if (narrow()) {
        strip.style.height = "";
        track.style.transform = "";
        return;
      }
      span = Math.max(0, track.scrollWidth - strip.clientWidth);
      strip.style.height = `${span + window.innerHeight}px`;
      paint();
    };

    // Vertical progress through the section becomes horizontal travel, and
    // the ground takes the colour of whichever card sits nearest the middle.
    const paint = () => {
      if (narrow()) return;
      const top = strip.getBoundingClientRect().top;
      const p = Math.min(1, Math.max(0, -top / (span || 1)));
      track.style.transform = `translate3d(${-p * span}px,0,0)`;
      const box = strip.getBoundingClientRect();
      const mid = box.left + box.width / 2;
      let best = cards[0];
      let gap = Infinity;
      cards.forEach((card) => {
        const r = card.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - mid);
        if (d < gap) { gap = d; best = card; }
        if (r.left < box.right - box.width * 0.08 && r.right > box.left) card.classList.add("is-open");
      });
      strip.style.setProperty("--ground", best.style.getPropertyValue("--card"));
      if (counter) counter.textContent = best.querySelector(".strip-card__num").textContent;
    };

    let ticking = false;
    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { paint(); ticking = false; });
    }, { passive: true });
    window.addEventListener("resize", size);
    window.addEventListener("load", size);
    size();

    if (narrow() || still) cards.forEach((c) => c.classList.add("is-open"));
  }

  // The studio ground leans toward the hovered project's colour, and the
  // preview opens from its centre each time the project changes.
  const studio = document.querySelector(".studio");
  const media = document.querySelector(".studio .project-preview__media");
  let current = null;
  rows.forEach((row) => {
    row.addEventListener("mouseenter", () => {
      if (current === row) return;
      current = row;
      studio?.style.setProperty("--wash", row.dataset.color || "transparent");
      if (media && !still) {
        media.classList.remove("is-opening");
        void media.offsetWidth;
        media.classList.add("is-opening");
      }
    });
  });
  document.querySelector(".studio .work-list")?.addEventListener("mouseleave", () => {
    current = null;
    studio?.style.removeProperty("--wash");
  });

  // Profile: each paragraph brings its own photo, and a star flickers on the change.
  const profile = document.querySelector("[data-profile]");
  if (profile) {
    const photos = [...profile.querySelectorAll(".profile__frame img")];
    const paras = [...profile.querySelectorAll(".who")];
    const count = profile.querySelector("[data-photo-count]");
    const stars = [...profile.querySelectorAll(".sparkle")];
    let shown = 0;
    const show = (n) => {
      if (n === shown || !photos[n]) return;
      photos[shown].classList.remove("is-on");
      photos[n].classList.add("is-on");
      paras.forEach((p, i) => p.classList.toggle("is-current", i === n));
      shown = n;
      if (count) count.textContent = String(n + 1).padStart(2, "0");
      stars.forEach((star, i) => {
        star.classList.remove("is-flash");
        void star.getBoundingClientRect();
        star.style.animationDelay = `${i * 140}ms`;
        star.classList.add("is-flash");
      });
    };
    paras[0]?.classList.add("is-current");
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) show(Number(e.target.dataset.photo)); });
      }, { rootMargin: "-45% 0px -45% 0px" });
      paras.forEach((p) => io.observe(p));
    }

    const panel = profile.querySelector("[data-profile-panel]");
    const opener = profile.querySelector("[data-profile-open]");
    const setOpen = (open) => {
      panel.classList.toggle("is-open", open);
      panel.setAttribute("aria-hidden", String(!open));
      opener.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("panel-open", open);
    };
    opener?.addEventListener("click", () => setOpen(!panel.classList.contains("is-open")));
    profile.querySelectorAll("[data-profile-close]").forEach((b) => b.addEventListener("click", () => setOpen(false)));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
    document.addEventListener("click", (e) => {
      if (panel.classList.contains("is-open") && !panel.contains(e.target) && !opener.contains(e.target)) setOpen(false);
    });
  }
})();
