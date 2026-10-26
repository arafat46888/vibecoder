import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      // Content Security Policy (PRD §9 – XSS mitigation for keys kept in localStorage).
      // Sandpack runs generated code inside sandboxed iframes and injects inline styles/scripts,
      // so the policy is relaxed only where strictly required by the preview engine.
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https:",
        "style-src 'self' 'unsafe-inline'",
        "frame-src 'self' blob: https:",
        "worker-src 'self' blob:",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data:",
        "connect-src 'self' https: http://localhost:* http://127.0.0.1:*",
      ].join('; '),
    },
  },
})
