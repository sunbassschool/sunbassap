<template>
    <div class="floating-metronome">
      <button @click="showPanel = !metronome.showPanel" class="toggle-button">
        {{ showPanel ? '❌' : '🎵' }}
      </button>
  
      <div v-if="showPanel">
        <button @click="startMetronome">▶️</button>
        <button @click="stopMetronome">⏹️</button>
        <p>{{ isPlaying ? '🎶 En cours' : '⏸️ Arrêté' }} - {{ tempo }} BPM</p>
        <p>⏱️ Temps : {{ formattedTime }}</p>

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
  <div style="margin-top: 10px;">
  <label>Mesure :
    <select v-model="selectedMeter" @change="applyMeter">
      <option disabled value="">-- Choisir une mesure --</option>
      <option v-for="m in meterOptions" :key="m.label" :value="m.label">
        {{ m.label }}
      </option>
    </select>
  </label>
</div>

  <div style="margin-top: 10px;">
  <label>Swing :
    <input type="range" min="0" max="1" step="0.05" v-model="swingAmount" />
    {{ Math.round(swingAmount * 100) }}%
  </label>
</div>

</div>

      </div>
    </div>
  </template>
  
  <script>
  const baseUrl = import.meta.env.MODE === "development" ? "/" : "/app/";
  import { useMetronomeStore } from "@/stores/useMetronomeStore";

  export default {
    name: 'GlobalMetronome',
    data() {
      return {
        tempo: 100,
        elapsedTime: 0,
timerInterval: null,

        isPlaying: false,
        audioContext: null,
        nextNoteTime: 0,
     
        swingAmount: 0,
        selectedMeter: "4/4",
        meterOptions: [
  // ⬛ Simples (noires)
  { label: "2/4", measure: 2, subdivision: 1 },
  { label: "3/4", measure: 3, subdivision: 1 },
  { label: "4/4", measure: 4, subdivision: 1 },
  { label: "5/4", measure: 5, subdivision: 1 },
  { label: "6/4", measure: 6, subdivision: 1 },
  { label: "7/4", measure: 7, subdivision: 1 },
  { label: "9/4", measure: 9, subdivision: 1 },

  // 🟧 Composées (croches ternaires)
  { label: "5/8", measure: 5, subdivision: 1 }, // souvent irrégulier
  { label: "6/8", measure: 2, subdivision: 3 },
  { label: "7/8", measure: 7, subdivision: 1 }, // peut être irrégulier
  { label: "9/8", measure: 3, subdivision: 3 },
  { label: "12/8", measure: 4, subdivision: 3 }
]
,
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
    
    computed: {
  formattedTime() {
    const minutes = Math.floor(this.elapsedTime / 60);
    const seconds = this.elapsedTime % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }
},
mounted() {
  const savedTempo = localStorage.getItem("tempo");
  const savedStrong = localStorage.getItem("volumeStrong");
  const savedWeak = localStorage.getItem("volumeWeak");
  const savedSub = localStorage.getItem("volumeSub");
  const savedSwing = localStorage.getItem("swingAmount");
  const savedMeter = localStorage.getItem("selectedMeter");

  if (savedTempo) this.tempo = parseInt(savedTempo);
  if (savedStrong) this.volumeStrong = parseFloat(savedStrong);
  if (savedWeak) this.volumeWeak = parseFloat(savedWeak);
  if (savedSub) this.volumeSub = parseFloat(savedSub);
  if (savedSwing) this.swingAmount = parseFloat(savedSwing);
  if (savedMeter) {
    this.selectedMeter = savedMeter;
    this.applyMeter(); // ⬅️ pour appliquer mesure + subdivision
  }
}
,

watch: {
  tempo(val) {
    localStorage.setItem("tempo", val);
  },
  volumeStrong(val) {
    localStorage.setItem("volumeStrong", val);
  },
  volumeWeak(val) {
    localStorage.setItem("volumeWeak", val);
  },
  volumeSub(val) {
    localStorage.setItem("volumeSub", val);
  },
  swingAmount(val) {
    localStorage.setItem("swingAmount", val);
  },
  selectedMeter(val) {
    localStorage.setItem("selectedMeter", val);
  }
},


    methods: {
        startTimer() {
  this.elapsedTime = 0;
  this.timerInterval = setInterval(() => {
    this.elapsedTime++;
  }, 1000);
},

stopTimer() {
  clearInterval(this.timerInterval);
  this.timerInterval = null;
},

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
  this.startTimer(); // 👈 AJOUT ICI
}
,
  
stopMetronome() {
  this.isPlaying = false;
  clearInterval(this.beatInterval);
  this.stopTimer(); // 👈 AJOUT ICI
  this.currentBeat = 1;
  this.currentSubdivision = 1;
}
,
  
scheduleBeat() {
  const now = this.audioContext.currentTime;
  const beatDuration = 60.0 / this.tempo;
  const subDuration = beatDuration / this.subdivision;

  while (this.nextNoteTime < now + 0.1) {
    this.playClick(this.nextNoteTime); // 👈 PAS de swing ici
    this.nextNoteTime += subDuration;  // ⏱️ intervalle fixe
  }
}



,
playClick(time) {
  let soundBuffer = null;
  let volume = 0;
  const isFirstSub = this.currentSubdivision === 1;
  const isFirstBeat = this.currentBeat === 1;

  let swingDelay = 0;

  // 🌀 Appliquer swing seulement aux subdivisions paires
  if (this.subdivision > 1 && this.currentSubdivision % 2 === 0) {
    const beatDuration = 60.0 / this.tempo;
    const subDuration = beatDuration / this.subdivision;
    swingDelay = (this.swingAmount * subDuration) / 2;
  }

  if (isFirstSub) {
    if (isFirstBeat) {
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

  this.playSound(soundBuffer, time + swingDelay, volume); // ✅ Swing ici

  this.currentSubdivision++;
  if (this.currentSubdivision > this.subdivision) {
    this.currentSubdivision = 1;
    this.currentBeat = (this.currentBeat % this.measure) + 1;
  }
}


,
applyMeter() {
    const config = this.meterOptions.find(m => m.label === this.selectedMeter);
    if (config) {
      this.measure = config.measure;
      this.subdivision = config.subdivision;
      console.log(`🎯 Nouvelle mesure appliquée : ${this.selectedMeter} ➡️ ${this.measure} temps, subdivision ${this.subdivision}`);
    }
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
  