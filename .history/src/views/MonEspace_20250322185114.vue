<template>
  <Layout>
    <div v-if="showModal" class="video-modal" @click="closeModal">
    <div class="modal-content">
      <span class="close-btn" @click="closeModal">
  <i class="bi bi-x-lg"></i>
</span>
      <video ref="promoVideo" controls autoplay class="promo-video" @play="markVideoAsWatched">
  <source src="https://www.sunbassschool.com/wp-content/uploads/2023/11/promo-cours-en-visio.mp4" type="video/mp4">
  Ton navigateur ne supporte pas la vidéo.
</video>

      <p>🚀 Prêt à progresser ? Réserve ton cours dès maintenant !</p>
      <button @click="openSignupPage" class="cta-button">🔥 Réserve ton cours</button>
    </div>
</div>
    <div class="d-flex justify-content-center w-100 mt-0">



      <!-- 📌 Conteneur principal -->
      <div class="row justify-content-center">
        <div class="col-lg-12 col-md-10 w-100">
          <div class="card glass-card p-4 text-center animated-card">

            <!-- 🚀 Loader (pendant le chargement des données utilisateur) -->
            <div v-if="loading" class="loading-content">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Chargement...</span>
              </div>
              <p class="mt-2 text-muted">✨ Patience, nous préparons ton espace... 🚀</p>
            </div>

            <!-- ❌ Message d'erreur -->
            <div v-else-if="error" class="alert alert-danger">
              <strong>❌ Oups !</strong> {{ error }}
            </div>

            <!-- ✅ Contenu affiché une fois chargé -->
            <div v-else class="info-section">
              
              <!-- 🎯 Bloc du prochain objectif -->
              <div class="info-box goal-box text-center" :class="{ 'shake': isSaving, 'pulse': savedAnimation, 'flash': savedAnimation }">


                <input 
  v-if="isEditing" 
  v-model="user.objectif" 
  class="form-control form-control-sm w-100" 
  @keyup.enter="updateObjectif" 
  @blur="updateObjectif"
/>



  <div v-else class="d-flex align-items-center justify-content-between w-100">
    <span class="badge bg-warning text-dark fs-5 text-wrap flex-grow-1 text-center">
  💪 <span class="text-break fw-bold lh-sm">
    {{ console.log("🖥️ Objectif affiché dans le template :", user.objectif) || user.objectif || "🎯 Aucun objectif défini !" }}

</span>

</span>

  <span class="editable" @click="editObjectif" title="Modifier l'objectif"> ✏️ </span>

</div>

<button v-if="isEditing" @click="saveObjectif" class="btn btn-link p-0 text-success">
  💾
</button>
<!-- Loader affiché UNIQUEMENT si c'est le premier chargement sans cache -->
<div v-if="loading" class="loading-container">
  <div class="spinner-border text-primary" role="status">
    <span class="visually-hidden">Chargement...</span>
  </div>
  <p class="mt-2 text-muted">✨ Patience, nous préparons ton espace... 🚀</p>
</div>
              </div>

    <!-- 📂 Ressources -->
<div class="info-box resource-box">
  <hr class="my-1 resource-separator">

<!-- 🔄 Loader affiché pendant le chargement -->
<div v-if="isLoadingResources" class="loading-container">
  <!-- ✅ Le spinner tourne -->
  <div class="spinner-border text-primary spinner-resources" role="status"></div>
  
  <!-- ✅ Le texte reste fixe -->
  <p class="mt-2 text-light">Chargement des ressources...</p> 
</div>


