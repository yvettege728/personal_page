// The closing television, shared by the home page and every case page.
//
// The reveal follows Motion's screenshot-scroll-reveal: the set starts tilted
// back on the X axis, small and dim, and comes upright, forward and lit as the
// section is scrolled through. It is scroll-linked rather than a one-shot
// class, so the movement belongs to the reader's hand instead of arriving on
// its own timer, and it reverses when they scroll back.
//
// The page above it recedes on the same progress value, which is the other
// half of the original component: a headline lifting away as the screenshot
// takes the stage.

(function () {
  const CONTACT_PHONE = "+1 6176808178";
  const CONTACT_MAIL = "yvette_ge@gsd.harvard.edu";
  const CONTACT_LINKEDIN = "https://www.linkedin.com/in/yanqin-ge-a43512228/";
  const CONTACT_CV = "web-assets/Yvette_Ge_CV.pdf";

  // Case pages build their body from JS, so the closing block is generated
  // here rather than repeated in eleven files.
  function contactStageMarkup(options = {}) {
    const home = options.home || "index.html";
    return `
    <section class="contact contact-tv dark dark-nav" id="contact" aria-label="Contact" data-contact-stage data-nav-section>
      <div class="contact-tv__set" aria-hidden="true">
        <div class="contact-tv__screen">
          <video src="web-assets/picvideo-web.mp4" autoplay muted loop playsinline preload="none"></video>
        </div>
        <img class="contact-tv__frame" src="web-assets/eric-cole-assets/WkbjqM8K5hqKOUzSBrsnPMKBcI.png" alt="">
      </div>
      <div class="contact-links contact-tv__links">
        <span>${CONTACT_PHONE}</span>
        <a href="mailto:${CONTACT_MAIL}" data-decrypt data-text="${CONTACT_MAIL}">${CONTACT_MAIL}</a>
        <a href="${CONTACT_LINKEDIN}" target="_blank" rel="noopener" data-decrypt data-text="LinkedIn">LinkedIn</a>
        <a href="${CONTACT_CV}" data-decrypt data-text="Download CV">Download CV</a>
        <a href="${home}" data-decrypt data-text="Home">Home</a>
        <a href="#" data-back-to-top data-decrypt data-text="Back to Top">Back to Top</a>
      </div>
    </section>`;
  }

  function clamp01(n) {
    return n < 0 ? 0 : n > 1 ? 1 : n;
  }

  function initContactStage() {
    // Hand-written case pages mark where the closing block goes rather than
    // carrying a copy of it.
    document.querySelectorAll("[data-contact-slot]").forEach((slot) => {
      slot.outerHTML = contactStageMarkup();
    });

    const section = document.querySelector("[data-contact-stage], .contact-tv");
    if (!section || section.dataset.stageReady) return;
    section.dataset.stageReady = "true";

    // Back to top works from any page, including the generated case pages
    // where there is no #top anchor to aim at.
    section.querySelectorAll("[data-back-to-top]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });

    const receding = document.querySelector(".skill-section");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const settle = () => {
      section.style.setProperty("--tv-progress", "1");
      section.style.setProperty("--tv-rot", "0deg");
      section.style.setProperty("--tv-scale", "1.02");
      section.style.setProperty("--tv-y", "0px");
      section.style.setProperty("--tv-opacity", "1");
      section.style.setProperty("--tv-bright", "0.9");
      section.classList.add("is-in-view");
    };

    if (calm) {
      settle();
      return;
    }

    let ticking = false;

    const write = () => {
      ticking = false;
      const rect = section.getBoundingClientRect();
      const viewport = window.innerHeight || 1;

      // Zero when the section's top edge is still at the bottom of the screen,
      // one shortly after it has reached the top.
      const progress = clamp01((viewport - rect.top) / (viewport * 0.9));
      const eased = 1 - Math.pow(1 - progress, 3);

      section.style.setProperty("--tv-progress", eased.toFixed(3));
      section.style.setProperty("--tv-rot", `${(34 - eased * 34).toFixed(2)}deg`);
      section.style.setProperty("--tv-scale", (0.8 + eased * 0.22).toFixed(3));
      section.style.setProperty("--tv-y", `${(140 - eased * 140).toFixed(1)}px`);
      section.style.setProperty("--tv-opacity", (0.3 + eased * 0.7).toFixed(3));
      section.style.setProperty("--tv-bright", (0.5 + eased * 0.4).toFixed(3));
      section.classList.toggle("is-in-view", progress > 0.12);

      // The section above gives up the stage on the same value, so the two
      // read as one exchange rather than two separate effects.
      if (receding) {
        receding.style.setProperty("--recede", eased.toFixed(3));
        receding.classList.toggle("is-receding", progress > 0.05);
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(write);
    };

    write();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("load", write);
    // requestAnimationFrame is suspended in a background tab, so the closing
    // section must not be able to stay dark and folded away.
    window.setTimeout(() => {
      if (Number(getComputedStyle(section).getPropertyValue("--tv-progress")) > 0) return;
      const rect = section.getBoundingClientRect();
      if (rect.top < (window.innerHeight || 0)) settle();
    }, 4000);
  }

  window.contactStageMarkup = contactStageMarkup;
  window.initContactStage = initContactStage;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initContactStage);
  } else {
    initContactStage();
  }
})();
