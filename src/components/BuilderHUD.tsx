import React, { useEffect, useMemo, useState } from 'react';
import {
  Armchair,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Award,
  Box,
  Building2,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Copy,
  Crosshair,
  DoorOpen,
  Eraser,
  Eye,
  EyeOff,
  FilePlus2,
  FlipHorizontal2,
  FlipVertical2,
  FolderOpen,
  Footprints,
  Grid2x2,
  Home,
  ImageDown,
  Lamp,
  Layers,
  LayoutGrid,
  Lightbulb,
  Magnet,
  MapPin,
  Moon,
  MousePointer2,
  Move,
  Paintbrush,
  Pause,
  PenTool,
  Plus,
  PlusSquare,
  Power,
  Redo2,
  RotateCcw,
  RotateCw,
  Ruler,
  Search,
  Sun,
  Sunset,
  Tag,
  Thermometer,
  Trash2,
  Undo2,
  Upload,
  User,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  COMMISSIONS,
  FLOOR_MATERIALS,
  FOUNDATION_STYLES,
  FURNITURE_CATALOG,
  FURNITURE_CATEGORIES,
  getFurnitureDef,
  ROOF_COLORS,
  ROOF_STYLES,
  ROOM_LIGHT_TINT_SWATCHES,
  ROOM_MODULE_PRESETS,
  ROOM_ZONES,
  STARTER_TEMPLATES,
  SURFACE_TINT_SWATCHES,
  WALL_MATERIALS,
} from '../game/catalog';
import {
  getActiveFloorIndex,
  getBlueprintDimensions,
  getBlueprintFloorCount,
  getEffectiveSite,
  getKelvinLabel,
  getRoomCustomName,
  getRoomLightConfig,
  getSiteBounds,
  getTileSetBounds,
  hasCustomRoomLight,
  kelvinToHex,
  resolveRoomLightHex,
} from '../game/scoring';
import {
  BuilderToolState,
  CameraPreset,
  CommissionDef,
  CustomWallSegment,
  DimensionLabelScreen,
  DockTab,
  FloorMaterialId,
  FoundationStyle,
  FurnitureCategory,
  FurnitureDef,
  GameScreen,
  LayoutSubTool,
  LightingMood,
  MAX_FLOORS,
  MAX_LAND_SIZE,
  MIN_LAND_SIZE,
  PeopleHudState,
  PersonHeightPreset,
  PlacedFurniture,
  PlayMode,
  RoofStyle,
  RoomBlueprint,
  RoomLabelScreen,
  RoomLightConfig,
  RoomModuleId,
  RoomZoneId,
  ScoreBreakdown,
  SiteConfig,
  StarterTemplateId,
  WALL_HEIGHT,
  WALL_THICKNESS,
  WallDrawOptions,
  WallDrawStatus,
  WallMaterialId,
  WallOpeningType,
  WallViewMode,
} from '../game/types';

interface BuilderHUDProps {
  screen: GameScreen;
  playMode: PlayMode;
  commission: CommissionDef;
  completedIds: string[];
  blueprint: RoomBlueprint;
  customDefs: Record<string, FurnitureDef>;
  wallDrawStatus: WallDrawStatus;
  wallDrawOptions: WallDrawOptions;
  peopleHud: PeopleHudState;
  score: ScoreBreakdown;
  tool: BuilderToolState;
  mood: LightingMood;
  wallView: WallViewMode;
  isPlanView: boolean;
  showDimensions: boolean;
  dimensionLabels: DimensionLabelScreen[];
  showRoomLabels: boolean;
  roomLabels: RoomLabelScreen[];
  showUpperFloors: boolean;
  muted: boolean;
  canUndo: boolean;
  canRedo: boolean;
  dockCollapsed: boolean;
  toastMessage: string | null;
  onToggleDock: () => void;
  onToggleDimensions: () => void;
  onToggleRoomLabels: () => void;
  onToggleUpperFloors: () => void;
  onSwitchFloor: (floorIdx: number) => void;
  onAddUpperFloor: (copyBelow: boolean) => void;
  onRemoveTopFloor: () => void;
  onRenameRoom: (roomId: number, name: string) => void;
  onUpdateRoomLight: (
    roomId: number,
    patch: Partial<RoomLightConfig> | null,
    recordUndo?: boolean,
  ) => void;
  onApplyRoomLightToAll: (config: RoomLightConfig) => void;
  onExportScreenshotPng: () => void;
  onOpenProjectManager: () => void;
  onUpdateTool: (patch: Partial<BuilderToolState>) => void;
  onUpdateWallDrawOptions: (patch: Partial<WallDrawOptions>) => void;
  onCancelWallDraw: () => void;
  onCommitExactWallLength: (lengthM: number) => void;
  onUpdatePeopleHud: (patch: Partial<PeopleHudState>) => void;
  onCenterPerson: () => void;
  onRotateAction: () => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onChangeSelectedColor: (hex: string) => void;
  onAdjustSelectedTransform: (patch: { wy?: number; scale?: number }) => void;
  onStartMoveSelected: () => void;
  onUpdateCustomWall: (
    wallId: string,
    patch: {
      lengthM?: number;
      height?: number;
      thickness?: number;
      deltaAngleDeg?: number;
      dx?: number;
      dz?: number;
      opening?: WallOpeningType;
    },
  ) => void;
  onCloneCustomWall: (wallId: string) => void;
  onDeleteCustomWall: (wallId: string) => void;
  onStartMoveCustomWall: () => void;
  onSelectRoomById: (roomId: number | null) => void;
  onShiftRoom: (dx: number, dz: number) => void;
  onCenterRoom: () => void;
  onRotateRoom: () => void;
  onResizeSelectedRoom: (dw: number, dd: number) => void;
  onChangeRoomZone: (zone: RoomZoneId) => void;
  onDeleteSelectedRoom: () => void;
  onStartMoveRoom: () => void;
  onApplySurfaceToAll: () => void;
  onResizeLand: (width: number, depth: number) => void;
  onUpdateSite: (patch: Partial<SiteConfig>) => void;
  onTogglePlanView: () => void;
  onResizeRoom: (width: number, depth: number) => void;
  onBlankCanvas: () => void;
  onFillFloorInsideWalls: () => void;
  onApplyRoomPreset: (preset: 'rect' | 'lshape' | 'courtyard') => void;
  onApplyStarterTemplate: (templateId: StarterTemplateId, includeFurniture?: boolean) => void;
  onOpenTemplateGallery: () => void;
  onStampRoomModule: (moduleId: RoomModuleId, includeFurniture: boolean) => void;
  onMirrorBlueprint: (axis: 'x' | 'z') => void;
  onOpenCustomModal: (mode: 'import' | 'create') => void;
  onSetCameraPreset: (preset: CameraPreset) => void;
  onCycleWallView: () => void;
  onCycleMood: () => void;
  onSetMood: (mood: LightingMood) => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onResume: () => void;
  onSelectCommission: (index: number) => void;
  onSwitchMode: (mode: PlayMode) => void;
  onResetRoom: () => void;
  onLoadShowcase: () => void;
  onSubmitCommission: () => void;
  onBackToTitle: () => void;
}

const MOOD_LABELS: Record<LightingMood, string> = {
  morning: 'Pagi',
  golden: 'Senja',
  studio: 'Siang',
  evening: 'Malam',
};

const WALL_VIEW_LABELS: Record<WallViewMode, string> = {
  cutaway: 'Potong',
  full: 'Penuh',
  low: 'Rendah',
};

const CATEGORY_SEARCH_ALIASES: Record<string, string> = {
  seating: 'kursi sofa bangku duduk armchair',
  tables: 'meja desk makan kerja kopi',
  beds: 'kasur ranjang tidur bed kamar',
  storage: 'lemari rak pakaian baju sepatu buku',
  kitchen: 'dapur masak kompor kulkas dispenser galon cooker',
  bath: 'kamar mandi toilet kloset wc wastafel shower bathtub handuk sabun',
  lighting: 'lampu cahaya penerangan',
  decor: 'dekorasi hiasan karpet tv ac kipas angin setrika jemuran',
  plants: 'tanaman pot bunga daun',
  garden: 'taman luar outdoor gazebo kolam renang pagar gerbang kanopi teras pilar balkon',
  stairs: 'tangga naik lantai atas',
  vehicles: 'kendaraan mobil motor vespa sepeda parkir garasi carport',
  custom: 'kustom custom 3d import',
};

const KEYBOARD_GUIDE: { keys: string; action: string }[] = [
  { keys: '↑ ↓ ← →', action: 'Geser objek terpilih (Shift = halus)' },
  { keys: 'Q / E / R', action: 'Putar objek / preview (Shift = 5°)' },
  { keys: '[ / ]', action: 'Turun / Naik tinggi Y (PgDn/PgUp)' },
  { keys: '- / + / 0', action: 'Kecil / Besar ukuran (0 = 100%)' },
  { keys: 'M', action: 'Angkat & pindah pakai kursor' },
  { keys: 'Shift + D', action: 'Duplikat objek terpilih' },
  { keys: 'Del', action: 'Hapus objek terpilih' },
  { keys: 'G', action: 'Ganti Mode Bebas vs Snap Grid' },
  { keys: 'W A S D', action: 'Geser kamera dengan halus' },
  { keys: 'T', action: 'Tampil / Sembunyikan Ukuran' },
  { keys: 'H / 1–5', action: 'Sembunyikan panel / Ganti tab' },
];

