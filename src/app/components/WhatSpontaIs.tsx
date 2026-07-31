import { SectionLabel } from "./SectionLabel";

export function WhatSpontaIs() {
  return (
    <section className="border-b border-white/10 px-5 py-12 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-content">
        <SectionLabel>Mikä Sponta on</SectionLabel>
        <p className="font-body text-xl leading-relaxed text-fg-1 sm:text-2xl">
          Sponta ei ole lista selattavaksi. Se näyttää heti mikä paikka sopii{" "}
          <span className="text-orange">juuri nyt</span> — kellonaika, sää, viikonpäivä ja seura
          ratkaisevat.
        </p>
      </div>
    </section>
  );
}
