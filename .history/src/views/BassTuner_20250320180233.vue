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
  
      <!-- Affichage de la note détectée -->
      <div v-if="note" class="note-display">
        <p>Note détectée : <strong>{{ note }}</strong></p>
        <p>Fréquence : <strong>{{ frequency.toFixed(2) }} Hz</strong></p>
  
        <!-- Indicateur de justesse -->
        <div class="tuning-indicator">
          <span :class="tuningStatus">{{ tuningMessage }}</span>
        </div>
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
        note: "",
        tuningStatus: "", 
        tuningMessage: "",
        isListening: false,
        errorMessage: "",
        currentNote: null,
        lastFrequency: null,
        lastDetectedNote: null,
        lastNoteTime: 0, 
        stableFrequencyCounter: 0,
        lastUpdateTime: 0,
  
        // Fréquences des notes de basse standard (E, A, D, G)
        notes: [
          { name: "E", frequency: 41.20 },
          { name: "A", frequency: 55.00 },
          { name: "D", frequency: 73.42 },
          { name: "G", frequency: 98.00 },
        ],
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
  
          const biquadFilter = this.audioContext.createBiquadFilter();
          biquadFilter.type = "lowpass";
          biquadFilter.frequency.value = 150;
          source.connect(biquadFilter);
  
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 4096;
          biquadFilter.connect(this.analyser);
  
          this.bufferLength = this.analyser.frequencyBinCount;
          this.dataArray = new Float32Array(this.bufferLength);
  
          console.log("🎤 Micro activé et analyse du son en cours...");
          this.isListening = true;
          this.errorMessage = "";
  
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
  
        for (let i = 0; i < this.bufferLength; i++) {
          if (this.dataArray[i] > maxAmplitude) {
            maxAmplitude = this.dataArray[i];
            maxIndex = i;
          }
        }
  
        const nyquist = this.audioContext.sampleRate / 2;
        let detectedFreq = (maxIndex / this.bufferLength) * nyquist;
  
        while (detectedFreq > 200) {
          detectedFreq /= 2;
        }
  
        let closestNote = null;
        const tolerance = 3; 
  
        for (let note of this.notes) {
          if (Math.abs(detectedFreq - note.frequency) <= tolerance) {
            closestNote = note;
            break;
          }
  
          if (Math.abs(detectedFreq - note.frequency * 2) <= tolerance) {
            detectedFreq = note.frequency;
            closestNote = note;
            break;
          }
          if (Math.abs(detectedFreq - note.frequency * 3) <= tolerance) {
            detectedFreq = note.frequency;
            closestNote = note;
            break;
          }
        }
  
        // ✅ Correction spéciale : empêcher un switch immédiat vers 55 Hz après D
        if (this.lastDetectedNote === "D" && detectedFreq === 55.00) {
          return;
        }
  
        // ✅ Ajouter une vérification de stabilité (évite les fausses détections)
        if (closestNote) {
          if (closestNote.name !== this.lastDetectedNote) {
            this.stableFrequencyCounter = 0; 
          }
  
          this.stableFrequencyCounter++;
  
          if (this.stableFrequencyCounter >= 3) { 
            this.lastFrequency = detectedFreq;
            this.currentNote = closestNote.name;
            this.lastDetectedNote = closestNote.name;
            this.lastNoteTime = Date.now();
            this.note = closestNote.name;
            this.frequency = detectedFreq;
            this.checkTuning(closestNote.frequency);
          }
        } else {
          if (this.lastDetectedNote === "D" && Date.now() - this.lastNoteTime < 500) {
            return;
          }
  
          this.note = "Aucune note détectée";
          this.tuningStatus = "error";
          this.tuningMessage = "Aucune correspondance";
        }
  
        if (Date.now() - this.lastUpdateTime > 50) {
          requestAnimationFrame(this.detectFrequency);
        }
      },
  
      checkTuning(referenceFreq) {
        const tolerance = 1.5;
  
        if (Math.abs(this.frequency - referenceFreq) < tolerance) {
          this.tuningStatus = "in-tune";
          this.tuningMessage = "🎯 Accordé";
        } else if (this.frequency < referenceFreq) {
          this.tuningStatus = "flat";
          this.tuningMessage = "⬇️ Trop bas";
        } else {
          this.tuningStatus = "sharp";
          this.tuningMessage = "⬆️ Trop haut";
        }
      },
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
  
  /* Affichage de la note */
  .note-display {
    margin-top: 20px;
    font-size: 20px;
    font-weight: bold;
    color: #fff;
    background: #333;
    padding: 10px;
    border-radius: 8px;
    display: inline-block;
  }
  
  /* Indicateur d'accordage */
  .tuning-indicator {
    margin-top: 10px;
    font-size: 18px;
    font-weight: bold;
  }
  
  .tuning-indicator .in-tune {
    color: limegreen;
  }
  
  .tuning-indicator .flat {
    color: orange;
  }
  
  .tuning-indicator .sharp {
    color: red;
  }
  </style>
  