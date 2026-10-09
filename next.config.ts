import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Audio/video uploads and JSON data live outside the bundle
  serverExternalPackages: ["bcryptjs", "nodemailer"],
  typescript: {
    // Type errors are surfaced by `npm run typecheck`; never block a build on them
    ignoreBuildErrors: true,
  },
  // Allow the hosted preview hostname to talk to the dev server
  allowedDevOrigins: ["*.e2b.app", "*.arena.ai"],
  experimental: {
    // Allow large audio/video uploads through route handlers
    proxyClientMaxBodySize: "200mb",
  },
};

export default nextConfig;
