import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  // Injecter toutes les variables `VITE_` sur `window`
  const envWithWindow = Object.keys(env).reduce((acc, key) => {
    acc[`window.${key}`] = JSON.stringify(env[key]); // ✅ Correction du return
    return acc;
  }, {} as Record<string, any>);

  return {
    base: env.VITE_BASE_URL || "/", // ✅ Définit le chemin de base correctement
    define: {
      __APP_ENV__: `"${mode}"`,
      ...envWithWindow, // ✅ Injecte toutes les variables sur `window`
    },
    plugins: [
      vue(),
      VitePWA({
        registerType: "autoUpdate", // ⚡ Met à jour la PWA automatiquement
        includeAssets: ["favicon.ico", "robots.txt"],
        manifest: {
          name: "SunBassSchool",
          short_name: "SunBass",
          description: "Une école de musique pour bassistes",
          theme_color: "#1a1a2e",
          background_color: "#1a1a2e",
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
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'] // ← Ajoutez cette ligne
        },,
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      strictPort: true, // ✅ Évite les conflits de port avec le Service Worker
    },
    build: {
      target: "esnext", // ✅ Assure la compatibilité avec les API modernes
      minify: "terser", // ✅ Utilise Terser pour optimiser le code
      terserOptions: {
        compress: {
          drop_console: true, // ✅ Supprime tous les logs `console.*`
        },
      },
    },
  };
});
