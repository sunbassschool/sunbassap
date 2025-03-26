import Layout from "../views/Layout.vue";
import axios from "axios";
import { ref, computed, onMounted } from "vue";
import { jwtDecode } from "jwt-decode";
export default (await import('vue')).defineComponent({
    name: "Videos",
    components: { Layout },
    setup() {
        const role = ref(null); // ✅ On ne définit pas encore le rôle, il sera chargé après
        const videos = ref([]);
        const loading = ref(true);
        const search = ref("");
        const showModal = ref(false);
        const videoUrl = ref("");
        const currentVideoTitle = ref("");
        // ✅ Infos Google Sheet
        const SHEET_ID = "1DzXQORma_DuTe5TWvEmlhDIjFhqOVyJcjK2mxvXEhLc";
        const API_KEY = "AIzaSyBo0kz-JkCiuWumprwn5kpiVPqYmKr5NZI";
        const RANGE = "'Vidéos pédagogiques'!A2:F";
        // ⏳ Définition de la durée du cache (24h)
        const cacheDuration = 24 * 60 * 60 * 1000;
        const applyVideoLimit = () => {
            let limit = 1000; // 🔥 Par défaut, accès complet
            if (role.value === null || role.value === undefined) {
                limit = 5; // 🔥 Si le rôle n'est pas encore chargé, on affiche 5 vidéos
            }
            else if (role.value === "guest") {
                limit = 20;
            }
            else if (role.value === "user") {
                limit = 50; // ✅ Ajout de la limite pour les utilisateurs "user"
            }
            else if (role.value === "adherent") {
                limit = 1000; // ✅ Ajout de la limite pour les utilisateurs "user"
            }
            videos.value = videos.value.slice(0, limit);
            console.log(`📹 Nombre de vidéos affichées : ${videos.value.length} (Rôle: ${role.value || "inconnu"})`);
        };
        const fetchVideosFromAPI = async () => {
            try {
                console.log("🌐 Récupération des vidéos depuis l'API...");
                const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;
                const response = await axios.get(url);
                console.log("Données brutes Google Sheets :", response.data);
                const rows = response.data.values || [];
                if (rows.length > 0) {
                    const headers = ["Titre", "", "Lien", "", "", "MotsCles"];
                    videos.value = rows.map(row => Object.fromEntries(headers.map((header, i) => [header, row[i] || ""]).filter(([key]) => key)));
                    // ✅ Appliquer la restriction selon le rôle
                    applyVideoLimit();
                    // ✅ Mettre à jour le cache
                    localStorage.setItem("videos_cache", JSON.stringify(videos.value));
                    localStorage.setItem("videos_cache_timestamp", Date.now());
                }
            }
            catch (error) {
                console.error("❌ Erreur lors du chargement des vidéos :", error);
            }
            finally {
                loading.value = false;
            }
        };
        const fetchVideos = async () => {
            console.log("🔍 Vérification du rôle :", role.value);
            const cacheKey = "videos_cache";
            if (!role.value || role.value === "guest") {
                console.log("🧹 Suppression du cache car accès restreint !");
                localStorage.removeItem(cacheKey);
                localStorage.removeItem(`${cacheKey}_timestamp`);
            }
            const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
            const cachedData = localStorage.getItem(cacheKey);
            if (cachedData && cacheTimestamp && Date.now() - cacheTimestamp < cacheDuration) {
                console.log("⚡ Chargement des vidéos depuis le cache");
                videos.value = JSON.parse(cachedData);
            }
            else {
                await fetchVideosFromAPI();
            }
            applyVideoLimit(); // ✅ On applique la limite ici
            loading.value = false;
        };
        // ✅ Miniature YouTube
        const getThumbnail = (url) => {
            if (!url)
                return "";
            let videoId = "";
            if (url.includes("youtube.com/watch?v=")) {
                videoId = url.split("v=")[1]?.split("&")[0];
            }
            else if (url.includes("youtu.be/")) {
                videoId = url.split("youtu.be/")[1]?.split("?")[0];
            }
            return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : "";
        };
        // ✅ Filtrage des vidéos (titre + mots-clés)
        const filteredVideos = computed(() => {
            if (!search.value)
                return videos.value;
            const searchLower = search.value.toLowerCase();
            return videos.value.filter(video => {
                const titleLower = video.Titre ? video.Titre.toLowerCase() : "";
                const keywordsLower = video.MotsCles ? video.MotsCles.toLowerCase() : "";
                return titleLower.includes(searchLower) || keywordsLower.includes(searchLower);
            });
        });
        const openVideo = (url, title) => {
            let videoId = "";
            if (url.includes("youtube.com/watch?v=")) {
                videoId = url.split("v=")[1]?.split("&")[0];
            }
            else if (url.includes("youtu.be/")) {
                videoId = url.split("youtu.be/")[1]?.split("?")[0];
            }
            if (videoId) {
                videoUrl.value = `https://www.youtube.com/embed/${videoId}`;
                currentVideoTitle.value = title;
                showModal.value = true;
            }
        };
        const closeModal = () => {
            showModal.value = false;
            videoUrl.value = "";
        };
        onMounted(async () => {
            const token = localStorage.getItem("jwt");
            if (token) {
                try {
                    const decoded = jwtDecode(token);
                    role.value = decoded.role || "guest";
                    console.log("✅ Rôle récupéré depuis le JWT :", role.value);
                }
                catch (error) {
                    console.error("❌ Erreur de décodage du JWT :", error);
                    role.value = null; // 🔥 Correction : rôle inconnu = null
                }
            }
            else {
                console.log("⚠️ Aucun JWT trouvé, rôle par défaut : null");
                role.value = null; // ✅ Important pour forcer 5 vidéos par défaut
            }
            await fetchVideos();
        });
        return {
            role, // ✅ Ajouté ici pour éviter l'erreur Vue
            videos,
            loading,
            search,
            filteredVideos,
            getThumbnail,
            openVideo,
            closeModal,
            showModal,
            videoUrl,
            currentVideoTitle
        };
    },
});
const __VLS_ctx = {};
const __VLS_componentsOption = { Layout };
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "form-control mb-3" },
    placeholder: "🔎 Rechercher par mot-clé...",
    autocomplete: "off",
    autocorrect: "off",
    autocapitalize: "off",
    spellcheck: "false",
    name: "search-field",
    id: "search-field",
});
(__VLS_ctx.search);
if (__VLS_ctx.role === null || __VLS_ctx.role === undefined || __VLS_ctx.role === 'guest') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-warning text-center" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.br)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
        href: "/registerform",
        ...{ class: "btn btn-primary mt-2" },
    });
}
else if (__VLS_ctx.role === 'user') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-info text-center" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.br)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
        href: "https://www.sunbassschool.com",
        target: "_blank",
        rel: "noopener noreferrer",
        ...{ class: "btn btn-success mt-2" },
    });
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
if (__VLS_ctx.filteredVideos.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row row-cols-1 row-cols-md-4 g-4" },
    });
    for (const [video, index] of __VLS_getVForSourceType((__VLS_ctx.filteredVideos))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (index),
            ...{ class: "col" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card shadow-sm" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.filteredVideos.length))
                        return;
                    __VLS_ctx.openVideo(video.Lien, video.Titre);
                } },
            src: (__VLS_ctx.getThumbnail(video.Lien)),
            ...{ class: "card-img-top" },
            alt: "Miniature vidéo",
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-body" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: "card-title text-center" },
        });
        (video.Titre);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "card-text" },
        });
        for (const [tag, i] of __VLS_getVForSourceType((video.MotsCles.split(',')))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                key: (i),
                ...{ class: "badge bg-primary me-1" },
            });
            (tag.trim());
        }
    }
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
/** @type {__VLS_StyleScopedClasses['container']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-info']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-success']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['row-cols-1']} */ ;
/** @type {__VLS_StyleScopedClasses['row-cols-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['g-4']} */ ;
/** @type {__VLS_StyleScopedClasses['col']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['card-img-top']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['card-text']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
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
