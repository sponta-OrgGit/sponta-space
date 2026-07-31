import { Button } from "./components/ui/button";
import { Footer } from "./components/ui/footer";
import { Header } from "./components/ui/header";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "linear-gradient(to bottom, black, white)",
        textAlign: "center",
      }}
    >
      <Header>
      <Image 
        src="/logo.svg" 
        alt="Sponta Logo" 
        width={500} 
        height={200} 
        priority
        unoptimized
      />
      </Header>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "3rem 1.5rem",
          backgroundColor: "white",
          width: "100%",
        }}
      >
        <p
          style={{
            fontSize: "1.25rem",
            color: "#4b5563",
            maxWidth: "48rem",
            marginBottom: "2rem",
          }}
        >
          The hard truth is that culture is always the first to suffer from funding cuts. Cities are alive, but understanding their pulse is difficult. Every venue has a unique story, yet the challenge remains: how to tell it, and to whom?
        </p>
        <h2
          style={{
            fontSize: "1.875rem",
            fontWeight: "600",
            marginBottom: "1rem",
          }}
        >
          What We Do
        </h2>
        <p
          style={{
            fontSize: "1.125rem",
            color: "#4b5563",
            maxWidth: "40rem",
            marginBottom: "1.5rem",
          }}
        >
          Sponta personalizes venues by giving them a digital identity and tools that go beyond the traditional &quot;service promise.&quot; We empower venues to reach the right audience while providing people with a product that simplifies and enriches their free time—whether individually or as a group.
        </p>
        <p
          style={{
            fontSize: "1.125rem",
            fontWeight: "700",
            maxWidth: "40rem",
            marginBottom: "1.5rem",
          }}
        >
          We come from the underground. We make sure there is always something for everyone. No one should feel forgotten.
        </p>
        <Button>
          Join the Movement
        </Button>
      </div>
      <Footer />
    </div>
  );
}
