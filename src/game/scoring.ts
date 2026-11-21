import { getFurnitureDef } from './catalog';
import {
  DEFAULT_ROOM_LIGHT,
  DEFAULT_SITE_CONFIG,
  DetectedRoom,
  FLOOR_SLAB_THICKNESS,
  FloorLevelData,
  FloorMaterialId,
  FurnitureDef,
  GRID_SIZE,
  MAX_FLOORS,
  MAX_LAND_SIZE,
  MIN_LAND_SIZE,
  PlacedFurniture,
  PlacementMode,
  RoomBlueprint,
  RoomLightConfig,
  RoomZoneId,
  ScoreBreakdown,
  SiteConfig,
  WALL_HEIGHT,
  WallMaterialId,
} from './types';

export function getEffectiveSite(bp: RoomBlueprint): SiteConfig {
  const s = bp.site;
  return {
    landWidth: Math.max(
      MIN_LAND_SIZE,
      Math.min(MAX_LAND_SIZE, Math.round(s?.landWidth ?? bp.gridSize ?? DEFAULT_SITE_CONFIG.landWidth)),
    ),
    landDepth: Math.max(
      MIN_LAND_SIZE,
      Math.min(MAX_LAND_SIZE, Math.round(s?.landDepth ?? bp.gridSize ?? DEFAULT_SITE_CONFIG.landDepth)),
    ),
    foundationStyle: s?.foundationStyle ?? DEFAULT_SITE_CONFIG.foundationStyle,
    foundationHeight: s?.foundationHeight ?? DEFAULT_SITE_CONFIG.foundationHeight,
    showCeiling: s?.showCeiling ?? DEFAULT_SITE_CONFIG.showCeiling,
    wallHeight: Math.max(
      1.5,
      Math.min(5.0, Number((s?.wallHeight ?? DEFAULT_SITE_CONFIG.wallHeight ?? WALL_HEIGHT).toFixed(2))),
    ),
    roofStyle: s?.roofStyle ?? DEFAULT_SITE_CONFIG.roofStyle ?? 'gable',
    roofColor: s?.roofColor ?? DEFAULT_SITE_CONFIG.roofColor ?? '#A8583B',
    roofPitch: Math.max(
      0.5,
      Math.min(3.4, Number((s?.roofPitch ?? DEFAULT_SITE_CONFIG.roofPitch ?? 1.5).toFixed(2))),
    ),
    showRoof: s?.showRoof ?? DEFAULT_SITE_CONFIG.showRoof ?? false,
  };
}

export function getSiteBounds(bp: RoomBlueprint): {
  landWidth: number;
  landDepth: number;
  landArea: number;
  minGx: number;
  maxGx: number;
  minGz: number;
  maxGz: number;
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
  centerX: number;
  centerZ: number;
} {
  const site = getEffectiveSite(bp);
  const halfGrid = bp.gridSize / 2;
  const minGx = Math.floor((bp.gridSize - site.landWidth) / 2);
  const maxGx = minGx + site.landWidth - 1;
  const minGz = Math.floor((bp.gridSize - site.landDepth) / 2);
  const maxGz = minGz + site.landDepth - 1;
  const xMin = minGx - halfGrid;
  const xMax = maxGx + 1 - halfGrid;
  const zMin = minGz - halfGrid;
  const zMax = maxGz + 1 - halfGrid;
  return {
    landWidth: site.landWidth,
    landDepth: site.landDepth,
    landArea: site.landWidth * site.landDepth,
    minGx,
    maxGx,
    minGz,
    maxGz,
    xMin,
    xMax,
    zMin,
    zMax,
    centerX: (xMin + xMax) / 2,
    centerZ: (zMin + zMax) / 2,
  };
}

/**
 * Resizes the buildable land plot (4m..60m) and cleanly recenters all tiles, walls,
 * openings, and furniture if the underlying grid expands.
 */
export function resizeLandPlot(bp: RoomBlueprint, rawW: number, rawD: number): RoomBlueprint {
  const landWidth = Math.max(MIN_LAND_SIZE, Math.min(MAX_LAND_SIZE, Math.round(rawW)));
  const landDepth = Math.max(MIN_LAND_SIZE, Math.min(MAX_LAND_SIZE, Math.round(rawD)));
  const requiredGrid = Math.max(14, Math.ceil(Math.max(landWidth, landDepth) / 2) * 2);
  const nextGrid = Math.min(MAX_LAND_SIZE, Math.max(bp.gridSize, requiredGrid));
  const shift = (nextGrid - bp.gridSize) / 2;

  const minGx = Math.floor((nextGrid - landWidth) / 2);
  const maxGx = minGx + landWidth - 1;
  const minGz = Math.floor((nextGrid - landDepth) / 2);
  const maxGz = minGz + landDepth - 1;
  const halfNext = nextGrid / 2;
  const xMin = minGx - halfNext;
  const xMax = maxGx + 1 - halfNext;
  const zMin = minGz - halfNext;
  const zMax = maxGz + 1 - halfNext;

  const nextTiles: RoomBlueprint['tiles'] = {};
  for (const tile of Object.values(bp.tiles)) {
    const nx = tile.x + shift;
    const nz = tile.z + shift;
    if (nx >= minGx && nx <= maxGx && nz >= minGz && nz <= maxGz) {
      nextTiles[`${nx},${nz}`] = { ...tile, x: nx, z: nz };
    }
  }

  const shiftEdgeKey = (key: string): string => {
    const [axis, xs, zs] = key.split(':');
    return `${axis}:${Number(xs) + shift}:${Number(zs) + shift}`;
  };

  const nextInteriorWalls: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(bp.interiorWalls)) {
    if (v) nextInteriorWalls[shiftEdgeKey(k)] = true;
  }

  const nextOpenings: RoomBlueprint['openings'] = {};
  for (const [k, v] of Object.entries(bp.openings)) {
    nextOpenings[shiftEdgeKey(k)] = v;
  }

  const nextWallStyles: NonNullable<RoomBlueprint['wallStyles']> = {};
  if (bp.wallStyles) {
    for (const [k, v] of Object.entries(bp.wallStyles)) {
      nextWallStyles[shiftEdgeKey(k)] = { ...v };
    }
  }

  const nextCustomWalls = (bp.customWalls || []).filter(
    (w) =>
      w.x1 >= xMin - 0.25 &&
      w.x1 <= xMax + 0.25 &&
      w.x2 >= xMin - 0.25 &&
      w.x2 <= xMax + 0.25 &&
      w.z1 >= zMin - 0.25 &&
      w.z1 <= zMax + 0.25 &&
      w.z2 >= zMin - 0.25 &&
      w.z2 <= zMax + 0.25,
  );

  const nextFurniture = bp.furniture
    .map((f) => ({
      ...f,
      gx: f.gx + shift,
      gz: f.gz + shift,
    }))
    .filter((f) => {
      if (f.wx !== undefined && f.wz !== undefined) {
        return f.wx >= xMin && f.wx <= xMax && f.wz >= zMin && f.wz <= zMax;
      }
      return f.gx >= minGx && f.gx <= maxGx && f.gz >= minGz && f.gz <= maxGz;
    });

  const prevSite = getEffectiveSite(bp);
  return {
    gridSize: nextGrid,
    site: {
      ...prevSite,
      landWidth,
      landDepth,
    },
    tiles: nextTiles,
    interiorWalls: nextInteriorWalls,
    openings: nextOpenings,
    wallStyles: nextWallStyles,
    customWalls: nextCustomWalls,
    furniture: nextFurniture,
    exteriorWallMat: bp.exteriorWallMat,
  };
}

export function getRotatedFootprint(
  width: number,
  depth: number,
  rotation: 0 | 1 | 2 | 3,
): { w: number; d: number } {
  if (rotation === 1 || rotation === 3) {
    return { w: depth, d: width };
  }
  return { w: width, d: depth };
}

export function getOccupiedCells(
  gx: number,
  gz: number,
  width: number,
  depth: number,
  rotation: 0 | 1 | 2 | 3,
): { x: number; z: number }[] {
  const { w, d } = getRotatedFootprint(Math.max(1, Math.round(width)), Math.max(1, Math.round(depth)), rotation);
  const cells: { x: number; z: number }[] = [];
  for (let dx = 0; dx < w; dx++) {
    for (let dz = 0; dz < d; dz++) {
      cells.push({ x: gx + dx, z: gz + dz });
    }
  }
  return cells;
}

