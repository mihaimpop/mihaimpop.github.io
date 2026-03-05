import { initTheme, initDrawer, initHudMenu } from "./ui.js";

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
  caption: document.getElementById("M_caption"),
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
const M_drawerApi = initDrawer({
  drawer: M_dom.drawer,
  drawerClose: M_dom.drawerClose,
  playBtn: M_dom.playBtn,
});

let M_sceneApi = null;

function M_whenIdle(callback) {
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(() => callback(), { timeout: 1200 });
    return;
  }
  window.setTimeout(callback, 200);
}

function M_startScene() {
  // Load the heavy tour module after first paint so controls stay responsive.
  M_whenIdle(() => {
    import("./scene.js")
      .then(({ initTourScene }) => {
        M_sceneApi = initTourScene({
          root: M_root,
          canvas: M_dom.canvas,
          tour: M_dom.tour,
          tourToggle: M_dom.tourToggle,
          caption: M_dom.caption,
          headline: M_dom.headline,
          subline: M_dom.subline,
          scrollHint: M_dom.scrollHint,
          reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
        });
      })
      .catch(() => {
        M_sceneApi = null;
      });
  });
}

if (document.readyState === "complete") {
  M_startScene();
} else {
  window.addEventListener("load", M_startScene, { once: true });
}

M_dom.logoBtn.addEventListener("click", () => {
  M_drawerApi.closeDrawer();
  M_dom.logoBtn.classList.remove("logoBtnFlash");
  // Restart animation class so repeated clicks still trigger.
  void M_dom.logoBtn.offsetWidth;
  M_dom.logoBtn.classList.add("logoBtnFlash");
  M_sceneApi?.triggerBrandRefresh?.();
});