<!-- 📂 Affichage des liens UNIQUEMENT s'ils existent -->
<ul v-else class="list-group list-unstyled">
  
  <!-- 📂 Google Drive -->
  <li class="resource-item">
    <template v-if="user.espace_google_drive">
      <a :href="user.espace_google_drive" target="_blank">📂 Mon classeur de cours</a>
    </template>
    <template v-else>
      <!-- 🔥 Message d'inscription si le lien n'existe pas -->
      <a 
        href="https://www.sunbassschool.com/step/inscription-aux-cours-en-visio/#checkout" 
        class="text-muted text-decoration-none"
        target="_blank"
      >
        📂 Mon espace d'apprentissage <strong>(accès réservé)</strong>.
        <br>
        <span class="btn btn-primary btn-sm mt-2">🔗 S'inscrire maintenant</span>
      </a>
    </template>
  </li>

  <!-- 🎵 Playlist YouTube -->
  <li class="resource-item">
    <template v-if="user.playlist_youtube">
      <a :href="user.playlist_youtube" target="_blank">🎵 Mes vidéos</a>
    </template>
    <template v-else>
      <!-- 🔥 Message d'inscription si le lien n'existe pas -->
      <a 
        href="https://www.sunbassschool.com/step/inscription-aux-cours-en-visio/#checkout" 
        class="text-muted text-decoration-none"
        target="_blank"
      >
        🎵 Mon espace vidéo <strong>(accès réservé)</strong>.
        <br>
        <span class="btn btn-primary btn-sm mt-2">🔗 S'inscrire maintenant</span>
      </a>
    </template>
  </li>

</ul>

</div>


              <!-- 👤 Informations personnelles -->
              <div class="info-box profile-box">
                <button class="btn btn-primary w-100 d-flex align-items-center justify-content-center py-3 fw-bold" @click="showInfos = true">
                  <span class="fs-4">👤</span> <span class="ms-2">Infos personnelles</span>
                </button>
              </div>

              <!-- 📜 Modale Infos personnelles -->
              <div v-if="showInfos" class="overlay" @click="showInfos = false">
                <div class="modal-content" @click.stop>
                  <button class="close-btn" @click="showInfos = false"> <i class="bi bi-x-lg"></i></button>
                  <h5 class="minimal-title">👤 Infos personnelles</h5>
                  <ul class="list-unstyled">
                    
                    <!-- 📧 Email -->
                    <li><strong>Email : </strong> {{ user.email }}</li>

                    <!-- 📞 Téléphone -->
                    <li class="py-2">
                      <strong>Téléphone : </strong>
                      <span v-if="isEditingInfo !== 'telephone'" @click="editField('telephone')" class="editable text-primary">
                        {{ user.telephone }}
                        <i class="bi bi-pencil ms-2 text-muted"></i> 
                      </span>
                      <input 
                        v-else
                        v-model="user.telephone" 
                        type="text" 
                        class="form-control form-control-sm d-inline-block w-auto"
                        @blur="updateInfosPerso"
                        @keyup.enter="updateInfosPerso"
                        ref="telephoneInput"
                      >
                    </li>
                    <li class="py-2">
                      <strong>Objectif : </strong>
                      <span v-if="isEditingInfo !== 'objectif'" @click="editField('objectif')" class="editable text-primary">
                        {{ user.objectif }}
                        <i class="bi bi-pencil ms-2 text-muted"></i> 
                      </span>
                      <input 
  ref="objectifInput"
  v-show="isEditingInfo === 'objectif'" 
  v-model="user.objectif" 
  class="form-control form-control-sm input-objectif" 
  @keyup.enter="updateObjectif"
  @blur="updateUserData"
/>


                    </li>
                    <!-- Autres informations -->
                    <li><strong>Cursus : </strong> {{ user.cursus }}</li>
                    <li><strong>Trimestre : </strong> {{ user.trimestre || "Non défini" }}</li>
                    <li><strong>Statut : </strong> {{ user.statut }}</li>
                     <div class="d-flex justify-content-center">
  <router-link to="/forgot-password" class="forgot-password-link">
    Modifier mon mot de passe
  </router-link>
</div>

                  </ul>
                </div>
              </div>

            </div> <!-- Fin du contenu chargé -->
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>



c







<style scoped>
input {
  pointer-events: auto !important;
  z-index: 9999 !important;
}
/* 🌟 Effet de flash rapide */
@keyframes flash {
  0% { background-color: rgba(255, 255, 255, 0.1); }
  50% { background-color: rgba(255, 255, 255, 0.4); }
  100% { background-color: rgba(255, 255, 255, 0.1); }
}

