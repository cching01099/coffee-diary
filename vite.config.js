import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // fixed port so it never collides with other local Vite projects on 5173;
  // strictPort fails loudly instead of silently hopping to the next free port
  server: { port: 5174, strictPort: true },
})
