import type { Metadata, Viewport } from "next";
import { Big_Shoulders_Display, Archivo, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/constants";

const display = Big_Shoulders_Display({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-big-shoulders",
  display: "swap",
});

const body = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-archivo",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const title = "Sponta yrityksille — näy oikeaan hetkeen Kalliossa";
const description =
  "Sponta näyttää läheisyydessä oleville juuri nyt sopivat paikat — ei listaa, vaan päätöksentekohetken. Ilmoita yrityksesi kiinnostuksen, ei provisiota, ei mainospaikkoja.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title,
  description,
  applicationName: SITE.name,
  authors: [{ name: SITE.companyName }],
  openGraph: {
    title,
    description,
    url: SITE.url,
    siteName: SITE.name,
    locale: "fi_FI",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Sponta — tuomme kaupungin jokaisen ulottuville",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#14161c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fi" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
