import { MapPin, Sparkles, PenLine } from "lucide-react";
import { SectionLabel } from "./SectionLabel";

const BENEFITS = [
  {
    icon: MapPin,
    title: "Näkyvyyttä juuri nyt",
    body: "Näyt lähistöllä oleville silloin kun he päättävät minne mennä — et hukkuneena pitkään listaan.",
  },
  {
    icon: Sparkles,
    title: "Ilmainen liittyä",
    body: "Ei piilokuluja, ei ostettavia mainospaikkoja. Sama kohtelu jokaiselle Kallion paikalle.",
  },
  {
    icon: PenLine,
    title: "Sinä hallitset tietosi",
    body: "Kuvat ja kuvausteksti pysyvät sinun käsissäsi. Korjaa tai täydennä milloin vain.",
  },
];

export function WhatVenueGets() {
  return (
    <section className="border-b border-white/10 bg-bg-1 px-5 py-12 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-content">
        <SectionLabel>Mitä saat</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
          {BENEFITS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-xl border border-white/10 bg-bg-2 px-5 py-6 shadow-card transition-colors hover:bg-bg-3"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-orange/15">
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
