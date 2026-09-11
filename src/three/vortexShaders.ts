// Vortex particle shaders for the J6 totem — Fase 2 do plano de construção.
// Filamentos de "plasma de elétrons" girando em órbitas elípticas ao redor do
// monograma central, coloridos num gradiente âmbar intenso -> amarelo pálido.

// Classic Ashima/McEwan simplex noise (public domain / MIT-style, widely used
// in three.js community shaders) — drives the organic jitter of each filament
// so the vortex never reads as a mechanically perfect ring.
export const simplexNoise3D = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

export const vortexVertexShader = /* glsl */ `
uniform float uTime;
uniform float uSpeed;
uniform float uSize;
uniform float uPixelRatio;
uniform float uNoiseStrength;

attribute float aRadius;
attribute float aAngle;
attribute float aSpeed;
attribute float aTilt;
attribute float aEllipse;
attribute float aPhase;
attribute float aScale;

varying float vGradient;
varying float vAlpha;

${simplexNoise3D}

void main() {
  // Órbita elíptica base ao redor do centro do totem.
  float angle = aAngle + uTime * uSpeed * aSpeed;
  float rx = aRadius;
  float rz = aRadius * aEllipse;

  vec3 pos;
  pos.x = cos(angle) * rx;
  pos.z = sin(angle) * rz;
  pos.y = sin(angle * 1.5 + aPhase) * aRadius * 0.18;

  // Inclina o plano orbital para dar sensação de vórtice 3D, não um anel plano.
  float tilt = aTilt;
  float y2 = pos.y * cos(tilt) - pos.z * sin(tilt);
  float z2 = pos.y * sin(tilt) + pos.z * cos(tilt);
  pos.y = y2;
  pos.z = z2;

  // Ruído orgânico: cada filamento se desvia ligeiramente da órbita perfeita.
  float n = snoise(vec3(pos.x * 0.6, pos.y * 0.6, uTime * 0.35 + aPhase * 4.0));
  pos += normalize(pos + 0.0001) * n * uNoiseStrength;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float dist = length(rx > rz ? rx : rz);
  vGradient = clamp(dist / 2.2, 0.0, 1.0);
  vAlpha = smoothstep(0.0, 0.4, aRadius) * (0.4 + 0.32 * sin(uTime * 2.0 * aSpeed + aPhase));

  gl_PointSize = uSize * aScale * uPixelRatio * (140.0 / -mvPosition.z);
}
`;

export const vortexFragmentShader = /* glsl */ `
uniform vec3 uColorCore;
uniform vec3 uColorEdge;

varying float vGradient;
varying float vAlpha;

void main() {
  // Textura de partícula procedural: gradiente radial suave (sem asset externo).
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv) * 2.0;
  float glow = smoothstep(1.0, 0.0, d);
  glow = pow(glow, 1.8);

  if (glow < 0.01) discard;

  vec3 color = mix(uColorCore, uColorEdge, vGradient);
  gl_FragColor = vec4(color, glow * vAlpha);
}
`;
