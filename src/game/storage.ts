import { cloneBlueprint, getFurnitureDef } from './catalog';
import {
  DEFAULT_SITE_CONFIG,
  FoundationStyle,
  FurnitureDef,
  GRID_SIZE,
  LightingMood,
  MAX_LAND_SIZE,
  MIN_LAND_SIZE,
  PlayMode,
  RoomBlueprint,
  SiteConfig,
  WallViewMode,
} from './types';

const VALID_FOUNDATIONS: FoundationStyle[] = ['concrete', 'stone', 'brick', 'timber'];
const VALID_ROOF_STYLES: NonNullable<SiteConfig['roofStyle']>[] = [
  'none',
  'flat',
  'gable',
  'hip',
  'shed',
  'joglo',
];

const STORAGE_KEY = 'atelier_haus_blueprint_v1';
const PROJECTS_STORAGE_KEY = 'bulu_rancang_ruang_projects_v1';
const STORAGE_VERSION = 1;

export interface SavedStudioSession {
  version: 1;
  savedAt: number;
  playMode: PlayMode;
  commissionIdx: number;
  completedIds: string[];
  mood: LightingMood;
  wallView: WallViewMode;
  blueprint: RoomBlueprint;
  customDefs: Record<string, FurnitureDef>;
}

export interface SavedProjectRecord {
  id: string;
  name: string;
  updatedAt: number;
  landWidth: number;
  landDepth: number;
  floorCount: number;
  builtArea: number;
  itemCount: number;
  session: SavedStudioSession;
}

const VALID_MOODS: LightingMood[] = ['morning', 'golden', 'studio', 'evening'];
const VALID_WALL_VIEWS: WallViewMode[] = ['cutaway', 'full', 'low'];
const VALID_PLAY_MODES: PlayMode[] = ['commission', 'sandbox'];

function sanitizeCustomDefsForStorage(
  defs: Record<string, FurnitureDef>,
): Record<string, FurnitureDef> {
  const out: Record<string, FurnitureDef> = {};
  for (const [id, def] of Object.entries(defs)) {
    if (!def || typeof def !== 'object' || !def.id) continue;
    if (def.customSpec?.kind === 'imported') continue;
    if (def.customSpec?.imageTextureId) {
      out[id] = {
        ...def,
        customSpec: {
          ...def.customSpec,
          imageTextureId: undefined,
        },
      };
    } else {
      out[id] = def;
    }
  }
  return out;
}

function sanitizeBlueprintForStorage(
  blueprint: RoomBlueprint,
  cleanCustomDefs: Record<string, FurnitureDef>,
): RoomBlueprint {
  const cleanBp = cloneBlueprint(blueprint);
  cleanBp.furniture = cleanBp.furniture.filter((item) =>
    Boolean(getFurnitureDef(item.defId, cleanCustomDefs)),
  );
  if (cleanBp.otherFloors) {
    for (const [k, floor] of Object.entries(cleanBp.otherFloors)) {
      if (!floor) continue;
      cleanBp.otherFloors[Number(k)] = {
        ...floor,
        furniture: (floor.furniture || []).filter((item) =>
          Boolean(getFurnitureDef(item.defId, cleanCustomDefs)),
        ),
      };
    }
  }
  return cleanBp;
}

