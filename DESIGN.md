# INTERACTIVE BASKETBALL PRODUCT EXPERIENCE
## 3 Distinct Visual Concepts & Interactive System Architecture

> **Design Philosophy**: One recurring interactive object — the physical sphere — anchors the entire digital architecture. From preloader to final acquisition, the basketball is not a decorative 3D asset; it is the physical spine of the brand experience, reacting to physics, cursor proximity, scroll momentum, and modular panel customization.
>
> **Product Foundation**: A conceptual luxury sports-tech basketball brand featuring customizable and replaceable exterior panels. Pure visual luxury, physical tactile presence, and editorial restraint without technical jargon or pseudo-engineering claims.

---

## Technical & Interaction Architecture (Common Framework)

The interactive experience is engineered for a **React + Three.js (@react-three/fiber) + GSAP (ScrollTrigger & Flip)** architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                      VIEWPORT CONTAINER                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │   FIXED WEBGL CANVAS (z-index: 1 / pointer-events: auto)  │  │
│  │   • Camera: PerspectiveCamera (FOV 32°, Near 0.1, Far 50) │  │
│  │   • 3D Actor: Modular Basketball Mesh (8 Detachable Shells)│  │
│  │   • Physics / Inertia Loop: React Three Fiber useFrame    │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │   DOM SCROLL OVERLAY (z-index: 2 / pointer-events: none)  │  │
│  │   • Interactive UI elements enable pointer-events: auto   │  │
│  │   • GSAP ScrollTrigger timeline syncs 3D Ball & Camera    │  │
│  │   • Sections pin, morph, and crossfade around the sphere  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Physical Simulation Parameters (The Grounding Physics)
- **Mass & Weight Simulation**: Simulated mass of 620g. Heavy restitution feel.
- **Hero Drop Curve**: `GSAP CustomEase.create("ballFall", "M0,0 C0.3,0 0.5,0.7 0.75,0.95 0.85,1 1,1")`.
- **Bounce Sequence**:
  - Bounce 1: Apex 100vh -> Impact Y: 0 (Time: 0.72s). Ground impact squash deform `scale: [1.06, 0.88, 1.06]`.
  - Rebound 1: Rebounds to Y: +28vh (Time: 0.52s). Deform recovery.
  - Bounce 2: Impact Y: 0 (Time: 0.40s). Subtle squash `scale: [1.02, 0.96, 1.02]`.
  - Rebound 2: Rebounds to Y: +8vh (Time: 0.28s).
  - Settle & Roll: Micro-damped friction roll of 14° rotation to a gentle halt (Time: 0.60s).
- **Cursor Proximity Physics**:
  - Calculation: Distance vector $d = (x_{cursor} - x_{ball}, y_{cursor} - y_{ball})$.
  - Active Radius: 180px window around sphere perimeter.
  - Angular Reaction: $Rotation_{target} = CursorPosition \times 0.25$ with Spring lerp `alpha = 0.08` for natural inertia.
  - Displacement: Max 16px lateral pushback away from cursor to simulate tactile resistance and physical substance.

---

# CONCEPT 01: DARK CINEMATIC ("OBSIDIAN COURT")

```
   ┌───────────────────────────────────────────────────────────┐
   │ [ BRAND ]                 INDEX / EDITIONS / BESPOKE  [●] │
   │                                                           │
   │                      THE LIVING SPHERE                    │
   │                                                           │
   │                         (   ●   )                         │
   │                       /           \                       │
   │                      (  BASKETBALL )                      │
   │                       \           /                       │
   │                      --- [SHOCK] ---                      │
   │                    .   . '  . ' .   .                     │
   │                                                           │
   │   EDITION 01                                 [ DISCOVER ] │
   │   TACTILE MONOLITH                               01 // 04 │
   └───────────────────────────────────────────────────────────┘
```

### 1. Art Direction & Visual Identity
- **Background Palette**: Absolute Deep Obsidian (`#070708`) with subtle radial darkness falloff (`#0F0F12` center to `#040405` edges).
- **Atmospheric Lighting**: High-contrast dramatic studio rim lighting. Warm top-back key light (3200K) skimming the pebble leather texture; cool cyan-slate rim kicker (6500K) catching the panel seam bevels; deep moody shadow core.
- **Accents**: Surgical Neon Tangerine (`#FF4E00`), applied strictly to active UI pins, hairline rules, state indicators, and primary callouts.
- **Typography System**:
  - Primary Display: *Syne Heavy* / *Neue Haas Grotesk Bold* (Aggressive, wide, architectural, all-caps).
  - Body & Micro-metadata: *PP Neue Montreal Book* paired with *JetBrains Mono* for coordinates and panel indexes.
