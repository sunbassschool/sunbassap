<template>
  <Layout>
    <div class="metronome-container pulsing-bg">
      <!-- Contrôle principal -->
      <div class="control-card">
        <div class="card-header">
          <div class="control-group">
            <label>
              <span v-if="!isEditingTempo" @click="isEditingTempo = true" class="editable-bpm">
                {{ tempo }}
              </span>
              <input 
                v-else 
                type="number" 
                v-model.number="tempo" 
                @blur="isEditingTempo = false" 
                @keyup.enter="isEditingTempo = false"
                min="20" 
                max="300"
                class="bpm-input"
              /> BPM
            </label>
            <div class="tempo-control">
              <button @click="decreaseTempo" class="tempo-arrow">←</button>
              <input type="range" v-model="tempo" min="20" max="300" step="1">
              <button @click="increaseTempo" class="tempo-arrow">→</button>
            </div>
          </div>
        </div>

        <div class="card-body">
          <!-- Visualiseur de battement -->
          <div class="visualizer">
            <div 
              :class="{ beat: isBeating }" 
              :style="{ backgroundColor: currentBeat === 1 ? 'darkred' : 'white' }"
              id="beatCircle"
            >
              <span class="beat-number">{{ currentBeat }}</span> 
            </div>
          </div>

          <!-- Contrôles Play/Stop -->
          <div class="controls">
            <button @click="toggleMetronome" class="control-icon" :class="{ active: isPlaying }">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path :d="isPlaying ? 'M6 19h4V5H6v14zm8-14v14h4V5h-4z' : 'M8 5v14l11-7z'"/>
              </svg>
            </button>
          </div>

          <!-- Mesure -->
          <div class="control-group">
            <select v-model="measure">
              <option v-for="num in [2, 3, 4, 5, 6, 7, 8]" :key="num" :value="num">
                {{ num }}/4
              </option>
            </select>
          </div>

          <!-- Timer -->
          <div class="timer">
            <p :style="{ color: timerColor }">{{ formattedTime }}</p>
            <button @click="resetTimer" class="reset-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path d="M12 4V1L8 5l4 4V7c4 0 7 3 7 7s-3 7-7 7-7-3-7-7h2a5 5 0 1 0 5-5z"/>
              </svg>
            </button>
          </div>

          <!-- Swing -->
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

      <!-- Contrôles avancés -->
      <div class="metronome-card">
        <div class="card-body">
          <div class="control-container">
            <!-- Subdivisions -->
            <div class="control-column">
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

            <!-- Contrôles de volume -->
            <div class="mixing-column">
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

              <div class="slider-group">
                <label>Pulsation :</label>
                <input 
                  type="range" 
                  v-model="volumeWeak" 
                  min="0" max="1" step="0.01"
                  :style="{ background: getSliderGradient(volumeWeak) }"
                >
              </div>

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
  </Layout>
</template>

<script>
import Layout from "@/views/Layout.vue"
import { useMetronomeStore } from "@/stores/metronome"
import { onMounted, onUnmounted, watch } from 'vue'

const baseUrl = import.meta.env.MODE === "development" ? "/" : "/app/"

