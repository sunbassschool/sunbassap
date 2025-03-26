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
