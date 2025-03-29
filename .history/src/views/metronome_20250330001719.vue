<template>
  <Layout>
    <div class="metronome-container pulsing-bg">
      
      <!-- SECTION CONTROLS -->
      <div class="control-card">
        <div class="card-header">
  <div class="tempo-wrapper">
    <div class="tempo-display">
      <span 
        v-if="!isEditingTempo" 
        @click="isEditingTempo = true" 
        class="editable-bpm"
      >
        {{ metronome.tempo }}
      </span>
      <input 
        v-else 
        type="number" 
        v-model="tempo" 
        min="20" 
        max="300" 
        step="1" 
        class="bpm-input"
      />
      <span class="bpm-unit">BPM</span>
    </div>

    <div class="tempo-control">
      <button @click="decreaseTempo" class="tempo-arrow">&#8592;</button>
      <input 
        type="range" 
        v-model="tempo" 
        min="20" 
        max="300" 
        step="1" 
      />
      <button @click="increaseTempo" class="tempo-arrow">&#8594;</button>
    </div>
  </div>
</div>


        <div class="card-body">
          <div class="control-buttons">
            
            <!-- CERCLE DE PULSATION -->
            <div class="visualizer">
              <div 
                :class="{ beat: isBeating }" 
                :style="{ backgroundColor: currentBeat === 1 ? 'darkred' : 'white' }"
                id="beatCircle"
              >
                <span class="beat-number">{{ currentBeat }}</span> 
              </div>
            </div>

            <!-- BOUTONS START / STOP -->
            <div class="controls">
              <button @click="startMetronome" class="control-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </button>
              <button @click="stopMetronome" class="control-icon stop-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                  <path d="M6 6h12v12H6z"/>
                </svg>
              </button>
            </div>

            <div class="control-group">
              <select v-model="selectedMeter">
                <option v-for="m in meterOptions" :key="m.label" :value="m.label">
                  {{ m.label }}
                </option>
              </select>
            </div>
          </div>

          <!-- TIMER -->
          <div class="timer">
            <p>{{ metronome.formattedTime || '0:00' }}</p>
            <button @click="resetTimer" class="reset-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path d="M12 4V1L8 5l4 4V7c4 0 7 3 7 7s-3 7-7 7-7-3-7-7h2a5 5 0 1 0 5-5z"/>
              </svg>
            </button>
          </div>

          <!-- SWING -->
          <div class="slider-group">
            <label class="swing-label">
              Swing :
              <span class="swing-value">
                {{ Math.round(swingAmount * 100) }}%
              </span>
            </label>
            <input 
  type="range" 
  v-model="swingAmount" 
  min="0" 
  max="1" 
  step="0.05"
  class="fader-slider"
/>

          </div>
        </div>
      </div>
   
  <!-- SECTION MIXETTE + SUBDIVISIONS EN LIGNE -->
<div class="metronome-card">
  <div class="card-body">
    <div class="mixette-layout">
 

   <!-- 🎚️ Mixette style table de mixage -->
<div class="volume-section">

    <!-- ✅ Toggle général -->
    <div class="toggle-strong-beat">
    <label>
      <input type="checkbox" v-model="accentuateFirstBeat" />
      <span>Activer le temps fort</span>
      <span class="tooltip-icon" title="Accentue le premier temps de chaque mesure">❓</span>
    </label>
  </div>
  <div class="mixette-rack">

    <!-- Clic -->
    <div class="mix-column">
      <label class="fader-label">Clic</label>
      <input type="range" v-model="volumeStrong" min="0" max="1" step="0.01" class="fader-slider" />
      <div class="volume-display">{{ Math.round(volumeStrong * 100) }}%</div>
    </div>

    <!-- Pulsation -->
    <div class="mix-column">
      <label class="fader-label">Pulsation</label>
      <input type="range" v-model="volumeWeak" min="0" max="1" step="0.01" class="fader-slider" />
      <div class="volume-display">{{ Math.round(volumeWeak * 100) }}%</div>
    </div>

    <!-- Débit -->
    <div class="mix-column">
      <label class="fader-label">Débit</label>
      <input type="range" v-model="volumeSub" min="0" max="1" step="0.01" class="fader-slider" />
      <div class="volume-display">{{ Math.round(volumeSub * 100) }}%</div>
    </div>

  </div>
