/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0B0D17',
          900: '#0F1220',
          800: '#171B2E',
          700: '#232842',
        },
        gold: {
          400: '#F7C948',
          500: '#F5B700',
          600: '#D99C00',
        },
        teal: {
          400: '#4DD8C9',
          500: '#2DD4BF',
          600: '#1FA898',
        },
        coral: {
          400: '#FF8577',
          500: '#FF6B6B',
        },
        mist: {
          100: '#F4F5FA',
          300: '#C7CBE0',
          500: '#8A8FB0',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