export function hasWallOnSide(
  bp: RoomBlueprint,
  gx: number,
  gz: number,
  rotation: 0 | 1 | 2 | 3,
): boolean {
  if (rotation === 0) {
    return !bp.tiles[`${gx},${gz - 1}`] || Boolean(bp.interiorWalls[`h:${gx}:${gz}`]);
  }
  if (rotation === 1) {
    return !bp.tiles[`${gx + 1},${gz}`] || Boolean(bp.interiorWalls[`v:${gx + 1}:${gz}`]);
  }
  if (rotation === 2) {
    return !bp.tiles[`${gx},${gz + 1}`] || Boolean(bp.interiorWalls[`h:${gx}:${gz + 1}`]);
  }
  return !bp.tiles[`${gx - 1},${gz}`] || Boolean(bp.interiorWalls[`v:${gx}:${gz}`]);
}

export function getAutoWallRotation(
  bp: RoomBlueprint,
  gx: number,
  gz: number,
  preferred: 0 | 1 | 2 | 3,
): 0 | 1 | 2 | 3 {
  if (hasWallOnSide(bp, gx, gz, preferred)) return preferred;
  const order: (0 | 1 | 2 | 3)[] = [0, 3, 1, 2];
  for (const r of order) {
    if (hasWallOnSide(bp, gx, gz, r)) return r;
  }
  return preferred;
}

export function getBlueprintDimensions(bp: RoomBlueprint): {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  width: number;
  depth: number;
} {
  const tiles = Object.values(bp.tiles);
  if (tiles.length === 0) {
    return { minX: 4, maxX: 9, minZ: 4, maxZ: 9, width: 0, depth: 0 };
  }
  let minX = bp.gridSize;
  let maxX = 0;
  let minZ = bp.gridSize;
  let maxZ = 0;
  for (const t of tiles) {
    if (t.x < minX) minX = t.x;
    if (t.x > maxX) maxX = t.x;
    if (t.z < minZ) minZ = t.z;
    if (t.z > maxZ) maxZ = t.z;
  }
  return {
    minX,
    maxX,
    minZ,
    maxZ,
    width: maxX - minX + 1,
    depth: maxZ - minZ + 1,
  };
}

/**
 * Resolves final continuous 3D transform for any placed furniture item (supporting both
 * legacy grid-based coordinates and free-placement world coordinates / elevation / angle / scale).
 */
export function resolveFurnitureTransform(
  item: Pick<PlacedFurniture, 'gx' | 'gz' | 'rotation' | 'wx' | 'wy' | 'wz' | 'rotY' | 'scale'>,
  def: Pick<FurnitureDef, 'width' | 'depth'>,
  gridSize: number,
): { wx: number; wy: number; wz: number; rotY: number; scale: number } {
  const gridCenter = computeFurnitureWorldCenter(item, def.width, def.depth, gridSize);
  return {
    wx: item.wx !== undefined ? item.wx : gridCenter.wx,
    wy: item.wy !== undefined ? item.wy : 0,
    wz: item.wz !== undefined ? item.wz : gridCenter.wz,
    rotY: item.rotY !== undefined ? item.rotY : -item.rotation * (Math.PI / 2),
    scale: item.scale !== undefined ? item.scale : 1,
  };
}

