/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Permite cuerpos de petición más grandes para subir Excel / adjuntos.
  experimental: {
    serverActions: {
      bodySizeLimit: '15mb',
    },
  },
};

export default nextConfig;
