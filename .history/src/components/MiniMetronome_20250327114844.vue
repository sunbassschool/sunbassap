<template>
    <div class="mini-metronome" :class="{ minimized }">
      <div v-if="!minimized" class="mini-content">
        <div class="beat-circle" :class="{ active: isBeating }"></div>
        <div class="tempo">{{ tempo }} BPM</div>
        <button @click="togglePlay">
          <span v-if="!isPlaying">▶️</span>
          <span v-else>⏹️</span>
        </button>
        <button class="minimize" @click="closeWidget"></button>

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
  const showMiniMetronome = inject('showMiniMetronome')

  const minimized = ref(false)
  </script>
  
  <style scoped>
.mini-metronome {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  min-width: 200px; /* ✅ Taille minimale élégante */
  max-width: 200vw;  /* ✅ Ne déborde jamais sur mobile */
  background: #1a1a1a;
  color: white;
  padding: 10px 14px;
  border-radius: 12px;
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 9999;
  transition: all 0.3s ease;
  font-family: "Poppins", sans-serif;
  opacity: 0.92;
  background: rgba(20, 20, 20, 0.95);
  pointer-events: auto; /* Pour qu’on puisse cliquer sans bloquer le reste */
}


.mini-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.beat-circle {
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
  transition: background 0.2s ease;
}

.beat-circle.active {
  background: red;
  box-shadow: 0 0 10px red;
}

.tempo {
  font-weight: bold;
  font-size: 14px;
}

button {
  background: none;
  border: none;
  color: white;
  font-size: 16px;
  cursor: pointer;
  transition: transform 0.2s ease;
}

button:hover {
  transform: scale(1.2);
}

.minimized-icon {
  font-size: 22px;
  padding: 8px;
  background: #333;
  border-radius: 50%;
  box-shadow: 0 0 5px rgba(255, 255, 255, 0.2);
}

  </style>
  