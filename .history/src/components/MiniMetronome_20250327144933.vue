<template>
    <!-- Contrôle la visibilité du widget avec showMiniMetronome -->
    <div
  ref="widgetRef"
  class="mini-metronome"
  :class="{ minimized }"
  v-if="showMiniMetronome"
>  <div class="drag-handle" @mousedown="startDrag" @touchstart="startTouch">
    🎵 Clic
  </div>
      <div v-if="!minimized" class="mini-content">
        <div class="beat-circle" :class="{ active: isBeating }"></div>
        <div class="tempo">{{ tempo }} BPM</div>
        <button @click="() => { console.log('Mini toggle clicked'); togglePlay() }">
          <span v-if="!isPlaying">▶️</span>
          <span v-else>⏹️</span>
        </button>
    <!-- Ancien bouton de minimisation -->
<!-- <button class="minimize" @click="minimized = true">–</button> -->

<!-- Nouveau bouton pour fermer -->
<button class="close-widget" @click="closeWidget">❌</button>
      </div>
      <div v-else class="minimized-icon" @click="minimized = false">🎵</div>
    </div>
  </template>
  
  <script setup>
  import { ref, inject, watch, onUnmounted, onMounted } from 'vue'
  
  const tempo = inject('tempo')
  const isPlaying = inject('isPlaying')
  const isBeating = inject('isBeating')
  const togglePlay = inject('togglePlay')
  const stopMetronome = inject('stopMetronome')
  const widgetRef = ref(null)
const offset = ref({ x: 0, y: 0 })
const dragging = ref(false)
  const showMiniMetronome = inject('showMiniMetronome')  // Injecter showMiniMetronome pour le contrôler
  const closeWidget = () => {
  stopMetronome()               // 🛑 Stoppe le son
  showMiniMetronome.value = false // ❌ Cache le widget
}
  const minimized = ref(false)
  const startTouch = (e) => {
  const touch = e.touches[0]
  dragging.value = true
  offset.value = {
    x: touch.clientX - widgetRef.value.getBoundingClientRect().left,
    y: touch.clientY - widgetRef.value.getBoundingClientRect().top,
  }
  widgetRef.value.style.position = 'absolute'

  document.addEventListener('touchmove', onTouchMove)
  document.addEventListener('touchend', stopTouch)
}

const onTouchMove = (e) => {
  if (!dragging.value) return
  const touch = e.touches[0]
  widgetRef.value.style.left = `${touch.clientX - offset.value.x}px`
  widgetRef.value.style.top = `${touch.clientY - offset.value.y}px`
}

const stopTouch = () => {
  dragging.value = false
  applySnap()
  document.removeEventListener('touchmove', onTouchMove)
  document.removeEventListener('touchend', stopTouch)
}
  watch(showMiniMetronome, (val) => {
  console.log("👀 showMiniMetronome changed:", val)
})
onUnmounted(() => {
  console.log("🧨 MiniMetronome UNMOUNTED")
})
const startDrag = (e) => {
  dragging.value = true
  offset.value = {
    x: e.clientX - widgetRef.value.getBoundingClientRect().left,
    y: e.clientY - widgetRef.value.getBoundingClientRect().top,
  }
  widgetRef.value.style.position = 'absolute' // ✅ Important

  document.body.classList.add('noselect')

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (e) => {
  if (!dragging.value) return
  widgetRef.value.style.left = `${e.clientX - offset.value.x}px`
  widgetRef.value.style.top = `${e.clientY - offset.value.y}px`
}

const stopDrag = () => {
  dragging.value = false
  applySnap()
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}
function applySnap() {
  const rect = widgetRef.value.getBoundingClientRect()
  const screenW = window.innerWidth
  const screenH = window.innerHeight
  const margin = 40 // distance max pour snap

  // Snap horizontal
  if (rect.left < margin) {
    widgetRef.value.style.left = '10px'
  } else if (screenW - rect.right < margin) {
    widgetRef.value.style.left = `${screenW - rect.width - 10}px`
  }

  // Snap vertical (si tu veux aussi en haut/bas)
  if (rect.top < margin) {
    widgetRef.value.style.top = '10px'
  } else if (screenH - rect.bottom < margin) {
    widgetRef.value.style.top = `${screenH - rect.height - 10}px`
  }
}

  </script>
  
  <style scoped>
  .noselect {
  user-select: none;
}

.mini-metronome {
  position: absolute; /* 🧠 Plus de position fixe liée au coin */
  left: 30px;
  top: 100px;
  /* ❌ supprime bottom / right complètement */
  cursor: move;
  background: #1a1a1a;
  color: white;
  padding: 10px 14px;
  border-radius: 12px;
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.7);
  display: inline-flex; /* 🪄 fix le comportement flex qui grossissait */
  align-items: center;
  z-index: 9999;
  transition: all 0.3s ease;
  font-family: "Poppins", sans-serif;
}


.mini-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.beat-circle {
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
  transition: background 0.2s ease;
}

.beat-circle.active {
  background: red;
  box-shadow: 0 0 10px red;
}

.tempo {
  font-weight: bold;
  font-size: 14px;
}

button {
  background: none;
  border: none;
  color: white;
  font-size: 16px;
  cursor: pointer;
  transition: transform 0.2s ease;
}

button:hover {
  transform: scale(1.2);
}

.minimized-icon {
  font-size: 22px;
  padding: 8px;
  background: #333;
  border-radius: 50%;
  box-shadow: 0 0 5px rgba(255, 255, 255, 0.2);
}

  </style>
  