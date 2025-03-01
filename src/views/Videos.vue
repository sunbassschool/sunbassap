<template>
  <Layout>
    <div class="container mt-4">
      <h2 class="text-center mb-3">🎸 Vidéos Pédagogiques</h2>
      <p class="text-muted text-center">Filtre par mots-clés ou clique sur une vidéo pour la regarder.</p>

      <!-- Barre de recherche -->
      <input 
  v-model="search" 
  class="form-control mb-3" 
  placeholder="🔎 Rechercher par mot-clé..." 
  autocomplete="off" 
  autocorrect="off"
  autocapitalize="off"
  spellcheck="false"
  name="search-field"
  id="search-field"
/>

      <!-- Chargement -->
      <div v-if="loading" class="d-flex justify-content-center mt-4">
        <div class="spinner-border text-primary" role="status"></div>
      </div>

      <!-- Grille de vidéos -->
      <div v-else class="row row-cols-1 row-cols-md-4 g-4">
        <div v-for="(video, index) in filteredVideos" :key="index" class="col">
          <div class="card shadow-sm">
            <img 
              :src="getThumbnail(video.Lien)" 
              class="card-img-top" 
              alt="Miniature vidéo" 
              @click="openVideo(video.Lien, video.Titre)" 
              style="cursor: pointer;" />
            <div class="card-body">
              <h5 class="card-title text-center">{{ video.Titre }}</h5>

              <p class="card-text">
                <span v-for="(tag, i) in video.MotsCles.split(',')" :key="i" class="badge bg-primary me-1">
                  {{ tag.trim() }}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Modale pour afficher la vidéo -->
      <div v-if="showModal" class="modal fade show" tabindex="-1" style="display: block;" aria-modal="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">{{ currentVideoTitle }}</h5>
              <button type="button" class="btn-close" @click="closeModal"></button>
            </div>
            <div class="modal-body">
              <iframe 
                :src="videoUrl"
                frameborder="0" 
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen 
                width="100%" 
                height="315"></iframe>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>


<script>
import Layout from "../views/Layout.vue";
import axios from "axios";
import { ref, computed, onMounted } from "vue";

export default {
  name: "Videos",
  components: { Layout },
  setup() {
    const videos = ref([]);
    const loading = ref(true);
    const search = ref("");
    const showModal = ref(false);
    const videoUrl = ref("");
    const currentVideoTitle = ref(""); 

    // ✅ Infos Google Sheet
    const SHEET_ID = "1DzXQORma_DuTe5TWvEmlhDIjFhqOVyJcjK2mxvXEhLc";
    const API_KEY = "AIzaSyBo0kz-JkCiuWumprwn5kpiVPqYmKr5NZI";
    const RANGE = "'Vidéos pédagogiques'!A2:F"; 

    // ⏳ Définition de la durée du cache (5 minutes)
    const cacheDuration = 24 * 60 * 60 * 1000;

    const fetchVideos = async () => {
      const cacheKey = "videos_cache";
      const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
      const cachedData = localStorage.getItem(cacheKey);

      if (cachedData && cacheTimestamp && Date.now() - cacheTimestamp < cacheDuration) {
        console.log("⚡ Chargement des vidéos depuis le cache");
        videos.value = JSON.parse(cachedData);
        loading.value = false;
        return;
      }

      try {
        console.log("🌐 Récupération des vidéos depuis l'API...");
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;
        const response = await axios.get(url);
        console.log("Données brutes Google Sheets :", response.data);
        const rows = response.data.values || [];

        if (rows.length > 0) {
          const headers = ["Titre", "", "Lien", "", "", "MotsCles"];
          videos.value = rows.map(row =>
            Object.fromEntries(headers.map((header, i) => [header, row[i] || ""]).filter(([key]) => key))
          );
          console.log("Données traitées :", videos.value);
        }

        // ✅ Stocker les données en cache
        localStorage.setItem(cacheKey, JSON.stringify(videos.value));
        localStorage.setItem(`${cacheKey}_timestamp`, Date.now());

      } catch (error) {
        console.error("❌ Erreur lors du chargement des vidéos :", error);
      } finally {
        loading.value = false;
      }
    };

    // ✅ Miniature YouTube
    const getThumbnail = (url) => {
      if (!url) return "";
      
      let videoId = "";

      if (url.includes("youtube.com/watch?v=")) {
        videoId = url.split("v=")[1]?.split("&")[0];
      } else if (url.includes("youtu.be/")) {
        videoId = url.split("youtu.be/")[1]?.split("?")[0];
      }

      return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : "";
    };

    // ✅ Filtrage des vidéos (titre + mots-clés)
    const filteredVideos = computed(() => {
      if (!search.value) return videos.value;

      const searchLower = search.value.toLowerCase();

      return videos.value.filter(video => {
        const titleLower = video.Titre ? video.Titre.toLowerCase() : "";
        const keywordsLower = video.MotsCles ? video.MotsCles.toLowerCase() : "";

        return titleLower.includes(searchLower) || keywordsLower.includes(searchLower);
      });
    });

    const openVideo = (url, title) => {
      let videoId = "";
      
      if (url.includes("youtube.com/watch?v=")) {
        videoId = url.split("v=")[1]?.split("&")[0];
      } else if (url.includes("youtu.be/")) {
        videoId = url.split("youtu.be/")[1]?.split("?")[0];
      }
      
      if (videoId) {
        videoUrl.value = `https://www.youtube.com/embed/${videoId}`;
        currentVideoTitle.value = title;
        showModal.value = true;
      }
    };

    const closeModal = () => {
      showModal.value = false;
      videoUrl.value = "";
    };

    onMounted(fetchVideos);

    return { 
      videos, 
      loading, 
      search, 
      filteredVideos, 
      getThumbnail, 
      openVideo, 
      closeModal, 
      showModal, 
      videoUrl, 
      currentVideoTitle 
    };
  },
};
</script>



<style scoped>
h2 {
  font-weight: bold;
  color: #343a40;
}
.card {
  border-radius: 10px;
  transition: transform 0.2s;
}
.card:hover {
  transform: scale(1.03);
}
.card-img-top {
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
}
.card-text {
  font-size: 0.880rem; /* Réduit la taille de la police */
  text-align: right;
}
</style>
