<script>
import { PitchDetector } from "pitchy";

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
      note: "🎸 Écoute...",
      stream: null, // Pour stopper proprement
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

        // ✅ Création correcte du détecteur
        this.detector = PitchDetector.forFloat32Array(this.analyser.fftSize);

        this.isListening = true;
        this.errorMessage = "";
        this.detectPitch(); // 🔥 Lancer l’analyse en continu !
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

      if (clarity > 0.9) { // Vérification du signal détecté
        this.frequency = pitch.toFixed(2);
        this.note = this.identifyNote(pitch);
      }

      requestAnimationFrame(() => this.detectPitch()); // 🔥 Boucle continue pour analyser le son
    },

    identifyNote(freq) {
      const notes = [
        { name: "E", frequency: 41.20 },
        { name: "A", frequency: 55.00 },
        { name: "D", frequency: 73.42 },
        { name: "G", frequency: 98.00 },
      ];

      let closestNote = notes.reduce((prev, curr) =>
        Math.abs(curr.frequency - freq) < Math.abs(prev.frequency - freq) ? curr : prev
      );

      return closestNote.name;
    },

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
    this.stopTuner(); // Nettoyage du micro quand on quitte la page
  },
};
</script>

<template>
    <div class="tuner">
        <h1>Accordeur de Basse 🎸</h1>
        <p>Fréquence : <strong>{{ frequency ? frequency + " Hz" : "Écoute..." }}</strong></p>
        <p>Note détectée : <strong>{{ note }}</strong></p>
        <button @click="startTuner" :disabled="isListening">🎤 Démarrer</button>
        <button @click="stopTuner" :disabled="!isListening">🛑 Arrêter</button>
        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </div>
</template>

<style scoped>
.tuner {
    text-align: center;
    font-family: Arial, sans-serif;
}
button {
    margin: 10px;
    padding: 8px 16px;
    font-size: 16px;
    cursor: pointer;
}
.error {
    color: red;
    font-weight: bold;
}
</style>
