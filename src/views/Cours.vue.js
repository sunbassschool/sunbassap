import Layout from "../views/Layout.vue";
import axios from "axios";
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { getValidToken } from "@/utils/api"; // 🔐 Import sécurisé
export default (await import('vue')).defineComponent({
    name: "Cours",
    components: { Layout },
    setup() {
        const filterUpcoming = ref(false);
        const router = useRouter();
        const coursData = ref([]);
        const loading = ref(true);
        const deleting = ref(false);
        const updating = ref(false);
        const selectedStudent = ref("");
        const editModalOpen = ref(false);
        const editedCours = ref({});
        const selectedWeek = ref(""); // Stocke la semaine sélectionnée
        const successMessage = ref("");
        const isPastCourse = (cours) => {
            if (!cours || !cours["Date et heure"])
                return false;
            const courseDate = new Date(cours["Date et heure"]);
            return courseDate.getTime() < Date.now(); // ✅ Compare avec le timestamp actuel
        };
        const goToNextWeek = () => {
            if (!selectedWeek.value || weeks.value.length === 0)
                return;
            const currentIndex = weeks.value.findIndex(week => week.start.getTime() === selectedWeek.value.start.getTime());
            if (currentIndex !== -1 && currentIndex < weeks.value.length - 1) {
                selectedWeek.value = weeks.value[currentIndex + 1]; // ✅ Sélectionne la semaine suivante
            }
        };
        const showSuccessMessage = (message) => {
            successMessage.value = message;
            setTimeout(() => {
                successMessage.value = "";
            }, 4000);
        };
        const API_URL = "https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbykYySA5D4taWYaICxCHt6l3WmOM5RNg4P_rCoJowfxusXpSy5D-ZuGFao9UjGWHD86AA/exec";
        // ✅ Vérifie si l'utilisateur est connecté
        const isLoggedIn = computed(() => !!localStorage.getItem("jwt"));
        if (!isLoggedIn.value) {
            router.replace("/login");
        }
        // ✅ Récupérer les cours depuis Google Sheets
        const fetchCours = async (noCache = false) => {
            loading.value = true;
            try {
                const jwt = await getValidToken(); // 🔒 Ajoute le token sécurisé
                const url = `${API_URL}?route=suiviCours${noCache ? `&t=${Date.now()}` : ""}`;
                const response = await axios.get(url);
                if (response.data.status === "success") {
                    console.log("📡 Données reçues depuis l'API :", response.data.data); // 🔍 Vérifier les données
                    coursData.value = response.data.data;
                }
                else {
                    console.error("❌ Erreur API:", response.data.message);
                }
            }
            catch (error) {
                console.error("❌ Erreur lors du chargement des cours:", error);
            }
            finally {
                loading.value = false;
            }
        };
        // ✅ Liste unique des prénoms
        const uniqueStudents = computed(() => {
            if (!coursData.value || coursData.value.length === 0)
                return [];
            const students = new Set(coursData.value
                .map((cours) => cours.Prénom?.trim())
                .filter(Boolean) // Supprime les valeurs vides
            );
            return Array.from(students).sort();
        });
        // ✅ Générer les semaines disponibles
        const weeks = computed(() => {
            const uniqueWeeks = new Map(); // Utilisation de Map pour éviter les doublons
            coursData.value.forEach((cours) => {
                if (cours["Date et heure"]) {
                    const date = new Date(cours["Date et heure"]);
                    const startOfWeek = new Date(date);
                    startOfWeek.setDate(date.getDate() - date.getDay() + 1); // Lundi de la semaine
                    startOfWeek.setHours(0, 0, 0, 0); // Réinitialise l'heure pour éviter les différences
                    const endOfWeek = new Date(startOfWeek);
                    endOfWeek.setDate(startOfWeek.getDate() + 6); // Dimanche de la semaine
                    endOfWeek.setHours(23, 59, 59, 999); // Fin de journée pour éviter les erreurs de comparaison
                    const key = `${startOfWeek.toISOString()}_${endOfWeek.toISOString()}`; // Clé unique
                    if (!uniqueWeeks.has(key)) {
                        uniqueWeeks.set(key, {
                            start: startOfWeek,
                            end: endOfWeek,
                            label: `Semaine du ${startOfWeek.getDate()} ${startOfWeek.toLocaleString("fr", { month: "long" })}`
                        });
                    }
                }
            });
            // ✅ Retourne les semaines triées par date de début
            return Array.from(uniqueWeeks.values()).sort((a, b) => a.start - b.start);
        });
        const selectClosestWeek = () => {
            if (weeks.value.length === 0)
                return;
            const now = new Date();
            // ✅ Trouver la première semaine qui contient AU MOINS un cours futur
            let closestWeek = weeks.value.find(week => {
                return coursData.value.some(cours => {
                    const courseDate = new Date(cours["Date et heure"]);
                    return courseDate >= now && courseDate >= week.start && courseDate <= week.end;
                });
            });
            // ✅ Si aucune semaine avec un cours futur n’est trouvée, prendre la première semaine future
            if (!closestWeek) {
                closestWeek = weeks.value.find(week => now < week.start);
            }
            // ✅ Appliquer la semaine trouvée
            if (closestWeek) {
                selectedWeek.value = closestWeek;
            }
        };
        // ✅ Filtrage des cours par élève, semaine et cours à venir
        const filteredCours = computed(() => {
            let filtered = [...coursData.value];
            if (selectedStudent.value) {
                filtered = filtered.filter((cours) => cours.Prénom?.trim() === selectedStudent.value.trim());
            }
            if (filterUpcoming.value) {
                const now = new Date();
                filtered = filtered.filter((cours) => {
                    const courseDate = new Date(cours["Date et heure"]);
                    return courseDate > now;
                });
            }
            if (selectedWeek.value) {
                filtered = filtered.filter((cours) => {
                    const courseDate = new Date(cours["Date et heure"]);
                    return (courseDate >= new Date(selectedWeek.value.start) &&
                        courseDate <= new Date(selectedWeek.value.end));
                });
            }
            // ✅ Trier par date et heure dans l'ordre chronologique
            filtered.sort((a, b) => new Date(a["Date et heure"]) - new Date(b["Date et heure"]));
            return filtered;
        });
        // ✅ Supprimer les cours d'un élève
        const supprimerCours = async () => {
            if (!selectedStudent.value) {
                alert("❌ Sélectionnez un élève !");
                return;
            }
            const confirmation = confirm(`Voulez-vous vraiment supprimer tous les cours de ${selectedStudent.value} ?`);
            if (!confirmation)
                return;
            deleting.value = true;
            try {
                const jwt = await getValidToken(); // 🔐 Sécurisation
                const requestBody = JSON.stringify({
                    route: "supprimerCoursEleve",
                    prenom: selectedStudent.value,
                });
                const response = await fetch(`${API_URL}?jwt=${encodeURIComponent(jwt)}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: requestBody,
                });
                const result = await response.json();
                if (result.status === "success") {
                    showSuccessMessage(`✅ Les cours de ${selectedStudent.value} ont été supprimés avec succès !`);
                    await fetchCours(true);
                }
                else {
                    alert(`❌ Erreur : ${result.message}`);
                }
            }
            catch (error) {
                console.error("❌ Erreur de suppression :", error);
                alert("❌ Une erreur est survenue.");
            }
            finally {
                deleting.value = false;
            }
        };
        // ✅ Ouvrir la modale d'édition
        const openEditModal = (cours) => {
            editedCours.value = { ...cours };
            // ✅ Sauvegarde la date d'origine pour que l'API puisse retrouver le cours
            editedCours.value.AncienneDate = cours["Date et heure"];
            // ✅ Vérifie et reformate la date pour l'input datetime-local
            if (editedCours.value["Date et heure"]) {
                const dateObj = new Date(editedCours.value["Date et heure"]);
                if (!isNaN(dateObj.getTime())) {
                    const year = dateObj.getFullYear();
                    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
                    const day = String(dateObj.getDate()).padStart(2, "0");
                    const hours = String(dateObj.getHours()).padStart(2, "0");
                    const minutes = String(dateObj.getMinutes()).padStart(2, "0");
                    editedCours.value["Date et heure"] = `${year}-${month}-${day}T${hours}:${minutes}`;
                }
                else {
                    console.error("❌ Date invalide :", editedCours.value["Date et heure"]);
                    editedCours.value["Date et heure"] = "";
                }
            }
            editModalOpen.value = true;
        };
        // ✅ Fermer la modale d'édition
        const closeEditModal = () => {
            editModalOpen.value = false;
            editedCours.value = {};
        };
        // ✅ Met à jour un cours
        const updateCours = async () => {
            if (!editedCours.value.Prénom || !editedCours.value["Date et heure"]) {
                alert("❌ Tous les champs doivent être remplis !");
                return;
            }
            updating.value = true;
            try {
                const jwt = await getValidToken(); // 🔐 Sécurisation
                const response = await fetch(`${API_URL}?jwt=${encodeURIComponent(jwt)}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        route: "updateCours",
                        cours: {
                            ...editedCours.value,
                            AncienneDate: editedCours.value.AncienneDate
                        },
                    }),
                });
                const result = await response.json();
                if (result.status === "success") {
                    showSuccessMessage("✅ Cours mis à jour avec succès !");
                    await fetchCours(true);
                    closeEditModal();
                }
                else {
                    alert("❌ Erreur : " + result.message);
                }
            }
            catch (error) {
                console.error("❌ Erreur de mise à jour :", error);
                alert("❌ Une erreur est survenue.");
            }
            finally {
                updating.value = false;
            }
        };
        // ✅ Format compact de la date
        const formatCompactDate = (isoDate) => {
            if (!isoDate)
                return "Date invalide";
            const dateObj = new Date(isoDate);
            if (isNaN(dateObj.getTime()))
                return "Date invalide";
            return `${dateObj.getDate().toString().padStart(2, "0")}/${(dateObj.getMonth() + 1)
                .toString()
                .padStart(2, "0")}/${dateObj.getFullYear()} à ${dateObj.getHours()
                .toString()
                .padStart(2, "0")}H${dateObj.getMinutes().toString().padStart(2, "0")}`;
        };
        onMounted(async () => {
            try {
                const jwt = await getValidToken(); // 🔒 Récupère le token sécurisé
                if (!jwt)
                    throw new Error("Utilisateur non connecté");
            }
            catch (error) {
                console.warn("🔐 Redirection forcée vers login");
                router.replace("/login");
                return;
            }
            await fetchCours();
            selectClosestWeek();
        });
        return {
            coursData, loading, deleting, updating, selectedStudent, filterUpcoming, filteredCours,
            supprimerCours, openEditModal, closeEditModal, updateCours, editModalOpen,
            editedCours, formatCompactDate, uniqueStudents, selectedWeek, weeks, successMessage, isPastCourse
        };
    },
});
const __VLS_ctx = {};
const __VLS_componentsOption = { Layout };
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['past-course']} */ ;
/** @type {__VLS_StyleScopedClasses['future-course']} */ ;
/** @type {__VLS_StyleScopedClasses['past-course']} */ ;
/** @type {__VLS_StyleScopedClasses['future-course']} */ ;
/** @type {__VLS_StyleScopedClasses['past-course']} */ ;
/** @type {__VLS_StyleScopedClasses['future-course']} */ ;
/** @type {__VLS_StyleScopedClasses['past-course']} */ ;
/** @type {__VLS_StyleScopedClasses['future-course']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-dialog']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-content']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-row']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-body']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['container-xxl']} */ ;
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.Layout;
/** @type {[typeof __VLS_components.Layout, typeof __VLS_components.Layout, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "container-xxl mt-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: "text-white text-center" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "mb-3 text-center" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "studentSelect",
    ...{ class: "text-white" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.selectedStudent),
    ...{ class: "form-select mt-2" },
    id: "studentSelect",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "",
});
for (const [student] of __VLS_getVForSourceType((__VLS_ctx.uniqueStudents))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (student),
        value: (student),
    });
    (student);
}
if (__VLS_ctx.selectedStudent) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-center mt-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.supprimerCours) },
        ...{ class: "btn btn-danger" },
    });
    (__VLS_ctx.selectedStudent);
}
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
if (!__VLS_ctx.loading && __VLS_ctx.filteredCours.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-warning text-center mt-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "mb-3 d-flex align-items-center gap-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "checkbox",
    id: "filterUpcoming",
    ...{ class: "form-check-input" },
});
(__VLS_ctx.filterUpcoming);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "filterUpcoming",
    ...{ class: "form-check-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "mb-3 text-center" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "weekSelect",
    ...{ class: "text-white" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.selectedWeek),
    ...{ class: "form-select mt-2" },
    id: "weekSelect",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "",
});
for (const [week] of __VLS_getVForSourceType((__VLS_ctx.weeks))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (week.start),
        value: (week),
    });
    (week.label);
}
if (__VLS_ctx.successMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-success text-center mt-3" },
    });
    (__VLS_ctx.successMessage);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "d-flex justify-content-center gap-2 mt-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.goToNextWeek) },
    ...{ class: "btn btn-primary" },
});
if (!__VLS_ctx.loading && __VLS_ctx.filteredCours.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-responsive mt-3" },
    });
    if (!__VLS_ctx.loading && __VLS_ctx.filteredCours.length > 0) {
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            scope: "col",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            scope: "col",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            scope: "col",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            scope: "col",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            scope: "col",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
        for (const [cours, index] of __VLS_getVForSourceType((__VLS_ctx.filteredCours))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                ...{ onClick: (...[$event]) => {
                        if (!(!__VLS_ctx.loading && __VLS_ctx.filteredCours.length > 0))
                            return;
                        if (!(!__VLS_ctx.loading && __VLS_ctx.filteredCours.length > 0))
                            return;
                        __VLS_ctx.openEditModal(cours);
                    } },
                key: (index),
                ...{ class: "clickable-row" },
                ...{ class: ({
                        'past-course': __VLS_ctx.isPastCourse(cours), // ✅ Ajoute la classe past-course si le cours est passé
                        'future-course': !__VLS_ctx.isPastCourse(cours), // ✅ Sinon, future-course
                        'selected-row': __VLS_ctx.editedCours && __VLS_ctx.editedCours.AncienneDate === cours['Date et heure'] // ✅ Surbrillance sur cours sélectionné
                    }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.formatCompactDate(cours['Date et heure']));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (cours.Prénom);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                href: (cours['Lien Google Meet']),
                target: "_blank",
                ...{ class: "btn btn-primary btn-sm" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (cours.Commentaires || "Aucun commentaire");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (cours.Synthèse || "Non renseignée");
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                ...{ onChange: (...[$event]) => {
                        if (!(!__VLS_ctx.loading && __VLS_ctx.filteredCours.length > 0))
                            return;
                        if (!(!__VLS_ctx.loading && __VLS_ctx.filteredCours.length > 0))
                            return;
                        __VLS_ctx.updatePresence(cours, $event.target.checked);
                    } },
                ...{ onClick: () => { } },
                type: "checkbox",
                checked: (Boolean(cours.Présence)),
            });
        }
    }
}
var __VLS_3;
if (__VLS_ctx.editModalOpen) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal show d-block" },
        tabindex: "-1",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-dialog" },
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
    (__VLS_ctx.editedCours.Prénom);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.closeEditModal) },
        type: "button",
        ...{ class: "btn-close" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "datetime-local",
        ...{ class: "form-control" },
    });
    (__VLS_ctx.editedCours['Date et heure']);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label mt-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "url",
        ...{ class: "form-control" },
    });
    (__VLS_ctx.editedCours['Lien Google Meet']);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label mt-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "url",
        ...{ class: "form-control" },
    });
    (__VLS_ctx.editedCours['Lien Replay']);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label mt-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.editedCours.Trimestre),
        ...{ class: "form-select" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "trimestre 1",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "trimestre 2",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "trimestre 3",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label mt-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
        value: (__VLS_ctx.editedCours.Commentaires),
        ...{ class: "form-control" },
        rows: "3",
        placeholder: "Ajouter un commentaire...",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label mt-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
        value: (__VLS_ctx.editedCours.Synthèse),
        ...{ class: "form-control" },
        rows: "3",
        placeholder: "Ajouter une synthèse...",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-footer" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.closeEditModal) },
        ...{ class: "btn btn-secondary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.updateCours) },
        ...{ class: "btn btn-success" },
    });
}
/** @type {__VLS_StyleScopedClasses['container-xxl']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-label']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-success']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['table-responsive']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['table-responsive']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table-hover']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['table-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['clickable-row']} */ ;
/** @type {__VLS_StyleScopedClasses['past-course']} */ ;
/** @type {__VLS_StyleScopedClasses['future-course']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-row']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['modal']} */ ;
/** @type {__VLS_StyleScopedClasses['show']} */ ;
/** @type {__VLS_StyleScopedClasses['d-block']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-dialog']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-content']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-header']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-title']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-close']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-body']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-success']} */ ;
var __VLS_dollars;
let __VLS_self;
