<!-- src/components/MetronomeProvider.vue -->
<template>
  <slot />
</template>

<script setup>
import { ref, provide, onMounted, onBeforeUnmount, watch } from 'vue'

/* 🎛️ États principaux */
const tempo = ref(parseInt(localStorage.getItem('tempo') || '100'))
const isPlaying = ref(false)
const isBeating = ref(false)
const showMiniMetronome = ref(true)  // Ou false, selon ton besoin

const swingAmount = ref(parseFloat(localStorage.getItem("swingAmount") || "0"))
const volumeStrong = ref(parseFloat(localStorage.getItem("volumeStrong") || "1"))
const volumeWeak = ref(parseFloat(localStorage.getItem("volumeWeak") || "0.7"))
const volumeSub = ref(parseFloat(localStorage.getItem("volumeSub") || "0.5"))
const measure = ref(4)
const subdivision = ref(1)

let audioContext = null
const soundBuffers = { strong: null, weak: null, sub: null }
let currentBeat = 1
let currentSubdivision = 0
let nextNoteTime = 0.0
let intervalId = null

/* 🔊 Initialisation Audio */
function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    console.log("🔊 AudioContext initialisé")
  }
}

async function loadSounds() {
  const urls = {
    strong: '/assets/audio/strong-beat.wav',
    weak: '/assets/audio/weak-beat.wav',
    sub: '/assets/audio/subdivision.wav',
  }

  for (const [key, url] of Object.entries(urls)) {
    const response = await fetch(url)
    const buffer = await response.arrayBuffer()
    soundBuffers[key] = await audioContext.decodeAudioData(buffer)
  }

  console.log("✅ Sons chargés")
}

function getSwingOffset(interval) {
  return (subdivision.value === 2 || subdivision.value === 4)
    ? ((currentSubdivision % 2 === 1 ? 1 : -1) * (swingAmount.value * interval) / 3)
    : 0
}

/* ▶️ Lancement */
function startMetronome() {
  if (isPlaying.value) return
  initAudioContext()
  audioContext.resume()
  currentBeat = 1
  currentSubdivision = 0
  nextNoteTime = audioContext.currentTime
  isPlaying.value = true
  scheduleNextBeat()
}

/* ⏹️ Arrêt */
function stopMetronome() {
  isPlaying.value = false
  cancelAnimationFrame(intervalId)
}

/* 🔁 Beat scheduler */
function scheduleNextBeat() {
  if (!isPlaying.value) return

  const now = audioContext.currentTime
  while (nextNoteTime < now + 0.1) {
    playClick()
    const beatInterval = 60 / tempo.value
    const subInterval = beatInterval / subdivision.value
    const swing = getSwingOffset(subInterval)
    nextNoteTime += subInterval + swing
  }

  intervalId = requestAnimationFrame(scheduleNextBeat)
}

/* 🔉 Click Player */
function playClick() {
  currentSubdivision++
  if (currentSubdivision > subdivision.value) {
    currentSubdivision = 1
    currentBeat = (currentBeat % measure.value) + 1
  }

  let buffer = null
  let volume = 0.5

  if (currentSubdivision === 1) {
    buffer = currentBeat === 1 ? soundBuffers.strong : soundBuffers.weak
    volume = currentBeat === 1 ? volumeStrong.value : volumeWeak.value
  } else {
    buffer = soundBuffers.sub
    volume = volumeSub.value
  }

  if (buffer) playSound(buffer, nextNoteTime, volume)

  isBeating.value = true
  setTimeout(() => (isBeating.value = false), 100)
}

function playSound(buffer, time, volume) {
  const gainNode = audioContext.createGain()
  gainNode.gain.value = volume
  const source = audioContext.createBufferSource()
  source.buffer = buffer
  source.connect(gainNode).connect(audioContext.destination)
  source.start(time)
}

/* 🪄 Interactions utilisateur */
function togglePlay() {
  isPlaying.value ? stopMetronome() : startMetronome()
}

/* 💾 Watchers pour localStorage */
watch(tempo, val => localStorage.setItem('tempo', val.toString()))
watch(swingAmount, val => localStorage.setItem("swingAmount", val))
watch(volumeStrong, val => localStorage.setItem("volumeStrong", val))
watch(volumeWeak, val => localStorage.setItem("volumeWeak", val))
watch(volumeSub, val => localStorage.setItem("volumeSub", val))

/* 🚀 Lifecycle */
onMounted(async () => {
  initAudioContext()
  await loadSounds()
})

onBeforeUnmount(() => {
  stopMetronome()
})

/* 📤 Provide to all descendants */
provide('tempo', tempo)
provide('isPlaying', isPlaying)
provide('isBeating', isBeating)
provide('startMetronome', startMetronome)
provide('stopMetronome', stopMetronome)
provide('togglePlay', togglePlay)

provide('swingAmount', swingAmount)
provide('volumeStrong', volumeStrong)
provide('volumeWeak', volumeWeak)
provide('volumeSub', volumeSub)
provide('measure', measure)
provide('subdivision', subdivision)
</script>
