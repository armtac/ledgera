import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output standalone per compatibilità deploy Vercel (evita 404)
  output: "standalone",
};

export default nextConfig;
