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
        tuningStatus: "", // "in-tune", "flat", "sharp"
        tuningMessage: "",
        isListening: false,
        errorMessage: "",
  
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
  
          // Ajout d'un filtre passe-bas pour éliminer les hautes fréquences
          const biquadFilter = this.audioContext.createBiquadFilter();
          biquadFilter.type = "lowpass";
          biquadFilter.frequency.value = 200; // On garde que les basses fréquences
          source.connect(biquadFilter);
  
          // Création de l'analyseur FFT
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 4096; // FFT plus grande pour meilleure précision
          biquadFilter.connect(this.analyser);
  
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

  // Recherche de la fréquence avec l'amplitude la plus élevée
  for (let i = 0; i < this.bufferLength; i++) {
    if (this.dataArray[i] > maxAmplitude) {
      maxAmplitude = this.dataArray[i];
      maxIndex = i;
    }
  }

  const nyquist = this.audioContext.sampleRate / 2;
  let detectedFreq = (maxIndex / this.bufferLength) * nyquist;

  // Limiter la fréquence à une plage raisonnable (éviter les harmoniques trop élevées)
  while (detectedFreq > 200) {
    detectedFreq /= 2; // Divise jusqu'à obtenir une fréquence plausible
  }

  // Tolérance pour les notes
  const tolerance = 2; // Tolérance de 2 Hz pour éviter les fluctuations entre notes

  // Liste des notes fondamentales
  const notes = [
    { name: 'E', frequency: 41.2 },
    { name: 'A', frequency: 55.0 },
    { name: 'D', frequency: 73.42 },
    { name: 'G', frequency: 98.0 }
  ];

  let closestNote = null;

  // Diviser la fréquence par deux jusqu'à ce qu'elle soit dans la plage des fréquences fondamentales
  while (detectedFreq > 10) { // On arrête de diviser si la fréquence devient trop basse
    for (let note of notes) {
      if (Math.abs(detectedFreq - note.frequency) <= tolerance) {
        closestNote = note;
        break;
      }
      // Vérification spécifique pour la corde Ré (D)
      if (note.name === 'D' && Math.abs(detectedFreq - note.frequency * 2) <= tolerance) {
        detectedFreq = note.frequency; // Divise la fréquence par 2 pour revenir à la fondamentale de Ré
        closestNote = note;
        break;
      }
    }

    if (closestNote) break;

    detectedFreq /= 2; // Diviser encore si aucune note n'est trouvée
  }

  // Si une note est trouvée
  if (closestNote) {
    this.note = closestNote.name;
    this.frequency = detectedFreq;
    this.checkTuning(closestNote.frequency);
  } else {
    // Si aucune note n'est trouvée
    this.note = "Aucune note détectée";
    this.frequency = detectedFreq;
    this.tuningStatus = "error";
    this.tuningMessage = "Aucune correspondance";
  }

  requestAnimationFrame(this.detectFrequency);
},

checkTuning(referenceFreq) {
  const tolerance = 1.5; // Tolérance en Hz

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
  