- **Overall Mood**: An underground high-performance laboratory or cinematic darkroom showcase. Mysterious, sculptural, prestigious.

---

### 2. Detailed Section Blueprint

#### A. Loading State (Cinematic Blackout)
- **Visual Composition**:
  - Complete deep black screen (`#070708`).
  - No conventional loading bars or circular spinners.
  - At viewport center, the basketball emerges out of total darkness, illuminated solely by a single narrow overhead spotlight cone.
  - The ball rotates smoothly on a subtle 23.5° axial tilt at a deliberate 4 RPM.
  - The recessed seam channels catch specular glints as the ball turns.
- **Interaction & Typography**:
  - Beneath the ball, centered at 60px distance: a minimal typographic counter `00` ticking smoothly to `100` in 10px monospace (`#777777` with orange active cursor).
  - Subtle brand hallmark in 9px tracking: `OBSIDIAN LABS // INITIALIZING SPHERE`.
- **Exit Motion**:
  - At 100%, the spotlight expands instantaneously to flood the background with subtle ambient rim light.
  - The loading counter fades out with `y: -10px, opacity: 0`.

#### B. Main Navigation
- **Placement & Styling**:
  - Fixed full-width header (`height: 80px`), transparent backdrop with subtle `backdrop-filter: blur(12px)`.
  - Border bottom: 1px hairline rule in `rgba(255, 255, 255, 0.07)`.
- **Layout Grid**:
  - **Left**: Minimal wordmark `KNTIC` in sharp geometric caps with an orange period (`KNTIC.`).
  - **Center**: Editorial text links with generous tracking: `EDITION // 01`, `MODULARITY`, `PANEL LAB`, `ARCHIVE`. Hovering over any link triggers an orange hairline underline expanding from center.
  - **Right**: Secondary utility indicator `BAG (0)` and a magnetic pill button: `ACQUIRE SPHERE` (Black fill, 1px orange border, orange text; on hover: inverts to solid orange fill with black text).

#### C. Hero Section
- **The Entry Sequence (The Drop)**:
  - As the loading state dissolves, the ball is pulled upward off-screen by an invisible tension for 0.2s.
  - The ball plunges vertically from top-center, accelerated by heavy simulated gravity.
  - **Impact**: It strikes the invisible ground plane at Y = -15vh. A subtle circular floor ring of fine dust / shadow compresses outward. The ball squashes 12% on the vertical axis for 45ms.
  - **Rebounds**: Bounces twice with authentic heavy mass (rebound 1: 30% height; rebound 2: 8% height), then settles into a solid, resting stance.
- **Layout & Copy Composition**:
  - Massive background headline positioned directly behind the resting ball: `THE MONOLITH`.
  - The typography spans edge-to-edge in 14vw font size with `color: rgba(255, 255, 255, 0.06)`, creating deep layered spatial depth (Typography is behind the 3D ball, UI is in front).
  - Bottom-left corner: Edition metadata card (borderless, stacked lines):
    - `SERIES: 01 / 8-PANEL MODULAR`
    - `SURFACE: HIGH-GRIP PEBBLED GRAIN`
    - `STATUS: BESPOKE RUN`
  - Bottom-right corner: Interactive scroll prompt: A vertical animated line with an orange dot pulsating downward, labelled `SCROLL TO DECONSTRUCT`.

#### D. Mouse Interaction (Resting State)
- When the user's cursor approaches the basketball within 200px:
  - The ball’s lighting dynamically recalculates: a subtle virtual point light tracks cursor coordinates, casting reactive specular highlights along the leather pebble grain.
  - Moving the cursor left/right causes the ball to roll smoothly by ±18°, following the cursor’s horizontal velocity with elastic dampening.
  - Hovering directly over the ball displays a custom custom cursor: a clean 40px circle with `border: 1px solid #FF4E00` containing micro-text: `DRAG TO ROTATE`.
  - Clicking and dragging allows continuous 360° orbital inspection.

