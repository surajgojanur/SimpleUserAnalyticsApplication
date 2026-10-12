import { defineConfig, loadEnv } from 'vite';
import { isIP } from 'node:net';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig(({ command, mode }) => {
  if (
    command === 'build' &&
    (process.env.NETLIFY === 'true' || process.env.CONTEXT === 'production')
  ) {
    const value = process.env.VITE_API_URL || loadEnv(mode, process.cwd(), 'VITE_').VITE_API_URL;
    let api;
    try {
      api = new URL(value);
    } catch {
      throw new Error('VITE_API_URL is required for production dashboard builds');
    }
    if (
      api.protocol !== 'https:' ||
      api.origin !== value ||
      isIP(api.hostname.replace(/^\[|\]$/g, '')) ||
      !api.hostname.includes('.') ||
      /localhost|\.local$|\.internal$|\.invalid$|\.test$|example|placeholder|your-api/.test(
        api.hostname,
      )
    )
      throw new Error(
        'Production VITE_API_URL must be a public HTTPS API origin without credentials or endpoint paths',
      );
    console.log(`Dashboard public API origin: ${api.origin}`);
  }
  return { plugins: [react(), tailwindcss()] };
});
