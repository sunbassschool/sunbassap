<template>
    <Layout>
      <div class="tuner-container">
        <h1>Accordeur de Basse 🎸</h1>
  
        <!-- Affichage de la note détectée -->
        <div class="note-display">
          <span class="note">{{ note }}</span>
        </div>
  
        <!-- Barre d'accordage dynamique -->
        <div class="tuning-meter">
          <div class="bar-container">
            <div 
              class="bar" 
              :style="{ left: `${barPosition}%`, backgroundColor: barColor }"
            ></div>
          </div>
          <p class="indicator-text">Trop bas ⬅️ | 🎯 Accordé | ⬆️ Trop haut</p>
        </div>
  
        <!-- Fréquence détectée -->
        <p class="frequency">Fréquence : <strong>{{ frequency }} Hz</strong></p>
  
        <!-- Boutons de contrôle -->
        <div class="control-buttons">
          <button @click="startTuner" :disabled="isListening" class="start-button">
            🎤 Démarrer
          </button>
          <button @click="stopTuner" :disabled="!isListening" class="stop-button">
            🛑 Arrêter
          </button>
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
        isListening: false,
        errorMessage: "",
        frequency: 0,
        note: "🎸 Écoute...",
        stream: null,
        barPosition: 50, // Position de l'indicateur
        barColor: "yellow", // Couleur de l'indicateur
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
  
          this.isListening = true;
          this.errorMessage = "";
          this.detectPitch();
        } catch (error) {
          this.errorMessage = "Erreur d'accès au micro : " + error.message;
          this.isListening = false;
          console.error("🚨 Erreur :", error);
        }
      },
  
      detectPitch() {
        if (!this.isListening || !this.analyser || !this.detector) return;
  
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
    { name: "B", frequency: 30.87 }, // B grave (Si)
    { name: "E", frequency: 41.20 }, // E standard (Mi)
    { name: "A", frequency: 55.00 }, // A standard (La)
    { name: "D", frequency: 73.42 }, // D standard (Ré)
    { name: "G", frequency: 98.00 }, // G standard (Sol)
  ];

  let closestNote = notes.reduce((prev, curr) =>
    Math.abs(curr.frequency - freq) < Math.abs(prev.frequency - freq) ? curr : prev
  );

  this.note = closestNote.name;

  // 🔥 Calcul du décalage par rapport à la fréquence idéale
  const deviation = freq - closestNote.frequency;
  const maxDeviation = 5; // Plage de tolérance

  this.barPosition = 50 + (deviation / maxDeviation) * 50;
  this.barPosition = Math.min(100, Math.max(0, this.barPosition)); // Clamp entre 0 et 100%

  // 🎨 Gestion des couleurs
  if (Math.abs(deviation) < 0.5) {
    this.barColor = "green"; // ✅ Accordé
  } else if (Math.abs(deviation) < 2) {
    this.barColor = "yellow"; // 🟡 Presque
  } else {
    this.barColor = "red"; // ❌ Trop bas/haut
  }
}
,
  
      stopTuner() {
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
        }
        if (this.audioContext) {
          this.audioContext.close();
        }
        this.isListening = false;
      },
    },
  
    beforeUnmount() {
      this.stopTuner();
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
    width: 80%;
    height: 15px;
    background: #222;
    border-radius: 10px;
    position: relative;
    margin: 0 auto;
    overflow: hidden;
  }
  
  .bar {
    width: 15px;
    height: 100%;
    position: absolute;
    transition: left 0.2s ease-out, background-color 0.3s;
    border-radius: 5px;
  }
  
  .indicator-text {
    font-size: 0.9rem;
    margin-top: 5px;
  }
  
  .frequency {
    font-size: 1.2rem;
  }
  
  .control-buttons {
    margin-top: 20px;
  }
  
  .start-button, .stop-button {
    padding: 10px 15px;
    font-size: 18px;
    border-radius: 5px;
    cursor: pointer;
  }
  
  .start-button {
    background: green;
    color: white;
  }
  
  .stop-button {
    background: red;
    color: white;
  }
  
  .error {
    color: red;
    font-weight: bold;
  }
  </style>
  