const RETURNING_KEY = "yg:returning";

let portfolioInitialized = false;

// Shared proximity loop: eases each item's --effect toward its target with
// frame-rate independent smoothing, so colour, shift and marker scale stay in step.
function attachProximity(list, items, activeIndex) {
  const targets = items.map(() => 0);
  const current = items.map(() => 0);
  const ease = (p) => p * p * (3 - 2 * p);
  const radius = 130;
  let raf = null;
  let last = 0;

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const k = 1 - Math.exp(-dt / 0.1);
    let moving = false;
    items.forEach((item, i) => {
      const target = Math.max(targets[i], activeIndex === i ? 1 : 0);
      const next = current[i] + (target - current[i]) * k;
      const settled = Math.abs(target - next) < 0.0015;
      current[i] = settled ? target : next;
      item.style.setProperty("--effect", current[i].toFixed(4));
      if (!settled) moving = true;
    });
    raf = moving ? requestAnimationFrame(frame) : null;
  }

  function start() {
    if (raf != null) cancelAnimationFrame(raf);
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  list.addEventListener("pointermove", (event) => {
    const rect = list.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    items.forEach((item, i) => {
      const center = item.offsetLeft + item.offsetWidth / 2;
      targets[i] = ease(Math.max(0, 1 - Math.abs(pointerX - center) / radius));
    });
    start();
  });

  list.addEventListener("pointerleave", () => {
    targets.fill(0);
    start();
  });

  start();
  return { setActive: (i) => { activeIndex = i; start(); } };
}

