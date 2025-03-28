// src/stores/metronome.js
import { defineStore } from 'pinia';

export const useMetronomeStore = defineStore('metronome', {
  state: () => ({
    audioContext: null,
    isPlaying: false,
    nextNoteTime: 0,
    interval: null,
    tempo: 120,
    subdivision: 1,
    currentBeat: 1,
    currentSubdivision: 1,
    measure: 4,
    swingAmount: 0,
    soundBuffers: {
      strong: null,
      weak: null,
      sub: null,
    },
    volumeStrong: 0.5,
    volumeWeak: 0.5,
    volumeSub: 0.5,
  }),
  actions: {
    initAudioContext() {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log("🔊 AudioContext initialisé (store)");
      }
    },
    async loadSounds() {
      const baseUrl = import.meta.env.MODE === "development" ? "/" : "/app/";
      const soundUrls = {
        strong: `${baseUrl}assets/audio/strong-beat.wav`,
        weak: `${baseUrl}assets/audio/weak-beat.wav`,
        sub: `${baseUrl}assets/audio/subdivision.wav`
      };

      const promises = Object.entries(soundUrls).map(async ([key, url]) => {
        const res = await fetch(url);
        const buffer = await res.arrayBuffer();
        this.soundBuffers[key] = await this.audioContext.decodeAudioData(buffer);
      });

      await Promise.all(promises);
      console.log("🎵 Sons chargés dans le store");
    },
    start() {
      this.initAudioContext();
      this.isPlaying = true;
      this.nextNoteTime = this.audioContext.currentTime + 0.1;

      this.scheduleBeats();
    },
    stop() {
      this.isPlaying = false;
      clearInterval(this.interval);
      this.currentBeat = 1;
      this.currentSubdivision = 1;
    },
    scheduleBeats() {
      this.interval = setInterval(async () => {
        const now = this.audioContext.currentTime;
        while (this.nextNoteTime < now + 0.1) {
          await this.playClick(this.nextNoteTime);

          const beatInterval = 60 / this.tempo;
          const subInterval = beatInterval / this.subdivision;

          let swingOffset = 0;
          if (this.subdivision === 2 || this.subdivision === 4) {
            swingOffset = (this.currentSubdivision % 2 === 1 ? 1 : -1) * (this.swingAmount * subInterval) / 3;
          }

          this.nextNoteTime += subInterval + swingOffset;

          this.currentSubdivision++;
          if (this.currentSubdivision > this.subdivision) {
            this.currentSubdivision = 1;
            this.currentBeat = (this.currentBeat % this.measure) + 1;
          }
        }
      }, 25);
    },
    async playClick(time) {
      let buffer = null;
      let volume = 0;

      if (this.currentSubdivision === 1) {
        buffer = this.currentBeat === 1 ? this.soundBuffers.strong : this.soundBuffers.weak;
        volume = this.currentBeat === 1 ? this.volumeStrong : this.volumeWeak;
      } else {
        buffer = this.soundBuffers.sub;
        volume = this.volumeSub;
      }

      if (buffer) {
        const gain = this.audioContext.createGain();
        gain.gain.value = volume;

        const src = this.audioContext.createBufferSource();
        src.buffer = buffer;
        src.connect(gain);
        gain.connect(this.audioContext.destination);
        src.start(time);
      }
    }
  }
});
