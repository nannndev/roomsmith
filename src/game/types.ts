export type GameScreen = 'title' | 'playing' | 'paused' | 'victory';
export type PlayMode = 'commission' | 'sandbox';
export type PlacementMode = 'free' | 'snap';

export type RoomZoneId =
  | 'living'
  | 'bedroom'
  | 'kitchen'
  | 'study'
  | 'bath'
  | 'terrace';

export type FloorMaterialId =
  | 'herringbone_oak'
  | 'pale_ash'
  | 'carrara_marble'
  | 'warm_terrazzo'
  | 'polished_concrete'
  | 'slate_tile'
  | 'bistro_checker'
  | 'woven_tatami'
  | 'plush_carpet'
  | 'geometric_mosaic'
  | 'asphalt_parking'
  | 'garden_grass'
  | 'cobblestone_path'
  | 'deck_slats';

export type WallMaterialId =
  | 'matte_paint'
  | 'limewash_plaster'
  | 'botanical_wallpaper'
  | 'art_deco_wallpaper'
  | 'nordic_stripe_wallpaper'
  | 'sage_matte'
  | 'venetian_terracotta'
  | 'midnight_paneling'
  | 'walnut_slats'
  | 'loft_brick'
  | 'raw_concrete'
  | 'cream_wainscot';

export type WallOpeningType =
  | 'none'
  | 'window'
  | 'arched_window'
  | 'curtain_window'
  | 'bath_vent'
  | 'door'
  | 'double_door'
  | 'wood_slider'
  | 'archway'
  | 'glass_slider';

export type FurnitureCategory =
  | 'seating'
  | 'tables'
  | 'tabletop'
  | 'bedroom'
  | 'kitchen'
  | 'bath'
  | 'living'
  | 'lighting'
  | 'wall_decor'
  | 'decor'
  | 'stairs'
  | 'garden'
  | 'vehicles'
  | 'custom';

export type LightingMood = 'morning' | 'golden' | 'studio' | 'evening';
export type WallViewMode = 'cutaway' | 'full' | 'low';
export type CameraPreset = 'iso' | 'plan' | 'corner' | 'interior';
export type FoundationStyle = 'concrete' | 'stone' | 'brick' | 'timber';
export type RoofStyle = 'none' | 'flat' | 'gable' | 'hip' | 'shed' | 'joglo';
export type TemplateCategory = 'house' | 'kos' | 'apartment' | 'villa';
export type StarterTemplateId =
  | 'rumah_tipe_36'
  | 'rumah_tipe_45'
  | 'rumah_tipe_60'
  | 'rumah_sempit_2lt'
  | 'rumah_2lt_modern'
  | 'rumah_panjang_courtyard'
  | 'house_garage'
  | 'kos_4'
  | 'kos_6_lorong'
  | 'kos_2lt_8kamar'
  | 'kontrakan_3pintu'
  | 'studio_apt'
  | 'apt_2br'
  | 'villa_pool'
  | 'ruko_2lt'
  | 'garden_park';

export type RoomModuleId =
  | 'mod_bedroom'
  | 'mod_kos_ensuite'
  | 'mod_bathroom'
  | 'mod_kitchen'
  | 'mod_living'
  | 'mod_study';

export const MIN_LAND_SIZE = 4;
export const MAX_LAND_SIZE = 60;

export interface SiteConfig {
  landWidth: number; // meters (4..60)
  landDepth: number; // meters (4..60)
  foundationStyle: FoundationStyle;
  foundationHeight: number; // meters (0.15..0.55)
  showCeiling: boolean; // architectural interior ceiling (plafond)
  wallHeight?: number; // room perimeter & partition wall height in meters (1.5..5.0)
  roofStyle?: RoofStyle; // 3D architectural roof style
  roofColor?: string; // hex color for roof tiles / metal
  roofPitch?: number; // roof pitch height in meters (0.6..3.2)
  showRoof?: boolean; // toggle visibility of 3D exterior roof
}

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  landWidth: 14,
  landDepth: 14,
  foundationStyle: 'concrete',
  foundationHeight: 0.28,
  showCeiling: true,
  wallHeight: 2.65,
  roofStyle: 'gable',
  roofColor: '#A8583B',
  roofPitch: 1.5,
  showRoof: false,
};

