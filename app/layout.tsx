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
  metadataBase: new URL("https://robotics.amasetti.com"),
  title: "Nexus Robotics — digital twin for servo robots",
  description:
    "Pose a 3D robot by hand, build and play pose sequences, and drive the real robot from the browser. Optimus biped and Spot Micro quadruped, defined by URDF + robot.json.",
  openGraph: {
    title: "Nexus Robotics — digital twin for servo robots",
    description:
      "Pose a 3D robot by hand, build and play pose sequences, and drive the real robot from the browser.",
    url: "/robotics",
    images: ["/og.png"],
  },
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
      <body className="bg-hud-bg text-hud-text min-h-full">{children}</body>
    </html>
  );
}
