<template>
    <Layout>
      <div class="container mt-4">
        <h2 class="text-white mb-4">👥 Liste des élèves</h2>
  
        <!-- 🔄 Loading -->
        <div v-if="loading" class="text-center text-light">
          <div class="spinner-border custom-spinner"></div>
          <p>Chargement des élèves...</p>
        </div>
  
        <!-- ❌ Erreur -->
        <div v-if="error" class="alert alert-danger">{{ error }}</div>
  
        <!-- ✅ Élèves -->
        <div v-if="eleves.length && !loading" class="row g-3">
          <div v-for="eleve in eleves" :key="eleve.email" class="col-12 col-md-6 col-lg-4">
            <div class="card h-100 bg-dark text-light border-light">
                <div class="card-body d-flex flex-column justify-content-between">
  <div>
    <h5 class="card-title text-info">{{ eleve.prenom }} {{ eleve.nom }}</h5>

    <!-- Identité -->
    <div class="mb-3">
      <label class="form-label text-light small">Prénom</label>
      <input v-model="eleve.prenom" class="form-control form-control-sm" />
    </div>
    <div class="mb-3">
      <label class="form-label text-light small">Nom</label>
      <input v-model="eleve.nom" class="form-control form-control-sm" />
    </div>
    <div class="mb-3">
      <label class="form-label text-light small">Email</label>
      <input v-model="eleve.email" class="form-control form-control-sm" />
    </div>

    <!-- Détails inscription -->
    <div class="mb-3">
      <label class="form-label text-light small">Téléphone</label>
      <input v-model="eleve.telephone" class="form-control form-control-sm" />
    </div>
    <div class="mb-3">
      <label class="form-label text-light small">Statut</label>
      <input v-model="eleve.statut" class="form-control form-control-sm" />
    </div>
    <div class="mb-3">
      <label class="form-label text-light small">Objectif</label>
      <textarea v-model="eleve.objectif" class="form-control form-control-sm" rows="2"></textarea>
    </div>
    <div class="mb-3">
      <label class="form-label text-light small">Trimestre</label>
      <input v-model="eleve.trimestre" class="form-control form-control-sm" />
    </div>
    <div class="mb-3">
      <label class="form-label text-light small">Cursus</label>
      <input v-model="eleve.cursus" class="form-control form-control-sm" />
    </div>

    <!-- Liens -->
    <div class="mb-3">
      <label class="form-label text-light small">Lien Google Drive</label>
      <input v-model="eleve.drive" class="form-control form-control-sm" />
    </div>
    <div class="mb-3">
      <label class="form-label text-light small">Playlist YouTube</label>
      <input v-model="eleve.youtube" class="form-control form-control-sm" />
    </div>
  </div>

  <!-- Bouton -->
  <button class="btn btn-success w-100 mt-3" @click="updateEleve(eleve)">
    💾 Enregistrer les modifications
  </button>
</div>


            </div>
          </div>
        </div>
  
        <!-- ℹ️ Aucun élève -->
        <div v-if="!eleves.length && !loading" class="text-center text-light">
          Aucun élève trouvé.
        </div>
      </div>
    </Layout>
  </template>
  
  <script>
  import Layout from "@/views/Layout.vue";
  import { getValidToken } from "@/utils/api.ts";
  
  export default {
    name: "GestionEleves",
    components: { Layout },
    data() {
      return {
        eleves: [],
        loading: false,
        error: null,
        apiURL: "https://script.google.com/macros/s/AKfycbzQzo2hko50pYv783ie3QT-WGZ6rao6pPTe4mmWGvMTEQCSgKeLLZ5D7Uu57mPPyPGxKw/exec"
      };
    },
    async mounted() {
      await this.fetchEleves();
    },
    methods: {
      async fetchEleves() {
        this.loading = true;
        this.error = null;
  
        const jwt = await getValidToken();
        if (!jwt) {
          this.error = "JWT non valide.";
          this.loading = false;
          return;
        }
  
        const url = `https://cors-proxy-sbs.vercel.app/api/proxy?url=${encodeURIComponent(
          this.apiURL + `?route=geteleves`
        )}`;
  
        try {
          const res = await fetch(url);
          const result = await res.json();
          console.log("📦 Résultat brut reçu :", result);

          if (Array.isArray(result)) {
  this.eleves = result;
} else {
  this.error = "Format inattendu reçu depuis le serveur.";
}

        } catch (err) {
          console.error("❌ Erreur fetchEleves :", err);
          this.error = "Erreur de connexion au serveur.";
        } finally {
          this.loading = false;
        }
      },
      getProxyPostURL(route) {
  return `https://cors-proxy-sbs.vercel.app/api/proxy?url=${encodeURIComponent(route)}`;
}
,
async updateEleve(eleve) {
  const jwt = await getValidToken();
  if (!jwt) {
    alert("JWT invalide ou expiré.");
    return;
  }

  const url = this.getProxyPostURL(this.apiURL);
  const payload = {
    route: "updateelevecomplet",
    jwt,
    email: eleve.email,
    nom: eleve.nom,
    prenom: eleve.prenom,
    telephone: eleve.telephone,
    statut: eleve.statut,
    objectif: eleve.objectif,
    trimestre: eleve.trimestre,
    cursus: eleve.cursus,
    drive: eleve.drive,
    youtube: eleve.youtube
  };

  console.log("📤 Payload envoyé à updateelevecomplet :", payload);
  console.log("🌐 URL POST :", url);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    console.log("📥 Réponse reçue :", result);

    if (result.success) {
      console.log("✅ Modification enregistrée :", result.message);
    } else {
      console.warn("❌ Erreur de mise à jour :", result.message || "Aucun message retourné");
      alert("Erreur : " + (result.message || "Aucun message retourné"));
    }
  } catch (err) {
    console.error("❌ Erreur API updateEleve :", err);
    alert("Erreur de communication avec le serveur.");
  }
}


    }
  };
  </script>
  
  <style scoped>
  .card {
    transition: transform 0.2s ease;
  }
  .card:hover {
    transform: scale(1.01);
  }
  </style>
  