#### E. First Scroll Transition (Macro Surface Inspection)
- **ScrollTrigger Motion**:
  - As the user initiates scroll, the camera pushes in dramatically from an establishing shot ($Z: 5.5$) into an extreme macro perspective ($Z: 1.8$), focusing directly on the junction where two panels meet a recessed channel seam.
  - The ball rotates 75° horizontally, revealing the ultra-fine texture of the outer skin.
- **Visual Composition**:
  - The background darkens to pure `#040405`.
  - The left half of the screen holds the oversized 3D surface detail in hyper-sharp focus.
  - The right half reveals clean typographic statements fading in line-by-line:
    - Headline: `TEXTURED FOR ABSOLUTE CONTROL.`
    - Paragraph: `Designed from the tactile surface inward. Exterior panels engineered to harmonize grip, balance, and visual authority on any surface.`
  - A small interactive callout pinned directly to a seam in 3D world space (using Three.js HTML projection): a glowing orange dot with label `MAGNETIC LOCK SEAM`.

#### F. Product Storytelling Section (The Living Sphere)
- **Concept & Layout**:
  - Two-column split layout with asymmetrical vertical rhythm.
  - **Center-Left**: The 3D ball remains floating in mid-air, slowly revolving in place.
  - **Right**: A vertical scrolling story narrative with pinned progress checkpoints:
    1. *01 / THE ARCHITECTURE OF TOUCH*: Discussing how the exterior grain interacts with human hands.
    2. *02 / SEAMLESS TRANSITIONS*: Highlighting how the panel geometry locks into place without exposed hardware.
    3. *03 / PERPETUAL BALANCE*: Showing how weight remains uniform regardless of chosen panel combination.
  - As the user scrolls past each checkpoint, the basketball rotates smoothly to showcase a different panel face, matching the story beat.

#### G. Customization Section (The Dark Forge / Panel Chamber)
- **Concept**:
  - The ball moves to the center-left. Upon entering this section, the ball undergoes an **exploded modular sequence**: the 8 exterior panels float outward radially by 60mm from the central core, revealing the architecture of the ball.
- **Interactive UI (Right Panel)**:
  - A sleek floating control panel with high-contrast minimal selectors:
    - **Panel Selector**: An interactive radial mini-map of the 8 panels. Clicking a segment on the 2D diagram highlights the corresponding 3D panel with an orange rim outline.
    - **Finish Options**:
      - `01 OBSIDIAN MATTE` (Stealth deep rubberized black)
      - `02 RAW HORWEEN` (Natural heritage deep basketball orange)
      - `03 GRAPHITE SLATE` (Satin textured dark grey)
      - `04 DUNE OCHRE` (Muted warm earthy tan)
  - Selecting a finish animates the chosen 3D panel: it rotates, switches its PBR material map (diffuse, roughness, normal maps), and snaps back toward the core with a soft haptic visual recoil.
  - Real-time preview summary: `CONFIGURATION // ALL-TERRAIN DUAL TONE`.

#### H. Final CTA (Eclipse Horizon)
- **Visual Staging**:
  - The 8 panels snap back flush into the sphere with a firm mechanical lock animation.
  - The ball glides to the center of the viewport, backlit by an intense horizontal orange horizon line slicing across the screen (`#FF4E00` glow).
  - The sphere appears as a dramatic, dark silhouette with an electric orange rim light surrounding its circumference.
- **Copy & Actions**:
  - Headline above: `REDEFINE YOUR SPHERE`.
  - Primary Button: Oversized high-contrast rectangular button with rounded 2px corners: `SECURE YOUR CONFIGURATION`.
  - Secondary Action: `VIEW LOOKBOOK [DROP 01]`.
  - Minimal footer bar with legal mark, time code (`UTC 18:42:01`), and subtle acoustic sound toggle.

---

# CONCEPT 02: EDITORIAL HIGH-FASHION / ATELIER ("THE SCULPTURAL SPHERE")

