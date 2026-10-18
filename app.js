import { GRID, galaxyPoint, portraitPoint, smoothstep, distantStar } from './particles.js';

const canvas = document.querySelector('#universe');
const transform = document.querySelector('#transform');
const caption = document.querySelector('#caption');
const status = document.querySelector('#status');

function notice(message) { status.textContent = message; status.hidden = false; }

const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
if (!gl) {
  notice('Trình duyệt chưa hỗ trợ WebGL để mở hiệu ứng.');
  caption.textContent = '';
} else {
  try { startUniverse(); } catch (error) {
    notice('Không thể khởi tạo ngân hà trên thiết bị này.');
    caption.textContent = '';
    console.error(error);
  }
}

function startUniverse() {
  const vertex = `
    attribute vec3 aGalaxy;
    attribute vec2 aPortrait;
    attribute vec3 aColor;
    attribute float aSeed;
    uniform vec2 uResolution;
    uniform float uTime, uMorph, uScale, uCenter, uDpr, uAspect;
    varying vec3 vColor;
    varying float vMorph;
    void main() {
      if (aSeed < 0.) {
        float depth = -aSeed;
        vec2 drift = vec2(sin(uTime * .045 + depth * 20.), cos(uTime * .035 + depth * 30.)) * .003;
        gl_Position = vec4(aGalaxy.xy * .97 + drift, 0., 1.);
        gl_PointSize = (1.2 + depth * 1.7) * uDpr;
        float twinkle = .65 + .35 * sin(uTime * .65 + depth * 80.);
        vColor = mix(vec3(.45, .36, .70), vec3(.85, .70, .80), depth) * twinkle * .42 * (1. - uMorph * .8);
        vMorph = 0.;
        return;
      }
      vec3 p = aGalaxy;
      float ring = step(.65, length(aGalaxy));
      float angle = uTime * .18;
      p.xz = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * p.xz;
      float tilt = .48;
      p.yz = mat2(cos(tilt), -sin(tilt), sin(tilt), cos(tilt)) * p.yz;
      float slant = -.32;
      p.xy = mat2(cos(slant), -sin(slant), sin(slant), cos(slant)) * p.xy;
      float perspective = 2.8 / (2.8 + p.z * .35);
      vec2 galaxy = p.xy * perspective * uScale * .66;
      vec2 portrait = aPortrait * vec2(uAspect, 1.) * uScale * 1.60;
      vec2 screen = mix(galaxy, portrait, uMorph);
      screen.y += uCenter;
      gl_Position = vec4(screen / uResolution * 2., 0., 1.);
      float sparkle = .8 + .2 * sin(uTime * .4 + aSeed * 90.);
      float radius = length(aGalaxy);
      vec3 gold = vec3(1., .64, .38);
      vec3 pink = vec3(.89, .29, .66);
      vec3 purple = vec3(.34, .12, .85);
      vec3 sphereColor = mix(pink, purple, smoothstep(-.5, .5, aGalaxy.y));
      vec3 ringColor = mix(gold, pink, smoothstep(.75, 1.10, radius));
      ringColor = mix(ringColor, purple, smoothstep(1.05, 1.40, radius));
      float ringFade = smoothstep(.69, .82, radius) * (1. - smoothstep(1.08, 1.42, radius));
      float depthLight = mix(1., .35, smoothstep(-.52, .52, p.z));
      vec3 galaxyColor = mix(sphereColor * depthLight * .65, ringColor * ringFade, ring);
      // Hide the far ring behind the sphere, without hiding portrait samples.
      float occlusion = mix(1., smoothstep(.46, .53, length(p.xy)), ring * step(0., p.z));
      // Keep the sky sparse; all samples return when forming the portrait.
      float visible = step(.60, aSeed);
      vColor = mix(galaxyColor * sparkle * visible * occlusion, aColor, uMorph);
      vMorph = uMorph;
      float dustSize = (1.8 + pow(aSeed, 35.) * 4.5) * uDpr * perspective;
      float photoSize = uScale * 1.60 / ${GRID}. * 2.25;
      gl_PointSize = mix(dustSize, photoSize, uMorph);
    }`;
  const fragment = `
    precision mediump float;
    varying vec3 vColor;
    varying float vMorph;
    void main() {
      vec2 p = gl_PointCoord * 2. - 1.;
      float r = dot(p, p);
      if (r > 1.) discard;
      float core = exp(-r * 5.5);
      float halo = exp(-r * 2.) * .07 * (1. - vMorph);
      gl_FragColor = vec4(vColor * (core + halo), 1.);
    }`;

  function shader(type, source) {
    const result = gl.createShader(type);
    gl.shaderSource(result, source); gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(result));
    return result;
  }
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const count = GRID * GRID;
  const total = count + 160;
  const galaxy = new Float32Array(total * 3);
  const portrait = new Float32Array(total * 2);
  const colors = new Float32Array(total * 3);
  const seeds = new Float32Array(total);
  for (let i = 0; i < count; i++) {
    galaxy.set(galaxyPoint(i), i * 3);
    portrait.set([(i % GRID + .5) / GRID - .5, .5 - (Math.floor(i / GRID) + .5) / GRID], i * 2);
    seeds[i] = Math.random();
  }
  for (let i = count; i < total; i++) {
    const star = distantStar(i - count);
    galaxy.set(star.position, i * 3);
    seeds[i] = star.seed;
  }
  function attribute(name, data, size) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
    return buffer;
  }
  attribute('aGalaxy', galaxy, 3);
  attribute('aPortrait', portrait, 2);
  const colorBuffer = attribute('aColor', colors, 3);
  attribute('aSeed', seeds, 1);
  const uniforms = Object.fromEntries(['uResolution', 'uTime', 'uMorph', 'uScale', 'uCenter', 'uDpr', 'uAspect'].map(name => [name, gl.getUniformLocation(program, name)]));
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.clearColor(.018, .009, .035, 1);
  let aspect = 1;
  let dpr = 1;
  let scale = 1;
  let center = 0;
  let time = 0;
  let morph = 0;
  let from = 0;
  let target = 0;
  let progress = 1;
  let previous = 0;
  let frame = 0;
  let lost = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches;

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const space = document.querySelector('.space').getBoundingClientRect();
    const height = Math.min(space.height - 15, innerHeight * .55);
    scale = Math.min(innerWidth * .53, height / 1.65) * dpr;
    center = (innerHeight / 2 - (space.top + space.height / 2)) * dpr;
    requestDraw();
  }
  function draw(now) {
    frame = 0;
    if (lost || document.hidden) return;
    const delta = previous ? Math.min((now - previous) / 1000, .05) : 0;
    previous = now;
    if (!paused) time += delta;
    if (progress < 1 && !paused) {
      progress = Math.min(1, progress + delta / 3.2);
      morph = from + (target - from) * smoothstep(progress);
    }
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(uniforms.uResolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.uTime, time);
    gl.uniform1f(uniforms.uMorph, morph);
    gl.uniform1f(uniforms.uScale, scale);
    gl.uniform1f(uniforms.uCenter, center);
    gl.uniform1f(uniforms.uDpr, dpr);
    gl.uniform1f(uniforms.uAspect, aspect);
    gl.drawArrays(gl.POINTS, 0, total);
    if (!paused && (morph < 1 || progress < 1)) requestDraw();
  }
  function requestDraw() { if (!frame && !document.hidden && !lost) frame = requestAnimationFrame(draw); }
  reduced.addEventListener('change', () => {
    paused = reduced.matches;
    if (paused) { morph = target; progress = 1; }
    previous = 0;
    requestDraw();
  });
  transform.addEventListener('click', () => {
    target = target ? 0 : 1;
    document.body.classList.toggle('portrait', Boolean(target));
    from = morph;
    progress = reduced.matches || paused ? 1 : 0;
    if (progress === 1) morph = target;
    transform.setAttribute('aria-label', target ? 'Chạm để xem lại ngân hà' : 'Chạm để mở thiệp sinh nhật');
    transform.setAttribute('aria-pressed', String(Boolean(target)));
    caption.textContent = target ? '' : 'Chạm một cái nè';
    requestDraw();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else { previous = 0; requestDraw(); }
  });
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', resize, { passive: true });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); lost = true; cancelAnimationFrame(frame);
    transform.disabled = true;
    notice('Đồ họa vừa bị gián đoạn. Tải lại trang để mở lại ngân hà nhé.');
  });

  const image = new Image();
  image.onload = () => {
    try {
      const sample = document.createElement('canvas');
      sample.width = GRID; sample.height = GRID;
      const context = sample.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0, GRID, GRID);
      const pixels = context.getImageData(0, 0, GRID, GRID).data;
      aspect = Math.min(1.5, Math.max(.5, image.naturalWidth / image.naturalHeight));
      for (let i = 0; i < count; i++) colors.set(portraitPoint(i, pixels, GRID, GRID).color, i * 3);
      gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
      transform.disabled = false;
      caption.textContent = 'Chạm một cái nè';
      transform.setAttribute('aria-pressed', 'false');
      requestDraw();
    } catch (error) { notice('Không đọc được ảnh chân dung. Hãy mở trang qua máy chủ HTTP hoặc GitHub Pages.'); console.error(error); }
  };
  image.onerror = () => {
    caption.textContent = 'Ngân hà đã sẵn sàng — đang chờ ảnh của chị.';
    notice('Chưa có ảnh chân dung. Lưu ảnh vào assets/chi.jpg rồi tải lại trang để các vì sao xếp thành chị.');
  };
  image.src = './assets/chi.jpg';
  resize();
  document.fonts.ready.then(resize);
}
