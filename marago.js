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
    // Work in progress is one panel at the head of the strip (in the HTML);
    // finished projects follow it as cards.
    let done = 0;
    rows.filter((row) => !row.classList.contains("is-wip")).forEach((row) => {
      const card = document.createElement("a");
      card.className = "strip-card";
      card.href = row.getAttribute("href");
      card.style.setProperty("--card", row.dataset.color || "#d8d6d0");
      const img = row.dataset.poster || (row.dataset.kind === "image" ? row.dataset.src : "");
      const num = String(++done).padStart(2, "0");
      const fit = row.dataset.fit === "contain" ? " is-contain" : "";
      const tag = row.querySelector("em")?.textContent || "";
      card.innerHTML =
        `<span class="strip-card__media${fit}"><img src="${img}" alt="" loading="lazy"></span>` +
        `<span class="strip-card__foot"><span class="strip-card__num">${num}</span>` +
        `<strong>${row.dataset.title}</strong><span class="strip-card__tag">${tag}</span></span>`;
      track.append(card);
    });

    const cards = [...track.children];
    const numOf = (el) => el.dataset.num || el.querySelector(".strip-card__num")?.textContent || "";
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
      if (counter) counter.textContent = numOf(best);
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

  // Profile opening: a full-bleed photo with the line printed into it. As
  // you scroll on, "What I do" slides out from the right like a drawer,
  // holds while you read, then slides back before the story continues.
  const open = document.querySelector("[data-me-open]");
  const drawer = open?.querySelector("[data-me-drawer]");
  if (open && drawer) {
    const slide = () => {
      if (narrow() || open.offsetParent === null) { drawer.style.transform = ""; return; }
      const r = open.getBoundingClientRect();
      const run = Math.max(1, r.height - window.innerHeight);
      const p = Math.min(1, Math.max(0, -r.top / run));
      const k = (a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
      const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      const shown = ease(k(0.18, 0.4)) * (1 - ease(k(0.78, 0.96)));
      drawer.style.transform = `translateX(${(1 - shown) * 102}%)`;
      open.style.setProperty("--dim", String(shown * 0.35));
    };
    let busy = false;
    window.addEventListener("scroll", () => {
      if (busy) return;
      busy = true;
      requestAnimationFrame(() => { slide(); busy = false; });
    }, { passive: true });
    window.addEventListener("resize", slide);
    slide();
  }

  // Profile story: each paragraph brings its own photo (or a pair that
  // alternates), and a star flickers on the change.
  const profile = document.querySelector("[data-profile]");
  if (profile) {
    const photos = [...profile.querySelectorAll(".profile__frame img")];
    const paras = [...profile.querySelectorAll(".who")];
    const count = profile.querySelector("[data-photo-count]");
    const stars = [...profile.querySelectorAll(".sparkle")];
    let shown = -1;
    let pairTimer = null;
    const light = (img) => photos.forEach((ph) => ph.classList.toggle("is-on", ph === img));
    const show = (n) => {
      if (n === shown) return;
      const set = photos.filter((ph) => ph.dataset.for === String(n));
      if (!set.length) return;
      light(set[0]);
      window.clearInterval(pairTimer);
      if (set.length > 1 && !still) {
        let i = 0;
        pairTimer = window.setInterval(() => { i = (i + 1) % set.length; light(set[i]); }, 1800);
      }
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
    show(0);
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) show(Number(e.target.dataset.photo)); });
      }, { rootMargin: "-45% 0px -45% 0px" });
      paras.forEach((p) => io.observe(p));
    }
  }
})();
