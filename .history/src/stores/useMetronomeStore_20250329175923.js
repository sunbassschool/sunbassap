import { defineStore } from 'pinia';

export const useMetronomeStore = defineStore('metronome', {
  state: () => ({
    showPanel: false,
    isPlaying: false,
    tempo: 100,
    subdivision: 1 // 👈 Ajout ici
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

    setSubdivision(val) {        // 👈 Ajout action setter
      this.subdivision = val;
    }
  }
});
