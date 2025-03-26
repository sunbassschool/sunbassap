<template>
  <Layout>
    <div class="register-container">
      <h2 class="h2-immersive">🚀 Rejoindre l'aventure</h2>
      <transition name="fade"><div>
        <div class="progress-container">
  <div class="progress-bar" :style="{ width: progressPercentage }"></div>
</div>

      <form @submit.prevent="submitForm" class="card p-4 shadow">
        <!-- Adresse e-mail -->
        <div class="mb-3">
          <label class="form-label">Adresse e-mail</label>
          <input v-model="email" ref="emailField" @keyup.enter="$refs.prenomField.focus()" type="email" class="form-control" :class="{ 'shake': emailError }" required autocomplete="email" />


          <small class="text-danger" v-if="emailError">{{ emailError }}</small>

        </div>

        <!-- Prénom -->
        <div class="mb-3">
          <label class="form-label">Prénom</label>
          <input v-model="prenom" ref="prenomField" @keyup.enter="$refs.passwordField.focus()" type="text" class="form-control" required />
        </div>

   <!-- Code d'accès -->
<div class="mb-3 password-container">
  <label class="form-label">Code d'accès</label>
  <div class="password-wrapper">
    <input 
      v-model="codeAcces" 
      ref="passwordField" @keyup.enter="$refs.confirmPasswordField.focus()"
      :type="showPassword ? 'text' : 'password'"
      class="form-control" 
      :class="{ 'shake': passwordError }"
      required 
      @input="validatePassword" 
    />
    <span class="toggle-password" @click="showPassword = !showPassword">
      <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
    </span>
  </div>
  <small class="text-danger" v-if="passwordError">{{ passwordError }}</small>
 
</div>
 <!-- Indicateur de force du mot de passe -->
<div v-if="codeAcces" class="password-strength">
  <div class="strength-bar" :class="passwordStrengthClass"></div>
  <small>{{ passwordStrengthText }}</small>
</div>
<!-- Confirmation du Code d'accès -->
<div class="mb-3 password-container">
  <label class="form-label">Confirmer le code d'accès</label>
  <div class="password-wrapper">
    <input 
      v-model="confirmCodeAcces" 
      :class="{ 'shake': confirmPasswordError }"
      :type="showConfirmPassword ? 'text' : 'password'"
      class="form-control" 
      required 
    />
    <span class="toggle-password" @click="showConfirmPassword = !showConfirmPassword">
      <i :class="showConfirmPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
    </span>
    <span v-if="confirmCodeAcces" class="match-indicator">
      <i :class="passwordsMatch ? 'fas fa-check-circle text-success' : 'fas fa-times-circle text-danger'"></i>
    </span>
  </div>
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
<button type="submit" class="btn btn-primary w-100" :disabled="isSubmitDisabled || isLoading">
  <span v-if="isLoading">
    <i class="fas fa-spinner fa-spin"></i> Inscription en cours...
  </span>
  <span v-else>S'inscrire</span>
</button>


<!-- Message de confirmation -->
<div v-if="message" class="success-message">
  ✅ {{ message }}
</div>
<!-- Message d'erreur -->
<div v-if="errorMessage" class="error-message">
  ❌ {{ errorMessage }}
</div>

      </form></div>
      </transition>
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
      email: localStorage.getItem("savedEmail") || "",
      emailError: "",
    prenom: localStorage.getItem("savedPrenom") || "",
    codeAcces: "",
      confirmCodeAcces: "",
      cguAccepted: false,
      errorMessage: "", // ✅ Ajoute cette ligne
      message: "",
      passwordError: "",
      confirmPasswordError: "",
      isLoading: false, // Ajout du statut de chargement
      progress: 0, // Ajout pour la progression de la barre
      showPassword: false, // 🔥 Gère l'affichage du mot de passe
      showConfirmPassword: false, // 🔥 Gère l'affichage de la confirmation
    };
  },
  watch: {
  email(newValue) {
    localStorage.setItem("savedEmail", newValue);
  },
  prenom(newValue) {
    localStorage.setItem("savedPrenom", newValue);
  }
},
  computed: {
    passwordsMatch() {
    return this.codeAcces && this.confirmCodeAcces && this.codeAcces === this.confirmCodeAcces;
  },
  progressPercentage() {
    let progress = 0;
    if (this.email) progress += 25;
    if (this.prenom) progress += 25;
    if (this.codeAcces.length >= 8) progress += 25;
    if (this.passwordsMatch) progress += 25;
    return `${progress}%`;
  },
    isSubmitDisabled() {
      return !!this.passwordError || !!this.confirmPasswordError || !this.cguAccepted;
    },
    passwordStrengthClass() {
    if (this.codeAcces.length < 8) return "weak";
    if (/[A-Z]/.test(this.codeAcces) && /\d/.test(this.codeAcces) && /[@$!%*?&]/.test(this.codeAcces)) {
      return "strong";
    }
    return "medium";
  },
  passwordStrengthText() {
    return this.passwordStrengthClass === "weak" ? "Faible" :
           this.passwordStrengthClass === "medium" ? "Moyen" :
           "Fort";
  },
  },
  methods: {
    validatePasswordMatch() {
    this.confirmPasswordError = this.passwordsMatch ? "" : "Les mots de passe ne correspondent pas.";
  },
    validatePassword() {
      const strongPasswordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!strongPasswordRegex.test(this.codeAcces)) {
        this.passwordError = "Le mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial.";
      } else {
        this.passwordError = "";
      }
    },
    validateEmail() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    this.emailError = emailRegex.test(this.email) ? "" : "Adresse e-mail invalide.";
    
    if (this.emailError) {
      this.$nextTick(() => this.$refs.emailField.focus());
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
      this.progress = 100; // Termine la barre de progression
      setTimeout(() => {
        this.isLoading = false;
        this.progress = 0; // Réinitialisation après la fin
      }, 500); // Petite pause avant de cacher la barre
    }}
