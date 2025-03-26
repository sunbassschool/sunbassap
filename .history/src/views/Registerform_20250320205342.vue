<template>
  <Layout>
    <div class="register-container">
      <h2 class="h2-immersive">🚀 Rejoindre l'aventure</h2>

      <form @submit.prevent="submitForm" class="card p-4 shadow">
        <!-- Adresse e-mail -->
        <div class="mb-3">
          <label class="form-label">Adresse e-mail</label>
          <input v-model="email" type="email" class="form-control" required />
        </div>

        <!-- Prénom -->
        <div class="mb-3">
          <label class="form-label">Prénom</label>
          <input v-model="prenom" type="text" class="form-control" required />
        </div>

        <!-- Code d'accès -->
        <div class="mb-3">
          <label class="form-label">Code d'accès</label>
          <input 
            v-model="codeAcces" 
            type="password" 
            class="form-control" 
            required 
            @input="validatePassword" 
          />
          <small class="text-danger" v-if="passwordError">{{ passwordError }}</small>
        </div>

        <!-- Confirmation du Code d'accès -->
        <div class="mb-3">
          <label class="form-label">Confirmer le code d'accès</label>
          <input v-model="confirmCodeAcces" type="password" class="form-control" required />
          <small class="text-danger" v-if="confirmPasswordError">{{ confirmPasswordError }}</small>
        </div>

        <!-- Case à cocher CGU -->
        <div class="mb-3 form-check">
          <input v-model="cguAccepted" type="checkbox" class="form-check-input" id="cgu" required />
          <label class="form-check-label" for="cgu">
            J'accepte les <a href="/cgu" target="_blank">Conditions Générales d'Utilisation</a>
          </label>
        </div>

   <!-- Barre de chargement -->
<div v-if="isLoading" class="loading-container">
  <div class="loading-bar"></div>
</div>

<!-- Bouton de soumission -->
<button 
  type="submit" 
  class="btn btn-primary w-100" 
  :disabled="isSubmitDisabled || isLoading"
  :class="{ 'btn-loading': isLoading }"
>
  <span v-if="isLoading" class="custom-spinner"></span>
  <span v-else>S'inscrire</span>
</button>

<!-- Message de confirmation -->
<p v-if="message" class="mt-3 text-success">{{ message }}</p>
<p v-if="errorMessage" class="mt-3 text-danger">{{ errorMessage }}</p>

      </form>
    </div>
  </Layout>
</template>


<script>
import Layout from "../views/Layout.vue";

export default {
  name: "RegisterForm",
  components: { Layout },
  data() {
    return {
      email: "",
      prenom: "",
      codeAcces: "",
      confirmCodeAcces: "",
      cguAccepted: false,
      message: "",
      passwordError: "",
      confirmPasswordError: "",
      isLoading: false, // Ajout du statut de chargement
      progress: 0, // Ajout pour la progression de la barre
    };
  },
  computed: {
    isSubmitDisabled() {
      return !!this.passwordError || !!this.confirmPasswordError || !this.cguAccepted;
    }
  },
  methods: {
    validatePassword() {
      const strongPasswordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!strongPasswordRegex.test(this.codeAcces)) {
        this.passwordError = "Le mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial.";
      } else {
        this.passwordError = "";
      }
    },
    startProgressBar() {
    this.progress = 0;
    const interval = setInterval(() => {
      if (this.progress < 90) {
        this.progress += 10; // La barre avance progressivement
      } else {
        clearInterval(interval); // On arrête avant d'atteindre 100%
      }
    }, 300); // Toutes les 300ms, la barre progresse
  },
    async submitForm() {
  if (this.codeAcces !== this.confirmCodeAcces) {
    this.confirmPasswordError = "Les mots de passe ne correspondent pas.";
    return;
  } else {
    this.confirmPasswordError = "";
  }
  this.isLoading = true; // ✅ Active le chargement AVANT l'appel API
  this.startProgressBar(); // Démarre la barre de progression
  try {
    const url = `https://script.google.com/macros/s/AKfycbxkIJaFUJlTgsoFC9yui2GmmGT6nAH2aJE77xvt3QGzDItBwPUcu4CFNSsvd37_724m-A/exec?route=register&email=${encodeURIComponent(this.email)}&prenom=${encodeURIComponent(this.prenom)}&codeAcces=${encodeURIComponent(this.codeAcces)}`;

    const response = await fetch(url, { method: "GET" });

    const result = await response.json();

    if (result.success) {
      this.message = "Inscription réussie !";
      localStorage.setItem("user", JSON.stringify({
        email: this.email,
        prenom: this.prenom,
        id: result.id
      }));

      // Réinitialisation du formulaire
      this.email = "";
      this.prenom = "";
      this.codeAcces = "";
      this.confirmCodeAcces = "";
      this.cguAccepted = false;

      setTimeout(() => this.$router.push('/mon-espace'), 1500);
    } else {
      this.message = "Erreur lors de l'inscription.";
    }
  } catch (error) {
    console.error("Erreur :", error);
    this.message = "Impossible de contacter le serveur.";
  }finally {
    
      this.isLoading = false; // Désactive le chargement
    }
}
,
  },
};
</script>

