import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const baseUrl = import.meta.env.MODE === 'development' ? '/' : '/app/'

export const useMetronomeStore = defineStore('metronome', () => {
  // 🎚️ Core State
  const tempo = ref(parseInt(localStorage.getItem('userBpm') || '120'))
  const measure = ref(4)
  const subdivision = ref(1)
  const swingAmount = ref(parseFloat(localStorage.getItem('swingAmount') || '0'))

  const disableStrongBeat = ref(localStorage.getItem('disableStrongBeat') === 'true')

  const volumeStrong = ref(parseFloat(localStorage.getItem('volumeStrong') || '0.5'))
  const volumeWeak = ref(parseFloat(localStorage.getItem('volumeWeak') || '0.5'))
  const volumeSub = ref(parseFloat(localStorage.getItem('volumeSub') || '0.5'))

  const isPlaying = ref(false)
  const isBeating = ref(false)
  const currentBeat = ref(1)
  const currentSubdivision = ref(0)
  const nextNoteTime = ref(0)

  const audioContext = ref(null)
  const soundBuffers = ref({ strong: null, weak: null, sub: null })

  let interval = null

  // 🎵 Subdivisions
  const subdivisions = [
    { value: 1, label: '', icon: `${baseUrl}assets/icons/quarter-note.png` },
    { value: 2, label: '', icon: `${baseUrl}assets/icons/eighth-note.png` },
    { value: 3, label: '', icon: `${baseUrl}assets/icons/triplet.png` },
    { value: 4, label: '', icon: `${baseUrl}assets/icons/sixteenth-note.png` },
  ]

  // 🧠 Initialisation Audio
  function initAudioContext() {
    if (!audioContext.value) {
      audioContext.value = new (window.AudioContext || window.webkitAudioContext)()
      console.log("🔊 AudioContext initialisé !")
    }
  }

  async function resumeAudioContext() {
    if (audioContext.value?.state === "suspended") {
      await audioContext.value.resume()
      console.log("🔊 AudioContext repris !")
    }
  }

  async function loadSounds() {
    const soundUrls = {
      strong: `${baseUrl}assets/audio/strong-beat.wav`,
      weak: `${baseUrl}assets/audio/weak-beat.wav`,
      sub: `${baseUrl}assets/audio/subdivision.wav`,
    }

    for (const [key, url] of Object.entries(soundUrls)) {
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      soundBuffers.value[key] = await audioContext.value.decodeAudioData(arrayBuffer)
    }
    console.log("🎵 Tous les sons sont chargés !")
  }

  function start() {
    if (isPlaying.value) return
    initAudioContext()
    resumeAudioContext()
    isPlaying.value = true
    nextNoteTime.value = audioContext.value.currentTime
    scheduleNextBeat()
  }

  function stop() {
    isPlaying.value = false
    nextNoteTime.value = 0
    cancelAnimationFrame(interval)
    currentBeat.value = 1
    currentSubdivision.value = 0
  }

  function scheduleNextBeat() {
    if (!isPlaying.value) return

    const now = audioContext.value.currentTime
    while (nextNoteTime.value < now + 0.1) {
      playClick()

      let beatInterval = 60.0 / tempo.value
      let subdivisionInterval = beatInterval / subdivision.value

      let swingOffset = 0
      if ([2, 4].includes(subdivision.value)) {
        if (currentSubdivision.value % 2 === 1) {
          swingOffset = (swingAmount.value * subdivisionInterval) / 3
        } else {
          swingOffset = -(swingAmount.value * subdivisionInterval) / 3
        }
      }

      nextNoteTime.value += subdivisionInterval + swingOffset
    }

    interval = requestAnimationFrame(scheduleNextBeat)
  }

  function playClick() {
    currentSubdivision.value++

    if (currentSubdivision.value > subdivision.value) {
      currentSubdivision.value = 1
      currentBeat.value = (currentBeat.value % measure.value) + 1
    }

    let buffer = null
    let vol = 0.5

    if (currentSubdivision.value === 1) {
      if (currentBeat.value === 1 && !disableStrongBeat.value) {
        buffer = soundBuffers.value.strong
        vol = volumeStrong.value
      } else {
        buffer = soundBuffers.value.weak
        vol = volumeWeak.value
      }
    } else {
      buffer = soundBuffers.value.sub
      vol = volumeSub.value
    }

    if (buffer) playSound(buffer, nextNoteTime.value, vol)

    isBeating.value = true
    setTimeout(() => isBeating.value = false, 100)
  }

  function playSound(buffer, time, volume) {
    const gainNode = audioContext.value.createGain()
    gainNode.gain.value = volume * 2

    const source = audioContext.value.createBufferSource()
    source.buffer = buffer
    source.connect(gainNode)
    gainNode.connect(audioContext.value.destination)
    source.start(time)
  }

  return {
    tempo,
    measure,
    subdivision,
    swingAmount,
    disableStrongBeat,
    volumeStrong,
    volumeWeak,
    volumeSub,
    isPlaying,
    isBeating,
    currentBeat,
    currentSubdivision,
    subdivisions,

    start,
    stop,
    loadSounds,
    initAudioContext,
    resumeAudioContext,
  }
})
