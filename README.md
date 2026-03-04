# N-Body Simulations — JS vs WebGPU

Side-by-side comparison of an N-body gravitational simulation running on the CPU (JavaScript, O(n²) naïve) and the GPU (WebGPU compute shaders, same O(n²) but massively parallel).

## Stack

- **Vite 6** — bundler & dev server
- **Vanilla JS** — no framework
- **WebGPU** — compute + render pipeline via WGSL shaders

## Project Structure

```
src/
├── main.js            # entry point, UI controls
├── utils.js           # shared helpers (particle init, FPS counter)
├── NBodyJS.js         # CPU simulation (Canvas 2D)
├── NBodyGPU.js        # GPU simulation (WebGPU)
└── shaders/
    ├── physics.wgsl   # compute shader — N-body physics
    └── render.wgsl    # vertex + fragment shaders
```

## Getting Started

```bash
npm install
npm run dev       # dev server → http://localhost:5173
npm run build     # production build → dist/
npm run preview   # serve production build locally
```

## Requirements

WebGPU is required for the GPU panel. Use **Chrome 113+** or enable it via `chrome://flags/#enable-unsafe-webgpu`. The JS panel works in any modern browser.
