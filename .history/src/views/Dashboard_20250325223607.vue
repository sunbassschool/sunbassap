<template>
  <Layout>
    <div class="container d-flex flex-column align-items-center justify-content-center">
      
      <!-- 🔄 Spinner affiché pendant le chargement -->
      <div v-if="isLoading" class="text-center mt-5">
  <div class="spinner-border custom-spinner" role="status">
    <span class="visually-hidden">Chargement...</span>
  </div>
  <p class="mt-3 text-light fw-bold opacity-75 animate-fade">
    🎸 Chargement en cours...
</p>
</div>


      <!-- 🔒 Si l'élève n'est pas connecté -->
  <!-- Plus besoin de condition, Layout gère tout -->


      <!-- ✅ Contenu principal si l'élève est connecté -->
      <div v-if="!isLoading" class="content">


        <div 
          v-for="(card, index) in cards" 
          :key="index" 
          class="fade-in position-relative"
          :class="{ 'first-card': index === 0 }"
        >
          <div class="dashboard-card rounded-3 p-4 d-flex align-items-center">
            <i :class="card.icon" class="icon me-3"></i>
            <div>
              <h3 class="h5 mb-1 d-flex align-items-center">
                {{ card.title }}

                <!-- 🔄 Bouton mise à jour visible uniquement sur la première carte -->
                


              </h3>
              <p class="text-muted mb-0" v-html="card.text"></p>
            
            </div> 
          </div> <div v-if="index === 1" class="dashboard-card rounded-3 p-4 d-flex flex-column">
            <h3 class="h5 mb-2">🎶 🎯 Coaching & Feedback</h3>
           
            <textarea
  v-model="note"
  class="form-control mt-2"
  placeholder="Écris ta note ici..."
  rows="5"
  @input="onNoteInput">
</textarea>
<div class="d-flex justify-content-end mt-1">
  <button 
  class="btn refresh-note-btn d-flex align-items-center gap-2 px-3 py-1"
  @click="fetchNote(true)"
  :disabled="isRefreshingNote"
  :class="{ 'no-border': isRefreshingNote }"
>
  <span v-if="!isRefreshingNote">📥 Charger la dernière note</span>
  <span v-else class="custom-spinner" role="status" aria-hidden="true"></span>
</button>

</div>
<div v-if="noteUpdatedMessage" class="note-update-msg mt-1">
  {{ noteUpdatedMessage }}
</div>


  
  <div class="clear-note-container">
  <i 
    v-if="note.length" 
    @click.stop="clearNote" 
    class="bi bi-x-circle clear-note-btn">
  </i>
</div>



  
</div>
         
          
        </div>
      </div>

    </div>
  </Layout>
</template>


<script>
import Layout from "../views/Layout.vue";
import { jwtDecode } from "jwt-decode"; // 📌 Ajout du décodage du JWT
import { getCache, setCache, clearCache, shouldUpdateCache } from "@/utils/cacheManager.js";
import { getToken, getUserInfoFromJWT, getValidToken } from "@/utils/api.ts";
import { useAuthStore } from "@/stores/authStore"; // 👈 importe ton store