</div>


      <!-- SUBDIVISIONS avec icônes -->
      <div class="subdivision-section">
        <h4>Subdivisions</h4>
        <div class="subdivision-icons">
          <div 
            v-for="(sub, index) in subdivisions" 
            :key="index" 
            class="subdivision-icon" 
            :class="{ selected: subdivision === sub.value }"
            @click="subdivision = sub.value"
          >
            <img :src="sub.icon" :alt="sub.label" class="subdivision-img" />
            <span>{{ sub.label }}</span>
          </div>
        </div>

    
      </div>

    </div>
  </div>
</div>

      
    </div>
  </Layout>
</template>



<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import Layout from "@/views/Layout.vue";
import { useMetronomeStore } from "@/stores/useMetronomeStore";

const metronome = useMetronomeStore();
const baseUrl = import.meta.env.BASE_URL;
const isMobile = ref(false);

const subdivisions = [
  { value: 1, label: 'Noires', icon: `${baseUrl}assets/icons/quarter-note.png` },
  { value: 2, label: 'Croches', icon: `${baseUrl}assets/icons/eighth-note.png` },
  { value: 3, label: 'Triolets', icon: `${baseUrl}assets/icons/triplet.png` },
  { value: 4, label: 'Double', icon: `${baseUrl}assets/icons/sixteenth-note.png` }
];
// Flags and reactive values
const isEditingTempo = ref(false);
const isBeating = ref(false);
const currentBeat = computed(() => {
  return metronome.currentBeat === 0 ? metronome.measure : metronome.currentBeat;
});

const formattedTime = computed(() => {
  const totalSeconds = metronome.elapsedTime || 0;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
});

const swingAmount = computed({
  get: () => metronome.swingAmount,
  set: (val) => metronome.setSwingAmount(val),
});
const measure = computed({
  get: () => metronome.measure,
  set: (val) => metronome.setMeasure(val)
});

// Syncing tempo with store
const tempo = computed({
  get: () => metronome.tempo,
  set: (val) => metronome.setTempo(val),
});

// Syncing subdivision with store
const subdivision = computed({
  get: () => metronome.subdivision,
  set: (val) => metronome.setSubdivision(val),
});

// Syncing volumes with store
const volumeSub = computed({
  get: () => metronome.volumeSub,
  set: (val) => metronome.setVolumeSub(val),
});
const selectedMeter = computed({
  get: () => metronome.selectedMeter,
  set: (val) => metronome.setSelectedMeter(val),
});
const volumeStrong = computed({
  get: () => metronome.volumeStrong,
  set: (val) => metronome.setVolumeStrong(val),
});
const meterOptions = computed(() => metronome.meterOptions);
const volumeWeak = computed({
  get: () => metronome.volumeWeak,
  set: (val) => metronome.setVolumeWeak(val),
});

const accentuateFirstBeat = computed({
  get: () => !metronome.disableStrongBeat,
  set: (val) => metronome.setDisableStrongBeat(!val)
});

onMounted(() => {
  isMobile.value = window.innerWidth <= 768;
});
// Tempo increase and decrease functions
function increaseTempo() {
  if (metronome.tempo < 300) metronome.tempo++;
}

function decreaseTempo() {
  if (metronome.tempo > 20) metronome.tempo--;
}

// Update swing value in localStorage and store


// Start and stop metronome
function startMetronome() {
  metronome.isPlaying = true;
}

function stopMetronome() {
  metronome.isPlaying = false;
}

// Reset timer
function resetTimer() {
  metronome.elapsedTime = 0;
}

// Tempo update in store
function updateTempo() {
  metronome.setTempo(tempo.value);
}