export function canPlaceFurniture(
  bp: RoomBlueprint,
  defId: string,
  gx: number,
  gz: number,
  rotation: 0 | 1 | 2 | 3,
  ignoreUid?: string,
  customDefs?: Record<string, FurnitureDef>,
  placementMode: PlacementMode = 'snap',
  freeCoords?: { wx: number; wy: number; wz: number },
): boolean {
  const def = getFurnitureDef(defId, customDefs);
  if (!def) return false;

  // Free placement mode: allow placing anywhere inside the buildable lot (and stacking on surfaces!)
  if (placementMode === 'free' && freeCoords) {
    const b = getSiteBounds(bp);
    const margin = 0.1;
    if (
      freeCoords.wx < b.xMin + margin ||
      freeCoords.wx > b.xMax - margin ||
      freeCoords.wz < b.zMin + margin ||
      freeCoords.wz > b.zMax - margin
    ) {
      return false;
    }
    return true;
  }

  const cells = getOccupiedCells(gx, gz, def.width, def.depth, rotation);
  const siteBounds = getSiteBounds(bp);

  // Every covered cell must have a floor tile — UNLESS this is an outdoor item (trees, gazebo, cars, parking)
  // which can be placed anywhere inside the land plot bounds!
  for (const c of cells) {
    if (def.outdoorAllowed) {
      if (
        c.x < siteBounds.minGx ||
        c.x > siteBounds.maxGx ||
        c.z < siteBounds.minGz ||
        c.z > siteBounds.maxGz
      ) {
        return false;
      }
    } else if (!bp.tiles[`${c.x},${c.z}`]) {
      return false;
    }
  }

  // Wall-mounted decor requires an actual wall behind every cell of its span
  if (def.wallMount) {
    const wallOk = cells.every((c) => hasWallOnSide(bp, c.x, c.z, rotation));
    if (!wallOk) return false;
  }

  // Check interior walls bisecting the furniture footprint (unless ceiling chandelier, rug, tabletop, or wallMount)
  if (!def.allowOverlap && !def.wallMount && !def.tabletopProp) {
    const { w, d } = getRotatedFootprint(
      Math.max(1, Math.round(def.width)),
      Math.max(1, Math.round(def.depth)),
      rotation,
    );
    for (let dx = 0; dx < w - 1; dx++) {
      for (let dz = 0; dz < d; dz++) {
        const edgeKey = `v:${gx + dx + 1}:${gz + dz}`;
        if (bp.interiorWalls[edgeKey]) return false;
      }
    }
    for (let dx = 0; dx < w; dx++) {
      for (let dz = 0; dz < d - 1; dz++) {
        const edgeKey = `h:${gx + dx}:${gz + dz + 1}`;
        if (bp.interiorWalls[edgeKey]) return false;
      }
    }
  }

  // Check collisions with existing furniture in grid snap mode
  const cellSet = new Set(cells.map((c) => `${c.x},${c.z}`));
  for (const item of bp.furniture) {
    if (ignoreUid && item.uid === ignoreUid) continue;
    const otherDef = getFurnitureDef(item.defId, customDefs);
    if (!otherDef) continue;

    if (def.tabletopProp || otherDef.tabletopProp) continue;

    if (def.wallMount || otherDef.wallMount) {
      if (!(def.wallMount && otherDef.wallMount && item.rotation === rotation)) {
        continue;
      }
    } else {
      const bothCeiling = Boolean(def.ceilingMount) && Boolean(otherDef.ceilingMount);
      const bothRug = def.id === 'area_rug' && otherDef.id === 'area_rug';
      const skipCollision =
        (def.allowOverlap || otherDef.allowOverlap) && !bothCeiling && !bothRug;
      if (skipCollision) continue;
    }

    const otherCells = getOccupiedCells(
      item.gx,
      item.gz,
      otherDef.width,
      otherDef.depth,
      item.rotation,
    );
    for (const oc of otherCells) {
      if (cellSet.has(`${oc.x},${oc.z}`)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Flood-fills floor tiles separated by interior walls to count distinct rooms.
 */
export function detectRooms(bp: RoomBlueprint): DetectedRoom[] {
  const visited = new Set<string>();
  const rooms: DetectedRoom[] = [];
  let roomId = 1;

  for (const tileKey of Object.keys(bp.tiles)) {
    if (visited.has(tileKey)) continue;
    const queue = [tileKey];
    visited.add(tileKey);
    const cluster: string[] = [];
    const zoneCounts: Record<RoomZoneId, number> = {
      living: 0,
      bedroom: 0,
      kitchen: 0,
      study: 0,
      bath: 0,
      terrace: 0,
    };

    while (queue.length > 0) {
      const currKey = queue.shift()!;
      const tile = bp.tiles[currKey];
      if (!tile) continue;
      cluster.push(currKey);
      zoneCounts[tile.zone] = (zoneCounts[tile.zone] || 0) + 1;

      const neighbors: { nx: number; nz: number; edgeKey: string }[] = [
        { nx: tile.x + 1, nz: tile.z, edgeKey: `v:${tile.x + 1}:${tile.z}` },
        { nx: tile.x - 1, nz: tile.z, edgeKey: `v:${tile.x}:${tile.z}` },
        { nx: tile.x, nz: tile.z + 1, edgeKey: `h:${tile.x}:${tile.z + 1}` },
        { nx: tile.x, nz: tile.z - 1, edgeKey: `h:${tile.x}:${tile.z}` },
      ];

      for (const n of neighbors) {
        const nKey = `${n.nx},${n.nz}`;
        if (!bp.tiles[nKey] || visited.has(nKey)) continue;
        if (bp.interiorWalls[n.edgeKey]) continue;
        visited.add(nKey);
        queue.push(nKey);
      }
    }

    let dominantZone: RoomZoneId = 'living';
    let bestCount = -1;
    for (const [z, c] of Object.entries(zoneCounts) as [RoomZoneId, number][]) {
      if (c > bestCount) {
        bestCount = c;
        dominantZone = z;
      }
    }

    rooms.push({
      id: roomId++,
      zone: dominantZone,
      area: cluster.length,
      tiles: cluster,
    });
  }

  return rooms;
}

export function evaluateBlueprint(
  bp: RoomBlueprint,
  customDefs?: Record<string, FurnitureDef>,
): ScoreBreakdown {
  const tileKeys = Object.keys(bp.tiles);
  const floorArea = tileKeys.length;
  const rooms = detectRooms(bp);
  const customWallCount = bp.customWalls?.length || 0;

  let comfortRaw = 0;
  let harmonyRaw = 0;
  let lightingRaw = 0;
  let totalSpent =
    floorArea * 45 + Object.keys(bp.interiorWalls).length * 60 + customWallCount * 90;
  const solidOccupied = new Set<string>();
  const uniqueDefs = new Set<string>();
  let zoneMatchBonus = 0;

  for (const item of bp.furniture) {
    const def = getFurnitureDef(item.defId, customDefs);
    if (!def) continue;
    totalSpent += def.price;

    const repeatScale = uniqueDefs.has(item.defId) ? 0.55 : 1.0;
    uniqueDefs.add(item.defId);

    comfortRaw += def.comfort * repeatScale;
    harmonyRaw += def.harmony * repeatScale;
    lightingRaw += def.lighting * (uniqueDefs.has(item.defId) ? 0.85 : 1.0);

    const anchorTile = bp.tiles[`${item.gx},${item.gz}`];
    if (anchorTile && def.zoneAffinity.includes(anchorTile.zone)) {
      zoneMatchBonus += 3.2;
    }

    if (!def.allowOverlap && !def.wallMount && !def.tabletopProp) {
      const cells = getOccupiedCells(item.gx, item.gz, def.width, def.depth, item.rotation);
      for (const c of cells) {
        solidOccupied.add(`${c.x},${c.z}`);
      }
    }
  }

  let windowCount = 0;
  let doorCount = 0;
  const allOpenings = [
    ...Object.values(bp.openings),
    ...(bp.customWalls || []).map((w) => w.opening || 'none'),
  ];
  for (const opening of allOpenings) {
    if (
      opening === 'window' ||
      opening === 'arched_window' ||
      opening === 'curtain_window' ||
      opening === 'bath_vent'
    ) {
      windowCount++;
      lightingRaw += opening === 'bath_vent' ? 8 : 12;
      harmonyRaw += 4;
    } else if (opening === 'glass_slider') {
      windowCount += 1.5;
      lightingRaw += 15;
      harmonyRaw += 5;
      doorCount++;
    } else if (
      opening === 'door' ||
      opening === 'double_door' ||
      opening === 'wood_slider' ||
      opening === 'archway'
    ) {
      doorCount++;
      harmonyRaw += 4;
    }
  }

  const floorMats = new Set(Object.values(bp.tiles).map((t) => t.floorMat));
  const wallMats = new Set([
    ...Object.values(bp.tiles).map((t) => t.wallMat),
    ...(bp.customWalls || []).map((w) => w.mat),
  ]);
  const finishBonus = Math.min(12, floorMats.size * 4 + wallMats.size * 3);

  const occupancyRatio = floorArea > 0 ? solidOccupied.size / floorArea : 0;
  let flowScore = 0;
  if (floorArea >= 16) {
    if (occupancyRatio >= 0.18 && occupancyRatio <= 0.58) {
      flowScore = 82 + Math.min(18, rooms.length * 6 + doorCount * 4);
    } else if (occupancyRatio < 0.18) {
      flowScore = Math.round((occupancyRatio / 0.18) * 72) + Math.min(15, rooms.length * 5);
    } else {
      flowScore = Math.max(35, Math.round(92 - (occupancyRatio - 0.58) * 140));
    }
  } else {
    flowScore = Math.min(50, floorArea * 3 + customWallCount * 4);
  }

  const areaScale = Math.max(1, Math.sqrt(Math.max(24, floorArea) / 36));
  const comfort = Math.min(100, Math.round((comfortRaw / (0.72 * areaScale)) * 1.15));
  const harmony = Math.min(
    100,
    Math.round(((harmonyRaw + zoneMatchBonus + finishBonus) / (0.85 * areaScale)) * 1.05),
  );
  const lighting = Math.min(
    100,
    Math.round(((lightingRaw + Math.min(20, windowCount * 5)) / (0.65 * areaScale)) * 1.25),
  );
  const flow = Math.min(100, Math.max(0, Math.round(flowScore)));

  const total = Math.round(comfort * 0.28 + harmony * 0.3 + lighting * 0.22 + flow * 0.2);

  return {
    total,
    comfort,
    harmony,
    lighting,
    flow,
    floorArea,
    roomCount: Math.max(rooms.length, customWallCount >= 3 ? 1 : 0),
    itemCount: bp.furniture.length,
    totalSpent,
    rooms,
  };
}

export function computeFurnitureWorldCenter(
  item: Pick<PlacedFurniture, 'gx' | 'gz' | 'rotation'>,
  width: number,
  depth: number,
  gridSize: number,
): { wx: number; wz: number } {
  const { w, d } = getRotatedFootprint(
    Math.max(1, Math.round(width)),
    Math.max(1, Math.round(depth)),
    item.rotation,
  );
  const half = gridSize / 2;
  return {
    wx: item.gx - half + w / 2,
    wz: item.gz - half + d / 2,
  };
}

/**
 * Creates a completely empty architectural drafting plot for building from scratch.
 */
export function createBlankBlueprint(siteOverride?: Partial<SiteConfig>): RoomBlueprint {
  const landWidth = Math.max(
    MIN_LAND_SIZE,
    Math.min(MAX_LAND_SIZE, Math.round(siteOverride?.landWidth ?? DEFAULT_SITE_CONFIG.landWidth)),
  );
  const landDepth = Math.max(
    MIN_LAND_SIZE,
    Math.min(MAX_LAND_SIZE, Math.round(siteOverride?.landDepth ?? DEFAULT_SITE_CONFIG.landDepth)),
  );
  const gridSize = Math.min(
    MAX_LAND_SIZE,
    Math.max(GRID_SIZE, Math.ceil(Math.max(landWidth, landDepth) / 2) * 2),
  );
  return {
    gridSize,
    site: {
      ...DEFAULT_SITE_CONFIG,
      ...siteOverride,
      landWidth,
      landDepth,
    },
    tiles: {},
    interiorWalls: {},
    openings: {},
    wallStyles: {},
    customWalls: [],
    furniture: [],
    exteriorWallMat: 'limewash_plaster',
  };
}

/**
 * Ray-casting point-in-polygon check against user-drawn custom walls so users can
 * auto-fill floor tiles inside any enclosed custom wall loop in one click.
 */
export function fillFloorInsideCustomWalls(
  bp: RoomBlueprint,
  zone: RoomZoneId,
  floorMat: FloorMaterialId,
  floorTint: string,
  wallMat: WallMaterialId,
  wallTint: string,
): number {
  const walls = bp.customWalls || [];
  if (walls.length < 3) return 0;

  const half = bp.gridSize / 2;
  let added = 0;

  for (let gx = 0; gx < bp.gridSize; gx++) {
    for (let gz = 0; gz < bp.gridSize; gz++) {
      const px = gx - half + 0.5;
      const pz = gz - half + 0.5;

      // Cast a horizontal ray along +X from (px, pz) and count crossings with custom walls
      let crossings = 0;
      for (const w of walls) {
        const zMin = Math.min(w.z1, w.z2);
        const zMax = Math.max(w.z1, w.z2);
        if (pz > zMin && pz <= zMax && Math.abs(w.z2 - w.z1) > 1e-4) {
          const t = (pz - w.z1) / (w.z2 - w.z1);
          const xIntersect = w.x1 + t * (w.x2 - w.x1);
          if (xIntersect > px) {
            crossings++;
          }
        }
      }

      if (crossings % 2 === 1) {
        const key = `${gx},${gz}`;
        if (!bp.tiles[key]) {
          bp.tiles[key] = { x: gx, z: gz, zone, floorMat, floorTint, wallMat, wallTint };
          added++;
        }
      }
    }
  }
  return added;
}

export function getTileSetBounds(
  bp: RoomBlueprint,
  tileKeys: Set<string> | null,
): { minX: number; maxX: number; minZ: number; maxZ: number; width: number; depth: number } | null {
  const keys = tileKeys ? Array.from(tileKeys) : Object.keys(bp.tiles);
  if (keys.length === 0) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const k of keys) {
    const t = bp.tiles[k];
    if (!t) continue;
    if (t.x < minX) minX = t.x;
    if (t.x > maxX) maxX = t.x;
    if (t.z < minZ) minZ = t.z;
    if (t.z > maxZ) maxZ = t.z;
  }
  if (minX === Infinity) return null;
  return {
    minX,
    maxX,
    minZ,
    maxZ,
    width: maxX - minX + 1,
    depth: maxZ - minZ + 1,
  };
}

function edgeBelongsToTiles(edgeKey: string, tileKeys: Set<string>): boolean {
  const [axis, xs, zs] = edgeKey.split(':');
  const x = Number(xs);
  const z = Number(zs);
  if (axis === 'h') {
    return tileKeys.has(`${x},${z}`) || tileKeys.has(`${x},${z - 1}`);
  }
  return tileKeys.has(`${x},${z}`) || tileKeys.has(`${x - 1},${z}`);
}

function isFurnitureInTileSet(
  item: PlacedFurniture,
  bp: RoomBlueprint,
  tileKeys: Set<string>,
  customDefs?: Record<string, FurnitureDef>,
): boolean {
  if (tileKeys.has(`${item.gx},${item.gz}`)) return true;
  if (item.wx !== undefined && item.wz !== undefined) {
    const half = bp.gridSize / 2;
    const gx = Math.floor(item.wx + half);
    const gz = Math.floor(item.wz + half);
    if (tileKeys.has(`${gx},${gz}`)) return true;
  }
  const def = getFurnitureDef(item.defId, customDefs);
  if (def) {
    const cells = getOccupiedCells(item.gx, item.gz, def.width, def.depth, item.rotation);
    if (cells.some((c) => tileKeys.has(`${c.x},${c.z}`))) return true;
  }
  return false;
}

/**
 * Shifts a selected room (or the entire building when roomTileKeys === null) by (dx, dz)
 * grid meters while keeping everything cleanly inside the land plot boundaries.
 */
export function shiftRoomOrBuilding(
  bp: RoomBlueprint,
  roomTileKeys: Set<string> | null,
  dx: number,
  dz: number,
  customDefs?: Record<string, FurnitureDef>,
  allowRescue = false,
): { ok: boolean; reason?: string; blueprint: RoomBlueprint } {
  const wholeBuilding = roomTileKeys === null;
  const targetKeys = wholeBuilding ? new Set(Object.keys(bp.tiles)) : roomTileKeys;
  if (targetKeys.size === 0 && (!wholeBuilding || (bp.customWalls?.length || 0) === 0)) {
    return { ok: false, reason: 'No room tiles to move.', blueprint: bp };
  }

  const bounds = getSiteBounds(bp);

  // Validate bounds & overlap with non-target rooms
  for (const key of targetKeys) {
    const tile = bp.tiles[key];
    if (!tile) continue;
    const nx = tile.x + dx;
    const nz = tile.z + dz;
    if (!allowRescue && (nx < bounds.minGx || nx > bounds.maxGx || nz < bounds.minGz || nz > bounds.maxGz)) {
      return { ok: false, reason: 'Reached land plot boundary.', blueprint: bp };
    }
    const nKey = `${nx},${nz}`;
    if (!targetKeys.has(nKey) && bp.tiles[nKey]) {
      return { ok: false, reason: 'Blocked by another room.', blueprint: bp };
    }
  }

  // When moving whole building, verify custom walls stay within land bounds
  if (wholeBuilding && !allowRescue && bp.customWalls?.length) {
    for (const cw of bp.customWalls) {
      const nx1 = cw.x1 + dx;
      const nx2 = cw.x2 + dx;
      const nz1 = cw.z1 + dz;
      const nz2 = cw.z2 + dz;
      if (
        nx1 < bounds.xMin - 0.05 ||
        nx1 > bounds.xMax + 0.05 ||
        nx2 < bounds.xMin - 0.05 ||
        nx2 > bounds.xMax + 0.05 ||
        nz1 < bounds.zMin - 0.05 ||
        nz1 > bounds.zMax + 0.05 ||
        nz2 < bounds.zMin - 0.05 ||
        nz2 > bounds.zMax + 0.05
      ) {
        return { ok: false, reason: 'Custom wall reached land plot boundary.', blueprint: bp };
      }
    }
  }

  const nextTiles: RoomBlueprint['tiles'] = {};
  for (const [k, t] of Object.entries(bp.tiles)) {
    if (!targetKeys.has(k)) {
      nextTiles[k] = { ...t };
    }
  }
  for (const k of targetKeys) {
    const t = bp.tiles[k];
    if (!t) continue;
    const nx = t.x + dx;
    const nz = t.z + dz;
    nextTiles[`${nx},${nz}`] = { ...t, x: nx, z: nz };
  }

  const shiftEdge = (edgeKey: string): string => {
    const [axis, xs, zs] = edgeKey.split(':');
    return `${axis}:${Number(xs) + dx}:${Number(zs) + dz}`;
  };

  const nextInteriorWalls: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(bp.interiorWalls)) {
    if (!v) continue;
    if (wholeBuilding) {
      nextInteriorWalls[shiftEdge(k)] = true;
    } else if (edgeBelongsToTiles(k, targetKeys)) {
      // Only keep interior walls strictly inside the moving room (not shared border edges)
      const [axis, xs, zs] = k.split(':');
      const x = Number(xs);
      const z = Number(zs);
      const sideA = axis === 'h' ? `${x},${z - 1}` : `${x - 1},${z}`;
      const sideB = `${x},${z}`;
      if (targetKeys.has(sideA) && targetKeys.has(sideB)) {
        nextInteriorWalls[shiftEdge(k)] = true;
      }
    } else {
      nextInteriorWalls[k] = true;
    }
  }

  const nextOpenings: RoomBlueprint['openings'] = {};
  for (const [k, v] of Object.entries(bp.openings)) {
    if (wholeBuilding || edgeBelongsToTiles(k, targetKeys)) {
      nextOpenings[shiftEdge(k)] = v;
    } else {
      nextOpenings[k] = v;
    }
  }

  const nextWallStyles: NonNullable<RoomBlueprint['wallStyles']> = {};
  if (bp.wallStyles) {
    for (const [k, v] of Object.entries(bp.wallStyles)) {
      if (wholeBuilding || edgeBelongsToTiles(k, targetKeys)) {
        nextWallStyles[shiftEdge(k)] = { ...v };
      } else {
        nextWallStyles[k] = { ...v };
      }
    }
  }

  const nextCustomWalls = (bp.customWalls || []).map((cw) =>
    wholeBuilding
      ? {
          ...cw,
          x1: Number((cw.x1 + dx).toFixed(3)),
          z1: Number((cw.z1 + dz).toFixed(3)),
          x2: Number((cw.x2 + dx).toFixed(3)),
          z2: Number((cw.z2 + dz).toFixed(3)),
        }
      : { ...cw },
  );

  const nextFurniture = bp.furniture.map((item) => {
    if (!wholeBuilding && !isFurnitureInTileSet(item, bp, targetKeys, customDefs)) {
      return { ...item };
    }
    return {
      ...item,
      gx: item.gx + dx,
      gz: item.gz + dz,
      ...(item.wx !== undefined ? { wx: Number((item.wx + dx).toFixed(3)) } : {}),
      ...(item.wz !== undefined ? { wz: Number((item.wz + dz).toFixed(3)) } : {}),
    };
  });

  return {
    ok: true,
    blueprint: {
      ...bp,
      tiles: nextTiles,
      interiorWalls: nextInteriorWalls,
      openings: nextOpenings,
      wallStyles: nextWallStyles,
      customWalls: nextCustomWalls,
      furniture: nextFurniture,
    },
  };
}

/**
 * Centers a selected room (or the entire building) cleanly inside the current land plot.
 */
export function centerRoomOrBuildingInLot(
  bp: RoomBlueprint,
  roomTileKeys: Set<string> | null,
  customDefs?: Record<string, FurnitureDef>,
): { ok: boolean; reason?: string; blueprint: RoomBlueprint } {
  const b = getTileSetBounds(bp, roomTileKeys);
  if (!b) return { ok: false, reason: 'No room tiles to center.', blueprint: bp };
  const siteBounds = getSiteBounds(bp);
  const targetMinX = siteBounds.minGx + Math.floor((siteBounds.landWidth - b.width) / 2);
  const targetMinZ = siteBounds.minGz + Math.floor((siteBounds.landDepth - b.depth) / 2);
  const dx = targetMinX - b.minX;
  const dz = targetMinZ - b.minZ;
  if (dx === 0 && dz === 0) {
    return { ok: true, blueprint: bp };
  }
  return shiftRoomOrBuilding(bp, roomTileKeys, dx, dz, customDefs, true);
}

/**
 * Rotates a selected room (or the entire building) 90° clockwise around its bounding center,
 * clamping cleanly inside the land plot boundaries.
 */
export function rotateRoomOrBuilding90(
  bp: RoomBlueprint,
  roomTileKeys: Set<string> | null,
  customDefs?: Record<string, FurnitureDef>,
): { ok: boolean; reason?: string; blueprint: RoomBlueprint } {
  const wholeBuilding = roomTileKeys === null;
  const targetKeys = wholeBuilding ? new Set(Object.keys(bp.tiles)) : roomTileKeys;
  const box = getTileSetBounds(bp, targetKeys);
  if (!box) return { ok: false, reason: 'No room tiles to rotate.', blueprint: bp };

  const siteBounds = getSiteBounds(bp);
  // New dimensions after 90° CW rotation: newW = box.depth, newD = box.width
  const newW = box.depth;
  const newD = box.width;
  if (newW > siteBounds.landWidth || newD > siteBounds.landDepth) {
    return { ok: false, reason: 'Rotated room is wider than the current land plot.', blueprint: bp };
  }

  // Keep rotated bounding box centered on original center, clamped into land plot
  const origCenterX = (box.minX + box.maxX + 1) / 2;
  const origCenterZ = (box.minZ + box.maxZ + 1) / 2;
  const destMinX = Math.max(
    siteBounds.minGx,
    Math.min(siteBounds.maxGx - newW + 1, Math.round(origCenterX - newW / 2)),
  );
  const destMinZ = Math.max(
    siteBounds.minGz,
    Math.min(siteBounds.maxGz - newD + 1, Math.round(origCenterZ - newD / 2)),
  );

  // Tile (x, z) relative to (box.minX, box.minZ) maps CW 90°:
  // rx = x - box.minX, rz = z - box.minZ -> nrx = (box.depth - 1) - rz, nrz = rx
  const mapTile = (x: number, z: number) => ({
    nx: destMinX + (box.depth - 1 - (z - box.minZ)),
    nz: destMinZ + (x - box.minX),
  });

  // Check collisions with non-target tiles
  for (const k of targetKeys) {
    const t = bp.tiles[k];
    if (!t) continue;
    const { nx, nz } = mapTile(t.x, t.z);
    const nKey = `${nx},${nz}`;
    if (!targetKeys.has(nKey) && bp.tiles[nKey]) {
      return { ok: false, reason: 'Rotated room overlaps another room.', blueprint: bp };
    }
  }

  // Map a grid vertex (vx, vz) CW 90°: (vx - box.minX, vz - box.minZ) -> (box.depth - rz, rx)
  const mapVertex = (vx: number, vz: number) => ({
    nx: destMinX + (box.depth - (vz - box.minZ)),
    nz: destMinZ + (vx - box.minX),
  });

  const mapEdgeKey = (edgeKey: string): string => {
    const [axis, xs, zs] = edgeKey.split(':');
    const x = Number(xs);
    const z = Number(zs);
    if (axis === 'h') {
      // Horizontal edge from (x, z) to (x+1, z) becomes vertical edge
      const p1 = mapVertex(x, z);
      const p2 = mapVertex(x + 1, z);
      return `v:${p1.nx}:${Math.min(p1.nz, p2.nz)}`;
    }
    // Vertical edge from (x, z) to (x, z+1) becomes horizontal edge
    const p1 = mapVertex(x, z);
    const p2 = mapVertex(x, z + 1);
    return `h:${Math.min(p1.nx, p2.nx)}:${p1.nz}`;
  };

  const half = bp.gridSize / 2;
  const mapWorldPt = (wx: number, wz: number) => {
    const gxF = wx + half;
    const gzF = wz + half;
    const p = mapVertex(gxF, gzF);
    return { wx: Number((p.nx - half).toFixed(3)), wz: Number((p.nz - half).toFixed(3)) };
  };

  const nextTiles: RoomBlueprint['tiles'] = {};
  for (const [k, t] of Object.entries(bp.tiles)) {
    if (!targetKeys.has(k)) nextTiles[k] = { ...t };
  }
  for (const k of targetKeys) {
    const t = bp.tiles[k];
    if (!t) continue;
    const { nx, nz } = mapTile(t.x, t.z);
    nextTiles[`${nx},${nz}`] = { ...t, x: nx, z: nz };
  }

  const nextInteriorWalls: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(bp.interiorWalls)) {
    if (!v) continue;
    if (wholeBuilding) {
      nextInteriorWalls[mapEdgeKey(k)] = true;
    } else if (edgeBelongsToTiles(k, targetKeys)) {
      const [axis, xs, zs] = k.split(':');
      const x = Number(xs);
      const z = Number(zs);
      const sideA = axis === 'h' ? `${x},${z - 1}` : `${x - 1},${z}`;
      const sideB = `${x},${z}`;
      if (targetKeys.has(sideA) && targetKeys.has(sideB)) {
        nextInteriorWalls[mapEdgeKey(k)] = true;
      }
    } else {
      nextInteriorWalls[k] = true;
    }
  }

  const nextOpenings: RoomBlueprint['openings'] = {};
  for (const [k, v] of Object.entries(bp.openings)) {
    if (wholeBuilding || edgeBelongsToTiles(k, targetKeys)) {
      nextOpenings[mapEdgeKey(k)] = v;
    } else {
      nextOpenings[k] = v;
    }
  }

  const nextWallStyles: NonNullable<RoomBlueprint['wallStyles']> = {};
  if (bp.wallStyles) {
    for (const [k, v] of Object.entries(bp.wallStyles)) {
      if (wholeBuilding || edgeBelongsToTiles(k, targetKeys)) {
        nextWallStyles[mapEdgeKey(k)] = { ...v };
      } else {
        nextWallStyles[k] = { ...v };
      }
    }
  }

  const nextCustomWalls = (bp.customWalls || []).map((cw) => {
    if (!wholeBuilding) return { ...cw };
    const p1 = mapWorldPt(cw.x1, cw.z1);
    const p2 = mapWorldPt(cw.x2, cw.z2);
    return { ...cw, x1: p1.wx, z1: p1.wz, x2: p2.wx, z2: p2.wz };
  });

  const nextFurniture = bp.furniture.map((item) => {
    if (!wholeBuilding && !isFurnitureInTileSet(item, bp, targetKeys, customDefs)) {
      return { ...item };
    }
    const def = getFurnitureDef(item.defId, customDefs);
    const tr = def ? resolveFurnitureTransform(item, def, bp.gridSize) : null;
    const nextRot = ((item.rotation + 1) % 4) as 0 | 1 | 2 | 3;
    if (tr) {
      const rotPt = mapWorldPt(tr.wx, tr.wz);
      const { w: nw, d: nd } = def
        ? getRotatedFootprint(Math.max(1, Math.round(def.width)), Math.max(1, Math.round(def.depth)), nextRot)
        : { w: 1, d: 1 };
      const nextGx = Math.round(rotPt.wx + half - nw / 2);
      const nextGz = Math.round(rotPt.wz + half - nd / 2);
      return {
        ...item,
        gx: nextGx,
        gz: nextGz,
        rotation: nextRot,
        ...(item.wx !== undefined ? { wx: rotPt.wx, wz: rotPt.wz } : {}),
        ...(item.rotY !== undefined ? { rotY: item.rotY - Math.PI / 2 } : {}),
      };
    }
    const mapped = mapTile(item.gx, item.gz);
    return { ...item, gx: mapped.nx, gz: mapped.nz, rotation: nextRot };
  });

  return {
    ok: true,
    blueprint: {
      ...bp,
      tiles: nextTiles,
      interiorWalls: nextInteriorWalls,
      openings: nextOpenings,
      wallStyles: nextWallStyles,
      customWalls: nextCustomWalls,
      furniture: nextFurniture,
    },
  };
}

/**
 * Expands or shrinks a selected room's width (+X east edge) or depth (+Z south edge) by ±1m.
 */
export function resizeSelectedRoom(
  bp: RoomBlueprint,
  roomTileKeys: Set<string>,
  dw: number,
  dd: number,
  customDefs?: Record<string, FurnitureDef>,
): { ok: boolean; reason?: string; blueprint: RoomBlueprint } {
  const box = getTileSetBounds(bp, roomTileKeys);
  if (!box) return { ok: false, reason: 'No room selected.', blueprint: bp };

  const bounds = getSiteBounds(bp);
  const nextTiles: RoomBlueprint['tiles'] = { ...bp.tiles };
  const sample = bp.tiles[Array.from(roomTileKeys)[0]];
  if (!sample) return { ok: false, reason: 'No room selected.', blueprint: bp };

  if (dw > 0) {
    const newX = box.maxX + 1;
    if (newX > bounds.maxGx) {
      return { ok: false, reason: 'Reached east land boundary.', blueprint: bp };
    }
    let added = 0;
    for (let z = box.minZ; z <= box.maxZ; z++) {
      const prevKey = `${box.maxX},${z}`;
      if (!roomTileKeys.has(prevKey)) continue;
      const key = `${newX},${z}`;
      if (nextTiles[key]) {
        return { ok: false, reason: 'Blocked by adjacent room on the east.', blueprint: bp };
      }
      nextTiles[key] = { ...bp.tiles[prevKey], x: newX, z };
      added++;
    }
    if (added === 0) return { ok: false, reason: 'Cannot expand room width.', blueprint: bp };
  } else if (dw < 0) {
    if (box.width <= 2) return { ok: false, reason: 'Minimum room width is 2 m.', blueprint: bp };
    for (let z = box.minZ; z <= box.maxZ; z++) {
      const key = `${box.maxX},${z}`;
      if (roomTileKeys.has(key)) delete nextTiles[key];
    }
  }

  if (dd > 0) {
    const newZ = box.maxZ + 1;
    if (newZ > bounds.maxGz) {
      return { ok: false, reason: 'Reached south land boundary.', blueprint: bp };
    }
    let added = 0;
    for (let x = box.minX; x <= box.maxX; x++) {
      const prevKey = `${x},${box.maxZ}`;
      if (!roomTileKeys.has(prevKey)) continue;
      const key = `${x},${newZ}`;
      if (nextTiles[key]) {
        return { ok: false, reason: 'Blocked by adjacent room on the south.', blueprint: bp };
      }
      nextTiles[key] = { ...bp.tiles[prevKey], x, z: newZ };
      added++;
    }
    if (added === 0) return { ok: false, reason: 'Cannot expand room depth.', blueprint: bp };
  } else if (dd < 0) {
    if (box.depth <= 2) return { ok: false, reason: 'Minimum room depth is 2 m.', blueprint: bp };
    for (let x = box.minX; x <= box.maxX; x++) {
      const key = `${x},${box.maxZ}`;
      if (roomTileKeys.has(key)) delete nextTiles[key];
    }
  }

  const nextFurniture = bp.furniture.filter((item) => {
    const def = getFurnitureDef(item.defId, customDefs);
    if (!def) return false;
    if (item.wx !== undefined && !def.wallMount) return true;
    const cells = getOccupiedCells(item.gx, item.gz, def.width, def.depth, item.rotation);
    return cells.every((c) => Boolean(nextTiles[`${c.x},${c.z}`]));
  });

  return {
    ok: true,
    blueprint: {
      ...bp,
      tiles: nextTiles,
      furniture: nextFurniture,
    },
  };
}

/**
 * Deletes a selected room (or the entire building when roomTileKeys === null).
 */
export function deleteSelectedRoom(
  bp: RoomBlueprint,
  roomTileKeys: Set<string> | null,
  customDefs?: Record<string, FurnitureDef>,
): RoomBlueprint {
  const wholeBuilding = roomTileKeys === null;
  if (wholeBuilding) {
    return {
      ...bp,
      tiles: {},
      interiorWalls: {},
      openings: {},
      wallStyles: {},
      customWalls: [],
      furniture: [],
    };
  }
  const nextTiles: RoomBlueprint['tiles'] = {};
  for (const [k, t] of Object.entries(bp.tiles)) {
    if (!roomTileKeys.has(k)) nextTiles[k] = { ...t };
  }
  const nextFurniture = bp.furniture.filter(
    (item) => !isFurnitureInTileSet(item, bp, roomTileKeys, customDefs),
  );
  const nextInteriorWalls: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(bp.interiorWalls)) {
    if (!v) continue;
    const [axis, xs, zs] = k.split(':');
    const x = Number(xs);
    const z = Number(zs);
    const hasA = axis === 'h' ? Boolean(nextTiles[`${x},${z - 1}`]) : Boolean(nextTiles[`${x - 1},${z}`]);
    const hasB = Boolean(nextTiles[`${x},${z}`]);
    if (hasA && hasB) nextInteriorWalls[k] = true;
  }
  return {
    ...bp,
    tiles: nextTiles,
    interiorWalls: nextInteriorWalls,
    furniture: nextFurniture,
  };
}

