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
                <div class="card-body">
  <h5 class="card-title">
    <input v-model="eleve.prenom" class="form-control form-control-sm mb-1" placeholder="Prénom" />
    <input v-model="eleve.nom" class="form-control form-control-sm" placeholder="Nom" />
  </h5>
  <input v-model="eleve.email" class="form-control form-control-sm mb-1" placeholder="Email" />

  <input v-model="eleve.telephone" class="form-control form-control-sm mb-1" placeholder="Téléphone" />
  <input v-model="eleve.statut" class="form-control form-control-sm mb-1" placeholder="Statut" />
  <input v-model="eleve.objectif" class="form-control form-control-sm mb-1" placeholder="Objectif" />
  <input v-model="eleve.trimestre" class="form-control form-control-sm mb-1" placeholder="Trimestre" />
  <input v-model="eleve.cursus" class="form-control form-control-sm mb-1" placeholder="Cursus" />

  <input v-model="eleve.drive" class="form-control form-control-sm mb-1" placeholder="Lien Google Drive" />
  <input v-model="eleve.youtube" class="form-control form-control-sm mb-2" placeholder="Lien Playlist YouTube" />

  <button class="btn btn-sm btn-success w-100" @click="updateEleve(eleve)">
    💾 Enregistrer
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
        apiURL: "https://script.google.com/macros/s/AKfycbwr0r4jO4IXuWGm40O_phYiT_T3GZ9kbTE2NaqBXNuPmzh3teeWLkPeKS4u3dPeEFnafA/exec"
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

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (result.success) {
      console.log("✅ Modification enregistrée :", result.message);
    } else {
      console.warn("❌ Erreur de mise à jour :", result.message);
      alert("Erreur : " + result.message);
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
  