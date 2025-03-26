import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { refreshToken, getValidToken, isJwtExpired, getRefreshTokenFromDB, preventIndexedDBCleanup, checkIndexedDBStatus } from "@/utils/api";
import { getCache } from "@/utils/cacheManager";
const showModal = ref(false);
const offlineMode = ref(false);
const router = useRouter();
const baseUrl = import.meta.env.VITE_BASE_URL || "/app/";
const logoUrl = ref(`${baseUrl}images/logo.png`);
onMounted(async () => {
    console.log("🚀 Début de l'initialisation de IntroView...");
    try {
        preventIndexedDBCleanup(); // ✅ Protection IndexedDB
        checkIndexedDBStatus(); // ✅ Vérifie si le JWT est toujours là après plusieurs heures
        // 🔄 Récupération du JWT via getToken()
        let jwt = await withTimeout(getValidToken(), 3000);
        // 🌐 Mode hors ligne détecté
        if (!navigator.onLine && getCache("userData_sunny")) {
            console.warn("⚠️ Mode hors ligne activé, utilisation du cache...");
            offlineMode.value = true;
            return;
        }
        // ✅ Si JWT est valide, rediriger vers "mon-espace"
        if (jwt && !isJwtExpired(jwt)) {
            console.log("✅ JWT valide, accès autorisé !");
            return router.replace("/dashboard");
        }
        // 🔄 Tentative de récupération du refreshToken
        console.log("🔄 Vérification du refresh token...");
        const storedRefreshToken = await withTimeout(getRefreshTokenFromDB(), 3000);
        if (!storedRefreshToken) {
            console.warn("⚠️ Aucun refresh token trouvé. Affichage du bouton Commencer.");
            showModal.value = true;
            return;
        }
        console.log("🔍 Refresh token récupéré :", storedRefreshToken);
        // ✅ Tentative de rafraîchissement du JWT
        console.log("✅ Refresh token trouvé, tentative de refresh...");
        const newJwt = await withTimeout(refreshToken(), 3000); // ✅ Correction
        if (newJwt) {
            console.log("✅ Nouveau JWT récupéré, redirection...");
            sessionStorage.setItem("jwt", newJwt);
            localStorage.setItem("jwt", newJwt);
            return router.replace("/mon-espace");
        }
        console.warn("❌ Refresh token invalide ou échec, redirection vers login...");
        return router.replace("/login");
    }
    catch (error) {
        console.error("❌ Erreur lors de l'initialisation :", error);
        showModal.value = true;
    }
    setTimeout(() => console.log("✅ Fin de l'initialisation de IntroView."), 1000);
});
// ✅ Timeout pour éviter les blocages liés à IndexedDB
async function withTimeout(promise, ms) {
    const timeout = new Promise((_, reject) => setTimeout(() => reject("⏳ Timeout"), ms));
    return Promise.race([promise, timeout]).catch((error) => {
        console.warn("⚠️ Erreur / Timeout :", error);
        return null;
    });
}
// ✅ Redirection manuelle vers le dashboard
const goToDashboard = () => {
    console.log("🎬 Bouton Commencer cliqué !");
    sessionStorage.setItem("comingFromIntro", "true");
    router.replace("/login");
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['offline-box']} */ ;
/** @type {__VLS_StyleScopedClasses['start-button']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "intro-container" },
});
if (!__VLS_ctx.showModal) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "logo-container" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.img, __VLS_intrinsicElements.img)({
        src: (__VLS_ctx.logoUrl),
        alt: "Logo SunBassSchool",
        ...{ class: "sidebar-main-logo" },
    });
}
if (!__VLS_ctx.showModal && !__VLS_ctx.offlineMode) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex justify-content-center align-items-center" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "spinner-border text-primary" },
        role: "status",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "visually-hidden" },
    });
}
if (__VLS_ctx.offlineMode) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "offline-box" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.goToDashboard) },
        ...{ class: "btn btn-secondary" },
    });
}
const __VLS_0 = {}.transition;
/** @type {[typeof __VLS_components.Transition, typeof __VLS_components.transition, typeof __VLS_components.Transition, typeof __VLS_components.transition, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    name: "fade",
    appear: true,
}));
const __VLS_2 = __VLS_1({
    name: "fade",
    appear: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
if (__VLS_ctx.showModal) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "intro-box text-center p-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
        ...{ class: "title mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "highlight" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "subtitle mb-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.goToDashboard) },
        ...{ class: "btn btn-primary btn-lg start-button" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "bi bi-play-circle-fill me-2" },
    });
}
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['intro-container']} */ ;
/** @type {__VLS_StyleScopedClasses['logo-container']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-main-logo']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['visually-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['offline-box']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-box']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['title']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['highlight']} */ ;
/** @type {__VLS_StyleScopedClasses['subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['start-button']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-play-circle-fill']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            showModal: showModal,
            offlineMode: offlineMode,
            logoUrl: logoUrl,
            goToDashboard: goToDashboard,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