// ============================================================================
// MULTI-FLOOR & CUSTOM ROOM NAME HELPERS
// ============================================================================

export function getFloorElevation(bp: RoomBlueprint): number {
  const site = getEffectiveSite(bp);
  return (site.wallHeight ?? WALL_HEIGHT) + FLOOR_SLAB_THICKNESS;
}

export function getBlueprintFloorCount(bp: RoomBlueprint): number {
  return Math.max(1, Math.min(MAX_FLOORS, bp.floorCount ?? 1));
}

export function getActiveFloorIndex(bp: RoomBlueprint): number {
  const count = getBlueprintFloorCount(bp);
  return Math.max(0, Math.min(count - 1, bp.activeFloor ?? 0));
}

export function cloneFloorLevelData(data: FloorLevelData): FloorLevelData {
  const tiles: FloorLevelData['tiles'] = {};
  for (const [k, v] of Object.entries(data.tiles || {})) {
    tiles[k] = { ...v };
  }
  const wallStyles: NonNullable<FloorLevelData['wallStyles']> = {};
  if (data.wallStyles) {
    for (const [k, v] of Object.entries(data.wallStyles)) {
      wallStyles[k] = { ...v };
    }
  }
  const roomLights: Record<string, RoomLightConfig> = {};
  if (data.roomLights) {
    for (const [k, v] of Object.entries(data.roomLights)) {
      if (v) roomLights[k] = { ...v };
    }
  }
  return {
    tiles,
    interiorWalls: { ...(data.interiorWalls || {}) },
    openings: { ...(data.openings || {}) },
    wallStyles,
    customWalls: (data.customWalls || []).map((w) => ({ ...w })),
    furniture: (data.furniture || []).map((f) => ({ ...f })),
    roomNames: { ...(data.roomNames || {}) },
    roomLights,
  };
}

