<template>
    <Layout>
      <div class="metronome-container">
        <h1>🎵 Métronome</h1>
  
        <div class="controls">
          <label>Tempo: <span>{{ tempo }}</span> BPM</label>
          <input type="range" v-model="tempo" min="40" max="240">
  
          <label>Mesure :</label>
          <select v-model="measure">
            <option v-for="num in [2, 3, 4, 5, 6, 7, 8]" :key="num" :value="num">
              {{ num }}/4
            </option>
          </select>
  
          <label>Subdivision :</label>
          <select v-model="subdivision">
            <option value="1">Noires</option>
            <option value="2">Croches</option>
            <option value="3">Triolets</option>
            <option value="4">Doubles Croches</option>
          </select>
  
          <button @click="startMetronome">Démarrer</button>
          <button @click="stopMetronome">Arrêter</button>
        </div>
  
        <div class="visualizer">
          <div :class="{ beat: isBeating, strong: currentBeat === 1 }" id="beatCircle">
            <span class="beat-number">{{ currentBeat }}</span> 
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
        soundBuffers: { strong: null, weak: null, sub: null }
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
        if (this.currentSubdivision === 1) {
          soundBuffer = this.currentBeat === 1 ? this.soundBuffers.strong : this.soundBuffers.weak;
        } else {
          soundBuffer = this.soundBuffers.sub;
        }
  
        if (soundBuffer) this.playSound(soundBuffer, this.nextNoteTime);
  
        this.isBeating = true;
        setTimeout(() => this.isBeating = false, 100);
      },
      playSound(buffer, time) {
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        source.start(time);
      }
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
    width: 80px;
    height: 80px;
    background-color: grey;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: bold;
    color: white;
    transition: transform 0.1s ease, background-color 0.1s ease;
  }
  
  .beat {
    background-color: red;
    transform: scale(1.2);
  }
  
  .strong {
    background-color: blue;
  }
  
  .beat-number {
    font-size: 24px;
    font-weight: bold;
    color: white;
  }
  </style>
  