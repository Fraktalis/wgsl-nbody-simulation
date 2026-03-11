import { randomParticles, makeFpsCounter } from './utils.js';
import PHYSICS_SHADER from './shaders/physics.wgsl?raw';
import RENDER_SHADER  from './shaders/render.wgsl?raw';


export class NBodyGPU {

  constructor(canvas) {
    this.canvas         = canvas;
    this.particleCount  = 0;
    this.running        = false;
    this.fpsCounter     = makeFpsCounter();

    this.init().then(() => {
      const initialCount = parseInt(document.getElementById('gpu-n').value);
      this.resize(initialCount);
      this.running = true;
      this.loop();
    });
  }


  // ─── Initialisation WebGPU ────────────────────────────────────────────────

  async init() {
    if (!navigator.gpu) throw new Error('WebGPU non disponible');

    this.adapter = await navigator.gpu.requestAdapter();
    this.device  = await this.adapter.requestDevice();

    this.context      = this.canvas.getContext('webgpu');
    this.canvasFormat = navigator.gpu.getPreferredCanvasFormat();

    this.context.configure({
      device   : this.device,
      format   : this.canvasFormat,
      alphaMode: 'premultiplied',
    });

    this.physicsModule = this.device.createShaderModule({ code: PHYSICS_SHADER });
    this.renderModule  = this.device.createShaderModule({ code: RENDER_SHADER  });

    this._buildPipelines();
  }


  // ─── Création des pipelines ───────────────────────────────────────────────

  _buildPipelines() {
    const device = this.device;

    this.computePipeline = device.createComputePipeline({
      layout : 'auto',
      compute: { module: this.physicsModule, entryPoint: 'main' },
    });

    const additiveBlend = {
      color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
      alpha: { srcFactor: 'one',       dstFactor: 'one', operation: 'add' },
    };

    this.renderPipeline = device.createRenderPipeline({
      layout   : 'auto',
      vertex   : { module: this.renderModule, entryPoint: 'vs_main' },
      fragment : { module: this.renderModule, entryPoint: 'fs_main',
                   targets: [{ format: this.canvasFormat, blend: additiveBlend }] },
      primitive: { topology: 'point-list' },
    });
  }


  // ─── Allocation des buffers de particules ─────────────────────────────────

  resize(particleCount) {
    const device     = this.device;
    this.particleCount = particleCount;

    const bufferSize = particleCount * 4 * 4; // vec4<f32> par particule

    // Génère les positions et vélocités initiales aléatoires
    const { positions, velocities } = randomParticles(particleCount, 400, 400);

    const initialData = new Float32Array(particleCount * 4);
    for (let i = 0; i < particleCount; i++) {
      initialData[i * 4    ] = positions [i * 2    ]; // x
      initialData[i * 4 + 1] = positions [i * 2 + 1]; // y
      initialData[i * 4 + 2] = velocities[i * 2    ]; // vx
      initialData[i * 4 + 3] = velocities[i * 2 + 1]; // vy
    }

    // Double-buffering : on alterne entre bufferA (source) et bufferB (destination)
    const bufferUsage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
    this.particleBufferA = device.createBuffer({ size: bufferSize, usage: bufferUsage });
    this.particleBufferB = device.createBuffer({ size: bufferSize, usage: bufferUsage });

    device.queue.writeBuffer(this.particleBufferA, 0, initialData);
    device.queue.writeBuffer(this.particleBufferB, 0, initialData);

    // Buffer uniforms : particleCount, gravity, softening²
    this.uniformBuffer = device.createBuffer({
      size : 12,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.pingPong = 0; // 0 → A est source, 1 → B est source
    document.getElementById('gpu-count').textContent = particleCount;
  }


  // ─── Mise à jour des paramètres de simulation ─────────────────────────────

  _updateUniforms() {
    const gravity   = parseFloat(document.getElementById('gravity').value) * 500;
    const softening = parseFloat(document.getElementById('eps').value);

    const uniformData = new ArrayBuffer(12);
    new Uint32Array (uniformData, 0, 1)[0] = this.particleCount;
    new Float32Array(uniformData, 4, 1)[0] = gravity;
    new Float32Array(uniformData, 8, 1)[0] = softening * softening; // eps²

    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);
  }


  // ─── Rendu d'une frame ────────────────────────────────────────────────────

  frame() {
    if (!this.device || this.particleCount === 0) return;

    const device = this.device;
    this._updateUniforms();

    // Sélectionne source/destination selon le ping-pong
    const [sourceBuffer, destBuffer] = this.pingPong === 0
      ? [this.particleBufferA, this.particleBufferB]
      : [this.particleBufferB, this.particleBufferA];

    const commandEncoder = device.createCommandEncoder();

    // — Passe de calcul physique (compute shader) —
    {
      const computeBindGroup = device.createBindGroup({
        layout : this.computePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: sourceBuffer      } },
          { binding: 1, resource: { buffer: destBuffer        } },
          { binding: 2, resource: { buffer: this.uniformBuffer } },
        ],
      });

      const computePass = commandEncoder.beginComputePass();
      computePass.setPipeline(this.computePipeline);
      computePass.setBindGroup(0, computeBindGroup);
      computePass.dispatchWorkgroups(Math.ceil(this.particleCount / 64));
      computePass.end();
    }

    // — Passe de rendu (render shader) —
    {
      const renderBindGroup = device.createBindGroup({
        layout : this.renderPipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: destBuffer } }],
      });

      const renderPass = commandEncoder.beginRenderPass({
        colorAttachments: [{
          view      : this.context.getCurrentTexture().createView(),
          loadOp    : 'clear',
          clearValue: { r: 0.04, g: 0.04, b: 0.06, a: 1.0 },
          storeOp   : 'store',
        }],
      });

      renderPass.setPipeline(this.renderPipeline);
      renderPass.setBindGroup(0, renderBindGroup);
      renderPass.draw(this.particleCount);
      renderPass.end();
    }

    device.queue.submit([commandEncoder.finish()]);

    this.pingPong ^= 1; // alterne source et destination
  }


  // ─── Boucle d'animation ───────────────────────────────────────────────────

  loop() {
    if (!this.running) return;

    this.frame();

    const { fps, ms } = this.fpsCounter.tick();
    document.getElementById('gpu-fps').textContent = fps.toFixed(1);
    document.getElementById('gpu-ms').textContent  = ms.toFixed(1);

    requestAnimationFrame(() => this.loop());
  }


  // ─── Nettoyage ────────────────────────────────────────────────────────────

  destroy() {
    this.running = false;
    this.particleBufferA?.destroy();
    this.particleBufferB?.destroy();
    this.uniformBuffer?.destroy();
  }
}