.flash {
  animation: flash 0.4s ease-in-out;
}

.row {
  max-width: 700px; /* Ajuste la largeur max */
  width: 100%;
}

/* ✅ Forcer la couleur du texte en noir */
.info-section,
.resource-box,
.resource-item a {
  color: black !important;
}

/* ✅ S'assurer que le texte des liens reste noir */
.resource-item a {
  color: black !important;
}

.resource-item a:hover {
  background: rgb(220, 220, 220) !important;
  color: black !important;
}


/* ✅ Indique que c'est modifiable */
.editable {
  position: relative;
  z-index: 1; /* Juste assez pour être au-dessus */
  color:#ddd;
}
.input-objectif {
  max-width: 300px; /* Ajuste selon ton besoin */
  width: 100%; /* S'adapte à l'espace disponible */
  display: block;
  margin: 0 auto; /* Centre l'input */
  padding: 5px;
}

/* 🎭 Squelette effet loading */
/* 🎭 Squelette effet loading */
/* 🎭 Conteneur de la barre de chargement */

/* 🎭 Conteneur de la barre de chargement */
.loading-bar-container {
  width: 100%;
  height: 8px; /* 🔥 Plus visible */
  background: #2d2d2d; /* Fond plus sombre */
  border-radius: 4px;
  overflow: hidden;
  margin: 10px 0;
  position: relative;
}

/* 🔄 Barre de progression animée */
.loading-bar {
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, #ff0000, #ff5e00); /* Dégradé dynamique */
  animation: loadingAnimation 1.5s infinite ease-in-out;
  border-radius: 4px;
}

/* 🔄 Animation de remplissage fluide */
@keyframes loadingAnimation {
  0% { transform: translateX(-100%); }
  50% { transform: translateX(-50%); }
  100% { transform: translateX(100%); }
}





/* 🎯 Fond gris clair au survol */
.editable:hover {
  transform: scale(1.2); /* Petit effet zoom */
  background: rgba(255, 255, 255, 0.1); /* Optionnel : léger effet hover */
}
.editable-input {
  font-size: 3 rem;  /* Ajuste la taille pour qu'elle corresponde au texte normal */
  background: rgba(255, 255, 255, 0.15); /* Effet verre */
  border: 1px solid rgba(255, 255, 255, 0.2); /* Bordure subtile */
  color: white; /* Texte blanc pour rester lisible */
  padding: 8px 12px;
  border-radius: 8px; /* Arrondi pour un look doux */
  outline: none;
  box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.2); /* Ombre interne pour profondeur */
  transition: all 0.3s ease-in-out;
  width: 100%; /* S’adapte à l’espace dispo */
}

/* Effet focus */
.editable-input:focus {
  border-color: #ff8c00; /* Orange pour rester dans ton thème */
  box-shadow: 0px 0px 10px rgba(255, 140, 0, 0.5);
  background: rgba(255, 255, 255, 0.25);
}


/* 🔄 Animation légère quand on sauvegarde */
.shake {
  animation: shake 0.3s ease-in-out;
}

@keyframes shake {
  0% { transform: translateX(0); }
  20% { transform: translateX(-2px); }
  40% { transform: translateX(2px); }
  60% { transform: translateX(-2px); }
  80% { transform: translateX(2px); }
  100% { transform: translateX(0); }
}

/* ✅ Animation de validation (petite pulsation) */
/* ✅ Animation de validation (pulsation douce sans agrandir la largeur) */
.pulse {
  animation: pulse 0.6s ease-out;
}

@keyframes pulse {
  0% { box-shadow: 0 0 5px rgba(255, 140, 0, 0.5); }
  50% { box-shadow: 0 0 15px rgba(255, 140, 0, 0.8); }
  100% { box-shadow: 0 0 5px rgba(255, 140, 0, 0.5); }
}