```
   ┌───────────────────────────────────────────────────────────┐
   │ ATELIER 01                 CATALOGUE             INDEX (3)│
   │                                                           │
   │     OBJECT N° 01                                          │
   │     THE SPHERE                                            │
   │                                                           │
   │                         (   ●   )                         │
   │                       /           \                       │
   │                      (  BASKETBALL )                      │
   │                       \           /                       │
   │                        ═══════════                        │
   │                        [ PLINTH ]                         │
   │                                                           │
   │  PLATE 01 — EDITION ARCHIVE                AUTUMN / WINTER│
   └───────────────────────────────────────────────────────────┘
```

### 1. Art Direction & Visual Identity
- **Background Palette**: Warm Architectural Plaster / Raw Linen Off-White (`#F6F5F2` transitioning to `#EFECE6` in shaded zones).
- **Atmospheric Lighting**: Soft, diffused gallery daylight reminiscent of an architectural museum or luxury design biennial. Broad softbox from the top-left (5000K), gentle ground ambient occlusion casting a light, featherweight contact shadow directly beneath the ball.
- **Accents**: Burnt Terracotta / Deep Heritage Leather Orange (`#C84B23`) and Raw Charcoal (`#181817`). No neon or electric hues; purely authentic, pigmented tones.
- **Typography System**:
  - Primary Display: *Canela / Editorial New* (High-contrast luxury editorial serif with elegant curves and fine hairlines).
  - Supporting Typography: *Suisse Int’l Book* / *Söhne Breit* (Clean Swiss grotesque for metadata, plate numbers, and captions).
- **Overall Mood**: A luxury monograph, haute-couture design archive, and art object catalogue. Contemplative, spacious, timeless.

---

### 2. Detailed Section Blueprint

#### A. Loading State (Gallery Plinth Reveal)
- **Visual Composition**:
  - Pure warm off-white canvas (`#F6F5F2`).
  - At screen center stands a minimalist matte white geometric cube / plinth.
  - The basketball rests gracefully on top of this plinth, illuminated by pure morning sunlight.
  - It does not spin frantically; it executes an ultra-slow, regal turn (0.5 RPM), allowing the user to appreciate the subtle leather grain and hand-finished seams.
- **Interaction & Typography**:
  - Centered below the plinth, set in elegant 12px serif italics:
    - *“Loading Object N° 01 — The Modular Sphere”*
  - A thin horizontal hairline (width: 120px) fills slowly with terracotta pigment from left to right.
- **Exit Motion**:
  - Upon completion, the hairline expands to span the width of the central column.
  - The plinth drops smoothly downward out of frame (`y: +40px, opacity: 0`), leaving the sphere suspended in pure gallery white space.

#### B. Main Navigation
- **Placement & Styling**:
  - Generous top padding (`padding: 48px 64px`). No sticky glass bars, no borders. Pure typography sitting cleanly on the off-white page.
- **Layout Grid**:
  - **Left**: `OBJECT // ATELIER` in small caps Swiss sans.
  - **Center**: Editorial serif title: *The Modular Sphere*.
  - **Right**: Three clean, spaced index items: `01 MONOGRAPH`, `02 PANELS`, `03 ACQUIRE`. Each item displays an understated bracket count: `[1]`.

#### C. Hero Section
- **The Entry Sequence (The Sculptural Fall)**:
  - As the plinth recedes, the ball ascends slightly with graceful inertia, then descends with a measured, dense, tactile drop.
  - It strikes an invisible architectural ground horizon with a dry, solid, heavy thud.
  - It performs one elegant, damped bounce—no exaggerated springiness, just the pure, dense weight of premium composite leather—before settling into absolute, serene equilibrium.
- **Layout & Copy Composition**:
  - The layout mimics an oversized art book spread:
    - Top-left: Oversized serif headline:
      *Object N° 01*
      *A Study in Curvature.*
    - Left column (width: 320px): A multi-paragraph editorial introduction set in crisp 14px Swiss sans with generous line-height (`1.7`):
      > *“Conceived as an ongoing dialogue between athletic utility and sculptural permanence. A single tactile sphere with interchangeable exterior facets, crafted to age with dignity across decades of play.”*
    - The 3D basketball rests at the golden ratio intersection (slightly right of center).
    - Bottom margin: `PLATE 01 / EDITION 2026` printed in crisp 10px uppercase alongside a subtle pagination marker `[ 01 / 06 ]`.

