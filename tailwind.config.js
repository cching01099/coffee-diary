/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#E3D4C3',        // Mother of Pearl
        card: '#F2EAE0',
        card2: '#DCC9B4',
        ink: '#5C3826',       // Chocolate Cremoso (primary text)
        cta: '#704C3A',       // lightened ink, used for solid button/pill backgrounds only
        'ink-dim': '#8A6A50',
        accent: '#8A5A38',    // lighter accent for highlights/stars/progress
        line: 'rgba(92,56,38,0.16)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
