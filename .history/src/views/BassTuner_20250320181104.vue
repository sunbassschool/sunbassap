<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import pitchy from "pitchy"; // ✅ Import par défaut

const note = ref("🎸 Écoute...");
const frequency = ref(null);
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let analyser, detector, stream;

// 🎤 Accès au micro et configuration du pitch détecteur
async function startTuner() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        source.connect(analyser);

        // Création du détecteur de fréquence
        detector = pitchy.createPitchDetector(audioContext.sampleRate); // ✅ Correction ici
        listenToPitch();
    } catch (err) {
        console.error("Erreur d'accès au micro : ", err);
    }
}

// 🎵 Détection de la note jouée
function listenToPitch() {
    const buffer = new Float32Array(1024);

    function updatePitch() {
        analyser.getFloatTimeDomainData(buffer);
        const [pitch, clarity] = detector.findPitch(buffer);

        if (clarity > 0.9) {
            frequency.value = pitch.toFixed(2);
            note.value = matchNote(pitch);
        }

        requestAnimationFrame(updatePitch);
    }

    updatePitch();
}

// 🎼 Associer fréquence à une note de basse
function matchNote(freq) {
    const basseNotes = [
        { name: "E (Mi)", freq: 41.20 },
        { name: "A (La)", freq: 55.00 },
        { name: "D (Ré)", freq: 73.42 },
        { name: "G (Sol)", freq: 98.00 },
    ];

    let closest = basseNotes.reduce((prev, curr) =>
        Math.abs(curr.freq - freq) < Math.abs(prev.freq - freq) ? curr : prev
    );

    return closest.name;
}

// 🎧 Démarrer l'accordeur au montage du composant
onMounted(() => {
    startTuner();
});

// 🛑 Nettoyer les ressources audio quand on quitte la page
onUnmounted(() => {
    stream?.getTracks().forEach(track => track.stop());
    audioContext.close();
});
</script>

<template>
    <div class="tuner">
        <h1>Accordeur de Basse 🎸</h1>
        <p>Fréquence : <strong>{{ frequency ? frequency + " Hz" : "Écoute..." }}</strong></p>
        <p>Note détectée : <strong>{{ note }}</strong></p>
    </div>
</template>

<style scoped>
.tuner {
    text-align: center;
    font-family: Arial, sans-serif;
}
</style>
