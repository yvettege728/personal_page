const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const RETURNING_KEY = "yg:returning";
let previewTimers = [];
let surfaceTimer = null;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function clearPreviewTimers() {
  previewTimers.forEach((timer) => window.clearInterval(timer));
  previewTimers = [];
}

function initOpeningGate(onClear) {
  const clear = () => {
    if (typeof onClear === "function") onClear();
  };

  const gate = document.querySelector("[data-opening-gate]");
  const video = gate?.querySelector("video");
  let returning = false;
  try {
    returning = sessionStorage.getItem(RETURNING_KEY) === "1";
    if (returning) sessionStorage.removeItem(RETURNING_KEY);
  } catch (err) {
    returning = false;
  }

  if (!gate || reducedMotion || returning) {
    gate?.classList.add("is-hidden");
    clear();
    return;
  }

  let cleared = false;
  const hide = () => {
    gate.classList.add("is-hidden");
    if (cleared) return;
    cleared = true;
    // The gate fades rather than cuts, so the set behind it starts arriving
    // partway through the fade instead of waiting for an empty beat.
    window.setTimeout(clear, 240);
  };

  video?.play().catch(() => {});
  video?.addEventListener("ended", hide, { once: true });
  gate.addEventListener("click", hide, { once: true });
  window.setTimeout(hide, 9000);
}

// The television, the reel behind its glass, and the two annotations around it
// are held out of the page until the opening is done, then brought in on one
// staggered cue driven entirely by CSS.
let heroEntranceQueued = false;

function playHeroEntrance() {
  if (heroEntranceQueued) return;
  heroEntranceQueued = true;
  const go = () => document.body.classList.add("hero-ready");
  // One painted frame in the held-back state first, so the set arrives on a
  // transition instead of simply being there.
  window.requestAnimationFrame(() => window.requestAnimationFrame(go));
  // requestAnimationFrame does not run in a background tab, and the hero must
  // never depend on the page having been looked at to become visible.
  window.setTimeout(go, 220);
}

function createMedia(project, options = {}) {
  const slideshow = project.dataset.images;
  if (slideshow && !options.posterOnly) {
    const sources = slideshow.split("|").map((item) => item.trim()).filter(Boolean);
    const wrapper = document.createElement("div");
    wrapper.className = "project-slideshow";
    wrapper.dataset.slideshow = "true";
    if (project.dataset.interval) wrapper.dataset.interval = project.dataset.interval;
    sources.forEach((src, index) => {
      const image = document.createElement("img");
      image.className = index === 0 ? "is-active" : "";
      image.src = src;
      image.alt = `${project.dataset.title} preview ${index + 1}`;
      wrapper.append(image);
    });
    return wrapper;
  }

  const src = options.posterOnly ? project.dataset.poster || project.dataset.src : project.dataset.src;
  const isVideo = project.dataset.kind === "video" && !options.posterOnly;

  if (isVideo) {
    const video = document.createElement("video");
    video.src = src;
    video.poster = project.dataset.poster || "";
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute("aria-label", `${project.dataset.title} preview`);
    return video;
  }

  const img = document.createElement("img");
  img.src = src;
  img.alt = `${project.dataset.title} preview`;
  return img;
}

function playPreview(container) {
  const video = container.querySelector("video");
  video?.play().catch(() => {});

  container.querySelectorAll("[data-slideshow]").forEach((slideshow) => {
    const frames = [...slideshow.querySelectorAll("img")];
    if (frames.length < 2 || reducedMotion) return;

    let active = 0;
    const interval = Number.parseInt(slideshow.dataset.interval || "500", 10);
    const timer = window.setInterval(() => {
      frames[active].classList.remove("is-active");
      active = (active + 1) % frames.length;
      frames[active].classList.add("is-active");
    }, Number.isFinite(interval) ? interval : 500);
    previewTimers.push(timer);
  });
}

function initSurfaceReel() {
  const tv = document.querySelector("[data-tv-screen]");
  if (!tv) return;
  const video = tv.querySelector("video");
  video?.play().catch(() => {});

  const frames = [...tv.querySelectorAll(".surface-frame")];
  if (frames.length < 2 || reducedMotion) return;

  let active = Math.max(0, frames.findIndex((frame) => frame.classList.contains("is-active")));
  if (surfaceTimer) window.clearInterval(surfaceTimer);

  surfaceTimer = window.setInterval(() => {
    tv.classList.add("is-switching");
    frames[active].classList.remove("is-active");
    active = (active + 1) % frames.length;
    frames[active].classList.add("is-active");
    window.setTimeout(() => tv.classList.remove("is-switching"), 160);
  }, 700);
}

