<template>
    <Layout>
      <div class="metronome-container">
        <h1>🎵 Métronome</h1>
  
        <div class="controls">
          <label for="tempo">Tempo: <span>{{ tempo }}</span> BPM</label>
          <input type="range" v-model="tempo" min="40" max="240">
  
          <label for="measure">Mesure :</label>
          <select v-model="measure">
            <option v-for="num in [2, 3, 4, 5, 6, 7, 8]" :key="num" :value="num">
              {{ num }}/4
            </option>
          </select>
  
          <button @click="startMetronome">Démarrer</button>
          <button @click="stopMetronome">Arrêter</button>
        </div>
  
        <div class="visualizer">
          <div :class="{ beat: isBeating, strong: currentBeat === 1 }" id="beatCircle"></div>
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
        measure: 4, // 4/4 par défaut
        isPlaying: false,
        audioContext: null,
        nextNoteTime: 0.0,
        currentBeat: 0,
        isBeating: false,
        interval: null,
        strongBeatAudio: new Audio('/audio/strong-beat.wav'),
        weakBeatAudio: new Audio('/audio/weak-beat.wav')
      };
    },
    methods: {
      startMetronome() {
        if (!this.isPlaying) {
          this.isPlaying = true;
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
          this.nextNoteTime = this.audioContext.currentTime;
          this.currentBeat = 0;
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
          this.nextNoteTime += 60.0 / this.tempo;
        }
  
        this.interval = setTimeout(this.scheduleNextBeat, 25);
      },
      playClick() {
        this.currentBeat = (this.currentBeat % this.measure) + 1; // Boucle entre 1 et "measure"
  
        // Sélectionne le bon son
        if (this.currentBeat === 1) {
          this.strongBeatAudio.currentTime = 0;
          this.strongBeatAudio.play();
        } else {
          this.weakBeatAudio.currentTime = 0;
          this.weakBeatAudio.play();
        }
  
        this.isBeating = true;
        setTimeout(() => this.isBeating = false, 100);
      }
    }
  };
  </script>
  
  <style scoped>
  .metronome-container {
    text-align: center;
    padding: 20px;
  }
  
  .controls {
    margin: 20px 0;
  }
  
  button {
    padding: 10px;
    margin: 5px;
    border: none;
    background-color: #28a745;
    color: white;
    font-size: 16px;
    border-radius: 5px;
    cursor: pointer;
  }
  
  button:last-child {
    background-color: #dc3545;
  }
  
  .visualizer {
    margin-top: 20px;
  }
  
  #beatCircle {
    width: 50px;
    height: 50px;
    background-color: grey;
    border-radius: 50%;
    margin: auto;
    transition: transform 0.1s ease;
  }
  
  .beat {
    background-color: red;
    transform: scale(1.2);
  }
  
  .strong {
    background-color: blue; /* 🔥 Temps fort en bleu */
  }
  </style>
  