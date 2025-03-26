<template>
    <div class="metronome-container">
      <h1>🎵 Métronome</h1>
  
      <div class="controls">
        <label for="tempo">Tempo: <span>{{ tempo }}</span> BPM</label>
        <input type="range" id="tempo" v-model="tempo" min="40" max="240">
        <button @click="startMetronome">Démarrer</button>
        <button @click="stopMetronome">Arrêter</button>
      </div>
  
      <div class="visualizer">
        <div :class="{ beat: isBeating }" id="beatCircle"></div>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    data() {
      return {
        tempo: 120,
        isPlaying: false,
        audioContext: null,
        nextNoteTime: 0.0,
        isBeating: false,
        interval: null,
      };
    },
    methods: {
      startMetronome() {
        if (!this.isPlaying) {
          this.isPlaying = true;
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
          this.nextNoteTime = this.audioContext.currentTime;
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
        if (!this.audioContext) return;
  
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.frequency.value = 1000;
        gain.gain.value = 1;
  
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
  
        osc.start(this.nextNoteTime);
        osc.stop(this.nextNoteTime + 0.05);
  
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
  </style>
  