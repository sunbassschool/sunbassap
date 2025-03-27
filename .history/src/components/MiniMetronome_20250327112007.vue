<template>
    <div class="mini-metronome" :class="{ minimized }">
      <div v-if="!minimized" class="mini-content">
        <div class="beat-circle" :class="{ active: isBeating }"></div>
        <div class="tempo">{{ tempo }} BPM</div>
        <button @click="togglePlay">
          <span v-if="!isPlaying">▶️</span>
          <span v-else>⏹️</span>
        </button>
        <button class="minimize" @click="minimized = true">–</button>
      </div>
      <div v-else class="minimized-icon" @click="minimized = false">🎵</div>
    </div>
  </template>
  
  <script setup>
  import { ref, inject } from 'vue'
  
  const tempo = inject('tempo')
  const isPlaying = inject('isPlaying')
  const isBeating = inject('isBeating')
  const togglePlay = inject('togglePlay')
  
  const minimized = ref(false)
  </script>
  
  <style scoped>
  .mini-metronome {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #222;
    color: white;
    padding: 10px 15px;
    border-radius: 10px;
    box-shadow: 0 0 10px #000;
    display: flex;
    align-items: center;
    z-index: 9999;
    transition: all 0.3s ease;
  }
  .mini-content {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .beat-circle {
    width: 12px;
    height: 12px;
    background: white;
    border-radius: 50%;
    transition: background 0.2s ease;
  }
  .beat-circle.active {
    background: red;
  }
  .minimize, .minimized-icon {
    background: none;
    border: none;
    color: white;
    font-size: 16px;
    cursor: pointer;
  }
  .minimized-icon {
    font-size: 20px;
  }
  </style>
  