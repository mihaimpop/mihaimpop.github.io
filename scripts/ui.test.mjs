import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { initTheme } from "../assets/js/ui.js";

/** @param {import("node:test").TestContext} t */
function themeFixture(t, { dark = false, saved = {}, readError = false, writeError = false } = {}) {
  const values = new Map(Object.entries(saved));
  const system = new EventTarget();
  system.matches = dark;
  const themeBtn = new EventTarget();
  const root = { dataset: {} };
  const storage = {
    getItem(key) {
      if (readError) throw new DOMException("Storage access denied", "SecurityError");
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      if (writeError) throw new DOMException("Storage is full", "QuotaExceededError");
      values.set(key, value);
    },
  };

  for (const [key, value] of Object.entries({
    window: { matchMedia: () => system },
    localStorage: storage,
  })) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => {
      if (original) Object.defineProperty(globalThis, key, original);
      else Reflect.deleteProperty(globalThis, key);
    });
  }

  return {
    root,
    themeBtn,
    values,
    changeSystem(matches) {
      system.matches = matches;
      system.dispatchEvent(Object.assign(new Event("change"), { matches }));
    },
  };
}

function assertTheme(fixture, theme) {
  assert.equal(fixture.root.dataset.theme, theme);
  assert.equal(fixture.themeBtn.textContent, `Theme: ${theme === "dark" ? "Dark" : "Light"}`);
}

describe("initTheme", () => {
  it("follows system preferences until a user chooses a theme", (t) => {
    const fixture = themeFixture(t, { dark: true });
    initTheme(fixture);
    assertTheme(fixture, "dark");

    fixture.changeSystem(false);
    assertTheme(fixture, "light");

    fixture.themeBtn.dispatchEvent(new Event("click"));
    fixture.changeSystem(false);
    assertTheme(fixture, "dark");
    assert.equal(fixture.values.get("mihai_theme"), "dark");
    assert.equal(fixture.values.get("mihai_theme_source"), "manual");
  });

  it("restores a saved manual choice instead of the system preference", (t) => {
    const fixture = themeFixture(t, {
      dark: true,
      saved: { mihai_theme: "light", mihai_theme_source: "manual" },
    });

    initTheme(fixture);
    fixture.changeSystem(true);

    assertTheme(fixture, "light");
  });

  for (const saved of [
    { mihai_theme: "light" },
    { mihai_theme: "light", mihai_theme_source: "system" },
    { mihai_theme: "invalid", mihai_theme_source: "manual" },
  ]) {
    it(`uses system preferences for nonmanual or invalid storage: ${JSON.stringify(saved)}`, (t) => {
      const fixture = themeFixture(t, { dark: true, saved });

      initTheme(fixture);
      assertTheme(fixture, "dark");
      fixture.changeSystem(false);

      assertTheme(fixture, "light");
    });
  }

  it("initializes and keeps following the system when storage reads are blocked", (t) => {
    const fixture = themeFixture(t, { dark: true, readError: true });

    assert.doesNotThrow(() => initTheme(fixture));
    assertTheme(fixture, "dark");
    fixture.changeSystem(false);

    assertTheme(fixture, "light");
  });

  it("initializes when accessing localStorage itself throws", (t) => {
    const fixture = themeFixture(t, { dark: true });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("Storage access denied", "SecurityError");
      },
    });

    assert.doesNotThrow(() => initTheme(fixture));

    assertTheme(fixture, "dark");
  });

  it("applies a programmatic manual choice even when storage writes fail", (t) => {
    const fixture = themeFixture(t, { writeError: true });
    const setTheme = initTheme(fixture);

    assert.doesNotThrow(() => setTheme("dark"));
    fixture.changeSystem(false);

    assertTheme(fixture, "dark");
  });

  it("toggles on every click even when storage writes fail", (t) => {
    const fixture = themeFixture(t, { writeError: true });
    initTheme(fixture);

    fixture.themeBtn.dispatchEvent(new Event("click"));
    fixture.changeSystem(false);
    assertTheme(fixture, "dark");
    fixture.themeBtn.dispatchEvent(new Event("click"));

    assertTheme(fixture, "light");
  });

  it("persists programmatic choices under a custom storage key", (t) => {
    const fixture = themeFixture(t);
    const setTheme = initTheme({ ...fixture, storageKey: "test_theme" });

    setTheme("dark");
    fixture.changeSystem(false);

    assertTheme(fixture, "dark");
    assert.equal(fixture.values.get("test_theme"), "dark");
    assert.equal(fixture.values.get("test_theme_source"), "manual");
    assert.equal(fixture.values.has("mihai_theme"), false);
  });
});
