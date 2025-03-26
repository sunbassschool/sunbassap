<template>
    <Layout>
      <div class="metronome-container">
        <h1 class="title">🎵 Métronome</h1>
  
        <!-- Première card : Contrôles du Métronome et Mixage des Volumes -->
        <div class="metronome-card">
          <div class="card-header">
            <h2>Contrôles du Métronome & Mixage des Volumes</h2>
          </div>
          <div class="card-body">
            <div class="control-container">
              <!-- Colonne 1 : Contrôles Métronome -->
              <div class="control-column">
                <div class="control-group">
                  <label>Tempo: <span>{{ tempo }}</span> BPM</label>
                  <input type="range" v-model="tempo" min="40" max="240">
                </div>
  
                <div class="control-group">
                  <label>Mesure :</label>
                  <select v-model="measure">
                    <option v-for="num in [2, 3, 4, 5, 6, 7, 8]" :key="num" :value="num">
                      {{ num }}/4
                    </option>
                  </select>
                </div>
  
                <div class="control-group">
                  <label>Subdivision :</label>
                  <select v-model="subdivision">
                    <option value="1">Noires</option>
                    <option value="2">Croches</option>
                    <option value="3">Triolets</option>
                    <option value="4">Doubles Croches</option>
                  </select>
                </div>
              </div>
  
              <!-- Colonne 2 : Mixette -->
              <div class="mixing-column">
                <div class="slider-group">
                  <label>Temps Fort 🔵</label>
                  <input type="range" v-model="volumeStrong" min="0" max="1" step="0.01">
                </div>
  
                <div class="slider-group">
                  <label>Temps Faible 🔴</label>
                  <input type="range" v-model="volumeWeak" min="0" max="1" step="0.01">
                </div>
  
                <div class="slider-group">
                  <label>Subdivision ⚪</label>
                  <input type="range" v-model="volumeSub" min="0" max="1" step="0.01">
                </div>
              </div>
            </div>
          </div>
        </div>
  
        <!-- Seconde card : Boutons de pulsation et de contrôle (Play/Pause) -->
        <div class="control-card">
          <div class="card-header">
            <h2>Contrôle du Métronome</h2>
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
        audioContext: null,
        nextNoteTime: 0.0,
        currentBeat: 0,
        currentSubdivision: 0,
        isBeating: false,
        interval: null,
        soundBuffers: { strong: null, weak: null, sub: null },
        volumeStrong: localStorage.getItem("volumeStrong") || 1,
        volumeWeak: localStorage.getItem("volumeWeak") || 0.7,
        volumeSub: localStorage.getItem("volumeSub") || 0.5
      };
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
          this.currentBeat = 0;
          this.currentSubdivision = 0;
          this.scheduleNextBeat();
        }
      },
      stopMetronome() {
        this.isPlaying = false;
        clearTimeout(this.interval);
      },
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
    flex-direction: row;
    justify-content: space-between;
    gap: 20px;
  }
  
  .control-container {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    width: 100%;
  }
  
  .control-column, .mixing-column {
    width: 45%;
  }
  
  .control-group, .slider-group {
    margin-bottom: 15px;
    width: 100%;
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
    align-items: center;
    justify-content: center;
    gap: 20px;
  }
  
  /* Cercle de pulsation */
  #beatCircle {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: bold;
    color: black;
    transition: background-color 0.1s ease;
  }
  
  /* Boutons play/pause */
  .control-icon {
    background: none;
    border: none;
    font-size: 24px;
    color: #f0f0f0;
    cursor: pointer;
    padding: 5px;
    margin: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  </style>
  