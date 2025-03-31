<template>
  <Layout>
    <div class="container py-4">
    
  <!-- 🔍 Barre de recherche -->
  <div class="mb-3 text-center">
  <input 
    v-model="searchQuery" 
    type="text" 
    class="search-input"
    placeholder="🔍 Rechercher une ressource"
  />
</div>

      <!-- 🖼️ Aperçu rapide avec swipe (inchangé) -->
      <div v-if="imageFiles.length" class="mb-4">
        <h4 class="text-light mb-3"></h4>

        <div
          class="bg-dark p-3 rounded text-center position-relative"
          style="max-width: 100%; width: 350px; margin: auto;"
          @touchstart="handleTouchStart"
          @touchend="handleTouchEnd"
        >
        <h6 class="text-light fw-bold text-truncate">
  {{ cleanedFileName }}
</h6>


          <div style="overflow: hidden; width: 100%; display: flex; justify-content: center;">
            <iframe
              v-if="imageFiles[currentImageIndex]['ID Drive']"
              :src="`https://drive.google.com/file/d/${imageFiles[currentImageIndex]['ID Drive']}/preview`"
              
              frameborder="0"
            ></iframe>
          </div>

          <button class="btn btn-outline-light btn-sm position-absolute top-50 start-0 translate-middle-y" @click="prevImage" style="z-index: 10;">⬅️</button>
          <button class="btn btn-outline-light btn-sm position-absolute top-50 end-0 translate-middle-y" @click="nextImage" style="z-index: 10;">➡️</button>
        </div>
      </div>

    

      <!-- 🔁 Liste par type, collapsable -->
      <div v-if="!isLoading">
        <div 
          v-for="(group, type) in filteredGroupedFiles" 
          :key="type" 
          class="mb-4"
        >
          <h4 
          class="section-header text-light d-flex justify-content-between align-items-center mb-2"
          style="cursor: pointer;"
            @click="toggleSection(type)"
          >
            <span>{{ getEmoji(type) }} {{ type }}</span>
            <span>{{ collapsedSections[type] ? '➕' : '➖' }}</span>
          </h4>
          <transition name="collapse">

          <ul 
            v-show="!collapsedSections[type]" 
            class="list-group bg-transparent"
          >
          <li 
  v-for="file in group" 
  :key="file['ID Unique']" 
  class="list-group-item bg-dark text-light d-flex justify-content-between align-items-center p-2"
  @click="openPreview(file)"
  style="cursor: pointer;"
>
  <span class="text-truncate">{{ file['Nom du fichier'] }}</span>
  <span class="badge bg-secondary text-uppercase">{{ file.Extension }}</span>
</li>


          </ul></transition>

        </div>
      </div>
      <div v-if="showModal && selectedFile" class="modal-backdrop-custom" @click.self="closePreview">
  <div class="modal-content-custom">
    <h5 class="mb-3 text-truncate">{{ selectedFile['Nom du fichier'] }}</h5>
    
    <iframe 
      v-if="selectedFile['ID Drive']"
      :src="`https://drive.google.com/file/d/${selectedFile['ID Drive']}/preview`" 
      width="100%" 
      height="500"
      frameborder="0"
    ></iframe>

    <button class="btn btn-sm btn-outline-light mt-3" @click="closePreview">Fermer</button>
  </div>
</div>

      <!-- ⏳ Loading -->
      <div v-if="isLoading" class="text-center mt-5">
        <div class="spinner-border text-warning" role="status"></div>
        <p class="mt-3 text-light">Chargement de tes fichiers...</p>
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
searchQuery: "",
collapsedSections: {},

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
  cleanedFileName() {
  const file = this.imageFiles[this.currentImageIndex];
  if (!file) return '';
  const name = file['Nom du fichier'] || '';
  return name.replace(/\.[^/.]+$/, '').toUpperCase();
}
,

  filteredGroupedFiles() {
  const filtered = {};
  for (const type in this.groupedFiles) {
    const files = this.groupedFiles[type].filter(file =>
      file["Nom du fichier"]?.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
    if (files.length) filtered[type] = files;
  }
  return filtered;
}
,
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
        case "Image": return "🖼️ Tableaux de cours";

        case "Audio": return "🎧";
        case "PDF": return "📄";
        default: return "📁";
      }
    },
    toggleSection(type) {
      this.collapsedSections = {
  ...this.collapsedSections,
  [type]: !this.collapsedSections[type]
};
}
,
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
  } else if (file["Lien direct"] || file["ID Drive"]) {
    this.selectedFile = file;
    this.showModal = true;
  }
}
,
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

    // 🛠️ Patch des fichiers
    this.files = data.map(file => {
      const urlOriginal = file["URL directe"] || file["URL"] || "";
      const match = urlOriginal && urlOriginal.match(/\/d\/([^/]+)\//);
      
      if (match && match[1]) {
        const id = match[1];
        file["ID Drive"] = id;

        // Détection simplifiée des images
        const ext = (file.Extension || "").toLowerCase();
        if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
          file.type = "Image";
        }
      } else {
        file["Lien direct"] = urlOriginal; // fallback
      }
      
      return file;
    });

    // ✅ Init des sections repliées par défaut
    this.collapsedSections = {};
    this.files.forEach(file => {
      const type = file["Type de ressource"] || "Autres";
      if (!(type in this.collapsedSections)) {
        this.collapsedSections[type] = true; // plié par défaut
      }
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
input.form-control-sm {
  padding: 6px 10px;
  font-size: 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 5px;
}
input.form-control-sm:focus {
  border-color: #ffc107;
  box-shadow: 0 0 0 0.15rem rgba(255, 193, 7, 0.25);
}

.list-group-item {
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 12px 16px;
}

.list-group-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
  transform: scale(1.01);
  transition: all 0.2s ease;
}

h4.section-header {
  font-size: 1rem !important;

  font-weight: 500; /* plus léger que bold */
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 4px;

  transition: background 0.2s ease;
}
.list-group-item {
  padding: 8px 12px;
  font-size: 0.95rem;
}

h4.section-header:hover {
  background: rgba(255, 255, 255, 0.08);
}

.collapse-enter-active,
.collapse-leave-active {
  transition: max-height 0.3s ease, opacity 0.3s ease;
  overflow: hidden;
}
.collapse-enter-from,
.collapse-leave-to {
  max-height: 0;
  opacity: 0;
}
.collapse-enter-to,
.collapse-leave-from {
  max-height: 500px;
  opacity: 1;
}

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
.badge {
  font-size: 0.75rem;
  padding: 4px 8px;
  border-radius: 8px;
}
input.form-control {
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  padding: 10px 14px;
}
input.form-control:focus {
  border-color: #ffc107;
  box-shadow: 0 0 0 0.2rem rgba(255, 193, 7, 0.25);
}
.search-input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 0.8rem;
  width: 240px;
  color: white;
  outline: none;
  transition: border-color 0.2s ease;
}
.search-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}
.search-input:focus {
  border-color: #ffc107;
  box-shadow: 0 0 0 0.1rem rgba(255, 193, 7, 0.25);
}

</style>


