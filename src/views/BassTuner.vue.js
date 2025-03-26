import Layout from "@/views/Layout.vue";
import { PitchDetector } from "pitchy";
export default (await import('vue')).defineComponent({
    components: { Layout },
    data() {
        return {
            referenceNotes: [
                { name: "B", frequency: 30.87 },
                { name: "E", frequency: 41.20 },
                { name: "A", frequency: 55.00 },
                { name: "D", frequency: 73.42 },
                { name: "G", frequency: 98.00 },
            ],
            audioContext: null,
            analyser: null,
            buffer: new Float32Array(2048),
            detector: null,
            errorMessage: "",
            frequency: 0,
            note: "🎸 Joue une note",
            stream: null,
            barPosition: 50, // Position du curseur
            isPerfectTune: false, // État du curseur
            meterColors: ["#882222", "#AA4444", "#CCAA44", "#44AA44", "#44CC44", "#44AA44", "#CCAA44", "#AA4444", "#882222"], // LED Segments
        };
    },
    methods: {
        playReferenceNote(frequency) {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            // 🛑 Désactiver temporairement le micro pour éviter le Larsen
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.enabled = false);
            }
            // 🎛️ Création des oscillateurs
            const oscillator1 = this.audioContext.createOscillator();
            const gainNode1 = this.audioContext.createGain();
            oscillator1.type = "sine";
            oscillator1.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            const oscillator2 = this.audioContext.createOscillator();
            const gainNode2 = this.audioContext.createGain();
            oscillator2.type = "sine";
            oscillator2.frequency.setValueAtTime(frequency * 2, this.audioContext.currentTime); // Octave +1
            // 🔊 Réglage du volume
            gainNode1.gain.setValueAtTime(1.5, this.audioContext.currentTime); // Normalement 0.4 → Maintenant 1.5
            gainNode1.gain.linearRampToValueAtTime(0.4, this.audioContext.currentTime + 0.1);
            gainNode2.gain.setValueAtTime(0.8, this.audioContext.currentTime); // Normalement 0.2 → Maintenant 0.8
            gainNode2.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.1);
            // 🔗 Connexions
            oscillator1.connect(gainNode1);
            gainNode1.connect(this.audioContext.destination);
            oscillator2.connect(gainNode2);
            gainNode2.connect(this.audioContext.destination);
            // 🎵 Démarrer les oscillateurs
            oscillator1.start();
            oscillator2.start();
            this.currentOscillator = oscillator1;
            this.currentOscillator2 = oscillator2;
            // ⏳ Arrêter après 1,5 secondes et réactiver le micro
            setTimeout(() => {
                oscillator1.stop();
                oscillator2.stop();
                this.currentOscillator = null;
                this.currentOscillator2 = null;
                // ✅ Réactiver le micro
                if (this.stream) {
                    this.stream.getTracks().forEach(track => track.enabled = true);
                }
            }, 1500);
        },
        async startTuner() {
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error("Votre navigateur ne supporte pas l'accès au micro.");
                }
                this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const source = this.audioContext.createMediaStreamSource(this.stream);
                this.analyser = this.audioContext.createAnalyser();
                this.analyser.fftSize = 2048;
                source.connect(this.analyser);
                this.detector = PitchDetector.forFloat32Array(this.analyser.fftSize);
                this.errorMessage = "";
                this.detectPitch();
            }
            catch (error) {
                this.errorMessage = "Erreur d'accès au micro : " + error.message;
                console.error("🚨 Erreur :", error);
            }
        },
        detectPitch() {
            if (!this.analyser || !this.detector)
                return;
            this.analyser.getFloatTimeDomainData(this.buffer);
            const [pitch, clarity] = this.detector.findPitch(this.buffer, this.audioContext.sampleRate);
            if (clarity > 0.9) {
                this.frequency = pitch.toFixed(2);
                this.updateTuner(pitch);
            }
            requestAnimationFrame(() => this.detectPitch());
        },
        updateTuner(freq) {
            const notes = [
                { name: "B", frequency: 30.87 },
                { name: "E", frequency: 41.20 },
                { name: "A", frequency: 55.00 },
                { name: "D", frequency: 73.42 },
                { name: "G", frequency: 98.00 },
            ];
            let closestNote = notes.reduce((prev, curr) => Math.abs(curr.frequency - freq) < Math.abs(prev.frequency - freq) ? curr : prev);
            this.note = closestNote.name;
            const deviation = freq - closestNote.frequency;
            const maxDeviation = 5;
            this.barPosition = 50 + (deviation / maxDeviation) * 50;
            this.barPosition = Math.min(100, Math.max(0, this.barPosition));
            // 🎯 Si la note est parfaitement accordée, le curseur devient vert
            this.isPerfectTune = Math.abs(deviation) < 0.5;
        },
        getGlow(color) {
            if (color === "green")
                return "0px 0px 10px lime";
            if (color === "yellow")
                return "0px 0px 8px gold";
            if (color === "red")
                return "0px 0px 8px red";
            return "none";
        },
        stopTuner() {
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }
            if (this.audioContext) {
                this.audioContext.close();
            }
        },
    },
    mounted() {
        this.startTuner(); // 🚀 Démarrer l’accordeur automatiquement
    },
    beforeUnmount() {
        this.stopTuner(); // 🔴 Arrêter proprement
    },
});
const __VLS_ctx = {};
const __VLS_componentsOption = { Layout };
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['reference-message']} */ ;
/** @type {__VLS_StyleScopedClasses['note-button']} */ ;
/** @type {__VLS_StyleScopedClasses['center-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['marker']} */ ;
/** @type {__VLS_StyleScopedClasses['marker']} */ ;
/** @type {__VLS_StyleScopedClasses['bar-container']} */ ;
/** @type {__VLS_StyleScopedClasses['marker']} */ ;
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
    ...{ class: "tuner-container" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "note-display" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "note" },
});
(__VLS_ctx.note);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tuning-meter" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "bar-frame" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "bar-container" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "center-icon" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
    d: "M12 16L6 10h12z",
    fill: "white",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "center-marker" },
});
for (const [color, index] of __VLS_getVForSourceType((__VLS_ctx.meterColors))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (index),
        ...{ class: "meter-segment" },
        ...{ style: ({ backgroundColor: color, boxShadow: __VLS_ctx.getGlow(color) }) },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "marker" },
    ...{ style: ({
            left: `${__VLS_ctx.barPosition}%`,
            backgroundColor: __VLS_ctx.isPerfectTune ? 'lime' : 'white',
            boxShadow: __VLS_ctx.isPerfectTune ? '0px 0px 15px lime' : '0px 0px 10px white'
        }) },
});
if (__VLS_ctx.errorMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "error" },
    });
    (__VLS_ctx.errorMessage);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "reference-message" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "reference-notes" },
});
for (const [note] of __VLS_getVForSourceType((__VLS_ctx.referenceNotes))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.playReferenceNote(note.frequency);
            } },
        key: (note.name),
        ...{ class: "note-button" },
    });
    (note.name);
}
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['tuner-container']} */ ;
/** @type {__VLS_StyleScopedClasses['note-display']} */ ;
/** @type {__VLS_StyleScopedClasses['note']} */ ;
/** @type {__VLS_StyleScopedClasses['tuning-meter']} */ ;
/** @type {__VLS_StyleScopedClasses['bar-frame']} */ ;
/** @type {__VLS_StyleScopedClasses['bar-container']} */ ;
/** @type {__VLS_StyleScopedClasses['center-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['center-marker']} */ ;
/** @type {__VLS_StyleScopedClasses['meter-segment']} */ ;
/** @type {__VLS_StyleScopedClasses['marker']} */ ;
/** @type {__VLS_StyleScopedClasses['error']} */ ;
/** @type {__VLS_StyleScopedClasses['reference-message']} */ ;
/** @type {__VLS_StyleScopedClasses['reference-notes']} */ ;
/** @type {__VLS_StyleScopedClasses['note-button']} */ ;
var __VLS_dollars;
let __VLS_self;