// Watchers to update store from localStorage
watch(currentBeat, () => {
  isBeating.value = true;
  setTimeout(() => {
    isBeating.value = false;
  }, 100); // pulsation courte
});
watch(() => metronome.disableStrongBeat, (val) => {
  localStorage.setItem('disableStrongBeat', val);
});

watch(() => metronome.isPlaying, (val) => {
  if (val) {
    startMetronome();
  } else {
    stopMetronome();
  }
});
</script>


<style scoped>
.toggle-strong-beat {
  text-align: center;
  margin-bottom: 10px;
}

.toggle-strong-beat label {
  color: #fff;
  font-weight: bold;
  font-size: 0.95rem;
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.toggle-strong-beat input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #a72c28;
  cursor: pointer;
}

.mixette-rack {
  display: flex;
  flex-direction: row;
  gap: 12px;
  justify-content: center;
  margin-top: 4px;
}

.mix-column {
  background: #262626;
  padding: 10px;
  border-radius: 8px;
  width: 100px;
  box-shadow: inset 0 0 6px rgba(0,0,0,0.4);
  text-align: center;
}

.fader-label {
  font-size: 1rem;
  font-weight: bold;
  color: #fff;
  margin-bottom: 8px;
  display: block;
}

.fader-slider {
  width: 100%;
  appearance: none;
  height: 8px;
  background: linear-gradient(to right, #a72c28, #333);
  border-radius: 8px;
  outline: none;
  margin: 10px 0;
}

.fader-slider::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  background: #fff;
  border: 2px solid #a72c28;
  border-radius: 50%;
  cursor: pointer;
}

.fader-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: #fff;
  border: 2px solid #a72c28;
  border-radius: 50%;
  cursor: pointer;
}

.volume-display {
  font-size: 0.85rem;
  color: #aaa;
}




.swipe-hint {
  font-size: 0.95rem;
  color: #bbbbbb;
  text-align: center;
  margin-top: 10px;
  animation: hintSwipe 1.5s ease-in-out infinite;
  user-select: none;
}

@keyframes hintSwipe {
  0%   { opacity: 0.2; transform: translateX(0); }
  50%  { opacity: 1; transform: translateX(5px); }
  100% { opacity: 0.2; transform: translateX(0); }
}
@media (max-width: 768px) {
  .mixette-layout {
  display: flex;
  flex-direction: row;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  gap: 16px;
  padding: 10px 8px;
}

/* Visuellement attrayant */
.mixette-layout::-webkit-scrollbar {
  height: 6px;
}
.mixette-layout::-webkit-scrollbar-thumb {
  background: #a74c28;
  border-radius: 10px;
}
.mixette-layout::-webkit-scrollbar-track {
  background: transparent;
}

/* Chaque bloc = largeur fixe pour scroll */
.volume-section,
.subdivision-section {
  flex: 0 0 auto;
  min-width: 260px;
  scroll-snap-align: start;
  border: 1px solid #333;
  padding: 10px;
  border-radius: 8px;
  background-color: #1b1b1b;
  margin: 0; /* ❗ Supprime les marges verticales */

}
.mixette-layout::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 30px;
  height: 100%;
  background: linear-gradient(to left, #131313, transparent);
  pointer-events: none;
}
}
.mixette-layout-wrapper {
  position: relative;
}

.metronome-container {
  overflow-x: hidden; /* ❗ évite que toute la page scroll horizontalement */
}
.volume-section,
.subdivision-section {
  scroll-snap-align: start;
  flex: 0 0 100%; /* ou 90% pour marge */
  width: 100%;
  margin-top:-2%;

  box-sizing: border-box;
}

.volume-section h4,
.subdivision-section h4 {
  margin: 10px 0;
  font-size: 1rem;
  color: #ffffff;
  border-bottom: 1px solid #a74c28;
  padding-bottom: 4px;
}







.tooltip-icon {
  display: inline-block;
  margin-left: 6px;
  font-size: 14px;
  cursor: help;
  color: #ccc;
  transition: color 0.3s ease;
}

.tooltip-icon:hover {
  color: #ffa500; /* orange clair au survol */
}

