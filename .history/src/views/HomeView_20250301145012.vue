<template>
  <div class="home-container">
    <header class="header">
      <h1 class="title">Bienvenue sur <span class="highlight">SunBassSchool</span></h1>
      <p class="subtitle">Ton espace dédié à la basse 🎸</p>
    </header>

    <nav class="nav-links">
      <router-link to="/" class="nav-link">Accueil</router-link>
      <router-link to="/dashboard" class="nav-link">Dashboard</router-link>
      <router-link to="/cours" class="nav-link">Cours</router-link>
    </nav>

    <main class="content">
      <p class="text">Explore tes cours, retrouve les replays et découvre les ressources pédagogiques.</p>
    </main>
  </div>
</template>

<style scoped>

/* ✅ S'assure que l'arrière-plan occupe tout l'écran */


.home-container {
  background: linear-gradient(to bottom right, #1a1a2e, #0f0f1b);
  min-height: 100vh;
  min-width: 100vw;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

/* ✅ Centrage des éléments */
.header {
  margin-bottom: 30px;
}

.title {
  font-size: 2.5rem;
  font-weight: bold;
  color: white;
}

.highlight {
  color: #60a5fa;
}

.subtitle {
  font-size: 1.2rem;
  color: #d1d5db;
}

/* ✅ Navigation centrée */
.nav-links {
  display: flex;
  gap: 30px;
  margin-bottom: 40px;
}

.nav-link {
  color: #60a5fa;
  font-weight: bold;
  text-decoration: none;
  transition: color 0.3s ease-in-out;
}

.nav-link:hover {
  color: white;
}

/* ✅ Texte centré avec bonne lisibilité */
.content .text {
  color: #d1d5db;
  max-width: 600px;
  line-height: 1.6;
}
</style>