#### D. Mouse Interaction (The Loupe Effect)
- When the cursor moves across the screen:
  - The basketball reacts with a subtle, gentle tilt—rotating its poles by up to 10° toward the pointer, as if turning slightly to face the viewer.
  - When hovering directly over the sphere, the cursor transforms into a delicate circular magnifying loupe (diameter: 120px) with a fine hairline border and micro-label `INSPECT GRAIN`.
  - Inside the loupe area, an interactive post-processing effect enhances the normal map clarity and micro-surface leather bumps, highlighting the hand-crafted seam geometry.

#### E. First Scroll Transition (The Typographic Weave)
- **ScrollTrigger Motion**:
  - As the user scrolls down, the ball gently rolls diagonally from the right column across the center towards the bottom-left of the viewport.
  - Massive editorial typography (`PANEL ARCHITECTURE`) slides horizontally behind the ball in the opposite direction.
  - The sphere's shadow stretches and contracts smoothly across the off-white canvas as if the gallery light source were shifting naturally with the scroll.
- **Storytelling Narrative**:
  - The typography wraps around the silhouette of the sphere.
  - Short editorial captions appear in small serif typography:
    - *Fig. 1.1 — The Harmony of Eight Segments.*
    - *Fig. 1.2 — Zero Compromise on Perimeter Balance.*

#### F. Product Storytelling Section (The Anatomy of Form)
- **Visual Composition**:
  - A three-column magazine editorial spread.
  - Column 1: Historical context and design intent—why modularity enhances the longevity and personal expression of the object.
  - Column 2: The interactive basketball. The user can click on any of three editorial tabs below the sphere (`PROFILE`, `SURFACE`, `SEAM`) to command the ball to rotate to pre-programmed museum viewing angles with silky smooth camera transitions (`GSAP Power3.easeInOut`).
  - Column 3: Curated studio photography crops showing the ball placed in architectural interiors (brutalist concrete benches, oak shelving, gallery pedestals).

#### G. Customization Section (The Atelier Material Palette)
- **Concept & Layout**:
  - A clean, tactile workshop aesthetic.
  - The 3D ball sits calmly on the right half of the screen.
  - On the left, an expansive, minimalist material board:
    - Swatches are presented not as generic colored circles, but as rich, textured square tiles with editorial naming:
      - `HERITAGE SIENNA` (Full-grain pebbled leather)
      - `RAW PARCHMENT` (Unbleached off-white composite)
      - `CHARCOAL NOIR` (Matte vulcanized surface)
      - `MUTED TERRACOTTA` (Earth-pigmented court finish)
  - Selecting a swatch smoothly updates the selected panel on the 3D model.
  - Below the swatches, an editorial configuration readout:
    - *“Configuration curated by You. 8 facets selected. Hand-assembled to order in limited studio runs.”*

#### H. Final CTA (The Monograph Order)
- **Visual Staging**:
  - The ball returns to center stage, framed by generous margins and a delicate border rule resembling a collectible certificate.
  - A single, deeply considered call to action:
    - Serif Headline: *Make the Sphere Your Own.*
    - Subtitle: *Edition 01 is assembled in restricted quantities.*
    - Button: Elegant text-only link with a classic arrow: `REQUEST EDITION 01  →` (underlined with a burnt-terracotta hairline that animates on hover).
  - Footer: Monospaced cataloguing data: `CATALOGUE ID: AT-2026-SPHERE` / `ALL RIGHTS RESERVED`.

---

# CONCEPT 03: HYBRID SPORTS-TECH ("KINETIC ARCHITECTURE")

```
   ┌───────────────────────────────────────────────────────────┐
   │ [KNTIC // LAB]         STATUS: ACTIVE           [CART / 01]│
   │ ───────────────────────────────────────────────────────── │
   │                                                           │
   │                    P U R E  I M P A C T                   │
   │                                                           │
   │                      ( |   ●   | )                        │
   │                     (  | BASKET|  )                       │
   │                      ( |  BALL | )                        │
   │                     . '  . ' . ' .                        │
   │                    [ IMPACT CLOUD ]                       │
   │                                                           │
   │ [CONFIGURATOR: READY]                  [EXPAND ARCHITECTURE]│
   └───────────────────────────────────────────────────────────┘
```

