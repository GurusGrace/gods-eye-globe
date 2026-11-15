/* The exact dawn of globeIntro.js, ported to MapLibre's world.
 *
 * The Cesium post-process ray-cast a unit sphere with the camera frustum and
 * blended NASA Black Marble city lights into NASA clouds along a light front
 * that rises from Harmandir Sahib. In MapLibre globe mode the transform's
 * camera helpers already speak unit-sphere space (cameraPosition magnitude 1.0
 * at ground level, proven by probe), so the port keeps the shader verbatim and
 * rebuilds only the camera basis from lng/lat/bearing/pitch/fov.
 */
import * as THREE from 'three';

const VERT = `
precision highp float;
in vec3 position;   // three.PlaneGeometry supplies position; raw material, no auto declarations
out vec2 v_p;
void main() { v_p = position.xy; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
in vec2 v_p;
out vec4 outColor;

uniform sampler2D nightTexture;
uniform sampler2D cloudTexture;
uniform vec3 u_camPos;
uniform vec3 u_fwd;
uniform vec3 u_right;
uniform vec3 u_up;
uniform vec3 u_src;
uniform float u_front;
uniform float u_soft;
uniform float u_dark;
uniform float u_clouds;
uniform float u_seed;
uniform float u_tanX;
uniform float u_tanY;

const vec3 DAWN = vec3(1.0, 0.70, 0.34);
const vec3 DUSK = vec3(0.16, 0.20, 0.42);

vec2 equirect(vec3 n) {
  float lon = atan(n.y, n.x);
  float lat = asin(clamp(n.z, -1.0, 1.0));
  return vec2(fract(lon / 6.28318530718 + 0.5), clamp(lat / 3.14159265359 + 0.5, 0.001, 0.999));
}

float litAt(float ang) {
  return 1.0 - smoothstep(u_front - u_soft, u_front + u_soft * 0.35, ang);
}

void main() {
  vec3 dir = normalize(u_fwd + v_p.x * u_tanX * u_right + v_p.y * u_tanY * u_up);
  vec3 o = u_camPos;
  float b = dot(o, dir);
  float c = dot(o, o) - 1.0;
  float disc = b * b - c;
  vec3 col = vec3(0.0);
  float alpha = 0.0;

  if (disc > 0.0 && (-b - sqrt(disc)) > 0.0) {
    vec3 n = normalize(o + (-b - sqrt(disc)) * dir);
    float ang = acos(clamp(dot(n, u_src), -1.0, 1.0));
    float lit = litAt(ang);
    float band = exp(-pow((ang - u_front) / max(u_soft, 1e-3), 2.0));
    float twi = exp(-pow((ang - u_front - u_soft * 0.9) / max(u_soft * 1.3, 1e-3), 2.0));
    float rim = pow(1.0 - clamp(dot(n, -dir), 0.0, 1.0), 3.0);
    vec2 uv = equirect(n);
    float cloud = smoothstep(0.16, 0.86, texture(cloudTexture, uv).r) * u_clouds;
    vec3 city = pow(texture(nightTexture, uv).rgb, vec3(1.7));

    // NIGHT SIDE painted opaque: Black Marble city lights, the Cesium blend
    // (that post-process replaced the frame, so night WAS the picture there).
    vec3 night = vec3(0.010, 0.016, 0.034);
    night += city * vec3(1.0, 0.80, 0.52) * 1.55 * (1.0 - cloud * 0.8);
    night = mix(night, vec3(0.035, 0.04, 0.055), cloud * 0.5);
    night += DUSK * twi * (0.35 + 0.4 * rim);
    float aNight = u_dark * (1.0 - lit);

    // DAY SIDE transparent: the real satellite imagery through, warmed by the
    // dawn band exactly as colorTexture did under the original shader.
    float aBand = band * (0.55 + 0.35 * rim) * u_dark;
    vec3 bandCol = mix(DAWN, vec3(1.0, 0.92, 0.75), band * 0.6);

    float aSeed = u_seed * exp(-pow(ang / 0.05, 2.0));
    vec3 seedCol = vec3(1.0, 0.86, 0.58);

    float sum = aNight + aBand * (1.0 - aNight) + aSeed;
    alpha = min(1.0, sum);
    vec3 weighted = night * aNight + bandCol * aBand * (1.0 - aNight) + seedCol * aSeed;
    col = sum > 1e-4 ? weighted / sum : vec3(0.0);
  } else {
    // Halo and off-disc spill: icons drawn past the limb stay in the night.
    float tc = -b;
    if (tc > 0.0) {
      vec3 q = o + tc * dir;
      float r = length(q);
      float halo = 1.0 - smoothstep(1.0, 1.07, r);
      float shade = 1.0 - smoothstep(1.10, 1.30, r);
      if (shade > 0.0 || halo > 0.0) {
        float ang = acos(clamp(dot(normalize(q), u_src), -1.0, 1.0));
        float band = exp(-pow((ang - u_front) / max(u_soft, 1e-3), 2.0));
        float k = 1.0 - u_dark * (1.0 - litAt(ang)) * shade;
        col = vec3(0.008, 0.012, 0.026) * k;
        col += DAWN * band * 0.30 * halo * u_dark;
        alpha = max(shade * u_dark * 0.92, halo * 0.5 * u_dark);
      }
    }
  }
  outColor = vec4(clamp(col, 0.0, 1.0), clamp(alpha, 0.0, 1.0));
}
`;

