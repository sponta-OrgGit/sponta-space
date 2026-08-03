import { Compass, Users, UserPlus } from "lucide-react";
import { SectionLabel } from "./SectionLabel";

const PROBLEMS = [
  {
    icon: Compass,
    heading: "Oikea paikka juuri nyt",
    body: (
      <>
        Käyttäjä ei selaa listaa — hän kysyy: <em className="text-fg-1 not-italic">”Etsitkö hiljaista
        työskentelytilaa?”</em>, <em className="text-fg-1 not-italic">”Etsitkö lounasta ennen
        palaveria?”</em>. Sponta vastaa sekunneissa kellonajan, sään, viikonpäivän ja seuran
        perusteella — ja näyttää juuri sinut, kun sovit siihen hetkeen.
      </>
    ),
  },
  {
    icon: Users,
    heading: "Ei enää loputonta ketjukeskustelua",
    body: "Kaveriporukka ei jaksa sopia minne mennä — Sponta ehdottaa, ja porukka päättää yhdessä nopeasti. Kun ryhmä valitsee sinut, se on isompi pöytä ja useampi tilaus kerralla.",
  },
  {
    icon: UserPlus,
    heading: "Yhteisöjen kautta uusia kasvoja",
    body: "Rakennamme tapaa löytää paikkoja yhteisöjen ja suositusten kautta — ei pelkän algoritmin. Se tuo sinulle asiakkaita, jotka palaavat, eivät vain käy kerran.",
  },
];

export function WhatSpontaIs() {
  return (
    <section className="bg-bg-1 px-5 pb-14 pt-24 sm:px-8 sm:pb-20 sm:pt-32">
      <div className="mx-auto max-w-content">
        <SectionLabel>Kolme ongelmaa, jotka ratkaisemme</SectionLabel>
        <p className="max-w-xl font-body text-2xl leading-snug text-fg-1 sm:text-3xl">
          Sponta on <span className="text-orange">kuluttajasovellus</span> — ei nettisivu, ei
          hakemisto. Se ratkaisee kolme ongelmaa kerralla, ja jokainen tuo sinulle näkyvyyttä.
        </p>

        <div className="mt-12 space-y-10 sm:mt-16 sm:space-y-12">
          {PROBLEMS.map(({ icon: Icon, heading, body }) => (
            <div key={heading} className="flex gap-5 sm:gap-6">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange/15">
                <Icon size={22} strokeWidth={2} className="text-orange" aria-hidden />
              </span>
              <div>
                <h3 className="font-display text-xl font-bold leading-tight text-fg-1 sm:text-2xl">
                  {heading}
                </h3>
                <p className="mt-2 max-w-xl font-body text-base leading-relaxed text-fg-2 sm:text-lg">
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
