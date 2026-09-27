import * as THREE from 'three';
import { createBasketballTextures } from './textures.js';
import gsap from 'gsap';

export class InteractiveBasketballScene {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.concept = options.concept || 'dark'; // 'dark' | 'editorial' | 'hybrid'
    this.onLoadComplete = options.onLoadComplete || (() => {});
    
    // Scene setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.concept === 'dark' ? 1.15 : 1.0;
    this.container.appendChild(this.renderer.domElement);

    // Textures & Materials
    this.textures = createBasketballTextures();
    this.panels = [];
    this.state = 'loading'; // 'loading' | 'dropping' | 'hero' | 'scrolling'
    
    // Interaction coordinates
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0, speed: 0, isHovering: false };
    this.ballPosition = new THREE.Vector3(0, 0, 0);
    this.ballRotation = new THREE.Euler(0.2, 0, 0);
    this.ballScale = new THREE.Vector3(1, 1, 1);
    this.explosionProgress = 0; // 0 = assembled, 1 = fully exploded/knolled

    this.initLighting();
    this.buildBasketball();
    this.initFloorAndShadows();
    this.setupEventListeners();
    this.setupCameraForConcept();

    // Start render loop
    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupCameraForConcept() {
    if (this.concept === 'dark') {
      this.camera.position.set(0, 0.2, 5.2);
    } else if (this.concept === 'editorial') {
      this.camera.position.set(0.6, 0.1, 5.0);
    } else {
      this.camera.position.set(0, 0.15, 5.4);
    }
    this.camera.lookAt(0, 0, 0);
  }

  initLighting() {
    this.lightsGroup = new THREE.Group();
    this.scene.add(this.lightsGroup);

    if (this.concept === 'dark') {
      // Dark Cinematic Lighting
      const ambient = new THREE.AmbientLight(0x1a1a24, 0.8);
      this.lightsGroup.add(ambient);

      // Warm Key Light (top-back)
      this.keyLight = new THREE.DirectionalLight(0xffeedd, 3.2);
      this.keyLight.position.set(2.5, 4.5, 3.5);
      this.keyLight.castShadow = true;
      this.keyLight.shadow.mapSize.width = 1024;
      this.keyLight.shadow.mapSize.height = 1024;
      this.keyLight.shadow.bias = -0.0001;
      this.lightsGroup.add(this.keyLight);

      // Cyan-Slate Rim Kicker Light (for dramatic silhouette edge)
      const rimLight = new THREE.DirectionalLight(0x7090b0, 2.8);
      rimLight.position.set(-3.5, 2.0, -3.0);
      this.lightsGroup.add(rimLight);

      // Orange Accent Fill Light
      const orangeFill = new THREE.PointLight(0xff5500, 2.2, 10);
      orangeFill.position.set(0, -2.5, 2.0);
      this.lightsGroup.add(orangeFill);

      // Interactive Cursor Light (follows mouse to catch pebble specular)
      this.cursorLight = new THREE.PointLight(0xffffff, 2.0, 6);
      this.cursorLight.position.set(0, 0, 2.5);
      this.lightsGroup.add(this.cursorLight);

    } else if (this.concept === 'editorial') {
      // Editorial Museum Daylight
      const ambient = new THREE.AmbientLight(0xf5f3ee, 1.6);
      this.lightsGroup.add(ambient);

      // Soft Large Skylight
      this.keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
      this.keyLight.position.set(3.0, 5.0, 4.0);
      this.keyLight.castShadow = true;
      this.keyLight.shadow.mapSize.width = 1024;
      this.keyLight.shadow.mapSize.height = 1024;
      this.keyLight.shadow.radius = 4;
      this.lightsGroup.add(this.keyLight);

      // Warm Terracotta bounce fill
      const bounce = new THREE.DirectionalLight(0xd97548, 0.9);
      bounce.position.set(-2.0, -1.0, 2.0);
      this.lightsGroup.add(bounce);

      this.cursorLight = new THREE.PointLight(0xffeedd, 1.2, 5);
      this.cursorLight.position.set(0.6, 0, 2.5);
      this.lightsGroup.add(this.cursorLight);

    } else {
      // Hybrid Sports-Tech Lighting (Precision Arena)
      const ambient = new THREE.AmbientLight(0x282c34, 1.2);
      this.lightsGroup.add(ambient);

      this.keyLight = new THREE.DirectionalLight(0xffffff, 3.5);
      this.keyLight.position.set(2.0, 5.0, 4.0);
      this.keyLight.castShadow = true;
      this.keyLight.shadow.mapSize.width = 1024;
      this.keyLight.shadow.mapSize.height = 1024;
      this.lightsGroup.add(this.keyLight);

      const highVisOrangeLight = new THREE.PointLight(0xff3b00, 3.5, 8);
      highVisOrangeLight.position.set(-2.5, -1.5, 2.0);
      this.lightsGroup.add(highVisOrangeLight);

      const topLinearLight = new THREE.DirectionalLight(0xddeeff, 2.0);
      topLinearLight.position.set(0, 6.0, 0);
      this.lightsGroup.add(topLinearLight);

      this.cursorLight = new THREE.PointLight(0xffffff, 2.5, 6);
      this.cursorLight.position.set(0, 0, 2.8);
      this.lightsGroup.add(this.cursorLight);
    }
  }

  buildBasketball() {
    this.ballMaster = new THREE.Group();
    this.scene.add(this.ballMaster);

    const radius = 1.2;
    const gap = 0.035; // gap between exterior panels for recessed rubber channels

    // 1. Black Rubber Inner Core / Hub
    const innerGeo = new THREE.SphereGeometry(radius * 0.982, 64, 64);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 0.9,
      metalness: 0.1,
      bumpMap: this.textures.bumpTexture,
      bumpScale: 0.005
    });
    this.innerCore = new THREE.Mesh(innerGeo, innerMat);
    this.innerCore.castShadow = true;
    this.innerCore.receiveShadow = true;
    this.ballMaster.add(this.innerCore);

    // 2. Central Structural Hub (visible during modular explosion)
    const hubGeo = new THREE.IcosahedronGeometry(radius * 0.5, 2);
    const hubMat = new THREE.MeshStandardMaterial({
      color: 0x1f2126,
      metalness: 0.8,
      roughness: 0.3
    });
    this.centralHub = new THREE.Mesh(hubGeo, hubMat);
    this.centralHub.visible = false;
    this.ballMaster.add(this.centralHub);

    // 3. Construct 8 Modular Curved Exterior Shell Panels
    // Hemisphere 1 (Top, 4 quadrants) and Hemisphere 2 (Bottom, 4 quadrants)
    const panelConfigs = [
      // Top hemisphere (theta from gap to PI/2 - gap)
      { phiS: 0 + gap, phiL: Math.PI / 2 - 2 * gap, thetaS: gap, thetaL: Math.PI / 2 - 2 * gap, name: 'North-East-Top' },
      { phiS: Math.PI / 2 + gap, phiL: Math.PI / 2 - 2 * gap, thetaS: gap, thetaL: Math.PI / 2 - 2 * gap, name: 'South-East-Top' },
      { phiS: Math.PI + gap, phiL: Math.PI / 2 - 2 * gap, thetaS: gap, thetaL: Math.PI / 2 - 2 * gap, name: 'South-West-Top' },
      { phiS: 3 * Math.PI / 2 + gap, phiL: Math.PI / 2 - 2 * gap, thetaS: gap, thetaL: Math.PI / 2 - 2 * gap, name: 'North-West-Top' },
      // Bottom hemisphere (theta from PI/2 + gap to PI - gap)
      { phiS: 0 + gap, phiL: Math.PI / 2 - 2 * gap, thetaS: Math.PI / 2 + gap, thetaL: Math.PI / 2 - 2 * gap, name: 'North-East-Bottom' },
      { phiS: Math.PI / 2 + gap, phiL: Math.PI / 2 - 2 * gap, thetaS: Math.PI / 2 + gap, thetaL: Math.PI / 2 - 2 * gap, name: 'South-East-Bottom' },
      { phiS: Math.PI + gap, phiL: Math.PI / 2 - 2 * gap, thetaS: Math.PI / 2 + gap, thetaL: Math.PI / 2 - 2 * gap, name: 'South-West-Bottom' },
      { phiS: 3 * Math.PI / 2 + gap, phiL: Math.PI / 2 - 2 * gap, thetaS: Math.PI / 2 + gap, thetaL: Math.PI / 2 - 2 * gap, name: 'North-West-Bottom' }
    ];

    this.panelMaterials = [];

    panelConfigs.forEach((cfg, index) => {
      const geo = new THREE.SphereGeometry(
        radius,
        32,
        32,
        cfg.phiS,
        cfg.phiL,
        cfg.thetaS,
        cfg.thetaL
      );

      // Default material depending on concept
      let baseTex = this.textures.orangeTexture;
      // In Concept C (Hybrid Sports-Tech), use split panels (half orange, half stealth black)
      if (this.concept === 'hybrid' && index >= 4) {
        baseTex = this.textures.blackTexture;
      } else if (this.concept === 'editorial') {
        baseTex = this.textures.terracottaTexture;
      }

      const mat = new THREE.MeshStandardMaterial({
        map: baseTex,
        bumpMap: this.textures.bumpTexture,
        bumpScale: 0.015,
        roughnessMap: this.textures.roughTexture,
        roughness: 0.72,
        metalness: 0.05,
        side: THREE.DoubleSide
      });

      const panelMesh = new THREE.Mesh(geo, mat);
      panelMesh.castShadow = true;
      panelMesh.receiveShadow = true;
      panelMesh.userData = {
        index,
        name: cfg.name,
        baseTexture: baseTex,
        originalPosition: new THREE.Vector3(0, 0, 0),
        // Calculate explosion normal vector from quadrant centroid
        normal: this.calculatePanelNormal(cfg),
        knollingTarget: this.calculateKnollingPosition(index)
      };

      this.panels.push(panelMesh);
      this.panelMaterials.push(mat);
      this.ballMaster.add(panelMesh);
    });

    // Tilt the ball slightly for dynamic product angle
    this.ballMaster.rotation.x = 0.28;
    this.ballMaster.rotation.y = 0.45;
  }

  calculatePanelNormal(cfg) {
    const midPhi = cfg.phiS + cfg.phiL / 2;
    const midTheta = cfg.thetaS + cfg.thetaL / 2;
    const x = Math.sin(midTheta) * Math.cos(midPhi);
    const y = Math.cos(midTheta);
    const z = Math.sin(midTheta) * Math.sin(midPhi);
    return new THREE.Vector3(x, y, z).normalize();
  }

  calculateKnollingPosition(index) {
    // Symmetrical flat-lay knolling coordinates (referencing Image 4)
    const positions = [
      new THREE.Vector3(1.6, 1.2, 0),    // Top-Right
      new THREE.Vector3(2.1, 0, 0),      // Far-Right
      new THREE.Vector3(1.6, -1.2, 0),   // Bottom-Right
      new THREE.Vector3(0, 1.6, 0),      // Top-Center
      new THREE.Vector3(0, -1.6, 0),     // Bottom-Center
      new THREE.Vector3(-1.6, 1.2, 0),   // Top-Left
      new THREE.Vector3(-2.1, 0, 0),     // Far-Left
      new THREE.Vector3(-1.6, -1.2, 0)   // Bottom-Left
    ];
    return positions[index];
  }

  initFloorAndShadows() {
    // Floor Contact Shadow Plane
    const shadowPlaneGeo = new THREE.PlaneGeometry(12, 12);
    const shadowPlaneMat = new THREE.ShadowMaterial({
      opacity: this.concept === 'dark' ? 0.75 : (this.concept === 'editorial' ? 0.35 : 0.55)
    });
    this.floorShadow = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    this.floorShadow.rotation.x = -Math.PI / 2;
    this.floorShadow.position.y = -1.21;
    this.floorShadow.receiveShadow = true;
    this.scene.add(this.floorShadow);

    // Concept C: Subtle Particle Dust Burst System for impact
    if (this.concept === 'hybrid') {
      const pCount = 80;
      const pGeo = new THREE.BufferGeometry();
      const pPositions = new Float32Array(pCount * 3);
      this.pVelocities = [];

      for (let i = 0; i < pCount; i++) {
        pPositions[i * 3] = (Math.random() - 0.5) * 0.4;
        pPositions[i * 3 + 1] = -1.2 + Math.random() * 0.1;
        pPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
        
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.5 + Math.random() * 1.5;
        this.pVelocities.push({
          vx: Math.cos(angle) * speed,
          vy: Math.random() * 0.8 + 0.2,
          vz: Math.sin(angle) * speed,
          life: 0
        });
      }

      pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
      const pMat = new THREE.PointsMaterial({
        color: 0xd8d4cc,
        size: 0.045,
        transparent: true,
        opacity: 0
      });
      this.dustParticles = new THREE.Points(pGeo, pMat);
      this.scene.add(this.dustParticles);
    }
  }

  triggerDustBurst() {
    if (!this.dustParticles) return;
    const positions = this.dustParticles.geometry.attributes.position.array;
    for (let i = 0; i < this.pVelocities.length; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 1] = -1.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      this.pVelocities[i].life = 1.0;
    }
    this.dustParticles.geometry.attributes.position.needsUpdate = true;
    this.dustParticles.material.opacity = 0.85;
  }

  setupEventListeners() {
    this.onMouseMove = (e) => {
      // Normalized coordinates (-1 to 1)
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;

      // Mouse speed calculation
      const dx = nx - this.mouse.x;
      const dy = ny - this.mouse.y;
      this.mouse.speed = Math.sqrt(dx * dx + dy * dy);

      this.mouse.targetX = nx;
      this.mouse.targetY = ny;

      // Proximity to ball
      const dist = Math.sqrt(nx * nx + ny * ny);
      this.mouse.isHovering = dist < 0.65;
    };

    this.onResize = () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('resize', this.onResize);
  }

  // STEP 1 & 2: Loading State Simulation
  simulateLoading(durationMs = 2400) {
    let progress = { value: 0 };
    const progressEl = document.getElementById('loading-pct');
    const loadingScreen = document.getElementById('loading-overlay');

    gsap.to(progress, {
      value: 100,
      duration: durationMs / 1000,
      ease: 'power2.inOut',
      onUpdate: () => {
        const rounded = Math.round(progress.value);
        if (progressEl) progressEl.innerText = `${rounded < 10 ? '0' : ''}${rounded}%`;
      },
      onComplete: () => {
        // Step 2: Cinematic Loading Transition
        this.transitionFromLoading(loadingScreen);
      }
    });
  }

  // STEP 2: Transition from Loading to Hero
  transitionFromLoading(loadingOverlay) {
    if (loadingOverlay) {
      gsap.to(loadingOverlay, {
        opacity: 0,
        duration: 0.8,
        ease: 'power2.inOut',
        onComplete: () => {
          loadingOverlay.style.display = 'none';
          this.executeHeroDrop();
        }
      });
    } else {
      this.executeHeroDrop();
    }
  }

  // STEP 3: The Drop & Bounce Physical Sequence
  executeHeroDrop() {
    this.state = 'dropping';
    
    // Position ball high above hero
    this.ballMaster.position.y = 3.6;
    this.ballMaster.scale.set(1, 1, 1);

    const tl = gsap.timeline({
      onComplete: () => {
        this.state = 'hero';
        document.body.classList.add('hero-ready');
        this.onLoadComplete();
      }
    });

    // Drop 1: Falls under gravity
    tl.to(this.ballMaster.position, {
      y: 0,
      duration: 0.68,
      ease: 'power2.in',
      onComplete: () => {
        if (this.concept === 'hybrid') this.triggerDustBurst();
      }
    })
    // Impact 1: Squash on contact with ground
    .to(this.ballMaster.scale, {
      x: 1.12,
      y: 0.86,
      z: 1.12,
      duration: 0.05,
      yoyo: true,
      repeat: 1,
      ease: 'power1.out'
    }, '-=0.04')
    // Rebound 1: Bounces back up
    .to(this.ballMaster.position, {
      y: 1.25,
      duration: 0.44,
      ease: 'power2.out'
    })
    // Fall 2
    .to(this.ballMaster.position, {
      y: 0,
      duration: 0.38,
      ease: 'power2.in'
    })
    // Impact 2: Micro squash
    .to(this.ballMaster.scale, {
      x: 1.04,
      y: 0.94,
      z: 1.04,
      duration: 0.04,
      yoyo: true,
      repeat: 1,
      ease: 'power1.out'
    }, '-=0.03')
    // Rebound 2: Lower bounce
    .to(this.ballMaster.position, {
      y: 0.35,
      duration: 0.28,
      ease: 'power2.out'
    })
    // Fall 3: Final settle
    .to(this.ballMaster.position, {
      y: 0,
      duration: 0.24,
      ease: 'power2.in'
    })
    // Rotation during drop for physical momentum
    .to(this.ballMaster.rotation, {
      x: 0.35,
      y: 1.2,
      duration: 2.1,
      ease: 'power1.out'
    }, 0);
  }

  // STEP 6: Scroll-Driven Section Transformation
  handleScroll(progress) {
    if (this.state === 'loading') return;

    // Progress 0.0 to 1.0 through the page
    if (progress < 0.25) {
      // Hero to First Transition: Macro close-up on panel seam
      const localP = progress / 0.25;
      if (this.concept === 'dark') {
        this.camera.position.z = THREE.MathUtils.lerp(5.2, 2.6, localP);
        this.camera.position.x = THREE.MathUtils.lerp(0, -0.6, localP);
        this.ballMaster.rotation.y = 1.2 + localP * 1.5;
      } else if (this.concept === 'editorial') {
        this.camera.position.x = THREE.MathUtils.lerp(0.6, -0.4, localP);
        this.camera.position.z = THREE.MathUtils.lerp(5.0, 3.2, localP);
        this.ballMaster.position.x = THREE.MathUtils.lerp(0.8, -0.8, localP);
      } else {
        this.camera.position.z = THREE.MathUtils.lerp(5.4, 3.4, localP);
        this.ballMaster.position.y = THREE.MathUtils.lerp(0, 0.4, localP);
      }
      this.setModularExplosion(0);
    } else if (progress >= 0.25 && progress < 0.6) {
      // Product Storytelling: Steady rotation & exploration
      const localP = (progress - 0.25) / 0.35;
      this.ballMaster.rotation.y = 2.7 + localP * 3.0;
      this.setModularExplosion(0);
    } else if (progress >= 0.6 && progress < 0.85) {
      // Customization / Modular Architecture: Exploded Knolling View!
      const localP = (progress - 0.6) / 0.25;
      this.setModularExplosion(localP);
      this.camera.position.z = THREE.MathUtils.lerp(3.2, 5.0, localP);
      this.camera.position.x = 0;
      this.ballMaster.position.x = 0;
      this.ballMaster.position.y = 0;
    } else {
      // Final CTA: Assembled sphere re-locks and centers
      const localP = (progress - 0.85) / 0.15;
      this.setModularExplosion(1 - localP); // re-assemble
      this.camera.position.set(0, 0.1, 4.8);
      this.ballMaster.rotation.y = 5.7 + localP * 0.8;
    }
  }

  // Explode or Reassemble the 8 Modular Exterior Shells
  setModularExplosion(amount) {
    this.explosionProgress = Math.max(0, Math.min(1, amount));
    this.centralHub.visible = this.explosionProgress > 0.05;

    this.panels.forEach((panel) => {
      if (this.concept === 'hybrid') {
        // Concept C: Knolling flat-lay arrangement (Image 4)
        const target = panel.userData.knollingTarget;
        panel.position.x = target.x * this.explosionProgress;
        panel.position.y = target.y * this.explosionProgress;
        panel.position.z = target.z * this.explosionProgress;
      } else {
        // Concept A & B: Radial displacement along surface normals
        const norm = panel.userData.normal;
        const dist = this.explosionProgress * 0.85;
        panel.position.x = norm.x * dist;
        panel.position.y = norm.y * dist;
        panel.position.z = norm.z * dist;
      }
    });

    // Slight scale down on inner core when exploded to highlight hollow modular architecture
    const coreScale = 1 - this.explosionProgress * 0.15;
    this.innerCore.scale.set(coreScale, coreScale, coreScale);
  }

  // Live Swapping of Panel Textures (for Customization UI)
  setPanelFinish(panelIndex, finishType) {
    let newTex = this.textures.orangeTexture;
    if (finishType === 'black') newTex = this.textures.blackTexture;
    if (finishType === 'terracotta') newTex = this.textures.terracottaTexture;
    if (finishType === 'parchment') newTex = this.textures.parchmentTexture;
    if (finishType === 'graphite') newTex = this.textures.graphiteTexture;

    if (panelIndex === 'all') {
      this.panels.forEach((p) => {
        p.material.map = newTex;
        p.material.needsUpdate = true;
      });
    } else if (this.panels[panelIndex]) {
      this.panels[panelIndex].material.map = newTex;
      this.panels[panelIndex].material.needsUpdate = true;
    }
  }

  animate() {
    requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();

    // Smooth mouse lerp
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.08;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.08;

    // STEP 1: Loading state continuous rotation
    if (this.state === 'loading') {
      this.ballMaster.rotation.y += delta * 0.85;
      this.ballMaster.rotation.x = 0.25;
    }

    // STEP 5: Mouse Interaction
    if (this.state === 'hero' || this.state === 'scrolling') {
      // Subtle tilt toward cursor
      const tiltX = this.mouse.y * 0.28;
      const tiltY = this.mouse.x * 0.42;

      this.ballMaster.rotation.x += (tiltX - this.ballMaster.rotation.x + 0.2) * 0.05;
      this.ballMaster.rotation.y += (tiltY * 0.1 + delta * 0.08);

      // Small physical displacement push away from cursor (feels weighted)
      const pushX = -this.mouse.x * 0.08;
      const pushY = -this.mouse.y * 0.06;
      this.ballMaster.position.x += (pushX - this.ballMaster.position.x) * 0.06;

      // Update interactive light position
      if (this.cursorLight) {
        this.cursorLight.position.x = this.mouse.x * 3.0;
        this.cursorLight.position.y = this.mouse.y * 3.0;
      }
    }

    // Animate Concept C impact dust particles
    if (this.dustParticles && this.dustParticles.material.opacity > 0.01) {
      const positions = this.dustParticles.geometry.attributes.position.array;
      for (let i = 0; i < this.pVelocities.length; i++) {
        if (this.pVelocities[i].life > 0) {
          positions[i * 3] += this.pVelocities[i].vx * delta;
          positions[i * 3 + 1] += this.pVelocities[i].vy * delta;
          positions[i * 3 + 2] += this.pVelocities[i].vz * delta;
          this.pVelocities[i].vy -= 1.8 * delta; // particle gravity
          this.pVelocities[i].life -= delta * 0.9;
        }
      }
      this.dustParticles.geometry.attributes.position.needsUpdate = true;
      this.dustParticles.material.opacity -= delta * 0.65;
    }

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('resize', this.onResize);
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.remove();
    }
  }
}
