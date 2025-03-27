<template>
<layout>
    <div class="metronome-container pulsing-bg">
      
      <!-- Seconde card : Boutons de pulsation et de contrôle (Play/Pause) -->
      <div class="control-card">
        <div class="card-header">
          <div class="control-group">
            <label><span v-if="!isEditingTempo" @click="isEditingTempo = true" class="editable-bpm">
              {{ metro.tempo }}

</span>
<input 
  v-else 
  type="number" 
  v-model.number="tempo" 
  @blur="isEditingTempo = false" 
  @keyup.enter="isEditingTempo = false"
  min="20" max="300"
  class="bpm-input"
/> BPM</label>
            <div class="tempo-control">
              <button @click="decreaseTempo" class="tempo-arrow">
                &#8592; <!-- Flèche gauche -->
              </button>
              <input type="range" v-model="metro.tempo"              min="20" max="300" step="1">
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
              :class="{ beat: metro.isBeating }"

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
            <label class="swing-label">
  Swing :
  <span class="swing-value">
    {{ Math.round(swingAmount * 100) }}%
    <span 
      class="swing-led" 
      :class="getSwingLedColor"
      :title="swingLabel"
    ></span>
  </span>
</label>

  <input 
    type="range" 
    v-model="swingAmount" 
    min="0" 
    max="1" 
    step="0.05" 
    :style="{ background: getSliderGradient(swingAmount) }"
  >
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
      <!-- Mixette : Volume fort -->

<div class="slider-group">
  <div class="control-groupe">
  <label>
    <input type="checkbox" v-model="accentuateFirstBeat">

    Temps fort
    <span class="tooltip-icon" title="Accentuer le 1er temps de chaque mesure">❓</span>
  </label>
</div>




  <label>Clic :</label>
  <input 
    type="range" 
    v-model="volumeStrong" 
    min="0" max="1" step="0.01"
    :style="{ background: getSliderGradient(volumeStrong) }"
  >
</div>

<!-- Volume faible -->
<div class="slider-group">
  <label>Pulsation :</label>
  <input 
    type="range" 
    v-model="volumeWeak" 
    min="0" max="1" step="0.01"
    :style="{ background: getSliderGradient(volumeWeak) }"
  >
</div>

<!-- Subdivision -->
<div class="slider-group">
  <label>Débit :</label>
  <input 
    type="range" 
    v-model="volumeSub" 
    min="0" max="1" step="0.01"
    :style="{ background: getSliderGradient(volumeSub) }"
  >
</div>

            </div>
          </div>
        </div>
      </div>
    </div>
  </layout>
</template>

<script setup>
import { ref, computed, inject, watch, onMounted, onBeforeUnmount } from 'vue'
import { useMetronomeStore } from '@/stores/metronome'
import Layout from '@/views/Layout.vue'

const metro = useMetronomeStore()

// 🧠 Injecter les states globaux depuis MetronomeProvider
const tempo = inject('tempo')
const isPlaying = inject('isPlaying')
const isBeating = inject('isBeating')
const togglePlay = inject('togglePlay')
const startMetronome = inject('startMetronome')
const stopMetronome = inject('stopMetronome')

const baseUrl = import.meta.env.MODE === "development" ? "/" : "/app/";
const swingAmount = inject('swingAmount')
const volumeStrong = inject('volumeStrong')
const volumeWeak = inject('volumeWeak')
const volumeSub = inject('volumeSub')
const measure = inject('measure')
const subdivision = inject('subdivision')

// 🎯 Éléments UI propres à ce composant
const currentBeat = ref(1)
const isEditingTempo = ref(false)
const elapsedTime = ref(0)
const timerColor = ref('white')
const timerInterval = ref(null)

const subdivisions = [
{ value: 1, label: '', icon: `${baseUrl}assets/icons/quarter-note.png` },
  { value: 2, label: '', icon: `${baseUrl}assets/icons/eighth-note.png` },
  { value: 3, label: '', icon: `${baseUrl}assets/icons/triplet.png` },
  { value: 4, label: '', icon: `${baseUrl}assets/icons/sixteenth-note.png` }
]

const accentuateFirstBeat = ref(true) // gestion locale ici, si besoin tu peux la propager aussi

// ⏱️ Timer pour affichage en bas
const formattedTime = computed(() => {
  const minutes = Math.floor(elapsedTime.value / 60)
  const seconds = elapsedTime.value % 60
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
})

const getSliderGradient = (value) => {
  const percent = Math.round(value * 100)
  const red = Math.round(255 * value)
  const green = Math.round(200 - 100 * value)
  return `linear-gradient(to right, rgb(${red}, ${green}, 80) ${percent}%, #555 ${percent}%)`
}

const swingLabel = computed(() => {
  const val = swingAmount.value
  if (val < 0.2) return "Très léger (presque droit)"
  if (val < 0.4) return "Léger swing (subtil)"
  if (val < 0.6) return "Modéré (groove classique)"
  if (val < 0.8) return "Marqué (groove funky)"
  return "Fort swing (shuffle très prononcé)"
})

const getSwingLedColor = computed(() => {
  const val = swingAmount.value
  if (val < 0.3) return 'led-green'
  if (val < 0.6) return 'led-orange'
  return 'led-red'
})

function increaseTempo() {
  if (tempo.value < 300) tempo.value++
}

function decreaseTempo() {
  if (tempo.value > 20) tempo.value--
}

function selectSubdivision(value) {
  subdivision.value = value
}

function resetTimer() {
  elapsedTime.value = 0
  timerColor.value = 'white'
}

function startTimer() {
  elapsedTime.value = 0
  timerInterval.value = setInterval(() => {
    elapsedTime.value++
  }, 1000)
}

onMounted(() => {
  document.body.style.overflow = 'hidden'
  if (isPlaying.value) startTimer()
})

onBeforeUnmount(() => {
  clearInterval(timerInterval.value)
  document.body.style.overflow = ''
})
</script>




<style scoped>
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
padding: 4px;
margin-top:3%;
color: #fff;
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
    margin-top:8%;
   
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
  width: 28px;
  height: 28px;
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
border: 2px solid rgb(0, 0, 0);
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

</style>