/* 🎬 MODALE VIDÉO */
.video-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7); /* Fond semi-transparent */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(5px); /* Effet flou sur l’arrière-plan */
  animation: fadeIn 0.3s ease-in-out;
}

/* ✨ Effet d’apparition fluide */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 🎬 MODALE VIDÉO */
.video-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7); /* Fond semi-transparent */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(5px); /* Effet flou sur l’arrière-plan */
  animation: fadeIn 0.3s ease-in-out;
}

/* ✨ Effet d’apparition fluide */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 📌 Contenu de la modale */
.modal-content {
  position: relative;
  background: #1c1c1c; /* Fond plus élégant */
  padding: 20px;
  border-radius: 12px; /* Coins arrondis */
  max-width: 600px;
  width: 90%;
  text-align: center;
  box-shadow: 0px 10px 30px rgba(0, 0, 0, 0.5); /* Ombre plus profonde */
  color: white;
}

/* 🎬 Vidéo */
.promo-video {
  width: 100%;
  border-radius: 8px; /* Coins arrondis pour la vidéo */
}

/* ✨ Texte sous la vidéo */
.modal-content p {
  font-size: 1.1rem; /* Légèrement plus petit pour éviter l'effet "trop gros" */
  font-weight: normal; /* Plus naturel */
  margin-top: 10px;
  color: #000000; /* Gris clair élégant */
  line-height: 1.4; /* Améliore la lisibilité */
  text-align: center; /* Centre bien le texte */
}


/* ❌ Bouton de fermeture */
.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  font-size: 1.8rem; /* Taille plus grande */
  color: rgb(218, 98, 0)55, 255, 255);
  cursor: pointer;
  transition: transform 0.2s ease-in-out, color 0.3s;
}

.close-btn:hover {
  transform: scale(1.2) rotate(90deg); /* Rotation pour un effet dynamique */
  color: #ff8c00;
}

/* 🔥 Bouton CTA */
.cta-button {
  background: linear-gradient(135deg, #ff8c00, #ff5e00); /* Dégradé dynamique */
  color: white;
  font-size: 1.2rem;
  padding: 12px 20px;
  border-radius: 8px;
  margin-top: 15px;
  cursor: pointer;
  transition: all 0.3s ease-in-out;
  border: none;
  font-weight: bold;
  box-shadow: 0px 4px 10px rgba(255, 140, 0, 0.4);
}

.cta-button:hover {
  background: linear-gradient(135deg, #ff5e00, #ff8c00);
  transform: scale(1.05);
}


/* Écran de chargement */
.loading-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh; /* Pleine hauteur */
  width: 100%;
  position: fixed;
  top: 0;
  left: 0;
  background: white;
  z-index: 9999;
}


/* Champ de modification */
.edit-input {
  width: 100%;
  padding: 5px;
  font-size: 1rem;
  text-align: center;
  border: 1px solid #ccc;
  border-radius: 5px;
  outline: none;
}

/* Boutons */
.edit-btn, .save-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 5px 10px;
  margin-top: 5px;
  cursor: pointer;
  border-radius: 5px;
}

.edit-btn:hover, .save-btn:hover {
  background: #0056b3;
}

.row {
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
}



/* Container principal */
.espace-container {
  max-width: 1200px;
  width: 100%;        /* 📌 Prend toute la place possible */
  margin: 0 auto;     /* 📌 Centre la carte */
  
  padding: 30px;
  
  
  
}


html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow-x: hidden; /* Désactive le scroll horizontal si besoin */
}

/* Effet verre pour la carte principale */
/* 🌟 Style général des cartes */
.glass-card {
  background: rgba(24, 24, 24, 0.7); /* Noir semi-transparent */
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 94, 0, 0.2);
  box-shadow: 0px 6px 15px rgba(37, 23, 15, 0.15);
  border-radius: 12px;
  padding: 0px;
  margin-top:5%;
  color: white;
  transition: transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out;
  width: 100% !important; /* ✅ Prend toute la largeur disponible */
  max-width: 100vw !important; /* ✅ Empêche toute limitation */
  padding: 10px !important; /* ✅ Ajoute un peu de marge intérieure si nécessaire */
}

