/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        // The zero-glare matte black foundation
        dfinBase: '#0a0a0a', 
        // Deep graphite for surfaces/cards
        dfinSurface: '#171717', 
        // Shining dark accent for active states/gradients
        dfinAccent: '#262626', 
        // Crisp white for active data
        dfinText: '#f5f5f5', 
        // Subtle silver for secondary metadata
        dfinMuted: '#a3a3a3', 
      },
      backgroundImage: {
        'shining-dark': 'linear-gradient(145deg, #1f1f1f, #121212)',
        'obsidian-glow': 'radial-gradient(circle at top left, #2a2a2a, #0a0a0a)',
      }
    },
  },
  plugins: [],
}