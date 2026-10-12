/**
 * Shared "Liquid Prism" LED shader — used by BOTH the big centre video wall
 * and the DJ desk fascia, so the desk reads as a continuation of the wall
 * rather than a separate animation.
 *
 * uOffset slides the sampled region, letting a wide short panel show the
 * lower band of the same pattern the wall is playing.
 */
export const wallVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

/**
 * Four music-reactive scenes crossfading every 16 beats:
 *  0 Tide  — domain-warped fluid gradients, bass swells the current
 *  1 Orbit — thin perspective rings with satellite light-trails
 *  2 Silk  — flowing glow ribbons with travelling light packets
 *  3 Bloom — parallax depth orbs over a slow conic sheen
 * Palette is anchored to the active light theme (never rainbow).
 */
export const wallFrag = /* glsl */ `
  varying vec2 vUv;
  uniform float uBeat, uTime, uBass, uMid, uTreble, uKick, uEnergy, uDrop;
  uniform float uSceneA, uSceneB, uBlend, uVig;
  uniform vec3 uA, uB, uC, uDeep;
  uniform vec2 uRes, uOffset;

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash12(i), b = hash12(i + vec2(1.0, 0.0));
    float c = hash12(i + vec2(0.0, 1.0)), d = hash12(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 3; i++) { v += a * vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; }
    return v;
  }

  vec3 sceneTide(vec2 uv) {
    float t = uTime;
    float w1 = fbm(vec2(uv.x * 2.0 + t * 0.05, uv.y * 1.6 - t * 0.035 + uBass * 0.7));
    float w2 = fbm(vec2(uv.x * 3.2 - t * 0.045 + uMid * 0.4, uv.y * 2.6 + w1 * 1.8));
    vec3 col = mix(uDeep, uB, smoothstep(0.15, 0.85, w1));
    col = mix(col, uA, smoothstep(0.42, 0.95, w2) * (0.3 + 0.7 * uEnergy));
    float crest = 1.0 - smoothstep(0.0, 0.035, abs(w2 - 0.60));
    col += uC * crest * (0.22 + uKick * 0.55);
    float shim = pow(max(0.0, sin(uv.x * 90.0 + t * 2.2) * sin(uv.y * 70.0 - t * 1.6)), 8.0);
    col += uC * shim * uTreble * 0.5;
    return col;
  }

  vec3 sceneOrbit(vec2 uv, vec2 p) {
    vec3 col = uDeep * 0.7;
    vec2 sp = floor(uv * uRes * 0.5);
    float st = step(0.986, hash12(sp)) * (0.25 + 0.75 * uTreble);
    col += vec3(0.55, 0.65, 0.85) * st * 0.4;
    float breathe = 1.0 + uBass * 0.09;
    for (int k = 0; k < 3; k++) {
      float fk = float(k);
      float rk = (0.30 + 0.16 * fk) * breathe;
      float squash = 1.55 + 0.18 * fk;
      vec2 q = vec2(p.x, p.y * squash);
      float d = abs(length(q) - rk);
      float line = exp(-d * d * 2600.0);
      col += mix(uA, uB, fk / 2.0) * line * (0.45 + 0.45 * uEnergy + uKick * 0.35);
      float spd = (0.5 + 0.22 * fk) * (0.55 + 0.65 * uEnergy);
      float ang = uTime * spd + fk * 2.1;
      for (int j = 0; j < 6; j++) {
        float fj = float(j);
        float a = ang - fj * 0.085;
        vec2 s = vec2(cos(a) * rk, sin(a) * rk / squash);
        float dd = length(p - s);
        float glow = exp(-dd * dd * (900.0 + fj * 550.0));
        col += mix(uC, uA, fj / 5.0) * glow * (0.9 - fj * 0.14) * (0.45 + 0.55 * uEnergy);
      }
    }
    col += uA * exp(-dot(p, p) * 6.0) * uKick * 0.45;
    return col;
  }

  vec3 sceneSilk(vec2 uv) {
    vec3 col = uDeep * 0.8;
    col += uB * 0.22 * (1.0 - smoothstep(0.0, 0.9, abs(uv.y - 0.5)));
    for (int k = 0; k < 3; k++) {
      float fk = float(k);
      float base = 0.30 + 0.20 * fk;
      float amp = 0.055 + 0.05 * uMid + 0.02 * sin(uTime * 0.3 + fk);
      float yk = base + amp * sin(uv.x * (4.0 + fk * 1.3) + uTime * (0.7 + 0.2 * fk) + fk * 2.0);
      yk += 0.03 * sin(uv.x * 11.0 - uTime * 1.1 + fk * 4.0) * (0.4 + uTreble);
      float d = abs(uv.y - yk);
      float glow = exp(-d * d * 1400.0);
      vec3 rc = mix(mix(uA, uC, fk / 2.0), uB, 0.25);
      col += rc * glow * (0.5 + 0.4 * uEnergy + uKick * 0.3);
      float pkt = exp(-pow((fract(uv.x - uTime * (0.10 + 0.05 * fk) + fk * 0.33) - 0.5) * 6.0, 2.0));
      col += uC * pkt * glow * 1.1;
    }
    return col;
  }

  vec3 sceneBloom(vec2 uv, vec2 p) {
    vec3 col = uDeep * 0.75;
    float ang0 = atan(p.y, p.x);
    col += uB * (0.5 + 0.5 * sin(ang0 * 2.0 + uTime * 0.25)) * 0.10 * (1.0 - smoothstep(0.1, 0.9, length(p)));
    for (int k = 4; k >= 0; k--) {
      float fk = float(k);
      float depth = fk / 4.0;
      float sp = 0.14 + 0.10 * (1.0 - depth);
      vec2 c = vec2(
        sin(uTime * sp + fk * 2.4) * 0.42 * (0.4 + 0.6 * depth),
        cos(uTime * sp * 0.8 + fk * 1.7) * 0.26 * (0.4 + 0.6 * depth)
      );
      float r = mix(0.10, 0.30, depth) * (1.0 + uKick * 0.28 * depth);
      float d = length(p - c);
      vec3 oc = fk > 3.5 ? uA : (fk > 2.5 ? uC : (fk > 1.5 ? uB : mix(uB, uDeep, 0.45)));
      float body = 1.0 - smoothstep(r * 0.5, r, d);
      float halo = exp(-d * d / (r * r * 2.4)) * 0.5;
      float shade = 0.8 + 0.2 * clamp((p.x - c.x) / max(r, 0.001), -1.0, 1.0);
      float a = clamp(body + halo * 0.55, 0.0, 1.0) * 0.88;
      col = mix(col, oc * shade * (0.45 + 0.55 * uEnergy + 0.25), a);
    }
    return col;
  }

  vec3 scenePick(float idx, vec2 uv, vec2 p) {
    if (idx < 0.5) return sceneTide(uv);
    if (idx < 1.5) return sceneOrbit(uv, p);
    if (idx < 2.5) return sceneSilk(uv);
    return sceneBloom(uv, p);
  }

  void main() {
    vec2 cell = floor(vUv * uRes);
    vec2 uv = (cell + 0.5) / uRes + uOffset;
    vec2 g = fract(vUv * uRes);
    float diode = 1.0 - smoothstep(0.30, 0.5, length(g - 0.5));
    vec2 p = (uv - uOffset - 0.5) * vec2(uRes.x / uRes.y, 1.0);

    vec3 c = mix(scenePick(uSceneA, uv, p), scenePick(uSceneB, uv, p), uBlend);
    c += (uA + uB) * 0.5 * sin(uBlend * 3.14159) * 0.09;   // gentle transition lift
    c += mix(uA, uC, 0.5) * uDrop * 0.26;                    // tasteful drop flash
    c *= 0.72 + 0.5 * uEnergy;                              // show energy grade
    c *= 1.0 - uVig * smoothstep(0.35, 0.95, length(p));     // vignette
    c += (hash12(cell + floor(uTime * 24.0)) - 0.5) * 0.028; // faint grain
    gl_FragColor = vec4((vec3(0.008, 0.01, 0.018) + c) * diode, 1.0);
  }
`;
