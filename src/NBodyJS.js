import { randomParticles, makeFpsCounter } from './utils.js';

export class NBodyJS {
  constructor(canvas, n) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.fps     = makeFpsCounter();
    this.running = true;
    this.resize(n);
    this.loop();
  }

  resize(n) {
    this.n = n;
    const { positions, velocities } = randomParticles(n, this.canvas.width, this.canvas.height);
    this.pos = positions;
    this.vel = velocities;
  }

  step(G, eps2) {
    const { pos, vel, n } = this;

    for (let i = 0; i < n; i++) {
      let ax = 0, ay = 0;
      const ix = pos[i * 2], iy = pos[i * 2 + 1];

      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const dx = pos[j * 2] - ix;
        const dy = pos[j * 2 + 1] - iy;
        const dist2 = dx * dx + dy * dy + eps2;
        const inv   = G / (dist2 * Math.sqrt(dist2));
        ax += dx * inv;
        ay += dy * inv;
      }

      vel[i * 2]     += ax;
      vel[i * 2 + 1] += ay;
    }

    for (let i = 0; i < n; i++) {
      pos[i * 2]     += vel[i * 2];
      pos[i * 2 + 1] += vel[i * 2 + 1];
    }
  }

  draw() {
    const { ctx, pos, n } = this;
    const W = this.canvas.width, H = this.canvas.height;

    ctx.fillStyle = 'rgba(10, 10, 15, 0.25)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#f7df1e';
    for (let i = 0; i < n; i++) {
      const x = pos[i * 2], y = pos[i * 2 + 1];
      if (x < 0 || x > W || y < 0 || y > H) continue;
      ctx.fillRect(x - 1, y - 1, 2, 2);
    }
  }

  loop() {
    if (!this.running) return;

    const G    = parseFloat(document.getElementById('gravity').value) * 500;
    const eps  = parseFloat(document.getElementById('eps').value);
    const eps2 = eps * eps;

    this.step(G, eps2);
    this.draw();

    const { fps, ms } = this.fps.tick();
    document.getElementById('js-fps').textContent   = fps.toFixed(1);
    document.getElementById('js-ms').textContent    = ms.toFixed(1);
    document.getElementById('js-count').textContent = this.n;

    requestAnimationFrame(() => this.loop());
  }

  destroy() { this.running = false; }
}
