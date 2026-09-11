import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Supabase storage URLs — covers all Supabase-hosted projects
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        // Self-hosted Supabase
        protocol: 'https',
        hostname: '*.supabase.com',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