/* ✨ Effet au survol */
.glass-card:hover {
  transform: translateY(-3px);
  box-shadow: 0px 10px 20px rgba(48, 42, 39, 0.3);
}

/* 📌 Titres */
.glass-card h5 {
  font-size: 1.4rem;
  font-weight: bold;
  color: #ff8c00;
  text-align: center;
}

/* 📝 Texte général */
.glass-card p {
  font-size: 1rem;
  color: #ddd;
  text-align: center;
}

/* 📂 Ressources */
.resource-box {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 10px;
  text-align: center;
}

/* 📌 Liens des ressources */
.resource-item a {
  display: block;
  padding: 10px;
  color: white;
  background: rgba(255, 255, 255, 0.2);
  text-decoration: none;
  border-radius: 5px;
  margin-top: 10px;
  transition: background 0.3s, transform 0.2s;
}

.resource-item a:hover {
  background: rgba(255, 140, 0, 0.8);
  color: white;
  transform: translateY(-2px);
}


/* 🎯 Objectif */
.goal-box {
  width: 100%; /* 🔥 Assure qu'elle prend toute la largeur */
  max-width: 100%; /* Ajuste selon ton besoin */
  margin: 0 auto; /* Centre l'élément */
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1));
  color: white;
  font-weight: bold;
  text-align: center;
  padding: 10px;
  border-radius: 8px;
  transition: transform 0.2s ease-in-out;
}

/* 🎯 Effet au survol */
.goal-box:hover {
  transform: scale(1.05);
}

/* 📜 Bouton Infos personnelles */
.profile-box button {
  background: linear-gradient(135deg, #0c0c0c, #242424);
  border: none;
  color: white;
  font-size: 1rem;
  font-weight: bold;
  padding: 12px;
  border-radius: 8px;
  transition: all 0.3s;
}

.profile-box button:hover {
  background: linear-gradient(135deg, #ff5e00, #ff8c00);
  transform: scale(1.03);
}

/* 📜 Modale */
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  z-index: 10000 !important; /* 🔥 Assure que la modale est TOUJOURS au-dessus */
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 10px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0px 10px 30px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 10001 !important; /* 🔥 Doit être au-dessus de .overlay */
}


/* 📜 Bouton de fermeture */
.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: transparent;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
}

/* 🏷️ Infos personnelles */
.list-unstyled li {
  font-size: 1rem;
  color: #444;
  padding: 10px 0;
}

/* ✏️ Édition des infos */
.editable {
  cursor: pointer;
  color: #007bff;
  transition: color 0.3s;
}

.editable:hover {
  color: #0056b3;
}

/* 📂 Séparateur */
.resource-separator {
  border: none;
  height: 1px;
  background: rgba(255, 255, 255, 0.3);
  width: 100%;
  margin: 10px 0;
}

/* 📱 Responsive */
@media (max-width: 768px) {
  .glass-card {
    padding: 20px;
    margin-top:15px;
  }
}

/* Sections d'infos */
.info-section {
  display: flex;
  color:black;
  color:black;
  flex-direction: column;
  gap: 10px;
}
.glass-card

/* Boîtes d'informations */
.info-box {
  padding: 10px;
  border-radius: 5px;
  box-shadow: 0px 5px 15px rgba(0, 0, 0, 0.1);
  text-align: left;
}

.goal-box {
  
  color: black;
  font-weight: bold;
  text-align: center;
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.7);

  /* Centrage vertical et horizontal */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  /* Taille minimum pour un bon rendu */
  min-height: 50px;
  padding: 20px;
}

/* Conteneur de chargement */
.loading-container {
  position: fixed;  /* Rend le loader toujours visible */
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);  /* Centre parfaitement */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8); /* Fond légèrement opaque pour la visibilité */
  z-index: 1000; /* Assure que le loader passe au-dessus */
  border: none; /* ✅ Supprime toute bordure éventuelle */
  outline: none; /* ✅ Évite d'éventuels effets visuels */
  box-shadow: none; /* ✅ Supprime toute ombre éventuelle */
}

