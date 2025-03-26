<template>
    <Layout>
      <div class="metronome-container">
        
        <!-- Seconde card : Boutons de pulsation et de contrôle (Play/Pause) -->
        <div class="control-card">
          <div class="card-header">
            <div class="control-group">
              <label><span>{{ tempo }}</span> BPM</label>
              <div class="tempo-control">
                <button @click="decreaseTempo" class="tempo-arrow">
                  &#8592; <!-- Flèche gauche -->
                </button>
                <input type="range" v-model="tempo" min="40" max="240" step="1">
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
              <p>{{ formattedTime }}</p>
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
                <div class="slider-group">
                  <label>Clic :</label>
                  <input type="range" v-model="volumeStrong" min="0" max="1" step="0.01">
                </div>
  
                <div class="slider-group">
                  <label>Pulsation : </label>
                  <input type="range" v-model="volumeWeak" min="0" max="1" step="0.01">
                </div>
  
                <div class="slider-group">
                  <label>Débit : </label>
                  <input type="range" v-model="volumeSub" min="0" max="1" step="0.01">
                </div>
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
        currentBeat: 1,
        currentSubdivision: 0,
        isBeating: false,
        interval: null,
        soundBuffers: { strong: null, weak: null, sub: null },
        volumeStrong: localStorage.getItem("volumeStrong") || 1,
        volumeWeak: localStorage.getItem("volumeWeak") || 0.7,
        volumeSub: localStorage.getItem("volumeSub") || 0.5,
        subdivisions: [
          { value: 1, label: '', icon: '/assets/icons/quarter-note.png' },  
          { value: 2, label: '', icon: '/assets/icons/eighth-note.png' },   
          { value: 3, label: '', icon: '/assets/icons/triplet.png' },      
          { value: 4, label: '', icon: '/assets/icons/sixteenth-note.png' } 
        ],
        elapsedTime: 0,   // Nouveau timer pour suivre le temps
        timerInterval: null  // Pour gérer le timer
      };
    },
    computed: {
      formattedTime() {
        const minutes = Math.floor(this.elapsedTime / 60);
        const seconds = this.elapsedTime % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
      }
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
          this.currentBeat = 1;
          this.currentSubdivision = 0;
          this.scheduleNextBeat();
          this.startTimer();  // Démarrer le timer lorsque le métronome commence
        }
      },
      stopMetronome() {
        this.isPlaying = false;
        clearTimeout(this.interval);
        this.stopTimer();  // Mettre le timer en pause
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
      },
      increaseTempo() {
        if (this.tempo < 240) {
          this.tempo++;
        }
      },
      decreaseTempo() {
        if (this.tempo > 40) {
          this.tempo--;
        }
      },
      selectSubdivision(value) {
        this.subdivision = value;
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
  /* Ajout du style pour le timer */
  .timer p {
    font-size: 1.5rem;
    color: #fff;
    font-weight: bold;
  }
  </style>
  