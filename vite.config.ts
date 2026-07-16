import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Déployé dans un sous-dossier sur OVH (https://www.cours-vandewalle.fr/clicmots/),
  // pas à la racine du domaine comme sur Vercel — d'où le base uniquement en
  // production ; le serveur de dev reste à la racine pour plus de simplicité.
  base: command === 'build' ? '/clicmots/' : '/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
  },
}))
