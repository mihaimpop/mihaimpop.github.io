export function initClock(clockEl, intervalMs = 15000) {
  function tickClock() {
    const d = new Date();
    clockEl.textContent = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  tickClock();
  return setInterval(tickClock, intervalMs);
}

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