.spinner-border {
  width: 1.8rem; /* 📏 Légèrement plus grand */
  height: 1.8rem;
  border-width: 3px; /* ✅ Bordure plus épaisse pour plus de visibilité */
  color: #8B0000 !important; /* 🔴 Rouge sombre */
  
  /* Effet de glow */
  filter: drop-shadow(0px 0px 5px rgba(139, 0, 0, 0.7));

  /* ✅ Transition douce à l’apparition */
  opacity: 0;
  animation: fadeIn 0.3s ease-in-out forwards, spin 1s linear infinite;
}

/* 🔄 Animation de rotation fluide */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 🎬 Animation d’apparition */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}


/* Message de chargement */
.loading-container p {
  font-size: 1.1rem;
  font-weight: bold;
  color: #555;
  margin-top: 10px;
  text-align: center;
}

/* Boîtes d'informations */
.info-box {
  padding: 10px;
  border-radius: 5px;
  box-shadow: 0px 5px 15px rgba(0, 0, 0, 0.1);
  text-align: left;
}

/* Objectif */
.goal-box {
  background: linear-gradient(135deg, #3d1f0f, #732900); /* Rouge foncé élégant */
  color: #e0c9a6; /* Doré doux */
  font-weight: bold;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80px;
  padding: 15px;
  border-radius: 10px;
  border: 1px solid rgba(255, 140, 0, 0.4); /* Contour légèrement lumineux */
  box-shadow: 
    inset 0 0 10px rgba(0, 0, 0, 0.5), 
    0 2px 8px rgba(0, 0, 0, 0.3),
    0 0 15px rgba(255, 140, 0, 0.2); /* Glow discret */
  transition: all 0.3s ease-in-out;
  position: relative;
  overflow: hidden;
}

/* 🔥 Glow dynamique (pulsation légère) */
.goal-box::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 120%;
  height: 120%;
  background: radial-gradient(circle, rgba(255, 140, 0, 0.15), transparent);
  transform: translate(-50%, -50%);
  animation: glow-pulse 2.5s infinite alternate ease-in-out;
}

@keyframes glow-pulse {
  from {
    opacity: 0.5;
  }
  to {
    opacity: 1;
  }
}

/* 🎯 Texte stylisé */
.goal-box span {
  text-shadow: 
    0px 1px 2px rgba(65, 65, 65, 0.7),  /* Ombre portée subtile */
    0px -1px 1px rgba(255, 255, 255, 0.2); /* Légère lumière en haut */
  font-weight: 600; /* Légèrement plus épais pour plus de lisibilité */
  letter-spacing: 0.5px; /* Améliore la lisibilité */
}

/* 🏆 Icône d'objectif */
.goal-box::after {
  content: "🎸🎵"; /* Peut être remplacé par une icône SVG */
  font-size: 6rem;
  position: absolute;
  top: -10px;
  right: -10px;
  opacity: 0.3;
  transform: rotate(-20deg);
}


/* Ressources */
.resource-box {
  background: rgba(209, 209, 209, 0.9);
  padding: 15px;
  border-radius: 10px;
  text-align: center;
}
.resource-item {
  text-align: center; /* ✅ Centre le lien */
}
.resource-item a {
  display: block;
  padding: 10px;
  color: white;
  background: rgb(255, 255, 255);
  text-decoration: none;
  border-radius: 5px;
  margin-top: 10px;
  transition: all 0.3s;
}

.resource-item a:hover {
  background: rgba(0, 0, 0, 0.7);
  color: black;
  transform: translateY(-2px);
}

/* Profil */
.profile-box {
  background: #fff;
}
.resource-separator {
  border: none;
  height: 1px;
  background: radial-gradient(circle, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) 100%);
  width: 100%;
}



/* Responsive */
@media (max-width: 768px) {
  .glass-card {
    padding: 0px;
  }

  .info-box {
    padding: 8px;
  }
}
</style>