function initPortfolioInteractions() {
  if (!portfolioInitialized) {
    const buttons = [...document.querySelectorAll(".filter-button")];
    const calmFilter = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const FADE = 190;

    buttons.forEach((button) => {
      button.setAttribute("aria-pressed", button.classList.contains("is-active") ? "true" : "false");
      button.addEventListener("click", () => {
        const filter = button.dataset.filter;
        buttons.forEach((item) => {
          item.classList.remove("is-active");
          item.setAttribute("aria-pressed", "false");
        });
        button.classList.add("is-active");
        button.setAttribute("aria-pressed", "true");

        // Filtering used to be display:none on click, so the grid changed
        // between frames and the act of filtering was never seen. Cards now
        // fade out before they leave the flow, and fade in when they return.
        document.querySelectorAll(".project-card").forEach((card) => {
          const category = card.dataset.category || "";
          const keep = filter === "all" || category.includes(filter);
          if (calmFilter) {
            card.classList.toggle("is-muted", !keep);
            card.classList.remove("is-leaving", "is-entering");
            return;
          }
          if (keep) {
            card.classList.remove("is-leaving");
            if (!card.classList.contains("is-muted")) return;
            card.classList.remove("is-muted");
            card.classList.add("is-entering");
            requestAnimationFrame(() => requestAnimationFrame(() => card.classList.remove("is-entering")));
            return;
          }
          if (card.classList.contains("is-muted")) return;
          card.classList.add("is-leaving");
          window.setTimeout(() => {
            if (card.classList.contains("is-leaving")) card.classList.add("is-muted");
          }, FADE);
        });
      });
    });

    portfolioInitialized = true;
  }

  // AccordionGallery: one panel open at a time, the rest collapsed and desaturated.
  // Port of the React component in plain JS and CSS transitions, no GSAP needed.
  document.querySelectorAll("[data-accordion]").forEach((root) => {
    if (root.dataset.accordionReady) return;
    root.dataset.accordionReady = "true";

    const panels = [...root.querySelectorAll(".ag-panel")];
    if (!panels.length) return;
    const expandRatio = 0.52;
    const grow = panels.length > 1 ? (expandRatio * (panels.length - 1)) / (1 - expandRatio) : 1;
    const tilt = 8;

    function setActive(index) {
      panels.forEach((panel, i) => {
        const isActive = i === index;
        panel.classList.toggle("ag-panel--active", isActive);
        panel.style.flexGrow = isActive ? grow : 1;
        panel.style.transform = isActive ? "rotateY(0deg)" : `rotateY(${i < index ? tilt : -tilt}deg)`;
      });
    }

    panels.forEach((panel, i) => {
      panel.addEventListener("mouseenter", () => setActive(i));
      panel.addEventListener("focus", () => setActive(i));
      panel.addEventListener("click", () => setActive(i));
      panel.addEventListener("keydown", (event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault();
          panels[(i + 1) % panels.length].focus();
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault();
          panels[(i - 1 + panels.length) % panels.length].focus();
        }
      });
    });

    setActive(panels.findIndex((p) => p.classList.contains("ag-panel--active")) || 0);
  });

  // Cursor spotlight over the work grid, adapted from MagicBento. Each card's glow
  // intensity is driven by its distance from the pointer, so the grid lights up under
  // the hand without any card needing its own listener.
  const bentoGrid = document.querySelector(".work-grid");
  if (bentoGrid && !bentoGrid.dataset.bentoReady && !window.matchMedia("(pointer: coarse)").matches) {
    bentoGrid.dataset.bentoReady = "true";
    const radius = 320;
    const proximity = radius * 0.5;
    const fade = radius * 0.75;

    const onMove = (event) => {
      const section = bentoGrid.closest("section");
      const box = section.getBoundingClientRect();
      const inside =
        event.clientX >= box.left && event.clientX <= box.right &&
        event.clientY >= box.top && event.clientY <= box.bottom;

      bentoGrid.querySelectorAll(".project-card").forEach((card) => {
        if (!inside) return card.style.setProperty("--glow", "0");
        const r = card.getBoundingClientRect();
        const dx = event.clientX - (r.left + r.width / 2);
        const dy = event.clientY - (r.top + r.height / 2);
        const dist = Math.max(0, Math.hypot(dx, dy) - Math.max(r.width, r.height) / 2);
        let glow = 0;
        if (dist <= proximity) glow = 1;
        else if (dist <= fade) glow = (fade - dist) / (fade - proximity);
        card.style.setProperty("--glow", glow.toFixed(3));
        card.style.setProperty("--glow-x", `${((event.clientX - r.left) / r.width) * 100}%`);
        card.style.setProperty("--glow-y", `${((event.clientY - r.top) / r.height) * 100}%`);
      });
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", () => {
      bentoGrid.querySelectorAll(".project-card").forEach((c) => c.style.setProperty("--glow", "0"));
    });
  }

  // Case pages use the same top nav as the index. The Projects item opens a
  // numbered archive menu, so project-to-project movement stays in the navbar.
  const PROJECT_INDEX = [
    ["chula", "The Incomplete Archive", "Reveal"],
    ["tangle-holder", "Tangle to Holder", "Mediate"],
    ["thermal-commons", "Thermal Commons", "Mediate"],
    ["make-a-wish", "Make a Wish", "Mediate"],
    ["roll-up", "Rollup", "Translate"],
    ["shadow-within", "Shadow Within", "Translate"],
    ["liminal-grounds", "Liminal Ground", "Reveal"],
    ["simultaneously", "Simultaneously", "Reveal"],
    ["new-orleans", "New Orleans", "Translate"],
    ["los-balcones", "Los Balcones Ecotourism", "Mediate"]
  ];

  document.querySelectorAll("[data-case-switch]").forEach((holder) => {
    if (holder.dataset.switchReady) return;
    holder.dataset.switchReady = "true";
    const onIndex = !!document.querySelector(".work-grid");
    const home = onIndex ? "" : "index.html";

    const here = document.body.dataset.project || "";
    const projectItems = PROJECT_INDEX.map(([id, title], i) => {
      const number = String(i + 1).padStart(3, "0");
      return `<a class="project-menu__item${id === here ? " is-here" : ""}" role="menuitem" href="${id}-case.html"><span>${number}</span><strong>${title}</strong></a>`;
    }).join("");

    holder.innerHTML =
      `<a class="nav-drop__flat case-switch__meta" href="${home}#about">+ About</a>` +
      `<div class="nav-drop project-menu" data-nav-drop>` +
      `<button class="nav-drop__trigger case-switch__meta project-menu__trigger" type="button" aria-expanded="false">` +
      `<span class="project-menu__label">+ Projects</span>` +
      `<span class="project-menu__folder" aria-hidden="true"><span class="folder-back"></span><span class="folder-tab"></span><span class="folder-front"></span></span>` +
      `</button>` +
      `<div class="nav-drop__panel project-menu__panel" role="menu">${projectItems}</div>` +
      `</div>` +
      `<a class="nav-drop__flat case-switch__meta" href="${home}#methodology">+ Methodology</a>` +
      `<a class="nav-drop__flat case-switch__meta" href="${home}#writing">+ Writing</a>`;
  });

  // Open on hover for pointers, on click for touch and keyboards, and close on
  // Escape or on leaving the whole group.
  document.querySelectorAll("[data-nav-drop]").forEach((drop) => {
    if (drop.dataset.dropReady) return;
    drop.dataset.dropReady = "true";
    const trigger = drop.querySelector(".nav-drop__trigger");
    let timer = null;

    const open = () => {
      window.clearTimeout(timer);
      drop.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
    };
    const close = (delay = 140) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        drop.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
      }, delay);
    };

    drop.addEventListener("mouseenter", open);
    drop.addEventListener("mouseleave", () => close());
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      drop.classList.contains("is-open") ? close(0) : open();
    });
    drop.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close(0);
    });
    document.addEventListener("click", (e) => {
      if (!drop.contains(e.target)) close(0);
    });
  });

  const scrollAutoplayVideos = document.querySelectorAll("video[data-scroll-autoplay]");
  if (scrollAutoplayVideos.length) {
    const playVideo = (video) => {
      const attempt = video.play();
      if (attempt && typeof attempt.catch === "function") attempt.catch(() => {});
    };
    const mediaObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          if (entry.isIntersecting) playVideo(video);
          else video.pause();
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.42 }
    );
    scrollAutoplayVideos.forEach((video) => mediaObserver.observe(video));
  }

  // A lead film marked for reveal stays held back until it is actually reached,
  // so scrolling into it is what brings it in rather than finding it already
  // sitting there.
  const leadReveals = [...document.querySelectorAll("[data-lead-reveal]")];
  if (leadReveals.length) {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (calm || !("IntersectionObserver" in window)) {
      leadReveals.forEach((section) => section.classList.add("is-revealed"));
    } else {
      const leadObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-revealed");
            leadObserver.unobserve(entry.target);
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -14% 0px" }
      );
      leadReveals.forEach((section) => leadObserver.observe(section));
      // If no scroll signal ever arrives, the film must not stay hidden.
      window.setTimeout(() => leadReveals.forEach((s) => s.classList.add("is-revealed")), 6000);
    }
  }

  // One nav component now, on the index and on every case page: it stays visible
  // and follows the light or dark ground of whatever section is passing under it.
  const caseNav = document.querySelector(".line-nav.case-nav");
  if (caseNav && !caseNav.dataset.navReady) {
    caseNav.dataset.navReady = "true";
    caseNav.classList.add("is-visible");
    const darkObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) caseNav.classList.toggle("on-dark", entry.target.classList.contains("dark-nav"));
        });
      },
      { rootMargin: "-6% 0px -88% 0px", threshold: 0 }
    );
    document.querySelectorAll("[data-nav-section]").forEach((section) => darkObserver.observe(section));
  }

  const ensureTransitionOverlay = () => {
    let overlay = document.querySelector("[data-page-transition]");
    if (overlay) return overlay;

    const style = document.createElement("style");
    style.textContent = `
      .page-transition {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: grid;
        place-items: center;
        overflow: hidden;
        background: #050505;
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transition: opacity 90ms steps(1, end), visibility 90ms steps(1, end);
      }
      .page-transition.is-active {
        opacity: 1;
        visibility: visible;
      }
      .page-transition video {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    `;
    document.head.append(style);

    overlay = document.createElement("div");
    overlay.className = "page-transition";
    overlay.dataset.pageTransition = "true";
    overlay.innerHTML = '<video src="web-assets/transition-video.mp4" muted playsinline preload="auto"></video>';
    document.body.append(overlay);
    return overlay;
  };

  document.querySelectorAll('a[href$=".html"], a[href*=".html#"]').forEach((link) => {
    if (link.dataset.transitionReady) return;
    link.dataset.transitionReady = "true";
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("http") || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      try {
        sessionStorage.setItem(RETURNING_KEY, "1");
      } catch (err) {
        /* private mode: the splash simply plays again */
      }
      const overlay = ensureTransitionOverlay();
      const video = overlay.querySelector("video");
      overlay.classList.add("is-active");
      if (video) {
        video.currentTime = 0;
        video.play().catch(() => {});
      }
      window.setTimeout(() => {
        window.location.href = href;
      }, 650);
    });
  });
}


