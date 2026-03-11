import { NBodyJS  } from './NBodyJS.js';
import { NBodyGPU } from './NBodyGPU.js';

// Vérifier WebGPU
if (!navigator.gpu) {
  document.getElementById('no-webgpu').style.display = 'block';
}

const jsCanvas  = document.getElementById('canvas-js');
const gpuCanvas = document.getElementById('canvas-gpu');

const simJS  = new NBodyJS(jsCanvas, 0);
const simGPU = new NBodyGPU(gpuCanvas);

// Contrôle : nombre de particules JS
const jsNSlider = document.getElementById('js-n');
jsNSlider.addEventListener('input', () => {
  const n = parseInt(jsNSlider.value);
  document.getElementById('lbl-js-n').textContent = n;
  simJS.resize(n);
});

// Contrôle : nombre de particules GPU
const gpuNSlider = document.getElementById('gpu-n');
gpuNSlider.addEventListener('input', () => {
  const n = parseInt(gpuNSlider.value);
  document.getElementById('lbl-gpu-n').textContent = n;
  simGPU.resize(n);
});

document.getElementById('gravity').addEventListener('input', e => {
  document.getElementById('lbl-gravity').textContent = parseFloat(e.target.value).toFixed(2);
});
document.getElementById('eps').addEventListener('input', e => {
  document.getElementById('lbl-eps').textContent = e.target.value;
});
