import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import linkPreview from './api/link-preview.js'

// Vite doesn't run Vercel functions; mount the ones the UI calls so link
// cards also work under `npm run dev`
function devApi() {
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use('/api/link-preview', linkPreview)
    },
  }
}

export default defineConfig({
  plugins: [react(), devApi()],
  // fixed port so it never collides with other local Vite projects on 5173;
  // strictPort fails loudly instead of silently hopping to the next free port
  server: { port: 5174, strictPort: true },
})
