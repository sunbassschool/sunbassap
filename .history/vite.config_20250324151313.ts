import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  // Injecter toutes les variables `VITE_` sur `window`
  const envWithWindow = Object.keys(env).reduce((acc, key) => {
    (acc as Record<string, any>)[`window.${key}`] = JSON.stringify(env[key]);
  // Convertir en string pour éviter les erreurs
    return acc;
  }, {});

  return {
    base: env.VITE_BASE_URL || "/",  // Par défaut, mettre "/" si undefined
    define: {
      __APP_ENV__: `"${mode}"`,
      ...envWithWindow,  // Injecter toutes les variables sur window
    },
    plugins: [
      vue(),
      VitePWA({
        registerType: 'autoUpdate',  // ⚡ Met à jour la PWA automatiquement
        includeAssets: ['favicon.ico', 'robots.txt'],
        manifest: {
          name: 'SunBassSchool',
          short_name: 'SunBass',
          description: 'Une école de musique pour bassistes',
          theme_color: '#1a1a2e',
          background_color: '#1a1a2e',
          icons: [
            {
              src: `${env.VITE_BASE_URL || ""}/logo-192x192.png`,
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: `${env.VITE_BASE_URL || ""}/logo-512x512.png`,
              sizes: "512x512",
              type: "image/png",
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,  // 🔥 Supprime les anciennes versions
          skipWaiting: true,  // ⚡ Active immédiatement la nouvelle version
          clientsClaim: true,  // ⚡ Applique la mise à jour sans rechargement manuel
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    build: {
      minify: 'terser',  // Utilise Terser pour la minification en production
      terserOptions: {
        compress: {
          drop_console: true,  // Supprime tous les logs console.*
        },
      },
    },
  };
});
