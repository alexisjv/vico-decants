export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        tinta: { DEFAULT: '#181614', 2: '#2a2724', 3: '#3a3631' },
        crema: { DEFAULT: '#F3EFE7', 2: '#EDE7DB' },
        papel: '#FBF9F5',
        borde: { DEFAULT: '#E6DFD2', 2: '#DDD5C7' },
        niebla: '#6E665C',
        oro: { DEFAULT: '#7E5F33', claro: '#E9D3AE', vivo: '#B8935A' },
        ok: { DEFAULT: '#2F6B45', bg: '#E3EEE6', claro: '#9FD3AE' },
        mal: { DEFAULT: '#9A3B32', bg: '#F6E4E1' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
      },
      borderRadius: { xl2: '1.125rem' },
      boxShadow: { suave: '0 8px 24px rgba(24,22,20,0.10)', fab: '0 8px 24px rgba(24,22,20,0.25)' },
    },
  },
  plugins: [],
};
