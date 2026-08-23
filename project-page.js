(function () {
  const root = document.querySelector("[data-project-root]");
  const key = document.body.dataset.project;
  const project = window.PROJECTS && window.PROJECTS[key];

  if (!root || !project) {
    if (root) root.innerHTML = "<section class=\"section\"><div class=\"section-inner\"><h1>Project not found</h1><p>Return to the Selected Work grid.</p><a class=\"button light\" href=\"index.html#projects\">Back to Projects</a></div></section>";
    return;
  }

  document.title = `${project.title} | Yvette Ge`;

  const meta = Object.entries(project.meta)
    .map(([label, value]) => `<div><strong>${label}</strong>${value}</div>`)
    .join("");

  const did = project.did.map((item) => `<li>${item}</li>`).join("");

  // Gallery entries are [src, caption] for stills, or [src, caption, "video", poster]
  // for clips. Clips are muted and loop, and carry controls so they can be replayed.
  const galleryItems = project.gallery || [];

  const accordion = project.galleryLayout === "accordion"
    ? `<div class="accordion-gallery" data-accordion>${galleryItems
        .map(([src, label], i) =>
          `<div class="ag-panel${i === Math.min(2, project.gallery.length - 1) ? " ag-panel--active" : ""}" tabindex="0" role="listitem" aria-label="${label}"><span class="ag-panel__frame"><span class="ag-panel__media"><img src="${src}" alt="${label}" draggable="false"></span><span class="ag-panel__overlay" aria-hidden="true"></span></span><span class="ag-panel__label" aria-hidden="true"><span class="ag-panel__bar"></span><span class="ag-panel__text">${label}</span></span></div>`)
        .join("")}</div>`
    : "";

  const gallery = galleryItems
    .map(([src, alt, kind, poster]) =>
      kind === "video"
        ? `<figure><video src="${src}"${poster ? ` poster="${poster}"` : ""} controls muted loop playsinline preload="metadata" aria-label="${alt}"></video><figcaption>${alt}</figcaption></figure>`
        : `<figure><img src="${src}" alt="${alt}"><figcaption>${alt}</figcaption></figure>`
    )
    .join("");

  // A page can open on a still, on a looping clip, or on nothing at all when the
  // argument is better carried by a full-width video further down.
  const heroAttrs = project.heroSound
    ? "autoplay loop playsinline controls data-sound-autoplay"
    : "autoplay muted loop playsinline";

  const heroMedia = project.heroVideo
    ? `<div class="image-frame project-hero-image cover"><video src="${project.heroVideo}" poster="${project.hero}" ${heroAttrs} aria-label="${project.heroAlt}"></video></div>`
    : project.hero
      ? `<div class="image-frame project-hero-image ${project.heroFit === "cover" ? "cover" : ""}"><img class="${project.accent === "reveal" ? "scan" : ""}" src="${project.hero}" alt="${project.heroAlt}"></div>`
      : "";

  // Optional full-bleed opener, for projects where a film explains it faster than prose.
  const leadAttrs = project.lead && project.lead.sound
    ? "autoplay loop controls data-sound-autoplay"
    : project.lead && project.lead.scrollPlay
      ? "controls muted loop data-scroll-autoplay"
      : project.lead && project.lead.autoplay
        ? "autoplay muted loop"
        : "controls";

  const lead = project.lead
    ? `<section class="case-section lead-media${project.lead.reveal ? " lead-reveal" : ""}"${project.lead.reveal ? " data-lead-reveal" : ""}><div class="section-inner">${project.lead.title ? `<div class="section-kicker"><span class="section-number">${project.lead.kicker || ""}</span><h2 class="section-title">${project.lead.title}</h2></div>` : ""}<figure class="case-video"><video src="${project.lead.src}" poster="${project.lead.poster || ""}" ${leadAttrs} playsinline preload="metadata" aria-label="${project.lead.caption}"></video><figcaption>${project.lead.caption}</figcaption></figure></div></section>`
    : "";

  // Images for a block. Rows opt in with mediaLayout: "row", which lays the
  // figures out at one shared height so their widths fall out of their own
  // proportions: a landscape frame next to a portrait one reads as the larger
  // of the two, which is usually the point of putting them side by side.
  const renderMedia = (block) => {
    if (!block.media) return "";
    const figures = block.media
      .map(([src, cap, extra]) => {
        const caption = block.captions === false ? "" : `<figcaption>${cap}</figcaption>`;
        return (
        // Test for video first: on a video block the third element is a
        // poster, not a second still to cross-fade to.
        src.endsWith(".mp4")
          ? `<figure><video src="${src}"${extra ? ` poster="${extra}" controls` : " muted loop autoplay"} playsinline preload="metadata" aria-label="${cap}"></video>${caption}</figure>`
          : extra
          ? `<figure class="swap-pair"><img src="${src}" alt="${cap}" data-zoom><img src="${extra}" alt="${cap}, after">${caption}</figure>`
          : `<figure><img src="${src}" alt="${cap}" data-zoom>${caption}</figure>`);
      })
      .join("");
    const shape = block.mediaLayout ? ` media-${block.mediaLayout}` : "";
    return `<div class="section-media${shape}">${figures}</div>`;
  };

  // Free-form blocks, so a page can carry whatever its argument actually needs:
  // prose, a numbered sequence, or a table. Nothing is forced on pages without them.
  const sections = (project.sections || []).map((block) => {
    if (block.type === "table") {
      const head = `<tr>${block.head.map((h) => `<th>${h}</th>`).join("")}</tr>`;
      const rows = block.rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
      return `<section class="case-section${block.dark ? " dark dark-nav" : ""}"${block.dark ? " data-nav-section" : ""}><div class="section-inner"><div class="section-kicker"><span class="section-number">${block.kicker || ""}</span>${block.title ? `<h2 class="section-title">${block.title}</h2>` : ""}</div><div class="case-table-wrap"><table class="case-table"><thead>${head}</thead><tbody>${rows}</tbody></table></div>${renderMedia(block)}</div></section>`;
    }
    if (block.type === "fold") {
      const paras = (block.body || []).map((para) => `<p>${para}</p>`).join("");
      return `<section class="case-section${block.dark ? " dark dark-nav" : ""}"${block.dark ? " data-nav-section" : ""}><div class="case-two"><div><p class="eyebrow">${block.kicker || ""}</p></div><div class="case-copy"><details class="disclose"><summary class="disclose-summary"><span class="disclose-title">${block.title}</span><span class="disclose-mark" aria-hidden="true"></span></summary><div class="disclose-body">${paras}</div></details></div></div></section>`;
    }
    if (block.type === "steps") {
      const steps = block.items
        .map((s, i) => `<article><span class="mono">${String(i + 1).padStart(2, "0")}</span><div><h3>${s.title}</h3><p>${s.body}</p></div></article>`)
        .join("");
      return `<section class="case-section${block.dark ? " dark dark-nav" : ""}"${block.dark ? " data-nav-section" : ""}><div class="section-inner"><div class="section-kicker"><span class="section-number">${block.kicker || ""}</span>${block.title ? `<h2 class="section-title">${block.title}</h2>` : ""}</div><div class="case-steps">${steps}</div>${renderMedia(block)}</div></section>`;
    }
    const paras = (block.body || []).map((p) => `<p>${p}</p>`).join("");
    const media = renderMedia(block);
    return `<section class="case-section${block.dark ? " dark dark-nav" : ""}"${block.dark ? " data-nav-section" : ""}><div class="case-two"><div><p class="eyebrow">${block.kicker || ""}</p></div><div class="case-copy">${block.title ? `<h2>${block.title}</h2>` : ""}${paras}${media}</div></div></section>`;
  }).join("");

  const galleryHeading = project.galleryTitle
    ? `<div class="section-kicker"><span class="section-number">${project.galleryKicker || ""}</span><h2 class="section-title">${project.galleryTitle}</h2></div>`
    : "";

  const gallerySection = galleryItems.length
    ? `<section class="case-section${project.galleryDark ? " dark dark-nav" : ""}"${project.galleryDark ? " data-nav-section" : ""}><div class="section-inner">${galleryHeading}${accordion || `<div class="case-gallery${project.galleryLayout ? " " + project.galleryLayout : ""}">${gallery}</div>`}</div></section>`
    : "";

  const ai = project.ai
    ? `<section class="case-section dark dark-nav" data-nav-section><div class="case-two"><div><p class="eyebrow">AI Angle</p></div><div class="case-copy"><h2>Where AI enters the system</h2><p>${project.ai}</p></div></div></section>`
    : "";

  root.innerHTML = `
    <section class="section case-hero project-case ${project.accent}" data-nav-section>
      <div class="section-inner case-hero-grid">
        <div class="case-hero-copy">
          <p class="eyebrow">Selected Work · ${project.category}</p>
          <h1>${project.title}</h1>
          <p class="callout blur-highlight" style="--bh-accent: var(--${project.accent})">${project.oneLiner}</p>
          ${project.oneLinerSub ? `<p class="callout-sub">${project.oneLinerSub}</p>` : ""}
        </div>
        ${heroMedia}
      </div>
    </section>

    ${lead}

    <section class="case-section">
      <div class="section-inner meta-grid" aria-label="Project metadata">${meta}</div>
    </section>

    <section class="case-section">
      <div class="case-two">
        <div><p class="eyebrow">Case</p></div>
        <div class="case-copy">
          <h2>${project.bodyHeading || "What the project makes legible"}</h2>
          <p>${project.body}</p>
        </div>
      </div>
    </section>

    ${sections}

    <section class="case-section dark dark-nav" data-nav-section>
      <div class="case-two">
        <div><p class="eyebrow">What I Did</p></div>
        <div class="case-copy"><ul>${did}</ul></div>
      </div>
    </section>

    ${ai}

    ${gallerySection}

    ${typeof window.contactStageMarkup === "function" ? window.contactStageMarkup() : ""}
  `;

  // Autoplay only survives if the element is muted as a property, not merely as
  // an attribute written into innerHTML, so the opening clip is muted here and
  // then asked to start.
  root.querySelectorAll("video[autoplay]:not([data-sound-autoplay])").forEach((video) => {
    video.muted = true;
    const attempt = video.play();
    if (attempt && typeof attempt.catch === "function") attempt.catch(() => {});
  });

  root.querySelectorAll("[data-sound-autoplay]").forEach((video) => {
    video.muted = false;
    video.volume = 1;
    const attempt = video.play();
    if (attempt && typeof attempt.catch === "function") {
      attempt.catch(() => {
        video.controls = true;
        video.setAttribute("data-sound-blocked", "true");
      });
    }
  });

  if (window.initContactStage) window.initContactStage();
  if (window.initPortfolioInteractions) window.initPortfolioInteractions();
})();