function initPageField() {
  const host = document.getElementById("page-grain");
  if (!host || !window.mountGrainient) return;
  // The gradient that used to be the opening screen. It was good, it was just
  // in the way; under the page it does the same work without the toll gate.
  window.mountGrainient(host, {
      color1: "#D1DDD3",
      color2: "#FE7141",
      color3: "#B497CF",
      timeSpeed: 0.8,
      colorBalance: -0.23,
      warpStrength: 1.4,
      warpFrequency: 5.6,
      warpSpeed: 4.1,
      warpAmplitude: 33,
      blendAngle: 6,
      blendSoftness: 0.28,
      rotationAmount: 800,
      noiseScale: 2.0,
      grainAmount: 0.14,
      grainScale: 2.0,
      grainAnimated: false,
      contrast: 1.75,
      gamma: 1.2,
      saturation: 0.9,
      centerX: 0.0,
      centerY: 0.05,
      zoom: 1
    });
}



// The photo wall in the opening. Three columns, each holding one portrait and
// one landscape frame, so every column is the same height. A frame only ever
// receives a photograph of its own shape, which is why nothing shifts when the
// picture changes and why no photograph is ever cropped to fit.
function initPhotoWall() {
  const wall = document.querySelector("[data-photo-wall]");
  if (!wall) return;
  // Four pools: her own photographs in both shapes, and the other pictures,
  // which are all landscape. Three landscape frames are fixed to that second
  // pool so the wall is never twelve pictures of the same person.
  const seq = (prefix, n) => Array.from({ length: n }, (_, i) => `web-assets/me/${prefix}-${String(i + 1).padStart(2, "0")}.jpg`);
  const pools = {
    "me:portrait": seq("me-p", 18),
    "me:land": seq("me-l", 17),
    "ot:portrait": seq("me-l", 17),
    "ot:land": seq("ot-l", 10),
  };
  const shuffle = (a) => {
    const out = a.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  const queues = {};
  Object.keys(pools).forEach((k) => { queues[k] = shuffle(pools[k]); });
  const showing = new Set();

  const take = (kind) => {
    for (let guard = 0; guard < pools[kind].length * 2; guard++) {
      if (!queues[kind].length) queues[kind] = shuffle(pools[kind]);
      const next = queues[kind].shift();
      if (!showing.has(next)) return next;
    }
    return pools[kind][0];
  };

  const frames = [...wall.querySelectorAll(".ph")];
  if (!frames.length) return;

  // Claim the seeded pictures up front, so a frame drawn earlier in the DOM
  // cannot pick one that a later frame already has painted on screen.
  frames.forEach((frame) => {
    const seeded = frame.querySelector("img").getAttribute("src");
    if (seeded) showing.add(seeded);
  });

  frames.forEach((frame) => {
    const shape = frame.classList.contains("ph--portrait") ? "portrait" : "land";
    frame.dataset.kind = `${frame.dataset.pool || "me"}:${shape}`;
    const [front, back] = frame.querySelectorAll("img");
    // Frames that shipped with a src already painted before this ran. Keep that
    // picture rather than swapping it out and paying for the download twice.
    const seeded = front.getAttribute("src");
    const src = seeded || take(frame.dataset.kind);
    if (!seeded) front.src = src;
    back.src = src;
    frame.dataset.current = src;
    showing.add(src);
  });

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const swap = (frame) => {
    const [front, back] = frame.querySelectorAll("img");
    const next = take(frame.dataset.kind);
    if (!next || next === frame.dataset.current) return;
    back.src = next;
    const reveal = () => {
      frame.classList.add("is-swapping");
      window.setTimeout(() => {
        front.src = next;
        showing.delete(frame.dataset.current);
        showing.add(next);
        frame.dataset.current = next;
        frame.classList.remove("is-swapping");
      }, 460);
    };
    if (back.complete) reveal();
    else back.addEventListener("load", reveal, { once: true });
  };

  let last = -1;
  window.setInterval(() => {
    if (document.hidden) return;
    let i = Math.floor(Math.random() * frames.length);
    if (i === last && frames.length > 1) i = (i + 1) % frames.length;
    last = i;
    swap(frames[i]);
  }, 1500);
}


// Watch elements for entering the viewport. IntersectionObserver does the work
// where it runs, and a passive scroll listener covers the cases where it does
// not, so nothing can stay hidden because one API stayed quiet. Both paths call
// the same handler, and the listener detaches once every element has fired.
function whenInView(elements, onEnter, bottomMargin) {
  const pending = new Set(elements);
  if (!pending.size) return;
  const margin = typeof bottomMargin === "number" ? bottomMargin : 0.12;

  const fire = (el) => {
    if (!pending.has(el)) return;
    pending.delete(el);
    onEnter(el);
  };

  const sweep = () => {
    const limit = window.innerHeight * (1 - margin);
    pending.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < limit && r.bottom > 0) fire(el);
    });
    if (!pending.size) {
      window.removeEventListener("scroll", sweep);
      window.removeEventListener("resize", sweep);
    }
  };

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          io.unobserve(entry.target);
          fire(entry.target);
        });
      },
      { threshold: 0, rootMargin: `0px 0px -${Math.round(margin * 100)}% 0px` }
    );
    pending.forEach((el) => io.observe(el));
  }

  let sawSignal = false;
  const noteAndSweep = () => {
    sawSignal = true;
    sweep();
  };

  window.addEventListener("scroll", noteAndSweep, { passive: true });
  window.addEventListener("resize", noteAndSweep);
  window.addEventListener("load", sweep);
  sweep();

  // Last resort. If several seconds pass with no scroll signal at all, this
  // browser is not going to deliver one, and hidden content must not be the
  // price of an effect that cannot run. Show everything and let it go.
  window.setTimeout(() => {
    if (sawSignal || !pending.size) return;
    [...pending].forEach(fire);
    window.removeEventListener("scroll", noteAndSweep);
    window.removeEventListener("resize", noteAndSweep);
  }, 6000);
}


