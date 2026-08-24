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

// The positioning statement reads at full clarity throughout, never blurred,
// but it settles in on two channels at once: colour deepens from a dark gray
// to black, and the line lifts the last few pixels into place, the same
// fade-up used for the manifesto lines on eric-cole.framer.website.
// The dark writing section used to just appear once scrolled to. The
// heading and each entry now fade up in place as the section is reached,
// the row-by-row "SERVICES" reveal used on eric-cole.framer.website.
function initWritingReveal() {
  const targets = [document.querySelector(".writing-dark__intro"), ...document.querySelectorAll(".writing-table a")].filter(Boolean);
  if (!targets.length) return;

  if (reducedMotion || !("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-revealed"));
    return;
  }

  targets.forEach((el, index) => el.style.setProperty("--reveal-delay", `${Math.min(index, 7) * 70}ms`));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
  );
  targets.forEach((el) => observer.observe(el));
}

// Scroll Text Highlight, after Originkit's ScrollHighlight component: split
// into words, each dim until the paragraph scrolls through the centre of
// the screen, then lit word by word, scrubbed directly to scroll position
// rather than played on a timer. Reimplemented in vanilla JS/CSS (the site
// has no build step to hang GSAP off), and the reference's white-on-dark
// defaults (dimColor/highlightColor) are flipped for this site's ink-on-
// paper page. A short one-line paragraph would otherwise sweep across its
// own small height in a few dozen pixels of scroll; a viewport-relative
// floor keeps the sweep at a deliberate pace regardless of how tall the
// paragraph itself is.
function initScrollHighlight(selector) {
  const el = document.querySelector(selector);
  if (!el) return;

  const dim = [150, 150, 150];
  const highlight = [10, 10, 10];
  const spanWindow = 0.5; // fraction of the overall sweep each word's own transition takes

  const original = (el.textContent || "").trim();
  const words = original.split(/\s+/).filter(Boolean);
  el.setAttribute("role", "text");
  el.setAttribute("aria-label", original);
  el.textContent = "";
  const wordEls = words.map((word, index) => {
    const span = document.createElement("span");
    span.className = "reveal-word";
    span.textContent = word;
    el.append(span);
    if (index < words.length - 1) el.append(" ");
    return span;
  });

  const setColor = (span, t) => {
    const r = Math.round(dim[0] + (highlight[0] - dim[0]) * t);
    const g = Math.round(dim[1] + (highlight[1] - dim[1]) * t);
    const b = Math.round(dim[2] + (highlight[2] - dim[2]) * t);
    span.style.color = `rgb(${r}, ${g}, ${b})`;
  };

  if (reducedMotion) {
    wordEls.forEach((span) => setColor(span, 1));
    return;
  }

  const count = wordEls.length;

  function update() {
    const rect = el.getBoundingClientRect();
    const viewport = window.innerHeight || 1;
    const span = Math.max(rect.height, viewport * 0.55);
    // top center -> bottom center of a box "span" tall: 0 once the top
    // reaches mid-screen, 1 once the bottom (top + span) has passed it.
    const overall = clamp((viewport * 0.5 - rect.top) / span, 0, 1);
    wordEls.forEach((wordEl, index) => {
      const start = count > 1 ? (index / (count - 1)) * (1 - spanWindow) : 0;
      const local = clamp((overall - start) / spanWindow, 0, 1);
      setColor(wordEl, local);
    });
  }

  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
}

function initPositionReveal() {
  initScrollHighlight("[data-position-reveal]");
}

function initAboutReveal() {
  initScrollHighlight("[data-about-reveal]");
}

