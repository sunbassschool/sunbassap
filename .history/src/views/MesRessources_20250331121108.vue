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
              <div v-if="file['Type de ressource'] === 'Image'">
  <img :src="file['Lien direct']" :alt="file['Nom du fichier']" style="width: 100%; border-radius: 8px;" />
</div>
<a :href="file['Lien direct']" target="_blank" class="btn btn-sm btn-outline-light mt-2">🔗 Voir</a>
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

    // 🛠️ Patch les URL Google Drive
    this.files = data.map(file => {
      const urlOriginal = file["URL directe"] || file["URL"] || "";

  const match = urlOriginal && urlOriginal.match(/\/d\/([^/]+)\//);
  if (match && match[1]) {
    const id = match[1];
file["Lien direct"] = `https://drive.google.com/uc?export=view&id=${id}`;


  } else {
    file["Lien direct"] = urlOriginal; // fallback si pas de match
  }
  return file;
});


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