import { Picker } from "emoji-mart-vue-fast";
export default {
  
  name: "Dashboard",
  components: { Layout },
  data() {
    
    const prenom = sessionStorage.getItem("prenom") || localStorage.getItem("prenom") || "";
const cacheKey = `userData_${prenom}`;


  const cacheExpirationKey = `${cacheKey}_expiration`;

  return{
    prenom,  // ✅ Assure que `prenom` est défini avant l'utilisation des clés
    cacheKey, // ✅ Stocke avec la bonne valeur
    cacheExpirationKey, // ✅ Même chose ici
    noteUpdatedMessage: "", // ✅ Message temporaire de succès

    cards: [],
    isLoading: true,
    note: "", // Note de l'élève
    email: "",
    lastSaved: null,
    isRefreshingNote: false,

    saveCountdown: 0, // Timer avant la prochaine sauvegarde auto

    cacheDuration: 24 * 60 * 60 * 1000,
    apiBaseURL: "https://cors-proxy-sbs.vercel.app/api/proxy?url=https://script.google.com/macros/s/",
    routes: {
      GET: "AKfycbwEHhLoAVs9Lsn5HKfPnhB2gRAU2OBCeCTgTSK7CgV0ZMdqW_EQD2iyWZhCqc_UHLykog/exec",
       POST: "AKfycbwEHhLoAVs9Lsn5HKfPnhB2gRAU2OBCeCTgTSK7CgV0ZMdqW_EQD2iyWZhCqc_UHLykog/exec"
    }
  };
}
,
computed: {
  isLoggedIn() {
    const auth = useAuthStore();
    return !!auth.jwt && !!auth.user; // Vérifie que le JWT existe ET que l'utilisateur est chargé
  }
,
  userData() {
    const storedData = localStorage.getItem("userData_");
    return storedData ? JSON.parse(storedData) : {}; 
  },
  objectif() {
    const userInfosKey = `userInfos_${this.prenom}`;
    const storedData = localStorage.getItem(userInfosKey);
    const userInfos = storedData ? JSON.parse(storedData) : {};
    return userInfos.objectif || "🎯 Aucun objectif défini";
  }
}
,
  
async mounted() {
  try {
    const auth = useAuthStore();
   

 

    // 🔄 Synchronisation cross-tab
    window.addEventListener("storage", async (event) => {
      if (event.key === "jwt") {
        await this.fetchNote();
        await this.fetchFromAPI(true);
      }
    });

    // 🧠 Toujours afficher les données rapidement
    await this.loadUserData();

    // ⏳ Mise à jour silencieuse une seule fois par session
    if (!sessionStorage.getItem("apiSynced") && shouldUpdateCache(this.cacheKey, this.cacheDuration)) {
      this.fetchFromAPI(true); // ⚠️ sans await → appel en arrière-plan
      sessionStorage.setItem("apiSynced", "true");
    }

    await this.fetchNote();
    this.isLoading = false;

  } catch (err) {
    console.error("❌ Erreur dans mounted() :", err);
    this.isLoading = false;
    
  }
}








,
beforeUnmount() {
  window.removeEventListener("beforeunload", this.saveNoteOnUnload);

  window.removeEventListener("storage", this.syncCache);

},
  methods: {
    async saveNoteOnUnload(event) {
        if (this.note.trim() !== "" && this.isLoggedIn) {
            console.log("💾 Sauvegarde de la note avant de quitter la page...");
            await this.updateNote(); // 🔥 Force l'envoi de la note avant le départ
        }
    },
    getUserRole() {
    let jwt = sessionStorage.getItem("jwt") || localStorage.getItem("jwt");
    if (!jwt) return null;

    try {
      let decoded = jwtDecode(jwt);
      return decoded.role || "user"; // Retourne "user" par défaut si absent
    } catch (error) {
      console.error("❌ Erreur lors du décodage du JWT :", error);
      return null;
    }
  },
    syncCache(event) {
    if (event.key === `userData_${this.prenom}`) {
      console.log("🔄 Mise à jour du cache détectée dans un autre onglet, rechargement des données...");
      this.loadUserData();
    }
  },
  insertEmoji(event) {
      this.note += event.detail.unicode; // Ajoute l'emoji à la fin du texte
    },
    async loadUserData() {


  const cachedData = getCache(this.cacheKey);
  if (cachedData) {
    console.log("📦 Données avant updateData :", cachedData);

    this.updateData(cachedData);
    return true;
  }

  await this.fetchFromAPI();
  return false;
}




,
onNoteInput() {
  // ✅ Mise à jour immédiate du cache local
  let userData = getCache(`userData_${this.prenom}`) || {};
  userData.note = this.note.trim();
  setCache(`userData_${this.prenom}`, userData);

  // ⏳ Déclenchement différé de l'envoi API
  if (this.debounceTimer) clearTimeout(this.debounceTimer);

  this.debounceTimer = setTimeout(() => {
    this.updateNote(); // Appelle la vraie méthode API
  }, 1200); // ⏱️ Attends 1.2s après la dernière frappe
}
,
formatDateISO(isoString) {
  if (!isoString) return "Date inconnue";

  const dateObj = new Date(isoString);
  
  // Vérification si la date est invalide
  if (isNaN(dateObj.getTime())) {
    console.error("❌ Date invalide détectée :", isoString);
    return "Date invalide";
  }

  const options = { weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" };
  
  return dateObj.toLocaleString("fr-FR", options);
}
,

  getDayName(dateString) {
  if (!dateString) return "";
  
  const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const [day, month, yearAndTime] = dateString.split("/");
  const [year] = yearAndTime.split(" ");
  
  const dateObj = new Date(`${year}-${month}-${day}`);
  return days[dateObj.getDay()];
},

getFormattedDate(dateString) {
  if (!dateString) return "";
  
  const [day, month, yearAndTime] = dateString.split("/");
  const [year] = yearAndTime.split(" ");
  
  return `${day} ${this.getMonthName(month)} ${year}`;
},

getFormattedTime(dateString) {
  if (!dateString) return "";
  
  const time = dateString.split(" ")[1]; // Récupère "10:00"
  return time.replace(":", "H"); // Transforme "10:00" → "10H00"
},

getMonthName(monthNumber) {
  const months = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre"
  ];
  
  return months[parseInt(monthNumber, 10) - 1];
}
,
  async forceUpdateCache() {
  console.log("🔄 Mise à jour en arrière-plan...");
  this.clearCache(); // Supprime le cache sans toucher l'affichage actuel
  
  const timestamp = new Date().getTime();
  this.fetchFromAPI(true, timestamp);
}


,

async fetchNote(forceRefresh = false) {
  console.log("📝 Vérification de la note...");
  
  this.isRefreshingNote = forceRefresh;

  const cacheKey = `userData_${this.prenom}`;
  const cachedData = getCache(cacheKey);

  // ✅ Utilise le cache sauf si on force
  if (!forceRefresh && cachedData && cachedData.note !== undefined) {
    this.note = cachedData.note;
    console.log("✅ Note chargée depuis le cache.");
    this.saving = false;
    this.isRefreshingNote = false;
    return;
  }

  // 🔐 Validation du JWT AVANT appel API
  const jwt = await getValidToken();
  if (!jwt) {
    console.warn("🔒 JWT expiré ou absent, redirection !");
    this.isLoading = false; // ✅ ajoute ça aussi ici
    return;
  }

  console.log("📡 URL de la requête API : ", `${this.apiBaseURL}${this.routes.GET}?route=getnote&jwt=${jwt}`); // Ajoute cette ligne ici
  console.log("🌐 Récupération de la note depuis l'API...");
  try {
    const url = `${this.apiBaseURL}${this.routes.GET}?route=getnote&jwt=${jwt}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    // Vérifie si la réponse est une page HTML au lieu de JSON
    const text = await response.text(); // Récupère la réponse sous forme de texte
    if (text.startsWith('<!DOCTYPE html>')) {
      throw new Error('La réponse de l\'API n\'est pas du JSON, c\'est probablement une page HTML.');
    }

    const data = JSON.parse(text); // Essaie de parser la réponse comme JSON

    console.log("📡 Data payload reçue :", data);

    if (data.note !== undefined) {
      this.note = data.note || "";
      setCache(cacheKey, { ...cachedData, note: this.note });
      console.log("✅ Note mise à jour depuis l'API.");

      this.noteUpdatedMessage = "✅ Note mise à jour !";
      setTimeout(() => {
        this.noteUpdatedMessage = "";
      }, 3000);
    }
  } catch (error) {
    console.error("❌ Erreur API Bloc-Note :", error);
  } finally {
    this.saving = false;
    this.isRefreshingNote = false;
  }
}





,
 // 🔥 Mettre à jour la note en temps réel (autosave)
 async updateNote() {
  

  // ✅ Enregistre toujours localement
  let userData = getCache(`userData_${this.prenom}`) || {};
  userData.note = this.note.trim();
  setCache(`userData_${this.prenom}`, userData);

  // 🔐 Vérification JWT AVANT appel API
  const jwt = await getValidToken();
  if (!jwt) {
    console.warn("🔒 JWT expiré ou absent, redirection !");

    return;
  }

  // ⏳ Debounce pour éviter les appels trop fréquents
  this.debounceTimer = setTimeout(async () => {
    this.saving = true;
    try {
      const url = `${this.apiBaseURL}${this.routes.POST}`;
      const payload = { route: "updatenote", jwt, note: this.note.trim() };
      console.log("📤 Envoi de la note :", payload);

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("✅ Réponse API :", data);

      if (data.status !== "success") {
        console.error("❌ Erreur lors de la mise à jour :", data.message);
      }
    } catch (error) {
      console.error("❌ Erreur API Bloc-Note :", error);
    } finally {
      this.saving = false;
    }
  }, 2000);
}






, // 🔥 Mettre à jour la note en temps réel (autosave)

async fetchStudentData() {
  const cachedData = localStorage.getItem(this.cacheKey);
  const cacheExpiration = parseInt(localStorage.getItem(this.cacheExpirationKey), 10);

  if (cachedData && cacheExpiration && Date.now() < cacheExpiration) {
    try {
      const parsedData = JSON.parse(cachedData);
      console.log("⚡ Chargement rapide depuis le cache.");
      this.updateData(parsedData);
      this.isLoading = false;
      return;
    } catch (error) {
      console.error("❌ Erreur parsing cache :", error);
      this.clearCache(); // Supprime le cache corrompu
    }
  }

  await this.fetchFromAPI();
}

,
clearNote() {
  console.log("🧹 Nettoyage de la note...");
  this.note = ""; // Réinitialise la note visuellement

  // ✅ Met à jour immédiatement le cache local
  let userData = getCache(`userData_${this.prenom}`) || {};
  userData.note = "";
  setCache(`userData_${this.prenom}`, userData);

  // 🔐 N'envoie à l'API que si connecté
  const jwt = sessionStorage.getItem("jwt") || localStorage.getItem("jwt");
  if (jwt) {
    this.sendEmptyFeedbackInBackground(jwt);
  } else {
    console.warn("🚫 Non connecté, note vidée localement uniquement.");
  }
}

,

formatDate(dateString) {
  if (!dateString) return "Date inconnue";

  const [day, month, yearAndTime] = dateString.split("/");
  const [year, time] = yearAndTime.split(" ");

  return `📅 ${day}/${month}/${year} à ${time}`;
}
,
async sendEmptyFeedbackInBackground(jwt) {
  try {
    const url = `${this.apiBaseURL}${this.routes.POST}`;
    const payload = { route: "updatenote", jwt, note: "" };
    console.log("📤 Envoi de la note vide :", payload);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log("✅ Réponse API mise à jour :", data);

    if (data.status === "success") {
      console.log("✅ Note supprimée avec succès !");
    } else {
      console.error("❌ Erreur suppression :", data.message);
    }
  } catch (error) {
    console.error("❌ Erreur API ClearNote :", error);
  }
}

,
async fetchFromAPI(forceRefresh = false) {
  if (!forceRefresh && !shouldUpdateCache(this.cacheKey, this.cacheDuration)) {
    console.log("✅ Cache encore valide, pas d'appel API.");
    return;
  }

  let cachedData = JSON.parse(localStorage.getItem(this.cacheKey)) || {};
  if (!this.email) this.email = localStorage.getItem("email");
  if (!this.prenom) this.prenom = localStorage.getItem("prenom");
  if (!this.email || !this.prenom) {
    console.warn("⚠️ Email ou prénom manquant, récupération via JWT...");
    const userInfo = getUserInfoFromJWT();
    if (userInfo.email) this.email = userInfo.email;
    if (userInfo.prenom) this.prenom = userInfo.prenom;
  }

  if (!this.email || !this.prenom) {
  console.error("❌ Email et prénom introuvables.");
  this.isLoading = false; // ✅ ici aussi, important
  return;
}


  // 🔐 Vérification JWT AVANT appel API
  const jwt = await getValidToken();
  if (!jwt) {
    console.warn("🔒 JWT expiré ou absent, redirection !");
    this.$router.push("/login");
    return;
  }

  try {
    const url = `${this.apiBaseURL}${this.routes.GET}?route=planning&jwt=${encodeURIComponent(jwt)}&email=${this.email}&prenom=${this.prenom}`;
    console.log("📡 URL API :", url);

    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
      return;
    }

    const data = await response.json();
    console.log("📡 Data payload reçue :", data);
    // ✅ Nouvelle logique ici
    if (data.error === "Élève non inscrit") {
  console.warn("ℹ️ Élève connecté mais pas encore inscrit à un cours.");
  
  // ✅ Toujours afficher les cartes de base
  this.cards = [
    {
      icon: "bi bi-calendar-event",
      title: "Prochain Cours",
      text: `Tu n’as pas encore de cours prévu.<br>
        👉 <strong><a href='https://www.sunbassschool.com/step/inscription-aux-cours-en-visio/' target='_blank' style='color: #ff8c00;'>Clique ici pour réserver ton premier cours</a></strong> 🎸`
    },
    {
      icon: "bi bi-flag",
      title: "Objectif actuel",
      text: `Ton objectif musical n’a pas encore été défini.<br>
        🧭 <strong><a href='https://www.sunbassschool.com/step/inscription-aux-cours-en-visio/' target='_blank' style='color: #ff8c00;'>Prends un cours</a></strong> pour qu'on le définisse ensemble !`
    }
  ];

  this.isLoading = false;
  return;
}



const payload = data; // ✔️ Directement utiliser les données de l'API comme dans la V1

    console.log("🎯 Objectif reçu de l'API :", payload.objectif);

    Object.keys(payload).forEach(key => {
      if (payload[key] !== null && payload[key] !== undefined) {
        cachedData[key] = payload[key];
      }
    });

    localStorage.setItem(this.cacheKey, JSON.stringify(cachedData));
    console.log("📦 Données avant updateData :", cachedData);

    this.updateData(cachedData);
    this.isLoading = false; // Ajoute ce `false` ici

  } catch (error) {
    console.error("❌ Erreur API :", error);
  }
}










