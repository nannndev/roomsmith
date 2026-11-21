/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BuilderHUD } from './components/BuilderHUD';
import { CustomAssetModal } from './components/CustomAssetModal';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { TemplateGalleryModal } from './components/TemplateGalleryModal';
import { TitleOverlay } from './components/TitleOverlay';
import { soundEngine } from './game/audio';
import {
  cloneBlueprint,
  COMMISSIONS,
  createShowcaseBlueprint,
  createStarterTemplateBlueprint,
  getFurnitureDef,
  ROOM_MODULE_PRESETS,
  ROOM_ZONES,
  stampRoomModuleOntoBlueprint,
  STARTER_TEMPLATES,
} from './game/catalog';
import { FurniturePlacePayload, RoomBuilderEngine } from './game/sceneEngine';
import {
  addUpperFloor,
  applyRoomLightToAll,
  canPlaceFurniture,
  centerRoomOrBuildingInLot,
  createBlankBlueprint,
  deleteSelectedRoom,
  evaluateBlueprint,
  fillFloorInsideCustomWalls,
  getActiveFloorIndex,
  getBlueprintFloorCount,
  getEffectiveSite,
  getOccupiedCells,
  getSiteBounds,
  getTileSetBounds,
  hasWallOnSide,
  mirrorBlueprint,
  removeTopFloor,
  resizeLandPlot,
  resizeSelectedRoom,
  resolveFurnitureTransform,
  rotateRoomOrBuilding90,
  setRoomCustomName,
  setRoomLightConfig,
  shiftRoomOrBuilding,
  switchBlueprintFloor,
} from './game/scoring';
import {
  deleteNamedProject,
  exportProjectJson,
  listSavedProjects,
  loadSavedSession,
  parseImportedProjectJson,
  SavedProjectRecord,
  SavedStudioSession,
  saveNamedProject,
  saveStudioSession,
} from './game/storage';
import {
  BuilderToolState,
  CameraPreset,
  DimensionLabelScreen,
  DockTab,
  FurnitureDef,
  GameScreen,
  LightingMood,
  PeopleHudState,
  PlacedFurniture,
  PlayMode,
  RoomBlueprint,
  RoomLabelScreen,
  RoomLightConfig,
  RoomModuleId,
  RoomZoneId,
  SiteConfig,
  StarterTemplateId,
  WALL_HEIGHT,
  WALL_THICKNESS,
  WallDrawOptions,
  WallDrawStatus,
  WallOpeningType,
  WallViewMode,
} from './game/types';

const INITIAL_TOOL: BuilderToolState = {
  tab: 'furniture',
  layoutSubTool: 'wall_draw',
  placementMode: 'free',
  activeZone: 'living',
  activeFloorMat: 'herringbone_oak',
  activeFloorTint: '#FFFFFF',
  activeWallMat: 'matte_paint',
  activeWallTint: '#F3E9D8',
  surfaceTarget: 'wall',
  selectedFurnitureDefId: 'l_sofa',
  placementRotation: 0,
  placementAngleDeg: 0,
  selectedPlacedUid: null,
  movingPlacedUid: null,
  selectedCustomWallId: null,
  movingCustomWallId: null,
  selectedRoomId: null,
  roomEditScope: 'room',
  movingRoomScope: null,
};

