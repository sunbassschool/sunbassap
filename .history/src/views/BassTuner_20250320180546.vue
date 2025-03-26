<template>
    <div class="tuner-container">
      <h2>Accordeur de Basse 🎸</h2>
      <button @click="startTuner">🎤 Activer le micro</button>
  
      <!-- Indicateur visuel -->
      <div class="status">
        <span class="status-indicator" :class="{ active: isListening, error: errorMessage }"></span>
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
        buffer: null,
        isListening: false,
        errorMessage: "",
        frequency: 0,
        note: "",
        tuningStatus: "",
        tuningMessage: "",
        smoothingFactor: 0.8, // Filtrage des variations de fréquence
  
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
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 2048;
          source.connect(this.analyser);
  
          this.buffer = new Float32Array(this.analyser.fftSize);
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
        if (!this.analyser) return;
        this.analyser.getFloatTimeDomainData(this.buffer);
  
        const frequency = this.autoCorrelate(this.buffer, this.audioContext.sampleRate);
        if (frequency !== -1) {
          this.frequency = this.smoothingFactor * this.frequency + (1 - this.smoothingFactor) * frequency;
          this.identifyNote();
        }
  
        requestAnimationFrame(this.detectPitch);
      },
  
      autoCorrelate(buffer, sampleRate) {
        let SIZE = buffer.length;
        let bestOffset = -1;
        let bestCorrelation = 0;
        let rms = 0;
  
        for (let i = 0; i < SIZE; i++) {
          rms += buffer[i] * buffer[i];
        }
        rms = Math.sqrt(rms / SIZE);
        if (rms < 0.01) return -1; // Trop de bruit
  
        let lastCorrelation = 1;
        for (let offset = 0; offset < SIZE / 2; offset++) {
          let correlation = 0;
          for (let i = 0; i < SIZE / 2; i++) {
            correlation += buffer[i] * buffer[i + offset];
          }
          correlation = correlation / (SIZE / 2);
  
          if (correlation > 0.9 && correlation > lastCorrelation) {
            bestCorrelation = correlation;
            bestOffset = offset;
          }
          lastCorrelation = correlation;
        }
  
        if (bestCorrelation > 0.9) {
          let frequency = sampleRate / bestOffset;
          return frequency;
        }
        return -1;
      },
  
      identifyNote() {
        let closestNote = null;
        let minDiff = Infinity;
  
        for (let note of this.notes) {
          let diff = Math.abs(this.frequency - note.frequency);
          if (diff < minDiff) {
            minDiff = diff;
            closestNote = note;
          }
        }
  
        if (closestNote) {
          this.note = closestNote.name;
          this.checkTuning(closestNote.frequency);
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
  
  .tuning-indicator {
    margin-top: 10px;
    font-size: 18px;
    font-weight: bold;
  }
  
  .in-tune {
    color: limegreen;
  }
  
  .flat {
    color: orange;
  }
  
  .sharp {
    color: red;
  }
  </style>
  