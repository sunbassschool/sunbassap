import Layout from "../views/Layout.vue";
import axios from "axios";
import { ref, computed, onMounted } from "vue";
export default (await import('vue')).defineComponent({
    name: "Partitions",
    components: { Layout },
    setup() {
        const partitions = ref([]);
        const loading = ref(true);
        const search = ref("");
        const selectedStyle = ref("");
        const selectedLevel = ref("");
        const SHEET_ID = "1PuxK7najS8M8v6h3XQMwOaH5skTNWDJXI3zYiLO1rRM";
        const API_KEY = "AIzaSyBo0kz-JkCiuWumprwn5kpiVPqYmKr5NZI";
        const RANGE = "'partitions'!A2:J";
        // ⏳ Définition de la durée du cache (5 minutes)
        const cacheDuration = 24 * 60 * 60 * 1000; // 24 heures
        console.log("📌 Avant chargement partitions, userData_ =", localStorage.getItem("userData_"));
        const fetchPartitions = async () => {
            const cacheKey = "partitions_cache";
            const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
            const cachedData = localStorage.getItem(cacheKey);
            // ✅ Vérification du cache avant d'appeler l'API
            if (cachedData && cacheTimestamp && Date.now() - cacheTimestamp < cacheDuration) {
                console.log("⚡ Chargement des partitions depuis le cache");
                partitions.value = JSON.parse(cachedData);
                loading.value = false;
                return;
            }
            try {
                console.log("🌐 Récupération des partitions depuis l'API...");
                const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;
                const response = await axios.get(url);
                const rows = response.data.values || [];
                if (rows.length > 0) {
                    partitions.value = rows.map(row => ({
                        nom: row[0],
                        auteur: row[1],
                        style: row[2] || "", // Ajout du style
                        niveau: row[3] || "", // Ajout du niveau
                        id: row[8]
                    }));
                }
                // ✅ Stocker les données en cache
                localStorage.setItem(cacheKey, JSON.stringify(partitions.value));
                localStorage.setItem(`${cacheKey}_timestamp`, Date.now());
            }
            catch (error) {
                console.error("❌ Erreur lors du chargement des partitions :", error);
            }
            finally {
                loading.value = false;
            }
        };
        // ✅ Filtrage des partitions
        const filteredPartitions = computed(() => {
            const lowerSearch = search.value.toLowerCase();
            return partitions.value.filter(partition => (lowerSearch === "" || partition.nom.toLowerCase().includes(lowerSearch) ||
                partition.auteur.toLowerCase().includes(lowerSearch)) &&
                (selectedStyle.value === "" || partition.style === selectedStyle.value) &&
                (selectedLevel.value === "" || partition.niveau === selectedLevel.value));
        });
        // ✅ Récupération des styles uniques
        const styles = computed(() => {
            const uniqueStyles = new Set(partitions.value.map(p => p.style).filter(Boolean));
            return [...uniqueStyles];
        });
        // ✅ Récupération des niveaux uniques
        const levels = computed(() => {
            const uniqueLevels = new Set(partitions.value.map(p => p.niveau).filter(Boolean));
            return [...uniqueLevels];
        });
        // ✅ Fonction pour ouvrir une partition
        const openPartition = (fileId) => {
            window.open(`https://drive.google.com/file/d/${fileId}/view`, "_blank");
        };
        onMounted(() => {
            // 📌 Sauvegarde l'état actuel de `userData_`
            const oldUserData = localStorage.getItem("userData_");
            fetchPartitions().then(() => {
                // 🔍 Vérifie si `userData_` a changé après l'appel API
                const newUserData = localStorage.getItem("userData_");
                if (oldUserData && newUserData && oldUserData !== newUserData) {
                    console.warn("🚨 userData_ a été écrasé, on le restaure !");
                    localStorage.setItem("userData_", oldUserData);
                }
            });
        });
        return { partitions, loading, search, selectedStyle, selectedLevel, styles, levels, filteredPartitions, openPartition };
    },
});
const __VLS_ctx = {};
const __VLS_componentsOption = { Layout };
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['clickable-row']} */ ;
/** @type {__VLS_StyleScopedClasses['list-group-item']} */ ;
/** @type {__VLS_StyleScopedClasses['list-group-item']} */ ;
/** @type {__VLS_StyleScopedClasses['list-group-item']} */ ;
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row mb-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-12 col-md-4 mb-2 mb-md-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "form-control" },
    placeholder: "🔎 Rechercher...",
});
(__VLS_ctx.search);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-12 col-md-4 mb-2 mb-md-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.selectedStyle),
    ...{ class: "form-control" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "",
});
for (const [style] of __VLS_getVForSourceType((__VLS_ctx.styles))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (style),
        value: (style),
    });
    (style);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-12 col-md-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.selectedLevel),
    ...{ class: "form-control" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "",
});
for (const [level] of __VLS_getVForSourceType((__VLS_ctx.levels))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (level),
        value: (level),
    });
    (level);
}
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex justify-content-center mt-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "spinner-border text-primary" },
        role: "status",
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-none d-md-block" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-responsive" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: "table table-hover shadow-sm" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({
        ...{ class: "table-dark" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [partition, index] of __VLS_getVForSourceType((__VLS_ctx.filteredPartitions))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    __VLS_ctx.openPartition(partition.id);
                } },
            key: (index),
            ...{ class: "clickable-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (partition.nom);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (partition.auteur);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-md-none" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
        ...{ class: "list-group" },
    });
    for (const [partition, index] of __VLS_getVForSourceType((__VLS_ctx.filteredPartitions))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    __VLS_ctx.openPartition(partition.id);
                } },
            key: (index),
            ...{ class: "list-group-item d-flex justify-content-between align-items-center clickable-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (partition.nom);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-muted m-0 small" },
        });
        (partition.auteur);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "badge bg-primary text-white" },
        });
    }
}
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['container']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-md-0']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-md-0']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['d-none']} */ ;
/** @type {__VLS_StyleScopedClasses['d-md-block']} */ ;
/** @type {__VLS_StyleScopedClasses['table-responsive']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table-hover']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['table-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['clickable-row']} */ ;
/** @type {__VLS_StyleScopedClasses['d-md-none']} */ ;
/** @type {__VLS_StyleScopedClasses['list-group']} */ ;
/** @type {__VLS_StyleScopedClasses['list-group-item']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['clickable-row']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['m-0']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
var __VLS_dollars;
let __VLS_self;
