<template>
    <Layout>
      <div class="tuner-container">
       
  
        <!-- Affichage de la note détectée -->
        <div class="note-display">
          <span class="note">{{ note }}</span>
        </div>
  
        <!-- Barre d'accordage style VU-mètre avec cadre -->
        <div class="tuning-meter">
          <div class="bar-frame">
            <div class="bar-container">
                <div class="center-icon">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M12 16L6 10h12z" fill="white"/>
    </svg>
  </div>
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
      <div class="reference-notes">
  <button 
    v-for="note in referenceNotes" 
    :key="note.name" 
    class="note-button"
    @click="playReferenceNote(note.frequency)"
  >
    {{ note.name }}
  </button>
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
        referenceNotes: [
      { name: "B", frequency: 30.87 },
      { name: "E", frequency: 41.20 },
      { name: "A", frequency: 55.00 },
      { name: "D", frequency: 73.42 },
      { name: "G", frequency: 98.00 },
    ],
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
       
        playReferenceNote(frequency) {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // 🔥 Stoppe les oscillateurs s'ils sont déjà en cours
    if (this.currentOscillator) {
      this.currentOscillator.stop();
      this.currentOscillator.disconnect();
      this.currentOscillator = null;
    }

    if (this.currentOscillator2) {
      this.currentOscillator2.stop();
      this.currentOscillator2.disconnect();
      this.currentOscillator2 = null;
    }

    if (this.vibratoOscillator) {
      this.vibratoOscillator.stop();
      this.vibratoOscillator.disconnect();
      this.vibratoOscillator = null;
    }

    // 🎛️ Création de l'oscillateur principal (fréquence normale)
    const oscillator1 = this.audioContext.createOscillator();
    const gainNode1 = this.audioContext.createGain();

    oscillator1.type = "sine"; // Son pur
    oscillator1.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    // 🎛️ Création de l'oscillateur secondaire (octave +1)
    const oscillator2 = this.audioContext.createOscillator();
    const gainNode2 = this.audioContext.createGain();

    oscillator2.type = "sine";
    oscillator2.frequency.setValueAtTime(frequency * 2, this.audioContext.currentTime); // Octave +1

    // 🔥 Ajout d'un vibrato (modulation légère de fréquence)
    const vibrato = this.audioContext.createOscillator();
    const vibratoGain = this.audioContext.createGain();

    vibrato.frequency.setValueAtTime(5, this.audioContext.currentTime); // Fréquence du vibrato (5 Hz)
    vibratoGain.gain.setValueAtTime(1.5, this.audioContext.currentTime); // Amplitude du vibrato

    vibrato.connect(vibratoGain);
    vibratoGain.connect(oscillator1.frequency); // Appliquer le vibrato au principal
    vibratoGain.connect(oscillator2.frequency); // Appliquer le vibrato à l’harmonique

    vibrato.start(); // Lancer le vibrato

    // 🔊 Ajuster les volumes des oscillateurs
    gainNode1.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode1.gain.linearRampToValueAtTime(0.4, this.audioContext.currentTime + 0.1); // Volume principal

    gainNode2.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode2.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.1); // Volume harmonique

    // 🔗 Connecter les oscillateurs
    oscillator1.connect(gainNode1);
    gainNode1.connect(this.audioContext.destination);

    oscillator2.connect(gainNode2);
    gainNode2.connect(this.audioContext.destination);

    // 🔥 Lancer les oscillateurs
    oscillator1.start();
    oscillator2.start();

    this.currentOscillator = oscillator1;
    this.currentOscillator2 = oscillator2;
    this.vibratoOscillator = vibrato;

    // ⏳ Arrêter automatiquement après 3 secondes
    setTimeout(() => {
      oscillator1.stop();
      oscillator2.stop();
      vibrato.stop();
      this.currentOscillator = null;
      this.currentOscillator2 = null;
      this.vibratoOscillator = null;
    }, 1500);
  }
,
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
  /* 📌 Style des boutons de référence */
.reference-notes {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
}

.note-button {
  background: #222;
  color: white;
  border: 2px solid #555;
  padding: 10px 15px;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.note-button:hover {
  background: #444;
  border-color: #777;
}

  .tuner-container {
    text-align: center;
    margin-top:40%;
    font-family: Arial, sans-serif;
    padding: 20px;
    background-color: #0e0e0e;
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
.center-icon {
  position: absolute;
  left: 50%;
  top: -25px; /* Positionne au-dessus de la barre */
  transform: translateX(-50%);
  width: 20px;
  height: 20px;
}

.center-icon svg {
  width: 100%;
  height: 100%;
  fill: rgba(255, 255, 255, 0.8);
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
  margin-left:-1.8px;
  width: 3px;
  height: 35px;
  background: rgba(255, 255, 255, 0.5);
}

/* 📱 Ajustements pour petits écrans */
@media screen and (max-width: 600px) {
  .bar-container {
    width: 72vw; /* ✅ Barre plus large sur mobile */
    height: 20px; /* ✅ Réduction de la hauteur */
  }

  .marker {
    height: 30px; /* ✅ Ajustement du curseur */
  
  }
}

  </style>
  