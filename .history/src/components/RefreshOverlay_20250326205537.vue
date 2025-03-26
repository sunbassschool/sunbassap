<template>
    <div class="refresh-overlay">
      <div class="spinner"></div>
      <p class="refresh-text">🔴 OVERLAY VISIBLE</p>

    </div>
  </template>
  
  <script setup>
  import { onMounted } from 'vue';
  
  onMounted(() => {
    console.log("✅ RefreshOverlay MONTÉ !");
  });
  </script>
  
  
  <style scoped>
 .refresh-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(255, 0, 0, 0.8); /* ROUGE VISIBLE ! */
  display: flex !important;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  z-index: 100000; /* max priorité */
}

  
  .spinner {
    width: 28px;
    height: 28px;
    border: 4px solid #333;
    border-top: 4px solid #ff4500;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 10px;
  }
  
  .refresh-text {
    color: #ff4500;
    font-size: 0.9rem;
    font-family: "Poppins", sans-serif;
    opacity: 0.85;
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  </style>
  