struct Particle {
  position : vec2<f32>,
  velocity : vec2<f32>,
}

// Deux buffers : l'état actuel (read) et le prochain état (write)
// Ping-pong : à chaque frame on alterne lecture/écriture
@group(0) @binding(0) var<storage, read>       currentParticles : array<Particle>;
@group(0) @binding(1) var<storage, read_write> nextParticles    : array<Particle>;

struct SimParams {
  particleCount      : u32,
  gravity            : f32,
  softeningSquared   : f32,
}
@group(0) @binding(2) var<uniform> params : SimParams;

// workgroup_size(64) : on traite 64 particules en parallèle par workgroup
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) globalId : vec3<u32>) {

  let particleIndex = globalId.x;
  if (particleIndex >= params.particleCount) { return; }

  let currentParticle = currentParticles[particleIndex];
  var acceleration    = vec2<f32>(0.0, 0.0);

  // O(n²) — mais chaque thread i fait sa propre boucle sur j
  // → n threads font chacun n itérations EN PARALLÈLE
  for (var j = 0u; j < params.particleCount; j++) {

    if (j == particleIndex) { continue; }

    let neighbor     = currentParticles[j];
    let toNeighbor   = neighbor.position - currentParticle.position;
    let distSquared  = dot(toNeighbor, toNeighbor) + params.softeningSquared;
    let forceFactor  = params.gravity / distSquared;
    let normalizedForceFactor = forceFactor /  sqrt(distSquared);

    acceleration += toNeighbor * normalizedForceFactor;
  }

  // Intégration Euler
  let newVelocity = currentParticle.velocity + acceleration;
  let newPosition = currentParticle.position + newVelocity;

  nextParticles[particleIndex] = Particle(newPosition, newVelocity);
}
