<template>
  <Layout>
    <div v-if="!authCheckInProgress" class="container d-flex justify-content-center align-items-center mt-5">
      <div class="row justify-content-center w-200">
        <div class="w-100 mx-auto">
          <div class="card shadow p-5">
       <h2 class="h2-immersive">🚀 Se connecter</h2>


       <form v-if="!loading && !isLoggedIn" @submit.prevent="login">

              <div class="mb-3">
                <label for="email" class="form-label">Adresse e-mail</label>
                <input 
  v-model="email" 
  type="email" 
  id="email"
  name="email" 
  class="form-control" 
  required 
  autocomplete="off"
  spellcheck="false"
  pattern="^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
  title="Veuillez entrer une adresse e-mail valide">


              </div><p v-if="email && !isValidEmail(email)" class="text-danger">
  ⚠️ Adresse e-mail invalide !
</p>

              <div class="mb-3">
                <label for="password" class="form-label">Mot de passe</label>
                <input 
                  v-model="password" 
                  type="password" 
                  id="password" 
                  name="password"
                  class="form-control" 
                  required 
                  autocomplete="new-password"
                  spellcheck="false">
              </div>

              <input type="password"   name="password2"
              style="display:none" autocomplete="new-password">

              <button type="submit" :disabled="loading || !isValidEmail(email)" class="btn btn-primary w-100">

                <span v-if="!loading">GO !</span>
                <span v-else>Connexion en cours...</span>
              </button>
              <div class="text-center mt-3">
  <router-link to="/forgot-password" class="forgot-password-link">
    J'ai oublié mon mot de passe
  </router-link>
</div>

            </form>

            <!-- Barre de chargement animée avec progression dynamique -->
            <div v-if="loading" class="loading-container mt-3">
              <div class="loading-bar" :style="{ width: progress + '%' }"></div>
            </div>

            <div v-if="message" class="alert mt-3" :class="messageType">{{ message }}</div>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>
c







<style scoped>
.container
{text-align:center;}
.h2-immersive {
  font-weight: bold;
    animation: fadeIn 1.2s ease-in-out;
   /* Empêche le retour à la ligne */
  text-transform: uppercase; /* Force les majuscules */
  white-space: nowrap; /* Empêche le retour à la ligne */

  text-align: center;
  font-size: 1rem;
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

.loading-container {
  width: 100%;
  height: 6px;
  background-color: rgb(0, 0, 0);
  border-radius: 3px;
  border: 2px solid #1b1b1b; /* Couleur du contour */
  overflow: hidden;
  position: relative;
}

.loading-bar {
  height: 100%;
  background: linear-gradient(90deg, #ff5100, #ff5e00);
  transition: width 0.4s ease-in-out;
  border-radius: 3px;
  position: relative;
}

.loading-bar::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 15%;
  height: 100%;
  background: rgba(255, 255, 255, 0.3);
  filter: blur(3px);
  opacity: 0.8;
  animation: shine 1.5s ease-in-out;
}

@keyframes shine {
  0% {
    left: -15%;
  }
  100% {
    left: 100%;
  }
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
  background: linear-gradient(135deg, #ff8c00, #ff5e00);
  border: none;
  font-weight: bold;
  padding: 10px 15px;
  border-radius: 6px;
  font-size: 1rem;
  text-transform: uppercase;
  transition: all 0.3s ease-in-out;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #ff5e00, #ff8c00);
  transform: scale(1.05);
}

.btn-primary:active {
  transform: scale(0.98);
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
