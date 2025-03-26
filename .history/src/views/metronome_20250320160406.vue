<template>
  <Layout>
    <div class="metronome-container">
      
      <!-- Seconde card : Boutons de pulsation et de contrôle (Play/Pause) -->
      <div class="control-card">
        <div class="card-header">
          <div class="control-group">
            <label><span>{{ tempo }}</span> BPM</label>
            <div class="tempo-control">
              <button @click="decreaseTempo" class="tempo-arrow">
                &#8592; <!-- Flèche gauche -->
              </button>
              <input type="range" v-model="tempo" min="20" max="300" step="1">
              <button @click="increaseTempo" class="tempo-arrow">
                &#8594; <!-- Flèche droite -->
              </button>
            </div>
          </div>
        </div>
        <div class="card-body">
          <div class="control-buttons">
            <!-- Cercle de pulsation -->
            <div class="visualizer">
              <div 
                :class="{ beat: isBeating }" 
                :style="{ backgroundColor: currentBeat === 1 ? 'darkred' : 'white' }"
                id="beatCircle"
              >
                <span class="beat-number">{{ currentBeat }}</span> 
              </div>
            </div>

            <!-- Icônes de démarrer et arrêter avec SVG -->
            <div class="controls">
  <!-- Bouton PLAY toujours visible -->
  <button @click="startMetronome" class="control-icon">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z"/>
    </svg> <!-- Icône Play -->
  </button>
 
  <!-- Bouton STOP toujours visible -->
  <button @click="stopMetronome" class="control-icon stop-button">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <path d="M6 6h12v12H6z"/>
    </svg> <!-- Icône Stop -->
  </button>
</div>

            <div class="control-group">
              <select v-model="measure">
                <option v-for="num in [2, 3, 4, 5, 6, 7, 8]" :key="num" :value="num">
                  {{ num }}/4
                </option>
              </select>
            </div>
          </div>

          <!-- Affichage du timer -->
          <div class="timer">
  <p :style="{ color: timerColor }">{{ formattedTime }}</p>
  <button @click="resetTimer" class="reset-icon">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <path d="M12 4V1L8 5l4 4V7c4 0 7 3 7 7s-3 7-7 7-7-3-7-7h2a5 5 0 1 0 5-5z"/>
    </svg>
  </button>
          </div>
          <div class="slider-group">
  <label>🎵 Swing :</label>
  <label class="switch">
    <input type="checkbox" v-model="isSwingEnabled">
    <span class="slider"></span>
  </label>