export type DockTab = 'select' | 'layout' | 'furniture' | 'surfaces' | 'goals';
export type LayoutSubTool =
  | 'wall_draw'
  | 'wall_erase'
  | 'floor_add'
  | 'floor_remove'
  | 'zone_paint'
  | 'wall_toggle'
  | 'opening_window'
  | 'opening_arched_window'
  | 'opening_curtain_window'
  | 'opening_bath_vent'
  | 'opening_door'
  | 'opening_double_door'
  | 'opening_wood_slider'
  | 'opening_archway'
  | 'opening_slider';

export interface FloorTile {
  x: number;
  z: number;
  zone: RoomZoneId;
  floorMat: FloorMaterialId;
  floorTint?: string;
  wallMat: WallMaterialId;
  wallTint?: string;
}

export interface WallEdgeStyle {
  mat: WallMaterialId;
  tint: string;
}

export interface RoomLightConfig {
  enabled: boolean;
  intensity: number; // 0..2.5 (1.0 = 100%)
  kelvin: number; // 1800..8000 K
  tint: string; // hex tint color ('#FFFFFF' = pure Kelvin)
}

export const DEFAULT_ROOM_LIGHT: RoomLightConfig = {
  enabled: true,
  intensity: 0.75,
  kelvin: 3200,
  tint: '#FFFFFF',
};

/**
 * Freeform custom architectural wall drawn from scratch between any two world-space points.
 */
export interface CustomWallSegment {
  id: string;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  height: number;
  thickness?: number; // wall thickness in meters (0.08..0.60, default WALL_THICKNESS)
  mat: WallMaterialId;
  tint: string;
  opening?: WallOpeningType;
}

export type CustomShapeKind =
  | 'table'
  | 'cabinet'
  | 'ottoman'
  | 'vase'
  | 'sculpture'
  | 'framed_art'
  | 'imported';

export type CustomFinishKind = 'wood' | 'matte' | 'metal' | 'ceramic' | 'glass';

export interface CustomModelSpec {
  kind: CustomShapeKind;
  widthM: number;
  depthM: number;
  heightM: number;
  finish: CustomFinishKind;
  accentColor: string;
  importedAssetId?: string;
  imageTextureId?: string;
}

export interface FurnitureDef {
  id: string;
  name: string;
  category: FurnitureCategory;
  width: number; // nominal width in meters / grid cells along local X
  depth: number; // nominal depth in meters / grid cells along local Z
  height: number; // meters
  price: number;
  comfort: number;
  harmony: number;
  lighting: number;
  allowOverlap?: boolean; // true for rugs & chandeliers
  wallMount?: boolean; // snaps cleanly to walls and doesn't block floor furniture
  ceilingMount?: boolean;
  outdoorAllowed?: boolean; // can be placed directly on the outdoor yard / land lot without indoor floor tiles
  tabletopProp?: boolean; // small item designed to sit on tables, desks, shelves, counters
  surfaceHeight?: number; // top surface Y in meters for placing other items on top
  emitsLight?: boolean;
  lightColor?: string;
  lightIntensity?: number;
  zoneAffinity: RoomZoneId[];
  defaultColor: string;
  swatches: string[];
  accentColor: string;
  customSpec?: CustomModelSpec;
}

export interface PlacedFurniture {
  uid: string;
  defId: string;
  gx: number; // anchor grid cell X (used in grid mode & scoring zone lookup)
  gz: number; // anchor grid cell Z
  rotation: 0 | 1 | 2 | 3; // discrete 90-deg fallback
  color: string;
  // Free placement overrides (continuous world meters + arbitrary angle + scale)
  wx?: number;
  wy?: number; // elevation above floor (e.g. sitting on top of a table or shelf!)
  wz?: number;
  rotY?: number; // radians
  scale?: number; // uniform scale multiplier (default 1.0)
}

export interface FloorLevelData {
  tiles: Record<string, FloorTile>;
  interiorWalls: Record<string, boolean>;
  openings: Record<string, WallOpeningType>;
  wallStyles?: Record<string, WallEdgeStyle>;
  customWalls?: CustomWallSegment[];
  furniture: PlacedFurniture[];
  roomNames?: Record<string, string>;
  roomLights?: Record<string, RoomLightConfig>;
}

