import { randomParticles, makeFpsCounter } from './utils.js';
import PHYSICS_SHADER from './shaders/physics.wgsl?raw';
import RENDER_SHADER  from './shaders/render.wgsl?raw';

export class NBodyGPU {
  constructor(canvas) {
    this.canvas  = canvas;
    this.n       = 0;
    this.running = false;
    this.fps     = makeFpsCounter();
    this.init().then(() => {
      this.resize(parseInt(document.getElementById('gpu-n').value));
      this.running = true;
      this.loop();
    });
  }

  async init() {
    if (!navigator.gpu) throw new Error('WebGPU non disponible');

    this.adapter = await navigator.gpu.requestAdapter();
    this.device  = await this.adapter.requestDevice();

    this.ctx    = this.canvas.getContext('webgpu');
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.ctx.configure({ device: this.device, format: this.format, alphaMode: 'premultiplied' });

    this.physicsModule = this.device.createShaderModule({ code: PHYSICS_SHADER });
    this.renderModule  = this.device.createShaderModule({ code: RENDER_SHADER  });

    this._buildPipelines();
  }

  _buildPipelines() {
    const dev = this.device;

    this.computePipeline = dev.createComputePipeline({
      layout : 'auto',
      compute: { module: this.physicsModule, entryPoint: 'main' },
    });

    this.renderPipeline = dev.createRenderPipeline({
      layout   : 'auto',
      vertex   : { module: this.renderModule, entryPoint: 'vs_main' },
      fragment : { module: this.renderModule, entryPoint: 'fs_main',
                   targets: [{ format: this.format,
                     blend: { color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
                              alpha: { srcFactor: 'one',       dstFactor: 'one', operation: 'add' } } }] },
      primitive: { topology: 'point-list' },
    });
  }

  resize(n) {
    const dev   = this.device;
    this.n      = n;
    const bytes = n * 4 * 4;

    const { positions, velocities } = randomParticles(n, 400, 400);
    const initData = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      initData[i * 4]     = positions[i * 2];
      initData[i * 4 + 1] = positions[i * 2 + 1];
      initData[i * 4 + 2] = velocities[i * 2];
      initData[i * 4 + 3] = velocities[i * 2 + 1];
    }

    const flags = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
    this.bufA = dev.createBuffer({ size: bytes, usage: flags });
    this.bufB = dev.createBuffer({ size: bytes, usage: flags });
    dev.queue.writeBuffer(this.bufA, 0, initData);
    dev.queue.writeBuffer(this.bufB, 0, initData);

    this.uBuf = dev.createBuffer({
      size : 12,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.ping = 0;
    document.getElementById('gpu-count').textContent = n;
  }

  _updateUniforms() {
    const G    = parseFloat(document.getElementById('gravity').value) * 500;
    const eps  = parseFloat(document.getElementById('eps').value);
    const data = new ArrayBuffer(12);
    new Uint32Array(data, 0, 1)[0]  = this.n;
    new Float32Array(data, 4, 1)[0] = G;
    new Float32Array(data, 8, 1)[0] = eps * eps;
    this.device.queue.writeBuffer(this.uBuf, 0, data);
  }

  frame() {
    if (!this.device || this.n === 0) return;
    const dev = this.device;

    this._updateUniforms();

    const [src, dst] = this.ping === 0
      ? [this.bufA, this.bufB]
      : [this.bufB, this.bufA];

    const enc = dev.createCommandEncoder();

    {
      const bg = dev.createBindGroup({
        layout: this.computePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: src       } },
          { binding: 1, resource: { buffer: dst       } },
          { binding: 2, resource: { buffer: this.uBuf } },
        ],
      });

      const pass = enc.beginComputePass();
      pass.setPipeline(this.computePipeline);
      pass.setBindGroup(0, bg);
      pass.dispatchWorkgroups(Math.ceil(this.n / 64));
      pass.end();
    }

    {
      const bg = dev.createBindGroup({
        layout: this.renderPipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: dst } }],
      });

      const pass = enc.beginRenderPass({
        colorAttachments: [{
          view      : this.ctx.getCurrentTexture().createView(),
          loadOp    : 'clear',
          clearValue: { r: 0.04, g: 0.04, b: 0.06, a: 1.0 },
          storeOp   : 'store',
        }],
      });
      pass.setPipeline(this.renderPipeline);
      pass.setBindGroup(0, bg);
      pass.draw(this.n);
      pass.end();
    }

    dev.queue.submit([enc.finish()]);
    this.ping ^= 1;
  }

  loop() {
    if (!this.running) return;
    this.frame();
    const { fps, ms } = this.fps.tick();
    document.getElementById('gpu-fps').textContent = fps.toFixed(1);
    document.getElementById('gpu-ms').textContent  = ms.toFixed(1);
    requestAnimationFrame(() => this.loop());
  }

  destroy() {
    this.running = false;
    this.bufA?.destroy();
    this.bufB?.destroy();
    this.uBuf?.destroy();
  }
}
