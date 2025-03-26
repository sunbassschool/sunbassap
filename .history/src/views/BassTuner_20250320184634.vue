<template>
    <Layout>
      <div class="tuner-container">
        <h1>Accordeur de Basse 🎸</h1>
  
        <!-- Affichage de la note détectée -->
        <div class="note-display">
          <span class="note">{{ note }}</span>
        </div>
  
        <!-- Barre d'accordage style VU-mètre avec cadre -->
        <div class="tuning-meter">
          <div class="bar-frame">
            <div class="bar-container">
              <div class="center-marker"></div> <!-- Marqueur central -->
              <div 
                v-for="(color, index) in meterColors" 
                :key="index"
                class="meter-segment"
                :style="{ backgroundColor: color, boxShadow: getGlow(color) }"
              ></div>
              <div 
                class="marker" 
                :style="{ 
                  left: `${barPosition}%`, 
                  backgroundColor: isPerfectTune ? 'lime' : 'white',
                  boxShadow: isPerfectTune ? '0px 0px 15px lime' : '0px 0px 10px white' 
                }"
              ></div>
            </div>
          </div>
        </div>
  
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
        barPosition: 50, // Position du curseur
        isPerfectTune: false, // État du curseur
        meterColors: ["#882222", "#AA4444", "#CCAA44", "#44AA44", "#44CC44", "#44AA44", "#CCAA44", "#AA4444", "#882222"], // LED Segments
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
  
        // 🎯 Si la note est parfaitement accordée, le curseur devient vert
        this.isPerfectTune = Math.abs(deviation) < 0.5;
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

/* 📌 Nouveau cadre pour la barre LED */
.bar-frame {
  background: linear-gradient(180deg, #444, #222);
  border: 3px solid #888;
  border-radius: 12px;
  padding: 5px;
  box-shadow: inset 0px 2px 8px rgba(0, 0, 0, 0.6), 0px 2px 4px rgba(255, 255, 255, 0.2);
  display: inline-block;
  max-width: 90%; /* ✅ Ajustement pour mobile */
}

.bar-container {
  display: flex;
  justify-content: center;
  width: 60vw; /* ✅ Au lieu d'une largeur fixe */
  max-width: 500px; /* ✅ Empêcher d’être trop grand sur desktop */
  height: 25px;
  background: #111;
  border-radius: 10px;
  position: relative;
  margin: 0 auto;
  padding: 3px;
}

/* LED SEGMENTS */
.meter-segment {
  flex: 1;
  height: 100%;
  margin: 0 2px;
  border-radius: 5px;
  transition: background-color 0.2s ease-out, box-shadow 0.2s;
}

/* CURSEUR DYNAMIQUE */
.marker {
  width: 2vw; /* ✅ Taille dynamique */
  max-width: 10px; /* ✅ Empêcher qu’il devienne énorme sur grand écran */
  height: 40px;
  position: absolute;
  top: -10px;
  border-radius: 5px;
  transition: left 0.2s ease-out, transform 0.1s ease-in-out;
}

/* Effet de glow quand le curseur devient vert */
.marker.isPerfect {
  background: lime !important;
  box-shadow: 0px 0px 15px lime !important;
}

/* Effet de flottement léger */
@keyframes floating {
  0% { transform: translateY(0px); }
  50% { transform: translateY(2px); }
  100% { transform: translateY(0px); }
}

.marker {
  animation: floating 0.8s infinite ease-in-out;
}
.center-marker {
  position: absolute;
  left: 50%;
  top: -5px;
  width: 3px;
  height: 35px;
  background: rgba(255, 255, 255, 0.5);
  
  
  
}

/* 📱 Ajustements pour petits écrans */
@media screen and (max-width: 600px) {
  .bar-container {
    width: 75vw; /* ✅ Barre plus large sur mobile */
    height: 20px; /* ✅ Réduction de la hauteur */
  }

  .marker {
    height: 30px; /* ✅ Ajustement du curseur */
  }
}

  </style>
  