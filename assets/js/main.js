import { initTheme, initDrawer, initHudMenu } from "./ui.js";
import { initTourScene } from "./scene.js";

const M_root = document.documentElement;

const M_dom = {
  hud: document.getElementById("M_hud"),
  menuBtn: document.getElementById("M_menuBtn"),
  controlsMenu: document.getElementById("M_controlsMenu"),
  canvas: document.getElementById("M_canvas"),
  tour: document.getElementById("M_tour"),
  themeBtn: document.getElementById("M_themeBtn"),
  playBtn: document.getElementById("M_playBtn"),
  tourToggle: document.getElementById("M_tourToggle"),
  drawer: document.getElementById("M_drawer"),
  drawerClose: document.getElementById("M_drawerX"),
  logoBtn: document.getElementById("logoBtn"),
  year: document.getElementById("M_year"),
  headline: document.getElementById("M_headline"),
  subline: document.getElementById("M_subline"),
  scrollHint: document.getElementById("M_scrollHint"),
};

M_dom.year.textContent = new Date().getFullYear();

function syncHudOffset() {
  const hudHeight = M_dom.hud.getBoundingClientRect().height;
  M_root.style.setProperty("--hud-offset", `${Math.ceil(hudHeight + 20)}px`);
}

syncHudOffset();
window.addEventListener("resize", syncHudOffset, { passive: true });
if (window.ResizeObserver) {
  new ResizeObserver(syncHudOffset).observe(M_dom.hud);
}

initTheme({ root: M_root, themeBtn: M_dom.themeBtn });
initHudMenu({ hud: M_dom.hud, menuBtn: M_dom.menuBtn, controlsMenu: M_dom.controlsMenu });
initDrawer({
  drawer: M_dom.drawer,
  drawerClose: M_dom.drawerClose,
  playBtn: M_dom.playBtn,
  logoBtn: M_dom.logoBtn,
});

initTourScene({
  root: M_root,
  canvas: M_dom.canvas,
  tour: M_dom.tour,
  tourToggle: M_dom.tourToggle,
  headline: M_dom.headline,
  subline: M_dom.subline,
  scrollHint: M_dom.scrollHint,
  reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
});
