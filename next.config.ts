import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cegah warning Turbopack saat user folder berisi spasi (mis. "farhan a").
  turbopack: {
    root: process.cwd(),
  },
  /* config options here */
};

export default nextConfig;
