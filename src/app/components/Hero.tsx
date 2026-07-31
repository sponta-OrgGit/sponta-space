import Image from "next/image";
import { LiveReadout } from "./LiveReadout";

export function Hero() {
  return (
    <section className="border-b border-ink-line px-5 pb-12 pt-10 sm:px-8 sm:pb-16 sm:pt-14">
      <div className="mx-auto max-w-content">
        <Image
          src="/logo.png"
          alt="Sponta"
          width={600}
          height={300}
          priority
          unoptimized
          className="h-16 w-auto sm:h-20"
        />
        <p className="eyebrow mb-5 mt-8">SPONTA YRITYKSILLE</p>
        <h1 className="font-display text-[2.75rem] font-bold uppercase leading-[0.95] tracking-tight text-paper sm:text-6xl">
          Tuomme kaupungin jokaisen ulottuville.
        </h1>
        <p className="mt-5 max-w-md font-body text-lg text-mist sm:text-xl">
          Sponta löytää käyttäjälle oikean paikan oikealla hetkellä — aloitamme Kalliosta.
        </p>
        <div className="mt-8">
          <LiveReadout />
        </div>
      </div>
    </section>
  );
}