/**
 * @param {HTMLElement} container positioned over the map canvas
 * @param {{night: string, clouds: string}} urls manifest texture paths
 * @param {{fov: number}} opts MapLibre camera fov (degrees)
 */
export function createDawnLayer(container, urls, { fov = 36.87 } = {}) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, autoClear: true });
  renderer.setClearAlpha(0);
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
  container.appendChild(renderer.domElement);

  const loader = new THREE.TextureLoader();
  const night = loader.load(urls.night);
  const clouds = loader.load(urls.clouds);
  for (const t of [night, clouds]) { t.flipY = true; t.colorSpace = THREE.SRGBColorSpace; }

  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const material = new THREE.RawShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    glslVersion: THREE.GLSL3,   // both stages are written GLSL3 (in/out/texture)
    transparent: true,
    depthTest: false,
    uniforms: {
      nightTexture: { value: night },
      cloudTexture: { value: clouds },
      u_camPos: { value: new THREE.Vector3() },
      u_fwd: { value: new THREE.Vector3(0, 0, -1) },
      u_right: { value: new THREE.Vector3(1, 0, 0) },
      u_up: { value: new THREE.Vector3(0, 1, 0) },
      u_src: { value: new THREE.Vector3() },
      u_front: { value: 0 },
      u_soft: { value: 0.16 },
      u_dark: { value: 1 },
      u_clouds: { value: 0.9 },
      u_seed: { value: 0.25 },
      u_tanX: { value: 1 },
      u_tanY: { value: 1 },
    },
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  scene.add(quad);

  const resize = () => {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    /* The dawn is a soft light front, not artwork: rendering it at a
     * fraction of the display resolution is invisible and cuts the fragment
     * cost by the same factor. At full resolution it ran at well under one
     * frame per second on a shared-memory GPU, which stretched the 8 second
     * intro into a minute and a half of frozen screen. */
    const scale = 0.5;
    renderer.setSize(Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale)), false);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  const DAWN_LON = (74.8765 * Math.PI) / 180, DAWN_LAT = (31.62 * Math.PI) / 180;
  const src = new THREE.Vector3(
    Math.cos(DAWN_LAT) * Math.cos(DAWN_LON),
    Math.cos(DAWN_LAT) * Math.sin(DAWN_LON),
    Math.sin(DAWN_LAT),
  );
  material.uniforms.u_src.value.copy(src);

  const update = (cameraInfo) => {
    const u = material.uniforms;
    // MapLibre globe space: unit sphere, cameraPosition magnitude ~1 on ground.
    u.u_camPos.value.copy(cameraInfo.camPos);
    u.u_fwd.value.copy(cameraInfo.fwd);
    u.u_right.value.copy(cameraInfo.right);
    u.u_up.value.copy(cameraInfo.up);
    u.u_tanX.value = cameraInfo.tanX;
    u.u_tanY.value = cameraInfo.tanY;
  };

  const render = () => renderer.render(scene, cam);

  return {
    update,
    render,
    uniforms: material.uniforms,
    resize,
    dispose() { ro.disconnect(); quad.geometry.dispose(); material.dispose(); renderer.dispose(); renderer.domElement.remove(); },
  };
}
