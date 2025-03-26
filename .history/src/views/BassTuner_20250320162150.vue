<template>
    <div class="tuner-container">
      <h2>Accordeur de Basse 🎸</h2>
      <button @click="startTuner">🎤 Activer le micro</button>
      
      <!-- Indicateur visuel -->
      <div class="status">
        <span 
          class="status-indicator" 
          :class="{ active: isListening, error: errorMessage }">
        </span>
        <p v-if="isListening" class="success">Micro activé ✅</p>
        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      </div>
  
      <!-- Fréquence détectée -->
      <div v-if="frequency > 0" class="frequency-display">
        <p>Fréquence détectée : <strong>{{ frequency.toFixed(2) }} Hz</strong></p>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    data() {
      return {
        audioContext: null,
        analyser: null,
        dataArray: null,
        bufferLength: 0,
        frequency: 0,
        isListening: false,
        errorMessage: "",
      };
    },
  
    methods: {
      async startTuner() {
        try {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Votre navigateur ne supporte pas l'accès au micro.");
          }
  
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const source = this.audioContext.createMediaStreamSource(stream);
  
          // Création de l'analyseur FFT
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 2048; // Taille de la FFT (plus grand = plus précis, mais plus lent)
          source.connect(this.analyser);
  
          this.bufferLength = this.analyser.frequencyBinCount;
          this.dataArray = new Float32Array(this.bufferLength);
  
          console.log("🎤 Micro activé et analyse du son en cours...");
          this.isListening = true;
          this.errorMessage = "";
  
          // Lancer l'analyse des fréquences
          this.detectFrequency();
        } catch (error) {
          this.errorMessage = "Erreur d'accès au micro : " + error.message;
          this.isListening = false;
          console.error("🚨 Erreur :", error);
        }
      },
  
      detectFrequency() {
        if (!this.analyser) return;
  
        this.analyser.getFloatFrequencyData(this.dataArray);
        
        let maxIndex = 0;
        let maxAmplitude = -Infinity;
  
        // Chercher la fréquence la plus forte dans le spectre
        for (let i = 0; i < this.bufferLength; i++) {
          if (this.dataArray[i] > maxAmplitude) {
            maxAmplitude = this.dataArray[i];
            maxIndex = i;
          }
        }
  
        // Convertir l'index en fréquence réelle
        const nyquist = this.audioContext.sampleRate / 2;
        this.frequency = (maxIndex / this.bufferLength) * nyquist;
  
        // Relancer la détection en boucle
        requestAnimationFrame(this.detectFrequency);
      }
    },
  };
  </script>
  
  <style scoped>
  .tuner-container {
    text-align: center;
    padding: 20px;
  }
  
  button {
    background-color: #ff6600;
    color: white;
    padding: 10px 15px;
    border: none;
    cursor: pointer;
    font-size: 18px;
    margin-bottom: 15px;
  }
  
  .status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }
  
  /* Indicateur visuel */
  .status-indicator {
    width: 15px;
    height: 15px;
    border-radius: 50%;
    background-color: gray;
    transition: background 0.3s ease;
  }
  
  .status-indicator.active {
    background-color: limegreen;
  }
  
  .status-indicator.error {
    background-color: red;
  }
  
  .success {
    color: green;
    font-weight: bold;
  }
  
  .error {
    color: red;
    font-weight: bold;
  }
  
  /* Affichage de la fréquence */
  .frequency-display {
    margin-top: 20px;
    font-size: 20px;
    font-weight: bold;
    color: #fff;
    background: #333;
    padding: 10px;
    border-radius: 8px;
    display: inline-block;
  }
  </style>
  