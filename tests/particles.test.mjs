import test from 'node:test';
import assert from 'node:assert/strict';
import { GRID, galaxyPoint, portraitPoint, smoothstep, distantStar } from '../particles.js';

test('distant stars cover the viewport and remain separate from portrait particles', () => {
  const stars = Array.from({ length: 160 }, (_, i) => distantStar(i));
  for (const star of stars) {
    assert.ok(star.position.every(value => Number.isFinite(value) && Math.abs(value) <= 1));
    assert.ok(star.seed < 0 && star.seed >= -1.1);
  }
  for (const x of [-1, 1]) for (const y of [-1, 1]) {
    assert.ok(stars.some(star => star.position[0] * x > .5 && star.position[1] * y > .5));
  }
});

test('Saturn has a spherical shell and a broad dust ring separated from the planet', () => {
  for (let i = 0; i < 1000; i++) {
    const point = galaxyPoint(i);
    assert.ok(point.every(Number.isFinite));
    if (i % 5 < 2) {
      const radius = Math.hypot(...point);
      assert.ok(radius >= .48 - 1e-9 && radius <= .52 + 1e-9);
    } else {
      const radius = Math.hypot(point[0], point[2]);
      assert.ok(radius >= .70 - 1e-9 && radius <= 1.40 + 1e-9);
      assert.ok(Math.abs(point[1]) <= .10);
    }
  }
});
test('outer dust extends beyond the main ring and spreads vertically', () => {
  const values = [.25, .9, .95];
  const point = galaxyPoint(7, () => values.shift());
  assert.ok(Math.hypot(point[0], point[2]) > 1.28);
  assert.ok(point[1] > .08);
});
test('sphere covers poles and equator, including both front and back', () => {
  const points = [];
  for (const angle of [0, .25, .5, .75]) {
    for (const latitude of [0, .5, 1]) {
      const values = [angle, latitude, .5];
      points.push(galaxyPoint(0, () => values.shift()));
    }
  }
  for (const axis of [0, 1, 2]) {
    assert.ok(Math.max(...points.map(p => p[axis])) >= .49);
    assert.ok(Math.min(...points.map(p => p[axis])) <= -.49);
  }
});
test('portrait samples the correct colors at all four corners without flipping the face', () => {
  const pixels = new Uint8ClampedArray([255,0,0,255, 0,255,0,255, 0,0,255,255, 255,255,255,255]);
  assert.deepEqual(portraitPoint(0, pixels, 2, 2).color, [1,0,0]);
  assert.deepEqual(portraitPoint(GRID - 1, pixels, 2, 2).color, [0,1,0]);
  assert.deepEqual(portraitPoint(GRID * (GRID - 1), pixels, 2, 2).color, [0,0,1]);
  assert.deepEqual(portraitPoint(GRID * GRID - 1, pixels, 2, 2).color, [1,1,1]);
  assert.ok(portraitPoint(0, pixels, 2, 2).position[1] > 0);
});
test('transition is bounded, continuous, and reaches both endpoints', () => {
  assert.equal(smoothstep(-1), 0);
  assert.equal(smoothstep(0), 0);
  assert.equal(smoothstep(.5), .5);
  assert.equal(smoothstep(1), 1);
  assert.equal(smoothstep(2), 1);
});
