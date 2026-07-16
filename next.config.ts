import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cho phép Server Actions hoạt động qua Ngrok domain
  allowedDevOrigins: [
    "postabdominal-vicenta-sapiential.ngrok-free.dev",
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