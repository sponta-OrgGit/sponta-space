import Image from "next/image";
import { LiveReadout } from "./LiveReadout";

export function Hero() {
  return (
    <section className="relative px-5 pb-20 pt-10 sm:px-8 sm:pb-28 sm:pt-14">
      {/* Warm streetlight glow behind the hero content — contained in its
          own clipped wrapper so it doesn't force horizontal scroll, while
          the section itself stays unclipped so the LiveReadout card below
          can bleed past the hero boundary. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-orange/25 blur-[120px]" />
      </div>

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
      </div>

      {/* Floating card, deliberately bleeding across the section boundary
          instead of sitting neatly stacked inside it. */}
      <div className="relative z-10 mx-auto -mb-12 mt-10 max-w-content sm:-mb-16">
        <LiveReadout />
      </div>
    </section>
  );
}
