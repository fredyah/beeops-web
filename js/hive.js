import * as THREE from "three";

export function createHive(canvas) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = window.matchMedia("(max-width: 800px)").matches;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !mobile,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.autoClear = false;

  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const bg = new THREE.Scene();
  const hexUniforms = {
    uResolution: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uScroll: { value: 0 },
  };

  const hexMat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: hexUniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    vertexShader: /* glsl */ `
      void main() {
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec2 uResolution;
      uniform float uTime;
      uniform vec2 uPointer;
      uniform float uScroll;
      out vec4 fragColor;

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
        vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
        vec2 pointer = uPointer * aspect * 0.5;
        float glow = exp(-length(uv - pointer) * 2.4);
        float drift = exp(-length(uv - vec2(0.35, 0.05)) * 1.5);
        vec3 honey = vec3(1.0, 0.62, 0.18);
        vec3 teal = vec3(0.2, 0.75, 0.68);
        vec3 col = honey * glow * 0.42 + teal * drift * 0.12;
        col += honey * exp(-length(uv + vec2(0.15, 0.35)) * 1.8) * 0.08;
        float vig = smoothstep(1.25, 0.2, length(uv));
        fragColor = vec4(col, clamp((glow * 0.55 + drift * 0.2) * vig, 0.0, 0.75));
      }
    `,
  });

  bg.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), hexMat));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 40);
  camera.position.set(0, 0, 8.4);

  const gridPositions = [];
  const gridColors = [];
  const hexSize = mobile ? 0.72 : 0.58;
  const xStep = hexSize * 1.5;
  const yStep = Math.sqrt(3) * hexSize;
  const cols = mobile ? 10 : 16;
  const rows = mobile ? 8 : 12;
  for (let col = -cols; col <= cols; col += 1) {
    for (let row = -rows; row <= rows; row += 1) {
      const cx = col * xStep;
      const cy = row * yStep + (Math.abs(col) % 2) * (yStep / 2);
      const dist = Math.hypot(cx, cy);
      const fade = Math.max(0, 1 - dist / (mobile ? 8 : 11));
      if (fade <= 0.02) continue;
      const lit = ((col * 7 + row * 13) % 17) === 0 ? 1 : 0.42;
      const cr = 1.0 * fade * lit;
      const cg = 0.7 * fade * lit;
      const cb = 0.22 * fade * lit;
      for (let i = 0; i < 6; i += 1) {
        const a1 = (Math.PI / 3) * i;
        const a2 = (Math.PI / 3) * (i + 1);
        gridPositions.push(
          cx + Math.cos(a1) * hexSize,
          cy + Math.sin(a1) * hexSize,
          0,
          cx + Math.cos(a2) * hexSize,
          cy + Math.sin(a2) * hexSize,
          0
        );
        gridColors.push(cr, cg, cb, cr, cg, cb);
      }
    }
  }
  const gridGeo = new THREE.BufferGeometry();
  gridGeo.setAttribute("position", new THREE.Float32BufferAttribute(gridPositions, 3));
  gridGeo.setAttribute("color", new THREE.Float32BufferAttribute(gridColors, 3));
  const gridMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  gridMat.toneMapped = false;
  const grid = new THREE.LineSegments(gridGeo, gridMat);
  grid.position.set(1.1, 0.15, -1.1);
  grid.rotation.x = 0.38;
  grid.rotation.y = -0.22;
  scene.add(grid);

  const count = mobile ? 180 : 560;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const ang = Math.random() * Math.PI * 2;
    const rad = Math.pow(Math.random(), 0.42) * 6.4;
    positions[i * 3] = Math.cos(ang) * rad;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 4.4;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 2.2;
    seeds[i] = Math.random();
  }
  const pointGeo = new THREE.BufferGeometry();
  pointGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  pointGeo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

  const pointUniforms = {
    uTime: { value: 0 },
    uPointer: { value: new THREE.Vector2() },
    uPixelRatio: { value: 1 },
  };
  const pointMat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: pointUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    vertexShader: /* glsl */ `
      in float aSeed;
      uniform float uTime;
      uniform vec2 uPointer;
      uniform float uPixelRatio;
      out float vSeed;
      void main() {
        vSeed = aSeed;
        vec3 p = position;
        float t = uTime * (0.2 + aSeed * 0.25);
        p.x += sin(t + position.y * 0.7) * (0.25 + aSeed * 0.4);
        p.y += cos(t * 0.82 + position.x * 0.5) * 0.28;
        p.z += sin(t * 0.55 + aSeed * 9.0) * 0.22;
        p.xy += uPointer * (0.22 + aSeed * 0.45);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float size = mix(4.0, 16.0, aSeed * aSeed);
        gl_PointSize = size * uPixelRatio * (6.5 / max(1.0, -mv.z));
      }
    `,
    fragmentShader: /* glsl */ `
      in float vSeed;
      out vec4 fragColor;
      void main() {
        vec2 c = gl_PointCoord - vec2(0.5);
        float r = length(c);
        if (r > 0.5) discard;
        float core = smoothstep(0.5, 0.02, r);
        vec3 honey = vec3(1.0, 0.8, 0.42);
        vec3 teal = vec3(0.5, 1.0, 0.9);
        vec3 col = mix(honey, teal, smoothstep(0.84, 0.98, vSeed));
        fragColor = vec4(col, core * core * 0.92);
      }
    `,
  });
  const points = new THREE.Points(pointGeo, pointMat);
  points.position.x = 1.35;
  scene.add(points);

  const beesN = mobile ? 14 : 28;
  const beePos = new Float32Array(beesN * 6);
  const beeGeo = new THREE.BufferGeometry();
  beeGeo.setAttribute("position", new THREE.BufferAttribute(beePos, 3));
  const beeMat = new THREE.LineBasicMaterial({
    color: 0xffc14d,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  beeMat.toneMapped = false;
  const bees = new THREE.LineSegments(beeGeo, beeMat);
  bees.position.x = 1.35;
  scene.add(bees);

  const beeData = Array.from({ length: beesN }, (_, i) => ({
    base: Math.random() * Math.PI * 2,
    speed: 0.18 + Math.random() * 0.42,
    rad: 1.1 + Math.random() * (i % 5 === 0 ? 2.2 : 4.8),
    yAmp: 0.35 + Math.random() * 1.45,
    phase: Math.random() * Math.PI * 2,
  }));

  const pointer = new THREE.Vector2();
  const pointerTarget = new THREE.Vector2();
  let scroll = 0;
  let time = 0;
  let last = performance.now();
  let running = true;
  let raf = 0;

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pr = Math.min(window.devicePixelRatio || 1, mobile ? 1.4 : 1.6);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    hexUniforms.uResolution.value.set(w * pr, h * pr);
    pointUniforms.uPixelRatio.value = pr;
  }

  function updateBees(t) {
    for (let i = 0; i < beesN; i += 1) {
      const b = beeData[i];
      const ang = b.base + t * b.speed;
      const wobble = Math.sin(t * 1.7 + b.phase) * 0.16;
      const rad = b.rad + Math.sin(t * 0.55 + b.phase) * 0.26;
      const y = Math.sin(ang * 0.92) * b.yAmp + wobble;
      const z = Math.cos(ang * 0.7) * 0.7;
      const ang2 = ang - 0.2;
      const o = i * 6;
      const px = pointer.x * 0.35;
      const py = pointer.y * 0.2;
      beePos[o] = Math.cos(ang) * rad + px;
      beePos[o + 1] = y + py;
      beePos[o + 2] = z;
      beePos[o + 3] = Math.cos(ang2) * rad * 0.97 + px;
      beePos[o + 4] = Math.sin(ang2 * 0.92) * b.yAmp + py;
      beePos[o + 5] = Math.cos(ang2 * 0.7) * 0.7;
    }
    beeGeo.attributes.position.needsUpdate = true;
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!reduced) time += dt;
    pointer.lerp(pointerTarget, 0.055);
    hexUniforms.uTime.value = time;
    hexUniforms.uPointer.value.copy(pointer);
    hexUniforms.uScroll.value = scroll;
    pointUniforms.uTime.value = time;
    pointUniforms.uPointer.value.copy(pointer);
    updateBees(reduced ? 0.4 : time);
    points.rotation.z = Math.sin(time * 0.08) * 0.06;
    grid.rotation.z = Math.sin(time * 0.12) * 0.03;
    grid.position.x = 1.1 + pointer.x * 0.18;
    grid.position.y = 0.15 + pointer.y * 0.1;
    camera.position.x += (pointer.x * 0.28 - camera.position.x) * 0.045;
    camera.position.y += (pointer.y * 0.16 - camera.position.y) * 0.045;
    camera.lookAt(0.4, 0, 0);
    renderer.clear();
    renderer.render(bg, ortho);
    renderer.clearDepth();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  function play() {
    if (running || document.hidden) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function onVis() {
    if (document.hidden) stop();
    else play();
  }

  resize();
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", onVis);
  raf = requestAnimationFrame(frame);

  return {
    setScroll(value) {
      scroll = value;
    },
    setPointer(x, y) {
      pointerTarget.x = (x / Math.max(1, window.innerWidth)) * 2 - 1;
      pointerTarget.y = -((y / Math.max(1, window.innerHeight)) * 2 - 1);
    },
    setActive(active) {
      if (active) play();
      else stop();
    },
    destroy() {
      stop();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
      pointGeo.dispose();
      pointMat.dispose();
      gridGeo.dispose();
      gridMat.dispose();
      beeGeo.dispose();
      beeMat.dispose();
      hexMat.dispose();
      renderer.dispose();
    },
  };
}
