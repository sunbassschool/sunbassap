<template>
  <Layout>
    <div class="container py-4">
      <h2 class="mb-4 text-light">🎒 Mes Ressources</h2>

      <!-- 🔄 Spinner pendant le chargement -->
      <div v-if="isLoading" class="text-center mt-5">
        <div class="spinner-border text-warning" role="status"></div>
        <p class="mt-3 text-light">Chargement de tes fichiers...</p>
      </div>

      <!-- 🖼️ Carrousel pour les images -->
      <div v-if="imageFiles.length" class="image-carousel-wrapper">
        <h4 class="text-light mb-3">🖼️ Tableaux de cours</h4>
        <div class="carousel-scroll">
          <div
            v-for="(img, index) in imageFiles"
            :key="index"
            class="image-card"
          >
            <img :src="img.lien" :alt="img.nom" />
            <p class="text-light small mt-2 text-center">{{ img.nom }}</p>
          </div>
        </div>
      </div>

      <!-- Autres fichiers -->
      <div v-else-if="filteredFiles.length" class="resources-grid">
        <div 
          v-for="file in filteredFiles" 
          :key="file.id" 
          class="resource-card"
          :class="{ viewed: file.vu }"
        >
          <div class="resource-header">
            <i :class="getFileIcon(file.extension)" class="file-icon me-2"></i>
            <span class="file-name">{{ file.nom }}</span>
          </div>

          <p class="text-muted small">{{ file.type }} — .{{ file.extension }}</p>

          <a :href="file.apercu" target="_blank" class="btn btn-sm btn-outline-light mt-2">
            🔗 Voir le fichier
          </a>

          <div class="form-check mt-3">
            <input 
              class="form-check-input" 
              type="checkbox" 
              :checked="file.vu" 
              @change="toggleVu(file)"
              :id="file.id"
            />
            <label class="form-check-label text-light" :for="file.id">
              Marquer comme {{ file.vu ? "non vu" : "vu" }}
            </label>
          </div>
        </div>
      </div>

      <!-- 🕳️ Aucun fichier -->
      <div v-else class="text-light mt-4">
        Aucun fichier trouvé pour le moment.
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
    imageFiles() {
    return this.files.filter(file => file.type === "Image");
  },
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
<style>
.image-carousel-wrapper {
  margin-bottom: 30px;
}

.carousel-scroll {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  gap: 20px;
  padding-bottom: 10px;
  -webkit-overflow-scrolling: touch;
}

.image-card {
  scroll-snap-align: start;
  flex: 0 0 80%;
  max-width: 80%;
  background: #1c1c1c;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #ffffff22;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.image-card img {
  width: 100%;
  height: auto;
  border-radius: 6px;
  object-fit: contain;
}

.resource-carousel {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  gap: 12px;
  padding-bottom: 10px;
}

.resource-card {
  flex: 0 0 auto;
  scroll-snap-align: start;
  min-width: 200px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  padding: 12px;
  color: white;
  transition: transform 0.2s;
}

.resource-card:hover {
  transform: translateY(-4px);
  background-color: rgba(255, 255, 255, 0.12);
}

.file-name {
  font-weight: bold;
  font-size: 1rem;
  margin-bottom: 6px;
}

.resource-card.viewed {
  opacity: 0.5;
}
</style>