function normalizeParsedSession(rawParsed: unknown): SavedStudioSession | null {
  const parsed = rawParsed as Partial<SavedStudioSession> | null;
  if (!parsed || typeof parsed !== 'object' || parsed.version !== STORAGE_VERSION) {
    return null;
  }

  const bp = parsed.blueprint as Partial<RoomBlueprint> | undefined;
  if (
    !bp ||
    typeof bp !== 'object' ||
    !bp.tiles ||
    typeof bp.tiles !== 'object' ||
    !Array.isArray(bp.furniture)
  ) {
    return null;
  }

  const gridSize =
    typeof bp.gridSize === 'number' &&
    Number.isFinite(bp.gridSize) &&
    bp.gridSize >= MIN_LAND_SIZE &&
    bp.gridSize <= MAX_LAND_SIZE
      ? Math.round(bp.gridSize)
      : GRID_SIZE;

  const customDefs =
    parsed.customDefs && typeof parsed.customDefs === 'object'
      ? sanitizeCustomDefsForStorage(parsed.customDefs)
      : {};

  const filterValidFurniture = (list: unknown): RoomBlueprint['furniture'] =>
    Array.isArray(list)
      ? list.filter(
          (item): item is RoomBlueprint['furniture'][number] =>
            Boolean(item) &&
            typeof item === 'object' &&
            typeof (item as { uid?: unknown }).uid === 'string' &&
            typeof (item as { defId?: unknown }).defId === 'string' &&
            Boolean(getFurnitureDef((item as { defId: string }).defId, customDefs)),
        )
      : [];

  const validFurniture = filterValidFurniture(bp.furniture);

  const rawSite = bp.site as Partial<SiteConfig> | undefined;
  const normalizedSite: SiteConfig = {
    landWidth:
      typeof rawSite?.landWidth === 'number' && Number.isFinite(rawSite.landWidth)
        ? Math.max(MIN_LAND_SIZE, Math.min(MAX_LAND_SIZE, Math.round(rawSite.landWidth)))
        : Math.min(MAX_LAND_SIZE, gridSize),
    landDepth:
      typeof rawSite?.landDepth === 'number' && Number.isFinite(rawSite.landDepth)
        ? Math.max(MIN_LAND_SIZE, Math.min(MAX_LAND_SIZE, Math.round(rawSite.landDepth)))
        : Math.min(MAX_LAND_SIZE, gridSize),
    foundationStyle: VALID_FOUNDATIONS.includes(rawSite?.foundationStyle as FoundationStyle)
      ? (rawSite!.foundationStyle as FoundationStyle)
      : DEFAULT_SITE_CONFIG.foundationStyle,
    foundationHeight:
      typeof rawSite?.foundationHeight === 'number' && Number.isFinite(rawSite.foundationHeight)
        ? Math.max(0.12, Math.min(0.65, rawSite.foundationHeight))
        : DEFAULT_SITE_CONFIG.foundationHeight,
    showCeiling:
      typeof rawSite?.showCeiling === 'boolean'
        ? rawSite.showCeiling
        : DEFAULT_SITE_CONFIG.showCeiling,
    wallHeight:
      typeof rawSite?.wallHeight === 'number' && Number.isFinite(rawSite.wallHeight)
        ? Math.max(1.5, Math.min(5.0, rawSite.wallHeight))
        : DEFAULT_SITE_CONFIG.wallHeight,
    roofStyle: VALID_ROOF_STYLES.includes(
      rawSite?.roofStyle as NonNullable<SiteConfig['roofStyle']>,
    )
      ? (rawSite!.roofStyle as NonNullable<SiteConfig['roofStyle']>)
      : DEFAULT_SITE_CONFIG.roofStyle,
    roofColor:
      typeof rawSite?.roofColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(rawSite.roofColor)
        ? rawSite.roofColor
        : DEFAULT_SITE_CONFIG.roofColor,
    roofPitch:
      typeof rawSite?.roofPitch === 'number' && Number.isFinite(rawSite.roofPitch)
        ? Math.max(0.6, Math.min(3.2, rawSite.roofPitch))
        : DEFAULT_SITE_CONFIG.roofPitch,
    showRoof:
      typeof rawSite?.showRoof === 'boolean' ? rawSite.showRoof : DEFAULT_SITE_CONFIG.showRoof,
  };

  const floorCount =
    typeof bp.floorCount === 'number' && Number.isFinite(bp.floorCount)
      ? Math.max(1, Math.min(3, Math.round(bp.floorCount)))
      : 1;
  const activeFloor =
    typeof bp.activeFloor === 'number' && Number.isFinite(bp.activeFloor)
      ? Math.max(0, Math.min(floorCount - 1, Math.round(bp.activeFloor)))
      : 0;

  const normalizedOtherFloors: NonNullable<RoomBlueprint['otherFloors']> = {};
  if (bp.otherFloors && typeof bp.otherFloors === 'object') {
    for (const [k, rawFloor] of Object.entries(bp.otherFloors)) {
      const idx = Number(k);
      if (!Number.isInteger(idx) || idx < 0 || idx >= floorCount || idx === activeFloor) continue;
      if (!rawFloor || typeof rawFloor !== 'object') continue;
      normalizedOtherFloors[idx] = {
        tiles: rawFloor.tiles && typeof rawFloor.tiles === 'object' ? rawFloor.tiles : {},
        interiorWalls:
          rawFloor.interiorWalls && typeof rawFloor.interiorWalls === 'object'
            ? rawFloor.interiorWalls
            : {},
        openings:
          rawFloor.openings && typeof rawFloor.openings === 'object' ? rawFloor.openings : {},
        wallStyles:
          rawFloor.wallStyles && typeof rawFloor.wallStyles === 'object' ? rawFloor.wallStyles : {},
        customWalls: Array.isArray(rawFloor.customWalls) ? rawFloor.customWalls : [],
        furniture: filterValidFurniture(rawFloor.furniture),
        roomNames:
          rawFloor.roomNames && typeof rawFloor.roomNames === 'object' ? rawFloor.roomNames : {},
        roomLights:
          rawFloor.roomLights && typeof rawFloor.roomLights === 'object' ? rawFloor.roomLights : {},
      };
    }
  }

  const normalizedBp: RoomBlueprint = {
    gridSize,
    site: normalizedSite,
    tiles: bp.tiles,
    interiorWalls:
      bp.interiorWalls && typeof bp.interiorWalls === 'object' ? bp.interiorWalls : {},
    openings: bp.openings && typeof bp.openings === 'object' ? bp.openings : {},
    wallStyles: bp.wallStyles && typeof bp.wallStyles === 'object' ? bp.wallStyles : {},
    customWalls: Array.isArray(bp.customWalls) ? bp.customWalls : [],
    furniture: validFurniture,
    roomNames: bp.roomNames && typeof bp.roomNames === 'object' ? bp.roomNames : {},
    roomLights: bp.roomLights && typeof bp.roomLights === 'object' ? bp.roomLights : {},
    exteriorWallMat:
      typeof bp.exteriorWallMat === 'string' ? bp.exteriorWallMat : 'limewash_plaster',
    activeFloor,
    floorCount,
    otherFloors: normalizedOtherFloors,
  };

  const playMode: PlayMode = VALID_PLAY_MODES.includes(parsed.playMode as PlayMode)
    ? (parsed.playMode as PlayMode)
    : 'sandbox';
  const mood: LightingMood = VALID_MOODS.includes(parsed.mood as LightingMood)
    ? (parsed.mood as LightingMood)
    : 'golden';
  const wallView: WallViewMode = VALID_WALL_VIEWS.includes(parsed.wallView as WallViewMode)
    ? (parsed.wallView as WallViewMode)
    : 'cutaway';
  const commissionIdx =
    typeof parsed.commissionIdx === 'number' && Number.isFinite(parsed.commissionIdx)
      ? Math.max(0, Math.floor(parsed.commissionIdx))
      : 0;
  const completedIds = Array.isArray(parsed.completedIds)
    ? parsed.completedIds.filter((id): id is string => typeof id === 'string')
    : [];

  return {
    version: STORAGE_VERSION,
    savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
    playMode,
    commissionIdx,
    completedIds,
    mood,
    wallView,
    blueprint: normalizedBp,
    customDefs,
  };
}