### 1. Art Direction & Visual Identity
- **Background Palette**: High-tempo contrast zones. Alternating light technical arena concrete (`#ECEBE6` / `#E2E1DC`) with brutalist obsidian carbon blocks (`#0E0E10`).
- **Atmospheric Lighting**: Precision architectural sports-arena lighting. Multiple crisp linear spotlights with high specular reflections, sharp contact shadows, and realistic dust/debris impact atmospherics (referencing the dust plume in Image 2).
- **Accents**: High-Visibility Blaze Orange (`#FF3B00` / `#FF5000`) paired with sharp technical monochrome contrasts (pure black on concrete, crisp white on carbon).
- **Typography System**:
  - Primary Display: *Formula Condensed / Monument Extended* (Ultra-bold, compressed, technical sports headline font).
  - Data & Labels: *Druk Text Wide* paired with technical tabular numbers for coordinates and panel specifications.
- **Overall Mood**: An elite aerospace-grade sports equipment design studio. Raw energy, physical impact, modular dissection, high velocity.

---

### 2. Detailed Section Blueprint

#### A. Loading State (Kinetic Telemetry)
- **Visual Composition**:
  - Mid-tone architectural concrete background (`#ECEBE6`) with a faint 40px geometric grid overlay.
  - In the center, the basketball is encapsulated inside a subtle technical wireframe circle with coordinate tick marks at 0°, 90°, 180°, and 270°.
  - The ball is stationary at first, then begins a rapid spin that accelerates up to 120 RPM as the loading progresses.
- **Interaction & Typography**:
  - Above the ball: Monospace readout `SYSTEM STATUS // ASSET SYNCHRONIZATION`.
  - Below the ball: A bold horizontal progress block filled with vibrant blaze orange: `78% COMPLETE`.
- **Exit Motion**:
  - Upon reaching 100%, the wireframe circle snaps outward like a camera aperture iris.
  - The ball freezes in mid-rotation, poised at the top of the viewport.

#### B. Main Navigation
- **Placement & Styling**:
  - Fixed brutalist header bar (`height: 64px`) with a solid light-grey background (`#E2E1DC`) and a sharp 2px solid black bottom border rule.
- **Layout Grid**:
  - **Left**: `KNTIC // LAB` followed by a live blinking green status pip `[LIVE RUN]`.
  - **Center**: High-contrast segmented pill menu:
    `[ 01: HERO ]` — `[ 02: KINETICS ]` — `[ 03: MODULAR ARCHITECTURE ]` — `[ 04: CONFIGURATOR ]`.
  - **Right**: High-visibility blaze orange rectangular button: `ACQUIRE SPHERE [DROP 01]`.

#### C. Hero Section
- **The Entry Sequence (High-Velocity Impact & Dust Cloud)**:
  - The frozen ball at the top of the screen accelerates downwards with explosive physical velocity.
  - **Ground Strike**: The ball slams into the concrete studio ground with realistic kinetic energy.
  - **Atmospheric Particle Burst**: Upon impact, a custom Three.js GPU particle burst generates an authentic, volumetric puff of court dust and fine chalk particles that billows outward from the base of the ball (directly inspired by Image 2).
  - **Rebounds**: Three rapid, sharp bounces with high physical stiffness before the ball comes to a firm, confident rest.
- **Layout & Copy Composition**:
  - Giant compressed title behind the sphere:
    `PURE IMPACT`
    (Rendered in solid black for `PURE` and blaze orange for `IMPACT`).
  - Top-left telemetry block:
    - `SPEC: 8-PANEL RADIAL CORE`
    - `SYSTEM: MODULAR SWAP ARCHITECTURE`
    - `COEFFICIENT: DAMPED EQUILIBRIUM`
  - Bottom control strip:
    - An interactive physical slider: `IMPACT VELOCITY [ 25% — 100% ]`. Dragging this slider triggers the ball to simulate a live drop test at varying heights!

#### D. Mouse Interaction (Kinetic Impulse Response)
- The mouse interaction behaves with physical inertia and kinetic response:
  - Moving the cursor quickly past the basketball imparts an angular impulse: the ball catches the velocity vector of the swipe and spins with realistic rotational friction and decay.
  - When the cursor is held steady near the ball, a micro-reticle locks onto the nearest panel seam, highlighting the panel's outline with a sharp 1px orange border.
  - Cursor changes to a crosshair icon with coordinates: `X: 42.8 | Y: -18.4`.