export const BuilderHUD: React.FC<BuilderHUDProps> = ({
  screen,
  playMode,
  commission,
  completedIds,
  blueprint,
  customDefs,
  wallDrawStatus,
  wallDrawOptions,
  peopleHud,
  score,
  tool,
  mood,
  wallView,
  isPlanView,
  showDimensions,
  dimensionLabels,
  showRoomLabels,
  roomLabels,
  showUpperFloors,
  muted,
  canUndo,
  canRedo,
  dockCollapsed,
  toastMessage,
  onToggleDock,
  onToggleDimensions,
  onToggleRoomLabels,
  onToggleUpperFloors,
  onSwitchFloor,
  onAddUpperFloor,
  onRemoveTopFloor,
  onRenameRoom,
  onUpdateRoomLight,
  onApplyRoomLightToAll,
  onExportScreenshotPng,
  onOpenProjectManager,
  onUpdateTool,
  onUpdateWallDrawOptions,
  onCancelWallDraw,
  onCommitExactWallLength,
  onUpdatePeopleHud,
  onCenterPerson,
  onRotateAction,
  onDuplicateSelected,
  onDeleteSelected,
  onChangeSelectedColor,
  onAdjustSelectedTransform,
  onStartMoveSelected,
  onUpdateCustomWall,
  onCloneCustomWall,
  onDeleteCustomWall,
  onStartMoveCustomWall,
  onSelectRoomById,
  onShiftRoom,
  onCenterRoom,
  onRotateRoom,
  onResizeSelectedRoom,
  onChangeRoomZone,
  onDeleteSelectedRoom,
  onStartMoveRoom,
  onApplySurfaceToAll,
  onResizeLand,
  onUpdateSite,
  onTogglePlanView,
  onResizeRoom,
  onBlankCanvas,
  onFillFloorInsideWalls,
  onApplyRoomPreset,
  onApplyStarterTemplate,
  onOpenTemplateGallery,
  onStampRoomModule,
  onMirrorBlueprint,
  onOpenCustomModal,
  onSetCameraPreset,
  onCycleWallView,
  onCycleMood,
  onSetMood,
  onUndo,
  onRedo,
  onToggleMute,
  onPause,
  onResume,
  onSelectCommission,
  onSwitchMode,
  onResetRoom,
  onLoadShowcase,
  onSubmitCommission,
  onBackToTitle,
}) => {
  const [activeCategory, setActiveCategory] = useState<FurnitureCategory>('seating');
  const [searchQuery, setSearchQuery] = useState('');
  const [cameraIndex, setCameraIndex] = useState(0);
  const [exactWallLenText, setExactWallLenText] = useState('4');
  const [roomNameDraft, setRoomNameDraft] = useState('');
  const [stampWithFurniture, setStampWithFurniture] = useState(true);

  const site = getEffectiveSite(blueprint);
  const activeFloorIdx = getActiveFloorIndex(blueprint);
  const floorCount = getBlueprintFloorCount(blueprint);
  const siteBounds = getSiteBounds(blueprint);
  const dims = getBlueprintDimensions(blueprint);
  const [landWText, setLandWText] = useState(String(site.landWidth));
  const [landDText, setLandDText] = useState(String(site.landDepth));
  const [dimWText, setDimWText] = useState(String(dims.width || 8));
  const [dimDText, setDimDText] = useState(String(dims.depth || 6));

  useEffect(() => {
    setLandWText(String(site.landWidth));
    setLandDText(String(site.landDepth));
  }, [site.landWidth, site.landDepth]);

  useEffect(() => {
    if (dims.width > 0) setDimWText(String(dims.width));
    if (dims.depth > 0) setDimDText(String(dims.depth));
  }, [dims.width, dims.depth]);

  const parsedLandW = Math.max(
    MIN_LAND_SIZE,
    Math.min(MAX_LAND_SIZE, Math.round(Number(landWText) || site.landWidth)),
  );
  const parsedLandD = Math.max(
    MIN_LAND_SIZE,
    Math.min(MAX_LAND_SIZE, Math.round(Number(landDText) || site.landDepth)),
  );
  const applyLandDimensions = () => {
    setLandWText(String(parsedLandW));
    setLandDText(String(parsedLandD));
    onResizeLand(parsedLandW, parsedLandD);
  };

  const applyFoundationBox = () => {
    const w = Math.max(2, Math.min(site.landWidth, Math.round(Number(dimWText) || 6)));
    const d = Math.max(2, Math.min(site.landDepth, Math.round(Number(dimDText) || 6)));
    setDimWText(String(w));
    setDimDText(String(d));
    onResizeRoom(w, d);
  };

  useEffect(() => {
    if (tool.selectedFurnitureDefId && customDefs[tool.selectedFurnitureDefId]) {
      setActiveCategory('custom');
    }
  }, [tool.selectedFurnitureDefId, customDefs]);

  const selectedItem: PlacedFurniture | null = tool.selectedPlacedUid
    ? blueprint.furniture.find((f) => f.uid === tool.selectedPlacedUid) || null
    : null;
  const selectedDef = selectedItem ? getFurnitureDef(selectedItem.defId, customDefs) : null;

  const selectedWall: CustomWallSegment | null = tool.selectedCustomWallId
    ? (blueprint.customWalls || []).find((w) => w.id === tool.selectedCustomWallId) || null
    : null;
  const selectedWallLen = selectedWall
    ? Number(Math.hypot(selectedWall.x2 - selectedWall.x1, selectedWall.z2 - selectedWall.z1).toFixed(2))
    : 0;
  const selectedWallAngle = selectedWall
    ? Math.round(
        ((Math.atan2(selectedWall.z2 - selectedWall.z1, selectedWall.x2 - selectedWall.x1) * 180) /
          Math.PI +
          360) %
          360,
      )
    : 0;

  const [wallLenText, setWallLenText] = useState('');
  const [wallHeightText, setWallHeightText] = useState('');
  useEffect(() => {
    if (selectedWall) {
      setWallLenText(selectedWallLen.toFixed(2));
      setWallHeightText((selectedWall.height || WALL_HEIGHT).toFixed(2));
    }
  }, [selectedWall?.id, selectedWallLen, selectedWall?.height]);

  const selectedRoom =
    tool.selectedRoomId !== null
      ? score.rooms.find((r) => r.id === tool.selectedRoomId) || score.rooms[0] || null
      : null;
  const selectedRoomCustomName = selectedRoom ? getRoomCustomName(blueprint, selectedRoom) : null;

  useEffect(() => {
    setRoomNameDraft(selectedRoomCustomName || '');
  }, [selectedRoom?.id, selectedRoomCustomName]);

  const selectedRoomBounds = selectedRoom
    ? getTileSetBounds(
        blueprint,
        tool.roomEditScope === 'building' ? null : new Set(selectedRoom.tiles),
      )
    : null;
  const roomWallHeight = site.wallHeight ?? WALL_HEIGHT;

  const coveragePct =
    siteBounds.landArea > 0
      ? Math.min(100, Math.round((score.floorArea / siteBounds.landArea) * 100))
      : 0;

  const reqResults = commission.requirements.map((r) => ({
    id: r.id,
    label: r.label,
    passed: r.check(blueprint, score),
    progress: r.progressText(blueprint, score),
  }));
  const allReqsMet = playMode === 'commission' && reqResults.every((r) => r.passed);

  const allCustomDefs = useMemo(() => Object.values(customDefs), [customDefs]);
  const trimmedSearch = searchQuery.trim().toLowerCase();
  const filteredCatalog = useMemo(() => {
    if (trimmedSearch) {
      const terms = trimmedSearch.split(/\s+/).filter(Boolean);
      const pool = [...FURNITURE_CATALOG, ...allCustomDefs];
      return pool.filter((item) => {
        const hay = `${item.name} ${item.id.replace(/_/g, ' ')} ${item.category} ${
          CATEGORY_SEARCH_ALIASES[item.category] || ''
        }`.toLowerCase();
        return terms.every((t) => hay.includes(t));
      });
    }
    return activeCategory === 'custom'
      ? allCustomDefs
      : FURNITURE_CATALOG.filter((f) => f.category === activeCategory);
  }, [trimmedSearch, activeCategory, allCustomDefs]);

  const cycleCamera = () => {
    const presets: CameraPreset[] = ['iso', 'corner', 'interior', 'plan'];
    const next = (cameraIndex + 1) % presets.length;
    setCameraIndex(next);
    onSetCameraPreset(presets[next]);
  };

  const tabs: { id: DockTab; label: string; icon: React.ReactNode }[] = [
    { id: 'select', label: 'Pilih', icon: <MousePointer2 className="w-3.5 h-3.5" /> },
    { id: 'layout', label: 'Denah', icon: <Grid2x2 className="w-3.5 h-3.5" /> },
    { id: 'furniture', label: 'Aset 3D', icon: <Armchair className="w-3.5 h-3.5" /> },
    { id: 'surfaces', label: 'Surfaces', icon: <Paintbrush className="w-3.5 h-3.5" /> },
    {
      id: 'goals',
      label: playMode === 'commission' ? 'Misi' : 'Ruang',
      icon: <Award className="w-3.5 h-3.5" />,
    },
  ];

  const layoutTools: { id: LayoutSubTool; label: string; icon: React.ReactNode }[] = [
    { id: 'floor_add', label: 'Tambah Lantai', icon: <PlusSquare className="w-3.5 h-3.5" /> },
    { id: 'floor_remove', label: 'Hapus Lantai', icon: <Eraser className="w-3.5 h-3.5" /> },
    { id: 'wall_draw', label: 'Gambar Dinding', icon: <PenTool className="w-3.5 h-3.5" /> },
    { id: 'wall_erase', label: 'Hapus Dinding', icon: <Trash2 className="w-3.5 h-3.5" /> },
    { id: 'zone_paint', label: 'Zona Ruang', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'wall_toggle', label: 'Partisi', icon: <Grid2x2 className="w-3.5 h-3.5" /> },
    { id: 'opening_window', label: 'Jendela', icon: <Eye className="w-3.5 h-3.5" /> },
    { id: 'opening_arched_window', label: 'Jendela Lengkung', icon: <Eye className="w-3.5 h-3.5" /> },
    { id: 'opening_curtain_window', label: 'Jendela Gorden', icon: <Eye className="w-3.5 h-3.5" /> },
    { id: 'opening_bath_vent', label: 'Bouvenlight', icon: <Eye className="w-3.5 h-3.5" /> },
    { id: 'opening_door', label: 'Pintu Kayu', icon: <DoorOpen className="w-3.5 h-3.5" /> },
    { id: 'opening_double_door', label: 'Pintu Ganda', icon: <DoorOpen className="w-3.5 h-3.5" /> },
    { id: 'opening_wood_slider', label: 'Geser Kayu', icon: <DoorOpen className="w-3.5 h-3.5" /> },
    { id: 'opening_archway', label: 'Lengkungan', icon: <DoorOpen className="w-3.5 h-3.5" /> },
    { id: 'opening_slider', label: 'Geser Kaca', icon: <DoorOpen className="w-3.5 h-3.5" /> },
  ];

  const stars = score.total >= 90 ? 3 : score.total >= 80 ? 2 : 1;

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col p-3 sm:p-4 gap-3">
      {/* TOP PERIMETER COZY HUD BAR */}
      <div className="flex items-start justify-between gap-3 shrink-0">
        {/* Top-Left Compact Architectural Site Readout (Zero Budget Clutter) */}
        <div className="pointer-events-auto bg-[#FAF5EC]/96 border border-[#D9CBB6] rounded-2xl px-3.5 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 shadow-[0_10px_28px_-8px_rgba(68,48,32,0.18)]">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-sm tracking-tight text-[#33261D] whitespace-nowrap">
              Roomsmith
            </span>
            <span className="text-[#C7B398]" aria-hidden="true">
              /
            </span>
            <span className="text-xs font-semibold text-[#9C5422] whitespace-nowrap">
              {playMode === 'commission' ? `0${commission.index}. ${commission.title}` : 'Studio Bebas'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-xs font-mono-num text-[#6B5644]">
            <span>
              Lahan <strong className="text-[#33261D] font-semibold">{site.landWidth}×{site.landDepth}m</strong>
            </span>
            <span className="text-[#C7B398]" aria-hidden="true">
              ·
            </span>
            <span>
              Lt.{activeFloorIdx + 1} <strong className="text-[#33261D] font-semibold">{score.floorArea} m²</strong> ({coveragePct}%)
            </span>
            <span className="text-[#C7B398]" aria-hidden="true">
              ·
            </span>
            <span>
              {score.roomCount} Ruang
            </span>
          </div>
        </div>

        {/* Top-Right Compact View & Utility Strip */}
        <div className="pointer-events-auto bg-[#FAF5EC]/96 border border-[#D9CBB6] rounded-2xl p-1.5 flex items-center gap-0.5 shadow-[0_10px_28px_-8px_rgba(68,48,32,0.18)]">
          {allReqsMet && (
            <>
              <button
                type="button"
                onClick={onSubmitCommission}
                className="px-2.5 py-1.5 rounded-xl bg-[#467255] hover:bg-[#3A6047] text-[#FFFBF5] font-display font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap shrink-0 shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Selesai</span>
              </button>
              <div className="w-px h-4 bg-[#D9CBB6] mx-0.5" />
            </>
          )}

          <button
            type="button"
            onClick={onTogglePlanView}
            title="Ganti Denah 2D vs Tampilan 3D"
            className={`px-2 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap ${
              isPlanView
                ? 'bg-[#B86B35] text-[#FFFBF5]'
                : 'text-[#33261D] hover:bg-[#EFE6D7]'
            }`}
          >
            <Compass className={`w-3.5 h-3.5 ${isPlanView ? 'text-[#FFFBF5]' : 'text-[#B86B35]'}`} />
            <span>{isPlanView ? '3D' : '2D'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleDimensions}
            title="Tampil / Sembunyikan Ukuran & Jarak Antar Bidang (T)"
            className={`px-2 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap ${
              showDimensions
                ? 'bg-[#467255] text-[#FFFBF5]'
                : 'text-[#33261D] hover:bg-[#EFE6D7]'
            }`}
          >
            <Ruler className={`w-3.5 h-3.5 ${showDimensions ? 'text-[#FFFBF5]' : 'text-[#B86B35]'}`} />
            <span className="hidden xl:inline">Ukuran</span>
          </button>

          <button
            type="button"
            onClick={onToggleRoomLabels}
            title="Tampil / Sembunyikan Label Nama Ruangan"
            className={`px-2 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap ${
              showRoomLabels
                ? 'bg-[#B86B35]/16 text-[#8C481B]'
                : 'text-[#33261D] hover:bg-[#EFE6D7]'
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-[#B86B35]" />
            <span className="hidden xl:inline">Label</span>
          </button>

          <button
            type="button"
            onClick={() => onUpdatePeopleHud({ panelOpen: !peopleHud.panelOpen })}
            title="Skala Orang 1.70m & Jalan Orang Pertama (Walk POV)"
            className={`px-2 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap ${
              peopleHud.walkMode
                ? 'bg-[#467255] text-[#FFFBF5]'
                : peopleHud.panelOpen || peopleHud.showPerson
                  ? 'bg-[#B86B35]/16 text-[#8C481B]'
                  : 'text-[#33261D] hover:bg-[#EFE6D7]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{peopleHud.walkMode ? 'Jalan' : 'Orang'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const turningOn = !(site.showRoof && site.roofStyle !== 'none');
              onUpdateSite(
                turningOn
                  ? {
                      showRoof: true,
                      roofStyle: site.roofStyle === 'none' ? 'gable' : site.roofStyle,
                    }
                  : { showRoof: false },
              );
            }}
            title="Tampil / Sembunyikan Atap 3D"
            className={`px-2 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap ${
              site.showRoof && site.roofStyle !== 'none'
                ? 'bg-[#B86B35] text-[#FFFBF5]'
                : 'text-[#33261D] hover:bg-[#EFE6D7]'
            }`}
          >
            <Home
              className={`w-3.5 h-3.5 ${
                site.showRoof && site.roofStyle !== 'none' ? 'text-[#FFFBF5]' : 'text-[#B86B35]'
              }`}
            />
            <span>{site.showRoof && site.roofStyle !== 'none' ? 'Atap' : 'Atap Off'}</span>
          </button>

          <div className="w-px h-4 bg-[#D9CBB6] mx-0.5" />

          <button
            type="button"
            onClick={onExportScreenshotPng}
            title="Unduh Foto Render 3D (.PNG) tanpa tombol HUD"
            className="px-2 py-1.5 rounded-xl text-xs font-semibold text-[#33261D] hover:bg-[#EFE6D7] transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <ImageDown className="w-3.5 h-3.5 text-[#467255]" />
            <span className="hidden xl:inline">Foto</span>
          </button>

          <button
            type="button"
            onClick={onOpenTemplateGallery}
            title="Galeri 16 Template Denah Rumah, Kos-Kosan, Kontrakan, Apartemen & Ruko"
            className="px-2 py-1.5 rounded-xl text-xs font-semibold text-[#33261D] hover:bg-[#EFE6D7] transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-[#B86B35]" />
            <span className="hidden sm:inline">Template</span>
          </button>

          <button
            type="button"
            onClick={onOpenProjectManager}
            title="Manajer Proyek — Simpan Banyak Desain, Ekspor/Impor .JSON & Ringkasan Item"
            className="px-2 py-1.5 rounded-xl text-xs font-semibold text-[#33261D] hover:bg-[#EFE6D7] transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <FolderOpen className="w-3.5 h-3.5 text-[#B86B35]" />
            <span className="hidden sm:inline">Proyek</span>
          </button>

          <div className="w-px h-4 bg-[#D9CBB6] mx-0.5" />

          <button
            type="button"
            onClick={cycleCamera}
            title="Ganti Sudut Kamera"
            className="p-1.5 rounded-xl text-xs font-medium text-[#33261D] hover:bg-[#EFE6D7] transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <Camera className="w-3.5 h-3.5 text-[#B86B35]" />
          </button>

          <button
            type="button"
            onClick={onCycleWallView}
            title="Mode Dinding (Potong / Penuh / Rendah)"
            className="px-2 py-1.5 rounded-xl text-xs font-medium text-[#33261D] hover:bg-[#EFE6D7] transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <Eye className="w-3.5 h-3.5 text-[#B86B35]" />
            <span className="hidden lg:inline">{WALL_VIEW_LABELS[wallView]}</span>
          </button>

          <button
            type="button"
            onClick={onCycleMood}
            title="Ganti Suasana Langit & Matahari"
            className="px-2 py-1.5 rounded-xl text-xs font-medium text-[#33261D] hover:bg-[#EFE6D7] transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            {mood === 'evening' ? (
              <Moon className="w-3.5 h-3.5 text-[#B86B35]" />
            ) : mood === 'golden' ? (
              <Sunset className="w-3.5 h-3.5 text-[#B86B35]" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-[#B86B35]" />
            )}
            <span className="hidden xl:inline">{MOOD_LABELS[mood]}</span>
          </button>

          <div className="w-px h-4 bg-[#D9CBB6] mx-0.5" />

          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Urungkan (Ctrl+Z)"
            className="p-1.5 rounded-xl text-[#4E3D2F] hover:bg-[#EFE6D7] disabled:opacity-35 transition-colors cursor-pointer disabled:cursor-default"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Ulangi (Ctrl+Y)"
            className="p-1.5 rounded-xl text-[#4E3D2F] hover:bg-[#EFE6D7] disabled:opacity-35 transition-colors cursor-pointer disabled:cursor-default"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            title={muted ? 'Nyalakan Suara' : 'Bisukan Suara'}
            className="p-1.5 rounded-xl text-[#4E3D2F] hover:bg-[#EFE6D7] transition-colors cursor-pointer"
          >
            {muted ? <VolumeX className="w-3.5 h-3.5 text-[#9F3A30]" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={onPause}
            title="Menu Studio (Esc)"
            className="p-1.5 rounded-xl text-[#4E3D2F] hover:bg-[#EFE6D7] transition-colors cursor-pointer"
          >
            <Pause className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* COMPACT FLOATING MULTI-FLOOR SWITCHER BAR (Top-Right below Toolbar) */}
      {!peopleHud.walkMode && (
        <div className="pointer-events-auto fixed top-[64px] right-3 sm:right-4 z-[18] bg-[#FAF5EC]/96 border border-[#D9CBB6] rounded-xl p-1 flex items-center gap-1 shadow-[0_8px_22px_-6px_rgba(68,48,32,0.18)]">
          <span className="px-1.5 text-[10px] font-semibold text-[#7D6754] flex items-center gap-1 whitespace-nowrap">
            <Building2 className="w-3 h-3 text-[#B86B35]" />
            <span className="hidden sm:inline">Lantai</span>
          </span>
          {Array.from({ length: floorCount }).map((_, idx) => {
            const active = activeFloorIdx === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSwitchFloor(idx)}
                title={`Pindah ke Lantai ${idx + 1}`}
                className={`px-2 py-1 rounded-lg text-[11px] font-mono-num font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#B86B35] text-[#FFFBF5] shadow-xs'
                    : 'bg-[#F1E8DA] text-[#5A4738] hover:bg-[#E7DBC8] hover:text-[#33261D]'
                }`}
              >
                Lt.{idx + 1}
              </button>
            );
          })}
          {floorCount < MAX_FLOORS && (
            <button
              type="button"
              onClick={() => onAddUpperFloor(true)}
              title="Tambah Lantai Atas (menyalin struktur lantai di bawah)"
              className="px-2 py-1 rounded-lg bg-[#467255]/14 hover:bg-[#467255]/24 border border-[#467255]/40 text-[11px] font-semibold text-[#2D4F39] flex items-center gap-0.5 cursor-pointer transition-colors whitespace-nowrap"
            >
              <Plus className="w-3 h-3" />
              <span>Lt.{floorCount + 1}</span>
            </button>
          )}
          {floorCount > 1 && (
            <button
              type="button"
              onClick={onToggleUpperFloors}
              title={
                showUpperFloors
                  ? 'Sembunyikan lantai di atas lantai aktif'
                  : 'Tampilkan semua lantai di tampilan 3D'
              }
              className={`p-1 rounded-lg border cursor-pointer transition-colors ${
                showUpperFloors
                  ? 'bg-[#FAF5EC] border-[#D9CBB6] text-[#467255] hover:bg-[#EFE6D7]'
                  : 'bg-[#F1E8DA] border-[#D9CBB6] text-[#7D6754] hover:text-[#33261D]'
              }`}
            >
              {showUpperFloors ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      )}

      {/* Transient toast banner */}
      {toastMessage && (
        <div className="pointer-events-none fixed top-[68px] left-1/2 -translate-x-1/2 z-20 bg-[#FAF5EC]/98 border border-[#C48352] text-[#33261D] text-xs font-medium px-4 py-1.5 rounded-xl shadow-[0_8px_20px_-6px_rgba(68,48,32,0.22)]">
          {toastMessage}
        </div>
      )}

      {/* MAIN SIDEBAR + FLOATING BOTTOM-RIGHT KEYBOARD STATUS ROW */}
      <div className="relative flex-1 min-h-0 flex items-stretch justify-between">
        {/* COLLAPSIBLE LEFT SIDE PANEL */}
        <div
          className="pointer-events-none relative h-full flex items-start transition-transform duration-200 ease-out"
          style={{
            transform: dockCollapsed ? 'translateX(calc(-100% - 14px))' : 'translateX(0)',
          }}
        >
          {/* Main Side Panel Container */}
          <aside className="pointer-events-auto w-[304px] sm:w-[324px] h-full max-h-[calc(100vh-88px)] bg-[#FAF5EC]/97 border border-[#D9CBB6] rounded-2xl shadow-[0_16px_40px_-10px_rgba(68,48,32,0.22)] flex flex-col overflow-hidden">
            {/* 5-Tab Compact Navigation Grid */}
            <div className="p-2 border-b border-[#E5D9C7] shrink-0">
              <div className="grid grid-cols-5 gap-1 bg-[#E7DBC8] p-1 rounded-xl">
                {tabs.map((t, idx) => (
                  <button
                    key={t.id}
                    type="button"
                    title={`${t.label} (${idx + 1})`}
                    onClick={() =>
                      onUpdateTool({
                        tab: t.id,
                        movingPlacedUid: null,
                        movingCustomWallId: null,
                        movingRoomScope: null,
                        selectedFurnitureDefId:
                          t.id === 'furniture'
                            ? tool.selectedFurnitureDefId || FURNITURE_CATALOG[0].id
                            : null,
                      })
                    }
                    className={`py-1.5 px-1 rounded-lg text-[11px] font-medium flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer whitespace-nowrap ${
                      tool.tab === t.id
                        ? 'bg-[#B86B35] text-[#FFFBF5] font-semibold shadow-xs'
                        : 'text-[#5E4B3C] hover:text-[#33261D] hover:bg-[#FAF5EC]/60'
                    }`}
                  >
                    {t.icon}
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* CONTEXTUAL SELECTED OBJECT INSPECTOR (Always pinned at top of sidebar when an item is selected) */}
            {selectedItem && selectedDef && (
              <div className="px-3 py-2.5 bg-[#F1E8DA] border-b border-[#DFD2BE] space-y-2 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#33261D] truncate">
                    {selectedDef.name}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {selectedDef.swatches.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => onChangeSelectedColor(hex)}
                        title={`Finish ${hex}`}
                        className={`w-3.5 h-3.5 rounded-full cursor-pointer transition-transform ${
                          selectedItem.color === hex
                            ? 'ring-2 ring-[#B86B35] ring-offset-1 ring-offset-[#F1E8DA] scale-110'
                            : 'border border-[#33261D]/25 hover:scale-110'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>

                {/* Height (Y) & Scale (%) Steppers */}
                <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono-num">
                  <div className="flex items-center justify-between bg-[#FAF5EC] border border-[#D9CBB6] rounded-lg px-1.5 py-1">
                    <span className="text-[#7D6754]" title="Keyboard: [ and ]">
                      Y
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          onAdjustSelectedTransform({
                            wy: Math.max(0, Number(((selectedItem.wy ?? 0) - 0.05).toFixed(2))),
                          })
                        }
                        className="w-4 h-4 rounded hover:bg-[#EAE0CE] text-[#33261D] cursor-pointer"
                        title="Lower height ([)"
                      >
                        −
                      </button>
                      <span className="w-10 text-center text-[#33261D] font-medium">
                        {(selectedItem.wy ?? 0).toFixed(2)}m
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onAdjustSelectedTransform({
                            wy: Math.min(2.2, Number(((selectedItem.wy ?? 0) + 0.05).toFixed(2))),
                          })
                        }
                        className="w-4 h-4 rounded hover:bg-[#EAE0CE] text-[#33261D] cursor-pointer"
                        title="Raise height (])"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-[#FAF5EC] border border-[#D9CBB6] rounded-lg px-1.5 py-1">
                    <span className="text-[#7D6754]" title="Keyboard: - and +">
                      Size
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          onAdjustSelectedTransform({
                            scale: Math.max(0.4, Number(((selectedItem.scale ?? 1) - 0.1).toFixed(2))),
                          })
                        }
                        className="w-4 h-4 rounded hover:bg-[#EAE0CE] text-[#33261D] cursor-pointer"
                        title="Shrink (-)"
                      >
                        −
                      </button>
                      <span className="w-9 text-center text-[#33261D] font-medium">
                        {Math.round((selectedItem.scale ?? 1) * 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onAdjustSelectedTransform({
                            scale: Math.min(2.2, Number(((selectedItem.scale ?? 1) + 0.1).toFixed(2))),
                          })
                        }
                        className="w-4 h-4 rounded hover:bg-[#EAE0CE] text-[#33261D] cursor-pointer"
                        title="Grow (+)"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action buttons with key hints */}
                <div className="grid grid-cols-4 gap-1">
                  <button
                    type="button"
                    onClick={onStartMoveSelected}
                    title="Move with cursor (M) or Arrow Keys"
                    className={`py-1 px-1.5 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
                      tool.movingPlacedUid === selectedItem.uid
                        ? 'bg-[#B86B35] text-[#FFFBF5]'
                        : 'bg-[#FAF5EC] hover:bg-[#E8DCC9] border border-[#D9CBB6] text-[#33261D]'
                    }`}
                  >
                    <Move className="w-3 h-3 shrink-0" />
                    <span>{tool.movingPlacedUid === selectedItem.uid ? 'Place' : 'Move'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onRotateAction}
                    title="Rotate (Q / E / R)"
                    className="py-1 px-1.5 rounded-lg bg-[#FAF5EC] hover:bg-[#E8DCC9] border border-[#D9CBB6] text-[11px] font-medium text-[#33261D] flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
                  >
                    <RotateCw className="w-3 h-3 text-[#B86B35] shrink-0" />
                    <span>Rot</span>
                  </button>
                  <button
                    type="button"
                    onClick={onDuplicateSelected}
                    title="Clone (Shift+D)"
                    className="py-1 px-1.5 rounded-lg bg-[#FAF5EC] hover:bg-[#E8DCC9] border border-[#D9CBB6] text-[11px] font-medium text-[#33261D] flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
                  >
                    <Copy className="w-3 h-3 text-[#B86B35] shrink-0" />
                    <span>Clone</span>
                  </button>
                  <button
                    type="button"
                    onClick={onDeleteSelected}
                    title="Remove Object (Delete)"
                    className="py-1 px-1.5 rounded-lg bg-[#B54B40]/12 hover:bg-[#B54B40]/22 border border-[#B54B40]/30 text-[11px] font-medium text-[#8A3229] flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
                  >
                    <Trash2 className="w-3 h-3 shrink-0" />
                    <span>Del</span>
                  </button>
                </div>
              </div>
            )}

            {/* CONTEXTUAL CUSTOM WALL INSPECTOR (Move, Length, Height, Thickness, Rotate, Opening) */}
            {selectedWall && (
              <div className="px-3 py-2.5 bg-[#F1E8DA] border-b border-[#DFD2BE] space-y-2 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Ruler className="w-3.5 h-3.5 text-[#B86B35] shrink-0" />
                    <span className="text-xs font-semibold text-[#33261D] truncate">
                      Wall Segment
                    </span>
                    <span className="font-mono-num text-[10px] text-[#9C5422] font-semibold">
                      {selectedWallAngle}°
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateTool({ selectedCustomWallId: null, movingCustomWallId: null })
                    }
                    title="Deselect Wall (Esc)"
                    className="p-0.5 rounded-md text-[#7D6754] hover:text-[#33261D] hover:bg-[#E5D9C7] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Length (Panjang) & Height (Tinggi) direct numeric + stepper controls */}
                <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono-num">
                  <div className="flex items-center justify-between bg-[#FAF5EC] border border-[#D9CBB6] rounded-lg px-1.5 py-1">
                    <span className="text-[#7D6754]" title="Panjang tembok (- / +)">
                      L
                    </span>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateCustomWall(selectedWall.id, { lengthM: selectedWallLen - 0.5 })
                        }
                        className="w-4 h-4 rounded hover:bg-[#EAE0CE] text-[#33261D] cursor-pointer"
                        title="Pendekkan 0.5m (-)"
                      >
                        −
                      </button>
                      <input
                        type="text"
                        inputMode="decimal"
                        aria-label="Wall length in meters"
                        value={wallLenText}
                        onChange={(e) =>
                          setWallLenText(e.target.value.replace(/[^0-9.]/g, '').slice(0, 5))
                        }
                        onBlur={() => {
                          const v = parseFloat(wallLenText);
                          if (v >= 0.5) onUpdateCustomWall(selectedWall.id, { lengthM: v });
                          else setWallLenText(selectedWallLen.toFixed(2));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const v = parseFloat(wallLenText);
                            if (v >= 0.5) onUpdateCustomWall(selectedWall.id, { lengthM: v });
                          }
                        }}
                        className="w-10 bg-transparent text-center text-[#33261D] font-semibold focus:outline-none"
                      />
                      <span className="text-[10px] text-[#7D6754]">m</span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateCustomWall(selectedWall.id, { lengthM: selectedWallLen + 0.5 })
                        }
                        className="w-4 h-4 rounded hover:bg-[#EAE0CE] text-[#33261D] cursor-pointer"
                        title="Panjangkan 0.5m (+)"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-[#FAF5EC] border border-[#D9CBB6] rounded-lg px-1.5 py-1">
                    <span className="text-[#7D6754]" title="Tinggi tembok ([ / ])">
                      H
                    </span>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateCustomWall(selectedWall.id, {
                            height: (selectedWall.height || WALL_HEIGHT) - 0.2,
                          })
                        }
                        className="w-4 h-4 rounded hover:bg-[#EAE0CE] text-[#33261D] cursor-pointer"
                        title="Rendahkan 0.2m ([)"
                      >
                        −
                      </button>
                      <input
                        type="text"
                        inputMode="decimal"
                        aria-label="Wall height in meters"
                        value={wallHeightText}
                        onChange={(e) =>
                          setWallHeightText(e.target.value.replace(/[^0-9.]/g, '').slice(0, 4))
                        }
                        onBlur={() => {
                          const v = parseFloat(wallHeightText);
                          if (v >= 0.5) onUpdateCustomWall(selectedWall.id, { height: v });
                          else setWallHeightText((selectedWall.height || WALL_HEIGHT).toFixed(2));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const v = parseFloat(wallHeightText);
                            if (v >= 0.5) onUpdateCustomWall(selectedWall.id, { height: v });
                          }
                        }}
                        className="w-10 bg-transparent text-center text-[#33261D] font-semibold focus:outline-none"
                      />
                      <span className="text-[10px] text-[#7D6754]">m</span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateCustomWall(selectedWall.id, {
                            height: (selectedWall.height || WALL_HEIGHT) + 0.2,
                          })
                        }
                        className="w-4 h-4 rounded hover:bg-[#EAE0CE] text-[#33261D] cursor-pointer"
                        title="Tinggikan 0.2m (])"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Wall Thickness (Tebal) */}
                <div className="flex items-center gap-1 text-[10px] font-mono-num">
                  <span className="text-[#7D6754] shrink-0 mr-0.5">Tebal</span>
                  {[
                    { label: '10cm', v: 0.1 },
                    { label: '14cm', v: 0.14 },
                    { label: '22cm', v: 0.22 },
                    { label: '32cm', v: 0.32 },
                  ].map((opt) => {
                    const curT = selectedWall.thickness ?? WALL_THICKNESS;
                    const active = Math.abs(curT - opt.v) < 0.025;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => onUpdateCustomWall(selectedWall.id, { thickness: opt.v })}
                        className={`flex-1 py-0.5 rounded-md border cursor-pointer transition-colors ${
                          active
                            ? 'bg-[#B86B35] border-[#B86B35] text-[#FFFBF5] font-semibold'
                            : 'bg-[#FAF5EC] border-[#D9CBB6] text-[#5A4738] hover:bg-[#E8DCC9]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {/* Opening selector */}
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  {(
                    [
                      { id: 'none', label: 'Solid' },
                      { id: 'window', label: 'Jendela' },
                      { id: 'arched_window', label: 'Jend. Lengkung' },
                      { id: 'curtain_window', label: 'Jend. Gorden' },
                      { id: 'bath_vent', label: 'Bouvenlight' },
                      { id: 'door', label: 'Pintu Kayu' },
                      { id: 'double_door', label: 'Pintu Ganda' },
                      { id: 'wood_slider', label: 'Geser Kayu' },
                      { id: 'archway', label: 'Lengkungan' },
                      { id: 'glass_slider', label: 'Geser Kaca' },
                    ] as { id: WallOpeningType; label: string }[]
                  ).map((op) => {
                    const active = (selectedWall.opening || 'none') === op.id;
                    return (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => onUpdateCustomWall(selectedWall.id, { opening: op.id })}
                        className={`py-0.5 px-1.5 rounded-md border cursor-pointer transition-colors truncate ${
                          active
                            ? 'bg-[#467255]/18 border-[#467255]/55 text-[#2D4F39] font-semibold'
                            : 'bg-[#FAF5EC] border-[#D9CBB6] text-[#5A4738] hover:bg-[#E8DCC9]'
                        }`}
                      >
                        {op.label}
                      </button>
                    );
                  })}
                </div>

                {/* 4-Way Nudge Pad (0.5m) */}
                <div className="flex items-center justify-between gap-1 bg-[#FAF5EC] border border-[#D9CBB6] rounded-lg px-2 py-1">
                  <span className="text-[10px] text-[#7D6754] font-medium">Geser 0.5m</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onUpdateCustomWall(selectedWall.id, { dx: -0.5 })}
                      title="Geser Kiri (West)"
                      className="p-1 rounded hover:bg-[#E8DCC9] text-[#33261D] cursor-pointer"
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateCustomWall(selectedWall.id, { dz: -0.5 })}
                      title="Geser Atas (North)"
                      className="p-1 rounded hover:bg-[#E8DCC9] text-[#33261D] cursor-pointer"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateCustomWall(selectedWall.id, { dz: 0.5 })}
                      title="Geser Bawah (South)"
                      className="p-1 rounded hover:bg-[#E8DCC9] text-[#33261D] cursor-pointer"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateCustomWall(selectedWall.id, { dx: 0.5 })}
                      title="Geser Kanan (East)"
                      className="p-1 rounded hover:bg-[#E8DCC9] text-[#33261D] cursor-pointer"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Primary Actions */}
                <div className="grid grid-cols-4 gap-1">
                  <button
                    type="button"
                    onClick={onStartMoveCustomWall}
                    title="Klik posisi baru di lahan untuk pindahkan tembok (M)"
                    className={`py-1 px-1.5 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
                      tool.movingCustomWallId === selectedWall.id
                        ? 'bg-[#B86B35] text-[#FFFBF5]'
                        : 'bg-[#FAF5EC] hover:bg-[#E8DCC9] border border-[#D9CBB6] text-[#33261D]'
                    }`}
                  >
                    <Move className="w-3 h-3 shrink-0" />
                    <span>{tool.movingCustomWallId === selectedWall.id ? 'Click' : 'Move'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateCustomWall(selectedWall.id, { deltaAngleDeg: 90 })}
                    title="Putar Tembok 90° (Q/E/R)"
                    className="py-1 px-1.5 rounded-lg bg-[#FAF5EC] hover:bg-[#E8DCC9] border border-[#D9CBB6] text-[11px] font-medium text-[#33261D] flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <RotateCw className="w-3 h-3 text-[#B86B35] shrink-0" />
                    <span>90°</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onCloneCustomWall(selectedWall.id)}
                    title="Duplikat Tembok (Shift+D)"
                    className="py-1 px-1.5 rounded-lg bg-[#FAF5EC] hover:bg-[#E8DCC9] border border-[#D9CBB6] text-[11px] font-medium text-[#33261D] flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <Copy className="w-3 h-3 text-[#B86B35] shrink-0" />
                    <span>Clone</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteCustomWall(selectedWall.id)}
                    title="Hapus Tembok (Del)"
                    className="py-1 px-1.5 rounded-lg bg-[#B54B40]/12 hover:bg-[#B54B40]/22 border border-[#B54B40]/30 text-[11px] font-medium text-[#8A3229] flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <Trash2 className="w-3 h-3 shrink-0" />
                    <span>Del</span>
                  </button>
                </div>
              </div>
            )}

            {/* CONTEXTUAL ROOM / BUILDING INSPECTOR (Move, Center, Rotate, Resize, Wall Height) */}
            {selectedRoom &&
              !selectedItem &&
              !selectedWall &&
              !(tool.tab === 'surfaces' && tool.surfaceTarget === 'lighting') && (
              <div className="px-3 py-2.5 bg-[#F1E8DA] border-b border-[#DFD2BE] space-y-2 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-[#33261D] block truncate">
                      {tool.roomEditScope === 'building'
                        ? `Seluruh Bangunan (${score.rooms.length} Ruang)`
                        : selectedRoomCustomName || `Ruang ${selectedRoom.id} · ${selectedRoom.zone}`}
                    </span>
                    {selectedRoomBounds && (
                      <span className="font-mono-num text-[10px] text-[#9C5422] font-semibold">
                        {selectedRoomBounds.width}×{selectedRoomBounds.depth} m ·{' '}
                        {tool.roomEditScope === 'building' ? score.floorArea : selectedRoom.area} m²
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateTool({ selectedRoomId: null, movingRoomScope: null })
                    }
                    title="Batalkan Pilihan Ruang (Esc)"
                    className="p-0.5 rounded-md text-[#7D6754] hover:text-[#33261D] hover:bg-[#E5D9C7] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Custom Room Name Editor */}
                {tool.roomEditScope === 'room' && (
                  <div className="flex items-center gap-1 bg-[#FAF5EC] border border-[#D9CBB6] rounded-lg px-2 py-1 text-[11px]">
                    <Tag className="w-3 h-3 text-[#B86B35] shrink-0" />
                    <input
                      type="text"
                      value={roomNameDraft}
                      onChange={(e) => setRoomNameDraft(e.target.value.slice(0, 32))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onRenameRoom(selectedRoom.id, roomNameDraft);
                        }
                      }}
                      placeholder="Beri nama (mis. Kamar Utama)..."
                      className="flex-1 min-w-0 bg-transparent text-[#33261D] font-medium focus:outline-none placeholder:text-[#9C846E]"
                    />
                    <button
                      type="button"
                      onClick={() => onRenameRoom(selectedRoom.id, roomNameDraft)}
                      className="px-2 py-0.5 rounded-md bg-[#B86B35] hover:bg-[#A35C2B] text-[#FFFBF5] text-[10px] font-semibold cursor-pointer shrink-0"
                    >
                      Simpan
                    </button>
                  </div>
                )}

                {/* Scope Toggle: This Room vs Whole Building */}
                <div className="grid grid-cols-2 gap-1 bg-[#E5D9C7] p-0.5 rounded-lg text-[10px] font-semibold">
                  <button
                    type="button"
                    onClick={() => onUpdateTool({ roomEditScope: 'room', movingRoomScope: null })}
                    className={`py-1 rounded-md cursor-pointer transition-colors ${
                      tool.roomEditScope === 'room'
                        ? 'bg-[#FAF5EC] text-[#33261D] shadow-xs'
                        : 'text-[#6B5644] hover:text-[#33261D]'
                    }`}
                  >
                    Ruang Ini
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateTool({ roomEditScope: 'building', movingRoomScope: null })
                    }
                    className={`py-1 rounded-md cursor-pointer transition-colors ${
                      tool.roomEditScope === 'building'
                        ? 'bg-[#467255] text-[#FFFBF5] shadow-xs'
                        : 'text-[#6B5644] hover:text-[#33261D]'
                    }`}
                  >
                    Seluruh Rumah
                  </button>
                </div>

                {/* 4-Way Shift Pad (1m) + Click-to-Move + Center in Lot */}
                <div className="flex items-center justify-between gap-1 bg-[#FAF5EC] border border-[#D9CBB6] rounded-lg px-2 py-1">
                  <span className="text-[10px] text-[#7D6754] font-medium">Geser 1m</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onShiftRoom(-1, 0)}
                      title="Geser Kiri 1m (West)"
                      className="p-1 rounded hover:bg-[#E8DCC9] text-[#33261D] cursor-pointer"
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onShiftRoom(0, -1)}
                      title="Geser Atas 1m (North)"
                      className="p-1 rounded hover:bg-[#E8DCC9] text-[#33261D] cursor-pointer"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onShiftRoom(0, 1)}
                      title="Geser Bawah 1m (South)"
                      className="p-1 rounded hover:bg-[#E8DCC9] text-[#33261D] cursor-pointer"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onShiftRoom(1, 0)}
                      title="Geser Kanan 1m (East)"
                      className="p-1 rounded hover:bg-[#E8DCC9] text-[#33261D] cursor-pointer"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Resize Room W & D + Room Wall Height */}
                <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono-num">
                  {tool.roomEditScope === 'room' ? (
                    <div className="flex items-center justify-between bg-[#FAF5EC] border border-[#D9CBB6] rounded-lg px-1.5 py-1">
                      <span className="text-[#7D6754]">W</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onResizeSelectedRoom(-1, 0)}
                          className="w-4 h-4 rounded hover:bg-[#EAE0CE] text-[#33261D] cursor-pointer"
                          title="Kurangi Lebar 1m"
                        >
                          −
                        </button>
                        <span className="text-[#33261D] font-semibold">
                          {selectedRoomBounds?.width ?? 0}m
                        </span>
                        <button
                          type="button"
                          onClick={() => onResizeSelectedRoom(1, 0)}
                          className="w-4 h-4 rounded hover:bg-[#EAE0CE] text-[#33261D] cursor-pointer"
                          title="Tambah Lebar 1m"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={onCenterRoom}
                      className="flex items-center justify-center gap-1 bg-[#467255]/14 hover:bg-[#467255]/24 border border-[#467255]/40 rounded-lg px-1.5 py-1 text-[10px] font-semibold text-[#2D4F39] cursor-pointer"
                    >
                      <Crosshair className="w-3 h-3" />
                      <span>Center in Lot</span>
                    </button>
                  )}

                  {tool.roomEditScope === 'room' ? (
                    <div className="flex items-center justify-between bg-[#FAF5EC] border border-[#D9CBB6] rounded-lg px-1.5 py-1">
                      <span className="text-[#7D6754]">D</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onResizeSelectedRoom(0, -1)}
                          className="w-4 h-4 rounded hover:bg-[#EAE0CE] text-[#33261D] cursor-pointer"
                          title="Kurangi Panjang 1m"
                        >
                          −
                        </button>
                        <span className="text-[#33261D] font-semibold">
                          {selectedRoomBounds?.depth ?? 0}m
                        </span>
                        <button
                          type="button"
                          onClick={() => onResizeSelectedRoom(0, 1)}
                          className="w-4 h-4 rounded hover:bg-[#EAE0CE] text-[#33261D] cursor-pointer"
                          title="Tambah Panjang 1m"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-[#FAF5EC] border border-[#D9CBB6] rounded-lg px-1.5 py-1">
                      <span className="text-[#7D6754]">H</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateSite({
                              wallHeight: Math.max(1.5, Number((roomWallHeight - 0.2).toFixed(2))),
                            })
                          }
                          className="w-4 h-4 rounded hover:bg-[#EAE0CE] text-[#33261D] cursor-pointer"
                        >
                          −
                        </button>
                        <span className="text-[#33261D] font-semibold">
                          {roomWallHeight.toFixed(1)}m
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateSite({
                              wallHeight: Math.min(5.0, Number((roomWallHeight + 0.2).toFixed(2))),
                            })
                          }
                          className="w-4 h-4 rounded hover:bg-[#EAE0CE] text-[#33261D] cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Room Wall Height bar when editing single room */}
                {tool.roomEditScope === 'room' && (
                  <div className="flex items-center justify-between bg-[#FAF5EC] border border-[#D9CBB6] rounded-lg px-2 py-1 text-[11px] font-mono-num">
                    <span className="text-[#7D6754]">Wall Height</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateSite({
                            wallHeight: Math.max(1.5, Number((roomWallHeight - 0.2).toFixed(2))),
                          })
                        }
                        className="w-4 h-4 rounded hover:bg-[#EAE0CE] text-[#33261D] cursor-pointer"
                        title="Lower room walls ([)"
                      >
                        −
                      </button>
                      <span className="w-10 text-center text-[#33261D] font-semibold">
                        {roomWallHeight.toFixed(2)}m
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateSite({
                            wallHeight: Math.min(5.0, Number((roomWallHeight + 0.2).toFixed(2))),
                          })
                        }
                        className="w-4 h-4 rounded hover:bg-[#EAE0CE] text-[#33261D] cursor-pointer"
                        title="Raise room walls (])"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {/* Room Zone Quick Switcher */}
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  {ROOM_ZONES.map((z) => {
                    const active = selectedRoom.zone === z.id;
                    return (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => onChangeRoomZone(z.id as RoomZoneId)}
                        className={`py-0.5 px-1 rounded-md border flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                          active
                            ? 'bg-[#B86B35]/15 border-[#B86B35] text-[#33261D] font-semibold'
                            : 'bg-[#FAF5EC] border-[#D9CBB6] text-[#5A4738] hover:bg-[#E8DCC9]'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: z.color }}
                        />
                        <span className="truncate">{z.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-4 gap-1">
                  <button
                    type="button"
                    onClick={onStartMoveRoom}
                    title="Klik titik tujuan di lahan untuk geser ruangan (M)"
                    className={`py-1 px-1.5 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
                      tool.movingRoomScope
                        ? 'bg-[#B86B35] text-[#FFFBF5]'
                        : 'bg-[#FAF5EC] hover:bg-[#E8DCC9] border border-[#D9CBB6] text-[#33261D]'
                    }`}
                  >
                    <Move className="w-3 h-3 shrink-0" />
                    <span>{tool.movingRoomScope ? 'Click' : 'Move'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onCenterRoom}
                    title="Pusatkan ke tengah lahan"
                    className="py-1 px-1.5 rounded-lg bg-[#FAF5EC] hover:bg-[#E8DCC9] border border-[#D9CBB6] text-[11px] font-medium text-[#33261D] flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <Crosshair className="w-3 h-3 text-[#467255] shrink-0" />
                    <span>Center</span>
                  </button>
                  <button
                    type="button"
                    onClick={onRotateRoom}
                    title="Putar Ruangan 90° (R)"
                    className="py-1 px-1.5 rounded-lg bg-[#FAF5EC] hover:bg-[#E8DCC9] border border-[#D9CBB6] text-[11px] font-medium text-[#33261D] flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <RotateCw className="w-3 h-3 text-[#B86B35] shrink-0" />
                    <span>90°</span>
                  </button>
                  <button
                    type="button"
                    onClick={onDeleteSelectedRoom}
                    title="Hapus Ruangan (Del)"
                    className="py-1 px-1.5 rounded-lg bg-[#B54B40]/12 hover:bg-[#B54B40]/22 border border-[#B54B40]/30 text-[11px] font-medium text-[#8A3229] flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <Trash2 className="w-3 h-3 shrink-0" />
                    <span>Del</span>
                  </button>
                </div>
              </div>
            )}

            {/* SCROLLABLE SIDE PANEL CONTENT BODY */}
            <div className="flex-1 min-h-0 overflow-y-auto dock-scroll p-3 space-y-3">
              {/* TAB 1: SELECT & KEYBOARD CONTROLS GUIDE */}
              {tool.tab === 'select' && (
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-[#33261D]">
                      Select Furniture, Walls &amp; Rooms
                    </p>
                    <p className="text-[11px] text-[#6B5644] leading-relaxed">
                      Klik furniture, tembok custom, atau lantai ruangan untuk menggeser (↑↓←→ / M),
                      mengatur panjang/lebar, tinggi tembok, ketebalan, dan rotasi.
                    </p>
                  </div>

                  {/* Room Quality Breakdown */}
                  <div className="grid grid-cols-2 gap-1.5 font-mono-num">
                    <div className="bg-[#F1E8DA] border border-[#DFD2BE] rounded-xl px-2.5 py-2">
                      <span className="text-[11px] text-[#7D6754] block">Comfort</span>
                      <span className="text-sm font-semibold text-[#33261D]">{score.comfort}/100</span>
                    </div>
                    <div className="bg-[#F1E8DA] border border-[#DFD2BE] rounded-xl px-2.5 py-2">
                      <span className="text-[11px] text-[#7D6754] block">Harmony</span>
                      <span className="text-sm font-semibold text-[#33261D]">{score.harmony}/100</span>
                    </div>
                    <div className="bg-[#F1E8DA] border border-[#DFD2BE] rounded-xl px-2.5 py-2">
                      <span className="text-[11px] text-[#7D6754] block">Lighting</span>
                      <span className="text-sm font-semibold text-[#33261D]">{score.lighting}/100</span>
                    </div>
                    <div className="bg-[#F1E8DA] border border-[#DFD2BE] rounded-xl px-2.5 py-2">
                      <span className="text-[11px] text-[#7D6754] block">Flow</span>
                      <span className="text-sm font-semibold text-[#33261D]">{score.flow}/100</span>
                    </div>
                  </div>

                  {/* Clean Keyboard Controls Reference */}
                  <div className="space-y-1.5 pt-1 border-t border-[#E5D9C7]">
                    <p className="text-xs font-semibold text-[#33261D]">Keyboard Controls</p>
                    <div className="space-y-1">
                      {KEYBOARD_GUIDE.map((item) => (
                        <div
                          key={item.keys}
                          className="flex items-center justify-between gap-2 text-[11px] py-0.5"
                        >
                          <span className="font-mono-num font-semibold text-[#9C5422] whitespace-nowrap shrink-0">
                            {item.keys}
                          </span>
                          <span className="text-[#5A4738] text-right leading-tight">{item.action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SITE LAND PLOT, FOUNDATION & FLOOR PLAN */}
              {tool.tab === 'layout' && (
                <div className="space-y-3">
                  {/* Step 1: Land Plot Size & Area (Lahan — dalam Meter) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-[#33261D]">
                        1. Land Plot / Lahan <span className="text-[#7D6754] font-normal">(meter)</span>
                      </p>
                      <span className="text-[11px] font-mono-num text-[#9C5422] font-semibold">
                        {parsedLandW * parsedLandD} m²
                      </span>
                    </div>
                    <div className="flex items-center gap-1 bg-[#F1E8DA] border border-[#D9CBB6] rounded-xl px-2 py-1 text-xs font-mono-num">
                      <span className="text-[#7D6754]">W</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label="Land width in meters"
                        value={landWText}
                        onChange={(e) => setLandWText(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') applyLandDimensions();
                        }}
                        className="w-9 bg-[#FAF5EC] border border-[#DDD0BC] rounded-md px-1 py-0.5 text-center text-[#33261D] font-semibold focus:outline-none focus:border-[#B86B35]"
                      />
                      <span className="text-[10px] text-[#7D6754]">m</span>
                      <span className="text-[#A8947D] px-0.5">×</span>
                      <span className="text-[#7D6754]">D</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label="Land depth in meters"
                        value={landDText}
                        onChange={(e) => setLandDText(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') applyLandDimensions();
                        }}
                        className="w-9 bg-[#FAF5EC] border border-[#DDD0BC] rounded-md px-1 py-0.5 text-center text-[#33261D] font-semibold focus:outline-none focus:border-[#B86B35]"
                      />
                      <span className="text-[10px] text-[#7D6754]">m</span>
                      <button
                        type="button"
                        onClick={applyLandDimensions}
                        className="ml-auto px-2.5 py-1 rounded-lg bg-[#B86B35] hover:bg-[#A35C2B] text-[#FFFBF5] font-semibold text-[11px] cursor-pointer whitespace-nowrap"
                      >
                        Set Land
                      </button>
                    </div>
                    <p className="text-[10px] text-[#7D6754]">
                      Satuan meter ({MIN_LAND_SIZE}–{MAX_LAND_SIZE} m) · 1 kotak grid = 1 × 1 m
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={onTogglePlanView}
                        className={`flex-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border cursor-pointer transition-colors ${
                          isPlanView
                            ? 'bg-[#B86B35] border-[#B86B35] text-[#FFFBF5]'
                            : 'bg-[#F1E8DA] border-[#D9CBB6] text-[#33261D] hover:bg-[#E8DCC9]'
                        }`}
                      >
                        {isPlanView ? 'Keluar Denah 2D' : 'Buka Denah 2D'}
                      </button>
                      <button
                        type="button"
                        onClick={onBlankCanvas}
                        title="Kosongkan bangunan untuk merancang dari lahan kosong"
                        className="px-2.5 py-1.5 rounded-xl bg-[#B54B40]/12 hover:bg-[#B54B40]/20 border border-[#B54B40]/35 text-[11px] font-semibold text-[#8A3229] flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        <FilePlus2 className="w-3.5 h-3.5" />
                        <span>Lahan Kosong</span>
                      </button>
                    </div>
                  </div>

                  {/* Multi-Lantai / Tingkat Bangunan (1–3 Lantai) */}
                  <div className="space-y-2 pt-2.5 border-t border-[#E5D9C7]">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-[#33261D]">
                        Tingkat / Multi-Lantai
                      </p>
                      <span className="text-[10px] font-mono-num text-[#9C5422] font-semibold">
                        Aktif: Lantai {activeFloorIdx + 1} / {floorCount}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 font-mono-num text-[11px]">
                      {Array.from({ length: floorCount }).map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => onSwitchFloor(idx)}
                          className={`py-1.5 rounded-lg border font-semibold cursor-pointer transition-colors ${
                            activeFloorIdx === idx
                              ? 'bg-[#B86B35] border-[#B86B35] text-[#FFFBF5]'
                              : 'bg-[#F1E8DA] border-[#DDD0BC] text-[#5A4738] hover:bg-[#E8DCC9]'
                          }`}
                        >
                          Lantai {idx + 1}
                        </button>
                      ))}
                    </div>

                    {floorCount < MAX_FLOORS && (
                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => onAddUpperFloor(true)}
                          className="py-1.5 px-2 rounded-lg bg-[#467255]/14 hover:bg-[#467255]/24 border border-[#467255]/40 text-[#2D4F39] font-semibold cursor-pointer transition-colors whitespace-nowrap"
                        >
                          + Lt.{floorCount + 1} (Salin Denah)
                        </button>
                        <button
                          type="button"
                          onClick={() => onAddUpperFloor(false)}
                          className="py-1.5 px-2 rounded-lg bg-[#F1E8DA] hover:bg-[#E8DCC9] border border-[#D9CBB6] text-[#33261D] font-medium cursor-pointer transition-colors whitespace-nowrap"
                        >
                          + Lt.{floorCount + 1} (Kosong)
                        </button>
                      </div>
                    )}

                    {floorCount > 1 && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={onToggleUpperFloors}
                          className={`flex-1 py-1 px-2 rounded-lg border font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                            showUpperFloors
                              ? 'bg-[#467255]/12 border-[#467255]/40 text-[#2D4F39]'
                              : 'bg-[#F1E8DA] border-[#D9CBB6] text-[#5A4738]'
                          }`}
                        >
                          {showUpperFloors ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          <span>{showUpperFloors ? 'Lantai Atas Tampil' : 'Lantai Atas Sembunyi'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={onRemoveTopFloor}
                          title={`Hapus Lantai ${floorCount}`}
                          className="px-2 py-1 rounded-lg bg-[#B54B40]/12 hover:bg-[#B54B40]/22 border border-[#B54B40]/30 text-[#8A3229] font-semibold cursor-pointer whitespace-nowrap"
                        >
                          Hapus Lt.{floorCount}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Step 2: Foundation Style, Elevation & Building Footprint (Pondasi) */}
                  <div className="space-y-2 pt-2.5 border-t border-[#E5D9C7]">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-[#33261D]">
                        2. Foundation (Pondasi)
                      </p>
                      <span className="text-[10px] font-mono-num text-[#6B5644]">
                        Built {score.floorArea} m² ({coveragePct}%)
                      </span>
                    </div>

                    {/* Foundation Material */}
                    <div className="grid grid-cols-2 gap-1">
                      {FOUNDATION_STYLES.map((fs) => {
                        const active = site.foundationStyle === fs.id;
                        return (
                          <button
                            key={fs.id}
                            type="button"
                            onClick={() => onUpdateSite({ foundationStyle: fs.id as FoundationStyle })}
                            className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
                              active
                                ? 'bg-[#B86B35]/15 border-[#B86B35] text-[#33261D] font-semibold'
                                : 'bg-[#F1E8DA] border-[#DDD0BC] text-[#5A4738] hover:border-[#C2AE93]'
                            }`}
                          >
                            <span
                              className="w-3 h-3 rounded-sm border border-[#33261D]/20 shrink-0"
                              style={{ backgroundColor: fs.preview }}
                            />
                            <span className="truncate">{fs.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Foundation Height */}
                    <div className="grid grid-cols-3 gap-1 text-[11px] font-mono-num">
                      {[
                        { label: 'Low 16cm', h: 0.16 },
                        { label: 'Mid 30cm', h: 0.3 },
                        { label: 'High 52cm', h: 0.52 },
                      ].map((opt) => {
                        const active = Math.abs(site.foundationHeight - opt.h) < 0.05;
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => onUpdateSite({ foundationHeight: opt.h })}
                            className={`py-1 rounded-lg border cursor-pointer transition-colors ${
                              active
                                ? 'bg-[#467255]/16 border-[#467255]/50 text-[#2D4F39] font-semibold'
                                : 'bg-[#F1E8DA] border-[#DDD0BC] text-[#5A4738] hover:bg-[#E8DCC9]'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Quick Foundation Footprint Box (meters inside Land) */}
                    <div className="flex items-center gap-1 bg-[#F1E8DA] border border-[#D9CBB6] rounded-xl px-2 py-1 text-xs font-mono-num">
                      <span className="text-[#7D6754]">W</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label="Foundation width in meters"
                        value={dimWText}
                        onChange={(e) => setDimWText(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') applyFoundationBox();
                        }}
                        className="w-9 bg-[#FAF5EC] border border-[#DDD0BC] rounded-md px-1 py-0.5 text-center text-[#33261D] font-semibold focus:outline-none focus:border-[#467255]"
                      />
                      <span className="text-[10px] text-[#7D6754]">m</span>
                      <span className="text-[#A8947D] px-0.5">×</span>
                      <span className="text-[#7D6754]">D</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label="Foundation depth in meters"
                        value={dimDText}
                        onChange={(e) => setDimDText(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') applyFoundationBox();
                        }}
                        className="w-9 bg-[#FAF5EC] border border-[#DDD0BC] rounded-md px-1 py-0.5 text-center text-[#33261D] font-semibold focus:outline-none focus:border-[#467255]"
                      />
                      <span className="text-[10px] text-[#7D6754]">m</span>
                      <button
                        type="button"
                        onClick={applyFoundationBox}
                        className="ml-auto px-2.5 py-1 rounded-lg bg-[#467255] hover:bg-[#3A6047] text-[#FFFBF5] font-semibold text-[11px] cursor-pointer whitespace-nowrap"
                      >
                        Pour Box
                      </button>
                    </div>
                  </div>

                  {/* Step 3: Draw Floor Plan, Walls, Zones, Doors & Windows */}
                  <div className="space-y-2 pt-2.5 border-t border-[#E5D9C7]">
                    <p className="text-[11px] font-semibold text-[#33261D]">
                      3. Floor Plan, Walls &amp; Openings
                    </p>

                    {tool.layoutSubTool === 'wall_draw' && (
                      <div className="bg-[#F1E8DA] border border-[#B86B35]/55 rounded-xl p-2.5 space-y-1 text-xs">
                        <div className="flex items-center justify-between font-mono-num">
                          <span className="text-[#9C5422] font-semibold">
                            {wallDrawStatus.active ? 'Drawing Wall' : 'Draw Wall Ready'}
                          </span>
                          <span className="text-[#33261D] font-semibold">
                            {wallDrawStatus.active && wallDrawStatus.lengthM > 0
                              ? `${wallDrawStatus.lengthM.toFixed(2)} m · ${wallDrawStatus.angleDeg}°`
                              : `Snap ${wallDrawOptions.snapStepM}m · ${wallDrawOptions.orthoLock ? '90°' : 'Free'}`}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6B5644]">
                          {wallDrawStatus.active
                            ? 'Klik sudut berikutnya untuk menyambung · Klik Kanan / Esc untuk selesai.'
                            : 'Klik titik awal di grid lahan · Gunakan bar Draw Wall di bawah untuk atur snap & panjang.'}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-1.5">
                      {layoutTools.map((lt) => (
                        <button
                          key={lt.id}
                          type="button"
                          onClick={() => onUpdateTool({ layoutSubTool: lt.id })}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap ${
                            tool.layoutSubTool === lt.id
                              ? 'bg-[#B86B35]/15 border-[#B86B35] text-[#33261D] font-semibold'
                              : 'bg-[#F1E8DA] border-[#DDD0BC] text-[#5A4738] hover:border-[#C2AE93] hover:text-[#33261D]'
                          }`}
                        >
                          {lt.icon}
                          <span className="truncate">{lt.label}</span>
                        </button>
                      ))}
                    </div>

                    {tool.layoutSubTool === 'zone_paint' && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[11px] font-semibold text-[#6B5644]">Room Zone</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {ROOM_ZONES.map((z) => (
                            <button
                              key={z.id}
                              type="button"
                              onClick={() => onUpdateTool({ activeZone: z.id as RoomZoneId })}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border cursor-pointer transition-colors ${
                                tool.activeZone === z.id
                                  ? 'bg-[#B86B35]/14 border-[#B86B35] text-[#33261D] font-semibold'
                                  : 'bg-[#F1E8DA] border-[#DDD0BC] text-[#5A4738] hover:text-[#33261D]'
                              }`}
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-sm shrink-0 border border-[#33261D]/15"
                                style={{ backgroundColor: z.color }}
                              />
                              <span>{z.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {(blueprint.customWalls?.length || 0) >= 3 && (
                      <button
                        type="button"
                        onClick={onFillFloorInsideWalls}
                        title="Auto-fill foundation & floor inside closed drawn walls"
                        className="w-full px-2.5 py-1.5 rounded-xl bg-[#467255]/14 hover:bg-[#467255]/24 border border-[#467255]/40 text-[11px] font-semibold text-[#2D4F39] cursor-pointer whitespace-nowrap"
                      >
                        Auto-Fill Floor Inside Drawn Walls
                      </button>
                    )}

                    {/* Room Wall Height & Mirror Floorplan Quick Bar */}
                    <div className="flex items-center justify-between gap-1.5 bg-[#F1E8DA] border border-[#D9CBB6] rounded-xl px-2.5 py-1.5 text-[11px] font-mono-num">
                      <span className="text-[#5A4738] font-medium">Tinggi Dinding</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateSite({
                              wallHeight: Math.max(1.5, Number((roomWallHeight - 0.2).toFixed(2))),
                            })
                          }
                          className="w-5 h-5 rounded bg-[#FAF5EC] hover:bg-[#E8DCC9] border border-[#DDD0BC] text-[#33261D] cursor-pointer"
                          title="Turunkan tinggi dinding ruangan"
                        >
                          −
                        </button>
                        <span className="w-11 text-center text-[#33261D] font-semibold">
                          {roomWallHeight.toFixed(2)}m
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateSite({
                              wallHeight: Math.min(5.0, Number((roomWallHeight + 0.2).toFixed(2))),
                            })
                          }
                          className="w-5 h-5 rounded bg-[#FAF5EC] hover:bg-[#E8DCC9] border border-[#DDD0BC] text-[#33261D] cursor-pointer"
                          title="Naikkan tinggi dinding ruangan"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Balik Denah (Mirror / Flip Horizontal & Vertical) */}
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => onMirrorBlueprint('x')}
                        title="Cerminkan seluruh denah Kiri ↔ Kanan"
                        className="py-1.5 px-2 rounded-xl bg-[#F1E8DA] hover:bg-[#E8DCC9] border border-[#D9CBB6] text-[#33261D] font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                      >
                        <FlipHorizontal2 className="w-3.5 h-3.5 text-[#B86B35]" />
                        <span>Balik Kiri↔Kanan</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onMirrorBlueprint('z')}
                        title="Cerminkan seluruh denah Depan ↕ Belakang"
                        className="py-1.5 px-2 rounded-xl bg-[#F1E8DA] hover:bg-[#E8DCC9] border border-[#D9CBB6] text-[#33261D] font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                      >
                        <FlipVertical2 className="w-3.5 h-3.5 text-[#B86B35]" />
                        <span>Balik Depan↕Blk</span>
                      </button>
                    </div>

                    {/* 4. Roof / Atap */}
                    <div className="space-y-1.5 pt-2 border-t border-[#E5D9C7]">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[11px] font-semibold text-[#33261D]">
                          4. Roof / Atap
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onUpdateSite({ showCeiling: !site.showCeiling })}
                            title="Toggle Interior Ceiling Plafond"
                            className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold cursor-pointer transition-colors ${
                              site.showCeiling
                                ? 'bg-[#467255]/14 border-[#467255]/45 text-[#2D4F39]'
                                : 'bg-[#F1E8DA] border-[#DDD0BC] text-[#6B5644]'
                            }`}
                          >
                            Plafond {site.showCeiling ? 'On' : 'Off'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const turningOn = !(site.showRoof && site.roofStyle !== 'none');
                              onUpdateSite(
                                turningOn
                                  ? {
                                      showRoof: true,
                                      roofStyle:
                                        site.roofStyle === 'none' ? 'gable' : site.roofStyle,
                                    }
                                  : { showRoof: false },
                              );
                            }}
                            className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold cursor-pointer transition-colors ${
                              site.showRoof && site.roofStyle !== 'none'
                                ? 'bg-[#B86B35] border-[#B86B35] text-[#FFFBF5]'
                                : 'bg-[#F1E8DA] border-[#DDD0BC] text-[#5A4738]'
                            }`}
                          >
                            {site.showRoof && site.roofStyle !== 'none' ? 'Roof On' : 'Roof Off'}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        {ROOF_STYLES.map((rs) => {
                          const active = site.roofStyle === rs.id && site.showRoof;
                          return (
                            <button
                              key={rs.id}
                              type="button"
                              onClick={() =>
                                onUpdateSite({
                                  roofStyle: rs.id as RoofStyle,
                                  showRoof: true,
                                })
                              }
                              className={`px-2 py-1.5 rounded-lg border text-left transition-colors cursor-pointer ${
                                active
                                  ? 'bg-[#B86B35]/14 border-[#B86B35] text-[#33261D]'
                                  : 'bg-[#F1E8DA] border-[#DDD0BC] hover:border-[#C2AE93] text-[#4E3D2F]'
                              }`}
                            >
                              <div className="text-[11px] font-semibold truncate">{rs.name}</div>
                              <div className="text-[9px] text-[#7D6654] truncate">{rs.subtitle}</div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between gap-2 bg-[#F1E8DA] border border-[#DDD0BC] rounded-lg px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          {ROOF_COLORS.map((rc) => {
                            const activeRoofColor = (site.roofColor ?? '#A65438').toLowerCase();
                            return (
                              <button
                                key={rc.hex}
                                type="button"
                                onClick={() =>
                                  onUpdateSite({
                                    roofColor: rc.hex,
                                    showRoof: true,
                                    roofStyle: site.roofStyle === 'none' ? 'gable' : site.roofStyle,
                                  })
                                }
                                title={rc.name}
                                className={`w-4.5 h-4.5 rounded-md border transition-transform cursor-pointer ${
                                  activeRoofColor === rc.hex.toLowerCase()
                                    ? 'border-[#33261D] scale-110 ring-1 ring-[#B86B35]'
                                    : 'border-[#33261D]/25 hover:scale-105'
                                }`}
                                style={{ backgroundColor: rc.hex }}
                              />
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-1 font-mono-num text-[11px]">
                          <span className="text-[10px] text-[#7A6351] mr-0.5">Pitch</span>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateSite({
                                roofPitch: Math.max(
                                  0.6,
                                  Number(((site.roofPitch ?? 1.5) - 0.2).toFixed(1)),
                                ),
                              })
                            }
                            className="w-5 h-5 rounded bg-[#FAF5EC] hover:bg-[#E8DCC9] border border-[#DDD0BC] text-[#33261D] cursor-pointer"
                            title="Lower roof pitch"
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-[#33261D] font-semibold">
                            {(site.roofPitch ?? 1.5).toFixed(1)}m
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateSite({
                                roofPitch: Math.min(
                                  3.2,
                                  Number(((site.roofPitch ?? 1.5) + 0.2).toFixed(1)),
                                ),
                              })
                            }
                            className="w-5 h-5 rounded bg-[#FAF5EC] hover:bg-[#E8DCC9] border border-[#DDD0BC] text-[#33261D] cursor-pointer"
                            title="Raise roof pitch"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 5. Tambah Modul Kamar (+1 Ruang Langsung ke Lahan) */}
                    <div className="space-y-1.5 pt-2 border-t border-[#E5D9C7]">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-semibold text-[#33261D]">
                          5. Tambah Modul Kamar (+1)
                        </span>
                        <button
                          type="button"
                          onClick={() => setStampWithFurniture((v) => !v)}
                          title="Pilih apakah modul kamar baru otomatis diisi furnitur atau kosong"
                          className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold cursor-pointer transition-colors ${
                            stampWithFurniture
                              ? 'bg-[#467255]/14 border-[#467255]/45 text-[#2D4F39]'
                              : 'bg-[#F1E8DA] border-[#DDD0BC] text-[#6B5644]'
                          }`}
                        >
                          {stampWithFurniture ? 'Isi Furnitur' : 'Ruang Kosong'}
                        </button>
                      </div>
                      <p className="text-[10px] text-[#7D6654] leading-snug">
                        Tempel langsung ke lahan kosong tanpa menghapus bangunan yang sudah ada.
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {ROOM_MODULE_PRESETS.map((mod) => (
                          <button
                            key={mod.id}
                            type="button"
                            onClick={() => onStampRoomModule(mod.id, stampWithFurniture)}
                            className="p-2 rounded-lg bg-[#F1E8DA] hover:bg-[#E8DCC9] border border-[#D9CBB6] hover:border-[#467255]/60 text-left cursor-pointer transition-colors flex flex-col gap-0.5"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[11px] font-semibold text-[#33261D] truncate flex items-center gap-1">
                                <span
                                  className="w-2 h-2 rounded-xs shrink-0"
                                  style={{ backgroundColor: mod.accentColor }}
                                />
                                <span className="truncate">{mod.name}</span>
                              </span>
                              <span className="text-[9px] font-mono-num text-[#467255] font-semibold shrink-0">
                                {mod.width}×{mod.depth}m
                              </span>
                            </div>
                            <span className="text-[9px] text-[#6B5644] leading-snug line-clamp-1">
                              {mod.subtitle}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 6. Galeri Template Denah Bangunan (16 Denah) */}
                    <div className="space-y-1.5 pt-2 border-t border-[#E5D9C7]">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#33261D]">
                          6. Template Denah ({STARTER_TEMPLATES.length})
                        </span>
                        <span className="text-[10px] text-[#7D6654]">Rumah · Kos · 2 Lantai</span>
                      </div>

                      <button
                        type="button"
                        onClick={onOpenTemplateGallery}
                        className="w-full py-2 px-3 rounded-xl bg-[#B86B35] hover:bg-[#A35C2B] text-[#FFFBF5] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>Buka Galeri {STARTER_TEMPLATES.length} Template Denah</span>
                      </button>

                      {/* 4 Quick-Pick Featured Templates */}
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['rumah_tipe_36', 'rumah_2lt_modern', 'kos_6_lorong', 'kos_2lt_8kamar'] as StarterTemplateId[])
                          .map((id) => STARTER_TEMPLATES.find((t) => t.id === id))
                          .filter((tpl): tpl is (typeof STARTER_TEMPLATES)[number] => Boolean(tpl))
                          .map((tpl) => (
                            <button
                              key={tpl.id}
                              type="button"
                              onClick={() => onApplyStarterTemplate(tpl.id, true)}
                              className="p-2 rounded-lg bg-[#F1E8DA] hover:bg-[#E8DCC9] border border-[#D9CBB6] hover:border-[#B86B35]/60 text-left cursor-pointer transition-colors flex flex-col gap-0.5"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[11px] font-semibold text-[#33261D] truncate">
                                  {tpl.name}
                                </span>
                                <span className="text-[9px] font-mono-num text-[#8C481B] shrink-0">
                                  {tpl.sizeLabel}
                                </span>
                              </div>
                              <span className="text-[9px] text-[#6B5644] leading-snug line-clamp-2">
                                {tpl.subtitle}
                              </span>
                            </button>
                          ))}
                      </div>

                      {/* Quick Blank Shape Presets */}
                      <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => onApplyRoomPreset('rect')}
                          className="py-1.5 rounded-lg bg-[#FAF5EC] hover:bg-[#E8DCC9] border border-[#D9CBB6] text-[11px] font-medium text-[#33261D] cursor-pointer"
                        >
                          8×6 Box
                        </button>
                        <button
                          type="button"
                          onClick={() => onApplyRoomPreset('lshape')}
                          className="py-1.5 rounded-lg bg-[#FAF5EC] hover:bg-[#E8DCC9] border border-[#D9CBB6] text-[11px] font-medium text-[#33261D] cursor-pointer"
                        >
                          L-Suite
                        </button>
                        <button
                          type="button"
                          onClick={() => onApplyRoomPreset('courtyard')}
                          className="py-1.5 rounded-lg bg-[#FAF5EC] hover:bg-[#E8DCC9] border border-[#D9CBB6] text-[11px] font-medium text-[#33261D] cursor-pointer"
                        >
                          Courtyard
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: FURNITURE, LIBRARY, DESKTOP, TABLETOP & CUSTOM 3D */}
              {tool.tab === 'furniture' && (
                <div className="space-y-2.5">
                  {/* Placement Mode (Free vs Snap) + Angle */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateTool({
                          placementMode: tool.placementMode === 'free' ? 'snap' : 'free',
                        })
                      }
                      title="Toggle Free Placement vs Grid Snap (G)"
                      className={`flex-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap border transition-colors ${
                        tool.placementMode === 'free'
                          ? 'bg-[#467255]/14 border-[#467255]/45 text-[#2D4F39]'
                          : 'bg-[#F1E8DA] border-[#D9CBB6] text-[#5A4738] hover:bg-[#E8DCC9]'
                      }`}
                    >
                      <Magnet className="w-3.5 h-3.5" />
                      <span>{tool.placementMode === 'free' ? 'Free Place (G)' : 'Grid Snap (G)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={onRotateAction}
                      title="Rotate Preview (Q / E / R)"
                      className="px-2.5 py-1.5 rounded-xl bg-[#F1E8DA] hover:bg-[#E8DCC9] border border-[#D9CBB6] text-xs font-medium text-[#33261D] flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-[#B86B35]" />
                      <span className="font-mono-num">
                        {tool.placementMode === 'free'
                          ? `${tool.placementAngleDeg}°`
                          : `${tool.placementRotation * 90}°`}
                      </span>
                    </button>
                  </div>

                  {/* Direct Import 3D & Custom 3D buttons */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenCustomModal('import')}
                      className="px-2.5 py-1.5 rounded-xl bg-[#B86B35]/14 hover:bg-[#B86B35]/24 border border-[#B86B35]/40 text-[11px] font-semibold text-[#8A471B] flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Upload className="w-3 h-3 text-[#B86B35]" />
                      <span>Impor 3D</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenCustomModal('create')}
                      className="px-2.5 py-1.5 rounded-xl bg-[#F1E8DA] hover:bg-[#E8DCC9] border border-[#D9CBB6] text-[11px] font-medium text-[#33261D] flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Box className="w-3 h-3 text-[#B86B35]" />
                      <span>Buat 3D</span>
                    </button>
                  </div>

                  {/* Quick Cross-Category Search Bar (115+ Assets) */}
                  <div className="flex items-center gap-1.5 bg-[#FAF5EC] border border-[#D9CBB6] focus-within:border-[#B86B35] rounded-xl px-2.5 py-1.5 text-xs">
                    <Search className="w-3.5 h-3.5 text-[#8A725E] shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari 115+ aset (AC, kulkas, toilet, kolam)..."
                      aria-label="Cari katalog furnitur dan aset 3D"
                      className="flex-1 min-w-0 bg-transparent text-[#33261D] font-medium focus:outline-none placeholder:text-[#9C846E]"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        aria-label="Hapus pencarian"
                        className="p-0.5 rounded-md text-[#7D6754] hover:text-[#33261D] hover:bg-[#EFE6D7] cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Category Filter Strip (hidden only while searching, or show match summary) */}
                  {trimmedSearch ? (
                    <div className="flex items-center justify-between text-[11px] text-[#6B5644] px-0.5">
                      <span>
                        Ditemukan <strong className="text-[#33261D]">{filteredCatalog.length}</strong> aset
                      </span>
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="text-[#9C5422] font-semibold hover:underline cursor-pointer"
                      >
                        Reset filter
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1 pt-1 border-t border-[#E5D9C7]">
                      {FURNITURE_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setActiveCategory(cat.id);
                            if (cat.id === 'custom') {
                              if (allCustomDefs[0]) {
                                onUpdateTool({ selectedFurnitureDefId: allCustomDefs[0].id });
                              }
                            } else {
                              const first = FURNITURE_CATALOG.find((f) => f.category === cat.id);
                              if (first) onUpdateTool({ selectedFurnitureDefId: first.id });
                            }
                          }}
                          className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                            activeCategory === cat.id
                              ? 'bg-[#B86B35] text-[#FFFBF5] font-semibold'
                              : 'bg-[#F1E8DA] text-[#5E4B3C] hover:text-[#33261D] hover:bg-[#E7DBC8]'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 2-Column Vertical Furniture Catalog Grid */}
                  {!trimmedSearch && activeCategory === 'custom' && filteredCatalog.length === 0 ? (
                    <div className="bg-[#F1E8DA] border border-[#D9CBB6] rounded-xl p-3 space-y-2.5 text-xs">
                      <p className="text-[#5A4738] leading-relaxed">
                        Impor model 3D <strong className="text-[#33261D]">.GLB / .GLTF / .OBJ</strong>{' '}
                        atau buat furnitur &amp; poster kustom buatanmu sendiri!
                      </p>
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenCustomModal('import')}
                          className="w-full py-1.5 rounded-lg bg-[#B86B35] hover:bg-[#A35C2B] text-[#FFFBF5] font-semibold cursor-pointer"
                        >
                          Impor .GLB / .OBJ
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenCustomModal('create')}
                          className="w-full py-1.5 rounded-lg bg-[#FAF5EC] hover:bg-[#E8DCC9] border border-[#D9CBB6] text-[#33261D] font-medium cursor-pointer"
                        >
                          Buat Aset 3D Kustom
                        </button>
                      </div>
                    </div>
                  ) : filteredCatalog.length === 0 ? (
                    <div className="bg-[#F1E8DA] border border-dashed border-[#D3C3AB] rounded-xl p-4 text-center space-y-1 text-xs">
                      <p className="font-semibold text-[#33261D]">Aset tidak ditemukan</p>
                      <p className="text-[11px] text-[#6B5644]">
                        Coba kata kunci lain seperti AC, kulkas, sofa, toilet, kolam, pagar, atau mobil.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5 pb-1">
                      {filteredCatalog.map((item) => {
                        const active = tool.selectedFurnitureDefId === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() =>
                              onUpdateTool({
                                selectedFurnitureDefId: item.id,
                                movingPlacedUid: null,
                              })
                            }
                            className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                              active
                                ? 'bg-[#B86B35]/14 border-[#B86B35] text-[#33261D]'
                                : 'bg-[#F1E8DA] border-[#DDD0BC] hover:border-[#C2AE93] text-[#33261D]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="text-[11px] font-semibold truncate">{item.name}</span>
                              <span
                                className="w-2.5 h-2.5 rounded-sm border border-[#33261D]/20 shrink-0"
                                style={{ backgroundColor: item.defaultColor }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-mono-num text-[#6B5644]">
                              <span className="truncate">
                                {item.wallMount
                                  ? 'Tempel Dinding'
                                  : item.tabletopProp
                                    ? 'Atas Meja'
                                    : `${item.width}×${item.depth}m`}
                              </span>
                              {item.emitsLight && (
                                <span className="text-[#9C5422] font-semibold">Lampu</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: SURFACES (WALL PAINT, FLOORS & SECONDARY ROOM LIGHTING PANEL) */}
              {tool.tab === 'surfaces' && (() => {
                const lightingRoom =
                  (tool.selectedRoomId !== null
                    ? score.rooms.find((r) => r.id === tool.selectedRoomId)
                    : null) ||
                  score.rooms[0] ||
                  null;
                const activeLightCfg = lightingRoom
                  ? getRoomLightConfig(blueprint, lightingRoom)
                  : null;
                const activeLightResolvedHex = activeLightCfg
                  ? resolveRoomLightHex(activeLightCfg)
                  : '#FFE6C4';
                const activeRoomLabel = lightingRoom
                  ? getRoomCustomName(blueprint, lightingRoom) ||
                    ROOM_ZONES.find((z) => z.id === lightingRoom.zone)?.name ||
                    `Ruang ${lightingRoom.id}`
                  : '';

                return (
                  <div className="space-y-3">
                    {/* 3-Way Sub-Panel Switcher: Walls | Floors | Lighting */}
                    <div className="grid grid-cols-3 gap-1 bg-[#E7DBC8] p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => onUpdateTool({ surfaceTarget: 'wall' })}
                        className={`py-1.5 px-1 rounded-lg text-[11px] font-medium cursor-pointer transition-colors whitespace-nowrap ${
                          tool.surfaceTarget === 'wall'
                            ? 'bg-[#FAF5EC] text-[#33261D] font-semibold shadow-xs'
                            : 'text-[#6B5644] hover:text-[#33261D]'
                        }`}
                      >
                        Walls
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateTool({ surfaceTarget: 'floor' })}
                        className={`py-1.5 px-1 rounded-lg text-[11px] font-medium cursor-pointer transition-colors whitespace-nowrap ${
                          tool.surfaceTarget === 'floor'
                            ? 'bg-[#FAF5EC] text-[#33261D] font-semibold shadow-xs'
                            : 'text-[#6B5644] hover:text-[#33261D]'
                        }`}
                      >
                        Floors
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateTool({
                            surfaceTarget: 'lighting',
                            selectedRoomId:
                              tool.selectedRoomId ?? score.rooms[0]?.id ?? null,
                            roomEditScope: 'room',
                          })
                        }
                        className={`py-1.5 px-1 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
                          tool.surfaceTarget === 'lighting'
                            ? 'bg-[#FAF5EC] text-[#33261D] font-semibold shadow-xs'
                            : 'text-[#6B5644] hover:text-[#33261D]'
                        }`}
                      >
                        <Lightbulb className="w-3 h-3 text-[#B86B35] shrink-0" />
                        <span>Lighting</span>
                      </button>
                    </div>

                    {tool.surfaceTarget === 'lighting' ? (
                      <div className="space-y-3">
                        {/* Secondary Panel Header + Quick Night Preview Toggle */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#33261D] leading-tight">
                              Room Ambiance Lighting
                            </p>
                            <p className="text-[10px] text-[#7D6754] leading-snug">
                              Select a room below or click any room in 3D.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onSetMood(mood === 'evening' ? 'golden' : 'evening')}
                            title="Switch sky mood to preview interior room lights"
                            className={`px-2 py-1 rounded-lg border text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                              mood === 'evening'
                                ? 'bg-[#33261D] border-[#33261D] text-[#FAF5EC]'
                                : 'bg-[#F1E8DA] border-[#D9CBB6] text-[#4E3D2F] hover:bg-[#E7DBC8]'
                            }`}
                          >
                            {mood === 'evening' ? (
                              <>
                                <Sun className="w-3 h-3 text-[#F2B866]" />
                                <span>Day</span>
                              </>
                            ) : (
                              <>
                                <Moon className="w-3 h-3 text-[#B86B35]" />
                                <span>Night</span>
                              </>
                            )}
                          </button>
                        </div>

                        {score.rooms.length === 0 ? (
                          <div className="bg-[#F1E8DA] border border-dashed border-[#D3C3AB] rounded-xl p-3.5 text-center space-y-1 text-xs">
                            <p className="font-semibold text-[#33261D]">No rooms detected yet</p>
                            <p className="text-[11px] text-[#6B5644]">
                              Add floor tiles or load a template in the Plan tab to control room lighting.
                            </p>
                          </div>
                        ) : (
                          <>
                            {/* Individual Room Selector List */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px] text-[#7D6754]">
                                <span className="font-semibold text-[#5A4738]">
                                  Rooms on Floor {activeFloorIdx + 1}
                                </span>
                                <span className="font-mono-num">{score.rooms.length} rooms</span>
                              </div>
                              <div className="space-y-1 max-h-36 overflow-y-auto dock-scroll pr-0.5">
                                {score.rooms.map((room) => {
                                  const cfg = getRoomLightConfig(blueprint, room);
                                  const isSelected = lightingRoom?.id === room.id;
                                  const rHex = resolveRoomLightHex(cfg);
                                  const rName =
                                    getRoomCustomName(blueprint, room) ||
                                    ROOM_ZONES.find((z) => z.id === room.zone)?.name ||
                                    `Room ${room.id}`;
                                  const isCustom = hasCustomRoomLight(blueprint, room);
                                  return (
                                    <div
                                      key={room.id}
                                      className={`flex items-center justify-between gap-1.5 rounded-xl border px-2 py-1.5 transition-colors ${
                                        isSelected
                                          ? 'bg-[#B86B35]/14 border-[#B86B35]'
                                          : 'bg-[#F1E8DA] border-[#DDD0BC] hover:border-[#C2AE93]'
                                      }`}
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onUpdateTool({
                                            selectedRoomId: room.id,
                                            roomEditScope: 'room',
                                          })
                                        }
                                        className="flex-1 min-w-0 flex items-center gap-2 text-left cursor-pointer"
                                      >
                                        <span
                                          className="w-3.5 h-3.5 rounded-full shrink-0 border border-[#33261D]/25"
                                          style={{
                                            backgroundColor: cfg.enabled ? rHex : 'transparent',
                                            opacity: cfg.enabled
                                              ? Math.max(0.35, Math.min(1, cfg.intensity / 1.2))
                                              : 0.45,
                                          }}
                                        />
                                        <div className="min-w-0">
                                          <span className="text-[11px] font-semibold text-[#33261D] block truncate">
                                            {rName}
                                          </span>
                                          <span className="text-[10px] font-mono-num text-[#7D6754] block truncate">
                                            {room.area} m² ·{' '}
                                            {cfg.enabled
                                              ? `${Math.round(cfg.intensity * 100)}% · ${cfg.kelvin}K`
                                              : 'Off'}
                                            {isCustom ? ' · Custom' : ''}
                                          </span>
                                        </div>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          onUpdateRoomLight(
                                            room.id,
                                            { enabled: !cfg.enabled },
                                            true,
                                          )
                                        }
                                        title={cfg.enabled ? 'Turn room light off' : 'Turn room light on'}
                                        className={`p-1 rounded-lg border cursor-pointer transition-colors shrink-0 ${
                                          cfg.enabled
                                            ? 'bg-[#467255]/14 border-[#467255]/40 text-[#2D4F39]'
                                            : 'bg-[#FAF5EC] border-[#D9CBB6] text-[#8C7561]'
                                        }`}
                                      >
                                        <Power className="w-3 h-3" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Selected Room Ambiance Controls */}
                            {lightingRoom && activeLightCfg && (
                              <div className="space-y-3 pt-2.5 border-t border-[#E5D9C7]">
                                {/* Active Room Header + Live Light Color Preview Strip */}
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <span className="text-xs font-semibold text-[#33261D] block truncate">
                                        {activeRoomLabel}
                                      </span>
                                      <span className="text-[10px] font-mono-num text-[#7D6754]">
                                        {activeLightCfg.enabled
                                          ? `${Math.round(activeLightCfg.intensity * 100)}% · ${activeLightCfg.kelvin}K (${getKelvinLabel(activeLightCfg.kelvin)})`
                                          : 'Light Off'}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onUpdateRoomLight(
                                          lightingRoom.id,
                                          { enabled: !activeLightCfg.enabled },
                                          true,
                                        )
                                      }
                                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shrink-0 ${
                                        activeLightCfg.enabled
                                          ? 'bg-[#467255] border-[#467255] text-[#FFFBF5]'
                                          : 'bg-[#F1E8DA] border-[#D9CBB6] text-[#6B5644]'
                                      }`}
                                    >
                                      <Power className="w-3 h-3" />
                                      <span>{activeLightCfg.enabled ? 'On' : 'Off'}</span>
                                    </button>
                                  </div>

                                  {/* Live Ambiance Gradient Bar */}
                                  <div
                                    className="h-2.5 w-full rounded-full border border-[#33261D]/15 transition-opacity"
                                    style={{
                                      background: activeLightCfg.enabled
                                        ? `linear-gradient(90deg, ${kelvinToHex(activeLightCfg.kelvin)} 0%, ${activeLightResolvedHex} 100%)`
                                        : '#DFD6C7',
                                      opacity: activeLightCfg.enabled
                                        ? Math.max(0.28, Math.min(1, activeLightCfg.intensity / 1.4))
                                        : 0.55,
                                    }}
                                  />
                                </div>

                                {/* 1. Light Intensity Control */}
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-semibold text-[#33261D] flex items-center gap-1">
                                      <Sun className="w-3.5 h-3.5 text-[#B86B35]" />
                                      <span>Intensity</span>
                                    </span>
                                    <span className="font-mono-num font-semibold text-[#9C5422]">
                                      {Math.round(activeLightCfg.intensity * 100)}%
                                    </span>
                                  </div>
                                  <input
                                    type="range"
                                    aria-label="Room light intensity"
                                    min={0}
                                    max={2.5}
                                    step={0.05}
                                    value={activeLightCfg.intensity}
                                    onChange={(e) =>
                                      onUpdateRoomLight(lightingRoom.id, {
                                        enabled: Number(e.target.value) > 0,
                                        intensity: Number(e.target.value),
                                      })
                                    }
                                    className="w-full h-1.5 accent-[#B86B35] cursor-pointer"
                                  />
                                  <div className="grid grid-cols-4 gap-1 font-mono-num text-[10px]">
                                    {[
                                      { label: 'Off', val: 0 },
                                      { label: 'Dim', val: 0.45 },
                                      { label: 'Cozy', val: 1.0 },
                                      { label: 'Bright', val: 1.85 },
                                    ].map((p) => {
                                      const active =
                                        Math.abs(activeLightCfg.intensity - p.val) < 0.06 &&
                                        (p.val === 0 ? !activeLightCfg.enabled || activeLightCfg.intensity === 0 : activeLightCfg.enabled);
                                      return (
                                        <button
                                          key={p.label}
                                          type="button"
                                          onClick={() =>
                                            onUpdateRoomLight(
                                              lightingRoom.id,
                                              { enabled: p.val > 0, intensity: p.val },
                                              true,
                                            )
                                          }
                                          className={`py-1 rounded-lg border cursor-pointer transition-colors ${
                                            active
                                              ? 'bg-[#B86B35]/16 border-[#B86B35] text-[#33261D] font-semibold'
                                              : 'bg-[#F1E8DA] border-[#DDD0BC] text-[#5A4738] hover:bg-[#E8DCC9]'
                                          }`}
                                        >
                                          {p.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* 2. Warmth (Kelvin Color Temperature) Control */}
                                <div className="space-y-1.5 pt-2 border-t border-[#E5D9C7]">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-semibold text-[#33261D] flex items-center gap-1">
                                      <Thermometer className="w-3.5 h-3.5 text-[#B86B35]" />
                                      <span>Warmth (Kelvin)</span>
                                    </span>
                                    <span className="font-mono-num font-semibold text-[#9C5422]">
                                      {activeLightCfg.kelvin}K · {getKelvinLabel(activeLightCfg.kelvin)}
                                    </span>
                                  </div>
                                  <div className="space-y-1">
                                    <div
                                      className="h-1.5 w-full rounded-full border border-[#33261D]/15"
                                      style={{
                                        background:
                                          'linear-gradient(90deg, #FF8A2B 0%, #FFC884 28%, #FFF3E0 55%, #FFFFFF 75%, #C6DEFF 100%)',
                                      }}
                                    />
                                    <input
                                      type="range"
                                      aria-label="Room light warmth in Kelvin"
                                      min={1800}
                                      max={8000}
                                      step={100}
                                      value={activeLightCfg.kelvin}
                                      onChange={(e) =>
                                        onUpdateRoomLight(lightingRoom.id, {
                                          enabled: true,
                                          kelvin: Number(e.target.value),
                                        })
                                      }
                                      className="w-full h-1.5 accent-[#B86B35] cursor-pointer"
                                    />
                                  </div>
                                  <div className="grid grid-cols-5 gap-1 font-mono-num text-[10px]">
                                    {[2200, 2700, 3500, 5000, 6500].map((k) => {
                                      const active = Math.abs(activeLightCfg.kelvin - k) <= 150;
                                      return (
                                        <button
                                          key={k}
                                          type="button"
                                          onClick={() =>
                                            onUpdateRoomLight(
                                              lightingRoom.id,
                                              { enabled: true, kelvin: k },
                                              true,
                                            )
                                          }
                                          className={`py-1 rounded-lg border cursor-pointer transition-colors ${
                                            active
                                              ? 'bg-[#B86B35]/16 border-[#B86B35] text-[#33261D] font-semibold'
                                              : 'bg-[#F1E8DA] border-[#DDD0BC] text-[#5A4738] hover:bg-[#E8DCC9]'
                                          }`}
                                        >
                                          {(k / 1000).toFixed(1)}k
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* 3. Light Color Tint Swatches + Custom Color Picker */}
                                <div className="space-y-1.5 pt-2 border-t border-[#E5D9C7]">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-semibold text-[#33261D]">
                                      Light Color Tint
                                    </span>
                                    <span className="font-mono-num text-[10px] text-[#7D6754]">
                                      {activeLightCfg.tint === '#FFFFFF'
                                        ? 'Pure Kelvin'
                                        : activeLightCfg.tint}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {ROOM_LIGHT_TINT_SWATCHES.map((sw) => {
                                      const active =
                                        activeLightCfg.tint.toUpperCase() === sw.hex.toUpperCase();
                                      return (
                                        <button
                                          key={sw.hex}
                                          type="button"
                                          title={sw.name}
                                          onClick={() =>
                                            onUpdateRoomLight(
                                              lightingRoom.id,
                                              { enabled: true, tint: sw.hex },
                                              true,
                                            )
                                          }
                                          className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${
                                            active
                                              ? 'ring-2 ring-[#B86B35] ring-offset-1 ring-offset-[#FAF5EC] scale-110'
                                              : 'border border-[#33261D]/25 hover:scale-110'
                                          }`}
                                          style={{ backgroundColor: sw.hex }}
                                        />
                                      );
                                    })}
                                    <label
                                      title="Custom Light Tint Color"
                                      className="relative w-6 h-6 rounded-md border border-[#C7B398] overflow-hidden cursor-pointer flex items-center justify-center bg-[#F1E8DA] text-[11px] font-semibold text-[#33261D]"
                                    >
                                      <input
                                        type="color"
                                        aria-label="Custom room light color tint"
                                        value={activeLightCfg.tint}
                                        onChange={(e) =>
                                          onUpdateRoomLight(lightingRoom.id, {
                                            enabled: true,
                                            tint: e.target.value.toUpperCase(),
                                          })
                                        }
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                      />
                                      +
                                    </label>
                                  </div>
                                </div>

                                {/* 4. Batch Actions: Apply to All Rooms & Reset Room */}
                                <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-[#E5D9C7] text-[11px]">
                                  <button
                                    type="button"
                                    onClick={() => onApplyRoomLightToAll(activeLightCfg)}
                                    className="py-1.5 px-2 rounded-xl bg-[#B86B35]/14 hover:bg-[#B86B35]/24 border border-[#B86B35]/40 text-[#8A471B] font-semibold cursor-pointer transition-colors whitespace-nowrap"
                                  >
                                    Apply to All
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onUpdateRoomLight(lightingRoom.id, null, true)
                                    }
                                    className="py-1.5 px-2 rounded-xl bg-[#F1E8DA] hover:bg-[#E8DCC9] border border-[#D9CBB6] text-[#4E3D2F] font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Reset Room</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Paint / Stain Color Swatches + Custom Color Picker */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-[#6B5644]">Paint Tint</span>
                            <button
                              type="button"
                              onClick={onApplySurfaceToAll}
                              className="px-2 py-0.5 rounded-lg bg-[#B86B35]/14 hover:bg-[#B86B35]/24 border border-[#B86B35]/40 text-[11px] font-semibold text-[#8A471B] cursor-pointer transition-colors"
                            >
                              {tool.surfaceTarget === 'wall' ? 'Paint All Walls' : 'Paint All Floors'}
                            </button>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {SURFACE_TINT_SWATCHES.map((sw) => {
                              const currentTint =
                                tool.surfaceTarget === 'wall'
                                  ? tool.activeWallTint
                                  : tool.activeFloorTint;
                              const active = currentTint.toUpperCase() === sw.hex.toUpperCase();
                              return (
                                <button
                                  key={sw.hex}
                                  type="button"
                                  title={`Paint ${sw.name}`}
                                  onClick={() =>
                                    onUpdateTool(
                                      tool.surfaceTarget === 'wall'
                                        ? { activeWallTint: sw.hex }
                                        : { activeFloorTint: sw.hex },
                                    )
                                  }
                                  className={`w-5 h-5 rounded-full cursor-pointer transition-transform ${
                                    active
                                      ? 'ring-2 ring-[#B86B35] ring-offset-1 ring-offset-[#FAF5EC] scale-110'
                                      : 'border border-[#33261D]/25 hover:scale-110'
                                  }`}
                                  style={{ backgroundColor: sw.hex }}
                                />
                              );
                            })}
                            <label
                              title="Custom Paint Color"
                              className="relative w-5 h-5 rounded-md border border-[#C7B398] overflow-hidden cursor-pointer flex items-center justify-center bg-[#F1E8DA] text-[10px] font-semibold text-[#33261D]"
                            >
                              <input
                                type="color"
                                value={
                                  tool.surfaceTarget === 'wall'
                                    ? tool.activeWallTint
                                    : tool.activeFloorTint
                                }
                                onChange={(e) =>
                                  onUpdateTool(
                                    tool.surfaceTarget === 'wall'
                                      ? { activeWallTint: e.target.value.toUpperCase() }
                                      : { activeFloorTint: e.target.value.toUpperCase() },
                                  )
                                }
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              />
                              +
                            </label>
                          </div>
                        </div>

                        {/* Material / Wallpaper 2-Column Grid */}
                        <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-[#E5D9C7]">
                          {tool.surfaceTarget === 'floor'
                            ? FLOOR_MATERIALS.map((fm) => {
                                const active = tool.activeFloorMat === fm.id;
                                return (
                                  <button
                                    key={fm.id}
                                    type="button"
                                    onClick={() => onUpdateTool({ activeFloorMat: fm.id as FloorMaterialId })}
                                    className={`px-2 py-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-colors ${
                                      active
                                        ? 'bg-[#B86B35]/14 border-[#B86B35] text-[#33261D] font-semibold'
                                        : 'bg-[#F1E8DA] border-[#DDD0BC] text-[#5A4738] hover:border-[#C2AE93]'
                                    }`}
                                  >
                                    <span
                                      className="w-4 h-4 rounded-md border border-[#33261D]/20 shrink-0"
                                      style={{ backgroundColor: fm.preview }}
                                    />
                                    <span className="text-[11px] font-medium truncate">{fm.name}</span>
                                  </button>
                                );
                              })
                            : WALL_MATERIALS.map((wm) => {
                                const active = tool.activeWallMat === wm.id;
                                return (
                                  <button
                                    key={wm.id}
                                    type="button"
                                    onClick={() => onUpdateTool({ activeWallMat: wm.id as WallMaterialId })}
                                    className={`px-2 py-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-colors ${
                                      active
                                        ? 'bg-[#B86B35]/14 border-[#B86B35] text-[#33261D] font-semibold'
                                        : 'bg-[#F1E8DA] border-[#DDD0BC] text-[#5A4738] hover:border-[#C2AE93]'
                                    }`}
                                  >
                                    <span
                                      className="w-4 h-4 rounded-md border border-[#33261D]/20 shrink-0"
                                      style={{ backgroundColor: wm.preview }}
                                    />
                                    <span className="text-[11px] font-medium truncate">{wm.name}</span>
                                  </button>
                                );
                              })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* TAB 5: COMMISSION GOALS / ROOMS */}
              {tool.tab === 'goals' && (
                <div className="space-y-3">
                  {playMode === 'commission' ? (
                    <>
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-[#9C5422]">
                          {commission.client}
                        </p>
                        <h3 className="font-display text-base font-bold text-[#33261D]">
                          {commission.title}
                        </h3>
                        <p className="text-xs text-[#6B5644] leading-relaxed">{commission.brief}</p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-[#E5D9C7]">
                        {reqResults.map((r) => (
                          <div
                            key={r.id}
                            className="flex items-start justify-between gap-2 bg-[#F1E8DA] border border-[#DFD2BE] rounded-xl px-2.5 py-2 text-xs"
                          >
                            <div className="flex items-start gap-2">
                              <span
                                className={`w-4 h-4 mt-0.5 rounded-sm flex items-center justify-center shrink-0 ${
                                  r.passed
                                    ? 'bg-[#467255]/18 text-[#2D4F39] border border-[#467255]/45'
                                    : 'bg-[#FAF5EC] text-[#7D6754] border border-[#D9CBB6]'
                                }`}
                              >
                                {r.passed ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  <Lamp className="w-2.5 h-2.5" />
                                )}
                              </span>
                              <span className={r.passed ? 'text-[#33261D] font-medium' : 'text-[#5A4738]'}>
                                {r.label}
                              </span>
                            </div>
                            <span className="font-mono-num text-[11px] text-[#9C5422] font-semibold shrink-0">
                              {r.progress}
                            </span>
                          </div>
                        ))}
                      </div>

                      {allReqsMet && (
                        <button
                          type="button"
                          onClick={onSubmitCommission}
                          className="w-full py-2.5 rounded-xl bg-[#467255] hover:bg-[#3A6047] text-[#FFFBF5] font-display font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                        >
                          <Check className="w-4 h-4" />
                          <span>Complete Commission</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <h3 className="font-display text-base font-bold text-[#33261D]">
                          Freebuild Sandbox
                        </h3>
                        <p className="text-xs text-[#6B5644]">
                          {score.rooms.length} Detected{' '}
                          {score.rooms.length === 1 ? 'Room' : 'Rooms'} · Unlimited budget
                        </p>
                      </div>

                      <div className="space-y-1.5 font-mono-num text-xs">
                        {score.rooms.map((rm) => {
                          const active = tool.selectedRoomId === rm.id;
                          const customName = getRoomCustomName(blueprint, rm);
                          return (
                            <button
                              key={rm.id}
                              type="button"
                              onClick={() => onSelectRoomById(rm.id)}
                              className={`w-full flex items-center justify-between border rounded-xl px-3 py-2 cursor-pointer transition-colors text-left ${
                                active
                                  ? 'bg-[#B86B35]/15 border-[#B86B35] text-[#33261D] font-semibold'
                                  : 'bg-[#F1E8DA] hover:bg-[#E8DCC9] border-[#DFD2BE] text-[#33261D]'
                              }`}
                            >
                              <span className="truncate pr-2">
                                {customName || `Ruang ${rm.id} · ${rm.zone}`}
                              </span>
                              <span className="text-[#9C5422] font-semibold shrink-0">{rm.area} m²</span>
                            </button>
                          );
                        })}
                        {score.rooms.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectRoomById(score.rooms[0].id);
                              onUpdateTool({ roomEditScope: 'building' });
                            }}
                            className="w-full py-1.5 rounded-xl bg-[#467255]/14 hover:bg-[#467255]/22 border border-[#467255]/40 text-[11px] font-semibold text-[#2D4F39] cursor-pointer"
                          >
                            Pilih Seluruh Bangunan untuk Geser / Pusatkan
                          </button>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={onLoadShowcase}
                          className="w-full py-2 rounded-xl bg-[#F1E8DA] hover:bg-[#E8DCC9] border border-[#D9CBB6] text-xs font-medium text-[#33261D] cursor-pointer"
                        >
                          Load Showcase Villa
                        </button>
                        <button
                          type="button"
                          onClick={() => onSwitchMode('commission')}
                          className="w-full py-2 rounded-xl bg-[#B86B35] hover:bg-[#A35C2B] text-xs font-semibold text-[#FFFBF5] cursor-pointer"
                        >
                          Play Commissions
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>

          {/* Right-Edge Side Panel Collapse Handle (visible while sidebar is open) */}
          {!dockCollapsed && (
            <button
              type="button"
              onClick={onToggleDock}
              title="Hide Tool Panel (H)"
              className="pointer-events-auto mt-3 -ml-px px-1.5 py-3 rounded-r-xl bg-[#FAF5EC]/96 hover:bg-[#EFE6D7] border border-l-0 border-[#D9CBB6] text-[#6B5644] hover:text-[#33261D] shadow-md flex flex-col items-center gap-1 cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-[#B86B35]" />
              <span className="text-[10px] font-mono-num font-semibold">H</span>
            </button>
          )}
        </div>

        {/* ALWAYS-VISIBLE LEFT-EDGE REOPEN BUTTON WHEN SIDEBAR IS COLLAPSED */}
        {dockCollapsed && (
          <button
            type="button"
            onClick={onToggleDock}
            title="Show Tool Panel (H)"
            className="pointer-events-auto fixed left-3 top-[74px] z-20 px-3 py-2 rounded-xl bg-[#FAF5EC]/97 hover:bg-[#EFE6D7] border border-[#C48352] text-[#33261D] shadow-[0_10px_24px_-6px_rgba(68,48,32,0.28)] flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-[#B86B35]" />
            <span className="font-display font-semibold text-xs whitespace-nowrap">Tools</span>
            <span className="text-[10px] font-mono-num font-semibold text-[#9C5422] bg-[#EFE6D7] px-1.5 py-0.5 rounded-md">
              H
            </span>
          </button>
        )}

        {/* FLOATING ROOM NAME LABELS OVERLAY (Toggle via Label button — Click to select & rename) */}
        {showRoomLabels && !peopleHud.walkMode && roomLabels.length > 0 && (
          <div className="pointer-events-none fixed inset-0 z-[14] overflow-hidden">
            {roomLabels.map((lbl) => {
              if (lbl.y < 70) return null;
              if (!dockCollapsed && lbl.x < 344) return null;
              const isSelected = tool.selectedRoomId === lbl.roomId;
              return (
                <button
                  key={`rl_${lbl.roomId}`}
                  type="button"
                  onClick={() => onSelectRoomById(lbl.roomId)}
                  title="Klik untuk pilih & ubah nama ruangan"
                  style={{
                    left: `${lbl.x}px`,
                    top: `${lbl.y}px`,
                  }}
                  className={`pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-0.5 rounded-lg border text-[11px] font-medium whitespace-nowrap shadow-sm cursor-pointer transition-colors flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#B86B35] border-[#8A471B] text-[#FFFBF5] font-semibold'
                      : 'bg-[#FAF5EC]/92 hover:bg-[#FAF5EC] border-[#C9B79C] text-[#33261D]'
                  }`}
                >
                  <span>{lbl.name}</span>
                  <span
                    className={`font-mono-num text-[10px] ${
                      isSelected ? 'text-[#FFE7D4]' : 'text-[#9C5422] font-semibold'
                    }`}
                  >
                    {lbl.area} m²
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ARCHITECTURAL DIMENSIONS & SPACING OVERLAY (Projected 3D measurements — Toggle via Ukuran / T) */}
        {showDimensions && !peopleHud.walkMode && dimensionLabels.length > 0 && (
          <div className="pointer-events-none fixed inset-0 z-[15] overflow-hidden">
            {dimensionLabels.map((lbl) => {
              if (lbl.y < 62) return null;
              if (!dockCollapsed && lbl.x < 344) return null;
              const badgeStyle =
                lbl.kind === 'land'
                  ? 'bg-[#FAF5EC]/95 border-[#8C735B] text-[#33261D]'
                  : lbl.kind === 'room'
                    ? 'bg-[#FAF5EC]/97 border-[#B86B35] text-[#33261D]'
                    : lbl.kind === 'wall'
                      ? 'bg-[#33261D]/92 border-[#C48352] text-[#FFFBF5]'
                      : lbl.kind === 'gap'
                        ? 'bg-[#2D4F39]/94 border-[#5C9671] text-[#FFFBF5]'
                        : 'bg-[#B86B35]/95 border-[#FAF5EC] text-[#FFFBF5]';
              return (
                <div
                  key={lbl.id}
                  style={{
                    left: `${lbl.x}px`,
                    top: `${lbl.y}px`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md border text-[10px] font-mono-num font-semibold whitespace-nowrap shadow-sm ${badgeStyle}`}
                >
                  {lbl.text}
                </div>
              );
            })}
          </div>
        )}

        {/* LIVE ON-CANVAS FLOATING WALL DIMENSION TAG (Projected directly at wall midpoint / cursor) */}
        {tool.tab === 'layout' &&
          tool.layoutSubTool === 'wall_draw' &&
          !peopleHud.walkMode &&
          !peopleHud.placingPerson &&
          wallDrawStatus.hovering &&
          wallDrawStatus.labelScreenX > 30 &&
          wallDrawStatus.labelScreenY > 30 && (
            <div
              className="pointer-events-none fixed z-20 -translate-x-1/2 -translate-y-full"
              style={{
                left: `${wallDrawStatus.labelScreenX}px`,
                top: `${Math.max(76, wallDrawStatus.labelScreenY - 14)}px`,
              }}
            >
              <div
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono-num font-semibold shadow-md border whitespace-nowrap ${
                  wallDrawStatus.snappedCorner
                    ? 'bg-[#2D4F39] border-[#467255] text-[#FFFBF5]'
                    : wallDrawStatus.active
                      ? 'bg-[#33261D] border-[#B86B35] text-[#FFFBF5]'
                      : 'bg-[#FAF5EC]/96 border-[#C48352] text-[#33261D]'
                }`}
              >
                {wallDrawStatus.active && wallDrawStatus.lengthM > 0 ? (
                  <>
                    <span>{wallDrawStatus.lengthM.toFixed(2)} m</span>
                    <span className="opacity-65 mx-1.5">·</span>
                    <span>{wallDrawStatus.angleDeg}°</span>
                    {wallDrawStatus.snappedCorner && (
                      <>
                        <span className="opacity-65 mx-1.5">·</span>
                        <span className="text-[#9BE3B2]">Corner</span>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <span>
                      X {wallDrawStatus.cursorLotX.toFixed(1)}m · Z {wallDrawStatus.cursorLotZ.toFixed(1)}m
                    </span>
                    {wallDrawStatus.snappedCorner && (
                      <span className="ml-1.5 text-[#9BE3B2]">· Corner</span>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

        {/* BOTTOM-RIGHT / BOTTOM-CENTER FLOATING CONTEXT HUD STACK (People HUD + Draw Wall Precision HUD) */}
        <div
          className={`pointer-events-none self-end flex flex-col items-end gap-2 ${
            dockCollapsed ? 'max-w-[calc(100vw-24px)]' : 'max-w-[calc(100vw-360px)]'
          }`}
        >
          {/* PEOPLE HUD: 1.70m Scale Person & Eye-Level First-Person Walk Bar */}
          {peopleHud.panelOpen && (
            <div className="pointer-events-auto bg-[#FAF5EC]/97 border border-[#D9CBB6] rounded-2xl px-3.5 py-2.5 shadow-[0_14px_32px_-8px_rgba(68,48,32,0.24)] flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
              <div className="flex items-center gap-2 pr-2 border-r border-[#E5D9C7]">
                <span className="w-7 h-7 rounded-xl bg-[#B86B35]/14 text-[#9C5422] flex items-center justify-center shrink-0">
                  {peopleHud.walkMode ? (
                    <Footprints className="w-4 h-4 text-[#467255]" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </span>
                <div className="leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="font-display font-bold text-[#33261D] whitespace-nowrap">
                      People HUD
                    </span>
                    <span className="text-[#C7B398]" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-mono-num text-[11px] font-semibold text-[#9C5422]">
                      {peopleHud.heightM.toFixed(2)} m
                    </span>
                  </div>
                  <div className="font-mono-num text-[10px] text-[#6B5644] whitespace-nowrap">
                    {peopleHud.zoneLabel} · X {peopleHud.lotX.toFixed(1)}m, Z {peopleHud.lotZ.toFixed(1)}m ·{' '}
                    {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(peopleHud.headingDeg / 45) % 8]}
                  </div>
                </div>
              </div>

              {/* Primary Walk POV / Place / Show controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onUpdatePeopleHud({ walkMode: !peopleHud.walkMode })}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                    peopleHud.walkMode
                      ? 'bg-[#467255] hover:bg-[#3A6047] text-[#FFFBF5]'
                      : 'bg-[#B86B35] hover:bg-[#A35C2B] text-[#FFFBF5]'
                  }`}
                >
                  <Footprints className="w-3.5 h-3.5" />
                  <span>{peopleHud.walkMode ? 'Exit Walk POV' : 'Walk POV (1st Person)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onUpdatePeopleHud({
                      placingPerson: !peopleHud.placingPerson,
                      walkMode: false,
                    })
                  }
                  title="Click anywhere on the lot or room floor to place the scale person"
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-medium border flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
                    peopleHud.placingPerson
                      ? 'bg-[#B86B35]/16 border-[#B86B35] text-[#8C481B] font-semibold'
                      : 'bg-[#F1E8DA] border-[#D9CBB6] text-[#33261D] hover:bg-[#E8DCC9]'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 text-[#B86B35]" />
                  <span>{peopleHud.placingPerson ? 'Click Floor...' : 'Place'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdatePeopleHud({ showPerson: !peopleHud.showPerson })}
                  className="px-2 py-1.5 rounded-xl text-[11px] font-medium bg-[#F1E8DA] hover:bg-[#E8DCC9] border border-[#D9CBB6] text-[#33261D] cursor-pointer whitespace-nowrap"
                >
                  {peopleHud.showPerson ? 'Hide Figure' : 'Show Figure'}
                </button>

                <button
                  type="button"
                  onClick={onCenterPerson}
                  title="Move person to lot center"
                  className="p-1.5 rounded-xl bg-[#F1E8DA] hover:bg-[#E8DCC9] border border-[#D9CBB6] text-[#4E3D2F] cursor-pointer"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Human Height Scale Selector */}
              <div className="flex items-center gap-1 bg-[#E7DBC8] p-0.5 rounded-xl text-[11px] font-mono-num">
                {([1.25, 1.7, 1.85] as PersonHeightPreset[]).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => onUpdatePeopleHud({ heightM: h })}
                    title={`Human scale height ${h.toFixed(2)}m`}
                    className={`px-2 py-1 rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
                      peopleHud.heightM === h
                        ? 'bg-[#FAF5EC] text-[#33261D] font-semibold shadow-xs'
                        : 'text-[#6B5644] hover:text-[#33261D]'
                    }`}
                  >
                    {h.toFixed(2)}m
                  </button>
                ))}
              </div>

              {peopleHud.walkMode && (
                <span className="font-mono-num text-[10px] text-[#467255] font-medium whitespace-nowrap">
                  WASD Walk · Drag Look · Q/E Turn · Shift Run · Esc Exit
                </span>
              )}

              <button
                type="button"
                onClick={() =>
                  onUpdatePeopleHud({ panelOpen: false, walkMode: false, placingPerson: false })
                }
                title="Close People HUD"
                className="p-1 rounded-lg text-[#7D6754] hover:text-[#33261D] hover:bg-[#EFE6D7] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* DRAW WALL PRECISION HUD (Appears whenever Draw Wall is active so drawing walls is effortless) */}
          {tool.tab === 'layout' && tool.layoutSubTool === 'wall_draw' && !peopleHud.walkMode && (
            <div className="pointer-events-auto bg-[#FAF5EC]/97 border border-[#C48352] rounded-2xl px-3.5 py-2 shadow-[0_14px_32px_-8px_rgba(68,48,32,0.22)] flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 pr-2 border-r border-[#E5D9C7]">
                <Ruler className="w-3.5 h-3.5 text-[#B86B35] shrink-0" />
                <span className="font-semibold text-[#33261D] whitespace-nowrap">Draw Wall</span>
                <span className="font-mono-num text-[11px] text-[#9C5422] font-semibold whitespace-nowrap">
                  {wallDrawStatus.active
                    ? wallDrawStatus.lengthM > 0
                      ? `${wallDrawStatus.lengthM.toFixed(2)}m · ${wallDrawStatus.angleDeg}°`
                      : 'Pick corner'
                    : 'Click start'}
                </span>
              </div>

              {/* Snap Increment */}
              <div className="flex items-center gap-1 bg-[#E7DBC8] p-0.5 rounded-xl text-[11px] font-mono-num">
                {([1.0, 0.5, 0.25] as const).map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => onUpdateWallDrawOptions({ snapStepM: step })}
                    title={`Grid snap step ${step}m`}
                    className={`px-2 py-1 rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
                      wallDrawOptions.snapStepM === step
                        ? 'bg-[#FAF5EC] text-[#33261D] font-semibold shadow-xs'
                        : 'text-[#6B5644] hover:text-[#33261D]'
                    }`}
                  >
                    {step}m
                  </button>
                ))}
              </div>

              {/* Ortho 90° Straight Lock */}
              <button
                type="button"
                onClick={() => onUpdateWallDrawOptions({ orthoLock: !wallDrawOptions.orthoLock })}
                title="Lock walls straight to 90° (Hold Alt anytime for free diagonal angle)"
                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border cursor-pointer transition-colors whitespace-nowrap ${
                  wallDrawOptions.orthoLock
                    ? 'bg-[#467255]/15 border-[#467255]/55 text-[#2D4F39]'
                    : 'bg-[#F1E8DA] border-[#D9CBB6] text-[#6B5644]'
                }`}
              >
                {wallDrawOptions.orthoLock ? '90° Straight ON' : 'Free Angle'}
              </button>

              {/* Exact Length Input while chaining */}
              {wallDrawStatus.active && (
                <div className="flex items-center gap-1 bg-[#F1E8DA] border border-[#D9CBB6] rounded-xl px-1.5 py-0.5 font-mono-num text-[11px]">
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label="Exact wall length in meters"
                    value={exactWallLenText}
                    onChange={(e) =>
                      setExactWallLenText(e.target.value.replace(/[^0-9.]/g, '').slice(0, 5))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = parseFloat(exactWallLenText);
                        if (val > 0) onCommitExactWallLength(val);
                      }
                    }}
                    className="w-10 bg-[#FAF5EC] border border-[#DDD0BC] rounded-md px-1 py-0.5 text-center text-[#33261D] font-semibold focus:outline-none focus:border-[#B86B35]"
                  />
                  <span className="text-[#7D6754]">m</span>
                  <button
                    type="button"
                    onClick={() => {
                      const val = parseFloat(exactWallLenText);
                      if (val > 0) onCommitExactWallLength(val);
                    }}
                    className="px-2 py-0.5 rounded-md bg-[#B86B35] hover:bg-[#A35C2B] text-[#FFFBF5] font-semibold cursor-pointer whitespace-nowrap"
                  >
                    + Add
                  </button>
                </div>
              )}

              {!isPlanView && (
                <button
                  type="button"
                  onClick={onTogglePlanView}
                  title="Snap straight overhead to locked 2D Floor Plan for effortless wall drawing"
                  className="px-2.5 py-1 rounded-xl bg-[#B86B35]/14 hover:bg-[#B86B35]/24 border border-[#B86B35]/45 text-[11px] font-semibold text-[#8C481B] cursor-pointer whitespace-nowrap"
                >
                  Lock 2D Top
                </button>
              )}

              {wallDrawStatus.active && (
                <button
                  type="button"
                  onClick={onCancelWallDraw}
                  className="px-2.5 py-1 rounded-xl bg-[#33261D] hover:bg-[#4A382B] text-[11px] font-semibold text-[#FFFBF5] cursor-pointer whitespace-nowrap"
                >
                  Done (Esc)
                </button>
              )}
            </div>
          )}

          {/* BOTTOM-RIGHT SLIM CONTEXTUAL KEYBOARD BAR */}
          <div className="hidden md:flex items-center">
            <div className="bg-[#FAF5EC]/92 border border-[#D9CBB6] rounded-xl px-3 py-1.5 text-[11px] text-[#5A4738] shadow-sm flex items-center gap-2 font-mono-num">
              {selectedItem && selectedDef ? (
                <>
                  <span className="font-semibold text-[#9C5422]">{selectedDef.name}</span>
                  <span className="text-[#C7B398]">·</span>
                  <span>↑↓←→ Move</span>
                  <span className="text-[#C7B398]">·</span>
                  <span>Q/E Rotate</span>
                  <span className="text-[#C7B398]">·</span>
                  <span>[/] Height</span>
                  <span className="text-[#C7B398]">·</span>
                  <span>-/+ Size</span>
                  <span className="text-[#C7B398]">·</span>
                  <span>Del Remove</span>
                </>
              ) : selectedWall ? (
                <>
                  <span className="font-semibold text-[#9C5422]">
                    Wall ({selectedWallLen.toFixed(1)}m × {(selectedWall.height || WALL_HEIGHT).toFixed(1)}m)
                  </span>
                  <span className="text-[#C7B398]">·</span>
                  <span>↑↓←→ / M Move</span>
                  <span className="text-[#C7B398]">·</span>
                  <span>-/+ Length</span>
                  <span className="text-[#C7B398]">·</span>
                  <span>[/] Height</span>
                  <span className="text-[#C7B398]">·</span>
                  <span>Q/E Rotate</span>
                  <span className="text-[#C7B398]">·</span>
                  <span>Del Remove</span>
                </>
              ) : selectedRoom ? (
                <>
                  <span className="font-semibold text-[#9C5422]">
                    {tool.roomEditScope === 'building'
                      ? 'Whole Building'
                      : `Room ${selectedRoom.id}`}
                  </span>
                  <span className="text-[#C7B398]">·</span>
                  <span>↑↓←→ / M Shift 1m</span>
                  <span className="text-[#C7B398]">·</span>
                  <span>R Rotate 90°</span>
                  <span className="text-[#C7B398]">·</span>
                  <span>[/] Wall Height</span>
                  <span className="text-[#C7B398]">·</span>
                  <span>Del Remove</span>
                </>
              ) : isPlanView ? (
                <>
                  <span className="font-semibold text-[#9C5422]">2D Locked Plan</span>
                  <span className="text-[#C7B398]">·</span>
                  <span>Left-Click Draw / Select</span>
                  <span className="text-[#C7B398]">·</span>
                  <span>Right-Drag / WASD Pan</span>
                  <span className="text-[#C7B398]">·</span>
                  <span>Scroll Zoom</span>
                </>
              ) : (
                <>
                  <span>Q/E Rotate</span>
                  <span className="text-[#C7B398]">·</span>
                  <span>G {tool.placementMode === 'free' ? 'Free' : 'Grid'}</span>
                  <span className="text-[#C7B398]">·</span>
                  <span>WASD Pan</span>
                  <span className="text-[#C7B398]">·</span>
                  <span>Select Tab: Click Wall, Room or Item</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PAUSE & STUDIO MENU MODAL */}
      {screen === 'paused' && (
        <div className="fixed inset-0 z-30 pointer-events-auto bg-[#2C2018]/55 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#FAF5EC] border border-[#D9CBB6] rounded-2xl p-6 shadow-[0_20px_48px_-12px_rgba(51,38,29,0.3)] space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-[#33261D]">Studio Menu</h2>
                <p className="text-xs text-[#6B5644] mt-0.5">
                  Build freely with zero budget limits, or pick an optional design brief for inspiration.
                </p>
              </div>
              <button
                type="button"
                onClick={onResume}
                className="px-4 py-1.5 rounded-xl bg-[#B86B35] hover:bg-[#A35C2B] text-xs font-semibold text-[#FFFBF5] cursor-pointer"
              >
                Resume
              </button>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-[#5A4738]">Optional Design Briefs (Free Mode)</p>
              <div className="grid grid-cols-1 gap-1.5">
                {COMMISSIONS.map((c, idx) => {
                  const done = completedIds.includes(c.id);
                  const active = playMode === 'commission' && commission.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onSelectCommission(idx);
                        onResume();
                      }}
                      className={`px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#B86B35]/14 border-[#B86B35] text-[#33261D]'
                          : 'bg-[#F1E8DA] border-[#DDD0BC] hover:border-[#C2AE93] text-[#33261D]'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-semibold">
                          0{c.index}. {c.title}
                        </span>
                        <span className="block text-[11px] text-[#6B5644]">
                          {c.client} · Target Score {c.targetScore}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-mono-num ${
                          done ? 'text-[#396348] font-semibold' : 'text-[#7D6754]'
                        }`}
                      >
                        {done ? 'Completed' : 'Open'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E3D6C3]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onSwitchMode('sandbox');
                    onResume();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#F1E8DA] hover:bg-[#E8DCC9] border border-[#D9CBB6] text-xs font-medium text-[#33261D] cursor-pointer"
                >
                  Freebuild Sandbox
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onResetRoom();
                    onResume();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#F1E8DA] hover:bg-[#E8DCC9] border border-[#D9CBB6] text-xs font-medium text-[#33261D] cursor-pointer"
                >
                  Reset Layout
                </button>
              </div>
              <button
                type="button"
                onClick={onBackToTitle}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-[#6B5644] hover:text-[#33261D] cursor-pointer"
              >
                Title Screen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMMISSION VICTORY MODAL */}
      {screen === 'victory' && (
        <div className="fixed inset-0 z-30 pointer-events-auto bg-[#2C2018]/55 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#FAF5EC] border border-[#C48352] rounded-2xl p-6 shadow-[0_20px_48px_-12px_rgba(51,38,29,0.3)] space-y-5 text-center">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold tracking-[0.14em] text-[#9C5422]">
                Commission Approved
              </p>
              <h2 className="font-display text-2xl font-bold text-[#33261D]">{commission.title}</h2>
              <p className="text-xs text-[#6B5644]">Approved by {commission.client}</p>
            </div>

            {/* 3-Star Architectural Rating */}
            <div className="flex items-center justify-center gap-2 py-1">
              {[1, 2, 3].map((s) => (
                <svg
                  key={s}
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill={s <= stars ? '#C4733B' : 'rgba(51,38,29,0.14)'}
                  className="shrink-0"
                >
                  <path d="M12 2.5L14.9 8.4L21.4 9.3L16.7 13.9L17.8 20.4L12 17.3L6.2 20.4L7.3 13.9L2.6 9.3L9.1 8.4L12 2.5Z" />
                </svg>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-2 bg-[#F1E8DA] border border-[#E3D6C3] rounded-xl p-3 font-mono-num">
              <div>
                <span className="block text-[11px] text-[#7D6754]">Score</span>
                <span className="text-base font-bold text-[#9C5422]">{score.total}</span>
              </div>
              <div>
                <span className="block text-[11px] text-[#7D6754]">Comfort</span>
                <span className="text-base font-semibold text-[#33261D]">{score.comfort}</span>
              </div>
              <div>
                <span className="block text-[11px] text-[#7D6754]">Harmony</span>
                <span className="text-base font-semibold text-[#33261D]">{score.harmony}</span>
              </div>
              <div>
                <span className="block text-[11px] text-[#7D6754]">Lighting</span>
                <span className="text-base font-semibold text-[#33261D]">{score.lighting}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-1">
              {commission.index < COMMISSIONS.length ? (
                <button
                  type="button"
                  onClick={() => {
                    onSelectCommission(commission.index);
                    onResume();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#B86B35] hover:bg-[#A35C2B] text-xs font-display font-semibold text-[#FFFBF5] cursor-pointer"
                >
                  Next Commission
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onSwitchMode('sandbox');
                    onResume();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#B86B35] hover:bg-[#A35C2B] text-xs font-display font-semibold text-[#FFFBF5] cursor-pointer"
                >
                  Enter Freebuild Sandbox
                </button>
              )}
              <button
                type="button"
                onClick={onResume}
                className="px-4 py-2.5 rounded-xl bg-[#F1E8DA] hover:bg-[#E8DCC9] border border-[#D9CBB6] text-xs font-medium text-[#33261D] cursor-pointer"
              >
                Keep Decorating
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