,


    isCacheValid(data) {
      if (!data || typeof data !== "object") {
        console.error("❌ Cache invalide détecté : Données absentes ou incorrectes.");
        return false;
      }

      if (data.status === "error" || data.error) {
        if (data.error === "Aucun lien Meet trouvé") {
          console.warn("⚠️ Aucun lien Meet trouvé, mais ce n'est pas une erreur critique.");
          return true;
        }

        console.error("❌ Cache invalide détecté :", data.error || data.message);
        return false;
      }

      const hasValidProchainCours =
        data.prochainCours &&
        typeof data.prochainCours === "object" &&
        typeof data.prochainCours.date === "string" &&
        typeof data.prochainCours.cours === "string";

      const hasValidObjectif = typeof data.objectif === "string";

      if (!hasValidProchainCours && !hasValidObjectif) {
        console.error("❌ Cache invalide : Données essentielles manquantes.");
        return false;
      }

      return true;
    },
    updateData(data) {
      console.log("🧠 updateData() appelée avec :", data);
    console.log("📌 Mise à jour des cartes...");
    console.log("📡 Data reçue :", data);

;
    // 🔍 Récupération du cache actuel
    let cachedData = localStorage.getItem(this.cacheKey);
    cachedData = cachedData ? JSON.parse(cachedData) : {};

    let userInfosKey = `userInfos_${this.prenom}`;
    let cachedInfos = localStorage.getItem(userInfosKey);
    cachedInfos = cachedInfos ? JSON.parse(cachedInfos) : {};

    // 🔄 Fusion des anciennes et nouvelles données (hors espace_google_drive et playlist_youtube)
    const updatedData = { 
        ...cachedData,
        ...data,
    };

  // ✅ Stocker espace_google_drive, playlist_youtube et objectif dans userInfos_{prenom}
  if (data.espace_google_drive !== undefined) {
        cachedInfos.espace_google_drive = data.espace_google_drive;
    }
    if (data.playlist_youtube !== undefined) {
        cachedInfos.playlist_youtube = data.playlist_youtube;
    }
    if (data.objectif !== undefined) {
        cachedInfos.objectif = data.objectif; // 🔥 Sauvegarde de l'objectif
    }

    console.log("💾 Sauvegarde du cache mise à jour :", updatedData);
    localStorage.setItem(this.cacheKey, JSON.stringify(updatedData));

    console.log("💾 Sauvegarde des infos séparées :", cachedInfos);
    localStorage.setItem(userInfosKey, JSON.stringify(cachedInfos));

    // 📌 Mise à jour des cartes (exemple pour Dashboard)
 // 📌 Mise à jour des cartes (exemple pour Dashboard)
 if (!Array.isArray(updatedData.planning) || updatedData.planning.length === 0) {

  this.cards = [
    {
      icon: "bi bi-calendar-event",
      title: "Prochain Cours",
      text: "🎸 Aucun cours prévu pour le moment."
    },
    {
      icon: "bi bi-flag",
      title: "Objectif actuel",
      text: updatedData.objectif || "🎯 Aucun objectif défini"
    }
  ];
  return;
}


    // 📌 Trouver le prochain cours
    const now = new Date();
    const prochainCours = updatedData.planning.find(cours => new Date(cours.date) > now);

    if (!prochainCours) {
        this.cards = [
            {
                icon: "bi bi-calendar-event",
                title: "Prochain Cours",
                text: "Aucun cours à venir."
            },
            {
                icon: "bi bi-flag",
                title: "Objectif actuel",
                text: updatedData.objectif || "Aucun objectif défini"
            }
        ];
        return;
    }

    console.log("🎯 Prochain cours sélectionné :", prochainCours);

    this.cards = [
        {
            icon: "bi bi-calendar-event",
            title: "Prochain Cours",
            text: `
                <div class="meet-button" onclick="window.open('${prochainCours.meet}', '_blank')">
                    <strong>${prochainCours.formattedDate}</strong>
                    <i class="bi bi-link-45deg"></i>
                </div>
            `
        },
        {
            icon: "bi bi-flag",
            title: "Objectif actuel",
            text: updatedData.objectif || "Aucun objectif défini"
        }
    ];
}








