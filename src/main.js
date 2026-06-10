import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Pane } from "tweakpane";

// Scene 
const scene = new THREE.Scene();

// Texture Loader 
const textureLoader = new THREE.TextureLoader();

const sunTexture     = textureLoader.load('/textures/2k_sun.jpg');
const mercuryTexture = textureLoader.load('/textures/2k_mercury.jpg');
const venusTexture   = textureLoader.load('/textures/2k_venus_surface.jpg');
const earthTexture   = textureLoader.load('/textures/2k_earth_daymap.jpg');
const marsTexture    = textureLoader.load('/textures/2k_mars.jpg');
const moonTexture    = textureLoader.load('/textures/2k_moon.jpg');
const saturnTexture  = textureLoader.load('/textures/2k_saturn.jpg');
const saturnRingTex  = textureLoader.load('/textures/2k_saturn_ring_alpha.png');
const starsTexture   = textureLoader.load('/textures/2k_stars_milky_way.jpg');

// ── Background
scene.background = starsTexture;

//  Lights 
// Strong point light from sun
const sunLight = new THREE.PointLight(0xfff4e0, 6, 600);
scene.add(sunLight);
// Soft fill so dark sides arent pitch black
const ambientLight = new THREE.AmbientLight(0x404060, 1.2);
scene.add(ambientLight);

//  Sun 
const sphereGeo = new THREE.SphereGeometry(1, 64, 64);
const sun = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ map: sunTexture }));
sun.scale.setScalar(5);
scene.add(sun);

// Sun corona glow (sprite)
const spriteMat = new THREE.SpriteMaterial({
  map: (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(128,128,10,128,128,128);
    g.addColorStop(0,   'rgba(255,220,80,0.6)');
    g.addColorStop(0.4, 'rgba(255,160,20,0.2)');
    g.addColorStop(1,   'rgba(255,100,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,256,256);
    return new THREE.CanvasTexture(c);
  })(),
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const corona = new THREE.Sprite(spriteMat);
corona.scale.setScalar(22);
scene.add(corona);

//  Orbit ring helper
function createOrbitRing(distance) {
  const pts = [];
  for (let i = 0; i <= 256; i++) {
    const a = (i / 256) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * distance, 0, Math.sin(a) * distance));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ color: 0x8888aa, transparent: true, opacity: 0.25 });
  return new THREE.LineLoop(geo, mat);
}

//  Planet data 
const moonMat = new THREE.MeshBasicMaterial({ map: moonTexture });

const planets = [
  {
    name: "Mercury", radius: 0.38, distance: 8, speed: 0.047,
    material: new THREE.MeshBasicMaterial({ map: mercuryTexture }),
    moons: [],
    info: "Closest to Sun • No atmosphere",
  },
  {
    name: "Venus", radius: 0.95, distance: 13, speed: 0.035,
    material: new THREE.MeshBasicMaterial({ map: venusTexture }),
    moons: [],
    info: "Hottest planet • Toxic clouds",
  },
  {
    name: "Earth", radius: 1, distance: 18, speed: 0.029,
    material: new THREE.MeshBasicMaterial({ map: earthTexture }),
    moons: [{ name: "Moon", radius: 0.27, distance: 2.5, speed: 0.074 }],
    info: "Home • 1 Moon • Liquid water",
  },
  {
    name: "Mars", radius: 0.53, distance: 25, speed: 0.024,
    material: new THREE.MeshBasicMaterial({ map: marsTexture }),
    moons: [
      { name: "Phobos", radius: 0.08, distance: 1.5, speed: 0.09 },
      { name: "Deimos", radius: 0.05, distance: 2.2, speed: 0.06 },
    ],
    info: "Red Planet • 2 Moons • Olympus Mons",
  },
  {
    name: "Saturn", radius: 1.8, distance: 38, speed: 0.009,
    material: new THREE.MeshBasicMaterial({ map: saturnTexture }),
    moons: [{ name: "Titan", radius: 0.4, distance: 5.5, speed: 0.03 }],
    info: "Ring system • 146 Moons • Gas giant",
    hasRing: true,
  },
];

//  Build planets 
const orbitRings = [];
const pivots = [];

