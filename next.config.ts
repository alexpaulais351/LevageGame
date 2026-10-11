import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fichiers envoyés via Server Action (logo ≤ 1 Mo, photo ≤ 2 Mo, PDF constructeur ≤ 15 Mo) : marge pour l'enveloppe multipart.
  experimental: { serverActions: { bodySizeLimit: "20mb" } },
};

export default nextConfig;
