<template>
  <Layout>
    <div class="container mt-4">
     
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

<!-- Message incitatif pour les utilisateurs "user" -->
<!-- Message unique selon le rôle -->
<div v-if="role === null || role === undefined || role === 'guest'" class="alert alert-warning text-center">
  🔒 Ton accès est limité ! <strong>Inscris-toi</strong> pour voir plus de vidéos ! 🚀  
  <br />
  <a href="/registerform" class="btn btn-primary mt-2">✨ S'inscrire maintenant</a>
</div>

<div v-else-if="role === 'user'" class="alert alert-info text-center">
  🔓 Tu as accès à <strong>80 vidéos</strong> !  
  Mais tu peux <strong>débloquer l'accès complet</strong> à toutes les vidéos en prenant un abonnement ! 🚀  
  <br />
  <a href="https://www.sunbassschool.com" target="_blank" rel="noopener noreferrer" class="btn btn-success mt-2">
    🔥 Débloquer l'accès complet
  </a>
</div>




      <!-- Chargement -->
      <div v-if="loading" class="d-flex justify-content-center mt-4">
        <div class="spinner-border text-primary" role="status"></div>
      </div>
<!-- Message incitatif si pas de rôle -->


      <!-- Grille de vidéos -->
      <div v-if="filteredVideos.length" class="row row-cols-1 row-cols-md-4 g-4">

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
import { jwtDecode } from "jwt-decode";

export default {
  name: "Videos",
  components: { Layout },
  setup() {
    const role = ref(null); // ✅ On ne définit pas encore le rôle, il sera chargé après
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

    // ⏳ Définition de la durée du cache (24h)
    const cacheDuration = 24 * 60 * 60 * 1000;

    const applyVideoLimit = () => {
  let limit = 1000; // 🔥 Par défaut, accès complet

  if (role.value === null || role.value === undefined) {
    limit = 5; // 🔥 Si le rôle n'est pas encore chargé, on affiche 5 vidéos
  } else if (role.value === "guest") {
    limit = 20;
  } else if (role.value === "user") {
    limit = 50; // ✅ Ajout de la limite pour les utilisateurs "user"
  }else if (role.value === "user") {
    limit = 50; // ✅ Ajout de la limite pour les utilisateurs "user"
  }

  videos.value = videos.value.slice(0, limit);
  console.log(`📹 Nombre de vidéos affichées : ${videos.value.length} (Rôle: ${role.value || "inconnu"})`);
};







    const fetchVideosFromAPI = async () => {
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

          // ✅ Appliquer la restriction selon le rôle
          applyVideoLimit();

          // ✅ Mettre à jour le cache
          localStorage.setItem("videos_cache", JSON.stringify(videos.value));
          localStorage.setItem("videos_cache_timestamp", Date.now());
        }
      } catch (error) {
        console.error("❌ Erreur lors du chargement des vidéos :", error);
      } finally {
        loading.value = false;
      }
    };

    const fetchVideos = async () => {
  console.log("🔍 Vérification du rôle :", role.value);

  const cacheKey = "videos_cache";
  if (!role.value || role.value === "guest") {
    console.log("🧹 Suppression du cache car accès restreint !");
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(`${cacheKey}_timestamp`);
  }

  const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
  const cachedData = localStorage.getItem(cacheKey);

  if (cachedData && cacheTimestamp && Date.now() - cacheTimestamp < cacheDuration) {
    console.log("⚡ Chargement des vidéos depuis le cache");
    videos.value = JSON.parse(cachedData);
  } else {
    await fetchVideosFromAPI();
  }

  applyVideoLimit(); // ✅ On applique la limite ici
  loading.value = false;
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

    onMounted(async () => {
  const token = localStorage.getItem("jwt");

  if (token) {
    try {
      const decoded = jwtDecode(token);
      role.value = decoded.role || "guest";
      console.log("✅ Rôle récupéré depuis le JWT :", role.value);
    } catch (error) {
      console.error("❌ Erreur de décodage du JWT :", error);
      role.value = null; // 🔥 Correction : rôle inconnu = null
    }
  } else {
    console.log("⚠️ Aucun JWT trouvé, rôle par défaut : null");
    role.value = null; // ✅ Important pour forcer 5 vidéos par défaut
  }

  await fetchVideos();
});

    return {
      role, // ✅ Ajouté ici pour éviter l'erreur Vue
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