// FoldText, ported from the React Bits component to plain DOM and CSS
// transitions. The original drives GSAP with a ScrollTrigger; this site has no
// build step and no dependencies, so the panels are laid out here and the
// easing, stagger and crease are handled by CSS. Hinge is the top edge,
// split is by word, trigger is scroll, once.
function initFoldText() {
  const targets = document.querySelectorAll("[data-fold]");
  if (!targets.length) return;

  targets.forEach((root) => {
    if (root.dataset.foldReady) return;
    root.dataset.foldReady = "true";
    const text = root.textContent.trim();
    const stagger = Number(root.dataset.foldStagger) || 45;
    const italic = (root.dataset.foldItalic || "").toLowerCase();

    // The plain sentence stays in the accessibility tree; the panels are decoration.
    const sr = document.createElement("span");
    sr.className = "fold-sr";
    sr.textContent = text;

    const visual = document.createElement("span");
    visual.className = "fold-visual";
    visual.setAttribute("aria-hidden", "true");

    let i = 0;
    text.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) {
        const gap = document.createElement("span");
        gap.className = "fold-space";
        gap.textContent = part.replace(/ /g, "\u00A0");
        visual.appendChild(gap);
        return;
      }
      const seg = document.createElement("span");
      seg.className = "fold-seg";
      const piece = document.createElement("span");
      piece.className = "fold-piece";
      // Splitting into panels drops any inline markup, so the one italic word
      // the headline is meant to carry is named on the element instead.
      if (italic && part.replace(/[^A-Za-z']/g, "").toLowerCase() === italic) {
        piece.classList.add("fold-em");
      }
      piece.textContent = part;
      piece.style.setProperty("--i", String(i));
      piece.style.transitionDelay = `${i * stagger}ms, ${i * stagger}ms, ${i * stagger}ms`;
      seg.appendChild(piece);
      visual.appendChild(seg);
      i += 1;
    });

    root.textContent = "";
    root.append(sr, visual);
  });

  whenInView([...targets], (root) => root.classList.add("is-unfolded"), 0.18);
}

// Blocks rise into place as the page scrolls. The hidden state is only applied
// once this has run, so with no JS every block simply renders in place.
function initScrollReveal() {
  const groups = [
    [".section-kicker", 0],
    [".hero-photos .ph", 60],
    [".hero-intro > *", 70],
    [".hero-intro .tag-row .tag", 60],
    [".hero-outro .outro-row", 90],
    [".work-grid .project-card", 55],
    [".work-filters .filter-button, .filter-row .filter-button", 40],
    [".shelf .shelf-book", 55],
    [".method-intro > *", 70],
    [".method-panel", 80],
    [".moves-stack", 0],
    [".writing .section-inner > p", 0],
    [".case-copy > *", 70],
    [".case-gallery figure", 70],
    [".paper-extras > *", 70],
    [".meta-grid > div", 34],
    [".archive-index article", 55]
  ];

  const seen = new Set();
  const items = [];
  groups.forEach(([selector, step]) => {
    let n = 0;
    document.querySelectorAll(selector).forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);
      el.setAttribute("data-rise", "");
      if (step) el.style.setProperty("--rise-delay", `${Math.min(n, 8) * step}ms`);
      items.push(el);
      n += 1;
    });
  });
  if (!items.length) return;

  document.documentElement.classList.add("has-reveal");

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    items.forEach((el) => el.setAttribute("data-risen", ""));
    return;
  }

  whenInView(items, (el) => el.setAttribute("data-risen", ""));
}


