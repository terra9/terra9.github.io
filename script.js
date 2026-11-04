(() => {
  "use strict";

  document.documentElement.classList.add("js-enabled");

  // About remains the active navigation item through the capabilities section.
  const sectionLinks = Array.from(document.querySelectorAll(".nav-link"));
  const pageSections = Array.from(document.querySelectorAll("[data-nav-section]"));
  const siteHeader = document.querySelector(".site-header");

  function updateCurrentNavigation() {
    const headerBottom = siteHeader?.getBoundingClientRect().bottom || 0;
    const readingLine = Math.max(headerBottom + 24, window.innerHeight * 0.3);
    let activeSection = "home";
    for (const section of pageSections) {
      if (section.getBoundingClientRect().top <= readingLine) {
        activeSection = section.dataset.navSection;
      }
    }
    for (const link of sectionLinks) {
      const isCurrent = link.getAttribute("href") === `#${activeSection}`;
      link.classList.toggle("is-current", isCurrent);
      if (isCurrent) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
  }

  let navigationFrame = null;
  function scheduleNavigationUpdate() {
    if (navigationFrame !== null) return;
    navigationFrame = window.requestAnimationFrame(() => {
      navigationFrame = null;
      updateCurrentNavigation();
    });
  }
  window.addEventListener("scroll", scheduleNavigationUpdate, { passive: true });
  window.addEventListener("hashchange", scheduleNavigationUpdate);
  window.addEventListener("resize", scheduleNavigationUpdate, { passive: true });

  // Keep anchor destinations clear of the sticky header, including the mobile menu.
  function syncHeaderHeight() {
    if (!siteHeader) return;
    document.documentElement.style.setProperty("--header-height", `${Math.ceil(siteHeader.getBoundingClientRect().height)}px`);
    scheduleNavigationUpdate();
  }
  if (siteHeader && "ResizeObserver" in window) {
    const headerObserver = new ResizeObserver(syncHeaderHeight);
    headerObserver.observe(siteHeader);
  }
  window.addEventListener("resize", syncHeaderHeight, { passive: true });
  syncHeaderHeight();
  updateCurrentNavigation();

  // The wide navigation becomes a keyboard-accessible menu on small screens.
  const toggle = document.querySelector(".menu-toggle");
  const navigation = document.querySelector("#site-navigation");
  const compactViewport = window.matchMedia("(max-width: 760px)");

  function closeMenu() {
    if (!toggle || !navigation) return;
    toggle.setAttribute("aria-expanded", "false");
    navigation.classList.remove("is-open");
    syncHeaderHeight();
  }

  function syncNavigation() {
    if (!toggle) return;
    toggle.hidden = !compactViewport.matches;
    closeMenu();
  }

  if (toggle && navigation) {
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
      navigation.classList.toggle("is-open", open);
      syncHeaderHeight();
    });
    navigation.addEventListener("click", event => {
      if (event.target.closest("a")) closeMenu();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        closeMenu();
        toggle.focus();
      }
    });
    compactViewport.addEventListener("change", syncNavigation);
    syncNavigation();
  }

  // A few faint, slow dust motes complement the CSS smoke background.
  const canvas = document.querySelector("#dust");
  const context = canvas?.getContext("2d");
  if (!context) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let particles = [];
  let width = 0;
  let height = 0;
  let animationFrame = null;
  let previousTime = 0;

  function resizeDust() {
    width = window.innerWidth;
    height = window.innerHeight;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    const count = Math.min(24, Math.max(8, Math.round(width / 65)));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: 0.3 + Math.random() * 0.5,
      opacity: 0.07 + Math.random() * 0.14,
      velocityX: 1.6 + Math.random() * 4,
      velocityY: -0.9 - Math.random() * 2.4,
    }));
  }

  function drawDust(time) {
    const seconds = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
    previousTime = time;
    context.clearRect(0, 0, width, height);

    for (const particle of particles) {
      particle.x += particle.velocityX * seconds;
      particle.y += particle.velocityY * seconds;
      if (particle.x > width + 4) particle.x = -4;
      if (particle.y < -4) particle.y = height + 4;

      const edgeFade = Math.max(0, Math.min(1, particle.x / 60, (width - particle.x) / 60, particle.y / 60, (height - particle.y) / 60));
      context.beginPath();
      context.fillStyle = `rgba(200, 211, 214, ${particle.opacity * edgeFade})`;
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      context.fill();
    }

    animationFrame = window.requestAnimationFrame(drawDust);
  }

  function syncAnimation() {
    if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    animationFrame = null;
    previousTime = 0;
    context.clearRect(0, 0, width, height);
    if (!reducedMotion.matches && !document.hidden) {
      animationFrame = window.requestAnimationFrame(drawDust);
    }
  }

  window.addEventListener("resize", resizeDust, { passive: true });
  reducedMotion.addEventListener("change", syncAnimation);
  document.addEventListener("visibilitychange", syncAnimation);
  resizeDust();
  syncAnimation();
})();