#### E. First Scroll Transition (The Modular Deconstruction / Exploded Knolling View)
- **ScrollTrigger Motion**:
  - As the user scrolls into the next section, the background transitions smoothly from concrete light grey (`#ECEBE6`) to dark carbon slate (`#141416`).
  - The basketball moves to the center of the screen.
  - **The Exploded Separation**: With a sharp, synchronized mechanical animation, the 8 exterior panels detach from the central core and float symmetrically into the **exploded knolling arrangement** shown in Image 4.
  - The central multi-arm radial skeleton core remains visible at the exact center, while the curved exterior shell panels arrange themselves radially around it with surgical precision.
- **Narrative Overlay**:
  - Section Title: `SNAP-FIT MODULAR ARCHITECTURE`.
  - Subtitle: *“Eight interchangeable exterior panels lock into a central radial skeleton. Instant tool-free reconfiguration for any court terrain.”*

#### F. Product Storytelling Section (The Angle of Return)
- **Visual Composition**:
  - The background switches to clean technical daylight grey.
  - The ball reassembles seamlessly as the user scrolls further down.
  - The storytelling section focuses on the two primary pillars of the product:
    1. **Exterior Panel Textures**: Showcasing split-panel combinations (e.g., natural pebbled leather combined with matte black high-grip composite, as seen in Image 2).
    2. **Radial Balance Symmetry**: An interactive cross-section view showing that every opposing panel pair is perfectly counterbalanced in weight.

#### G. Customization Section (The Kinetic Configurator)
- **Concept & Layout** (Modeled after the dedicated configurator shown in Image 1):
  - Deep carbon background (`#0A0A0C`).
  - **Left Screen Half**: Interactive 3D Ball Stage. The ball sits ready in either fully assembled or partially exploded view (toggleable via a UI switch `[ ASSEMBLED / EXPLODED ]`).
  - **Right Screen Half**: The Configurator Deck:
    - `PANEL 1-4 (PRIMARY HALF)`:
      - Swatch A: `RAW HORWEEN ORANGE` (Pebbled classic leather)
      - Swatch B: `CARBON STEALTH` (Matte vulcanized composite)
    - `PANEL 5-8 (SECONDARY HALF)`:
      - Swatch A: `RAW HORWEEN ORANGE`
      - Swatch B: `CARBON STEALTH`
      - Swatch C: `GRAPHITE ANODIZED`
    - `CHANNEL GROOVE DEPTH`:
      - Segmented toggle: `[ 2.0MM DEEP ]` — `[ 3.4MM AGGRESSIVE ]` — `[ FLUSH ]`.
  - As the user alters panels, the 3D ball dynamically rotates each chosen panel toward the camera with a crisp click sound effect and snap animation.

#### H. Final CTA (Ready to Bounce / The Drop Station)
- **Visual Staging**:
  - A massive, electrifying blaze orange banner spanning the full width of the screen (`#FF3B00`), mirroring the powerful footer block in Image 1.
  - Giant bold compressed typography:
    `READY TO BOUNCE // DROP 01`
  - In the center of the orange banner, a floating black module contains:
    - Text: `SECURE YOUR KNTIC // 01`
    - Subtext: *“Complete set includes Core Skeleton, 8 exterior modular panels, protective travel case, and numbered certificate.”*
    - Button: High-contrast rectangular black button with white bold text: `GRAB YOUR SPHERE [DROP 01]`.
  - Sub-footer contains technical lab credits, batch registration, and specification sheets.

---

## Comparative Matrix: The 3 Concepts

| Dimension | Concept 01: Dark Cinematic | Concept 02: Editorial Atelier | Concept 03: Hybrid Sports-Tech |
| :--- | :--- | :--- | :--- |
| **Primary Atmosphere** | Pitch obsidian, dramatic rim lights | Gallery off-white, diffused daylight | Alternating concrete light & carbon black |
| **Orange Accent** | Neon Tangerine (`#FF4E00`) | Burnt Terracotta (`#C84B23`) | High-Vis Blaze Orange (`#FF3B00`) |
| **Typography** | Architectural Grotesk (*Syne / Haas*) | Luxury Serif (*Canela / Editorial New*) | Compressed Sports-Tech (*Monument / Druk*) |
| **Hero Drop Feel** | Heavy gravitational drop with floor shockwave | Measured, dense, elegant single bounce | High-velocity slam with court dust puff |
| **Mouse Interaction** | Orbital 3D roll with dynamic specular light | Gentle tilt with surface magnifying loupe | Kinetic flick impulse & seam targeting reticles |
| **Deconstruction Style** | Radial panel float in darkroom forge | Museum plate inspection with rotating angles | Complete exploded knolling layout (Image 4) |
| **Target User Emotion** | Exclusivity, mystery, high-end power | Timeless craft, sculptural appreciation | Performance innovation, raw kinetic energy |

