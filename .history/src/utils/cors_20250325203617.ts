export async function wakeCorsProxy() {
    const proxyUrl = "https://cors-proxy-37yu.onrender.com/";
    try {
      const res = await fetch(proxyUrl, { method: "GET" });
      console.log("🟢 CORS Proxy réveillé :", res.status);
    } catch (err) {
      console.warn("⚠️ Impossible de réveiller le CORS Proxy :", err);
    }
  }
  