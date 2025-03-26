self.addEventListener("message", async (event) => {
  if (event.data.action === "refreshToken") {
    console.log("🔄 [Worker] Tentative de rafraîchissement du JWT...");

    const storedRefreshToken = event.data.refreshToken;
    if (!storedRefreshToken) {
      self.postMessage({ status: "failed", message: "Aucun refresh token disponible" });
      return;
    }

    // Exécute la requête dans une fonction séparée pour meilleure gestion d'erreur
    const result = await refreshToken(storedRefreshToken);
    self.postMessage(result);
  }
});

// 📌 Fonction qui gère toute la logique d'appel API et erreurs
async function refreshToken(refreshToken: string) {
  try {
    const url = `https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbxc69Alhr0V0-DqrHblDJonvPKFy8PbjhEA6nA4sC4aFCTJOCKO9t0Q-uaApC_vcXgyHA/exec?route=refresh&refreshtoken=${encodeURIComponent(refreshToken)}`;
    
    const response = await fetch(url, { method: "GET" });

    if (!response.ok) {
      return { status: "failed", message: `Erreur HTTP ${response.status}` };
    }

    const data = await response.json();
    if (data.status === "success" && data.data?.jwt && data.data?.refreshToken) {
      return { status: "success", jwt: data.data.jwt, refreshToken: data.data.refreshToken };
    } else {
      return { status: "failed", message: "Réponse API invalide" };
    }
  } catch (err) {
    return { status: "error", message: extractErrorMessage(err) };
  }
}

// 📌 Fonction qui gère proprement l'extraction des erreurs
function extractErrorMessage(error: any): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Erreur inconnue";
}
