struct Particle {
  pos : vec2<f32>,
  vel : vec2<f32>,
}

// Deux buffers : l'état actuel (read) et le prochain état (write)
// Ping-pong : à chaque frame on alterne lecture/écriture
@group(0) @binding(0) var<storage, read>       srcParticles : array<Particle>;
@group(0) @binding(1) var<storage, read_write> dstParticles : array<Particle>;

struct Params {
  n    : u32,
  G    : f32,
  eps2 : f32,
}
@group(0) @binding(2) var<uniform> params : Params;

// workgroup_size(64) : on traite 64 particules en parallèle par workgroup
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  let i = gid.x;
  if (i >= params.n) { return; }

  let me = srcParticles[i];
  var acc = vec2<f32>(0.0, 0.0);

  // O(n²) — mais chaque thread i fait sa propre boucle sur j
  // → n threads font chacun n itérations EN PARALLÈLE
  for (var j = 0u; j < params.n; j++) {
    if (j == i) { continue; }
    let other = srcParticles[j];
    let delta = other.pos - me.pos;
    let dist2 = dot(delta, delta) + params.eps2;
    let inv   = params.G / (dist2 * sqrt(dist2));
    acc += delta * inv;
  }

  // Intégration Euler
  let newVel = me.vel + acc;
  let newPos = me.pos + newVel;

  dstParticles[i] = Particle(newPos, newVel);
}
