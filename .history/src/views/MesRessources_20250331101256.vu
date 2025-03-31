<template>
  <Layout>
    <div class="container py-4">
      <h2 class="mb-4 text-light">🎒 Mes Ressources</h2>

      <div v-if="isLoading" class="text-center mt-5">
        <div class="spinner-border text-warning" role="status"></div>
        <p class="mt-3 text-light">Chargement de tes fichiers...</p>
      </div>

      <div v-else class="resources-grid">
        <div 
          v-for="file in filteredFiles" 
          :key="file.id" 
          class="resource-card"
          :class="{ viewed: file.vu }"
        >
          <div class="resource-header">
            <i :class="getFileIcon(file.extension)" class="file-icon me-2"></i>
            <span class="file-name">{{ file.nom }}</span>
          </div>

          <p class="text-muted small">{{ file.type }} — .{{ file.extension }}</p>

          <a :href="file.apercu" target="_blank" class="btn btn-sm btn-outline-light mt-2">
            🔗 Voir le fichier
          </a>

          <div class="form-check mt-3">
            <input 
              class="form-check-input" 
              type="checkbox" 
              :checked="file.vu" 
              @change="toggleVu(file)"
              :id="file.id"
            />
            <label class="form-check-label text-light" :for="file.id">
              Marquer comme {{ file.vu ? "non vu" : "vu" }}
            </label>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>
