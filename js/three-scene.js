/**
 * APEX KINETICS | THREE.JS 3D ENGINE & SCENE CONTROLLER
 * High-performance WebGL 3D experience with procedural gym equipment,
 * interactive exploded views, scroll-tied camera choreography, and particle atmospheric effects.
 */

(function () {
  'use strict';

  // --- GLOBAL 3D ENGINE STATE ---
  const state = {
    currentModel: 'barbell',     // 'barbell' | 'dumbbell' | 'kettlebell' | 'biomech' | 'rings'
    currentMaterial: 'chrome',   // 'chrome' | 'obsidian' | 'volt' | 'cyan'
    currentLighting: 'cyber',    // 'cyber' | 'studio' | 'ember'
    isExploded: false,
    explodeProgress: 0,          // 0 (assembled) to 1 (fully exploded)
    autoRotate: true,
    scrollProgress: 0,
    targetScrollProgress: 0,
    mouse: { x: 0, y: 0, targetX: 0, targetY: 0 },
    orbitEnabled: false,
    isDumbbellLifted: false,
    liftLerp: 0,
    dumbbellWeight: '50'
  };

  // --- THREE.JS OBJECT REFERENCES ---
  let scene, camera, renderer, controls;
  let modelGroup, particlesGroup, ringsGroup;
  let gymEnvGroup, gymSpotlight1, gymSpotlight2;
  let barbellModel, dumbbellModel, kettlebellModel, biomechModel, calisthenicsModel;
  let primaryDumbbellGroup, companionDumbbellGroup, dumbbellRackGroup;
  let dumbbellHeads = [];
  let dumbbellWeightBadges = [];
  let ambientLight, keyLight, fillLight, rimLight, mouseLight;
  let explodedParts = []; // Active model's exploded parts
  let barbellExplodedParts = [];
  let dumbbellExplodedParts = [];
  let ringsExplodedParts = [];

  // Canvas container
  const container = document.getElementById('webgl-container');
  const canvas = document.getElementById('three-canvas');

  // Audio synthesizer for gym equipment clinks & plate sounds
  let sfxAudioCtx = null;
  function playMetallicClink(freq = 600) {
    try {
      if (!sfxAudioCtx) {
        sfxAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (sfxAudioCtx.state === 'suspended') {
        sfxAudioCtx.resume();
      }
      const osc = sfxAudioCtx.createOscillator();
      const gain = sfxAudioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, sfxAudioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, sfxAudioCtx.currentTime + 0.16);
      gain.gain.setValueAtTime(0.06, sfxAudioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, sfxAudioCtx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(sfxAudioCtx.destination);
      osc.start();
      osc.stop(sfxAudioCtx.currentTime + 0.16);
    } catch (e) {}
  }

  // --- INITIALIZATION ---
  function init() {
    if (!window.THREE) {
      console.error('Three.js library is not loaded');
      return;
    }

    // 1. Scene setup
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.038);

    // 2. Camera setup
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    camera.position.set(0, 0.5, 6.5);

    // 3. Renderer setup
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. OrbitControls (for interactive inspection mode)
    if (window.THREE.OrbitControls) {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.maxDistance = 14;
      controls.minDistance = 2.5;
      controls.enablePan = true;
      controls.enabled = false; // Disabled by default, enabled in 3D orbit mode
    }

    // 5. Lighting Setup
    setupLighting();

    // 6. Build Scene Hierarchy
    modelGroup = new THREE.Group();
    scene.add(modelGroup);

    // Build Gym Arena Environment (Interlocking rubber floor, overhead trusses & stadium spots)
    buildGymEnvironment();

    // Build Procedural 3D Gym Models
    buildBarbell();
    buildDumbbell();
    buildKettlebell();
    buildBiomechCore();
    buildCalisthenicsRings();

    // Set initial model visibility
    showModel('barbell');

    // Build Ambient Particle System & Neon Energy Rings
    buildParticles();
    buildEnergyRings();

    // 7. Event Listeners
    setupEventListeners();

    // 8. Start Animation Loop
    animate();
  }

  // --- LIGHTING SETUP ---
  function setupLighting() {
    ambientLight = new THREE.AmbientLight(0x0d1117, 1.4);
    scene.add(ambientLight);

    // Key Light (Main white specular source)
    keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(5, 8, 5);
    scene.add(keyLight);

    // Fill Light (Electric Volt / Lime)
    fillLight = new THREE.DirectionalLight(0xc6ff00, 1.8);
    fillLight.position.set(-6, -2, -4);
    scene.add(fillLight);

    // Rim Light (Cyber Cyan)
    rimLight = new THREE.DirectionalLight(0x00f0ff, 2.2);
    rimLight.position.set(0, -5, -6);
    scene.add(rimLight);

    // Overhead Gym Arena Spotlights (create authentic gym light pools)
    gymSpotlight1 = new THREE.SpotLight(0xd4ff00, 2.6, 18, Math.PI / 4.5, 0.45, 1.1);
    gymSpotlight1.position.set(-2.6, 4.5, 2.0);
    gymSpotlight1.target.position.set(0, -1.0, 0);
    scene.add(gymSpotlight1);
    scene.add(gymSpotlight1.target);

    gymSpotlight2 = new THREE.SpotLight(0x00f5ff, 2.2, 18, Math.PI / 4.5, 0.45, 1.1);
    gymSpotlight2.position.set(2.6, 4.5, 2.0);
    gymSpotlight2.target.position.set(0, -1.0, 0);
    scene.add(gymSpotlight2);
    scene.add(gymSpotlight2.target);

    // Interactive Mouse Point Light (casts dynamic sheen on weights)
    mouseLight = new THREE.PointLight(0xc6ff00, 1.5, 12);
    mouseLight.position.set(0, 0, 3);
    scene.add(mouseLight);
  }

  // --- PROCEDURAL TEXTURES GENERATOR ---
  function createPlateTexture(weightText, subText, colorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Background circle
    ctx.fillStyle = colorHex;
    ctx.fillRect(0, 0, 512, 512);

    // Concentric bevel rings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(256, 256, 230, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(256, 256, 205, 0, Math.PI * 2);
    ctx.stroke();

    // Center hub border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(256, 256, 70, 0, Math.PI * 2);
    ctx.stroke();

    // Text: "FORGE" along top arc
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FORGE', 256, 85);

    // Weight Text (e.g., "25 KG") in middle
    ctx.font = 'bold 54px Syne, sans-serif';
    ctx.fillText(weightText, 256, 175);

    // Subtext: "IWF COMPETITION" along bottom
    ctx.font = '600 24px Space Grotesk, monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText(subText || 'CALIBRATED OLYMPIC', 256, 425);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  function createGymFloorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Deep matte charcoal rubber base
    ctx.fillStyle = '#0f1115';
    ctx.fillRect(0, 0, 1024, 1024);

    // Subtle rubber speckled flecks (authentic gym flooring EPDM flecks)
    for (let i = 0; i < 5000; i++) {
      const rx = Math.random() * 1024;
      const ry = Math.random() * 1024;
      const r = Math.random() * 2.2 + 0.6;
      const randColor = Math.random();
      if (randColor > 0.88) {
        ctx.fillStyle = 'rgba(212, 255, 0, 0.45)'; // Volt flecks
      } else if (randColor > 0.70) {
        ctx.fillStyle = 'rgba(0, 240, 255, 0.35)'; // Cyan flecks
      } else if (randColor > 0.40) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.22)'; // White/grey flecks
      } else {
        ctx.fillStyle = 'rgba(48, 54, 65, 0.4)'; // Charcoal flecks
      }
      ctx.beginPath();
      ctx.arc(rx, ry, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Interlocking tile grid seams (512x512 grid)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.88)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(512, 0); ctx.lineTo(512, 1024);
    ctx.moveTo(0, 512); ctx.lineTo(1024, 512);
    ctx.stroke();

    // Subtle chalk dust marking scuff
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.arc(420, 480, 140, 0.3, 1.6);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
  }

  function createDumbbellBadgeTexture(weightText, subText) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Deep obsidian background
    ctx.fillStyle = '#090c10';
    ctx.fillRect(0, 0, 512, 512);

    // Outer machined chamfer ring
    ctx.strokeStyle = '#272c35';
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.arc(256, 256, 234, 0, Math.PI * 2);
    ctx.stroke();

    // Electric Volt precision indicator ring
    ctx.strokeStyle = '#d4ff00';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(256, 256, 212, 0, Math.PI * 2);
    ctx.stroke();

    // Inner bevel circle
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(256, 256, 172, 0, Math.PI * 2);
    ctx.stroke();

    // Brand "FORGE PRO"
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 44px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FORGE PRO', 256, 115);

    // Large weight text (e.g. "50 LBS")
    ctx.fillStyle = '#d4ff00';
    ctx.font = 'bold 74px Syne, sans-serif';
    ctx.fillText(weightText, 256, 256);

    // Subtext
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.font = '600 24px Space Grotesk, monospace';
    ctx.fillText(subText || 'COMMERCIAL URETHANE', 256, 385);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  // --- GYM ARENA ENVIRONMENT ---
  function buildGymEnvironment() {
    gymEnvGroup = new THREE.Group();
    gymEnvGroup.name = 'gym-environment';

    // 1. Heavy-Duty Vulcanized Rubber Gym Flooring (Seamed tiles with chalk & flecks)
    const floorGeo = new THREE.PlaneGeometry(36, 36);
    const floorTex = createGymFloorTexture();
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.85,
      metalness: 0.1
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -1.82;
    floorMesh.receiveShadow = true;
    gymEnvGroup.add(floorMesh);

    // 2. Heavy Steel Power Rack / Rig Silhouette in Background
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x14171d,
      roughness: 0.55,
      metalness: 0.85
    });
    const voltAccentMat = new THREE.MeshStandardMaterial({
      color: 0xd4ff00,
      roughness: 0.3,
      metalness: 0.7,
      emissive: 0xd4ff00,
      emissiveIntensity: 0.15
    });

    const rackGroup = new THREE.Group();
    rackGroup.position.set(0, -1.82, -4.8);

    // 4 Upright Columns (Heavy 3x3" Steel Tubing)
    const uprightGeo = new THREE.BoxGeometry(0.18, 5.2, 0.18);
    [-2.8, 2.8].forEach(x => {
      [-0.9, 0.9].forEach(z => {
        const upright = new THREE.Mesh(uprightGeo, steelMat);
        upright.position.set(x, 2.6, z);
        rackGroup.add(upright);
      });

      // Top Crossmembers (Connecting front and back uprights)
      const depthCrossGeo = new THREE.BoxGeometry(0.16, 0.16, 1.9);
      const depthCross = new THREE.Mesh(depthCrossGeo, steelMat);
      depthCross.position.set(x, 5.1, 0);
      rackGroup.add(depthCross);

      // Base Stabilizer Feet
      const footGeo = new THREE.BoxGeometry(0.24, 0.12, 2.4);
      const foot = new THREE.Mesh(footGeo, steelMat);
      foot.position.set(x, 0.06, 0);
      rackGroup.add(foot);
    });

    // Multi-Grip Chin-Up Crossbar across front
    const chinBarGeo = new THREE.CylinderGeometry(0.04, 0.04, 5.6, 24);
    chinBarGeo.rotateZ(Math.PI / 2);
    const chinBar = new THREE.Mesh(chinBarGeo, getMaterial('steel', 'chrome'));
    chinBar.position.set(0, 5.0, 0.9);
    rackGroup.add(chinBar);

    // Rear top Crossmember with FORGE laser-cut logo plate
    const rearCrossGeo = new THREE.BoxGeometry(5.6, 0.35, 0.06);
    const rearCross = new THREE.Mesh(rearCrossGeo, steelMat);
    rearCross.position.set(0, 4.95, -0.9);
    rackGroup.add(rearCross);

    // J-Hooks on Front Uprights
    [-2.8, 2.8].forEach(x => {
      const jHookGeo = new THREE.BoxGeometry(0.12, 0.22, 0.28);
      const jHook = new THREE.Mesh(jHookGeo, voltAccentMat);
      jHook.position.set(x, 2.4, 0.9 + 0.14);
      rackGroup.add(jHook);
    });

    gymEnvGroup.add(rackGroup);

    // 3. Industrial Overhead Structural Trusses & Stadium Light Rigging
    const trussMat = new THREE.MeshStandardMaterial({
      color: 0x1d2129,
      metalness: 0.9,
      roughness: 0.35
    });

    const trussGroup = new THREE.Group();
    trussGroup.position.set(0, 4.4, 0);

    // Two parallel longitudinal beam trusses
    [-2.6, 2.6].forEach(x => {
      const beamGeo = new THREE.BoxGeometry(0.15, 0.2, 16);
      const beam = new THREE.Mesh(beamGeo, trussMat);
      beam.position.set(x, 0, 0);
      trussGroup.add(beam);

      // Hanging Stadium Downlight Housing
      const spotHousingGeo = new THREE.CylinderGeometry(0.22, 0.32, 0.45, 16);
      const spotHousing = new THREE.Mesh(spotHousingGeo, steelMat);
      spotHousing.position.set(x, -0.3, 2.0);
      trussGroup.add(spotHousing);

      // LED glowing lens
      const lensGeo = new THREE.CircleGeometry(0.28, 16);
      const lensMat = new THREE.MeshBasicMaterial({
        color: x < 0 ? 0xd4ff00 : 0x00f5ff
      });
      const lens = new THREE.Mesh(lensGeo, lensMat);
      lens.rotation.x = Math.PI / 2;
      lens.position.set(x, -0.53, 2.0);
      trussGroup.add(lens);
    });

    // Cross brace tubes
    for (let z = -6; z <= 6; z += 3) {
      const crossGeo = new THREE.CylinderGeometry(0.04, 0.04, 5.2, 16);
      crossGeo.rotateZ(Math.PI / 2);
      const cross = new THREE.Mesh(crossGeo, trussMat);
      cross.position.set(0, 0, z);
      trussGroup.add(cross);
    }

    gymEnvGroup.add(trussGroup);

    scene.add(gymEnvGroup);
  }

  // --- MATERIAL FACTORY ---
  function getMaterial(type, finish) {
    finish = finish || state.currentMaterial;

    let metalness = 0.9;
    let roughness = 0.2;
    let color = 0xd4d4d8;

    switch (finish) {
      case 'obsidian':
        color = 0x18181b;
        metalness = 0.7;
        roughness = 0.35;
        break;
      case 'volt':
        color = 0xc6ff00;
        metalness = 0.5;
        roughness = 0.25;
        break;
      case 'cyan':
        color = 0x00f0ff;
        metalness = 0.6;
        roughness = 0.2;
        break;
      case 'chrome':
      default:
        color = 0xe4e4e7;
        metalness = 0.95;
        roughness = 0.15;
        break;
    }

    if (type === 'steel') {
      return new THREE.MeshStandardMaterial({
        color: color,
        metalness: metalness,
        roughness: roughness,
        envMapIntensity: 1.5
      });
    }

    if (type === 'matte-rubber') {
      return new THREE.MeshStandardMaterial({
        color: 0x18181b,
        metalness: 0.15,
        roughness: 0.75
      });
    }

    if (type === 'gold-collar') {
      return new THREE.MeshStandardMaterial({
        color: 0xeab308,
        metalness: 0.95,
        roughness: 0.2
      });
    }

    return new THREE.MeshStandardMaterial({
      color: color,
      metalness: metalness,
      roughness: roughness
    });
  }

  // --- 1. BUILD OLYMPIC BARBELL ---
  function buildBarbell() {
    barbellModel = new THREE.Group();
    barbellModel.name = 'barbell';
    barbellExplodedParts = [];

    const barMat = getMaterial('steel', 'chrome');

    // 1. Central Knurled Bar (Standard 2.2m Olympic bar scaled to 3D units)
    const barGeo = new THREE.CylinderGeometry(0.045, 0.045, 4.4, 32);
    barGeo.rotateZ(Math.PI / 2);
    const barMesh = new THREE.Mesh(barGeo, barMat);
    barbellModel.add(barMesh);

    // Grip rings / Knurl separators
    const ringGeo = new THREE.TorusGeometry(0.048, 0.005, 16, 32);
    ringGeo.rotateY(Math.PI / 2);
    [-0.4, -0.9, 0.4, 0.9].forEach(posX => {
      const ring = new THREE.Mesh(ringGeo, barMat);
      ring.position.x = posX;
      barbellModel.add(ring);
    });

    // 2. Rotating Sleeves (Thicker outer cylinder for plates)
    const sleeveGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.05, 32);
    sleeveGeo.rotateZ(Math.PI / 2);

    const leftSleeve = new THREE.Mesh(sleeveGeo, barMat);
    leftSleeve.position.x = -1.65;
    barbellModel.add(leftSleeve);

    const rightSleeve = new THREE.Mesh(sleeveGeo, barMat);
    rightSleeve.position.x = 1.65;
    barbellModel.add(rightSleeve);

    // Inner sleeve collars (stoppers)
    const collarGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.06, 32);
    collarGeo.rotateZ(Math.PI / 2);

    const leftCollar = new THREE.Mesh(collarGeo, getMaterial('steel', 'obsidian'));
    leftCollar.position.x = -1.15;
    barbellModel.add(leftCollar);

    const rightCollar = new THREE.Mesh(collarGeo, getMaterial('steel', 'obsidian'));
    rightCollar.position.x = 1.15;
    barbellModel.add(rightCollar);

    // 3. Calibrated Competition Bumper Plates
    const plateConfigs = [
      { weight: '25 KG', radius: 0.65, thickness: 0.11, color: '#dc2626', offset: 0.08, explodeDist: 0.25 },
      { weight: '20 KG', radius: 0.65, thickness: 0.09, color: '#2563eb', offset: 0.20, explodeDist: 0.55 },
      { weight: '15 KG', radius: 0.60, thickness: 0.08, color: '#ca8a04', offset: 0.30, explodeDist: 0.85 }
    ];

    [-1, 1].forEach(side => {
      plateConfigs.forEach((cfg) => {
        const plateGeo = new THREE.CylinderGeometry(cfg.radius, cfg.radius, cfg.thickness, 48);
        plateGeo.rotateZ(Math.PI / 2);

        // Texture for plate face
        const plateTex = createPlateTexture(cfg.weight, 'FORGE CALIBRATED', cfg.color);
        const faceMat = new THREE.MeshStandardMaterial({
          map: plateTex,
          metalness: 0.35,
          roughness: 0.45
        });
        const edgeMat = new THREE.MeshStandardMaterial({
          color: cfg.color,
          metalness: 0.4,
          roughness: 0.5
        });

        const materials = [edgeMat, faceMat, faceMat];
        const plateMesh = new THREE.Mesh(plateGeo, materials);

        const initialX = side * (1.22 + cfg.offset);
        plateMesh.position.x = initialX;
        barbellModel.add(plateMesh);

        barbellExplodedParts.push({
          mesh: plateMesh,
          initialX: initialX,
          explodeOffset: side * cfg.explodeDist
        });
      });

      // Quick-release Olympic Clamp Collar on outer ends
      const clampGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.07, 32);
      clampGeo.rotateZ(Math.PI / 2);
      const clampMesh = new THREE.Mesh(clampGeo, getMaterial('gold-collar'));
      const clampInitialX = side * 1.62;
      clampMesh.position.x = clampInitialX;
      barbellModel.add(clampMesh);

      barbellExplodedParts.push({
        mesh: clampMesh,
        initialX: clampInitialX,
        explodeOffset: side * 1.2
      });
    });

    // Default angle for dramatic hero presentation
    barbellModel.rotation.set(0.2, -0.4, 0.25);
    modelGroup.add(barbellModel);
  }

  // --- 2. BUILD COMMERCIAL DUMBBELL STATION (Saddle Rack + Matching Pair) ---
  function buildDumbbell() {
    dumbbellModel = new THREE.Group();
    dumbbellModel.name = 'dumbbell';
    dumbbellExplodedParts = [];
    dumbbellHeads = [];
    dumbbellWeightBadges = [];

    const steelRackMat = new THREE.MeshStandardMaterial({
      color: 0x171920,
      metalness: 0.85,
      roughness: 0.45
    });
    const voltMat = getMaterial('steel', 'volt');
    const handleMat = getMaterial('steel', 'chrome');
    const headMat = getMaterial('steel', 'obsidian');
    const saddleMat = new THREE.MeshStandardMaterial({
      color: 0x0f1115,
      roughness: 0.78,
      metalness: 0.15
    });

    // --- A. HEAVY STEEL COMMERCIAL SADDLE RACK ---
    dumbbellRackGroup = new THREE.Group();
    dumbbellRackGroup.name = 'dumbbell-rack';

    // 1. Dual Angled Support Legs (Steel upright columns)
    [-1.0, 1.0].forEach(x => {
      const legGeo = new THREE.BoxGeometry(0.12, 1.45, 0.12);
      const legMesh = new THREE.Mesh(legGeo, steelRackMat);
      legMesh.position.set(x, -1.05, -0.1);
      legMesh.rotation.x = -0.15; // angled rearward
      dumbbellRackGroup.add(legMesh);

      // Floor Stabilizer Foot with Rubber End Caps
      const footGeo = new THREE.BoxGeometry(0.16, 0.08, 1.45);
      const footMesh = new THREE.Mesh(footGeo, steelRackMat);
      footMesh.position.set(x, -1.78, 0);
      dumbbellRackGroup.add(footMesh);

      // Rubber floor pads on ends of feet
      [-0.68, 0.68].forEach(fz => {
        const padGeo = new THREE.BoxGeometry(0.18, 0.09, 0.12);
        const padMesh = new THREE.Mesh(padGeo, saddleMat);
        padMesh.position.set(x, -1.78, fz);
        dumbbellRackGroup.add(padMesh);
      });
    });

    // 2. Angled Heavy-Gauge Horizontal Cradle Tray Rail
    const trayGeo = new THREE.BoxGeometry(2.7, 0.08, 0.52);
    const trayMesh = new THREE.Mesh(trayGeo, steelRackMat);
    trayMesh.position.set(0, -0.58, 0.12);
    trayMesh.rotation.x = 0.26; // 15-degree forward tilt for ergonomic pickup
    dumbbellRackGroup.add(trayMesh);

    // Front Lip Retainer on Tray
    const lipGeo = new THREE.BoxGeometry(2.7, 0.08, 0.04);
    const lipMesh = new THREE.Mesh(lipGeo, voltMat);
    lipMesh.position.set(0, -0.54, 0.36);
    lipMesh.rotation.x = 0.26;
    dumbbellRackGroup.add(lipMesh);

    // Center FORGE Etched Logo Plate on Tray
    const logoPlateGeo = new THREE.BoxGeometry(0.85, 0.12, 0.02);
    const logoPlate = new THREE.Mesh(logoPlateGeo, voltMat);
    logoPlate.position.set(0, -0.54, 0.38);
    logoPlate.rotation.x = 0.26;
    dumbbellRackGroup.add(logoPlate);

    // Lower Crossmember Strut
    const crossBarGeo = new THREE.BoxGeometry(2.0, 0.1, 0.08);
    const crossBar = new THREE.Mesh(crossBarGeo, steelRackMat);
    crossBar.position.set(0, -1.45, -0.05);
    dumbbellRackGroup.add(crossBar);

    // 3. Molded Urethane Dumbbell Saddle Cradles (Two pairs: left & right)
    [-0.75, 0.75].forEach(stationX => {
      [-0.42, 0.42].forEach(sideOffset => {
        const saddleGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.1, 24, 1, false, 0, Math.PI);
        const saddleMesh = new THREE.Mesh(saddleGeo, saddleMat);
        saddleMesh.rotation.z = Math.PI;
        saddleMesh.rotation.x = 0.26;
        saddleMesh.position.set(stationX + sideOffset, -0.55, 0.18);
        dumbbellRackGroup.add(saddleMesh);
      });
    });

    dumbbellModel.add(dumbbellRackGroup);

    // Helper: Build a Dumbbell Object
    function createDumbbellObject(isPrimary = false) {
      const group = new THREE.Group();

      // Ergonomic contoured knurled chrome handle
      const handleGeo = new THREE.CylinderGeometry(0.062, 0.076, 1.15, 32);
      handleGeo.rotateZ(Math.PI / 2);
      const handleMesh = new THREE.Mesh(handleGeo, handleMat);
      group.add(handleMesh);

      // Knurl grip spacer rings
      [-0.22, 0, 0.22].forEach(posX => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.077, 0.005, 16, 32), handleMat);
        ring.position.x = posX;
        ring.rotation.y = Math.PI / 2;
        group.add(ring);
      });

      // Volt accent collar rings at inside junctions
      [-0.52, 0.52].forEach(posX => {
        const collarRing = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.012, 16, 32), voltMat);
        collarRing.position.x = posX;
        collarRing.rotation.y = Math.PI / 2;
        group.add(collarRing);
      });

      // Dual Hexagonal Heads & Components
      [-0.68, 0.68].forEach(side => {
        // Inner Machined Steel Balancer Core
        const coreGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.12, 32);
        coreGeo.rotateZ(Math.PI / 2);
        const coreMesh = new THREE.Mesh(coreGeo, handleMat);
        const coreInitX = side * 0.52;
        coreMesh.position.x = coreInitX;
        group.add(coreMesh);

        // High-density Vulcanized Obsidian Hexagonal Head
        const hexGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.44, 6);
        hexGeo.rotateZ(Math.PI / 2);
        const hexMesh = new THREE.Mesh(hexGeo, headMat);
        const hexInitX = side * 0.72;
        hexMesh.position.x = hexInitX;
        group.add(hexMesh);
        dumbbellHeads.push(hexMesh);

        // Volt Chamfer Edge Ring
        const chamferGeo = new THREE.TorusGeometry(0.46, 0.018, 12, 6);
        chamferGeo.rotateY(Math.PI / 2);
        const chamferMesh = new THREE.Mesh(chamferGeo, voltMat);
        chamferMesh.position.x = hexInitX;
        group.add(chamferMesh);

        // Embossed FORGE PRO Face Badge
        const badgeGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.02, 32);
        badgeGeo.rotateZ(Math.PI / 2);
        const badgeTex = createDumbbellBadgeTexture('50 LBS', 'FORGE URETHANE');
        const badgeMat = new THREE.MeshStandardMaterial({
          map: badgeTex,
          metalness: 0.6,
          roughness: 0.3
        });
        const badgeMesh = new THREE.Mesh(badgeGeo, badgeMat);
        const badgeInitX = side * 0.95;
        badgeMesh.position.x = badgeInitX;
        group.add(badgeMesh);
        dumbbellWeightBadges.push(badgeMesh);

        if (isPrimary) {

          // Register components for exploded view
          dumbbellExplodedParts.push({
            mesh: coreMesh,
            initialX: coreInitX,
            explodeOffset: side * 0.5
          });
          dumbbellExplodedParts.push({
            mesh: hexMesh,
            initialX: hexInitX,
            explodeOffset: side * 1.05
          });
          dumbbellExplodedParts.push({
            mesh: chamferMesh,
            initialX: hexInitX,
            explodeOffset: side * 1.05
          });
          dumbbellExplodedParts.push({
            mesh: badgeMesh,
            initialX: badgeInitX,
            explodeOffset: side * 1.55
          });
        }
      });

      return group;
    }

    // --- B. COMPANION DUMBBELL (Left Saddle Cradle) ---
    companionDumbbellGroup = createDumbbellObject(false);
    companionDumbbellGroup.name = 'companion-dumbbell';
    companionDumbbellGroup.position.set(-0.75, -0.55, 0.22);
    companionDumbbellGroup.rotation.x = 0.26; // match rack resting tilt
    dumbbellModel.add(companionDumbbellGroup);

    // --- C. PRIMARY INTERACTIVE DUMBBELL (Right Saddle Cradle) ---
    primaryDumbbellGroup = createDumbbellObject(true);
    primaryDumbbellGroup.name = 'primary-dumbbell';
    primaryDumbbellGroup.position.set(0.75, -0.55, 0.22);
    primaryDumbbellGroup.rotation.x = 0.26;
    primaryDumbbellGroup.userData = { isPrimaryDumbbell: true };
    dumbbellModel.add(primaryDumbbellGroup);

    // Base presentation angle for dumbbell station
    dumbbellModel.rotation.set(0.12, 0.2, 0);
    dumbbellModel.visible = false;
    modelGroup.add(dumbbellModel);
  }

  // --- 3. BUILD APEX KETTLEBELL ---
  function buildKettlebell() {
    kettlebellModel = new THREE.Group();
    kettlebellModel.name = 'kettlebell';

    const bellMat = getMaterial('steel', 'obsidian');
    const gripMat = getMaterial('steel', 'chrome');

    // Spherical weighted body with flattened bottom
    const ballGeo = new THREE.SphereGeometry(0.75, 48, 48);
    // Flatten bottom
    const posAttr = ballGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      if (posAttr.getY(i) < -0.55) {
        posAttr.setY(i, -0.55);
      }
    }
    ballGeo.computeVertexNormals();
    const ballMesh = new THREE.Mesh(ballGeo, bellMat);
    kettlebellModel.add(ballMesh);

    // Cast-iron curved handle horn (Torus)
    const handleGeo = new THREE.TorusGeometry(0.42, 0.08, 24, 48, Math.PI);
    handleGeo.rotateZ(Math.PI);
    const handleMesh = new THREE.Mesh(handleGeo, gripMat);
    handleMesh.position.y = 0.85;
    kettlebellModel.add(handleMesh);

    // Handle base vertical struts connecting to body
    [-0.42, 0.42].forEach(posX => {
      const strutGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.35, 24);
      const strut = new THREE.Mesh(strutGeo, bellMat);
      strut.position.set(posX, 0.68, 0);
      kettlebellModel.add(strut);
    });

    // Embossed TITAN front emblem badge
    const badgeGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.04, 32);
    badgeGeo.rotateX(Math.PI / 2);
    const badgeTex = createPlateTexture('24 KG', 'TITAN CAST', '#090b0f');
    const badgeMat = new THREE.MeshStandardMaterial({ map: badgeTex, metalness: 0.6, roughness: 0.3 });
    const badgeMesh = new THREE.Mesh(badgeGeo, badgeMat);
    badgeMesh.position.set(0, 0.05, 0.72);
    kettlebellModel.add(badgeMesh);

    // Subtle neon volt accent band on base
    const bandGeo = new THREE.TorusGeometry(0.68, 0.015, 16, 48);
    bandGeo.rotateX(Math.PI / 2);
    const bandMesh = new THREE.Mesh(bandGeo, getMaterial('steel', 'volt'));
    bandMesh.position.y = -0.15;
    kettlebellModel.add(bandMesh);

    kettlebellModel.rotation.set(0.15, -0.3, 0);
    kettlebellModel.visible = false;
    modelGroup.add(kettlebellModel);
  }

  // --- 4. BUILD BIOMECHANICAL ANATOMY CORE ---
  function buildBiomechCore() {
    biomechModel = new THREE.Group();
    biomechModel.name = 'biomech';

    // Central pulsing kinetic icosahedron lattice
    const icoGeo = new THREE.IcosahedronGeometry(0.9, 2);
    const wireMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      wireframe: true,
      wireframeLinewidth: 2,
      emissive: 0x00a8b3,
      emissiveIntensity: 0.4
    });
    const icoMesh = new THREE.Mesh(icoGeo, wireMat);
    biomechModel.add(icoMesh);

    // Glowing core sphere
    const coreGeo = new THREE.SphereGeometry(0.4, 32, 32);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xc6ff00,
      emissive: 0xc6ff00,
      emissiveIntensity: 0.8,
      roughness: 0.1
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    biomechModel.add(coreMesh);

    // 5 Muscle Group Orbital Indicator Nodes (Chest, Back, Arms, Legs, Core)
    const muscleNodes = [
      { name: 'Chest (Pectorals)', pos: [0, 0.45, 0.8], color: 0xc6ff00 },
      { name: 'Back (Lats)', pos: [0, 0.45, -0.8], color: 0x00f0ff },
      { name: 'Arms (Force)', pos: [-0.9, 0.2, 0], color: 0xff3366 },
      { name: 'Arms (Grip)', pos: [0.9, 0.2, 0], color: 0xff3366 },
      { name: 'Core (Bracing)', pos: [0, -0.2, 0.7], color: 0xffb703 },
      { name: 'Legs (Drive)', pos: [0, -0.9, 0], color: 0xc6ff00 }
    ];

    muscleNodes.forEach(node => {
      const nodeGeo = new THREE.SphereGeometry(0.1, 16, 16);
      const nodeMat = new THREE.MeshStandardMaterial({
        color: node.color,
        emissive: node.color,
        emissiveIntensity: 0.7
      });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.set(...node.pos);
      biomechModel.add(nodeMesh);

      // Halo ring around each node
      const haloGeo = new THREE.RingGeometry(0.14, 0.17, 24);
      const haloMat = new THREE.MeshBasicMaterial({ color: node.color, side: THREE.DoubleSide });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.position.set(...node.pos);
      haloMesh.lookAt(0, 0, 0);
      biomechModel.add(haloMesh);
    });

    // Orbiting gyroscope rings
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.02, 16, 64), getMaterial('steel', 'cyan'));
    ring1.name = 'gyro1';
    biomechModel.add(ring1);

    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.015, 16, 64), getMaterial('steel', 'volt'));
    ring2.name = 'gyro2';
    ring2.rotation.x = Math.PI / 2;
    biomechModel.add(ring2);

    biomechModel.visible = false;
    modelGroup.add(biomechModel);
  }

  // --- 5. BUILD CALISTHENICS GYMNASTIC RINGS ---
  function buildCalisthenicsRings() {
    calisthenicsModel = new THREE.Group();
    calisthenicsModel.name = 'rings';
    ringsExplodedParts = [];

    const ringMat = getMaterial('steel', 'chrome');
    const strapMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.85,
      metalness: 0.1
    });
    const buckleMat = getMaterial('steel', 'obsidian');

    // Dual Olympic rings
    [-0.85, 0.85].forEach(side => {
      // Birch / Carbon ring torus
      const ringGeo = new THREE.TorusGeometry(0.55, 0.058, 32, 64);
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(side, -0.4, 0);
      calisthenicsModel.add(ringMesh);

      // Hanging nylon strap
      const strapGeo = new THREE.BoxGeometry(0.08, 3.2, 0.015);
      const strapMesh = new THREE.Mesh(strapGeo, strapMat);
      strapMesh.position.set(side, 1.2, 0);
      calisthenicsModel.add(strapMesh);

      // Steel cam-buckle clamp
      const buckleGeo = new THREE.BoxGeometry(0.14, 0.18, 0.05);
      const buckleMesh = new THREE.Mesh(buckleGeo, buckleMat);
      buckleMesh.position.set(side, 0.8, 0);
      calisthenicsModel.add(buckleMesh);

      // Quick release buckle lever pin
      const leverGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.12, 16);
      leverGeo.rotateZ(Math.PI / 2);
      const leverMesh = new THREE.Mesh(leverGeo, getMaterial('steel', 'volt'));
      leverMesh.position.set(side, 0.8, 0.035);
      calisthenicsModel.add(leverMesh);

      // Track for explode animation
      ringsExplodedParts.push({
        mesh: ringMesh,
        initialX: side,
        explodeOffset: side * 0.9
      });
      ringsExplodedParts.push({
        mesh: buckleMesh,
        initialX: side,
        explodeOffset: side * 0.45
      });
    });

    // Top mounting bar
    const barGeo = new THREE.CylinderGeometry(0.04, 0.04, 3.0, 32);
    barGeo.rotateZ(Math.PI / 2);
    const barMesh = new THREE.Mesh(barGeo, getMaterial('steel', 'obsidian'));
    barMesh.position.set(0, 2.75, 0);
    calisthenicsModel.add(barMesh);

    calisthenicsModel.rotation.set(0.15, 0.25, 0);
    calisthenicsModel.visible = false;
    modelGroup.add(calisthenicsModel);
  }

  // --- AMBIENT PARTICLES SYSTEM ---
  function buildParticles() {
    particlesGroup = new THREE.Group();
    const particleCount = 1000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const colorVolt = new THREE.Color(0xc6ff00);
    const colorCyan = new THREE.Color(0x00f0ff);
    const colorWhite = new THREE.Color(0xffffff);

    for (let i = 0; i < particleCount; i++) {
      // Spread across deep 3D box
      positions[i * 3] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 18;

      const mixedColor = Math.random() > 0.6 ? colorVolt : (Math.random() > 0.5 ? colorCyan : colorWhite);
      colors[i * 3] = mixedColor.r;
      colors[i * 3 + 1] = mixedColor.g;
      colors[i * 3 + 2] = mixedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Custom circular particle texture via canvas
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.3, 'rgba(255,255,255,0.7)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    const pTex = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      map: pTex,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const particles = new THREE.Points(geometry, material);
    particlesGroup.add(particles);
    scene.add(particlesGroup);
  }

  // --- NEON AMBIENT ENERGY RINGS ---
  function buildEnergyRings() {
    ringsGroup = new THREE.Group();
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xc6ff00,
      transparent: true,
      opacity: 0.18,
      wireframe: true
    });

    const ring = new THREE.Mesh(new THREE.RingGeometry(2.8, 3.2, 48), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -1.5;
    ringsGroup.add(ring);

    const ringOuter = new THREE.Mesh(new THREE.RingGeometry(3.6, 4.0, 48), new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.12,
      wireframe: true
    }));
    ringOuter.rotation.x = Math.PI / 2;
    ringOuter.position.y = -1.6;
    ringsGroup.add(ringOuter);

    scene.add(ringsGroup);
  }

  // --- MODEL SWITCHING LOGIC ---
  function showModel(modelName) {
    // Reset previous model's meshes back to unexploded before switching
    if (state.isExploded || state.explodeProgress > 0) {
      updateExplodeMeshPositions(0);
    }

    state.currentModel = modelName;
    const models = {
      barbell: barbellModel,
      dumbbell: dumbbellModel,
      kettlebell: kettlebellModel,
      biomech: biomechModel,
      rings: calisthenicsModel
    };

    Object.keys(models).forEach(name => {
      if (models[name]) {
        models[name].visible = (name === modelName);
      }
    });

    // Select active explodedParts for this specific model
    if (modelName === 'dumbbell') {
      explodedParts = dumbbellExplodedParts;
    } else if (modelName === 'barbell') {
      explodedParts = barbellExplodedParts;
    } else if (modelName === 'rings') {
      explodedParts = ringsExplodedParts;
    } else {
      explodedParts = [];
    }

    // Toggle dumbbell specific UI controls in panel
    const dumbbellPanel = document.getElementById('dumbbell-panel-controls');
    if (dumbbellPanel) {
      dumbbellPanel.style.display = (modelName === 'dumbbell') ? 'block' : 'none';
    }

    // Reset exploded state when switching
    state.isExploded = false;
    state.explodeProgress = 0;
    updateExplodeMeshPositions(0);

    const explodeBtnText = document.getElementById('explode-text');
    if (explodeBtnText) explodeBtnText.textContent = 'Explode View';
    const explodeBtn = document.getElementById('btn-explode');
    if (explodeBtn) explodeBtn.classList.remove('active');

    // Update specs box content
    updateSpecsBox(modelName);
  }

  function updateSpecsBox(modelName) {
    const specsData = {
      barbell: {
        name: 'FORGE IWF Competition Barbell',
        tensile: '215,000 PSI Hardened Chrome',
        load: '120 KG (Calibrated Loaded)',
        bearings: '10 Precision Needle Bearings',
        coating: 'Ion-Plated Chrome & Knurl'
      },
      dumbbell: {
        name: 'FORGE Commercial Urethane Dumbbell',
        tensile: 'Solid-Steel Machined Core Welded',
        load: `${state.dumbbellWeight} LBS (${(parseInt(state.dumbbellWeight, 10) * 0.453592).toFixed(1)} KG)`,
        bearings: 'Hardened Chrome Ergonomic Knurl',
        coating: 'Vulcanized Matte Obsidian Urethane'
      },
      kettlebell: {
        name: 'FORGE Competition Kettlebell',
        tensile: 'Monoblock Hollow-Core Cast',
        load: '24 KG (53 LBS)',
        bearings: '35mm Ergonomic Grip Horn',
        coating: 'Electro-Deposit Powder Coat'
      },
      biomech: {
        name: 'FORGE Kinetic Muscle Matrix',
        tensile: 'Force Vector Biometrics',
        load: '5 Primary Kinetic Chains',
        bearings: 'Multi-Planar Torso Lattice',
        coating: 'Holographic Neural Projection'
      },
      rings: {
        name: 'FORGE Olympic Calisthenics Rings & Rig',
        tensile: '1,500 LBS High-Tensile Webbing',
        load: 'Tested to 600 KG Dynamic Force',
        bearings: 'Solid Birch / Steel Cam Buckle',
        coating: 'Textured Friction Chalk Grip'
      }
    };

    const data = specsData[modelName] || specsData.barbell;
    const nameEl = document.getElementById('spec-name');
    const tensileEl = document.getElementById('spec-tensile');
    const loadEl = document.getElementById('spec-load');
    const bearingsEl = document.getElementById('spec-bearings');
    const coatingEl = document.getElementById('spec-coating');

    if (nameEl) nameEl.textContent = data.name;
    if (tensileEl) tensileEl.textContent = data.tensile;
    if (loadEl) loadEl.textContent = data.load;
    if (bearingsEl) bearingsEl.textContent = data.bearings;
    if (coatingEl) coatingEl.textContent = data.coating;
  }

  // --- INTERACTIVE DUMBBELL ACTIONS ---
  function toggleLiftDumbbell() {
    state.isDumbbellLifted = !state.isDumbbellLifted;
    playMetallicClink(state.isDumbbellLifted ? 720 : 440);

    const liftBtnText = document.getElementById('lift-text');
    if (liftBtnText) {
      liftBtnText.textContent = state.isDumbbellLifted ? 'Rack Dumbbell Down' : 'Lift Dumbbell from Rack';
    }
    const liftBtn = document.getElementById('btn-lift-dumbbell');
    if (liftBtn) {
      liftBtn.classList.toggle('lifted', state.isDumbbellLifted);
    }
    return state.isDumbbellLifted;
  }

  function setDumbbellWeight(weightLbs) {
    state.dumbbellWeight = String(weightLbs);
    playMetallicClink(540);

    const scaleMap = {
      '35': 0.82,
      '50': 1.0,
      '75': 1.22,
      '100': 1.44
    };
    const s = scaleMap[state.dumbbellWeight] || 1.0;

    // Scale dumbbell heads on the primary interactive dumbbell
    dumbbellHeads.forEach(headMesh => {
      headMesh.scale.set(s, s, s);
    });

    // Update faceplate textures and scale
    const newTex = createDumbbellBadgeTexture(state.dumbbellWeight + ' LBS', 'FORGE URETHANE');
    dumbbellWeightBadges.forEach(badge => {
      badge.material.map = newTex;
      badge.material.needsUpdate = true;
      badge.scale.set(s, s, s);
    });

    // Update specs box
    const loadEl = document.getElementById('spec-load');
    if (loadEl && state.currentModel === 'dumbbell') {
      const kg = (parseInt(state.dumbbellWeight, 10) * 0.453592).toFixed(1);
      loadEl.textContent = `${state.dumbbellWeight} LBS (${kg} KG)`;
    }

    // Update weight selector buttons active state
    document.querySelectorAll('.weight-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-weight') === state.dumbbellWeight);
    });
  }

  // --- EXPLODE VIEW ANIMATION ---
  function toggleExplode() {
    state.isExploded = !state.isExploded;
    return state.isExploded;
  }

  function updateExplodeMeshPositions(progress) {
    explodedParts.forEach(part => {
      part.mesh.position.x = part.initialX + (part.explodeOffset * progress);
    });
  }

  // --- MATERIAL FINISH SWITCHER ---
  function setMaterialFinish(finishName) {
    state.currentMaterial = finishName;
    const newSteel = getMaterial('steel', finishName);

    if (barbellModel) {
      barbellModel.traverse(child => {
        if (child.isMesh && child.material && !child.material.map) {
          child.material = newSteel;
        }
      });
    }

    // Only update metallic finish on the dumbbells, preserving the dark rack frame
    const updateDumbbellMeshes = (group) => {
      if (!group) return;
      group.traverse(child => {
        if (child.isMesh && child.material && !child.material.map) {
          child.material = newSteel;
        }
      });
    };
    updateDumbbellMeshes(primaryDumbbellGroup);
    updateDumbbellMeshes(companionDumbbellGroup);

    if (kettlebellModel) {
      kettlebellModel.traverse(child => {
        if (child.isMesh && child.material && !child.material.map) {
          child.material = newSteel;
        }
      });
    }
  }

  // --- LIGHTING PRESETS ---
  function setLightingPreset(presetName) {
    state.currentLighting = presetName;

    switch (presetName) {
      case 'studio':
        ambientLight.color.setHex(0x27272a);
        ambientLight.intensity = 1.6;
        keyLight.color.setHex(0xffffff);
        keyLight.intensity = 2.8;
        fillLight.color.setHex(0xf4f4f5);
        fillLight.intensity = 1.5;
        rimLight.color.setHex(0xa1a1aa);
        rimLight.intensity = 1.2;
        if (gymSpotlight1) { gymSpotlight1.color.setHex(0xffffff); gymSpotlight1.intensity = 2.4; }
        if (gymSpotlight2) { gymSpotlight2.color.setHex(0xd4d4d8); gymSpotlight2.intensity = 2.0; }
        break;

      case 'ember':
        ambientLight.color.setHex(0x200508);
        ambientLight.intensity = 1.3;
        keyLight.color.setHex(0xff6b35);
        keyLight.intensity = 2.6;
        fillLight.color.setHex(0xffb703);
        fillLight.intensity = 2.0;
        rimLight.color.setHex(0xff1e56);
        rimLight.intensity = 2.2;
        if (gymSpotlight1) { gymSpotlight1.color.setHex(0xff6b35); gymSpotlight1.intensity = 2.8; }
        if (gymSpotlight2) { gymSpotlight2.color.setHex(0xff1e56); gymSpotlight2.intensity = 2.4; }
        break;

      case 'cyber':
      default:
        ambientLight.color.setHex(0x0d1117);
        ambientLight.intensity = 1.2;
        keyLight.color.setHex(0xffffff);
        keyLight.intensity = 2.4;
        fillLight.color.setHex(0xc6ff00);
        fillLight.intensity = 1.8;
        rimLight.color.setHex(0x00f0ff);
        rimLight.intensity = 2.2;
        if (gymSpotlight1) { gymSpotlight1.color.setHex(0xd4ff00); gymSpotlight1.intensity = 2.6; }
        if (gymSpotlight2) { gymSpotlight2.color.setHex(0x00f5ff); gymSpotlight2.intensity = 2.2; }
        break;
    }
  }

  // --- CAMERA RESET & ORBIT TOGGLE ---
  function resetCamera() {
    if (controls) {
      controls.reset();
    }
    camera.position.set(0, 0.5, 6.5);
    camera.lookAt(0, 0, 0);
  }

  function toggleOrbitControls() {
    state.orbitEnabled = !state.orbitEnabled;
    if (controls) {
      controls.enabled = state.orbitEnabled;
    }
    document.body.classList.toggle('orbit-active', state.orbitEnabled);
    return state.orbitEnabled;
  }

  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    // Window Resize
    window.addEventListener('resize', onWindowResize, false);

    // Mouse Move Parallax
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    // Scroll Position Tracking
    window.addEventListener('scroll', onScroll, { passive: true });

    // Touch Move for mobile
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    // Interactive Raycaster for dumbbell pickup & inspection
    const raycaster = new THREE.Raycaster();
    const mouseCoord = new THREE.Vector2();

    function checkDumbbellHit(clientX, clientY) {
      if (state.currentModel !== 'dumbbell' || !primaryDumbbellGroup || !renderer) return false;
      const rect = renderer.domElement.getBoundingClientRect();
      mouseCoord.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouseCoord.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouseCoord, camera);
      const hits = raycaster.intersectObjects(primaryDumbbellGroup.children, true);
      return hits.length > 0;
    }

    let mouseDownPos = { x: 0, y: 0 };
    renderer.domElement.addEventListener('mousedown', function(e) {
      mouseDownPos.x = e.clientX;
      mouseDownPos.y = e.clientY;
    });

    renderer.domElement.addEventListener('click', function(e) {
      const dx = Math.abs(e.clientX - mouseDownPos.x);
      const dy = Math.abs(e.clientY - mouseDownPos.y);
      // Only trigger if user clicked rather than dragged to orbit/pan
      if (dx < 6 && dy < 6) {
        if (checkDumbbellHit(e.clientX, e.clientY)) {
          toggleLiftDumbbell();
        }
      }
    });

    renderer.domElement.addEventListener('touchend', function(e) {
      if (e.changedTouches && e.changedTouches.length > 0) {
        const t = e.changedTouches[0];
        if (checkDumbbellHit(t.clientX, t.clientY)) {
          toggleLiftDumbbell();
        }
      }
    }, { passive: true });

    renderer.domElement.addEventListener('mousemove', function(e) {
      if (state.currentModel === 'dumbbell' && checkDumbbellHit(e.clientX, e.clientY)) {
        renderer.domElement.style.cursor = 'grab';
      } else if (!state.orbitEnabled) {
        renderer.domElement.style.cursor = 'default';
      }
    });
  }

  function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  function onMouseMove(e) {
    state.mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
    state.mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;

    // Move interactive specular point light
    if (mouseLight) {
      mouseLight.position.x = state.mouse.targetX * 5;
      mouseLight.position.y = state.mouse.targetY * 3.5;
    }
  }

  function onTouchMove(e) {
    if (e.touches && e.touches.length > 0) {
      const touch = e.touches[0];
      state.mouse.targetX = (touch.clientX / window.innerWidth) * 2 - 1;
      state.mouse.targetY = -(touch.clientY / window.innerHeight) * 2 + 1;
    }
  }

  function onScroll() {
    const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (totalScroll > 0) {
      state.targetScrollProgress = window.scrollY / totalScroll;
    }
  }

  // --- CAMERA SCROLL CHOREOGRAPHY ---
  function updateScrollChoreography() {
    // Smooth lerp for scroll progress
    state.scrollProgress += (state.targetScrollProgress - state.scrollProgress) * 0.08;
    const p = state.scrollProgress;

    // Only apply automated scroll camera path when user is NOT in free OrbitControls mode
    if (!state.orbitEnabled) {
      // Hero (0.0 to 0.15): Centered, dramatic tilt
      // 3D Lab (0.15 to 0.35): Focused front-center with direct view
      // About (0.35 to 0.50): Shifted right (x: 2.2) to reveal about copy on left
      // Programs (0.50 to 0.65): Lifted higher (y: 1.2), rotated to reveal core
      // Facilities (0.65 to 0.80): Isometric angled view (x: -1.8, y: 1.8)
      // Pricing / Contact (0.80 to 1.0): Deep dramatic perspective

      let targetCamX = 0;
      let targetCamY = 0.5;
      let targetCamZ = 6.5;

      let targetModelX = 0;
      let targetModelY = 0;
      let targetModelRotY = 0;

      if (p < 0.15) {
        // Hero Section
        targetCamX = state.mouse.x * 0.8;
        targetCamY = 0.4 + state.mouse.y * 0.5;
        targetCamZ = 6.5;
        targetModelX = 0;
        targetModelY = 0;
      } else if (p < 0.35) {
        // 3D Lab Section
        targetCamX = state.mouse.x * 0.5;
        targetCamY = 0.5;
        targetCamZ = 6.0;
        targetModelX = 0.8; // shifted slightly right of control panel
      } else if (p < 0.52) {
        // About Section
        targetCamX = -1.2;
        targetCamY = 0.2;
        targetCamZ = 7.0;
        targetModelX = 2.0; // right half of viewport
      } else if (p < 0.70) {
        // Programs Section
        targetCamX = 0;
        targetCamY = 1.0;
        targetCamZ = 6.8;
        targetModelX = 0;
      } else if (p < 0.88) {
        // Facilities Section
        targetCamX = 1.4;
        targetCamY = 1.2;
        targetCamZ = 7.2;
        targetModelX = -1.8;
      } else {
        // Pricing / Inquiry Section
        targetCamX = 0;
        targetCamY = 0.2;
        targetCamZ = 6.8;
        targetModelX = 0;
      }

      // Smooth camera interpolation
      camera.position.x += (targetCamX - camera.position.x) * 0.05;
      camera.position.y += (targetCamY - camera.position.y) * 0.05;
      camera.position.z += (targetCamZ - camera.position.z) * 0.05;

      // Model group position interpolation
      modelGroup.position.x += (targetModelX - modelGroup.position.x) * 0.05;
      modelGroup.position.y += (targetModelY - modelGroup.position.y) * 0.05;

      camera.lookAt(modelGroup.position.x * 0.3, modelGroup.position.y * 0.5, 0);
    }
  }

  // --- MAIN ANIMATION LOOP ---
  function animate() {
    requestAnimationFrame(animate);

    // Smooth mouse lerp
    state.mouse.x += (state.mouse.targetX - state.mouse.x) * 0.05;
    state.mouse.y += (state.mouse.targetY - state.mouse.y) * 0.05;

    // Update scroll choreography
    updateScrollChoreography();

    // Explode view progress animation
    const targetExplode = state.isExploded ? 1 : 0;
    if (Math.abs(state.explodeProgress - targetExplode) > 0.001) {
      state.explodeProgress += (targetExplode - state.explodeProgress) * 0.1;
      updateExplodeMeshPositions(state.explodeProgress);
    }

    // Smooth dumbbell lift interpolation
    if (primaryDumbbellGroup) {
      const targetLerp = state.isDumbbellLifted ? 1 : 0;
      state.liftLerp += (targetLerp - state.liftLerp) * 0.085;
      const l = state.liftLerp;

      const restX = 0.75, restY = -0.55, restZ = 0.22;
      const restRotX = 0.26, restRotY = 0.0, restRotZ = 0.0;

      const liftX = 0.0, liftY = 0.35, liftZ = 1.45;
      const liftRotX = 0.25, liftRotY = 0.45, liftRotZ = -0.18;

      primaryDumbbellGroup.position.x = restX + (liftX - restX) * l;
      primaryDumbbellGroup.position.y = restY + (liftY - restY) * l;
      primaryDumbbellGroup.position.z = restZ + (liftZ - restZ) * l;

      if (!state.autoRotate || !state.isDumbbellLifted) {
        primaryDumbbellGroup.rotation.x = restRotX + (liftRotX - restRotX) * l;
        primaryDumbbellGroup.rotation.y = restRotY + (liftRotY - restRotY) * l;
        primaryDumbbellGroup.rotation.z = restRotZ + (liftRotZ - restRotZ) * l;
      } else {
        primaryDumbbellGroup.rotation.y += 0.012;
      }
    }

    // Auto-spin models if enabled
    if (state.autoRotate && !state.orbitEnabled) {
      if (state.currentModel === 'dumbbell') {
        if (!state.isDumbbellLifted && dumbbellModel) {
          dumbbellModel.rotation.y += 0.004;
        }
      } else {
        const activeObj = {
          barbell: barbellModel,
          kettlebell: kettlebellModel,
          biomech: biomechModel,
          rings: calisthenicsModel
        }[state.currentModel];

        if (activeObj) {
          activeObj.rotation.y += 0.006;
        }
      }
    }

    // Biomech Gyro Rings specific animation
    if (biomechModel && biomechModel.visible) {
      const g1 = biomechModel.getObjectByName('gyro1');
      const g2 = biomechModel.getObjectByName('gyro2');
      if (g1) g1.rotation.y += 0.012;
      if (g2) g2.rotation.x += 0.009;
    }

    // Gentle particle atmospheric drift
    if (particlesGroup) {
      particlesGroup.rotation.y += 0.0006;
      particlesGroup.rotation.x += 0.0003;
    }

    // Ambient energy rings slow pulse
    if (ringsGroup) {
      ringsGroup.rotation.z += 0.002;
    }

    // Update OrbitControls if active
    if (controls && state.orbitEnabled) {
      controls.update();
    }

    // Render frame
    renderer.render(scene, camera);
  }

  // --- EXPORT API TO GLOBAL WINDOW ---
  const engineAPI = {
    init: init,
    showModel: showModel,
    toggleExplode: toggleExplode,
    toggleLiftDumbbell: toggleLiftDumbbell,
    setDumbbellWeight: setDumbbellWeight,
    setMaterialFinish: setMaterialFinish,
    setLightingPreset: setLightingPreset,
    resetCamera: resetCamera,
    toggleOrbitControls: toggleOrbitControls,
    toggleAutoRotate: function () {
      state.autoRotate = !state.autoRotate;
      return state.autoRotate;
    },
    getState: function () {
      return state;
    }
  };
  window.Forge3DEngine = engineAPI;
  window.Titan3DEngine = engineAPI;
  window.Apex3DEngine = engineAPI; // Backwards-compatible alias

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
