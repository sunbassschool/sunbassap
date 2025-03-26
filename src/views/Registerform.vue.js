import Layout from "../views/Layout.vue";
export default (await import('vue')).defineComponent({
    name: "RegisterForm",
    components: { Layout },
    data() {
        return {
            email: localStorage.getItem("savedEmail") || "",
            emailError: "",
            prenom: localStorage.getItem("savedPrenom") || "",
            codeAcces: "",
            confirmCodeAcces: "",
            cguAccepted: false,
            errorMessage: "", // ✅ Ajoute cette ligne
            message: "",
            passwordError: "",
            confirmPasswordError: "",
            isLoading: false, // Ajout du statut de chargement
            progress: 0, // Ajout pour la progression de la barre
            showPassword: false, // 🔥 Gère l'affichage du mot de passe
            showConfirmPassword: false, // 🔥 Gère l'affichage de la confirmation
        };
    },
    watch: {
        email(newValue) {
            localStorage.setItem("savedEmail", newValue);
        },
        prenom(newValue) {
            localStorage.setItem("savedPrenom", newValue);
        }
    },
    computed: {
        passwordsMatch() {
            return this.codeAcces && this.confirmCodeAcces && this.codeAcces === this.confirmCodeAcces;
        },
        progressPercentage() {
            let progress = 0;
            if (this.email)
                progress += 25;
            if (this.prenom)
                progress += 25;
            if (this.codeAcces.length >= 8)
                progress += 25;
            if (this.passwordsMatch)
                progress += 25;
            return `${progress}%`;
        },
        progressBarClass() {
            if (this.progressPercentage === "100%")
                return "strong";
            if (this.progressPercentage >= "50%")
                return "medium";
            return "weak";
        },
        isSubmitDisabled() {
            return !!this.passwordError || !!this.confirmPasswordError || !this.cguAccepted;
        },
        passwordStrengthClass() {
            if (this.codeAcces.length < 8)
                return "weak";
            if (/[A-Z]/.test(this.codeAcces) && /\d/.test(this.codeAcces) && /[@$!%*?&]/.test(this.codeAcces)) {
                return "strong";
            }
            return "medium";
        },
        passwordStrengthText() {
            return this.passwordStrengthClass === "weak" ? "Faible" :
                this.passwordStrengthClass === "medium" ? "Moyen" :
                    "Fort";
        },
    },
    methods: {
        validatePasswordMatch() {
            this.confirmPasswordError = this.passwordsMatch ? "" : "Les mots de passe ne correspondent pas.";
        },
        validatePassword() {
            const strongPasswordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!strongPasswordRegex.test(this.codeAcces)) {
                this.passwordError = "Le mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial.";
            }
            else {
                this.passwordError = "";
            }
        },
        validateEmail() {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            this.emailError = emailRegex.test(this.email) ? "" : "Adresse e-mail invalide.";
            if (this.emailError) {
                this.$nextTick(() => this.$refs.emailField.focus());
            }
        },
        startProgressBar() {
            this.progress = 0;
            const interval = setInterval(() => {
                if (this.progress < 90) {
                    this.progress += 10; // La barre avance progressivement
                }
                else {
                    clearInterval(interval); // On arrête avant d'atteindre 100%
                }
            }, 300); // Toutes les 300ms, la barre progresse
        },
        async submitForm() {
            if (this.codeAcces !== this.confirmCodeAcces) {
                this.confirmPasswordError = "Les mots de passe ne correspondent pas.";
                return;
            }
            else {
                this.confirmPasswordError = "";
            }
            this.isLoading = true; // ✅ Active le chargement AVANT l'appel API
            this.startProgressBar(); // Démarre la barre de progression
            try {
                const url = `https://script.google.com/macros/s/AKfycbxkIJaFUJlTgsoFC9yui2GmmGT6nAH2aJE77xvt3QGzDItBwPUcu4CFNSsvd37_724m-A/exec?route=register&email=${encodeURIComponent(this.email)}&prenom=${encodeURIComponent(this.prenom)}&codeAcces=${encodeURIComponent(this.codeAcces)}`;
                const response = await fetch(url, { method: "GET" });
                const result = await response.json();
                if (result.success) {
                    this.message = "Inscription réussie !";
                    localStorage.setItem("user", JSON.stringify({
                        email: this.email,
                        prenom: this.prenom,
                        id: result.id
                    }));
                    // Réinitialisation du formulaire
                    this.email = "";
                    this.prenom = "";
                    this.codeAcces = "";
                    this.confirmCodeAcces = "";
                    this.cguAccepted = false;
                    setTimeout(() => this.$router.push('/mon-espace'), 1500);
                }
                else {
                    this.message = "Erreur lors de l'inscription.";
                }
            }
            catch (error) {
                console.error("Erreur :", error);
                this.message = "Impossible de contacter le serveur.";
            }
            finally {
                this.progress = 100; // Termine la barre de progression
                setTimeout(() => {
                    this.isLoading = false;
                    this.progress = 0; // Réinitialisation après la fin
                }, 500); // Petite pause avant de cacher la barre
            }
        },
    },
});
const __VLS_ctx = {};
const __VLS_componentsOption = { Layout };
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['h2-immersive']} */ ;
/** @type {__VLS_StyleScopedClasses['h2-immersive']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-password']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-label']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['forgot-password-link']} */ ;
/** @type {__VLS_StyleScopedClasses['container']} */ ;
/** @type {__VLS_StyleScopedClasses['register-container']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['progress-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['weak']} */ ;
/** @type {__VLS_StyleScopedClasses['progress-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['medium']} */ ;
/** @type {__VLS_StyleScopedClasses['progress-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['strong']} */ ;
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
    ...{ class: "register-container" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: "h2-immersive" },
});
const __VLS_5 = {}.transition;
/** @type {[typeof __VLS_components.Transition, typeof __VLS_components.transition, typeof __VLS_components.Transition, typeof __VLS_components.transition, ]} */ ;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent(__VLS_5, new __VLS_5({
    name: "fade",
}));
const __VLS_7 = __VLS_6({
    name: "fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
__VLS_8.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "progress-container" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "progress-bar" },
    ...{ style: ({ width: __VLS_ctx.progressPercentage }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
    ...{ onSubmit: (__VLS_ctx.submitForm) },
    ...{ class: "card p-4 shadow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "mb-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onKeyup: (...[$event]) => {
            __VLS_ctx.$refs.prenomField.focus();
        } },
    ref: "emailField",
    type: "email",
    ...{ class: "form-control" },
    ...{ class: ({ 'shake': __VLS_ctx.emailError }) },
    required: true,
    autocomplete: "email",
});
(__VLS_ctx.email);
/** @type {typeof __VLS_ctx.emailField} */ ;
if (__VLS_ctx.emailError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-danger" },
    });
    (__VLS_ctx.emailError);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "mb-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onKeyup: (...[$event]) => {
            __VLS_ctx.$refs.passwordField.focus();
        } },
    value: (__VLS_ctx.prenom),
    ref: "prenomField",
    type: "text",
    ...{ class: "form-control" },
    required: true,
});
/** @type {typeof __VLS_ctx.prenomField} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "mb-3 password-container" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "password-wrapper" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onKeyup: (...[$event]) => {
            __VLS_ctx.$refs.confirmPasswordField.focus();
        } },
    ...{ onInput: (__VLS_ctx.validatePassword) },
    ref: "passwordField",
    type: (__VLS_ctx.showPassword ? 'text' : 'password'),
    ...{ class: "form-control" },
    ...{ class: ({ 'shake': __VLS_ctx.passwordError }) },
    required: true,
});
(__VLS_ctx.codeAcces);
/** @type {typeof __VLS_ctx.passwordField} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.showPassword = !__VLS_ctx.showPassword;
        } },
    ...{ class: "toggle-password" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: (__VLS_ctx.showPassword ? 'fas fa-eye-slash' : 'fas fa-eye') },
});
if (__VLS_ctx.passwordError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-danger" },
    });
    (__VLS_ctx.passwordError);
}
if (__VLS_ctx.codeAcces) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "password-strength" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "strength-bar" },
        ...{ class: (__VLS_ctx.passwordStrengthClass) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (__VLS_ctx.passwordStrengthText);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "mb-3 password-container" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "password-wrapper" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: ({ 'shake': __VLS_ctx.confirmPasswordError }) },
    type: (__VLS_ctx.showConfirmPassword ? 'text' : 'password'),
    ...{ class: "form-control" },
    required: true,
});
(__VLS_ctx.confirmCodeAcces);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.showConfirmPassword = !__VLS_ctx.showConfirmPassword;
        } },
    ...{ class: "toggle-password" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: (__VLS_ctx.showConfirmPassword ? 'fas fa-eye-slash' : 'fas fa-eye') },
});
if (__VLS_ctx.confirmCodeAcces) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "match-indicator" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: (__VLS_ctx.passwordsMatch ? 'fas fa-check-circle text-success' : 'fas fa-times-circle text-danger') },
    });
}
if (__VLS_ctx.confirmPasswordError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-danger" },
    });
    (__VLS_ctx.confirmPasswordError);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "mb-3 form-check" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "checkbox",
    ...{ class: "form-check-input" },
    id: "cgu",
    required: true,
});
(__VLS_ctx.cguAccepted);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-check-label" },
    for: "cgu",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
    href: "/cgu",
    target: "_blank",
});
if (__VLS_ctx.isLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "loading-container" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "loading-bar" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    type: "submit",
    ...{ class: "btn btn-primary w-100" },
    disabled: (__VLS_ctx.isSubmitDisabled || __VLS_ctx.isLoading),
    ...{ class: ({ 'btn-loading': __VLS_ctx.isLoading }) },
});
if (__VLS_ctx.isLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-spinner fa-spin" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
if (__VLS_ctx.message) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "success-message" },
    });
    (__VLS_ctx.message);
}
if (__VLS_ctx.errorMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "error-message" },
    });
    (__VLS_ctx.errorMessage);
}
var __VLS_8;
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['register-container']} */ ;
/** @type {__VLS_StyleScopedClasses['h2-immersive']} */ ;
/** @type {__VLS_StyleScopedClasses['progress-container']} */ ;
/** @type {__VLS_StyleScopedClasses['progress-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['shake']} */ ;
/** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['password-container']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['password-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['shake']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-password']} */ ;
/** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['password-strength']} */ ;
/** @type {__VLS_StyleScopedClasses['strength-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['password-container']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['password-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['shake']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-password']} */ ;
/** @type {__VLS_StyleScopedClasses['match-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-label']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-container']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['w-100']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['success-message']} */ ;
/** @type {__VLS_StyleScopedClasses['error-message']} */ ;
var __VLS_dollars;
let __VLS_self;
