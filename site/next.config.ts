import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(import.meta.dirname),
  outputFileTracingExcludes: {
    '*': ['./node_modules/@img/**', './node_modules/sharp/**'],
  },
  images: { unoptimized: true },
};

export default nextConfig;
