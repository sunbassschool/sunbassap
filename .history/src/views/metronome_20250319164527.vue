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
              <input type="range" v-model="tempo" min="40" max="240" step="1">
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
              <button @click="startMetronome" v-if="!isPlaying" class="control-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg> <!-- Icône Play -->
              </button>
              <button @click="stopMetronome" v-if="isPlaying" class="control-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                  <path d="M6 6h12v12H6z"/>
                </svg> <!-- Icône Pause -->
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
            <p>{{ formattedTime }}</p>
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
      subdivisions: [
        { value: 1, label: '', icon: '/assets/icons/quarter-note.png' },  
        { value: 2, label: '', icon: '/assets/icons/eighth-note.png' },   
        { value: 3, label: '', icon: '/assets/icons/triplet.png' },      
        { value: 4, label: '', icon: '/assets/icons/sixteenth-note.png' } 
      ],
      elapsedTime: 0,   // Nouveau timer pour suivre le temps
      timerColor: "blue",
      timerInterval: null  // Pour gérer le timer
      
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
    async loadSounds() {
      if (!this.audioContext) this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.soundBuffers.strong = await this.loadSound('/audio/strong-beat.wav');
      this.soundBuffers.weak = await this.loadSound('/audio/weak-beat.wav');
      this.soundBuffers.sub = await this.loadSound('/audio/subdivision.wav');
    },
    async loadSound(url) {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      return this.audioContext.decodeAudioData(arrayBuffer);
    },
    startMetronome() {
  if (!this.isPlaying) {
    this.isPlaying = true;
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.nextNoteTime = this.audioContext.currentTime;
    this.currentBeat = 1;
    this.currentSubdivision = 0;
    this.startTime = Date.now() - this.elapsedTime * 1000;  // Reprendre à partir du temps écoulé
    this.scheduleNextBeat();
    this.timerInterval = setInterval(this.updateTimer, 100); // Mise à jour du timer toutes les 100ms
  }
},
stopMetronome() {
  this.isPlaying = false;
  clearTimeout(this.interval);  // Arrête le métronome
  clearInterval(this.timerInterval); // Arrête le timer
  this.elapsedTime = (Date.now() - this.startTime) / 1000;  // Enregistrer le temps écoulé en secondes
},
updateTimer() {
  if (this.isPlaying) {
    this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);  // Convertir en secondes entières

    // Changer la couleur selon le temps écoulé
    if (this.elapsedTime < 300) {  // Moins de 5 minutes
      this.timerColor = "blue";
    } else if (this.elapsedTime >= 300 && this.elapsedTime <= 600) {  // Entre 5 et 10 minutes
      this.timerColor = "orange";
    } else {  // Plus de 10 minutes
      this.timerColor = "red";
    }
  }
}


,
    scheduleNextBeat() {
      if (!this.isPlaying) return;

      const now = this.audioContext.currentTime;
      if (this.nextNoteTime < now + 0.1) {
        this.playClick();
        this.nextNoteTime += (60.0 / this.tempo) / this.subdivision;
      }

      this.interval = setTimeout(this.scheduleNextBeat, 25);
    },
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
    increaseTempo() {
      if (this.tempo < 240) {
        this.tempo++;
      }
    },
    decreaseTempo() {
      if (this.tempo > 40) {
        this.tempo--;
      }
    },
    selectSubdivision(value) {
      this.subdivision = value;
    },
    startTimer() {
      this.elapsedTime = 0;
      this.timerInterval = setInterval(() => {
        this.elapsedTime++;
      }, 1000);
    },
    stopTimer() {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  },
  watch: {
    volumeStrong(val) { localStorage.setItem("volumeStrong", val); },
    volumeWeak(val) { localStorage.setItem("volumeWeak", val); },
    volumeSub(val) { localStorage.setItem("volumeSub", val); }
  },
  async mounted() {
    await this.loadSounds();
  }
};
</script>

<style scoped>
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
width: 80px; /* Ajuste la taille ici si nécessaire */
height: 80px; /* Ajuste la taille ici si nécessaire */
border-radius: 50%;
display: flex;
align-items: center;
justify-content: center;
font-size: 20px; /* Taille du texte à l'intérieur du cercle */
font-weight: bold;
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
font-size: 3rem;  /* Ajuste la taille ici */
font-weight: bold; /* Optionnel, pour rendre le texte plus épais */
}
.timer p {
  font-size: 2.5rem;  /* Augmenter la taille pour la rendre plus visible */
  color: #28a745;  /* Couleur verte (pour un effet sportif et dynamique) */
  font-weight: bold;
  text-shadow: 0 0 10px rgba(0, 255, 0, 0.5), 0 0 20px rgba(0, 255, 0, 0.5);  /* Ombres lumineuses pour donner un effet dynamique */
  animation: timerPulse 1s infinite;  /* Ajouter une animation pour faire pulser le texte */
  margin: 0;
}

@keyframes timerPulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);  /* Légère augmentation pour l'effet "pulse" */
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