// Text Gather, after Originkit's MagneticPull component: every character
// starts scattered (random offset, rotation, dim) and gathers into place
// once, the first time its heading is scrolled into view. Existing markup
// (including the .script cursive spans already inside these headings) is
// left in place; only the text nodes inside it are split into per-character
// spans, so the cursive styling still applies to its own letters.
function initTextGather(selector) {
  document.querySelectorAll(selector).forEach((heading) => {
    const splitNode = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          [...child.textContent].forEach((ch) => {
            const span = document.createElement("span");
            span.className = "gather-char";
            span.textContent = ch === " " ? "\u00A0" : ch;
            frag.append(span);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          splitNode(child);
        }
      });
    };
    splitNode(heading);

    const chars = [...heading.querySelectorAll(".gather-char")];
    if (!chars.length) return;

    if (reducedMotion) {
      chars.forEach((c) => c.classList.add("is-gathered"));
      return;
    }

    chars.forEach((c) => {
      const x = (Math.random() * 2 - 1) * 120;
      const y = (Math.random() * 2 - 1) * 120;
      const r = (Math.random() * 2 - 1) * 14;
      c.style.setProperty("--gx", `${x.toFixed(1)}px`);
      c.style.setProperty("--gy", `${y.toFixed(1)}px`);
      c.style.setProperty("--gr", `${r.toFixed(1)}deg`);
    });

    const play = () => {
      chars.forEach((c, i) => {
        window.setTimeout(() => c.classList.add("is-gathered"), i * 18);
      });
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
      { threshold: 0.3, rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(heading);
  });
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
  let closeTimer = 0;
  let lockedScrollY = 0;

  const resetTree = () => {
    open.classList.remove("is-tree-open");
    treeButton?.setAttribute("aria-expanded", "false");
    if (treeCopy) treeCopy.scrollTop = 0;
  };

  // The card covers the page, but scrolling inside its own letter panel was
  // still reaching the page underneath once that panel hit its own top or
  // bottom edge. The body is held in place with position: fixed for exactly
  // as long as the card is open, then handed back its scroll position.
  const lockScroll = () => {
    lockedScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.style.top = `${-lockedScrollY}px`;
    document.body.classList.add("tree-card-open");
  };

  const unlockScroll = () => {
    document.body.classList.remove("tree-card-open");
    document.body.style.top = "";
    window.scrollTo(0, lockedScrollY);
  };

  const openCard = () => {
    window.clearTimeout(closeTimer);
    open.classList.remove("is-closing");
    trigger.setAttribute("aria-expanded", "true");
    resetTree();
    lockScroll();
    open.hidden = false;
    video?.play().catch(() => {});
  };

  // Closing now plays the card back out before it disappears, rather than
  // cutting straight to display: none. The page underneath is only handed
  // its scroll back once that exit has actually finished, so nothing shifts
  // while the card is still visible.
  const closeCard = (restoreFocus = false) => {
    window.clearTimeout(endTimer);
    endTimer = 0;
    if (open.hidden || open.classList.contains("is-closing")) return;

    trigger.setAttribute("aria-expanded", "false");
    window.clearTimeout(closeTimer);

    const finish = () => {
      open.hidden = true;
      open.classList.remove("is-closing");
      resetTree();
      unlockScroll();
      if (restoreFocus) trigger.focus({ preventScroll: true });
    };

    if (reducedMotion) {
      finish();
      return;
    }

    open.classList.add("is-closing");
    closeTimer = window.setTimeout(finish, 340);
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

// Shared by every [data-decrypt] link and by the two tree-card buttons: the
// label is overwritten with junk on hover, then resolves back into itself
// left to right, the same encrypted-text idiom as Originkit's Encrypt
// Button, just without a measured width or a light sweep, since these are
// plain-text labels rather than a fixed-size pill.
function wireDecrypt(el, triggerEl, text) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+*/_<>[]";
  const original = text || el.dataset.text || el.textContent;
  let frame = 0;
  let timer;

  const restore = () => {
    window.clearInterval(timer);
    el.textContent = original;
  };

  const scramble = () => {
    window.clearInterval(timer);
    frame = 0;
    timer = window.setInterval(() => {
      el.textContent = original
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

  (triggerEl || el).addEventListener("mouseenter", scramble);
  (triggerEl || el).addEventListener("focus", scramble);
  (triggerEl || el).addEventListener("mouseleave", restore);
  (triggerEl || el).addEventListener("blur", restore);
}

function initDecryptLinks() {
  const links = [...document.querySelectorAll("[data-decrypt]")];
  if (!links.length || reducedMotion) return;
  links.forEach((link) => wireDecrypt(link));
}

// The Open tag sits on the tree artwork with pointer-events disabled (clicks
// pass through to the tree button beneath it), so it cannot receive its own
// hover; it decrypts when the tree button underneath it is hovered instead.
// The Close button is a normal target and decrypts on its own hover.
function initTreeCardDecrypt() {
  if (reducedMotion) return;
  const tree = document.querySelector(".tree-card__tree");
  const hint = document.querySelector(".tree-card__hint");
  if (tree && hint) wireDecrypt(hint, tree, hint.textContent.trim());

  const close = document.querySelector("[data-tree-close]");
  if (close) wireDecrypt(close, close, close.textContent.trim());
}

initOpeningGate(playHeroEntrance);
initSurfaceReel();
initWork();
initMoves();
initMethodCards();
initMethodBackdrop();
initPositionReveal();
initAboutReveal();
initWritingReveal();
initTextGather("#projects-title, #method-title, #writing-title, #about-title");
initSkillStrips();
initTreeCard();
initWritingPreview();
initDecryptLinks();
initTreeCardDecrypt();
initPageTransition();
window.setTimeout(playHeroEntrance, 9600);
window.addEventListener("load", () => window.setTimeout(playHeroEntrance, 1200));
