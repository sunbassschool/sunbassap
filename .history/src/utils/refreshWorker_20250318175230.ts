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
    } catch (error) {
      // Blindage strict du typage
      const message = getErrorMessage(error);
      self.postMessage({ status: "error", message });
    }
  }
});

// 🔥 Nouvelle fonction blindée
function getErrorMessage(error: unknown): string {
  if (error instanceof Error && typeof error.message === "string") {
    return error.message;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    const err = error as { message?: unknown };
    return typeof err.message === "string" ? err.message : "Erreur inconnue";
  }
  return "Erreur inconnue";
}
