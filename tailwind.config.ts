import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        marca: {
          DEFAULT: '#1d4ed8',
          dark: '#1e40af',
        },
      },
    },
  },
  plugins: [],
};

export default config;
