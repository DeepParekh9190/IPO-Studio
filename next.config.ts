import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Admin logo uploads are capped at 4 MB in the action; leave room for multipart overhead.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
