export function initTheme({ root, themeBtn, storageKey = "mihai_theme" }) {
  const sourceKey = `${storageKey}_source`;
  const systemThemeQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
  let savedTheme = null;
  let savedSource = null;
  try {
    savedTheme = localStorage.getItem(storageKey);
    savedSource = localStorage.getItem(sourceKey);
  } catch {
    // Theme controls remain usable when browser storage is unavailable.
  }
  const hasSavedTheme = savedTheme === "light" || savedTheme === "dark";
  let manualTheme = savedSource === "manual" && hasSavedTheme;

  function applyTheme(theme) {
    root.dataset.theme = theme;
    themeBtn.textContent = `Theme: ${theme[0].toUpperCase()}${theme.slice(1)}`;
  }

  let initialTheme = "light";
  if (manualTheme) {
    initialTheme = savedTheme;
  } else if (systemThemeQuery?.matches) {
    initialTheme = "dark";
  }
  applyTheme(initialTheme);

  function syncWithSystemTheme(event) {
    if (manualTheme) return;
    applyTheme(event.matches ? "dark" : "light");
  }

  if (systemThemeQuery) {
    if (typeof systemThemeQuery.addEventListener === "function") {
      systemThemeQuery.addEventListener("change", syncWithSystemTheme);
    } else if (typeof systemThemeQuery.addListener === "function") {
      systemThemeQuery.addListener(syncWithSystemTheme);
    }
  }

  themeBtn.addEventListener("click", () => {
    const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  });

  function setTheme(theme) {
    manualTheme = true;
    applyTheme(theme);
    try {
      localStorage.setItem(storageKey, theme);
      localStorage.setItem(sourceKey, "manual");
    } catch {
      // Keep the selected theme for this page even if it cannot be persisted.
    }
  }

  return setTheme;
}

export function initHudMenu({ hud, menuBtn, controlsMenu }) {
  function setOpen(isOpen) {
    const restoreFocus = !isOpen && controlsMenu.contains(document.activeElement);
    menuBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    controlsMenu.hidden = !isOpen;
    hud.classList.toggle("hudMenuOpen", isOpen);
    if (restoreFocus) menuBtn.focus();
  }

  function toggleOpen() {
    setOpen(controlsMenu.hidden);
  }

  menuBtn.addEventListener("click", toggleOpen);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !controlsMenu.hidden) {
      setOpen(false);
    }
  });
  document.addEventListener("pointerdown", (event) => {
    if (controlsMenu.hidden) return;
    const target = event.target;
    if (controlsMenu.contains(target) || menuBtn.contains(target)) return;
    setOpen(false);
  });
  controlsMenu.addEventListener("click", (event) => {
    if (event.target.closest("button")) {
      setOpen(false);
    }
  });

  return { openMenu: () => setOpen(true), closeMenu: () => setOpen(false) };
}

export function initDrawer({ drawer, drawerClose, playBtn }) {
  function openDrawer() {
    drawer.hidden = false;
    playBtn.setAttribute("aria-expanded", "true");
    drawerClose.focus();
  }

  function closeDrawer() {
    const restoreFocus = drawer.contains(document.activeElement);
    drawer.hidden = true;
    playBtn.setAttribute("aria-expanded", "false");
    if (restoreFocus) playBtn.focus();
  }

  playBtn.addEventListener("click", () => {
    if (!drawer.hidden) {
      closeDrawer();
      return;
    }
    openDrawer();
  });

  drawerClose.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !drawer.hidden) closeDrawer();
  });

  return { openDrawer, closeDrawer };
}
