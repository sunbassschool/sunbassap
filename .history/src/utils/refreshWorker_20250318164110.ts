self.addEventListener("message", async (event) => {
  if (event.data.action === "refreshToken") {
    console.log("🔄 [Worker] Tentative de rafraîchissement du JWT...");
    
    try {
      const storedRefreshToken = event.data.refreshToken;
      if (!storedRefreshToken) {
        self.postMessage({ status: "failed", message: "Aucun refresh token disponible" });
        return;
      }

      const url = `https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbxc69Alhr0V0-DqrHblDJonvPKFy8PbjhEA6nA4sC4aFCTJOCKO9t0Q-uaApC_vcXgyHA/exec?route=refresh&refreshtoken=${encodeURIComponent(storedRefreshToken)}`;
      const response = await fetch(url, { method: "GET" });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      if (data.status === "success" && data.data?.jwt && data.data?.refreshToken) {
        self.postMessage({ status: "success", jwt: data.data.jwt, refreshToken: data.data.refreshToken });
      } else {
        self.postMessage({ status: "failed", message: "Réponse API invalide" });
      }
    } catch (error: unknown) {
      // On vérifie si l'erreur est bien de type Error avant d'accéder à message
      if (error instanceof Error) {
        self.postMessage({ status: "error", message: error.message });
      } else {
        self.postMessage({ status: "error", message: "Erreur inconnue" });
      }
    }
    
  }
});
