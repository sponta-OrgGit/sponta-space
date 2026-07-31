import { MapPin, Sparkles, PenLine } from "lucide-react";
import { SectionLabel } from "./SectionLabel";

const BENEFITS = [
  {
    icon: MapPin,
    title: "Näkyvyyttä juuri nyt",
    body: "Näyt lähistöllä oleville silloin kun he päättävät minne mennä — et hukkuneena pitkään listaan.",
    highlight: false,
  },
  {
    icon: Sparkles,
    title: "Ilmainen liittyä",
    body: "Ei piilokuluja. Lisämaksusta saat työkaluja, jotka nostavat näkyvyyttäsi lähellä oleville ryhmille.",
    highlight: true,
  },
  {
    icon: PenLine,
    title: "Sinä hallitset tietosi",
    body: "Kuvat ja kuvausteksti pysyvät sinun käsissäsi. Korjaa tai täydennä milloin vain.",
    highlight: false,
  },
];

export function WhatVenueGets() {
  return (
    <section className="border-b border-white/10 bg-bg-0 px-5 py-12 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-content">
        <SectionLabel>Mitä saat</SectionLabel>
        <div className="grid gap-5 sm:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, body, highlight }) => (
            <div
              key={title}
              className={
                "rounded-xl border px-5 py-6 shadow-card transition-colors " +
                (highlight
                  ? "border-orange/40 bg-bg-2 shadow-glow-orange sm:scale-105 sm:py-7"
                  : "border-white/10 bg-bg-2 hover:bg-bg-3")
              }
            >
              <span
                className={
                  "inline-flex h-10 w-10 items-center justify-center rounded-full " +
                  (highlight ? "bg-orange/25" : "bg-orange/15")
                }
              >
                <Icon size={20} strokeWidth={2} className="text-orange" aria-hidden />
              </span>
              <h3 className="mt-4 font-display text-xl font-bold leading-tight text-fg-1">
                {title}
              </h3>
              <p className="mt-2 font-body text-sm leading-relaxed text-fg-2">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
