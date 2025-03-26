import { useAuthStore } from "@/stores/authStore";

// 🔧 Options de cookie personnalisables si besoin
const cookieOptions = "Secure; SameSite=Strict; path=/";

export function setJwtEverywhere(jwt: string) {
  console.log("🧠 Synchronisation du JWT dans tous les canaux...");

  // 🔐 Stockage navigateur
  localStorage.setItem("jwt", jwt);
  sessionStorage.setItem("jwt", jwt);

  // 🍪 Cookie HTTP
  document.cookie = `jwt=${jwt}; ${cookieOptions}`;

  // 🧠 Mise à jour du store
  const authStore = useAuthStore();
  authStore.jwt = jwt;

  console.log("✅ JWT injecté dans localStorage, sessionStorage, cookie et store.");
}
