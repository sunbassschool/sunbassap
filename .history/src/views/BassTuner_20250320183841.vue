<template>
    <Layout>
      <div class="tuner-container">
        <h1>Accordeur de Basse 🎸</h1>
  
        <!-- Affichage de la note détectée -->
        <div class="note-display">
          <span class="note">{{ note }}</span>
        </div>
  
        <!-- Barre d'accordage style VU-mètre avec cadre -->
        <div class="tuning-meter">
          <div class="bar-frame"> <!-- Nouveau cadre -->
            <div class="bar-container">
              <div 
                v-for="(color, index) in meterColors" 
                :key="index"
                class="meter-segment"
                :style="{ backgroundColor: color, boxShadow: getGlow(color) }"
              ></div>
              <!-- Curseur dynamique -->
              <div 
                class="marker" 
                :style="{ 
                  left: `${barPosition}%`, 
                  backgroundColor: isPerfectTune ? 'lime' : 'white',
                  boxShadow: isPerfectTune ? '0px 0px 15px lime' : '0px 0px 10px white' 
                }"
              ></div>
            </div>
          </div>
        </div>
  
        <!-- Message d'erreur -->
        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      </div>
    </Layout>
  </template>
  
  ---
  
  ### 🎨 **Mise à jour du CSS avec effet studio**  
  ```css
  .tuning-meter {
    margin: 20px auto;
    text-align: center;
  }
  
  /* 📌 Nouveau cadre pour la barre LED */
  .bar-frame {
    background: linear-gradient(180deg, #444, #222);
    border: 3px solid #888;
    border-radius: 12px;
    padding: 5px;
    box-shadow: inset 0px 2px 8px rgba(0, 0, 0, 0.6), 0px 2px 4px rgba(255, 255, 255, 0.2);
    display: inline-block;
  }
  
  .bar-container {
    display: flex;
    justify-content: center;
    width: 400px; /* Taille ajustée */
    height: 25px;
    background: #111;
    border-radius: 10px;
    position: relative;
    margin: 0 auto;
    padding: 3px;
  }
  
  /* LED SEGMENTS */
  .meter-segment {
    flex: 1;
    height: 100%;
    margin: 0 2px;
    border-radius: 5px;
    transition: background-color 0.2s ease-out, box-shadow 0.2s;
  }
  
  /* CURSEUR DYNAMIQUE */
  .marker {
    width: 10px;
    height: 40px;
    position: absolute;
    top: -10px;
    border-radius: 5px;
    transition: left 0.2s ease-out, transform 0.1s ease-in-out;
  }
  
  /* Effet de glow quand le curseur devient vert */
  .marker.isPerfect {
    background: lime !important;
    box-shadow: 0px 0px 15px lime !important;
  }
  
  /* Effet de flottement léger */
  @keyframes floating {
    0% { transform: translateY(0px); }
    50% { transform: translateY(2px); }
    100% { transform: translateY(0px); }
  }
  
  .marker {
    animation: floating 0.8s infinite ease-in-out;
  }
  