export function extractActiveFloorData(bp: RoomBlueprint): FloorLevelData {
  return cloneFloorLevelData({
    tiles: bp.tiles,
    interiorWalls: bp.interiorWalls,
    openings: bp.openings,
    wallStyles: bp.wallStyles,
    customWalls: bp.customWalls,
    furniture: bp.furniture,
    roomNames: bp.roomNames,
    roomLights: bp.roomLights,
  });
}

export function getBlueprintFloorData(bp: RoomBlueprint, floorIdx: number): FloorLevelData {
  const active = getActiveFloorIndex(bp);
  if (floorIdx === active) {
    return extractActiveFloorData(bp);
  }
  const stored = bp.otherFloors?.[floorIdx];
  if (stored) return cloneFloorLevelData(stored);
  return {
    tiles: {},
    interiorWalls: {},
    openings: {},
    wallStyles: {},
    customWalls: [],
    furniture: [],
    roomNames: {},
    roomLights: {},
  };
}

export function switchBlueprintFloor(bp: RoomBlueprint, targetFloor: number): RoomBlueprint {
  const count = getBlueprintFloorCount(bp);
  const clampedTarget = Math.max(0, Math.min(count - 1, Math.round(targetFloor)));
  const currentActive = getActiveFloorIndex(bp);
  if (clampedTarget === currentActive) return bp;

  const nextOther: Record<number, FloorLevelData> = {};
  if (bp.otherFloors) {
    for (const [k, v] of Object.entries(bp.otherFloors)) {
      const idx = Number(k);
      if (idx !== clampedTarget && v) {
        nextOther[idx] = cloneFloorLevelData(v);
      }
    }
  }
  // Store the current active floor into otherFloors
  nextOther[currentActive] = extractActiveFloorData(bp);

  const targetData = bp.otherFloors?.[clampedTarget]
    ? cloneFloorLevelData(bp.otherFloors[clampedTarget])
    : {
        tiles: {},
        interiorWalls: {},
        openings: {},
        wallStyles: {},
        customWalls: [],
        furniture: [],
        roomNames: {},
        roomLights: {},
      };

  return {
    ...bp,
    tiles: targetData.tiles,
    interiorWalls: targetData.interiorWalls,
    openings: targetData.openings,
    wallStyles: targetData.wallStyles || {},
    customWalls: targetData.customWalls || [],
    furniture: targetData.furniture,
    roomNames: targetData.roomNames || {},
    roomLights: targetData.roomLights || {},
    activeFloor: clampedTarget,
    floorCount: count,
    otherFloors: nextOther,
  };
}

