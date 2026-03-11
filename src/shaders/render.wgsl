struct Particle {
  position : vec2<f32>,
  velocity : vec2<f32>,
}

@group(0) @binding(0) var<storage, read> particles : array<Particle>;

struct VertexOutput {
  @builtin(position) clipPosition : vec4<f32>,
  @location(0)       speed        : f32,
}

@vertex
fn vs_main(@builtin(vertex_index) particleIndex : u32) -> VertexOutput {
  let particle = particles[particleIndex];

  // Conversion coordonnées canvas → clip space [-1, 1]
  let canvasSize  = vec2<f32>(400.0, 400.0);
  let clipXY      = (particle.position / canvasSize) * 2.0 - vec2<f32>(1.0, 1.0);
  let speed       = length(particle.velocity);

  // L'axe Y est inversé entre canvas (↓) et clip space (↑)
  return VertexOutput(vec4<f32>(clipXY.x, -clipXY.y, 0.0, 1.0), speed);
}

@fragment
fn fs_main(input : VertexOutput) -> @location(0) vec4<f32> {
  // Couleur fonction de la vitesse : lent = bleu, rapide = blanc chaud
  let speedNormalized = clamp(input.speed * 0.08, 0.0, 1.0);

  let red   = 0.4 + speedNormalized * 0.6;
  let green = 0.6 + speedNormalized * 0.3;
  let blue  = 1.0 - speedNormalized * 0.5;

  return vec4<f32>(red, green, blue, 0.85);
}
