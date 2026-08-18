"use client";

import { useEffect, useState } from "react";
import { AppearanceIcon } from "@/components/icons";

// Appearance moved out of the "More" drawer and into Settings, where a
// preference belongs. It also had to start working: the old control lived in
// component state, so the theme reset to light on every navigation. It now
// persists, and the inline script in the root layout applies it before first
// paint so a dark-mode user never sees a white flash.

type Theme = "light" | "dark";

export function AppearanceSetting() {
  // null until mounted: the truth lives on <html>, written by the layout's boot
  // script, and the server cannot know it.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- adopts the theme the boot script already applied; document is server-absent
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  // State drives the document, rather than the click writing to both: one
  // direction, so the button and the page can never disagree.
  useEffect(() => {
    if (!theme) return;
    document.documentElement.dataset.theme = theme;
    // Private browsing can refuse storage; the theme still applies for this
    // session, which is better than failing the click.
    try {
      window.localStorage.setItem("reg-mitra-theme", theme);
    } catch (error) {
      console.warn("[appearance] preference not saved", error);
    }
  }, [theme]);

  const choose = (next: Theme) => setTheme(next);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Appearance</h2>
          <p>Applies to this browser and is remembered on this device.</p>
        </div>
        <AppearanceIcon />
      </div>
      <div className="appearance-choice" role="group" aria-label="Theme">
        {(["light", "dark"] as const).map((option) => (
          <button
            aria-pressed={theme === option}
            className={`appearance-option ${theme === option ? "active" : ""}`}
            key={option}
            onClick={() => choose(option)}
            type="button"
          >
            <span className={`appearance-swatch is-${option}`} aria-hidden="true" />
            <span>
              <strong>{option === "light" ? "Light" : "Dark"}</strong>
              <small>{option === "light" ? "Default" : "Easier in low light"}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
