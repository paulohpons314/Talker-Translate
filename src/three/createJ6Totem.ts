import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader, type Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { vortexVertexShader, vortexFragmentShader } from './vortexShaders';

// Plano de construção "Totem J6" (RoundedBoxGeometry + resina/vidro + vórtice de
// partículas em shader + monograma 3D + bloom amber + loop de rotação/pulso),
// implementado em 5 fases conforme o documento de especificação do ícone.

export type J6Quality = 'low' | 'medium' | 'high';

export interface J6TotemOptions {
  quality?: J6Quality;
  autoRotate?: boolean;
  interactive?: boolean;
  bloom?: boolean;
  intensity?: number;
  colorCore?: THREE.ColorRepresentation;
  colorEdge?: THREE.ColorRepresentation;
  fontUrl?: string;
}

export interface J6TotemHandle {
  canvas: HTMLCanvasElement;
  setSize(width: number, height: number): void;
  setIntensity(level: number): void;
  setInteractive(enabled: boolean): void;
  setPaused(paused: boolean): void;
  dispose(): void;
}

const QUALITY_PRESETS: Record<J6Quality, {
  particleCount: number;
  boxSegments: number;
  bloom: boolean;
  transmission: boolean;
  maxPixelRatio: number;
  coreSegments: number;
}> = {
  low: { particleCount: 260, boxSegments: 3, bloom: false, transmission: false, maxPixelRatio: 1.5, coreSegments: 48 },
  medium: { particleCount: 900, boxSegments: 5, bloom: true, transmission: true, maxPixelRatio: 1.75, coreSegments: 96 },
  high: { particleCount: 1500, boxSegments: 7, bloom: true, transmission: true, maxPixelRatio: 2, coreSegments: 160 },
};

// PMREMGenerator/RoomEnvironment produzem um envMap plausível sem depender de um
// asset HDR externo. A textura resultante fica atrelada ao contexto WebGL do
// renderer que a gerou — não pode ser reaproveitada por outra instância de
// WebGLRenderer/canvas (cada totem tem o seu próprio contexto), por isso cada
// totem gera e descarta o seu.
function createEnvMap(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  return envMap;
}

let cachedFontPromise: Promise<Font> | null = null;
function loadFont(url: string): Promise<Font> {
  if (!cachedFontPromise) {
    cachedFontPromise = new Promise((resolve, reject) => {
      new FontLoader().load(url, resolve, undefined, reject);
    });
  }
  return cachedFontPromise;
}

function randRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function createJ6Totem(container: HTMLElement, options: J6TotemOptions = {}): J6TotemHandle {
  const quality = options.quality ?? 'medium';
  const preset = QUALITY_PRESETS[quality];
  const bloomEnabled = options.bloom ?? preset.bloom;
  const colorCore = new THREE.Color(options.colorCore ?? '#ff9c33');
  const colorEdge = new THREE.Color(options.colorEdge ?? '#ffd98a');

  let width = container.clientWidth || 1;
  let height = container.clientHeight || 1;

  const canvas = document.createElement('canvas');
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  container.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: quality !== 'low',
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, preset.maxPixelRatio));
  renderer.setSize(width, height, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 20);
  camera.position.set(0, 0.15, 4.3);

  const envMap = createEnvMap(renderer);
  scene.environment = envMap;

  // --- Fase 4 (parcial): iluminação de apoio -------------------------------
  scene.add(new THREE.AmbientLight(0x2a2f45, 0.6));
  const rim = new THREE.DirectionalLight(0x7fa8ff, 0.35);
  rim.position.set(-3, 2.5, -2);
  scene.add(rim);

  const coreLight = new THREE.PointLight(0xffb547, 1.8, 8, 2);
  coreLight.position.set(0, 0, 0);
  scene.add(coreLight);

  // --- Fase 1: geometria e materiais do totem de resina ---------------------
  const totemGroup = new THREE.Group();
  scene.add(totemGroup);

  const shellGeometry = new RoundedBoxGeometry(2.15, 2.15, 2.15, preset.boxSegments, 0.42);
  const shellMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf3f6ff,
    transparent: true,
    roughness: 0.06,
    metalness: 0,
    transmission: preset.transmission ? 1 : 0,
    opacity: preset.transmission ? 1 : 0.22,
    thickness: 0.9,
    ior: 1.45,
    clearcoat: 0.7,
    clearcoatRoughness: 0.12,
    attenuationColor: new THREE.Color(0xffcf8a),
    attenuationDistance: 2.2,
    envMap,
    envMapIntensity: 0.8,
  });
  const shell = new THREE.Mesh(shellGeometry, shellMaterial);
  totemGroup.add(shell);

  // Núcleo interno: toroide complexo que ancora o vórtice ao centro.
  const coreGeometry = new THREE.TorusKnotGeometry(0.34, 0.1, preset.coreSegments, 20, 2, 3);
  const coreMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a1806,
    emissive: 0xff9a2e,
    emissiveIntensity: 0.75,
    metalness: 0.4,
    roughness: 0.35,
    envMap,
    envMapIntensity: 0.6,
  });
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  totemGroup.add(core);

  // --- Fase 2: vórtice orbital de plasma/dados (partículas em shader) -------
  const particleCount = preset.particleCount;
  const positions = new Float32Array(particleCount * 3);
  const radii = new Float32Array(particleCount);
  const angles = new Float32Array(particleCount);
  const speeds = new Float32Array(particleCount);
  const tilts = new Float32Array(particleCount);
  const ellipses = new Float32Array(particleCount);
  const phases = new Float32Array(particleCount);
  const scales = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    radii[i] = randRange(0.55, 1.28);
    angles[i] = randRange(0, Math.PI * 2);
    speeds[i] = randRange(0.35, 1.15) * (Math.random() < 0.5 ? 1 : -1);
    tilts[i] = randRange(-0.9, 0.9);
    ellipses[i] = randRange(0.45, 1.0);
    phases[i] = randRange(0, Math.PI * 2);
    scales[i] = randRange(0.5, 1.6);
  }

  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1));
  particleGeometry.setAttribute('aAngle', new THREE.BufferAttribute(angles, 1));
  particleGeometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
  particleGeometry.setAttribute('aTilt', new THREE.BufferAttribute(tilts, 1));
  particleGeometry.setAttribute('aEllipse', new THREE.BufferAttribute(ellipses, 1));
  particleGeometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  particleGeometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

  const particleUniforms = {
    uTime: { value: 0 },
    uSpeed: { value: 0.6 },
    uSize: { value: quality === 'low' ? 9 : 11 },
    uPixelRatio: { value: renderer.getPixelRatio() },
    uNoiseStrength: { value: 0.12 },
    uColorCore: { value: colorCore },
    uColorEdge: { value: colorEdge },
  };

  const particleMaterial = new THREE.ShaderMaterial({
    vertexShader: vortexVertexShader,
    fragmentShader: vortexFragmentShader,
    uniforms: particleUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const vortex = new THREE.Points(particleGeometry, particleMaterial);
  totemGroup.add(vortex);

  // --- Fase 3: monograma "J6" central ---------------------------------------
  let textMesh: THREE.Mesh | null = null;
  const fontUrl = options.fontUrl ?? '/fonts/helvetiker_bold.typeface.json';
  loadFont(fontUrl)
    .then((font) => {
      const textGeometry = new TextGeometry('J6', {
        font,
        size: 0.62,
        depth: 0.16,
        curveSegments: 8,
        bevelEnabled: true,
        bevelThickness: 0.022,
        bevelSize: 0.016,
        bevelSegments: 3,
      });
      textGeometry.center();

      const textMaterial = new THREE.MeshStandardMaterial({
        color: 0x8a5a22,
        metalness: 0.92,
        roughness: 0.26,
        envMap,
        envMapIntensity: 1.1,
        emissive: 0x3a1f05,
        emissiveIntensity: 0.4,
      });

      textMesh = new THREE.Mesh(textGeometry, textMaterial);
      textMesh.position.z = 0.05;
      totemGroup.add(textMesh);
    })
    .catch(() => {
      // Falha silenciosa: o totem continua funcional (vórtice + resina) mesmo
      // se a fonte não puder ser carregada nesta sessão.
    });

  // --- Fase 4: pós-processamento (bloom) ------------------------------------
  let composer: EffectComposer | null = null;
  let bloomPass: UnrealBloomPass | null = null;
  if (bloomEnabled) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.45, 0.4, 0.58);
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
  }

  // --- Fase 5: loop de renderização -----------------------------------------
  const clock = new THREE.Clock();
  let activity = options.intensity ?? 0.15;
  let autoRotate = options.autoRotate ?? true;
  let interactive = options.interactive ?? false;
  let paused = false;
  let rafId = 0;

  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  function handlePointerMove(event: PointerEvent) {
    const rect = container.getBoundingClientRect();
    pointer.targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointer.targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
  }
  function handlePointerLeave() {
    pointer.targetX = 0;
    pointer.targetY = 0;
  }
  if (interactive) {
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerleave', handlePointerLeave);
  }

  function animate() {
    rafId = requestAnimationFrame(animate);
    if (paused) return;

    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.elapsedTime;

    // Rotação lenta e sutil do totem de resina (reflexos cambiantes).
    if (autoRotate) {
      totemGroup.rotation.y += dt * (0.12 + activity * 0.35);
      totemGroup.rotation.x = Math.sin(t * 0.15) * 0.06;
    }

    if (interactive) {
      pointer.x += (pointer.targetX - pointer.x) * 0.06;
      pointer.y += (pointer.targetY - pointer.y) * 0.06;
      totemGroup.rotation.y += pointer.x * 0.25 * dt * 6;
      totemGroup.rotation.x += -pointer.y * 0.18 * dt * 6;
    }

    core.rotation.y -= dt * (0.4 + activity * 0.6);
    core.rotation.x += dt * (0.25 + activity * 0.4);

    // Atualiza o tempo do shader do vórtice e sua velocidade orbital.
    particleUniforms.uTime.value = t;
    particleUniforms.uSpeed.value = 0.5 + activity * 1.6;

    // Pulso rítmico: luz central e bloom "respiram" com a atividade do agente.
    const pulse = Math.sin(t * (1.4 + activity * 2.2));
    coreLight.intensity = 1.6 + pulse * (0.4 + activity * 0.8);
    if (core.material instanceof THREE.MeshStandardMaterial) {
      core.material.emissiveIntensity = 0.6 + pulse * 0.18 + activity * 0.3;
    }
    if (bloomPass) {
      bloomPass.strength = 0.35 + Math.max(0, pulse) * 0.15 + activity * 0.25;
    }

    if (composer) {
      composer.render();
      if (bloomHealthChecks > 0) checkBloomHealth();
    } else {
      renderer.render(scene, camera);
    }
  }
  rafId = requestAnimationFrame(animate);

  // Salvaguarda: em GPUs/contextos que não suportam corretamente os render
  // targets HalfFloat que o UnrealBloomPass exige, o composite pode "estourar"
  // o quadro inteiro para branco. As bordas do quadro (onde a cena de fundo é
  // transparente) nunca deveriam saturar; se acontecer em alguns dos
  // primeiros quadros, desligamos o bloom e voltamos à renderização direta —
  // o totem continua visível, só perde o halo extra.
  let bloomHealthChecks = bloomPass ? 8 : 0;
  function checkBloomHealth() {
    bloomHealthChecks -= 1;
    if (!composer) return;
    try {
      const gl = renderer.getContext();
      const pxRatio = renderer.getPixelRatio();
      const bufW = Math.max(1, Math.floor(width * pxRatio));
      const bufH = Math.max(1, Math.floor(height * pxRatio));
      const corners: Array<[number, number]> = [
        [1, 1],
        [bufW - 2, 1],
        [1, bufH - 2],
        [bufW - 2, bufH - 2],
      ];
      const px = new Uint8Array(4);
      let blownCorners = 0;
      for (const [cx, cy] of corners) {
        gl.readPixels(Math.max(0, cx), Math.max(0, cy), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        if (px[0] > 248 && px[1] > 248 && px[2] > 248) blownCorners += 1;
      }
      if (blownCorners >= 2) {
        console.warn('J6Icon: pipeline de bloom produziu um quadro estourado neste dispositivo; desativando bloom.');
        composer.dispose();
        composer = null;
        bloomPass = null;
        bloomHealthChecks = 0;
      }
    } catch {
      // Leitura de pixels indisponível neste contexto — mantém o bloom ligado.
      bloomHealthChecks = 0;
    }
  }

  function setSize(w: number, h: number) {
    width = Math.max(1, w);
    height = Math.max(1, h);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    particleUniforms.uPixelRatio.value = renderer.getPixelRatio();
    if (composer) composer.setSize(width, height);
    if (bloomPass) bloomPass.setSize(width, height);
  }

  function dispose() {
    cancelAnimationFrame(rafId);
    if (interactive) {
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
    }
    shellGeometry.dispose();
    shellMaterial.dispose();
    coreGeometry.dispose();
    coreMaterial.dispose();
    particleGeometry.dispose();
    particleMaterial.dispose();
    if (textMesh) {
      textMesh.geometry.dispose();
      (textMesh.material as THREE.Material).dispose();
    }
    composer?.dispose();
    renderer.dispose();
    // renderer.dispose() não libera o contexto WebGL nativo por si só; sem
    // isto, montagens/desmontagens rápidas (StrictMode, trocas de variante)
    // esgotam o limite de contextos simultâneos do navegador.
    renderer.forceContextLoss();
    envMap.dispose();
    if (canvas.parentElement === container) {
      container.removeChild(canvas);
    }
  }

  return {
    canvas,
    setSize,
    setIntensity(level: number) {
      activity = THREE.MathUtils.clamp(level, 0, 1);
    },
    setInteractive(enabled: boolean) {
      if (enabled === interactive) return;
      interactive = enabled;
      if (interactive) {
        container.addEventListener('pointermove', handlePointerMove);
        container.addEventListener('pointerleave', handlePointerLeave);
      } else {
        container.removeEventListener('pointermove', handlePointerMove);
        container.removeEventListener('pointerleave', handlePointerLeave);
        pointer.targetX = 0;
        pointer.targetY = 0;
      }
    },
    setPaused(value: boolean) {
      paused = value;
    },
    dispose,
  };
}