// The paper screenshot only appears on hover, so a lazy image would still be
// fetching at the moment it is asked for and the first hover would show an
// empty frame. Fetch it once its card is near the viewport instead.
function initShelfPreload() {
  const pages = [...document.querySelectorAll(".shelf-page")];
  if (!pages.length) return;
  whenInView(
    pages.map((img) => img.closest(".shelf-book") || img),
    (card) => {
      const img = card.querySelector ? card.querySelector(".shelf-page") : card;
      if (img && img.loading === "lazy") img.loading = "eager";
    },
    0
  );
}


// The other introduction. A folded card in the dark, opened by pulling it up.
// The photographs live around it as a loose collage that keeps changing while
// the writing is read. Escape and the close control both shut it, focus goes
// back to the phrase that opened it, and the page behind stays locked.

function initCardScatter(aside) {
  const scatterHost = aside.querySelector("[data-scatter]");
  const card = aside.querySelector("[data-card]");
  if (!scatterHost || !card) return null;

  const leaves = [...scatterHost.querySelectorAll(".leaf")];
  if (!leaves.length) return null;

  // Deterministic noise, so the arrangement is the same each time rather than
  // rearranging itself on every open.
  const rand = (i, salt) => {
    const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  const place = () => {
    const box = card.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 22;

    // The four bands of dark the card leaves behind. Photographs are dealt
    // into them in proportion to how much room each one actually has, which
    // is what stops everything piling into the top corners and leaves the
    // long side bands empty.
    const bands = [
      { key: "L", x0: 0, x1: box.left - gap, y0: 0, y1: vh },
      { key: "R", x0: box.right + gap, x1: vw, y0: 0, y1: vh },
      { key: "T", x0: box.left - gap, x1: box.right + gap, y0: 0, y1: box.top - gap },
      { key: "B", x0: box.left - gap, x1: box.right + gap, y0: box.bottom + gap, y1: vh },
    ].map((b) => ({ ...b, w: Math.max(0, b.x1 - b.x0), h: Math.max(0, b.y1 - b.y0) }))
     .filter((b) => b.w > 70 && b.h > 70);

    if (!bands.length) return;
    const total = bands.reduce((sum, b) => sum + b.w * b.h, 0);

    leaves.forEach((leaf, i) => {
      // Pick a band by area, so a wide side gets more pictures than a sliver.
      let pick = rand(i, 7) * total;
      let band = bands[bands.length - 1];
      for (const b of bands) {
        pick -= b.w * b.h;
        if (pick <= 0) { band = b; break; }
      }

      // Size to the band, not to a fixed range: a narrow strip gets small
      // frames rather than frames that hang over the card.
      const cap = Math.max(70, Math.min(176, band.w - 16, band.h - 16));
      const w = Math.round(70 + rand(i, 1) * Math.max(0, cap - 70));
      const h = w * 1.28;

      leaf.style.setProperty("--w", `${w}px`);
      leaf.style.setProperty("--tilt", `${(rand(i, 2) * 15 - 7.5).toFixed(1)}deg`);
      leaf.style.setProperty("--peak", (0.6 + rand(i, 5) * 0.36).toFixed(2));

      // Place the whole frame inside the band. Guarding the centre point was
      // the bug before: a frame centred on the card's edge still lay half
      // across the writing.
      const x = band.x0 + rand(i, 3) * Math.max(1, band.w - w);
      const y = band.y0 + rand(i, 4) * Math.max(1, band.h - h);

      leaf.style.left = `${Math.round(x)}px`;
      leaf.style.top = `${Math.round(Math.min(y, vh - h * 0.55))}px`;
      leaf.style.zIndex = String(Math.round(rand(i, 6) * 5));
    });
  };

  let phase = 0;
  let ratio = 0.2;
  let timer = 0;
  let bound = false;

  // A shifting subset is out at any moment, so the dark keeps moving. Reading
  // further widens the subset rather than simply adding to it.
  const paint = () => {
    const density = 0.3 + ratio * 0.42;
    leaves.forEach((leaf, i) => {
      const wave = (Math.sin(i * 1.7 + phase) + 1) / 2;
      leaf.classList.toggle("is-out", wave < density);
      leaf.style.transitionDelay = `${(i % 7) * 45}ms`;
    });
  };

  return {
    start() {
      place();
      paint();
      window.clearInterval(timer);
      timer = window.setInterval(() => { phase += 0.62; paint(); }, 2600);
      if (bound) return;
      const scroll = aside.querySelector(".card__scroll");
      if (!scroll) return;
      bound = true;
      scroll.addEventListener("scroll", () => {
        const max = scroll.scrollHeight - scroll.clientHeight;
        ratio = max > 0 ? scroll.scrollTop / max : 1;
        paint();
      }, { passive: true });
    },
    clear() {
      window.clearInterval(timer);
      timer = 0;
      leaves.forEach((leaf) => leaf.classList.remove("is-out"));
    },
  };
}


function initAside() {
  const aside = document.getElementById("aside");
  const triggers = [...document.querySelectorAll("[data-open-aside]")];
  if (!aside || !triggers.length) return;

  const card = aside.querySelector("[data-card]");
  const faceClosed = aside.querySelector(".card__face--closed");
  const faceOpen = aside.querySelector(".card__face--open");
  const closeButton = aside.querySelector(".card__close");
  const scatter = initCardScatter(aside);
  let lastFocus = null;

  const fold = () => {
    if (!card) return;
    card.classList.remove("is-open", "is-dragging");
    card.style.removeProperty("--pull");
    card.setAttribute("aria-expanded", "false");
    if (faceOpen) faceOpen.hidden = true;
    if (faceClosed) faceClosed.hidden = false;
  };

  const unfold = () => {
    if (!card || card.classList.contains("is-open")) return;
    card.classList.add("is-open");
    card.setAttribute("aria-expanded", "true");
    card.style.removeProperty("--pull");
    faceClosed.hidden = true;
    if (scatter) scatter.start();
    // Wait for the silhouette to have somewhere to put the writing.
    window.setTimeout(() => {
      faceOpen.hidden = false;
      const scroll = faceOpen.querySelector(".card__scroll");
      if (scroll) scroll.scrollTop = 0;
      const title = faceOpen.querySelector("h2");
      if (title) {
        title.setAttribute("tabindex", "-1");
        title.focus({ preventScroll: true });
      }
    }, 380);
  };

  const open = () => {
    lastFocus = document.activeElement;
    aside.hidden = false;
    fold();
    document.body.classList.add("aside-open");
    triggers.forEach((t) => t.setAttribute("aria-expanded", "true"));
    // A frame between unhiding and the class lets the transition run.
    window.requestAnimationFrame(() => aside.classList.add("is-open"));
    window.setTimeout(() => aside.classList.add("is-open"), 30);
    if (card) card.focus({ preventScroll: true });
  };

  const close = () => {
    aside.classList.remove("is-open");
    document.body.classList.remove("aside-open");
    if (scatter) scatter.clear();
    fold();
    triggers.forEach((t) => t.setAttribute("aria-expanded", "false"));
    window.setTimeout(() => { aside.hidden = true; }, 380);
    const back = lastFocus && lastFocus.focus && lastFocus !== document.body ? lastFocus : triggers[0];
    back.focus({ preventScroll: true });
  };

  // Opening the card is a pull, not a button. It follows the drag so the
  // gesture is legible while it happens, and springs back if not committed.
  if (card) {
    let startY = null;
    const THRESHOLD = 74;

    card.addEventListener("pointerdown", (event) => {
      if (card.classList.contains("is-open")) return;
      if (event.target.closest("[data-close-aside]")) return;
      startY = event.clientY;
      card.classList.add("is-dragging");
      card.setPointerCapture(event.pointerId);
    });

    card.addEventListener("pointermove", (event) => {
      if (startY === null) return;
      const dy = Math.max(-140, Math.min(0, event.clientY - startY));
      card.style.setProperty("--pull", `${dy}px`);
    });

    card.addEventListener("pointerup", (event) => {
      if (startY === null) return;
      const dy = event.clientY - startY;
      card.classList.remove("is-dragging");
      card.style.removeProperty("--pull");
      startY = null;
      if (dy <= -THRESHOLD) unfold();
    });

    card.addEventListener("pointercancel", () => {
      startY = null;
      card.classList.remove("is-dragging");
      card.style.removeProperty("--pull");
    });

    // A drag is not reachable from a keyboard, so the card is a control too.
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      unfold();
    });
  }

  triggers.forEach((t) => t.addEventListener("click", open));
  aside.querySelectorAll("[data-close-aside]").forEach((el) => el.addEventListener("click", close));

  document.addEventListener("keydown", (event) => {
    if (aside.hidden) return;
    if (event.key === "Escape") { close(); return; }
    if (event.key !== "Tab") return;
    const focusable = [...aside.querySelectorAll("button, a[href], [tabindex]:not([tabindex='-1'])")]
      .filter((el) => el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}


const scrubRegistry = [];
let scrubLoopQueued = false;
let scrubListenersReady = false;

function runScrubbers() {
  scrubLoopQueued = false;
  const vh = window.innerHeight || document.documentElement.clientHeight || 1;
  scrubRegistry.forEach(({ root, onProgress }) => {
    const rect = root.getBoundingClientRect();
    const start = vh * 0.86;
    const end = vh * 0.22;
    const span = Math.max(1, start - end + rect.height * 0.45);
    const progress = Math.max(0, Math.min(1, (start - rect.top) / span));
    onProgress(progress);
  });
}

function queueScrubbers() {
  if (scrubLoopQueued) return;
  scrubLoopQueued = true;
  requestAnimationFrame(runScrubbers);
}

function registerScrub(root, onProgress) {
  scrubRegistry.push({ root, onProgress });
  if (!scrubListenersReady) {
    scrubListenersReady = true;
    window.addEventListener("scroll", queueScrubbers, { passive: true });
    window.addEventListener("resize", queueScrubbers);
    window.addEventListener("load", queueScrubbers);
  }
  queueScrubbers();
}


function initWordReveal() {
  document.querySelectorAll("[data-scroll-reveal]").forEach((root) => {
    if (root.dataset.srReady) return;
    root.dataset.srReady = "true";
    const blur = Number(root.dataset.srBlur || 6);
    const base = Number(root.dataset.srOpacity || 0.2);
    const html = root.innerHTML;
    // Only split the bare text nodes, so inline emphasis inside the sentence survives.
    root.innerHTML = html.replace(/>([^<]+)</g, (m, text) =>
      ">" + text.replace(/(\S+)/g, '<span class="sr-word">$1</span>') + "<"
    );
    if (!root.querySelector(".sr-word")) {
      root.innerHTML = html.replace(/(\S+)/g, '<span class="sr-word">$1</span>');
    }
    const words = [...root.querySelectorAll(".sr-word")];
    if (!words.length) return;
    root.classList.add("sr-active");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      words.forEach((word) => { word.style.opacity = "1"; word.style.filter = "none"; });
      return;
    }
    registerScrub(root, (p) => {
      words.forEach((word, i) => {
        const local = Math.max(0, Math.min(1, p * (words.length + 6) - i));
        word.style.opacity = String(base + (1 - base) * local);
        word.style.filter = local >= 1 ? "none" : `blur(${(1 - local) * blur}px)`;
      });
    });
  });
}

function initScrollFloat() {
  document.querySelectorAll("[data-scroll-float]").forEach((root) => {
    if (root.dataset.sfReady) return;
    root.dataset.sfReady = "true";
    const text = root.textContent.trim();
    // Splitting into characters drops inline markup, so the italic word the
    // headline carries is named on the element and reapplied per character.
    const italic = (root.dataset.sfItalic || "").toLowerCase();
    const italicAt = italic ? text.toLowerCase().indexOf(italic) : -1;
    const sr = document.createElement("span");
    sr.className = "fold-sr";
    sr.textContent = text;
    const visual = document.createElement("span");
    visual.className = "sf-visual";
    visual.setAttribute("aria-hidden", "true");
    [...text].forEach((ch, idx) => {
      const span = document.createElement("span");
      span.className = "sf-char";
      if (italicAt >= 0 && idx >= italicAt && idx < italicAt + italic.length) {
        span.classList.add("sf-em");
      }
      span.textContent = ch === " " ? "\u00A0" : ch;
      visual.appendChild(span);
    });
    root.textContent = "";
    root.append(sr, visual);
    const chars = [...visual.querySelectorAll(".sf-char")];
    root.classList.add("sf-active");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      chars.forEach((c) => { c.style.opacity = "1"; c.style.transform = "none"; });
      return;
    }
    // back.inOut(2), the easing the original names, written out.
    const backInOut = (x, s) => {
      const k = s * 1.525;
      return x < 0.5
        ? (Math.pow(2 * x, 2) * ((k + 1) * 2 * x - k)) / 2
        : (Math.pow(2 * x - 2, 2) * ((k + 1) * (2 * x - 2) + k) + 2) / 2;
    };
    registerScrub(root, (p) => {
      chars.forEach((c, i) => {
        const raw = Math.max(0, Math.min(1, p * (chars.length + 10) - i));
        const e = backInOut(raw, 2);
        c.style.opacity = String(raw);
        c.style.transform = `translateY(${(1 - e) * 120}%) scale(${0.7 + e * 0.3}, ${2.3 - e * 1.3})`;
      });
    });
  });
}

