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
  
          // ✅ Ajout d'un filtre passe-bas pour éliminer les hautes fréquences
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
  
        for (let i = 0; i < this.bufferLength; i++) {
          if (this.dataArray[i] > maxAmplitude) {
            maxAmplitude = this.dataArray[i];
            maxIndex = i;
          }
        }
  
        const nyquist = this.audioContext.sampleRate / 2;
        let detectedFreq = (maxIndex / this.bufferLength) * nyquist;
  
        // ✅ Éviter de capter les harmoniques (on ne garde que les fréquences basses)
        while (detectedFreq > 200) {
          detectedFreq /= 2;
        }
  
        this.frequency = detectedFreq;
  
        // Trouver la note la plus proche
        this.findClosestNote();
  
        // Relancer l'analyse
        requestAnimationFrame(this.detectFrequency);
      },
  
      findClosestNote() {
        let closestNote = null;
        let minDiff = Infinity;
  
        for (let note of this.notes) {
          let diff = Math.abs(note.frequency - this.frequency);
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
       
  