export default {
  name: "Metronome",
  components: { Layout },

  data() {
    return {
      tempo: 120,
      measure: 4,
      subdivision: 1,
      swingAmount: 0,
      isEditingTempo: false,
      isPlaying: false,
      elapsedTime: 0,
      audioContext: null,
      nextNoteTime: 0.0,
      currentBeat: 1,
      currentSubdivision: 0,
      isBeating: false,
      interval: null,
      soundBuffers: { strong: null, weak: null, sub: null },
      volumeStrong: 0.5,
      volumeWeak: 0.5,
      volumeSub: 0.5,
      timerColor: "white",
      timerInterval: null,
      wasPlayingBeforeHide: false,
      disableStrongBeat: false,
      subdivisions: [
        { value: 1, label: '', icon: `${baseUrl}assets/icons/quarter-note.png` },
        { value: 2, label: '', icon: `${baseUrl}assets/icons/eighth-note.png` },
        { value: 3, label: '', icon: `${baseUrl}assets/icons/triplet.png` },
        { value: 4, label: '', icon: `${baseUrl}assets/icons/sixteenth-note.png` }
      ]
    }
  },

  computed: {
    formattedTime() {
      const minutes = Math.floor(this.elapsedTime / 60)
      const seconds = this.elapsedTime % 60
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
    },
    accentuateFirstBeat: {
      get() { return !this.disableStrongBeat },
      set(val) { this.disableStrongBeat = !val }
    },
    swingLabel() {
      if (this.swingAmount < 0.2) return "Très léger"
      if (this.swingAmount < 0.4) return "Léger swing"
      if (this.swingAmount < 0.6) return "Modéré"
      if (this.swingAmount < 0.8) return "Marqué"
      return "Fort swing"
    },
    getSwingLedColor() {
      if (this.swingAmount < 0.3) return 'led-green'
      if (this.swingAmount < 0.6) return 'led-orange'
      return 'led-red'
    }
  },

  methods: {
    initAudioContext() {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
          latencyHint: 'playback'
        })
        console.log("AudioContext initialisé")
        
        this.audioContext.addEventListener('statechange', () => {
          if (this.audioContext.state === 'suspended' && this.isPlaying) {
            console.log("AudioContext suspendu - reprise nécessaire")
            this.wasPlayingBeforeHide = true
          }
        })
      }
    },

    async loadSounds() {
      const soundUrls = {
        strong: `${baseUrl}assets/audio/strong-beat.wav`,
        weak: `${baseUrl}assets/audio/weak-beat.wav`,
        sub: `${baseUrl}assets/audio/subdivision.wav`
      }

      for (const [key, url] of Object.entries(soundUrls)) {
        try {
          const response = await fetch(url)
          const arrayBuffer = await response.arrayBuffer()
          this.soundBuffers[key] = await this.audioContext.decodeAudioData(arrayBuffer)
        } catch (err) {
          console.error(`Erreur chargement son ${key}:`, err)
        }
      }
    },

    async toggleMetronome() {
      if (this.isPlaying) {
        this.stopMetronome()
      } else {
        await this.startMetronome()
      }
    },

    async startMetronome() {
      if (this.isPlaying) return
      
      try {
        this.initAudioContext()
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume()
        }
        
        this.isPlaying = true
        this.nextNoteTime = this.audioContext.currentTime + 0.1
        this.startTimer()
        this.scheduleNextBeat()
        
        // Activation du Wake Lock
        if ('wakeLock' in navigator) {
          try {
            const wakeLock = await navigator.wakeLock.request('screen')
            wakeLock.addEventListener('release', () => {
              console.log('Wake Lock released')
            })
          } catch (err) {
            console.error('Wake Lock error:', err)
          }
        }
      } catch (err) {
        console.error("Erreur démarrage métronome:", err)
        this.isPlaying = false
      }
    },

    stopMetronome() {
      this.isPlaying = false
      cancelAnimationFrame(this.interval)
      clearInterval(this.timerInterval)
      this.elapsedTime = 0
      this.currentBeat = 1
      this.currentSubdivision = 0
    },

    scheduleNextBeat() {
      if (!this.isPlaying) return

      const now = this.audioContext.currentTime
      while (this.nextNoteTime < now + 0.1) {
        this.playClick()

        let beatInterval = 60.0 / this.tempo
        let subdivisionInterval = beatInterval / this.subdivision

        let swingOffset = 0
        if (this.subdivision === 2 || this.subdivision === 4) {
          swingOffset = (this.currentSubdivision % 2 === 1) 
            ? (this.swingAmount * subdivisionInterval) / 3 
            : -(this.swingAmount * subdivisionInterval) / 3
        }

        this.nextNoteTime += subdivisionInterval + swingOffset
      }

      this.interval = requestAnimationFrame(this.scheduleNextBeat)
    },

    playClick() {
      this.currentSubdivision++
      if (this.currentSubdivision > this.subdivision) {
        this.currentSubdivision = 1
        this.currentBeat = (this.currentBeat % this.measure) + 1
      }

      let soundBuffer, volume
      if (this.currentSubdivision === 1) {
        if (this.currentBeat === 1 && !this.disableStrongBeat) {
          soundBuffer = this.soundBuffers.strong
          volume = this.volumeStrong
        } else {
          soundBuffer = this.soundBuffers.weak
          volume = this.volumeWeak
        }
      } else {
        soundBuffer = this.soundBuffers.sub
        volume = this.volumeSub
      }

      if (soundBuffer) this.playSound(soundBuffer, this.nextNoteTime, volume)

      this.isBeating = true
      setTimeout(() => this.isBeating = false, 100)
    },

    playSound(buffer, time, volumeLevel) {
      const gainNode = this.audioContext.createGain()
      gainNode.gain.value = volumeLevel * 2

      const source = this.audioContext.createBufferSource()
      source.buffer = buffer
      source.connect(gainNode)
      gainNode.connect(this.audioContext.destination)
      source.start(time)
    },

    startTimer() {
      this.elapsedTime = 0
      this.timerInterval = setInterval(() => {
        this.elapsedTime++
      }, 1000)
    },

    increaseTempo() {
      if (this.tempo < 300) this.tempo++
    },

    decreaseTempo() {
      if (this.tempo > 20) this.tempo--
    },

    resetTimer() {
      this.elapsedTime = 0
      this.timerColor = "white"
    },

    selectSubdivision(value) {
      this.subdivision = value
    },

    getSliderGradient(value) {
      const percent = Math.round(value * 100)
      const red = Math.round(255 * value)
      const green = Math.round(200 - 100 * value)
      const color = `rgb(${red}, ${green}, 80)`
      return `linear-gradient(to right, ${color} ${percent}%, #555 ${percent}%)`
    },

    handleVisibilityChange() {
      if (document.visibilityState === 'visible' && this.wasPlayingBeforeHide) {
        this.startMetronome()
        this.wasPlayingBeforeHide = false
      } else if (document.visibilityState === 'hidden' && this.isPlaying) {
        this.wasPlayingBeforeHide = true
      }
    }
  },

  watch: {
    tempo(newVal) {
      localStorage.setItem('tempo', newVal)
      if (this.isPlaying) {
        cancelAnimationFrame(this.interval)
        this.nextNoteTime = this.audioContext.currentTime
        this.scheduleNextBeat()
      }
    },
    swingAmount(val) {
      localStorage.setItem('swingAmount', val)
    },
    volumeStrong(val) {
      localStorage.setItem('volumeStrong', val)
    },
    volumeWeak(val) {
      localStorage.setItem('volumeWeak', val)
    },
    volumeSub(val) {
      localStorage.setItem('volumeSub', val)
    },
    disableStrongBeat(val) {
      localStorage.setItem('disableStrongBeat', val)
    }
  },

  async mounted() {
    // Récupération des paramètres sauvegardés
    this.tempo = parseInt(localStorage.getItem('tempo')) || 120
    this.swingAmount = parseFloat(localStorage.getItem('swingAmount')) || 0
    this.volumeStrong = parseFloat(localStorage.getItem('volumeStrong')) || 0.5
    this.volumeWeak = parseFloat(localStorage.getItem('volumeWeak')) || 0.5
    this.volumeSub = parseFloat(localStorage.getItem('volumeSub')) || 0.5
    this.disableStrongBeat = localStorage.getItem('disableStrongBeat') === 'true'

    this.initAudioContext()
    await this.loadSounds()
    
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
    
    // Reprise si le métronome était en marche
    if (localStorage.getItem('metronomePlaying') === 'true') {
      this.startMetronome()
    }
  },

  beforeUnmount() {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    localStorage.setItem('metronomePlaying', this.isPlaying.toString())
    
    if (this.isPlaying) {
      this.stopMetronome()
    }
  }
}
</script>