,

    displayError() {
      this.cards = [
      {
  icon: "bi bi-calendar-event",
  title: "Prochain Cours",
  text: `Tu n'as pas encore de cours prévu.<br>
         👉 <strong><a href='https://www.sunbassschool.com/step/inscription-aux-cours-en-visio/' target='_blank' style='color: #ff8c00;'>Clique ici pour réserver ton prochain cours</a></strong> et continuer à progresser 🎸`
},
{
  icon: "bi bi-flag",
  title: "Objectif actuel",
  text: `Ton objectif musical n'a pas encore été défini.<br>
         🧭 <strong><a href='https://www.sunbassschool.com/step/inscription-aux-cours-en-visio/' target='_blank' style='color: #ff8c00;'>Prends un cours</a></strong> pour qu'on le construise ensemble ! 💪`
}
      ];
    },

    redirectToRegisterform() {
      this.$router.push("/registerform");
    },
    redirectToLogin() {
      router.replace("/login");


    }
  }
};
</script>




<style scoped>
.note-update-msg {
  font-size: 0.85rem;
  color: #ffffff;
  padding: 4px 8px;
  margin-top: 10px;
  text-align: right;
  background: rgba(0, 255, 174, 0.08);
  border: 1px solid rgba(0, 255, 174, 0.2);
  border-radius: 6px;
  animation: fadeMessage 3s ease-in-out forwards;
  display: inline-block;
}

