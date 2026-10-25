import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { AVATARS, WORLD_LOCATIONS, IslandLocation, StationId, PlayerAnim } from '../types/game';
import { soundEngine } from '../audio/soundEngine';

// Module-level reusable math objects to prevent garbage collection hiccups
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();

export interface WorldCallbacks {
  onNearStation: (stationId: StationId | null, name: string) => void;
  onLockedBridgeBlocked: (nextStationId: number) => void;
  onPlayerMoved?: (x: number, y: number, z: number, rotY: number, anim: PlayerAnim) => void;
}

// Rigged Avatar Bone & Mesh References
interface AvatarRig {
  root: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftUpperArm: THREE.Group;
  leftForearm: THREE.Group;
  rightUpperArm: THREE.Group;
  rightForearm: THREE.Group;
  leftThigh: THREE.Group;
  leftCalf: THREE.Group;
  rightThigh: THREE.Group;
  rightCalf: THREE.Group;
  pack: THREE.Mesh;
  nameplate: THREE.Sprite;
  shadowDisc: THREE.Mesh;
}

export class MusicWorld {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private animFrameId: number | null = null;
  private callbacks: WorldCallbacks;

  // Local Player Rig & Kinematics State
  private playerRig!: AvatarRig;
  private playerPos = new THREE.Vector3(0, 0, 0);
  private playerVelocity = new THREE.Vector3(0, 0, 0);
  private playerVelocityY = 0;
  private isGrounded = true;
  private playerRotY = 0;
  private targetRotY = 0;
  private currentAnim: PlayerAnim = 'idle';
  private walkCycleTime = 0;
  private playerAvatarId: number = 1;
  private playerName: string = 'Pengembara';
  private playerRole: 'student' | 'teacher' = 'student';

  // Remote players rigs
  private remotePlayers = new Map<string, {
    rig: AvatarRig;
    targetPos: THREE.Vector3;
    targetRotY: number;
    anim: PlayerAnim;
    walkCycle: number;
    email?: string;
    avatarId: number;
    name: string;
  }>();

  // Bridge & island meshes
  private bridgeMeshes: {
    index: number;
    unlockStation: number;
    group: THREE.Group;
    barrier: THREE.Mesh;
    padlock: THREE.Group;
    from: IslandLocation;
    to: IslandLocation;
    energyNodes: THREE.Mesh[];
  }[] = [];

  private animatedProps: {
    mesh: THREE.Object3D;
    type: 'spin' | 'bob' | 'pulse' | 'orbit';
    basePos?: THREE.Vector3;
    speed: number;
    offset: number;
    radius?: number;
    center?: THREE.Vector3;
  }[] = [];

  private musicalStaffNotes: THREE.Mesh[] = [];
  private pianoKeys: { mesh: THREE.Mesh; note: string; basePosY: number; keyX: number; keyZ: number }[] = [];
  private particleSystems: THREE.Points[] = [];

  // Progression state
  private unlockedStations: Set<number> = new Set([1]);

  // Input states
  private keys: Record<string, boolean> = {};
  private joystickVector = { x: 0, y: 0 };
  private isPointerDown = false;
  private pointerStart = { x: 0, y: 0 };
  private camAngle = { theta: 0, phi: 0.42 };
  private camDistance = 14;

  // Proximity & Timing
  private activeNearbyStation: StationId | null = null;
  private lastFootstepTime = 0;
  private lastMoveBroadcastTime = 0;

