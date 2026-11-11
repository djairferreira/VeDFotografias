import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fotos do site trocadas pelo admin chegam por Server Action (a Vercel limita a 4,5 MB).
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
  serverExternalPackages: ["sharp", "archiver"],
  poweredByHeader: false,
};

export default nextConfig;