export function addUpperFloor(bp: RoomBlueprint, copyBelow: boolean): RoomBlueprint {
  const count = getBlueprintFloorCount(bp);
  if (count >= MAX_FLOORS) return bp;
  const newFloorIdx = count;
  const currentActive = getActiveFloorIndex(bp);

  // Source floor to optionally copy structure from (floor directly below newFloorIdx)
  const belowData = getBlueprintFloorData(bp, newFloorIdx - 1);
  const newFloorData: FloorLevelData = copyBelow
    ? {
        tiles: Object.fromEntries(
          Object.entries(belowData.tiles).map(([k, t]) => [k, { ...t }]),
        ),
        interiorWalls: { ...belowData.interiorWalls },
        openings: { ...belowData.openings },
        wallStyles: belowData.wallStyles
          ? Object.fromEntries(
              Object.entries(belowData.wallStyles).map(([k, v]) => [k, { ...v }]),
            )
          : {},
        customWalls: (belowData.customWalls || []).map((w) => ({
          ...w,
          id: `${w.id}_f${newFloorIdx}`,
        })),
        furniture: [],
        roomNames: {},
        roomLights: {},
      }
    : {
        tiles: {},
        interiorWalls: {},
        openings: {},
        wallStyles: {},
        customWalls: [],
        furniture: [],
        roomNames: {},
        roomLights: {},
      };

  const nextOther: Record<number, FloorLevelData> = {};
  if (bp.otherFloors) {
    for (const [k, v] of Object.entries(bp.otherFloors)) {
      if (v) nextOther[Number(k)] = cloneFloorLevelData(v);
    }
  }
  nextOther[currentActive] = extractActiveFloorData(bp);

  return {
    ...bp,
    tiles: newFloorData.tiles,
    interiorWalls: newFloorData.interiorWalls,
    openings: newFloorData.openings,
    wallStyles: newFloorData.wallStyles || {},
    customWalls: newFloorData.customWalls || [],
    furniture: newFloorData.furniture,
    roomNames: newFloorData.roomNames || {},
    roomLights: newFloorData.roomLights || {},
    activeFloor: newFloorIdx,
    floorCount: count + 1,
    otherFloors: nextOther,
  };
}

