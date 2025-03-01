<template>
  <Layout>
    <div class="container mt-4">
      <h2 class="text-center mb-3">🎸 Replays des Cours test </h2>
      <p class="text-muted text-center">Clique sur une vidéo pour la regarder directement.</p>

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

      <!-- Lecteur intégré -->
      <div v-if="selectedVideo" class="video-overlay">
        <div class="video-wrapper">
          <iframe 
            :src="selectedVideoEmbed" 
            frameborder="0" 
            allowfullscreen 
            class="video-iframe">
          </iframe>
          <button class="btn btn-danger close-button" @click="selectedVideo = null">❌ Fermer</button>
        </div>
      </div>

      <!-- Grille de replays -->
      <div v-else class="row row-cols-1 row-cols-md-3 g-4">
        <div v-for="(video, index) in filteredVideos" :key="index" class="col">
          <div class="card shadow-sm" @click="openVideo(video.Lien)">
            <img :src="getThumbnail(video.Lien)" class="card-img-top" alt="Miniature vidéo" />
            <div class="card-body">
              <h5 class="card-title">{{ video.Titre }}</h5>
              <p class="card-text">
                <span v-for="(tag, i) in video.MotsCles.split(',')" :key="i" class="badge bg-primary me-1">
                  {{ tag.trim() }}
                </span>
              </p>
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
  name: "Replays",
  components: { Layout },
  setup() {
    const videos = ref([]);
    const loading = ref(true);
    const search = ref("");
    const selectedVideo = ref(null);

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

      // ✅ Vérification du cache avant d'appeler l'API
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

    const getThumbnail = (url) => {
      console.log("URL reçue pour miniature :", url);
      if (!url) return "";
      
      let videoId = "";
      
      if (url.includes("youtube.com/watch?v=")) {
        videoId = url.split("v=")[1]?.split("&")[0];
      } else if (url.includes("youtu.be/")) {
        videoId = url.split("youtu.be/")[1]?.split("?")[0];
      }
      console.log("ID extrait :", videoId);
      return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : "";
    };

    const openVideo = (url) => {
      let videoId = "";
      if (url.includes("youtube.com/watch?v=")) {
        videoId = url.split("v=")[1]?.split("&")[0];
      } else if (url.includes("youtu.be/")) {
        videoId = url.split("youtu.be/")[1]?.split("?")[0];
      }
      selectedVideo.value = videoId;
    };

    const selectedVideoEmbed = computed(() => {
      return selectedVideo.value ? `https://www.youtube.com/embed/${selectedVideo.value}` : "";
    });

    // ✅ Filtrage des vidéos en incluant les mots-clés **ET** le titre
    const filteredVideos = computed(() => {
      if (!search.value) return videos.value;

      const searchLower = search.value.toLowerCase();

      return videos.value.filter(video => {
        const titleLower = video.Titre ? video.Titre.toLowerCase() : "";
        const keywordsLower = video.MotsCles ? video.MotsCles.toLowerCase() : "";

        return titleLower.includes(searchLower) || keywordsLower.includes(searchLower);
      });
    });

    onMounted(fetchVideos);

    return { 
      videos, 
      loading, 
      search, 
      selectedVideo, 
      selectedVideoEmbed, 
      filteredVideos, 
      getThumbnail, 
      openVideo 
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
  cursor: pointer;
}
.card:hover {
  transform: scale(1.03);
}
.card-img-top {
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
}
.video-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1050;
}
.video-wrapper {
  position: relative;
  width: 80%;
  max-width: 900px;
  height: 500px;
  background: #000;
}
.video-iframe {
  width: 100%;
  height: 100%;
  border-radius: 10px;
}
.close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1100;
}
</style>
