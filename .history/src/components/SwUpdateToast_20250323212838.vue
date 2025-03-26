<template>
    <transition name="fade">
      <div v-if="visible" class="sw-toast">
        🚀 Nouvelle version disponible !
        <button @click="refreshApp">Recharger</button>
      </div>
    </transition>
  </template>
  
  <script setup lang="ts">
  import { ref } from 'vue'
  
  const visible = ref(false)
  
  function show() {
    visible.value = true
  }
  
  function refreshApp() {
    window.location.reload()
  }
  
  defineExpose({ show })
  </script>
  
  <style scoped>
  .sw-toast {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #333;
    color: white;
    padding: 12px 16px;
    border-radius: 6px;
    z-index: 10000;
  }
  .fade-enter-active, .fade-leave-active {
    transition: opacity 0.3s ease;
  }
  .fade-enter-from, .fade-leave-to {
    opacity: 0;
  }
  </style>
  