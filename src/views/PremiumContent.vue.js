export default (await import('vue')).defineComponent({
    data() {
        return {
            prenom: "",
            abo: "gratuit" // 🔥 Stocké en mémoire et pas en localStorage
        };
    },
    async mounted() {
        await this.fetchUserInfo(); // ✅ Récupère les infos réelles depuis le serveur
    },
    methods: {
        async fetchUserInfo() {
            try {
                const apiUrl = "https://script.google.com/macros/s/AKfycbyaXWbAryyHp1t7HmdCHN7EuQwVlwol5u3WTtULrtN6yY9JFxjikiExxvQrakD56QRHyw/exec";
                const url = `${apiUrl}?route=getUser&jwt=${localStorage.getItem("jwt")}`;
                const response = await fetch(url);
                const userInfo = await response.json();
                if (userInfo.status === "success") {
                    this.prenom = userInfo.data.prenom;
                    this.abo = userInfo.data.abo;
                }
            }
            catch (error) {
                console.error("❌ Erreur lors de la récupération des infos :", error);
            }
        }
    }
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
(__VLS_ctx.prenom);
if (__VLS_ctx.abo === 'premium') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    const __VLS_0 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        to: "/upgrade",
    }));
    const __VLS_2 = __VLS_1({
        to: "/upgrade",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_3.slots.default;
    var __VLS_3;
}
var __VLS_dollars;
let __VLS_self;
