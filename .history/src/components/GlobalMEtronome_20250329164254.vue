<template>
    <div class="floating-metronome">
      <button @click="showPanel = !showPanel" class="toggle-button">
        {{ showPanel ? '❌' : '🎵' }}
      </button>
  
      <div v-if="showPanel">
        <button @click="startMetronome">▶️</button>
        <button @click="stopMetronome">⏹️</button>
        <p>{{ isPlaying ? '🎶 En cours' : '⏸️ Arrêté' }} - {{ tempo }} BPM</p>
  
        <label>Temps fort :
          <input type="range" min="0" max="1" step="0.01" v-model="volumeStrong" />
        </label>
        <br />
        <label>Temps faible :
          <input type="range" min="0" max="1" step="0.01" v-model="volumeWeak" />
        </label>
        <br />
        <label>Subdivision :
          <input type="range" min="0" max="1" step="0.01" v-model="volumeSub" />
        </label>
        <div style="margin-top: 10px;">
  <label>Subdivision :
    <select v-model="subdivision">
      <option :value="1">1 (Noires)</option>
      <option :value="2">2 (Croches)</option>
      <option :value="3">3 (Triolets)</option>
      <option :value="4">4 (Double-croches)</option>
    </select>
  </label>
</div>

      </div>
    </div>
  </template>
  
  <script>
  const baseUrl = import.meta.env.MODE === "development" ? "/" : "/app/";
  
  export default {
    name: 'GlobalMetronome',
    data() {
      return {
        tempo: 100,
        isPlaying: false,
        audioContext: null,
        nextNoteTime: 0,
        showPanel: false,

        beatInterval: null,
        soundBuffers: {
          strong: null,
          weak: null,
          sub: null
        },
        volumeStrong: 0.5,
        volumeWeak: 0.5,
        volumeSub: 0.5,
        currentBeat: 1,
        currentSubdivision: 1,
        measure: 4,
        subdivision: 1
      };
    },
    methods: {
      async initAudioContext() {
        if (!this.audioContext) {
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
          await this.loadSounds();
        }
      },
  
      async loadSounds() {
        const soundUrls = {
          strong: `${baseUrl}assets/audio/strong-beat.wav`,
          weak: `${baseUrl}assets/audio/weak-beat.wav`,
          sub: `${baseUrl}assets/audio/subdivision.wav`
        };
  
        const soundPromises = Object.entries(soundUrls).map(async ([key, url]) => {
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          this.soundBuffers[key] = await this.audioContext.decodeAudioData(arrayBuffer);
        });
  
        await Promise.all(soundPromises);
        console.log("🎵 Sons chargés !");
      },
  
      startMetronome() {
        this.initAudioContext();
        this.isPlaying = true;
        this.nextNoteTime = this.audioContext.currentTime + 0.1;
        this.currentBeat = 1;
        this.beatInterval = setInterval(this.scheduleBeat, 25);
      },
  
      stopMetronome() {
        this.isPlaying = false;
        clearInterval(this.beatInterval);
      },
  
      scheduleBeat() {
  const now = this.audioContext.currentTime;
  const beatDuration = 60.0 / this.tempo;
  const subDuration = beatDuration / this.subdivision;

  while (this.nextNoteTime < now + 0.1) {
    this.playClick(this.nextNoteTime);
    this.nextNoteTime += subDuration;
  }
}

,
  
playClick(time) {
  let soundBuffer = null;
  let volume = 0;

  const isFirstSub = this.currentSubdivision === 1;

  if (isFirstSub) {
    // 🔊 Début d'un nouveau temps
    if (this.currentBeat === 1) {
      soundBuffer = this.soundBuffers.strong;
      volume = this.volumeStrong;
    } else {
      soundBuffer = this.soundBuffers.weak;
      volume = this.volumeWeak;
    }
  } else {
    // 🌀 Subdivision
    soundBuffer = this.soundBuffers.sub;
    volume = this.volumeSub;
  }

  this.playSound(soundBuffer, time, volume);

  // Avance subdivisions et mesure
  this.currentSubdivision++;
  if (this.currentSubdivision > this.subdivision) {
    this.currentSubdivision = 1;
    this.currentBeat = (this.currentBeat % this.measure) + 1;
  }
}
,
  
      playSound(buffer, time, volumeLevel) {
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = volumeLevel;
  
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        source.start(time);
      }
    }
  };
  </script>
  
  
  <style scoped>
  .floating-metronome {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #222;
    border: 2px solid #a74c28;
    padding: 16px;
    border-radius: 8px;
    z-index: 1000;
    color: white;
  }
  </style>
  