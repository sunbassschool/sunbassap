<template>
    <div class="floating-metronome">
      <button @click="startMetronome">▶️</button>
      <button @click="stopMetronome">⏹️</button>
      <div style="margin-top: 10px;">
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
</div>
      <p>{{ isPlaying ? '🎶 En cours' : '⏸️ Arrêté' }} - {{ tempo }} BPM</p>
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
  
        while (this.nextNoteTime < now + 0.1) {
          this.playClick(this.nextNoteTime);
          this.nextNoteTime += beatDuration;
        }
      },
  
      playClick(time) {
        const beatNum = this.currentBeat;
  
        let soundBuffer, volume;

if (this.subdivision === 1 || this.currentSubdivision === 1) {
  if (beatNum === 1) {
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

  
        this.playSound(soundBuffer, time, volume);
  
        // incrémenter la mesure
        this.currentBeat = (this.currentBeat % this.measure) + 1;
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
  