<template>
    <div class="container mt-5">
      <div class="row justify-content-center">
        <div class="col-md-6">
          <div class="card p-4">
            <h2 class="text-center">{{ isRegister ? "Inscription" : "Connexion" }}</h2>
  
            <form @submit.prevent="handleSubmit">
              <div v-if="isRegister" class="mb-3">
                <label class="form-label">Nom</label>
                <input v-model="nom" type="text" class="form-control" required>
              </div>
  
              <div class="mb-3">
                <label class="form-label">Email</label>
                <input v-model="email" type="email" class="form-control" required>
              </div>
  
              <div class="mb-3">
                <label class="form-label">Mot de passe</label>
                <input v-model="password" type="password" class="form-control" required>
              </div>
  
              <button type="submit" class="btn btn-primary w-100">
                {{ isRegister ? "S'inscrire" : "Se connecter" }}
              </button>
            </form>
  
            <p class="text-center mt-3">
              <a href="#" @click="isRegister = !isRegister">
                {{ isRegister ? "Déjà un compte ? Connecte-toi" : "Pas encore de compte ? Inscris-toi" }}
              </a>
            </p>
  
            <div v-if="message" class="alert mt-3" :class="messageType">
              {{ message }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import { ref } from "vue";
  
  export default {
    setup() {
      const isRegister = ref(false);
      const nom = ref("");
      const email = ref("");
      const password = ref("");
      const message = ref("");
      const messageType = ref("");
      const apiUrl = "https://sunbass.sunbassschool.workers.dev/"; // Mets l'URL correcte ici
  
      const handleSubmit = async () => {
        message.value = "";
        messageType.value = "";
  
        if (!email.value || !password.value || (isRegister.value && !nom.value)) {
          message.value = "Tous les champs doivent être remplis";
          messageType.value = "alert-danger";
          return;
        }
  
        const payload = {
          action: isRegister.value ? "register" : "login",
          email: email.value,
          password: password.value,
        };
  
        if (isRegister.value) {
          payload.nom = nom.value;
        }
  
        try {
          const response = await fetch(apiUrl, {
            method: "POST",
            body: JSON.stringify(payload),
            headers: { "Content-Type": "application/json" },
          });
  
          if (!response.ok) {
            throw new Error(`Erreur HTTP : ${response.status}`);
          }
  
          const data = await response.json();
  
          if (data.success) {
            message.value = data.success;
            messageType.value = "alert-success";
  
            if (!isRegister.value) {
              localStorage.setItem("user", JSON.stringify(data.user));
              window.location.href = "/dashboard"; // Redirection après connexion
            }
          } else {
            message.value = data.error;
            messageType.value = "alert-danger";
          }
        } catch (error) {
          console.error("Erreur:", error);
          message.value = "Erreur de connexion au serveur";
          messageType.value = "alert-danger";
        }
      };
  
      return {
        isRegister,
        nom,
        email,
        password,
        message,
        messageType,
        handleSubmit,
      };
    },
  };
  </script>
  