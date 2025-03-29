<template>
    <div class="floating-metronome">
      <button @click="startMetronome">▶️</button>
      <button @click="stopMetronome">⏹️</button>
      <p>{{ isPlaying ? '🎶 En cours' : '⏸️ Arrêté' }} - {{ tempo }} BPM</p>
    </div>
  </template>
  
  <script>
  export default {
    name: 'GlobalMetronome',
    data() {
      return {
        tempo: 100,
        isPlaying: false,
        audioContext: null,
        nextNoteTime: 0,
        beatInterval: null
      }
    },
    methods: {
      initAudioContext() {
        if (!this.audioContext) {
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
        }
      },
  
      startMetronome() {
        this.initAudioContext()
        this.isPlaying = true
        this.nextNoteTime = this.audioContext.currentTime + 0.1
        this.beatInterval = setInterval(this.scheduleBeat, 25)
      },
  
      stopMetronome() {
        this.isPlaying = false
        clearInterval(this.beatInterval)
      },
  
      scheduleBeat() {
        const now = this.audioContext.currentTime
        const secondsPerBeat = 60.0 / this.tempo
  
        while (this.nextNoteTime < now + 0.1) {
          this.playClick(this.nextNoteTime)
          this.nextNoteTime += secondsPerBeat
        }
      },
  
      playClick(time) {
        const osc = this.audioContext.createOscillator()
        const gain = this.audioContext.createGain()
        osc.frequency.value = 1000
        gain.gain.value = 0.1
  
        osc.connect(gain)
        gain.connect(this.audioContext.destination)
  
        osc.start(time)
        osc.stop(time + 0.05)
      }
    }
  }
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
  