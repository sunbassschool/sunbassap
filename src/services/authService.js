export async function refreshAuthToken() {
    const refreshToken = localStorage.getItem("refreshToken"); // Récupère le refreshToken
  
    if (!refreshToken) {
      console.log("❌ Aucun refreshToken disponible !");
      return null;
    }
  
    try {
      const response = await fetch("https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbxXdhJygQVZuJsUaEbW8nuh_U3CTg-piJTJ7L2tUc2UKvE89nnrTz0bSPGJjaehvL36aQ/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route: "refresh",
          refreshToken: refreshToken
        })
      });
  
      const data = await response.json();
  
      if (data.status === "success") {
        console.log("✅ Nouveau JWT reçu :", data.data.jwt);
        console.log("✅ Nouveau RefreshToken reçu :", data.data.refreshToken);
  
        // 🔥 Stocke les nouveaux tokens
        localStorage.setItem("jwt", data.data.jwt);
        localStorage.setItem("refreshToken", data.data.refreshToken);
  
        return data.data.jwt; // Retourne le nouveau JWT
      } else {
        console.log("❌ Erreur lors du rafraîchissement :", data.message);
        return null;
      }
    } catch (error) {
      console.error("❌ Erreur lors de la requête refreshToken :", error);
      return null;
    }
  }
  