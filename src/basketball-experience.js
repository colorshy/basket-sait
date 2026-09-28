import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
gsap.ticker.lagSmoothing(false);

export class StandaloneBasketballMotion {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.onSequenceComplete = options.onSequenceComplete || (() => {});

    // State tracking
    this.state = 'interactive';
    this.isScrollActive = false;
    this.isModelLoaded = false;
    this.pendingStartMotion = false;
    this.panelMeshes = [];
    this.panels = {};
    this.innerCoreMesh = null;
    this.modelRoot = null;

    // Physical sizing & calibration
    // Basketball radius 0.70m (diameter 1.40m)
    this.targetRadius = 0.70;
    this.scaleFactor = this.targetRadius / 19.025; // ~0.03679

    // Responsive hero flank coordinates
    const isDesktop = window.innerWidth >= 860;
    const isTablet = window.innerWidth >= 600 && window.innerWidth < 860;
    this.heroBaseX = isDesktop ? 1.35 : (isTablet ? 1.05 : 0.70);
    this.heroCamY = isDesktop ? 0.65 : 0.50;
    this.heroCamZ = isDesktop ? 5.2 : (isTablet ? 5.4 : 5.8);
    this.heroLookX = isDesktop ? 0.35 : (isTablet ? 0.25 : 0.18);
    this.heroLookY = isDesktop ? -0.15 : -0.10;

    // Cinematic reveal tracking
    this.targetShadowOpacity = 0.96;
    this.revealRotY = 0.0;
    this.revealTimeline = null;

    // Product story sections for navigation tracking
    this.sections = [
      { id: 'hero', label: '01 // PRODUCT' },
      { id: 'concept', label: '02 // CONCEPT' },
      { id: 'modular-system', label: '03 // MODULAR' },
      { id: 'materials', label: '04 // MATERIAL' },
      { id: 'allocation', label: '05 // ALLOCATION' }
    ];
    this.currentSectionIndex = 0;

    // Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = this.createArenaBackgroundTexture();
    this.scene.fog = new THREE.Fog(0x10141e, 10, 36);

