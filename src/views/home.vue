<template>
  <div>
    <!-- Tableau de bord -->
    <div class="container my-5">
      <h1 class="text-center mb-4">Bienvenue à SunBassSchool</h1>

      <div class="row">
        <DashboardCard title="Prochain Cour" content="Votre prochain cours est prévu pour le mardi 14 février à 18h00. N'oubliez pas d'être prêt !" />
        <DashboardCard title="Partitions" content="Accédez à vos partitions et tablatures pour vos morceaux en cours d'apprentissage." />
        <DashboardCard title="Replay de Cours" content="Consultez les replays des cours passés pour revoir vos leçons." />
      </div>
    </div>

    <!-- Menu en bas -->
    <nav class="navbar navbar-expand-lg navbar-dark fixed-bottom">
      <ul class="navbar-nav w-100 justify-content-around">
        <li class="nav-item">
          <router-link class="nav-link" to="/home">
            <i class="fas fa-home"></i><br>Accueil
          </router-link>
        </li>
        <li class="nav-item">
          <router-link class="nav-link" to="/partitions">
            <i class="fas fa-music"></i><br>Partitions
          </router-link>
        </li>
        <li class="nav-item">
          <router-link class="nav-link" to="/plannings">
            <i class="fas fa-calendar-alt"></i><br>Plannings
          </router-link>
        </li>
        <li class="nav-item">
          <router-link class="nav-link" to="/replay">
            <i class="fas fa-video"></i><br>Replay
          </router-link>
        </li>
        <li class="nav-item">
          <router-link class="nav-link" to="/videos">
            <i class="fas fa-play-circle"></i><br>Vidéos
          </router-link>
        </li>
      </ul>
    </nav>
  </div>
</template>

<script>
// Importation du composant pour le tableau de bord
import DashboardCard from "../views/DashboardCard.vue";

export default {
  name: "Home",
  components: {
    DashboardCard,
  },
};
</script>

<style scoped>
.navbar {
  background-color: #343a40;
  z-index: 1000;
}

.nav-link {
  color: white !important;
}

.nav-link:hover {
  color: #f8f9fa !important;
}

.container {
  padding-top: 50px;
}

.dashboard-card {
  border-radius: 10px;
  background-color: #f8f9fa;
  padding: 20px;
  margin: 10px 0;
}

.dashboard-card h3 {
  font-size: 1.5rem;
}
</style>
