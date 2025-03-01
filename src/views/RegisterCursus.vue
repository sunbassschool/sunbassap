<template>
    <Layout>
        <div class="fullwidth-container mt-0">

        
  
        <!-- Loader pendant le chargement du formulaire -->
        <div v-if="loading" class="d-flex flex-column align-items-center mt-4">
          <div class="spinner-border text-primary mb-2" role="status"></div>
          <p class="text-muted">Chargement du formulaire...</p>
        </div>
  
        <!-- Google Form intégré -->
        <div class="iframe-container">
  <iframe
    v-show="!loading"
    ref="formIframe"
    class="google-form shadow-sm"
    :src="formUrl"
    frameborder="0"
    loading="lazy"
    @load="loading = false"
  ></iframe>
</div>
      </div>
    </Layout>
  </template>
  
  <script>
  import Layout from "../views/Layout.vue";
  import { ref, onMounted } from "vue";
  
  export default {
    name: "RegisterCursus",
    components: { Layout },
    setup() {
      const formUrl = ref(
        "https://docs.google.com/forms/d/e/1FAIpQLSfWJrx_YERs2kDWThdf-a9dPC8BNGZD-dPwVwXBXuorA2IrYw/viewform?embedded=true"
      );
      const loading = ref(true);
  
      // S'assure que l'iframe charge bien avant de cacher le loader
      onMounted(() => {
        setTimeout(() => {
          loading.value = false;
        }, 3000); // Sécurité pour éviter que le loader reste trop longtemps
      });
  
      return { formUrl, loading };
    },
  };
  </script>
  
  <style scoped>
  .fullwidth-container {
    width: 100vw;
    max-width: 100%;
    margin: 0;
    padding: 20px;
    justify-content: center;
    align-items: center;
  }
  
  .iframe-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-width: 1200px;
  margin: auto;
  padding: px;
}

.google-form {
  width: 100%;
  justify-content: center;
  align-items: center;
  min-height: 600px;
  max-height: 90vh;
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

  </style>
  
  