---

## Technical Feasibility & Implementation Blueprint (React + Three.js + GSAP)

### 1. Scene Graph & Component Tree
```tsx
// InteractiveSphereExperience.tsx
export function Experience() {
  return (
    <div className="relative w-full min-h-screen bg-canvas">
      {/* Fixed 3D Canvas Layer */}
      <div className="fixed inset-0 z-10 pointer-events-none">
        <Canvas
          shadows
          camera={{ position: [0, 0, 5], fov: 32 }}
          gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
        >
          <Suspense fallback={null}>
            <LightingRig currentConcept={concept} />
            <InteractiveBasketball
              state={interactionState}
              onPanelSelect={handlePanelSelect}
            />
            <Environment preset="studio" />
            <ContactShadows
              position={[0, -1.2, 0]}
              opacity={0.65}
              scale={6}
              blur={2.4}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* HTML DOM Content & ScrollTriggers */}
      <main className="relative z-20 pointer-events-auto">
        <LoadingOverlay onComplete={handleLoadingComplete} />
        <HeroSection />
        <MacroInspectionSection />
        <StorytellingSection />
        <CustomizationSection onConfigChange={setConfig} />
        <FinalCTA />
      </main>
    </div>
  );
}
```

### 2. 3D Model Hierarchy for Modular Shells
The 3D basketball asset (`basketball_modular.glb`) must be structured with 9 distinct sub-meshes:
```
Basketball_Root (Group)
├── Core_Skeleton (Central radial hub)
├── Panel_01 (Top-North hemisphere shell)
├── Panel_02 (Top-East hemisphere shell)
├── Panel_03 (Top-South hemisphere shell)
├── Panel_04 (Top-West hemisphere shell)
├── Panel_05 (Bottom-North hemisphere shell)
├── Panel_06 (Bottom-East hemisphere shell)
├── Panel_07 (Bottom-South hemisphere shell)
└── Panel_08 (Bottom-West hemisphere shell)
```
Each panel mesh has its own dedicated PBR material instance allowing dynamic swapping of `map`, `roughnessMap`, and `normalMap` in real time during the customization phase without rebuilding the geometry.

### 3. Physics & GSAP ScrollTrigger Orchestration
```javascript
// GSAP Timeline setup for Scroll-Driven Ball Choreography
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: "#main-container",
    start: "top top",
    end: "bottom bottom",
    scrub: 1.2,
  }
});

// Phase 1: Macro Zoom
tl.to(camera.position, { z: 2.2, y: 0.1, ease: "power2.inOut" }, "macro")
  .to(ballGroup.rotation, { x: 0.4, y: 1.8, ease: "none" }, "macro");

// Phase 2: Explode Panels into Knolling Layout
panels.forEach((panel, i) => {
  const targetPos = knollingCoordinates[i];
  tl.to(panel.position, {
    x: targetPos.x,
    y: targetPos.y,
    z: targetPos.z,
    ease: "power3.out"
  }, "explode");
});

// Phase 3: Reassemble and Lock
panels.forEach((panel) => {
  tl.to(panel.position, { x: 0, y: 0, z: 0, ease: "back.out(1.4)" }, "reassemble");
});
```

---

## Recommendation & Next Steps

Each concept delivers a distinct and uncompromising brand voice:
- If your goal is **maximum drama and high-ticket exclusivity**, choose **Concept 01 (Dark Cinematic)**.
- If your goal is **high-fashion recognition, sculptural prestige, and design purism**, choose **Concept 02 (Editorial Atelier)**.
- If your goal is **kinetic athletic power, technical modularity, and high-impact e-commerce engagement**, choose **Concept 03 (Hybrid Sports-Tech)**.
