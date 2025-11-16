import type { NextConfig } from "next";
import path from "node:path";

const LOADER = path.resolve(__dirname, 'src/visual-edits/component-tagger-loader.js');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // PropertyGuru images
      {
        protocol: 'https',
        hostname: 'cdn.propertyguru.com.sg',
      },
      {
        protocol: 'https',
        hostname: 'pictures.propertycdn.sg',
      },
      {
        protocol: 'https',
        hostname: 'cdn-cms.pgimgs.com',
      },
      // User avatars (if using external service, add here)
      {
        protocol: 'https',
        hostname: 'img.clerk.com', // Clerk avatars
      },
      // Add other trusted domains as needed:
      // { protocol: 'https', hostname: 'res.cloudinary.com' },
      // { protocol: 'https', hostname: 'your-cdn.com' },
    ],
  },
  outputFileTracingRoot: path.resolve(__dirname, '../../'),
  turbopack: {
    rules: {
      "*.{jsx,tsx}": {
        loaders: [LOADER]
      }
    }
  }
};

export default nextConfig;

