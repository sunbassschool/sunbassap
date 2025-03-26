import Layout from "../views/Layout.vue";
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { getUserRole } from "@/utils/api";
export default (await import('vue')).defineComponent({
    name: "CreatePlanning",
    components: { Layout },
    setup() {
        const router = useRouter();
        const formUrl = ref("https://docs.google.com/forms/d/e/1FAIpQLSdV4Qb0MAOGJK69e3_sYJn5815fMGJUBY-2vlPrUqImhvPmQQ/viewform?embedded=true");
        const loading = ref(true);
        onMounted(() => {
            if (getUserRole() !== "admin") {
                console.error("🚫 Accès refusé : vous n'êtes pas admin !");
                router.push("/");
            }
            // Sécurité : si l'iframe prend trop de temps, désactive le loader après 3s
            setTimeout(() => {
                loading.value = false;
            }, 3000);
        });
        return { formUrl, loading };
    },
});
const __VLS_ctx = {};
const __VLS_componentsOption = { Layout };
let __VLS_components;
let __VLS_directives;
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
    ...{ class: "fullwidth-container mt-0" },
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "iframe-container" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.iframe, __VLS_intrinsicElements.iframe)({
    ...{ onLoad: (...[$event]) => {
            __VLS_ctx.loading = false;
        } },
    ref: "formIframe",
    ...{ class: "google-form shadow-sm" },
    src: (__VLS_ctx.formUrl),
    frameborder: "0",
    loading: "lazy",
});
__VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (!__VLS_ctx.loading) }, null, null);
/** @type {typeof __VLS_ctx.formIframe} */ ;
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['fullwidth-container']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-0']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['iframe-container']} */ ;
/** @type {__VLS_StyleScopedClasses['google-form']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
var __VLS_dollars;
let __VLS_self;
