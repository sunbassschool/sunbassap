let tempo = 120;
let subdivision = 1;
let interval = null;

function startInterval() {
  if (interval) clearInterval(interval);
  const intervalMs = (60 / tempo) * 1000 / subdivision;
  interval = setInterval(() => {
    postMessage({ type: "tick", time: Date.now() });
  }, intervalMs);
}

onmessage = (e) => {
  const { command, value } = e.data;

  switch (command) {
    case "start":
      subdivision = value.subdivision || 1;
      startInterval();
      break;

    case "stop":
      if (interval) clearInterval(interval);
      break;

    case "tempo":
      tempo = value;
      startInterval(); // ⬅️ redémarre l'interval avec le nouveau tempo
      break;
  }
};
