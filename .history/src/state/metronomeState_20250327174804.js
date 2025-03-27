// src/state/metronomeState.js
import { ref } from 'vue'

export const isMetronomeActive = ref(false)  // Contrôle l'affichage du mini
export const metronomeStatus = {
  tempo: ref(120),
  beat: ref(1),
  isBeating: ref(false),
  isPlaying: ref(false)
}
