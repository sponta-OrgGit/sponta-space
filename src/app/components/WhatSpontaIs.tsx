const EXAMPLE_QUERIES = [
  "Etsitkö hiljaista työskentelytilaa?",
  "Etsitkö nopeasti kabinettia seurueellesi?",
  "Etsitkö lounasta ennen palaveria?",
  "Etsitkö rentoa paikkaa illaksi?",
];

export function WhatSpontaIs() {
  return (
    <section className="bg-bg-1 px-5 pb-14 pt-24 sm:px-8 sm:pb-20 sm:pt-32">
      <div className="mx-auto max-w-content">
        <div className="border-l-2 border-orange py-1 pl-5 sm:pl-6">
          <p className="font-body text-2xl leading-snug text-fg-1 sm:text-3xl">
            Sponta on <span className="text-orange">kuluttajasovellus</span> — ei nettisivu, ei
            hakemisto.
          </p>
        </div>

        <p className="mt-10 font-body text-sm text-fg-3">Käyttäjä kysyy, esimerkiksi:</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {EXAMPLE_QUERIES.map((q) => (
            <span
              key={q}
              className="rounded-pill border border-white/10 bg-bg-2 px-4 py-2 font-body text-sm text-fg-1"
            >
              {q}
            </span>
          ))}
        </div>

        <p className="mt-8 max-w-xl font-body text-lg leading-relaxed text-fg-2 sm:text-xl">
          Sponta vastaa sekunneissa käyttäjän puhelimessa — ja näyttää juuri ne lähistön paikat,
          jotka sopivat siihen hetkeen. Kellonaika, sää, viikonpäivä ja seura ratkaisevat.{" "}
          <span className="text-fg-1">Sinun paikkasi voi olla yksi niistä.</span>
        </p>
      </div>
    </section>
  );
}