.control-groupe input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  width: 42px;
  height: 24px;
  background-color: #777;
  border-radius: 12px;
  position: relative;
  outline: none;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-right: 10px;
}

.control-groupe input[type="checkbox"]::before {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  left: 2px;
  top: 2px;
  background-color: #fff;
  border-radius: 50%;
  transition: transform 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.control-groupe input[type="checkbox"]:checked {
  background-color: #a74c28;
}

.control-groupe input[type="checkbox"]:checked::before {
  transform: translateX(5px); /* Ajusté pour ne pas dépasser */
}

.control-groupe label {
  color: #fff;
  font-size: 0.9rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 12px; /* ✅ Espace entre le switch et le texte */
}

html,
body {
  overflow: hidden;
  height: 100%;
  touch-action: none; /* bloque aussi les gestes tactiles indésirables */
}
.wake-lock-status {
  font-size: 20px;
  margin-top: -8%;
  transition: opacity 0.3s ease;
  opacity: 0.4;
}
.wake-lock-status.active {
  opacity: 1;
  color: #00ff80; /* vert fluo */
}

.swing-label {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top:-20%;
  font-weight: bold;
}

.swing-value {
  display: flex;
  align-items: center;
  gap: 8px;
}

.swing-led {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  box-shadow: 0 0 5px #000;
}

/* Couleurs */
.led-green {
  background-color: #00e676;
}

.led-orange {
  background-color: #ffb300;
}

.led-red {
  background-color: #ff1744;
}

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
height: 8px; /* Hauteur du slider */
-webkit-tap-highlight-color: transparent; /* pas de flash bleu */
border-radius: 50px;
transition: background 0.3s ease; /* Ajoute une transition douce */
}


.slider-group input[type="range"]:focus {
background: #ffffff; /* Couleur du slider lors du focus */
}

.slider-group input[type="range"]::-webkit-slider-thumb {
-webkit-appearance: none;
appearance: none;
background: #a72c28; /* Couleur du curseur */
border-radius: 50%;
width: 20px;
height: 20px;
cursor: pointer; /* Change le curseur pour indiquer l'interaction */
box-shadow: 0 0 5px rgba(0, 0, 0, 0.2); /* Ombre autour du curseur */
}

.slider-group input[type="range"]::-moz-range-thumb {
background: #a72c28; /* Couleur du curseur pour Firefox */
border-radius: 50%;
width: 20px;
height: 20px;
cursor: pointer;
box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
}
.metronome-container {
text-align: center;


color: #fff;
padding: 4px 6px;
  overflow-x: hidden;
  position: relative;

}

.title {
font-size: 1.8rem;
color: #f0f0f0;
margin-bottom: 15px;
}

/* Première card : Contrôles du Métronome et Mixage des Volumes */
.metronome-card {
background: #131313;
border-radius: 8px;
margin: 5px 0 0 0; /* Top réduit à 5px */

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
gap: px;
width: 40%; /* Largeur réduite pour éviter un espace au milieu */

}
/* Seconde card : Boutons de pulsation et de contrôle */
.control-card {
background: #131313;
border-radius: 8px;
margin: 0px 0;
padding: 0px;
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

}

.control-buttons {
display: flex;
align-items: center; /* Aligner l'icône et le BPM verticalement */
justify-content: center; /* Centrer les éléments horizontalement */
gap: 10%; /* Augmenter l'espacement entre les éléments (ajuster la valeur) */
}
#beatCircle {
    margin-top:8px;
   
width: 70px; /* Ajuste la taille ici si nécessaire */
height: 70px; /* Ajuste la taille ici si nécessaire */
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
/* 🎵 Style général des boutons de contrôle (play/stop) */
.controls {
  display: flex;
  

}

.control-icon {
  background-color: #fd0202; /* Fond gris foncé */
  border: 3px solid #888; /* Bordure claire */
  border-radius: 50%; /* Forme circulaire */
  padding: 0px;

  margin: 0 6px; /* ✅ Espacement horizontal */

  transition: transform 0.2s ease, background-color 0.3s ease, border-color 0.3s ease;
}

