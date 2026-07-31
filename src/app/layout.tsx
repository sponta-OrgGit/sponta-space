import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/constants";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

const body = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hanken",
  display: "swap",
});

const mono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

const title = "Sponta yrityksille — näy oikeaan hetkeen Kalliossa";
const description =
  "Sponta näyttää läheisyydessä oleville juuri nyt sopivat paikat. Ilmoita yrityksesi mukaan — ilmainen liittyä, ei piilokuluja.";

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
        alt: "Sponta",
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
  themeColor: "#060606",
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
