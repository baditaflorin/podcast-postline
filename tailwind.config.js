/** @type {import('tailwindcss').Config} */
export default {
  content: ['./frontend/index.html', './frontend/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        panel: '0 24px 60px rgba(23, 32, 38, 0.12)'
      }
    }
  },
  plugins: []
};

