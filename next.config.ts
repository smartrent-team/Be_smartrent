import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cho phép Server Actions hoạt động qua tunnel domain
  allowedDevOrigins: [
    "postabdominal-vicenta-sapiential.ngrok-free.dev",
    "*.ngrok-free.app",
    "*.ngrok.io",
    "*.trycloudflare.com",
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
};

export default nextConfig;