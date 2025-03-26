<template>
    <div class="tuner-container">
      <h2>Accordeur de Basse 🎸</h2>
      <button @click="startTuner">Activer le micro 🎤</button>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      <p v-if="isListening">Micro activé ✅</p>
    </div>
  </template>
  
  <script>
  export default {
    data() {
      return {
        audioContext: null,
        errorMessage: "",
        isListening: false,
      };
    },
  
    methods: {
      async startTuner() {
        try {
          // Vérifie si l'API est dispo
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Votre navigateur ne supporte pas l'accès au micro.");
          }
  
          // Demande l'accès au micro
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  
          // Création du contexte audio
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const source = this.audioContext.createMediaStreamSource(stream);
          
          console.log("✅ Micro activé !");
          this.isListening = true;
        } catch (error) {
          this.errorMessage = "Erreur d'accès au micro : " + error.message;
          console.error("🚨 Erreur :", error);
        }
      },
    },
  };
  </script>
  
  <style scoped>
  .tuner-container {
    text-align: center;
    padding: 20px;
  }
  
  button {
    background-color: #ff6600;
    color: white;
    padding: 10px 15px;
    border: none;
    cursor: pointer;
    font-size: 18px;
  }
  
  .error {
    color: red;
    font-weight: bold;
  }
  </style>
  