.control-icon svg {
  fill: #ffffff; /* Couleur de l'icône blanche */
  width: 35px;
  height: 35px;
}

/* Hover effet */
.control-icon:hover {
  background-color: #666;
  border-color: #a74c28; /* Couleur chaude au survol */
  transform: scale(1.1); /* Zoom léger */
}

/* Effet clic */
.control-icon:active {
  transform: scale(0.95); /* Léger rétrécissement */
}
/* 🎮 Style spécifique pour le bouton Play */
.control-icon:not(.stop-button) {
  background-color: #0e4b11; /* Vert foncé */
  border-color: #66bb6a;     /* Vert clair pour la bordure */
}

.control-icon:not(.stop-button):hover {
  background-color: #388e3c;
  border-color: #81c784;
}

/* 🎯 Style spécifique pour le bouton Stop pour une différenciation visuelle */
.stop-button {
  background-color: #751814; /* Rouge foncé */
  border-color: #ff5e5e;
}

.stop-button:hover {
  background-color: #c74242;
  border-color: #ff7a7a;
}

/* Flèches à côté du fader */
.tempo-control {
display: flex;
align-items: center;
justify-content: center;
gap: 0px;
width: 100%; /* Utiliser toute la largeur disponible */
}
.control-group {
display: flex;
justify-content: center;  /* Centrer horizontalement */
align-items: center;      /* Centrer verticalement */

width: 100%;              /* Prendre toute la largeur disponible */
}
.tempo-arrow {
background: none;
border: none;
font-size: 30px;
color: #f0f0f0;
cursor: pointer;
padding: 1px;
}

/* Icônes des subdivisions avec tableau */
.subdivision-icons {
  display: flex; /* Change de grid à flex */
  justify-content: center;  /* ou 'flex-start' si tu veux aligner à gauche */

  flex-wrap: wrap;
  background-color: #272727;
  padding: 6px 4px;
  gap: 8px;
}

.subdivision-icon {
  padding: 4px;
  margin: 0; /* Supprime les marges internes */
  border: 1px solid #000; /* allégé si tu veux un style plus sobre */
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 60px; /* limite fixe pour éviter les débordements */
}

.subdivision-icon img {
  width: 36px;
  height: 36px;
}

.subdivision-icon span {
  margin-top: 2px;
  font-size: 11px;
}


.subdivision-icon.selected {
border: 2px solid #a74c28;
border-radius: 5px;
}

.subdivision-icon img {
width: 45px;
height: 45px;
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
padding: 10px px; /* Ajuster la taille du champ */
background-color: #000000; /* Fond sombre */
color: #fff; /* Texte blanc */
border-radius: 5px; /* Coins arrondis */
border: 1px solid #777; /* Bordure subtile */
font-size: 20px; /* Taille de la police */
width: 80px; /* Largeur fixe du select pour les mesures */

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
@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
}

.beat {
  animation: pulse 0.2s ease;
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

.pulsing-bg {
  background: linear-gradient(45deg, #5f0606f6, #242424, #1a1a1a, #7e1300);
  background-size: 400% 400%;
  animation: gradientFlow 8s ease infinite;
  transition: background 1s ease;
}
@keyframes gradientFlow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
#beatCircle.beat {
  box-shadow: 0 0 10px 0px rgba(255, 255, 255, 0.6);
  transition: box-shadow 0.1s ease;
}
.editable-bpm {
  cursor: pointer;
  border-bottom: 1px dashed #aaa;
  transition: color 0.3s;
}

.editable-bpm:hover {
  color: #ffa500;
}

.bpm-input {
  width: 60px;
  font-size: 1.5rem;
  text-align: center;
  background: #222;
  color: white;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 2px;
}
.tempo-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom:-1%;
}

.tempo-display {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 2rem;
  font-weight: bold;
  color: white;
}

.bpm-unit {
  font-size: 1.2rem;
  color: #aaa;
  margin-left: 4px;
}

.tempo-control {
  display: flex;
  align-items: center;
  gap: 15px;
  width: 100%;
}

</style>
