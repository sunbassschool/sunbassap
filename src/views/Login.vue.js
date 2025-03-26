import Layout from "../views/Layout.vue";
import { jwtDecode } from "jwt-decode";
import * as api from "@/utils/api";
import { verifyIndexedDBSetup, checkAndRestoreTokens, storeUserInfo, restoreUserInfo, getToken, getValidToken, isJwtExpired, refreshToken, } from "@/utils/api.ts";
export default (await import('vue')).defineComponent({
    name: "Login",
    components: { Layout },
    data() {
        return {
            authCheckInProgress: true,
            emailTouched: false,
            email: localStorage.getItem("email") || sessionStorage.getItem("email") || "",
            password: "",
            message: "",
            messageType: "",
            isLoggedIn: false,
            jwt: "",
            refreshToken: "",
            apiBaseURL: "https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbxc69Alhr0V0-DqrHblDJonvPKFy8PbjhEA6nA4sC4aFCTJOCKO9t0Q-uaApC_vcXgyHA/exec",
            loading: false,
            progress: 0,
            progressInterval: null,
            tokenCheckInterval: null,
            isRefreshing: false,
        };
    },
    computed: {
        prenom() {
            return localStorage.getItem("prenom") || sessionStorage.getItem("prenom") || "";
        },
    },
    async mounted() {
        console.log("📌 Initialisation de Login.vue...");
        try {
            await verifyIndexedDBSetup();
            await checkAndRestoreTokens();
            await restoreUserInfo();
            let jwt = await getValidToken();
            if (jwt && !isJwtExpired(jwt)) {
                console.log("✅ JWT valide, redirection !");
                this.isLoggedIn = true;
                this.authCheckInProgress = false; // ✅ FIN DE LA VÉRIFICATION
                return this.redirectUser();
            }
            const refreshTokenExists = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");
            if (!jwt || isJwtExpired(jwt)) {
                if (!refreshTokenExists) {
                    console.warn("⚠️ Aucun JWT valide, affichage du formulaire.");
                    this.authCheckInProgress = false; // ✅ Permet d'afficher le formulaire
                    return;
                }
                console.warn("⏳ Tentative de refresh...");
                try {
                    jwt = await refreshToken();
                    if (jwt) {
                        console.log("✅ JWT rafraîchi, redirection !");
                        this.isLoggedIn = true;
                        this.authCheckInProgress = false;
                        return this.redirectUser();
                    }
                }
                catch (error) {
                    console.error("❌ Échec du refresh :", error);
                }
            }
        }
        catch (error) {
            console.error("❌ Problème d'authentification :", error);
        }
        // ✅ S'assurer que le formulaire s'affiche si pas de JWT valide
        this.authCheckInProgress = false;
    },
    beforeUnmount() {
        if (this.tokenCheckInterval) {
            clearInterval(this.tokenCheckInterval);
        }
    },
    methods: {
        startLoading() {
            if (this.loading)
                return; // ⛔ Empêche le lancement multiple
            this.progress = 0;
            this.loading = true;
            let totalDuration = 5000; // ⏳ Augmenter la durée à 5s
            let startTime = Date.now();
            const updateProgress = () => {
                let elapsed = Date.now() - startTime;
                this.progress = Math.min((elapsed / totalDuration) * 100, 100);
                if (this.progress < 100) {
                    requestAnimationFrame(updateProgress);
                }
                else {
                    this.loading = false; // ✅ Désactiver après complétion
                }
            };
            requestAnimationFrame(updateProgress);
        },
        async checkLoginStatus() {
            const jwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
            if (!jwt)
                return false;
            try {
                const decoded = jwtDecode(jwt);
                return decoded.exp * 1000 > Date.now();
            }
            catch (error) {
                console.error("🚨 JWT invalide :", error);
                return false;
            }
        },
        redirectUser() {
            const userRole = localStorage.getItem("role") || sessionStorage.getItem("role");
            if (userRole === "admin") {
                this.$router.push("/cours");
            }
            else if (userRole === "adherent") {
                this.$router.push("/dashboard");
            }
            else {
                this.$router.push("/mon-espace");
            }
        },
        async sha256(text) {
            const buffer = new TextEncoder().encode(text);
            const hash = await crypto.subtle.digest("SHA-256", buffer);
            return Array.from(new Uint8Array(hash))
                .map((byte) => byte.toString(16).padStart(2, "0"))
                .join("");
        },
        isValidEmail(email) {
            return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
        },
        async login() {
            if (!this.email || !this.password) {
                return this.setMessage("Veuillez remplir tous les champs.", "alert-danger");
            }
            console.clear();
            console.time("Total Login Time");
            await api.clearUserData();
            this.loading = true;
            this.progress = 20; // Petite progression initiale visuelle
            try {
                const response = await fetch(`${this.apiBaseURL}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        route: "login",
                        email: this.email,
                        password: await this.sha256(this.password),
                    }),
                });
                this.progress = 60; // Mi-chemin après réponse brute
                const data = await response.json();
                this.progress = 80; // Presque terminé après parsing JSON
                if (!response.ok || data.status !== "success" || !data.data.jwt) {
                    this.setMessage(`❌ ${data.message || "Erreur de connexion."}`, "alert-danger");
                    this.loading = false;
                    this.progress = 0;
                    return;
                }
                await this.storeSession(data.data);
                localStorage.setItem("userLogged", "true");
                this.progress = 100;
                setTimeout(() => {
                    this.loading = false;
                    this.redirectUser();
                }, 300); // Laisse le 100% visible un petit instant
            }
            catch (error) {
                this.setMessage("❌ Erreur serveur, veuillez réessayer plus tard.", "alert-danger");
                this.loading = false;
                this.progress = 0;
            }
        },
        async storeSession(data) {
            console.log("🔥 storeSession() appelé !");
            if (!data.jwt || !data.refreshToken) {
                console.warn("🚨 JWT ou Refresh Token manquant !");
                return;
            }
            try {
                const decoded = jwtDecode(data.jwt);
                console.log("🎫 JWT décodé :", decoded);
                const userRole = decoded.role || "adherent";
                // ✅ Stockage propre du prénom et de l'email
                if (decoded.prenom) {
                    localStorage.setItem("prenom", decoded.prenom);
                    sessionStorage.setItem("prenom", decoded.prenom);
                    console.log("✅ Prénom stocké :", decoded.prenom);
                }
                else {
                    console.warn("⚠️ Prénom absent dans le JWT !");
                }
                if (decoded.email) {
                    localStorage.setItem("email", decoded.email);
                    sessionStorage.setItem("email", decoded.email);
                    console.log("✅ Email stocké :", decoded.email);
                }
                else {
                    console.warn("⚠️ Email absent dans le JWT !");
                }
                // ✅ Stocker les autres infos utilisateur
                const userData = {
                    prenom: decoded.prenom || "Utilisateur",
                    email: decoded.email || ""
                };
                await api.storeUserInfo(userData);
                // ✅ Stockage du rôle et des tokens
                localStorage.setItem("role", userRole);
                sessionStorage.setItem("role", userRole);
                localStorage.setItem("jwt", data.jwt);
                sessionStorage.setItem("jwt", data.jwt);
                await api.updateTokens(data.jwt, data.refreshToken);
                console.log("✅ Données utilisateur et tokens sauvegardés avec succès !");
            }
            catch (error) {
                console.error("🚨 Erreur lors du décodage du JWT :", error);
            }
        },
        setMessage(msg, type) {
            this.message = msg;
            this.messageType = type;
        },
    },
});
const __VLS_ctx = {};
const __VLS_componentsOption = { Layout };
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['h2-immersive']} */ ;
/** @type {__VLS_StyleScopedClasses['h2-immersive']} */ ;
/** @type {__VLS_StyleScopedClasses['container']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['forgot-password-link']} */ ;
/** @type {__VLS_StyleScopedClasses['container']} */ ;
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.Layout;
/** @type {[typeof __VLS_components.Layout, typeof __VLS_components.Layout, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_4 = {};
__VLS_3.slots.default;
if (!__VLS_ctx.authCheckInProgress) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "container d-flex justify-content-center align-items-center mt-5" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row justify-content-center w-200" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "w-100 mx-auto" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card shadow p-5" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
        ...{ class: "h2-immersive" },
    });
    if (!__VLS_ctx.loading && !__VLS_ctx.isLoggedIn) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
            ...{ onSubmit: (__VLS_ctx.login) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mb-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: "email",
            ...{ class: "form-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            type: "email",
            id: "email",
            name: "email",
            ...{ class: "form-control" },
            required: true,
            autocomplete: "off",
            spellcheck: "false",
            pattern: "\u005e\u005b\u0061\u002d\u007a\u0041\u002d\u005a\u0030\u002d\u0039\u002e\u005f\u0025\u002b\u005c\u002d\u005d\u002b\u0040\u005b\u0061\u002d\u007a\u0041\u002d\u005a\u0030\u002d\u0039\u002e\u005c\u002d\u005d\u002b\u005c\u002e\u005b\u0061\u002d\u007a\u0041\u002d\u005a\u005d\u007b\u0032\u002c\u007d\u0024",
            title: "Veuillez entrer une adresse e-mail valide",
        });
        (__VLS_ctx.email);
        if (__VLS_ctx.email && !__VLS_ctx.isValidEmail(__VLS_ctx.email)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "text-danger" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mb-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: "password",
            ...{ class: "form-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            type: "password",
            id: "password",
            name: "password",
            ...{ class: "form-control" },
            required: true,
            autocomplete: "new-password",
            spellcheck: "false",
        });
        (__VLS_ctx.password);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            type: "password",
            name: "password2",
            ...{ style: {} },
            autocomplete: "new-password",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            type: "submit",
            disabled: (__VLS_ctx.loading || !__VLS_ctx.isValidEmail(__VLS_ctx.email)),
            ...{ class: "btn btn-primary w-100" },
        });
        if (!__VLS_ctx.loading) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-center mt-3" },
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
    if (__VLS_ctx.loading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "loading-container mt-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "loading-bar" },
            ...{ style: ({ width: __VLS_ctx.progress + '%' }) },
        });
    }
    if (__VLS_ctx.message) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert mt-3" },
            ...{ class: (__VLS_ctx.messageType) },
        });
        (__VLS_ctx.message);
    }
}
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['container']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-5']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['w-200']} */ ;
/** @type {__VLS_StyleScopedClasses['w-100']} */ ;
/** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow']} */ ;
/** @type {__VLS_StyleScopedClasses['p-5']} */ ;
/** @type {__VLS_StyleScopedClasses['h2-immersive']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['w-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['forgot-password-link']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-container']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
var __VLS_dollars;
let __VLS_self;
