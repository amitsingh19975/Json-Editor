/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {},
    ripple: theme => ({
        colors: theme('colors'),
        modifierTransition: 'background 500ms',
        activeTransition: 'background 200ms'
    }),
  },
  plugins: [
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('tailwindcss-ripple')()
  ],
};