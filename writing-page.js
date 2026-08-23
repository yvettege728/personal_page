// Renders one paper's reading page: the extracted text, plus any supplementary
// material that came with it.
(function () {
  const key = document.body.dataset.paper;
  const paper = window.WRITING[key];
  const root = document.getElementById("paper-root");
  if (!paper || !root) return;

  const others = Object.entries(window.WRITING).filter(([k]) => k !== key);

  const extras = (paper.extras || [])
    .map((x) => {
      if (x.video) {
        return `<figure class="paper-extra"><video src="${x.video}" poster="${x.poster || ""}" controls preload="metadata" playsinline aria-label="${x.label}"></video><figcaption>${x.label}</figcaption></figure>`;
      }
      if (x.spread) {
        const pages = x.spread
          .map((src, i) => `<a href="${x.pdf}" target="_blank" rel="noopener"><img src="${src}" alt="${x.label}, page ${i + 1}"></a>`)
          .join("");
        return `<figure class="paper-extra paper-extra--spread"><span class="paper-spread">${pages}</span><figcaption>${x.label} <a class="paper-pdf-link" href="${x.pdf}" target="_blank" rel="noopener">PDF</a></figcaption></figure>`;
      }
      return `<figure class="paper-extra"><a href="${x.pdf}" target="_blank" rel="noopener"><img src="${x.cover}" alt="${x.label}"></a><figcaption>${x.label} <a class="paper-pdf-link" href="${x.pdf}" target="_blank" rel="noopener">PDF</a></figcaption></figure>`;
    })
    .join("");

  root.innerHTML = `
    <section class="section paper-hero">
      <div class="section-inner paper-hero-grid">
        <div>
        <p class="eyebrow">Writing · ${paper.kind}</p>
        <h1>${paper.title}</h1>
        <p class="paper-sub">${paper.subtitle}</p>
        <p class="paper-meta mono">${paper.meta} · ${paper.words.toLocaleString()} words</p>
        ${paper.field ? `<p class="paper-field"><span class="paper-field__label mono">Field</span>${paper.field}</p>` : ""}
        <p class="paper-note">${paper.note}</p>
        <a class="button light magnetic" href="${paper.pdf}" target="_blank" rel="noopener">Original PDF <span aria-hidden="true">-></span></a>
        </div>
        ${paper.icon ? `<figure class="paper-mark"><img src="${paper.icon}" alt=""></figure>` : ""}
      </div>
    </section>

    ${extras ? `<section class="case-section"><div class="section-inner"><div class="section-kicker"><span class="section-number">Alongside</span><h2 class="section-title">What came with it</h2></div><div class="paper-extras">${extras}</div></div></section>` : ""}

    <section class="case-section paper-body-wrap">
      <div class="section-inner">
        <div class="paper-body" id="paper-body"><p class="mono">Loading the text…</p></div>
      </div>
    </section>

    <section class="section about dark-nav" data-nav-section>
      <div class="section-inner">
        <div class="section-kicker"><span class="section-number">More</span><h2 class="section-title">The rest of the shelf</h2></div>
        <div class="shelf shelf--compact">
          ${others.map(([k, p]) => `<a class="shelf-book ${p.spine}" href="writing-${k}.html">${p.icon ? `<span class="shelf-cover"><img class="shelf-mark" src="${p.icon}" alt="" loading="lazy">${p.cover ? `<img class="shelf-page" src="${p.cover}" alt="" loading="lazy">` : ""}</span>` : ""}<span class="shelf-num mono">${p.num}</span><span class="shelf-title">${p.title}</span>${p.field ? `<span class="shelf-field">${p.field}</span>` : ""}</a>`).join("")}
        </div>
      </div>
    </section>
  `;

  // The essays run to thousands of words, so the text is fetched rather than
  // inlined into every page.
  fetch(paper.text)
    .then((r) => (r.ok ? r.text() : Promise.reject()))
    .then((txt) => {
      const paras = txt
        .split(/\n\s*\n/)
        .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
        .filter((p) => p.length > 1);
      document.getElementById("paper-body").innerHTML = paras
        .map((p) => (p.length < 90 && !/[.?!]$/.test(p) ? `<h3>${p}</h3>` : `<p>${p}</p>`))
        .join("");
      if (window.initPortfolioInteractions) window.initPortfolioInteractions();
    })
    .catch(() => {
      document.getElementById("paper-body").innerHTML =
        `<p>The text could not be loaded here. <a href="${paper.pdf}" target="_blank" rel="noopener">Open the PDF instead</a>.</p>`;
    });
})();
