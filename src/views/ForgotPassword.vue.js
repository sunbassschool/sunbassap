import Layout from "@/views/Layout.vue";
export default (await import('vue')).defineComponent({
    name: "ForgotPassword",
    components: { Layout },
    data() {
        return {
            email: "",
            message: "",
            messageType: "",
            loading: false,
        };
    },
    methods: {
        async requestReset() {
            if (!this.email) {
                this.message = "Veuillez entrer votre adresse e-mail.";
                this.messageType = "alert-danger";
                return;
            }
            this.loading = true;
            try {
                // 🔥 Construction de l'URL avec l'email en paramètre GET
                const apiUrl = `https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbwyVuqrGgzPZVTc9YsGF6-UVzX_5Adyrgs1OsSXW6h_ONbNL2Zi0_joOXowRNK3-YHZyQ/exec?route=forgotPassword&email=${encodeURIComponent(this.email)}`;
                // 🔥 Envoi de la requête en GET, car l'API l'exige sous ce format
                const response = await fetch(apiUrl, {
                    method: "GET", // 📌 Passage en GET au lieu de POST
                    headers: { "Content-Type": "application/json" }
                });
                const data = await response.json();
                console.log("Réponse API :", data); // ✅ Debug pour voir la réponse
                this.loading = false;
                if (data.status === "success") {
                    this.message = "✅ Si l'email existe, un lien de réinitialisation a été envoyé.";
                    this.messageType = "alert-success";
                }
                else {
                    this.message = "⚠️ " + data.message;
                    this.messageType = "alert-danger";
                }
            }
            catch (error) {
                console.error("❌ Erreur Fetch :", error);
                this.message = "❌ Problème de connexion au serveur.";
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
    ...{ class: "container d-flex justify-content-center align-items-center mt-5" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card shadow p-4 w-50" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: "text-center mb-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
    ...{ onSubmit: (__VLS_ctx.requestReset) },
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
    ...{ class: "form-control" },
    required: true,
    autocomplete: "off",
});
(__VLS_ctx.email);
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
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['w-100']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
var __VLS_dollars;
let __VLS_self;