let uidCounter = 1;
function nextUid(prefix = 'item'): string {
  uidCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${uidCounter}`;
}

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<RoomBuilderEngine | null>(null);

  const initialSaveRef = useRef<SavedStudioSession | null | undefined>(undefined);
  if (initialSaveRef.current === undefined) {
    initialSaveRef.current = loadSavedSession();
  }
  const initialSave = initialSaveRef.current;

  const [screen, setScreen] = useState<GameScreen>(() => (initialSave ? 'playing' : 'title'));
  const [hasSavedDesign, setHasSavedDesign] = useState<boolean>(() => Boolean(initialSave));
  const [playMode, setPlayMode] = useState<PlayMode>(() => initialSave?.playMode ?? 'sandbox');
  const [commissionIdx, setCommissionIdx] = useState(() =>
    initialSave ? Math.min(COMMISSIONS.length - 1, initialSave.commissionIdx) : 0,
  );
  const [completedIds, setCompletedIds] = useState<string[]>(() => initialSave?.completedIds ?? []);

  const [blueprint, setBlueprint] = useState<RoomBlueprint>(() =>
    initialSave ? cloneBlueprint(initialSave.blueprint) : createShowcaseBlueprint(),
  );
  const [customDefs, setCustomDefs] = useState<Record<string, FurnitureDef>>(
    () => initialSave?.customDefs ?? {},
  );
  const [undoStack, setUndoStack] = useState<RoomBlueprint[]>([]);
  const [redoStack, setRedoStack] = useState<RoomBlueprint[]>([]);

  const [tool, setTool] = useState<BuilderToolState>(INITIAL_TOOL);
  const [mood, setMood] = useState<LightingMood>(() => initialSave?.mood ?? 'golden');
  const [wallView, setWallView] = useState<WallViewMode>(() => initialSave?.wallView ?? 'cutaway');
  const [isPlanView, setIsPlanView] = useState(false);
  const [showDimensions, setShowDimensions] = useState(false);
  const [dimensionLabels, setDimensionLabels] = useState<DimensionLabelScreen[]>([]);
  const [showRoomLabels, setShowRoomLabels] = useState(true);
  const [roomLabels, setRoomLabels] = useState<RoomLabelScreen[]>([]);
  const [showUpperFloors, setShowUpperFloors] = useState(true);
  const [muted, setMuted] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [webglLost, setWebglLost] = useState(false);
  const [customModalMode, setCustomModalMode] = useState<'import' | 'create' | null>(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [activeProjectName, setActiveProjectName] = useState('Desain Utama');
  const [savedProjects, setSavedProjects] = useState<SavedProjectRecord[]>(() =>
    listSavedProjects(),
  );
  const [wallDrawOptions, setWallDrawOptions] = useState<WallDrawOptions>({
    snapStepM: 0.5,
    orthoLock: true,
  });
  const [wallDrawStatus, setWallDrawStatus] = useState<WallDrawStatus>({
    active: false,
    hovering: false,
    lengthM: 0,
    angleDeg: 0,
    cursorLotX: 0,
    cursorLotZ: 0,
    snappedCorner: false,
    labelScreenX: 0,
    labelScreenY: 0,
  });
  const [peopleHud, setPeopleHud] = useState<PeopleHudState>({
    panelOpen: false,
    showPerson: false,
    walkMode: false,
    placingPerson: false,
    heightM: 1.7,
    lotX: 0,
    lotZ: 0,
    headingDeg: 0,
    zoneLabel: 'Outdoor Lot',
  });

  const toastTimerRef = useRef<number | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 2600);
  }, []);

  const commission = COMMISSIONS[commissionIdx] || COMMISSIONS[0];
  const score = useMemo(
    () => evaluateBlueprint(blueprint, customDefs),
    [blueprint, customDefs],
  );

  // Latest mutable refs for WebGL engine event handlers & persistence flush
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const hasSavedDesignRef = useRef(hasSavedDesign);
  hasSavedDesignRef.current = hasSavedDesign;
  const blueprintRef = useRef(blueprint);
  blueprintRef.current = blueprint;
  const customDefsRef = useRef(customDefs);
  customDefsRef.current = customDefs;
  const toolRef = useRef(tool);
  toolRef.current = tool;
  const playModeRef = useRef(playMode);
  playModeRef.current = playMode;
  const commissionIdxRef = useRef(commissionIdx);
  commissionIdxRef.current = commissionIdx;
  const completedIdsRef = useRef(completedIds);
  completedIdsRef.current = completedIds;
  const moodRef = useRef(mood);
  moodRef.current = mood;
  const wallViewRef = useRef(wallView);
  wallViewRef.current = wallView;
  const commissionRef = useRef(commission);
  commissionRef.current = commission;
  const scoreRef = useRef(score);
  scoreRef.current = score;
  const wallDrawActiveRef = useRef(wallDrawStatus.active);
  wallDrawActiveRef.current = wallDrawStatus.active;
  const peopleHudRef = useRef(peopleHud);
  peopleHudRef.current = peopleHud;

  const commitBlueprint = useCallback(
    (
      nextBp: RoomBlueprint,
      recordUndo = true,
      burstAt?: { wx: number; wy?: number; wz: number },
    ) => {
      if (recordUndo) {
        setUndoStack((prev) => [...prev.slice(-34), cloneBlueprint(blueprintRef.current)]);
        setRedoStack([]);
      }
      setBlueprint(nextBp);
      engineRef.current?.syncBlueprint(nextBp, burstAt);
    },
    [],
  );

  // Tile click / drag interaction (Add Floor, Erase Floor, Paint Zone, Paint Floor Surface)
  const handleTileInteract = useCallback(
    (gx: number, gz: number, isDrag: boolean) => {
      const t = toolRef.current;
      const bp = cloneBlueprint(blueprintRef.current);
      const key = `${gx},${gz}`;

      if (t.tab === 'layout' && t.layoutSubTool === 'floor_add') {
        const bounds = getSiteBounds(bp);
        if (gx < bounds.minGx || gx > bounds.maxGx || gz < bounds.minGz || gz > bounds.maxGz) {
          if (!isDrag) {
            soundEngine.playError();
            showToast(`Outside your ${bounds.landWidth}×${bounds.landDepth}m land boundary.`);
          }
          return;
        }
        if (bp.tiles[key]) return;
        const zoneDef = ROOM_ZONES.find((z) => z.id === t.activeZone) || ROOM_ZONES[0];
        bp.tiles[key] = {
          x: gx,
          z: gz,
          zone: t.activeZone,
          floorMat: t.activeFloorMat || zoneDef.defaultFloor,
          floorTint: t.activeFloorTint,
          wallMat: t.activeWallMat || zoneDef.defaultWall,
          wallTint: t.activeWallTint,
        };
        soundEngine.playTile(gx + gz);
        commitBlueprint(bp, !isDrag);
        return;
      }

      if (t.tab === 'layout' && t.layoutSubTool === 'floor_remove') {
        if (!bp.tiles[key]) return;
        delete bp.tiles[key];
        bp.furniture = bp.furniture.filter((item) => {
          const def = getFurnitureDef(item.defId, customDefsRef.current);
          if (!def) return false;
          if (item.wx !== undefined) return true; // Keep free-placed items
          const cells = getOccupiedCells(item.gx, item.gz, def.width, def.depth, item.rotation);
          return !cells.some((c) => c.x === gx && c.z === gz);
        });
        soundEngine.playRemove();
        commitBlueprint(bp, !isDrag);
        return;
      }

      if (t.tab === 'layout' && t.layoutSubTool === 'zone_paint') {
        const tile = bp.tiles[key];
        if (!tile || tile.zone === t.activeZone) return;
        const zoneDef = ROOM_ZONES.find((z) => z.id === t.activeZone);
        tile.zone = t.activeZone;
        if (zoneDef) {
          tile.floorMat = zoneDef.defaultFloor;
          tile.floorTint = '#FFFFFF';
          tile.wallMat = zoneDef.defaultWall;
          tile.wallTint = '#FFFFFF';
        }
        soundEngine.playTile(gx * 2 + gz);
        commitBlueprint(bp, !isDrag);
        return;
      }

      if (t.tab === 'surfaces' && t.surfaceTarget === 'floor') {
        const tile = bp.tiles[key];
        if (!tile) return;
        if (
          tile.floorMat === t.activeFloorMat &&
          (tile.floorTint || '#FFFFFF') === t.activeFloorTint
        ) {
          return;
        }
        tile.floorMat = t.activeFloorMat;
        tile.floorTint = t.activeFloorTint;
        soundEngine.playTile(gx + gz);
        commitBlueprint(bp, !isDrag);
      }
    },
    [commitBlueprint],
  );

  // Add a custom freeform wall segment drawn from scratch
  const handleAddCustomWall = useCallback(
    (x1: number, z1: number, x2: number, z2: number) => {
      const t = toolRef.current;
      const bp = cloneBlueprint(blueprintRef.current);
      if (!bp.customWalls) bp.customWalls = [];
      const len = Math.hypot(x2 - x1, z2 - z1);
      const wallH = getEffectiveSite(bp).wallHeight ?? WALL_HEIGHT;
      bp.customWalls.push({
        id: nextUid('wall'),
        x1,
        z1,
        x2,
        z2,
        height: wallH,
        thickness: WALL_THICKNESS,
        mat: t.activeWallMat,
        tint: t.activeWallTint,
        opening: 'none',
      });
      soundEngine.playWallSnap();
      commitBlueprint(bp, true);
      showToast(`Built ${len.toFixed(2)}m wall (Select tool to move/resize anytime).`);
    },
    [commitBlueprint, showToast],
  );

  // Interact with an existing custom drawn wall (Erase, Paint/Wallpaper, or Add Door/Window)
  const handleCustomWallInteract = useCallback(
    (wallId: string) => {
      const t = toolRef.current;
      const bp = cloneBlueprint(blueprintRef.current);
      if (!bp.customWalls) return;
      const idx = bp.customWalls.findIndex((w) => w.id === wallId);
      if (idx === -1) return;

      if (t.tab === 'surfaces' && t.surfaceTarget === 'wall') {
        bp.customWalls[idx].mat = t.activeWallMat;
        bp.customWalls[idx].tint = t.activeWallTint;
        soundEngine.playTile(idx + 2);
        commitBlueprint(bp, true);
        return;
      }

      if (t.tab === 'layout' && (t.layoutSubTool === 'wall_erase' || t.layoutSubTool === 'wall_toggle')) {
        bp.customWalls.splice(idx, 1);
        soundEngine.playRemove();
        commitBlueprint(bp, true);
        showToast('Removed custom wall.');
        return;
      }

      if (t.tab === 'layout' && t.layoutSubTool.startsWith('opening_')) {
        const map: Record<string, WallOpeningType> = {
          opening_window: 'window',
          opening_arched_window: 'arched_window',
          opening_curtain_window: 'curtain_window',
          opening_bath_vent: 'bath_vent',
          opening_door: 'door',
          opening_double_door: 'double_door',
          opening_wood_slider: 'wood_slider',
          opening_archway: 'archway',
          opening_slider: 'glass_slider',
        };
        const desired = map[t.layoutSubTool] || 'window';
        const cur = bp.customWalls[idx].opening || 'none';
        bp.customWalls[idx].opening = cur === desired ? 'none' : desired;
        if (bp.customWalls[idx].opening === 'none') soundEngine.playRemove();
        else soundEngine.playWallSnap();
        commitBlueprint(bp, true);
      }
    },
    [commitBlueprint, showToast],
  );

  // Grid wall edge interaction (Toggle/Erase partition, Paint/Wallpaper, or Add Openings)
  const handleEdgeInteract = useCallback(
    (axis: 'h' | 'v', ex: number, ez: number) => {
      const t = toolRef.current;
      const bp = cloneBlueprint(blueprintRef.current);
      const edgeKey = `${axis}:${ex}:${ez}`;

      const hasSideA =
        axis === 'h' ? Boolean(bp.tiles[`${ex},${ez - 1}`]) : Boolean(bp.tiles[`${ex - 1},${ez}`]);
      const hasSideB = Boolean(bp.tiles[`${ex},${ez}`]);

      if (t.tab === 'surfaces' && t.surfaceTarget === 'wall') {
        const isExteriorEdge = hasSideA !== hasSideB;
        const isInteriorWall = Boolean(bp.interiorWalls[edgeKey]);
        if (!isExteriorEdge && !isInteriorWall) {
          soundEngine.playError();
          showToast('Click any exterior, partition, or custom wall to paint or wallpaper.');
          return;
        }
        if (!bp.wallStyles) bp.wallStyles = {};
        bp.wallStyles[edgeKey] = {
          mat: t.activeWallMat,
          tint: t.activeWallTint,
        };
        soundEngine.playTile(ex + ez);
        commitBlueprint(bp, true);
        return;
      }

      if (t.layoutSubTool === 'wall_erase') {
        if (bp.interiorWalls[edgeKey]) {
          delete bp.interiorWalls[edgeKey];
          delete bp.openings[edgeKey];
          if (bp.wallStyles) delete bp.wallStyles[edgeKey];
          soundEngine.playRemove();
          commitBlueprint(bp, true);
          return;
        }
        showToast('Click any custom wall or interior partition wall to erase it.');
        return;
      }

      if (t.layoutSubTool === 'wall_toggle') {
        if (!hasSideA || !hasSideB) {
          soundEngine.playError();
          showToast('Partition walls go between two floor tiles — use Draw Wall for freeform walls.');
          return;
        }
        if (bp.interiorWalls[edgeKey]) {
          delete bp.interiorWalls[edgeKey];
          delete bp.openings[edgeKey];
          if (bp.wallStyles) delete bp.wallStyles[edgeKey];
          soundEngine.playRemove();
        } else {
          bp.interiorWalls[edgeKey] = true;
          soundEngine.playWallSnap();
        }
        commitBlueprint(bp, true);
        return;
      }

      const isExteriorEdge = hasSideA !== hasSideB;
      const isInteriorWall = Boolean(bp.interiorWalls[edgeKey]);
      if (!isExteriorEdge && !isInteriorWall) {
        soundEngine.playError();
        showToast('Click an exterior, partition, or custom wall to add a door or window.');
        return;
      }

      const map: Record<string, WallOpeningType> = {
        opening_window: 'window',
        opening_arched_window: 'arched_window',
        opening_curtain_window: 'curtain_window',
        opening_bath_vent: 'bath_vent',
        opening_door: 'door',
        opening_double_door: 'double_door',
        opening_wood_slider: 'wood_slider',
        opening_archway: 'archway',
        opening_slider: 'glass_slider',
      };
      const desired = map[t.layoutSubTool] || 'window';
      if (bp.openings[edgeKey] === desired) {
        delete bp.openings[edgeKey];
        soundEngine.playRemove();
      } else {
        bp.openings[edgeKey] = desired;
        soundEngine.playWallSnap();
      }
      commitBlueprint(bp, true);
    },
    [commitBlueprint, showToast],
  );

  // Place new furniture or relocate currently moving furniture (Free Place + Tabletop Stacking + Grid Snap!)
  const handlePlaceFurniture = useCallback(
    (payload: FurniturePlacePayload) => {
      const t = toolRef.current;
      const bp = cloneBlueprint(blueprintRef.current);

      if (t.movingPlacedUid) {
        const idx = bp.furniture.findIndex((f) => f.uid === t.movingPlacedUid);
        if (idx === -1) return;
        const item = bp.furniture[idx];
        const def = getFurnitureDef(item.defId, customDefsRef.current);
        if (!def) return;

        if (
          !canPlaceFurniture(
            bp,
            item.defId,
            payload.gx,
            payload.gz,
            payload.rotation,
            item.uid,
            customDefsRef.current,
            payload.isFree ? 'free' : 'snap',
            { wx: payload.wx, wy: payload.wy, wz: payload.wz },
          )
        ) {
          soundEngine.playError();
          showToast(
            def.wallMount
              ? 'Wall decorations must be placed against a wall.'
              : 'Space is occupied or outside build plot.',
          );
          return;
        }

        item.gx = payload.gx;
        item.gz = payload.gz;
        item.rotation = payload.rotation;
        if (payload.isFree) {
          item.wx = payload.wx;
          item.wy = payload.wy;
          item.wz = payload.wz;
          item.rotY = payload.rotY;
        } else {
          delete item.wx;
          delete item.wy;
          delete item.wz;
          delete item.rotY;
        }
        soundEngine.playPlace(def.width * def.depth >= 4);
        commitBlueprint(bp, true, { wx: payload.wx, wy: payload.wy, wz: payload.wz });
        setTool((prev) => ({ ...prev, movingPlacedUid: null, selectedPlacedUid: item.uid }));
        return;
      }

      if (!t.selectedFurnitureDefId) return;
      const def = getFurnitureDef(t.selectedFurnitureDefId, customDefsRef.current);
      if (!def) return;

      if (
        !canPlaceFurniture(
          bp,
          def.id,
          payload.gx,
          payload.gz,
          payload.rotation,
          undefined,
          customDefsRef.current,
          payload.isFree ? 'free' : 'snap',
          { wx: payload.wx, wy: payload.wy, wz: payload.wz },
        )
      ) {
        soundEngine.playError();
        showToast(
          def.wallMount
            ? 'Hang wall decor along any wall edge (press R to pick corner wall).'
            : 'Cannot place here — switch to Free Place (G) or choose clear floor space.',
        );
        return;
      }

      const placed: PlacedFurniture = {
        uid: nextUid('item'),
        defId: def.id,
        gx: payload.gx,
        gz: payload.gz,
        rotation: payload.rotation,
        color: def.defaultColor,
        ...(payload.isFree
          ? {
              wx: payload.wx,
              wy: payload.wy,
              wz: payload.wz,
              rotY: payload.rotY,
            }
          : {}),
      };
      bp.furniture.push(placed);
      soundEngine.playPlace(def.width * def.depth >= 4);
      commitBlueprint(bp, true, { wx: payload.wx, wy: payload.wy, wz: payload.wz });
    },
    [commitBlueprint, showToast],
  );

  const handleSelectFurniture = useCallback((uid: string | null) => {
    if (uid) soundEngine.playRotate();
    setTool((prev) => ({
      ...prev,
      selectedPlacedUid: uid,
      movingPlacedUid: null,
      selectedCustomWallId: null,
      movingCustomWallId: null,
      selectedRoomId: null,
      movingRoomScope: null,
    }));
  }, []);

  const handleSelectCustomWall = useCallback((wallId: string | null) => {
    if (wallId) soundEngine.playRotate();
    setTool((prev) => ({
      ...prev,
      selectedPlacedUid: null,
      movingPlacedUid: null,
      selectedCustomWallId: wallId,
      movingCustomWallId: null,
      selectedRoomId: null,
      movingRoomScope: null,
    }));
  }, []);

  const handleSelectRoomAtTile = useCallback((gx: number, gz: number) => {
    const key = `${gx},${gz}`;
    const found = scoreRef.current.rooms.find((r) => r.tiles.includes(key));
    if (!found) return;
    soundEngine.playRotate();
    setTool((prev) => ({
      ...prev,
      selectedPlacedUid: null,
      movingPlacedUid: null,
      selectedCustomWallId: null,
      movingCustomWallId: null,
      selectedRoomId: found.id,
      movingRoomScope: null,
    }));
  }, []);

  const handleSelectRoomById = useCallback((roomId: number | null) => {
    if (roomId !== null) soundEngine.playRotate();
    setTool((prev) => ({
      ...prev,
      tab: roomId !== null && prev.tab !== 'select' && prev.tab !== 'goals' ? 'select' : prev.tab,
      selectedPlacedUid: null,
      movingPlacedUid: null,
      selectedCustomWallId: null,
      movingCustomWallId: null,
      selectedRoomId: roomId,
      movingRoomScope: null,
    }));
  }, []);

  // Update a placed custom wall's length, height, thickness, angle, position, or opening
  const handleUpdateCustomWall = useCallback(
    (
      wallId: string,
      patch: {
        lengthM?: number;
        height?: number;
        thickness?: number;
        deltaAngleDeg?: number;
        dx?: number;
        dz?: number;
        moveToX?: number;
        moveToZ?: number;
        opening?: WallOpeningType;
      },
    ) => {
      const bp = cloneBlueprint(blueprintRef.current);
      if (!bp.customWalls) return;
      const cw = bp.customWalls.find((w) => w.id === wallId);
      if (!cw) return;

      const bounds = getSiteBounds(bp);
      let cx = (cw.x1 + cw.x2) / 2;
      let cz = (cw.z1 + cw.z2) / 2;
      let len = Math.max(0.25, Math.hypot(cw.x2 - cw.x1, cw.z2 - cw.z1));
      let ang = Math.atan2(cw.z2 - cw.z1, cw.x2 - cw.x1);

      if (patch.lengthM !== undefined) {
        len = Math.max(0.5, Math.min(60, Number(patch.lengthM.toFixed(2))));
      }
      if (patch.deltaAngleDeg !== undefined) {
        ang += (patch.deltaAngleDeg * Math.PI) / 180;
      }
      if (patch.moveToX !== undefined && patch.moveToZ !== undefined) {
        cx = patch.moveToX;
        cz = patch.moveToZ;
      } else if (patch.dx !== undefined || patch.dz !== undefined) {
        cx += patch.dx ?? 0;
        cz += patch.dz ?? 0;
      }

      const halfDx = (Math.cos(ang) * len) / 2;
      const halfDz = (Math.sin(ang) * len) / 2;
      const spanX = Math.abs(halfDx);
      const spanZ = Math.abs(halfDz);
      // Keep wall endpoints inside land plot
      if (bounds.xMax - bounds.xMin >= spanX * 2) {
        cx = Math.max(bounds.xMin + spanX, Math.min(bounds.xMax - spanX, cx));
      } else {
        cx = bounds.centerX;
      }
      if (bounds.zMax - bounds.zMin >= spanZ * 2) {
        cz = Math.max(bounds.zMin + spanZ, Math.min(bounds.zMax - spanZ, cz));
      } else {
        cz = bounds.centerZ;
      }

      cw.x1 = Number((cx - halfDx).toFixed(3));
      cw.z1 = Number((cz - halfDz).toFixed(3));
      cw.x2 = Number((cx + halfDx).toFixed(3));
      cw.z2 = Number((cz + halfDz).toFixed(3));

      if (patch.height !== undefined) {
        cw.height = Math.max(0.5, Math.min(6.0, Number(patch.height.toFixed(2))));
      }
      if (patch.thickness !== undefined) {
        cw.thickness = Math.max(0.08, Math.min(0.6, Number(patch.thickness.toFixed(2))));
      }
      if (patch.opening !== undefined) {
        cw.opening = patch.opening;
      }

      soundEngine.playTile(4);
      commitBlueprint(bp, true);
    },
    [commitBlueprint],
  );

  const handleMoveCustomWallTo = useCallback(
    (wallId: string, wx: number, wz: number) => {
      handleUpdateCustomWall(wallId, { moveToX: wx, moveToZ: wz });
      setTool((prev) => ({ ...prev, movingCustomWallId: null, selectedCustomWallId: wallId }));
      showToast('Wall moved.');
    },
    [handleUpdateCustomWall, showToast],
  );

  const handleCloneCustomWall = useCallback(
    (wallId: string) => {
      const bp = cloneBlueprint(blueprintRef.current);
      if (!bp.customWalls) return;
      const src = bp.customWalls.find((w) => w.id === wallId);
      if (!src) return;
      const bounds = getSiteBounds(bp);
      const offX = src.x2 + 1 <= bounds.xMax ? 1 : -1;
      const cloned = {
        ...src,
        id: nextUid('wall'),
        x1: Number((src.x1 + offX).toFixed(3)),
        x2: Number((src.x2 + offX).toFixed(3)),
      };
      bp.customWalls.push(cloned);
      soundEngine.playWallSnap();
      commitBlueprint(bp, true);
      setTool((prev) => ({ ...prev, selectedCustomWallId: cloned.id, movingCustomWallId: null }));
      showToast('Cloned wall segment.');
    },
    [commitBlueprint, showToast],
  );

  const handleDeleteCustomWall = useCallback(
    (wallId: string) => {
      const bp = cloneBlueprint(blueprintRef.current);
      if (!bp.customWalls) return;
      bp.customWalls = bp.customWalls.filter((w) => w.id !== wallId);
      soundEngine.playRemove();
      commitBlueprint(bp, true);
      setTool((prev) => ({
        ...prev,
        selectedCustomWallId: prev.selectedCustomWallId === wallId ? null : prev.selectedCustomWallId,
        movingCustomWallId: null,
      }));
      showToast('Removed custom wall.');
    },
    [commitBlueprint, showToast],
  );

  const handleStartMoveCustomWall = useCallback(() => {
    const wid = toolRef.current.selectedCustomWallId;
    if (!wid) return;
    soundEngine.playRotate();
    setTool((prev) => ({
      ...prev,
      movingCustomWallId: prev.movingCustomWallId === wid ? null : wid,
    }));
  }, []);

  // Helper to resolve tile keys of the currently selected room or null for whole building
  const getActiveRoomTileSet = useCallback((): Set<string> | null => {
    const t = toolRef.current;
    if (t.roomEditScope === 'building') return null;
    if (t.selectedRoomId === null) return null;
    const room = scoreRef.current.rooms.find((r) => r.id === t.selectedRoomId);
    if (!room) return null;
    return new Set(room.tiles);
  }, []);

  const handleShiftRoom = useCallback(
    (dx: number, dz: number) => {
      const bp = cloneBlueprint(blueprintRef.current);
      const tileSet = getActiveRoomTileSet();
      const res = shiftRoomOrBuilding(bp, tileSet, dx, dz, customDefsRef.current);
      if (!res.ok) {
        soundEngine.playError();
        if (res.reason) showToast(res.reason);
        return;
      }
      soundEngine.playTile(dx * 3 + dz * 5);
      commitBlueprint(res.blueprint, true);
    },
    [commitBlueprint, getActiveRoomTileSet, showToast],
  );

  const handleMoveRoomToTile = useCallback(
    (gx: number, gz: number) => {
      const bp = cloneBlueprint(blueprintRef.current);
      const tileSet = toolRef.current.movingRoomScope === 'building' ? null : getActiveRoomTileSet();
      const box = getTileSetBounds(bp, tileSet);
      if (!box) return;
      const curCenterX = Math.floor((box.minX + box.maxX) / 2);
      const curCenterZ = Math.floor((box.minZ + box.maxZ) / 2);
      const dx = gx - curCenterX;
      const dz = gz - curCenterZ;
      if (dx === 0 && dz === 0) {
        setTool((prev) => ({ ...prev, movingRoomScope: null }));
        return;
      }
      const res = shiftRoomOrBuilding(bp, tileSet, dx, dz, customDefsRef.current);
      if (!res.ok) {
        soundEngine.playError();
        if (res.reason) showToast(res.reason);
        return;
      }
      soundEngine.playWallSnap();
      commitBlueprint(res.blueprint, true);
      setTool((prev) => ({ ...prev, movingRoomScope: null }));
      showToast(
        toolRef.current.movingRoomScope === 'building' ? 'Moved entire building.' : 'Moved room.',
      );
    },
    [commitBlueprint, getActiveRoomTileSet, showToast],
  );

  const handleCenterRoom = useCallback(() => {
    const bp = cloneBlueprint(blueprintRef.current);
    const tileSet = getActiveRoomTileSet();
    const res = centerRoomOrBuildingInLot(bp, tileSet, customDefsRef.current);
    if (!res.ok) {
      soundEngine.playError();
      if (res.reason) showToast(res.reason);
      return;
    }
    soundEngine.playWallSnap();
    commitBlueprint(res.blueprint, true);
    showToast(
      tileSet === null ? 'Centered whole building inside your land lot.' : 'Centered room in land lot.',
    );
  }, [commitBlueprint, getActiveRoomTileSet, showToast]);

  const handleRotateRoom = useCallback(() => {
    const bp = cloneBlueprint(blueprintRef.current);
    const tileSet = getActiveRoomTileSet();
    const res = rotateRoomOrBuilding90(bp, tileSet, customDefsRef.current);
    if (!res.ok) {
      soundEngine.playError();
      if (res.reason) showToast(res.reason);
      return;
    }
    soundEngine.playWallSnap();
    commitBlueprint(res.blueprint, true);
    showToast(tileSet === null ? 'Rotated building 90°.' : 'Rotated room 90°.');
  }, [commitBlueprint, getActiveRoomTileSet, showToast]);

  const handleResizeSelectedRoom = useCallback(
    (dw: number, dd: number) => {
      const bp = cloneBlueprint(blueprintRef.current);
      const tileSet = getActiveRoomTileSet();
      const targetSet = tileSet ?? new Set(Object.keys(bp.tiles));
      const res = resizeSelectedRoom(bp, targetSet, dw, dd, customDefsRef.current);
      if (!res.ok) {
        soundEngine.playError();
        if (res.reason) showToast(res.reason);
        return;
      }
      soundEngine.playTile(dw + dd + 4);
      commitBlueprint(res.blueprint, true);
    },
    [commitBlueprint, getActiveRoomTileSet, showToast],
  );

  const handleChangeRoomZone = useCallback(
    (zone: RoomZoneId) => {
      const bp = cloneBlueprint(blueprintRef.current);
      const tileSet = getActiveRoomTileSet();
      const keys = tileSet ? Array.from(tileSet) : Object.keys(bp.tiles);
      for (const k of keys) {
        if (bp.tiles[k]) bp.tiles[k].zone = zone;
      }
      soundEngine.playTile(6);
      commitBlueprint(bp, true);
    },
    [commitBlueprint, getActiveRoomTileSet],
  );

  const handleDeleteSelectedRoom = useCallback(() => {
    const bp = cloneBlueprint(blueprintRef.current);
    const tileSet = getActiveRoomTileSet();
    const nextBp = deleteSelectedRoom(bp, tileSet, customDefsRef.current);
    soundEngine.playRemove();
    commitBlueprint(nextBp, true);
    setTool((prev) => ({ ...prev, selectedRoomId: null, movingRoomScope: null }));
    showToast(tileSet === null ? 'Cleared building layout.' : 'Removed selected room.');
  }, [commitBlueprint, getActiveRoomTileSet, showToast]);

  const handleStartMoveRoom = useCallback(() => {
    const t = toolRef.current;
    if (t.selectedRoomId === null) return;
    soundEngine.playRotate();
    setTool((prev) => ({
      ...prev,
      movingRoomScope: prev.movingRoomScope ? null : prev.roomEditScope,
    }));
  }, []);

  // Mount Three.js WebGL Engine ONCE inside isolated canvas container
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const engine = new RoomBuilderEngine(el, {
      onTileInteract: (gx, gz, isDrag) => handleTileInteract(gx, gz, isDrag),
      onEdgeInteract: (axis, ex, ez) => handleEdgeInteract(axis, ex, ez),
      onCustomWallInteract: (wallId) => handleCustomWallInteract(wallId),
      onAddCustomWall: (x1, z1, x2, z2) => handleAddCustomWall(x1, z1, x2, z2),
      onWallDrawStatus: (st) => setWallDrawStatus(st),
      onPeopleUpdate: (tel) =>
        setPeopleHud((prev) => ({
          ...prev,
          lotX: tel.lotX,
          lotZ: tel.lotZ,
          headingDeg: tel.headingDeg,
          zoneLabel: tel.zoneLabel,
        })),
      onPersonPlaced: () => {
        soundEngine.playTile(5);
        setPeopleHud((prev) => ({ ...prev, placingPerson: false, showPerson: true }));
        showToast('Scale person relocated — click Walk POV to see eye-level view.');
      },
      onPlaceFurniture: (payload) => handlePlaceFurniture(payload),
      onSelectFurniture: (uid) => handleSelectFurniture(uid),
      onSelectCustomWall: (wallId) => handleSelectCustomWall(wallId),
      onSelectRoomAtTile: (gx, gz) => handleSelectRoomAtTile(gx, gz),
      onMoveCustomWallTo: (wallId, wx, wz) => handleMoveCustomWallTo(wallId, wx, wz),
      onMoveRoomToTile: (gx, gz) => handleMoveRoomToTile(gx, gz),
      onDimensionLabels: (labels) => setDimensionLabels(labels),
      onRoomLabels: (labels) => setRoomLabels(labels),
      onWebGLFallback: () => setWebglLost(true),
    });

    engineRef.current = engine;
    engine.syncCustomDefs(customDefsRef.current);
    engine.setLightingMood(moodRef.current);
    engine.setWallViewMode(wallViewRef.current);
    engine.setShowRoomLabels(true);
    engine.setShowUpperFloors(true);
    engine.syncBlueprint(blueprintRef.current);
    engine.syncToolState(toolRef.current);
    engine.setTitleShowcase(screenRef.current === 'title');

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [
    handleAddCustomWall,
    handleCustomWallInteract,
    handleEdgeInteract,
    handleMoveCustomWallTo,
    handleMoveRoomToTile,
    handlePlaceFurniture,
    handleSelectCustomWall,
    handleSelectFurniture,
    handleSelectRoomAtTile,
    handleTileInteract,
    showToast,
  ]);

  // Auto-save current blueprint & studio settings to localStorage whenever design changes
  useEffect(() => {
    if (screen === 'title' && !hasSavedDesign) return;
    const timer = window.setTimeout(() => {
      const ok = saveStudioSession({
        playMode,
        commissionIdx,
        completedIds,
        mood,
        wallView,
        blueprint,
        customDefs,
      });
      if (ok && !hasSavedDesign) {
        setHasSavedDesign(true);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [screen, hasSavedDesign, playMode, commissionIdx, completedIds, mood, wallView, blueprint, customDefs]);

  // Synchronous flush on tab close or page refresh so the latest edit is never lost
  useEffect(() => {
    const flushSave = () => {
      if (screenRef.current === 'title' && !hasSavedDesignRef.current) return;
      saveStudioSession({
        playMode: playModeRef.current,
        commissionIdx: commissionIdxRef.current,
        completedIds: completedIdsRef.current,
        mood: moodRef.current,
        wallView: wallViewRef.current,
        blueprint: blueprintRef.current,
        customDefs: customDefsRef.current,
      });
    };
    const onVisChange = () => {
      if (document.visibilityState === 'hidden') flushSave();
    };
    window.addEventListener('beforeunload', flushSave);
    document.addEventListener('visibilitychange', onVisChange);
    return () => {
      window.removeEventListener('beforeunload', flushSave);
      document.removeEventListener('visibilitychange', onVisChange);
    };
  }, []);

  // Sync tool state, selected room tiles, custom defs, and screen mode into engine without re-mounting WebGL
  useEffect(() => {
    engineRef.current?.syncToolState(tool);
  }, [tool]);

  useEffect(() => {
    if (tool.selectedRoomId === null) {
      engineRef.current?.syncSelectedRoomTiles([]);
      return;
    }
    if (tool.roomEditScope === 'building') {
      engineRef.current?.syncSelectedRoomTiles(Object.keys(blueprint.tiles));
      return;
    }
    const found = score.rooms.find((r) => r.id === tool.selectedRoomId);
    engineRef.current?.syncSelectedRoomTiles(found ? found.tiles : []);
  }, [tool.selectedRoomId, tool.roomEditScope, score.rooms, blueprint.tiles]);

  useEffect(() => {
    engineRef.current?.syncCustomDefs(customDefs);
  }, [customDefs]);

  useEffect(() => {
    engineRef.current?.setTitleShowcase(screen === 'title');
  }, [screen]);

  useEffect(() => {
    engineRef.current?.setWallDrawOptions(wallDrawOptions);
  }, [wallDrawOptions]);

  useEffect(() => {
    engineRef.current?.setPlanModeLock(isPlanView);
  }, [isPlanView]);

  useEffect(() => {
    engineRef.current?.setShowDimensions(showDimensions);
    if (!showDimensions) {
      setDimensionLabels([]);
    }
  }, [showDimensions]);

  useEffect(() => {
    engineRef.current?.setShowRoomLabels(showRoomLabels);
    if (!showRoomLabels) {
      setRoomLabels([]);
    }
  }, [showRoomLabels]);

  useEffect(() => {
    engineRef.current?.setShowUpperFloors(showUpperFloors);
  }, [showUpperFloors]);

  const handleToggleDimensions = useCallback(() => {
    soundEngine.playRotate();
    setShowDimensions((prev) => {
      const next = !prev;
      showToast(
        next
          ? 'Ukuran & jarak antar bidang AKTIF (T)'
          : 'Ukuran & jarak disembunyikan (T)',
      );
      return next;
    });
  }, [showToast]);

  const handleToggleRoomLabels = useCallback(() => {
    soundEngine.playRotate();
    setShowRoomLabels((prev) => {
      const next = !prev;
      showToast(next ? 'Label nama ruangan ditampilkan.' : 'Label nama ruangan disembunyikan.');
      return next;
    });
  }, [showToast]);

  const handleToggleUpperFloors = useCallback(() => {
    soundEngine.playRotate();
    setShowUpperFloors((prev) => {
      const next = !prev;
      showToast(
        next
          ? 'Lantai atas ditampilkan di tampilan 3D.'
          : 'Lantai atas disembunyikan agar mudah mengedit lantai bawah.',
      );
      return next;
    });
  }, [showToast]);

  const handleSwitchFloor = useCallback(
    (floorIdx: number) => {
      const cur = blueprintRef.current;
      if (getActiveFloorIndex(cur) === floorIdx) return;
      const nextBp = switchBlueprintFloor(cur, floorIdx);
      soundEngine.playWallSnap();
      setTool((prev) => ({
        ...prev,
        selectedPlacedUid: null,
        movingPlacedUid: null,
        selectedCustomWallId: null,
        movingCustomWallId: null,
        selectedRoomId: null,
        movingRoomScope: null,
      }));
      commitBlueprint(nextBp, false);
      showToast(`Aktif di Lantai ${floorIdx + 1}`);
    },
    [commitBlueprint, showToast],
  );

  const handleAddUpperFloor = useCallback(
    (copyBelow: boolean) => {
      const cur = blueprintRef.current;
      const curCount = getBlueprintFloorCount(cur);
      if (curCount >= 3) {
        soundEngine.playError();
        showToast('Maksimal 3 lantai (Lantai 1, 2, dan 3 / Rooftop).');
        return;
      }
      const nextBp = addUpperFloor(cur, copyBelow);
      soundEngine.playFanfare();
      setTool((prev) => ({
        ...prev,
        selectedPlacedUid: null,
        movingPlacedUid: null,
        selectedCustomWallId: null,
        movingCustomWallId: null,
        selectedRoomId: null,
        movingRoomScope: null,
      }));
      commitBlueprint(nextBp, true);
      showToast(
        copyBelow
          ? `Lantai ${curCount + 1} ditambahkan (menyalin denah lantai di bawah).`
          : `Lantai ${curCount + 1} kosong siap dirancang!`,
      );
    },
    [commitBlueprint, showToast],
  );

  const handleRemoveTopFloor = useCallback(() => {
    const cur = blueprintRef.current;
    const curCount = getBlueprintFloorCount(cur);
    if (curCount <= 1) return;
    const nextBp = removeTopFloor(cur);
    soundEngine.playRemove();
    setTool((prev) => ({
      ...prev,
      selectedPlacedUid: null,
      movingPlacedUid: null,
      selectedCustomWallId: null,
      movingCustomWallId: null,
      selectedRoomId: null,
      movingRoomScope: null,
    }));
    commitBlueprint(nextBp, true);
    showToast(`Lantai ${curCount} dihapus.`);
  }, [commitBlueprint, showToast]);

  const handleRenameRoom = useCallback(
    (roomId: number, newName: string) => {
      const room = scoreRef.current.rooms.find((r) => r.id === roomId);
      if (!room) return;
      const nextBp = setRoomCustomName(cloneBlueprint(blueprintRef.current), room, newName);
      soundEngine.playTile(4);
      commitBlueprint(nextBp, true);
      showToast(
        newName.trim()
          ? `Nama ruangan diubah menjadi "${newName.trim()}".`
          : 'Nama ruangan dikembalikan ke standar.',
      );
    },
    [commitBlueprint, showToast],
  );

  const handleUpdateRoomLight = useCallback(
    (roomId: number, patch: Partial<RoomLightConfig> | null, recordUndo = false) => {
      const room = scoreRef.current.rooms.find((r) => r.id === roomId);
      if (!room) return;
      const prevBp = blueprintRef.current;
      const nextBp = setRoomLightConfig(cloneBlueprint(prevBp), room, patch);
      if (recordUndo) {
        setUndoStack((prev) => [...prev.slice(-34), cloneBlueprint(prevBp)]);
        setRedoStack([]);
        soundEngine.playTile(5);
      }
      setBlueprint(nextBp);
      engineRef.current?.syncRoomLights(nextBp);
      if (patch === null) {
        showToast('Room lighting reset to default ambiance.');
      }
    },
    [showToast],
  );

  const handleApplyRoomLightToAll = useCallback(
    (config: RoomLightConfig) => {
      const rooms = scoreRef.current.rooms;
      if (rooms.length === 0) return;
      const prevBp = blueprintRef.current;
      const nextBp = applyRoomLightToAll(cloneBlueprint(prevBp), rooms, config);
      setUndoStack((prev) => [...prev.slice(-34), cloneBlueprint(prevBp)]);
      setRedoStack([]);
      setBlueprint(nextBp);
      engineRef.current?.syncRoomLights(nextBp);
      soundEngine.playWallSnap();
      showToast(`Applied lighting ambiance to all ${rooms.length} rooms.`);
    },
    [showToast],
  );

  const handleExportScreenshotPng = useCallback(() => {
    const dataUrl = engineRef.current?.captureScreenshotDataUrl();
    if (!dataUrl) {
      soundEngine.playError();
      showToast('Gagal mengambil foto render 3D.');
      return;
    }
    const slug = (activeProjectName || 'roomsmith')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${slug || 'roomsmith'}-render.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    soundEngine.playFanfare();
    showToast('Foto render 3D (.PNG) berhasil diunduh!');
  }, [activeProjectName, showToast]);

  const handleSaveProjectSlot = useCallback(
    (name: string, overwriteId?: string) => {
      const list = saveNamedProject(
        name,
        {
          playMode: playModeRef.current,
          commissionIdx: commissionIdxRef.current,
          completedIds: completedIdsRef.current,
          mood: moodRef.current,
          wallView: wallViewRef.current,
          blueprint: blueprintRef.current,
          customDefs: customDefsRef.current,
        },
        overwriteId,
      );
      if (!list) {
        soundEngine.playError();
        showToast('Penyimpanan browser penuh — coba ekspor ke file .JSON.');
        return;
      }
      setSavedProjects(list);
      setActiveProjectName(name.trim() || 'Desain Utama');
      soundEngine.playWallSnap();
      showToast(`Proyek "${name.trim() || 'Desain Utama'}" tersimpan!`);
    },
    [showToast],
  );

  const handleLoadProjectSlot = useCallback(
    (record: SavedProjectRecord) => {
      const s = record.session;
      const bp = cloneBlueprint(s.blueprint);
      setPlayMode(s.playMode);
      setCommissionIdx(Math.min(COMMISSIONS.length - 1, s.commissionIdx));
      setCompletedIds(s.completedIds);
      setMood(s.mood);
      setWallView(s.wallView);
      setCustomDefs(s.customDefs);
      setActiveProjectName(record.name);
      setUndoStack([]);
      setRedoStack([]);
      setIsPlanView(false);
      setPeopleHud((p) => (p.walkMode ? { ...p, walkMode: false } : p));
      setTool((prev) => ({
        ...prev,
        selectedPlacedUid: null,
        movingPlacedUid: null,
        selectedCustomWallId: null,
        movingCustomWallId: null,
        selectedRoomId: null,
        movingRoomScope: null,
      }));
      engineRef.current?.syncCustomDefs(s.customDefs);
      engineRef.current?.setLightingMood(s.mood);
      engineRef.current?.setWallViewMode(s.wallView);
      setBlueprint(bp);
      engineRef.current?.syncBlueprint(bp);
      engineRef.current?.setCameraPreset('iso');
      setProjectModalOpen(false);
      soundEngine.playFanfare();
      showToast(`Membuka proyek "${record.name}".`);
    },
    [showToast],
  );

  const handleDeleteProjectSlot = useCallback(
    (id: string) => {
      const next = deleteNamedProject(id);
      setSavedProjects(next);
      soundEngine.playRemove();
      showToast('Proyek dihapus dari daftar tersimpan.');
    },
    [showToast],
  );

  const handleExportProjectJson = useCallback(
    (name: string) => {
      const jsonStr = exportProjectJson(name, {
        playMode: playModeRef.current,
        commissionIdx: commissionIdxRef.current,
        completedIds: completedIdsRef.current,
        mood: moodRef.current,
        wallView: wallViewRef.current,
        blueprint: blueprintRef.current,
        customDefs: customDefsRef.current,
      });
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const slug = (name || 'roomsmith')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug || 'roomsmith'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      soundEngine.playWallSnap();
      showToast(`File proyek "${slug || 'desain'}.json" berhasil diekspor!`);
    },
    [showToast],
  );

  const handleImportProjectJson = useCallback(
    (rawJson: string) => {
      const parsed = parseImportedProjectJson(rawJson);
      if (!parsed) {
        soundEngine.playError();
        showToast('Format file .JSON tidak valid untuk Roomsmith.');
        return;
      }
      const s = parsed.session;
      const bp = cloneBlueprint(s.blueprint);
      setPlayMode(s.playMode);
      setCommissionIdx(Math.min(COMMISSIONS.length - 1, s.commissionIdx));
      setCompletedIds(s.completedIds);
      setMood(s.mood);
      setWallView(s.wallView);
      setCustomDefs(s.customDefs);
      setActiveProjectName(parsed.name);
      setUndoStack([]);
      setRedoStack([]);
      setIsPlanView(false);
      setTool((prev) => ({
        ...prev,
        selectedPlacedUid: null,
        movingPlacedUid: null,
        selectedCustomWallId: null,
        movingCustomWallId: null,
        selectedRoomId: null,
        movingRoomScope: null,
      }));
      engineRef.current?.syncCustomDefs(s.customDefs);
      engineRef.current?.setLightingMood(s.mood);
      engineRef.current?.setWallViewMode(s.wallView);
      setBlueprint(bp);
      engineRef.current?.syncBlueprint(bp);
      engineRef.current?.setCameraPreset('iso');
      setProjectModalOpen(false);
      soundEngine.playFanfare();
      showToast(`Proyek "${parsed.name}" berhasil diimpor!`);
    },
    [showToast],
  );

  useEffect(() => {
    engineRef.current?.syncPeopleConfig({
      showPerson: peopleHud.showPerson,
      walkMode: peopleHud.walkMode,
      placingPerson: peopleHud.placingPerson,
      heightM: peopleHud.heightM,
    });
  }, [peopleHud.showPerson, peopleHud.walkMode, peopleHud.placingPerson, peopleHud.heightM]);

  const handleUpdateTool = useCallback((patch: Partial<BuilderToolState>) => {
    setTool((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleUpdateWallDrawOptions = useCallback((patch: Partial<WallDrawOptions>) => {
    setWallDrawOptions((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleCancelWallDraw = useCallback(() => {
    engineRef.current?.cancelWallDraw();
    soundEngine.playRemove();
  }, []);

  const handleCommitExactWallLength = useCallback(
    (lengthM: number) => {
      const ok = engineRef.current?.commitExactLengthWall(lengthM);
      if (ok) {
        soundEngine.playWallSnap();
      } else {
        soundEngine.playError();
        showToast('Click a start point on the lot first, then enter length.');
      }
    },
    [showToast],
  );

  const handleUpdatePeopleHud = useCallback(
    (patch: Partial<PeopleHudState>) => {
      setPeopleHud((prev) => {
        const next = { ...prev, ...patch };
        if (patch.panelOpen === true && !prev.showPerson && patch.showPerson === undefined) {
          next.showPerson = true;
        }
        if (patch.walkMode === true) {
          next.showPerson = true;
          next.placingPerson = false;
          setIsPlanView(false);
          setWallView('full');
          engineRef.current?.setWallViewMode('full');
          showToast('Walk POV active — WASD to walk, drag screen to look around (Esc to exit).');
        } else if (patch.walkMode === false && prev.walkMode) {
          setWallView('cutaway');
          engineRef.current?.setWallViewMode('cutaway');
          showToast('Exited Walk POV.');
        } else if (patch.placingPerson === true) {
          next.showPerson = true;
          next.walkMode = false;
          showToast('Click anywhere on the lot or floor to place the scale person.');
        }
        return next;
      });
    },
    [showToast],
  );

  const handleCenterPerson = useCallback(() => {
    engineRef.current?.movePersonToCenter();
    soundEngine.playRotate();
    showToast('Moved scale person to lot center.');
  }, [showToast]);

  const handleContinueSaved = useCallback(() => {
    soundEngine.playRotate();
    setScreen('playing');
  }, []);

  const handleStartGame = useCallback(
    (mode: PlayMode) => {
      soundEngine.playRotate();
      setPlayMode(mode);
      setUndoStack([]);
      setRedoStack([]);
      setIsPlanView(false);
      if (mode === 'commission') {
        const targetComm = COMMISSIONS[commissionIdx] || COMMISSIONS[0];
        const bp = cloneBlueprint(targetComm.starterBlueprint);
        setBlueprint(bp);
        setMood(targetComm.recommendedMood);
        setWallView('cutaway');
        engineRef.current?.setLightingMood(targetComm.recommendedMood);
        engineRef.current?.setWallViewMode('cutaway');
        engineRef.current?.syncBlueprint(bp);
        setTool({ ...INITIAL_TOOL, tab: 'goals', selectedFurnitureDefId: null });
      } else {
        const bp = createShowcaseBlueprint();
        setBlueprint(bp);
        setMood('golden');
        setWallView('cutaway');
        engineRef.current?.setLightingMood('golden');
        engineRef.current?.setWallViewMode('cutaway');
        engineRef.current?.syncBlueprint(bp);
        setTool({ ...INITIAL_TOOL, tab: 'furniture', selectedFurnitureDefId: 'l_sofa' });
      }
      setScreen('playing');
    },
    [commissionIdx],
  );

  const handleStartNewSite = useCallback(() => {
    soundEngine.playWallSnap();
    setPlayMode('sandbox');
    setUndoStack([]);
    setRedoStack([]);
    const blank = createBlankBlueprint({
      landWidth: 14,
      landDepth: 12,
      foundationStyle: 'concrete',
      foundationHeight: 0.3,
      showCeiling: true,
    });
    setBlueprint(blank);
    setMood('morning');
    setWallView('low');
    setIsPlanView(true);
    engineRef.current?.setLightingMood('morning');
    engineRef.current?.setWallViewMode('low');
    engineRef.current?.syncBlueprint(blank);
    engineRef.current?.setCameraPreset('plan');
    setTool({
      ...INITIAL_TOOL,
      tab: 'layout',
      layoutSubTool: 'floor_add',
      selectedFurnitureDefId: null,
    });
    setScreen('playing');
    showToast('2D Floor Plan ready — set land size, pour foundation, and sketch walls.');
  }, [showToast]);

  const handleSelectCommission = useCallback((index: number) => {
    const safeIdx = Math.max(0, Math.min(COMMISSIONS.length - 1, index));
    const comm = COMMISSIONS[safeIdx];
    setCommissionIdx(safeIdx);
    setPlayMode('commission');
    setUndoStack([]);
    setRedoStack([]);
    const bp = cloneBlueprint(comm.starterBlueprint);
    setBlueprint(bp);
    setMood(comm.recommendedMood);
    engineRef.current?.setLightingMood(comm.recommendedMood);
    engineRef.current?.syncBlueprint(bp);
    setTool({ ...INITIAL_TOOL, tab: 'goals', selectedFurnitureDefId: null });
    soundEngine.playRotate();
  }, []);

  const handleSwitchMode = useCallback(
    (mode: PlayMode) => {
      if (mode === 'commission') {
        handleSelectCommission(commissionIdx);
      } else {
        setPlayMode('sandbox');
        soundEngine.playRotate();
        showToast('Freebuild Sandbox — unlimited budget unlocked.');
      }
    },
    [commissionIdx, handleSelectCommission, showToast],
  );

  const handleResetRoom = useCallback(() => {
    const fresh =
      playMode === 'commission'
        ? cloneBlueprint(commission.starterBlueprint)
        : createShowcaseBlueprint();
    commitBlueprint(fresh, true);
    setTool((prev) => ({ ...prev, selectedPlacedUid: null, movingPlacedUid: null }));
    soundEngine.playRemove();
    showToast('Room layout reset.');
  }, [commission, commitBlueprint, playMode, showToast]);

  const handleLoadShowcase = useCallback(() => {
    const showcase = createShowcaseBlueprint();
    commitBlueprint(showcase, true);
    setTool((prev) => ({ ...prev, selectedPlacedUid: null, movingPlacedUid: null }));
    soundEngine.playWallSnap();
    showToast('Showcase Villa loaded.');
  }, [commitBlueprint, showToast]);

  const handleRotateAction = useCallback(
    (stepDeg?: number) => {
      const t = toolRef.current;
      // Rotate selected placed item in place
      if (t.selectedPlacedUid && !t.movingPlacedUid && t.tab !== 'furniture') {
        const bp = cloneBlueprint(blueprintRef.current);
        const item = bp.furniture.find((f) => f.uid === t.selectedPlacedUid);
        if (!item) return;

        if (t.placementMode === 'free' || item.wx !== undefined) {
          const curRad = item.rotY !== undefined ? item.rotY : -item.rotation * (Math.PI / 2);
          const deltaRad = -((stepDeg ?? 15) * Math.PI) / 180;
          item.rotY = curRad + deltaRad;
          soundEngine.playRotate();
          commitBlueprint(bp, true);
          return;
        }

        const dir = stepDeg !== undefined && stepDeg < 0 ? 3 : 1;
        const nextRot = ((item.rotation + dir) % 4) as 0 | 1 | 2 | 3;
        if (
          !canPlaceFurniture(
            bp,
            item.defId,
            item.gx,
            item.gz,
            nextRot,
            item.uid,
            customDefsRef.current,
            'snap',
          )
        ) {
          soundEngine.playError();
          showToast('Not enough clearance to rotate — switch to Free Place (G) or Move (M).');
          return;
        }
        item.rotation = nextRot;
        soundEngine.playRotate();
        commitBlueprint(bp, true);
        return;
      }

      // Rotate ghost preview
      soundEngine.playRotate();
      setTool((prev) => {
        if (prev.placementMode === 'free') {
          const nextDeg = (prev.placementAngleDeg + (stepDeg ?? 15) + 360) % 360;
          return {
            ...prev,
            placementAngleDeg: nextDeg,
            placementRotation: (Math.round(nextDeg / 90) % 4) as 0 | 1 | 2 | 3,
          };
        }
        const dir = stepDeg !== undefined && stepDeg < 0 ? 3 : 1;
        const nextRot = ((prev.placementRotation + dir) % 4) as 0 | 1 | 2 | 3;
        return {
          ...prev,
          placementRotation: nextRot,
          placementAngleDeg: nextRot * 90,
        };
      });
    },
    [commitBlueprint, showToast],
  );

  // Camera-relative keyboard nudging for the currently selected object (Arrow keys)
  const handleNudgeSelected = useCallback(
    (dirForward: number, dirRight: number, fine: boolean) => {
      const t = toolRef.current;
      const uid = t.selectedPlacedUid;
      if (!uid) return;
      const bp = cloneBlueprint(blueprintRef.current);
      const item = bp.furniture.find((f) => f.uid === uid);
      if (!item) return;
      const def = getFurnitureDef(item.defId, customDefsRef.current);
      if (!def) return;

      const basis = engineRef.current?.getCameraHorizontalBasis() || {
        fx: 0,
        fz: -1,
        rx: 1,
        rz: 0,
      };
      const vx = basis.fx * dirForward + basis.rx * dirRight;
      const vz = basis.fz * dirForward + basis.rz * dirRight;
      const vLen = Math.hypot(vx, vz) || 1;
      const nx = vx / vLen;
      const nz = vz / vLen;

      if (t.placementMode === 'snap' && item.wx === undefined) {
        // Snap by 1 grid tile along the dominant world axis matching the camera direction
        const stepX = Math.abs(nx) >= Math.abs(nz) ? Math.sign(nx) : 0;
        const stepZ = Math.abs(nz) > Math.abs(nx) ? Math.sign(nz) : 0;
        const nextGx = item.gx + stepX;
        const nextGz = item.gz + stepZ;
        if (
          !canPlaceFurniture(
            bp,
            item.defId,
            nextGx,
            nextGz,
            item.rotation,
            item.uid,
            customDefsRef.current,
            'snap',
          )
        ) {
          soundEngine.playError();
          return;
        }
        item.gx = nextGx;
        item.gz = nextGz;
        soundEngine.playTile(nextGx + nextGz);
        commitBlueprint(bp, true);
        return;
      }

      const cur = resolveFurnitureTransform(item, def, bp.gridSize);
      const step = fine ? 0.03 : 0.15;
      const bounds = getSiteBounds(bp);
      const nextWx = Math.max(
        bounds.xMin + 0.15,
        Math.min(bounds.xMax - 0.15, Number((cur.wx + nx * step).toFixed(3))),
      );
      const nextWz = Math.max(
        bounds.zMin + 0.15,
        Math.min(bounds.zMax - 0.15, Number((cur.wz + nz * step).toFixed(3))),
      );
      item.wx = nextWx;
      item.wy = cur.wy;
      item.wz = nextWz;
      if (item.rotY === undefined) item.rotY = cur.rotY;
      item.gx = Math.max(0, Math.min(bp.gridSize - 1, Math.floor(nextWx + bp.gridSize / 2)));
      item.gz = Math.max(0, Math.min(bp.gridSize - 1, Math.floor(nextWz + bp.gridSize / 2)));
      soundEngine.playTile(Math.round((nextWx + nextWz) * 5));
      commitBlueprint(bp, true);
    },
    [commitBlueprint],
  );

  const handleDeleteSelected = useCallback(() => {
    const uid = toolRef.current.selectedPlacedUid;
    if (!uid) return;
    const bp = cloneBlueprint(blueprintRef.current);
    const removed = bp.furniture.find((f) => f.uid === uid);
    bp.furniture = bp.furniture.filter((f) => f.uid !== uid);
    soundEngine.playRemove();
    commitBlueprint(bp, true);
    setTool((prev) => ({ ...prev, selectedPlacedUid: null, movingPlacedUid: null }));
    if (removed) {
      const def = getFurnitureDef(removed.defId, customDefsRef.current);
      if (def) showToast(`Removed ${def.name}`);
    }
  }, [commitBlueprint, showToast]);

  const handleDuplicateSelected = useCallback(() => {
    const uid = toolRef.current.selectedPlacedUid;
    if (!uid) return;
    const item = blueprintRef.current.furniture.find((f) => f.uid === uid);
    if (!item) return;
    soundEngine.playRotate();
    setTool((prev) => ({
      ...prev,
      tab: 'furniture',
      selectedFurnitureDefId: item.defId,
      placementRotation: item.rotation,
      movingPlacedUid: null,
    }));
    showToast('Click anywhere (floor or tabletop) to place duplicate.');
  }, [showToast]);

  const handleChangeSelectedColor = useCallback(
    (hex: string) => {
      const uid = toolRef.current.selectedPlacedUid;
      if (!uid) return;
      const bp = cloneBlueprint(blueprintRef.current);
      const item = bp.furniture.find((f) => f.uid === uid);
      if (!item) return;
      item.color = hex;
      soundEngine.playTile(3);
      commitBlueprint(bp, true);
    },
    [commitBlueprint],
  );

  const handleAdjustSelectedTransform = useCallback(
    (patch: { wy?: number; scale?: number }) => {
      const uid = toolRef.current.selectedPlacedUid;
      if (!uid) return;
      const bp = cloneBlueprint(blueprintRef.current);
      const item = bp.furniture.find((f) => f.uid === uid);
      if (!item) return;
      if (patch.wy !== undefined) item.wy = patch.wy;
      if (patch.scale !== undefined) item.scale = patch.scale;
      soundEngine.playTile(5);
      commitBlueprint(bp, true);
    },
    [commitBlueprint],
  );

  const handleStartMoveSelected = useCallback(() => {
    const uid = toolRef.current.selectedPlacedUid;
    if (!uid) return;
    const item = blueprintRef.current.furniture.find((f) => f.uid === uid);
    if (!item) return;
    soundEngine.playRotate();
    setTool((prev) => ({
      ...prev,
      movingPlacedUid: prev.movingPlacedUid === uid ? null : uid,
      placementRotation: item.rotation,
      placementAngleDeg:
        item.rotY !== undefined
          ? Math.round(((-item.rotY * 180) / Math.PI + 360) % 360)
          : item.rotation * 90,
    }));
  }, []);

  const handleApplySurfaceToAll = useCallback(() => {
    const t = toolRef.current;
    const bp = cloneBlueprint(blueprintRef.current);
    for (const tile of Object.values(bp.tiles)) {
      if (t.surfaceTarget === 'floor') {
        tile.floorMat = t.activeFloorMat;
        tile.floorTint = t.activeFloorTint;
      } else {
        tile.wallMat = t.activeWallMat;
        tile.wallTint = t.activeWallTint;
      }
    }
    if (t.surfaceTarget === 'wall') {
      bp.wallStyles = {};
      if (bp.customWalls) {
        for (const cw of bp.customWalls) {
          cw.mat = t.activeWallMat;
          cw.tint = t.activeWallTint;
        }
      }
    }
    soundEngine.playWallSnap();
    commitBlueprint(bp, true);
    showToast(
      t.surfaceTarget === 'floor'
        ? 'Applied floor finish & color across all rooms.'
        : 'Applied wall paint / wallpaper across all walls.',
    );
  }, [commitBlueprint, showToast]);

  const handleResizeLand = useCallback(
    (landW: number, landD: number) => {
      const next = resizeLandPlot(blueprintRef.current, landW, landD);
      const site = getEffectiveSite(next);
      soundEngine.playWallSnap();
      commitBlueprint(next, true);
      engineRef.current?.setCameraPreset(isPlanView ? 'plan' : 'iso');
      showToast(
        `Land plot set to ${site.landWidth}m × ${site.landDepth}m (${site.landWidth * site.landDepth} m²)`,
      );
    },
    [commitBlueprint, isPlanView, showToast],
  );

  const handleUpdateSite = useCallback(
    (patch: Partial<SiteConfig>) => {
      const bp = cloneBlueprint(blueprintRef.current);
      const cur = getEffectiveSite(bp);
      const nextSite: SiteConfig = { ...cur, ...patch };
      if (patch.roofStyle !== undefined) {
        if (patch.roofStyle === 'none') {
          nextSite.showRoof = false;
        } else if (patch.showRoof === undefined) {
          nextSite.showRoof = true;
        }
      }
      if (patch.showRoof === true && nextSite.roofStyle === 'none') {
        nextSite.roofStyle = 'gable';
      }
      bp.site = nextSite;

      const activatingRoof =
        (patch.showRoof === true ||
          (patch.roofStyle !== undefined && patch.roofStyle !== 'none')) &&
        nextSite.showRoof;
      if (activatingRoof) {
        setIsPlanView(false);
        engineRef.current?.setPlanModeLock(false);
        setWallView((prev) => {
          const nextView = prev === 'low' ? 'full' : prev;
          engineRef.current?.setWallViewMode(nextView);
          return nextView;
        });
      }

      soundEngine.playTile(4);
      commitBlueprint(bp, true);
      if (patch.showRoof !== undefined && patch.roofStyle === undefined) {
        showToast(
          nextSite.showRoof
            ? `3D Roof ON (${nextSite.roofStyle}) — toggle off anytime to edit inside.`
            : '3D Roof hidden — cutaway interior view active.',
        );
      } else if (patch.roofStyle !== undefined) {
        showToast(
          patch.roofStyle === 'none'
            ? '3D Roof removed.'
            : `3D Roof style set to ${patch.roofStyle.toUpperCase()}.`,
        );
      } else if (patch.roofColor !== undefined) {
        showToast('Updated 3D roof finish color.');
      } else if (patch.roofPitch !== undefined) {
        showToast(`Roof pitch height set to ${(nextSite.roofPitch ?? 1.5).toFixed(1)} m.`);
      } else if (patch.showCeiling !== undefined) {
        showToast(
          patch.showCeiling
            ? 'Interior ceiling (plafond) ON.'
            : 'Interior ceiling (plafond) hidden.',
        );
      } else if (patch.foundationStyle) {
        showToast(`Foundation material set to ${patch.foundationStyle}.`);
      } else if (patch.foundationHeight !== undefined) {
        showToast(`Foundation elevation set to ${Math.round(patch.foundationHeight * 100)} cm.`);
      } else if (patch.wallHeight !== undefined) {
        showToast(`Room wall height set to ${patch.wallHeight.toFixed(2)} m.`);
      }
    },
    [commitBlueprint, showToast],
  );

  const handleTogglePlanView = useCallback(() => {
    soundEngine.playRotate();
    setIsPlanView((prev) => {
      const next = !prev;
      if (next) {
        setPeopleHud((p) => (p.walkMode ? { ...p, walkMode: false } : p));
        setWallView('low');
        engineRef.current?.setWallViewMode('low');
        engineRef.current?.setPlanModeLock(true);
        engineRef.current?.setCameraPreset('plan');
        showToast('2D Floor Plan locked top-down — left-click draws cleanly, right-drag or WASD pans.');
      } else {
        setWallView('cutaway');
        engineRef.current?.setWallViewMode('cutaway');
        engineRef.current?.setPlanModeLock(false);
        engineRef.current?.setCameraPreset('iso');
        showToast('3D Architectural View.');
      }
      return next;
    });
  }, [showToast]);

  const handleResizeRoom = useCallback(
    (targetW: number, targetD: number) => {
      const bp = cloneBlueprint(blueprintRef.current);
      const bounds = getSiteBounds(bp);
      const clampedW = Math.max(2, Math.min(bounds.landWidth, Math.round(targetW)));
      const clampedD = Math.max(2, Math.min(bounds.landDepth, Math.round(targetD)));
      const startX = bounds.minGx + Math.floor((bounds.landWidth - clampedW) / 2);
      const startZ = bounds.minGz + Math.floor((bounds.landDepth - clampedD) / 2);

      const sample = Object.values(bp.tiles)[0];
      const baseZone = sample?.zone || toolRef.current.activeZone;
      const baseFloor = sample?.floorMat || toolRef.current.activeFloorMat;
      const baseFloorTint = sample?.floorTint || toolRef.current.activeFloorTint;
      const baseWall = sample?.wallMat || toolRef.current.activeWallMat;
      const baseWallTint = sample?.wallTint || toolRef.current.activeWallTint;

      const nextTiles: RoomBlueprint['tiles'] = {};
      for (let x = startX; x < startX + clampedW; x++) {
        for (let z = startZ; z < startZ + clampedD; z++) {
          const key = `${x},${z}`;
          nextTiles[key] = bp.tiles[key]
            ? { ...bp.tiles[key] }
            : {
                x,
                z,
                zone: baseZone,
                floorMat: baseFloor,
                floorTint: baseFloorTint,
                wallMat: baseWall,
                wallTint: baseWallTint,
              };
        }
      }
      bp.tiles = nextTiles;

      bp.furniture = bp.furniture.filter((item) => {
        const def = getFurnitureDef(item.defId, customDefsRef.current);
        if (!def) return false;
        if (item.wx !== undefined && !def.wallMount) return true;
        const cells = getOccupiedCells(item.gx, item.gz, def.width, def.depth, item.rotation);
        if (!cells.every((c) => Boolean(nextTiles[`${c.x},${c.z}`]))) return false;
        if (def.wallMount && !cells.every((c) => hasWallOnSide(bp, c.x, c.z, item.rotation))) {
          return false;
        }
        return true;
      });

      soundEngine.playWallSnap();
      commitBlueprint(bp, true);
      showToast(`Poured ${clampedW}m × ${clampedD}m foundation footprint (${clampedW * clampedD} m²)`);
    },
    [commitBlueprint, showToast],
  );

  const handleBlankCanvas = useCallback(() => {
    const curSite = getEffectiveSite(blueprintRef.current);
    const blank = createBlankBlueprint(curSite);
    commitBlueprint(blank, true);
    setPlayMode('sandbox');
    setWallView('low');
    setIsPlanView(true);
    engineRef.current?.setWallViewMode('low');
    engineRef.current?.setCameraPreset('plan');
    setTool((prev) => ({
      ...prev,
      tab: 'layout',
      layoutSubTool: 'floor_add',
      selectedPlacedUid: null,
      movingPlacedUid: null,
    }));
    soundEngine.playRemove();
    showToast(`Cleared ${curSite.landWidth}×${curSite.landDepth}m lot — pour foundation or draw walls!`);
  }, [commitBlueprint, showToast]);

  const handleFillFloorInsideWalls = useCallback(() => {
    const t = toolRef.current;
    const bp = cloneBlueprint(blueprintRef.current);
    const added = fillFloorInsideCustomWalls(
      bp,
      t.activeZone,
      t.activeFloorMat,
      t.activeFloorTint,
      t.activeWallMat,
      t.activeWallTint,
    );
    if (added > 0) {
      soundEngine.playWallSnap();
      commitBlueprint(bp, true);
      showToast(`Filled ${added} m² of floor inside your custom walls!`);
    } else {
      soundEngine.playError();
      showToast('Close your walls into a loop first, or paint floor tiles with Add Floor.');
    }
  }, [commitBlueprint, showToast]);

  const handleApplyRoomPreset = useCallback(
    (preset: 'rect' | 'lshape' | 'courtyard') => {
      const bp = cloneBlueprint(blueprintRef.current);
      const bounds = getSiteBounds(bp);
      const sample = Object.values(bp.tiles)[0];
      const baseZone = sample?.zone || 'living';
      const baseFloor = sample?.floorMat || toolRef.current.activeFloorMat;
      const baseFloorTint = sample?.floorTint || '#FFFFFF';
      const baseWall = sample?.wallMat || toolRef.current.activeWallMat;
      const baseWallTint = sample?.wallTint || '#FFFFFF';

      const nextTiles: RoomBlueprint['tiles'] = {};
      const addTile = (x: number, z: number) => {
        if (x < bounds.minGx || x > bounds.maxGx || z < bounds.minGz || z > bounds.maxGz) return;
        nextTiles[`${x},${z}`] = {
          x,
          z,
          zone: baseZone,
          floorMat: baseFloor,
          floorTint: baseFloorTint,
          wallMat: baseWall,
          wallTint: baseWallTint,
        };
      };

      bp.interiorWalls = {};
      bp.openings = {};
      bp.wallStyles = {};
      bp.customWalls = [];

      if (preset === 'rect') {
        const w = Math.min(8, bounds.landWidth);
        const d = Math.min(6, bounds.landDepth);
        const sx = bounds.minGx + Math.floor((bounds.landWidth - w) / 2);
        const sz = bounds.minGz + Math.floor((bounds.landDepth - d) / 2);
        for (let x = sx; x < sx + w; x++) {
          for (let z = sz; z < sz + d; z++) addTile(x, z);
        }
        const midX = sx + Math.floor(w / 2);
        bp.openings[`h:${midX - 1}:${sz}`] = 'arched_window';
        bp.openings[`h:${midX}:${sz}`] = 'arched_window';
      } else if (preset === 'lshape') {
        const w = Math.min(9, bounds.landWidth);
        const d = Math.min(8, bounds.landDepth);
        const sx = bounds.minGx + Math.floor((bounds.landWidth - w) / 2);
        const sz = bounds.minGz + Math.floor((bounds.landDepth - d) / 2);
        const topD = Math.max(2, Math.round(d * 0.62));
        const wingW = Math.max(2, Math.round(w * 0.56));
        for (let x = sx; x < sx + w; x++) {
          for (let z = sz; z < sz + topD; z++) addTile(x, z);
        }
        for (let x = sx; x < sx + wingW; x++) {
          for (let z = sz + topD; z < sz + d; z++) addTile(x, z);
        }
        const partX = sx + wingW;
        if (partX > sx && partX < sx + w) {
          for (let z = sz; z < sz + topD; z++) {
            bp.interiorWalls[`v:${partX}:${z}`] = true;
          }
          bp.openings[`v:${partX}:${sz + Math.floor(topD / 2)}`] = 'archway';
        }
        bp.openings[`h:${sx + 1}:${sz}`] = 'window';
        if (w >= 4) bp.openings[`h:${sx + 2}:${sz}`] = 'window';
      } else {
        const w = Math.min(10, bounds.landWidth);
        const d = Math.min(10, bounds.landDepth);
        const sx = bounds.minGx + Math.floor((bounds.landWidth - w) / 2);
        const sz = bounds.minGz + Math.floor((bounds.landDepth - d) / 2);
        const holeMarginX = w >= 8 ? 3 : 2;
        const holeMarginZ = d >= 8 ? 3 : 2;
        const hasHole = w >= 6 && d >= 6;
        for (let x = sx; x < sx + w; x++) {
          for (let z = sz; z < sz + d; z++) {
            const inHole =
              hasHole &&
              x >= sx + holeMarginX &&
              x < sx + w - holeMarginX &&
              z >= sz + holeMarginZ &&
              z < sz + d - holeMarginZ;
            if (!inHole) addTile(x, z);
          }
        }
        if (hasHole) {
          const midX = sx + Math.floor(w / 2);
          bp.openings[`h:${midX - 1}:${sz + holeMarginZ}`] = 'glass_slider';
          bp.openings[`h:${midX}:${sz + holeMarginZ}`] = 'glass_slider';
        }
      }

      bp.tiles = nextTiles;
      bp.furniture = bp.furniture.filter((item) => {
        const def = getFurnitureDef(item.defId, customDefsRef.current);
        if (!def) return false;
        if (item.wx !== undefined && !def.wallMount) return true;
        const cells = getOccupiedCells(item.gx, item.gz, def.width, def.depth, item.rotation);
        if (!cells.every((c) => Boolean(nextTiles[`${c.x},${c.z}`]))) return false;
        if (def.wallMount && !cells.every((c) => hasWallOnSide(bp, c.x, c.z, item.rotation))) {
          return false;
        }
        return true;
      });

      soundEngine.playWallSnap();
      commitBlueprint(bp, true);
      showToast(
        preset === 'rect'
          ? 'Applied Studio floorplan centered in your land lot.'
          : preset === 'lshape'
            ? 'Applied L-Shape Suite centered in your land lot.'
            : 'Applied Courtyard Residence centered in your land lot.',
      );
    },
    [commitBlueprint, showToast],
  );

  const handleApplyStarterTemplate = useCallback(
    (templateId: StarterTemplateId, includeFurniture = true) => {
      const bp = createStarterTemplateBlueprint(templateId, includeFurniture);
      const meta = STARTER_TEMPLATES.find((t) => t.id === templateId);
      setTemplateModalOpen(false);
      setPlayMode('sandbox');
      setPeopleHud((p) => (p.walkMode ? { ...p, walkMode: false } : p));
      setIsPlanView(false);
      engineRef.current?.setPlanModeLock(false);
      setWallView('cutaway');
      engineRef.current?.setWallViewMode('cutaway');
      setTool((prev) => ({
        ...prev,
        selectedPlacedUid: null,
        movingPlacedUid: null,
        selectedCustomWallId: null,
        movingCustomWallId: null,
        selectedRoomId: null,
        movingRoomScope: null,
      }));
      commitBlueprint(bp, true);
      engineRef.current?.setCameraPreset('iso');
      soundEngine.playWallSnap();
      if (meta) {
        const modeLabel = includeFurniture ? '' : ' (Denah Kosong)';
        const floorHint =
          meta.floors > 1
            ? ' — gunakan tombol Lt.1 / Lt.2 di kanan atas untuk lihat lantai atas!'
            : ' — klik Atap di bar atas untuk lihat atap 3D!';
        showToast(`Memuat "${meta.name}"${modeLabel} (${meta.sizeLabel})${floorHint}`);
      } else {
        showToast('Template denah berhasil dimuat!');
      }
    },
    [commitBlueprint, showToast],
  );

  const handleStampRoomModule = useCallback(
    (moduleId: RoomModuleId, includeFurniture: boolean) => {
      const res = stampRoomModuleOntoBlueprint(
        cloneBlueprint(blueprintRef.current),
        moduleId,
        includeFurniture,
      );
      if (!res.ok) {
        soundEngine.playError();
        showToast(res.reason || 'Ruang kosong di lahan tidak mencukupi.');
        return;
      }
      const mod = ROOM_MODULE_PRESETS.find((m) => m.id === moduleId);
      soundEngine.playFanfare();
      setTool((prev) => ({
        ...prev,
        selectedPlacedUid: null,
        movingPlacedUid: null,
        selectedCustomWallId: null,
        movingCustomWallId: null,
        selectedRoomId: null,
        movingRoomScope: null,
      }));
      commitBlueprint(res.blueprint, true);
      showToast(
        mod
          ? `Modul "${mod.name}" (${mod.width}×${mod.depth}m) ditambahkan! Klik ruangnya untuk geser/putar.`
          : 'Modul ruangan berhasil ditambahkan!',
      );
    },
    [commitBlueprint, showToast],
  );

  const handleMirrorBlueprint = useCallback(
    (axis: 'x' | 'z') => {
      const nextBp = mirrorBlueprint(
        cloneBlueprint(blueprintRef.current),
        axis,
        customDefsRef.current,
      );
      soundEngine.playWallSnap();
      setTool((prev) => ({
        ...prev,
        selectedPlacedUid: null,
        movingPlacedUid: null,
        selectedCustomWallId: null,
        movingCustomWallId: null,
        selectedRoomId: null,
        movingRoomScope: null,
      }));
      commitBlueprint(nextBp, true);
      showToast(
        axis === 'x'
          ? 'Denah & seluruh lantai dicerminkan Kiri ↔ Kanan.'
          : 'Denah & seluruh lantai dicerminkan Depan ↕ Belakang.',
      );
    },
    [commitBlueprint, showToast],
  );

  const handleAddCustomDef = useCallback(
    (def: FurnitureDef) => {
      setCustomDefs((prev) => ({ ...prev, [def.id]: def }));
      setTool((prev) => ({
        ...prev,
        tab: 'furniture',
        selectedFurnitureDefId: def.id,
        movingPlacedUid: null,
      }));
      soundEngine.playFanfare();
      showToast(`Added "${def.name}" to Custom / 3D catalog — click to place!`);
    },
    [showToast],
  );

  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack((r) => [...r, cloneBlueprint(blueprintRef.current)]);
      setBlueprint(last);
      engineRef.current?.syncBlueprint(last);
      soundEngine.playRemove();
      return prev.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const next = prev[prev.length - 1];
      setUndoStack((u) => [...u, cloneBlueprint(blueprintRef.current)]);
      setBlueprint(next);
      engineRef.current?.syncBlueprint(next);
      soundEngine.playRotate();
      return prev.slice(0, -1);
    });
  }, []);

  const handleCycleMood = useCallback(() => {
    const order: LightingMood[] = ['morning', 'golden', 'studio', 'evening'];
    const next = order[(order.indexOf(mood) + 1) % order.length];
    setMood(next);
    engineRef.current?.setLightingMood(next);
    soundEngine.playRotate();
  }, [mood]);

  const handleSetMood = useCallback((nextMood: LightingMood) => {
    setMood(nextMood);
    engineRef.current?.setLightingMood(nextMood);
    soundEngine.playRotate();
  }, []);

  const handleCycleWallView = useCallback(() => {
    const order: WallViewMode[] = ['cutaway', 'full', 'low'];
    const next = order[(order.indexOf(wallView) + 1) % order.length];
    setWallView(next);
    engineRef.current?.setWallViewMode(next);
    soundEngine.playRotate();
  }, [wallView]);

  const handleSetCameraPreset = useCallback((preset: CameraPreset) => {
    engineRef.current?.setCameraPreset(preset);
    soundEngine.playRotate();
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted(soundEngine.toggleMute());
  }, []);

  const handleSubmitCommission = useCallback(() => {
    soundEngine.playFanfare();
    setCompletedIds((prev) => (prev.includes(commission.id) ? prev : [...prev, commission.id]));
    setScreen('victory');
  }, [commission.id]);

  // Global keyboard shortcuts (Arrows nudge, Q/E/R rotate, [/] height, -/+/0 scale, M move, Shift+D clone, G Free/Snap, H Panel, 1-5 Tabs, Delete, Undo/Redo, Esc)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (screen === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleStartGame('commission');
        }
        return;
      }

      if (e.code === 'Escape') {
        e.preventDefault();
        if (templateModalOpen) {
          setTemplateModalOpen(false);
        } else if (projectModalOpen) {
          setProjectModalOpen(false);
        } else if (customModalMode) {
          setCustomModalMode(null);
        } else if (peopleHudRef.current.walkMode) {
          handleUpdatePeopleHud({ walkMode: false });
        } else if (peopleHudRef.current.placingPerson) {
          setPeopleHud((p) => ({ ...p, placingPerson: false }));
        } else if (wallDrawActiveRef.current) {
          engineRef.current?.cancelWallDraw();
        } else if (toolRef.current.movingPlacedUid) {
          setTool((prev) => ({ ...prev, movingPlacedUid: null }));
        } else if (toolRef.current.movingCustomWallId) {
          setTool((prev) => ({ ...prev, movingCustomWallId: null }));
        } else if (toolRef.current.movingRoomScope) {
          setTool((prev) => ({ ...prev, movingRoomScope: null }));
        } else if (
          toolRef.current.selectedPlacedUid ||
          toolRef.current.selectedCustomWallId ||
          toolRef.current.selectedRoomId !== null
        ) {
          setTool((prev) => ({
            ...prev,
            selectedPlacedUid: null,
            selectedCustomWallId: null,
            selectedRoomId: null,
          }));
        } else if (screen === 'playing') {
          setScreen('paused');
        } else if (screen === 'paused' || screen === 'victory') {
          setScreen('playing');
        }
        return;
      }

      if (screen !== 'playing' || customModalMode || projectModalOpen || templateModalOpen) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        if (toolRef.current.selectedPlacedUid) {
          e.preventDefault();
          handleDuplicateSelected();
          return;
        }
        if (toolRef.current.selectedCustomWallId) {
          e.preventDefault();
          handleCloneCustomWall(toolRef.current.selectedCustomWallId);
          return;
        }
      }

      const key = e.key.toLowerCase();
      const selectedUid = toolRef.current.selectedPlacedUid;
      const selectedWallId = toolRef.current.selectedCustomWallId;
      const selectedRoomId = toolRef.current.selectedRoomId;

      // Custom Wall keyboard controls (Arrows move, Q/E/R rotate, [/] height, -/+ length, M move, Shift+D clone, Del remove)
      if (selectedWallId && !toolRef.current.movingCustomWallId) {
        const cw = blueprintRef.current.customWalls?.find((w) => w.id === selectedWallId);
        if (cw) {
          const basis = engineRef.current?.getCameraHorizontalBasis() || {
            fx: 0,
            fz: -1,
            rx: 1,
            rz: 0,
          };
          const moveStep = e.shiftKey ? 0.1 : 0.5;
          const snapAxisMove = (dirF: number, dirR: number) => {
            const vx = basis.fx * dirF + basis.rx * dirR;
            const vz = basis.fz * dirF + basis.rz * dirR;
            const sx = Math.abs(vx) >= Math.abs(vz) ? Math.sign(vx) * moveStep : 0;
            const sz = Math.abs(vz) > Math.abs(vx) ? Math.sign(vz) * moveStep : 0;
            handleUpdateCustomWall(selectedWallId, { dx: sx, dz: sz });
          };
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            snapAxisMove(1, 0);
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            snapAxisMove(-1, 0);
            return;
          }
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            snapAxisMove(0, 1);
            return;
          }
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            snapAxisMove(0, -1);
            return;
          }
          if (e.key === '[' || e.key === 'PageDown') {
            e.preventDefault();
            handleUpdateCustomWall(selectedWallId, {
              height: (cw.height || WALL_HEIGHT) - (e.shiftKey ? 0.05 : 0.15),
            });
            return;
          }
          if (e.key === ']' || e.key === 'PageUp') {
            e.preventDefault();
            handleUpdateCustomWall(selectedWallId, {
              height: (cw.height || WALL_HEIGHT) + (e.shiftKey ? 0.05 : 0.15),
            });
            return;
          }
          if (e.key === '-' || e.key === '_') {
            e.preventDefault();
            const len = Math.hypot(cw.x2 - cw.x1, cw.z2 - cw.z1);
            handleUpdateCustomWall(selectedWallId, { lengthM: len - (e.shiftKey ? 0.1 : 0.5) });
            return;
          }
          if (e.key === '=' || e.key === '+') {
            e.preventDefault();
            const len = Math.hypot(cw.x2 - cw.x1, cw.z2 - cw.z1);
            handleUpdateCustomWall(selectedWallId, { lengthM: len + (e.shiftKey ? 0.1 : 0.5) });
            return;
          }
          if (key === 'r' || key === 'e') {
            e.preventDefault();
            handleUpdateCustomWall(selectedWallId, { deltaAngleDeg: e.shiftKey ? 5 : 15 });
            return;
          }
          if (key === 'q') {
            e.preventDefault();
            handleUpdateCustomWall(selectedWallId, { deltaAngleDeg: e.shiftKey ? -5 : -15 });
            return;
          }
          if (key === 'm') {
            e.preventDefault();
            handleStartMoveCustomWall();
            return;
          }
          if (key === 'd' && e.shiftKey) {
            e.preventDefault();
            handleCloneCustomWall(selectedWallId);
            return;
          }
          if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            handleDeleteCustomWall(selectedWallId);
            return;
          }
        }
      }

      // Room / Building keyboard controls (Arrows shift 1m, R rotate 90°, [/] room wall height, M click-move, Del delete)
      if (selectedRoomId !== null && !toolRef.current.movingRoomScope) {
        const basis = engineRef.current?.getCameraHorizontalBasis() || {
          fx: 0,
          fz: -1,
          rx: 1,
          rz: 0,
        };
        const shiftDir = (dirF: number, dirR: number) => {
          const vx = basis.fx * dirF + basis.rx * dirR;
          const vz = basis.fz * dirF + basis.rz * dirR;
          const sx = Math.abs(vx) >= Math.abs(vz) ? Math.sign(vx) : 0;
          const sz = Math.abs(vz) > Math.abs(vx) ? Math.sign(vz) : 0;
          handleShiftRoom(sx, sz);
        };
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          shiftDir(1, 0);
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          shiftDir(-1, 0);
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          shiftDir(0, 1);
          return;
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          shiftDir(0, -1);
          return;
        }
        if (key === 'r') {
          e.preventDefault();
          handleRotateRoom();
          return;
        }
        if (key === 'm') {
          e.preventDefault();
          handleStartMoveRoom();
          return;
        }
        if (e.key === '[' || e.key === 'PageDown') {
          e.preventDefault();
          const curH = getEffectiveSite(blueprintRef.current).wallHeight ?? WALL_HEIGHT;
          handleUpdateSite({ wallHeight: Math.max(1.5, Number((curH - 0.15).toFixed(2))) });
          return;
        }
        if (e.key === ']' || e.key === 'PageUp') {
          e.preventDefault();
          const curH = getEffectiveSite(blueprintRef.current).wallHeight ?? WALL_HEIGHT;
          handleUpdateSite({ wallHeight: Math.min(5.0, Number((curH + 0.15).toFixed(2))) });
          return;
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          handleDeleteSelectedRoom();
          return;
        }
      }

      // Arrow keys nudge selected furniture relative to camera view (Shift = fine 0.03m)
      if (selectedUid && !toolRef.current.movingPlacedUid) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          handleNudgeSelected(1, 0, e.shiftKey);
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          handleNudgeSelected(-1, 0, e.shiftKey);
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleNudgeSelected(0, 1, e.shiftKey);
          return;
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handleNudgeSelected(0, -1, e.shiftKey);
          return;
        }

        // Height Y adjust: [ / PageDown (lower) & ] / PageUp (raise)
        if (e.key === '[' || e.key === 'PageDown') {
          e.preventDefault();
          const item = blueprintRef.current.furniture.find((f) => f.uid === selectedUid);
          if (item) {
            const step = e.shiftKey ? 0.01 : 0.05;
            handleAdjustSelectedTransform({
              wy: Math.max(0, Number(((item.wy ?? 0) - step).toFixed(2))),
            });
          }
          return;
        }
        if (e.key === ']' || e.key === 'PageUp') {
          e.preventDefault();
          const item = blueprintRef.current.furniture.find((f) => f.uid === selectedUid);
          if (item) {
            const step = e.shiftKey ? 0.01 : 0.05;
            handleAdjustSelectedTransform({
              wy: Math.min(2.2, Number(((item.wy ?? 0) + step).toFixed(2))),
            });
          }
          return;
        }

        // Scale adjust: - (shrink), = / + (grow), 0 (reset 100%)
        if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          const item = blueprintRef.current.furniture.find((f) => f.uid === selectedUid);
          if (item) {
            handleAdjustSelectedTransform({
              scale: Math.max(0.4, Number(((item.scale ?? 1) - 0.1).toFixed(2))),
            });
          }
          return;
        }
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          const item = blueprintRef.current.furniture.find((f) => f.uid === selectedUid);
          if (item) {
            handleAdjustSelectedTransform({
              scale: Math.min(2.2, Number(((item.scale ?? 1) + 0.1).toFixed(2))),
            });
          }
          return;
        }
        if (e.key === '0') {
          e.preventDefault();
          handleAdjustSelectedTransform({ scale: 1 });
          showToast('Reset object size to 100%.');
          return;
        }
      }

      // Rotate (Q/E/R — hold Shift for ultra-fine 5° angle)
      if (key === 'r') {
        e.preventDefault();
        handleRotateAction(e.shiftKey ? 5 : 15);
      } else if (key === 'q') {
        e.preventDefault();
        handleRotateAction(e.shiftKey ? -5 : -15);
      } else if (key === 'e') {
        e.preventDefault();
        handleRotateAction(e.shiftKey ? 5 : 15);
      } else if (key === 'm' && selectedUid) {
        e.preventDefault();
        handleStartMoveSelected();
      } else if (key === 'd' && e.shiftKey && selectedUid) {
        e.preventDefault();
        handleDuplicateSelected();
      } else if (key === 'g') {
        e.preventDefault();
        setTool((prev) => {
          const next = prev.placementMode === 'free' ? 'snap' : 'free';
          showToast(
            next === 'free'
              ? 'Free Placement ON — place anywhere & stack on tables.'
              : 'Grid Snap ON — aligned to architectural 1m grid.',
          );
          return { ...prev, placementMode: next };
        });
      } else if (key === 'h') {
        e.preventDefault();
        setDockCollapsed((c) => !c);
      } else if (key === 't') {
        e.preventDefault();
        handleToggleDimensions();
      } else if (key >= '1' && key <= '5') {
        e.preventDefault();
        const tabOrder: DockTab[] = ['select', 'layout', 'furniture', 'surfaces', 'goals'];
        const nextTab = tabOrder[Number(key) - 1];
        setTool((prev) => ({
          ...prev,
          tab: nextTab,
          movingPlacedUid: null,
          movingCustomWallId: null,
          movingRoomScope: null,
          selectedFurnitureDefId:
            nextTab === 'furniture' ? prev.selectedFurnitureDefId || 'l_sofa' : null,
        }));
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedUid) {
          e.preventDefault();
          handleDeleteSelected();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    customModalMode,
    handleAdjustSelectedTransform,
    handleCloneCustomWall,
    handleDeleteCustomWall,
    handleDeleteSelected,
    handleDeleteSelectedRoom,
    handleDuplicateSelected,
    handleNudgeSelected,
    handleRedo,
    handleRotateAction,
    handleRotateRoom,
    handleShiftRoom,
    handleStartGame,
    handleStartMoveCustomWall,
    handleStartMoveRoom,
    handleStartMoveSelected,
    handleToggleDimensions,
    handleUndo,
    handleUpdateCustomWall,
    handleUpdatePeopleHud,
    handleUpdateSite,
    projectModalOpen,
    screen,
    showToast,
    templateModalOpen,
  ]);

  return (
    <main
      className="relative w-screen h-screen overflow-hidden bg-[#F4ECE0]"
      onContextMenu={(e) => {
        if (wallDrawStatus.active) e.preventDefault();
      }}
    >
      {/* Dedicated isolated WebGL canvas mount */}
      <div
        ref={mountRef}
        className="w-full h-full"
        aria-label="3D Architectural Room Builder Canvas"
      />

      {webglLost && (
        <div className="fixed inset-0 z-40 bg-[#F4ECE0] flex items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-3 bg-[#FAF5EC] border border-[#D9CBB6] rounded-2xl p-6 shadow-lg">
            <h2 className="font-display text-xl font-bold text-[#33261D]">
              3D Graphics Context Suspended
            </h2>
            <p className="text-sm text-[#6D5847]">
              WebGL rendering was interrupted by the browser. Reload the page to restore the 3D
              architectural viewport.
            </p>
          </div>
        </div>
      )}

      {screen === 'title' ? (
        <TitleOverlay
          onStart={handleStartGame}
          onStartNewSite={handleStartNewSite}
          onContinueSaved={handleContinueSaved}
          hasSavedDesign={hasSavedDesign}
          completedCount={completedIds.length}
          totalCommissions={COMMISSIONS.length}
        />
      ) : (
        <BuilderHUD
          screen={screen}
          playMode={playMode}
          commission={commission}
          completedIds={completedIds}
          blueprint={blueprint}
          customDefs={customDefs}
          wallDrawStatus={wallDrawStatus}
          wallDrawOptions={wallDrawOptions}
          peopleHud={peopleHud}
          score={score}
          tool={tool}
          mood={mood}
          wallView={wallView}
          isPlanView={isPlanView}
          showDimensions={showDimensions}
          dimensionLabels={dimensionLabels}
          showRoomLabels={showRoomLabels}
          roomLabels={roomLabels}
          showUpperFloors={showUpperFloors}
          muted={muted}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          dockCollapsed={dockCollapsed}
          toastMessage={toastMessage}
          onToggleDock={() => setDockCollapsed((c) => !c)}
          onToggleDimensions={handleToggleDimensions}
          onToggleRoomLabels={handleToggleRoomLabels}
          onToggleUpperFloors={handleToggleUpperFloors}
          onSwitchFloor={handleSwitchFloor}
          onAddUpperFloor={handleAddUpperFloor}
          onRemoveTopFloor={handleRemoveTopFloor}
          onRenameRoom={handleRenameRoom}
          onUpdateRoomLight={handleUpdateRoomLight}
          onApplyRoomLightToAll={handleApplyRoomLightToAll}
          onExportScreenshotPng={handleExportScreenshotPng}
          onOpenProjectManager={() => {
            setSavedProjects(listSavedProjects());
            setProjectModalOpen(true);
          }}
          onUpdateTool={handleUpdateTool}
          onUpdateWallDrawOptions={handleUpdateWallDrawOptions}
          onCancelWallDraw={handleCancelWallDraw}
          onCommitExactWallLength={handleCommitExactWallLength}
          onUpdatePeopleHud={handleUpdatePeopleHud}
          onCenterPerson={handleCenterPerson}
          onRotateAction={() => handleRotateAction()}
          onDuplicateSelected={handleDuplicateSelected}
          onDeleteSelected={handleDeleteSelected}
          onChangeSelectedColor={handleChangeSelectedColor}
          onAdjustSelectedTransform={handleAdjustSelectedTransform}
          onStartMoveSelected={handleStartMoveSelected}
          onUpdateCustomWall={handleUpdateCustomWall}
          onCloneCustomWall={handleCloneCustomWall}
          onDeleteCustomWall={handleDeleteCustomWall}
          onStartMoveCustomWall={handleStartMoveCustomWall}
          onSelectRoomById={handleSelectRoomById}
          onShiftRoom={handleShiftRoom}
          onCenterRoom={handleCenterRoom}
          onRotateRoom={handleRotateRoom}
          onResizeSelectedRoom={handleResizeSelectedRoom}
          onChangeRoomZone={handleChangeRoomZone}
          onDeleteSelectedRoom={handleDeleteSelectedRoom}
          onStartMoveRoom={handleStartMoveRoom}
          onApplySurfaceToAll={handleApplySurfaceToAll}
          onResizeLand={handleResizeLand}
          onUpdateSite={handleUpdateSite}
          onTogglePlanView={handleTogglePlanView}
          onResizeRoom={handleResizeRoom}
          onBlankCanvas={handleBlankCanvas}
          onFillFloorInsideWalls={handleFillFloorInsideWalls}
          onApplyRoomPreset={handleApplyRoomPreset}
          onApplyStarterTemplate={handleApplyStarterTemplate}
          onOpenTemplateGallery={() => setTemplateModalOpen(true)}
          onStampRoomModule={handleStampRoomModule}
          onMirrorBlueprint={handleMirrorBlueprint}
          onOpenCustomModal={(m) => setCustomModalMode(m)}
          onSetCameraPreset={(preset) => {
            setPeopleHud((p) => (p.walkMode ? { ...p, walkMode: false } : p));
            setIsPlanView(preset === 'plan');
            handleSetCameraPreset(preset);
          }}
          onCycleWallView={() => {
            setIsPlanView(false);
            handleCycleWallView();
          }}
          onCycleMood={handleCycleMood}
          onSetMood={handleSetMood}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onToggleMute={handleToggleMute}
          onPause={() => setScreen('paused')}
          onResume={() => setScreen('playing')}
          onSelectCommission={handleSelectCommission}
          onSwitchMode={handleSwitchMode}
          onResetRoom={handleResetRoom}
          onLoadShowcase={handleLoadShowcase}
          onSubmitCommission={handleSubmitCommission}
          onBackToTitle={() => {
            setScreen('title');
          }}
        />
      )}

      {customModalMode && (
        <CustomAssetModal
          initialMode={customModalMode}
          onClose={() => setCustomModalMode(null)}
          onAddCustomDef={handleAddCustomDef}
        />
      )}

      {projectModalOpen && (
        <ProjectManagerModal
          activeProjectName={activeProjectName}
          blueprint={blueprint}
          customDefs={customDefs}
          savedProjects={savedProjects}
          onClose={() => setProjectModalOpen(false)}
          onSaveProject={handleSaveProjectSlot}
          onLoadProject={handleLoadProjectSlot}
          onDeleteProject={handleDeleteProjectSlot}
          onExportJson={handleExportProjectJson}
          onImportJson={handleImportProjectJson}
          onExportScreenshotPng={handleExportScreenshotPng}
        />
      )}

      {templateModalOpen && (
        <TemplateGalleryModal
          onClose={() => setTemplateModalOpen(false)}
          onSelectTemplate={handleApplyStarterTemplate}
        />
      )}
    </main>
  );
}