@keyframes fadeMessage {
  0%   { opacity: 0; transform: translateY(-5px); }
  10%  { opacity: 1; transform: translateY(0); }
  90%  { opacity: 1; }
  100% { opacity: 0; transform: translateY(-5px); }
}

.refresh-note-btn {
  font-size: 0.9rem;
  margin-top:8%;
  background-color: rgba(255, 255, 255, 0.08);
  color: #ffffffcc;
  border: 1px solid #ffffff33;
  border-radius: 6px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.refresh-note-btn.no-border {
  border: none !important; /* ✅ Supprime totalement la bordure */
  background: transparent !important; /* Facultatif si tu veux full clean */
  box-shadow: none !important;
}


.refresh-note-btn:hover {
  background-color: rgba(255, 255, 255, 0.15);
  color: #ffffff;
  
  border:none;
 
}

.refresh-note-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner-border {
  width: 1rem;
  height: 1rem;
  
  color: #ff8c00;
}

@keyframes fadeBlink {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.animate-fade {
  animation: fadeBlink 1.5s infinite;
}

.custom-spinner {
  width: 14px;
  height: 14px;
  background-color: #ff1e00;
  border-radius: 50%;
  display: inline-block;
  animation: pulseSpinner 0.9s ease-in-out infinite;
}

@keyframes pulseSpinner {
  0% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.4); opacity: 0.6; }
  100% { transform: scale(1); opacity: 0.9; }
}