// SpotlightCard. A soft radial follows the cursor across each card, replacing
// the neon edge that used to trace it.
function initSpotlight() {
  const cards = document.querySelectorAll("[data-spotlight]");
  if (!cards.length) return;
  cards.forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
      card.style.setProperty("--spot", "1");
    });
    card.addEventListener("pointerleave", () => card.style.setProperty("--spot", "0"));
  });
}

// The landing field.
function initHubField() {
  const host = document.querySelector("[data-hubfield]");
  if (host && window.mountHubField) window.mountHubField(host);
}





// Click a case image to see it properly. One overlay is built once and reused,
// so the page does not carry a copy of every picture at full size. Escape, the
// close button and the backdrop all dismiss it, and focus goes back to the
// image that opened it so keyboard users do not lose their place.
function initLightbox() {
  const zoomable = [...document.querySelectorAll("[data-zoom]")];
  if (!zoomable.length || document.querySelector(".lightbox")) return;

  const box = document.createElement("div");
  box.className = "lightbox";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.hidden = true;
  box.innerHTML = '<button class="lightbox-close" type="button" aria-label="Close image">\u2715</button>'
    + '<img alt=""><p class="lightbox-caption"></p>';
  document.body.appendChild(box);

  const full = box.querySelector("img");
  const caption = box.querySelector(".lightbox-caption");
  const closeButton = box.querySelector(".lightbox-close");
  let opener = null;

  const close = () => {
    box.classList.remove("is-open");
    document.body.classList.remove("lightbox-open");
    window.setTimeout(() => { box.hidden = true; }, 220);
    if (opener) opener.focus();
    opener = null;
  };

  const open = (image) => {
    opener = image;
    full.src = image.currentSrc || image.src;
    full.alt = image.alt || "";
    caption.textContent = image.alt || "";
    box.setAttribute("aria-label", image.alt || "Enlarged image");
    box.hidden = false;
    document.body.classList.add("lightbox-open");
    // Focus has to wait for is-open: until that class lands the overlay is
    // still visibility:hidden, and a hidden element cannot take focus, which
    // would leave a keyboard user tabbing around the page behind the picture.
    requestAnimationFrame(() => {
      box.classList.add("is-open");
      closeButton.focus();
    });
  };

  zoomable.forEach((image) => {
    image.tabIndex = 0;
    image.setAttribute("role", "button");
    if (!image.getAttribute("aria-label")) image.setAttribute("aria-label", `${image.alt || "Image"}, open larger`);
    image.addEventListener("click", () => open(image));
    image.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      open(image);
    });
  });

  closeButton.addEventListener("click", close);
  box.addEventListener("click", (event) => {
    if (event.target === box) close();
  });
  document.addEventListener("keydown", (event) => {
    if (box.hidden) return;
    if (event.key === "Escape") {
      close();
      return;
    }
    if (event.key !== "Tab") return;
    // Only one stop in here, so Tab simply stays on it rather than walking off
    // into the page underneath.
    event.preventDefault();
    closeButton.focus();
  });
}