,
  },
};
</script>

<style scoped>


.progress-container {
  width: 100%;
  background: #eee;
  border-radius: 5px;
  overflow: hidden;
  height: 8px;
  margin-bottom: 15px;
}
.progress-bar {
  height: 100%;
  background: #cace00;
  transition: width 0.5s ease-in-out;
}

.fade-enter-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.fade-enter {
  opacity: 0;
  transform: translateY(-10px);
}

@keyframes fadeIn {
  0% { opacity: 0; transform: scale(0.95); }
  100% { opacity: 1; transform: scale(1); }
}
.valid-feedback {
  animation: fadeIn 0.3s ease-in-out;
}

.match-indicator {
  position: absolute;
  right: 40px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.2rem;
}
.text-success {
  color: #28a745 !important; /* Vert */
}
.text-danger {
  color: #dc3545 !important; /* Rouge */
}

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
/* 🔥 Stylisation du message de succès */
.success-message {
  background-color: #28a745; /* Vert succès */
  color: white;
  padding: 12px;
  border-radius: 8px;
  font-weight: bold;
  text-align: center;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
  animation: fadeIn 0.8s ease-in-out, bounce 1s infinite alternate;
}
.password-strength {
  margin-top: 5px;
}
.shake {
  animation: shake 0.3s ease-in-out;
}

@keyframes shake {
  0% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  50% { transform: translateX(5px); }
  75% { transform: translateX(-5px); }
  100% { transform: translateX(0); }
}

.strength-bar {
  height: 5px;
  border-radius: 3px;
  transition: width 0.3s ease-in-out, background 0.3s ease-in-out;
}

/* Couleurs selon la force */
.weak { width: 33%; background: red; }
.medium { width: 66%; background: orange; }
.strong { width: 100%; background: green; }

/* 🔥 Stylisation du message d'erreur */
.error-message {
  background-color: #dc3545; /* Rouge erreur */
  color: white;
  padding: 12px;
  border-radius: 8px;
  font-weight: bold;
  text-align: center;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
  animation: fadeIn 0.8s ease-in-out;
}

/* ✨ Animation d'apparition */
@keyframes fadeIn {
  0% { opacity: 0; transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1); }
}

/* 🎉 Effet rebond doux */
@keyframes bounce {
  0% { transform: translateY(0); }
  100% { transform: translateY(-3px); }
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
  height: 15px;
  background-color: rgb(255, 255, 255); /* Couleur de fond légère */
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 10px;
}

/* Barre de chargement animée */
.loading-bar {
  width: 0%;
  height: 100%;
  background-color: #ff1e00; /* Couleur principale */
  transition: width 4s ease-in-out; /* Remplissage fluide */
  animation: progressBar 4s linear forwards;
}

/* Animation qui fait avancer la barre */
@keyframes progressBar {
  0% { width: 0%; }
  100% { width: 100%; }
}

.password-container {
  position: relative;
}

.password-wrapper {
  position: relative;
  width: 100%;
}

.toggle-password {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  font-size: 0.8rem;
  color: #202020;
  transition: color 0.3s ease;
}

.toggle-password:hover {
  color: #ff5e00;
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
  background: #ff0000;
  animation: pulse 1s infinite alternate;
}
/* Effet pulsant */
@keyframes pulse {
  0% { transform: scale(1); }
  100% { transform: scale(1.05); }
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
@media (max-width: 768px) {
  .register-container {
    padding: 12px;
  }
  input {
    font-size: 1rem;
    padding: 0px;
  }
  .btn-primary {
    font-size: 1rem;
    padding: 10px;
  }
}
</style>