@media (max-width: 768px) {
  
  .dashboard-card {
    padding: 10px !important; /* 📏 Réduction du padding général */
    min-height: auto !important; /* ✅ Évite un agrandissement inutile */
    display: flex;
    align-items: center;
  }

  .dashboard-card .icon {
    font-size: 1.5rem; /* 📏 Réduit la taille de l’icône */
    margin-right: 5px; /* ✅ Réduit l’espace entre l’icône et le texte */
  }

  .dashboard-card h3 {
    margin-bottom: 2px !important; /* ✅ Évite un grand espace sous le titre */
    font-size: 1rem; /* 📏 Taille réduite du titre */
    color: #aaaaaa;
  }

  .dashboard-card p {
    margin-bottom: 0 !important; /* ✅ Supprime l’espace sous le texte */
    font-size: 0.9rem; /* 📏 Texte légèrement plus compact */
  }







  .dashboard-card div {
    margin: 0 !important; /* ✅ Supprime tout espace autour du bloc texte */
    padding: 0 !important;
  }
  .dashboard-card .icon {
  background-color: rgba(92, 92, 92, 0.226); /* 🎨 Couleur de fond */
  padding: 2px; /* ✅ Ajoute un espace autour de l’icône */
  border-radius: 50%; /* ✅ Arrondi pour un effet bouton */
}
.dashboard-card .icon {
  color: #ff3c00; /* 🎨 Couleur de l'icône */
}
}
h3 {
  font-size: 1.2rem;
  font-weight: bold;
  color: #ffffff; /* Un orange motivant */
  text-transform: uppercase;
  letter-spacing: 1px;
  position: relative;
}

