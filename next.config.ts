import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ["playwright"],
  outputFileTracingIncludes: {
    "/api/admin/documents/*": [
      "./node_modules/@fontsource/inter/files/inter-latin-{400,700}-normal.woff2",
      "./node_modules/@fontsource/poppins/files/poppins-latin-{600,700}-normal.woff2",
    ],
  },
};

export default nextConfig;
