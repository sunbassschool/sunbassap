<template>
    <Layout>
      <div class="tuner-container">
        <h1>Accordeur de Basse 🎸</h1>
  
        <!-- Affichage de la note détectée -->
        <div class="note-display">
          <span class="note">{{ note }}</span>
        </div>
  
        <!-- Barre d'accordage style VU-mètre -->
        <div class="tuning-meter">
          <div class="bar-container">
            <div 
              v-for="(color, index) in meterColors" 
              :key="index"
              class="meter-segment"
              :style="{ backgroundColor: color, boxShadow: getGlow(color) }"
            ></div>
          </div>
          <div class="marker" :style="{ left: `${barPosition}%` }"></div>
        </div>
  
        <!-- Message d'erreur -->
        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      </div>
    </Layout>
  </template>
  
  <script>
  import Layout from "@/views/Layout.vue";
  import { PitchDetector } from "pitchy";
  
  export default {
    components: { Layout },
  
    data() {
      return {
        audioContext: null,
        analyser: null,
        buffer: new Float32Array(2048),
        detector: null,
        errorMessage: "",
        frequency: 0,
        note: "🎸 Écoute...",
        stream: null,
        barPosition: 50, // Position de l'indicateur
        meterColors: ["red", "red", "yellow", "green", "green", "green", "yellow", "red", "red"], // LED Segments
      };
    },
  
    methods: {
      async startTuner() {
        try {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Votre navigateur ne supporte pas l'accès au micro.");
          }
  
          this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const source = this.audioContext.createMediaStreamSource(this.stream);
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 2048;
          source.connect(this.analyser);
  
          this.detector = PitchDetector.forFloat32Array(this.analyser.fftSize);
  
          this.errorMessage = "";
          this.detectPitch();
        } catch (error) {
          this.errorMessage = "Erreur d'accès au micro : " + error.message;
          console.error("🚨 Erreur :", error);
        }
      },
  
      detectPitch() {
        if (!this.analyser || !this.detector) return;
  
        this.analyser.getFloatTimeDomainData(this.buffer);
  
        const [pitch, clarity] = this.detector.findPitch(this.buffer, this.audioContext.sampleRate);
  
        if (clarity > 0.9) { 
          this.frequency = pitch.toFixed(2);
          this.updateTuner(pitch);
        }
  
        requestAnimationFrame(() => this.detectPitch());
      },
  
      updateTuner(freq) {
        const notes = [
          { name: "B", frequency: 30.87 },
          { name: "E", frequency: 41.20 },
          { name: "A", frequency: 55.00 },
          { name: "D", frequency: 73.42 },
          { name: "G", frequency: 98.00 },
        ];
  
        let closestNote = notes.reduce((prev, curr) =>
          Math.abs(curr.frequency - freq) < Math.abs(prev.frequency - freq) ? curr : prev
        );
  
        this.note = closestNote.name;
  
        const deviation = freq - closestNote.frequency;
        const maxDeviation = 5;
  
        this.barPosition = 50 + (deviation / maxDeviation) * 50;
        this.barPosition = Math.min(100, Math.max(0, this.barPosition));
      },
  
      getGlow(color) {
        if (color === "green") return "0px 0px 10px lime";
        if (color === "yellow") return "0px 0px 8px gold";
        if (color === "red") return "0px 0px 8px red";
        return "none";
      },
  
      stopTuner() {
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
        }
        if (this.audioContext) {
          this.audioContext.close();
        }
      },
    },
  
    mounted() {
      this.startTuner(); // 🚀 Démarrer l’accordeur automatiquement
    },
  
    beforeUnmount() {
      this.stopTuner(); // 🔴 Arrêter proprement
    },
  };
  </script>
  
  <style scoped>
  .tuner-container {
    text-align: center;
    font-family: Arial, sans-serif;
    padding: 20px;
    color: white;
  }
  
  .note-display {
    font-size: 2.5rem;
    font-weight: bold;
    margin-bottom: 10px;
    color: #fff;
  }
  
  .tuning-meter {
    margin: 20px auto;
    text-align: center;
  }
  
  .bar-container {
    display: flex;
    justify-content: center;
    width: 80%;
    height: 25px;
    background: #111;
    border-radius: 10px;
    position: relative;
    margin: 0 auto;
    padding: 3px;
  }
  
  .meter-segment {
    flex: 1;
    height: 100%;
    margin: 0 2px;
    border-radius: 5px;
    transition: background-color 0.2s ease-out, box-shadow 0.2s;
  }
  
  .marker {
    width: 8px;
    height: 40px;
    background: white;
    position: absolute;
    top: -10px;
    border-radius: 5px;
    transition: left 0.2s ease-out;
  }
  
  .error {
    color: red;
    font-weight: bold;
  }
  </style>
  