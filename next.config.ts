import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.appwrite.io https://sgp.cloud.appwrite.io",
      "font-src 'self' data:",
      "connect-src 'self' https://*.appwrite.io https://sgp.cloud.appwrite.io wss://*.appwrite.io",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; "),
  },
];

const privateNoCacheHeaders = [
  {
    key: "Cache-Control",
    value: "private, no-cache, no-store, must-revalidate",
  },
  {
    key: "Pragma",
    value: "no-cache",
  },
  {
    key: "Expires",
    value: "0",
  },
];

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ["playwright"],
  outputFileTracingIncludes: {
    "/api/admin/documents/*": [
      "./node_modules/@fontsource/inter/files/inter-latin-{400,700}-normal.woff2",
      "./node_modules/@fontsource/poppins/files/poppins-latin-{600,700}-normal.woff2",
      "./public/brand-logo.png",
      "./public/yash-sign.png",
      "./public/crewline-badge-transparent.png",
    ],
    "/api/applications": [
      "./node_modules/@fontsource/inter/files/inter-latin-{400,700}-normal.woff2",
      "./node_modules/@fontsource/poppins/files/poppins-latin-{600,700}-normal.woff2",
      "./public/brand-logo.png",
      "./public/yash-sign.png",
      "./public/crewline-badge-transparent.png",
    ],
    "/api/admin/submissions/**": [
      "./node_modules/@fontsource/inter/files/inter-latin-{400,700}-normal.woff2",
      "./node_modules/@fontsource/poppins/files/poppins-latin-{600,700}-normal.woff2",
      "./public/brand-logo.png",
      "./public/yash-sign.png",
      "./public/crewline-badge-transparent.png",
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/account/:path*",
        headers: privateNoCacheHeaders,
      },
      {
        source: "/admin/:path*",
        headers: privateNoCacheHeaders,
      },
      {
        source: "/api/:path*",
        headers: privateNoCacheHeaders,
      },
    ];
  },
};

export default nextConfig;
