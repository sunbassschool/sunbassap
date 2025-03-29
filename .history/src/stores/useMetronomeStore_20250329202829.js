import { defineStore } from 'pinia';

export const useMetronomeStore = defineStore('metronome', {
  state: () => ({
    showPanel: false,
    isPlaying: false,
    tempo: 100,
    subdivision: 1,
    volumeStrong: 0.5,  // volume du temps fort
    volumeWeak: 0.5,    // volume du temps faible
    volumeSub: 0.5,     // volume des subdivisions
    currentBeat: 1,
    currentSubdivision: 1,
    swingAmount: 0.5, // Swing amount
    measure: 4,
    disableStrongBeat: false, // Ajout pour le contrôle du temps fort
  }),

  actions: {
    togglePanel() {
      this.showPanel = !this.showPanel;
    },

    openPanel() {
      this.showPanel = true;
    },

    closePanel() {
      this.showPanel = false;
    },

    startMetronome() {
      this.isPlaying = true;
    },

    stopMetronome() {
      this.isPlaying = false;
    },
    setMeasure(val) {
        const [beats] = val.split('/').map(Number);
        this.measure = beats;
      
        // Adapter subdivision si mesure composée (ex: 6/8, 9/8, 12/8)
        if (["6/8", "9/8", "12/8"].includes(val)) {
          this.subdivision = 3;
        } else {
          this.subdivision = 1;
        }
      }
      
,      
    setTempo(newTempo) {
      this.tempo = newTempo;
    },

    setSubdivision(val) {
      this.subdivision = val;
    },

    setVolumeStrong(val) {
      this.volumeStrong = val;
    },

    setVolumeWeak(val) {
      this.volumeWeak = val;
    },

    setVolumeSub(val) {
      this.volumeSub = val;
    },

    setSwingAmount(val) {
      this.swingAmount = val;
    },

    setAccentuateFirstBeat(val) {
      this.disableStrongBeat = !val; // Mettre à jour disableStrongBeat
    },
  }
});
