<template>
  <Layout>
    <div class="container py-4">
      <h2 class="mb-4 text-light">🎒 Mes Ressources</h2>
    <!-- 🔍 Aperçu rapide des images -->
<!-- 🖼️ Aperçu rapide en slider -->
<!-- 🖼️ Aperçu rapide avec swipe -->
<div v-if="imageFiles.length" class="mb-4">
  <h4 class="text-light mb-3">🖼️ Aperçu rapide</h4>

  <div
    class="bg-dark p-3 rounded text-center position-relative"
    style="max-width: 100%; width: 350px; margin: auto;"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  >
    <h6 class="text-light text-truncate">{{ imageFiles[currentImageIndex]['Nom du fichier'] }}</h6>
    
    <iframe
      v-if="imageFiles[currentImageIndex]['ID Drive']"
      :src="`https://drive.google.com/file/d/${imageFiles[currentImageIndex]['ID Drive']}/preview`"
      width="100%"
      height="180"
      frameborder="0"
    ></iframe>

    <!-- Navigation flèches -->
    <button class="btn btn-outline-light btn-sm position-absolute top-50 start-0 translate-middle-y" @click="prevImage" style="z-index: 10;">⬅️</button>
    <button class="btn btn-outline-light btn-sm position-absolute top-50 end-0 translate-middle-y" @click="nextImage" style="z-index: 10;">➡️</button>
  </div>
</div>




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

          <ul class="list-group bg-transparent">
            <li 
              v-for="file in group" 
              :key="file['ID Unique']" 
              class="list-group-item list-group-item-action bg-dark text-light d-flex justify-content-between align-items-center"
              @click="openPreview(file)"
              style="cursor: pointer;"
            >
              <span>{{ file['Nom du fichier'] }}</span>
              <span class="badge bg-secondary text-uppercase">{{ file.Extension }}</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- 🖼️ Modale d'image -->
      <div v-if="showModal && selectedFile" class="modal-backdrop-custom" @click.self="closePreview">
  <div class="modal-content-custom">
    <h5>{{ selectedFile['Nom du fichier'] }}</h5>
    <iframe 
      v-if="selectedFile['ID Drive']"
      :src="`https://drive.google.com/file/d/${selectedFile['ID Drive']}/preview`" 
      width="100%" 
      height="500px"
      frameborder="0"
    ></iframe>
    <button class="btn btn-sm btn-outline-light mt-3" @click="closePreview">Fermer</button>
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
      currentImageIndex: 0,
      touchStartX: 0,
touchEndX: 0,

      files: [],
      showModal: false,
selectedFile: null,
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
    handleTouchStart(event) {
  this.touchStartX = event.changedTouches[0].screenX;
},
handleTouchEnd(event) {
  this.touchEndX = event.changedTouches[0].screenX;
  this.handleSwipe();
},
handleSwipe() {
  const threshold = 50; // pixels min pour que le swipe compte
  const deltaX = this.touchEndX - this.touchStartX;
  
  if (Math.abs(deltaX) > threshold) {
    if (deltaX > 0) {
      this.prevImage(); // swipe vers la droite
    } else {
      this.nextImage(); // swipe vers la gauche
    }
  }
}
,
    nextImage() {
  if (this.imageFiles.length > 0) {
    this.currentImageIndex = (this.currentImageIndex + 1) % this.imageFiles.length;
  }
},
prevImage() {
  if (this.imageFiles.length > 0) {
    this.currentImageIndex = (this.currentImageIndex - 1 + this.imageFiles.length) % this.imageFiles.length;
  }
}
,
    openPreview(file) {
  if (file["Type de ressource"] === "Image") {
    this.selectedFile = file;
    this.showModal = true;
  } else {
    window.open(file["Lien direct"], '_blank');
  }
},
closePreview() {
  this.showModal = false;
  this.selectedFile = null;
}
,

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
  file["ID Drive"] = id;

  // Détection simplifiée si extension image
  const ext = (file.Extension || "").toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
    file.type = "Image";
  }
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
.modal-backdrop-custom {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-content-custom {
  background: #1e1e1e;
  padding: 20px;
  border-radius: 10px;
  max-width: 90%;
  max-height: 90%;
  text-align: center;
  color: white;
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


