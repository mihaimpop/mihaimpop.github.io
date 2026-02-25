export function initTheme({ root, themeBtn, storageKey = "mihai_theme" }) {
  const sourceKey = `${storageKey}_source`;
  const systemThemeQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
  const savedTheme = localStorage.getItem(storageKey);
  const savedSource = localStorage.getItem(sourceKey);
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
    manualTheme = true;
    localStorage.setItem(storageKey, nextTheme);
    localStorage.setItem(sourceKey, "manual");
    applyTheme(nextTheme);
  });

  function setTheme(theme) {
    manualTheme = true;
    localStorage.setItem(storageKey, theme);
    localStorage.setItem(sourceKey, "manual");
    applyTheme(theme);
  }

  return setTheme;
}

export function initHudMenu({ hud, menuBtn, controlsMenu }) {
  function setOpen(isOpen) {
    menuBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    controlsMenu.hidden = !isOpen;
    hud.classList.toggle("hudMenuOpen", isOpen);
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
    drawer.style.display = "block";
  }

  function closeDrawer() {
    drawer.style.display = "none";
  }

  playBtn.addEventListener("click", () => {
    if (drawer.style.display === "block") {
      closeDrawer();
      return;
    }
    openDrawer();
  });

  drawerClose.addEventListener("click", closeDrawer);

  return { openDrawer, closeDrawer };
}
