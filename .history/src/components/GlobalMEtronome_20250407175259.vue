<template>
  <div class="floating-metronome">
    <button @click="metronome.showPanel = !metronome.showPanel" class="toggle-button">
      {{ metronome.showPanel ? '❌' : '🎵' }}
    </button>

    <div v-if="metronome.showPanel">
      <div style="margin-top: 10px;">
<label>
  <input type="checkbox" v-model="accentuateFirstBeat" />
  Activer le temps fort
</label>
</div>

      <button @click="startMetronome">▶️</button>
      <button @click="stopMetronome">⏹️</button>
      <p>{{ isPlaying ? '🎶 En cours' : '⏸️ Arrêté' }} - {{ tempo }} BPM</p>
      <label>BPM :
        <input 
          type="number" 
          v-model="tempo" 
          min="20" max="300" 
          step="1" 
          @change="updateTempo"
        />
      </label>
      <label>BPM :
        <input 
          type="range" 
          v-model="tempo" 
          min="20" max="300" 
          step="1" 
          @change="updateTempo"
        />
      </label>
      <p>⏱️ Temps : {{ metronome.formattedTime }}</p>


      <label>Temps fort :
        <input type="range" min="0" max="1" step="0.01" v-model="volumeStrong" @change="updateVolumeStrong" />
      </label>
      <br />
      <label>Temps faible :
        <input type="range" min="0" max="1" step="0.01" v-model="volumeWeak" @change="updateVolumeWeak" />
      </label>
      <br />
      <label>Subdivision :
        <input type="range" min="0" max="1" step="0.01" v-model="volumeSub" @change="updateVolumeSub" />
      </label>

      <div style="margin-top: 10px;">
        <label>Subdivision :
          <select v-model="subdivision">
            <option :value="1">1 (Noires)</option>
            <option :value="2">2 (Croches)</option>
            <option :value="3">3 (Triolets)</option>
            <option :value="4">4 (Double-croches)</option>
          </select>
        </label>
        <div style="margin-top: 10px;">
          <label>Mesure :
            <select v-model="selectedMeter" @change="applyMeter">
              <option disabled value="">-- Choisir une mesure --</option>
              <option v-for="m in meterOptions" :key="m.label" :value="m.label">
                {{ m.label }}
              </option>
            </select>
          </label>
        </div>

        <div style="margin-top: 10px;">
          <label>Swing :
            <input type="range" min="0" max="1" step="0.05" v-model="swingAmount" />
            {{ Math.round(swingAmount * 100) }}%
          </label>
        </div>

      </div>

    </div>
  </div>
</template>

<script>
import { useMetronomeStore } from "@/stores/useMetronomeStore";

const baseUrl = import.meta.env.MODE === "development" ? "/" : "/app/";

export default {
name: 'GlobalMetronome',
data() {
  return {
    isPlaying: false,
    audioContext: null,
    nextNoteTime: 0,

    timerInterval: null,
    beatInterval: null,
    soundBuffers: {
      strong: null,
      weak: null,
      sub: null
    }
  };
},
computed: {
  metronome() {
    return useMetronomeStore();
  },
  elapsedTime: {
get() {
  return this.metronome.elapsedTime;
},
set(val) {
  this.metronome.setElapsedTime(val);
}
},
  tempo: {
    get() {
      return this.metronome.tempo;
    },
    set(val) {
      this.metronome.setTempo(val);
    }
  },
  volumeStrong: {
    get() {
      return this.metronome.volumeStrong;
    },
    set(val) {
      this.metronome.setVolumeStrong(val);
    }
  },
  volumeWeak: {
    get() {
      return this.metronome.volumeWeak;
    },
    set(val) {
      this.metronome.setVolumeWeak(val);
    }
  },
  volumeSub: {
    get() {
      return this.metronome.volumeSub;
    },
    set(val) {
      this.metronome.setVolumeSub(val);
    }
  },
  swingAmount: {
    get() {
      return this.metronome.swingAmount;
    },
    set(val) {
      this.metronome.setSwingAmount(val);
    }
  },
  selectedMeter: {
    get() {
      return this.metronome.selectedMeter;
    },
    set(val) {
      this.metronome.setSelectedMeter(val);
    }
  },
  subdivision: {
    get() {
      return this.metronome.subdivision;
    },
    set(val) {
      this.metronome.setSubdivision(val);
    }
  },

accentuateFirstBeat: {
  get() {
    return !this.metronome.disableStrongBeat;
  },
  set(val) {
    this.metronome.setDisableStrongBeat(!val);
  }
}
,  
  meterOptions() {
    return this.metronome.meterOptions;
  },

},
mounted() {
  // 🧠 Appliquer les valeurs sauvegardées
  const savedTempo = localStorage.getItem("tempo");
  const savedStrong = localStorage.getItem("volumeStrong");
  const savedWeak = localStorage.getItem("volumeWeak");
  const savedSub = localStorage.getItem("volumeSub");
  const savedSwing = localStorage.getItem("swingAmount");
  const savedMeter = localStorage.getItem("selectedMeter");
  const savedDisable = localStorage.getItem("disableStrongBeat");


  if (savedTempo) this.tempo = parseInt(savedTempo);
  if (savedStrong) this.volumeStrong = parseFloat(savedStrong);
  if (savedWeak) this.volumeWeak = parseFloat(savedWeak);
  if (savedSub) this.volumeSub = parseFloat(savedSub);
  if (savedSwing) this.swingAmount = parseFloat(savedSwing);
  if (savedMeter) this.selectedMeter = savedMeter;
  if (savedDisable !== null) this.disableStrongBeat = savedDisable === "true";


  // 🔁 Synchronise lecture
  this.$watch(() => this.metronome.isPlaying, (val) => {
    val ? this.startMetronome() : this.stopMetronome();
  });
},
watch: {
  tempo(val) {
    localStorage.setItem("tempo", val);
  },
  disableStrongBeat(val) {
localStorage.setItem("disableStrongBeat", val);
}
,
  volumeStrong(val) {
    localStorage.setItem("volumeStrong", val);
  },
  volumeWeak(val) {
    localStorage.setItem("volumeWeak", val);
  },
  volumeSub(val) {
    localStorage.setItem("volumeSub", val);
  },
  swingAmount(val) {
    localStorage.setItem("swingAmount", val);
  },
  selectedMeter(val) {
    localStorage.setItem("selectedMeter", val);
  }
},
methods: {
  async initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      await this.loadSounds();
    }
  },
  async loadSounds() {
    const soundUrls = {
      strong: `${baseUrl}assets/audio/strong-beat.wav`,
      weak: `${baseUrl}assets/audio/weak-beat.wav`,
      sub: `${baseUrl}assets/audio/subdivision.wav`
    };

    const promises = Object.entries(soundUrls).map(async ([key, url]) => {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      this.soundBuffers[key] = await this.audioContext.decodeAudioData(buffer);
    });

    await Promise.all(promises);
  },
  startTimer() {
this.elapsedTime = 0;
this.timerInterval = setInterval(() => this.elapsedTime++, 1000);
},
  stopTimer() {
    clearInterval(this.timerInterval);
    this.timerInterval = null;
  },
  startMetronome() {
this.initAudioContext();

if (this.beatInterval) clearInterval(this.beatInterval);

// Bien démarrer à 0, pas encore joué
this.metronome.currentBeat = 0;
this.metronome.currentSubdivision = 1;

this.nextNoteTime = this.audioContext.currentTime;

this.metronome.isPlaying = true;
this.isPlaying = true;
this.metronome.startTimer();

this.beatInterval = setInterval(this.scheduleBeat, 25);
}




