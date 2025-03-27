<script setup>
import { computed } from 'vue'
import { metronomeStatus, isMetronomeActive } from '@/state/metronomeState'

const visible = isMetronomeActive
const tempo = computed(() => metronomeStatus.tempo.value)
const beat = computed(() => metronomeStatus.beat.value)
const isBeating = computed(() => metronomeStatus.isBeating.value)
</script>

<template>
  <div v-if="visible" class="mini-metronome">
    <div class="beat-circle" :class="{ beat: isBeating }">{{ beat }}</div>
    <p>{{ tempo }} BPM</p>
  </div>
</template>

<style scoped>
.mini-metronome {
  position: fixed;
  bottom: 110px;
  right: 20px;
  background: black;
  color: white;
  padding: 15px 20px;
  border-radius: 10px;
  box-shadow: 0 0 10px #ff4a00;
  z-index: 9999;
}

.beat-circle {
  font-size: 2rem;
  font-weight: bold;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: white;
  color: black;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 10px;
}

.beat {
  animation: pulse 0.2s ease;
}

@keyframes pulse {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.3); }
  100% { transform: scale(1); }
}
</style>