    this.camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, this.heroCamY, this.heroCamZ);
    this.camera.lookAt(this.heroLookX, this.heroLookY, 0);

    // Cinematic camera target coordinates
    this.camTarget = {
      x: 0,
      y: this.heroCamY,
      z: this.heroCamZ,
      lookX: this.heroLookX,
      lookY: this.heroLookY,
      lookZ: 0
    };
    this.camJolt = 0;

    // High performance renderer with ACES Filmic Tone Mapping
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.container.appendChild(this.renderer.domElement);

    // Mouse coordinates, rotational physics & inertia
    this.mouse = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      prevClientX: null,
      prevClientY: null,
      lastTime: 0,
      proximity: 0,
      isOver: false,
      velX: 0,
      velY: 0,
      spinX: 0,
      spinY: 0
    };

    // Base physics & transformation coordinates
    // Hard floor constraint: baseY starts at 0.0 (grounded exactly on hardwood)
    this.physics = {
      baseX: this.heroBaseX,
      baseY: 0.0,
      baseZ: 0.0,
      rotationX: 0.16,
      rotationY: 0.40,
      rotationZ: 0.03,
      scrollRotX: 0,
      scrollRotY: 0,
      tiltX: 0,
      tiltY: 0,
      pushX: 0,
      pushY: 0,
      panelDisplacement: 0 // Task 2: Disabled, held strictly at 0
    };

    // Build 3D world
    this.initStudioLighting();
    this.buildBasketballArchitecture();
    this.initGroundAndContactShadow();
    this.setupListeners();

    // Start render loop
    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  // ========================================================
  // STUDIO LIGHTING SETUP
  // ========================================================
  initStudioLighting() {
    this.lights = new THREE.Group();
    this.scene.add(this.lights);

    // 1. Soft Ambient Fill (balanced court illumination)
    this.ambientLight = new THREE.AmbientLight(0x282e3c, 0.65);
    this.lights.add(this.ambientLight);

    // 2. Key Light: 45-degree angled warm key spotlight
    this.keyLight = new THREE.SpotLight(0xfff0e4, 4.5, 40, 0.82, 0.5, 1.0);
    this.keyLight.position.set(3.4, 4.5, 3.8);
    this.keyLight.target.position.set(this.heroBaseX, 0, 0);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 2048;
    this.keyLight.shadow.mapSize.height = 2048;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 20;
    this.keyLight.shadow.bias = -0.0001;
    this.lights.add(this.keyLight);
    this.lights.add(this.keyLight.target);

    // 3. Top-Back Rim/Kicker (sculpts basketball leather contour)
    this.rimLight = new THREE.SpotLight(0xfff4e6, 5.2, 30, 0.65, 0.5, 1.0);
    this.rimLight.position.set(0.6, 5.0, -3.4);
    this.rimLight.target.position.set(this.heroBaseX, 0, 0);
    this.lights.add(this.rimLight);
    this.lights.add(this.rimLight.target);

    // 4. Cool Arena Kicker
    this.coolFill = new THREE.DirectionalLight(0xb8cce4, 0.95);
    this.coolFill.position.set(-3.8, 2.5, 3.0);
    this.lights.add(this.coolFill);

    // 5. Hardwood Floor Bounce Light (warm reflection from court to ball underside)
    this.groundBounceLight = new THREE.DirectionalLight(0xd4682a, 1.6);
    this.groundBounceLight.position.set(this.heroBaseX, -3.0, 1.2);
    this.lights.add(this.groundBounceLight);

    // 6. Arena Flood Spotlight (broad overhead court wash)
    this.arenaFlood = new THREE.SpotLight(0xffeedd, 2.2, 45, 1.1, 0.8, 1.0);
    this.arenaFlood.position.set(0, 9.0, 2.0);
    this.arenaFlood.target.position.set(0, 0, -4);
    this.lights.add(this.arenaFlood);
    this.lights.add(this.arenaFlood.target);

    // 7. Interactive Cursor Light
    this.cursorLight = new THREE.PointLight(0xff7733, 1.2, 8.0, 2.0);
    this.cursorLight.position.set(this.heroBaseX + 1.2, 1.5, 2.2);
    this.lights.add(this.cursorLight);
  }

  // ========================================================
  // 3D BASKETBALL ARCHITECTURE (MODULAR GLB MODEL)
  // Preserves Panel_01 through Panel_08 and Inner_Core intact
  // ========================================================
  buildBasketballArchitecture() {
    this.ballGroup = new THREE.Group();
    this.scene.add(this.ballGroup);

    // Initial orientation in settled Hero state
    this.ballGroup.rotation.x = this.physics.rotationX + 0.38;
    this.ballGroup.rotation.y = this.physics.rotationY + 1.2;
    this.ballGroup.rotation.z = this.physics.rotationZ;
    this.settledRotY = this.ballGroup.rotation.y;

    // Immediately position ball in settled Hero state (grounded at y = 0.0)
    this.ballGroup.position.set(this.heroBaseX, 0.0, 0.0);

    // Load nba_basketball_final.glb
    const rawBaseUrl = import.meta.env.BASE_URL || '/';
    const baseUrl = rawBaseUrl.endsWith('/') ? rawBaseUrl : `${rawBaseUrl}/`;
    const modelUrl = `${baseUrl}nba_basketball_final.glb`;

    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        this.modelRoot = gltf.scene;

        // Scale to calibrated target radius (0.70m)
        this.modelRoot.scale.set(this.scaleFactor, this.scaleFactor, this.scaleFactor);

        this.panelMeshes = [];
        this.panels = {};
        this.innerCoreMesh = null;

        this.modelRoot.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.side = THREE.DoubleSide;
            }

            if (child.name.startsWith('Panel_')) {
              if (child.material) {
                child.material.roughness = 0.58;
                child.material.metalness = 0.02;
                if (child.material.normalScale) {
                  child.material.normalScale.set(1.2, 1.2);
                }
              }
              child.geometry.computeBoundingSphere();
              const panelCenter = child.geometry.boundingSphere.center.clone();
              if (panelCenter.lengthSq() < 0.0001) panelCenter.set(0, 0, 1);
              child.userData.normal = panelCenter.normalize();
              child.userData.originalPosition = child.position.clone();
              
              // Ensure panels are assembled closed at origin
              child.position.set(0, 0, 0);
              child.rotation.set(0, 0, 0);

              this.panels[child.name] = child;
              this.panelMeshes.push(child);
            } else if (child.name === 'Inner_Core') {
              if (child.material) {
                child.material.roughness = 0.72;
                child.material.metalness = 0.02;
              }
              this.innerCoreMesh = child;
            }
          }
        });

        // Sort panels deterministically Panel_01 to Panel_08
        this.panelMeshes.sort((a, b) => a.name.localeCompare(b.name));

        this.ballGroup.add(this.modelRoot);
        this.solidBallMesh = this.modelRoot;
        this.modularGroup = this.modelRoot;
        this.isModelLoaded = true;

        if (this.pendingStartMotion) {
          this.pendingStartMotion = false;
        }
        this.startMotionSequence();
      },
      undefined,
      (err) => {
        console.error('Failed to load nba_basketball_final.glb:', err);
      }
    );
  }

  // ========================================================
  // PROCEDURAL HARDWOOD COURT & ARENA TEXTURE GENERATORS
  // Fully offline, deployment-safe with zero 404s
  // ========================================================
  createHardwoodCourtTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');

    // Base warm maple foundation
    ctx.fillStyle = '#965d2b';
    ctx.fillRect(0, 0, 2048, 2048);

    // 64 Maple floorboard planks running along Y (Z in 3D world)
    const plankCount = 64;
    const plankWidth = 2048 / plankCount; // 32px per plank

    // Authentic NBA gym maple palette with natural deep amber board variations
    const boardColors = [
      '#9c5c2a', '#905222', '#a66632', '#864b1d',
      '#9e5f2b', '#8b4f20', '#a46530', '#834819',
      '#955a26', '#8e5122', '#aa6935', '#884d1f',
      '#935524', '#9f612d', '#7e4418', '#a0632f'
    ];

    for (let i = 0; i < plankCount; i++) {
      const x = i * plankWidth;
      const baseColor = boardColors[(i * 11 + 5) % boardColors.length];
      ctx.fillStyle = baseColor;
      ctx.fillRect(x, 0, plankWidth, 2048);

      // Staggered butt joints (horizontal seams between board ends)
      const segmentLen = 320 + ((i * 179) % 240);
      for (let y = (i * 113) % segmentLen; y < 2048; y += segmentLen) {
        // Dark seam shadow
        ctx.fillStyle = 'rgba(28, 14, 6, 0.50)';
        ctx.fillRect(x, y, plankWidth, 1.8);
        // Bevel catch light
        ctx.fillStyle = 'rgba(255, 238, 215, 0.16)';
        ctx.fillRect(x, y + 1.8, plankWidth, 1.0);
      }

      // Micro wood grain fiber striations
      ctx.fillStyle = 'rgba(255, 255, 255, 0.024)';
      for (let g = 2; g < plankWidth - 2; g += 3 + (g % 3)) {
        ctx.fillRect(x + g, 0, 1, 2048);
      }
      ctx.fillStyle = 'rgba(25, 12, 4, 0.032)';
      for (let g = 4; g < plankWidth - 2; g += 5 + (g % 4)) {
        ctx.fillRect(x + g, 0, 1, 2048);
      }

      // Plank boundary groove (vertical seam)
      ctx.fillStyle = 'rgba(20, 10, 4, 0.55)';
      ctx.fillRect(x + plankWidth - 1.5, 0, 1.5, 2048);
      ctx.fillStyle = 'rgba(255, 240, 220, 0.14)';
      ctx.fillRect(x, 0, 1.0, 2048);
    }

    // Authentic court lines (three-point arc / key lines)
    ctx.save();
    // Large painted perimeter curve
    ctx.strokeStyle = 'rgba(244, 240, 230, 0.82)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(2048 * 0.38, 2048 * 0.72, 2048 * 0.50, -0.42 * Math.PI, 0.28 * Math.PI);
    ctx.stroke();

    // Straight key border
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(2048 * 0.16, 2048 * 0.15);
    ctx.lineTo(2048 * 0.16, 2048 * 0.88);
    ctx.stroke();

    // Stenciled industrial technical insignia on court
    ctx.fillStyle = 'rgba(32, 16, 8, 0.32)';
    ctx.font = '600 24px "JetBrains Mono", monospace';
    ctx.fillText('RE:FORM // SPECIMEN 001 — HARDWOOD CALIBRATION', 2048 * 0.22, 2048 * 0.52);
    ctx.restore();

    // Subtle global polyurethane gloss gradient
    const glossGrad = ctx.createLinearGradient(0, 0, 0, 2048);
    glossGrad.addColorStop(0, 'rgba(255, 245, 230, 0.06)');
    glossGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.0)');
    glossGrad.addColorStop(1, 'rgba(25, 12, 4, 0.12)');
    ctx.fillStyle = glossGrad;
    ctx.fillRect(0, 0, 2048, 2048);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5.0, 5.0);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 16);
    return texture;
  }

  createHardwoodRoughnessTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Base semi-gloss polyurethane varnish roughness (darker = smoother/glossier)
    ctx.fillStyle = 'rgb(68, 68, 68)'; // ~0.267 roughness
    ctx.fillRect(0, 0, 1024, 1024);

    const plankCount = 32;
    const plankWidth = 1024 / plankCount;

    for (let i = 0; i < plankCount; i++) {
      const x = i * plankWidth;
      // Slight plank roughness variation (0.22 to 0.30)
      const r = 58 + ((i * 17) % 22);
      ctx.fillStyle = `rgb(${r}, ${r}, ${r})`;
      ctx.fillRect(x, 0, plankWidth, 1024);

      // Rougher joints and seams (less specular reflection in grooves)
      ctx.fillStyle = 'rgb(160, 160, 160)';
      ctx.fillRect(x + plankWidth - 1.5, 0, 1.5, 1024);

      const segmentLen = 160 + ((i * 97) % 120);
      for (let y = (i * 61) % segmentLen; y < 1024; y += segmentLen) {
        ctx.fillRect(x, y, plankWidth, 2);
      }
    }

    // Court paint lines have slightly more matte finish
    ctx.save();
    ctx.strokeStyle = 'rgb(110, 110, 110)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(1024 * 0.38, 1024 * 0.72, 1024 * 0.50, -0.42 * Math.PI, 0.28 * Math.PI);
    ctx.stroke();
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5.0, 5.0);
    return texture;
  }

  createHardwoodBumpTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgb(128, 128, 128)'; // Neutral bump mid-gray
    ctx.fillRect(0, 0, 1024, 1024);

    const plankCount = 32;
    const plankWidth = 1024 / plankCount;

    for (let i = 0; i < plankCount; i++) {
      const x = i * plankWidth;
      // Seam depressions (dark) and bevel highlights (bright)
      ctx.fillStyle = 'rgb(80, 80, 80)';
      ctx.fillRect(x + plankWidth - 1.5, 0, 1.5, 1024);
      ctx.fillStyle = 'rgb(160, 160, 160)';
      ctx.fillRect(x, 0, 1.0, 1024);

      const segmentLen = 160 + ((i * 97) % 120);
      for (let y = (i * 61) % segmentLen; y < 1024; y += segmentLen) {
        ctx.fillStyle = 'rgb(85, 85, 85)';
        ctx.fillRect(x, y, plankWidth, 1.5);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5.0, 5.0);
    return texture;
  }

  createArenaBackgroundTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Deep dark arena vertical atmosphere gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 1024);
    grad.addColorStop(0.0, '#050609');   // Top arena rafters
    grad.addColorStop(0.30, '#0a0d15');  // Upper stadium atmosphere
    grad.addColorStop(0.55, '#10141f');  // Floodlight ambient haze
    grad.addColorStop(0.72, '#1c1511');  // Warm glow rising from court
    grad.addColorStop(0.80, '#2d1b12');  // Horizon floodlight radiance line
    grad.addColorStop(0.86, '#20120a');  // Court reflection interface
    grad.addColorStop(1.0, '#120905');   // Sub-horizon ambient bounce
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2048, 1024);

    // Warm arena spotlight bloom behind the hero basketball position
    const spotX = 2048 * 0.68;
    const spotY = 1024 * 0.58;
    const spotGrad = ctx.createRadialGradient(spotX, spotY, 20, spotX, spotY, 2048 * 0.44);
    spotGrad.addColorStop(0.0, 'rgba(230, 96, 32, 0.20)');
    spotGrad.addColorStop(0.30, 'rgba(170, 70, 24, 0.10)');
    spotGrad.addColorStop(0.65, 'rgba(40, 24, 18, 0.03)');
    spotGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = spotGrad;
    ctx.fillRect(0, 0, 2048, 1024);

    // Subtle distant arena light banks (overhead stadium fixture bars)
    ctx.fillStyle = 'rgba(255, 235, 215, 0.04)';
    const barY = 1024 * 0.48;
    for (let b = 0; b < 14; b++) {
      const bx = 2048 * 0.08 + b * (2048 * 0.062);
      ctx.fillRect(bx, barY, 32, 4);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  // ========================================================
  // CONTACT SHADOW & HARDWOOD COURT ENVIRONMENT
  // ========================================================
  initGroundAndContactShadow() {
    // 1. Full-Screen Hardwood Floor Plane (Stationary World Environment)
    const floorTexture = this.createHardwoodCourtTexture();
    const roughnessTexture = this.createHardwoodRoughnessTexture();
    const bumpTexture = this.createHardwoodBumpTexture();

    const floorGeo = new THREE.PlaneGeometry(100, 100, 1, 1);
    this.floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughnessMap: roughnessTexture,
      bumpMap: bumpTexture,
      bumpScale: 0.002,
      roughness: 0.26,
      metalness: 0.05
    });

    this.floorMesh = new THREE.Mesh(floorGeo, this.floorMat);
    this.floorMesh.rotation.x = -Math.PI / 2;
    // Ground level: exactly at -targetRadius (-0.70m)
    this.floorMesh.position.set(0, -this.targetRadius, -10);
    this.floorMesh.receiveShadow = true;
    this.scene.add(this.floorMesh);

    // 2. Contact Shadow & Reflection Group (follows ball horizontally)
    this.shadowGroup = new THREE.Group();
    this.shadowGroup.position.set(this.heroBaseX, -this.targetRadius, 0);
    this.scene.add(this.shadowGroup);

    // Layer 1: Ambient Occlusion Contact Core (Umbra)
    const umbraCanvas = document.createElement('canvas');
    umbraCanvas.width = 512;
    umbraCanvas.height = 512;
    const uCtx = umbraCanvas.getContext('2d');
    const uGrad = uCtx.createRadialGradient(256, 256, 8, 256, 256, 240);
    uGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.99)');
    uGrad.addColorStop(0.24, 'rgba(0, 0, 0, 0.92)');
    uGrad.addColorStop(0.48, 'rgba(0, 0, 0, 0.65)');
    uGrad.addColorStop(0.75, 'rgba(0, 0, 0, 0.20)');
    uGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    uCtx.fillStyle = uGrad;
    uCtx.fillRect(0, 0, 512, 512);

    const umbraTexture = new THREE.CanvasTexture(umbraCanvas);
    const umbraGeo = new THREE.PlaneGeometry(1.6, 1.4);
    this.contactShadowMat = new THREE.MeshBasicMaterial({
      map: umbraTexture,
      transparent: true,
      opacity: 0.96,
      depthWrite: false
    });
    this.contactShadow = new THREE.Mesh(umbraGeo, this.contactShadowMat);
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.contactShadow.position.y = 0.001; // Sits 1mm above floorboards
    this.shadowGroup.add(this.contactShadow);

    // Layer 2: Directional Key-Light Penumbra (Soft cast shadow)
    const penumbraCanvas = document.createElement('canvas');
    penumbraCanvas.width = 512;
    penumbraCanvas.height = 512;
    const pCtx = penumbraCanvas.getContext('2d');
    const pGrad = pCtx.createRadialGradient(230, 230, 16, 256, 256, 250);
    pGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.70)');
    pGrad.addColorStop(0.35, 'rgba(0, 0, 0, 0.45)');
    pGrad.addColorStop(0.70, 'rgba(0, 0, 0, 0.15)');
    pGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    pCtx.fillStyle = pGrad;
    pCtx.fillRect(0, 0, 512, 512);

    const penumbraTexture = new THREE.CanvasTexture(penumbraCanvas);
    const penumbraGeo = new THREE.PlaneGeometry(3.0, 2.5);
    this.penumbraMat = new THREE.MeshBasicMaterial({
      map: penumbraTexture,
      transparent: true,
      opacity: 0.65,
      depthWrite: false
    });
    this.penumbraMesh = new THREE.Mesh(penumbraGeo, this.penumbraMat);
    this.penumbraMesh.rotation.x = -Math.PI / 2;
    this.penumbraMesh.position.set(-0.20, 0.002, -0.15); // Offset away from key light
    this.shadowGroup.add(this.penumbraMesh);

    // Layer 3: Warm Horween Leather Bounce Pool (Floor Reflection)
    const poolCanvas = document.createElement('canvas');
    poolCanvas.width = 512;
    poolCanvas.height = 512;
    const plCtx = poolCanvas.getContext('2d');
    const plGrad = plCtx.createRadialGradient(256, 256, 12, 256, 256, 245);
    plGrad.addColorStop(0.0, 'rgba(224, 84, 30, 0.42)');
    plGrad.addColorStop(0.28, 'rgba(170, 58, 18, 0.22)');
    plGrad.addColorStop(0.62, 'rgba(65, 24, 8, 0.06)');
    plGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    plCtx.fillStyle = plGrad;
    plCtx.fillRect(0, 0, 512, 512);

    const poolTexture = new THREE.CanvasTexture(poolCanvas);
    const poolGeo = new THREE.PlaneGeometry(3.4, 3.0);
    this.poolMat = new THREE.MeshBasicMaterial({
      map: poolTexture,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.poolMesh = new THREE.Mesh(poolGeo, this.poolMat);
    this.poolMesh.rotation.x = -Math.PI / 2;
    this.poolMesh.position.y = 0.003;
    this.shadowGroup.add(this.poolMesh);
  }

  setupListeners() {
    this.onMouseMove = (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;

      this.mouse.targetX = nx;
      this.mouse.targetY = ny;

      const dist = Math.sqrt(
        Math.pow(nx - (this.physics.baseX / 3), 2) +
        Math.pow(ny - (this.physics.baseY / 3), 2)
      );
      this.mouse.proximity = Math.max(0, 1 - dist / 0.85);

      const now = performance.now();
      if (this.state === 'interactive') {
        this.mouse.isOver = true;
        if (this.mouse.prevClientX !== null && this.mouse.lastTime > 0) {
          const rawDt = now - this.mouse.lastTime;
          if (rawDt < 1200) {
            const dt = Math.max(8, rawDt);
            const dx = e.clientX - this.mouse.prevClientX;
            const dy = e.clientY - this.mouse.prevClientY;

            const normVx = (dx / (dt / 1000)) / Math.max(600, window.innerWidth);
            const normVy = (dy / (dt / 1000)) / Math.max(600, window.innerHeight);
            const brushFactor = Math.max(0.35, Math.min(1.0, this.mouse.proximity * 1.6));

            const impulseY = normVx * 3.8 * brushFactor;
            const impulseX = normVy * 2.8 * brushFactor;

            this.mouse.velY += impulseY;
            this.mouse.velX += impulseX;

            const maxVelY = 5.0;
            const maxVelX = 3.2;
            this.mouse.velY = Math.max(-maxVelY, Math.min(maxVelY, this.mouse.velY));
            this.mouse.velX = Math.max(-maxVelX, Math.min(maxVelX, this.mouse.velX));
          }
        }

        this.mouse.prevClientX = e.clientX;
        this.mouse.prevClientY = e.clientY;
        this.mouse.lastTime = now;
      }
    };

    this.onMouseLeave = () => {
      this.mouse.isOver = false;
      this.mouse.prevClientX = null;
      this.mouse.prevClientY = null;
      this.mouse.spinY = ((this.mouse.spinY % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    };

    this.onMouseEnter = (e) => {
      if (this.state === 'interactive') {
        this.mouse.isOver = true;
        this.mouse.prevClientX = e.clientX;
        this.mouse.prevClientY = e.clientY;
        this.mouse.lastTime = performance.now();
      }
    };

    this.onResize = () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);

      const isDesktop = window.innerWidth >= 860;
      const isTablet = window.innerWidth >= 600 && window.innerWidth < 860;
      this.heroBaseX = isDesktop ? 1.30 : (isTablet ? 1.05 : 0.70);
      this.heroCamY = isDesktop ? 0.65 : 0.50;
      this.heroCamZ = isDesktop ? 5.2 : (isTablet ? 5.4 : 5.8);
      this.heroLookX = isDesktop ? 0.35 : (isTablet ? 0.25 : 0.18);
      this.heroLookY = isDesktop ? -0.15 : -0.10;

      if (this.state === 'interactive' && !this.isScrollActive) {
        this.physics.baseX = this.heroBaseX;
        this.camTarget.y = this.heroCamY;
        this.camTarget.z = this.heroCamZ;
        this.camTarget.lookX = this.heroLookX;
        this.camTarget.lookY = this.heroLookY;
      }

      ScrollTrigger.refresh();
    };

    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseleave', this.onMouseLeave);
    window.addEventListener('mouseenter', this.onMouseEnter);
    document.addEventListener('mouseleave', this.onMouseLeave);
    document.addEventListener('mouseenter', this.onMouseEnter);
    window.addEventListener('blur', this.onMouseLeave);
    window.addEventListener('resize', this.onResize);
  }

  // ========================================================
  // CINEMATIC PRODUCT REVEAL & OPENING FILM
  // ========================================================
  startOpeningSequence() {
    return this.startMotionSequence();
  }

  replayReveal() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Smooth cinematic camera focus and gentle axial spin (no blackouts, no dropping, no floating)
    gsap.to(this.camTarget, {
      z: this.heroCamZ + 0.5,
      duration: 0.6,
      ease: 'power2.out',
      onComplete: () => {
        gsap.to(this.camTarget, {
          z: this.heroCamZ,
          duration: 1.0,
          ease: 'power2.inOut'
        });
      }
    });
    gsap.fromTo(this.physics,
      { scrollRotY: this.physics.scrollRotY + 0.8 },
      { scrollRotY: 0, duration: 1.4, ease: 'power2.out' }
    );
  }

  replayDrop() {
    this.replayReveal();
  }

  startMotionSequence() {
    if (!this.isModelLoaded) {
      this.pendingStartMotion = true;
      return;
    }

    if (this.revealTimeline) {
      this.revealTimeline.kill();
      this.revealTimeline = null;
    }

    // Immediately active & interactive
    this.state = 'interactive';

    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }

    // Grounded hero coordinates
    this.physics.baseX = this.heroBaseX;
    this.physics.baseY = 0.0;
    this.physics.baseZ = 0.0;
    this.physics.scrollRotX = 0;
    this.physics.scrollRotY = 0;
    this.mouse.spinX = 0;
    this.mouse.spinY = 0;
    this.mouse.velX = 0;
    this.mouse.velY = 0;
    this.physics.pushX = 0;
    this.physics.pushY = 0;
    this.physics.tiltX = 0;
    this.physics.tiltY = 0;
    this.physics.panelDisplacement = 0;

    this.ballGroup.scale.set(1.0, 1.0, 1.0);
    this.ballGroup.position.set(this.heroBaseX, 0.0, 0.0);
    this.ballGroup.rotation.set(
      this.physics.rotationX + 0.38,
      this.physics.rotationY + 1.2,
      this.physics.rotationZ
    );
    this.settledRotY = this.ballGroup.rotation.y;
    this.revealRotY = 0;

    // Camera framed immediately on the hero composition
    this.camera.position.set(0, this.heroCamY, this.heroCamZ);
    this.camera.lookAt(this.heroLookX, this.heroLookY, 0);
    this.camTarget.x = 0;
    this.camTarget.y = this.heroCamY;
    this.camTarget.z = this.heroCamZ;
    this.camTarget.lookX = this.heroLookX;
    this.camTarget.lookY = this.heroLookY;
    this.camTarget.lookZ = 0;
    this.camJolt = 0;

    // Full studio lighting
    this.keyLight.intensity = 4.5;
    this.ambientLight.intensity = 0.65;
    this.rimLight.intensity = 5.2;
    this.coolFill.intensity = 0.95;
    this.groundBounceLight.intensity = 1.6;
    if (this.arenaFlood) this.arenaFlood.intensity = 2.4;

    // Floor and shadow full visibility
    if (this.floorMat) this.floorMat.opacity = 1.0;
    if (this.poolMat) this.poolMat.opacity = 0.85;
    this.targetShadowOpacity = 0.96;
    if (this.contactShadowMat) this.contactShadowMat.opacity = 0.96;
    if (this.penumbraMat) this.penumbraMat.opacity = 0.65;

    // Ensure all UI elements are visible
    gsap.set(['#site-nav', '#nav-rail', '#story-progress', '.hero-top-meta', '.hero-headline', '.hero-subtext', '.hero-actions', '.hero-scroll-indicator'], {
      opacity: 1,
      x: 0,
      y: 0,
      clearProps: 'transform'
    });

    this.updateActiveSection(0);
    this.initScrollTriggers();
    this.onSequenceComplete();
  }

  revealHeroEditorial() {
    // Kept for interface backward-compatibility
    const headerNav = document.getElementById('site-nav');
    const heroReveals = document.querySelectorAll('.hero-reveal');
    const loadingOverlay = document.getElementById('loading-overlay');

    if (loadingOverlay) loadingOverlay.style.display = 'none';
    if (headerNav) {
      headerNav.style.opacity = '1';
      headerNav.style.transform = 'translateY(0)';
    }
    heroReveals.forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
  }

  // ========================================================
  // STORY NAVIGATION & ACTIVE SECTION SYSTEM
  // ========================================================
  updateActiveSection(index) {
    if (index < 0 || index >= this.sections.length) return;
    this.currentSectionIndex = index;
    const current = this.sections[index];

    // 1. Update left vertical rail items
    const railItems = document.querySelectorAll('.rail-item[data-rail]');
    railItems.forEach((item) => {
      const target = item.getAttribute('data-rail');
      if (target === current.id) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // 2. Update top pill nav links
    const navLinks = document.querySelectorAll('.nav-link[data-nav]');
    navLinks.forEach((link) => {
      const target = link.getAttribute('data-nav');
      if (target === current.id) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // 3. Update right progress dots
    const dots = document.querySelectorAll('.p-dot[data-step]');
    dots.forEach((dot) => {
      const step = parseInt(dot.getAttribute('data-step'), 10);
      if (step === index) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });

    // 4. Update right progress vertical text label
    const label = document.getElementById('progress-current-label');
    if (label) {
      label.textContent = current.label;
    }
  }

  goToSection(index) {
    const targetIdx = Math.max(0, Math.min(index, this.sections.length - 1));
    const target = this.sections[targetIdx];
    const el = document.getElementById(target.id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  goToPrevSection() {
    if (this.currentSectionIndex > 0) {
      this.goToSection(this.currentSectionIndex - 1);
    }
  }

  goToNextSection() {
    if (this.currentSectionIndex < this.sections.length - 1) {
      this.goToSection(this.currentSectionIndex + 1);
    }
  }

  // ========================================================
  // GSAP SCROLLTRIGGER SYNCHRONIZATION
  // Hard floor constraint: baseY remains strictly 0.0 across all sections
  // Task 2: panelDisplacement remains 0 across all sections
  // ========================================================
  initScrollTriggers() {
    if (this.isScrollActive) return;
    this.isScrollActive = true;

    const isDesktop = window.innerWidth >= 860;
    const heroBaseX = isDesktop ? 1.35 : (window.innerWidth >= 600 ? 1.05 : 0.70);
    const heroCamY = isDesktop ? 0.65 : 0.50;
    const heroCamZ = isDesktop ? 5.2 : (window.innerWidth >= 600 ? 5.4 : 5.8);
    const heroLookX = isDesktop ? 0.35 : (window.innerWidth >= 600 ? 0.25 : 0.18);
    const heroLookY = isDesktop ? -0.15 : -0.10;

    // SECTION 2: Industrial Design Concept
    ScrollTrigger.create({
      trigger: '#concept',
      start: 'top bottom',
      end: 'bottom top',
      scrub: 1.2,
      onLeaveBack: () => {
        // Return cleanly to Hero state (grounded at baseY: 0.0)
        this.physics.baseX = heroBaseX;
        this.physics.baseY = 0.0;
        this.physics.baseZ = 0.0;
        this.physics.scrollRotX = 0;
        this.physics.scrollRotY = 0;
        this.camTarget.x = 0;
        this.camTarget.y = heroCamY;
        this.camTarget.z = heroCamZ;
        this.camTarget.lookX = heroLookX;
        this.camTarget.lookY = heroLookY;
      },
      onUpdate: (self) => {
        const p = self.progress;
        this.physics.baseX = heroBaseX + Math.sin(p * Math.PI) * (1.50 - heroBaseX);
        this.physics.baseY = 0.0; // Floor constraint: strictly grounded
        this.physics.scrollRotY = p * Math.PI * 1.6;
        this.physics.scrollRotX = Math.sin(p * Math.PI) * 0.25;

        this.camTarget.x = Math.sin(p * Math.PI * 0.7) * 1.10;
        this.camTarget.y = heroCamY + Math.sin(p * Math.PI) * 0.18;
        this.camTarget.z = heroCamZ - Math.sin(p * Math.PI) * 0.35;
        this.camTarget.lookX = this.physics.baseX * 0.40;
        this.camTarget.lookY = heroLookY;
      }
    });

    // SECTION 3: Modular Architecture
    // Panel explosion disabled: panels remain assembled (panelDisplacement = 0)
    // Floor constraint: baseY is strictly 0.0
    const callout1 = document.getElementById('callout-1');
    const callout2 = document.getElementById('callout-2');
    const callout3 = document.getElementById('callout-3');

    ScrollTrigger.create({
      trigger: '#modular-system',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.0,
      onLeaveBack: () => {
        this.physics.panelDisplacement = 0;
        if (callout1) callout1.classList.remove('active');
        if (callout2) callout2.classList.remove('active');
        if (callout3) callout3.classList.remove('active');
      },
      onLeave: () => {
        this.physics.panelDisplacement = 0;
        if (callout1) callout1.classList.remove('active');
        if (callout2) callout2.classList.remove('active');
        if (callout3) callout3.classList.remove('active');
      },
      onUpdate: (self) => {
        const p = self.progress;

        // Center ball during modular section
        this.physics.baseX = (1 - Math.min(1, p * 2.8)) * heroBaseX * (1 - p);
        this.physics.baseY = 0.0; // Hard floor constraint: grounded

        if (this.modelRoot) {
          this.modelRoot.visible = true;
        }

        // Panel explosion disabled: all 8 panels assembled
        this.physics.panelDisplacement = 0;

        // Smooth axial product rotation
        this.modularGroup.rotation.y = p * Math.PI * 2.2;
        this.modularGroup.rotation.x = Math.sin(p * Math.PI) * 0.22;

        // Camera smoothly frames the product
        this.camTarget.x = 0;
        this.camTarget.y = heroCamY + 0.10;
        this.camTarget.z = heroCamZ + 0.20;
        this.camTarget.lookX = 0;
        this.camTarget.lookY = heroLookY;

        // Callout card milestones activated for technical inspection
        if (callout1) callout1.classList.toggle('active', p > 0.12 && p < 0.85);
        if (callout2) callout2.classList.toggle('active', p > 0.28 && p < 0.85);
        if (callout3) callout3.classList.toggle('active', p > 0.44 && p < 0.85);
      }
    });

    // SECTION 4: Materiality & Craft
    // Macro camera zoom into leather micro-pebbles and recessed seams
    ScrollTrigger.create({
      trigger: '#materials',
      start: 'top bottom',
      end: 'bottom top',
      scrub: 1.2,
      onLeaveBack: () => {
        this.rimLight.intensity = 5.0;
        this.keyLight.intensity = 4.2;
      },
      onLeave: () => {
        this.rimLight.intensity = 5.0;
        this.keyLight.intensity = 4.2;
      },
      onUpdate: (self) => {
        const p = self.progress;
        // Position ball on left flank
        this.physics.baseX = -Math.sin(p * Math.PI) * 1.45;
        this.physics.baseY = 0.0; // Floor constraint: grounded

        // Macro camera push-in! Close framing of tactile surface
        this.camTarget.x = -Math.sin(p * Math.PI) * 0.65;
        this.camTarget.y = 0.45;
        this.camTarget.z = heroCamZ - Math.sin(p * Math.PI) * 2.0; // Close macro zoom (from 5.2 to 3.2)
        this.camTarget.lookX = this.physics.baseX * 0.80;
        this.camTarget.lookY = heroLookY + 0.12;
        this.physics.scrollRotY = p * Math.PI * 2.0;

        // Dramatic rim lighting grazing the leather grain
        this.rimLight.intensity = 5.0 + Math.sin(p * Math.PI) * 2.2;
        this.keyLight.intensity = 4.2 - Math.sin(p * Math.PI) * 1.0;
      }
    });

    // SECTION 5: Final CTA & Allocation
    ScrollTrigger.create({
      trigger: '#allocation',
      start: 'top bottom',
      end: 'bottom bottom',
      scrub: 1.0,
      onUpdate: (self) => {
        const p = self.progress;
        this.physics.baseX = (1 - p) * -1.45 * (1 - p);
        this.physics.baseY = 0.0; // Hard constraint: grounded on floor, never sinking
        this.camTarget.x = 0;
        this.camTarget.y = heroCamY;
        this.camTarget.z = heroCamZ;
        this.camTarget.lookX = 0;
        this.camTarget.lookY = heroLookY;
        this.keyLight.intensity = 3.8 + p * 1.4;
      }
    });

    // Sticky Nav background on scroll
    ScrollTrigger.create({
      start: 'top -80',
      end: 99999,
      toggleClass: {
        className: 'scrolled',
        targets: '#site-nav'
      }
    });

    // Story Section Tracking Triggers (Synchronizes Rail, Pill Nav & Progress Dots)
    const storySections = [
      { id: '#hero', end: 'bottom 55%' },
      { id: '#concept', end: 'bottom 55%' },
      { id: '#modular-system', end: 'bottom 55%' },
      { id: '#materials', end: 'bottom 55%' },
      { id: '#allocation', end: 'bottom bottom' }
    ];

    storySections.forEach((sec, idx) => {
      ScrollTrigger.create({
        trigger: sec.id,
        start: 'top 55%',
        end: sec.end,
        onEnter: () => this.updateActiveSection(idx),
        onEnterBack: () => this.updateActiveSection(idx)
      });
    });

    window.ScrollTrigger = ScrollTrigger;
    ScrollTrigger.refresh();
  }

  // ========================================================
  // RENDER LOOP & REAL-TIME INTERACTION
  // ========================================================
  animate(now = performance.now()) {
    requestAnimationFrame(this.animate);
    const delta = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    // Smooth cursor coordinates with inertia
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.08;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.08;

    // TASK 3: HARD FLOOR CONSTRAINT (ABSOLUTE GROUNDING)
    // The bottom of the basketball must NEVER cross below the hardwood floor surface.
    // Since groundGroup is positioned at -targetRadius, ball center must be >= 0.0.
    const constrainedY = Math.max(0.0, this.physics.baseY + this.physics.pushY);

    // Contact shadow & floor reflection tracking
    if (this.shadowGroup) {
      const ballElevation = constrainedY; // Distance above floor surface
      const baseShadowOpacity = this.targetShadowOpacity !== undefined ? this.targetShadowOpacity : 0.96;
      const targetOpacity = Math.max(0.04, baseShadowOpacity / (1.0 + ballElevation * 2.2));
      const targetScale = 1.0 + ballElevation * 0.42;

      if (this.contactShadowMat) this.contactShadowMat.opacity = targetOpacity;
      if (this.penumbraMat) this.penumbraMat.opacity = targetOpacity * 0.68;
      if (this.poolMat) this.poolMat.opacity = targetOpacity * 0.85;
      if (this.contactShadow) this.contactShadow.scale.set(targetScale, targetScale, 1.0);

      this.shadowGroup.position.x = this.ballGroup.position.x;
      this.shadowGroup.position.z = this.ballGroup.position.z;
    }

    // MOUSE PROXIMITY & PHYSICAL ROTATION
    if (this.state === 'interactive') {
      const prox = this.mouse.proximity;

      if (this.mouse.isOver) {
        this.mouse.spinY += this.mouse.velY * delta;
        this.mouse.spinX += this.mouse.velX * delta;

        this.mouse.spinX += (0 - this.mouse.spinX) * (1 - Math.pow(0.88, delta * 60));
        this.mouse.spinX = Math.max(-0.65, Math.min(0.65, this.mouse.spinX));

        const friction = Math.pow(0.92, delta * 60);
        this.mouse.velY *= friction;
        this.mouse.velX *= friction;

        if (Math.abs(this.mouse.velY) < 0.0001) this.mouse.velY = 0;
        if (Math.abs(this.mouse.velX) < 0.0001) this.mouse.velX = 0;

        const targetTiltX = this.mouse.y * 0.18 * prox;
        const targetTiltY = this.mouse.x * 0.24 * prox;
        this.physics.tiltX += (targetTiltX - this.physics.tiltX) * 0.07;
        this.physics.tiltY += (targetTiltY - this.physics.tiltY) * 0.07;

        const targetPushX = -this.mouse.x * 0.06 * prox;
        const targetPushY = -this.mouse.y * 0.04 * prox;
        this.physics.pushX += (targetPushX - this.physics.pushX) * 0.08;
        this.physics.pushY += (targetPushY - this.physics.pushY) * 0.08;
      } else {
        const returnDamping = 1 - Math.pow(0.92, delta * 60);
        this.mouse.spinY += (0 - this.mouse.spinY) * returnDamping;
        this.mouse.spinX += (0 - this.mouse.spinX) * returnDamping;
        this.mouse.velY *= Math.pow(0.85, delta * 60);
        this.mouse.velX *= Math.pow(0.85, delta * 60);

        if (Math.abs(this.mouse.spinY) < 0.0001) this.mouse.spinY = 0;
        if (Math.abs(this.mouse.spinX) < 0.0001) this.mouse.spinX = 0;
        if (Math.abs(this.mouse.velY) < 0.0001) this.mouse.velY = 0;
        if (Math.abs(this.mouse.velX) < 0.0001) this.mouse.velX = 0;

        this.physics.tiltX += (0 - this.physics.tiltX) * returnDamping;
        this.physics.tiltY += (0 - this.physics.tiltY) * returnDamping;
        this.physics.pushX += (0 - this.physics.pushX) * returnDamping;
        this.physics.pushY += (0 - this.physics.pushY) * returnDamping;
      }

      if (this.cursorLight) {
        this.cursorLight.position.x = this.mouse.x * 3.6;
        this.cursorLight.position.y = this.mouse.y * 3.6;
        this.cursorLight.intensity = this.mouse.isOver ? (0.8 + prox * 2.4) : 0.8;
      }
    }

    // Apply grounded position & rotation
    this.ballGroup.position.x = this.physics.baseX + this.physics.pushX;
    this.ballGroup.position.y = constrainedY; // Always >= 0.0, never below floor
    this.ballGroup.position.z = this.physics.baseZ;
    this.ballGroup.rotation.x = (this.physics.rotationX + 0.38) + this.physics.tiltX + this.physics.scrollRotX + this.mouse.spinX;
    this.ballGroup.rotation.y = (this.settledRotY || (this.physics.rotationY + 1.2)) + (this.revealRotY || 0) + this.physics.scrollRotY + (this.physics.tiltY * 0.08) + this.mouse.spinY;
    this.ballGroup.rotation.z = this.physics.rotationZ + (-this.mouse.velY * 0.025);

    // TASK 2: MODULAR EXPLOSION TEMPORARILY DISABLED
    // Panels remain firmly closed and assembled; Inner_Core remains hidden
    this.physics.panelDisplacement = 0;
    if (this.panelMeshes && this.panelMeshes.length > 0) {
      for (let i = 0; i < this.panelMeshes.length; i++) {
        const mesh = this.panelMeshes[i];
        if (mesh) {
          mesh.position.set(0, 0, 0);
          mesh.rotation.set(0, 0, 0);
        }
      }
    }

    // Smooth cinematic camera orbit with inertia
    this.camera.position.x += (this.camTarget.x - this.camera.position.x) * 0.08;
    this.camera.position.z += (this.camTarget.z - this.camera.position.z) * 0.08;
    this.camera.position.y += ((this.camTarget.y + this.camJolt) - this.camera.position.y) * 0.12;
    this.camera.lookAt(this.camTarget.lookX, this.camTarget.lookY, this.camTarget.lookZ);

    this.renderer.render(this.scene, this.camera);
  }
}

export { StandaloneBasketballMotion as CinematicBasketballExperience };
