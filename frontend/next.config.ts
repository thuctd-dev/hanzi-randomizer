import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
    // Bật tối ưu ảnh (bỏ unoptimized)
    formats: ["image/avif", "image/webp"],
  },
  // Bật compression
  compress: true,
  // Tối ưu package imports
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
