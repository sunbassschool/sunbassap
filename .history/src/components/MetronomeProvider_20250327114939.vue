<!-- src/components/MetronomeProvider.vue -->
<template>
    <slot /> <!-- Permet de contenir le layout ou d'autres composants -->
  </template>
  
  <script setup>
  import { ref, provide } from 'vue';
  
  // ✅ Reactive metronome states
  const tempo = ref(100);
  const isPlaying = ref(false);
  const isBeating = ref(false);
  let interval = null;
  
  // ✅ Logic to toggle metronome
  const togglePlay = () => {
    isPlaying.value = !isPlaying.value;
  
    if (isPlaying.value) {
      interval = setInterval(() => {
        isBeating.value = true;
        setTimeout(() => (isBeating.value = false), 100);
      }, (60 / tempo.value) * 1000);
    } else {
      clearInterval(interval);
      isBeating.value = false;
    }
  };
  
  // ✅ Provide to descendants
  provide('tempo', tempo);
  provide('isPlaying', isPlaying);
  provide('togglePlay', togglePlay);
  provide('isBeating', isBeating);
  </script>
  