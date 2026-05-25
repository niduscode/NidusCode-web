/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './script.js',
    './contact-form.js',
    './demos/opero/*.html',
  ],
  darkMode: 'media',
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          50:  '#f7f7f8',
          100: '#ececef',
          200: '#d4d4da',
          300: '#a8a8b3',
          400: '#71717f',
          500: '#52525e',
          600: '#3f3f48',
          700: '#2a2a32',
          800: '#16161c',
          900: '#0a0a0f',
        },
        accent: {
          DEFAULT: '#7c5cfc',
          hover:   '#6a47f0',
          2:       '#8b5cf6',
          3:       '#ff3db4',
        }
      }
    }
  }
};
