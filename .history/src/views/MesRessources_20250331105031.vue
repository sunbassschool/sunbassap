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
import { getCache, setCache } from "@/utils/cacheManager.js";

export default {
  name: "Ressources",
  components: { Layout },

  data() {
    const prenom = localStorage.getItem("prenom") || "";
    return {
      prenom,
      files: [],
      isLoading: true,
      apiBaseURL: "https://cors-proxy-sbs.vercel.app/api/proxy?url=",
      routeId: "AKfycbyAFL1sQ2OuXOhkqROMgfKYdnGbYbH7sXiVm3uvPMtueESa6chVfsojHxZvYFqf1AXUzg/exec"
    };
  },

  computed: {
    groupedFiles() {
      return this.files.reduce((acc, file) => {
        const type = file["Type de ressource"] || "Autres";
        if (!acc[type]) acc[type] = [];
        acc[type].push(file);
        return acc;
      }, {});
    }
  },

  mounted() {
    this.loadRessources();
  },

  methods: {
    getEmoji(type) {
      switch (type) {
        case "Image": return "🖼️";
        case "Audio": return "🎧";
        case "PDF": return "📄";
        default: return "📁";
      }
    },
    getProxyURL(route, params = {}) {
      const baseURL = `https://script.google.com/macros/s/${route}`;
      const query = new URLSearchParams(params).toString();
      return `https://cors-proxy-sbs.vercel.app/api/proxy?url=${encodeURIComponent(`${baseURL}?${query}`)}`;
    },
    async loadRessources() {
      if (!this.prenom) return;

      const url = this.getProxyURL(this.routeId, {
        route: "getressources",
        prenom: this.prenom
      });

      try {
        const response = await fetch(url);
        const text = await response.text();
        if (text.startsWith("<!DOCTYPE html")) throw new Error("HTML reçu au lieu de JSON.");
        const data = JSON.parse(text);
        this.files = data;
      } catch (error) {
        console.error("❌ Erreur API :", error);
      } finally {
        this.isLoading = false;
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

