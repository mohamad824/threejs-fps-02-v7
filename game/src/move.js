// Circle-vs-AABB movement with slide. Shared by the player and the bots
// so collision behaviour is identical for every actor.
export function collideMove(actor, dx, dz, colliders, radius) {
  const r = radius || 0.42;
  actor.x += dx;
  for (const c of colliders) {
    if (c.top < 0.4) continue;
    if (actor.x + r > c.minX && actor.x - r < c.maxX && actor.z + r > c.minZ && actor.z - r < c.maxZ) {
      actor.x = dx > 0 ? c.minX - r : c.maxX + r;
    }
  }
  actor.z += dz;
  for (const c of colliders) {
    if (c.top < 0.4) continue;
    if (actor.x + r > c.minX && actor.x - r < c.maxX && actor.z + r > c.minZ && actor.z - r < c.maxZ) {
      actor.z = dz > 0 ? c.minZ - r : c.maxZ + r;
    }
  }
  actor.x = Math.max(-46, Math.min(46, actor.x));
  actor.z = Math.max(-37, Math.min(37, actor.z));
}

export function pointBlocked(x, z, colliders, radius) {
  const r = radius || 0.42;
  for (const c of colliders) {
    if (c.top < 0.4) continue;
    if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) return true;
  }
  return false;
}