<style scoped>
/* Vos styles CSS existants restent identiques */
.metronome-container {
  text-align: center;
  padding: 4px;
  margin-top: 3%;
  color: #fff;
}

.control-card, .metronome-card {
  background: #131313;
  border-radius: 8px;
  margin: 15px 0;
  padding: 15px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.card-body {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.visualizer {
  margin: 20px 0;
}

#beatCircle {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  font-weight: bold;
  color: black;
  transition: background-color 0.1s ease;
  margin: 0 auto;
}

.beat {
  animation: pulse 0.2s ease;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
}

.controls {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin: 20px 0;
}

.control-icon {
  background-color: #fd0202;
  border: 3px solid #888;
  border-radius: 50%;
  padding: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.control-icon.active {
  background-color: #0e4b11;
  border-color: #66bb6a;
}

.control-icon svg {
  fill: #ffffff;
  width: 28px;
  height: 28px;
}

.tempo-control {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 15px 0;
}

.tempo-control input[type="range"] {
  flex-grow: 1;
}

.subdivision-icons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin: 15px 0;
}

.subdivision-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  padding: 10px;
  border: 2px solid transparent;
  border-radius: 5px;
  transition: all 0.3s ease;
}

.subdivision-icon.selected {
  border-color: #a74c28;
}

.subdivision-icon img {
  width: 45px;
  height: 45px;
}

.slider-group {
  margin: 15px 0;
  width: 100%;
}

.slider-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.timer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin: 15px 0;
}

.timer p {
  font-size: 2rem;
  color: white;
  font-weight: bold;
  margin: 0;
}

.pulsing-bg {
  background: linear-gradient(45deg, #5f0606f6, #242424, #1a1a1a, #7e1300);
  background-size: 400% 400%;
  animation: gradientFlow 8s ease infinite;
}

@keyframes gradientFlow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* Styles pour les éléments éditable */
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

/* Styles pour le swing */
.swing-label {
  display: flex;
  align-items: center;
  gap: 10px;
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

.led-green {
  background-color: #00e676;
}

.led-orange {
  background-color: #ffb300;
}

.led-red {
  background-color: #ff1744;
}

/* Responsive */
@media (max-width: 768px) {
  .control-container {
    flex-direction: column;
  }
  
  .control-column, .mixing-column {
    width: 100%;
  }
}
</style>