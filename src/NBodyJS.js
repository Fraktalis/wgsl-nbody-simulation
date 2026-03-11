import { randomParticles, makeFpsCounter } from './utils.js';

export class NBodyJS {

  constructor(canvas, particleCount) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.fpsCounter = makeFpsCounter();
    this.running = true;

    this.resize(particleCount);
    this.loop();
  }

  // ─── Initialisation ────────────────────────────────────────────────────────

  resize(particleCount) {
    this.particleCount = particleCount;

    const { positions, velocities } = randomParticles(
      particleCount,
      this.canvas.width,
      this.canvas.height
    );

    this.positions  = positions;
    this.velocities = velocities;
  }

  // ─── Physique ───────────────────────────────────────────────────────────────

  step(gravity, softeningSquared) {
    const { positions, velocities, particleCount } = this;

    // Calcul des accélérations (loi de gravitation universelle)
    for (let i = 0; i < particleCount; i++) {
      let accelX = 0;
      let accelY = 0;

      const xi = positions[i * 2];
      const yi = positions[i * 2 + 1];

      for (let j = 0; j < particleCount; j++) {
        if (i === j) continue;

        const dx = positions[j * 2]     - xi;
        const dy = positions[j * 2 + 1] - yi;

        const distSquared = dx * dx + dy * dy + softeningSquared;
        const forceFactor = gravity / (distSquared * Math.sqrt(distSquared));

        accelX += dx * forceFactor;
        accelY += dy * forceFactor;
      }

      velocities[i * 2]     += accelX;
      velocities[i * 2 + 1] += accelY;
    }

    // Intégration des positions
    for (let i = 0; i < particleCount; i++) {
      positions[i * 2]     += velocities[i * 2];
      positions[i * 2 + 1] += velocities[i * 2 + 1];
    }
  }

  // ─── Rendu ──────────────────────────────────────────────────────────────────

  draw() {
    const { ctx, positions, particleCount } = this;
    const canvasWidth  = this.canvas.width;
    const canvasHeight = this.canvas.height;

    // Fondu noir pour l'effet de traînée
    ctx.fillStyle = 'rgba(10, 10, 15, 0.25)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Dessin des particules
    ctx.fillStyle = '#f7df1e';

    for (let i = 0; i < particleCount; i++) {
      const x = positions[i * 2];
      const y = positions[i * 2 + 1];

      const isOutOfBounds = x < 0 || x > canvasWidth || y < 0 || y > canvasHeight;
      if (isOutOfBounds) continue;

      ctx.fillRect(x - 1, y - 1, 2, 2);
    }
  }

  // ─── Boucle principale ──────────────────────────────────────────────────────

  loop() {
    if (!this.running) return;

    const gravity    = parseFloat(document.getElementById('gravity').value) * 500;
    const softening  = parseFloat(document.getElementById('eps').value);
    const softeningSquared = softening * softening;

    this.step(gravity, softeningSquared);
    this.draw();

    const { fps, ms } = this.fpsCounter.tick();
    document.getElementById('js-fps').textContent   = fps.toFixed(1);
    document.getElementById('js-ms').textContent    = ms.toFixed(1);
    document.getElementById('js-count').textContent = this.particleCount;

    requestAnimationFrame(() => this.loop());
  }

  destroy() {
    this.running = false;
  }

}