h3::after {
  content: "";
  display: block;
  width: 50px;
  height: 2px;
  background: #ff8c00;
  margin-top: 5px;
  transition: width 0.3s ease-in-out;
}

h3:hover::after {
  width: 100px;
}

textarea.form-control {
  min-height: 150px; /* ✅ Taille minimale */
  max-height: 400px; /* ✅ Taille max pour éviter qu'il prenne tout l’écran */
  height: auto; /* ✅ Permet l'agrandissement */
  overflow-y: auto !important; /* ✅ Active le scroll si nécessaire */
  resize: vertical; /* ✅ L’utilisateur peut agrandir la zone */
  
  font-family: 'Patrick Hand', cursive;
  font-size: 1.2rem;
  background: #fff8e1;
  border: 2px solid #d4a373;
  padding: 15px;
  width: 100%;
  line-height: 1.6;
  color: #3d3d3d;
  border-radius: 5px;
  box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.1);
  
  white-space: pre-wrap;
  animation: fadeInText 1s ease-out;
  caret-color: #3d3d3d; /* ✅ Affiche un vrai curseur */
}


/* Ajout du curseur animé */
textarea.form-control {
  font-family: 'Patrick Hand', cursive;
  font-size: 1.2rem;
  background: #fff8e1;
  border: 2px solid #d4a373;
  padding: 15px;
  min-height: 150px;
  width: 100%;
  line-height: 1.6;
  color: #3d3d3d;
  border-radius: 5px;
  box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.1);
  
  white-space: pre-wrap;
  animation: fadeInText 1s ease-out;
  caret-color: #3d3d3d; /* ✅ Affiche un vrai curseur */
}
@media (max-width: 768px) { /* Ou toute autre taille selon ton besoin */
  .container {
    display: flex;
    margin-top: -12%;
    flex-direction: column;
    align-items: center;
    justify-content: center; /* Centrage vertical */
    padding: 40px 20px;
    background-color: rgb(0, 0, 0);
    min-height: 100vh; /* Toute la hauteur de la fenêtre */
  }
}
/* Animation d'apparition progressive */
@keyframes fadeInText {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* ✅ Animation du curseur natif */
textarea.form-control:focus {
  caret-color: #070707; /* 🔥 Curseur rouge/orange pour coller au thème */
  animation: blinkCursor 0.8s infinite;
}

/* ✅ Effet de clignotement (du vrai curseur, sans border-right) */
@keyframes blinkCursor {
  50% {
    caret-color: transparent;
  }
}



textarea.form-control:focus {
  border-color: #ff8c00;
  box-shadow: 0px 0px 10px rgba(255, 140, 0, 0.6);
  background: #fff8e1; /* Effet papier légèrement jauni */
}

.text-danger {
  color: red !important;
}


/* 📅 Bouton discret pour la date */
/* 📅 Bouton cliquable pour la date */
.meet-button {
  display: inline-block;
  background: rgba(255, 140, 0, 0.15);
  padding: 8px 12px;
  border-radius: 8px;
  text-decoration: none !important;
  font-weight: bold;
  color: #ff8c00 !important;
  transition: background 0.3s ease-in-out, color 0.3s ease-in-out;
  text-align: center;
  font-size: 1rem;
  cursor: pointer;
}


/* 🔥 FORCER la couleur du texte dans tous les états possibles */



/* 🔄 Bouton de mise à jour du cache */
.update-cache-btn {
  position: absolute;
  top: 10px;
  right: 0px;
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #ffffff;
  cursor: pointer;
  transition: opacity 0.3s ease-in-out;
  padding: 5px;
}

.update-cache-btn:hover {
  opacity: 0.7;
}

/* Conteneur principal */
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center; /* Centrage vertical */
  padding: 40px 20px;
  background-color: rgb(15, 15, 15);
  min-height: 100vh; /* Toute la hauteur de la fenêtre */
  width: 100%; /* Pleine largeur */
}

