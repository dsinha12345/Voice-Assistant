import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // This is to solve the "Module not found" error for ffmpeg
    if (isServer) {
      config.externals.push('@ffmpeg-installer/ffmpeg');
    }

    return config;
  },
};

export default nextConfig;