export function saveStudioSession(
  data: Omit<SavedStudioSession, 'version' | 'savedAt'>,
): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const cleanCustomDefs = sanitizeCustomDefsForStorage(data.customDefs || {});
    const cleanBp = sanitizeBlueprintForStorage(data.blueprint, cleanCustomDefs);

    const payload: SavedStudioSession = {
      version: STORAGE_VERSION,
      savedAt: Date.now(),
      playMode: data.playMode,
      commissionIdx: data.commissionIdx,
      completedIds: Array.isArray(data.completedIds) ? data.completedIds : [],
      mood: data.mood,
      wallView: data.wallView,
      blueprint: cleanBp,
      customDefs: cleanCustomDefs,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function loadSavedSession(): SavedStudioSession | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeParsedSession(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearSavedSession(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

function computeBlueprintQuickTotals(bp: RoomBlueprint): {
  builtArea: number;
  itemCount: number;
  floorCount: number;
} {
  let builtArea = Object.keys(bp.tiles || {}).length;
  let itemCount = (bp.furniture || []).length;
  if (bp.otherFloors) {
    for (const f of Object.values(bp.otherFloors)) {
      if (!f) continue;
      builtArea += Object.keys(f.tiles || {}).length;
      itemCount += (f.furniture || []).length;
    }
  }
  const floorCount = Math.max(1, bp.floorCount ?? 1);
  return { builtArea, itemCount, floorCount };
}

export function listSavedProjects(): SavedProjectRecord[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const valid: SavedProjectRecord[] = [];
    for (const entry of arr) {
      if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string') continue;
      const session = normalizeParsedSession(entry.session);
      if (!session) continue;
      const totals = computeBlueprintQuickTotals(session.blueprint);
      valid.push({
        id: entry.id,
        name: typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : 'Proyek Tanpa Nama',
        updatedAt: typeof entry.updatedAt === 'number' ? entry.updatedAt : session.savedAt,
        landWidth: session.blueprint.site?.landWidth ?? session.blueprint.gridSize,
        landDepth: session.blueprint.site?.landDepth ?? session.blueprint.gridSize,
        floorCount: totals.floorCount,
        builtArea: totals.builtArea,
        itemCount: totals.itemCount,
        session,
      });
    }
    return valid.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function saveNamedProject(
  name: string,
  data: Omit<SavedStudioSession, 'version' | 'savedAt'>,
  existingId?: string,
): SavedProjectRecord[] | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const cleanName = name.trim() || 'Desain Baru';
    const cleanCustomDefs = sanitizeCustomDefsForStorage(data.customDefs || {});
    const cleanBp = sanitizeBlueprintForStorage(data.blueprint, cleanCustomDefs);
    const now = Date.now();
    const session: SavedStudioSession = {
      version: STORAGE_VERSION,
      savedAt: now,
      playMode: data.playMode,
      commissionIdx: data.commissionIdx,
      completedIds: Array.isArray(data.completedIds) ? data.completedIds : [],
      mood: data.mood,
      wallView: data.wallView,
      blueprint: cleanBp,
      customDefs: cleanCustomDefs,
    };
    const totals = computeBlueprintQuickTotals(cleanBp);
    const record: SavedProjectRecord = {
      id: existingId || `proj_${now.toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      updatedAt: now,
      landWidth: cleanBp.site?.landWidth ?? cleanBp.gridSize,
      landDepth: cleanBp.site?.landDepth ?? cleanBp.gridSize,
      floorCount: totals.floorCount,
      builtArea: totals.builtArea,
      itemCount: totals.itemCount,
      session,
    };

    const current = listSavedProjects().filter((p) => p.id !== record.id);
    const next = [record, ...current].slice(0, 16);
    window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
}

export function deleteNamedProject(id: string): SavedProjectRecord[] {
  const next = listSavedProjects().filter((p) => p.id !== id);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    // ignore
  }
  return next;
}

export function exportProjectJson(
  name: string,
  data: Omit<SavedStudioSession, 'version' | 'savedAt'>,
): string {
  const cleanCustomDefs = sanitizeCustomDefsForStorage(data.customDefs || {});
  const cleanBp = sanitizeBlueprintForStorage(data.blueprint, cleanCustomDefs);
  const payload = {
    app: 'Roomsmith',
    projectName: name.trim() || 'Roomsmith Design',
    exportedAt: new Date().toISOString(),
    session: {
      version: STORAGE_VERSION,
      savedAt: Date.now(),
      playMode: data.playMode,
      commissionIdx: data.commissionIdx,
      completedIds: Array.isArray(data.completedIds) ? data.completedIds : [],
      mood: data.mood,
      wallView: data.wallView,
      blueprint: cleanBp,
      customDefs: cleanCustomDefs,
    } satisfies SavedStudioSession,
  };
  return JSON.stringify(payload, null, 2);
}

export function parseImportedProjectJson(
  rawJson: string,
): { name: string; session: SavedStudioSession } | null {
  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== 'object') return null;
    if ('session' in parsed) {
      const session = normalizeParsedSession((parsed as { session: unknown }).session);
      if (!session) return null;
      const name =
        typeof (parsed as { projectName?: unknown }).projectName === 'string' &&
        (parsed as { projectName: string }).projectName.trim()
          ? (parsed as { projectName: string }).projectName.trim()
          : 'Proyek Impor';
      return { name, session };
    }
    const direct = normalizeParsedSession(parsed);
    if (direct) return { name: 'Proyek Impor', session: direct };
    return null;
  } catch {
    return null;
  }
}
