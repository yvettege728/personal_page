// The fixed frame. A sidebar that never moves holds the name, the time in
// Cambridge and four sections; on the home page the stage beside it shows one
// section at a time, like turning to a page in a magazine. Case and writing
// pages get the same sidebar, so the frame stays put wherever you go.
(() => {
  const onIndex = !!document.querySelector("[data-view]");
  const home = onIndex ? "" : "index.html";
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const SECTIONS = [
    ["work", "Work", "Selected projects"],
    ["profile", "Profile", "Who I am · What I do"],
    ["writing", "Writing", "Essays & method"],
  ];

  let side = document.querySelector("[data-shell-side]");
  if (!side) {
    side = document.createElement("aside");
    side.className = "shell-side";
    document.body.prepend(side);
  }
  document.body.classList.add("has-shell");

  side.innerHTML = `
    <div class="shell-side__top">
      <a class="shell-side__brand" href="${home}#home" data-view-link="home" aria-label="Yvette Ge, home">
        <svg class="shell-side__mark" viewBox="0 0 300 230" aria-hidden="true"><path d="M44 74 C36 46 74 42 82 74 C90 108 100 126 118 122 C136 118 142 92 140 64 C146 118 150 168 122 190 C96 210 64 190 80 166 C96 144 148 150 180 128 C204 112 214 88 200 74 C186 60 160 72 162 96 C164 120 196 120 210 94 L214 76 C222 126 228 170 206 194 C188 212 168 200 178 182 C188 166 232 168 262 146"/></svg>
      </a>
      <p class="shell-side__where"><span class="shell-side__city">Cambridge, MA</span> <span data-clock>--:--</span> <span class="shell-side__tz">EST</span></p>
      <dl class="shell-side__day" data-day><div><dt>Now</dt><dd data-slot="0"></dd></div><div><dt>Next</dt><dd data-slot="1"></dd></div></dl>
      <button class="shell-side__menu" type="button" aria-expanded="false" data-menu>Menu</button>
    </div>
    <nav class="shell-side__nav" aria-label="Sections">
      ${SECTIONS.map(([id, label, sub]) =>
        `<a href="${home}#${id}" data-view-link="${id}"><strong>${label}</strong><small>${sub}</small></a>`).join("")}
    </nav>
    <p class="shell-side__foot">
      <a href="web-assets/Yvette_Ge_CV.pdf?v=20261024">CV</a>
      <a href="web-assets/Yvette_Ge_CV_ZH.pdf?v=20261024" lang="zh">中文简历</a>
      <a href="https://www.linkedin.com/in/yvette-ge-a43512228/" target="_blank" rel="noopener">LinkedIn</a>
      <a href="mailto:yvette_ge@gsd.harvard.edu">Email</a>
    </p>`;

  // The time where she is, to the minute, and a guess at her day: what she
  // is doing now and what comes next. Each part of the day has a few likely
  // answers; one is picked when the page opens and kept.
  const clock = side.querySelector("[data-clock]");
  const tz = side.querySelector(".shell-side__tz");
  const slots = [...side.querySelectorAll("[data-slot]")];
  const DAY = [
    [0, ["one more render", "asleep, almost"]],
    [2, ["asleep (finally)"]],
    [7, ["having granola", "having an acai bowl", "having a cinnamon roll"]],
    [8, ["on the way to get a matcha latte"]],
    [9, ["riding to MIT", "bouldering", "hot 26 yoga", "hot 84 yoga", "vinyasa class", "pilates class"]],
    [11, ["having a lesson", "group discussion"]],
    [12, ["lunch, then studio"]],
    [13, ["in studio", "TAing", "group discussion"]],
    [16, ["running along the Charles", "at the gym", "bouldering"]],
    [18, ["grocery shopping", "dinner, probably"]],
    [20, ["watching the NBA", "still in studio"]],
    [22, ["one more render", "reading in bed"]],
  ];
  const pick = Math.floor(Math.random() * 60);
  const tick = () => {
    const now = new Date();
    const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "America/New_York", hour: "2-digit", hourCycle: "h23" }).format(now));
    let at = 0;
    DAY.forEach(([h], i) => { if (hour >= h) at = i; });
    slots.forEach((slot) => {
      const options = DAY[(at + Number(slot.dataset.slot) + DAY.length) % DAY.length][1];
      const text = options[(pick + Number(slot.dataset.slot)) % options.length];
      if (slot.textContent !== text) {
        slot.classList.remove("is-in");
        void slot.offsetWidth;
        slot.textContent = text;
        slot.classList.add("is-in");
      }
    });
    clock.textContent = new Intl.DateTimeFormat("en-GB", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit" }).format(now);
    const name = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", timeZoneName: "short" })
      .formatToParts(now).find((part) => part.type === "timeZoneName");
    if (name) tz.textContent = name.value;
  };
  tick();
  window.setInterval(tick, 20000);

  // The dot cursor, on desktops with a real pointer only.
  if (!still && window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1024px)").matches) {
    const dot = document.createElement("div");
    dot.className = "dot-cursor";
    document.body.append(dot);
    document.documentElement.classList.add("has-dot");
    let mx = 0, my = 0, x = 0, y = 0, seen = false;
    const clickable = (el) => !!el?.closest?.("a, button, [role='button'], label, summary, [data-project], video[controls]");
    window.addEventListener("mousemove", (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (!seen) { x = mx; y = my; seen = true; dot.classList.add("is-on"); }
      dot.classList.toggle("is-big", clickable(e.target));
    }, { passive: true });
    document.addEventListener("mouseleave", () => dot.classList.remove("is-on"));
    document.addEventListener("mouseenter", () => { if (seen) dot.classList.add("is-on"); });
    window.addEventListener("mousedown", () => dot.classList.add("is-down"));
    window.addEventListener("mouseup", () => dot.classList.remove("is-down"));
    // On the cover and on Profile the dot becomes a cut-out of her as a
    // child, and a different one takes over with each step of scrolling.
    const STICKERS = window.YG_STICKERS || [];
    const sticker = document.createElement("img");
    sticker.className = "sticker-cursor";
    sticker.alt = "";
    document.body.append(sticker);
    let viewNow = null;
    let stickerAt = -1;
    let coverStep = 0;
    const pickSticker = () => {
      const on = (viewNow === "profile" || viewNow === "cover") && STICKERS.length > 0;
      document.documentElement.classList.toggle("has-sticker", on);
      if (!on) return;
      const step = viewNow === "cover" ? coverStep : Math.floor(window.scrollY / (window.innerHeight * 0.85));
      const i = ((step % STICKERS.length) + STICKERS.length) % STICKERS.length;
      if (i === stickerAt) return;
      stickerAt = i;
      sticker.src = STICKERS[i];
      sticker.classList.remove("is-pop");
      void sticker.offsetWidth;
      sticker.classList.add("is-pop");
    };
    window.addEventListener("view:shown", (e) => { viewNow = e.detail; stickerAt = -1; pickSticker(); });
    window.addEventListener("scroll", pickSticker, { passive: true });
    window.addEventListener("cover:step", (e) => { coverStep = e.detail; if (viewNow === "cover") pickSticker(); });
    const follow = () => {
      x += (mx - x) * 0.25;
      y += (my - y) * 0.25;
      dot.style.left = `${x}px`;
      dot.style.top = `${y}px`;
      sticker.style.left = `${x}px`;
      sticker.style.top = `${y}px`;
      requestAnimationFrame(follow);
    };
    follow();
  }

  // Phones: the sidebar folds into a bar with a menu.
  const menu = side.querySelector("[data-menu]");
  const setMenu = (open) => {
    side.classList.toggle("is-open", open);
    menu.setAttribute("aria-expanded", String(open));
    menu.textContent = open ? "Close" : "Menu";
  };
  menu.addEventListener("click", () => setMenu(!side.classList.contains("is-open")));
  side.querySelectorAll("nav a, .shell-side__brand").forEach((a) => a.addEventListener("click", () => setMenu(false)));

  const mark = (id) => side.querySelectorAll("[data-view-link]").forEach((a) =>
    a.classList.toggle("is-current", a.dataset.viewLink === id));

  if (!onIndex) {
    const here = document.body.dataset.paper ? "writing"
      : /methodology|writing/.test(location.pathname) ? "writing" : "work";
    mark(here);
    // A case page ends on the next project, in that project's colour,
    // rather than on a second contact block (the frame already has one).
    const ORDER = [
      ["referral", "Referral", "-05", "#c9d8c5"],
      ["chula", "The Incomplete Archive", "01", "#c7cfe3"], ["echo", "Echo", "02", "#efd2bf"],
      ["tangle-holder", "Tangle to Holder", "03", "#dccbe3"], ["thermal-commons", "Thermal Commons", "04", "#eec0a4"],
      ["make-a-wish", "Make a Wish", "05", "#efdc98"], ["roll-up", "Rollup", "06", "#bfdcd6"],
      ["shadow-within", "Shadow Within", "07", "#c4c3cf"], ["liminal-grounds", "Liminal Ground", "08", "#d9d0bb"],
      ["simultaneously", "Simultaneously", "09", "#bed3ea"], ["new-orleans", "New Orleans", "10", "#cfdcb8"],
      ["los-balcones", "Los Balcones Ecotourism", "11", "#b9d6c2"],
    ];
    const at = ORDER.findIndex(([id]) => id === document.body.dataset.project);
    if (at >= 0 && document.body.classList.contains("cv3-page")) {
      const [id, title, num, color] = ORDER[(at + 1) % ORDER.length];
      const band = document.createElement("a");
      band.className = "next-band";
      band.href = `${id}-case.html`;
      band.style.setProperty("--card", color);
      band.innerHTML = `<small>Next project · ${num}</small><strong>${title}</strong><span aria-hidden="true">→</span>`;
      const place = () => { const main = document.querySelector("main"); if (main) main.after(band); else document.body.append(band); };
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", place);
      else place();
    }
    return;
  }

  // ---- Home page only from here ----

  // Old anchors still land somewhere sensible.
  const ALIAS = { projects: "work", about: "profile", "mobile-skills": "profile", contact: "profile", methodology: "writing", top: "home" };
  const views = [...document.querySelectorAll("[data-view]")];
  const cover = document.querySelector("[data-cover]");
  let current = null;

  const parse = () => {
    const raw = decodeURIComponent(location.hash.slice(1));
    if (!raw || raw === "cover") return { view: "cover" };
    // On a desktop the cover is home: the set, then the projects flying in.
    if (raw === "home" && !window.matchMedia("(max-width: 860px)").matches) return { view: "cover" };
    const view = ALIAS[raw] || raw;
    if (views.some((v) => v.dataset.view === view)) return { view, anchor: ALIAS[raw] && raw !== "projects" ? raw : null };
    return { view: "home" };
  };

  const show = ({ view, anchor }) => {
    const atCover = view === "cover";
    document.body.classList.toggle("at-cover", atCover);
    if (atCover) { mark(null); window.dispatchEvent(new CustomEvent("view:shown", { detail: "cover" })); return; }
    if (view !== current) {
      views.forEach((v) => {
        const on = v.dataset.view === view;
        v.hidden = !on;
        v.classList.toggle("is-shown", false);
      });
      const target = views.find((v) => v.dataset.view === view);
      current = view;
      window.scrollTo(0, 0);
      // Pieces that measure themselves need a pass once they are visible.
      window.dispatchEvent(new Event("resize"));
      requestAnimationFrame(() => requestAnimationFrame(() => target.classList.add("is-shown")));
      window.dispatchEvent(new CustomEvent("view:shown", { detail: view }));
    }
    mark(view);
    if (anchor) {
      const el = document.getElementById(anchor);
      if (el) window.setTimeout(() => el.scrollIntoView({ behavior: still ? "auto" : "smooth" }), 120);
    }
  };

  // A first visit always opens on the television, even from a deep link;
  // leaving the cover then goes to the section the link asked for.
  let pending = null;
  let first = false;
  try { first = !sessionStorage.getItem("yg:seen"); sessionStorage.setItem("yg:seen", "1"); } catch (e) { first = false; }
  window.addEventListener("hashchange", () => show(parse()));
  const asked = parse();
  if (first && asked.view !== "cover") { pending = asked; show({ view: "cover" }); }
  else show(asked);

  // Leaving the cover: the button, a click on the set, a scroll or a key.
  let coverSkip = null;
  let coverScroll = null;
  const goOn = () => {
    if (!document.body.classList.contains("at-cover")) return;
    const to = pending || { view: "profile" };
    pending = null;
    if (location.hash === `#${to.view}`) show(to);
    else location.hash = to.view;
  };
  let lastEnter = 0;
  const enter = () => {
    if (!document.body.classList.contains("at-cover")) return;
    const now = performance.now();
    if (now - lastEnter < 1400) return;
    lastEnter = now;
    if (coverSkip && !pending) coverSkip(); else goOn();
  };

  document.querySelector("[data-cover-enter]")?.addEventListener("click", enter);
  cover?.addEventListener("wheel", (e) => {
    if (coverScroll && !pending) { e.preventDefault(); coverScroll(e.deltaY); return; }
    if (e.deltaY > 8) enter();
  }, { passive: false });
  let touchY = null;
  cover?.addEventListener("touchstart", (e) => { touchY = e.touches[0].clientY; }, { passive: true });
  cover?.addEventListener("touchmove", (e) => {
    if (touchY === null) return;
    const dy = touchY - e.touches[0].clientY;
    if (coverScroll && !pending) { coverScroll(dy * 2.2); touchY = e.touches[0].clientY; return; }
    if (dy > 40) { touchY = null; enter(); }
  }, { passive: true });
  document.addEventListener("keydown", (e) => {
    if (!document.body.classList.contains("at-cover")) return;
    const down = ["ArrowDown", "PageDown", " ", "Enter"].includes(e.key);
    const up = ["ArrowUp", "PageUp"].includes(e.key);
    if (!down && !up) return;
    e.preventDefault();
    if (coverScroll && !pending) coverScroll(down ? 700 : -700);
    else if (down) enter();
  });

  // Home: project heroes arrive one at a time from the four sides, open
  // from their centre over the wordmark, and the ground takes their colour.
  const intro = document.querySelector("[data-intro]");
  const deck = intro?.querySelector("[data-intro-deck]");
  const rows = [...document.querySelectorAll(".studio .work-list [data-project]")];
  const FEATURE = ["chula-case.html", "echo-case.html", "tangle-holder-case.html", "make-a-wish-case.html", "thermal-commons-case.html", "roll-up-case.html", "shadow-within-case.html"];
  const FROM = [[-1, 0], [0, 1], [1, 0], [0, -1]];
  if (intro && deck) {
    const picks = FEATURE.map((href) => rows.find((r) => r.getAttribute("href") === href)).filter(Boolean);
    const cards = picks.map((row, i) => {
      const a = document.createElement("a");
      a.className = "intro__card";
      a.href = row.getAttribute("href");
      a.style.setProperty("--card", row.dataset.color || "#d8d6d0");
      a.dataset.name = row.dataset.title;
      a.dataset.kind = row.dataset.kicker || "";
      a.innerHTML = `<img src="${row.dataset.poster || row.dataset.src}" alt="${row.dataset.title}" loading="${i < 2 ? "eager" : "lazy"}">`;
      a.style.zIndex = String(i + 1);
      deck.append(a);
      return a;
    });
    const nameEl = intro.querySelector("[data-intro-name]");
    const kindEl = intro.querySelector("[data-intro-kind]");
    const ease = (t) => 1 - Math.pow(1 - t, 3);

    // The run follows the scroll wheel: each notch brings the next project
    // in, scrolling up takes it back out, and past the standfirst the cover
    // hands over to Profile.
    const paint = (pos) => {
      let active = -1;
      cards.forEach((card, i) => {
        const t = Math.min(1, Math.max(0, pos - i));
        const [dx, dy] = FROM[i % 4];
        const e = ease(Math.min(1, t / 0.7));
        const off = 1 - e;
        card.style.transform = `translate(calc(-50% + ${dx * off * 70}vw), calc(-50% + ${dy * off * 80}vh)) scale(${0.86 + 0.14 * e})`;
        card.style.clipPath = `inset(${off * 30}% ${off * 30}% ${off * 30}% ${off * 30}%)`;
        card.style.opacity = t > 0 ? "1" : "0";
        const after = Math.min(1, Math.max(0, pos - i - 1));
        card.style.filter = after > 0 ? `brightness(${1 - after * 0.25})` : "";
        if (t > 0.35) active = i;
      });
      const exit = Math.min(1, Math.max(0, (pos - cards.length + 0.1) / 0.3));
      deck.style.opacity = String(1 - exit);
      if (exit >= 1) active = -1;
      const pick = cards[active];
      intro.style.setProperty("--ground", pick ? pick.style.getPropertyValue("--card") : "var(--paper)");
      intro.classList.toggle("has-card", !!pick);
      if (pick && nameEl.textContent !== pick.dataset.name) {
        nameEl.textContent = pick.dataset.name;
        kindEl.textContent = pick.dataset.kind;
        intro.querySelector(".intro__cap").classList.remove("is-swap");
        void intro.offsetWidth;
        intro.querySelector(".intro__cap").classList.add("is-swap");
      }
      if (!pick) { nameEl.textContent = ""; kindEl.textContent = ""; }
    };

    const PER_PX = 650;
    const END = cards.length + 0.45;
    const OUT = END + 0.9;
    const onCover = () => document.body.classList.contains("at-cover");
    let target = -0.3;
    let pos = -0.3;
    let ticking = false;
    let lastStep = null;
    const settle = () => {
      pos += (target - pos) * (still ? 1 : 0.12);
      if (Math.abs(target - pos) < 0.002) pos = target;
      paint(Math.min(pos, END));
      intro.classList.toggle("is-end", pos >= END - 0.05);
      const k = Math.max(0, Math.floor(pos + 0.3));
      if (k !== lastStep) { lastStep = k; window.dispatchEvent(new CustomEvent("cover:step", { detail: k })); }
      if (pos !== target && onCover()) requestAnimationFrame(settle); else ticking = false;
    };
    // The standfirst holds for a moment so a fast flick cannot fly past it.
    let holdUntil = 0;
    const move = (to) => {
      const now = performance.now();
      if (target < END && to > END) { to = END; holdUntil = now + 1000; }
      else if (to > target && target >= END && now < holdUntil) return;
      target = Math.max(-0.3, Math.min(OUT, to));
      if (target >= OUT - 0.001) { target = END; goOn(); return; }
      if (!ticking) { ticking = true; requestAnimationFrame(settle); }
    };
    coverScroll = (dy) => move(target + dy / PER_PX);
    // Skip: first jump to the closing line, then move on.
    coverSkip = () => {
      if (target >= END) { goOn(); return; }
      move(END);
    };
    intro.querySelector("[data-intro-skip]")?.addEventListener("click", () => coverSkip());
    const reset = () => { target = -0.3; pos = -0.3; lastStep = null; paint(-1); intro.classList.remove("is-end"); window.dispatchEvent(new CustomEvent("cover:step", { detail: 0 })); };
    window.addEventListener("view:shown", (e) => { if (e.detail === "cover") reset(); });
    reset();
  }

  // Writing: the hovered paper's cover shows in the column beside the list.
  const list = document.querySelector("[data-paper-list]");
  const coverImg = list?.querySelector("[data-paper-cover]");
  if (list && coverImg) {
    list.querySelectorAll("a[data-paper-img]").forEach((a) => {
      a.addEventListener("mouseenter", () => {
        coverImg.src = a.dataset.paperImg;
        list.classList.add("is-peeking");
      });
    });
    list.addEventListener("mouseleave", () => list.classList.remove("is-peeking"));
  }
})();
