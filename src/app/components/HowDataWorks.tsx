import { SectionLabel } from "./SectionLabel";

export function HowDataWorks() {
  return (
    <section className="border-b border-white/10 px-5 py-12 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-content">
        <SectionLabel>Miten data toimii</SectionLabel>
        <div className="space-y-4 font-body text-lg leading-relaxed text-fg-1 sm:text-xl">
          <p>
            Luemme lounas- ja aukioloaikatiedot suoraan{" "}
            <span className="text-teal">omalta verkkosivultasi</span>, niin ne pysyvät ajan
            tasalla.
          </p>
          <p className="text-fg-2">
            Ei kolmannen osapuolen kokoajapalveluita. Voit korjata tietosi tai ottaa ne haltuun
            milloin vain — omat tietosi voittavat aina automaattisesti kerätyn tiedon.
          </p>
        </div>
      </div>
    </section>
  );
}
