import { refreshToken } from '@/utils/api.ts';
import Layout from "../views/Layout.vue";
import { jwtDecode } from "jwt-decode";
import { getToken, getFromIndexedDB, saveToIndexedDB, getValidToken } from "@/utils/api";
import { checkAuth } from "@/utils/authUtils";
export default (await import('vue')).defineComponent({
    name: "MonEspace",
    components: { Layout },
    data() {
        return {
            isInitialized: false,
            isReady: false,
            isLoadingResources: false, // 🔄 S'active uniquement si les ressources sont absentes du cache
            isDataReady: false,
            showModal: false,
            isUpdating: false, // 🔄 Pour afficher la barre pendant la mise à jour du cache
            isSaving: false,
            savedAnimation: false, // Pour l'effet de validation après sauvegarde
            debounceTimer: null, // 🔥 Timer pour éviter trop de requêtes
            showInfos: false,
            isEditingInfo: false,
            isEditing: false,
            user: {
                prenom: "",
                email: "",
                telephone: "",
                cursus: "",
                trimestre: "",
                objectif: "",
                statut: "",
                espace_google_drive: null, // 🔥 Évite d'afficher "accès réservé" par défaut
                playlist_youtube: null,
            },
            loading: false,
            error: "",
            cacheDuration: 24 * 60 * 60 * 1000, // 24 heures en millisecondes
            apiBaseURL: "https://script.google.com/macros/s/", // Suppression du proxy côté base URL
            routes: {
                GET: "AKfycbz-K2F1WavlIe5pxTaXwnirV1pw9pjiq6Q776zui50scu7qNaJZBVCUFfh3frkw7GVhWg/exec",
                POST: "AKfycbz-K2F1WavlIe5pxTaXwnirV1pw9pjiq6Q776zui50scu7qNaJZBVCUFfh3frkw7GVhWg/exec"
            },
            fetchURL(route) {
                return `https://cors-proxy-37yu.onrender.com/${this.apiBaseURL}${this.routes[route]}`;
            }
        };
    },
    computed: {
        jwt() {
            return sessionStorage.getItem("jwt") || localStorage.getItem("jwt") || "";
        },
        prenom() {
            return sessionStorage.getItem("prenom") || localStorage.getItem("prenom") || "";
        },
        cacheKey() {
            return `userData_${this.prenom}`;
        },
        cacheExpirationKey() {
            return `${this.cacheKey}_expiration`;
        }
    },
    mounted() {
        console.log("🔒 Auth → Vérification du JWT et prénom via checkAuth...");
        // ✅ Assure que JWT + prénom sont bien dispos (même si absents du localStorage)
        checkAuth().then(async () => {
            console.log("🔍 Vérification du cache...");
            const cacheUsed = this.loadUserData();
            console.log("🔍 Vérification du cache pour `userInfos_{prenom}`...");
            this.loadUserInfos();
            if (cacheUsed) {
                console.log("✅ Données récupérées via le cache.");
                this.loading = false;
                if (!this.user.espace_google_drive || !this.user.playlist_youtube) {
                    console.log("⚠️ Données incomplètes dans le cache, mise à jour en arrière-plan...");
                    this.fetchUserData(true).finally(() => {
                        this.isUpdating = false;
                    });
                }
                else {
                    this.isUpdating = false;
                }
            }
            else {
                console.log("⚠️ Cache expiré ou introuvable, affichage du loader...");
                this.loading = true;
                this.isUpdating = true;
                setTimeout(async () => {
                    await this.fetchUserData(true);
                    this.loading = false;
                    this.isUpdating = false;
                }, 500);
            }
            // Rôle utilisateur
            this.checkUserRole();
            if (this.isInitialized)
                return;
            this.isInitialized = true;
            console.log("🔍 Cache au chargement :", localStorage.getItem(this.cacheKey));
            document.addEventListener("click", this.handleClickOutside);
        }).catch(error => {
            console.error("❌ Auth échouée :", error);
            this.error = "Impossible de vérifier l'authentification.";
            this.loading = false;
        });
    },
    // Mise à jour de la méthode loadUserData pour réinitialiser les états une fois les données chargées
    async loadUserData() {
        const cachedData = localStorage.getItem(this.cacheKey);
        const cacheExpiration = localStorage.getItem(this.cacheExpirationKey);
        if (cachedData && cacheExpiration && Date.now() < parseInt(cacheExpiration)) {
            console.log("⚡ Chargement immédiat depuis le cache !");
            this.user = JSON.parse(cachedData);
            this.$forceUpdate(); // 🔥 Force Vue à rafraîchir l'affichage
            console.log("🎯 Objectif après mise à jour de Vue :", this.user.objectif);
            // ✅ Vérifie si `objectif` est bien défini
            if (!this.user.objectif) {
                console.warn("⚠️ Objectif absent du cache, récupération API...");
                await this.fetchUserData(true);
            }
            this.isDataReady = true;
            this.loading = false;
            this.isUpdating = false;
            return true;
        }
        console.warn("🚨 Cache expiré ou introuvable, chargement via API...");
        this.loading = true;
        this.isUpdating = true;
        return false;
    },
    beforeUnmount() {
        // 🛠️ Suppression de l'écouteur d'événements pour éviter les fuites mémoire
        document.removeEventListener("click", this.handleClickOutside);
    },
    watch: {
        jwt(newVal, oldVal) {
            if (newVal && newVal !== oldVal) {
                console.log("🔄 JWT mis à jour, rechargement des données utilisateur...");
                if (!this.isInitialized) {
                    this.loadUserData(true);
                }
            }
        }
    },
    methods: {
        async loadUserInfos() {
            const userInfosKey = `userInfos_${this.prenom}`;
            const cachedInfos = localStorage.getItem(userInfosKey);
            if (cachedInfos) {
                const parsedInfos = JSON.parse(cachedInfos);
                // 🔥 Ajoute l'objectif ici
                this.user.espace_google_drive = parsedInfos.espace_google_drive || null;
                this.user.playlist_youtube = parsedInfos.playlist_youtube || null;
                this.user.objectif = parsedInfos.objectif || null;
                console.log("📦 Données récupérées depuis le cache :", parsedInfos);
                // Si une des données est absente, appel API pour compléter
                if (!this.user.espace_google_drive || !this.user.playlist_youtube || !this.user.objectif) {
                    console.log("⚠️ Données incomplètes dans le cache, appel API...");
                    await this.fetchUserInfos();
                }
                return;
            }
            console.warn("🚨 Aucun cache trouvé pour `userInfos_{prenom}`, appel API...");
            await this.fetchUserInfos();
        },
        async checkUserRole() {
            console.log("🔄 Vérification du rôle utilisateur...");
            // Récupère le rôle depuis localStorage
            this.user.role = localStorage.getItem("role");
            if (!this.user.role) {
                console.warn("⚠️ Aucun rôle trouvé localement, récupération via API...");
                // Récupère le prénom depuis IndexedDB si disponible
                const prenomInIndexedDB = await getFromIndexedDB('prenom');
                if (prenomInIndexedDB) {
                    this.user.prenom = prenomInIndexedDB;
                    console.log("Prénom récupéré depuis IndexedDB :", this.user.prenom);
                }
                else {
                    // Sinon, récupère le prénom depuis le JWT
                    const jwt = await getValidToken(); // Récupère le JWT
                    if (jwt) {
                        try {
                            const decoded = jwtDecode(jwt); // Décode le JWT
                            this.user.role = decoded.role;
                            this.user.prenom = decoded.prenom; // Récupère le prénom depuis le JWT
                            // Sauvegarde du prénom dans IndexedDB pour utilisation future
                            await saveToIndexedDB('prenom', this.user.prenom); // Sauvegarde le prénom dans IndexedDB
                            console.log("Prénom récupéré depuis le JWT :", this.user.prenom);
                        }
                        catch (error) {
                            console.error("❌ Erreur lors du décodage du JWT :", error);
                        }
                    }
                }
                // Sauvegarde du rôle dans localStorage si non présent
                if (this.user.role) {
                    localStorage.setItem("role", this.user.role);
                }
            }
            // Met à jour l'affichage immédiatement
            this.$forceUpdate();
        },
        markVideoAsWatched() {
            sessionStorage.setItem("videoShown", "true"); // ✅ Dès que la vidéo commence, on empêche qu'elle se rejoue
        },
        openSignupPage() {
            window.open("https://www.sunbassschool.com/step/inscription-aux-cours-en-visio/#checkout", "_blank");
        },
        closeModal() {
            this.showModal = false;
        },
        editObjectif() {
            this.previousObjectif = this.user.objectif; // 🆕 Ajouté ici
            console.log("✏️ Icône crayon cliquée !");
            this.isEditing = true; // ✅ Change l'état d'édition
        },
        closeEdit() {
            this.isEditing = false;
            this.updateUserData(); // Assure que la donnée est bien enregistrée
        },
        saveObjectif() {
            console.log("💾 Bouton de sauvegarde cliqué !");
            // ✅ Ferme immédiatement le champ d'édition
            this.isEditing = false;
            this.isSaving = true; // 🔥 Active l'animation de sauvegarde
            this.updateObjectif()
                .then(() => {
                this.isSaving = false;
                this.savedAnimation = true;
                setTimeout(() => this.savedAnimation = false, 1000);
            })
                .catch(() => {
                this.isSaving = false;
            });
        },
        editField(field) {
            this.isEditingInfo = field; // Active l'édition du champ sélectionné
            this.$nextTick(() => {
                if (field === 'email')
                    this.$refs.emailInput.focus();
                if (field === 'telephone')
                    this.$refs.telephoneInput.focus();
                if (field === 'objectif')
                    this.$refs.objectifInput.focus();
            });
        },
        debouncedUpdateObjectif() {
            if (this.debounceTimer)
                clearTimeout(this.debounceTimer); // 🔥 Annule l'ancienne requête en attente
            this.debounceTimer = setTimeout(() => {
                this.updateObjectif();
            }, 1000); // ⏳ Attend 1 seconde avant d'exécuter la requête
        },
        updateInfosPerso() {
            console.log("💾 Mise à jour des infos :", this.user);
            // 📨 Appel API pour sauvegarder l'email & le téléphone ici...
            this.isEditingInfo = null; // Désactive l'édition après la mise à jour
        },
        initializeUser() {
            const jwt = sessionStorage.getItem("jwt") || localStorage.getItem("jwt");
            const prenom = sessionStorage.getItem("prenom") || localStorage.getItem("prenom");
            if (!jwt || !prenom) {
                console.log("❌ JWT ou prénom manquant.");
                this.error = "Utilisateur non connecté ou prénom manquant.";
                this.loading = false;
                return;
            }
            console.log("✅ Utilisateur détecté :", prenom);
            this.loadUserData(); // Charge les infos de l'utilisateur
        },
        encodeJWT(jwt) {
            return encodeURIComponent(jwt).replace(/\+/g, "%2B"); // Remplace + par %2B
        },
        async updateObjectif() {
            console.log("💾 Enregistrement de l'objectif...");
            const nouvelObjectif = this.user.objectif.trim();
            if (!nouvelObjectif || nouvelObjectif === this.previousObjectif) {
                this.isSaving = false;
                this.isEditing = false; // ✅ Ferme le champ d'édition
                return;
            }
            this.isEditing = false;
            this.previousObjectif = nouvelObjectif;
            const url = this.fetchURL("POST") +
                `?route=updateeleve&jwt=${this.jwt}` +
                `&objectif=${encodeURIComponent(nouvelObjectif)}`;
            console.log("🔗 URL de la requête API :", url);
            try {
                const response = await fetch(url);
                const data = await response.json();
                if (data.status !== "error") {
                    console.log("✅ Sauvegarde réussie !");
                    // ✅ Met à jour le cache et ferme l'édition
                    this.isEditing = false;
                    this.isSaving = false;
                    this.savedAnimation = true;
                    setTimeout(() => {
                        this.savedAnimation = false;
                    }, 1000);
                    const userInfosKey = `userInfos_${this.prenom}`;
                    const userInfos = JSON.parse(localStorage.getItem(userInfosKey)) || {};
                    userInfos.objectif = nouvelObjectif;
                    localStorage.setItem(userInfosKey, JSON.stringify(userInfos));
                }
                else {
                    console.error("❌ Erreur lors de la sauvegarde de l'objectif");
                }
            }
            catch (err) {
                console.error("❌ Erreur API :", err);
            }
            finally {
                this.isSaving = false;
                this.isEditing = false;
                this.updateLocalCache({ objectif: nouvelObjectif });
                // ✅ Ferme le champ après la mise à jour
            }
        },
        updateData(data) {
            console.log("📌 Mise à jour des données utilisateur...");
            console.log("📡 Data reçue :", data);
            // 🔍 Récupération des données existantes dans le cache
            let cachedData = localStorage.getItem(this.cacheKey);
            cachedData = cachedData ? JSON.parse(cachedData) : {};
            // 🔄 Fusion des anciennes et nouvelles données
            const updatedData = {
                ...cachedData, // ✅ On garde les anciennes valeurs
                ...data, // ✅ On ajoute les nouvelles valeurs de l'API
            };
            // 🔥 Ne pas écraser ces valeurs si elles ne sont pas renvoyées par l'API
            if (!data.espace_google_drive && cachedData.espace_google_drive) {
                updatedData.espace_google_drive = cachedData.espace_google_drive;
            }
            if (!data.playlist_youtube && cachedData.playlist_youtube) {
                updatedData.playlist_youtube = cachedData.playlist_youtube;
            }
            console.log("💾 Sauvegarde du cache mise à jour :", updatedData);
            localStorage.setItem(this.cacheKey, JSON.stringify(updatedData));
            // Mise à jour de `this.user`
            this.user = updatedData;
        },
        async fetchUserInfos() {
            console.log("🔄 Récupération des infos utilisateur...");
            this.isLoadingResources = true;
            try {
                let prenom = this.prenom;
                // 🔍 Sécurité : si prénom absent, tente de le récupérer via le JWT
                if (!prenom) {
                    const jwt = await getValidToken();
                    const decoded = jwtDecode(jwt);
                    prenom = decoded?.prenom;
                    this.user.prenom = prenom;
                    localStorage.setItem("prenom", prenom); // pour les futurs accès
                }
                const url = this.fetchURL("GET") + `?route=recupInfosMembres&jwt=${await getValidToken()}&prenom=${prenom}`;
                console.log("📡 URL API :", url);
                const response = await fetch(url);
                if (!response.ok)
                    throw new Error(`Erreur HTTP ${response.status}`);
                const data = await response.json();
                console.log("✅ Données reçues :", data);
                if (!data.error) {
                    // Mise à jour des données utilisateur
                    this.user.espace_google_drive = data.espace_google_drive || null;
                    this.user.playlist_youtube = data.playlist_youtube || null;
                    this.user.objectif = data.objectif || null;
                    // Sauvegarde en cache
                    localStorage.setItem(`userInfos_${this.prenom}`, JSON.stringify({
                        espace_google_drive: this.user.espace_google_drive,
                        playlist_youtube: this.user.playlist_youtube,
                        objectif: this.user.objectif
                    }));
                    console.log("✅ Ressources mises à jour !");
                }
                else {
                    console.error("❌ Erreur API :", data.message);
                }
            }
            catch (err) {
                console.error("❌ Erreur API :", err.message);
            }
            finally {
                this.isLoadingResources = false; // Désactive le loader
            }
        },
        async fetchUserData(forceUpdate = false) {
            if (this.isDataReady && !forceUpdate) {
                console.log("✅ Données déjà présentes dans le cache.");
                this.isUpdating = false;
                this.loading = false;
                return;
            }
            console.log("🔐 Authentification → vérification des jetons...");
            const { jwt, prenom } = await checkAuth();
            if (!jwt || !prenom) {
                console.warn("❌ JWT ou prénom manquant. Annulation.");
                this.error = "Erreur d’authentification.";
                return;
            }
            const url = this.fetchURL("GET") + `?route=recupInfosMembres&jwt=${jwt}&prenom=${encodeURIComponent(prenom)}`;
            console.log("🔗 URL de l’API :", url);
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    console.error("❌ Erreur HTTP :", response.status);
                    return;
                }
                const data = await response.json();
                if (!data.error) {
                    this.user = Object.assign({}, this.user, data);
                    this.isDataReady = true;
                    this.isUpdating = false;
                    this.loading = false;
                    localStorage.setItem(this.cacheKey, JSON.stringify(this.user));
                }
                else {
                    console.error("❌ Erreur API :", data.message);
                }
            }
            catch (err) {
                console.error("❌ Erreur de récupération :", err.message);
                this.error = "Impossible de récupérer les données.";
            }
        },
        updateLocalCache(data) {
            if (!data || data.status === "error") {
                console.error("❌ Données invalides détectées, cache non mis à jour :", data);
                return;
            }
            const cachedData = JSON.parse(localStorage.getItem(this.cacheKey)) || {};
            const updatedData = {
                ...cachedData, // ✅ Conserve les anciennes données
                ...data, // ✅ Ajoute les nouvelles
            };
            // 🔥 Ne pas écraser ces valeurs si elles ne sont pas renvoyées par l'API
            if (!data.espace_google_drive)
                updatedData.espace_google_drive = cachedData.espace_google_drive;
            if (!data.playlist_youtube)
                updatedData.playlist_youtube = cachedData.playlist_youtube;
            console.log("💾 Sauvegarde du cache après fusion :", updatedData);
            localStorage.setItem(this.cacheKey, JSON.stringify(updatedData));
            localStorage.setItem(this.cacheExpirationKey, (Date.now() + this.cacheDuration).toString());
        },
        async loadUserData() {
            const cachedData = localStorage.getItem(this.cacheKey);
            const cacheExpiration = localStorage.getItem(this.cacheExpirationKey);
            if (cachedData && cacheExpiration && Date.now() < parseInt(cacheExpiration)) {
                console.log("⚡ Chargement immédiat depuis le cache !");
                this.user = JSON.parse(cachedData);
                console.log("📡 Objectif après récupération du cache :", this.user.objectif);
                this.isDataReady = true; // ✅ Active directement l'affichage
                this.isUpdating = false; // Masque la barre de progression
                this.loading = false; // Masque le loader
                return true;
            }
            console.warn("🚨 Cache expiré ou introuvable, affichage du loader...");
            this.isUpdating = true; // Barre de progression visible pendant le chargement
            this.loading = true; // Affiche le loader pendant la récupération des données depuis l'API
            return false;
        },
        async fetchUserData(forceUpdate = false) {
            // Si les données sont déjà prêtes et qu'on ne force pas la mise à jour, on n'appelle pas l'API
            if (this.isDataReady && !forceUpdate) {
                console.log("✅ Données déjà présentes dans le cache.");
                this.isUpdating = false; // Masque la barre de progression
                this.loading = false; // Masque le loader
                return; // Pas besoin d'appeler l'API si les données sont déjà là
            }
            console.log("🔄 Récupération des données utilisateur...");
            try {
                const prenom = sessionStorage.getItem("prenom") || localStorage.getItem("prenom");
                if (!prenom) {
                    console.error("❌ Prénom manquant");
                    return;
                }
                const url = this.fetchURL("GET") + `?route=recupInfosMembres&jwt=${await getValidToken()}&prenom=${prenom}`;
                console.log("🔗 URL de la requête :", url);
                const response = await fetch(url);
                console.log("📌 Statut HTTP de la réponse :", response.status);
                if (response.status !== 200) {
                    console.error("❌ Erreur API, statut non 200 :", response.status);
                    return;
                }
                const data = await response.json();
                console.log("✅ Données reçues :", data);
                if (!data.error) {
                    this.user = { ...this.user, ...data };
                    this.isDataReady = true; // Données récupérées, on marque comme prêtes
                    this.isUpdating = false; // Masque la barre de progression
                    this.loading = false; // Masque le loader
                    localStorage.setItem(this.cacheKey, JSON.stringify(this.user));
                }
                else {
                    console.error("❌ Erreur API :", data.message);
                }
            }
            catch (err) {
                console.error("❌ Erreur API :", err.message);
                this.error = "Impossible de récupérer les données.";
            }
        },
        toggleModal(state) {
            this.showInfos = state;
        },
        async updateUserData() {
            if (this.debounceTimer)
                clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(async () => {
                console.log("💾 Enregistrement des données utilisateur...");
                try {
                    const url = this.fetchURL("POST") +
                        `?route=updateeleve&jwt=${this.jwt}` +
                        `&telephone=${encodeURIComponent(this.user.telephone)}` +
                        `&objectif=${encodeURIComponent(this.user.objectif)}`;
                    const response = await fetch(url);
                    const data = await response.json();
                    if (data.status !== "error") {
                        console.log("✅ Sauvegarde réussie !");
                        this.updateLocalCache(this.user);
                    }
                }
                catch (err) {
                    console.error("❌ Erreur lors de la sauvegarde :", err);
                }
            }, 2000); // ⏳ Délai de 2 secondes
        },
        uupdateObjectif() {
            if (this.isSaving)
                return;
            this.isSaving = true;
            this.isEditing = false;
            let nouvelObjectif = this.user.objectif.trim();
            if (!nouvelObjectif) {
                nouvelObjectif = "🎯 Aucun objectif défini pour le moment. Fixe-toi un challenge !";
                this.user.objectif = nouvelObjectif; // ✅ Met à jour immédiatement l'affichage
            }
            console.log("💾 Enregistrement de l'objectif...");
            fetch(this.fetchURL("POST") +
                `?route=updateeleve&jwt=${this.jwt}` +
                `&objectif=${encodeURIComponent(nouvelObjectif)}`)
                .then(response => response.json())
                .then(data => {
                if (data.status !== "error") {
                    console.log("✅ Sauvegarde réussie !");
                    this.updateLocalCache({ objectif: nouvelObjectif });
                }
                else {
                    console.error("❌ Erreur lors de la sauvegarde de l'objectif");
                }
            })
                .catch(err => {
                console.error("❌ Erreur API :", err);
            })
                .finally(() => {
                this.isSaving = false;
            });
        },
        updateInfosPerso() {
            this.isEditingInfo = false;
            this.updateUserData({
                route: "updateeeleve",
                email: this.user.email,
                telephone: this.user.telephone
            });
        },
    }
});
const __VLS_ctx = {};
const __VLS_componentsOption = { Layout };
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['resource-item']} */ ;
/** @type {__VLS_StyleScopedClasses['resource-item']} */ ;
/** @type {__VLS_StyleScopedClasses['editable']} */ ;
/** @type {__VLS_StyleScopedClasses['editable-input']} */ ;
/** @type {__VLS_StyleScopedClasses['video-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-content']} */ ;
/** @type {__VLS_StyleScopedClasses['close-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['cta-button']} */ ;
/** @type {__VLS_StyleScopedClasses['edit-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['save-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-card']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-card']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-card']} */ ;
/** @type {__VLS_StyleScopedClasses['resource-box']} */ ;
/** @type {__VLS_StyleScopedClasses['resource-item']} */ ;
/** @type {__VLS_StyleScopedClasses['resource-item']} */ ;
/** @type {__VLS_StyleScopedClasses['goal-box']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-box']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-content']} */ ;
/** @type {__VLS_StyleScopedClasses['close-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['editable']} */ ;
/** @type {__VLS_StyleScopedClasses['editable']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-card']} */ ;
/** @type {__VLS_StyleScopedClasses['info-section']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-card']} */ ;
/** @type {__VLS_StyleScopedClasses['goal-box']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-container']} */ ;
/** @type {__VLS_StyleScopedClasses['info-box']} */ ;
/** @type {__VLS_StyleScopedClasses['goal-box']} */ ;
/** @type {__VLS_StyleScopedClasses['goal-box']} */ ;
/** @type {__VLS_StyleScopedClasses['goal-box']} */ ;
/** @type {__VLS_StyleScopedClasses['goal-box']} */ ;
/** @type {__VLS_StyleScopedClasses['resource-box']} */ ;
/** @type {__VLS_StyleScopedClasses['resource-item']} */ ;
/** @type {__VLS_StyleScopedClasses['resource-item']} */ ;
/** @type {__VLS_StyleScopedClasses['resource-item']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-box']} */ ;
/** @type {__VLS_StyleScopedClasses['resource-separator']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-card']} */ ;
/** @type {__VLS_StyleScopedClasses['info-box']} */ ;
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.Layout;
/** @type {[typeof __VLS_components.Layout, typeof __VLS_components.Layout, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_4 = {};
__VLS_3.slots.default;
if (__VLS_ctx.showModal) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.closeModal) },
        ...{ class: "video-modal" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-content" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ onClick: (__VLS_ctx.closeModal) },
        ...{ class: "close-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "bi bi-x-lg" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.video, __VLS_intrinsicElements.video)({
        ...{ onPlay: (__VLS_ctx.markVideoAsWatched) },
        ref: "promoVideo",
        controls: true,
        autoplay: true,
        ...{ class: "promo-video" },
    });
    /** @type {typeof __VLS_ctx.promoVideo} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.source, __VLS_intrinsicElements.source)({
        src: "https://www.sunbassschool.com/wp-content/uploads/2023/11/promo-cours-en-visio.mp4",
        type: "video/mp4",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.openSignupPage) },
        ...{ class: "cta-button" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "d-flex justify-content-center w-100 mt-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row justify-content-center" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-lg-12 col-md-10 w-100" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card glass-card p-4 text-center animated-card" },
});
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "loading-content" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "spinner-border text-primary" },
        role: "status",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "visually-hidden" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "mt-2 text-muted" },
    });
}
else if (__VLS_ctx.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-danger" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.error);
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-box goal-box text-center" },
        ...{ class: ({ 'shake': __VLS_ctx.isSaving, 'pulse': __VLS_ctx.savedAnimation, 'flash': __VLS_ctx.savedAnimation }) },
    });
    if (__VLS_ctx.isEditing) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onKeyup: (__VLS_ctx.saveObjectif) },
            ...{ onBlur: (__VLS_ctx.saveObjectif) },
            ...{ class: "form-control form-control-sm w-100" },
        });
        (__VLS_ctx.user.objectif);
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "d-flex align-items-center justify-content-between w-100" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "badge bg-warning text-dark fs-5 text-wrap flex-grow-1 text-center" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-break fw-bold lh-sm" },
        });
        (console.log("🖥️ Objectif affiché dans le template :", __VLS_ctx.user.objectif) || __VLS_ctx.user.objectif || "🎯 Aucun objectif défini !");
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ onClick: (__VLS_ctx.editObjectif) },
            ...{ class: "editable" },
            title: "Modifier l'objectif",
        });
    }
    if (__VLS_ctx.isEditing) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.saveObjectif) },
            ...{ class: "btn btn-link p-0 text-success" },
        });
    }
    if (__VLS_ctx.loading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "loading-container" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "spinner-border text-primary" },
            role: "status",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "visually-hidden" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mt-2 text-muted" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-box resource-box" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.hr, __VLS_intrinsicElements.hr)({
        ...{ class: "my-1 resource-separator" },
    });
    if (__VLS_ctx.isLoadingResources) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "loading-container" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "spinner-border text-primary spinner-resources" },
            role: "status",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mt-2 text-light" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
            ...{ class: "list-group list-unstyled" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
            ...{ class: "resource-item" },
        });
        if (__VLS_ctx.user.espace_google_drive) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                href: (__VLS_ctx.user.espace_google_drive),
                target: "_blank",
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                href: "https://www.sunbassschool.com/step/inscription-aux-cours-en-visio/#checkout",
                ...{ class: "text-muted text-decoration-none" },
                target: "_blank",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.br, __VLS_intrinsicElements.br)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "btn btn-primary btn-sm mt-2" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
            ...{ class: "resource-item" },
        });
        if (__VLS_ctx.user.playlist_youtube) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                href: (__VLS_ctx.user.playlist_youtube),
                target: "_blank",
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                href: "https://www.sunbassschool.com/step/inscription-aux-cours-en-visio/#checkout",
                ...{ class: "text-muted text-decoration-none" },
                target: "_blank",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.br, __VLS_intrinsicElements.br)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "btn btn-primary btn-sm mt-2" },
            });
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-box profile-box" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.loading))
                    return;
                if (!!(__VLS_ctx.error))
                    return;
                __VLS_ctx.showInfos = true;
            } },
        ...{ class: "btn btn-primary w-100 d-flex align-items-center justify-content-center py-3 fw-bold" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "fs-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ms-2" },
    });
    if (__VLS_ctx.showInfos) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!!(__VLS_ctx.error))
                        return;
                    if (!(__VLS_ctx.showInfos))
                        return;
                    __VLS_ctx.showInfos = false;
                } },
            ...{ class: "overlay" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: () => { } },
            ...{ class: "modal-content" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!!(__VLS_ctx.error))
                        return;
                    if (!(__VLS_ctx.showInfos))
                        return;
                    __VLS_ctx.showInfos = false;
                } },
            ...{ class: "close-btn" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "bi bi-x-lg" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: "minimal-title" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
            ...{ class: "list-unstyled" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.user.email);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
            ...{ class: "py-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        if (__VLS_ctx.isEditingInfo !== 'telephone') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loading))
                            return;
                        if (!!(__VLS_ctx.error))
                            return;
                        if (!(__VLS_ctx.showInfos))
                            return;
                        if (!(__VLS_ctx.isEditingInfo !== 'telephone'))
                            return;
                        __VLS_ctx.editField('telephone');
                    } },
                ...{ class: "editable text-primary" },
            });
            (__VLS_ctx.user.telephone);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "bi bi-pencil ms-2 text-muted" },
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
                ...{ onBlur: (__VLS_ctx.updateInfosPerso) },
                ...{ onKeyup: (__VLS_ctx.updateInfosPerso) },
                value: (__VLS_ctx.user.telephone),
                type: "text",
                ...{ class: "form-control form-control-sm d-inline-block w-auto" },
                ref: "telephoneInput",
            });
            /** @type {typeof __VLS_ctx.telephoneInput} */ ;
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
            ...{ class: "py-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        if (__VLS_ctx.isEditingInfo !== 'objectif') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loading))
                            return;
                        if (!!(__VLS_ctx.error))
                            return;
                        if (!(__VLS_ctx.showInfos))
                            return;
                        if (!(__VLS_ctx.isEditingInfo !== 'objectif'))
                            return;
                        __VLS_ctx.editField('objectif');
                    } },
                ...{ class: "editable text-primary" },
            });
            (__VLS_ctx.user.objectif);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "bi bi-pencil ms-2 text-muted" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onKeyup: (__VLS_ctx.updateObjectif) },
            ...{ onBlur: (__VLS_ctx.updateUserData) },
            ref: "objectifInput",
            ...{ class: "form-control form-control-sm input-objectif" },
        });
        (__VLS_ctx.user.objectif);
        __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.isEditingInfo === 'objectif') }, null, null);
        /** @type {typeof __VLS_ctx.objectifInput} */ ;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.user.cursus);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.user.trimestre || "Non défini");
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.user.statut);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "d-flex justify-content-center" },
        });
        const __VLS_5 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
        // @ts-ignore
        const __VLS_6 = __VLS_asFunctionalComponent(__VLS_5, new __VLS_5({
            to: "/forgot-password",
            ...{ class: "forgot-password-link" },
        }));
        const __VLS_7 = __VLS_6({
            to: "/forgot-password",
            ...{ class: "forgot-password-link" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_6));
        __VLS_8.slots.default;
        var __VLS_8;
    }
}
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['video-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-content']} */ ;
/** @type {__VLS_StyleScopedClasses['close-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-x-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['promo-video']} */ ;
/** @type {__VLS_StyleScopedClasses['cta-button']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['w-100']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-0']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-12']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-10']} */ ;
/** @type {__VLS_StyleScopedClasses['w-100']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['animated-card']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-content']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['visually-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['info-section']} */ ;
/** @type {__VLS_StyleScopedClasses['info-box']} */ ;
/** @type {__VLS_StyleScopedClasses['goal-box']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['shake']} */ ;
/** @type {__VLS_StyleScopedClasses['pulse']} */ ;
/** @type {__VLS_StyleScopedClasses['flash']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['w-100']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['w-100']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['text-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['fs-5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-grow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-break']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['lh-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['editable']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-link']} */ ;
/** @type {__VLS_StyleScopedClasses['p-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-success']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-container']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['visually-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['info-box']} */ ;
/** @type {__VLS_StyleScopedClasses['resource-box']} */ ;
/** @type {__VLS_StyleScopedClasses['my-1']} */ ;
/** @type {__VLS_StyleScopedClasses['resource-separator']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-container']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-resources']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-light']} */ ;
/** @type {__VLS_StyleScopedClasses['list-group']} */ ;
/** @type {__VLS_StyleScopedClasses['list-unstyled']} */ ;
/** @type {__VLS_StyleScopedClasses['resource-item']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-decoration-none']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['resource-item']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-decoration-none']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['info-box']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-box']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['w-100']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['fs-4']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-2']} */ ;
/** @type {__VLS_StyleScopedClasses['overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-content']} */ ;
/** @type {__VLS_StyleScopedClasses['close-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-x-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['minimal-title']} */ ;
/** @type {__VLS_StyleScopedClasses['list-unstyled']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['editable']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-pencil']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['d-inline-block']} */ ;
/** @type {__VLS_StyleScopedClasses['w-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['editable']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-pencil']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['input-objectif']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['forgot-password-link']} */ ;
var __VLS_dollars;
let __VLS_self;
