import Layout from "../views/Layout.vue";
import { jwtDecode } from "jwt-decode"; // 📌 Ajout du décodage du JWT
import { getCache, setCache, clearCache, shouldUpdateCache } from "@/utils/cacheManager.js";
import { getToken, getUserInfoFromJWT, getValidToken } from "@/utils/api.ts";
import { useAuthStore } from "@/stores/authStore"; // 👈 importe ton store
import { Picker } from "emoji-mart-vue-fast";
export default (await import('vue')).defineComponent({
    name: "Dashboard",
    components: { Layout },
    data() {
        const prenom = sessionStorage.getItem("prenom") || localStorage.getItem("prenom") || "";
        const cacheKey = `userData_${prenom}`;
        const cacheExpirationKey = `${cacheKey}_expiration`;
        return {
            prenom, // ✅ Assure que `prenom` est défini avant l'utilisation des clés
            cacheKey, // ✅ Stocke avec la bonne valeur
            cacheExpirationKey, // ✅ Même chose ici
            noteUpdatedMessage: "", // ✅ Message temporaire de succès
            cards: [],
            isLoading: true,
            note: "", // Note de l'élève
            email: "",
            lastSaved: null,
            isRefreshingNote: false,
            saveCountdown: 0, // Timer avant la prochaine sauvegarde auto
            cacheDuration: 24 * 60 * 60 * 1000,
            apiBaseURL: "https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/",
            routes: {
                GET: "AKfycbykYySA5D4taWYaICxCHt6l3WmOM5RNg4P_rCoJowfxusXpSy5D-ZuGFao9UjGWHD86AA/exec",
                POST: "AKfycbz-K2F1WavlIe5pxTaXwnirV1pw9pjiq6Q776zui50scu7qNaJZBVCUFfh3frkw7GVhWg/exec"
            }
        };
    },
    computed: {
        isLoggedIn() {
            const auth = useAuthStore();
            return !!auth.jwt && !!auth.user; // Vérifie que le JWT existe ET que l'utilisateur est chargé
        },
        userData() {
            const storedData = localStorage.getItem("userData_");
            return storedData ? JSON.parse(storedData) : {};
        },
        objectif() {
            const userInfosKey = `userInfos_${this.prenom}`;
            const storedData = localStorage.getItem(userInfosKey);
            const userInfos = storedData ? JSON.parse(storedData) : {};
            return userInfos.objectif || "🎯 Aucun objectif défini";
        }
    },
    async mounted() {
        try {
            const auth = useAuthStore();
            // 🔄 Synchronisation cross-tab
            window.addEventListener("storage", async (event) => {
                if (event.key === "jwt") {
                    await this.fetchNote();
                    await this.fetchFromAPI(true);
                }
            });
            // 🧠 Toujours afficher les données rapidement
            await this.loadUserData();
            // ⏳ Mise à jour silencieuse une seule fois par session
            if (!sessionStorage.getItem("apiSynced") && shouldUpdateCache(this.cacheKey, this.cacheDuration)) {
                this.fetchFromAPI(true); // ⚠️ sans await → appel en arrière-plan
                sessionStorage.setItem("apiSynced", "true");
            }
            await this.fetchNote();
            this.isLoading = false;
        }
        catch (err) {
            console.error("❌ Erreur dans mounted() :", err);
            this.isLoading = false;
        }
    },
    beforeUnmount() {
        window.removeEventListener("beforeunload", this.saveNoteOnUnload);
        window.removeEventListener("storage", this.syncCache);
    },
    methods: {
        async saveNoteOnUnload(event) {
            if (this.note.trim() !== "" && this.isLoggedIn) {
                console.log("💾 Sauvegarde de la note avant de quitter la page...");
                await this.updateNote(); // 🔥 Force l'envoi de la note avant le départ
            }
        },
        getUserRole() {
            let jwt = sessionStorage.getItem("jwt") || localStorage.getItem("jwt");
            if (!jwt)
                return null;
            try {
                let decoded = jwtDecode(jwt);
                return decoded.role || "user"; // Retourne "user" par défaut si absent
            }
            catch (error) {
                console.error("❌ Erreur lors du décodage du JWT :", error);
                return null;
            }
        },
        syncCache(event) {
            if (event.key === `userData_${this.prenom}`) {
                console.log("🔄 Mise à jour du cache détectée dans un autre onglet, rechargement des données...");
                this.loadUserData();
            }
        },
        insertEmoji(event) {
            this.note += event.detail.unicode; // Ajoute l'emoji à la fin du texte
        },
        async loadUserData() {
            const cachedData = getCache(this.cacheKey);
            if (cachedData) {
                console.log("📦 Données avant updateData :", cachedData);
                this.updateData(cachedData);
                return true;
            }
            await this.fetchFromAPI();
            return false;
        },
        onNoteInput() {
            // ✅ Mise à jour immédiate du cache local
            let userData = getCache(`userData_${this.prenom}`) || {};
            userData.note = this.note.trim();
            setCache(`userData_${this.prenom}`, userData);
            // ⏳ Déclenchement différé de l'envoi API
            if (this.debounceTimer)
                clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this.updateNote(); // Appelle la vraie méthode API
            }, 1200); // ⏱️ Attends 1.2s après la dernière frappe
        },
        formatDateISO(isoString) {
            if (!isoString)
                return "Date inconnue";
            const dateObj = new Date(isoString);
            // Vérification si la date est invalide
            if (isNaN(dateObj.getTime())) {
                console.error("❌ Date invalide détectée :", isoString);
                return "Date invalide";
            }
            const options = { weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" };
            return dateObj.toLocaleString("fr-FR", options);
        },
        getDayName(dateString) {
            if (!dateString)
                return "";
            const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
            const [day, month, yearAndTime] = dateString.split("/");
            const [year] = yearAndTime.split(" ");
            const dateObj = new Date(`${year}-${month}-${day}`);
            return days[dateObj.getDay()];
        },
        getFormattedDate(dateString) {
            if (!dateString)
                return "";
            const [day, month, yearAndTime] = dateString.split("/");
            const [year] = yearAndTime.split(" ");
            return `${day} ${this.getMonthName(month)} ${year}`;
        },
        getFormattedTime(dateString) {
            if (!dateString)
                return "";
            const time = dateString.split(" ")[1]; // Récupère "10:00"
            return time.replace(":", "H"); // Transforme "10:00" → "10H00"
        },
        getMonthName(monthNumber) {
            const months = [
                "janvier", "février", "mars", "avril", "mai", "juin",
                "juillet", "août", "septembre", "octobre", "novembre", "décembre"
            ];
            return months[parseInt(monthNumber, 10) - 1];
        },
        async forceUpdateCache() {
            console.log("🔄 Mise à jour en arrière-plan...");
            this.clearCache(); // Supprime le cache sans toucher l'affichage actuel
            const timestamp = new Date().getTime();
            this.fetchFromAPI(true, timestamp);
        },
        async fetchNote(forceRefresh = false) {
            console.log("📝 Vérification de la note...");
            this.isRefreshingNote = forceRefresh;
            const cacheKey = `userData_${this.prenom}`;
            const cachedData = getCache(cacheKey);
            // ✅ Utilise le cache sauf si on force
            if (!forceRefresh && cachedData && cachedData.note !== undefined) {
                this.note = cachedData.note;
                console.log("✅ Note chargée depuis le cache.");
                this.saving = false;
                this.isRefreshingNote = false;
                return;
            }
            // 🔐 Validation du JWT AVANT appel API
            const jwt = await getValidToken();
            if (!jwt) {
                console.warn("🔒 JWT expiré ou absent, redirection !");
                this.isLoading = false; // ✅ ajoute ça aussi ici
                return;
            }
            console.log("🌐 Récupération de la note depuis l'API...");
            try {
                const url = `${this.apiBaseURL}${this.routes.GET}?route=getnote&jwt=${jwt}`;
                const response = await fetch(url);
                const data = await response.json();
                console.log("📡 Data payload reçue :", data);
                if (data.note !== undefined) {
                    this.note = data.note || "";
                    setCache(cacheKey, { ...cachedData, note: this.note });
                    console.log("✅ Note mise à jour depuis l'API.");
                    this.noteUpdatedMessage = "✅ Note mise à jour !";
                    setTimeout(() => {
                        this.noteUpdatedMessage = "";
                    }, 3000);
                }
            }
            catch (error) {
                console.error("❌ Erreur API Bloc-Note :", error);
            }
            finally {
                this.saving = false;
                this.isRefreshingNote = false;
            }
        },
        // 🔥 Mettre à jour la note en temps réel (autosave)
        async updateNote() {
            // ✅ Enregistre toujours localement
            let userData = getCache(`userData_${this.prenom}`) || {};
            userData.note = this.note.trim();
            setCache(`userData_${this.prenom}`, userData);
            // 🔐 Vérification JWT AVANT appel API
            const jwt = await getValidToken();
            if (!jwt) {
                console.warn("🔒 JWT expiré ou absent, redirection !");
                return;
            }
            // ⏳ Debounce pour éviter les appels trop fréquents
            this.debounceTimer = setTimeout(async () => {
                this.saving = true;
                try {
                    const url = `${this.apiBaseURL}${this.routes.POST}`;
                    const payload = { route: "updatenote", jwt, note: this.note.trim() };
                    console.log("📤 Envoi de la note :", payload);
                    const response = await fetch(url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    });
                    const data = await response.json();
                    console.log("✅ Réponse API :", data);
                    if (data.status !== "success") {
                        console.error("❌ Erreur lors de la mise à jour :", data.message);
                    }
                }
                catch (error) {
                    console.error("❌ Erreur API Bloc-Note :", error);
                }
                finally {
                    this.saving = false;
                }
            }, 2000);
        }, // 🔥 Mettre à jour la note en temps réel (autosave)
        async fetchStudentData() {
            const cachedData = localStorage.getItem(this.cacheKey);
            const cacheExpiration = parseInt(localStorage.getItem(this.cacheExpirationKey), 10);
            if (cachedData && cacheExpiration && Date.now() < cacheExpiration) {
                try {
                    const parsedData = JSON.parse(cachedData);
                    console.log("⚡ Chargement rapide depuis le cache.");
                    this.updateData(parsedData);
                    this.isLoading = false;
                    return;
                }
                catch (error) {
                    console.error("❌ Erreur parsing cache :", error);
                    this.clearCache(); // Supprime le cache corrompu
                }
            }
            await this.fetchFromAPI();
        },
        clearNote() {
            console.log("🧹 Nettoyage de la note...");
            this.note = ""; // Réinitialise la note visuellement
            // ✅ Met à jour immédiatement le cache local
            let userData = getCache(`userData_${this.prenom}`) || {};
            userData.note = "";
            setCache(`userData_${this.prenom}`, userData);
            // 🔐 N'envoie à l'API que si connecté
            const jwt = sessionStorage.getItem("jwt") || localStorage.getItem("jwt");
            if (jwt) {
                this.sendEmptyFeedbackInBackground(jwt);
            }
            else {
                console.warn("🚫 Non connecté, note vidée localement uniquement.");
            }
        },
        formatDate(dateString) {
            if (!dateString)
                return "Date inconnue";
            const [day, month, yearAndTime] = dateString.split("/");
            const [year, time] = yearAndTime.split(" ");
            return `📅 ${day}/${month}/${year} à ${time}`;
        },
        async sendEmptyFeedbackInBackground(jwt) {
            try {
                const url = `${this.apiBaseURL}${this.routes.POST}`;
                const payload = { route: "updatenote", jwt, note: "" };
                console.log("📤 Envoi de la note vide :", payload);
                const response = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                const data = await response.json();
                console.log("✅ Réponse API mise à jour :", data);
                if (data.status === "success") {
                    console.log("✅ Note supprimée avec succès !");
                }
                else {
                    console.error("❌ Erreur suppression :", data.message);
                }
            }
            catch (error) {
                console.error("❌ Erreur API ClearNote :", error);
            }
        },
        async fetchFromAPI(forceRefresh = false) {
            if (!forceRefresh && !shouldUpdateCache(this.cacheKey, this.cacheDuration)) {
                console.log("✅ Cache encore valide, pas d'appel API.");
                return;
            }
            let cachedData = JSON.parse(localStorage.getItem(this.cacheKey)) || {};
            if (!this.email)
                this.email = localStorage.getItem("email");
            if (!this.prenom)
                this.prenom = localStorage.getItem("prenom");
            if (!this.email || !this.prenom) {
                console.warn("⚠️ Email ou prénom manquant, récupération via JWT...");
                const userInfo = getUserInfoFromJWT();
                if (userInfo.email)
                    this.email = userInfo.email;
                if (userInfo.prenom)
                    this.prenom = userInfo.prenom;
            }
            if (!this.email || !this.prenom) {
                console.error("❌ Email et prénom introuvables.");
                this.isLoading = false; // ✅ ici aussi, important
                return;
            }
            // 🔐 Vérification JWT AVANT appel API
            const jwt = await getValidToken();
            if (!jwt) {
                console.warn("🔒 JWT expiré ou absent, redirection !");
                this.$router.push("/login");
                return;
            }
            try {
                const url = `${this.apiBaseURL}${this.routes.GET}?route=planning&jwt=${encodeURIComponent(jwt)}&email=${this.email}&prenom=${this.prenom}`;
                console.log("📡 URL API :", url);
                const response = await fetch(url, { cache: "no-store" });
                if (!response.ok) {
                    console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
                    return;
                }
                const data = await response.json();
                console.log("📡 Data payload reçue :", data);
                // ✅ Nouvelle logique ici
                if (data.error === "Élève non inscrit") {
                    console.warn("ℹ️ Élève connecté mais pas encore inscrit à un cours.");
                    // ✅ Toujours afficher les cartes de base
                    this.cards = [
                        {
                            icon: "bi bi-calendar-event",
                            title: "Prochain Cours",
                            text: `Tu n’as pas encore de cours prévu.<br>
        👉 <strong><a href='https://www.sunbassschool.com/step/inscription-aux-cours-en-visio/' target='_blank' style='color: #ff8c00;'>Clique ici pour réserver ton premier cours</a></strong> 🎸`
                        },
                        {
                            icon: "bi bi-flag",
                            title: "Objectif actuel",
                            text: `Ton objectif musical n’a pas encore été défini.<br>
        🧭 <strong><a href='https://www.sunbassschool.com/step/inscription-aux-cours-en-visio/' target='_blank' style='color: #ff8c00;'>Prends un cours</a></strong> pour qu'on le définisse ensemble !`
                        }
                    ];
                    this.isLoading = false;
                    return;
                }
                const payload = data; // ✔️ Directement utiliser les données de l'API comme dans la V1
                console.log("🎯 Objectif reçu de l'API :", payload.objectif);
                Object.keys(payload).forEach(key => {
                    if (payload[key] !== null && payload[key] !== undefined) {
                        cachedData[key] = payload[key];
                    }
                });
                localStorage.setItem(this.cacheKey, JSON.stringify(cachedData));
                console.log("📦 Données avant updateData :", cachedData);
                this.updateData(cachedData);
                this.isLoading = false; // Ajoute ce `false` ici
            }
            catch (error) {
                console.error("❌ Erreur API :", error);
            }
        },
        isCacheValid(data) {
            if (!data || typeof data !== "object") {
                console.error("❌ Cache invalide détecté : Données absentes ou incorrectes.");
                return false;
            }
            if (data.status === "error" || data.error) {
                if (data.error === "Aucun lien Meet trouvé") {
                    console.warn("⚠️ Aucun lien Meet trouvé, mais ce n'est pas une erreur critique.");
                    return true;
                }
                console.error("❌ Cache invalide détecté :", data.error || data.message);
                return false;
            }
            const hasValidProchainCours = data.prochainCours &&
                typeof data.prochainCours === "object" &&
                typeof data.prochainCours.date === "string" &&
                typeof data.prochainCours.cours === "string";
            const hasValidObjectif = typeof data.objectif === "string";
            if (!hasValidProchainCours && !hasValidObjectif) {
                console.error("❌ Cache invalide : Données essentielles manquantes.");
                return false;
            }
            return true;
        },
        updateData(data) {
            console.log("🧠 updateData() appelée avec :", data);
            console.log("📌 Mise à jour des cartes...");
            console.log("📡 Data reçue :", data);
            ;
            // 🔍 Récupération du cache actuel
            let cachedData = localStorage.getItem(this.cacheKey);
            cachedData = cachedData ? JSON.parse(cachedData) : {};
            let userInfosKey = `userInfos_${this.prenom}`;
            let cachedInfos = localStorage.getItem(userInfosKey);
            cachedInfos = cachedInfos ? JSON.parse(cachedInfos) : {};
            // 🔄 Fusion des anciennes et nouvelles données (hors espace_google_drive et playlist_youtube)
            const updatedData = {
                ...cachedData,
                ...data,
            };
            // ✅ Stocker espace_google_drive, playlist_youtube et objectif dans userInfos_{prenom}
            if (data.espace_google_drive !== undefined) {
                cachedInfos.espace_google_drive = data.espace_google_drive;
            }
            if (data.playlist_youtube !== undefined) {
                cachedInfos.playlist_youtube = data.playlist_youtube;
            }
            if (data.objectif !== undefined) {
                cachedInfos.objectif = data.objectif; // 🔥 Sauvegarde de l'objectif
            }
            console.log("💾 Sauvegarde du cache mise à jour :", updatedData);
            localStorage.setItem(this.cacheKey, JSON.stringify(updatedData));
            console.log("💾 Sauvegarde des infos séparées :", cachedInfos);
            localStorage.setItem(userInfosKey, JSON.stringify(cachedInfos));
            // 📌 Mise à jour des cartes (exemple pour Dashboard)
            // 📌 Mise à jour des cartes (exemple pour Dashboard)
            if (!Array.isArray(updatedData.planning) || updatedData.planning.length === 0) {
                this.cards = [
                    {
                        icon: "bi bi-calendar-event",
                        title: "Prochain Cours",
                        text: "🎸 Aucun cours prévu pour le moment."
                    },
                    {
                        icon: "bi bi-flag",
                        title: "Objectif actuel",
                        text: updatedData.objectif || "🎯 Aucun objectif défini"
                    }
                ];
                return;
            }
            // 📌 Trouver le prochain cours
            const now = new Date();
            const prochainCours = updatedData.planning.find(cours => new Date(cours.date) > now);
            if (!prochainCours) {
                this.cards = [
                    {
                        icon: "bi bi-calendar-event",
                        title: "Prochain Cours",
                        text: "Aucun cours à venir."
                    },
                    {
                        icon: "bi bi-flag",
                        title: "Objectif actuel",
                        text: updatedData.objectif || "Aucun objectif défini"
                    }
                ];
                return;
            }
            console.log("🎯 Prochain cours sélectionné :", prochainCours);
            this.cards = [
                {
                    icon: "bi bi-calendar-event",
                    title: "Prochain Cours",
                    text: `
                <div class="meet-button" onclick="window.open('${prochainCours.meet}', '_blank')">
                    <strong>${prochainCours.formattedDate}</strong>
                    <i class="bi bi-link-45deg"></i>
                </div>
            `
                },
                {
                    icon: "bi bi-flag",
                    title: "Objectif actuel",
                    text: updatedData.objectif || "Aucun objectif défini"
                }
            ];
        },
        displayError() {
            this.cards = [
                {
                    icon: "bi bi-calendar-event",
                    title: "Prochain Cours",
                    text: `Tu n'as pas encore de cours prévu.<br>
         👉 <strong><a href='https://www.sunbassschool.com/step/inscription-aux-cours-en-visio/' target='_blank' style='color: #ff8c00;'>Clique ici pour réserver ton prochain cours</a></strong> et continuer à progresser 🎸`
                },
                {
                    icon: "bi bi-flag",
                    title: "Objectif actuel",
                    text: `Ton objectif musical n'a pas encore été défini.<br>
         🧭 <strong><a href='https://www.sunbassschool.com/step/inscription-aux-cours-en-visio/' target='_blank' style='color: #ff8c00;'>Prends un cours</a></strong> pour qu'on le construise ensemble ! 💪`
                }
            ];
        },
        redirectToRegisterform() {
            this.$router.push("/registerform");
        },
        redirectToLogin() {
            router.replace("/login");
        }
    }
});
const __VLS_ctx = {};
const __VLS_componentsOption = { Layout };
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['refresh-note-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['refresh-note-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['refresh-note-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-card']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-card']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-card']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-card']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-card']} */ ;
/** @type {__VLS_StyleScopedClasses['icon']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-card']} */ ;
/** @type {__VLS_StyleScopedClasses['icon']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['update-cache-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['container']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-card']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-card']} */ ;
/** @type {__VLS_StyleScopedClasses['icon']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-card']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-card']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-card']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-card']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-card']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-card']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-card']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-card']} */ ;
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.Layout;
/** @type {[typeof __VLS_components.Layout, typeof __VLS_components.Layout, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_4 = {};
__VLS_3.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "container d-flex flex-column align-items-center justify-content-center" },
});
if (__VLS_ctx.isLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-center mt-5" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "spinner-border custom-spinner" },
        role: "status",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "visually-hidden" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "mt-3 text-light fw-bold opacity-75 animate-fade" },
    });
}
if (!__VLS_ctx.isLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "content" },
    });
    for (const [card, index] of __VLS_getVForSourceType((__VLS_ctx.cards))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (index),
            ...{ class: "fade-in position-relative" },
            ...{ class: ({ 'first-card': index === 0 }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "dashboard-card rounded-3 p-4 d-flex align-items-center" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: (card.icon) },
            ...{ class: "icon me-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ class: "h5 mb-1 d-flex align-items-center" },
        });
        (card.title);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-muted mb-0" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (card.text) }, null, null);
        if (index === 1) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "dashboard-card rounded-3 p-4 d-flex flex-column" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
                ...{ class: "h5 mb-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
                ...{ onInput: (__VLS_ctx.onNoteInput) },
                value: (__VLS_ctx.note),
                ...{ class: "form-control mt-2" },
                placeholder: "Écris ta note ici...",
                rows: "5",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "d-flex justify-content-end mt-1" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(!__VLS_ctx.isLoading))
                            return;
                        if (!(index === 1))
                            return;
                        __VLS_ctx.fetchNote(true);
                    } },
                ...{ class: "btn refresh-note-btn d-flex align-items-center gap-2 px-3 py-1" },
                disabled: (__VLS_ctx.isRefreshingNote),
                ...{ class: ({ 'no-border': __VLS_ctx.isRefreshingNote }) },
            });
            if (!__VLS_ctx.isRefreshingNote) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "custom-spinner" },
                    role: "status",
                    'aria-hidden': "true",
                });
            }
            if (__VLS_ctx.noteUpdatedMessage) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "note-update-msg mt-1" },
                });
                (__VLS_ctx.noteUpdatedMessage);
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "clear-note-container" },
            });
            if (__VLS_ctx.note.length) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ onClick: (__VLS_ctx.clearNote) },
                    ...{ class: "bi bi-x-circle clear-note-btn" },
                });
            }
        }
    }
}
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['container']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-5']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['custom-spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['visually-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-light']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['opacity-75']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-fade']} */ ;
/** @type {__VLS_StyleScopedClasses['content']} */ ;
/** @type {__VLS_StyleScopedClasses['fade-in']} */ ;
/** @type {__VLS_StyleScopedClasses['position-relative']} */ ;
/** @type {__VLS_StyleScopedClasses['first-card']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-card']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-3']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['icon']} */ ;
/** @type {__VLS_StyleScopedClasses['me-3']} */ ;
/** @type {__VLS_StyleScopedClasses['h5']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-card']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-3']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['h5']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-end']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['refresh-note-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['no-border']} */ ;
/** @type {__VLS_StyleScopedClasses['custom-spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['note-update-msg']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['clear-note-container']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-x-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['clear-note-btn']} */ ;
var __VLS_dollars;
let __VLS_self;
