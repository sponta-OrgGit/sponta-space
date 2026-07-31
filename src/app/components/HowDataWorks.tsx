import { SectionLabel } from "./SectionLabel";

export function HowDataWorks() {
  return (
    <section className="border-b border-ink-line px-5 py-12 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-content">
        <SectionLabel>Miten data toimii</SectionLabel>
        <div className="space-y-4 font-body text-lg leading-relaxed text-paper sm:text-xl">
          <p>
            Luemme lounas- ja aukioloaikatiedot suoraan{" "}
            <span className="text-signal">ravintolan omalta verkkosivulta</span>, jotta tieto
            pysyy ajan tasalla.
          </p>
          <p className="text-mist">
            Emme käytä kolmannen osapuolen kokoaja&shy;palveluita. Voit korjata tietosi tai ottaa
            ne haltuun milloin tahansa — omat tietosi voittavat aina automaattisesti kerätyn
            tiedon.
          </p>
        </div>
      </div>
    </section>
  );
}
