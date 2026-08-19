import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cho phép Server Actions hoạt động qua tunnel domain
  allowedDevOrigins: [
    "postabdominal-vicenta-sapiential.ngrok-free.dev",
    "*.ngrok-free.app",
    "*.ngrok.io",
    "*.trycloudflare.com",
  ],
  // Các package chỉ chạy trên Node.js — không bundle vào browser/edge
  serverExternalPackages: [
    'firebase-admin',
    'firebase-admin/app',
    'firebase-admin/messaging',
    'google-auth-library',
    'gcp-metadata',
    'https-proxy-agent',
    'agent-base',
    'jwa',
    'jws',
    'node-fetch',
    'node-domexception',
    'fetch-blob',
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/python/:path*",
        destination: "http://localhost:8000/:path*",
      },
    ];
  },
  experimental: {
    instrumentationHook: true,
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
  },
};

export default nextConfig;