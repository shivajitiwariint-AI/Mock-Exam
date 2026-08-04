/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/adapter-mariadb', 'mariadb'],
  },
};

export default nextConfig;
