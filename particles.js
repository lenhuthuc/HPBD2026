export const GRID = 220;

export function distantStar(index) {
  return {
    position: [((index * .61803398875) % 1) * 2 - 1, ((index * .75487766625) % 1) * 2 - 1, 0],
    seed: -.1 - ((index * .41421356237) % 1),
  };
}

export function galaxyPoint(index, random = Math.random) {
  const angle = random() * Math.PI * 2;
  if (index % 5 < 2) {
    const y = random() * 2 - 1;
    const radius = .48 + random() * .04;
    const equator = Math.sqrt(1 - y * y);
    return [Math.cos(angle) * equator * radius, y * radius, Math.sin(angle) * equator * radius];
  }
  // Concentrate dust near the ring's middle, with a sparse, thicker outer halo.
  const halo = index % 7 === 0;
  const radius = halo ? 1.02 + random() * .38 : .70 + (random() + random()) * .29;
  const thickness = halo ? .20 : .04 + (radius - .70) * .14;
  return [Math.cos(angle) * radius, (random() - .5) * thickness, Math.sin(angle) * radius];
}

export function portraitPoint(index, pixels, width, height) {
  const column = index % GRID;
  const row = Math.floor(index / GRID);
  const x = Math.min(width - 1, Math.floor((column + .5) / GRID * width));
  const y = Math.min(height - 1, Math.floor((row + .5) / GRID * height));
  const offset = (y * width + x) * 4;
  return {
    position: [(column + .5) / GRID - .5, .5 - (row + .5) / GRID],
    color: [pixels[offset] / 255, pixels[offset + 1] / 255, pixels[offset + 2] / 255],
  };
}

export function smoothstep(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}
