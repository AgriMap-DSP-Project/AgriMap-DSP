/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Poppins', 'sans-serif'],
        display: ['Poppins', 'Inter', 'sans-serif'],
      },
      colors: {
        // Official V2V Tech Brand Style Guide & Color System
        v2v: {
          deep: '#2A0C58',          // Primary Deep Purple (Headers, Navbar, Key elements)
          dark: '#2A0C58',          // Brand background sections
          electric: '#3C1775',      // Dark Purple (Buttons, Active states, Highlights)
          violet: '#5E4678',        // Violet (Secondary elements, Cards)
          secondary: '#5E4678',     // Alias for Violet
          purple: '#8A57C0',        // Purple (Links, Icons, Hover effects)
          lavender: '#8A57C0',      // Alias for Bright Purple
          softlavender: '#B890F9',  // Lavender (Soft elements, Background shapes)
          lightlavender: '#D9C7FF', // Light Lavender (Subtle highlights, Badges)
          border: '#E4DFEB',        // Soft Gray / Border (Dividers, Subtle UI)
          lavendergray: '#E4DFEB',  // Alias for border
          softwhite: '#F4F3F9',     // Light Background (Page background, Cards)
          charcoal: '#131313',      // Near Black (Dark sections, Footer, Dark mode)
          nearblack: '#131313',     // Alias for Near Black
          white: '#FFFFFF',         // White (Main background, Text on dark)
        },
        // Extended Tint & Shade Scale
        v2vshade: {
          900: '#1B0739',
          800: '#2A0C58',
          700: '#3C1775',
          600: '#5E4678',
          500: '#8A57C0',
          400: '#A974E5',
          300: '#B890F9',
          200: '#D9C7FF',
          100: '#E4DFEB',
          50:  '#F4F3F9',
        },
        // Semantic Alert & Status Colors from V2V Design System
        v2vstatus: {
          success: '#22C55E',
          error: '#EF4444',
          warning: '#F59E0B',
          info: '#3B82F6',
        },
        // Backwards-compatible brand scale
        brand: {
          50:  '#F4F3F9',
          100: '#E4DFEB',
          200: '#D9C7FF',
          300: '#B890F9',
          400: '#8A57C0',
          500: '#5E4678',
          600: '#3C1775',
          700: '#2A0C58',
          800: '#1B0739',
          900: '#131313',
        },
      },
      backgroundImage: {
        // Official V2V Tech Brand Gradients
        'v2v-primary': 'linear-gradient(135deg, #2A0C58 0%, #8A57C0 100%)',
        'v2v-soft': 'linear-gradient(135deg, #3C1775 0%, #B890F9 100%)',
        'v2v-dark-hero': 'linear-gradient(135deg, #131313 0%, #3C1775 100%)',
        'v2v-light-section': 'linear-gradient(135deg, #5E4678 0%, #D9C7FF 100%)',
        // Existing aliases for template compatibility
        'v2v-gradient': 'linear-gradient(135deg, #2A0C58 0%, #8A57C0 100%)',
        'v2v-gradient-dark': 'linear-gradient(135deg, #131313 0%, #3C1775 100%)',
        'v2v-gradient-light': 'linear-gradient(135deg, #5E4678 0%, #D9C7FF 100%)',
      },
      boxShadow: {
        'v2v-glow': '0 0 20px rgba(138, 87, 192, 0.35)',
        'v2v-glow-lg': '0 0 40px rgba(138, 87, 192, 0.5)',
        'v2v-card': '0 4px 20px -2px rgba(42, 12, 88, 0.08)',
        'v2v-button': '0 4px 12px rgba(42, 12, 88, 0.25)',
        'v2v-active': '0 2px 6px rgba(60, 23, 117, 0.4)',
      },
      keyframes: {
        'slide-up': {
          '0%':   { transform: 'translateY(0.75rem)', opacity: '0' },
          '100%': { transform: 'translateY(0)',       opacity: '1' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.82' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 0.2s ease-out',
        'pulse-subtle': 'pulse-subtle 2.5s infinite ease-in-out',
      },
    },
  },
  plugins: [],
}
