struct Particle {
  pos : vec2<f32>,
  vel : vec2<f32>,
}

@group(0) @binding(0) var<storage, read> particles : array<Particle>;

struct VSOut {
  @builtin(position) pos   : vec4<f32>,
  @location(0)       speed : f32,
}

@vertex
fn vs_main(@builtin(vertex_index) idx : u32) -> VSOut {
  let p     = particles[idx];
  // Conversion coordonnées canvas → clip space [-1, 1]
  let clip  = (p.pos / vec2<f32>(400.0, 400.0)) * 2.0 - vec2<f32>(1.0, 1.0);
  let speed = length(p.vel);
  return VSOut(vec4<f32>(clip.x, -clip.y, 0.0, 1.0), speed);
}

@fragment
fn fs_main(in : VSOut) -> @location(0) vec4<f32> {
  // Couleur fonction de la vitesse : lent = bleu, rapide = blanc chaud
  let t = clamp(in.speed * 0.08, 0.0, 1.0);
  let r = 0.4 + t * 0.6;
  let g = 0.6 + t * 0.3;
  let b = 1.0 - t * 0.5;
  return vec4<f32>(r, g, b, 0.85);
}
