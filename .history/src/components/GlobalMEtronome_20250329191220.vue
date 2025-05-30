<template>
    <div class="floating-metronome">
      <button @click="metronome.showPanel = !metronome.showPanel" class="toggle-button">
        {{ metronome.showPanel ? '❌' : '🎵' }}
      </button>
  
      <div v-if="metronome.showPanel">
        <button @click="startMetronome">▶️</button>
        <button @click="stopMetronome">⏹️</button>
        <p>{{ isPlaying ? '🎶 En cours' : '⏸️ Arrêté' }} - {{ tempo }} BPM</p>
  
        <!-- BPM -->
        <label>BPM :
          <input 
            type="number" 
            v-model="tempo" 
            min="20" 
            max="300" 
            step="1" 
          />
        </label>
  
        <label>BPM :
          <input 
            type="range" 
            v-model="tempo" 
            min="20" 
            max="300" 
            step="1" 
          />
        </label>
        <p>⏱️ Temps : {{ formattedTime }}</p>
  
        <!-- Temps fort -->
        <label>Temps fort :
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            v-model="volumeStrong"
          />
        </label>
        <br />
  
        <!-- Temps faible -->
        <label>Temps faible :
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            v-model="volumeWeak"
          />
        </label>
        <br />
  
        <!-- Subdivision -->
        <label>Subdivision :
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            v-model="volumeSub"
          />
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
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                v-model="swingAmount"
              />
              {{ Math.round(swingAmount * 100) }}%
            </label>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import { useMetronomeStore } from "@/stores/useMetronomeStore";
  const baseUrl = import.meta.env.MODE === "development" ? "/" : "/app/";

  export default {
    name: 'GlobalMetronome',
    data() {
      return {
        elapsedTime: 0,
        timerInterval: null,
        isPlaying: false,
        audioContext: null,
        nextNoteTime: 0,
        swingAmount: 0,
        selectedMeter: "4/4",
        meterOptions: [
          { label: "2/4", measure: 2, subdivision: 1 },
          { label: "3/4", measure: 3, subdivision: 1 },
          { label: "4/4", measure: 4, subdivision: 1 },
          { label: "5/4", measure: 5, subdivision: 1 },
          { label: "6/4", measure: 6, subdivision: 1 },
          { label: "7/4", measure: 7, subdivision: 1 },
          { label: "9/4", measure: 9, subdivision: 1 },
          { label: "5/8", measure: 5, subdivision: 1 },
          { label: "6/8", measure: 2, subdivision: 3 },
          { label: "7/8", measure: 7, subdivision: 1 },
          { label: "9/8", measure: 3, subdivision: 3 },
          { label: "12/8", measure: 4, subdivision: 3 }
        ],
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
      metronome() {
        return useMetronomeStore(); // Expose le store dans le template
      },
      swingAmount: {
        get() {
          return this.metronome.swingAmount; // Lien avec la valeur du store Pinia
        },
        set(value) {
          this.metronome.setSwingAmount(value); // Met à jour la valeur dans le store
        }
      },
      tempo: {
        get() {
          return this.metronome.tempo;
        },
        set(val) {
          this.metronome.setTempo(val);
        }
      },
      volumeStrong: {
        get() {
          return this.metronome.volumeStrong; // Liaison du fader avec le store
        },
        set(val) {
          this.metronome.setVolumeStrong(val);
        }
      },
      volumeWeak: {
        get() {
          return this.metronome.volumeWeak; // Liaison du fader avec le store
        },
        set(val) {
          this.metronome.setVolumeWeak(val);
        }
      },
      volumeSub: {
        get() {
          return this.metronome.volumeSub; // Liaison du fader avec le store
        },
        set(val) {
          this.metronome.setVolumeSub(val);
        }
      },
      accentuateFirstBeat: {
        get() {
          return !this.metronome.disableStrongBeat; // Liaison du fader avec le store
        },
        set(val) {
          this.metronome.setAccentuateFirstBeat(val);
        }
      },
      subdivision: {
  get() {
    return this.metronome.subdivision;
  },
  set(val) {
    this.metronome.setSubdivision(val);
  }
}
,
    },
  
    watch: {
      tempo(val) {
        localStorage.setItem("tempo", val);
      },
      volumeStrong(val) {
        localStorage.setItem("volumeStrong", val);
        this.metronome.setVolumeStrong(val);
      },
      volumeWeak(val) {
        localStorage.setItem("volumeWeak", val);
        this.metronome.setVolumeWeak(val);
      },
      volumeSub(val) {
        localStorage.setItem("volumeSub", val);
        this.metronome.setVolumeSub(val);
      },
      swingAmount(val) {
        localStorage.setItem("swingAmount", val);
        this.metronome.setSwingAmount(val);
      },
    },
  
    methods: {
      startMetronome() {
        this.initAudioContext();
        this.metronome.isPlaying = true;
  
        this.isPlaying = true;
        this.nextNoteTime = this.audioContext.currentTime + 0.1;
        this.currentBeat = 1;
        this.beatInterval = setInterval(this.scheduleBeat, 25);
        this.startTimer();
      },
  playClick(time) {
    let soundBuffer = this.soundBuffers.sub;
    let volume = this.volumeSub; // Applique le volume de la subdivision par défaut

    const isFirstSub = this.currentSubdivision === 1;
    const isFirstBeat = this.currentBeat === 1;

    let swingDelay = 0; // Variable pour l'effet swing

    // Vérifier si on est sur une subdivision
    if (this.subdivision > 1 && this.currentSubdivision % 2 === 0) {
        // Appliquer l'effet swing uniquement sur les subdivisions paires
        const beatDuration = 60.0 / this.tempo;
        const subDuration = beatDuration / this.subdivision;
        swingDelay = (this.swingAmount * subDuration) / 2; // Calcul du délai de swing
    }

    // Si on est sur le premier beat ou le premier temps fort
    if (isFirstSub) {
        if (isFirstBeat) {
            soundBuffer = this.soundBuffers.strong;
            volume = this.volumeStrong;  // Utiliser le volume du temps fort
        } else {
            soundBuffer = this.soundBuffers.weak;
            volume = this.volumeWeak;  // Utiliser le volume du temps faible
        }
    } else {
        soundBuffer = this.soundBuffers.sub;
        volume = this.volumeSub;  // Appliquer le volume de subdivision
    }

    // Lire le son avec les paramètres actuels
    this.playSound(soundBuffer, time + swingDelay, volume);

    // Augmenter la subdivision et la gestion du beat
    this.currentSubdivision++;
    if (this.currentSubdivision > this.subdivision) {
        this.currentSubdivision = 1;
        this.currentBeat = (this.currentBeat % this.measure) + 1;
    }
}
      stopMetronome() {
        this.metronome.isPlaying = false;
        this.isPlaying = false;
  
        clearInterval(this.beatInterval);
        this.stopTimer();
        this.currentBeat = 1;
        this.currentSubdivision = 1;
      },
  
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
      
      applyMeter() {
        const config = this.meterOptions.find(m => m.label === this.selectedMeter);
        if (config) {
          this.measure = config.measure;
          this.subdivision = config.subdivision;
          console.log(`🎯 Nouvelle mesure appliquée : ${this.selectedMeter} ➡️ ${this.measure} temps, subdivision ${this.subdivision}`);
        }
      },
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
  