.loading-indicator {
  font-size: 0.9rem;
  color: #ff8c00;
  animation: fadeInOut 1s infinite alternate;
}

@keyframes fadeInOut {
  from { opacity: 1; }
  to { opacity: 0.5; }
}

/* Contenu centré et limité */
.content {
  width: 100%;
   flex-grow:1;
  max-width: 800px;
  text-align: center;
  padding-bottom: 100px; /* ✅ Ajoute de l’espace sous le contenu */

}

/* Message d'accueil */
.text-center {
  color: #ffffff;
}

/* Cartes */
/* 📌 Style général des cartes */
.dashboard-card {
  max-height: 350px; /* ✅ Hauteur maximale du bloc */
  overflow-y: auto; /* ✅ Scroll interne */
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05)); /* Effet verre */
  border: 1px solid rgba(255, 255, 255, 0.2); /* Bordure subtile */
  box-shadow: 4px 4px 15px rgba(0, 0, 0, 0.3), inset -4px -4px 10px rgba(255, 255, 255, 0.05); /* Ombre douce */
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 10px;
  border-radius: 12px; /* Coins légèrement arrondis */
  margin: 15px 0; /* Ajout d’espace entre les cartes */
  width: 100%;
  color:white;
  transition: all 0.3s ease-in-out;
  backdrop-filter: blur(8px); /* Effet de flou pour le style "Glassmorphism" */
}

/* ✨ Effet au survol */
.dashboard-card:hover {
  transform: translateY(-5px);
  box-shadow: 6px 6px 20px rgba(0, 0, 0, 0.5), inset -2px -2px 8px rgba(255, 255, 255, 0.05);
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.192), rgba(255, 255, 255, 0.07));
}

/* 🟠 Icônes plus visibles */
.icon {
  font-size: 2.5rem;
  color: #ff8c00; /* Icône colorée pour plus d’impact */
  background: rgba(255, 140, 0, 0.15);
  padding: 10px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 55px;
  height: 55px;
  margin-right: 15px;
}
.this.card

/* 📌 Amélioration des titres */
.dashboard-card h3 {
  font-size: 1.2rem;
  font-weight: bold;
  color: white!important;
}

/* 📌 Texte plus lisible */
.dashboard-card p {
  font-size: 14px;
  color: #fff!important;
  
  font-weight: 400; /* Poids de police normal */
   text-align: left; /* Alignement naturel */
  line-height: 1.5; /* Espacement optimal */
  letter-spacing: 0.3px; /* Espacement subtil pour la lisibilité */
  transition: color 0.3s ease-in-out;
  
}


/* 🔥 Barre animée sous le texte */
.dashboard-card p::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -2px;
  width: 0;
  height: 2px;
  background-color: #a33400;
  transition: width 0.3s ease-in-out;
}

.dashboard-card:hover p {
  color: #ff8c00;
}

.dashboard-card:hover p::after {
  width: 100%;
}

@media (max-width: 768px) {
  .dashboard-card {
    min-width: 100%;
  }
}

.dashboard-card:hover p {
  text-shadow: 0 0 15px rgba(255, 140, 0, 0.9);
}
.dashboard-card p::first-letter {
  font-size: 1.1rem;
  font-weight: bold;
  color: #ff3c00; /* Première lettre en orange */
}
/* 🔽 Séparateur entre les cartes */
.separator {
  height: 1px;
  background: rgba(255, 255, 255, 0.2);
  margin: 20px 0;
}


/* Effet d'apparition fluide */
.fade-in {
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Style des boutons */
button {
  padding: 10px 20px;
  font-size: 16px;
  border-radius: 5px;
  transition: background-color 0.3s ease-in-out;
}

.btn-primary {
  background-color: #1e90ff;
  border: none;
  color: white;
}

.btn-secondary {
  background-color: #444;
  border: none;
  color: white;
}

button:hover {
  opacity: 0.8;
}

/* Ajustement du texte */
.text-light {
  color: #bbb;
}

</style>