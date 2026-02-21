import { initClock, initTheme, initDrawer } from "./ui.js";
import { initTourScene } from "./scene.js";

const M_root = document.documentElement;

const M_dom = {
  canvas: document.getElementById("M_canvas"),
  tour: document.getElementById("M_tour"),
  themeBtn: document.getElementById("M_themeBtn"),
  playBtn: document.getElementById("M_playBtn"),
  tourToggle: document.getElementById("M_tourToggle"),
  drawer: document.getElementById("M_drawer"),
  drawerClose: document.getElementById("M_drawerX"),
  logoBtn: document.getElementById("logoBtn"),
  year: document.getElementById("M_year"),
  clock: document.getElementById("M_clock"),
  headline: document.getElementById("M_headline"),
  subline: document.getElementById("M_subline"),
  chapterKey: document.getElementById("M_chKey"),
  chapterName: document.getElementById("M_chName"),
  modeLabel: document.getElementById("M_modeLabel"),
  modeHint: document.getElementById("M_modeHint"),
};

M_dom.year.textContent = new Date().getFullYear();

initClock(M_dom.clock);
initTheme({ root: M_root, themeBtn: M_dom.themeBtn });
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
  chapterKey: M_dom.chapterKey,
  chapterName: M_dom.chapterName,
  modeLabel: M_dom.modeLabel,
  modeHint: M_dom.modeHint,
  reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
});
