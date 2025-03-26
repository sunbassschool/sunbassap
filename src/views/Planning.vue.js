import Layout from "../views/Layout.vue";
import axios from "axios";
import { ref, computed, onMounted } from "vue";
export default (await import('vue')).defineComponent({
    name: "Planning",
    components: { Layout },
    setup() {
        const planningData = ref([]);
        const loading = ref(true);
        const email = ref(localStorage.getItem("email") || "");
        const prenom = ref(localStorage.getItem("prenom") || "");
        const API_URL = "https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbxc69Alhr0V0-DqrHblDJonvPKFy8PbjhEA6nA4sC4aFCTJOCKO9t0Q-uaApC_vcXgyHA/exec";
        const cacheDuration = 24 * 60 * 60 * 1000; // 24 heures
        console.log("📧 Email extrait :", email.value);
        console.log("👤 Prénom extrait :", prenom.value);
        const fetchPlanningData = async () => {
            console.log("🚀 fetchPlanningData() appelé !");
            if (!email.value || !prenom.value) {
                console.error("❌ Erreur : Email ou prénom manquant !");
                loading.value = false;
                return;
            }
            console.log("🌐 Envoi des paramètres à l'API :", {
                email: email.value,
                prenom: prenom.value,
            });
            const cacheKey = `planning_${email.value}_${prenom.value}`;
            const cacheTimestampKey = `${cacheKey}_timestamp`;
            const cachedData = localStorage.getItem(cacheKey);
            const cacheTimestamp = localStorage.getItem(cacheTimestampKey);
            const cacheExpired = !cacheTimestamp || Date.now() - parseInt(cacheTimestamp, 10) > cacheDuration;
            if (cachedData && !cacheExpired) {
                try {
                    const parsedData = JSON.parse(cachedData);
                    if (parsedData.success && Array.isArray(parsedData.planning)) {
                        console.log("⚡ Chargement du planning depuis le cache !");
                        planningData.value = parsedData.planning;
                        loading.value = false;
                    }
                }
                catch (error) {
                    console.error("❌ Erreur de parsing du cache :", error);
                }
            }
            try {
                const response = await axios.get(`${API_URL}?route=planning&email=${encodeURIComponent(email.value)}&prenom=${encodeURIComponent(prenom.value)}`);
                console.log("📡 Réponse API reçue :", response.data);
                if (response.data.success && Array.isArray(response.data.planning)) {
                    planningData.value = response.data.planning;
                    localStorage.setItem(cacheKey, JSON.stringify(response.data));
                    localStorage.setItem(cacheTimestampKey, Date.now().toString());
                }
                else {
                    console.warn("⚠️ L'API n'a pas retourné de planning valide.");
                }
            }
            catch (error) {
                console.error("❌ Erreur lors du chargement des cours :", error);
                alert("Une erreur est survenue lors du chargement de ton planning.");
            }
            finally {
                loading.value = false;
            }
        };
        const openMeet = (url) => {
            if (url) {
                window.open(url, "_blank");
            }
        };
        onMounted(() => {
            fetchPlanningData();
        });
        return { planningData, loading, openMeet };
    },
});
const __VLS_ctx = {};
const __VLS_componentsOption = { Layout };
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['container-xxl']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['container-xxl']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
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
    ...{ class: "container-xxl mt-4" },
});
if (!__VLS_ctx.loading && __VLS_ctx.planningData.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-warning text-center mt-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "mb-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
        href: "https://www.sunbassschool.com/step/inscription-aux-cours-en-visio/",
        ...{ class: "btn btn-primary mt-2" },
        target: "_blank",
        rel: "noopener noreferrer",
    });
}
if (!__VLS_ctx.loading && __VLS_ctx.planningData.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-responsive mt-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: "table table-hover shadow-sm" },
        ...{ style: {} },
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
        (row.formattedDate);
    }
}
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['container-xxl']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['table-responsive']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table-hover']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['table-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['clickable-row']} */ ;
var __VLS_dollars;
let __VLS_self;
