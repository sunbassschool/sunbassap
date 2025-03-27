<template>
    <!-- Contrôle la visibilité du widget avec showMiniMetronome -->
    <div v-if="showMiniMetronome" class="mini-metronome" :class="{ minimized }">
      <div v-if="!minimized" class="mini-content">
        <div class="beat-circle" :class="{ active: isBeating }"></div>
        <div class="tempo">{{ tempo }} BPM</div>
        <button @click="() => { console.log('Mini toggle clicked'); togglePlay() }">
          <span v-if="!isPlaying">▶️</span>
          <span v-else>⏹️</span>
        </button>
    <!-- Ancien bouton de minimisation -->
<!-- <button class="minimize" @click="minimized = true">–</button> -->

<!-- Nouveau bouton pour fermer -->
<button class="close-widget" @click="closeWidget">❌</button>
      </div>
      <div v-else class="minimized-icon" @click="minimized = false">🎵</div>
    </div>
  </template>
  
  <script setup>
  import { ref, inject, watch, onUnmounted } from 'vue'
  
  const tempo = inject('tempo')
  const isPlaying = inject('isPlaying')
  const isBeating = inject('isBeating')
  const togglePlay = inject('togglePlay')
  const stopMetronome = inject('stopMetronome')
const showMiniMetronome = inject('showMiniMetronome')
  const showMiniMetronome = inject('showMiniMetronome')  // Injecter showMiniMetronome pour le contrôler
  const closeWidget = () => {
  stopMetronome()               // 🛑 Stoppe le son
  showMiniMetronome.value = false // ❌ Cache le widget
}

  const minimized = ref(false)

  watch(showMiniMetronome, (val) => {
  console.log("👀 showMiniMetronome changed:", val)
})
onUnmounted(() => {
  console.log("🧨 MiniMetronome UNMOUNTED")
})

  </script>
  
  <style scoped>
  .mini-metronome {
  position: fixed;
  bottom: 100px;
  right: 30px;
  background: #1a1a1a;
  color: white;
  padding: 10px 14px;
  border-radius: 12px;
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  z-index: 9999;
  transition: all 0.3s ease;
  font-family: "Poppins", sans-serif;
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
  