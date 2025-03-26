<script>
import { PitchDetector } from "pitchy"; // ✅ Correction ici

export default {
  data() {
    return {
      audioContext: null,
      analyser: null,
      buffer: new Float32Array(2048),
      detector: null,
      isListening: false,
      errorMessage: "",
      frequency: 0,
      note: "",
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

        // ✅ Initialisation correcte du détecteur Pitchy
        this.detector = PitchDetector.forFloat32Array(2048);

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
      if (!this.analyser || !this.detector) return;
      this.analyser.getFloatTimeDomainData(this.buffer);

      const [pitch, clarity] = this.detector.findPitch(this.buffer, this.audioContext.sampleRate);

      if (clarity > 0.9) { // Vérification du signal détecté
        this.frequency = pitch;
        this.identifyNote();
      }

      requestAnimationFrame(this.detectPitch);
    },

    identifyNote() {
      const notes = [
        { name: "E", frequency: 41.20 },
        { name: "A", frequency: 55.00 },
        { name: "D", frequency: 73.42 },
        { name: "G", frequency: 98.00 },
      ];

      let closestNote = null;
      let minDiff = Infinity;

      for (let note of notes) {
        let diff = Math.abs(this.frequency - note.frequency);
        if (diff < minDiff) {
          minDiff = diff;
          closestNote = note;
        }
      }

      if (closestNote) {
        this.note = closestNote.name;
      }
    },
  },
};
</script>

<template>
    <div class="tuner">
        <h1>Accordeur de Basse 🎸</h1>
        <p>Fréquence : <strong>{{ frequency ? frequency + " Hz" : "Écoute..." }}</strong></p>
        <p>Note détectée : <strong>{{ note }}</strong></p>
    </div>
</template>

<style scoped>
.tuner {
    text-align: center;
    font-family: Arial, sans-serif;
}
</style>
