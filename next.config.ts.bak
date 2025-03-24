import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  webpack: (config, { isServer }) => {
    // Only include fs-extra, path and other Node.js modules on the server side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        buffer: false,
      };
    }
    
    return config;
  },
  
  // Exclude specific server-only modules from client builds
  serverExternalPackages: ['fs', 'fs-extra', 'path', 'crypto'],
};

export default nextConfig;
