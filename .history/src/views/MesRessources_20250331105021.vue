<template>
  <Layout>
    <div class="container py-4">
      <h2 class="mb-4 text-light">🎒 Mes Ressources</h2>

      <div v-if="isLoading" class="text-center mt-5">
        <div class="spinner-border text-warning" role="status"></div>
        <p class="mt-3 text-light">Chargement de tes fichiers...</p>
      </div>

      <div v-else>
        <div 
          v-for="(group, type) in groupedFiles" 
          :key="type" 
          class="mb-4"
        >
          <h4 class="text-light mb-2">{{ getEmoji(type) }} {{ type }}</h4>

          <div class="resource-carousel">
            <div 
              v-for="file in group" 
              :key="file['ID Unique']" 
              class="resource-card"
              :class="{ viewed: file.vu }"
            >
              <p class="file-name">{{ file['Nom du fichier'] }}</p>
              <p class="small text-muted">.{{ file.Extension }}</p>
              <a :href="file['URL directe']" target="_blank" class="btn btn-sm btn-outline-light">🔗 Voir</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script>
import Layout from "../views/Layout.vue";
import { getValidToken, getUserInfoFromJWT } from "@/utils/api.ts";
import { getCache, setCache, shouldUpdateCache } from "@/utils/cacheManager.js";
import { useAuthStore } from "@/stores/authStore"; // Pinia store

export default {
  name: "Ressources",
  components: { Layout },

  data() {
    const prenom = localStorage.getItem("prenom") || sessionStorage.getItem("prenom") || "";
    return {
      prenom,
      ressources: [],
      isLoading: true,
      cacheKey: `ressources_${prenom}`,
      cacheDuration: 6 * 60 * 60 * 1000, // 6h
      apiBaseURL: "https://cors-proxy-sbs.vercel.app/api/proxy?url=",
      routes: {
        GET: "AKfycbyAFL1sQ2OuXOhkqROMgfKYdnGbYbH7sXiVm3uvPMtueESa6chVfsojHxZvYFqf1AXUzg",
        POST: "AKfycbyAFL1sQ2OuXOhkqROMgfKYdnGbYbH7sXiVm3uvPMtueESa6chVfsojHxZvYFqf1AXUzg"
      }
    };
  },

  async mounted() {
    await this.loadRessources();
  },

  methods: {
    getProxyURL(route, params = {}) {
  const baseURL = `https://script.google.com/macros/s/${route}`;
  const query = new URLSearchParams(params).toString();
  const fullURL = `${baseURL}?${query}`;
  console.log("🔍 URL lisible sans proxy :", fullURL); // 👈 pour debug visuel
  return `https://cors-proxy-sbs.vercel.app/api/proxy?url=${encodeURIComponent(fullURL)}`;
}
,

async loadRessources() {
  const routeId = "AKfycbyAFL1sQ2OuXOhkqROMgfKYdnGbYbH7sXiVm3uvPMtueESa6chVfsojHxZvYFqf1AXUzg/exec";
  const prenom = this.prenom || localStorage.getItem("prenom");

  if (!prenom) {
    console.warn("⚠️ Prénom manquant, impossible de charger les ressources.");
    this.isLoading = false;
    return;
  }

  const url = this.getProxyURL(routeId, {
    route: "getressources",
    prenom
  });

  console.log("🔍 URL lisible sans proxy :", decodeURIComponent(url));

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    const text = await response.text();

    if (text.startsWith("<!DOCTYPE html")) {
      throw new Error("❌ HTML détecté au lieu d’un JSON.");
    }

    const data = JSON.parse(text);
    console.log("📦 Données reçues :", data);

    this.files = data;
  } catch (error) {
    console.error("❌ Erreur API :", error);
  } finally {
    this.isLoading = false; // ✅ On désactive le loading quoi qu’il arrive
  }
}

  }
};
</script>

<style scoped>
.resources-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  justify-content: flex-start;
}

.resource-card {
  background: rgba(255, 255, 255, 0.08);
  padding: 15px;
  border-radius: 8px;
  width: 260px;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  position: relative;
}

.resource-card.viewed {
  opacity: 0.6;
}

.resource-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.file-icon {
  font-size: 1.6rem;
  color: #ffa500;
}

.file-name {
  font-weight: bold;
  font-size: 1rem;
}
</style>