export function removeTopFloor(bp: RoomBlueprint): RoomBlueprint {
  const count = getBlueprintFloorCount(bp);
  if (count <= 1) return bp;
  const topIdx = count - 1;
  let working = bp;
  if (getActiveFloorIndex(working) === topIdx) {
    working = switchBlueprintFloor(working, topIdx - 1);
  }
  const nextOther: Record<number, FloorLevelData> = {};
  if (working.otherFloors) {
    for (const [k, v] of Object.entries(working.otherFloors)) {
      const idx = Number(k);
      if (idx < topIdx && v) nextOther[idx] = cloneFloorLevelData(v);
    }
  }
  return {
    ...working,
    floorCount: count - 1,
    otherFloors: nextOther,
  };
}

export function getRoomAnchorKey(room: DetectedRoom): string {
  if (!room.tiles.length) return `room_${room.id}`;
  const sorted = [...room.tiles].sort();
  return sorted[0];
}

export function getRoomCustomName(bp: RoomBlueprint, room: DetectedRoom): string | null {
  const map = bp.roomNames;
  if (!map) return null;
  const anchor = getRoomAnchorKey(room);
  if (map[anchor]) return map[anchor];
  // Fallback: check if any tile inside the room has a saved custom name (survives slight room resize!)
  for (const key of room.tiles) {
    if (map[key]) return map[key];
  }
  return null;
}

export function setRoomCustomName(
  bp: RoomBlueprint,
  room: DetectedRoom,
  rawName: string,
): RoomBlueprint {
  const nextNames: Record<string, string> = { ...(bp.roomNames || {}) };
  // Clean old keys belonging to this room so renaming/resizing stays tidy
  for (const key of room.tiles) {
    delete nextNames[key];
  }
  const trimmed = rawName.trim();
  if (trimmed) {
    nextNames[getRoomAnchorKey(room)] = trimmed.slice(0, 32);
  }
  return {
    ...bp,
    roomNames: nextNames,
  };
}

/**
 * Physical blackbody Kelvin (1800K..8000K) to sRGB hex approximation (Tanner Helland curve).
 */
