import { ref, onMounted } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { verifyIndexedDBSetup, restoreTokensIfNeeded } from "@/utils/api.ts";
import router from "@/router";
import RefreshOverlay from "@/components/RefreshOverlay.vue";
import SwUpdateToast from "@/components/SwUpdateToast.vue";
import { registerSW } from 'virtual:pwa-register';
const isAuthenticated = ref(false);
const authStore = useAuthStore();
const swToastRef = ref();
async function checkAuth() {
    console.log("🔄 Vérification de l'authentification...");
    const currentRoute = router.currentRoute.value;
    console.log("📌 Route actuelle :", currentRoute.path);
    console.log("🔍 meta.requiresAuth =", currentRoute.meta.requiresAuth);
    if (!currentRoute.meta.requiresAuth) {
        console.log("✅ Page publique détectée, pas de redirection !");
        return;
    }
    try {
        await verifyIndexedDBSetup();
        await restoreTokensIfNeeded();
        await authStore.loadUser(); // ✅ C’est ici que tout est géré maintenant
        if (!authStore.jwt) {
            console.warn("🚨 Aucun JWT valide, redirection forcée !");
            router.push("/login");
        }
        else {
            console.log("✅ JWT valide, accès autorisé !");
            isAuthenticated.value = true;
            let prenom = localStorage.getItem("prenom") ||
                sessionStorage.getItem("prenom") ||
                authStore.user?.prenom;
            if (!prenom) {
                console.warn("⚠️ Aucun prénom trouvé, utilisation d'une valeur par défaut.");
                prenom = "Utilisateur";
            }
            else {
                console.log("✅ Prénom récupéré :", prenom);
                localStorage.setItem("prenom", prenom);
            }
        }
    }
    catch (error) {
        console.error("❌ Erreur dans checkAuth :", error);
        router.push("/login");
    }
}
onMounted(async () => {
    await router.isReady();
    await checkAuth();
    // 🎯 Enregistrement SW avec affichage toast
    registerSW({
        onNeedRefresh() {
            swToastRef.value?.show();
        },
        onOfflineReady() {
            console.log('✅ App prête hors ligne');
        }
    });
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "app-container" },
});
if (__VLS_ctx.authStore.isRefreshingToken) {
    /** @type {[typeof RefreshOverlay, ]} */ ;
    // @ts-ignore
    const __VLS_0 = __VLS_asFunctionalComponent(RefreshOverlay, new RefreshOverlay({}));
    const __VLS_1 = __VLS_0({}, ...__VLS_functionalComponentArgsRest(__VLS_0));
}
const __VLS_3 = {}.RouterView;
/** @type {[typeof __VLS_components.RouterView, typeof __VLS_components.routerView, ]} */ ;
// @ts-ignore
const __VLS_4 = __VLS_asFunctionalComponent(__VLS_3, new __VLS_3({}));
const __VLS_5 = __VLS_4({}, ...__VLS_functionalComponentArgsRest(__VLS_4));
/** @type {[typeof SwUpdateToast, ]} */ ;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent(SwUpdateToast, new SwUpdateToast({
    ref: "swToastRef",
}));
const __VLS_8 = __VLS_7({
    ref: "swToastRef",
}, ...__VLS_functionalComponentArgsRest(__VLS_7));
/** @type {typeof __VLS_ctx.swToastRef} */ ;
var __VLS_10 = {};
var __VLS_9;
/** @type {__VLS_StyleScopedClasses['app-container']} */ ;
// @ts-ignore
var __VLS_11 = __VLS_10;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            RefreshOverlay: RefreshOverlay,
            SwUpdateToast: SwUpdateToast,
            authStore: authStore,
            swToastRef: swToastRef,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