planets.forEach((planet) => {
  const ring = createOrbitRing(planet.distance);
  scene.add(ring);
  orbitRings.push(ring);

  const pivot = new THREE.Object3D();
  scene.add(pivot);

  const mesh = new THREE.Mesh(sphereGeo, planet.material);
  mesh.scale.setScalar(planet.radius);
  mesh.position.x = planet.distance;
  mesh.userData = { name: planet.name, info: planet.info };
  pivot.add(mesh);

  // Saturn ring
  if (planet.hasRing) {
    const ringGeo = new THREE.RingGeometry(planet.radius * 1.4, planet.radius * 2.4, 128);
    // UV fix for ring texture
    const pos = ringGeo.attributes.position;
    const uv  = ringGeo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const r = Math.sqrt(pos.getX(i)**2 + pos.getZ(i)**2);
      const t = (r - planet.radius * 1.4) / (planet.radius);
      uv.setXY(i, t, 0);
    }
    const ringMat = new THREE.MeshBasicMaterial({
      map: saturnRingTex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2.2;
    mesh.add(ringMesh);
  }

  // Moons
  planet.moons.forEach((moon) => {
    const moonPivot = new THREE.Object3D();
    mesh.add(moonPivot);
    const moonMesh = new THREE.Mesh(sphereGeo, moonMat);
    moonMesh.scale.setScalar(moon.radius);
    moonMesh.position.x = moon.distance;
    moonPivot.add(moonMesh);
    mesh.userData[moon.name + '_pivot'] = moonPivot;
    mesh.userData[moon.name + '_speed'] = moon.speed;
  });

  pivots.push({ pivot, planet, planetMesh: mesh });
});

//  Camera 
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 35, 85);

// Renderer
const canvas = document.querySelector('canvas.threejs');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));


const clock = new THREE.Clock();

//  Controls 
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxDistance = 300;
controls.minDistance = 6;

//Tweakpane 
const pane = new Pane({ title: '🪐 Solar System' });
const settings = { speed: 1.0, showOrbits: true, autoRotate: false };
pane.addBinding(settings, 'speed',      { min: 0, max: 8, step: 0.1, label: 'Speed' });
pane.addBinding(settings, 'showOrbits', { label: 'Show Orbits' });
pane.addBinding(settings, 'autoRotate', { label: 'Auto Rotate' });

// Sync showOrbits toggle
pane.on('change', () => {
  orbitRings.forEach(r => r.visible = settings.showOrbits);
  controls.autoRotate = settings.autoRotate;
});

//  Info Card 
const card = document.createElement('div');
card.style.cssText = `
  position:fixed; bottom:28px; left:28px;
  background:rgba(2,4,20,0.82);
  backdrop-filter:blur(14px);
  border:1px solid rgba(120,160,255,0.25);
  border-radius:16px; padding:16px 22px;
  color:#e8eeff; font-family:'Segoe UI',sans-serif;
  font-size:15px; min-width:200px;
  pointer-events:none; opacity:0;
  transition:opacity 0.35s, transform 0.35s;
  transform:translateY(8px);
  line-height:1.8; box-shadow:0 8px 32px rgba(0,0,0,0.5);
`;
document.body.appendChild(card);

// Raycaster (click planet) 
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hideTimer;

window.addEventListener('click', (e) => {
  mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const meshes = pivots.map(p => p.planetMesh);
  const hits = raycaster.intersectObjects(meshes, true);
  if (hits.length) {
    const d = hits[0].object.userData;
    const name = d.name || hits[0].object.parent?.userData?.name;
    const info = d.info || '';
    if (name) {
      card.innerHTML = `<strong style="font-size:17px">🌍 ${name}</strong><br><span style="color:#aac4ff;font-size:13px">${info}</span>`;
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(8px)';
      }, 4000);
    }
  }
});

//  Resize 
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render Loop 

const renderloop = () => {
  const delta = clock.getDelta();
  const s = settings.speed;

  sun.rotation.y += delta * 0.05;

  pivots.forEach(({ pivot, planet, planetMesh }) => {
    pivot.rotation.y   += planet.speed * s * delta * 10;
    planetMesh.rotation.y += delta * s * 0.4;

    planet.moons.forEach((moon) => {
      const mp = planetMesh.userData[moon.name + '_pivot'];
      if (mp) mp.rotation.y += moon.speed * s * delta * 10;
    });
  });

  controls.update();
  renderer.render(scene, camera);
  window.requestAnimationFrame(renderloop);
};

renderloop();