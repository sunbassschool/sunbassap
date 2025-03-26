async function wakeCorsProxy() {
    try {
      const res = await fetch("https://cors-proxy-37yu.onrender.com/https://google.com", {
        method: "GET",
      });
      console.log("⚡ Proxy CORS réveillé ✅", res.status);
    } catch (err) {
      console.warn("❌ Impossible de réveiller le proxy CORS", err);
    }
  }
  
  