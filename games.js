(() => {
  "use strict";

  const gallery = document.querySelector("[data-game-gallery]");
  if (!gallery) return;

  const selectors = Array.from(gallery.querySelectorAll(".game-selector"));
  const controls = gallery.querySelector(".game-selectors");
  const viewer = gallery.querySelector(".game-window");
  const wallpaper = gallery.querySelector(".game-wallpaper");
  const title = gallery.querySelector(".game-title");
  const description = gallery.querySelector(".game-description");
  const playback = gallery.querySelector(".game-playback");
  const status = gallery.querySelector(".game-status");
  if (!selectors.length || !controls || !viewer || !wallpaper || !title || !description || !playback || !status) return;

  // Match the photography viewer's scale, timing, easing and left-edge origin.
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const windowFrames = [
    { transform: "scale(0.045)", opacity: 0 },
    { transform: "scale(1)", opacity: 1 },
  ];
  const wallpapers = new Map();
  let displayed = 0;
  let requested = 0;
  let manualSelection = null;
  let updating = false;
  let animation = null;
  let timer = null;
  let playing = !reducedMotion.matches;

  function updateSelectors() {
    selectors.forEach((selector, index) => {
      selector.setAttribute("aria-pressed", String(index === displayed));
    });
  }

  function loadWallpaper(index) {
    if (!wallpapers.has(index)) {
      wallpapers.set(index, new Promise(resolve => {
        const nextImage = new Image();
        nextImage.onload = () => resolve(true);
        // Details remain usable even when a wallpaper is missing.
        nextImage.onerror = () => resolve(false);
        nextImage.src = selectors[index].dataset.wallpaper;
      }));
    }
    return wallpapers.get(index);
  }

  function updatePlayback() {
    playback.textContent = playing ? "Pause" : "Play";
    playback.setAttribute("aria-label", playing ? "Pause game slideshow" : "Play game slideshow");
  }

  // Give every fully opened game ten seconds before starting the next transition.
  function resetTimer() {
    window.clearTimeout(timer);
    timer = null;
    if (playing && !updating && !document.hidden) {
      timer = window.setTimeout(() => {
        selectGame((displayed + 1) % selectors.length, false);
      }, 6000);
    }
  }

  async function animateWindow(opening) {
    viewer.dataset.state = opening ? "opening" : "closing";
    if (reducedMotion.matches || typeof viewer.animate !== "function") return;
    animation = viewer.animate(opening ? windowFrames : [...windowFrames].reverse(), {
      duration: opening ? 320 : 240,
      easing: opening ? "cubic-bezier(0.18, 0.8, 0.25, 1)" : "cubic-bezier(0.5, 0, 0.8, 0.35)",
      fill: "both",
    });
    try {
      await animation.finished;
    } catch {
      // Cancellation must still allow the latest selected game to appear.
    }
  }

  async function updateViewer() {
    if (updating) return;
    updating = true;
    try {
      while (displayed !== requested) {
        const next = requested;
        const available = await loadWallpaper(next);
        if (next !== requested) continue;
        await animateWindow(false);
        wallpaper.hidden = !available;
        wallpaper.src = selectors[next].dataset.wallpaper;
        title.textContent = selectors[next].dataset.title;
        description.textContent = selectors[next].dataset.description;
        displayed = next;
        updateSelectors();
        animation?.cancel();
        animation = null;
        await animateWindow(true);
        animation?.cancel();
        animation = null;
      }
      if (manualSelection === displayed) {
        status.textContent = `${selectors[displayed].dataset.title}. Game ${displayed + 1} of ${selectors.length}.`;
        manualSelection = null;
      }
    } finally {
      animation?.cancel();
      animation = null;
      updating = false;
      viewer.dataset.state = "open";
      resetTimer();
      loadWallpaper((displayed + 1) % selectors.length);
    }
  }

  function selectGame(index, manual = true) {
    requested = index;
    manualSelection = manual ? index : null;
    if (manual) status.textContent = "";
    window.clearTimeout(timer);
    timer = null;
    updateViewer();
  }

  selectors.forEach((selector, index) => {
    selector.addEventListener("click", () => selectGame(index));
  });
  playback.addEventListener("click", () => {
    playing = !playing;
    updatePlayback();
    resetTimer();
  });
  document.addEventListener("visibilitychange", resetTimer);
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) {
      animation?.finish();
      playing = false;
      updatePlayback();
      resetTimer();
    }
  });

  updateSelectors();
  updatePlayback();
  controls.hidden = false;
  playback.hidden = false;
  loadWallpaper(0).then(available => {
    if (displayed === 0) wallpaper.hidden = !available;
  });
  loadWallpaper(1 % selectors.length);
  resetTimer();
})();