// Media rows sit at one shared height. Flex cannot know an image's proportions
// on its own, so each figure's grow factor is set from the picture it holds:
// width then follows aspect ratio, heights land equal, and the row fills the
// column at any width without a single hard-coded size.
function initMediaRows() {
  document.querySelectorAll(".section-media.media-row").forEach((row) => {
    row.querySelectorAll("figure").forEach((figure) => {
      const media = figure.querySelector("img, video");
      if (!media) return;
      const apply = () => {
        const w = media.naturalWidth || media.videoWidth;
        const h = media.naturalHeight || media.videoHeight;
        if (!w || !h) return;
        // The frame's own border is a fixed width on both figures, so it
        // distorts the ratio differently on a wide frame than a narrow one and
        // the heights drift apart. Reserve it as the basis and let only the
        // picture itself share out what is left.
        const edge = media.getBoundingClientRect().width - media.clientWidth
          + parseFloat(getComputedStyle(media).paddingLeft || 0)
          + parseFloat(getComputedStyle(media).paddingRight || 0);
        figure.style.flex = `${w / h} 1 ${Math.max(0, edge)}px`;
      };
      apply();
      if (media.tagName === "IMG") {
        if (!media.complete) media.addEventListener("load", apply, { once: true });
      } else {
        media.addEventListener("loadedmetadata", apply, { once: true });
      }
    });
  });
}

