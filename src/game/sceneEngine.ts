import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { getFurnitureDef, ROOM_ZONES } from './catalog';
import {
  applyFurnitureColor,
  buildCornerPostMesh,
  buildFurnitureModel,
  buildWallSegmentMesh,
} from './furnitureFactory';
import {
  canPlaceFurniture,
  computeFurnitureWorldCenter,
  detectRooms,
  getActiveFloorIndex,
  getAutoWallRotation,
  getBlueprintFloorCount,
  getBlueprintFloorData,
  getEffectiveSite,
  getFloorElevation,
  getRoomCustomName,
  getRoomLightConfig,
  getRotatedFootprint,
  getSiteBounds,
  hasCustomRoomLight,
  resolveFurnitureTransform,
  resolveRoomLightHex,
} from './scoring';
import { createProceduralTextureLibrary, ProceduralTextureLibrary } from './textures';
import {
  BuilderToolState,
  CameraPreset,
  DimensionLabelKind,
  DimensionLabelScreen,
  FLOOR_SLAB_THICKNESS,
  FurnitureDef,
  GRID_SIZE,
  LightingMood,
  PlacedFurniture,
  PersonHeightPreset,
  RoomBlueprint,
  RoomLabelScreen,
  TILE_SIZE,
  WALL_HEIGHT,
  WALL_THICKNESS,
  WallDrawOptions,
  WallDrawStatus,
  WallMaterialId,
  WallOpeningType,
  WallViewMode,
} from './types';

export interface FurniturePlacePayload {
  gx: number;
  gz: number;
  wx: number;
  wy: number;
  wz: number;
  rotY: number;
  rotation: 0 | 1 | 2 | 3;
  isFree: boolean;
}

export interface PeopleTelemetry {
  lotX: number;
  lotZ: number;
  headingDeg: number;
  zoneLabel: string;
}

export interface EngineCallbacks {
  onTileInteract: (gx: number, gz: number, isDrag: boolean) => void;
  onEdgeInteract: (axis: 'h' | 'v', ex: number, ez: number) => void;
  onCustomWallInteract: (wallId: string) => void;
  onAddCustomWall: (x1: number, z1: number, x2: number, z2: number) => void;
  onWallDrawStatus?: (status: WallDrawStatus) => void;
  onPeopleUpdate?: (telemetry: PeopleTelemetry) => void;
  onPersonPlaced?: () => void;
  onPlaceFurniture: (payload: FurniturePlacePayload) => void;
  onSelectFurniture: (uid: string | null) => void;
  onSelectCustomWall?: (wallId: string | null) => void;
  onSelectRoomAtTile?: (gx: number, gz: number) => void;
  onMoveCustomWallTo?: (wallId: string, wx: number, wz: number) => void;
  onMoveRoomToTile?: (gx: number, gz: number) => void;
  onDimensionLabels?: (labels: DimensionLabelScreen[]) => void;
  onRoomLabels?: (labels: RoomLabelScreen[]) => void;
  onWebGLFallback?: () => void;
}

interface SpringEntry {
  group: THREE.Object3D;
  targetRotY: number;
  targetScale: number;
  scale: number;
  scaleVel: number;
}

interface DustParticle {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

const MOOD_PRESETS: Record<
  LightingMood,
  {
    bg: number;
    fogDensity: number;
    envIntensity: number;
    sunColor: number;
    sunIntensity: number;
    sunPos: [number, number, number];
    sunDiscColor: number;
    sunCoronaColor: number;
    sunCoronaOpacity: number;
    cloudColor: number;
    cloudOpacity: number;
    showStars: boolean;
    hemiSky: number;
    hemiGround: number;
    hemiIntensity: number;
    bounceColor: number;
    bounceIntensity: number;
    rimColor: number;
    rimIntensity: number;
    exposure: number;
    lampMultiplier: number;
    skyTop: string;
    skyMid: string;
    skyHorizon: string;
    skyBottom: string;
    apronColor: number;
    landColor: number;
  }
> = {
  morning: {
    bg: 0xe9eef0,
    fogDensity: 0.0042,
    envIntensity: 0.72,
    sunColor: 0xfff1d6,
    sunIntensity: 2.6,
    sunPos: [18, 20, 14],
    sunDiscColor: 0xfff8e6,
    sunCoronaColor: 0xffe4ad,
    sunCoronaOpacity: 0.85,
    cloudColor: 0xffffff,
    cloudOpacity: 0.88,
    showStars: false,
    hemiSky: 0xdcebf7,
    hemiGround: 0x8f836c,
    hemiIntensity: 0.78,
    bounceColor: 0xffdfc0,
    bounceIntensity: 0.44,
    rimColor: 0xd8ecff,
    rimIntensity: 0.42,
    exposure: 1.07,
    lampMultiplier: 0.55,
    skyTop: '#64A2D8',
    skyMid: '#B5D7EE',
    skyHorizon: '#F4EFE4',
    skyBottom: '#D2DAC2',
    apronColor: 0xb9c5a2,
    landColor: 0x99ae7d,
  },
  golden: {
    bg: 0xecdac6,
    fogDensity: 0.0048,
    envIntensity: 0.58,
    sunColor: 0xffbd7c,
    sunIntensity: 3.1,
    sunPos: [22, 11.5, 15],
    sunDiscColor: 0xffe8b8,
    sunCoronaColor: 0xffa85c,
    sunCoronaOpacity: 0.95,
    cloudColor: 0xffdec2,
    cloudOpacity: 0.86,
    showStars: false,
    hemiSky: 0xf4dac0,
    hemiGround: 0x7b5f46,
    hemiIntensity: 0.68,
    bounceColor: 0xffc68c,
    bounceIntensity: 0.58,
    rimColor: 0xd5c0e4,
    rimIntensity: 0.36,
    exposure: 1.09,
    lampMultiplier: 1.15,
    skyTop: '#566F98',
    skyMid: '#DFAC8B',
    skyHorizon: '#F9DBB2',
    skyBottom: '#CBB99B',
    apronColor: 0xb4b68d,
    landColor: 0x95a170,
  },
  studio: {
    bg: 0xebe9e3,
    fogDensity: 0.0038,
    envIntensity: 0.86,
    sunColor: 0xfffaf2,
    sunIntensity: 2.3,
    sunPos: [15, 24, 14],
    sunDiscColor: 0xfffdf5,
    sunCoronaColor: 0xfff0d6,
    sunCoronaOpacity: 0.72,
    cloudColor: 0xfaf8f5,
    cloudOpacity: 0.82,
    showStars: false,
    hemiSky: 0xf0f4f8,
    hemiGround: 0x928a7e,
    hemiIntensity: 0.86,
    bounceColor: 0xf6e6d4,
    bounceIntensity: 0.48,
    rimColor: 0xedf2fa,
    rimIntensity: 0.5,
    exposure: 1.05,
    lampMultiplier: 0.42,
    skyTop: '#8FB9DC',
    skyMid: '#D4E3EE',
    skyHorizon: '#F2EEE7',
    skyBottom: '#D6D8C9',
    apronColor: 0xc2c8b4,
    landColor: 0xa1b28c,
  },
  evening: {
    bg: 0x1e1a26,
    fogDensity: 0.0058,
    envIntensity: 0.2,
    sunColor: 0x8fa2df,
    sunIntensity: 0.46,
    sunPos: [-18, 16, -14],
    sunDiscColor: 0xeaf0ff,
    sunCoronaColor: 0x99b2f5,
    sunCoronaOpacity: 0.58,
    cloudColor: 0x383a54,
    cloudOpacity: 0.55,
    showStars: true,
    hemiSky: 0x454368,
    hemiGround: 0x241a16,
    hemiIntensity: 0.36,
    bounceColor: 0xb87042,
    bounceIntensity: 0.28,
    rimColor: 0x7688c7,
    rimIntensity: 0.34,
    exposure: 1.14,
    lampMultiplier: 2.65,
    skyTop: '#0B1022',
    skyMid: '#1C233E',
    skyHorizon: '#35283A',
    skyBottom: '#181A1F',
    apronColor: 0x262d26,
    landColor: 0x2e3a2d,
  },
};

function createSkyGradientTexture(
  top: string,
  mid: string,
  horizon: string,
  bottom: string,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, top);
    grad.addColorStop(0.28, mid);
    grad.addColorStop(0.49, horizon);
    grad.addColorStop(0.56, horizon);
    grad.addColorStop(1.0, bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 4, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function createLampGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
    grad.addColorStop(0.0, 'rgba(255, 250, 232, 0.95)');
    grad.addColorStop(0.24, 'rgba(255, 224, 168, 0.55)');
    grad.addColorStop(0.55, 'rgba(255, 190, 115, 0.16)');
    grad.addColorStop(1.0, 'rgba(255, 175, 95, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.userData.isSharedTexture = true;
  tex.needsUpdate = true;
  return tex;
}

// Reusable module-scope math scratchpads (zero GC inside animation loop)
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _vec3C = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scaleVec = new THREE.Vector3();
const _normalMat = new THREE.Matrix3();
const _worldNormal = new THREE.Vector3();
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _rayHit = new THREE.Vector3();

/**
 * Builds a stylized 1.70m architectural human scale figure (12-part composite THREE.Group)
 * pivoted at bottom-center (y = 0) with varied PBR roughness/metalness and a subtle ground scale ring.
 */
function buildScalePersonGroup(): {
  root: THREE.Group;
  body: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
} {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe6bfa0, roughness: 0.68, metalness: 0.0 });
  const sweaterMat = new THREE.MeshStandardMaterial({ color: 0xc26e3c, roughness: 0.92, metalness: 0.0 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x3f4954, roughness: 0.86, metalness: 0.02 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x4f3525, roughness: 0.45, metalness: 0.05 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x2f231d, roughness: 0.78, metalness: 0.04 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4a459, roughness: 0.28, metalness: 0.72 });

  // Ground scale ring & directional nose tick (0.68m diameter human footprint)
  const ringGeo = new THREE.RingGeometry(0.28, 0.34, 32);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xb86b35,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.015;
  root.add(ring);

