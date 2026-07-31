"use client";

import { useState } from "react";
import { LogIn, X } from "lucide-react";

export function Header() {
  const [showMessage, setShowMessage] = useState(false);

  return (
    <header className="relative border-b border-white/10 bg-bg-0 px-5 py-4 sm:px-8">
      <div className="mx-auto flex max-w-content items-center justify-end">
        <button
          type="button"
          onClick={() => setShowMessage((v) => !v)}
          aria-expanded={showMessage}
          aria-controls="login-coming-soon"
          className="pressable inline-flex items-center gap-2 rounded-pill border border-white/15 px-4 py-2 font-body text-sm text-fg-1 transition-colors hover:bg-bg-3"
        >
          <LogIn size={16} strokeWidth={2} aria-hidden />
          Kirjaudu
        </button>
      </div>

      {showMessage && (
        <div
          id="login-coming-soon"
          role="status"
          className="animate-fade-up absolute right-5 top-full z-20 mt-2 w-72 rounded-xl border border-white/10 bg-bg-2 p-4 shadow-card sm:right-8"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="font-body text-sm leading-relaxed text-fg-2">
              <span className="font-display font-bold text-fg-1">Tulossa.</span> Tämän sivun
              kautta pääset jatkossa kirjautumaan sisälle ja näkemään miten yrityksesi toimii
              markkinoilla.
            </p>
            <button
              type="button"
              onClick={() => setShowMessage(false)}
              aria-label="Sulje"
              className="pressable shrink-0 text-fg-3 hover:text-fg-1"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
