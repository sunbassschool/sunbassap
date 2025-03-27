import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useMetronomeStore = defineStore('metronome', () => {
  const isPlaying = ref(false);
  const tempo = ref(120);
  const isBeating = ref(false);

  const startMetronome = () => {
    isPlaying.value = true;
  };

  const stopMetronome = () => {
    isPlaying.value = false;
  };

  return {
    isPlaying,
    tempo,
    isBeating,
    startMetronome,
    stopMetronome
  };
});
