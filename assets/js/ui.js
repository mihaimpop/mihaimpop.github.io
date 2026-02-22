export function initTheme({ root, themeBtn, storageKey = "mihai_theme" }) {
  const savedTheme = localStorage.getItem(storageKey);
  const initialTheme = savedTheme || "light";

  function setTheme(theme) {
    root.dataset.theme = theme;
    localStorage.setItem(storageKey, theme);
    themeBtn.textContent = `Theme: ${theme[0].toUpperCase()}${theme.slice(1)}`;
  }

  setTheme(initialTheme);
  themeBtn.addEventListener("click", () => {
    setTheme(root.dataset.theme === "dark" ? "light" : "dark");
  });

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

export function initDrawer({ drawer, drawerClose, playBtn, logoBtn }) {
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
  logoBtn.addEventListener("click", openDrawer);

  return { openDrawer, closeDrawer };
}
