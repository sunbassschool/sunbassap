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
          <div v-for="eleve in eleves" :key="eleve.email" class="col-12 col-md-6">
            <div class="card h-100 bg-dark text-light border-light">
                <div class="card-body">
  <h5 class="card-title text-info">
    {{ eleve.prenom }} {{ eleve.nom }}
  </h5>

  <!-- Champs éditables -->
  <div v-for="champ in champs" :key="champ.key" class="mb-2">
    <label class="form-label text-light small">{{ champ.label }}</label>

    <!-- Affichage texte -->
    <div v-if="!editing[eleve.email + champ.key]" @click="enableEdit(eleve.email, champ.key)" class="editable-field">
      {{ eleve[champ.key] || '—' }}
    </div>

    <!-- Champ éditable -->
    <input
      v-else
      :type="champ.type"
      class="form-control form-control-sm"
      v-model="eleve[champ.key]"
      @blur="updateEleve(eleve); disableEdit(eleve.email, champ.key)"
      @keyup.enter="$event.target.blur()"
    />
  </div>
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
        editing: {},
champs: [
  { key: "email", label: "Email", type: "text" },
  { key: "telephone", label: "Téléphone", type: "text" },
  { key: "statut", label: "Statut", type: "text" },
  { key: "objectif", label: "Objectif", type: "text" },
  { key: "trimestre", label: "Trimestre", type: "text" },
  { key: "cursus", label: "Cursus", type: "text" },
  { key: "drive", label: "Lien Google Drive", type: "text" },
  { key: "youtube", label: "Lien Playlist YouTube", type: "text" }
],
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
enableEdit(email, key) {
  this.$set(this.editing, email + key, true);
},
disableEdit(email, key) {
  this.$set(this.editing, email + key, false);
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
  <style scoped>
.editable-field {
  padding: 4px 6px;
  background: #1e1e1e;
  border-radius: 4px;
  cursor: pointer;
  color: #ccc;
}
.editable-field:hover {
  background: #2a2a2a;
}


  </style>
  