export function kelvinToHex(kelvin: number): string {
  const temp = Math.max(1500, Math.min(10000, kelvin)) / 100;
  let r: number;
  let g: number;
  let b: number;

  if (temp <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(temp) - 161.1195681661;
    b = temp <= 19 ? 0 : 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(temp - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
    b = 255;
  }

  const clampByte = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clampByte(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function getKelvinLabel(kelvin: number): string {
  if (kelvin <= 2200) return 'Candle';
  if (kelvin <= 2900) return 'Warm';
  if (kelvin <= 3800) return 'Soft White';
  if (kelvin <= 4900) return 'Neutral';
  if (kelvin <= 6200) return 'Daylight';
  return 'Cool Sky';
}

function parseHexRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 6) {
    const num = parseInt(clean, 16);
    if (!Number.isNaN(num)) {
      return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    }
  }
  return [255, 255, 255];
}

/**
 * Combines physical Kelvin warmth with an optional ambiance color tint.
 * Pure white (#FFFFFF) returns exact Kelvin temperature color; colored tints multiply smoothly.
 */
export function resolveRoomLightHex(cfg: RoomLightConfig): string {
  const kHex = kelvinToHex(cfg.kelvin);
  const tintClean = (cfg.tint || '#FFFFFF').toUpperCase();
  if (tintClean === '#FFFFFF') return kHex;
  const [kr, kg, kb] = parseHexRgb(kHex);
  const [tr, tg, tb] = parseHexRgb(tintClean);
  const blend = (k: number, t: number) =>
    Math.max(0, Math.min(255, Math.round((k / 255) * (t / 255) * 255 * 0.72 + t * 0.28)));
  const toHex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${toHex(blend(kr, tr))}${toHex(blend(kg, tg))}${toHex(blend(kb, tb))}`.toUpperCase();
}

export function hasCustomRoomLight(bp: RoomBlueprint, room: DetectedRoom): boolean {
  const map = bp.roomLights;
  if (!map) return false;
  const anchor = getRoomAnchorKey(room);
  if (map[anchor]) return true;
  for (const key of room.tiles) {
    if (map[key]) return true;
  }
  return false;
}

export function getRoomLightConfig(bp: RoomBlueprint, room: DetectedRoom): RoomLightConfig {
  const map = bp.roomLights;
  if (!map) return { ...DEFAULT_ROOM_LIGHT };
  const anchor = getRoomAnchorKey(room);
  const found = map[anchor] || room.tiles.map((k) => map[k]).find(Boolean);
  if (!found) return { ...DEFAULT_ROOM_LIGHT };
  return {
    enabled: found.enabled !== false,
    intensity:
      typeof found.intensity === 'number' && Number.isFinite(found.intensity)
        ? Math.max(0, Math.min(2.5, found.intensity))
        : DEFAULT_ROOM_LIGHT.intensity,
    kelvin:
      typeof found.kelvin === 'number' && Number.isFinite(found.kelvin)
        ? Math.max(1800, Math.min(8000, Math.round(found.kelvin)))
        : DEFAULT_ROOM_LIGHT.kelvin,
    tint: typeof found.tint === 'string' && found.tint.startsWith('#') ? found.tint : '#FFFFFF',
  };
}

export function setRoomLightConfig(
  bp: RoomBlueprint,
  room: DetectedRoom,
  patch: Partial<RoomLightConfig> | null,
): RoomBlueprint {
  const nextLights: Record<string, RoomLightConfig> = {};
  if (bp.roomLights) {
    for (const [k, v] of Object.entries(bp.roomLights)) {
      if (v) nextLights[k] = { ...v };
    }
  }
  const current = getRoomLightConfig(bp, room);
  for (const key of room.tiles) {
    delete nextLights[key];
  }
  if (patch !== null) {
    const merged: RoomLightConfig = {
      enabled: patch.enabled !== undefined ? patch.enabled : current.enabled,
      intensity:
        patch.intensity !== undefined
          ? Math.max(0, Math.min(2.5, Number(patch.intensity.toFixed(2))))
          : current.intensity,
      kelvin:
        patch.kelvin !== undefined
          ? Math.max(1800, Math.min(8000, Math.round(patch.kelvin)))
          : current.kelvin,
      tint: patch.tint !== undefined ? patch.tint.toUpperCase() : current.tint,
    };
    nextLights[getRoomAnchorKey(room)] = merged;
  }
  return {
    ...bp,
    roomLights: nextLights,
  };
}

export function applyRoomLightToAll(
  bp: RoomBlueprint,
  rooms: DetectedRoom[],
  config: RoomLightConfig,
): RoomBlueprint {
  const nextLights: Record<string, RoomLightConfig> = {};
  for (const room of rooms) {
    nextLights[getRoomAnchorKey(room)] = { ...config };
  }
  return {
    ...bp,
    roomLights: nextLights,
  };
}

export function getTotalProjectStats(
  bp: RoomBlueprint,
  customDefs?: Record<string, FurnitureDef>,
): {
  totalFloorArea: number;
  floorCount: number;
  perFloorArea: number[];
  totalItems: number;
  inventory: { defId: string; name: string; count: number; category: string }[];
} {
  const floorCount = getBlueprintFloorCount(bp);
  const perFloorArea: number[] = [];
  let totalFloorArea = 0;
  let totalItems = 0;
  const counts = new Map<string, number>();

  for (let i = 0; i < floorCount; i++) {
    const f = getBlueprintFloorData(bp, i);
    const area = Object.keys(f.tiles).length;
    perFloorArea.push(area);
    totalFloorArea += area;
    totalItems += f.furniture.length;
    for (const item of f.furniture) {
      counts.set(item.defId, (counts.get(item.defId) || 0) + 1);
    }
  }

  const inventory = Array.from(counts.entries())
    .map(([defId, count]) => {
      const def = getFurnitureDef(defId, customDefs);
      return {
        defId,
        name: def?.name || defId,
        category: def?.category || 'custom',
        count,
      };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return { totalFloorArea, floorCount, perFloorArea, totalItems, inventory };
}

function mirrorFloorData(
  data: FloorLevelData,
  axis: 'x' | 'z',
  minGx: number,
  maxGx: number,
  minGz: number,
  maxGz: number,
  centerX: number,
  centerZ: number,
  customDefs?: Record<string, FurnitureDef>,
): FloorLevelData {
  const flipTileX = (x: number) => minGx + maxGx - x;
  const flipTileZ = (z: number) => minGz + maxGz - z;
  const flipEdgeKey = (edgeKey: string): string => {
    const [edAxis, xs, zs] = edgeKey.split(':');
    const x = Number(xs);
    const z = Number(zs);
    if (axis === 'x') {
      if (edAxis === 'h') return `h:${flipTileX(x)}:${z}`;
      return `v:${minGx + maxGx + 1 - x}:${z}`;
    }
    if (edAxis === 'v') return `v:${x}:${flipTileZ(z)}`;
    return `h:${x}:${minGz + maxGz + 1 - z}`;
  };

  const nextTiles: FloorLevelData['tiles'] = {};
  for (const t of Object.values(data.tiles || {})) {
    const nx = axis === 'x' ? flipTileX(t.x) : t.x;
    const nz = axis === 'z' ? flipTileZ(t.z) : t.z;
    nextTiles[`${nx},${nz}`] = { ...t, x: nx, z: nz };
  }

  const nextInteriorWalls: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(data.interiorWalls || {})) {
    if (v) nextInteriorWalls[flipEdgeKey(k)] = true;
  }

  const nextOpenings: FloorLevelData['openings'] = {};
  for (const [k, v] of Object.entries(data.openings || {})) {
    nextOpenings[flipEdgeKey(k)] = v;
  }

  const nextWallStyles: NonNullable<FloorLevelData['wallStyles']> = {};
  if (data.wallStyles) {
    for (const [k, v] of Object.entries(data.wallStyles)) {
      nextWallStyles[flipEdgeKey(k)] = { ...v };
    }
  }

  const nextCustomWalls = (data.customWalls || []).map((w) => ({
    ...w,
    x1: axis === 'x' ? Number((2 * centerX - w.x1).toFixed(3)) : w.x1,
    x2: axis === 'x' ? Number((2 * centerX - w.x2).toFixed(3)) : w.x2,
    z1: axis === 'z' ? Number((2 * centerZ - w.z1).toFixed(3)) : w.z1,
    z2: axis === 'z' ? Number((2 * centerZ - w.z2).toFixed(3)) : w.z2,
  }));

  const nextRoomNames: Record<string, string> = {};
  if (data.roomNames) {
    for (const [k, name] of Object.entries(data.roomNames)) {
      const [xs, zs] = k.split(',');
      const x = Number(xs);
      const z = Number(zs);
      if (Number.isFinite(x) && Number.isFinite(z)) {
        const nx = axis === 'x' ? flipTileX(x) : x;
        const nz = axis === 'z' ? flipTileZ(z) : z;
        nextRoomNames[`${nx},${nz}`] = name;
      }
    }
  }

  const nextFurniture = (data.furniture || []).map((item) => {
    const def = getFurnitureDef(item.defId, customDefs);
    const rotW = def ? (item.rotation % 2 === 0 ? def.width : def.depth) : 1;
    const rotD = def ? (item.rotation % 2 === 0 ? def.depth : def.width) : 1;
    const nextGx = axis === 'x' ? minGx + maxGx - (item.gx + rotW - 1) : item.gx;
    const nextGz = axis === 'z' ? minGz + maxGz - (item.gz + rotD - 1) : item.gz;
    let nextRot = item.rotation;
    if (axis === 'x') {
      if (item.rotation === 1) nextRot = 3;
      else if (item.rotation === 3) nextRot = 1;
    } else {
      if (item.rotation === 0) nextRot = 2;
      else if (item.rotation === 2) nextRot = 0;
    }
    return {
      ...item,
      gx: nextGx,
      gz: nextGz,
      rotation: nextRot,
      ...(item.wx !== undefined
        ? { wx: axis === 'x' ? Number((2 * centerX - item.wx).toFixed(3)) : item.wx }
        : {}),
      ...(item.wz !== undefined
        ? { wz: axis === 'z' ? Number((2 * centerZ - item.wz).toFixed(3)) : item.wz }
        : {}),
      ...(item.rotY !== undefined
        ? { rotY: axis === 'x' ? -item.rotY : Math.PI - item.rotY }
        : {}),
    };
  });

  const nextRoomLights: Record<string, RoomLightConfig> = {};
  if (data.roomLights) {
    for (const [k, cfg] of Object.entries(data.roomLights)) {
      const [xs, zs] = k.split(',');
      const x = Number(xs);
      const z = Number(zs);
      if (Number.isFinite(x) && Number.isFinite(z) && cfg) {
        const nx = axis === 'x' ? flipTileX(x) : x;
        const nz = axis === 'z' ? flipTileZ(z) : z;
        nextRoomLights[`${nx},${nz}`] = { ...cfg };
      }
    }
  }

  return {
    tiles: nextTiles,
    interiorWalls: nextInteriorWalls,
    openings: nextOpenings,
    wallStyles: nextWallStyles,
    customWalls: nextCustomWalls,
    furniture: nextFurniture,
    roomNames: nextRoomNames,
    roomLights: nextRoomLights,
  };
}

export function mirrorBlueprint(
  bp: RoomBlueprint,
  axis: 'x' | 'z',
  customDefs?: Record<string, FurnitureDef>,
): RoomBlueprint {
  const b = getSiteBounds(bp);
  const flippedActive = mirrorFloorData(
    extractActiveFloorData(bp),
    axis,
    b.minGx,
    b.maxGx,
    b.minGz,
    b.maxGz,
    b.centerX,
    b.centerZ,
    customDefs,
  );
  const nextOther: NonNullable<RoomBlueprint['otherFloors']> = {};
  if (bp.otherFloors) {
    for (const [k, floor] of Object.entries(bp.otherFloors)) {
      if (!floor) continue;
      nextOther[Number(k)] = mirrorFloorData(
        floor,
        axis,
        b.minGx,
        b.maxGx,
        b.minGz,
        b.maxGz,
        b.centerX,
        b.centerZ,
        customDefs,
      );
    }
  }
  return {
    ...bp,
    tiles: flippedActive.tiles,
    interiorWalls: flippedActive.interiorWalls,
    openings: flippedActive.openings,
    wallStyles: flippedActive.wallStyles || {},
    customWalls: flippedActive.customWalls || [],
    furniture: flippedActive.furniture,
    roomNames: flippedActive.roomNames || {},
    roomLights: flippedActive.roomLights || {},
    otherFloors: nextOther,
  };
}

