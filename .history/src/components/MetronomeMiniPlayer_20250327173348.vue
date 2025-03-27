<template>
    <div class="mini-player" @click="toggleExpanded">
      <div class="left">
        <div :class="{ beat: isBeating }" class="mini-circle"></div>
      </div>
      <div class="center">
        <div class="tempo">{{ tempo }} BPM</div>
        <div class="measure">{{ currentBeat }}/{{ measure }}</div>
      </div>
      <div class="right">
        <button @click.stop="togglePlay" class="btn-control">
          {{ isPlaying ? "⏹" : "▶️" }}
        </button>
      </div>
    </div>
  </template>
  
  <script setup>
  import { storeToRefs } from 'pinia'
  import { onMounted } from 'vue'
  import { useMetronomeStore } from '@/stores/metronome'
  
  const store = useMetronomeStore()
  
  const {
    tempo,
    currentBeat,
    measure,
    isPlaying,
    isBeating
  } = storeToRefs(store)
  
  const togglePlay = () => {
    if (isPlaying.value) {
      store.stop()
    } else {
      store.start()
    }
  }
  
  const toggleExpanded = () => {
    console.log("➡️ Tu veux ouvrir la version complète !");
  }
  
  // ✅ Appeler init + chargement audio au montage
  onMounted(async () => {
    store.initAudioContext()
    await store.loadSounds()
  })
  </script>
  
  
  <style scoped>
  .mini-player {
    position: fixed;
    bottom: 15px;
    right: 15px;
    background: #1e1e1e;
    color: white;
    padding: 10px 15px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 9999;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    cursor: pointer;
  }
  
  .mini-circle {
    width: 20px;
    height: 20px;
    background-color: darkred;
    border-radius: 50%;
  }
  
  .beat {
    animation: pulse 0.2s ease;
  }
  
  @keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.3); opacity: 0.6; }
    100% { transform: scale(1); opacity: 1; }
  }
  
  .tempo {
    font-size: 1.2rem;
    font-weight: bold;
  }
  
  .measure {
    font-size: 0.9rem;
    color: #aaa;
  }
  
  .btn-control {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: white;
    cursor: pointer;
  }
  </style>
  