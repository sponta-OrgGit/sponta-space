import { SectionLabel } from "./SectionLabel";

export function WhatSpontaIs() {
  return (
    <section className="border-b border-ink-line px-5 py-12 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-content">
        <SectionLabel>Mikä Sponta on</SectionLabel>
        <p className="font-body text-xl leading-relaxed text-paper sm:text-2xl">
          Sponta ei ole hakemisto, jota selataan. Se on päätöksentekotyökalu, joka näyttää mikä
          paikka sopii <span className="text-flare">juuri nyt</span> — kellonaika, sää,
          viikonpäivä ja seura ratkaisevat, mitä käyttäjä näkee ensin.
        </p>
      </div>
    </section>
  );
}
