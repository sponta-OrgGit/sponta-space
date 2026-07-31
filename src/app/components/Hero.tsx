import Image from "next/image";
import { LiveReadout } from "./LiveReadout";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-white/10 px-5 pb-12 pt-10 sm:px-8 sm:pb-16 sm:pt-14">
      {/* Warm streetlight glow behind the hero content */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-orange/25 blur-[120px]"
      />
      <div className="relative mx-auto max-w-content">
        <Image
          src="/logo-transparent.png"
          alt="Sponta"
          width={600}
          height={300}
          priority
          unoptimized
          className="h-16 w-auto sm:h-20"
        />
        <p className="overline mb-5 mt-8">Sponta yrityksille</p>
        <h1 className="font-display text-[2.5rem] font-extrabold leading-[1.02] tracking-tight text-fg-1 sm:text-6xl">
          Tuomme kaupungin jokaisen ulottuville.
        </h1>
        <p className="mt-5 max-w-md font-body text-lg text-fg-2 sm:text-xl">
          Sponta löytää käyttäjälle oikean paikan oikealla hetkellä — aloitamme Kalliosta.
        </p>
        <div className="mt-8">
          <LiveReadout />
        </div>
      </div>
    </section>
  );
}
