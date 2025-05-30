import { defineStore } from 'pinia'

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
      this.subdivision = val
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
    ]
  }
})