// Six Moves, one at a time. Full tab semantics rather than six buttons and a
// class toggle: arrow keys move between them, only the selected tab is in the
// tab order, and the panel is announced as belonging to its tab.
function initMoveTabs() {
  const list = document.querySelector("[data-moves]");
  if (!list) return;
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  if (!tabs.length) return;

  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const select = (next, { focus = true } = {}) => {
    tabs.forEach((tab) => {
      const on = tab === next;
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(tab.getAttribute("aria-controls"));
      if (!panel) return;
      panel.hidden = !on;
      // A panel shown by this control is on screen whether or not the scroll
      // reveal ever saw it, so it must not stay parked in its hidden state.
      if (!on) return;
      // The scroll reveal can never have seen this panel: it was hidden, and a
      // hidden element does not intersect anything. Mark it arrived by hand.
      panel.setAttribute("data-risen", "");
      if (calm || !panel.animate) return;
      panel.animate(
        [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }],
        { duration: 240, easing: "cubic-bezier(0.455, 0.03, 0.515, 0.955)" }
      );
    });
    if (focus) next.focus();
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => select(tab, { focus: false }));
    tab.addEventListener("keydown", (event) => {
      const i = tabs.indexOf(tab);
      const keys = {
        ArrowRight: i + 1,
        ArrowDown: i + 1,
        ArrowLeft: i - 1,
        ArrowUp: i - 1,
        Home: 0,
        End: tabs.length - 1,
      };
      if (!(event.key in keys)) return;
      event.preventDefault();
      select(tabs[(keys[event.key] + tabs.length) % tabs.length]);
    });
  });
}

// Keep a capability note on screen: anchor it to whichever edge of the tag
// leaves room, rather than centring it and letting it run off the viewport.
function initTagNotes() {
  const tags = [...document.querySelectorAll(".tag.has-note")];
  if (!tags.length) return;
  const place = () => {
    tags.forEach((tag) => {
      tag.classList.remove("note-left", "note-right");
      const note = tag.querySelector(".tag-note");
      if (!note) return;
      const t = tag.getBoundingClientRect();
      const width = Math.min(300, note.scrollWidth || 300);
      const centre = t.left + t.width / 2;
      if (centre - width / 2 < 16) tag.classList.add("note-left");
      else if (centre + width / 2 > window.innerWidth - 16) tag.classList.add("note-right");
    });
  };
  place();
  window.addEventListener("resize", () => {
    window.clearTimeout(window._tagNoteTimer);
    window._tagNoteTimer = window.setTimeout(place, 140);
  });
  window.addEventListener("load", place);

  // Hover alone left these notes unreachable on touch and unadvertised on
  // desktop. Clicking pins one open; only one at a time, because two stacked
  // notes overlap each other and neither can be read.
  const close = (tag) => tag.setAttribute("aria-expanded", "false");
  const closeAll = () => tags.forEach(close);

  tags.forEach((tag) => {
    if (tag.tagName !== "BUTTON") return;
    tag.addEventListener("click", (event) => {
      event.stopPropagation();
      const open = tag.getAttribute("aria-expanded") === "true";
      closeAll();
      if (!open) {
        place();
        tag.setAttribute("aria-expanded", "true");
      }
    });
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".tag.has-note")) closeAll();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const open = tags.find((t) => t.getAttribute("aria-expanded") === "true");
    if (!open) return;
    close(open);
    open.focus();
  });
}


// Cover videos only play while they are on screen. Five of them decoding at
// once, alongside the field canvas and the drifting photographs, is real work
// for no gain when four of them are past the fold.
function initVideoThrift() {
  const vids = [...document.querySelectorAll(".project-media video[autoplay], .ph video")];
  if (!vids.length || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const v = entry.target;
        if (entry.isIntersecting) {
          const p = v.play();
          if (p && p.catch) p.catch(() => {});
        } else if (!v.paused) {
          v.pause();
        }
      });
    },
    { rootMargin: "200px 0px" }
  );
  vids.forEach((v) => io.observe(v));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) return;
    vids.forEach((v) => { if (!v.paused) v.pause(); });
  });
}

window.initPortfolioInteractions = initPortfolioInteractions;
window.addEventListener("DOMContentLoaded", () => {
  initPageField();
  initPortfolioInteractions();
  initPhotoWall();
  initFoldText();
  initScrollReveal();
  initShelfPreload();
  initAside();
  initHubField();
  initWordReveal();
  initScrollFloat();
  initSpotlight();
  initTagNotes();
  initMoveTabs();
  initMediaRows();
  initLightbox();
  initVideoThrift();
});
