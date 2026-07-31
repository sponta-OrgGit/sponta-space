import { Hero } from "./components/Hero";
import { WhatSpontaIs } from "./components/WhatSpontaIs";
import { WhatVenueGets } from "./components/WhatVenueGets";
import { HowDataWorks } from "./components/HowDataWorks";
import { InterestForm } from "./components/InterestForm";
import { Footer } from "./components/Footer";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-ink">
      <Hero />
      <WhatSpontaIs />
      <WhatVenueGets />
      <HowDataWorks />
      <InterestForm />
      <Footer />
    </main>
  );
}
