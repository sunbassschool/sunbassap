import Layout from "../views/Layout.vue";
import axios from "axios";
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { jwtDecode } from "jwt-decode";
export default (await import('vue')).defineComponent({
    name: "Planning",
    components: { Layout },
    setup() {
        const windowWidth = ref(window.innerWidth);
        const planningData = ref([]);
        const loading = ref(true);
        // ✅ Sélection du cours via le menu déroulant
        const selectedCourse = ref("");
        // ✅ Stocker les références des éléments de cours
        const courseRefs = ref({});
        // ✅ Fonction pour stocker les références des éléments DOM des cours
        const setCourseRef = (el, date) => {
            if (el) {
                courseRefs.value[date] = el;
            }
        };
        // ✅ Fonction pour scroller vers le cours sélectionné
        watch(selectedCourse, async (newVal) => {
            if (!newVal)
                return;
            await nextTick(); // Assurer que le DOM est bien mis à jour
            const courseElement = courseRefs.value[newVal];
            if (courseElement) {
                // Fait défiler l'élément sélectionné vers le haut
                courseElement.scrollIntoView({ behavior: "smooth", block: "center" });
                // Calcule la position de l'élément par rapport au haut de la fenêtre
                const elementPosition = courseElement.getBoundingClientRect().top;
                const menuHeight = document.querySelector('.fixed-menu')?.offsetHeight || 0;
                // Vérifie si l'élément est sous le menu, si oui, ajuste la position
                if (elementPosition < menuHeight) {
                    // Si l'élément est sous le menu, ajuster le décalage pour le rendre visible
                    window.scrollTo({
                        top: window.scrollY + elementPosition - menuHeight - 10, // Ajuster ici (-10 pour un petit espace)
                        behavior: 'smooth',
                    });
                }
            }
            else {
                console.warn("⚠️ Élément introuvable :", newVal);
            }
        });
        // ✅ Tri des cours du plus récent au plus ancien
        const sortedPlanningData = computed(() => {
            return [...planningData.value].sort((a, b) => {
                if (!a.formattedDate || !b.formattedDate)
                    return 0;
                // ✅ Extraction propre de la date
                const regex = /\d{2} (janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre) \d{4}/;
                const matchA = a.formattedDate.match(regex);
                const matchB = b.formattedDate.match(regex);
                if (!matchA || !matchB)
                    return 0;
                const cleanDateA = matchA[0];
                const cleanDateB = matchB[0];
                // ✅ Conversion des mois en chiffres
                const mois = {
                    "janvier": "01", "février": "02", "mars": "03",
                    "avril": "04", "mai": "05", "juin": "06",
                    "juillet": "07", "août": "08", "septembre": "09",
                    "octobre": "10", "novembre": "11", "décembre": "12"
                };
                const [jourA, moisA, anneeA] = cleanDateA.split(" ");
                const [jourB, moisB, anneeB] = cleanDateB.split(" ");
                if (!mois[moisA] || !mois[moisB])
                    return 0;
                const dateA = new Date(`${anneeA}-${mois[moisA]}-${jourA}`);
                const dateB = new Date(`${anneeB}-${mois[moisB]}-${jourB}`);
                return dateA - dateB; // ✅ Tri du plus récent au plus ancien
            });
        });
        const showModal = ref(false);
        const videoUrl = ref("");
        const currentVideoTitle = ref("");
        const API_URL = "https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbwUE9ITcKV4Nbk-TsQ0qh4DUMgp7tOBxJDh_aoy2TfLcy1lduQ_CHgg2t62HkBU39Qo0w/exec";
        const isLoggedIn = computed(() => {
            let jwt = sessionStorage.getItem("jwt") || localStorage.getItem("jwt");
            if (!jwt)
                return false;
            try {
                const decoded = jwtDecode(jwt);
                return decoded.exp * 1000 > Date.now();
            }
            catch {
                return false;
            }
        });
        const email = ref(localStorage.getItem("email") || "");
        const prenom = ref(localStorage.getItem("prenom") || "");
        const generateThumbnail = (url) => {
            console.log("🔍 Vérification du lien :", url); // 🔹 Debug
            if (!url || url === "Pas de replay disponible" || url === "pb de connection")
                return null;
            const match = url.match(/\/d\/(.*?)\//);
            if (!match) {
                console.warn("⚠️ Aucun ID trouvé dans :", url);
                return null;
            }
            return `https://drive.google.com/thumbnail?id=${match[1]}`;
        };
        const updateWindowWidth = () => {
            windowWidth.value = window.innerWidth;
        };
        const fetchPlanningData = async () => {
            console.log("🔍 Envoi des paramètres à l'API :", { email: email.value, prenom: prenom.value });
            // 1️⃣ 🔹 Charger d'abord les données en cache si disponibles
            const cachedData = localStorage.getItem("planningData");
            if (cachedData) {
                planningData.value = JSON.parse(cachedData);
                console.log("📂 Chargement des données depuis le cache :", planningData.value);
            }
            // 2️⃣ 🔹 Lancer l'appel API en arrière-plan
            try {
                const response = await axios.get(`${API_URL}?route=planning&email=${encodeURIComponent(email.value)}&prenom=${encodeURIComponent(prenom.value)}`, {
                    cache: "no-store"
                });
                console.log("📡 Réponse API reçue :", response.data);
                if (response.data.success && response.data.planning) {
                    // 3️⃣ 🔥 Comparer les nouvelles données avec le cache
                    const newData = JSON.stringify(response.data.planning);
                    if (newData !== localStorage.getItem("planningData")) {
                        // 4️⃣ 🚀 Mettre à jour uniquement si les données ont changé
                        planningData.value = response.data.planning;
                        localStorage.setItem("planningData", newData);
                        console.log("✅ planningData mis à jour :", planningData.value);
                    }
                    else {
                        console.log("🔄 Aucune mise à jour nécessaire, cache inchangé.");
                    }
                }
            }
            catch (error) {
                console.error("❌ Erreur API :", error);
            }
        };
        const generateDownloadLink = (url) => {
            if (!url || url === "Pas de replay disponible" || url === "pb de connection")
                return null;
            const match = url.match(/\/d\/(.*?)\//);
            return match ? `https://drive.google.com/uc?export=download&id=${match[1]}` : url;
        };
        const openVideo = (url, title) => {
            if (!url || url === "Aucun aperçu disponible" || url === "pb de connection")
                return;
            const match = url.match(/\/d\/(.*?)\//);
            videoUrl.value = match ? `https://drive.google.com/file/d/${match[1]}/preview` : url;
            currentVideoTitle.value = title;
            showModal.value = true;
        };
        const closeModal = () => {
            showModal.value = false;
            videoUrl.value = "";
        };
        onMounted(() => {
            fetchPlanningData(); // 🚀 Charge les données instantanément + met à jour en arrière-plan
            window.addEventListener("resize", updateWindowWidth);
        });
        onUnmounted(() => {
            window.removeEventListener("resize", updateWindowWidth);
        });
        return {
            selectedCourse, // ✅ Ajouté ici
            courseRefs,
            setCourseRef, // ✅ Ajouté ici pour les références des cours
            sortedPlanningData,
            loading,
            isLoggedIn,
            openVideo,
            closeModal,
            showModal,
            videoUrl,
            currentVideoTitle,
            generateDownloadLink,
            generateThumbnail,
            windowWidth
        };
    },
});
const __VLS_ctx = {};
const __VLS_componentsOption = { Layout };
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['clickable-row']} */ ;
/** @type {__VLS_StyleScopedClasses['fixed-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['fixed-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['fixed-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['fixed-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['fixed-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['fixed-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['fixed-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['fixed-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['fixed-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['fixed-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fixed-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fixed-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fixed-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fixed-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fixed-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['fixed-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['fixed-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['replay-thumbnail']} */ ;
/** @type {__VLS_StyleScopedClasses['replay-thumbnail-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-secondary']} */ ;
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "fixed-menu" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    id: "courseSelect",
    value: (__VLS_ctx.selectedCourse),
    ...{ class: "form-select" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "",
    disabled: true,
});
for (const [row, index] of __VLS_getVForSourceType((__VLS_ctx.sortedPlanningData))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (index),
        value: (row.formattedDate),
    });
    (row.formattedDate);
    (row.commentaire || "Sans titre");
}
if (__VLS_ctx.windowWidth >= 768) {
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
        ...{ class: "d-none d-md-table-cell" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
        ...{ class: "d-none d-md-table-cell" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
        ...{ class: "d-none d-md-table-cell" },
    });
    if (__VLS_ctx.sortedPlanningData.length > 0 && __VLS_ctx.sortedPlanningData.some(row => row.lienReplay && row.lienReplay !== 'Pas de replay disponible' && row.lienReplay !== 'pb de connection')) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
        for (const [row, index] of __VLS_getVForSourceType((__VLS_ctx.sortedPlanningData))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.windowWidth >= 768))
                            return;
                        if (!(__VLS_ctx.sortedPlanningData.length > 0 && __VLS_ctx.sortedPlanningData.some(row => row.lienReplay && row.lienReplay !== 'Pas de replay disponible' && row.lienReplay !== 'pb de connection')))
                            return;
                        __VLS_ctx.openVideo(row.lienReplay, row.formattedDate);
                    } },
                key: (index),
                ref: (el => __VLS_ctx.setCourseRef(el, row.formattedDate)),
                ...{ class: "clickable-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (row.formattedDate);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "d-none d-md-table-cell" },
            });
            (row.commentaire || "Aucun");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "d-none d-md-table-cell" },
            });
            (row.trimestre || "Non défini");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (row.presence);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            if (__VLS_ctx.generateThumbnail(row.lienReplay)) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.windowWidth >= 768))
                                return;
                            if (!(__VLS_ctx.sortedPlanningData.length > 0 && __VLS_ctx.sortedPlanningData.some(row => row.lienReplay && row.lienReplay !== 'Pas de replay disponible' && row.lienReplay !== 'pb de connection')))
                                return;
                            if (!(__VLS_ctx.generateThumbnail(row.lienReplay)))
                                return;
                            __VLS_ctx.openVideo(row.lienReplay, row.formattedDate);
                        } },
                    src: (__VLS_ctx.generateThumbnail(row.lienReplay)),
                    alt: "Miniature Replay",
                    ...{ class: "replay-thumbnail" },
                });
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "text-muted" },
                });
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "d-none d-md-table-cell" },
            });
            if (__VLS_ctx.generateDownloadLink(row.lienReplay)) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                    href: (__VLS_ctx.generateDownloadLink(row.lienReplay)),
                    target: "_blank",
                    ...{ class: "btn btn-primary btn-sm" },
                });
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ class: "btn btn-secondary btn-sm" },
                    disabled: true,
                });
            }
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            colspan: "6",
            ...{ class: "text-center py-4" },
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
}
if (__VLS_ctx.windowWidth < 768) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    if (__VLS_ctx.sortedPlanningData.length > 0 && __VLS_ctx.sortedPlanningData.some(row => row.lienReplay && row.lienReplay !== 'Pas de replay disponible' && row.lienReplay !== 'pb de connection')) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        for (const [row, index] of __VLS_getVForSourceType((__VLS_ctx.sortedPlanningData))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (index),
                ...{ class: "card mb-3 shadow-sm p-2 position-relative" },
                ref: (el => __VLS_ctx.setCourseRef(el, row.formattedDate)),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "presence-badge" },
                ...{ class: ({
                        'bg-success': row.presence === 'Présent',
                        'bg-danger': row.presence === 'Absent',
                        'bg-warning': row.presence === 'Reporté',
                        'bg-primary': row.presence === 'À venir',
                        'bg-secondary': !row.presence || row.presence === 'Inconnu'
                    }) },
            });
            (row.presence || "Inconnu");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-body d-flex flex-column align-items-center" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
                ...{ class: "card-title text-center" },
            });
            (row.formattedDate);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "card-text" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (row.trimestre || "Non défini");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "card-text" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (row.commentaire || "Aucun");
            if (__VLS_ctx.generateThumbnail(row.lienReplay)) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "mb-3 text-center" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.windowWidth < 768))
                                return;
                            if (!(__VLS_ctx.sortedPlanningData.length > 0 && __VLS_ctx.sortedPlanningData.some(row => row.lienReplay && row.lienReplay !== 'Pas de replay disponible' && row.lienReplay !== 'pb de connection')))
                                return;
                            if (!(__VLS_ctx.generateThumbnail(row.lienReplay)))
                                return;
                            __VLS_ctx.openVideo(row.lienReplay, row.formattedDate);
                        } },
                    src: (__VLS_ctx.generateThumbnail(row.lienReplay)),
                    alt: "Miniature Replay",
                    ...{ class: "replay-thumbnail-lg" },
                });
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "d-flex justify-content-center mt-2 w-100" },
            });
            if (__VLS_ctx.generateDownloadLink(row.lienReplay)) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                    href: (__VLS_ctx.generateDownloadLink(row.lienReplay)),
                    target: "_blank",
                    ...{ class: "btn btn-primary btn-sm mx-1" },
                });
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ class: "btn btn-secondary btn-sm mx-1" },
                    disabled: true,
                });
            }
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-center py-4" },
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
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-center py-4" },
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
if (__VLS_ctx.showModal) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal fade show" },
        tabindex: "-1",
        ...{ style: {} },
        'aria-modal': "true",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-dialog modal-dialog-centered" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-content" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
        ...{ class: "modal-title" },
    });
    (__VLS_ctx.currentVideoTitle);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.closeModal) },
        type: "button",
        ...{ class: "btn-close" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.iframe, __VLS_intrinsicElements.iframe)({
        src: (__VLS_ctx.videoUrl),
        frameborder: "0",
        allow: "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture",
        allowfullscreen: true,
        width: "100%",
        height: "315",
    });
}
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['container-xxl']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['fixed-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['table-responsive']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table-hover']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['table-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['d-none']} */ ;
/** @type {__VLS_StyleScopedClasses['d-md-table-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['d-none']} */ ;
/** @type {__VLS_StyleScopedClasses['d-md-table-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['d-none']} */ ;
/** @type {__VLS_StyleScopedClasses['d-md-table-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['clickable-row']} */ ;
/** @type {__VLS_StyleScopedClasses['d-none']} */ ;
/** @type {__VLS_StyleScopedClasses['d-md-table-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['d-none']} */ ;
/** @type {__VLS_StyleScopedClasses['d-md-table-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['replay-thumbnail']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['d-none']} */ ;
/** @type {__VLS_StyleScopedClasses['d-md-table-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['position-relative']} */ ;
/** @type {__VLS_StyleScopedClasses['presence-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-success']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['card-text']} */ ;
/** @type {__VLS_StyleScopedClasses['card-text']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['replay-thumbnail-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['w-100']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mx-1']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mx-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['modal']} */ ;
/** @type {__VLS_StyleScopedClasses['fade']} */ ;
/** @type {__VLS_StyleScopedClasses['show']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-dialog']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-dialog-centered']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-content']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-header']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-title']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-close']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-body']} */ ;
var __VLS_dollars;
let __VLS_self;
