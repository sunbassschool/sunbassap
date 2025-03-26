self.addEventListener("message", async (event) => {
    if (event.data.action === "refreshToken") {
      console.log("🔄 [Worker] Tentative de rafraîchissement du JWT...");
      
      try {
        const storedRefreshToken = event.data.refreshToken;
        if (!storedRefreshToken) {
          self.postMessage({ status: "failed", message: "Aucun refresh token disponible" });
          return;
        }