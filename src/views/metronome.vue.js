import Layout from "@/views/Layout.vue";
const baseUrl = import.meta.env.MODE === "development" ? "/" : "/app/";
export default (await import('vue')).defineComponent({
    components: { Layout },
    data() {
        return {
            tempo: 120,
            measure: 4,
            subdivision: 1,
            swingAmount: parseFloat(localStorage.getItem("swingAmount") || "0"),
            isWakeLockActive: false,
            disableStrongBeat: localStorage.getItem("disableStrongBeat") === "true",
            isEditingTempo: false,
            wakeLock: null,
            isPlaying: false,
            elapsedTime: 0,
            audioContext: null,
            nextNoteTime: 0.0,
            currentBeat: 1,
            currentSubdivision: 0,
            isBeating: false,
            interval: null,
            soundBuffers: { strong: null, weak: null, sub: null },
            volumeStrong: parseFloat(localStorage.getItem("volumeStrong") || "1"),
            volumeWeak: parseFloat(localStorage.getItem("volumeWeak") || "0.7"),
            volumeSub: parseFloat(localStorage.getItem("volumeSub") || "0.5"),
            timerColor: "white",
            timerInterval: null,
            // ✅ Ajout des subdivisions ici !
            subdivisions: [
                { value: 1, label: '', icon: `${baseUrl}assets/icons/quarter-note.png` },
                { value: 2, label: '', icon: `${baseUrl}assets/icons/eighth-note.png` },
                { value: 3, label: '', icon: `${baseUrl}assets/icons/triplet.png` },
                { value: 4, label: '', icon: `${baseUrl}assets/icons/sixteenth-note.png` }
            ]
        };
    },
    computed: {
        formattedTime() {
            const minutes = Math.floor(this.elapsedTime / 60);
            const seconds = this.elapsedTime % 60;
            return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        },
        swingLabel() {
            const val = this.swingAmount;
            if (val < 0.2)
                return "Très léger (presque droit)";
            if (val < 0.4)
                return "Léger swing (subtil)";
            if (val < 0.6)
                return "Modéré (groove classique)";
            if (val < 0.8)
                return "Marqué (groove funky)";
            return "Fort swing (shuffle très prononcé)";
        },
        getSwingLedColor() {
            const val = this.swingAmount;
            if (val < 0.3)
                return 'led-green';
            if (val < 0.6)
                return 'led-orange';
            return 'led-red';
        },
    },
    methods: {
        initAudioContext() {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log("🔊 AudioContext initialisé !");
            }
        },
        getSliderGradient(value) {
            const percent = Math.round(value * 100);
            const red = Math.round(255 * value);
            const green = Math.round(200 - 100 * value);
            const color = `rgb(${red}, ${green}, 80)`;
            return `linear-gradient(to right, ${color} ${percent}%, #555 ${percent}%)`;
        },
        async resumeAudioContext() {
            if (this.audioContext && this.audioContext.state === "suspended") {
                await this.audioContext.resume();
                console.log("🔊 AudioContext repris !");
            }
        },
        selectSubdivision(value) {
            this.subdivision = value;
        },
        async loadSounds() {
            const soundUrls = {
                strong: `${baseUrl}assets/audio/strong-beat.wav`,
                weak: `${baseUrl}assets/audio/weak-beat.wav`,
                sub: `${baseUrl}assets/audio/subdivision.wav`
            };
            const soundPromises = Object.entries(soundUrls).map(async ([key, url]) => {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                this.soundBuffers[key] = await this.audioContext.decodeAudioData(arrayBuffer);
            });
            await Promise.all(soundPromises);
            console.log("🎵 Tous les sons sont chargés !");
        },
        async requestWakeLock() {
            if ("wakeLock" in navigator && document.visibilityState === "visible") {
                try {
                    this.wakeLock = await navigator.wakeLock.request("screen");
                    this.isWakeLockActive = true;
                    this.wakeLock.addEventListener("release", () => {
                        this.isWakeLockActive = false;
                        console.log("🔓 Wake Lock relâché");
                    });
                    console.log("🔒 Wake Lock activé !");
                }
                catch (err) {
                    console.error("❌ Impossible d'activer le Wake Lock :", err);
                    this.isWakeLockActive = false;
                }
            }
        },
        startMetronome() {
            if (this.isPlaying)
                return;
            this.initAudioContext();
            this.resumeAudioContext();
            this.isPlaying = true;
            sessionStorage.setItem("isPlaying", "true"); // ✅ Sauvegarde de l'état
            this.nextNoteTime = this.audioContext.currentTime;
            this.startTimer();
            this.scheduleNextBeat();
        },
        stopMetronome() {
            this.isPlaying = false;
            sessionStorage.setItem("isPlaying", "false"); // ✅ Sauvegarde de l'état
            this.nextNoteTime = 0;
            cancelAnimationFrame(this.interval);
            clearInterval(this.timerInterval);
            this.elapsedTime = 0;
        },
        scheduleNextBeat() {
            if (!this.isPlaying)
                return;
            const now = this.audioContext.currentTime;
            while (this.nextNoteTime < now + 0.1) {
                this.playClick();
                let beatInterval = 60.0 / this.tempo; // Temps entre chaque temps fort
                let subdivisionInterval = beatInterval / this.subdivision; // Temps entre subdivisions
                let swingOffset = 0;
                // 🔥 Appliquer le swing uniquement si subdivision = 2 (croches) ou 4 (double-croches)
                if (this.subdivision === 2 || this.subdivision === 4) {
                    if (this.currentSubdivision % 2 === 1) {
                        // Première croche → allongée (2/3 du temps normal)
                        swingOffset = (this.swingAmount * subdivisionInterval) / 3;
                    }
                    else {
                        // Deuxième croche → raccourcie (1/3 du temps normal)
                        swingOffset = -(this.swingAmount * subdivisionInterval) / 3;
                    }
                }
                // ✅ Appliquer le swing uniquement aux subdivisions
                this.nextNoteTime += subdivisionInterval + swingOffset;
            }
            this.interval = requestAnimationFrame(this.scheduleNextBeat);
        },
        playClick() {
            this.currentSubdivision++;
            if (this.currentSubdivision > this.subdivision) {
                this.currentSubdivision = 1;
                this.currentBeat = (this.currentBeat % this.measure) + 1;
            }
            let soundBuffer;
            let volume;
            if (this.currentSubdivision === 1) {
                if (this.currentBeat === 1 && !this.disableStrongBeat) {
                    soundBuffer = this.soundBuffers.strong;
                    volume = this.volumeStrong;
                }
                else {
                    soundBuffer = this.soundBuffers.weak;
                    volume = this.volumeWeak;
                }
            }
            else {
                soundBuffer = this.soundBuffers.sub;
                volume = this.volumeSub;
            }
            if (soundBuffer)
                this.playSound(soundBuffer, this.nextNoteTime, volume);
            this.isBeating = true;
            setTimeout(() => this.isBeating = false, 100);
        },
        playSound(buffer, time, volumeLevel) {
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = volumeLevel * 2; // 🔥 Augmentation du gain (multiplier par 2)
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            source.start(time);
        },
        startTimer() {
            this.elapsedTime = 0;
            this.timerInterval = setInterval(() => {
                this.elapsedTime++;
            }, 1000);
        },
        increaseTempo() {
            if (this.tempo < 300) {
                this.tempo++;
            }
        },
        decreaseTempo() {
            if (this.tempo > 20) {
                this.tempo--;
            }
        },
        resetTimer() {
            this.elapsedTime = 0;
            this.timerColor = "white";
        },
    },
    watch: {
        disableStrongBeat(val) {
            localStorage.setItem("disableStrongBeat", val);
        },
        tempo(newVal, oldVal) {
            if (this.isPlaying) {
                // 🔁 Recalage du métronome avec le nouveau tempo
                cancelAnimationFrame(this.interval);
                this.nextNoteTime = this.audioContext.currentTime;
                this.scheduleNextBeat();
            }
        },
        swingAmount(val) {
            const parsed = parseFloat(val);
            this.swingAmount = isNaN(parsed) ? 0 : parsed;
            localStorage.setItem("swingAmount", this.swingAmount);
        },
        volumeStrong(val) {
            this.volumeStrong = parseFloat(val);
            localStorage.setItem("volumeStrong", this.volumeStrong);
        },
        volumeWeak(val) {
            this.volumeWeak = parseFloat(val);
            localStorage.setItem("volumeWeak", this.volumeWeak);
        },
        volumeSub(val) {
            this.volumeSub = parseFloat(val);
            localStorage.setItem("volumeSub", this.volumeSub);
        },
        isPlaying(newVal) {
            sessionStorage.setItem("isPlaying", newVal ? "true" : "false");
            this.$forceUpdate();
        }
    },
    async mounted() {
        document.body.style.overflow = "hidden";
        this.initAudioContext();
        await this.loadSounds();
        document.addEventListener('visibilitychange', async () => {
            if (document.visibilityState === 'visible') {
                await this.requestWakeLock();
            }
        });
        await this.requestWakeLock(); // 🆕 Lancer une première fois au démarrage
    },
    beforeUnmount() {
        this.stopMetronome();
        document.body.style.overflow = ""; // 🔓 Rétablit le scroll
    }
});
const __VLS_ctx = {};
const __VLS_componentsOption = { Layout };
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['tooltip-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['control-groupe']} */ ;
/** @type {__VLS_StyleScopedClasses['control-groupe']} */ ;
/** @type {__VLS_StyleScopedClasses['control-groupe']} */ ;
/** @type {__VLS_StyleScopedClasses['control-groupe']} */ ;
/** @type {__VLS_StyleScopedClasses['wake-lock-status']} */ ;
/** @type {__VLS_StyleScopedClasses['reset-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['reset-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['reset-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['reset-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['slider-group']} */ ;
/** @type {__VLS_StyleScopedClasses['slider-group']} */ ;
/** @type {__VLS_StyleScopedClasses['slider-group']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['control-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['control-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['control-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['control-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['control-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['stop-button']} */ ;
/** @type {__VLS_StyleScopedClasses['stop-button']} */ ;
/** @type {__VLS_StyleScopedClasses['stop-button']} */ ;
/** @type {__VLS_StyleScopedClasses['control-group']} */ ;
/** @type {__VLS_StyleScopedClasses['subdivision-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['subdivision-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['subdivision-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['control-group']} */ ;
/** @type {__VLS_StyleScopedClasses['tempo-control']} */ ;
/** @type {__VLS_StyleScopedClasses['control-group']} */ ;
/** @type {__VLS_StyleScopedClasses['tempo-control']} */ ;
/** @type {__VLS_StyleScopedClasses['control-group']} */ ;
/** @type {__VLS_StyleScopedClasses['control-group']} */ ;
/** @type {__VLS_StyleScopedClasses['control-group']} */ ;
/** @type {__VLS_StyleScopedClasses['control-group']} */ ;
/** @type {__VLS_StyleScopedClasses['control-group']} */ ;
/** @type {__VLS_StyleScopedClasses['control-group']} */ ;
/** @type {__VLS_StyleScopedClasses['beat']} */ ;
/** @type {__VLS_StyleScopedClasses['editable-bpm']} */ ;
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
    ...{ class: "metronome-container pulsing-bg" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "control-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "control-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
if (!__VLS_ctx.isEditingTempo) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ onClick: (...[$event]) => {
                if (!(!__VLS_ctx.isEditingTempo))
                    return;
                __VLS_ctx.isEditingTempo = true;
            } },
        ...{ class: "editable-bpm" },
    });
    (__VLS_ctx.tempo);
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onBlur: (...[$event]) => {
                if (!!(!__VLS_ctx.isEditingTempo))
                    return;
                __VLS_ctx.isEditingTempo = false;
            } },
        ...{ onKeyup: (...[$event]) => {
                if (!!(!__VLS_ctx.isEditingTempo))
                    return;
                __VLS_ctx.isEditingTempo = false;
            } },
        type: "number",
        min: "20",
        max: "300",
        ...{ class: "bpm-input" },
    });
    (__VLS_ctx.tempo);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tempo-control" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.decreaseTempo) },
    ...{ class: "tempo-arrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
    type: "range",
    min: "20",
    max: "300",
    step: "1",
});
(__VLS_ctx.tempo);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.increaseTempo) },
    ...{ class: "tempo-arrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "control-buttons" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "visualizer" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: ({ beat: __VLS_ctx.isBeating }) },
    ...{ style: ({ backgroundColor: __VLS_ctx.currentBeat === 1 ? 'darkred' : 'white' }) },
    id: "beatCircle",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "beat-number" },
});
(__VLS_ctx.currentBeat);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "controls" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.startMetronome) },
    ...{ class: "control-icon" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
    xmlns: "http://www.w3.org/2000/svg",
    width: "24",
    height: "24",
    viewBox: "0 0 24 24",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
    d: "M8 5v14l11-7z",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.stopMetronome) },
    ...{ class: "control-icon stop-button" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
    xmlns: "http://www.w3.org/2000/svg",
    width: "24",
    height: "24",
    viewBox: "0 0 24 24",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
    d: "M6 6h12v12H6z",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "control-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.measure),
});
for (const [num] of __VLS_getVForSourceType(([2, 3, 4, 5, 6, 7, 8]))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (num),
        value: (num),
    });
    (num);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "timer" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ style: ({ color: __VLS_ctx.timerColor }) },
});
(__VLS_ctx.formattedTime);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.resetTimer) },
    ...{ class: "reset-icon" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
    xmlns: "http://www.w3.org/2000/svg",
    width: "24",
    height: "24",
    viewBox: "0 0 24 24",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
    d: "M12 4V1L8 5l4 4V7c4 0 7 3 7 7s-3 7-7 7-7-3-7-7h2a5 5 0 1 0 5-5z",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "slider-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "swing-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "swing-value" },
});
(Math.round(__VLS_ctx.swingAmount * 100));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "swing-led" },
    ...{ class: (__VLS_ctx.getSwingLedColor) },
    title: (__VLS_ctx.swingLabel),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
    type: "range",
    min: "0",
    max: "1",
    step: "0.05",
    ...{ style: ({ background: __VLS_ctx.getSliderGradient(__VLS_ctx.swingAmount) }) },
});
(__VLS_ctx.swingAmount);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "metronome-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "control-container" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "control-column" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "control-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "subdivision-icons" },
});
for (const [sub, index] of __VLS_getVForSourceType((__VLS_ctx.subdivisions))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.selectSubdivision(sub.value);
            } },
        key: (index),
        ...{ class: "subdivision-icon" },
        ...{ class: ({ selected: __VLS_ctx.subdivision === sub.value }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
        src: (sub.icon),
        alt: (sub.label),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (sub.label);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "mixing-column" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "slider-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "control-groupe" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "checkbox",
});
(__VLS_ctx.disableStrongBeat);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "tooltip-icon" },
    title: "Accentuer le 1er temps de chaque mesure",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
    type: "range",
    min: "0",
    max: "1",
    step: "0.01",
    ...{ style: ({ background: __VLS_ctx.getSliderGradient(__VLS_ctx.volumeStrong) }) },
});
(__VLS_ctx.volumeStrong);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "slider-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
    type: "range",
    min: "0",
    max: "1",
    step: "0.01",
    ...{ style: ({ background: __VLS_ctx.getSliderGradient(__VLS_ctx.volumeWeak) }) },
});
(__VLS_ctx.volumeWeak);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "slider-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
    type: "range",
    min: "0",
    max: "1",
    step: "0.01",
    ...{ style: ({ background: __VLS_ctx.getSliderGradient(__VLS_ctx.volumeSub) }) },
});
(__VLS_ctx.volumeSub);
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['metronome-container']} */ ;
/** @type {__VLS_StyleScopedClasses['pulsing-bg']} */ ;
/** @type {__VLS_StyleScopedClasses['control-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['control-group']} */ ;
/** @type {__VLS_StyleScopedClasses['editable-bpm']} */ ;
/** @type {__VLS_StyleScopedClasses['bpm-input']} */ ;
/** @type {__VLS_StyleScopedClasses['tempo-control']} */ ;
/** @type {__VLS_StyleScopedClasses['tempo-arrow']} */ ;
/** @type {__VLS_StyleScopedClasses['tempo-arrow']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['control-buttons']} */ ;
/** @type {__VLS_StyleScopedClasses['visualizer']} */ ;
/** @type {__VLS_StyleScopedClasses['beat']} */ ;
/** @type {__VLS_StyleScopedClasses['beat-number']} */ ;
/** @type {__VLS_StyleScopedClasses['controls']} */ ;
/** @type {__VLS_StyleScopedClasses['control-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['control-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['stop-button']} */ ;
/** @type {__VLS_StyleScopedClasses['control-group']} */ ;
/** @type {__VLS_StyleScopedClasses['timer']} */ ;
/** @type {__VLS_StyleScopedClasses['reset-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['slider-group']} */ ;
/** @type {__VLS_StyleScopedClasses['swing-label']} */ ;
/** @type {__VLS_StyleScopedClasses['swing-value']} */ ;
/** @type {__VLS_StyleScopedClasses['swing-led']} */ ;
/** @type {__VLS_StyleScopedClasses['metronome-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['control-container']} */ ;
/** @type {__VLS_StyleScopedClasses['control-column']} */ ;
/** @type {__VLS_StyleScopedClasses['control-group']} */ ;
/** @type {__VLS_StyleScopedClasses['subdivision-icons']} */ ;
/** @type {__VLS_StyleScopedClasses['subdivision-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['selected']} */ ;
/** @type {__VLS_StyleScopedClasses['mixing-column']} */ ;
/** @type {__VLS_StyleScopedClasses['slider-group']} */ ;
/** @type {__VLS_StyleScopedClasses['control-groupe']} */ ;
/** @type {__VLS_StyleScopedClasses['tooltip-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['slider-group']} */ ;
/** @type {__VLS_StyleScopedClasses['slider-group']} */ ;
var __VLS_dollars;
let __VLS_self;