function initWork() {
  const projects = [...document.querySelectorAll("[data-project]")];
  const media = document.querySelector("[data-preview-media]");
  const title = document.querySelector("[data-preview-title]");
  const kicker = document.querySelector("[data-preview-kicker]");
  const year = document.querySelector("[data-preview-year]");
  const heading = document.querySelector("[data-preview-heading]");
  const copy = document.querySelector("[data-preview-copy]");
  const link = document.querySelector("[data-preview-link]");
  if (!projects.length || !media) return;

  function setProject(project) {
    projects.forEach((item) => item.classList.toggle("is-active", item === project));

    clearPreviewTimers();
    media.replaceChildren(createMedia(project));
    playPreview(media);

    title.textContent = project.dataset.title || "";
    kicker.textContent = project.dataset.kicker || "";
    year.textContent = project.dataset.year || "";
    heading.textContent = project.dataset.title || "";
    copy.textContent = project.dataset.copy || "";
    link.href = project.href;
  }

  projects.forEach((project) => {
    project.addEventListener("mouseenter", () => setProject(project));
    project.addEventListener("focus", () => setProject(project));
  });

  setProject(projects[0]);
}

function initMoves() {
  const tip = document.querySelector("[data-move-tip]");
  if (!tip) return;
  document.querySelectorAll("[data-tip]").forEach((button) => {
    const update = () => { tip.textContent = button.dataset.tip; };
    button.addEventListener("mouseenter", update);
    button.addEventListener("focus", update);
  });
}

function initMethodCards() {
  const cards = [...document.querySelectorAll(".method-card")];
  if (!cards.length) return;

  if (!("IntersectionObserver" in window) || reducedMotion) {
    cards.forEach((card) => card.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle("is-visible", entry.isIntersecting);
    });
  }, { threshold: 0.28, rootMargin: "0px 0px -12% 0px" });

  cards.forEach((card) => observer.observe(card));

  function updateRibbon() {
    const viewport = window.innerHeight || 1;
    const center = viewport * 0.54;
    cards.forEach((card, index) => {
      const rect = card.getBoundingClientRect();
      const cardCenter = rect.top + rect.height / 2;
      const distance = (cardCenter - center) / viewport;
      const offset = Math.max(-58, Math.min(58, distance * 118));
      card.style.setProperty("--card-offset", `${offset.toFixed(1)}px`);
      card.style.zIndex = String(index + 1);
    });
  }

  updateRibbon();
  window.addEventListener("scroll", updateRibbon, { passive: true });
  window.addEventListener("resize", updateRibbon);
}

function initMethodBackdrop() {
  const section = document.querySelector(".methodology");
  if (!section || reducedMotion) return;

  function update() {
    const rect = section.getBoundingClientRect();
    const pinStart = 86;
    const pinEnd = window.innerHeight * 0.62;
    const writing = document.querySelector(".writing-dark");
    const writingRect = writing?.getBoundingClientRect();
    const writingIncoming = writingRect ? writingRect.top < window.innerHeight * 0.92 : false;
    const isPinned = rect.top <= pinStart && rect.bottom >= pinEnd;
    const isAfter = rect.bottom < pinEnd || writingIncoming;
    section.classList.toggle("is-pinned", isPinned);
    section.classList.toggle("is-after", isAfter);
  }

  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
}

// The positioning statement no longer fades or blurs into view: it reads at
// full clarity throughout and only its colour deepens, from a dark gray to
// black, as the reader scrolls past it.
function initPositionReveal() {
  const el = document.querySelector("[data-position-reveal]");
  if (!el) return;

  const from = [150, 150, 150];
  const to = [10, 10, 10];
  const setColor = (eased) => {
    const r = Math.round(from[0] + (to[0] - from[0]) * eased);
    const g = Math.round(from[1] + (to[1] - from[1]) * eased);
    const b = Math.round(from[2] + (to[2] - from[2]) * eased);
    el.style.setProperty("--position-color", `rgb(${r}, ${g}, ${b})`);
  };

  if (reducedMotion) {
    setColor(1);
    return;
  }

  function update() {
    const rect = el.getBoundingClientRect();
    const viewport = window.innerHeight || 1;
    const progress = clamp((viewport * 0.82 - rect.top) / (viewport * 0.62), 0, 1);
    setColor(1 - Math.pow(1 - progress, 3));
  }

  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
}

