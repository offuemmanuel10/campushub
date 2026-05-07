import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
    {
  protocol: 'https',
  hostname: 'tse1.mm.bing.net',
  port: '',
  pathname: '/**',
},
{
  protocol: 'https',
  hostname: 'tse2.mm.bing.net',
  port: '',
  pathname: '/**',
},
{
  protocol: 'https',
  hostname: 'tse3.mm.bing.net',
  port: '',
  pathname: '/**',
},
{
  protocol: 'https',
  hostname: 'tse4.mm.bing.net',
  port: '',
  pathname: '/**',
},
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  output: 'standalone',
  transpilePackages: ['motion'],
  webpack: (config, {dev}) => {
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;