  constructor(
    container: HTMLElement,
    avatarId: number,
    playerName: string,
    role: 'student' | 'teacher',
    unlocked: number[],
    callbacks: WorldCallbacks
  ) {
    this.container = container;
    this.playerAvatarId = avatarId;
    this.playerName = playerName;
    this.playerRole = role;
    this.unlockedStations = new Set(unlocked);
    this.callbacks = callbacks;

    // 1. Scene & Sky Gradient Atmosphere
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x130a2a);
    this.scene.fog = new THREE.FogExp2(0x130a2a, 0.0055);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 600);
    this.camera.position.set(0, 11, 16);

    // 2. High-Fidelity Sharp Renderer
    const isHeadless = navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.shadowMap.enabled = !isHeadless;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Mobile Touch & Gesture Optimization
    this.renderer.domElement.style.touchAction = 'none';
    this.renderer.domElement.style.userSelect = 'none';
    (this.renderer.domElement.style as any).webkitUserSelect = 'none';
    container.style.touchAction = 'none';
    container.style.userSelect = 'none';
    (container.style as any).webkitUserSelect = 'none';
    container.appendChild(this.renderer.domElement);

    // 3. Studio PBR Environment Reflection
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    this.clock = new THREE.Clock();

    // 4. Lighting & Visual Craft
    this.setupLighting();
    this.buildWorld();

    // 5. Build Local Rigged Humanoid Avatar
    this.playerRig = this.createRiggedHumanoid(this.playerAvatarId, this.playerName, true);
    this.scene.add(this.playerRig.root);

    // 6. Bind Input Handlers
    this.bindInputs();

    // 7. Pre-warm shader pipeline
    this.renderer.compile(this.scene, this.camera);

    // 8. Start Loop
    this.startLoop();
  }

  private setupLighting() {
    // Hemisphere fill light (celestial lilac sky, rich sapphire ground)
    const hemiLight = new THREE.HemisphereLight(0xffe8f8, 0x1a1240, 1.1);
    hemiLight.position.set(0, 60, 0);
    this.scene.add(hemiLight);

    // Warm Directional Key Sun
    const sunLight = new THREE.DirectionalLight(0xfff5e6, 2.2);
    sunLight.position.set(50, 80, 40);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 200;
    const d = 65;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0004;
    sunLight.shadow.normalBias = 0.02;
    this.scene.add(sunLight);

    // Cool cyan/purple rim backlight
    const rimLight = new THREE.DirectionalLight(0x818cf8, 0.9);
    rimLight.position.set(-45, 50, -45);
    this.scene.add(rimLight);

    // Radiant colored point lights on Plaza & Sanctuary
    const plazaPoint = new THREE.PointLight(0x38bdf8, 2.5, 35, 1.2);
    plazaPoint.position.set(0, 6, 0);
    this.scene.add(plazaPoint);
  }

  // --- World Building with Vibrant Musical Elements ---

  private buildWorld() {
    // 1. Build Floating Islands with layered geological crust
    WORLD_LOCATIONS.forEach((loc) => {
      this.createFloatingIsland(loc);
    });

    // 2. Connect Islands with Animated Rainbow Energy Bridges
    // Stations 6 and 7 connect ONLY to Station 3 (the existing game station) as requested!
    const bridgeConnections = [
      { fromId: 0, toId: 1, unlockStation: 1 },
      { fromId: 1, toId: 2, unlockStation: 2 },
      { fromId: 2, toId: 3, unlockStation: 3 },
      { fromId: 3, toId: 6, unlockStation: 3 }, // Connected directly and only to Game 1
      { fromId: 3, toId: 7, unlockStation: 3 }, // Connected directly and only to Game 1
      { fromId: 3, toId: 4, unlockStation: 4 },
      { fromId: 4, toId: 5, unlockStation: 5 }
    ];

    bridgeConnections.forEach((conn, idx) => {
      const fromLoc = WORLD_LOCATIONS.find(l => l.id === conn.fromId)!;
      const toLoc = WORLD_LOCATIONS.find(l => l.id === conn.toId)!;
      if (fromLoc && toLoc) {
        this.createBridge(idx, fromLoc, toLoc, conn.unlockStation);
      }
    });

    // 3. Orbiting 3D Grand Musical Staff with floating notes in sky
    this.createGrandOrbitingMusicalStaff();

    // 4. Background Magical Floating Clouds & Stardust
    this.createBackgroundClouds();
    this.createStardustParticles();
  }

  private createFloatingIsland(loc: IslandLocation) {
    const group = new THREE.Group();
    group.position.set(loc.x, 0, loc.z);

    const r = loc.radius;

    // Top Platform with beveled stone border ring (Non-green, non-avatar distinctive palette)
    const topGeo = new THREE.CylinderGeometry(r, r * 0.96, 2.5, 36);
    const topMat = new THREE.MeshStandardMaterial({
      color: loc.topColor,
      roughness: 0.55,
      metalness: 0.25
    });
    const topMesh = new THREE.Mesh(topGeo, topMat);
    topMesh.position.y = -1.25;
    topMesh.receiveShadow = true;
    group.add(topMesh);

    // Glowing stone rim border
    const rimGeo = new THREE.TorusGeometry(r * 0.98, 0.45, 12, 36);
    const rimMat = new THREE.MeshStandardMaterial({
      color: loc.rimColor,
      roughness: 0.25,
      metalness: 0.4,
      emissive: loc.rimColor,
      emissiveIntensity: 0.4
    });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.y = 0.02;
    group.add(rimMesh);

    // Geological Rock Underbelly with crystal spikes
    const underGeo = new THREE.ConeGeometry(r * 0.95, r * 1.45, 18);
    const underMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.85,
      metalness: 0.15
    });
    const underMesh = new THREE.Mesh(underGeo, underMat);
    underMesh.rotation.x = Math.PI;
    underMesh.position.y = -2.5 - (r * 1.45) / 2;
    underMesh.castShadow = true;
    group.add(underMesh);

    // Luminescent Fantasy Trees & Crystal Clusters around the island
    this.populateIslandFoliageAndCrystals(group, loc);

    // Island-specific landmark architecture
    if (loc.id === 0) {
      this.createPlazaCenterpiece(group, r);
    } else if (loc.id === 1) {
      this.createSlideSanctuaryLandmark(group);
    } else if (loc.id === 2) {
      this.createTheatreLandmark(group);
    } else if (loc.id === 3) {
      this.createNotWhackerLandmark(group);
    } else if (loc.id === 6) {
      this.createMusicBeamsLinerLandmark(group);
    } else if (loc.id === 7) {
      this.createNotNinjaLandmark(group);
    } else if (loc.id === 4) {
      this.createQuizPodiumLandmark(group);
    } else if (loc.id === 5) {
      this.createEmojiShrineLandmark(group);
    }

    // Signpost
    const signGroup = this.createSignpost(loc.name, loc.id === 0 ? "START HERE" : `STATION ${loc.id}`);
    signGroup.position.set(0, 0, r * 0.72);
    group.add(signGroup);

    this.scene.add(group);
  }

  private populateIslandFoliageAndCrystals(parent: THREE.Group, loc: IslandLocation) {
    const r = loc.radius;
    // Crystalline clusters around perimeter
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.3;
      const dist = r * 0.86;
      const crystal = this.createCrystalCluster(loc.crystalColor);
      crystal.position.set(Math.cos(angle) * dist, 0.2, Math.sin(angle) * dist);
      parent.add(crystal);
    }

    // Dense Musical Note Flowers with glowing note buds
    const musicalSymbols = ['𝄞', '𝄢', '♩', '♪', '♫', '♬', '♯', '♭'];
    for (let f = 0; f < 8; f++) {
      const angle = (f / 8) * Math.PI * 2 + 0.2;
      const dist = r * 0.72;
      const flower = this.createMusicalNoteFlower(musicalSymbols[f % musicalSymbols.length], loc.crystalColor);
      flower.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
      parent.add(flower);
      this.animatedProps.push({
        mesh: flower,
        type: 'bob',
        basePos: flower.position.clone(),
        speed: 1.5 + (f % 4) * 0.3,
        offset: f * 0.8
      });
    }

    // Two Grand Musical Totem Pillars on each island with rotating 3D symbols
    const islandSymbols: Record<number, [string, string]> = {
      0: ['𝄞', '𝄢'],
      1: ['𝄞', '♩'],
      2: ['♫', '♬'],
      3: ['♯', '♭'],
      4: ['𝄢', '♪'],
      5: ['𝄞', '♫']
    };
    const [sym1, sym2] = islandSymbols[loc.id] || ['𝄞', '♫'];

    const totem1 = this.createMusicalTotemPillar(sym1, loc.crystalColor);
    totem1.position.set(-r * 0.78, 0, 0);
    parent.add(totem1);

    const totem2 = this.createMusicalTotemPillar(sym2, loc.crystalColor);
    totem2.position.set(r * 0.78, 0, 0);
    parent.add(totem2);

    // Fantasy Musical Trees on islands (except Plaza center)
    if (loc.id > 0) {
      [-r * 0.62, r * 0.62].forEach((treeX, idx) => {
        const treeZ = (idx === 0 ? -1 : 1) * r * 0.52;
        const tree = this.createFantasyMusicTree(loc.crystalColor);
        tree.position.set(treeX, 0, treeZ);
        parent.add(tree);
      });
    }
  }

  private createMusicalNoteFlower(symbol: string, color: number): THREE.Group {
    const group = new THREE.Group();
    // Green stem
    const stemGeo = new THREE.CylinderGeometry(0.04, 0.05, 1.2, 8);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 0.6;
    group.add(stem);

    // Glowing musical note head
    const sprite = this.createTextSprite(symbol, 64, 1.1);
    sprite.position.y = 1.3;
    group.add(sprite);

    return group;
  }

  private createMusicalTotemPillar(symbol: string, color: number): THREE.Group {
    const group = new THREE.Group();
    // Golden ornate base
    const baseGeo = new THREE.CylinderGeometry(0.5, 0.7, 1.8, 12);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0xca8a04,
      emissiveIntensity: 0.3
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.9;
    base.castShadow = true;
    group.add(base);

    // Hovering 3D Musical Symbol Beacon
    const sprite = this.createTextSprite(symbol, 72, 1.8);
    sprite.position.y = 2.4;
    group.add(sprite);
    this.animatedProps.push({
      mesh: sprite,
      type: 'bob',
      basePos: sprite.position.clone(),
      speed: 1.8,
      offset: Math.random() * 2
    });

    return group;
  }

  private createCrystalCluster(hexColor: number): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshPhysicalMaterial({
      color: hexColor,
      roughness: 0.1,
      metalness: 0.3,
      transmission: 0.8,
      thickness: 1.5,
      ior: 1.6,
      emissive: hexColor,
      emissiveIntensity: 0.4
    });

    [-0.3, 0, 0.3].forEach((ox, i) => {
      const geo = new THREE.OctahedronGeometry(0.5 + i * 0.2, 0);
      geo.scale(0.5, 1.8 + i * 0.3, 0.5);
      const m = new THREE.Mesh(geo, mat);
      m.position.set(ox, (1.8 + i * 0.3) / 2, (Math.random() - 0.5) * 0.3);
      m.rotation.set((Math.random() - 0.5) * 0.3, Math.random() * Math.PI, (Math.random() - 0.5) * 0.3);
      m.castShadow = true;
      group.add(m);
    });

    return group;
  }

  private createFantasyMusicTree(foliageColor: number): THREE.Group {
    const tree = new THREE.Group();

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 3.5, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x581c87, roughness: 0.8 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.75;
    trunk.castShadow = true;
    tree.add(trunk);

    // Multi-canopy layered foliage with glowing musical notes
    const foliageMat = new THREE.MeshStandardMaterial({
      color: foliageColor,
      emissive: foliageColor,
      emissiveIntensity: 0.25,
      roughness: 0.4
    });

    [
      { y: 3.6, r: 1.8 },
      { y: 4.8, r: 1.4 },
      { y: 5.8, r: 0.9 }
    ].forEach(layer => {
      const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(layer.r, 1), foliageMat);
      puff.position.y = layer.y;
      puff.castShadow = true;
      tree.add(puff);
    });

    // Hanging musical note
    const note = this.createTextSprite('🎵', 64, 0.9);
    note.position.set(0.8, 3.8, 0.8);
    tree.add(note);

    return tree;
  }

  // --- Grand Orbiting 3D Musical Staff Ribbon ---
  private createGrandOrbitingMusicalStaff() {
    const staffGroup = new THREE.Group();
    // 5 spiral ribbons
    const curvePoints: THREE.Vector3[] = [];
    const totalPoints = 80;
    const radius = 55;
    const heightSpan = 35;

    for (let i = 0; i <= totalPoints; i++) {
      const t = i / totalPoints;
      const angle = t * Math.PI * 3.5;
      const x = Math.cos(angle) * (radius + Math.sin(t * 4) * 8);
      const z = Math.sin(angle) * (radius + Math.sin(t * 4) * 8);
      const y = 8 + Math.sin(t * Math.PI) * heightSpan;
      curvePoints.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(curvePoints);

    // 5 parallel lines for staff
    [-0.8, -0.4, 0, 0.4, 0.8].forEach((offsetY) => {
      const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.1, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xeab308,
        emissiveIntensity: 0.6,
        roughness: 0.2,
        metalness: 0.8
      });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      tube.position.y = offsetY;
      staffGroup.add(tube);
    });

    // Floating 3D notes along the staff
    const noteSymbols = ['𝄞', '♩', '♪', '♫', '♬', '𝄢'];
    for (let i = 0; i < 14; i++) {
      const t = (i / 14);
      const pt = curve.getPoint(t);
      const symbol = noteSymbols[i % noteSymbols.length];
      const sprite = this.createTextSprite(symbol, 72, 2.2);
      sprite.position.copy(pt).add(new THREE.Vector3(0, 1.2, 0));
      staffGroup.add(sprite);
      this.animatedProps.push({
        mesh: sprite,
        type: 'bob',
        basePos: sprite.position.clone(),
        speed: 1.8 + (i % 3) * 0.4,
        offset: i
      });
    }

    this.scene.add(staffGroup);
    this.animatedProps.push({ mesh: staffGroup, type: 'spin', speed: 0.03, offset: 0 });
  }

  // --- Central Music Plaza: Interactive Piano Keys & Golden Treble Monument ---
  private createPlazaCenterpiece(parent: THREE.Group, radius: number) {
    // 1. Interactive 3D Piano Key Stepping Ring
    const keyCount = 24;
    const ringRadius = radius * 0.52;
    const noteNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

    for (let i = 0; i < keyCount; i++) {
      const angle = (i / keyCount) * Math.PI * 2;
      const isBlack = (i % 7 !== 2 && i % 7 !== 6) && (i % 2 === 1);
      const keyW = isBlack ? 0.7 : 1.1;
      const keyL = isBlack ? 1.6 : 2.5;
      const keyH = 0.25;

      const keyGeo = new THREE.BoxGeometry(keyW, keyH, keyL);
      const keyMat = new THREE.MeshStandardMaterial({
        color: isBlack ? 0x1e1b4b : 0xf8fafc,
        roughness: 0.2,
        metalness: 0.3
      });
      const keyMesh = new THREE.Mesh(keyGeo, keyMat);

      const kx = Math.cos(angle) * ringRadius;
      const kz = Math.sin(angle) * ringRadius;
      keyMesh.position.set(kx, keyH / 2 + 0.05, kz);
      keyMesh.lookAt(0, keyMesh.position.y, 0);
      keyMesh.receiveShadow = true;
      parent.add(keyMesh);

      const note = noteNames[i % noteNames.length];
      this.pianoKeys.push({
        mesh: keyMesh,
        note,
        basePosY: keyMesh.position.y,
        keyX: kx,
        keyZ: kz
      });
    }

    // 2. Central Golden Treble Clef Monument
    const baseGeo = new THREE.CylinderGeometry(2.8, 3.4, 0.9, 20);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x4f46e5, roughness: 0.2, metalness: 0.6 });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.45;
    baseMesh.castShadow = true;
    parent.add(baseMesh);

    const clefGroup = this.createTrebleClefModel(0xfacc15);
    clefGroup.position.set(0, 3.6, 0);
    clefGroup.scale.set(1.5, 1.5, 1.5);
    parent.add(clefGroup);
    this.animatedProps.push({ mesh: clefGroup, type: 'spin', speed: 0.7, offset: 0 });

    // 3. Golden Concert Harp Monument
    const harp = this.createGoldenHarp();
    harp.position.set(-6, 0, -3);
    harp.rotation.y = Math.PI * 0.25;
    parent.add(harp);
  }

  private createGoldenHarp(): THREE.Group {
    const harp = new THREE.Group();
    // Frame
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.9,
      roughness: 0.15,
      emissive: 0xca8a04,
      emissiveIntensity: 0.3
    });

    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 5.5, 12), frameMat);
    pillar.position.set(-1.4, 2.75, 0);
    harp.add(pillar);

    const neck = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.16, 8, 24, Math.PI * 0.9), frameMat);
    neck.position.set(0, 5.2, 0);
    neck.rotation.z = Math.PI * 0.2;
    harp.add(neck);

    // Glowing strings
    const strMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9 });
    for (let s = 0; s < 7; s++) {
      const stringMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3.5 - s * 0.35, 4), strMat);
      stringMesh.position.set(-1.1 + s * 0.35, 2.3 - s * 0.1, 0);
      harp.add(stringMesh);
    }

    return harp;
  }

  // --- Landmarks for 5 Stations ---
  private createSlideSanctuaryLandmark(parent: THREE.Group) {
    const portalArch = new THREE.Group();
    portalArch.position.set(0, 0, -3.5);

    // Deep Midnight Indigo Pillars with glowing crystal caps
    [-3.8, 3.8].forEach(x => {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.85, 7.5, 12),
        new THREE.MeshStandardMaterial({ color: 0x312e81, roughness: 0.25, metalness: 0.6 })
      );
      pillar.position.set(x, 3.75, 0);
      pillar.castShadow = true;
      portalArch.add(pillar);

      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(1.1, 2.2, 8),
        new THREE.MeshPhysicalMaterial({ color: 0x818cf8, transmission: 0.8, roughness: 0.1, emissive: 0x6366f1, emissiveIntensity: 0.5 })
      );
      cap.position.set(x, 8.5, 0);
      portalArch.add(cap);
    });

    // Hologram screen in Midnight Cosmic Indigo
    const screenGeo = new THREE.BoxGeometry(6.5, 4.2, 0.2);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 340;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 340);
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(12, 12, 488, 316);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SLIDE SANCTUARY 🎼', 256, 75);
    ctx.font = '24px Fredoka, sans-serif';
    ctx.fillText('Pusat Belajar Baluk & Not', 256, 130);
    ctx.fillStyle = '#a5b4fc';
    ctx.fillText('★ Tekan E untuk Buka Slaid ★', 256, 260);

    const screenTex = new THREE.CanvasTexture(canvas);
    screenTex.colorSpace = THREE.SRGBColorSpace;
    const screenMesh = new THREE.Mesh(screenGeo, new THREE.MeshBasicMaterial({ map: screenTex }));
    screenMesh.position.set(0, 4.5, 0);
    portalArch.add(screenMesh);

    // Floating Golden Treble Clef Monument on Arch
    const clef = this.createTrebleClefModel(0xfacc15);
    clef.position.set(0, 8.2, 0);
    clef.scale.set(0.9, 0.9, 0.9);
    portalArch.add(clef);
    this.animatedProps.push({ mesh: clef, type: 'spin', speed: 0.8, offset: 0 });

    parent.add(portalArch);
  }

  private createTheatreLandmark(parent: THREE.Group) {
    const theatreGroup = new THREE.Group();
    theatreGroup.position.set(0, 0, -2.5);

    const curveGeo = new THREE.CylinderGeometry(6.5, 6.5, 4.8, 28, 1, true, -Math.PI / 3, (2 * Math.PI) / 3);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 320;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#431407';
    ctx.fillRect(0, 0, 512, 320);
    ctx.fillStyle = '#9a3412';
    ctx.fillRect(12, 12, 488, 296);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CLOUD THEATRE 🎬', 256, 85);
    ctx.font = '24px Fredoka, sans-serif';
    ctx.fillText('Teater Video Animasi Muzik', 256, 140);
    ctx.fillStyle = '#fed7aa';
    ctx.fillText('▶ Tekan E untuk Tonton', 256, 255);

    const screenTex = new THREE.CanvasTexture(canvas);
    screenTex.colorSpace = THREE.SRGBColorSpace;
    const screenMesh = new THREE.Mesh(curveGeo, new THREE.MeshBasicMaterial({ map: screenTex, side: THREE.DoubleSide }));
    screenMesh.position.set(0, 3.8, -1);
    screenMesh.rotation.y = Math.PI;
    theatreGroup.add(screenMesh);

    // Glowing Bass Clef Crest on Top
    const clefSprite = this.createTextSprite('𝄢', 84, 2.8);
    clefSprite.position.set(0, 7.2, -1);
    theatreGroup.add(clefSprite);
    this.animatedProps.push({ mesh: clefSprite, type: 'bob', basePos: new THREE.Vector3(0, 7.2, -1), speed: 1.6, offset: 1 });

    parent.add(theatreGroup);
  }

  // --- Game Station 1: Not Whacker Landmark ---
  private createNotWhackerLandmark(parent: THREE.Group) {
    const arcadeGroup = new THREE.Group();
    arcadeGroup.position.set(0, 0, -3);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 6.5, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x701a75, roughness: 0.25, metalness: 0.6 })
    );
    frame.position.y = 3.25;
    arcadeGroup.add(frame);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 380;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#4a044e';
    ctx.fillRect(0, 0, 512, 380);
    ctx.fillStyle = '#a21caf';
    ctx.fillRect(15, 15, 482, 350);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NOT WHACKER 🔨', 256, 85);
    ctx.font = '22px Fredoka, sans-serif';
    ctx.fillText('Stesen Game 1: Ketuk Not Pantas', 256, 140);
    ctx.fillStyle = '#f5d0fe';
    ctx.font = '20px Fredoka, sans-serif';
    ctx.fillText('Pautan Guru / Latihan Interaktif', 256, 195);
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 24px Fredoka, sans-serif';
    ctx.fillText('★ Tekan E untuk Main ★', 256, 290);

    const arcadeTex = new THREE.CanvasTexture(canvas);
    arcadeTex.colorSpace = THREE.SRGBColorSpace;
    const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3.4), new THREE.MeshBasicMaterial({ map: arcadeTex }));
    screenMesh.position.set(0, 3.6, 1.62);
    arcadeGroup.add(screenMesh);

    // Whacker Mallets & Note Beacons
    [-2.6, 2.6].forEach((x, idx) => {
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.6, 1.8, 16),
        new THREE.MeshStandardMaterial({ color: 0x86198f, metalness: 0.5, roughness: 0.3 })
      );
      tube.position.set(x, 0.9, 1.2);
      arcadeGroup.add(tube);

      const moleNote = this.createTextSprite(idx === 0 ? '♩' : '♪', 64, 1.4);
      moleNote.position.set(x, 2.2, 1.2);
      arcadeGroup.add(moleNote);
      this.animatedProps.push({
        mesh: moleNote,
        type: 'bob',
        basePos: moleNote.position.clone(),
        speed: 3.0,
        offset: idx * 1.5
      });
    });

    // Glowing beamed notes crown
    const noteCrown = this.createTextSprite('🔨', 80, 2.5);
    noteCrown.position.set(0, 7.4, 0);
    arcadeGroup.add(noteCrown);
    this.animatedProps.push({ mesh: noteCrown, type: 'spin', speed: 1.2, offset: 0 });

    parent.add(arcadeGroup);
  }

  // --- Game Station 2: Music Beams Liner Landmark ---
  private createMusicBeamsLinerLandmark(parent: THREE.Group) {
    const beamsGroup = new THREE.Group();
    beamsGroup.position.set(0, 0, -2.8);

    // Futuristic Cyan-Ocean Synthesizer Console
    const consoleMesh = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 5.8, 2.8),
      new THREE.MeshStandardMaterial({ color: 0x164e63, roughness: 0.2, metalness: 0.7 })
    );
    consoleMesh.position.y = 2.9;
    beamsGroup.add(consoleMesh);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 380;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#083344';
    ctx.fillRect(0, 0, 512, 380);
    ctx.fillStyle = '#0e7490';
    ctx.fillRect(15, 15, 482, 350);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MUSIC BEAMS LINER ⚡', 256, 85);
    ctx.font = '22px Fredoka, sans-serif';
    ctx.fillText('Stesen Game 2: Garisan Baluk Muzik', 256, 140);
    ctx.fillStyle = '#cffafe';
    ctx.font = '20px Fredoka, sans-serif';
    ctx.fillText('Sambung Not Pada Garisan Baluk', 256, 195);
    ctx.fillStyle = '#67e8f9';
    ctx.font = 'bold 24px Fredoka, sans-serif';
    ctx.fillText('★ Tekan E untuk Main ★', 256, 290);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.2), new THREE.MeshBasicMaterial({ map: tex }));
    screen.position.set(0, 3.3, 1.42);
    beamsGroup.add(screen);

    // Laser Beam Rings
    [-2.2, 2.2].forEach(px => {
      const pylon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.45, 6.2, 12),
        new THREE.MeshStandardMaterial({ color: 0x0891b2, emissive: 0x06b6d4, emissiveIntensity: 0.4, metalness: 0.8 })
      );
      pylon.position.set(px, 3.1, 0);
      beamsGroup.add(pylon);
    });

    // Floating Beam Icon
    const beamSprite = this.createTextSprite('⚡', 80, 2.5);
    beamSprite.position.set(0, 6.8, 0);
    beamsGroup.add(beamSprite);
    this.animatedProps.push({ mesh: beamSprite, type: 'spin', speed: 1.0, offset: 1 });

    parent.add(beamsGroup);
  }

  // --- Game Station 3: Not Ninja Landmark ---
  private createNotNinjaLandmark(parent: THREE.Group) {
    const ninjaGroup = new THREE.Group();
    ninjaGroup.position.set(0, 0, -2.8);

    // Dojo Pagoda Arcade Structure in Burnished Amber-Bronze
    const pagodaMesh = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 5.8, 2.8),
      new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.3, metalness: 0.6 })
    );
    pagodaMesh.position.y = 2.9;
    ninjaGroup.add(pagodaMesh);

    // Slanted Dojo Roof Eaves
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(3.8, 1.5, 4),
      new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.3, metalness: 0.5 })
    );
    roof.position.set(0, 6.2, 0);
    roof.rotation.y = Math.PI / 4;
    ninjaGroup.add(roof);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 380;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#270e03';
    ctx.fillRect(0, 0, 512, 380);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(15, 15, 482, 350);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NOT NINJA ⚔️', 256, 85);
    ctx.font = '22px Fredoka, sans-serif';
    ctx.fillText('Stesen Game 3: Hiris Not Tangkas', 256, 140);
    ctx.fillStyle = '#fed7aa';
    ctx.font = '20px Fredoka, sans-serif';
    ctx.fillText('Latihan Kelajuan & Pengecaman Not', 256, 195);
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 24px Fredoka, sans-serif';
    ctx.fillText('★ Tekan E untuk Main ★', 256, 290);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.2), new THREE.MeshBasicMaterial({ map: tex }));
    screen.position.set(0, 3.3, 1.42);
    ninjaGroup.add(screen);

    // Crossed Golden Katana Crest on Top
    const ninjaSprite = this.createTextSprite('⚔️', 80, 2.5);
    ninjaSprite.position.set(0, 7.6, 0);
    ninjaGroup.add(ninjaSprite);
    this.animatedProps.push({ mesh: ninjaSprite, type: 'spin', speed: 1.4, offset: 2 });

    parent.add(ninjaGroup);
  }

  private createQuizPodiumLandmark(parent: THREE.Group) {
    const quizGroup = new THREE.Group();
    quizGroup.position.set(0, 0, -2.5);

    const starMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(3.6, 4.4, 1.3, 5),
      new THREE.MeshStandardMaterial({ color: 0x115e59, roughness: 0.3, metalness: 0.6 })
    );
    starMesh.position.y = 0.65;
    quizGroup.add(starMesh);

    const beacon = new THREE.Mesh(
      new THREE.OctahedronGeometry(2.2, 0),
      new THREE.MeshPhysicalMaterial({ color: 0x14b8a6, emissive: 0x0d9488, emissiveIntensity: 0.7, roughness: 0.1 })
    );
    beacon.position.y = 4.5;
    quizGroup.add(beacon);
    this.animatedProps.push({ mesh: beacon, type: 'spin', speed: 1.2, offset: 0 });
    this.animatedProps.push({ mesh: beacon, type: 'bob', basePos: new THREE.Vector3(0, 4.5, 0), speed: 2, offset: 0 });

    // Floating Golden Quaver note above beacon
    const noteSprite = this.createTextSprite('♪', 84, 2.2);
    noteSprite.position.set(0, 7.5, 0);
    quizGroup.add(noteSprite);
    this.animatedProps.push({ mesh: noteSprite, type: 'spin', speed: 1.0, offset: 0 });

    parent.add(quizGroup);
  }

  private createEmojiShrineLandmark(parent: THREE.Group) {
    const shrineGroup = new THREE.Group();
    shrineGroup.position.set(0, 0, -2.5);

    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(3.8, 0.45, 16, 32, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x881337, roughness: 0.2, metalness: 0.5, emissive: 0x4c0519, emissiveIntensity: 0.4 })
    );
    arch.position.y = 2.6;
    arch.rotation.z = Math.PI;
    shrineGroup.add(arch);

    const heartMesh = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.8, 0),
      new THREE.MeshPhysicalMaterial({ color: 0xbe123c, emissive: 0x9f1239, emissiveIntensity: 0.6, roughness: 0.1 })
    );
    heartMesh.position.y = 3.8;
    shrineGroup.add(heartMesh);
    this.animatedProps.push({ mesh: heartMesh, type: 'pulse', speed: 2.2, offset: 0 });
    this.animatedProps.push({ mesh: heartMesh, type: 'spin', speed: 0.6, offset: 0 });

    // Floating Treble Clef above feedback shrine
    const clefTop = this.createTextSprite('𝄞', 80, 2.4);
    clefTop.position.set(0, 6.8, 0);
    shrineGroup.add(clefTop);
    this.animatedProps.push({ mesh: clefTop, type: 'bob', basePos: new THREE.Vector3(0, 6.8, 0), speed: 1.5, offset: 2 });

    parent.add(shrineGroup);
  }

  private createTrebleClefModel(hexColor: number): THREE.Group {
    const group = new THREE.Group();
    const stemMat = new THREE.MeshStandardMaterial({
      color: hexColor,
      roughness: 0.2,
      metalness: 0.85,
      emissive: hexColor,
      emissiveIntensity: 0.45
    });

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 4.2, 16), stemMat);
    group.add(stem);

    const loop1 = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.18, 12, 28), stemMat);
    loop1.position.set(-0.25, -0.7, 0);
    group.add(loop1);

    const loop2 = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.15, 12, 28, Math.PI * 1.5), stemMat);
    loop2.position.set(0.35, 1.0, 0);
    loop2.rotation.z = Math.PI * 0.4;
    group.add(loop2);

    const topSphere = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), stemMat);
    topSphere.position.set(0, 2.1, 0);
    group.add(topSphere);

    const botSphere = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 16), stemMat);
    botSphere.position.set(0, -2.2, 0);
    group.add(botSphere);

    return group;
  }

  private createSignpost(title: string, sub: string): THREE.Group {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 2.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 })
    );
    pole.position.y = 1.2;
    group.add(pole);

    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 160;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#312e81';
    ctx.fillRect(0, 0, 384, 160);
    ctx.fillStyle = '#4f46e5';
    ctx.fillRect(6, 6, 372, 148);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 22px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(sub, 192, 45);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Fredoka, sans-serif';
    ctx.fillText(title, 192, 95);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 0.1), new THREE.MeshBasicMaterial({ map: tex }));
    board.position.set(0, 2.2, 0);
    group.add(board);

    return group;
  }

  // --- Bridges Connecting Islands with Animated Rainbow Light Pulse ---
  private createBridge(index: number, from: IslandLocation, to: IslandLocation, unlockStation: number) {
    const group = new THREE.Group();
    const isUnlocked = this.unlockedStations.has(unlockStation);

    const pFrom = new THREE.Vector3(from.x, 0, from.z);
    const pTo = new THREE.Vector3(to.x, 0, to.z);
    const dir = new THREE.Vector3().subVectors(pTo, pFrom);
    const dist = dir.length();
    const mid = new THREE.Vector3().addVectors(pFrom, pTo).multiplyScalar(0.5);

    group.position.copy(mid);
    group.lookAt(pTo);

    const stepCount = Math.floor(dist / 2.2);
    const stepMat = new THREE.MeshStandardMaterial({
      color: isUnlocked ? 0x38bdf8 : 0x475569,
      emissive: isUnlocked ? 0x0284c7 : 0x000000,
      emissiveIntensity: isUnlocked ? 0.5 : 0,
      roughness: 0.25,
      metalness: 0.4
    });

    for (let s = -stepCount / 2; s <= stepCount / 2; s++) {
      const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.35, 1.7), stepMat);
      stepMesh.position.set(0, -0.2, s * 2.2);
      stepMesh.receiveShadow = true;
      group.add(stepMesh);
    }

    // Floating Musical Rings along the bridge pathway
    const ringSymbols = ['𝄞', '𝄢', '♫', '♬'];
    [-dist * 0.28, dist * 0.28].forEach((rz, idx) => {
      const ringArch = new THREE.Mesh(
        new THREE.TorusGeometry(2.2, 0.12, 12, 28, Math.PI),
        new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          emissive: 0xeab308,
          emissiveIntensity: 0.5,
          roughness: 0.2,
          metalness: 0.8
        })
      );
      ringArch.position.set(0, 1.8, rz);
      ringArch.rotation.z = Math.PI;
      group.add(ringArch);

      const ringNote = this.createTextSprite(ringSymbols[(index + idx) % ringSymbols.length], 64, 1.3);
      ringNote.position.set(0, 3.4, rz);
      group.add(ringNote);
      this.animatedProps.push({
        mesh: ringNote,
        type: 'bob',
        basePos: ringNote.position.clone(),
        speed: 2.0,
        offset: idx + index
      });
    });

    // Moving energy nodes along the bridge
    const energyNodes: THREE.Mesh[] = [];
    const nodeGeo = new THREE.SphereGeometry(0.35, 12, 12);
    const nodeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    for (let k = 0; k < 3; k++) {
      const node = new THREE.Mesh(nodeGeo, nodeMat);
      node.visible = isUnlocked;
      group.add(node);
      energyNodes.push(node);
    }

    // Barrier for locked bridge
    const barrier = new THREE.Mesh(
      new THREE.CylinderGeometry(2.8, 2.8, 4.5, 16),
      new THREE.MeshPhysicalMaterial({
        color: 0xef4444,
        emissive: 0xef4444,
        emissiveIntensity: 0.6,
        roughness: 0.1,
        transmission: 0.85,
        transparent: true,
        opacity: isUnlocked ? 0 : 0.65,
        depthWrite: false
      })
    );
    barrier.position.set(0, 2.0, 0);
    barrier.visible = !isUnlocked;
    group.add(barrier);

    // Golden Padlock above locked bridge
    const padlockGroup = new THREE.Group();
    const lockBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 1.1, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2, metalness: 0.8 })
    );
    lockBody.position.y = 2.8;
    padlockGroup.add(lockBody);

    const lockShackle = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.13, 8, 16, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9 })
    );
    lockShackle.position.set(0, 3.35, 0);
    padlockGroup.add(lockShackle);

    padlockGroup.visible = !isUnlocked;
    group.add(padlockGroup);
    this.animatedProps.push({ mesh: padlockGroup, type: 'bob', basePos: padlockGroup.position.clone(), speed: 2, offset: index });

    this.scene.add(group);
    this.bridgeMeshes.push({ index, unlockStation, group, barrier, padlock: padlockGroup, from, to, energyNodes });
  }

  public updateUnlockedStations(stations: number[]) {
    this.unlockedStations = new Set(stations);
    this.bridgeMeshes.forEach(bridge => {
      const isUnlocked = this.unlockedStations.has(bridge.unlockStation);
      bridge.barrier.visible = !isUnlocked;
      bridge.padlock.visible = !isUnlocked;
      bridge.energyNodes.forEach(n => n.visible = isUnlocked);
      if (isUnlocked) {
        soundEngine.playStationUnlock();
      }
    });
  }

  // --- Background Clouds & Stardust Particles ---
  private createBackgroundClouds() {
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0.05,
      transparent: true,
      opacity: 0.85
    });

    for (let c = 0; c < 20; c++) {
      const cloudGroup = new THREE.Group();
      const angle = (c / 20) * Math.PI * 2;
      const dist = 80 + Math.random() * 45;
      const height = -12 + Math.random() * 30;

      cloudGroup.position.set(Math.cos(angle) * dist, height, Math.sin(angle) * dist);

      for (let p = 0; p < 6; p++) {
        const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(6 + Math.random() * 4, 1), cloudMat);
        puff.position.set((p - 2.5) * 4, (Math.random() - 0.5) * 2.5, (Math.random() - 0.5) * 3);
        cloudGroup.add(puff);
      }

      this.scene.add(cloudGroup);
      this.animatedProps.push({ mesh: cloudGroup, type: 'spin', speed: 0.04 * (c % 2 === 0 ? 1 : -1), offset: c });
    }
  }

  private createStardustParticles() {
    const count = 400;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const palette = [
      new THREE.Color(0x60a5fa),
      new THREE.Color(0xf472b6),
      new THREE.Color(0xfacc15),
      new THREE.Color(0x34d399)
    ];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 160;
      positions[i * 3 + 1] = Math.random() * 40 - 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 160;

      const col = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.55,
      vertexColors: true,
      transparent: true,
      opacity: 0.85
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);
    this.particleSystems.push(points);
  }

  // --- Rigged Humanoid Avatar Assembly with Jointed Limbs ---
  // --- Rigged Humanoid Avatar Assembly with Jointed Limbs ---
  private createRiggedHumanoid(avatarId: number, name: string, isLocalPlayer: boolean): AvatarRig {
    const avatar = AVATARS.find(a => a.id === avatarId) || AVATARS[0];
    const isGlowingTeacher = avatar.id === 6 || avatar.isTeacherOnly === true;
    const root = new THREE.Group();

    // Hips / Pelvis
    const hips = new THREE.Group();
    hips.position.y = 1.0;
    root.add(hips);

    // Torso (tunic/jacket)
    const torso = new THREE.Group();
    const torsoMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.46, 0.9, 12),
      new THREE.MeshStandardMaterial({
        color: avatar.primaryColor,
        roughness: isGlowingTeacher ? 0.2 : 0.45,
        metalness: isGlowingTeacher ? 0.4 : 0.2,
        emissive: isGlowingTeacher ? new THREE.Color(0xfacc15) : new THREE.Color(0x000000),
        emissiveIntensity: isGlowingTeacher ? 0.85 : 0
      })
    );
    torsoMesh.position.y = 0.45;
    torsoMesh.castShadow = true;
    torso.add(torsoMesh);

    // Vest / Belt accent
    const belt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.48, 0.16, 12),
      new THREE.MeshStandardMaterial({
        color: avatar.secondaryColor,
        roughness: 0.4,
        emissive: isGlowingTeacher ? new THREE.Color(0x06b6d4) : new THREE.Color(0x000000),
        emissiveIntensity: isGlowingTeacher ? 0.8 : 0
      })
    );
    belt.position.y = 0.1;
    torso.add(belt);
    hips.add(torso);

    // Head Group
    const head = new THREE.Group();
    head.position.y = 1.0;

    const headMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffdfba, roughness: 0.7, metalness: 0.05 })
    );
    headMesh.castShadow = true;
    head.add(headMesh);

    // Face eyes & happy smile
    [-0.14, 0.14].forEach(x => {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x0f172a })
      );
      eye.position.set(x, 0.04, 0.38);
      head.add(eye);
    });

    if (isGlowingTeacher) {
      // 1. Radiant Glowing Crown
      const crown = new THREE.Mesh(
        new THREE.CylinderGeometry(0.44, 0.46, 0.22, 16),
        new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          emissive: 0xfacc15,
          emissiveIntensity: 0.95,
          roughness: 0.2,
          metalness: 0.8
        })
      );
      crown.position.set(0, 0.42, 0);
      head.add(crown);

      // Crown Jewels & Spikes
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const spike = new THREE.Mesh(
          new THREE.ConeGeometry(0.08, 0.28, 8),
          new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xfacc15 : 0x06b6d4 })
        );
        spike.position.set(Math.sin(angle) * 0.43, 0.6, Math.cos(angle) * 0.43);
        head.add(spike);
      }

      // 2. Floating Celestial Halo
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.045, 12, 32),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      halo.rotation.x = Math.PI / 2;
      halo.position.set(0, 0.82, 0);
      head.add(halo);

      // 3. Glowing Aurora Wings behind Torso
      [-1, 1].forEach(dir => {
        const wing = new THREE.Mesh(
          new THREE.PlaneGeometry(0.8, 1.25),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.92, side: THREE.DoubleSide })
        );
        wing.position.set(dir * 0.5, 0.55, -0.32);
        wing.rotation.set(0.15, dir * 0.45, dir * 0.3);
        torso.add(wing);

        const wingGlow = new THREE.Mesh(
          new THREE.PlaneGeometry(0.65, 1.0),
          new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.88, side: THREE.DoubleSide })
        );
        wingGlow.position.set(dir * 0.45, 0.55, -0.33);
        wingGlow.rotation.set(0.15, dir * 0.45, dir * 0.3);
        torso.add(wingGlow);
      });
    } else {
      // Regular Student Hat / Hair
      const hat = new THREE.Mesh(
        new THREE.ConeGeometry(0.48, 0.65, 12),
        new THREE.MeshStandardMaterial({ color: avatar.secondaryColor, roughness: 0.4, metalness: 0.3 })
      );
      hat.position.set(0, 0.42, -0.04);
      hat.rotation.x = -0.15;
      head.add(hat);

      // Musical Feather / Treble Pin
      const pin = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.16, 0),
        new THREE.MeshStandardMaterial({ color: avatar.accentColor, emissive: avatar.accentColor, emissiveIntensity: 0.5 })
      );
      pin.position.set(0.32, 0.38, 0.1);
      head.add(pin);
    }

    torso.add(head);

    // Arms: Shoulders, Upper Arms, Forearms & Hands
    const armMat = new THREE.MeshStandardMaterial({
      color: avatar.primaryColor,
      roughness: 0.5,
      emissive: isGlowingTeacher ? new THREE.Color(0xfacc15) : new THREE.Color(0x000000),
      emissiveIntensity: isGlowingTeacher ? 0.6 : 0
    });

    const leftUpperArm = new THREE.Group();
    leftUpperArm.position.set(-0.52, 0.8, 0);
    const leftArmMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.11, 0.45, 8),
      armMat
    );
    leftArmMesh.position.y = -0.22;
    leftUpperArm.add(leftArmMesh);

    const leftForearm = new THREE.Group();
    leftForearm.position.y = -0.45;
    const leftForearmMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8),
      new THREE.MeshStandardMaterial({ color: 0xffdfba, roughness: 0.6 })
    );
    leftForearmMesh.position.y = -0.2;
    leftForearm.add(leftForearmMesh);
    leftUpperArm.add(leftForearm);
    torso.add(leftUpperArm);

    const rightUpperArm = new THREE.Group();
    rightUpperArm.position.set(0.52, 0.8, 0);
    const rightArmMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.11, 0.45, 8),
      new THREE.MeshStandardMaterial({ color: avatar.primaryColor, roughness: 0.5 })
    );
    rightArmMesh.position.y = -0.22;
    rightUpperArm.add(rightArmMesh);

    const rightForearm = new THREE.Group();
    rightForearm.position.y = -0.45;
    const rightForearmMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8),
      new THREE.MeshStandardMaterial({ color: 0xffdfba, roughness: 0.6 })
    );
    rightForearmMesh.position.y = -0.2;
    rightForearm.add(rightForearmMesh);
    rightUpperArm.add(rightForearm);
    torso.add(rightUpperArm);

    // Legs: Thighs (upper legs), Calves (lower legs/knees), Shoes/Boots
    const leftThigh = new THREE.Group();
    leftThigh.position.set(-0.22, 0, 0);
    const leftThighMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.13, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
    );
    leftThighMesh.position.y = -0.25;
    leftThighMesh.castShadow = true;
    leftThigh.add(leftThighMesh);

    const leftCalf = new THREE.Group();
    leftCalf.position.y = -0.5;
    const leftCalfMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.12, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: avatar.secondaryColor, roughness: 0.7 })
    );
    leftCalfMesh.position.y = -0.25;
    leftCalfMesh.castShadow = true;
    leftCalf.add(leftCalfMesh);

    // Boot foot
    const leftFoot = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.16, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 })
    );
    leftFoot.position.set(0, -0.46, 0.08);
    leftCalf.add(leftFoot);

    leftThigh.add(leftCalf);
    hips.add(leftThigh);

    const rightThigh = new THREE.Group();
    rightThigh.position.set(0.22, 0, 0);
    const rightThighMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.13, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
    );
    rightThighMesh.position.y = -0.25;
    rightThighMesh.castShadow = true;
    rightThigh.add(rightThighMesh);

    const rightCalf = new THREE.Group();
    rightCalf.position.y = -0.5;
    const rightCalfMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.12, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: avatar.secondaryColor, roughness: 0.7 })
    );
    rightCalfMesh.position.y = -0.25;
    rightCalfMesh.castShadow = true;
    rightCalf.add(rightCalfMesh);

    const rightFoot = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.16, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 })
    );
    rightFoot.position.set(0, -0.46, 0.08);
    rightCalf.add(rightFoot);

    rightThigh.add(rightCalf);
    hips.add(rightThigh);

    // Backpack & Instrument
    const pack = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.7, 0.3),
      new THREE.MeshStandardMaterial({ color: avatar.secondaryColor, roughness: 0.7 })
    );
    pack.position.set(0, 0.45, -0.32);
    torso.add(pack);

    // Floating Nameplate
    const nameplate = this.createNameplateSprite(name, isLocalPlayer ? 'YOU' : '', isLocalPlayer ? '#10b981' : '#3b82f6');
    nameplate.position.set(0, 2.7, 0);
    root.add(nameplate);

    // Ground Contact Shadow
    const shadowDisc = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 1.5),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false })
    );
    shadowDisc.rotation.x = -Math.PI / 2;
    shadowDisc.position.y = 0.02;
    root.add(shadowDisc);

    return {
      root,
      hips,
      torso,
      head,
      leftUpperArm,
      leftForearm,
      rightUpperArm,
      rightForearm,
      leftThigh,
      leftCalf,
      rightThigh,
      rightCalf,
      pack,
      nameplate,
      shadowDisc
    };
  }

  // --- Natural Kinematic Animation Updates ---
  private updateHumanoidKinematics(rig: AvatarRig, anim: PlayerAnim, walkCycle: number, dt: number) {
    if (anim === 'walk') {
      // Natural walking gait:
      // Legs swing back & forth, knees bend during recovery stroke
      const legSwing = Math.sin(walkCycle) * 0.75;
      rig.leftThigh.rotation.x = legSwing;
      rig.rightThigh.rotation.x = -legSwing;

      // Knees bend when swinging backward/forward
      rig.leftCalf.rotation.x = Math.max(0, -legSwing * 1.1);
      rig.rightCalf.rotation.x = Math.max(0, legSwing * 1.1);

      // Arms swing in exact opposition to legs with bent elbows
      rig.leftUpperArm.rotation.x = -legSwing * 0.65;
      rig.rightUpperArm.rotation.x = legSwing * 0.65;
      rig.leftForearm.rotation.x = -0.3 + Math.abs(legSwing) * 0.3;
      rig.rightForearm.rotation.x = -0.3 + Math.abs(legSwing) * 0.3;

      // Pelvis vertical bounce (2 oscillations per full stride)
      rig.hips.position.y = 1.0 + Math.abs(Math.sin(walkCycle)) * 0.1;
      // Pelvis roll/sway
      rig.hips.rotation.z = Math.sin(walkCycle) * 0.05;
      // Torso counter-twist
      rig.torso.rotation.y = -Math.sin(walkCycle) * 0.12;

      // Head remains mostly stable with subtle look ahead
      rig.head.rotation.x = 0.05;
      rig.head.rotation.z = -Math.sin(walkCycle) * 0.03;

    } else if (anim === 'jump') {
      // In air: tuck knees up, raise arms joyfully
      rig.leftThigh.rotation.x = -0.6;
      rig.rightThigh.rotation.x = -0.6;
      rig.leftCalf.rotation.x = 1.2;
      rig.rightCalf.rotation.x = 1.2;
      rig.leftUpperArm.rotation.x = -2.2;
      rig.rightUpperArm.rotation.x = -2.2;
      rig.leftForearm.rotation.x = -0.6;
      rig.rightForearm.rotation.x = -0.6;
      rig.hips.position.y = 1.0;
      rig.torso.rotation.y = 0;

    } else if (anim === 'dance') {
      // Joyous celebration dance: rhythmic spinning & jumping
      rig.hips.position.y = 1.0 + Math.abs(Math.sin(walkCycle * 2)) * 0.25;
      rig.torso.rotation.y = Math.sin(walkCycle * 3) * 0.4;
      rig.leftUpperArm.rotation.x = -2.0 + Math.sin(walkCycle * 4) * 0.5;
      rig.rightUpperArm.rotation.x = -2.0 - Math.sin(walkCycle * 4) * 0.5;
      rig.leftThigh.rotation.x = Math.sin(walkCycle * 2) * 0.4;
      rig.rightThigh.rotation.x = -Math.sin(walkCycle * 2) * 0.4;

    } else if (anim === 'wave') {
      // Friendly wave with right hand
      rig.rightUpperArm.rotation.x = -2.4;
      rig.rightUpperArm.rotation.z = -0.3;
      rig.rightForearm.rotation.z = Math.sin(walkCycle * 5) * 0.6;

      rig.leftUpperArm.rotation.x = 0.1;
      rig.leftThigh.rotation.x = 0;
      rig.rightThigh.rotation.x = 0;
      rig.leftCalf.rotation.x = 0;
      rig.rightCalf.rotation.x = 0;
      rig.hips.position.y = 1.0;

    } else {
      // Idle: smooth breathing & resting posture
      const breathe = Math.sin(walkCycle * 0.5) * 0.04;
      rig.torso.scale.set(1 + breathe * 0.5, 1 + breathe, 1 + breathe * 0.5);
      rig.hips.position.y = 1.0 + breathe * 0.5;

      // Relaxed limbs with gentle damping to 0
      rig.leftThigh.rotation.x = THREE.MathUtils.damp(rig.leftThigh.rotation.x, 0, 8, dt);
      rig.rightThigh.rotation.x = THREE.MathUtils.damp(rig.rightThigh.rotation.x, 0, 8, dt);
      rig.leftCalf.rotation.x = THREE.MathUtils.damp(rig.leftCalf.rotation.x, 0, 8, dt);
      rig.rightCalf.rotation.x = THREE.MathUtils.damp(rig.rightCalf.rotation.x, 0, 8, dt);
      rig.leftUpperArm.rotation.x = THREE.MathUtils.damp(rig.leftUpperArm.rotation.x, 0.08, 8, dt);
      rig.rightUpperArm.rotation.x = THREE.MathUtils.damp(rig.rightUpperArm.rotation.x, 0.08, 8, dt);
      rig.leftForearm.rotation.x = THREE.MathUtils.damp(rig.leftForearm.rotation.x, -0.2, 8, dt);
      rig.rightForearm.rotation.x = THREE.MathUtils.damp(rig.rightForearm.rotation.x, -0.2, 8, dt);
      rig.torso.rotation.y = THREE.MathUtils.damp(rig.torso.rotation.y, 0, 8, dt);
    }
  }

  private createNameplateSprite(name: string, badge: string, badgeBg: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 96;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.roundRect(12, 12, 360, 72, 36);
    ctx.fill();

    let textStartX = 192;
    if (badge) {
      ctx.fillStyle = badgeBg;
      ctx.roundRect(24, 24, 76, 48, 24);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badge, 62, 48);
      textStartX = 230;
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const safeName = (name || 'Pengembara').slice(0, 14);
    ctx.fillText(safeName, textStartX, 48);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sprite.scale.set(3.2, 0.8, 1);
    return sprite;
  }

  private createTextSprite(text: string, fontSize: number, scale: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 64);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sprite.scale.set(scale, scale, 1);
    return sprite;
  }

  // --- Remote Multiplayer Sync ---
  public updateRemotePlayer(id: string, data: { name?: string; avatarId?: number; email?: string; x: number; y: number; z: number; rotY: number; anim: PlayerAnim }) {
    if (!id) return;
    let p = this.remotePlayers.get(id);

    if (!p) {
      const avatarId = typeof data.avatarId === 'number' ? data.avatarId : 1;
      const name = data.name || 'Pengembara';
      const rig = this.createRiggedHumanoid(avatarId, name, false);
      rig.root.position.set(data.x, data.y, data.z);
      rig.root.rotation.y = data.rotY;
      this.scene.add(rig.root);

      p = {
        rig,
        targetPos: new THREE.Vector3(data.x, data.y, data.z),
        targetRotY: data.rotY,
        anim: data.anim || 'idle',
        walkCycle: 0,
        email: data.email,
        avatarId: avatarId,
        name: name
      };
      this.remotePlayers.set(id, p);
    } else {
      // ONLY replace rig if an explicit and different avatarId number is provided!
      if (typeof data.avatarId === 'number' && data.avatarId !== p.avatarId) {
        this.scene.remove(p.rig.root);
        const newRig = this.createRiggedHumanoid(data.avatarId, data.name || p.name, false);
        newRig.root.position.copy(p.rig.root.position);
        newRig.root.rotation.y = p.rig.root.rotation.y;
        this.scene.add(newRig.root);
        p.rig = newRig;
        p.avatarId = data.avatarId;
      }
      if (data.name) p.name = data.name;
      if (data.email) p.email = data.email;
    }

    // Direct snap if moved distance is unusually large (>18 units, e.g. teleport)
    const currDist = p.rig.root.position.distanceTo(p.targetPos);
    if (currDist > 18) {
      p.rig.root.position.set(data.x, data.y, data.z);
    }

    p.targetPos.set(data.x, data.y, data.z);
    p.targetRotY = data.rotY;
    if (data.anim) p.anim = data.anim;
  }

  public removeRemotePlayer(id: string) {
    const p = this.remotePlayers.get(id);
    if (p) {
      this.scene.remove(p.rig.root);
      this.remotePlayers.delete(id);
    }
  }

  public showEmoteBubble(id: string, emote: string) {
    const targetGroup = id === 'local' ? this.playerRig.root : this.remotePlayers.get(id)?.rig.root;
    if (!targetGroup) return;

    const existing = targetGroup.getObjectByName('emoteBubble');
    if (existing) targetGroup.remove(existing);

    const bubble = this.createTextSprite(emote, 64, 1.8);
    bubble.name = 'emoteBubble';
    bubble.position.set(0, 3.8, 0);
    targetGroup.add(bubble);

    soundEngine.playInteract();
    setTimeout(() => targetGroup.remove(bubble), 3500);
  }

  public showChatBubble(id: string, text: string) {
    const targetGroup = id === 'local' ? this.playerRig.root : this.remotePlayers.get(id)?.rig.root;
    if (!targetGroup) return;

    const existing = targetGroup.getObjectByName('chatBubble');
    if (existing) targetGroup.remove(existing);

    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 96;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.roundRect(10, 10, 364, 76, 20);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.slice(0, 22), 192, 48);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    bubble.name = 'chatBubble';
    bubble.scale.set(3.8, 0.95, 1);
    bubble.position.set(0, 3.8, 0);
    targetGroup.add(bubble);

    setTimeout(() => targetGroup.remove(bubble), 4500);
  }

  private activeCameraPointerId: number | null = null;

  // --- Controls & Inputs ---
  private bindInputs() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleWindowBlur);
    this.container.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('pointercancel', this.handlePointerUp);
    this.container.addEventListener('wheel', this.handleWheel, { passive: true });
    window.addEventListener('resize', this.handleResize);

    // Prevent default touch gestures (pull-to-refresh, pinch zoom) on canvas
    this.container.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });
    this.container.addEventListener('touchmove', (e) => {
      // Allow single touch for camera drag, but prevent page scroll
      if (e.cancelable) e.preventDefault();
    }, { passive: false });
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const key = e.key.toLowerCase();
    this.keys[key] = true;

    if (key === ' ' || key === 'space') {
      e.preventDefault();
      this.triggerJump();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    this.keys[key] = false;
  };

  private handleWindowBlur = () => {
    this.keys = {};
    this.isPointerDown = false;
    this.activeCameraPointerId = null;
  };

  private handlePointerDown = (e: PointerEvent) => {
    if (e.button === 0) {
      // On mobile touch: if touch is in the virtual joystick bottom-left region, don't use it for camera rotate
      if (e.pointerType === 'touch') {
        const isJoystickArea = e.clientX < window.innerWidth * 0.45 && e.clientY > window.innerHeight * 0.50;
        if (isJoystickArea) return;
      }

      this.isPointerDown = true;
      this.activeCameraPointerId = e.pointerId;
      this.pointerStart.x = e.clientX;
      this.pointerStart.y = e.clientY;
    }
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (!this.isPointerDown || (this.activeCameraPointerId !== null && e.pointerId !== this.activeCameraPointerId)) return;
    const dx = e.clientX - this.pointerStart.x;
    const dy = e.clientY - this.pointerStart.y;
    this.pointerStart.x = e.clientX;
    this.pointerStart.y = e.clientY;

    this.camAngle.theta -= dx * 0.0065;
    this.camAngle.phi = Math.max(0.12, Math.min(1.2, this.camAngle.phi + dy * 0.0055));
  };

  private handlePointerUp = (e?: PointerEvent) => {
    if (e && this.activeCameraPointerId !== null && e.pointerId !== this.activeCameraPointerId) return;
    this.isPointerDown = false;
    this.activeCameraPointerId = null;
  };

  private handleWheel = (e: WheelEvent) => {
    this.camDistance = Math.max(7, Math.min(26, this.camDistance + e.deltaY * 0.02));
  };

  private handleResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public setJoystickInput(x: number, y: number) {
    this.joystickVector.x = x;
    this.joystickVector.y = y;
  }

  public rotateCamera(deltaTheta: number, deltaPhi: number = 0) {
    this.camAngle.theta += deltaTheta;
    this.camAngle.phi = Math.max(0.12, Math.min(1.2, this.camAngle.phi + deltaPhi));
  }

  public triggerJump() {
    if (this.isGrounded) {
      this.playerVelocityY = 8.5;
      this.isGrounded = false;
      this.currentAnim = 'jump';
      soundEngine.playJump();
    }
  }

  public triggerEmoteAnim(anim: 'dance' | 'wave') {
    this.currentAnim = anim;
    setTimeout(() => {
      if (this.currentAnim === anim) {
        this.currentAnim = 'idle';
      }
    }, 2800);
  }

  // --- Collision & Island Boundaries ---
  private isPositionAllowed(x: number, z: number): { allowed: boolean; blockedStation?: number } {
    for (const loc of WORLD_LOCATIONS) {
      const dx = x - loc.x;
      const dz = z - loc.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= loc.radius - 0.4) {
        return { allowed: true };
      }
    }

    for (const bridge of this.bridgeMeshes) {
      const pFrom = new THREE.Vector3(bridge.from.x, 0, bridge.from.z);
      const pTo = new THREE.Vector3(bridge.to.x, 0, bridge.to.z);
      const bridgeDir = new THREE.Vector3().subVectors(pTo, pFrom);
      const bridgeLen = bridgeDir.length();
      bridgeDir.normalize();

      const toPoint = new THREE.Vector3(x - bridge.from.x, 0, z - bridge.from.z);
      const proj = toPoint.dot(bridgeDir);

      if (proj >= 0 && proj <= bridgeLen) {
        const perp = _v1.crossVectors(bridgeDir, toPoint).length();
        if (perp <= 2.2) {
          const reqStation = bridge.unlockStation;
          const isUnlocked = this.unlockedStations.has(reqStation);
          if (!isUnlocked) {
            return { allowed: false, blockedStation: reqStation };
          }
          return { allowed: true };
        }
      }
    }

    return { allowed: false };
  }

  // --- Main Animation & Simulation Loop ---
  private startLoop() {
    const loop = () => {
      this.animFrameId = requestAnimationFrame(loop);
      const rawDt = this.clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      this.updateSimulation(dt);
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  private updateSimulation(dt: number) {
    const time = this.clock.getElapsedTime();

    // 1. Calculate Player Movement Inputs
    let inputX = 0;
    let inputZ = 0;

    if (this.keys['w'] || this.keys['arrowup']) inputZ -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) inputZ += 1;
    if (this.keys['a'] || this.keys['arrowleft']) inputX -= 1;
    if (this.keys['d'] || this.keys['arrowright']) inputX += 1;

    inputX += this.joystickVector.x;
    inputZ += this.joystickVector.y;

    const inputLen = Math.sqrt(inputX * inputX + inputZ * inputZ);
    const maxSpeed = 7.8;
    const accelRate = 18;
    const frictionRate = 14;

    if (inputLen > 0.05) {
      const normX = inputX / inputLen;
      const normZ = inputZ / inputLen;

      const sinT = Math.sin(this.camAngle.theta);
      const cosT = Math.cos(this.camAngle.theta);

      const worldTargetX = (normX * cosT + normZ * sinT) * maxSpeed;
      const worldTargetZ = (-normX * sinT + normZ * cosT) * maxSpeed;

      // Accelerate towards target velocity smoothly
      this.playerVelocity.x = THREE.MathUtils.damp(this.playerVelocity.x, worldTargetX, accelRate, dt);
      this.playerVelocity.z = THREE.MathUtils.damp(this.playerVelocity.z, worldTargetZ, accelRate, dt);

      // Smooth turn target
      this.targetRotY = Math.atan2(this.playerVelocity.x, this.playerVelocity.z);

      if (this.isGrounded) {
        this.currentAnim = 'walk';
        this.walkCycleTime += dt * 11; // Natural walking cadence
      }

      // Footstep sound
      if (this.isGrounded && time - this.lastFootstepTime > 0.32) {
        this.lastFootstepTime = time;
        soundEngine.playFootstep();
      }
    } else {
      // Decelerate smoothly
      this.playerVelocity.x = THREE.MathUtils.damp(this.playerVelocity.x, 0, frictionRate, dt);
      this.playerVelocity.z = THREE.MathUtils.damp(this.playerVelocity.z, 0, frictionRate, dt);

      if (this.isGrounded && this.currentAnim === 'walk') {
        if (this.playerVelocity.length() < 0.2) {
          this.currentAnim = 'idle';
        }
      }
      this.walkCycleTime += dt * 2.5; // Idle breathing cadence
    }

    // Apply movement delta with collision check
    const nextX = this.playerPos.x + this.playerVelocity.x * dt;
    const nextZ = this.playerPos.z + this.playerVelocity.z * dt;

    const check = this.isPositionAllowed(nextX, nextZ);
    if (check.allowed) {
      this.playerPos.x = nextX;
      this.playerPos.z = nextZ;
    } else {
      // Sliding collision
      if (this.isPositionAllowed(nextX, this.playerPos.z).allowed) {
        this.playerPos.x = nextX;
        this.playerVelocity.z = 0;
      } else if (this.isPositionAllowed(this.playerPos.x, nextZ).allowed) {
        this.playerPos.z = nextZ;
        this.playerVelocity.x = 0;
      } else {
        this.playerVelocity.set(0, 0, 0);
        if (check.blockedStation) {
          this.callbacks.onLockedBridgeBlocked(check.blockedStation);
        }
      }
    }

    // Interactive Piano Key Floor Triggering on Plaza
    this.pianoKeys.forEach(pk => {
      const dist = Math.hypot(this.playerPos.x - pk.keyX, this.playerPos.z - pk.keyZ);
      if (dist < 1.2 && this.isGrounded) {
        pk.mesh.position.y = THREE.MathUtils.damp(pk.mesh.position.y, pk.basePosY - 0.12, 15, dt);
        (pk.mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x38bdf8);
        (pk.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
      } else {
        pk.mesh.position.y = THREE.MathUtils.damp(pk.mesh.position.y, pk.basePosY, 8, dt);
        (pk.mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
        (pk.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
      }
    });

    // 2. Jump Gravity
    if (!this.isGrounded) {
      this.playerVelocityY -= 22 * dt;
      this.playerPos.y += this.playerVelocityY * dt;
      if (this.playerPos.y <= 0) {
        this.playerPos.y = 0;
        this.playerVelocityY = 0;
        this.isGrounded = true;
        this.currentAnim = inputLen > 0.05 ? 'walk' : 'idle';
      }
    }

    // 3. Smooth Character Slerp & Transform
    this.playerRotY = THREE.MathUtils.damp(this.playerRotY, this.targetRotY, 14, dt);
    this.playerRig.root.position.copy(this.playerPos);
    this.playerRig.root.rotation.y = this.playerRotY;

    // Update jointed humanoid limbs with natural kinematics!
    this.updateHumanoidKinematics(this.playerRig, this.currentAnim, this.walkCycleTime, dt);

    // 4. Remote Players Smooth Interpolation (Optimized for up to 20 concurrent players)
    for (const [, rp] of this.remotePlayers) {
      rp.rig.root.position.lerp(rp.targetPos, Math.min(1, dt * 12));

      // Shortest angle wrap for rotation to prevent full 360-degree flip
      let diffRot = (rp.targetRotY - rp.rig.root.rotation.y) % (Math.PI * 2);
      if (diffRot > Math.PI) diffRot -= Math.PI * 2;
      if (diffRot < -Math.PI) diffRot += Math.PI * 2;
      rp.rig.root.rotation.y += diffRot * Math.min(1, dt * 11);

      rp.walkCycle += dt * (rp.anim === 'walk' ? 11 : 2.5);

      this.updateHumanoidKinematics(rp.rig, rp.anim, rp.walkCycle, dt);
    }

    // 5. Broadcast Local Movement to WebSocket
    if (time - this.lastMoveBroadcastTime > 0.05) {
      this.lastMoveBroadcastTime = time;
      if (this.callbacks.onPlayerMoved) {
        this.callbacks.onPlayerMoved(
          this.playerPos.x,
          this.playerPos.y,
          this.playerPos.z,
          this.playerRotY,
          this.currentAnim
        );
      }
    }

    // 6. Camera Smooth Follow (Spherical Orbit Damping)
    _camTarget.copy(this.playerPos).add(new THREE.Vector3(0, 1.6, 0));
    const camOffset = new THREE.Vector3(
      Math.sin(this.camAngle.theta) * Math.cos(this.camAngle.phi) * this.camDistance,
      Math.sin(this.camAngle.phi) * this.camDistance,
      Math.cos(this.camAngle.theta) * Math.cos(this.camAngle.phi) * this.camDistance
    );
    _desiredCamPos.copy(_camTarget).add(camOffset);
    this.camera.position.lerp(_desiredCamPos, Math.min(1, dt * 8));
    this.camera.lookAt(_camTarget);

    // 7. Check Proximity to Stations
    let closestStation: StationId | null = null;
    let closestStationName = '';
    for (const loc of WORLD_LOCATIONS) {
      if (loc.id >= 1 && loc.id <= 7) {
        const dist = this.playerPos.distanceTo(new THREE.Vector3(loc.x, 0, loc.z));
        if (dist <= 6.8) {
          closestStation = loc.id as StationId;
          closestStationName = loc.name;
          break;
        }
      }
    }

    if (closestStation !== this.activeNearbyStation) {
      this.activeNearbyStation = closestStation;
      this.callbacks.onNearStation(closestStation, closestStationName);
    }

    // 8. Bridge Energy Node Pulse Animation
    this.bridgeMeshes.forEach(bridge => {
      bridge.energyNodes.forEach((node, idx) => {
        const pulseT = (time * 1.5 + idx * 0.33) % 1;
        node.position.z = -12 + pulseT * 24;
        node.position.y = 0.5 + Math.sin(pulseT * Math.PI) * 0.6;
      });
    });

    // 9. Animate World Props
    this.animatedProps.forEach(item => {
      if (item.type === 'spin') {
        item.mesh.rotation.y += item.speed * dt;
      } else if (item.type === 'bob' && item.basePos) {
        item.mesh.position.y = item.basePos.y + Math.sin(time * item.speed + item.offset) * 0.45;
      } else if (item.type === 'pulse') {
        const s = 1 + Math.sin(time * item.speed + item.offset) * 0.12;
        item.mesh.scale.set(s, s, s);
      }
    });

    // 10. Particle shimmer
    this.particleSystems.forEach(ps => {
      ps.rotation.y += dt * 0.025;
    });
  }

  // Camera views
  public setCameraView(preset: 'follow' | 'top' | 'cinematic') {
    if (preset === 'top') {
      this.camAngle.phi = 1.1;
      this.camDistance = 22;
    } else if (preset === 'cinematic') {
      this.camAngle.phi = 0.25;
      this.camDistance = 10;
    } else {
      this.camAngle.phi = 0.42;
      this.camDistance = 14;
    }
  }

  public teleportTo(x: number, z: number) {
    this.playerPos.set(x, 0, z);
    this.playerRig.root.position.copy(this.playerPos);
  }

  public getPlayerPosition() {
    return { x: this.playerPos.x, z: this.playerPos.z };
  }

  public dispose() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleWindowBlur);
    this.container.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    this.container.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('resize', this.handleResize);

    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