// Encrypted-text reveal for the About intro line: the line sits scrambled
// until it is scrolled into view, then resolves into real words left to
// right, once, the way aceternity's encrypted-text component does.
function initAboutDecrypt() {
  const el = document.querySelector("[data-about-reveal]");
  if (!el) return;

  const original = (el.textContent || "").trim();
  el.setAttribute("role", "text");
  el.setAttribute("aria-label", original);

  if (reducedMotion) return;

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const scrambleFrom = (progress) =>
    original
      .split("")
      .map((letter, index) => {
        if (letter === " ") return " ";
        return index < progress ? original[index] : chars[Math.floor(Math.random() * chars.length)];
      })
      .join("");

  el.setAttribute("aria-hidden", "true");
  el.textContent = scrambleFrom(0);

  let played = false;
  let timer = 0;

  const play = () => {
    if (played) return;
    played = true;
    el.setAttribute("data-decrypting", "true");
    let frame = 0;
    timer = window.setInterval(() => {
      frame += 1;
      el.textContent = scrambleFrom(frame / 1.7);
      if (frame > original.length * 2) {
        window.clearInterval(timer);
        el.textContent = original;
        el.removeAttribute("data-decrypting");
        el.removeAttribute("aria-hidden");
      }
    }, 24);
  };

  if (!("IntersectionObserver" in window)) {
    play();
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        play();
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.4, rootMargin: "0px 0px -10% 0px" }
  );
  observer.observe(el);
}

function initSkillStrips() {
  const tags = [...document.querySelectorAll(".skill-strips button.has-note")];
  if (!tags.length) return;

  const close = (tag) => tag.setAttribute("aria-expanded", "false");
  const closeAll = () => tags.forEach(close);

  function place() {
    tags.forEach((tag) => {
      tag.classList.remove("note-left", "note-right");
      const note = tag.querySelector(".tag-note");
      if (!note) return;
      const tagRect = tag.getBoundingClientRect();
      const width = Math.min(360, note.scrollWidth || 360);
      const center = tagRect.left + tagRect.width / 2;
      if (center - width / 2 < 16) tag.classList.add("note-left");
      else if (center + width / 2 > window.innerWidth - 16) tag.classList.add("note-right");
    });
  }

  tags.forEach((tag) => {
    tag.addEventListener("mouseenter", place);
    tag.addEventListener("focus", place);
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
    if (!event.target.closest(".skill-strips button.has-note")) closeAll();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const open = tags.find((tag) => tag.getAttribute("aria-expanded") === "true");
    if (!open) return;
    close(open);
    open.focus();
  });

  place();
  window.addEventListener("resize", place);
}

function initTreeCard() {
  const trigger = document.querySelector("[data-tree-open]");
  const open = document.querySelector(".tree-card__open");
  const video = open?.querySelector("video");
  const treeButton = open?.querySelector("[data-tree-swap]");
  const treeCopy = open?.querySelector(".tree-card__content");
  const closeButton = open?.querySelector("[data-tree-close]");
  if (!trigger || !open) return;
  let endTimer = 0;

  const resetTree = () => {
    open.classList.remove("is-tree-open");
    treeButton?.setAttribute("aria-expanded", "false");
    if (treeCopy) treeCopy.scrollTop = 0;
  };

  const openCard = () => {
    trigger.setAttribute("aria-expanded", "true");
    resetTree();
    document.body.classList.add("tree-card-open");
    open.hidden = false;
    video?.play().catch(() => {});
  };

  const closeCard = (restoreFocus = false) => {
    window.clearTimeout(endTimer);
    endTimer = 0;
    open.hidden = true;
    resetTree();
    document.body.classList.remove("tree-card-open");
    trigger.setAttribute("aria-expanded", "false");
    if (restoreFocus) trigger.focus({ preventScroll: true });
  };

  // Opening used to arm itself a second after the pointer merely rested on
  // the trigger, with no cooldown against re-arming. Closing the card hands
  // the trigger's own screen position back to whatever the pointer is
  // sitting near at that moment (the card is centred over the page, and the
  // trigger sits in the paragraph right underneath it), so the very next
  // pixel of mouse movement after a close could re-enter the trigger and
  // queue another open, which is what made it feel like the card would not
  // stop popping back up. Opening is a click now, full stop; the blur lift
  // on hover/focus is handled entirely by :hover/:focus-visible in CSS.
  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    if (open.hidden) openCard();
    else trigger.setAttribute("aria-expanded", "true");
  });

  treeButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    open.classList.add("is-tree-open");
    treeButton.setAttribute("aria-expanded", "true");
  });

  closeButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeCard(true);
  });

  // The last line of the other introduction is the end of the piece. Reaching
  // it is the reader saying they are done, so the card lets itself out rather
  // than waiting to be dismissed by a click nobody can find.
  //
  // This watches the scroll position rather than an IntersectionObserver: the
  // copy carries trailing padding, so at full scroll the last line has already
  // travelled back off the top of the window and an observer would never see
  // it. Once the line has been reached the visit is over, whether the reader
  // then keeps scrolling or stops.
  const lastLine = open.querySelector(".tree-card__copy p:last-child");
  if (lastLine && treeCopy) {
    const armClose = () => {
      if (endTimer) return;
      if (open.hidden || !open.classList.contains("is-tree-open")) return;
      // Long enough to actually read the line it closes on.
      endTimer = window.setTimeout(() => closeCard(), 2800);
    };

    treeCopy.addEventListener("scroll", () => {
      if (open.hidden || !open.classList.contains("is-tree-open")) return;
      const frame = treeCopy.getBoundingClientRect();
      const line = lastLine.getBoundingClientRect();
      const reached = line.top < frame.bottom - 6 && line.bottom > frame.top - 6;
      const bottomed = treeCopy.scrollTop >= treeCopy.scrollHeight - treeCopy.clientHeight - 24;
      if (reached || bottomed) armClose();
    }, { passive: true });
  }

  document.addEventListener("pointerdown", (event) => {
    if (open.hidden) return;
    if (open.contains(event.target) || trigger.contains(event.target)) return;
    closeCard();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !open.hidden) closeCard(true);
  });

  open.addEventListener("pointerdown", (event) => event.stopPropagation());
}

