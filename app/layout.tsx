import type { Metadata } from "next";
import { Rajdhani, JetBrains_Mono, Exo_2 } from "next/font/google";
import "./globals.css";

const rajdhani = Rajdhani({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-rajdhani",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const exo2 = Exo_2({
  weight: ["300", "400", "600"],
  subsets: ["latin"],
  variable: "--font-exo2",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NEXUS HUD — Robotics UI Component Library",
  description: "Sci-fi HUD component library for robotics, AI, and scientific visualization frontends",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${rajdhani.variable} ${jetbrainsMono.variable} ${exo2.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-hud-bg text-hud-text">{children}</body>
    </html>
  );
}
