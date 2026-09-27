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
    this.targetShadowOpacity = 0.0;
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
    this.scene.background = new THREE.Color(0x08080a);

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

    // 1. Soft Ambient Fill
    this.ambientLight = new THREE.AmbientLight(0x20242e, 0.40);
    this.lights.add(this.ambientLight);

    // 2. Key Light: 45-degree angled warm key
    this.keyLight = new THREE.SpotLight(0xfff0e4, 4.2, 30, 0.80, 0.5, 1.0);
    this.keyLight.position.set(3.2, 4.2, 3.6);
    this.keyLight.target.position.set(this.heroBaseX, 0, 0);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 2048;
    this.keyLight.shadow.mapSize.height = 2048;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 15;
    this.keyLight.shadow.bias = -0.00015;
    this.lights.add(this.keyLight);
    this.lights.add(this.keyLight.target);

    // 3. Top-Back Rim/Kicker
    this.rimLight = new THREE.SpotLight(0xfff2e2, 5.0, 25, 0.60, 0.5, 1.0);
    this.rimLight.position.set(0.5, 4.8, -3.2);
    this.rimLight.target.position.set(this.heroBaseX, 0, 0);
    this.lights.add(this.rimLight);
    this.lights.add(this.rimLight.target);

    // 4. Cool Kicker
    this.coolFill = new THREE.DirectionalLight(0xd8e4f2, 0.80);
    this.coolFill.position.set(-3.5, 1.8, 3.0);
    this.lights.add(this.coolFill);

    // 5. Hardwood Floor Bounce Fill
    this.groundBounceLight = new THREE.DirectionalLight(0xb85626, 1.2);
    this.groundBounceLight.position.set(0.0, -2.4, 1.8);
    this.lights.add(this.groundBounceLight);

    // 6. Interactive Cursor Light
    this.cursorLight = new THREE.PointLight(0xffeedd, 0, 7.0);
    this.cursorLight.position.set(this.heroBaseX, 0, 3.2);
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
    const loader = new GLTFLoader();
    loader.load(
      '/nba_basketball_final.glb',
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
  // CONTACT SHADOW & HARDWOOD COURT ENVIRONMENT
  // ========================================================
  initGroundAndContactShadow() {
    this.groundGroup = new THREE.Group();
    // Position floor surface exactly at bottom contact point: -targetRadius (-0.702m)
    this.groundGroup.position.y = -this.targetRadius - 0.002;
    this.scene.add(this.groundGroup);

    // 1. Physically Readable Hardwood Court Floor
    const floorAlphaCanvas = document.createElement('canvas');
    floorAlphaCanvas.width = 512;
    floorAlphaCanvas.height = 512;
    const fCtx = floorAlphaCanvas.getContext('2d');
    const fGrad = fCtx.createRadialGradient(256, 300, 30, 256, 256, 290);
    fGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
    fGrad.addColorStop(0.40, 'rgba(255, 255, 255, 0.92)');
    fGrad.addColorStop(0.70, 'rgba(255, 255, 255, 0.48)');
    fGrad.addColorStop(0.92, 'rgba(255, 255, 255, 0.10)');
    fGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    fCtx.fillStyle = fGrad;
    fCtx.fillRect(0, 0, 512, 512);

    const floorAlphaTexture = new THREE.CanvasTexture(floorAlphaCanvas);
    const courtTexture = new THREE.TextureLoader().load(
      '/reference/eeb6652dcb6a6cb366688275d6db738d.jpg',
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.repeat.set(0.65, 0.42);
        texture.offset.set(0.18, 0.0);
        this.floorMat.map = texture;
        this.floorMat.needsUpdate = true;
      }
    );
    const floorGeo = new THREE.PlaneGeometry(24, 24, 1, 1);
    this.floorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: courtTexture,
      roughness: 0.60,
      metalness: 0.04,
      alphaMap: floorAlphaTexture,
      transparent: true,
      opacity: 0.0,
      depthWrite: false
    });
    this.floorMesh = new THREE.Mesh(floorGeo, this.floorMat);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.receiveShadow = true;
    this.groundGroup.add(this.floorMesh);

    // 2. Warm Ground Spotlight Pool
    const poolCanvas = document.createElement('canvas');
    poolCanvas.width = 512;
    poolCanvas.height = 512;
    const pCtx = poolCanvas.getContext('2d');
    const pGrad = pCtx.createRadialGradient(256, 256, 15, 256, 256, 240);
    pGrad.addColorStop(0, 'rgba(224, 84, 30, 0.36)');
    pGrad.addColorStop(0.30, 'rgba(160, 60, 20, 0.18)');
    pGrad.addColorStop(0.65, 'rgba(60, 24, 10, 0.06)');
    pGrad.addColorStop(1, 'rgba(5, 5, 6, 0.0)');
    pCtx.fillStyle = pGrad;
    pCtx.fillRect(0, 0, 512, 512);

    const poolTexture = new THREE.CanvasTexture(poolCanvas);
    const poolGeo = new THREE.PlaneGeometry(5.5, 5.5);
    this.poolMat = new THREE.MeshBasicMaterial({
      map: poolTexture,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.poolMesh = new THREE.Mesh(poolGeo, this.poolMat);
    this.poolMesh.rotation.x = -Math.PI / 2;
    this.poolMesh.position.y = 0.001;
    this.groundGroup.add(this.poolMesh);

    // 3. Dynamic Precision Contact Shadow Plane
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 512;
    shadowCanvas.height = 512;
    const sCtx = shadowCanvas.getContext('2d');
    const sGrad = sCtx.createRadialGradient(256, 256, 8, 256, 256, 250);
    sGrad.addColorStop(0, 'rgba(0, 0, 0, 0.99)');
    sGrad.addColorStop(0.18, 'rgba(0, 0, 0, 0.92)');
    sGrad.addColorStop(0.42, 'rgba(0, 0, 0, 0.60)');
    sGrad.addColorStop(0.70, 'rgba(0, 0, 0, 0.22)');
    sGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
    sCtx.fillStyle = sGrad;
    sCtx.fillRect(0, 0, 512, 512);

    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(3.2, 3.2);
    this.contactShadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.0,
      depthWrite: false
    });

    this.contactShadow = new THREE.Mesh(shadowGeo, this.contactShadowMat);
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.contactShadow.position.y = 0.003;
    this.groundGroup.add(this.contactShadow);
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
    setTimeout(() => {
      this.startMotionSequence();
    }, 350);
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

    // STATE 01: PRODUCT ALONE IN DARK VOID
    this.state = 'revealing';

    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }

    // Reset coordinates strictly grounded on floor
    this.physics.baseX = 0.0;
    this.physics.baseY = 0.0;
    this.physics.baseZ = -0.50;
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

    this.ballGroup.scale.set(0.85, 0.85, 0.85);
    this.ballGroup.position.set(0.0, 0.0, -0.50);
    this.ballGroup.rotation.set(
      this.physics.rotationX + 0.38,
      this.physics.rotationY + 1.2,
      this.physics.rotationZ
    );
    this.settledRotY = this.ballGroup.rotation.y;
    this.revealRotY = -0.65;

    // Camera initial framing in void
    this.camera.position.set(0, 0.45, 6.5);
    this.camera.lookAt(0, -0.05, 0);
    this.camTarget.x = 0;
    this.camTarget.y = 0.45;
    this.camTarget.z = 6.5;
    this.camTarget.lookX = 0;
    this.camTarget.lookY = -0.05;
    this.camTarget.lookZ = 0;
    this.camJolt = 0;

    // Atmospheric lighting in dark studio opening
    this.keyLight.intensity = 0.6;
    this.ambientLight.intensity = 0.20;
    this.rimLight.intensity = 3.8;

    // Floor and shadow initial state
    if (this.floorMat) this.floorMat.opacity = 0.0;
    if (this.poolMat) this.poolMat.opacity = 0.0;
    this.targetShadowOpacity = 0.25;
    if (this.contactShadowMat) this.contactShadowMat.opacity = 0.25;

    // Interface elements initial hidden state
    gsap.set('#site-nav', { opacity: 0, y: -16 });
    gsap.set('#nav-rail', { opacity: 0, x: -20 });
    gsap.set('#story-progress', { opacity: 0, x: 20 });
    gsap.set('.hero-top-meta', { opacity: 0, y: 16 });
    gsap.set('.hero-headline', { opacity: 0, y: 24 });
    gsap.set('.hero-subtext', { opacity: 0, y: 20 });
    gsap.set('.hero-actions', { opacity: 0, y: 20 });
    gsap.set('.hero-scroll-indicator', { opacity: 0, y: 16 });

    // GSAP PRODUCT FILM REVEAL TIMELINE
    this.revealTimeline = gsap.timeline({
      defaults: { ease: 'power3.out' },
      onComplete: () => {
        this.state = 'interactive';
        this.revealRotY = 0;
        this.settledRotY = this.ballGroup.rotation.y;
        this.updateActiveSection(0);
        this.initScrollTriggers();
        this.onSequenceComplete();
      }
    });

    // Phase 1: Product emerges into focus (0.0s - 1.2s)
    this.revealTimeline.to(this.ballGroup.scale, {
      x: 1.0,
      y: 1.0,
      z: 1.0,
      duration: 1.2,
      ease: 'power2.out'
    }, 0);

    this.revealTimeline.to(this.physics, {
      baseZ: 0.0,
      duration: 1.2,
      ease: 'power2.out'
    }, 0);

    this.revealTimeline.to(this.keyLight, {
      intensity: 4.2,
      duration: 1.3,
      ease: 'power2.inOut'
    }, 0.1);

    this.revealTimeline.to(this.ambientLight, {
      intensity: 0.40,
      duration: 1.3,
      ease: 'power2.inOut'
    }, 0.1);

    // Phase 2: Controlled glide to Hero flank & camera reframing (0.35s - 1.75s)
    this.revealTimeline.to(this.physics, {
      baseX: this.heroBaseX,
      duration: 1.4,
      ease: 'power3.inOut'
    }, 0.35);

    this.revealTimeline.to(this.camTarget, {
      x: 0,
      y: this.heroCamY,
      z: this.heroCamZ,
      lookX: this.heroLookX,
      lookY: this.heroLookY,
      duration: 1.4,
      ease: 'power3.inOut'
    }, 0.35);

    this.revealTimeline.to(this, {
      revealRotY: 0,
      duration: 1.5,
      ease: 'power2.out'
    }, 0.25);

    this.revealTimeline.to(this, {
      targetShadowOpacity: 0.96,
      duration: 1.2,
      ease: 'power2.out'
    }, 0.4);

    if (this.poolMat) {
      this.revealTimeline.to(this.poolMat, {
        opacity: 0.85,
        duration: 1.2,
        ease: 'power2.out'
      }, 0.4);
    }

    // Phase 3: Interface Reveal (1.0s - 2.0s)
    this.revealTimeline.to('#site-nav', {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power2.out'
    }, 1.0);

    this.revealTimeline.to('#nav-rail', {
      opacity: 1,
      x: 0,
      duration: 0.8,
      ease: 'power2.out'
    }, 1.05);

    this.revealTimeline.to('#story-progress', {
      opacity: 1,
      x: 0,
      duration: 0.8,
      ease: 'power2.out'
    }, 1.10);

    // Phase 4: Staggered Editorial Typography Entrance (1.15s - 1.8s)
    this.revealTimeline.to('.hero-top-meta', {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: 'power2.out'
    }, 1.15);

    this.revealTimeline.to('.hero-headline', {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power2.out'
    }, 1.25);

    this.revealTimeline.to('.hero-subtext', {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: 'power2.out'
    }, 1.35);

    this.revealTimeline.to('.hero-actions', {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: 'power2.out'
    }, 1.45);

    this.revealTimeline.to('.hero-scroll-indicator', {
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: 'power2.out'
    }, 1.55);
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
        if (this.floorMat) this.floorMat.opacity = 0.0;
      },
      onUpdate: (self) => {
        const p = self.progress;
        this.physics.baseX = heroBaseX + Math.sin(p * Math.PI) * (1.50 - heroBaseX);
        this.physics.baseY = 0.0; // Floor constraint: strictly grounded
        this.physics.scrollRotY = p * Math.PI * 1.6;
        this.physics.scrollRotX = Math.sin(p * Math.PI) * 0.25;

        // Hardwood court emerges contextually for performance section
        if (this.floorMat) {
          this.floorMat.opacity = Math.sin(p * Math.PI) * 0.92;
        }

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

        // Subtle ambient court floor
        if (this.floorMat) this.floorMat.opacity = 0.20;

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

        // Dark minimal studio background isolates texture
        if (this.floorMat) this.floorMat.opacity = 0.0;
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
        if (this.floorMat) this.floorMat.opacity = 0.15;
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

    // Contact shadow & floor coupling
    if (this.contactShadow && this.contactShadowMat) {
      const ballElevation = constrainedY; // Distance above floor surface
      const baseShadowOpacity = this.targetShadowOpacity !== undefined ? this.targetShadowOpacity : 0.96;
      const targetOpacity = Math.max(0.04, baseShadowOpacity / (1.0 + ballElevation * 2.2));
      const targetScale = 1.0 + ballElevation * 0.42;
      this.contactShadowMat.opacity = targetOpacity;
      this.contactShadow.scale.set(targetScale, targetScale, 1.0);
      this.contactShadow.position.x = this.ballGroup.position.x;
      this.contactShadow.position.z = this.ballGroup.position.z;
      this.poolMesh.position.x = this.ballGroup.position.x;
      this.poolMesh.position.z = this.ballGroup.position.z;
      if (this.floorMesh) {
        this.floorMesh.position.x = this.ballGroup.position.x;
        this.floorMesh.position.z = this.ballGroup.position.z;
      }
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
