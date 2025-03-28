// metronomeWorker.js

let tempo = 120;
let interval = null;

onmessage = (e) => {
  const { command, value } = e.data;

  if (command === "start") {
    if (interval) clearInterval(interval);
    const intervalMs = (60 / tempo) * 1000 / value.subdivision;

    interval = setInterval(() => {
      postMessage({ type: "tick", time: Date.now() });
    }, intervalMs);
  }

  if (command === "stop") {
    if (interval) clearInterval(interval);
  }

  if (command === "tempo") {
    tempo = value;
  }
};