</div>



        </div>
      </div>

      <!-- Première card : Contrôles du Métronome et Mixage des Volumes -->
      <div class="metronome-card">
        <div class="card-body">
          <div class="control-container">
            <!-- Colonne 1 : Contrôles Métronome -->
            <div class="control-column">
              <!-- Subdivisions avec des icônes sous forme de tableau -->
              <div class="control-group">
                <div class="subdivision-icons">
                  <div 
                    v-for="(sub, index) in subdivisions" 
                    :key="index" 
                    class="subdivision-icon"
                    :class="{ selected: subdivision === sub.value }"
                    @click="selectSubdivision(sub.value)"
                  >
                    <img :src="sub.icon" :alt="sub.label" />
                    <span>{{ sub.label }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Colonne 2 : Mixette -->
            <div class="mixing-column">
              <div class="slider-group">
                <label>Clic :</label>
                <input type="range" v-model="volumeStrong" min="0" max="1" step="0.01">
              </div>

              <div class="slider-group">
                <label>Pulsation : </label>
                <input type="range" v-model="volumeWeak" min="0" max="1" step="0.01">
              </div>

              <div class="slider-group">
                <label>Débit : </label>
                <input type="range" v-model="volumeSub" min="0" max="1" step="0.01">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script>
import Layout from "@/views/Layout.vue";

export default {
  components: { Layout },

  data() {
  return {
    tempo: 120,
    measure: 4,
    subdivision: 1,
    swingAmount: 0,
    isPlaying: false,
    elapsedTime: 0,
    audioContext: null,
    nextNoteTime: 0.0,
    currentBeat: 1,
    currentSubdivision: 0,
    isBeating: false,
    interval: null,
    soundBuffers: { strong: null, weak: null, sub: null },
    volumeStrong: localStorage.getItem("volumeStrong") || 1,
    volumeWeak: localStorage.getItem("volumeWeak") || 0.7,
    volumeSub: localStorage.getItem("volumeSub") || 0.5,
    timerColor: "white",
    timerInterval: null,

    // ✅ Ajout des subdivisions ici !
    subdivisions: [
      { value: 1, label: '', icon: './assets/icons/quarter-note.png' },
{ value: 2, label: '', icon: './assets/icons/eighth-note.png' },
{ value: 3, label: '', icon: './assets/icons/triplet.png' },
{ value: 4, label: '', icon: './assets/icons/sixteenth-note.png' }

      ]
  };
},

  computed: {
    formattedTime() {
      const minutes = Math.floor(this.elapsedTime / 60);
      const seconds = this.elapsedTime % 60;
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
  },

  methods: {
    initAudioContext() {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log("🔊 AudioContext initialisé !");
      }
    },

    async resumeAudioContext() {
      if (this.audioContext && this.audioContext.state === "suspended") {
        await this.audioContext.resume();
        console.log("🔊 AudioContext repris !");
      }
    },
    selectSubdivision(value) {
    this.subdivision = value;
  },
    async loadSounds() {
      const soundUrls = {
        strong: './assets/audio/strong-beat.wav',
        weak: './assets/audio/weak-beat.wav',
        sub: './assets/audio/subdivision.wav',
      };

      const soundPromises = Object.entries(soundUrls).map(async ([key, url]) => {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        this.soundBuffers[key] = await this.audioContext.decodeAudioData(arrayBuffer);
      });

      await Promise.all(soundPromises);
      console.log("🎵 Tous les sons sont chargés !");
    },

    async requestWakeLock() {
      if ("wakeLock" in navigator && document.visibilityState === "visible") {
        try {
          this.wakeLock = await navigator.wakeLock.request("screen");
          console.log("🔒 Wake Lock activé !");
        } catch (err) {
          console.error("❌ Impossible d'activer le Wake Lock :", err);
        }
      }
    },

    startMetronome() {
      if (this.isPlaying) return;

      this.initAudioContext();
      this.resumeAudioContext();
      this.isPlaying = true;
      sessionStorage.setItem("isPlaying", "true"); // ✅ Sauvegarde de l'état

      this.nextNoteTime = this.audioContext.currentTime;
      this.startTimer();
      this.scheduleNextBeat();
    },

    stopMetronome() {
      this.isPlaying = false;
      sessionStorage.setItem("isPlaying", "false"); // ✅ Sauvegarde de l'état
      this.nextNoteTime = 0;
      cancelAnimationFrame(this.interval);
      clearInterval(this.timerInterval);
      this.elapsedTime = 0;
    },

    scheduleNextBeat() {
  if (!this.isPlaying) return;

  const now = this.audioContext.currentTime;
  while (this.nextNoteTime < now + 0.1) {
    this.playClick();

    let beatInterval = 60.0 / this.tempo; // Temps entre chaque temps fort
    let subdivisionInterval = beatInterval / this.subdivision; // Temps entre subdivisions

    let swingOffset = 0;
    
    // 🔥 Appliquer le swing uniquement si subdivision = 2 (croches) ou 4 (double-croches)
    if (this.subdivision === 2 || this.subdivision === 4) {
      if (this.currentSubdivision % 2 === 1) {
        // Première croche → allongée (2/3 du temps normal)
        swingOffset = (this.swingAmount * subdivisionInterval) / 3;
      } else {
        // Deuxième croche → raccourcie (1/3 du temps normal)
        swingOffset = -(this.swingAmount * subdivisionInterval) / 3;
      }
    }

    // ✅ Appliquer le swing uniquement aux subdivisions
    this.nextNoteTime += subdivisionInterval + swingOffset;
  }

  this.interval = requestAnimationFrame(this.scheduleNextBeat);
}



,

    playClick() {
      this.currentSubdivision++;

      if (this.currentSubdivision > this.subdivision) {
        this.currentSubdivision = 1;
        this.currentBeat = (this.currentBeat % this.measure) + 1;
      }

      let soundBuffer;
      let volume;

      if (this.currentSubdivision === 1) {
        if (this.currentBeat === 1) {
          soundBuffer = this.soundBuffers.strong;
          volume = this.volumeStrong;
        } else {
          soundBuffer = this.soundBuffers.weak;
          volume = this.volumeWeak;
        }
      } else {
        soundBuffer = this.soundBuffers.sub;
        volume = this.volumeSub;
      }

      if (soundBuffer) this.playSound(soundBuffer, this.nextNoteTime, volume);

      this.isBeating = true;
      setTimeout(() => this.isBeating = false, 100);
    },

    playSound(buffer, time, volumeLevel) {
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = volumeLevel;

      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      source.start(time);
    },

    startTimer() {
      this.elapsedTime = 0;
      this.timerInterval = setInterval(() => {
        this.elapsedTime++;
      }, 1000);
    },

    increaseTempo() {
      if (this.tempo < 300) {
        this.tempo++;
      }
    },

    decreaseTempo() {
      if (this.tempo > 20) {
        this.tempo--;
      }
    },

    resetTimer() {
      this.elapsedTime = 0;
      this.timerColor = "white";
    },
  },

  watch: {
    volumeStrong(val) { localStorage.setItem("volumeStrong", val); },
    volumeWeak(val) { localStorage.setItem("volumeWeak", val); },
    volumeSub(val) { localStorage.setItem("volumeSub", val); },

    isPlaying(newVal) {
      sessionStorage.setItem("isPlaying", newVal ? "true" : "false");
      this.$forceUpdate();
    }
  },

  async mounted() {
  this.initAudioContext();
  await this.loadSounds();

  document.addEventListener("visibilitychange", this.requestWakeLock);
  this.requestWakeLock();

},
beforeUnmount() {
    this.stopMetronome(); // 🔥 Arrêter le métronome AVANT de quitter la page
  }

};
</script>


<style scoped>
.reset-icon {
  background: none;
  border: none;
  font-size: 20px;
  color: #f0f0f0;
  cursor: pointer;
  padding: 10px;
  margin-left: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%; /* Ajouter des bords arrondis pour un effet circulaire */
  transition: all 0.3s ease; /* Transition fluide pour l'animation */
}

.reset-icon svg {
  width: 20px;
  height: 20px;
  fill: #fa0000;
  transition: transform 0.3s ease, fill 0.3s ease; /* Transition pour le zoom et la couleur */
}

/* Effet de survol */
.reset-icon:hover {
  
  transform: scale(1.1); /* Légère animation de zoom */
}

.reset-icon:hover svg {
  fill: #a72828; /* Changer la couleur de l'icône au survol (ex: vert) */
  transform: scale(1); /* Légèrement plus grand au survol */
}

.reset-icon:active {
  transform: scale(0.95); /* Effet d'agrandissement lors du clic */
}

/* Stylisation des faders (sliders) de la mixette */
.slider-group input[type="range"] {
width: 120px; /* Fixe la largeur des sliders */
margin-top: 10px;
-webkit-appearance: none;
appearance: none;
background: #858585; /* Fond sombre pour le slider */
height: 5px; /* Hauteur du slider */
border-radius: 5px;
transition: background 0.3s ease; /* Ajoute une transition douce */
}

.slider-group input[type="range"]:focus {
background: #ffffff; /* Couleur du slider lors du focus */
}

.slider-group input[type="range"]::-webkit-slider-thumb {
-webkit-appearance: none;
appearance: none;
background: #a72c28; /* Couleur du curseur */
border-radius: 0%;
width: 5px;
height: 15px;
cursor: pointer; /* Change le curseur pour indiquer l'interaction */
box-shadow: 0 0 5px rgba(0, 0, 0, 0.2); /* Ombre autour du curseur */
}

.slider-group input[type="range"]::-moz-range-thumb {
background: #a72c28; /* Couleur du curseur pour Firefox */
border-radius: 0%;
width: 5px;
height: 15px;
cursor: pointer;
box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
}
.metronome-container {
text-align: center;
padding: 20px;
color: #fff;
}

.title {
font-size: 1.8rem;
color: #f0f0f0;
margin-bottom: 15px;
}

/* Première card : Contrôles du Métronome et Mixage des Volumes */
.metronome-card {
background: #333;
border-radius: 8px;
margin: 15px 0;
padding: 15px;
box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.card-header h2 {
font-size: 1.3rem;
color: #f0f0f0;
margin-bottom: 10px;
}

.card-body {
display: flex;
justify-content: center; /* Centrer les éléments horizontalement */
gap: 20px; /* Espacement entre les deux colonnes */
}

.control-container {
display: flex;
justify-content: center; /* Centrer horizontalement les éléments */
gap: 20px; /* Espacement entre les deux colonnes */

flex-wrap: wrap; /* Permet aux colonnes de se réorganiser si l'espace est trop petit */
margin: 0 auto; /* Assure que l'ensemble est centré dans la page */
}

/* Colonne de subdivisions */
.control-column {
display: flex;
flex-direction: column;
justify-content: center; /* Centrer les éléments verticalement */
align-items: center; /* Centrer les éléments horizontalement */
gap: 15px;
width: 45%; /* Largeur réduite pour éviter un espace au milieu */

}

/* Colonne de mixette */
.mixing-column {
display: flex;
flex-direction: column;

justify-content: center; /* Centrer les éléments verticalement */
align-items: center; /* Centrer les éléments horizontalement */
gap: 15px;
width: 45%; /* Largeur réduite pour éviter un espace au milieu */

}
/* Seconde card : Boutons de pulsation et de contrôle */
.control-card {
background: #333;
border-radius: 8px;
margin: 15px 0;
padding: 15px;
box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.card-header h2 {
font-size: 1.3rem;
color: #f0f0f0;
margin-bottom: 10px;
}

.card-body {
display: flex;
flex-direction: column;
align-items: center;
gap: 20px;
}

.control-buttons {
display: flex;
align-items: center; /* Aligner l'icône et le BPM verticalement */
justify-content: center; /* Centrer les éléments horizontalement */
gap: 15%; /* Augmenter l'espacement entre les éléments (ajuster la valeur) */
}
#beatCircle {
    margin-top:8%;
   
width: 80px; /* Ajuste la taille ici si nécessaire */
height: 80px; /* Ajuste la taille ici si nécessaire */
border-radius: 50%;
display: flex;
align-items: center;
justify-content: center;
font-size: 40px; /* Taille du texte à l'intérieur du cercle */
font-weight: bold;
font-family: 'Impact', sans-serif; /* Police Impact */
color: black;
transition: background-color 0.1s ease;
}
.control-group span {
font-size: 2rem; /* Ajuste la taille du BPM ici */
font-weight: bold; /* Optionnel, pour rendre le texte plus épais */
margin: 0; /* Enlever les marges */
text-align: center; /* Centrer le texte dans le span */
}
/* Cercle de pulsation */


/* Boutons play/pause */
.control-icon {
background: none;
border: none;
font-size: 30px; /* Ajuste la taille de l'icône Play/Pause ici */
color: #f0f0f0;
cursor: pointer;
padding: 10px; /* Ajuste le padding pour plus d'espace autour de l'icône */
margin: 0;
display: inline-flex;
align-items: center;
justify-content: center;
}

/* Flèches à côté du fader */
.tempo-control {
display: flex;
align-items: center;
justify-content: center;
gap: 10px;
width: 100%; /* Utiliser toute la largeur disponible */
}
.control-group {
display: flex;
justify-content: center;  /* Centrer horizontalement */
align-items: center;      /* Centrer verticalement */
gap: 10px;                /* Espacement entre les éléments */
width: 100%;              /* Prendre toute la largeur disponible */
}
.tempo-arrow {
background: none;
border: none;
font-size: 20px;
color: #f0f0f0;
cursor: pointer;
padding: 5px;
}

/* Icônes des subdivisions avec tableau */
.subdivision-icons {
display: grid;
grid-template-columns: repeat(2, 1fr); /* 2 colonnes */
gap: 10px;
justify-items: center;
background-color:#4e4e4e;
padding: 5px;
}

.subdivision-icon {
display: flex;
flex-direction: column;
align-items: center;
cursor: pointer;
padding: 5px;
border: 1px solid black;
}

.subdivision-icon.selected {
border: 2px solid #a74c28;
border-radius: 5px;
}

.subdivision-icon img {
width: 40px;
height: 40px;
}

.subdivision-icon span {
margin-top: 5px;
font-size: 12px;
color: #fff;
}

/* Centrer les éléments dans le control-group */


/* Styliser les entrées (input et select) */
/* Stylisation du select (Mesure) */
.control-group select {
padding: 10px 15px; /* Ajuster la taille du champ */
background-color: #555; /* Fond sombre */
color: #fff; /* Texte blanc */
border-radius: 5px; /* Coins arrondis */
border: 1px solid #777; /* Bordure subtile */
font-size: 16px; /* Taille de la police */
width: 80px; /* Largeur fixe du select pour les mesures */
appearance: none; /* Supprimer la flèche native par défaut */
-webkit-appearance: none;
-moz-appearance: none;
cursor: pointer; /* Curseur de type "pointer" pour indiquer que c'est cliquable */
outline: none; /* Enlever l'outline au focus */
text-align: center; /* Centrer le texte dans le select */
transition: background-color 0.3s ease, border-color 0.3s ease; /* Ajouter une transition douce pour le focus */
}
.tempo-control input[type="range"] {
width: 100%; /* Rendre le range aussi large que le conteneur */
}
.control-group .tempo-control,
.control-group label {
width: 50%; /* Séparer les éléments en deux parties égales */
}
.control-group select:focus {
border-color: #a74c28; /* Changer la couleur de la bordure au focus */
background-color: #444; /* Changer légèrement la couleur de fond au focus */
}
/* Centrer le texte à l'intérieur du menu déroulant */
.control-group select option {
text-align: center; /* Centrer le texte dans les options */
}
/* Ajouter une flèche personnalisée */
.control-group select::after {
content: "\2193"; /* Code Unicode pour une flèche vers le bas */
font-size: 20px;
color: #a74c28;
position: absolute;
right: 10px;
top: 50%;
transform: translateY(-50%);
pointer-events: none; /* Assurer que la flèche n'interfère pas avec l'interaction */
}

/* Enlever la flèche pour les navigateurs IE */
.control-group select::-ms-expand {
display: none;
}
/* Cibler uniquement le BPM (texte dans le span) */
.control-group span {
font-size: 2rem;  /* Ajuste la taille ici */
font-weight: bold; /* Optionnel, pour rendre le texte plus épais */
}
.timer p {
  font-size: 2rem;  /* Augmenter la taille pour la rendre plus visible */
  color: #ffffff;  /* Couleur verte (pour un effet sportif et dynamique) */
  font-weight: bold;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.5), 0 0 20px rgba(255, 255, 255, 0.5);  /* Ombres lumineuses pour donner un effet dynamique */
  animation: timerPulse 1s infinite;  /* Ajouter une animation pour faire pulser le texte */
  margin-top: -10%;
  margin-bottom:-10%;
}

@keyframes timerPulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.02);  /* Légère augmentation pour l'effet "pulse" */
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