,
triggerBeatPulse() {
this.isBeating = true;
setTimeout(() => {
  this.isBeating = false;
}, 100); // durée du flash
}
,
stopMetronome() {
console.log("🛑 Stop appelé");

clearInterval(this.beatInterval);
this.beatInterval = null;

this.metronome.stopTimer();
this.isPlaying = false;
this.metronome.isPlaying = false;

this.metronome.currentBeat = 1;
this.metronome.currentSubdivision = 1;

this.nextNoteTime = 0; // ✅ reset planning audio
}



,
scheduleBeat() {
const now = this.audioContext.currentTime;
const beatDuration = 60.0 / this.tempo;
const subDuration = beatDuration / this.subdivision;

while (this.nextNoteTime < now + 0.1) {
  // Incrémenter **avant** le clic
  if (this.metronome.subdivision === 1) {
    this.metronome.currentBeat = (this.metronome.currentBeat % this.metronome.measure) + 1;
  } else {
    if (this.metronome.currentSubdivision >= this.subdivision) {
      this.metronome.currentSubdivision = 1;
      this.metronome.currentBeat = (this.metronome.currentBeat % this.metronome.measure) + 1;
    } else {
      this.metronome.currentSubdivision++;
    }
  }

  const beat = this.metronome.currentBeat;
  const sub = this.metronome.subdivision === 1 ? 1 : this.metronome.currentSubdivision;

  this.playClick(this.nextNoteTime, beat, sub);
  this.nextNoteTime += subDuration;
}
}



,
playClick(time, forcedBeat = null, forcedSub = null) {
const beat = forcedBeat ?? this.metronome.currentBeat;
const sub = forcedSub ?? this.metronome.currentSubdivision;
const isSubdividing = this.metronome.subdivision > 1;

const isStrongBeat =
  (!isSubdividing && beat === 1) || (isSubdividing && beat === 1 && sub === 1);
  
const shouldAccent = isStrongBeat && !this.metronome.disableStrongBeat;

let buffer, volume;

if (!isSubdividing || sub === 1) {
  buffer = shouldAccent ? this.soundBuffers.strong : this.soundBuffers.weak;
  volume = shouldAccent ? this.volumeStrong : this.volumeWeak;
} else {
  buffer = this.soundBuffers.sub;
  volume = this.volumeSub;
}

let swingDelay = 0;
if (isSubdividing && sub % 2 === 0) {
  const subDuration = (60 / this.tempo) / this.subdivision;
  swingDelay = (this.swingAmount * subDuration) / 2;
}

this.triggerBeatPulse();
this.playSound(buffer, time + swingDelay, volume);
}





,
  playSound(buffer, time, volumeLevel) {
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = volumeLevel;

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    source.start(time);
  }
}
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible') {
    const context = yourMetronomeAudioContext; // remplace par ta référence
    if (context && context.state === 'suspended') {
      try {
        await context.resume();
        console.log("🔊 AudioContext repris !");
      } catch (err) {
        console.error("⚠️ Erreur AudioContext resume :", err);
      }
    }
  }
});

};
</script>



<style scoped>
.floating-metronome {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #222;
  border: 2px solid #a74c28;
  padding: 16px;
  border-radius: 8px;
  z-index: 1000;
  color: white;
}
</style>
