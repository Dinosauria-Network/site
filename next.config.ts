import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  sassOptions: {
    additionalData: `$chalk: #e7e6e3;`,
  },
};

export default nextConfig;
