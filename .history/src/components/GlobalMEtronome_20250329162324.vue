<template>
    <div v-if="visible" class="floating-metronome">
      <!-- 🧠 Ton interface métronome ici -->
      <p style="color:white;">Le métronome est actif !</p>
      <!-- tu pourras ici copier les contrôles plus tard -->
    </div>
  </template>
  
  <script>
  export default {
    name: 'GlobalMetronome',
    data() {
      return {
        visible: true
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
    padding: 12px;
    border-radius: 8px;
    z-index: 1000;
  }
  </style>
  