// The closing television and the recede of the section above it now live in
// contact-stage.js, so the home page and the case pages share one behaviour.

function initPageTransition() {
  const links = [...document.querySelectorAll('a[href$=".html"], a[href*=".html#"]')];
  if (!links.length || reducedMotion) return;

  const overlay = document.createElement("div");
  overlay.className = "page-transition";
  overlay.innerHTML = '<video src="web-assets/transition-video.mp4" muted playsinline preload="auto"></video>';
  document.body.append(overlay);
  const video = overlay.querySelector("video");

  links.forEach((link) => {
    if (link.dataset.v2TransitionReady) return;
    link.dataset.v2TransitionReady = "true";
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http") || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target) return;
      event.preventDefault();
      overlay.classList.add("is-active");
      video.currentTime = 0;
      video.play().catch(() => {});
      window.setTimeout(() => {
        window.location.href = href;
      }, 650);
    });
  });
}

function initWritingPreview() {
  const links = [...document.querySelectorAll("[data-writing-preview]")];
  if (!links.length || window.matchMedia("(pointer: coarse)").matches) return;

  const popover = document.createElement("div");
  popover.className = "writing-popover";
  popover.setAttribute("aria-hidden", "true");
  const image = document.createElement("img");
  image.alt = "";
  popover.append(image);
  document.body.append(popover);

  links.forEach((link) => {
    link.addEventListener("mouseenter", () => {
      image.src = link.dataset.writingPreview;
      popover.classList.add("is-visible");
    });
    link.addEventListener("mouseleave", () => popover.classList.remove("is-visible"));
    link.addEventListener("focus", () => {
      image.src = link.dataset.writingPreview;
      popover.classList.add("is-visible");
    });
    link.addEventListener("blur", () => popover.classList.remove("is-visible"));
  });
}

function initDecryptLinks() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+*/_<>[]";
  const links = [...document.querySelectorAll("[data-decrypt]")];
  if (!links.length || reducedMotion) return;

  links.forEach((link) => {
    const original = link.dataset.text || link.textContent;
    let frame = 0;
    let timer;

    const restore = () => {
      window.clearInterval(timer);
      link.textContent = original;
    };

    const scramble = () => {
      window.clearInterval(timer);
      frame = 0;
      timer = window.setInterval(() => {
        link.textContent = original
          .split("")
          .map((letter, index) => {
            if (letter === " ") return " ";
            if (index < frame / 1.8) return original[index];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("");
        frame += 1;
        if (frame > original.length * 2.1) restore();
      }, 24);
    };

    link.addEventListener("mouseenter", scramble);
    link.addEventListener("focus", scramble);
    link.addEventListener("mouseleave", restore);
    link.addEventListener("blur", restore);
  });
}

initOpeningGate(playHeroEntrance);
initSurfaceReel();
initWork();
initMoves();
initMethodCards();
initMethodBackdrop();
initPositionReveal();
initAboutDecrypt();
initSkillStrips();
initTreeCard();
initWritingPreview();
initDecryptLinks();
initPageTransition();
window.setTimeout(playHeroEntrance, 9600);
window.addEventListener("load", () => window.setTimeout(playHeroEntrance, 1200));
