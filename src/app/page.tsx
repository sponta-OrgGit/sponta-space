import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { WhatSpontaIs } from "./components/WhatSpontaIs";
import { WhatVenueGets } from "./components/WhatVenueGets";
import { HowDataWorks } from "./components/HowDataWorks";
import { InterestForm } from "./components/InterestForm";
import { Footer } from "./components/Footer";

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-bg-0">
      <Header />
      <Hero />
      <WhatSpontaIs />
      <WhatVenueGets />
      <HowDataWorks />
      <InterestForm />
      <Footer />
    </main>
  );
}
