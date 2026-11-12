import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/api/reports/yearly/pdf": ["./assets/fonts/sarabun/*.ttf"],
  },
  partialPrefetching: true,
};

export default nextConfig;