export interface RoomBlueprint {
  gridSize: number;
  site?: SiteConfig;
  tiles: Record<string, FloorTile>; // active floor tiles, key `${x},${z}`
  interiorWalls: Record<string, boolean>; // active floor interior partitions
  openings: Record<string, WallOpeningType>; // active floor openings
  wallStyles?: Record<string, WallEdgeStyle>; // active floor per-edge finishes
  customWalls?: CustomWallSegment[]; // active floor freeform walls
  furniture: PlacedFurniture[]; // active floor furniture
  roomNames?: Record<string, string>; // active floor custom room names keyed by room anchor tile
  roomLights?: Record<string, RoomLightConfig>; // active floor per-room ambiance lighting keyed by room anchor tile
  exteriorWallMat: WallMaterialId;
  activeFloor?: number; // 0 = Lantai 1, 1 = Lantai 2, 2 = Lantai 3
  floorCount?: number; // 1..3 (default 1)
  otherFloors?: Record<number, FloorLevelData>; // inactive floors stored when editing another story
}

export interface DetectedRoom {
  id: number;
  zone: RoomZoneId;
  area: number;
  tiles: string[];
}

export interface ScoreBreakdown {
  total: number; // 0..100
  comfort: number; // 0..100
  harmony: number; // 0..100
  lighting: number; // 0..100
  flow: number; // 0..100
  floorArea: number;
  roomCount: number;
  itemCount: number;
  totalSpent: number;
  rooms: DetectedRoom[];
}

export interface CommissionRequirement {
  id: string;
  label: string;
  check: (bp: RoomBlueprint, score: ScoreBreakdown) => boolean;
  progressText: (bp: RoomBlueprint, score: ScoreBreakdown) => string;
}

export interface CommissionDef {
  id: string;
  index: number;
  title: string;
  client: string;
  brief: string;
  budget: number;
  targetScore: number;
  recommendedMood: LightingMood;
  starterBlueprint: RoomBlueprint;
  requirements: CommissionRequirement[];
}

export interface BuilderToolState {
  tab: DockTab;
  layoutSubTool: LayoutSubTool;
  placementMode: PlacementMode;
  activeZone: RoomZoneId;
  activeFloorMat: FloorMaterialId;
  activeFloorTint: string;
  activeWallMat: WallMaterialId;
  activeWallTint: string;
  surfaceTarget: 'floor' | 'wall' | 'lighting';
  selectedFurnitureDefId: string | null;
  placementRotation: 0 | 1 | 2 | 3;
  placementAngleDeg: number; // fine rotation in degrees for free placement (0..359)
  selectedPlacedUid: string | null;
  movingPlacedUid: string | null;
  selectedCustomWallId: string | null;
  movingCustomWallId: string | null;
  selectedRoomId: number | null;
  roomEditScope: 'room' | 'building';
  movingRoomScope: 'room' | 'building' | null;
}

export interface WallDrawOptions {
  snapStepM: 0.25 | 0.5 | 1.0;
  orthoLock: boolean;
}

export interface WallDrawStatus {
  active: boolean;
  hovering: boolean;
  lengthM: number;
  angleDeg: number;
  cursorLotX: number; // meters from west edge of land plot
  cursorLotZ: number; // meters from north edge of land plot
  snappedCorner: boolean;
  labelScreenX: number;
  labelScreenY: number;
}

export type PersonHeightPreset = 1.25 | 1.7 | 1.85;

export interface PeopleHudState {
  panelOpen: boolean;
  showPerson: boolean;
  walkMode: boolean;
  placingPerson: boolean;
  heightM: PersonHeightPreset;
  lotX: number;
  lotZ: number;
  headingDeg: number;
  zoneLabel: string;
}

export type DimensionLabelKind = 'land' | 'room' | 'wall' | 'gap' | 'item';

export interface DimensionLabelScreen {
  id: string;
  x: number;
  y: number;
  text: string;
  kind: DimensionLabelKind;
}

export interface RoomLabelScreen {
  id: string;
  roomId: number;
  x: number;
  y: number;
  name: string;
  area: number;
  isCustomName: boolean;
}

export const GRID_SIZE = 14;
export const TILE_SIZE = 1.0;
export const WALL_HEIGHT = 2.65;
export const WALL_THICKNESS = 0.14;
export const FLOOR_SLAB_THICKNESS = 0.16;
export const MAX_FLOORS = 3;
