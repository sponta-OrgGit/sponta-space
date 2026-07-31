"use client";

import { useEffect, useState } from "react";

const WEEKDAYS_FI = [
  "sunnuntai",
  "maanantai",
  "tiistai",
  "keskiviikko",
  "torstai",
  "perjantai",
  "lauantai",
];

// Illustrative examples of the kind of context signal Sponta actually
// matches on (time, weather, day, company) — not fetched from anywhere,
// just cycled, so the page never depends on a live service to render.
const SIGNAL_EXAMPLES = [
  "nälkäinen pari, 5 min kävelymatka",
  "sateinen ilta, lämmin tunnelma haussa",
  "nopea lounas ennen palaveria",
  "perjantai-ilta, isompi porukka liikkeellä",
  "yksin, rauhallinen nurkka luettavaksi",
];

function dayPart(hour: number): string {
  if (hour >= 5 && hour < 10) return "aamu";
  if (hour >= 10 && hour < 14) return "lounasaika";
  if (hour >= 14 && hour < 17) return "iltapäivä";
  if (hour >= 17 && hour < 22) return "ilta";
  return "yö";
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function LiveReadout() {
  // Rendered only after mount, so the prerendered HTML never has to
  // guess at "now" — see DESIGN_NOTES.md for why.
  const [now, setNow] = useState<Date | null>(null);
  const [signalIndex, setSignalIndex] = useState(0);

  useEffect(() => {
    setNow(new Date());
    const clock = window.setInterval(() => setNow(new Date()), 30_000);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let rotation: number | undefined;
    if (!reduceMotion) {
      rotation = window.setInterval(
        () => setSignalIndex((i) => (i + 1) % SIGNAL_EXAMPLES.length),
        4000
      );
    }

    return () => {
      window.clearInterval(clock);
      if (rotation) window.clearInterval(rotation);
    };
  }, []);

  return (
    <div className="w-full rounded-xl border border-white/10 bg-bg-2/70 px-5 py-4 backdrop-blur-sm">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-xs sm:text-sm">
        <span className="inline-flex items-center gap-2 text-teal">
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full bg-teal motion-safe:animate-pulse"
          />
          nyt
        </span>
        <span className="text-fg-1" suppressHydrationWarning>
          {now
            ? `${WEEKDAYS_FI[now.getDay()]}, ${pad(now.getHours())}:${pad(now.getMinutes())}`
            : "—"}
        </span>
        <span className="text-fg-3" suppressHydrationWarning>
          {now ? `· ${dayPart(now.getHours())}` : ""}
        </span>
      </div>
      <p className="mt-2 font-body text-sm text-fg-2">
        <span className="text-orange">→ sopisi juuri: </span>
        {SIGNAL_EXAMPLES[signalIndex]}
      </p>
    </div>
  );
}
