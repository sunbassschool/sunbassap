// stores/useMetronomeStore.js
import { defineStore } from 'pinia'

export const useMetronomeStore = defineStore('metronome', {
  state: () => ({
    showPanel: false,
    isPlaying: false,
    tempo: 100,
    subdivision: 1,
    volumeStrong: 0.5,
    volumeWeak: 0.5,
    volumeSub: 0.5,
    currentBeat: 1,
    currentSubdivision: 1,
    swingAmount: 0.5,
    measure: 4,
    disableStrongBeat: false,
    elapsedTime: 0
  }),

  getters: {
    formattedTime(state) {
      const minutes = Math.floor(state.elapsedTime / 60)
      const seconds = state.elapsedTime % 60
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
    }
  },

  actions: {
    togglePanel() {
      this.showPanel = !this.showPanel
    },

    openPanel() {
      this.showPanel = true
    },

    closePanel() {
      this.showPanel = false
    },

    startMetronome() {
      this.isPlaying = true
    },

    stopMetronome() {
      this.isPlaying = false
    },

    setTempo(newTempo) {
      this.tempo = newTempo
    },

    setSubdivision(val) {
      this.subdivision = val
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

    setSwingAmount(val) {
      this.swingAmount = val
    },

    setAccentuateFirstBeat(val) {
      this.disableStrongBeat = !val
    },

    setMeasure(val) {
      const [beats] = val.split('/').map(Number)
      this.measure = beats

      if (["6/8", "9/8", "12/8"].includes(val)) {
        this.subdivision = 3
      } else {
        this.subdivision = 1
      }
    },

    setElapsedTime(val) {
      this.elapsedTime = val
    }
  }
})