<style scoped>
.spinner-border {
  vertical-align: middle;
  margin-right: 5px;
}
.text-danger {
  color: #ff4d4d;
  font-size: 0.9rem;
}
.register-container {
  max-width: 600px;
  margin: 0 auto;
  text-align:center;
  padding:15px;
}

.h2-immersive {
  font-weight: bold;
    animation: fadeIn 1.2s ease-in-out;
   /* Empêche le retour à la ligne */
  text-transform: uppercase; /* Force les majuscules */

  text-align: center;
  font-size: 1,5rem;
  background: linear-gradient(135deg,rgb(255, 255, 255),rgb(172, 172, 172));
  -webkit-background-clip: text;
  color: transparent; /* Texte en dégradé */
  text-shadow: 0px 4px 10px rgba(126, 126, 126, 0.5);
  padding: 10px;
  border-radius: 8px;
  display: inline-block;
  transition: transform 0.2s ease-in-out;
}
@media (max-width: 576px) { /* Ajuste sur mobiles */
  .h2-immersive {
    font-size: 1.5rem;
  }
}

@keyframes fadeIn {
  0% { opacity: 0; transform: translateY(-20px); }
  100% { opacity: 1; transform: translateY(0); }
}

.h2-immersive:hover {
  transform: scale(1.05); /* Effet zoom léger */
}

.container {
  max-width: 90% !important; /* S'étend à 90% de l’écran */
  width: 100%;
}

/* Conteneur de la barre */
.loading-container {
  width: 100%;
  height: 6px;
  background-color: rgba(255, 255, 255, 0.2); /* Couleur de fond légère */
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 10px;
}

/* Barre de chargement animée */
.loading-bar {
  width: 0%;
  height: 100%;
  background-color: #ff8c00; /* Couleur principale */
  transition: width 3s ease-in-out; /* Remplissage fluide */
  animation: progressBar 3s linear forwards;
}

/* Animation qui fait avancer la barre */
@keyframes progressBar {
  0% { width: 0%; }
  100% { width: 100%; }
}


.loading-bar {
  height: 100%;
  background-color: #ff8c00 !important; /* Orange plus doux */
  transition: width 0.3s ease-in-out;
}

.card {
  border-radius: 12px;
  max-width: 150%;
  width: 100%;
  background: rgba(255, 255, 255, 0.1); /* Légère transparence */
  backdrop-filter: blur(10px); /* Effet de flou pour un look moderne */
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
  padding: 30px;
  color: #fff;
}

.card h2 {
  font-weight: bold;
  color: #fff; /* Blanc pour fond sombre */
  text-align: center;
}

input {
  border-radius: 0px; /* Suppression des angles arrondis */
  text-align: center;
  background: rgba(255, 255, 255, 0.9);
  color: black;
  border: 1px solid rgba(200, 200, 200, 0.5); /* Bordure plus discrète */
  padding: 8px; /* Réduction de l’espace interne */
  font-size: 0.9rem; /* Réduction de la taille du texte */
  height: 36px; /* Hauteur plus compacte */
}

input:focus {
  border-color: #ff8c00;
  box-shadow: none; /* Supprime l’effet de focus flou */
}
.form-label {
  font-weight: bold;
  color: #fff;
}
.btn-primary {
  background: #ff3300 !important; /* Orange */
  border: none !important;
  font-weight: bold;
  padding: 12px;
  border-radius: 8px;
  transition: background 0.3s ease;
  color: white !important;
}
/* Style de la case à cocher */
.form-check-input {
  width: 18px;
  height: 18px;
  background-color: transparent;
  border: 2px solid #ff8c00 !important; /* Bordure orange */
  cursor: pointer;
  transition: all 0.3s ease;
}

/* Case cochée */
.form-check-input:checked {
  background-color: #a12000 !important; /* Fond orange */
  border-color: #e4e4e496 !important;
}

/* Au survol */
.form-check-input:hover {
  border-color: #ff5e00 !important; /* Bordure plus vive */
}

/* Style du label */
.form-check-label {
  font-weight: bold;
  color: white !important;
  cursor: pointer;
}

/* Adapter pour le mode sombre */
@media (prefers-color-scheme: dark) {
  .form-check-input {
    border-color: #ff8c00 !important;
  }

  .form-check-input:checked {
    background-color: #ff8c00 !important;
    border-color: #ff8c00 !important;
  }

  .form-check-label {
    color: white !important;
  }
}

.btn-primary:hover {
  background: #ff5e00;
}

.forgot-password-link {
  color: #ff8c00;
  font-weight: bold;
  text-decoration: none;
}

.forgot-password-link:hover {
  text-decoration: underline;
}

/* Effet focus animé */
@keyframes glow {
  0% { box-shadow: 0 0 5px rgba(255, 140, 0, 0.5); }
  50% { box-shadow: 0 0 20px rgba(255, 140, 0, 0.8); }
  100% { box-shadow: 0 0 5px rgba(255, 140, 0, 0.5); }
}

input:focus {
  animation: glow 1s infinite alternate;
}

/* Ajustement global */
.container {
  margin-top: 50px;
}

/* Empêcher Chrome de stocker les mots de passe */
input:-webkit-autofill {
  background-color: transparent !important;
}

</style>
