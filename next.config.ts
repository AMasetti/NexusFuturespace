import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",

  // App uses local/data-URI images only — no remote image optimisation needed.
  // Remove this if Vercel deployment with remote images is added later.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
