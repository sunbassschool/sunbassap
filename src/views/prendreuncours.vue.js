import Layout from "../views/Layout.vue";
import axios from "axios";
import { ref, onMounted } from "vue";
export default (await import('vue')).defineComponent({
    name: "Planning",
    components: {
        Layout,
    },
    setup() {
        const planningData = ref([]);
        const loading = ref(true);
        const errorMessage = ref("");
        // ✅ URL de l'Apps Script
        const API_URL = "https://script.google.com/macros/s/AKfycbyaXWbAryyHp1t7HmdCHN7EuQwVlwol5u3WTtULrtN6yY9JFxjikiExxvQrakD56QRHyw/exec";
        // ✅ Récupération des infos de session
        const prenom = localStorage.getItem("prenom");
        const email = localStorage.getItem("email");
        // ⏳ Définition de la durée du cache (5 minutes)
        const cacheDuration = 5 * 60 * 1000;
        const fetchPlanningData = async () => {
            if (!prenom || !email) {
                errorMessage.value = "Impossible de récupérer tes informations. Reconnecte-toi.";
                loading.value = false;
                return;
            }
            // ✅ Vérifier si les données sont en cache
            const cacheKey = `planning_${email}_${prenom}`;
            const cachedData = localStorage.getItem(cacheKey);
            const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
            if (cachedData && cacheTimestamp && Date.now() - cacheTimestamp < cacheDuration) {
                console.log("⚡ Chargement du planning depuis le cache");
                planningData.value = JSON.parse(cachedData);
                loading.value = false;
                return;
            }
            try {
                console.log("🌐 Récupération des données depuis l'API...");
                const url = `${API_URL}?route=planning&email=${encodeURIComponent(email)}&prenom=${encodeURIComponent(prenom)}`;
                const response = await axios.get(url);
                console.log("✅ Données reçues depuis l'API :", response.data);
                planningData.value = response.data || [];
                if (planningData.value.length === 0) {
                    errorMessage.value = "Aucun cours trouvé.";
                }
                // ✅ Stocker les données en cache
                localStorage.setItem(cacheKey, JSON.stringify(planningData.value));
                localStorage.setItem(`${cacheKey}_timestamp`, Date.now());
            }
            catch (error) {
                console.error("❌ Erreur lors du chargement du planning :", error);
                errorMessage.value = "Erreur de chargement des cours.";
            }
            finally {
                loading.value = false;
            }
        };
        // ✅ Fonction pour ouvrir Meet au clic
        const openMeet = (url) => {
            if (url) {
                window.open(url, "_blank");
            }
        };
        onMounted(fetchPlanningData);
        return { planningData, loading, errorMessage, openMeet };
    },
});
const __VLS_ctx = {};
const __VLS_componentsOption = {
    Layout,
};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
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
    ...{ class: "container mt-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: "text-center mb-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-muted text-center" },
});
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex flex-column align-items-center mt-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "spinner-border text-primary mb-2" },
        role: "status",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-muted" },
    });
}
if (!__VLS_ctx.loading && __VLS_ctx.errorMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-danger text-center mt-3" },
    });
    (__VLS_ctx.errorMessage);
}
if (!__VLS_ctx.loading && __VLS_ctx.planningData.length === 0 && !__VLS_ctx.errorMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-warning text-center mt-3" },
    });
}
if (!__VLS_ctx.loading && __VLS_ctx.planningData.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-responsive mt-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: "table table-hover shadow-sm" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({
        ...{ class: "table-dark" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
        scope: "col",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [row, index] of __VLS_getVForSourceType((__VLS_ctx.planningData))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            ...{ onClick: (...[$event]) => {
                    if (!(!__VLS_ctx.loading && __VLS_ctx.planningData.length > 0))
                        return;
                    __VLS_ctx.openMeet(row.meet);
                } },
            key: (index),
            ...{ class: "clickable-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (row.date);
    }
}
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['container']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['table-responsive']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table-hover']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['table-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['clickable-row']} */ ;
var __VLS_dollars;
let __VLS_self;
