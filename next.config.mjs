/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/adapter-mariadb', 'mariadb'],
  },
  async redirects() {
    return [
      {
        source: '/question-bank',
        destination: '/interview/questions',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
