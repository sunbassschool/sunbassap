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
    swingAmount: 0.5, // Déclare swingAmount ici
    measure: 4,
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
    setSwingAmount(val) {
        this.swingAmount = val;  // Ajoute cette fonction pour mettre à jour swingAmount
      },
    setVolumeSub(val) {
      this.volumeSub = val;
    }
  }
});
