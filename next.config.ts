import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Logo d'entreprise (≤ 1 Mo) envoyé via Server Action : marge pour l'enveloppe multipart.
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
};

export default nextConfig;
