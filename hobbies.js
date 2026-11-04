(() => {
  "use strict";

  const gallery = document.querySelector("[data-photo-gallery]");
  if (!gallery) return;

  const selectors = Array.from(gallery.querySelectorAll(".photo-selector"));
  const controls = gallery.querySelector(".photo-selectors");
  const viewer = gallery.querySelector(".photo-window");
  const image = gallery.querySelector(".photo-image");
  const playback = gallery.querySelector(".photo-playback");
  const status = gallery.querySelector(".gallery-status");
  if (!selectors.length || !controls || !viewer || !image || !playback || !status) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const windowFrames = [
    { transform: "scale(0.045)", opacity: 0 },
    { transform: "scale(1)", opacity: 1 },
  ];
  const loaded = new Map();
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

  function loadPhoto(index) {
    if (!loaded.has(index)) {
      const promise = new Promise((resolve, reject) => {
        const nextImage = new Image();
        nextImage.onload = resolve;
        nextImage.onerror = reject;
        nextImage.src = selectors[index].dataset.src;
      });
      loaded.set(index, promise);
      promise.catch(() => loaded.delete(index));
    }
    return loaded.get(index);
  }

  function updatePlayback() {
    playback.textContent = playing ? "Pause" : "Play";
    playback.setAttribute("aria-label", playing ? "Pause photo slideshow" : "Play photo slideshow");
  }

  function resetTimer() {
    window.clearTimeout(timer);
    timer = null;
    if (playing && !document.hidden) {
      timer = window.setTimeout(() => {
        selectPhoto((requested + 1) % selectors.length, false);
      }, 3000);
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
      // A cancelled animation must not strand the viewer between photos.
    }
  }

  // Load before closing the current photo; serialize transitions after rapid clicks.
  async function updateViewer() {
    if (updating) return;
    updating = true;
    try {
      while (displayed !== requested) {
        const next = requested;
        try {
          await loadPhoto(next);
        } catch {
          if (next !== requested) continue;
          requested = displayed;
          manualSelection = null;
          playing = false;
          updatePlayback();
          resetTimer();
          status.textContent = "That photo could not be loaded. Choose another photo to continue.";
          break;
        }
        if (next !== requested) continue;
        await animateWindow(false);
        image.src = selectors[next].dataset.src;
        image.alt = selectors[next].dataset.alt;
        displayed = next;
        viewer.setAttribute("aria-label", `Photo ${next + 1} of ${selectors.length}`);
        updateSelectors();
        animation?.cancel();
        animation = null;
        await animateWindow(true);
        animation?.cancel();
        animation = null;
      }
      if (manualSelection === displayed) {
        status.textContent = `Photo ${displayed + 1} of ${selectors.length}. ${image.alt}`;
        manualSelection = null;
      }
    } finally {
      animation?.cancel();
      animation = null;
      updating = false;
      viewer.dataset.state = "open";
      // Warm the next image without interrupting a manual selection on failure.
      loadPhoto((displayed + 1) % selectors.length).catch(() => {});
    }
  }

  function selectPhoto(index, manual = true) {
    requested = index;
    manualSelection = manual ? index : null;
    if (manual) status.textContent = "";
    resetTimer();
    updateViewer();
  }

  selectors.forEach((selector, index) => {
    selector.addEventListener("click", () => selectPhoto(index));
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
  resetTimer();
  loadPhoto(1 % selectors.length).catch(() => {});
})();
