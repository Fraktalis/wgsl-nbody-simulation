export function randomParticles(n, width, height) {
  const positions  = new Float32Array(n * 2);
  const velocities = new Float32Array(n * 2);
  const cx = width / 2, cy = height / 2;

  for (let i = 0; i < n; i++) {
    const angle  = Math.random() * Math.PI * 2;
    const radius = Math.random() * Math.min(width, height) * 0.35;
    positions[i * 2]     = cx + Math.cos(angle) * radius;
    positions[i * 2 + 1] = cy + Math.sin(angle) * radius;

    const speed = Math.sqrt(radius) * 0.12;
    velocities[i * 2]     = -Math.sin(angle) * speed;
    velocities[i * 2 + 1] =  Math.cos(angle) * speed;
  }
  return { positions, velocities };
}

export function makeFpsCounter() {
  const buf = new Float64Array(30);
  let idx = 0, filled = 0, last = performance.now();
  return {
    tick() {
      const now = performance.now();
      const dt = now - last; last = now;
      buf[idx % 30] = dt; idx++;
      if (filled < 30) filled++;
      const avg = Array.from(buf.slice(0, filled)).reduce((a, b) => a + b, 0) / filled;
      return { fps: 1000 / avg, ms: avg };
    }
  };
}
