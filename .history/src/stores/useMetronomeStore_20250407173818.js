import { defineStore } from 'pinia'
import NoSleep from 'nosleep.js';

const noSleep = new NoSleep();
let visibilityHandler = null;

let timerInterval = null; // Local au module, non réactif
let wakeLock = null;

export const useMetronomeStore = defineStore('metronome', {
  state: () => ({
    showPanel: false,
    isPlaying: false,

    elapsedTime: 0,

    tempo: 100,
    currentBeat: 1,
    currentSubdivision: 1,
    swingAmount: 0.5,

    // 🔊 Volumes
    volumeStrong: 0.5,
    volumeWeak: 0.5,
    volumeSub: 0.5,

    // ✅ Subdivision & mesure
    measure: 4,
    subdivision: 1,
    selectedMeter: '4/4',

    // 🛑 Temps fort
    disableStrongBeat: false
  }),


  actions: {

initVisibilityRecovery() {
  visibilityHandler = () => {
    if (document.visibilityState === 'visible' && this.isPlaying) {
      console.log('🔁 Page re-visible, réactivation du WakeLock/NoSleep');
      this.requestWakeLock();
      this.enableNoSleep();
    }
  };
  document.addEventListener('visibilitychange', visibilityHandler);
},

cleanupVisibilityRecovery() {
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }
}
,
    enableNoSleep() {
      try {
        noSleep.enable(); // ⚠️ doit être appelé à la suite d'une interaction utilisateur
        console.log("🔒 NoSleep activé pour iOS");
      } catch (err) {
        console.error("❌ Erreur NoSleep:", err);
      }
    },
    disableNoSleep() {
      noSleep.disable();
      console.log("🟢 NoSleep désactivé");
    }
,    
    async requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
          wakeLock.addEventListener('release', () => {
            console.log('🟡 WakeLock libérée');
          });
          console.log('🟢 WakeLock active');
        }
      } catch (err) {
        console.error(`⚠️ WakeLock error: ${err.name}, ${err.message}`);
      }
    },
    
    releaseWakeLock() {
      if (wakeLock) {
        wakeLock.release();
        wakeLock = null;
        console.log('🔕 WakeLock désactivée');
      }
    },
    

    setDisableStrongBeat(val) {
        this.disableStrongBeat = val;
      }
,      

    togglePanel() {
      this.showPanel = !this.showPanel
    },
    startTimer() {
        this.elapsedTime = 0;
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
          this.elapsedTime++;
        }, 1000);
      },
      
      stopTimer() {
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
      },
      
      resetTimer() {
        this.elapsedTime = 0;
      },
    openPanel() {
      this.showPanel = true
    },

    setElapsedTime(val) {
        this.elapsedTime = val;
      },
      resetElapsedTime() {
        this.elapsedTime = 0;
      }
,      
    closePanel() {
      this.showPanel = false
    },

    startMetronome() {
      try {
        noSleep.enable(); // ✅ doit être direct après clic
        console.log("🔒 NoSleep activé avec succès");
      } catch (e) {
        console.warn("❌ Erreur NoSleep (peut-être pas déclenché par une interaction utilisateur) :", e);
      }
    
      this.isPlaying = true;
      this.requestWakeLock(); // Android / Chrome
    }
    ,
    stopMetronome() {
      this.isPlaying = false;
      this.releaseWakeLock();
      this.disableNoSleep();
    }
,    
    

    setTempo(val) {
      this.tempo = val
    },
    setSwingAmount(val) {
      this.swingAmount = val
    },

    setVolumeStrong(val) {
      this.volumeStrong = val
    },
    setVolumeWeak(val) {
      this.volumeWeak = val
    },
    setVolumeSub(val) {
      this.volumeSub = val
    },

    setAccentuateFirstBeat(val) {
      this.disableStrongBeat = !val
    },

    // 🆕 Choix de la mesure complète
    setSelectedMeter(label) {
        this.currentBeat = 1;
this.currentSubdivision = 1;
      this.selectedMeter = label

      const meter = this.meterOptions.find(m => m.label === label)
      if (meter) {
        this.measure = meter.measure
        this.subdivision = meter.subdivision
        console.log(`🎯 Mesure mise à jour : ${label} ➡️ measure=${meter.measure}, sub=${meter.subdivision}`)
      }
    },

    setMeasure(val) {
      this.measure = val
    },

    setSubdivision(val) {
        this.subdivision = val;
        this.currentSubdivision = 1;
        this.currentBeat = 1;
      }
      
  },

  getters: {
    meterOptions: () => [
      { label: "2/4", measure: 2, subdivision: 1 },
      { label: "3/4", measure: 3, subdivision: 1 },
      { label: "4/4", measure: 4, subdivision: 1 },
      { label: "5/4", measure: 5, subdivision: 1 },
      { label: "6/4", measure: 6, subdivision: 1 },
      { label: "7/4", measure: 7, subdivision: 1 },
      { label: "9/4", measure: 9, subdivision: 1 },
      { label: "5/8", measure: 5, subdivision: 1 },
      { label: "6/8", measure: 2, subdivision: 3 },
      { label: "7/8", measure: 7, subdivision: 1 },
      { label: "9/8", measure: 3, subdivision: 3 },
      { label: "12/8", measure: 4, subdivision: 3 }
    ],
    formattedTime() {
        const minutes = Math.floor(this.elapsedTime / 60);
        const seconds = this.elapsedTime % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
      },
  }
})

