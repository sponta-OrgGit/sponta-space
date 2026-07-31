import { SectionLabel } from "./SectionLabel";

const BENEFITS = [
  {
    tag: "01",
    title: "Näkyvyys juuri nyt päättäville",
    body: "Näyt lähistöllä oleville käyttäjille sillä hetkellä, kun he päättävät minne mennä — ei hukkuneena pitkään listaan.",
  },
  {
    tag: "02",
    title: "Ei provisiota, ei mainospaikkoja",
    body: "Näkyvyys ei ole ostettavissa eikä siitä laskuteta myynnin mukaan. Sama kohtelu jokaiselle Kallion paikalle.",
  },
  {
    tag: "03",
    title: "Sinä hallitset tietosi",
    body: "Kuvat, kuvausteksti ja tiedot pysyvät sinun hallinnassasi — voit korjata tai täydentää niitä milloin tahansa.",
  },
];

export function WhatVenueGets() {
  return (
    <section className="border-b border-ink-line bg-ink-raised/40 px-5 py-12 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-content">
        <SectionLabel>Mitä saat</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
          {BENEFITS.map((b) => (
            <div
              key={b.tag}
              className="rounded-sm border border-ink-line bg-ink px-5 py-6 transition-colors hover:border-flare-dim"
            >
              <span className="font-mono text-xs text-flare">{b.tag}</span>
              <h3 className="mt-3 font-display text-xl font-semibold uppercase leading-tight text-paper">
                {b.title}
              </h3>
              <p className="mt-2 font-body text-sm leading-relaxed text-mist">{b.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
