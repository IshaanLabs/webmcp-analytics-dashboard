import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves this project at /webmcp-analytics-dashboard/, so built asset URLs need that prefix.
  // `npm run dev` still serves from the root.
  base: process.env.NODE_ENV === 'production' ? '/webmcp-analytics-dashboard/' : '/',
})