  const dirTriShape = new THREE.Shape();
  dirTriShape.moveTo(0, 0.14);
  dirTriShape.lineTo(-0.08, 0);
  dirTriShape.lineTo(0.08, 0);
  dirTriShape.closePath();
  const dirGeo = new THREE.ShapeGeometry(dirTriShape);
  dirGeo.rotateX(-Math.PI / 2);
  const dirArrow = new THREE.Mesh(
    dirGeo,
    new THREE.MeshBasicMaterial({
      color: 0xb86b35,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  dirArrow.position.set(0, 0.018, -0.36);
  root.add(dirArrow);

  // Legs (hips at y = 0.84m, shoes flush on y = 0)
  const buildLeg = (xOff: number) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(xOff, 0.84, 0);

    const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.054, 0.76, 12), pantsMat);
    legMesh.position.y = -0.39;
    legMesh.castShadow = true;
    legGroup.add(legMesh);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.23), shoeMat);
    shoe.position.set(0, -0.8, -0.04);
    shoe.castShadow = true;
    legGroup.add(shoe);

    return legGroup;
  };

  const leftLeg = buildLeg(-0.095);
  const rightLeg = buildLeg(0.095);
  body.add(leftLeg, rightLeg);

  // Pelvis & Belt with brass buckle
  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.14, 0.19), pantsMat);
  hips.position.y = 0.85;
  hips.castShadow = true;
  body.add(hips);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.325, 0.04, 0.2), shoeMat);
  belt.position.y = 0.91;
  body.add(belt);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.042, 0.02), brassMat);
  buckle.position.set(0, 0.91, -0.102);
  body.add(buckle);

  // Knit sweater torso + collar
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.145, 0.48, 14), sweaterMat);
  torso.scale.set(1.12, 1, 0.72);
  torso.position.y = 1.15;
  torso.castShadow = true;
  body.add(torso);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.095, 0.06, 12), sweaterMat);
  collar.position.y = 1.39;
  body.add(collar);

  // Arms (pivoted at shoulders y = 1.34m)
  const buildArm = (side: -1 | 1) => {
    const armGroup = new THREE.Group();
    armGroup.position.set(side * 0.22, 1.33, 0);

    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.044, 0.44, 10), sweaterMat);
    sleeve.position.y = -0.22;
    sleeve.castShadow = true;
    armGroup.add(sleeve);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), skinMat);
    hand.position.y = -0.47;
    armGroup.add(hand);

    return armGroup;
  };
  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);
  body.add(leftArm, rightArm);

  // Neck, Head, Hair & Glasses facing -Z
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.054, 0.09, 10), skinMat);
  neck.position.y = 1.44;
  body.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 14), skinMat);
  head.scale.set(0.95, 1.06, 0.98);
  head.position.y = 1.565;
  head.castShadow = true;
  body.add(head);

  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.122, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
    hairMat,
  );
  hairCap.position.set(0, 1.58, 0.012);
  hairCap.rotation.x = 0.2;
  hairCap.castShadow = true;
  body.add(hairCap);

  // Subtle architectural glasses frame facing -Z
  const glasses = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.032, 0.02), brassMat);
  glasses.position.set(0, 1.575, -0.106);
  body.add(glasses);

  return { root, body, leftLeg, rightLeg, leftArm, rightArm };
}

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class RoomBuilderEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private isSoftwareGl: boolean;

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private textures: ProceduralTextureLibrary;

  // Lighting & Sky rig
  private keyLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private bounceLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private skyDome: THREE.Mesh;
  private skyDomeTex: THREE.CanvasTexture | null = null;
  private sunOrb: THREE.Mesh;
  private sunCorona: THREE.Sprite;
  private cloudsGroup = new THREE.Group();
  private cloudMat: THREE.MeshBasicMaterial;
  private starsPoints: THREE.Points;
  private lampGlowTex: THREE.CanvasTexture;
  private envMapTex: THREE.Texture | null = null;
  private mood: LightingMood = 'golden';
  private wallViewMode: WallViewMode = 'cutaway';
  private lastCutawayQuad = -1;

  // Scene hierarchy groups
  private siteGroup = new THREE.Group();
  private otherFloorsGroup = new THREE.Group();
  private activeFloorRoot = new THREE.Group();
  private floorGroup = new THREE.Group();
  private zoneOverlayGroup = new THREE.Group();
  private wallGroup = new THREE.Group();
  private ceilingGroup = new THREE.Group();
  private furnitureGroup = new THREE.Group();
  private practicalLightsGroup = new THREE.Group();
  private roomLightsGroup = new THREE.Group();
  private previewGroup = new THREE.Group();
  private selectionGroup = new THREE.Group();
  private dimensionsGroup = new THREE.Group();
  private studioApron: THREE.Mesh;
  private landPlotMat: THREE.MeshStandardMaterial;

  // Multi-floor state
  private activeFloorY = 0;
  private showUpperFloors = true;

  // Toggleable architectural dimension overlay (length/width of land, rooms, walls & spacing)
  private showDimensions = false;
  private dimensionAnchors: {
    id: string;
    wx: number;
    wy: number;
    wz: number;
    text: string;
    kind: DimensionLabelKind;
  }[] = [];
  private lastDimCamSig = '';

  // Room name labels (2D/3D floating labels)
  private showRoomLabels = true;
  private roomLabelAnchors: {
    id: string;
    roomId: number;
    wx: number;
    wy: number;
    wz: number;
    name: string;
    area: number;
    isCustomName: boolean;
  }[] = [];
  private lastRoomLabelCamSig = '';

  // Tracked state synced from React
  private blueprint: RoomBlueprint | null = null;
  private toolState: BuilderToolState | null = null;
  private customDefs: Record<string, FurnitureDef> = {};
  private isTitleShowcase = true;

  // Furniture & custom wall lookup + springs
  private furnitureMeshes = new Map<string, THREE.Group>();
  private furnitureHitBoxes: THREE.Mesh[] = [];
  private customWallHitBoxes: THREE.Mesh[] = [];
  private springs = new Map<string, SpringEntry>();

  // Ghost preview & hover helpers
  private ghostModel: THREE.Group | null = null;
  private ghostDefId: string | null = null;
  private ghostOutline: THREE.LineSegments;
  private tileHoverMesh: THREE.Mesh;
  private edgeHoverMesh: THREE.Mesh;
  private selectionOutline: THREE.LineSegments;
  private selectedRoomHighlightGroup = new THREE.Group();
  private selectedRoomTileKeys: string[] = [];

  // Freeform wall drawing helpers
  private wallDrawStart: { x: number; z: number } | null = null;
  private wallDrawLastEnd: { x: number; z: number } | null = null;
  private wallDrawOptions: WallDrawOptions = { snapStepM: 0.5, orthoLock: true };
  private wallDrawDot: THREE.Group;
  private wallDrawDotRingMat: THREE.MeshBasicMaterial;
  private wallDrawStartPin: THREE.Group;
  private wallDrawGuides: THREE.LineSegments;
  private wallDrawPreview: THREE.Group;
  private wallDrawPreviewBody: THREE.Mesh;
  private wallDrawPreviewCap: THREE.Mesh;

  // People HUD: 1.70m Scale Person & First-Person Walk mode
  private personRig: ReturnType<typeof buildScalePersonGroup>;
  private personVisible = false;
  private walkMode = false;
  private placingPerson = false;
  private personHeightM: PersonHeightPreset = 1.7;
  private personPos = new THREE.Vector3(0, 0, 2.0);
  private personYaw = 0; // radians, 0 faces -Z (North)
  private personPitch = -0.04;
  private personGroundY = 0;
  private walkPhase = 0;
  private isWalkLooking = false;
  private lastWalkLookPos = { x: 0, y: 0 };
  private lastPeopleTelemetryMs = 0;
  private planModeLocked = false;

  // Pooled placement particles (InstancedMesh)
  private particleMesh: THREE.InstancedMesh;
  private particles: DustParticle[] = [];

  // Input & camera damping
  private raycaster = new THREE.Raycaster();
  private pointerNDC = new THREE.Vector2(-99, -99);
  private isPointerDown = false;
  private pointerDownPos = { x: 0, y: 0 };
  private isDraggingPaint = false;
  private lastPaintedKey = '';
  private lastHoverRaycast = 0;
  private hoveredTile: { gx: number; gz: number } | null = null;
  private hoveredEdge: { axis: 'h' | 'v'; ex: number; ez: number } | null = null;
  private hoveredWorldPt: { x: number; z: number } | null = null;
  private hoveredCustomWallId: string | null = null;
  private isAltHeld = false;

  private heldKeys = new Set<string>();
  private camPresetPos: THREE.Vector3 | null = null;
  private camPresetTarget: THREE.Vector3 | null = null;

  private timer = new THREE.Timer();
  private frameId = 0;
  private disposed = false;
  private elapsed = 0;

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareWebGL();
    this.timer.connect(document);

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    // Scene + Studio RoomEnvironment PMREM
    this.scene = new THREE.Scene();
    const initMood = MOOD_PRESETS[this.mood];
    this.scene.background = new THREE.Color(initMood.bg);
    this.scene.fog = new THREE.FogExp2(initMood.bg, initMood.fogDensity);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envMapTex = pmrem.fromScene(roomEnv, 0.04).texture;
    this.scene.environment = this.envMapTex;
    roomEnv.dispose();
    pmrem.dispose();

    // Camera
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.2, 320);
    this.camera.position.set(13.5, 11.2, 13.5);

    // OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.065;
    this.controls.minDistance = 4.2;
    this.controls.maxDistance = 80;
    this.controls.maxPolarAngle = Math.PI * 0.488;
    this.controls.minPolarAngle = 0.08;
    this.controls.target.set(0, 0.8, 0);
    this.controls.addEventListener('start', () => {
      this.camPresetPos = null;
      this.camPresetTarget = null;
    });

    // Architectural Multi-Layer Warm/Cool Lighting Rig + Realistic Sky, Sun/Moon, Clouds & Stars
    this.scene.environmentIntensity = initMood.envIntensity;

    this.skyDomeTex = createSkyGradientTexture(
      initMood.skyTop,
      initMood.skyMid,
      initMood.skyHorizon,
      initMood.skyBottom,
    );
    const skyGeo = new THREE.SphereGeometry(145, 32, 20);
    const skyMat = new THREE.MeshBasicMaterial({
      map: this.skyDomeTex,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    });
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.skyDome.renderOrder = -12;
    this.scene.add(this.skyDome);

    this.lampGlowTex = createLampGlowTexture();

    // Visible glowing Sun / Moon disc + atmospheric corona
    this.sunOrb = new THREE.Mesh(
      new THREE.SphereGeometry(3.8, 20, 16),
      new THREE.MeshBasicMaterial({ color: initMood.sunDiscColor, fog: false }),
    );
    this.scene.add(this.sunOrb);

    this.sunCorona = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.lampGlowTex,
        color: new THREE.Color(initMood.sunCoronaColor),
        transparent: true,
        opacity: initMood.sunCoronaOpacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    );
    this.sunCorona.scale.set(36, 36, 1);
    this.scene.add(this.sunCorona);

    // Soft stylized 3D clouds drifting around upper horizon
    this.cloudMat = new THREE.MeshBasicMaterial({
      color: initMood.cloudColor,
      transparent: true,
      opacity: initMood.cloudOpacity,
      fog: false,
      depthWrite: false,
    });
    const puffGeo = new THREE.SphereGeometry(1, 10, 8);
    for (let i = 0; i < 14; i++) {
      const cluster = new THREE.Group();
      const angle = (i / 14) * Math.PI * 2 + (i % 3) * 0.22;
      const dist = 78 + (i % 4) * 7.5;
      const y = 24 + (i % 3) * 5.2;
      cluster.position.set(Math.cos(angle) * dist, y, Math.sin(angle) * dist);
      cluster.lookAt(0, y * 0.7, 0);

      const puffSpecs = [
        [0, 0.3, 0, 5.2, 2.2, 3.0],
        [-3.6, -0.15, 0.3, 3.6, 1.7, 2.4],
        [3.7, -0.2, -0.2, 3.9, 1.8, 2.5],
        [1.3, 1.05, -0.3, 3.1, 1.6, 2.2],
      ];
      for (const [px, py, pz, sx, sy, sz] of puffSpecs) {
        const puff = new THREE.Mesh(puffGeo, this.cloudMat);
        puff.position.set(px, py, pz);
        puff.scale.set(sx, sy, sz);
        cluster.add(puff);
      }
      this.cloudsGroup.add(cluster);
    }
    this.scene.add(this.cloudsGroup);

    // Subtle night starfield (visible in Evening mood)
    const starPositions = new Float32Array(220 * 3);
    for (let i = 0; i < 220; i++) {
      const theta = ((i * 137.5) % 360) * (Math.PI / 180);
      const phi = 0.16 + (((i * 29) % 100) / 100) * 1.05;
      const r = 128;
      starPositions[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
      starPositions[i * 3 + 1] = Math.cos(phi) * r;
      starPositions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    this.starsPoints = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        color: 0xf4f6ff,
        size: 0.75,
        transparent: true,
        opacity: 0.82,
        fog: false,
        depthWrite: false,
      }),
    );
    this.starsPoints.visible = initMood.showStars;
    this.scene.add(this.starsPoints);

    this.hemiLight = new THREE.HemisphereLight(
      initMood.hemiSky,
      initMood.hemiGround,
      initMood.hemiIntensity,
    );
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(initMood.sunColor, initMood.sunIntensity);
    this.keyLight.position.set(...initMood.sunPos);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 75;
    const d = 14;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.radius = 3.2;
    this.keyLight.shadow.bias = -0.0004;
    this.keyLight.shadow.normalBias = 0.018;
    this.scene.add(this.keyLight);

    // Warm indirect bounce fill simulating sunlit oak floor & plaster reflection
    this.bounceLight = new THREE.DirectionalLight(initMood.bounceColor, initMood.bounceIntensity);
    this.bounceLight.position.set(-10.5, 5.2, -8.5);
    this.scene.add(this.bounceLight);

    this.rimLight = new THREE.DirectionalLight(initMood.rimColor, initMood.rimIntensity);
    this.rimLight.position.set(-13.5, 11, -13.5);
    this.scene.add(this.rimLight);

    // Procedural PBR textures
    this.textures = createProceduralTextureLibrary(this.renderer);

    // Surrounding Architectural Meadow Landscape Apron
    const apronGeo = new THREE.CircleGeometry(155, 56);
    apronGeo.rotateX(-Math.PI / 2);
    const apronMat = new THREE.MeshStandardMaterial({
      color: initMood.apronColor,
      roughness: 0.96,
      metalness: 0.0,
    });
    this.studioApron = new THREE.Mesh(apronGeo, apronMat);
    this.studioApron.position.y = -0.3;
    this.studioApron.receiveShadow = true;
    this.scene.add(this.studioApron);

    this.landPlotMat = new THREE.MeshStandardMaterial({
      color: initMood.landColor,
      roughness: 0.92,
      metalness: 0.0,
    });

    // Hierarchy groups (active floor elements live inside activeFloorRoot for instant multi-story elevation)
    this.activeFloorRoot.add(
      this.floorGroup,
      this.zoneOverlayGroup,
      this.wallGroup,
      this.furnitureGroup,
      this.practicalLightsGroup,
      this.roomLightsGroup,
      this.previewGroup,
      this.selectionGroup,
      this.dimensionsGroup,
    );
    this.scene.add(
      this.siteGroup,
      this.otherFloorsGroup,
      this.activeFloorRoot,
      this.ceilingGroup,
    );

    // Hover & Selection Helpers
    this.tileHoverMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(TILE_SIZE * 0.96, TILE_SIZE * 0.96),
      new THREE.MeshBasicMaterial({
        color: 0xd99b4e,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    );
    this.tileHoverMesh.rotation.x = -Math.PI / 2;
    this.tileHoverMesh.position.y = 0.03;
    this.tileHoverMesh.visible = false;
    this.previewGroup.add(this.tileHoverMesh);

    this.edgeHoverMesh = new THREE.Mesh(
      new THREE.BoxGeometry(TILE_SIZE, 0.55, 0.2),
      new THREE.MeshBasicMaterial({
        color: 0xd99b4e,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      }),
    );
    this.edgeHoverMesh.visible = false;
    this.previewGroup.add(this.edgeHoverMesh);

    // Architectural Draw Wall cursor reticle (outer ring + vertical pin)
    this.wallDrawDot = new THREE.Group();
    const cursorRingGeo = new THREE.RingGeometry(0.18, 0.3, 24);
    cursorRingGeo.rotateX(-Math.PI / 2);
    this.wallDrawDotRingMat = new THREE.MeshBasicMaterial({
      color: 0xd9772b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    const cursorRing = new THREE.Mesh(cursorRingGeo, this.wallDrawDotRingMat);
    cursorRing.position.y = 0.03;
    const cursorPin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.55, 14),
      this.wallDrawDotRingMat,
    );
    cursorPin.position.y = 0.28;
    this.wallDrawDot.add(cursorRing, cursorPin);
    this.wallDrawDot.visible = false;
    this.previewGroup.add(this.wallDrawDot);

    // Start corner anchor pin (stays visible at wallDrawStart while stretching the wall)
    this.wallDrawStartPin = new THREE.Group();
    const startRingGeo = new THREE.RingGeometry(0.2, 0.32, 24);
    startRingGeo.rotateX(-Math.PI / 2);
    const startMat = new THREE.MeshBasicMaterial({
      color: 0x2f9e66,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    const startRing = new THREE.Mesh(startRingGeo, startMat);
    startRing.position.y = 0.032;
    const startPost = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.75, 14), startMat);
    startPost.position.y = 0.38;
    this.wallDrawStartPin.add(startRing, startPost);
    this.wallDrawStartPin.visible = false;
    this.previewGroup.add(this.wallDrawStartPin);

    // Architectural crosshair alignment guide lines across the land lot
    const guideGeo = new THREE.BufferGeometry();
    guideGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3));
    this.wallDrawGuides = new THREE.LineSegments(
      guideGeo,
      new THREE.LineBasicMaterial({
        color: 0xb86b35,
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
      }),
    );
    this.wallDrawGuides.frustumCulled = false;
    this.wallDrawGuides.visible = false;
    this.previewGroup.add(this.wallDrawGuides);

    // Wall preview volume + crisp top-edge bar (clearly visible in both 2D Plan & 3D View)
    this.wallDrawPreview = new THREE.Group();
    this.wallDrawPreviewBody = new THREE.Mesh(
      new THREE.BoxGeometry(1, WALL_HEIGHT, WALL_THICKNESS + 0.04),
      new THREE.MeshBasicMaterial({
        color: 0xd98236,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      }),
    );
    this.wallDrawPreviewBody.position.y = WALL_HEIGHT / 2;
    this.wallDrawPreviewCap = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.06, WALL_THICKNESS + 0.1),
      new THREE.MeshBasicMaterial({ color: 0xb8561e }),
    );
    this.wallDrawPreviewCap.position.y = WALL_HEIGHT + 0.03;
    this.wallDrawPreview.add(this.wallDrawPreviewBody, this.wallDrawPreviewCap);
    this.wallDrawPreview.visible = false;
    this.previewGroup.add(this.wallDrawPreview);

    // Stylized 1.70m architectural scale person for People HUD & Walkthrough
    this.personRig = buildScalePersonGroup();
    this.personRig.root.visible = false;
    this.scene.add(this.personRig.root);

    this.ghostOutline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 0.08, 1)),
      new THREE.LineBasicMaterial({ color: 0x34d399 }),
    );
    this.ghostOutline.visible = false;
    this.previewGroup.add(this.ghostOutline);

    this.selectionOutline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 0.08, 1)),
      new THREE.LineBasicMaterial({ color: 0xf0b563 }),
    );
    this.selectionOutline.visible = false;
    this.selectionGroup.add(this.selectionOutline);
    this.selectionGroup.add(this.selectedRoomHighlightGroup);

    // Pooled placement sparkle particles
    const partGeo = new THREE.OctahedronGeometry(0.055, 0);
    const partMat = new THREE.MeshBasicMaterial({
      color: 0xf4cf8b,
      transparent: true,
      opacity: 0.9,
    });
    this.particleMesh = new THREE.InstancedMesh(partGeo, partMat, 36);
    this.particleMesh.frustumCulled = false;
    for (let i = 0; i < 36; i++) {
      this.particles.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.5,
      });
      _mat4.makeScale(0, 0, 0);
      this.particleMesh.setMatrixAt(i, _mat4);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.particleMesh);

    this.landPlotMat.userData.isSharedMaterial = true;
    this.cloudMat.userData.isSharedMaterial = true;

    this.bindEvents();
    this.applyLightingMood(this.mood);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.startRenderLoop();
  }

  public setTitleShowcase(active: boolean): void {
    this.isTitleShowcase = active;
    if (!active) {
      this.setCameraPreset('iso');
    }
    this.rebuildDimensions();
  }

  public setShowDimensions(show: boolean): void {
    this.showDimensions = show;
    this.rebuildDimensions();
  }

  public setLightingMood(mood: LightingMood): void {
    this.mood = mood;
    this.applyLightingMood(mood);
  }

  public setWallViewMode(mode: WallViewMode): void {
    this.wallViewMode = mode;
    this.rebuildWalls();
    this.rebuildCeiling();
    this.rebuildDimensions();
  }

  public setWallDrawOptions(opts: WallDrawOptions): void {
    this.wallDrawOptions = opts;
    this.updateGhostPreview();
  }

  /**
   * Commits a wall of exact specified length (in meters) from wallDrawStart toward the current cursor direction.
   */
  public commitExactLengthWall(lengthM: number): boolean {
    if (!this.wallDrawStart || !this.blueprint) return false;
    const len = Math.max(0.25, Math.min(60, lengthM));
    let dx = 1;
    let dz = 0;
    if (this.wallDrawLastEnd) {
      const rx = this.wallDrawLastEnd.x - this.wallDrawStart.x;
      const rz = this.wallDrawLastEnd.z - this.wallDrawStart.z;
      const rLen = Math.hypot(rx, rz);
      if (rLen > 0.05) {
        dx = rx / rLen;
        dz = rz / rLen;
      }
    }
    const bounds = getSiteBounds(this.blueprint);
    const nx = THREE.MathUtils.clamp(
      Number((this.wallDrawStart.x + dx * len).toFixed(3)),
      bounds.xMin,
      bounds.xMax,
    );
    const nz = THREE.MathUtils.clamp(
      Number((this.wallDrawStart.z + dz * len).toFixed(3)),
      bounds.zMin,
      bounds.zMax,
    );
    if (Math.hypot(nx - this.wallDrawStart.x, nz - this.wallDrawStart.z) < 0.2) {
      return false;
    }
    this.callbacks.onAddCustomWall(this.wallDrawStart.x, this.wallDrawStart.z, nx, nz);
    this.wallDrawStart = { x: nx, z: nz };
    this.wallDrawLastEnd = null;
    this.updateGhostPreview();
    return true;
  }

  public cancelWallDraw(): void {
    if (this.wallDrawStart) {
      this.wallDrawStart = null;
      this.wallDrawLastEnd = null;
      this.wallDrawPreview.visible = false;
      this.wallDrawStartPin.visible = false;
      this.emitWallDrawStatus(false, false, 0, 0, 0, 0, false, 0, 0);
    }
  }

  public setShowUpperFloors(show: boolean): void {
    this.showUpperFloors = show;
    if (this.blueprint) {
      this.rebuildOtherFloors();
      this.rebuildCeiling();
    }
  }

  public setShowRoomLabels(show: boolean): void {
    this.showRoomLabels = show;
    this.emitProjectedRoomLabels(true);
  }

  /**
   * Captures a clean PNG screenshot of the 3D scene without hover/selection/dimension guides.
   */
  public captureScreenshotDataUrl(): string | null {
    try {
      const prevPreview = this.previewGroup.visible;
      const prevSelection = this.selectionGroup.visible;
      const prevDims = this.dimensionsGroup.visible;
      const prevZones = this.zoneOverlayGroup.visible;
      this.previewGroup.visible = false;
      this.selectionGroup.visible = false;
      this.dimensionsGroup.visible = false;
      this.zoneOverlayGroup.visible = false;

      this.renderer.render(this.scene, this.camera);
      const url = this.renderer.domElement.toDataURL('image/png');

      this.previewGroup.visible = prevPreview;
      this.selectionGroup.visible = prevSelection;
      this.dimensionsGroup.visible = prevDims;
      this.zoneOverlayGroup.visible = prevZones;
      this.renderer.render(this.scene, this.camera);
      return url;
    } catch {
      return null;
    }
  }

  public setPlanModeLock(locked: boolean): void {
    this.planModeLocked = locked;
    if (this.blueprint) {
      this.rebuildOtherFloors();
      this.rebuildWalls();
      this.rebuildCeiling();
    }
    if (this.walkMode) return;
    if (locked) {
      this.controls.enableRotate = false;
      this.controls.screenSpacePanning = true;
      this.controls.mouseButtons = {
        LEFT: null as unknown as THREE.MOUSE,
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: THREE.MOUSE.PAN,
      };
    } else {
      this.controls.enableRotate = true;
      this.controls.screenSpacePanning = false;
      this.controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      };
    }
  }

  public syncPeopleConfig(cfg: {
    showPerson: boolean;
    walkMode: boolean;
    placingPerson: boolean;
    heightM: PersonHeightPreset;
  }): void {
    const prevWalk = this.walkMode;
    this.personVisible = cfg.showPerson;
    this.walkMode = cfg.walkMode;
    this.placingPerson = cfg.placingPerson;
    this.personHeightM = cfg.heightM;

    const scale = cfg.heightM / 1.7;
    this.personRig.root.scale.setScalar(scale);

    // Ensure person starts inside current lot bounds on first reveal
    if (this.blueprint) {
      const b = getSiteBounds(this.blueprint);
      if (
        this.personPos.x < b.xMin - 2 ||
        this.personPos.x > b.xMax + 2 ||
        this.personPos.z < b.zMin - 2 ||
        this.personPos.z > b.zMax + 2
      ) {
        this.personPos.set(b.centerX, 0, b.centerZ + Math.min(2.5, b.landDepth * 0.2));
      }
    }

    this.personRig.root.visible = this.personVisible && !this.walkMode && !this.isTitleShowcase;

    if (this.walkMode && !prevWalk) {
      // Enter First-Person Walk POV
      this.camPresetPos = null;
      this.camPresetTarget = null;
      this.controls.enabled = false;
      this.camera.fov = 58;
      this.camera.updateProjectionMatrix();
      this.personGroundY = this.getGroundYAt(this.personPos.x, this.personPos.z);
      this.updateFirstPersonCamera();
      this.emitPeopleTelemetry(true);
    } else if (!this.walkMode && prevWalk) {
      // Exit First-Person Walk POV back to 3D/2D camera
      this.isWalkLooking = false;
      this.camera.fov = 40;
      this.camera.updateProjectionMatrix();
      this.controls.enabled = true;
      this.setPlanModeLock(this.planModeLocked);
      this.setCameraPreset(this.planModeLocked ? 'plan' : 'iso');
    }

    if (this.personVisible || this.walkMode) {
      this.emitPeopleTelemetry(true);
    }
  }

  public movePersonToCenter(): void {
    if (!this.blueprint) return;
    const b = getSiteBounds(this.blueprint);
    this.personPos.set(b.centerX, 0, b.centerZ);
    this.personGroundY = this.getGroundYAt(b.centerX, b.centerZ);
    this.personRig.root.position.set(this.personPos.x, this.personGroundY, this.personPos.z);
    if (this.walkMode) {
      this.updateFirstPersonCamera();
    }
    this.emitPeopleTelemetry(true);
  }

  public getCameraHorizontalBasis(): { fx: number; fz: number; rx: number; rz: number } {
    this.camera.getWorldDirection(_vec3A);
    _vec3A.y = 0;
    if (_vec3A.lengthSq() < 1e-6) {
      _vec3A.set(0, 0, -1);
    } else {
      _vec3A.normalize();
    }
    _vec3B.crossVectors(_vec3A, this.camera.up).normalize();
    return { fx: _vec3A.x, fz: _vec3A.z, rx: _vec3B.x, rz: _vec3B.z };
  }

  public syncCustomDefs(defs: Record<string, FurnitureDef>): void {
    this.customDefs = defs;
    // Rebuild ghost if currently previewing a custom def
    if (this.ghostDefId && defs[this.ghostDefId]) {
      this.ghostDefId = null;
      this.updateGhostPreview();
    }
  }

  public setCameraPreset(preset: CameraPreset): void {
    const bounds = this.blueprint ? getSiteBounds(this.blueprint) : null;
    const span = bounds ? Math.max(bounds.landWidth, bounds.landDepth) : 14;
    const cx = bounds ? bounds.centerX : 0;
    const cz = bounds ? bounds.centerZ : 0;
    const scaleFactor = Math.max(0.85, span / 14);
    if (preset === 'iso') {
      this.camPresetPos = new THREE.Vector3(
        cx + 12.2 * scaleFactor,
        11.4 * scaleFactor,
        cz + 12.2 * scaleFactor,
      );
      this.camPresetTarget = new THREE.Vector3(cx, 0.7, cz);
    } else if (preset === 'plan') {
      const fovRad = THREE.MathUtils.degToRad(this.camera.fov);
      const halfTan = Math.tan(fovRad / 2);
      const aspect = Math.max(0.6, this.camera.aspect);
      const landW = bounds ? bounds.landWidth : 14;
      const landD = bounds ? bounds.landDepth : 14;
      const heightForDepth = (landD * 0.62) / halfTan;
      const heightForWidth = (landW * 0.78) / (halfTan * aspect);
      const planY = Math.max(15, Math.max(heightForDepth, heightForWidth));
      this.camPresetPos = new THREE.Vector3(cx, planY, cz + 0.35);
      this.camPresetTarget = new THREE.Vector3(cx, 0, cz);
    } else if (preset === 'corner') {
      this.camPresetPos = new THREE.Vector3(
        cx - 11.5 * scaleFactor,
        9.2 * scaleFactor,
        cz + 11.8 * scaleFactor,
      );
      this.camPresetTarget = new THREE.Vector3(cx, 0.9, cz);
    } else if (preset === 'interior') {
      this.camPresetPos = new THREE.Vector3(cx + 5.6, 2.2, cz + 6.2);
      this.camPresetTarget = new THREE.Vector3(cx - 0.8, 1.35, cz - 0.8);
    }
  }

  public syncSelectedRoomTiles(tileKeys: string[]): void {
    this.selectedRoomTileKeys = tileKeys;
    this.updateSelectionHighlight();
  }

  public syncToolState(tool: BuilderToolState): void {
    const prevWasDraw = this.toolState?.tab === 'layout' && this.toolState.layoutSubTool === 'wall_draw';
    const nextIsDraw = tool.tab === 'layout' && tool.layoutSubTool === 'wall_draw';
    if (prevWasDraw && !nextIsDraw) {
      this.cancelWallDraw();
    }
    const selChanged =
      this.toolState?.selectedCustomWallId !== tool.selectedCustomWallId ||
      this.toolState?.selectedPlacedUid !== tool.selectedPlacedUid ||
      this.toolState?.selectedRoomId !== tool.selectedRoomId;
    this.toolState = tool;
    this.updateSelectionHighlight();
    this.updateZoneTintOverlay();
    this.updateGhostPreview();
    if (selChanged && this.showDimensions) {
      this.rebuildDimensions();
    }
  }

  public syncBlueprint(bp: RoomBlueprint, burstAt?: { wx: number; wy?: number; wz: number }): void {
    this.blueprint = bp;
    const activeFloorIdx = getActiveFloorIndex(bp);
    const floorElev = getFloorElevation(bp);
    const nextFloorY = activeFloorIdx * floorElev;
    if (Math.abs(nextFloorY - this.activeFloorY) > 0.01) {
      const deltaY = nextFloorY - this.activeFloorY;
      this.controls.target.y += deltaY;
      this.camera.position.y += deltaY;
      this.activeFloorY = nextFloorY;
    }
    this.activeFloorRoot.position.y = this.activeFloorY;
    _groundPlane.constant = -this.activeFloorY;

    this.rebuildSite();
    this.rebuildOtherFloors();
    this.rebuildFloors();
    this.rebuildWalls();
    this.rebuildCeiling();
    this.syncFurnitureMeshes();
    this.rebuildRoomLights();
    this.updateZoneTintOverlay();
    this.updateSelectionHighlight();
    this.updateGhostPreview();
    this.rebuildDimensions();
    this.rebuildRoomLabelAnchors();
    if (burstAt) {
      this.spawnPlacementBurst(burstAt.wx, (burstAt.wy ?? 0) + this.activeFloorY + 0.25, burstAt.wz);
    }
  }

  /**
   * Fast path for live per-room lighting slider updates (intensity, Kelvin, tint)
   * without rebuilding floors, walls, ceilings, or furniture geometry.
   */
  public syncRoomLights(bp: RoomBlueprint): void {
    this.blueprint = bp;
    this.rebuildRoomLights();
    this.rebuildPracticalLights();
  }

  private applyLightingMood(mood: LightingMood): void {
    const p = MOOD_PRESETS[mood];
    this.scene.background = new THREE.Color(p.bg);
    this.scene.fog = new THREE.FogExp2(p.bg, p.fogDensity);
    this.scene.environmentIntensity = p.envIntensity;

    const nextSkyTex = createSkyGradientTexture(p.skyTop, p.skyMid, p.skyHorizon, p.skyBottom);
    const skyMat = this.skyDome.material as THREE.MeshBasicMaterial;
    skyMat.map = nextSkyTex;
    skyMat.needsUpdate = true;
    this.skyDomeTex?.dispose();
    this.skyDomeTex = nextSkyTex;

    // Position visible Sun / Moon disc & atmospheric corona along the key light vector
    _vec3A.set(...p.sunPos).normalize().multiplyScalar(116);
    this.sunOrb.position.copy(_vec3A);
    (this.sunOrb.material as THREE.MeshBasicMaterial).color.setHex(p.sunDiscColor);
    this.sunCorona.position.copy(_vec3A);
    this.sunCorona.material.color.setHex(p.sunCoronaColor);
    this.sunCorona.material.opacity = p.sunCoronaOpacity;

    // Update sky clouds & evening stars
    this.cloudMat.color.setHex(p.cloudColor);
    this.cloudMat.opacity = p.cloudOpacity;
    this.starsPoints.visible = p.showStars;

    this.keyLight.color.setHex(p.sunColor);
    this.keyLight.intensity = p.sunIntensity;
    this.keyLight.position.set(...p.sunPos);
    this.hemiLight.color.setHex(p.hemiSky);
    this.hemiLight.groundColor.setHex(p.hemiGround);
    this.hemiLight.intensity = p.hemiIntensity;
    this.bounceLight.color.setHex(p.bounceColor);
    this.bounceLight.intensity = p.bounceIntensity;
    this.rimLight.color.setHex(p.rimColor);
    this.rimLight.intensity = p.rimIntensity;
    this.renderer.toneMappingExposure = p.exposure;

    const apronMat = this.studioApron.material as THREE.MeshStandardMaterial;
    apronMat.color.setHex(p.apronColor);
    this.landPlotMat.color.setHex(p.landColor);

    this.rebuildRoomLights();
    this.rebuildPracticalLights();
  }

  private disposeMaterialSafe(mat: THREE.Material | null | undefined): void {
    if (!mat || mat.userData?.isSharedMaterial) return;
    for (const value of Object.values(mat)) {
      if (
        value &&
        typeof value === 'object' &&
        'isTexture' in value &&
        (value as THREE.Texture).isTexture &&
        !(value as THREE.Texture).userData?.isSharedTexture
      ) {
        (value as THREE.Texture).dispose();
      }
    }
    mat.dispose();
  }

  private buildMergedBoxes(
    centers: { x: number; y: number; z: number }[],
    sx: number,
    sy: number,
    sz: number,
  ): THREE.BufferGeometry | null {
    if (centers.length === 0) return null;
    const base = new THREE.BoxGeometry(sx, sy, sz);
    const parts: THREE.BufferGeometry[] = [];
    for (const c of centers) {
      const g = base.clone();
      g.translate(c.x, c.y, c.z);
      parts.push(g);
    }
    base.dispose();
    const merged = BufferGeometryUtils.mergeGeometries(parts, false);
    for (const g of parts) g.dispose();
    merged?.computeBoundingSphere();
    return merged;
  }

  private clearGroup(group: THREE.Group, disposeGeo = true): void {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (disposeGeo) {
        this.disposeObject(child);
      }
    }
  }

  /**
   * Builds the custom-sized Land Plot (Lahan), architectural boundary curb, 1-meter
   * drafting grid (aligned 100% flush with tiles even on odd widths like 11×32m),
   * surveyor corner pins, and raised Foundation (Pondasi) under the house.
   */
  private rebuildSite(): void {
    if (!this.blueprint) return;
    this.clearGroup(this.siteGroup, true);

    const bp = this.blueprint;
    const site = getEffectiveSite(bp);
    const bounds = getSiteBounds(bp);
    const halfGrid = bp.gridSize / 2;
    const fH = site.foundationHeight;
    const landW = bounds.landWidth;
    const landD = bounds.landDepth;
    const cx = bounds.centerX;
    const cz = bounds.centerZ;
    const maxSpan = Math.max(landW, landD);

    // Dynamically expand camera maxDistance & directional shadow frustum for large plots (up to 60m)
    this.controls.maxDistance = Math.max(44, maxSpan * 2.25);
    const shadowHalf = Math.max(12, Math.ceil(maxSpan * 0.62));
    this.keyLight.shadow.camera.left = -shadowHalf;
    this.keyLight.shadow.camera.right = shadowHalf;
    this.keyLight.shadow.camera.top = shadowHalf;
    this.keyLight.shadow.camera.bottom = -shadowHalf;
    this.keyLight.shadow.camera.far = Math.max(70, shadowHalf * 3.8);
    this.keyLight.shadow.camera.updateProjectionMatrix();

    // Seat surrounding meadow & land lot cleanly:
    // On an empty lot (0 floor tiles), keep turf flush at y = 0 so Draw Wall & Pour Floor have ZERO parallax!
    // Once foundation/floor tiles exist, drop turf down by foundationHeight (-fH) to reveal the raised foundation plinth.
    const tiles = Object.values(bp.tiles);
    const landTopY = tiles.length > 0 ? -fH : 0;
    this.studioApron.position.y = landTopY - 0.025;

    // 1. Buildable Land Plot Turf Slab (Lahan) aligned strictly to [xMin..xMax] × [zMin..zMax]
    const landMesh = new THREE.Mesh(
      new THREE.BoxGeometry(landW, 0.04, landD),
      this.landPlotMat,
    );
    landMesh.position.set(cx, landTopY - 0.02, cz);
    landMesh.receiveShadow = true;
    this.siteGroup.add(landMesh);

    // 2. Crisp Architectural Concrete Boundary Curb framing exact Land Width × Land Depth
    const curbMat = new THREE.MeshStandardMaterial({
      color: 0xd9cfc0,
      roughness: 0.82,
      metalness: 0.03,
    });
    const curbW = 0.14;
    const curbH = 0.09;
    const northSouthGeo = new THREE.BoxGeometry(landW + curbW * 2, curbH, curbW);
    const eastWestGeo = new THREE.BoxGeometry(curbW, curbH, landD);

    const northCurb = new THREE.Mesh(northSouthGeo, curbMat);
    northCurb.position.set(cx, landTopY + curbH / 2 - 0.02, bounds.zMin - curbW / 2);
    northCurb.receiveShadow = true;
    const southCurb = new THREE.Mesh(northSouthGeo, curbMat);
    southCurb.position.set(cx, landTopY + curbH / 2 - 0.02, bounds.zMax + curbW / 2);
    southCurb.receiveShadow = true;
    const westCurb = new THREE.Mesh(eastWestGeo, curbMat);
    westCurb.position.set(bounds.xMin - curbW / 2, landTopY + curbH / 2 - 0.02, cz);
    westCurb.receiveShadow = true;
    const eastCurb = new THREE.Mesh(eastWestGeo, curbMat);
    eastCurb.position.set(bounds.xMax + curbW / 2, landTopY + curbH / 2 - 0.02, cz);
    eastCurb.receiveShadow = true;
    this.siteGroup.add(northCurb, southCurb, westCurb, eastCurb);

    // 4 Corner Surveyor Markers (brass-capped architectural boundary posts)
    const postGeo = new THREE.CylinderGeometry(0.06, 0.075, 0.24, 10);
    const postMat = new THREE.MeshStandardMaterial({
      color: 0xb8763e,
      roughness: 0.42,
      metalness: 0.35,
    });
    const corners: [number, number][] = [
      [bounds.xMin - curbW / 2, bounds.zMin - curbW / 2],
      [bounds.xMax + curbW / 2, bounds.zMin - curbW / 2],
      [bounds.xMin - curbW / 2, bounds.zMax + curbW / 2],
      [bounds.xMax + curbW / 2, bounds.zMax + curbW / 2],
    ];
    for (const [px, pz] of corners) {
      const marker = new THREE.Mesh(postGeo, postMat);
      marker.position.set(px, landTopY + 0.1, pz);
      marker.castShadow = true;
      this.siteGroup.add(marker);
    }

    // 3. Exact 1-Meter Architectural Planning Grid aligned 1:1 with floor tile coordinates
    const gridPts: number[] = [];
    const gy = landTopY + 0.008;
    for (let i = 0; i <= landW; i++) {
      const x = bounds.xMin + i;
      gridPts.push(x, gy, bounds.zMin, x, gy, bounds.zMax);
    }
    for (let j = 0; j <= landD; j++) {
      const z = bounds.zMin + j;
      gridPts.push(bounds.xMin, gy, z, bounds.xMax, gy, z);
    }
    const gridGeo = new THREE.BufferGeometry();
    gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridPts, 3));
    const gridMat = new THREE.LineBasicMaterial({
      color: this.mood === 'evening' ? 0x6c7a69 : 0xf4efe4,
      transparent: true,
      opacity: 0.42,
    });
    const gridLines = new THREE.LineSegments(gridGeo, gridMat);
    this.siteGroup.add(gridLines);

    // 4. Raised Architectural Foundation (Pondasi) under every built floor tile
    if (tiles.length === 0) return;

    const style = site.foundationStyle;
    const baseColor =
      style === 'concrete'
        ? 0xb5afa6
        : style === 'stone'
          ? 0x877e71
          : style === 'brick'
            ? 0x9b5a46
            : 0x8c603e;
    const trimColor =
      style === 'concrete'
        ? 0x8d877e
        : style === 'stone'
          ? 0x6c655b
          : style === 'brick'
            ? 0x794232
            : 0x5c3e28;

    const foundMat = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: style === 'concrete' ? 0.85 : style === 'timber' ? 0.72 : 0.92,
      metalness: 0.02,
    });
    const footingMat = new THREE.MeshStandardMaterial({
      color: trimColor,
      roughness: 0.9,
      metalness: 0.02,
    });

    const bodyH = Math.max(0.06, fH - 0.04);
    const bodyGeo =
      style === 'timber'
        ? new THREE.BoxGeometry(TILE_SIZE + 0.02, Math.min(0.14, bodyH), TILE_SIZE + 0.02)
        : new THREE.BoxGeometry(TILE_SIZE + 0.04, bodyH, TILE_SIZE + 0.04);
    const footingGeo = new THREE.BoxGeometry(TILE_SIZE + 0.14, 0.07, TILE_SIZE + 0.14);
    const pierGeo = style === 'timber' ? new THREE.BoxGeometry(0.14, bodyH, 0.14) : null;

    for (const tile of tiles) {
      const wx = tile.x - halfGrid + 0.5;
      const wz = tile.z - halfGrid + 0.5;
      const isPerimeter =
        !bp.tiles[`${tile.x - 1},${tile.z}`] ||
        !bp.tiles[`${tile.x + 1},${tile.z}`] ||
        !bp.tiles[`${tile.x},${tile.z - 1}`] ||
        !bp.tiles[`${tile.x},${tile.z + 1}`];

      if (style === 'timber') {
        const deckFrame = new THREE.Mesh(bodyGeo, foundMat);
        deckFrame.position.set(wx, -0.05 - Math.min(0.14, bodyH) / 2, wz);
        deckFrame.castShadow = true;
        deckFrame.receiveShadow = true;
        this.siteGroup.add(deckFrame);

        if (isPerimeter && pierGeo) {
          const pier = new THREE.Mesh(pierGeo, footingMat);
          pier.position.set(wx, -0.05 - bodyH / 2, wz);
          pier.castShadow = true;
          pier.receiveShadow = true;
          this.siteGroup.add(pier);
        }
      } else {
        const block = new THREE.Mesh(bodyGeo, foundMat);
        block.position.set(wx, -0.05 - bodyH / 2, wz);
        block.castShadow = isPerimeter;
        block.receiveShadow = true;
        this.siteGroup.add(block);

        if (isPerimeter) {
          const footing = new THREE.Mesh(footingGeo, footingMat);
          footing.position.set(wx, -fH + 0.035, wz);
          footing.receiveShadow = true;
          this.siteGroup.add(footing);
        }
      }
    }
  }

  /**
   * Builds interior architectural ceiling (Langit-Langit) with recessed warm downlights
   * + Full 3D Architectural Roofs (Flat, Gable/Pelana, Hip/Limasan, Shed/Modern, Joglo)
   * fitted cleanly over each contiguous building footprint.
   */
  private rebuildCeiling(): void {
    this.clearGroup(this.ceilingGroup, true);
    if (!this.blueprint) return;

    const bp = this.blueprint;
    const site = getEffectiveSite(bp);
    const activeTiles = Object.values(bp.tiles);
    const half = bp.gridSize / 2;
    const roomWallH = site.wallHeight ?? WALL_HEIGHT;
    const floorElev = getFloorElevation(bp);
    const activeFloorIdx = getActiveFloorIndex(bp);
    const activeY = activeFloorIdx * floorElev;

    // 1. Interior Plafond underside + recessed warm downlights (on active floor)
    if (activeTiles.length > 0 && site.showCeiling && this.wallViewMode !== 'low' && !this.planModeLocked) {
      const ceilingMat = new THREE.MeshStandardMaterial({
        color: 0xf6f1e8,
        roughness: 0.9,
        metalness: 0.0,
        side: THREE.FrontSide,
      });
      const ceilingGeo = new THREE.PlaneGeometry(TILE_SIZE + 0.02, TILE_SIZE + 0.02);
      ceilingGeo.rotateX(Math.PI / 2); // Normal points -Y (downward into room)

      const bezelGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.016, 12);
      const bezelMat = new THREE.MeshStandardMaterial({ color: 0xe2d8ca, roughness: 0.5 });
      const bulbGeo = new THREE.CircleGeometry(0.062, 12);
      bulbGeo.rotateX(Math.PI / 2);
      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff0cc });

      for (const tile of activeTiles) {
        const wx = tile.x - half + 0.5;
        const wz = tile.z - half + 0.5;
        const plane = new THREE.Mesh(ceilingGeo, ceilingMat);
        plane.position.set(wx, activeY + roomWallH - 0.01, wz);
        this.ceilingGroup.add(plane);

        if (tile.x % 3 === 1 && tile.z % 3 === 1) {
          const bezel = new THREE.Mesh(bezelGeo, bezelMat);
          bezel.position.set(wx, activeY + roomWallH - 0.018, wz);
          const bulb = new THREE.Mesh(bulbGeo, bulbMat);
          bulb.position.set(wx, activeY + roomWallH - 0.028, wz);
          this.ceilingGroup.add(bezel, bulb);
        }
      }
    }

    // 2. Real 3D Exterior Architectural Roof (Atap) — automatically crowns the highest occupied floor
    const roofStyle = site.roofStyle ?? 'gable';
    const shouldRenderRoof =
      Boolean(site.showRoof) && roofStyle !== 'none' && !this.planModeLocked && this.wallViewMode !== 'low';
    if (!shouldRenderRoof) return;

    const floorCount = getBlueprintFloorCount(bp);
    let roofFloorIdx = activeFloorIdx;
    let roofTilesMap = bp.tiles;
    for (let idx = floorCount - 1; idx >= 0; idx--) {
      const fData = getBlueprintFloorData(bp, idx);
      if (Object.keys(fData.tiles).length > 0) {
        roofFloorIdx = idx;
        roofTilesMap = fData.tiles;
        break;
      }
    }
    const tiles = Object.values(roofTilesMap);
    if (tiles.length === 0) return;
    const roofFloorY = roofFloorIdx * floorElev;

    const pitch = Math.max(0.55, Math.min(3.2, site.roofPitch ?? 1.5));
    const roofColorHex = site.roofColor || '#A8583B';
    const roofMat = new THREE.MeshStandardMaterial({
      color: roofColorHex,
      roughness: 0.74,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });
    const ridgeColor = new THREE.Color(roofColorHex).multiplyScalar(0.76);
    const ridgeMat = new THREE.MeshStandardMaterial({
      color: ridgeColor,
      roughness: 0.68,
      metalness: 0.1,
    });
    const fasciaMat = new THREE.MeshStandardMaterial({
      color: 0x5c412e,
      roughness: 0.72,
      metalness: 0.04,
    });
    const gableWallMat = new THREE.MeshStandardMaterial({
      color: 0xf1eadb,
      roughness: 0.86,
      metalness: 0.0,
    });

    // Helper: create flat-shaded crisp architectural roof geometry from triangle vertex array
    const addTriRoofMesh = (verts: number[], mat: THREE.Material) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.ceilingGroup.add(mesh);
    };

    const buildHipLayer = (
      cx: number,
      cz: number,
      baseY: number,
      w: number,
      d: number,
      h: number,
      ridgeRatio = 1.0,
    ) => {
      const hw = w / 2;
      const hd = d / 2;
      const alongX = w >= d;
      const rawRidgeHalf = alongX ? Math.max(0, hw - hd * 0.92) : Math.max(0, hd - hw * 0.92);
      const ridgeHalf = rawRidgeHalf * ridgeRatio;

      // 4 eave corners
      const nw: [number, number, number] = [cx - hw, baseY, cz - hd];
      const ne: [number, number, number] = [cx + hw, baseY, cz - hd];
      const se: [number, number, number] = [cx + hw, baseY, cz + hd];
      const sw: [number, number, number] = [cx - hw, baseY, cz + hd];

      const p1: [number, number, number] = alongX
        ? [cx - ridgeHalf, baseY + h, cz]
        : [cx, baseY + h, cz - ridgeHalf];
      const p2: [number, number, number] = alongX
        ? [cx + ridgeHalf, baseY + h, cz]
        : [cx, baseY + h, cz + ridgeHalf];

      const tri = (a: [number, number, number], b: [number, number, number], c: [number, number, number]) => [
        a[0], a[1], a[2],
        b[0], b[1], b[2],
        c[0], c[1], c[2],
      ];

      const verts: number[] = [];
      if (alongX) {
        // North slope (quad nw-ne-p2-p1)
        verts.push(...tri(nw, p1, ne), ...tri(ne, p1, p2));
        // South slope (quad sw-se-p2-p1)
        verts.push(...tri(sw, se, p2), ...tri(sw, p2, p1));
        // West hip triangle (nw-sw-p1)
        verts.push(...tri(nw, sw, p1));
        // East hip triangle (se-ne-p2)
        verts.push(...tri(se, ne, p2));
      } else {
        // West slope (nw-sw-p2-p1)
        verts.push(...tri(nw, sw, p2), ...tri(nw, p2, p1));
        // East slope (ne-se-p2-p1)
        verts.push(...tri(ne, p1, se), ...tri(se, p1, p2));
        // North hip triangle (nw-p1-ne)
        verts.push(...tri(nw, p1, ne));
        // South hip triangle (sw-se-p2)
        verts.push(...tri(sw, se, p2));
      }
      addTriRoofMesh(verts, roofMat);

      // Architectural timber fascia skirt around eaves
      const fasciaH = 0.14;
      const soffit = new THREE.Mesh(new THREE.BoxGeometry(w, fasciaH, d), fasciaMat);
      soffit.position.set(cx, baseY - fasciaH / 2 + 0.02, cz);
      soffit.castShadow = true;
      soffit.receiveShadow = true;
      this.ceilingGroup.add(soffit);

      // Crisp ridge beam cap at peak
      const ridgeLen = Math.max(0.24, ridgeHalf * 2 + 0.12);
      const ridgeBeam = new THREE.Mesh(
        new THREE.BoxGeometry(alongX ? ridgeLen : 0.16, 0.12, alongX ? 0.16 : ridgeLen),
        ridgeMat,
      );
      ridgeBeam.position.set(cx, baseY + h + 0.03, cz);
      ridgeBeam.castShadow = true;
      this.ceilingGroup.add(ridgeBeam);
    };

    // Group contiguous floor tiles into separate building islands (4-neighbor BFS)
    const visited = new Set<string>();
    const islands: { minX: number; maxX: number; minZ: number; maxZ: number }[] = [];
    for (const tile of tiles) {
      const startKey = `${tile.x},${tile.z}`;
      if (visited.has(startKey)) continue;
      visited.add(startKey);
      const queue = [tile];
      let minX = tile.x;
      let maxX = tile.x;
      let minZ = tile.z;
      let maxZ = tile.z;
      while (queue.length > 0) {
        const cur = queue.shift()!;
        if (cur.x < minX) minX = cur.x;
        if (cur.x > maxX) maxX = cur.x;
        if (cur.z < minZ) minZ = cur.z;
        if (cur.z > maxZ) maxZ = cur.z;
        for (const [dx, dz] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nk = `${cur.x + dx},${cur.z + dz}`;
          if (!visited.has(nk) && roofTilesMap[nk]) {
            visited.add(nk);
            queue.push(roofTilesMap[nk]);
          }
        }
      }
      islands.push({
        minX: minX - half,
        maxX: maxX + 1 - half,
        minZ: minZ - half,
        maxZ: maxZ + 1 - half,
      });
    }

    const overhang = 0.46;

    for (const isl of islands) {
      const spanW = isl.maxX - isl.minX;
      const spanD = isl.maxZ - isl.minZ;
      const cx = (isl.minX + isl.maxX) / 2;
      const cz = (isl.minZ + isl.maxZ) / 2;
      const rw = spanW + overhang * 2;
      const rd = spanD + overhang * 2;
      const baseY = roofFloorY + roomWallH + 0.02;

      if (roofStyle === 'flat') {
        // Modern cantilevered architectural flat roof slab + raised parapet edges
        const slab = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.2, rd), fasciaMat);
        slab.position.set(cx, baseY + 0.1, cz);
        slab.castShadow = true;
        slab.receiveShadow = true;
        this.ceilingGroup.add(slab);

        const deck = new THREE.Mesh(new THREE.BoxGeometry(rw - 0.18, 0.06, rd - 0.18), roofMat);
        deck.position.set(cx, baseY + 0.22, cz);
        deck.receiveShadow = true;
        this.ceilingGroup.add(deck);

        const pH = 0.28;
        const pT = 0.14;
        const northP = new THREE.Mesh(new THREE.BoxGeometry(rw, pH, pT), ridgeMat);
        northP.position.set(cx, baseY + 0.2 + pH / 2, cz - rd / 2 + pT / 2);
        const southP = new THREE.Mesh(new THREE.BoxGeometry(rw, pH, pT), ridgeMat);
        southP.position.set(cx, baseY + 0.2 + pH / 2, cz + rd / 2 - pT / 2);
        const westP = new THREE.Mesh(new THREE.BoxGeometry(pT, pH, rd - pT * 2), ridgeMat);
        westP.position.set(cx - rw / 2 + pT / 2, baseY + 0.2 + pH / 2, cz);
        const eastP = new THREE.Mesh(new THREE.BoxGeometry(pT, pH, rd - pT * 2), ridgeMat);
        eastP.position.set(cx + rw / 2 - pT / 2, baseY + 0.2 + pH / 2, cz);
        for (const p of [northP, southP, westP, eastP]) {
          p.castShadow = true;
          p.receiveShadow = true;
          this.ceilingGroup.add(p);
        }
      } else if (roofStyle === 'gable') {
        // Classic Pitched Gable Roof (Atap Pelana) aligned along the longer span
        const alongX = spanW >= spanD;
        const runSpan = alongX ? rd : rw;
        const ridgeSpan = alongX ? rw : rd;
        const halfRun = runSpan / 2;
        const slopeLen = Math.hypot(halfRun, pitch) + 0.08;
        const slopeAngle = Math.atan2(pitch, halfRun);
        const slabThick = 0.12;

        const roofPivot = new THREE.Group();
        roofPivot.position.set(cx, baseY, cz);
        if (!alongX) roofPivot.rotation.y = Math.PI / 2;

        // Left & right sloped roof decks
        const slopeGeo = new THREE.BoxGeometry(ridgeSpan, slabThick, slopeLen);
        const northSlope = new THREE.Mesh(slopeGeo, roofMat);
        northSlope.position.set(0, pitch / 2 + 0.02, -halfRun / 2);
        northSlope.rotation.x = -slopeAngle;
        northSlope.castShadow = true;
        northSlope.receiveShadow = true;

        const southSlope = new THREE.Mesh(slopeGeo, roofMat);
        southSlope.position.set(0, pitch / 2 + 0.02, halfRun / 2);
        southSlope.rotation.x = slopeAngle;
        southSlope.castShadow = true;
        southSlope.receiveShadow = true;

        roofPivot.add(northSlope, southSlope);

        // Subtle architectural roof seam ribs along the slopes
        const ribCount = Math.max(3, Math.min(18, Math.floor(ridgeSpan / 0.85)));
        const ribGeo = new THREE.BoxGeometry(0.045, 0.04, slopeLen - 0.04);
        for (let r = 0; r <= ribCount; r++) {
          const rx = -ridgeSpan / 2 + 0.12 + (r / ribCount) * (ridgeSpan - 0.24);
          const ribN = new THREE.Mesh(ribGeo, ridgeMat);
          ribN.position.set(rx, pitch / 2 + 0.075, -halfRun / 2);
          ribN.rotation.x = -slopeAngle;
          const ribS = new THREE.Mesh(ribGeo, ridgeMat);
          ribS.position.set(rx, pitch / 2 + 0.075, halfRun / 2);
          ribS.rotation.x = slopeAngle;
          roofPivot.add(ribN, ribS);
        }

        // Ridge cap beam + timber eaves fascia
        const ridgeCap = new THREE.Mesh(new THREE.BoxGeometry(ridgeSpan + 0.08, 0.14, 0.2), ridgeMat);
        ridgeCap.position.set(0, pitch + 0.07, 0);
        ridgeCap.castShadow = true;
        roofPivot.add(ridgeCap);

        const eaveN = new THREE.Mesh(new THREE.BoxGeometry(ridgeSpan + 0.04, 0.14, 0.08), fasciaMat);
        eaveN.position.set(0, -0.02, -halfRun);
        const eaveS = new THREE.Mesh(new THREE.BoxGeometry(ridgeSpan + 0.04, 0.14, 0.08), fasciaMat);
        eaveS.position.set(0, -0.02, halfRun);
        roofPivot.add(eaveN, eaveS);

        // Triangular Gable end wall infills flush with building walls
        const innerSpan = alongX ? spanW : spanD;
        const innerRun = alongX ? spanD : spanW;
        const triShape = new THREE.Shape();
        triShape.moveTo(-innerRun / 2, 0);
        triShape.lineTo(innerRun / 2, 0);
        triShape.lineTo(0, pitch * (innerRun / runSpan) + 0.04);
        triShape.closePath();
        const gableGeo = new THREE.ExtrudeGeometry(triShape, { depth: 0.14, bevelEnabled: false });
        gableGeo.rotateY(Math.PI / 2);
        const g1 = new THREE.Mesh(gableGeo, gableWallMat);
        g1.position.set(-innerSpan / 2, -0.02, 0);
        g1.castShadow = true;
        g1.receiveShadow = true;
        const g2 = new THREE.Mesh(gableGeo, gableWallMat);
        g2.position.set(innerSpan / 2 - 0.14, -0.02, 0);
        g2.castShadow = true;
        g2.receiveShadow = true;
        roofPivot.add(g1, g2);

        this.ceilingGroup.add(roofPivot);
      } else if (roofStyle === 'hip') {
        // 4-sided Hip Roof (Atap Limasan)
        buildHipLayer(cx, cz, baseY, rw, rd, pitch, 1.0);
      } else if (roofStyle === 'joglo') {
        // Tiered Indonesian Pavilion Roof (Atap Joglo / Limasan Bertingkat)
        const lowerH = pitch * 0.52;
        buildHipLayer(cx, cz, baseY, rw + 0.22, rd + 0.22, lowerH, 1.0);
        // Timber clerestory neck crown + steeper upper pavilion roof
        const topW = Math.max(1.8, rw * 0.54);
        const topD = Math.max(1.8, rd * 0.54);
        const neckY = baseY + lowerH * 0.86;
        const neck = new THREE.Mesh(new THREE.BoxGeometry(topW * 0.84, 0.24, topD * 0.84), fasciaMat);
        neck.position.set(cx, neckY + 0.06, cz);
        neck.castShadow = true;
        this.ceilingGroup.add(neck);
        buildHipLayer(cx, cz, neckY + 0.16, topW, topD, pitch * 0.88, 0.72);
      } else if (roofStyle === 'shed') {
        // Modern Minimalist Single-Slope Mono-Pitch Roof (Atap Miring Modern)
        const shedH = Math.max(0.65, pitch * 0.82);
        const slopeLen = Math.hypot(rd, shedH) + 0.06;
        const slopeAngle = Math.atan2(shedH, rd);
        const deck = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.14, slopeLen), roofMat);
        deck.position.set(cx, baseY + shedH / 2 + 0.05, cz);
        deck.rotation.x = slopeAngle;
        deck.castShadow = true;
        deck.receiveShadow = true;
        this.ceilingGroup.add(deck);

        // Dark architectural fascia frame
        const frontFascia = new THREE.Mesh(new THREE.BoxGeometry(rw + 0.04, 0.18, 0.08), fasciaMat);
        frontFascia.position.set(cx, baseY + shedH + 0.04, cz - rd / 2);
        const backFascia = new THREE.Mesh(new THREE.BoxGeometry(rw + 0.04, 0.18, 0.08), fasciaMat);
        backFascia.position.set(cx, baseY + 0.04, cz + rd / 2);
        this.ceilingGroup.add(frontFascia, backFascia);

        // Clerestory north & triangular side walls filling the wedge gap cleanly
        const northInfill = new THREE.Mesh(new THREE.BoxGeometry(spanW, shedH, 0.14), gableWallMat);
        northInfill.position.set(cx, baseY + shedH / 2 - 0.02, isl.minZ + 0.07);
        northInfill.castShadow = true;
        northInfill.receiveShadow = true;
        this.ceilingGroup.add(northInfill);

        const sideShape = new THREE.Shape();
        sideShape.moveTo(-spanD / 2, 0);
        sideShape.lineTo(spanD / 2, 0);
        sideShape.lineTo(-spanD / 2, shedH);
        sideShape.closePath();
        const sideGeo = new THREE.ExtrudeGeometry(sideShape, { depth: 0.14, bevelEnabled: false });
        sideGeo.rotateY(Math.PI / 2);
        const sW = new THREE.Mesh(sideGeo, gableWallMat);
        sW.position.set(isl.minX, baseY - 0.02, cz);
        const sE = new THREE.Mesh(sideGeo, gableWallMat);
        sE.position.set(isl.maxX - 0.14, baseY - 0.02, cz);
        this.ceilingGroup.add(sW, sE);
      }
    }
  }

  /**
   * Renders non-active stories (lower stories always visible beneath upper stories,
   * and upper stories visible when Show All Floors or 3D Roof is active).
   */
  private rebuildOtherFloors(): void {
    this.clearGroup(this.otherFloorsGroup, true);
    if (!this.blueprint) return;

    const bp = this.blueprint;
    const floorCount = getBlueprintFloorCount(bp);
    if (floorCount <= 1) return;

    const activeIdx = getActiveFloorIndex(bp);
    const site = getEffectiveSite(bp);
    const half = bp.gridSize / 2;
    const roomWallH = site.wallHeight ?? WALL_HEIGHT;
    const floorElev = getFloorElevation(bp);
    const showUpper = (this.showUpperFloors || Boolean(site.showRoof)) && !this.planModeLocked;

    for (let floorIdx = 0; floorIdx < floorCount; floorIdx++) {
      if (floorIdx === activeIdx) continue;
      if (floorIdx > activeIdx && !showUpper) continue;
      if (this.planModeLocked && floorIdx !== activeIdx) continue;

      const fData = getBlueprintFloorData(bp, floorIdx);
      const storyGroup = new THREE.Group();
      storyGroup.position.y = floorIdx * floorElev;

      // 1. Batched floor tiles (1 draw call per unique material) + merged structural slab
      const matGroups = new Map<
        string,
        { mat: THREE.MeshStandardMaterial; centers: { x: number; y: number; z: number }[] }
      >();
      const slabCenters: { x: number; y: number; z: number }[] = [];

      for (const tile of Object.values(fData.tiles)) {
        const wx = tile.x - half + 0.5;
        const wz = tile.z - half + 0.5;
        const matKey = `${tile.floorMat}|${tile.floorTint ? tile.floorTint.toUpperCase() : '#FFFFFF'}`;
        let bucket = matGroups.get(matKey);
        if (!bucket) {
          bucket = {
            mat: this.textures.getFloorMaterial(tile.floorMat, tile.floorTint),
            centers: [],
          };
          matGroups.set(matKey, bucket);
        }
        bucket.centers.push({ x: wx, y: -0.03, z: wz });

        if (floorIdx > 0) {
          slabCenters.push({ x: wx, y: -0.06 - FLOOR_SLAB_THICKNESS / 2, z: wz });
        }
      }

      for (const bucket of matGroups.values()) {
        const mergedGeo = this.buildMergedBoxes(bucket.centers, TILE_SIZE, 0.06, TILE_SIZE);
        if (!mergedGeo) continue;
        const fMesh = new THREE.Mesh(mergedGeo, bucket.mat);
        fMesh.receiveShadow = true;
        storyGroup.add(fMesh);
      }

      if (slabCenters.length > 0) {
        const mergedSlabGeo = this.buildMergedBoxes(
          slabCenters,
          TILE_SIZE + 0.04,
          FLOOR_SLAB_THICKNESS,
          TILE_SIZE + 0.04,
        );
        if (mergedSlabGeo) {
          const slab = new THREE.Mesh(
            mergedSlabGeo,
            new THREE.MeshStandardMaterial({
              color: 0xe6ddd0,
              roughness: 0.85,
              metalness: 0.02,
            }),
          );
          slab.castShadow = true;
          slab.receiveShadow = true;
          storyGroup.add(slab);
        }
      }

      // 2. Full-height perimeter & interior walls for structural realism
      const seen = new Set<string>();
      const addWallEdge = (
        axis: 'h' | 'v',
        x: number,
        z: number,
        matId: WallMaterialId,
        tint?: string,
      ) => {
        const key = `${axis}:${x}:${z}`;
        if (seen.has(key)) return;
        seen.add(key);
        const style = fData.wallStyles?.[key];
        const finalMat = style?.mat || matId;
        const finalTint = style?.tint || tint;
        const opening = fData.openings?.[key] || 'none';
        const wallMesh = buildWallSegmentMesh(
          TILE_SIZE,
          roomWallH,
          opening,
          this.textures.getWallMaterial(finalMat, finalTint),
          this.isSoftwareGl,
        );
        if (axis === 'h') {
          wallMesh.position.set(x - half + 0.5, 0, z - half);
        } else {
          wallMesh.position.set(x - half, 0, z - half + 0.5);
          wallMesh.rotation.y = Math.PI / 2;
        }
        storyGroup.add(wallMesh);
      };

      for (const tile of Object.values(fData.tiles)) {
        const { x, z } = tile;
        if (!fData.tiles[`${x},${z - 1}`]) addWallEdge('h', x, z, tile.wallMat, tile.wallTint);
        if (!fData.tiles[`${x},${z + 1}`]) addWallEdge('h', x, z + 1, tile.wallMat, tile.wallTint);
        if (!fData.tiles[`${x - 1},${z}`]) addWallEdge('v', x, z, tile.wallMat, tile.wallTint);
        if (!fData.tiles[`${x + 1},${z}`]) addWallEdge('v', x + 1, z, tile.wallMat, tile.wallTint);
      }

      for (const [edgeKey, enabled] of Object.entries(fData.interiorWalls || {})) {
        if (!enabled) continue;
        const [axis, xs, zs] = edgeKey.split(':');
        const x = Number(xs);
        const z = Number(zs);
        const tA = axis === 'h' ? fData.tiles[`${x},${z - 1}`] : fData.tiles[`${x - 1},${z}`];
        const tB = fData.tiles[`${x},${z}`];
        if (tA && tB) {
          addWallEdge(axis as 'h' | 'v', x, z, tB.wallMat, tB.wallTint);
        }
      }

      // 3. Freeform custom walls on that floor
      for (const cw of fData.customWalls || []) {
        const dx = cw.x2 - cw.x1;
        const dz = cw.z2 - cw.z1;
        const len = Math.hypot(dx, dz);
        if (len < 0.2) continue;
        const seg = buildWallSegmentMesh(
          len,
          cw.height || roomWallH,
          cw.opening || 'none',
          this.textures.getWallMaterial(cw.mat, cw.tint),
          this.isSoftwareGl,
          0,
          0,
          cw.thickness ?? WALL_THICKNESS,
        );
        seg.position.set((cw.x1 + cw.x2) / 2, 0, (cw.z1 + cw.z2) / 2);
        seg.rotation.y = -Math.atan2(dz, dx);
        storyGroup.add(seg);
      }

      // 4. Placed furniture on that floor
      for (const item of fData.furniture) {
        const def = getFurnitureDef(item.defId, this.customDefs);
        if (!def) continue;
        const tf = resolveFurnitureTransform(item, def, bp.gridSize);
        const mesh = buildFurnitureModel(
          item.defId,
          item.color,
          this.textures,
          this.isSoftwareGl,
          this.customDefs,
        );
        const hasIndoorTile = Boolean(
          fData.tiles[`${Math.floor(tf.wx + half)},${Math.floor(tf.wz + half)}`],
        );
        const yGround =
          floorIdx === 0 && !hasIndoorTile && tf.wy <= 0.01 ? -site.foundationHeight : tf.wy;
        mesh.position.set(tf.wx, yGround, tf.wz);
        mesh.rotation.y = tf.rotY;
        mesh.scale.setScalar(tf.scale);
        storyGroup.add(mesh);
      }

      this.otherFloorsGroup.add(storyGroup);
    }
  }

  private rebuildFloors(): void {
    if (!this.blueprint) return;
    this.clearGroup(this.floorGroup, true);

    const half = this.blueprint.gridSize / 2;
    const isUpperFloor = getActiveFloorIndex(this.blueprint) > 0;

    // Group floor tiles by shared material and merge into 1 draw call per unique floor surface
    const matGroups = new Map<
      string,
      { mat: THREE.MeshStandardMaterial; centers: { x: number; y: number; z: number }[] }
    >();
    const slabCenters: { x: number; y: number; z: number }[] = [];

    for (const tile of Object.values(this.blueprint.tiles)) {
      const wx = tile.x - half + 0.5;
      const wz = tile.z - half + 0.5;
      const matKey = `${tile.floorMat}|${tile.floorTint ? tile.floorTint.toUpperCase() : '#FFFFFF'}`;
      let bucket = matGroups.get(matKey);
      if (!bucket) {
        bucket = {
          mat: this.textures.getFloorMaterial(tile.floorMat, tile.floorTint),
          centers: [],
        };
        matGroups.set(matKey, bucket);
      }
      bucket.centers.push({ x: wx, y: -0.03, z: wz });

      if (isUpperFloor) {
        slabCenters.push({ x: wx, y: -0.06 - FLOOR_SLAB_THICKNESS / 2, z: wz });
      }
    }

    for (const bucket of matGroups.values()) {
      const mergedGeo = this.buildMergedBoxes(bucket.centers, TILE_SIZE, 0.06, TILE_SIZE);
      if (!mergedGeo) continue;
      const mesh = new THREE.Mesh(mergedGeo, bucket.mat);
      mesh.receiveShadow = true;
      this.floorGroup.add(mesh);
    }

    if (slabCenters.length > 0) {
      const mergedSlabGeo = this.buildMergedBoxes(
        slabCenters,
        TILE_SIZE + 0.04,
        FLOOR_SLAB_THICKNESS,
        TILE_SIZE + 0.04,
      );
      if (mergedSlabGeo) {
        const slab = new THREE.Mesh(
          mergedSlabGeo,
          new THREE.MeshStandardMaterial({
            color: 0xe6ddd0,
            roughness: 0.85,
            metalness: 0.02,
          }),
        );
        slab.castShadow = true;
        slab.receiveShadow = true;
        this.floorGroup.add(slab);
      }
    }
  }

  private updateZoneTintOverlay(): void {
    this.clearGroup(this.zoneOverlayGroup, true);
    if (
      !this.blueprint ||
      !this.toolState ||
      this.toolState.tab !== 'layout' ||
      this.toolState.layoutSubTool !== 'zone_paint'
    ) {
      return;
    }

    const half = this.blueprint.gridSize / 2;
    const basePlane = new THREE.PlaneGeometry(TILE_SIZE * 0.92, TILE_SIZE * 0.92);
    basePlane.rotateX(-Math.PI / 2);
    const zoneColors = Object.fromEntries(ROOM_ZONES.map((z) => [z.id, z.color]));
    const colorBuckets = new Map<string, THREE.BufferGeometry[]>();

    for (const tile of Object.values(this.blueprint.tiles)) {
      const color = zoneColors[tile.zone] || '#D99B4E';
      let geos = colorBuckets.get(color);
      if (!geos) {
        geos = [];
        colorBuckets.set(color, geos);
      }
      const g = basePlane.clone();
      g.translate(tile.x - half + 0.5, 0.012, tile.z - half + 0.5);
      geos.push(g);
    }
    basePlane.dispose();

    for (const [color, geos] of colorBuckets.entries()) {
      const merged = BufferGeometryUtils.mergeGeometries(geos, false);
      for (const g of geos) g.dispose();
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
      });
      this.zoneOverlayGroup.add(new THREE.Mesh(merged, mat));
    }
  }

  private getCameraQuadrant(): number {
    const dx = this.camera.position.x - this.controls.target.x;
    const dz = this.camera.position.z - this.controls.target.z;
    if (dx >= 0 && dz >= 0) return 0;
    if (dx < 0 && dz >= 0) return 1;
    if (dx < 0 && dz < 0) return 2;
    return 3;
  }

  /**
   * Rebuilds all grid perimeter/partition walls + corner junction posts (ZERO Z-fighting!)
   * AND all freeform user-drawn custom walls with interactive hitboxes.
   */
  private rebuildWalls(): void {
    if (!this.blueprint) return;
    this.clearGroup(this.wallGroup, true);
    this.customWallHitBoxes = [];

    const bp = this.blueprint;
    const half = bp.gridSize / 2;
    const quad = this.getCameraQuadrant();
    this.lastCutawayQuad = quad;

    interface WallSpec {
      key: string;
      axis: 'h' | 'v';
      x: number;
      z: number;
      isExterior: boolean;
      sideSign: number;
      wallMat: WallMaterialId;
      wallTint?: string;
      height: number;
      finalMatId: WallMaterialId;
      finalTint?: string;
    }

    const specs: WallSpec[] = [];
    const seen = new Set<string>();

    const effSite = getEffectiveSite(bp);
    const roomWallH = effSite.wallHeight ?? WALL_HEIGHT;
    const roofForcesFullWalls =
      Boolean(effSite.showRoof) && (effSite.roofStyle ?? 'gable') !== 'none' && !this.planModeLocked;

    const computeWallHeight = (axis: 'h' | 'v', isExterior: boolean, sideSign: number): number => {
      if (this.wallViewMode === 'low') return 0.42;
      if (this.wallViewMode === 'cutaway' && isExterior && !roofForcesFullWalls) {
        const dropSouth = quad === 0 || quad === 1;
        const dropNorth = quad === 2 || quad === 3;
        const dropEast = quad === 0 || quad === 3;
        const dropWest = quad === 1 || quad === 2;
        if (
          (axis === 'h' && sideSign === 1 && dropSouth) ||
          (axis === 'h' && sideSign === -1 && dropNorth) ||
          (axis === 'v' && sideSign === 1 && dropEast) ||
          (axis === 'v' && sideSign === -1 && dropWest)
        ) {
          return 0.36;
        }
      }
      return roomWallH;
    };

    const pushSpec = (
      key: string,
      axis: 'h' | 'v',
      x: number,
      z: number,
      isExterior: boolean,
      sideSign: number,
      wallMat: WallMaterialId,
      wallTint?: string,
    ) => {
      if (seen.has(key)) return;
      seen.add(key);
      const edgeOverride = bp.wallStyles?.[key];
      const finalMatId = edgeOverride ? edgeOverride.mat : wallMat;
      const finalTint = edgeOverride ? edgeOverride.tint : wallTint;
      specs.push({
        key,
        axis,
        x,
        z,
        isExterior,
        sideSign,
        wallMat,
        wallTint,
        height: computeWallHeight(axis, isExterior, sideSign),
        finalMatId,
        finalTint,
      });
    };

    // 1. Exterior walls around floor tiles
    for (const tile of Object.values(bp.tiles)) {
      const { x, z, wallMat, wallTint } = tile;
      if (!bp.tiles[`${x},${z - 1}`]) pushSpec(`h:${x}:${z}`, 'h', x, z, true, -1, wallMat, wallTint);
      if (!bp.tiles[`${x},${z + 1}`]) pushSpec(`h:${x}:${z + 1}`, 'h', x, z + 1, true, 1, wallMat, wallTint);
      if (!bp.tiles[`${x - 1},${z}`]) pushSpec(`v:${x}:${z}`, 'v', x, z, true, -1, wallMat, wallTint);
      if (!bp.tiles[`${x + 1},${z}`]) pushSpec(`v:${x + 1}:${z}`, 'v', x + 1, z, true, 1, wallMat, wallTint);
    }

    // 2. Interior partition walls
    for (const [key, active] of Object.entries(bp.interiorWalls)) {
      if (!active || seen.has(key)) continue;
      const [axis, xs, zs] = key.split(':');
      const x = Number(xs);
      const z = Number(zs);
      const adjTile =
        axis === 'h'
          ? bp.tiles[`${x},${z}`] || bp.tiles[`${x},${z - 1}`]
          : bp.tiles[`${x},${z}`] || bp.tiles[`${x - 1},${z}`];
      if (!adjTile) continue;
      pushSpec(key, axis as 'h' | 'v', x, z, false, 0, adjTile.wallMat, adjTile.wallTint);
    }

    // 3. Detect corner & T-junction vertices where horizontal & vertical walls meet
    interface VertexInfo {
      vx: number;
      vz: number;
      hasH: boolean;
      hasV: boolean;
      maxH: number;
      matId: WallMaterialId;
      tint?: string;
    }
    const vertices = new Map<string, VertexInfo>();
    const markVertex = (vx: number, vz: number, spec: WallSpec) => {
      const vk = `${vx},${vz}`;
      const existing = vertices.get(vk);
      if (!existing) {
        vertices.set(vk, {
          vx,
          vz,
          hasH: spec.axis === 'h',
          hasV: spec.axis === 'v',
          maxH: spec.height,
          matId: spec.finalMatId,
          tint: spec.finalTint,
        });
      } else {
        if (spec.axis === 'h') existing.hasH = true;
        if (spec.axis === 'v') existing.hasV = true;
        if (spec.height > existing.maxH) {
          existing.maxH = spec.height;
          existing.matId = spec.finalMatId;
          existing.tint = spec.finalTint;
        }
      }
    };

    for (const spec of specs) {
      if (spec.axis === 'h') {
        markVertex(spec.x, spec.z, spec);
        markVertex(spec.x + 1, spec.z, spec);
      } else {
        markVertex(spec.x, spec.z, spec);
        markVertex(spec.x, spec.z + 1, spec);
      }
    }

    const cornerSet = new Set<string>();
    const halfT = WALL_THICKNESS / 2;

    // Place flush architectural corner posts at every L-corner, T-junction, or +-cross
    for (const [vk, v] of vertices.entries()) {
      if (v.hasH && v.hasV) {
        cornerSet.add(vk);
        const mat = this.textures.getWallMaterial(v.matId, v.tint);
        const post = buildCornerPostMesh(v.maxH, mat);
        post.position.set(v.vx - half, 0, v.vz - half);
        this.wallGroup.add(post);
      }
    }

    // Build each wall segment trimmed by halfT at any corner vertex -> ZERO overlap & ZERO Z-fighting!
    for (const spec of specs) {
      const opening: WallOpeningType = bp.openings[spec.key] || 'none';
      const mat = this.textures.getWallMaterial(spec.finalMatId, spec.finalTint);

      let trimLeft = 0;
      let trimRight = 0;
      if (spec.axis === 'h') {
        // Local -X is (x, z), Local +X is (x+1, z)
        if (cornerSet.has(`${spec.x},${spec.z}`)) trimLeft = halfT;
        if (cornerSet.has(`${spec.x + 1},${spec.z}`)) trimRight = halfT;
      } else {
        // With rotation.y = Math.PI/2, local +X maps to world -Z and local -X maps to world +Z!
        // So local -X is (x, z+1), local +X is (x, z)
        if (cornerSet.has(`${spec.x},${spec.z + 1}`)) trimLeft = halfT;
        if (cornerSet.has(`${spec.x},${spec.z}`)) trimRight = halfT;
      }

      const seg = buildWallSegmentMesh(
        TILE_SIZE,
        spec.height,
        opening,
        mat,
        this.isSoftwareGl,
        trimLeft,
        trimRight,
      );

      if (spec.axis === 'h') {
        seg.position.set(spec.x - half + 0.5, 0, spec.z - half);
      } else {
        seg.position.set(spec.x - half, 0, spec.z - half + 0.5);
        seg.rotation.y = Math.PI / 2;
      }
      this.wallGroup.add(seg);
    }

    // 4. Custom freeform walls drawn from scratch
    const customWalls = bp.customWalls || [];
    const customCornerPoints = new Map<
      string,
      { x: number; z: number; h: number; t: number; mat: THREE.Material }
    >();

    for (const cw of customWalls) {
      const dx = cw.x2 - cw.x1;
      const dz = cw.z2 - cw.z1;
      const len = Math.hypot(dx, dz);
      if (len < 0.2) continue;

      const h = this.wallViewMode === 'low' ? 0.42 : cw.height || roomWallH;
      const cwThick = Math.max(0.08, Math.min(0.6, cw.thickness ?? WALL_THICKNESS));
      const mat = this.textures.getWallMaterial(cw.mat, cw.tint);

      // Trim custom wall ends slightly so corner posts join cleanly without Z-fighting
      const endTrim = Math.min(cwThick / 2, len * 0.2);
      const seg = buildWallSegmentMesh(
        len,
        h,
        cw.opening || 'none',
        mat,
        this.isSoftwareGl,
        endTrim,
        endTrim,
        cwThick,
      );
      seg.position.set((cw.x1 + cw.x2) / 2, 0, (cw.z1 + cw.z2) / 2);
      seg.rotation.y = -Math.atan2(dz, dx);
      this.wallGroup.add(seg);

      // Grounding concrete wall footing when built floor exists so exterior custom walls never float above grass
      if (Object.keys(bp.tiles).length > 0) {
        const fH = getEffectiveSite(bp).foundationHeight;
        const footMat = new THREE.MeshStandardMaterial({
          color: 0xa69f94,
          roughness: 0.88,
          metalness: 0.02,
        });
        const footMesh = new THREE.Mesh(
          new THREE.BoxGeometry(len + 0.08, fH, cwThick + 0.06),
          footMat,
        );
        footMesh.position.set((cw.x1 + cw.x2) / 2, -fH / 2, (cw.z1 + cw.z2) / 2);
        footMesh.rotation.y = -Math.atan2(dz, dx);
        footMesh.receiveShadow = true;
        this.wallGroup.add(footMesh);
      }

      // Invisible raycast proxy hitbox for selecting, painting, openings, and erasing custom walls
      const hitGeo = new THREE.BoxGeometry(len, Math.max(0.5, h), cwThick + 0.16);
      const hitMesh = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({ visible: false }));
      hitMesh.position.set((cw.x1 + cw.x2) / 2, Math.max(0.5, h) / 2, (cw.z1 + cw.z2) / 2);
      hitMesh.rotation.y = -Math.atan2(dz, dx);
      hitMesh.userData.customWallId = cw.id;
      this.wallGroup.add(hitMesh);
      this.customWallHitBoxes.push(hitMesh);

      // Track endpoints for seamless corner joints
      for (const [px, pz] of [
        [cw.x1, cw.z1],
        [cw.x2, cw.z2],
      ]) {
        const pk = `${px.toFixed(2)},${pz.toFixed(2)}`;
        const prev = customCornerPoints.get(pk);
        if (!prev) {
          customCornerPoints.set(pk, { x: px, z: pz, h, t: cwThick, mat });
        } else {
          if (h > prev.h) {
            prev.h = h;
            prev.mat = mat;
          }
          if (cwThick > prev.t) prev.t = cwThick;
        }
      }
    }

    // Place flush architectural corner posts at every custom wall endpoint
    for (const pt of customCornerPoints.values()) {
      const post = buildCornerPostMesh(pt.h, pt.mat, pt.t);
      post.position.set(pt.x, 0, pt.z);
      this.wallGroup.add(post);
    }
  }

  private syncFurnitureMeshes(): void {
    if (!this.blueprint) return;
    const bp = this.blueprint;
    const activeUids = new Set(bp.furniture.map((f) => f.uid));

    for (const [uid, group] of this.furnitureMeshes.entries()) {
      if (!activeUids.has(uid)) {
        this.furnitureGroup.remove(group);
        this.disposeObject(group);
        this.furnitureMeshes.delete(uid);
        this.springs.delete(uid);
      }
    }

    this.furnitureHitBoxes = [];

    const site = getEffectiveSite(bp);
    const halfGrid = bp.gridSize / 2;

    for (const item of bp.furniture) {
      const def = getFurnitureDef(item.defId, this.customDefs);
      if (!def) continue;

      const tr = resolveFurnitureTransform(item, def, bp.gridSize);
      const cellGx = Math.floor(tr.wx + halfGrid);
      const cellGz = Math.floor(tr.wz + halfGrid);
      const onFloorTile = Boolean(bp.tiles[`${cellGx},${cellGz}`]);
      const baseGroundY = !def.wallMount && !def.ceilingMount && !onFloorTile && tr.wy <= 0.01 ? -site.foundationHeight : 0;
      const finalY = tr.wy + baseGroundY;

      let group = this.furnitureMeshes.get(item.uid);
      if (!group) {
        group = buildFurnitureModel(
          item.defId,
          item.color,
          this.textures,
          this.isSoftwareGl,
          this.customDefs,
        );
        group.userData.uid = item.uid;
        group.userData.defId = item.defId;
        group.position.set(tr.wx, finalY, tr.wz);
        group.rotation.y = tr.rotY;
        group.scale.setScalar(tr.scale * 0.55);

        const hitW = Math.max(0.32, def.width * 0.92);
        const hitD = Math.max(0.32, def.depth * 0.92);
        const hitH = Math.max(0.28, def.height);
        const hitGeo = def.wallMount
          ? new THREE.BoxGeometry(Math.max(0.6, def.width * 0.88), 1.0, 0.28)
          : new THREE.BoxGeometry(hitW, hitH, hitD);
        const hitMat = new THREE.MeshBasicMaterial({ visible: false });
        const hitMesh = new THREE.Mesh(hitGeo, hitMat);
        if (def.wallMount) {
          hitMesh.position.set(0, 1.54, -0.35);
        } else {
          hitMesh.position.y = hitH / 2;
        }
        hitMesh.userData.furnitureUid = item.uid;
        hitMesh.userData.isHitBox = true;
        group.add(hitMesh);

        this.furnitureGroup.add(group);
        this.furnitureMeshes.set(item.uid, group);
        this.springs.set(item.uid, {
          group,
          targetRotY: tr.rotY,
          targetScale: tr.scale,
          scale: tr.scale * 0.55,
          scaleVel: 6.2,
        });
      } else {
        const moved =
          Math.abs(group.position.x - tr.wx) > 0.005 ||
          Math.abs(group.position.y - finalY) > 0.005 ||
          Math.abs(group.position.z - tr.wz) > 0.005;
        group.position.set(tr.wx, finalY, tr.wz);
        applyFurnitureColor(group, item.color);
        const spring = this.springs.get(item.uid);
        if (spring) {
          if (Math.abs(spring.targetRotY - tr.rotY) > 0.01 || moved) {
            spring.scaleVel = 2.6;
          }
          spring.targetRotY = tr.rotY;
          spring.targetScale = tr.scale;
        }
      }

      const hitMesh = group.children.find((c) => c.userData.furnitureUid === item.uid) as
        | THREE.Mesh
        | undefined;
      if (hitMesh) this.furnitureHitBoxes.push(hitMesh);
    }

    this.rebuildPracticalLights();
  }

  private rebuildPracticalLights(): void {
    // Clean up existing point lights and sprite halo materials
    while (this.practicalLightsGroup.children.length > 0) {
      const child = this.practicalLightsGroup.children[0];
      this.practicalLightsGroup.remove(child);
      if (child instanceof THREE.Sprite) {
        child.material.dispose();
      }
    }
    if (!this.blueprint) return;

    const mult = MOOD_PRESETS[this.mood].lampMultiplier;
    const emitters: PlacedFurniture[] = [];
    for (const item of this.blueprint.furniture) {
      const def = getFurnitureDef(item.defId, this.customDefs);
      if (def?.emitsLight) emitters.push(item);
    }

    const roomWallH = getEffectiveSite(this.blueprint).wallHeight ?? WALL_HEIGHT;
    const maxLights = this.isSoftwareGl ? 4 : 10;
    const capped = emitters.slice(0, maxLights);
    for (const item of capped) {
      const def = getFurnitureDef(item.defId, this.customDefs)!;
      const tr = resolveFurnitureTransform(item, def, this.blueprint.gridSize);
      const isFire = def.id === 'fireplace' || def.id === 'candle_trio';
      const baseY = def.ceilingMount
        ? roomWallH - 0.72
        : def.id === 'fireplace'
          ? 0.58
          : def.wallMount
            ? 1.72
            : def.tabletopProp
              ? 0.28
              : 1.54;
      const lightColor = def.lightColor || (isFire ? '#FFA657' : '#FFDFAA');
      const intensity = (def.lightIntensity || 2.1) * mult;

      const light = new THREE.PointLight(lightColor, intensity, 9.8, 1.55);
      light.position.set(tr.wx, tr.wy + baseY, tr.wz);
      light.userData.isFireLight = isFire;
      light.userData.baseIntensity = intensity;
      this.practicalLightsGroup.add(light);

      // Soft radial warm glow halo around lamps, candles, fairy lights, and fireplaces
      const glowOpacity = THREE.MathUtils.clamp(0.14 + mult * 0.22, 0.18, 0.72);
      const haloMat = new THREE.SpriteMaterial({
        map: this.lampGlowTex,
        color: new THREE.Color(lightColor),
        transparent: true,
        opacity: glowOpacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const halo = new THREE.Sprite(haloMat);
      halo.position.set(tr.wx, tr.wy + baseY, tr.wz);
      const haloSize =
        (def.id === 'fireplace' ? 1.15 : def.tabletopProp ? 0.58 : def.ceilingMount ? 1.05 : 0.85) *
        (0.85 + Math.min(0.45, mult * 0.18));
      halo.scale.set(haloSize, haloSize, 1);
      halo.userData.isFireHalo = isFire;
      halo.userData.baseScale = haloSize;
      halo.userData.baseOpacity = glowOpacity;
      this.practicalLightsGroup.add(halo);
    }
  }

  private rebuildRoomLights(): void {
    while (this.roomLightsGroup.children.length > 0) {
      const child = this.roomLightsGroup.children[0];
      this.roomLightsGroup.remove(child);
      if (child instanceof THREE.Sprite) {
        child.material.dispose();
      }
    }
    if (!this.blueprint) return;

    const rooms = detectRooms(this.blueprint);
    if (rooms.length === 0) return;

    const half = this.blueprint.gridSize / 2;
    const roomWallH = getEffectiveSite(this.blueprint).wallHeight ?? WALL_HEIGHT;
    const moodBoost =
      this.mood === 'evening'
        ? 1.6
        : this.mood === 'golden'
          ? 1.15
          : this.mood === 'morning'
            ? 1.0
            : 0.95;

    // Prioritize rooms with explicit user customization so edits always render first
    const prioritized = [...rooms].sort((a, b) => {
      const ca = hasCustomRoomLight(this.blueprint!, a) ? 1 : 0;
      const cb = hasCustomRoomLight(this.blueprint!, b) ? 1 : 0;
      if (ca !== cb) return cb - ca;
      return b.area - a.area;
    });

    const maxRoomLights = this.isSoftwareGl ? 6 : 12;
    let activeCount = 0;

    for (const room of prioritized) {
      if (activeCount >= maxRoomLights) break;
      const cfg = getRoomLightConfig(this.blueprint, room);
      const isCustom = hasCustomRoomLight(this.blueprint, room);

      if (!cfg.enabled || cfg.intensity <= 0.01) continue;
      // In daytime/golden modes, only illuminate customized rooms or subtle fill on main rooms
      if (!isCustom && this.mood !== 'evening' && activeCount >= 4) continue;

      let sumX = 0;
      let sumZ = 0;
      let minX = Infinity;
      let maxX = -Infinity;
      let minZ = Infinity;
      let maxZ = -Infinity;
      for (const k of room.tiles) {
        const [xs, zs] = k.split(',');
        const gx = Number(xs);
        const gz = Number(zs);
        sumX += gx;
        sumZ += gz;
        if (gx < minX) minX = gx;
        if (gx > maxX) maxX = gx;
        if (gz < minZ) minZ = gz;
        if (gz > maxZ) maxZ = gz;
      }
      if (room.tiles.length === 0) continue;

      const cx = (sumX / room.tiles.length + 0.5 - half) * TILE_SIZE;
      const cz = (sumZ / room.tiles.length + 0.5 - half) * TILE_SIZE;
      const span = Math.max(3.2, Math.hypot(maxX - minX + 1, maxZ - minZ + 1));
      const distance = span * 1.45 + 2.4;

      const resolvedHex = resolveRoomLightHex(cfg);
      const basePower = isCustom ? 3.2 : 1.15;
      const intensity = cfg.intensity * basePower * moodBoost;
      const lightY = Math.max(1.25, roomWallH - 0.36);

      const light = new THREE.PointLight(resolvedHex, intensity, distance, 1.45);
      light.position.set(cx, lightY, cz);
      light.castShadow = false;
      this.roomLightsGroup.add(light);

      // Subtle ceiling downlight glow halo so warmth & tint read clearly in all lighting moods
      const haloOpacity = THREE.MathUtils.clamp(
        (isCustom ? 0.2 : 0.09) + cfg.intensity * (this.mood === 'evening' ? 0.26 : 0.17),
        0.08,
        0.65,
      );
      const haloMat = new THREE.SpriteMaterial({
        map: this.lampGlowTex,
        color: new THREE.Color(resolvedHex),
        transparent: true,
        opacity: haloOpacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const halo = new THREE.Sprite(haloMat);
      halo.position.set(cx, Math.max(1.35, roomWallH - 0.2), cz);
      const haloSize = THREE.MathUtils.clamp(0.85 + Math.sqrt(room.area) * 0.24, 1.0, 2.35);
      halo.scale.set(haloSize, haloSize, 1);
      this.roomLightsGroup.add(halo);

      activeCount += 1;
    }
  }

  private updateSelectionHighlight(): void {
    this.clearGroup(this.selectedRoomHighlightGroup, true);

    if (!this.blueprint || !this.toolState) {
      this.selectionOutline.visible = false;
      return;
    }

    // 1. Selected furniture highlight
    if (this.toolState.selectedPlacedUid) {
      const item = this.blueprint.furniture.find(
        (f) => f.uid === this.toolState!.selectedPlacedUid,
      );
      if (item) {
        const def = getFurnitureDef(item.defId, this.customDefs);
        if (def) {
          const tr = resolveFurnitureTransform(item, def, this.blueprint.gridSize);
          this.selectionOutline.scale.set(
            Math.max(0.32, def.width * tr.scale),
            1,
            Math.max(0.32, def.depth * tr.scale),
          );
          this.selectionOutline.rotation.y = tr.rotY;
          this.selectionOutline.position.set(tr.wx, tr.wy + (def.wallMount ? 1.54 : 0.05), tr.wz);
          this.selectionOutline.visible = true;
          return;
        }
      }
    }

    // 2. Selected custom wall highlight
    if (this.toolState.selectedCustomWallId && this.blueprint.customWalls) {
      const cw = this.blueprint.customWalls.find(
        (w) => w.id === this.toolState!.selectedCustomWallId,
      );
      if (cw) {
        const dx = cw.x2 - cw.x1;
        const dz = cw.z2 - cw.z1;
        const len = Math.max(0.25, Math.hypot(dx, dz));
        const h = this.wallViewMode === 'low' ? 0.45 : cw.height || WALL_HEIGHT;
        const thick = (cw.thickness ?? WALL_THICKNESS) + 0.12;
        this.selectionOutline.scale.set(len + 0.08, Math.max(1, h / 0.08), thick);
        this.selectionOutline.rotation.y = -Math.atan2(dz, dx);
        this.selectionOutline.position.set((cw.x1 + cw.x2) / 2, h / 2, (cw.z1 + cw.z2) / 2);
        this.selectionOutline.visible = true;
        return;
      }
    }

    this.selectionOutline.visible = false;

    // 3. Selected Room / Building highlight tiles
    if (this.toolState.selectedRoomId !== null && this.selectedRoomTileKeys.length > 0) {
      const half = this.blueprint.gridSize / 2;
      const tilePlaneGeo = new THREE.PlaneGeometry(TILE_SIZE * 0.94, TILE_SIZE * 0.94);
      tilePlaneGeo.rotateX(-Math.PI / 2);
      const highlightMat = new THREE.MeshBasicMaterial({
        color: this.toolState.roomEditScope === 'building' ? 0x467255 : 0xd98236,
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
      });
      for (const k of this.selectedRoomTileKeys) {
        const tile = this.blueprint.tiles[k];
        if (!tile) continue;
        const m = new THREE.Mesh(tilePlaneGeo, highlightMat);
        m.position.set(tile.x - half + 0.5, 0.022, tile.z - half + 0.5);
        this.selectedRoomHighlightGroup.add(m);
      }
    }
  }

  /**
   * Computes exact placement target for furniture — supporting FREE continuous placement,
   * automatic TABLETOP / SURFACE STACKING via 3D mesh raycasting, and Grid Snap mode.
   */
  private computeFurniturePlacementTarget(
    def: FurnitureDef,
    ignoreUid?: string | null,
  ): FurniturePlacePayload | null {
    if (!this.blueprint || !this.toolState) return null;
    const bp = this.blueprint;
    const tool = this.toolState;
    const half = bp.gridSize / 2;

    this.raycaster.setFromCamera(this.pointerNDC, this.camera);

    // 1. Check upward-facing surfaces on existing furniture for automatic stacking (e.g. putting items on tables/desks/counters!)
    let surfaceHit: { wx: number; wy: number; wz: number } | null = null;
    if (!def.wallMount && !def.ceilingMount && !def.outdoorAllowed && def.category !== 'stairs' && def.id !== 'area_rug') {
      const candidateMeshes: THREE.Mesh[] = [];
      for (const [uid, group] of this.furnitureMeshes.entries()) {
        if (ignoreUid && uid === ignoreUid) continue;
        const otherDef = getFurnitureDef(group.userData.defId as string, this.customDefs);
        if (
          !otherDef ||
          otherDef.wallMount ||
          otherDef.ceilingMount ||
          otherDef.outdoorAllowed ||
          otherDef.category === 'stairs' ||
          otherDef.id === 'area_rug'
        ) {
          continue;
        }
        group.traverse((obj) => {
          if (
            obj instanceof THREE.Mesh &&
            !obj.userData.isHitBox &&
            !obj.userData.isContactShadow
          ) {
            candidateMeshes.push(obj);
          }
        });
      }

      if (candidateMeshes.length > 0) {
        const hits = this.raycaster.intersectObjects(candidateMeshes, false);
        for (const h of hits) {
          if (!h.face) continue;
          _normalMat.getNormalMatrix(h.object.matrixWorld);
          _worldNormal.copy(h.face.normal).applyMatrix3(_normalMat).normalize();
          // Accept flat/near-flat top surfaces between 0.18m and 2.15m above active floor
          const localY = h.point.y - this.activeFloorY;
          if (_worldNormal.y > 0.72 && localY >= 0.18 && localY <= 2.15) {
            surfaceHit = {
              wx: h.point.x,
              wy: localY + 0.002,
              wz: h.point.z,
            };
            break;
          }
        }
      }
    }

    // Ground plane fallback
    let groundX = 0;
    let groundZ = 0;
    if (this.raycaster.ray.intersectPlane(_groundPlane, _rayHit)) {
      groundX = _rayHit.x;
      groundZ = _rayHit.z;
    } else if (!surfaceHit) {
      return null;
    }

    const useFree = tool.placementMode === 'free' || Boolean(surfaceHit) || Boolean(def.tabletopProp);

    if (def.wallMount) {
      // Wall-mounted items snap neatly to adjacent walls in both modes
      const fx = groundX + half;
      const fz = groundZ + half;
      const gx = Math.floor(fx);
      const gz = Math.floor(fz);
      if (gx < 0 || gx >= bp.gridSize || gz < 0 || gz >= bp.gridSize) return null;
      const effectiveRot = getAutoWallRotation(bp, gx, gz, tool.placementRotation);
      const center = computeFurnitureWorldCenter({ gx, gz, rotation: effectiveRot }, def.width, def.depth, bp.gridSize);

      // In free mode allow sliding continuously along the wall axis
      let wx = center.wx;
      let wz = center.wz;
      if (tool.placementMode === 'free') {
        if (effectiveRot === 0 || effectiveRot === 2) {
          wx = THREE.MathUtils.clamp(groundX, -half + 0.35, half - 0.35);
        } else {
          wz = THREE.MathUtils.clamp(groundZ, -half + 0.35, half - 0.35);
        }
      }
      return {
        gx,
        gz,
        wx,
        wy: 0,
        wz,
        rotY: -effectiveRot * (Math.PI / 2),
        rotation: effectiveRot,
        isFree: tool.placementMode === 'free',
      };
    }

    if (useFree) {
      const wx = surfaceHit ? surfaceHit.wx : groundX;
      const wy = surfaceHit ? surfaceHit.wy : 0;
      const wz = surfaceHit ? surfaceHit.wz : groundZ;
      if (wx < -half + 0.1 || wx > half - 0.1 || wz < -half + 0.1 || wz > half - 0.1) {
        return null;
      }
      const gx = Math.max(0, Math.min(bp.gridSize - 1, Math.floor(wx + half)));
      const gz = Math.max(0, Math.min(bp.gridSize - 1, Math.floor(wz + half)));
      const rotY = -THREE.MathUtils.degToRad(tool.placementAngleDeg);
      return {
        gx,
        gz,
        wx,
        wy,
        wz,
        rotY,
        rotation: tool.placementRotation,
        isFree: true,
      };
    }

    // Classic Grid Snap mode
    const gx = Math.floor(groundX + half);
    const gz = Math.floor(groundZ + half);
    if (gx < 0 || gx >= bp.gridSize || gz < 0 || gz >= bp.gridSize) return null;
    const center = computeFurnitureWorldCenter(
      { gx, gz, rotation: tool.placementRotation },
      def.width,
      def.depth,
      bp.gridSize,
    );
    return {
      gx,
      gz,
      wx: center.wx,
      wy: 0,
      wz: center.wz,
      rotY: -tool.placementRotation * (Math.PI / 2),
      rotation: tool.placementRotation,
      isFree: false,
    };
  }

  private getGroundYAt(wx: number, wz: number): number {
    const bp = this.blueprint;
    if (!bp) return 0;
    const hasTiles = Object.keys(bp.tiles).length > 0;
    if (!hasTiles) return 0;
    const half = bp.gridSize / 2;
    const gx = Math.floor(wx + half);
    const gz = Math.floor(wz + half);
    if (bp.tiles[`${gx},${gz}`]) return 0;
    return -getEffectiveSite(bp).foundationHeight;
  }

  private getZoneLabelAt(wx: number, wz: number): string {
    const bp = this.blueprint;
    if (!bp) return 'Outdoor Lot';
    const half = bp.gridSize / 2;
    const gx = Math.floor(wx + half);
    const gz = Math.floor(wz + half);
    const tile = bp.tiles[`${gx},${gz}`];
    if (!tile) return 'Outdoor Lot';
    const def = ROOM_ZONES.find((z) => z.id === tile.zone);
    return def ? `${def.name} Room` : 'Interior';
  }

  private updateFirstPersonCamera(): void {
    const eyeH = this.personHeightM - 0.06;
    const bob = Math.sin(this.walkPhase) * 0.024;
    this.camera.position.set(this.personPos.x, this.personGroundY + eyeH + bob, this.personPos.z);
    const cosPitch = Math.cos(this.personPitch);
    const lookX = this.personPos.x - Math.sin(this.personYaw) * cosPitch;
    const lookY = this.personGroundY + eyeH + bob + Math.sin(this.personPitch);
    const lookZ = this.personPos.z - Math.cos(this.personYaw) * cosPitch;
    this.camera.lookAt(lookX, lookY, lookZ);
  }

  private emitPeopleTelemetry(force = false): void {
    if (!this.callbacks.onPeopleUpdate || !this.blueprint) return;
    const now = performance.now();
    if (!force && now - this.lastPeopleTelemetryMs < 85) return;
    this.lastPeopleTelemetryMs = now;
    const bounds = getSiteBounds(this.blueprint);
    const lotX = Number(THREE.MathUtils.clamp(this.personPos.x - bounds.xMin, 0, bounds.landWidth).toFixed(1));
    const lotZ = Number(THREE.MathUtils.clamp(this.personPos.z - bounds.zMin, 0, bounds.landDepth).toFixed(1));
    const deg = Math.round((((-this.personYaw * 180) / Math.PI) % 360 + 360) % 360);
    this.callbacks.onPeopleUpdate({
      lotX,
      lotZ,
      headingDeg: deg,
      zoneLabel: this.getZoneLabelAt(this.personPos.x, this.personPos.z),
    });
  }

  private projectWorldToScreen(wx: number, wy: number, wz: number): { x: number; y: number } {
    _vec3A.set(wx, wy, wz).project(this.camera);
    const rect = this.renderer.domElement.getBoundingClientRect();
    return {
      x: Math.round(((_vec3A.x + 1) / 2) * rect.width),
      y: Math.round(((-_vec3A.y + 1) / 2) * rect.height),
    };
  }

  /**
   * Rebuilds 3D architectural measurement lines, end ticks, and label anchors for:
   * - Land plot outer width & depth
   * - Room / building dimensions & setbacks to lot edges
   * - Room-to-room spacing gaps
   * - Custom wall lengths/heights & parallel wall-to-wall clearance distances
   * - Selected furniture W×D×H dimensions
   */
  private rebuildDimensions(): void {
    this.clearGroup(this.dimensionsGroup, true);
    this.dimensionAnchors = [];
    this.lastDimCamSig = '';

    if (!this.showDimensions || !this.blueprint || this.isTitleShowcase) {
      this.callbacks.onDimensionLabels?.([]);
      return;
    }

    const bp = this.blueprint;
    const bounds = getSiteBounds(bp);
    const half = bp.gridSize / 2;
    const hasTiles = Object.keys(bp.tiles).length > 0;
    const fH = getEffectiveSite(bp).foundationHeight;
    const lotY = hasTiles ? -fH + 0.035 : 0.035;
    const floorY = 0.045;

    const lineBuckets: Record<'land' | 'room' | 'wall' | 'gap', number[]> = {
      land: [],
      room: [],
      wall: [],
      gap: [],
    };

    const pushSeg = (
      bucket: 'land' | 'room' | 'wall' | 'gap',
      x1: number,
      y1: number,
      z1: number,
      x2: number,
      y2: number,
      z2: number,
    ) => {
      lineBuckets[bucket].push(x1, y1, z1, x2, y2, z2);
    };

    const pushDimWithTicks = (
      bucket: 'land' | 'room' | 'wall' | 'gap',
      x1: number,
      z1: number,
      x2: number,
      z2: number,
      y: number,
      tickHalf = 0.16,
    ) => {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const len = Math.hypot(dx, dz);
      if (len < 0.05) return;
      const nx = -dz / len;
      const nz = dx / len;
      pushSeg(bucket, x1, y, z1, x2, y, z2);
      pushSeg(
        bucket,
        x1 - nx * tickHalf,
        y,
        z1 - nz * tickHalf,
        x1 + nx * tickHalf,
        y,
        z1 + nz * tickHalf,
      );
      pushSeg(
        bucket,
        x2 - nx * tickHalf,
        y,
        z2 - nz * tickHalf,
        x2 + nx * tickHalf,
        y,
        z2 + nz * tickHalf,
      );
    };

    // 1. Land Plot outer width & depth dimension lines
    const pad = 0.65;
    pushDimWithTicks('land', bounds.xMin, bounds.zMin - pad, bounds.xMax, bounds.zMin - pad, lotY, 0.22);
    this.dimensionAnchors.push({
      id: 'land_w',
      wx: bounds.centerX,
      wy: lotY + 0.05,
      wz: bounds.zMin - pad,
      text: `Lahan ${bounds.landWidth} m`,
      kind: 'land',
    });

    pushDimWithTicks('land', bounds.xMin - pad, bounds.zMin, bounds.xMin - pad, bounds.zMax, lotY, 0.22);
    this.dimensionAnchors.push({
      id: 'land_d',
      wx: bounds.xMin - pad,
      wy: lotY + 0.05,
      wz: bounds.centerZ,
      text: `Lahan ${bounds.landDepth} m`,
      kind: 'land',
    });

    // 2. Detected Rooms: W × D m (Area m²), plus Building Setbacks to Lot Edges & Room-to-Room gaps
    const rooms = detectRooms(bp);
    const roomBoxes: {
      id: number;
      area: number;
      xMin: number;
      xMax: number;
      zMin: number;
      zMax: number;
      w: number;
      d: number;
    }[] = [];

    let bXMin = Infinity;
    let bXMax = -Infinity;
    let bZMin = Infinity;
    let bZMax = -Infinity;

    for (const rm of rooms) {
      let minGx = Infinity;
      let maxGx = -Infinity;
      let minGz = Infinity;
      let maxGz = -Infinity;
      for (const tk of rm.tiles) {
        const t = bp.tiles[tk];
        if (!t) continue;
        if (t.x < minGx) minGx = t.x;
        if (t.x > maxGx) maxGx = t.x;
        if (t.z < minGz) minGz = t.z;
        if (t.z > maxGz) maxGz = t.z;
      }
      if (minGx === Infinity) continue;
      const xMin = minGx - half;
      const xMax = maxGx + 1 - half;
      const zMin = minGz - half;
      const zMax = maxGz + 1 - half;
      const w = maxGx - minGx + 1;
      const d = maxGz - minGz + 1;
      roomBoxes.push({ id: rm.id, area: rm.area, xMin, xMax, zMin, zMax, w, d });

      if (xMin < bXMin) bXMin = xMin;
      if (xMax > bXMax) bXMax = xMax;
      if (zMin < bZMin) bZMin = zMin;
      if (zMax > bZMax) bZMax = zMax;

      // Room inner width & depth indicator lines
      pushDimWithTicks('room', xMin + 0.14, zMin + 0.22, xMax - 0.14, zMin + 0.22, floorY, 0.1);
      pushDimWithTicks('room', xMin + 0.22, zMin + 0.14, xMin + 0.22, zMax - 0.14, floorY, 0.1);

      this.dimensionAnchors.push({
        id: `room_${rm.id}`,
        wx: (xMin + xMax) / 2,
        wy: floorY + 0.12,
        wz: (zMin + zMax) / 2,
        text: `R${rm.id} · ${w}×${d}m (${rm.area}m²)`,
        kind: 'room',
      });
    }

    // Building-to-Land-Edge setback distances (Jarak ke Batas Lahan)
    if (bXMin < Infinity) {
      const bMidX = (bXMin + bXMax) / 2;
      const bMidZ = (bZMin + bZMax) / 2;
      const westGap = bXMin - bounds.xMin;
      const eastGap = bounds.xMax - bXMax;
      const northGap = bZMin - bounds.zMin;
      const southGap = bounds.zMax - bZMax;

      if (westGap >= 0.4) {
        pushDimWithTicks('gap', bounds.xMin, bMidZ, bXMin, bMidZ, lotY + 0.02, 0.18);
        this.dimensionAnchors.push({
          id: 'gap_west',
          wx: (bounds.xMin + bXMin) / 2,
          wy: lotY + 0.06,
          wz: bMidZ,
          text: `↔ ${westGap.toFixed(1)}m`,
          kind: 'gap',
        });
      }
      if (eastGap >= 0.4) {
        pushDimWithTicks('gap', bXMax, bMidZ, bounds.xMax, bMidZ, lotY + 0.02, 0.18);
        this.dimensionAnchors.push({
          id: 'gap_east',
          wx: (bXMax + bounds.xMax) / 2,
          wy: lotY + 0.06,
          wz: bMidZ,
          text: `↔ ${eastGap.toFixed(1)}m`,
          kind: 'gap',
        });
      }
      if (northGap >= 0.4) {
        pushDimWithTicks('gap', bMidX, bounds.zMin, bMidX, bZMin, lotY + 0.02, 0.18);
        this.dimensionAnchors.push({
          id: 'gap_north',
          wx: bMidX,
          wy: lotY + 0.06,
          wz: (bounds.zMin + bZMin) / 2,
          text: `↕ ${northGap.toFixed(1)}m`,
          kind: 'gap',
        });
      }
      if (southGap >= 0.4) {
        pushDimWithTicks('gap', bMidX, bZMax, bMidX, bounds.zMax, lotY + 0.02, 0.18);
        this.dimensionAnchors.push({
          id: 'gap_south',
          wx: bMidX,
          wy: lotY + 0.06,
          wz: (bZMax + bounds.zMax) / 2,
          text: `↕ ${southGap.toFixed(1)}m`,
          kind: 'gap',
        });
      }
    }

    // Room-to-Room gap clearances (when separate rooms have space between them)
    let roomGapCount = 0;
    for (let i = 0; i < roomBoxes.length && roomGapCount < 6; i++) {
      for (let j = i + 1; j < roomBoxes.length && roomGapCount < 6; j++) {
        const a = roomBoxes[i];
        const b = roomBoxes[j];
        const zOverlapLo = Math.max(a.zMin, b.zMin);
        const zOverlapHi = Math.min(a.zMax, b.zMax);
        if (zOverlapHi - zOverlapLo >= 0.5) {
          const gapX = Math.max(b.xMin - a.xMax, a.xMin - b.xMax);
          if (gapX >= 0.5) {
            const x1 = a.xMax <= b.xMin ? a.xMax : b.xMax;
            const x2 = a.xMax <= b.xMin ? b.xMin : a.xMin;
            const zMid = (zOverlapLo + zOverlapHi) / 2;
            pushDimWithTicks('gap', x1, zMid, x2, zMid, lotY + 0.03, 0.16);
            this.dimensionAnchors.push({
              id: `rgap_${a.id}_${b.id}_x`,
              wx: (x1 + x2) / 2,
              wy: lotY + 0.08,
              wz: zMid,
              text: `↔ ${gapX.toFixed(1)}m`,
              kind: 'gap',
            });
            roomGapCount++;
            continue;
          }
        }
        const xOverlapLo = Math.max(a.xMin, b.xMin);
        const xOverlapHi = Math.min(a.xMax, b.xMax);
        if (xOverlapHi - xOverlapLo >= 0.5) {
          const gapZ = Math.max(b.zMin - a.zMax, a.zMin - b.zMax);
          if (gapZ >= 0.5) {
            const z1 = a.zMax <= b.zMin ? a.zMax : b.zMax;
            const z2 = a.zMax <= b.zMin ? b.zMin : a.zMin;
            const xMid = (xOverlapLo + xOverlapHi) / 2;
            pushDimWithTicks('gap', xMid, z1, xMid, z2, lotY + 0.03, 0.16);
            this.dimensionAnchors.push({
              id: `rgap_${a.id}_${b.id}_z`,
              wx: xMid,
              wy: lotY + 0.08,
              wz: (z1 + z2) / 2,
              text: `↕ ${gapZ.toFixed(1)}m`,
              kind: 'gap',
            });
            roomGapCount++;
          }
        }
      }
    }

    // 3. Custom Walls: length × height labels + parallel Wall-to-Wall spacing (Jarak Antar Tembok)
    const customWalls = bp.customWalls || [];
    const wallMeta: {
      id: string;
      x1: number;
      z1: number;
      x2: number;
      z2: number;
      len: number;
      ux: number;
      uz: number;
      nx: number;
      nz: number;
      h: number;
    }[] = [];

    for (const cw of customWalls) {
      const dx = cw.x2 - cw.x1;
      const dz = cw.z2 - cw.z1;
      const len = Math.hypot(dx, dz);
      if (len < 0.2) continue;
      const ux = dx / len;
      const uz = dz / len;
      const nx = -uz;
      const nz = ux;
      const h = cw.height || getEffectiveSite(bp).wallHeight || WALL_HEIGHT;
      wallMeta.push({ id: cw.id, x1: cw.x1, z1: cw.z1, x2: cw.x2, z2: cw.z2, len, ux, uz, nx, nz, h });

      const off = (cw.thickness ?? WALL_THICKNESS) / 2 + 0.22;
      const wy = this.wallViewMode === 'low' ? 0.5 : Math.min(h, 2.8) + 0.14;
      pushDimWithTicks(
        'wall',
        cw.x1 + nx * off,
        cw.z1 + nz * off,
        cw.x2 + nx * off,
        cw.z2 + nz * off,
        lotY + 0.04,
        0.12,
      );

      const isSel = this.toolState?.selectedCustomWallId === cw.id;
      this.dimensionAnchors.push({
        id: `cw_${cw.id}`,
        wx: (cw.x1 + cw.x2) / 2,
        wy,
        wz: (cw.z1 + cw.z2) / 2,
        text: isSel ? `${len.toFixed(2)}m × H ${h.toFixed(2)}m` : `${len.toFixed(2)}m`,
        kind: 'wall',
      });

      // Selected wall: show setback distances to parallel lot boundaries
      if (isSel) {
        const mx = (cw.x1 + cw.x2) / 2;
        const mz = (cw.z1 + cw.z2) / 2;
        if (Math.abs(ux) >= Math.abs(uz)) {
          const dNorth = mz - bounds.zMin;
          const dSouth = bounds.zMax - mz;
          if (dNorth >= 0.35) {
            pushDimWithTicks('gap', mx, bounds.zMin, mx, mz, lotY + 0.05, 0.15);
            this.dimensionAnchors.push({
              id: `selw_n`,
              wx: mx,
              wy: lotY + 0.1,
              wz: (bounds.zMin + mz) / 2,
              text: `↕ ${dNorth.toFixed(2)}m`,
              kind: 'gap',
            });
          }
          if (dSouth >= 0.35) {
            pushDimWithTicks('gap', mx, mz, mx, bounds.zMax, lotY + 0.05, 0.15);
            this.dimensionAnchors.push({
              id: `selw_s`,
              wx: mx,
              wy: lotY + 0.1,
              wz: (mz + bounds.zMax) / 2,
              text: `↕ ${dSouth.toFixed(2)}m`,
              kind: 'gap',
            });
          }
        } else {
          const dWest = mx - bounds.xMin;
          const dEast = bounds.xMax - mx;
          if (dWest >= 0.35) {
            pushDimWithTicks('gap', bounds.xMin, mz, mx, mz, lotY + 0.05, 0.15);
            this.dimensionAnchors.push({
              id: `selw_w`,
              wx: (bounds.xMin + mx) / 2,
              wy: lotY + 0.1,
              wz: mz,
              text: `↔ ${dWest.toFixed(2)}m`,
              kind: 'gap',
            });
          }
          if (dEast >= 0.35) {
            pushDimWithTicks('gap', mx, mz, bounds.xMax, mz, lotY + 0.05, 0.15);
            this.dimensionAnchors.push({
              id: `selw_e`,
              wx: (mx + bounds.xMax) / 2,
              wy: lotY + 0.1,
              wz: mz,
              text: `↔ ${dEast.toFixed(2)}m`,
              kind: 'gap',
            });
          }
        }
      }
    }

    // Parallel custom Wall-to-Wall spacing measurements (nearest neighbor on +n side)
    const seenWallGapPairs = new Set<string>();
    for (let i = 0; i < wallMeta.length; i++) {
      const a = wallMeta[i];
      let bestPos: { j: number; dist: number; ax: number; az: number; bx: number; bz: number } | null = null;
      for (let j = 0; j < wallMeta.length; j++) {
        if (i === j) continue;
        const b = wallMeta[j];
        const dot = Math.abs(a.ux * b.ux + a.uz * b.uz);
        if (dot < 0.96) continue; // Only measure spacing between parallel walls

        // Project b's endpoints onto a's local frame (u along a, n perpendicular to a)
        const b1u = (b.x1 - a.x1) * a.ux + (b.z1 - a.z1) * a.uz;
        const b2u = (b.x2 - a.x1) * a.ux + (b.z2 - a.z1) * a.uz;
        const ovLo = Math.max(0, Math.min(b1u, b2u));
        const ovHi = Math.min(a.len, Math.max(b1u, b2u));
        if (ovHi - ovLo < 0.25) continue;

        const signedN = ((b.x1 + b.x2) / 2 - a.x1) * a.nx + ((b.z1 + b.z2) / 2 - a.z1) * a.nz;
        if (signedN <= 0.25 || signedN > 28) continue;

        if (!bestPos || signedN < bestPos.dist) {
          const midU = (ovLo + ovHi) / 2;
          const ax = a.x1 + a.ux * midU;
          const az = a.z1 + a.uz * midU;
          const bx = ax + a.nx * signedN;
          const bz = az + a.nz * signedN;
          bestPos = { j, dist: signedN, ax, az, bx, bz };
        }
      }
      if (bestPos) {
        const pairKey = [Math.min(i, bestPos.j), Math.max(i, bestPos.j)].join(':');
        if (!seenWallGapPairs.has(pairKey)) {
          seenWallGapPairs.add(pairKey);
          pushDimWithTicks('gap', bestPos.ax, bestPos.az, bestPos.bx, bestPos.bz, lotY + 0.06, 0.16);
          this.dimensionAnchors.push({
            id: `wgap_${pairKey}`,
            wx: (bestPos.ax + bestPos.bx) / 2,
            wy: lotY + 0.12,
            wz: (bestPos.az + bestPos.bz) / 2,
            text: `↔ ${bestPos.dist.toFixed(2)}m`,
            kind: 'gap',
          });
        }
      }
    }

    // 4. Selected Furniture Item W × D × H & edge spacing
    if (this.toolState?.selectedPlacedUid) {
      const item = bp.furniture.find((f) => f.uid === this.toolState!.selectedPlacedUid);
      if (item) {
        const def = getFurnitureDef(item.defId, this.customDefs);
        if (def) {
          const tr = resolveFurnitureTransform(item, def, bp.gridSize);
          const sw = def.width * tr.scale;
          const sd = def.depth * tr.scale;
          const sh = def.height * tr.scale;
          this.dimensionAnchors.push({
            id: `item_${item.uid}`,
            wx: tr.wx,
            wy: tr.wy + sh + 0.22,
            wz: tr.wz,
            text: `${sw.toFixed(2)}×${sd.toFixed(2)}×${sh.toFixed(2)}m`,
            kind: 'item',
          });
        }
      }
    }

    // Commit batched 3D LineSegments per color category
    const bucketColors: Record<'land' | 'room' | 'wall' | 'gap', number> = {
      land: 0x6b5644,
      room: 0xb86b35,
      wall: 0x9c5422,
      gap: 0x2f855a,
    };

    for (const [k, coords] of Object.entries(lineBuckets) as [
      'land' | 'room' | 'wall' | 'gap',
      number[],
    ][]) {
      if (coords.length === 0) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
      const mat = new THREE.LineBasicMaterial({
        color: bucketColors[k],
        transparent: true,
        opacity: k === 'gap' ? 0.9 : 0.78,
        depthWrite: false,
      });
      const lines = new THREE.LineSegments(geo, mat);
      lines.renderOrder = 5;
      this.dimensionsGroup.add(lines);
    }

    this.emitProjectedDimensions(true);
  }

  private emitProjectedDimensions(force = false): void {
    if (!this.callbacks.onDimensionLabels) return;
    if (!this.showDimensions || this.isTitleShowcase || this.walkMode || this.dimensionAnchors.length === 0) {
      if (force) this.callbacks.onDimensionLabels([]);
      return;
    }

    const rect = this.renderer.domElement.getBoundingClientRect();
    const camSig = `${this.camera.position.x.toFixed(2)},${this.camera.position.y.toFixed(2)},${this.camera.position.z.toFixed(2)},${this.camera.quaternion.x.toFixed(3)},${this.camera.quaternion.y.toFixed(3)},${this.camera.quaternion.z.toFixed(3)},${Math.round(rect.width)}x${Math.round(rect.height)}`;
    if (!force && camSig === this.lastDimCamSig) return;
    this.lastDimCamSig = camSig;

    const out: DimensionLabelScreen[] = [];
    for (const a of this.dimensionAnchors) {
      _vec3A.set(a.wx, a.wy + this.activeFloorY, a.wz).project(this.camera);
      if (_vec3A.z < -1 || _vec3A.z > 1) continue;
      const sx = Math.round(((_vec3A.x + 1) / 2) * rect.width);
      const sy = Math.round(((-_vec3A.y + 1) / 2) * rect.height);
      if (sx < 16 || sx > rect.width - 16 || sy < 56 || sy > rect.height - 24) continue;
      out.push({ id: a.id, x: sx, y: sy, text: a.text, kind: a.kind });
    }
    this.callbacks.onDimensionLabels(out);
  }

  private rebuildRoomLabelAnchors(): void {
    this.roomLabelAnchors = [];
    if (!this.blueprint) {
      this.callbacks.onRoomLabels?.([]);
      return;
    }
    const bp = this.blueprint;
    const half = bp.gridSize / 2;
    const rooms = detectRooms(bp);
    for (const room of rooms) {
      if (room.tiles.length === 0) continue;
      let sumX = 0;
      let sumZ = 0;
      for (const tk of room.tiles) {
        const [xs, zs] = tk.split(',');
        sumX += Number(xs) - half + 0.5;
        sumZ += Number(zs) - half + 0.5;
      }
      const cx = sumX / room.tiles.length;
      const cz = sumZ / room.tiles.length;
      const customName = getRoomCustomName(bp, room);
      const defaultZone = ROOM_ZONES.find((z) => z.id === room.zone)?.name || 'Ruangan';
      this.roomLabelAnchors.push({
        id: `room_lbl_${room.id}`,
        roomId: room.id,
        wx: cx,
        wy: 0.18,
        wz: cz,
        name: customName || defaultZone,
        area: room.area,
        isCustomName: Boolean(customName),
      });
    }
    this.emitProjectedRoomLabels(true);
  }

  private emitProjectedRoomLabels(force = false): void {
    if (!this.callbacks.onRoomLabels) return;
    if (
      !this.showRoomLabels ||
      this.isTitleShowcase ||
      this.walkMode ||
      this.roomLabelAnchors.length === 0
    ) {
      if (force) this.callbacks.onRoomLabels([]);
      return;
    }

    const rect = this.renderer.domElement.getBoundingClientRect();
    const camSig = `${this.camera.position.x.toFixed(2)},${this.camera.position.y.toFixed(2)},${this.camera.position.z.toFixed(2)},${this.camera.quaternion.x.toFixed(3)},${this.camera.quaternion.y.toFixed(3)},${this.camera.quaternion.z.toFixed(3)},${Math.round(rect.width)}x${Math.round(rect.height)},${this.activeFloorY.toFixed(2)}`;
    if (!force && camSig === this.lastRoomLabelCamSig) return;
    this.lastRoomLabelCamSig = camSig;

    const out: RoomLabelScreen[] = [];
    for (const a of this.roomLabelAnchors) {
      _vec3A.set(a.wx, a.wy + this.activeFloorY, a.wz).project(this.camera);
      if (_vec3A.z < -1 || _vec3A.z > 1) continue;
      const sx = Math.round(((_vec3A.x + 1) / 2) * rect.width);
      const sy = Math.round(((-_vec3A.y + 1) / 2) * rect.height);
      if (sx < 24 || sx > rect.width - 24 || sy < 62 || sy > rect.height - 28) continue;
      out.push({
        id: a.id,
        roomId: a.roomId,
        x: sx,
        y: sy,
        name: a.name,
        area: a.area,
        isCustomName: a.isCustomName,
      });
    }
    this.callbacks.onRoomLabels(out);
  }

  private emitWallDrawStatus(
    active: boolean,
    hovering: boolean,
    lengthM: number,
    angleDeg: number,
    cursorLotX: number,
    cursorLotZ: number,
    snappedCorner: boolean,
    labelScreenX: number,
    labelScreenY: number,
  ): void {
    this.callbacks.onWallDrawStatus?.({
      active,
      hovering,
      lengthM,
      angleDeg,
      cursorLotX,
      cursorLotZ,
      snappedCorner,
      labelScreenX,
      labelScreenY,
    });
  }

  /**
   * Snaps a world point for freeform wall drawing strictly inside the Land Plot bounds,
   * with optional 90° ortho lock, corner/endpoint/tile-vertex snapping, and configurable meter step.
   */
  private snapWallPoint(
    wx: number,
    wz: number,
    startPt: { x: number; z: number } | null = this.wallDrawStart,
  ): { x: number; z: number; snappedCorner: boolean } {
    const bp = this.blueprint;
    const bounds = bp ? getSiteBounds(bp) : null;
    const minX = bounds ? bounds.xMin : -GRID_SIZE / 2;
    const maxX = bounds ? bounds.xMax : GRID_SIZE / 2;
    const minZ = bounds ? bounds.zMin : -GRID_SIZE / 2;
    const maxZ = bounds ? bounds.zMax : GRID_SIZE / 2;

    let tx = THREE.MathUtils.clamp(wx, minX, maxX);
    let tz = THREE.MathUtils.clamp(wz, minZ, maxZ);

    const orthoActive = Boolean(startPt && this.wallDrawOptions.orthoLock && !this.isAltHeld);
    let orthoAxis: 'x' | 'z' | null = null;
    if (orthoActive && startPt) {
      if (Math.abs(tx - startPt.x) >= Math.abs(tz - startPt.z)) {
        tz = startPt.z;
        orthoAxis = 'x';
      } else {
        tx = startPt.x;
        orthoAxis = 'z';
      }
    }

    // Collect architectural snap targets: custom wall endpoints + land plot corners
    const snapTargets: [number, number][] = [
      [minX, minZ],
      [maxX, minZ],
      [minX, maxZ],
      [maxX, maxZ],
    ];
    if (bp?.customWalls) {
      for (const cw of bp.customWalls) {
        snapTargets.push([cw.x1, cw.z1], [cw.x2, cw.z2]);
      }
    }

    let bestDist = 0.48;
    let bestPt: { x: number; z: number } | null = null;
    for (const [ex, ez] of snapTargets) {
      if (orthoAxis === 'x' && startPt) {
        if (Math.abs(ez - startPt.z) < 0.08 && Math.abs(tx - ex) < bestDist) {
          bestDist = Math.abs(tx - ex);
          bestPt = { x: ex, z: startPt.z };
        }
      } else if (orthoAxis === 'z' && startPt) {
        if (Math.abs(ex - startPt.x) < 0.08 && Math.abs(tz - ez) < bestDist) {
          bestDist = Math.abs(tz - ez);
          bestPt = { x: startPt.x, z: ez };
        }
      } else {
        const d = Math.hypot(tx - ex, tz - ez);
        if (d < bestDist) {
          bestDist = d;
          bestPt = { x: ex, z: ez };
        }
      }
    }
    if (bestPt) {
      return { x: bestPt.x, z: bestPt.z, snappedCorner: true };
    }

    // Snap relative to land plot origin (minX, minZ) so odd widths like 11m hit clean meter ticks
    const step = this.wallDrawOptions.snapStepM;
    const snapAxis = (val: number, origin: number, lo: number, hi: number) => {
      const snapped = origin + Math.round((val - origin) / step) * step;
      return Number(THREE.MathUtils.clamp(snapped, lo, hi).toFixed(3));
    };

    const sx = orthoAxis === 'z' && startPt ? startPt.x : snapAxis(tx, minX, minX, maxX);
    const sz = orthoAxis === 'x' && startPt ? startPt.z : snapAxis(tz, minZ, minZ, maxZ);
    return { x: sx, z: sz, snappedCorner: false };
  }

  private updateGhostPreview(): void {
    const tool = this.toolState;
    const bp = this.blueprint;
    if (!tool || !bp || this.isTitleShowcase) {
      this.hidePreviews();
      return;
    }

    const placingDefId = tool.movingPlacedUid
      ? bp.furniture.find((f) => f.uid === tool.movingPlacedUid)?.defId || null
      : tool.tab === 'furniture'
        ? tool.selectedFurnitureDefId
        : null;

    // 1. Furniture placement / moving ghost (with free placement & tabletop stacking!)
    if (placingDefId) {
      this.tileHoverMesh.visible = false;
      this.edgeHoverMesh.visible = false;
      this.wallDrawDot.visible = false;
      this.wallDrawPreview.visible = false;

      const def = getFurnitureDef(placingDefId, this.customDefs);
      if (!def) return;

      const target = this.computeFurniturePlacementTarget(def, tool.movingPlacedUid);
      if (!target) {
        if (this.ghostModel) this.ghostModel.visible = false;
        this.ghostOutline.visible = false;
        return;
      }

      if (this.ghostDefId !== placingDefId) {
        if (this.ghostModel) {
          this.previewGroup.remove(this.ghostModel);
          this.disposeObject(this.ghostModel);
        }
        this.ghostModel = buildFurnitureModel(
          placingDefId,
          def.defaultColor,
          this.textures,
          this.isSoftwareGl,
          this.customDefs,
        );
        this.ghostModel.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.castShadow = false;
            obj.receiveShadow = false;
            if (Array.isArray(obj.material)) {
              obj.material = obj.material.map((m) => {
                const c = m.clone();
                c.transparent = true;
                c.opacity = 0.56;
                return c;
              });
            } else if (obj.material) {
              const cloned = (obj.material as THREE.Material).clone();
              cloned.transparent = true;
              cloned.opacity = 0.56;
              obj.material = cloned;
            }
          }
        });
        this.previewGroup.add(this.ghostModel);
        this.ghostDefId = placingDefId;
      }

      const valid = canPlaceFurniture(
        bp,
        placingDefId,
        target.gx,
        target.gz,
        target.rotation,
        tool.movingPlacedUid || undefined,
        this.customDefs,
        target.isFree ? 'free' : 'snap',
        { wx: target.wx, wy: target.wy, wz: target.wz },
      );

      const halfGrid = bp.gridSize / 2;
      const cellKey = `${Math.floor(target.wx + halfGrid)},${Math.floor(target.wz + halfGrid)}`;
      const previewGroundOffset =
        !def.wallMount && !def.ceilingMount && !bp.tiles[cellKey] && target.wy <= 0.01
          ? -getEffectiveSite(bp).foundationHeight
          : 0;
      const previewY = target.wy + previewGroundOffset;

      if (this.ghostModel) {
        this.ghostModel.visible = true;
        this.ghostModel.position.set(target.wx, previewY + 0.015, target.wz);
        this.ghostModel.rotation.y = target.rotY;
      }
      this.ghostOutline.visible = true;
      this.ghostOutline.scale.set(
        Math.max(0.32, def.width * 0.98),
        1,
        Math.max(0.32, def.depth * 0.98),
      );
      this.ghostOutline.rotation.y = target.rotY;
      this.ghostOutline.position.set(
        target.wx,
        previewY + (def.wallMount ? 1.54 : 0.04),
        target.wz,
      );
      (this.ghostOutline.material as THREE.LineBasicMaterial).color.setHex(
        valid ? (target.wy > 0.05 ? 0x60a5fa : 0x34d399) : 0xf87171,
      );
      return;
    }

    if (this.ghostModel) this.ghostModel.visible = false;
    this.ghostOutline.visible = false;

    // 1b. Click-to-Move Custom Wall live ghost
    if (tool.movingCustomWallId && bp.customWalls && !this.walkMode && !this.placingPerson) {
      const cw = bp.customWalls.find((w) => w.id === tool.movingCustomWallId);
      if (cw && this.hoveredWorldPt) {
        this.tileHoverMesh.visible = false;
        this.edgeHoverMesh.visible = false;
        this.wallDrawDot.visible = false;
        this.wallDrawStartPin.visible = false;
        this.wallDrawGuides.visible = false;
        const dx = cw.x2 - cw.x1;
        const dz = cw.z2 - cw.z1;
        const len = Math.max(0.25, Math.hypot(dx, dz));
        const snapped = this.snapWallPoint(this.hoveredWorldPt.x, this.hoveredWorldPt.z, null);
        const previewH = this.wallViewMode === 'low' ? 0.46 : cw.height || WALL_HEIGHT;
        const thickScale = (cw.thickness ?? WALL_THICKNESS) / WALL_THICKNESS;
        this.wallDrawPreviewBody.scale.set(1, previewH / WALL_HEIGHT, thickScale);
        this.wallDrawPreviewBody.position.y = previewH / 2;
        this.wallDrawPreviewCap.scale.set(1, 1, thickScale);
        this.wallDrawPreviewCap.position.y = previewH + 0.03;
        this.wallDrawPreview.visible = true;
        this.wallDrawPreview.scale.set(len, 1, 1);
        this.wallDrawPreview.position.set(snapped.x, 0, snapped.z);
        this.wallDrawPreview.rotation.y = -Math.atan2(dz, dx);
        return;
      }
      this.wallDrawPreview.visible = false;
      return;
    }

    // 1c. Click-to-Move Room / Building target tile highlight
    if (tool.movingRoomScope && this.hoveredTile && !this.walkMode && !this.placingPerson) {
      const half = bp.gridSize / 2;
      this.edgeHoverMesh.visible = false;
      this.wallDrawDot.visible = false;
      this.wallDrawStartPin.visible = false;
      this.wallDrawGuides.visible = false;
      this.wallDrawPreview.visible = false;
      this.tileHoverMesh.visible = true;
      this.tileHoverMesh.position.set(
        this.hoveredTile.gx - half + 0.5,
        0.04,
        this.hoveredTile.gz - half + 0.5,
      );
      (this.tileHoverMesh.material as THREE.MeshBasicMaterial).color.setHex(0x34d399);
      return;
    }

    // 2. Freeform Wall Draw preview (with architectural guides, start pin & live projected meter label)
    if (tool.tab === 'layout' && tool.layoutSubTool === 'wall_draw' && !this.walkMode && !this.placingPerson) {
      this.tileHoverMesh.visible = false;
      this.edgeHoverMesh.visible = false;
      const bounds = getSiteBounds(bp);
      const camDist = this.camera.position.distanceTo(this.controls.target);
      const markerScale = THREE.MathUtils.clamp(camDist / 18, 0.85, 2.4);

      if (this.wallDrawStart) {
        this.wallDrawStartPin.visible = true;
        this.wallDrawStartPin.position.set(this.wallDrawStart.x, 0, this.wallDrawStart.z);
        this.wallDrawStartPin.scale.setScalar(markerScale);
      } else {
        this.wallDrawStartPin.visible = false;
      }

      if (this.hoveredWorldPt) {
        const snapped = this.snapWallPoint(this.hoveredWorldPt.x, this.hoveredWorldPt.z);
        this.wallDrawLastEnd = { x: snapped.x, z: snapped.z };
        this.wallDrawDot.visible = true;
        this.wallDrawDot.position.set(snapped.x, 0, snapped.z);
        this.wallDrawDot.scale.setScalar(markerScale);
        this.wallDrawDotRingMat.color.setHex(snapped.snappedCorner ? 0x2f9e66 : 0xd9772b);

        // Full-lot crosshair alignment guide lines through snapped point
        const posAttr = this.wallDrawGuides.geometry.getAttribute('position') as THREE.BufferAttribute;
        const gy = 0.025;
        posAttr.setXYZ(0, bounds.xMin, gy, snapped.z);
        posAttr.setXYZ(1, bounds.xMax, gy, snapped.z);
        posAttr.setXYZ(2, snapped.x, gy, bounds.zMin);
        posAttr.setXYZ(3, snapped.x, gy, bounds.zMax);
        posAttr.needsUpdate = true;
        this.wallDrawGuides.visible = true;

        const lotX = Number((snapped.x - bounds.xMin).toFixed(2));
        const lotZ = Number((snapped.z - bounds.zMin).toFixed(2));

        if (this.wallDrawStart) {
          const dx = snapped.x - this.wallDrawStart.x;
          const dz = snapped.z - this.wallDrawStart.z;
          const len = Math.hypot(dx, dz);
          if (len > 0.15) {
            const previewH = this.wallViewMode === 'low' ? 0.46 : WALL_HEIGHT;
            this.wallDrawPreviewBody.scale.set(1, previewH / WALL_HEIGHT, 1);
            this.wallDrawPreviewBody.position.y = previewH / 2;
            this.wallDrawPreviewCap.position.y = previewH + 0.03;
            this.wallDrawPreview.visible = true;
            this.wallDrawPreview.scale.set(len, 1, 1);
            const midX = (this.wallDrawStart.x + snapped.x) / 2;
            const midZ = (this.wallDrawStart.z + snapped.z) / 2;
            this.wallDrawPreview.position.set(midX, 0, midZ);
            this.wallDrawPreview.rotation.y = -Math.atan2(dz, dx);
            const deg = Math.round(((Math.atan2(dz, dx) * 180) / Math.PI + 360) % 360);
            const scr = this.projectWorldToScreen(midX, previewH + 0.35, midZ);
            this.emitWallDrawStatus(
              true,
              true,
              Number(len.toFixed(2)),
              deg,
              lotX,
              lotZ,
              snapped.snappedCorner,
              scr.x,
              scr.y,
            );
          } else {
            this.wallDrawPreview.visible = false;
            const scr = this.projectWorldToScreen(snapped.x, 0.5, snapped.z);
            this.emitWallDrawStatus(true, true, 0, 0, lotX, lotZ, snapped.snappedCorner, scr.x, scr.y);
          }
        } else {
          this.wallDrawPreview.visible = false;
          const scr = this.projectWorldToScreen(snapped.x, 0.45, snapped.z);
          this.emitWallDrawStatus(false, true, 0, 0, lotX, lotZ, snapped.snappedCorner, scr.x, scr.y);
        }
      } else {
        this.wallDrawDot.visible = false;
        this.wallDrawGuides.visible = false;
        this.wallDrawPreview.visible = false;
      }
      return;
    }
    this.wallDrawDot.visible = false;
    this.wallDrawStartPin.visible = false;
    this.wallDrawGuides.visible = false;
    this.wallDrawPreview.visible = false;

    // 3. Wall / Opening / Accent Wall Paint / Erase Wall preview
    const isEdgeTool =
      (tool.tab === 'layout' &&
        (tool.layoutSubTool === 'wall_toggle' ||
          tool.layoutSubTool === 'wall_erase' ||
          tool.layoutSubTool.startsWith('opening_'))) ||
      (tool.tab === 'surfaces' && tool.surfaceTarget === 'wall');

    if (isEdgeTool) {
      this.tileHoverMesh.visible = false;

      // Highlight hovered custom freeform wall if aiming at one
      if (this.hoveredCustomWallId && bp.customWalls) {
        const cw = bp.customWalls.find((w) => w.id === this.hoveredCustomWallId);
        if (cw) {
          const dx = cw.x2 - cw.x1;
          const dz = cw.z2 - cw.z1;
          const len = Math.hypot(dx, dz);
          this.edgeHoverMesh.visible = true;
          this.edgeHoverMesh.scale.set(len, 1, 1);
          this.edgeHoverMesh.position.set((cw.x1 + cw.x2) / 2, 1.32, (cw.z1 + cw.z2) / 2);
          this.edgeHoverMesh.rotation.y = -Math.atan2(dz, dx);
          (this.edgeHoverMesh.material as THREE.MeshBasicMaterial).color.setHex(
            tool.layoutSubTool === 'wall_erase' ? 0xf87171 : 0xd99b4e,
          );
          return;
        }
      }

      if (this.hoveredEdge) {
        const half = bp.gridSize / 2;
        this.edgeHoverMesh.visible = true;
        this.edgeHoverMesh.scale.set(1, 1, 1);
        (this.edgeHoverMesh.material as THREE.MeshBasicMaterial).color.setHex(
          tool.layoutSubTool === 'wall_erase' ? 0xf87171 : 0xd99b4e,
        );
        if (this.hoveredEdge.axis === 'h') {
          this.edgeHoverMesh.position.set(
            this.hoveredEdge.ex - half + 0.5,
            tool.tab === 'surfaces' ? 1.32 : 0.45,
            this.hoveredEdge.ez - half,
          );
          this.edgeHoverMesh.rotation.y = 0;
        } else {
          this.edgeHoverMesh.position.set(
            this.hoveredEdge.ex - half,
            tool.tab === 'surfaces' ? 1.32 : 0.45,
            this.hoveredEdge.ez - half + 0.5,
          );
          this.edgeHoverMesh.rotation.y = Math.PI / 2;
        }
        return;
      }
    }
    this.edgeHoverMesh.visible = false;

    // 4. Floor tile / floor surface paint preview
    const isTileTool =
      (tool.tab === 'layout' &&
        (tool.layoutSubTool === 'floor_add' ||
          tool.layoutSubTool === 'floor_remove' ||
          tool.layoutSubTool === 'zone_paint')) ||
      (tool.tab === 'surfaces' && tool.surfaceTarget === 'floor');

    if (isTileTool && this.hoveredTile) {
      const half = bp.gridSize / 2;
      this.tileHoverMesh.visible = true;
      this.tileHoverMesh.position.set(
        this.hoveredTile.gx - half + 0.5,
        0.035,
        this.hoveredTile.gz - half + 0.5,
      );
      const color =
        tool.tab === 'layout' && tool.layoutSubTool === 'floor_remove' ? 0xf87171 : 0xd99b4e;
      (this.tileHoverMesh.material as THREE.MeshBasicMaterial).color.setHex(color);
      return;
    }

    this.tileHoverMesh.visible = false;
  }

  private hidePreviews(): void {
    this.tileHoverMesh.visible = false;
    this.edgeHoverMesh.visible = false;
    this.ghostOutline.visible = false;
    this.wallDrawDot.visible = false;
    this.wallDrawStartPin.visible = false;
    this.wallDrawGuides.visible = false;
    this.wallDrawPreview.visible = false;
    if (this.ghostModel) this.ghostModel.visible = false;
  }

  private spawnPlacementBurst(wx: number, wy: number, wz: number): void {
    let spawned = 0;
    for (let i = 0; i < this.particles.length && spawned < 12; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        const ang = (spawned / 12) * Math.PI * 2 + Math.random() * 0.4;
        const spd = 0.9 + Math.random() * 1.1;
        p.pos.set(wx + Math.cos(ang) * 0.15, wy, wz + Math.sin(ang) * 0.15);
        p.vel.set(Math.cos(ang) * spd, 1.2 + Math.random() * 1.1, Math.sin(ang) * spd);
        p.life = 0;
        p.maxLife = 0.42 + Math.random() * 0.2;
        spawned++;
      }
    }
  }

  private updatePointerNDC(ev: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNDC.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNDC.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private computeGridHit(): {
    tile: { gx: number; gz: number } | null;
    edge: { axis: 'h' | 'v'; ex: number; ez: number } | null;
    worldPt: { x: number; z: number } | null;
    customWallId: string | null;
  } {
    if (!this.blueprint) {
      return { tile: null, edge: null, worldPt: null, customWallId: null };
    }
    this.raycaster.setFromCamera(this.pointerNDC, this.camera);

    let customWallId: string | null = null;
    if (this.customWallHitBoxes.length > 0) {
      const cwHits = this.raycaster.intersectObjects(this.customWallHitBoxes, false);
      if (cwHits.length > 0) {
        customWallId = (cwHits[0].object.userData.customWallId as string) || null;
      }
    }

    if (!this.raycaster.ray.intersectPlane(_groundPlane, _rayHit)) {
      return { tile: null, edge: null, worldPt: null, customWallId };
    }

    const half = this.blueprint.gridSize / 2;
    const fx = _rayHit.x + half;
    const fz = _rayHit.z + half;
    const gx = Math.floor(fx);
    const gz = Math.floor(fz);

    const tile =
      gx >= 0 && gx < this.blueprint.gridSize && gz >= 0 && gz < this.blueprint.gridSize
        ? { gx, gz }
        : null;

    const rx = Math.round(fx);
    const rz = Math.round(fz);
    const distToV = Math.abs(fx - rx);
    const distToH = Math.abs(fz - rz);
    let edge: { axis: 'h' | 'v'; ex: number; ez: number } | null = null;
    if (distToH < distToV && gx >= 0 && gx < this.blueprint.gridSize && rz >= 0 && rz <= this.blueprint.gridSize) {
      edge = { axis: 'h', ex: gx, ez: rz };
    } else if (rx >= 0 && rx <= this.blueprint.gridSize && gz >= 0 && gz < this.blueprint.gridSize) {
      edge = { axis: 'v', ex: rx, ez: gz };
    }

    return {
      tile,
      edge,
      worldPt: { x: _rayHit.x, z: _rayHit.z },
      customWallId,
    };
  }

  private onContextMenu = (ev: MouseEvent): void => {
    ev.preventDefault();
  };

  private onPointerMove = (ev: PointerEvent): void => {
    if (this.isTitleShowcase) return;
    this.isAltHeld = ev.altKey;

    if (this.walkMode) {
      if (this.isWalkLooking) {
        const dx = ev.clientX - this.lastWalkLookPos.x;
        const dy = ev.clientY - this.lastWalkLookPos.y;
        this.lastWalkLookPos = { x: ev.clientX, y: ev.clientY };
        this.personYaw -= dx * 0.0052;
        this.personPitch = THREE.MathUtils.clamp(this.personPitch - dy * 0.0042, -1.18, 1.18);
        this.updateFirstPersonCamera();
        this.emitPeopleTelemetry(false);
      }
      return;
    }

    this.updatePointerNDC(ev);

    const now = performance.now();
    if (now - this.lastHoverRaycast < 18 && !this.isDraggingPaint) return;
    this.lastHoverRaycast = now;

    const { tile, edge, worldPt, customWallId } = this.computeGridHit();
    this.hoveredTile = tile;
    this.hoveredEdge = edge;
    this.hoveredWorldPt = worldPt;
    this.hoveredCustomWallId = customWallId;
    this.updateGhostPreview();

    if (this.isDraggingPaint && tile) {
      const key = `${tile.gx},${tile.gz}`;
      if (key !== this.lastPaintedKey) {
        this.lastPaintedKey = key;
        this.callbacks.onTileInteract(tile.gx, tile.gz, true);
      }
    }
  };

  private onPointerDown = (ev: PointerEvent): void => {
    if (this.isTitleShowcase) return;
    this.isAltHeld = ev.altKey;

    if (this.walkMode) {
      if (ev.button === 0 || ev.button === 2) {
        this.isWalkLooking = true;
        this.lastWalkLookPos = { x: ev.clientX, y: ev.clientY };
      }
      return;
    }

    // Right-click cancels active custom wall drawing chain cleanly
    if (ev.button === 2 && this.wallDrawStart) {
      this.cancelWallDraw();
      return;
    }
    if (ev.button !== 0) return;
    this.updatePointerNDC(ev);
    this.isPointerDown = true;
    this.pointerDownPos = { x: ev.clientX, y: ev.clientY };

    const tool = this.toolState;
    const isPaintBrush =
      tool &&
      ((tool.tab === 'layout' &&
        (tool.layoutSubTool === 'floor_add' ||
          tool.layoutSubTool === 'floor_remove' ||
          tool.layoutSubTool === 'zone_paint')) ||
        (tool.tab === 'surfaces' && tool.surfaceTarget === 'floor'));

    if (isPaintBrush && (ev.shiftKey || this.planModeLocked)) {
      const { tile } = this.computeGridHit();
      if (tile) {
        this.controls.enabled = false;
        this.isDraggingPaint = true;
        this.lastPaintedKey = `${tile.gx},${tile.gz}`;
        this.callbacks.onTileInteract(tile.gx, tile.gz, true);
      }
    }
  };

  private onPointerUp = (ev: PointerEvent): void => {
    if (this.walkMode) {
      this.isWalkLooking = false;
      return;
    }

    if (this.isDraggingPaint) {
      this.isDraggingPaint = false;
      this.controls.enabled = true;
      this.lastPaintedKey = '';
    }
    if (!this.isPointerDown || this.isTitleShowcase || ev.button !== 0) return;
    this.isPointerDown = false;

    const tool = this.toolState;
    const isWallDraw = Boolean(tool && tool.tab === 'layout' && tool.layoutSubTool === 'wall_draw');
    const dragThreshold = isWallDraw || this.planModeLocked ? 14 : 6;
    const dx = ev.clientX - this.pointerDownPos.x;
    const dy = ev.clientY - this.pointerDownPos.y;
    if (Math.hypot(dx, dy) > dragThreshold) return;

    this.updatePointerNDC(ev);
    if (!tool || !this.blueprint) return;

    // 0. Place Person mode (click anywhere on lot/floor to relocate 1.70m scale person)
    if (this.placingPerson) {
      const { worldPt } = this.computeGridHit();
      if (worldPt) {
        const bounds = getSiteBounds(this.blueprint);
        const px = THREE.MathUtils.clamp(worldPt.x, bounds.xMin - 1.5, bounds.xMax + 1.5);
        const pz = THREE.MathUtils.clamp(worldPt.z, bounds.zMin - 1.5, bounds.zMax + 1.5);
        this.personPos.set(px, 0, pz);
        this.personGroundY = this.getGroundYAt(px, pz);
        this.personRig.root.position.set(px, this.personGroundY, pz);
        this.spawnPlacementBurst(px, this.personGroundY + 0.35, pz);
        this.emitPeopleTelemetry(true);
        this.callbacks.onPersonPlaced?.();
      }
      return;
    }

    // 0b. Click-to-Move Custom Wall
    if (tool.movingCustomWallId) {
      const { worldPt } = this.computeGridHit();
      if (worldPt) {
        const snapped = this.snapWallPoint(worldPt.x, worldPt.z, null);
        this.callbacks.onMoveCustomWallTo?.(tool.movingCustomWallId, snapped.x, snapped.z);
      }
      return;
    }

    // 0c. Click-to-Move Room / Building
    if (tool.movingRoomScope) {
      const { tile } = this.computeGridHit();
      if (tile) {
        this.callbacks.onMoveRoomToTile?.(tile.gx, tile.gz);
      }
      return;
    }

    // 1. Placing or moving furniture (supports free placement + tabletop stacking!)
    const placingDefId = tool.movingPlacedUid
      ? this.blueprint.furniture.find((f) => f.uid === tool.movingPlacedUid)?.defId || null
      : tool.tab === 'furniture'
        ? tool.selectedFurnitureDefId
        : null;

    if (placingDefId) {
      const def = getFurnitureDef(placingDefId, this.customDefs);
      if (def) {
        const target = this.computeFurniturePlacementTarget(def, tool.movingPlacedUid);
        if (target) {
          this.callbacks.onPlaceFurniture(target);
        }
      }
      return;
    }

    // 2. Freeform Wall Draw click-to-chain
    if (isWallDraw) {
      const { worldPt } = this.computeGridHit();
      if (!worldPt) return;
      const bounds = getSiteBounds(this.blueprint);
      const snapped = this.snapWallPoint(worldPt.x, worldPt.z);
      const lotX = Number((snapped.x - bounds.xMin).toFixed(2));
      const lotZ = Number((snapped.z - bounds.zMin).toFixed(2));
      const scr = this.projectWorldToScreen(snapped.x, 0.5, snapped.z);

      if (!this.wallDrawStart) {
        this.wallDrawStart = { x: snapped.x, z: snapped.z };
        this.wallDrawLastEnd = null;
        this.emitWallDrawStatus(true, true, 0, 0, lotX, lotZ, snapped.snappedCorner, scr.x, scr.y);
        this.updateGhostPreview();
      } else {
        const len = Math.hypot(snapped.x - this.wallDrawStart.x, snapped.z - this.wallDrawStart.z);
        if (len >= 0.25) {
          this.callbacks.onAddCustomWall(
            this.wallDrawStart.x,
            this.wallDrawStart.z,
            snapped.x,
            snapped.z,
          );
          // Chain seamlessly to build a multi-wall room from scratch in clicks
          this.wallDrawStart = { x: snapped.x, z: snapped.z };
          this.wallDrawLastEnd = null;
          this.emitWallDrawStatus(true, true, 0, 0, lotX, lotZ, snapped.snappedCorner, scr.x, scr.y);
          this.updateGhostPreview();
        } else {
          this.cancelWallDraw();
        }
      }
      return;
    }

    // 3. Layout edge tools (walls, erase wall, openings) OR Surfaces Wall Painting/Wallpaper tool
    if (
      (tool.tab === 'layout' &&
        (tool.layoutSubTool === 'wall_toggle' ||
          tool.layoutSubTool === 'wall_erase' ||
          tool.layoutSubTool.startsWith('opening_'))) ||
      (tool.tab === 'surfaces' && tool.surfaceTarget === 'wall')
    ) {
      const { edge, customWallId } = this.computeGridHit();
      if (customWallId) {
        this.callbacks.onCustomWallInteract(customWallId);
        return;
      }
      if (edge) {
        this.callbacks.onEdgeInteract(edge.axis, edge.ex, edge.ez);
      }
      return;
    }

    // 4. Floor / Zone / Floor Surface tools
    if (
      (tool.tab === 'layout' &&
        (tool.layoutSubTool === 'floor_add' ||
          tool.layoutSubTool === 'floor_remove' ||
          tool.layoutSubTool === 'zone_paint')) ||
      (tool.tab === 'surfaces' && tool.surfaceTarget === 'floor')
    ) {
      const { tile } = this.computeGridHit();
      if (tile) {
        this.callbacks.onTileInteract(tile.gx, tile.gz, false);
      }
      return;
    }

    // 4b. Surfaces -> Room Lighting mode: clicking any room selects that room directly for ambiance tuning
    if (tool.tab === 'surfaces' && tool.surfaceTarget === 'lighting') {
      const { tile } = this.computeGridHit();
      if (tile && this.blueprint.tiles[`${tile.gx},${tile.gz}`]) {
        this.callbacks.onSelectRoomAtTile?.(tile.gx, tile.gz);
      }
      return;
    }

    // 5. Select mode: check furniture first -> then placed custom walls -> then room floor tiles
    this.raycaster.setFromCamera(this.pointerNDC, this.camera);
    const hits = this.raycaster.intersectObjects(this.furnitureHitBoxes, false);
    if (hits.length > 0) {
      const uid = hits[0].object.userData.furnitureUid as string;
      this.callbacks.onSelectFurniture(uid);
      return;
    }

    if (this.customWallHitBoxes.length > 0) {
      const wallHits = this.raycaster.intersectObjects(this.customWallHitBoxes, false);
      if (wallHits.length > 0) {
        const wallId = wallHits[0].object.userData.customWallId as string;
        if (wallId) {
          this.callbacks.onSelectCustomWall?.(wallId);
          return;
        }
      }
    }

    const { tile } = this.computeGridHit();
    if (tile && this.blueprint.tiles[`${tile.gx},${tile.gz}`]) {
      this.callbacks.onSelectRoomAtTile?.(tile.gx, tile.gz);
      return;
    }

    this.callbacks.onSelectFurniture(null);
  };

  private onKeyDown = (ev: KeyboardEvent): void => {
    if (ev.key === 'Alt') {
      this.isAltHeld = true;
      this.updateGhostPreview();
    }
    // Ignore typing inside input fields
    if (
      document.activeElement instanceof HTMLInputElement ||
      document.activeElement instanceof HTMLTextAreaElement ||
      document.activeElement instanceof HTMLSelectElement
    ) {
      return;
    }
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (ev.shiftKey && ev.code === 'KeyD') return;
    this.heldKeys.add(ev.code);
  };

  private onKeyUp = (ev: KeyboardEvent): void => {
    if (ev.key === 'Alt') {
      this.isAltHeld = false;
      this.updateGhostPreview();
    }
    this.heldKeys.delete(ev.code);
  };

  private onBlur = (): void => {
    this.heldKeys.clear();
    this.isAltHeld = false;
    this.isWalkLooking = false;
    this.isDraggingPaint = false;
    if (!this.walkMode) {
      this.controls.enabled = true;
    }
  };

  private onResize = (): void => {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private onContextLost = (ev: Event): void => {
    ev.preventDefault();
    this.stopRenderLoop();
    this.callbacks.onWebGLFallback?.();
  };

  private onContextRestored = (): void => {
    this.startRenderLoop();
  };

  private startRenderLoop(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.renderer.setAnimationLoop(null);
      this.tick();
    } else {
      this.renderer.setAnimationLoop(this.tick);
    }
  }

  private stopRenderLoop(): void {
    this.renderer.setAnimationLoop(null);
    clearTimeout(this.frameId);
  }

  private bindEvents(): void {
    const dom = this.renderer.domElement;
    dom.addEventListener('contextmenu', this.onContextMenu);
    dom.addEventListener('pointermove', this.onPointerMove);
    dom.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('resize', this.onResize);
    dom.addEventListener('webglcontextlost', this.onContextLost);
    dom.addEventListener('webglcontextrestored', this.onContextRestored);
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = (): void => {
    if (this.disposed) return;

    this.timer.update();
    const rawDt = this.timer.getDelta();
    const dt = Math.min(rawDt, 0.05);
    this.elapsed += dt;

    if (this.isTitleShowcase) {
      const ang = this.elapsed * 0.16 + 0.65;
      const radius = 14.5;
      this.camera.position.set(
        Math.cos(ang) * radius,
        9.4 + Math.sin(this.elapsed * 0.25) * 0.6,
        Math.sin(ang) * radius,
      );
      this.controls.target.set(0.4, 0.9, 0.2);
      this.camera.lookAt(this.controls.target);
    } else if (this.walkMode) {
      // First-Person Human Eye-Level Walkthrough (WASD / Arrows + Drag-to-Look)
      const moveF =
        (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp') ? 1 : 0) -
        (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown') ? 1 : 0);
      const moveR =
        (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight') ? 1 : 0) -
        (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft') ? 1 : 0);
      const turnInput =
        (this.heldKeys.has('KeyQ') ? 1 : 0) - (this.heldKeys.has('KeyE') ? 1 : 0);
      if (turnInput !== 0) {
        this.personYaw += turnInput * 1.9 * dt;
      }

      const sprint = this.heldKeys.has('ShiftLeft') || this.heldKeys.has('ShiftRight');
      const walkSpeed = (sprint ? 5.8 : 3.5) * dt;
      if (moveF !== 0 || moveR !== 0) {
        const fx = -Math.sin(this.personYaw);
        const fz = -Math.cos(this.personYaw);
        const rx = Math.cos(this.personYaw);
        const rz = -Math.sin(this.personYaw);
        const len = Math.hypot(moveF, moveR) || 1;
        this.personPos.x += ((fx * moveF + rx * moveR) / len) * walkSpeed;
        this.personPos.z += ((fz * moveF + rz * moveR) / len) * walkSpeed;

        if (this.blueprint) {
          const b = getSiteBounds(this.blueprint);
          this.personPos.x = THREE.MathUtils.clamp(this.personPos.x, b.xMin - 3, b.xMax + 3);
          this.personPos.z = THREE.MathUtils.clamp(this.personPos.z, b.zMin - 3, b.zMax + 3);
        }
        this.walkPhase += dt * (sprint ? 12.5 : 8.8);
        this.emitPeopleTelemetry(false);
      } else if (turnInput !== 0) {
        this.emitPeopleTelemetry(false);
      }

      const targetGround = this.getGroundYAt(this.personPos.x, this.personPos.z);
      this.personGroundY = THREE.MathUtils.damp(this.personGroundY, targetGround, 12, dt);
      this.personRig.root.position.set(this.personPos.x, this.personGroundY, this.personPos.z);
      this.personRig.root.rotation.y = this.personYaw;
      this.updateFirstPersonCamera();
    } else {
      if (this.camPresetPos && this.camPresetTarget) {
        const alpha = 1 - Math.exp(-6.5 * dt);
        this.camera.position.lerp(this.camPresetPos, alpha);
        this.controls.target.lerp(this.camPresetTarget, alpha);
        if (
          this.camera.position.distanceTo(this.camPresetPos) < 0.05 &&
          this.controls.target.distanceTo(this.camPresetTarget) < 0.05
        ) {
          this.camera.position.copy(this.camPresetPos);
          this.controls.target.copy(this.camPresetTarget);
          this.camPresetPos = null;
          this.camPresetTarget = null;
        }
      }

      const hasSelectedObj = Boolean(
        this.toolState?.selectedPlacedUid ||
          this.toolState?.selectedCustomWallId ||
          this.toolState?.selectedRoomId !== null,
      );
      const moveZ =
        (this.heldKeys.has('KeyW') || (!hasSelectedObj && this.heldKeys.has('ArrowUp')) ? 1 : 0) -
        (this.heldKeys.has('KeyS') || (!hasSelectedObj && this.heldKeys.has('ArrowDown')) ? 1 : 0);
      const moveX =
        (this.heldKeys.has('KeyD') || (!hasSelectedObj && this.heldKeys.has('ArrowRight')) ? 1 : 0) -
        (this.heldKeys.has('KeyA') || (!hasSelectedObj && this.heldKeys.has('ArrowLeft')) ? 1 : 0);

      if (moveX !== 0 || moveZ !== 0) {
        this.camPresetPos = null;
        this.camPresetTarget = null;
        this.camera.getWorldDirection(_vec3A);
        _vec3A.y = 0;
        if (_vec3A.lengthSq() < 1e-4) {
          // Pure top-down 2D Plan view: W/S moves North(-Z)/South(+Z), A/D moves West(-X)/East(+X)
          _vec3A.set(0, 0, -1);
          _vec3B.set(1, 0, 0);
        } else {
          _vec3A.normalize();
          _vec3B.crossVectors(_vec3A, this.camera.up).normalize();
        }
        const panSpeed = (this.planModeLocked ? 14.0 : 9.0) * dt;
        _vec3C
          .set(0, 0, 0)
          .addScaledVector(_vec3A, moveZ * panSpeed)
          .addScaledVector(_vec3B, moveX * panSpeed);
        this.camera.position.add(_vec3C);
        this.controls.target.add(_vec3C);
        const panBounds = this.blueprint ? getSiteBounds(this.blueprint) : null;
        const minX = panBounds ? panBounds.xMin : -7;
        const maxX = panBounds ? panBounds.xMax : 7;
        const minZ = panBounds ? panBounds.zMin : -7;
        const maxZ = panBounds ? panBounds.zMax : 7;
        this.controls.target.x = THREE.MathUtils.clamp(this.controls.target.x, minX, maxX);
        this.controls.target.z = THREE.MathUtils.clamp(this.controls.target.z, minZ, maxZ);
      }

      // Ground & gently animate visible 1.70m scale person in 3rd-person view
      if (this.personVisible) {
        const targetGround = this.getGroundYAt(this.personPos.x, this.personPos.z);
        this.personGroundY = THREE.MathUtils.damp(this.personGroundY, targetGround, 10, dt);
        this.personRig.root.position.set(this.personPos.x, this.personGroundY, this.personPos.z);
        this.personRig.root.rotation.y = this.personYaw;
        this.personRig.body.position.y = Math.sin(this.elapsed * 2.1) * 0.012;
        this.personRig.leftArm.rotation.x = Math.sin(this.elapsed * 1.4) * 0.05;
        this.personRig.rightArm.rotation.x = -Math.sin(this.elapsed * 1.4) * 0.05;
      }

      this.controls.update();
    }

    if (this.wallViewMode === 'cutaway' && this.blueprint) {
      const quad = this.getCameraQuadrant();
      if (quad !== this.lastCutawayQuad) {
        this.rebuildWalls();
      }
    }

    // Spring bounce & rotation damping on placed furniture
    for (const entry of this.springs.values()) {
      const force = (entry.targetScale - entry.scale) * 140 - entry.scaleVel * 14;
      entry.scaleVel += force * dt;
      entry.scale += entry.scaleVel * dt;
      if (
        Math.abs(entry.targetScale - entry.scale) < 0.002 &&
        Math.abs(entry.scaleVel) < 0.01
      ) {
        entry.scale = entry.targetScale;
        entry.scaleVel = 0;
      }
      entry.group.scale.setScalar(Math.max(0.1, entry.scale));

      let diff = entry.targetRotY - entry.group.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) > 0.001) {
        entry.group.rotation.y += diff * (1 - Math.exp(-14 * dt));
      } else {
        entry.group.rotation.y = entry.targetRotY;
      }
    }

    // Gentle atmospheric sky cloud drift
    this.cloudsGroup.rotation.y = this.elapsed * 0.012;

    // Subtle animated fireplace & candle flame light flicker + warm halo breathing
    const flicker = 0.88 + Math.sin(this.elapsed * 11) * 0.08 + Math.cos(this.elapsed * 17) * 0.06;
    for (const child of this.practicalLightsGroup.children) {
      if (child instanceof THREE.PointLight && child.userData.isFireLight) {
        child.intensity = (child.userData.baseIntensity || 2.0) * flicker;
      } else if (child instanceof THREE.Sprite && child.userData.isFireHalo) {
        const s = (child.userData.baseScale || 0.8) * (0.94 + flicker * 0.09);
        child.scale.set(s, s, 1);
        child.material.opacity = Math.min(0.85, (child.userData.baseOpacity || 0.4) * flicker);
      }
    }
    this.furnitureGroup.traverse((obj) => {
      if (obj.userData.isFlame) {
        obj.scale.set(0.95 + flicker * 0.1, 0.85 + flicker * 0.22, 0.95 + flicker * 0.1);
      }
    });

    // Update pooled placement particles
    let anyParticle = false;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        _mat4.makeScale(0, 0, 0);
        this.particleMesh.setMatrixAt(i, _mat4);
        anyParticle = true;
        continue;
      }
      p.vel.y -= 3.6 * dt;
      p.pos.addScaledVector(p.vel, dt);
      const t = 1 - p.life / p.maxLife;
      _scaleVec.setScalar(Math.max(0.01, t));
      _quat.setFromAxisAngle(_vec3A.set(0, 1, 0), p.life * 6);
      _mat4.compose(p.pos, _quat, _scaleVec);
      this.particleMesh.setMatrixAt(i, _mat4);
      anyParticle = true;
    }
    if (anyParticle) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      this.particleMesh.computeBoundingSphere();
    }

    this.renderer.render(this.scene, this.camera);
    if (this.showDimensions) {
      this.emitProjectedDimensions(false);
    }
    if (this.showRoomLabels) {
      this.emitProjectedRoomLabels(false);
    }

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    }
  };

  private disposeObject(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if (
        child instanceof THREE.Mesh ||
        child instanceof THREE.LineSegments ||
        child instanceof THREE.Line ||
        child instanceof THREE.Points
      ) {
        // Keep shared cached geometry intact for imported GLB/OBJ templates
        if (!child.userData.isImportedMesh) {
          child.geometry?.dispose();
        }
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => this.disposeMaterialSafe(m));
        } else {
          this.disposeMaterialSafe(child.material);
        }
      } else if (child instanceof THREE.Sprite) {
        this.disposeMaterialSafe(child.material);
      }
      child.dispose();
    });
  }

  public dispose(): void {
    this.disposed = true;
    this.stopRenderLoop();
    this.timer.dispose();

    const dom = this.renderer.domElement;
    dom.removeEventListener('contextmenu', this.onContextMenu);
    dom.removeEventListener('pointermove', this.onPointerMove);
    dom.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('resize', this.onResize);
    dom.removeEventListener('webglcontextlost', this.onContextLost);
    dom.removeEventListener('webglcontextrestored', this.onContextRestored);

    this.clearGroup(this.siteGroup, true);
    this.clearGroup(this.otherFloorsGroup, true);
    this.clearGroup(this.floorGroup, true);
    this.clearGroup(this.zoneOverlayGroup, true);
    this.clearGroup(this.wallGroup, true);
    this.clearGroup(this.ceilingGroup, true);
    this.clearGroup(this.furnitureGroup, true);
    this.clearGroup(this.practicalLightsGroup, true);
    this.clearGroup(this.roomLightsGroup, true);
    this.clearGroup(this.dimensionsGroup, true);
    this.clearGroup(this.previewGroup, true);
    this.clearGroup(this.selectionGroup, true);
    this.clearGroup(this.cloudsGroup, true);
    this.disposeObject(this.personRig.root);

    this.particleMesh.geometry.dispose();
    (this.particleMesh.material as THREE.Material).dispose();
    this.particleMesh.dispose();
    this.studioApron.geometry.dispose();
    (this.studioApron.material as THREE.Material).dispose();
    this.studioApron.dispose();

    this.controls.dispose();
    this.textures.dispose();
    this.skyDome.geometry.dispose();
    (this.skyDome.material as THREE.Material).dispose();
    this.skyDome.dispose();
    this.skyDomeTex?.dispose();
    this.sunOrb.geometry.dispose();
    (this.sunOrb.material as THREE.Material).dispose();
    this.sunOrb.dispose();
    this.sunCorona.material.dispose();
    this.sunCorona.dispose();
    this.cloudMat.dispose();
    this.starsPoints.geometry.dispose();
    (this.starsPoints.material as THREE.Material).dispose();
    this.starsPoints.dispose();
    this.landPlotMat.dispose();
    this.lampGlowTex.dispose();
    this.envMapTex?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}
