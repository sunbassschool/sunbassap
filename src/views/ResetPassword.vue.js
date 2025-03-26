import Layout from "@/views/Layout.vue";
import { logoutUser } from "@/utils/api"; // Assure-toi que le chemin est correct selon ton projet
export default (await import('vue')).defineComponent({
    name: "ResetPassword",
    components: { Layout },
    data() {
        return {
            password: "",
            confirmPassword: "",
            message: "",
            messageType: "",
            loading: true, // Active le mode chargement avant la vérification du token
            token: this.$route.query.token || null,
            tokenValid: false, // ✅ Gère l'affichage du formulaire uniquement si le token est valide
        };
    },
    async mounted() {
        await this.verifyToken();
    },
    methods: {
        async verifyToken() {
            if (!this.token) {
                this.message = "❌ Lien invalide.";
                this.messageType = "alert-danger";
                this.loading = false;
                return;
            }
            try {
                const response = await fetch(`https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbzfgtqcCPaKj92SH2TiePZbKHTykkVkfE7PG_ivNV0hKsNNtXbl1RTRcI1xQbM1GbI_Pw/exec?route=verifyToken&token=${encodeURIComponent(this.token)}`);
                const data = await response.json();
                if (data.status === "success") {
                    this.tokenValid = true;
                    this.message = "✅ Lien de réinitialisation valide.";
                    this.messageType = "alert-success";
                }
                else {
                    this.message = "⚠️ Lien expiré ou invalide.";
                    this.messageType = "alert-danger";
                }
            }
            catch (error) {
                console.error(error);
                this.message = "❌ Erreur de connexion.";
                this.messageType = "alert-danger";
            }
            this.loading = false;
        },
        async sha256(text) {
            const buffer = new TextEncoder().encode(text);
            const hash = await crypto.subtle.digest("SHA-256", buffer);
            return Array.from(new Uint8Array(hash))
                .map(byte => byte.toString(16).padStart(2, "0"))
                .join("");
        },
        async resetPassword() {
            if (!this.password || !this.confirmPassword) {
                this.message = "❌ Veuillez remplir tous les champs.";
                this.messageType = "alert-danger";
                return;
            }
            if (this.password !== this.confirmPassword) {
                this.message = "❌ Les mots de passe ne correspondent pas.";
                this.messageType = "alert-danger";
                return;
            }
            this.loading = true;
            try {
                const hashedPassword = await this.sha256(this.password); // 🔐 Sécurise le mot de passe avant l'envoi
                // 🔍 Vérifie l'URL et les données envoyées
                const apiUrl = "https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbzfgtqcCPaKj92SH2TiePZbKHTykkVkfE7PG_ivNV0hKsNNtXbl1RTRcI1xQbM1GbI_Pw/exec";
                console.log("🔗 API URL appelée :", apiUrl);
                console.log("📤 Données envoyées :", {
                    route: "resetPassword",
                    token: this.token,
                    newPassword: hashedPassword,
                });
                const response = await fetch(apiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        route: "resetPassword",
                        token: this.token,
                        newPassword: hashedPassword, // 🔐 Envoie un hash au lieu du mot de passe brut
                    }),
                });
                console.log("🔍 Réponse brute API :", response);
                const textResponse = await response.text(); // 🔍 Récupère la réponse brute avant de parser
                console.log("🔍 Réponse texte API :", textResponse);
                // 🔍 Vérifie si la réponse est JSON valide
                let data;
                try {
                    data = JSON.parse(textResponse);
                }
                catch (parseError) {
                    console.error("❌ Erreur lors du parsing JSON :", parseError);
                    this.message = "❌ Erreur serveur : réponse invalide.";
                    this.messageType = "alert-danger";
                    this.loading = false;
                    return;
                }
                console.log("🔍 Réponse JSON API :", data);
                this.loading = false;
                // Vérifie si le mot de passe a été réinitialisé avec succès
                if (data.message === "Mot de passe réinitialisé avec succès !") {
                    this.message = "✅ Mot de passe mis à jour !";
                    this.messageType = "alert-success";
                    // Appeler logoutUser pour déconnecter l'utilisateur
                    logoutUser();
                    setTimeout(() => this.$router.push("/login"), 2000);
                }
                else {
                    this.message = "⚠️ Lien expiré ou invalide.";
                    this.messageType = "alert-danger";
                }
            }
            catch (error) {
                console.error("❌ Erreur lors de la requête API :", error);
                this.message = "❌ Erreur serveur.";
                this.messageType = "alert-danger";
                this.loading = false;
            }
        }
    }
});
const __VLS_ctx = {};
const __VLS_componentsOption = { Layout };
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['forgot-password-link']} */ ;
/** @type {__VLS_StyleScopedClasses['container']} */ ;
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.Layout;
/** @type {[typeof __VLS_components.Layout, typeof __VLS_components.Layout, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ref: "layout",
}));
const __VLS_2 = __VLS_1({
    ref: "layout",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {typeof __VLS_ctx.layout} */ ;
var __VLS_4 = {};
__VLS_3.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "container d-flex justify-content-center align-items-center mt-5" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card shadow p-4 w-50" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: "text-center mb-4" },
});
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-center" },
    });
}
if (__VLS_ctx.tokenValid) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.resetPassword) },
    });
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
        ...{ class: "form-control" },
        required: true,
    });
    (__VLS_ctx.password);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: "confirmPassword",
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        type: "password",
        id: "confirmPassword",
        ...{ class: "form-control" },
        required: true,
    });
    (__VLS_ctx.confirmPassword);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        type: "submit",
        ...{ class: "btn btn-primary w-100" },
        disabled: (__VLS_ctx.loading),
    });
    if (!__VLS_ctx.loading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
}
if (__VLS_ctx.message) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert mt-3" },
        ...{ class: (__VLS_ctx.messageType) },
    });
    (__VLS_ctx.message);
}
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['container']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-5']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-50']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['w-100']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
// @ts-ignore
var __VLS_5 = __VLS_4;
var __VLS_dollars;
let __VLS_self;
